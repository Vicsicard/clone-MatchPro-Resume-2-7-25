import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'
import { spawn, spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  let tempDir: string | null = null;
  let analysisId: string | null = null;
  
  try {
    console.log('Starting analysis process...')
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('Authentication successful')

    // Get analysis ID from request
    const requestData = await request.json()
    analysisId = requestData.analysisId
    if (!analysisId) {
      console.error('No analysis ID provided')
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 })
    }
    console.log('Analysis ID:', analysisId)

    // Get analysis record
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (fetchError || !analysis) {
      console.error('Error fetching analysis:', fetchError)
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }
    console.log('Found analysis record:', analysis.id)

    // Download files
    console.log('Downloading resume file:', analysis.resume_url)
    const { data: resumeFile, error: resumeError } = await supabase.storage
      .from('resumes')
      .download(analysis.resume_url.replace('resumes/', ''))

    if (resumeError) {
      console.error('Error downloading resume:', resumeError)
      throw new Error('Failed to download resume')
    }

    console.log('Downloading job description file:', analysis.job_description_url)
    const { data: jobFile, error: jobError } = await supabase.storage
      .from('jobs')
      .download(analysis.job_description_url.replace('jobs/', ''))

    if (jobError) {
      console.error('Error downloading job description:', jobError)
      throw new Error('Failed to download job description')
    }

    if (!resumeFile || !jobFile) {
      console.error('Files not found:', { resume: !resumeFile, job: !jobFile })
      throw new Error('Failed to download files')
    }
    console.log('Files downloaded successfully')

    // Create temp directory
    tempDir = path.join(os.tmpdir(), 'resume-analysis-' + Date.now())
    await fs.promises.mkdir(tempDir, { recursive: true })
    console.log('Created temp directory:', tempDir)
    
    const resumePath = path.join(tempDir, 'resume.pdf')
    const jobPath = path.join(tempDir, 'job.pdf')
    
    // Save files
    await fs.promises.writeFile(resumePath, Buffer.from(await resumeFile.arrayBuffer()))
    await fs.promises.writeFile(jobPath, Buffer.from(await jobFile.arrayBuffer()))
    console.log('Files saved to temp directory')

    // Update status to processing
    await supabase
      .from('analyses')
      .update({ 
        status: 'processing',
        results: { progress: 'Processing documents...' }
      })
      .eq('id', analysisId)
    console.log('Updated status to processing')

    // Get Python path
    const pythonPath = '/python312/bin/python3'
    console.log('Using Python path:', pythonPath)

    // Get project root and verify paths
    const projectRoot = process.cwd()
    console.log('Project root:', projectRoot)
    console.log('Current directory contents:', fs.readdirSync(projectRoot))
    
    // Verify Python installation and dependencies
    try {
      const versionCheck = spawnSync(pythonPath, ['--version'])
      console.log('Python version check:', versionCheck.stdout.toString(), versionCheck.stderr.toString())
      
      // Verify SQLite
      const sqliteCheck = spawnSync(pythonPath, ['-c', 'import sqlite3; print("SQLite version:", sqlite3.sqlite_version)'])
      console.log('SQLite check:', sqliteCheck.stdout.toString(), sqliteCheck.stderr.toString())
      
      // Verify qdrant_client
      const qdrantCheck = spawnSync(pythonPath, ['-c', 'import qdrant_client; print("qdrant_client imported successfully")'])
      console.log('Qdrant check:', qdrantCheck.stdout.toString(), qdrantCheck.stderr.toString())
    } catch (err) {
      console.error('Error checking Python dependencies:', err)
      throw new Error('Failed to verify Python dependencies')
    }

    // Verify files exist
    console.log('Verifying files exist:')
    console.log('Resume file exists:', fs.existsSync(resumePath))
    console.log('Job file exists:', fs.existsSync(jobPath))
    console.log('Resume file size:', fs.statSync(resumePath).size)
    console.log('Job file size:', fs.statSync(jobPath).size)
    
    const pythonProcess = spawn(pythonPath, [
      '-m',
      'resume_matcher.scripts',
      resumePath,
      jobPath,
      '--mode', 'full',
      '--output', 'json'
    ], {
      env: {
        ...process.env,
        PATH: `/python312/bin:${process.env.PATH}`,
        PYTHONPATH: `${projectRoot}:/python312/lib/python3.12/site-packages`,
        COHERE_API_KEY: process.env.COHERE_API_KEY || '',
        QDRANT_API_KEY: process.env.QDRANT_API_KEY || '',
        QDRANT_URL: process.env.QDRANT_URL || ''
      },
      cwd: projectRoot
    })

    console.log('Python process spawned')

    let result = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('Python stdout:', output)
      result += output
      
      // Update progress in database
      try {
        if (output.includes('Processing') || output.includes('Step')) {
          supabase
            .from('analyses')
            .update({ 
              results: { progress: output.trim() }
            })
            .match({ id: analysisId })
            .then(
              () => {
                console.log('Updated progress:', output.trim())
              },
              (err) => {
                console.error('Failed to update progress:', err)
              }
            )
        }
      } catch (e) {
        console.error('Error updating progress:', e)
      }
    })

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.error('Python stderr:', output)
      error += output
      
      // Log error to database
      try {
        supabase
          .from('analyses')
          .update({ 
            results: { 
              error: error.trim(),
              lastOutput: output.trim()
            }
          })
          .match({ id: analysisId })
          .then(
            () => {
              console.log('Updated error log')
            },
            (err) => {
              console.error('Failed to update error log:', err)
            }
          )
      } catch (e) {
        console.error('Error updating error log:', e)
      }
    })

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err)
      error += err.message
    })

    pythonProcess.on('close', (code) => {
      console.log('Python process exited with code:', code)
      if (code !== 0) {
        console.error('Python process failed with code:', code)
        console.error('Error output:', error)
      }
    })

    // Wait for completion
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pythonProcess.kill()
        reject(new Error('Analysis timed out after 5 minutes'))
      }, 5 * 60 * 1000)

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout)
        console.log('Python process closed with code:', code)
        if (code === 0) {
          resolve(null)
        } else {
          reject(new Error(`Analysis failed with code ${code}: ${error}`))
        }
      })
    })

    // Parse and save results
    try {
      console.log('Raw result:', result)
      const analysisResult = JSON.parse(result.trim())
      console.log('Parsed result:', analysisResult)
      
      await supabase
        .from('analyses')
        .update({
          status: 'completed',
          results: analysisResult
        })
        .match({ id: analysisId })
      console.log('Updated analysis with results')

      return NextResponse.json({
        success: true,
        message: 'Analysis completed successfully',
        results: analysisResult
      })

    } catch (e: Error | unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to parse analysis results'
      console.error('Error parsing results:', errorMessage)
      throw new Error(`Failed to parse analysis results: ${errorMessage}`)
    }

  } catch (error: any) {
    console.error('Analysis error:', error)
    
    // Update analysis status to failed
    if (analysisId) {
      try {
        await supabase
          .from('analyses')
          .update({
            status: 'failed',
            results: { error: error.message || 'Unknown error occurred' }
          })
          .match({ id: analysisId })
        console.log('Updated analysis status to failed')
      } catch (e) {
        console.error('Failed to update analysis status:', e)
      }
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred during analysis'
    }, {
      status: 500
    })

  } finally {
    // Cleanup temp directory
    if (tempDir) {
      try {
        await fs.promises.rm(tempDir, { recursive: true })
        console.log('Cleaned up temp directory')
      } catch (e) {
        console.error('Failed to cleanup temp directory:', e)
      }
    }
  }
}
