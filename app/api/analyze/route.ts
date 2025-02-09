import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  let uploadedFiles: string[] = []

  try {
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

    // Check file types
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(resume.type) || !allowedTypes.includes(jobDescription.type)) {
      return NextResponse.json(
        { error: 'Only PDF, DOC, and DOCX files are allowed' },
        { status: 400 }
      )
    }

    // Function to handle file cleanup on error
    const cleanupFiles = async () => {
      if (uploadedFiles.length > 0) {
        const promises = uploadedFiles.map(path => {
          const [bucket, ...pathParts] = path.split('/')
          return supabase.storage
            .from(bucket)
            .remove([pathParts.join('/')])
        })
        await Promise.all(promises)
      }
    }
    
    try {
      // Upload resume
      const resumeBuffer = Buffer.from(await resume.arrayBuffer())
      const resumePath = `resumes/${session.user.id}/${Date.now()}-${resume.name}`
      const { error: resumeError } = await supabase.storage
        .from('resumes')
        .upload(resumePath.split('/').slice(1).join('/'), resumeBuffer, {
          contentType: resume.type,
          upsert: false
        })
      
      if (resumeError) {
        throw new Error(`Failed to upload resume: ${resumeError.message}`)
      }
      uploadedFiles.push(resumePath)

      // Upload job description
      const jobBuffer = Buffer.from(await jobDescription.arrayBuffer())
      const jobPath = `jobs/${session.user.id}/${Date.now()}-${jobDescription.name}`
      const { error: jobError } = await supabase.storage
        .from('jobs')
        .upload(jobPath.split('/').slice(1).join('/'), jobBuffer, {
          contentType: jobDescription.type,
          upsert: false
        })
      
      if (jobError) {
        throw new Error(`Failed to upload job description: ${jobError.message}`)
      }
      uploadedFiles.push(jobPath)

      // Create analysis record
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert({
          user_id: session.user.id,
          resume_url: resumePath,
          job_description_url: jobPath,
          status: 'pending'
        })
        .select()
        .single()
      
      if (analysisError) {
        throw new Error(`Failed to create analysis record: ${analysisError.message}`)
      }

      return NextResponse.json({ 
        success: true,
        analysisId: analysis.id,
        message: 'Files uploaded successfully. Analysis started.'
      })

    } catch (error: any) {
      await cleanupFiles()
      throw error
    }

  } catch (error: any) {
    console.error('Error processing files:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process files' },
      { status: 500 }
    )
  }
}
