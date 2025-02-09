import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const resume = formData.get('resume') as File
    const jobDescription = formData.get('jobDescription') as File
    
    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Both resume and job description are required' },
        { status: 400 }
      )
    }

    // Check file sizes (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
    if (resume.size > MAX_FILE_SIZE || jobDescription.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }
    
    // Upload resume
    const resumeBuffer = Buffer.from(await resume.arrayBuffer())
    const { data: resumeData, error: resumeError } = await supabase.storage
      .from('resumes')
      .upload(`${session.user.id}/${Date.now()}-${resume.name}`, resumeBuffer)
    
    if (resumeError) {
      console.error('Resume upload error:', resumeError)
      return NextResponse.json(
        { error: 'Failed to upload resume' },
        { status: 500 }
      )
    }

    // Upload job description
    const jobBuffer = Buffer.from(await jobDescription.arrayBuffer())
    const { data: jobData, error: jobError } = await supabase.storage
      .from('jobs')
      .upload(`${session.user.id}/${Date.now()}-${jobDescription.name}`, jobBuffer)
    
    if (jobError) {
      console.error('Job description upload error:', jobError)
      // If job upload fails, clean up the resume
      await supabase.storage
        .from('resumes')
        .remove([resumeData.path])
      
      return NextResponse.json(
        { error: 'Failed to upload job description' },
        { status: 500 }
      )
    }

    // Create analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: session.user.id,
        resume_url: resumeData.path,
        job_description_url: jobData.path,
        status: 'pending'
      })
      .select()
      .single()
    
    if (analysisError) {
      console.error('Analysis creation error:', analysisError)
      // Clean up uploaded files if analysis creation fails
      await Promise.all([
        supabase.storage.from('resumes').remove([resumeData.path]),
        supabase.storage.from('jobs').remove([jobData.path])
      ])
      
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
