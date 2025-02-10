import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  let tempDir: string | null = null;
  
  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get analysis ID from request
    const { analysisId } = await request.json()
    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 })
    }

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

    // Download files
    const { data: resumeFile } = await supabase.storage
      .from('resumes')
      .download(analysis.resume_url.replace('resumes/', ''))

    const { data: jobFile } = await supabase.storage
      .from('jobs')
      .download(analysis.job_description_url.replace('jobs/', ''))

    if (!resumeFile || !jobFile) {
      throw new Error('Failed to download files')
    }

    // Create temp directory
    tempDir = path.join(os.tmpdir(), 'resume-analysis-' + Date.now())
    await fs.promises.mkdir(tempDir, { recursive: true })
    
    const resumePath = path.join(tempDir, 'resume.pdf')
    const jobPath = path.join(tempDir, 'job.pdf')
    
    // Save files
    await fs.promises.writeFile(resumePath, Buffer.from(await resumeFile.arrayBuffer()))
    await fs.promises.writeFile(jobPath, Buffer.from(await jobFile.arrayBuffer()))

    // Update status to processing
    await supabase
      .from('analyses')
      .update({ 
        status: 'processing',
        results: { progress: 'Processing documents...' }
      })
      .eq('id', analysisId)

    // Run Python script
    const pythonPath = process.env.PYTHON_PATH || 'python'
    const scriptPath = path.join(process.cwd(), 'resume_matcher', 'scripts', '__main__.py')
    
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      '--input-resume', resumePath,
      '--input-job', jobPath,
      '--mode', 'full',
      '--format', 'json'
    ], {
      env: {
        ...process.env,
        PYTHONPATH: process.cwd(),
      }
    })

    let result = ''
    let error = ''

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString()
      console.log('Python output:', output)
      error += output
    })

    // Wait for completion
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(null)
        } else {
          reject(new Error(`Analysis failed with code ${code}: ${error}`))
        }
      })
    })

    // Parse and save results
    try {
      const analysisResult = JSON.parse(result.trim())
      
      await supabase
        .from('analyses')
        .update({
          status: 'completed',
          results: analysisResult
        })
        .eq('id', analysisId)

      return NextResponse.json({
        success: true,
        message: 'Analysis completed successfully',
        results: analysisResult
      })

    } catch (e) {
      throw new Error(`Failed to parse analysis results: ${e.message}`)
    }

  } catch (error: any) {
    console.error('Analysis error:', error)
    
    // Update analysis status to failed
    if (analysisId) {
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          results: { error: error.message }
        })
        .eq('id', analysisId)
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  } finally {
    // Clean up temp files
    if (tempDir) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true })
      } catch (e) {
        console.error('Error cleaning up temp files:', e)
      }
    }
  }
}
