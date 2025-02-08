import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/app/supabase/client'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const resume = formData.get('resume') as File
    const jobDescription = formData.get('jobDescription') as File
    
    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing required files' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    
    // Upload resume
    const resumeBuffer = await resume.arrayBuffer()
    const { data: resumeData, error: resumeError } = await supabase.storage
      .from('resumes')
      .upload(`${Date.now()}-${resume.name}`, resumeBuffer)
    
    if (resumeError) throw resumeError

    // Upload job description
    const jobBuffer = await jobDescription.arrayBuffer()
    const { data: jobData, error: jobError } = await supabase.storage
      .from('jobs')
      .upload(`${Date.now()}-${jobDescription.name}`, jobBuffer)
    
    if (jobError) throw jobError

    // Create analysis record
    const { data: analysis, error: dbError } = await supabase
      .from('analyses')
      .insert({
        resume_url: resumeData.path,
        job_description_url: jobData.path,
        status: 'pending'
      })
      .select()
      .single()
    
    if (dbError) throw dbError

    return NextResponse.json({
      status: 'success',
      analysisId: analysis.id
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
