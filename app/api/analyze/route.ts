import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const resume = formData.get('resume') as File
    const jobDescription = formData.get('jobDescription') as File
    
    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Both resume and job description are required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    
    // Upload resume
    const resumeBuffer = Buffer.from(await resume.arrayBuffer())
    const { data: resumeData, error: resumeError } = await supabase.storage
      .from('resumes')
      .upload(`${Date.now()}-${resume.name}`, resumeBuffer)
    
    if (resumeError) {
      return NextResponse.json(
        { error: 'Failed to upload resume' },
        { status: 500 }
      )
    }

    // Upload job description
    const jobBuffer = Buffer.from(await jobDescription.arrayBuffer())
    const { data: jobData, error: jobError } = await supabase.storage
      .from('jobs')
      .upload(`${Date.now()}-${jobDescription.name}`, jobBuffer)
    
    if (jobError) {
      return NextResponse.json(
        { error: 'Failed to upload job description' },
        { status: 500 }
      )
    }

    // Create analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        resume_url: resumeData.path,
        job_description_url: jobData.path,
        status: 'pending'
      })
      .select()
      .single()
    
    if (analysisError) {
      return NextResponse.json(
        { error: 'Failed to create analysis record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      analysisId: analysis.id
    })

  } catch (error) {
    console.error('Error processing files:', error)
    return NextResponse.json(
      { error: 'Failed to process files' },
      { status: 500 }
    )
  }
}
