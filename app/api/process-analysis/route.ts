import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get analysis ID from request
    const { analysisId } = await request.json()
    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      )
    }

    // Get analysis record and file contents
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (fetchError || !analysis) {
      console.error('Error fetching analysis:', fetchError)
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // Download files from Supabase storage
    const { data: resumeFile } = await supabase.storage
      .from('resumes')
      .download(analysis.resume_url.replace('resumes/', ''))

    const { data: jobFile } = await supabase.storage
      .from('jobs')
      .download(analysis.job_description_url.replace('jobs/', ''))

    if (!resumeFile || !jobFile) {
      throw new Error('Failed to download files')
    }

    // Create temp directory for processing
    const tempDir = path.join(os.tmpdir(), 'resume-analysis-' + Date.now())
    await fs.promises.mkdir(tempDir, { recursive: true })
    
    const resumePath = path.join(tempDir, 'resume_' + Date.now() + '.pdf')
    const jobPath = path.join(tempDir, 'job_' + Date.now() + '.pdf')
    
    // Convert Blobs to ArrayBuffer
    const resumeBuffer = await resumeFile.arrayBuffer()
    const jobBuffer = await jobFile.arrayBuffer()
    
    await fs.promises.writeFile(resumePath, Buffer.from(resumeBuffer))
    await fs.promises.writeFile(jobPath, Buffer.from(jobBuffer))

    // Update status to processing
    await supabase
      .from('analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId)

    // Log Python execution details
    const scriptPath = path.join(process.cwd(), 'resume_matcher', 'scripts', '__main__.py')
    const pythonArgs = [
      scriptPath,
      '--input-resume', resumePath,
      '--input-job', jobPath,
      '--mode', 'full',
      '--format', 'json'
    ]
    
    console.log('Executing Python script with:', {
      scriptPath,
      args: pythonArgs,
      cwd: process.cwd(),
      pythonPath: process.env.PYTHON_PATH || 'python'
    })

    // Verify required environment variables
    const requiredEnvVars = {
      COHERE_API_KEY: process.env.COHERE_API_KEY,
      QDRANT_API_KEY: process.env.QDRANT_API_KEY,
      QDRANT_URL: process.env.QDRANT_URL
    }

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`Missing required environment variable: ${key}`)
        throw new Error(`Configuration error: ${key} is not set`)
      }
    }

    // Execute Python analysis script with required environment variables
    const pythonProcess = spawn(process.env.PYTHON_PATH || 'python', pythonArgs, {
      env: {
        ...process.env,
        PYTHONPATH: process.cwd(),
        COHERE_API_KEY: process.env.COHERE_API_KEY,
        QDRANT_API_KEY: process.env.QDRANT_API_KEY,
        QDRANT_URL: process.env.QDRANT_URL
      }
    })

    let result = ''
    let error = ''

    // Buffer for collecting complete JSON output
    let jsonBuffer = '';
    let progressBuffer = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Python stdout:', output);
      
      // Attempt to parse as JSON first (final result)
      try {
        const jsonStart = output.indexOf('{');
        if (jsonStart !== -1) {
          jsonBuffer += output;
          // Try parsing to see if we have complete JSON
          JSON.parse(jsonBuffer);
          result = jsonBuffer;
        } else {
          // If not JSON, treat as progress update
          progressBuffer += output;
          // Update analysis status with progress
          (async () => {
            try {
              await supabase
                .from('analyses')
                .update({ 
                  status: 'processing',
                  results: { progress: progressBuffer }
                })
                .eq('id', analysisId);
              console.log('Updated analysis progress');
            } catch (err) {
              console.error('Failed to update progress:', err);
            }
          })();
        }
      } catch (e) {
        // Incomplete JSON, continue buffering
        if (jsonBuffer) {
          jsonBuffer += output;
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('Python stderr:', errorOutput);
      error += errorOutput;
      
      // Only update with stderr if it's not a progress message
      if (!errorOutput.includes('Starting resume analysis...') && 
          !errorOutput.includes('Files verified') &&
          !errorOutput.includes('Processing completed')) {
        (async () => {
          try {
            await supabase
              .from('analyses')
              .update({ 
                status: 'processing',
                results: { error: errorOutput }
              })
              .eq('id', analysisId);
            console.log('Updated analysis with error details');
          } catch (err) {
            console.error('Failed to update error details:', err);
          }
        })();
      }
    });

    // Log process events
    pythonProcess.on('spawn', () => {
      console.log('Python process spawned')
    })

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err)
    })

    // Wait for Python process to complete
    await new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        pythonProcess.kill()
        reject(new Error('Analysis timed out after 60 seconds'))
      }, 60000) // 60 second timeout
      
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout)
        if (code !== 0) {
          console.error('Python process failed:', error)
          reject(new Error(`Analysis failed with code ${code}: ${error}`))
        } else {
          resolve(result)
        }
      })
    })

    // Clean up temp directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    } catch (e) {
      console.error('Error cleaning up temp files:', e)
    }

    // Parse the analysis results
    const analysisResult = result.trim()
    
    try {
      // Parse the JSON output from Python script
      const parsedResult = JSON.parse(analysisResult);
      
      // Check for error in Python result
      if (parsedResult.error) {
        throw new Error(`Python analysis failed: ${parsedResult.error}`);
      }

      // Update the analysis record with results
      const { error: updateError } = await supabase
        .from('analyses')
        .update({
          status: 'completed',
          results: parsedResult
        })
        .eq('id', analysisId);

      if (updateError) {
        throw new Error('Failed to update analysis results');
      }

      return NextResponse.json({
        success: true,
        message: 'Analysis completed successfully',
        results: parsedResult
      });
    } catch (e: any) {
      console.error('Failed to parse analysis results:', e);
      // Update analysis status to failed
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          results: {
            error: e?.message || 'Failed to parse analysis results'
          }
        })
        .eq('id', analysisId);
      throw new Error('Failed to process analysis results: ' + (e?.message || 'Unknown error'));
    }

  } catch (error: any) {
    console.error('Error processing analysis:', error)
    
    try {
      // Update analysis status to failed
      if (request.body) {
        const { analysisId } = await request.json()
        if (analysisId) {
          await supabase
            .from('analyses')
            .update({
              status: 'failed',
              results: {
                error: error.message
              }
            })
            .eq('id', analysisId)
        }
      }
    } catch (updateError) {
      console.error('Failed to update analysis status:', updateError)
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process analysis' },
      { status: 500 }
    )
  }
}
