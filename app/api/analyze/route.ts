import { createServerSupabaseClient } from '../../supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  let uploadedFiles: string[] = []

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

    console.log('User authenticated:', session.user.id)

    const formData = await request.formData()
    const resume = formData.get('resume') as File
    const jobDescription = formData.get('jobDescription') as File
    
    console.log('Files received:', {
      resume: resume ? { name: resume.name, type: resume.type, size: resume.size } : null,
      jobDescription: jobDescription ? { name: jobDescription.name, type: jobDescription.type, size: jobDescription.size } : null
    })

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
      console.log('Invalid file types:', { resumeType: resume.type, jobDescriptionType: jobDescription.type })
      return NextResponse.json(
        { error: 'Only PDF, DOC, and DOCX files are allowed' },
        { status: 400 }
      )
    }

    // Function to handle file cleanup on error
    const cleanupFiles = async () => {
      console.log('Cleaning up files:', uploadedFiles)
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
      console.log('Converting resume to buffer...')
      const resumeBuffer = Buffer.from(await resume.arrayBuffer())
      const resumePath = `${session.user.id}/${Date.now()}-${resume.name}`
      console.log('Uploading resume to path:', resumePath)
      
      const { data: resumeData, error: resumeError } = await supabase.storage
        .from('resumes')
        .upload(resumePath, resumeBuffer, {
          contentType: resume.type,
          upsert: false
        })
      
      if (resumeError) {
        console.error('Resume upload error:', resumeError)
        throw new Error(`Failed to upload resume: ${resumeError.message}`)
      }
      console.log('Resume uploaded successfully:', resumeData)
      uploadedFiles.push(`resumes/${resumePath}`)

      // Upload job description
      console.log('Converting job description to buffer...')
      const jobBuffer = Buffer.from(await jobDescription.arrayBuffer())
      const jobPath = `${session.user.id}/${Date.now()}-${jobDescription.name}`
      console.log('Uploading job description to path:', jobPath)
      
      const { data: jobData, error: jobError } = await supabase.storage
        .from('jobs')
        .upload(jobPath, jobBuffer, {
          contentType: jobDescription.type,
          upsert: false
        })
      
      if (jobError) {
        console.error('Job description upload error:', jobError)
        throw new Error(`Failed to upload job description: ${jobError.message}`)
      }
      console.log('Job description uploaded successfully:', jobData)
      uploadedFiles.push(`jobs/${jobPath}`)

      // Create analysis record
      console.log('Creating analysis record...')
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert({
          user_id: session.user.id,
          resume_url: `resumes/${resumePath}`,
          job_description_url: `jobs/${jobPath}`,
          status: 'pending'
        })
        .select()
        .single()
      
      if (analysisError) {
        console.error('Analysis creation error:', analysisError)
        throw new Error(`Failed to create analysis record: ${analysisError.message}`)
      }
      console.log('Analysis record created:', analysis)

      return NextResponse.json({ 
        success: true,
        analysisId: analysis.id,
        message: 'Files uploaded successfully. Analysis started.'
      })

    } catch (error: any) {
      console.error('Error in upload process:', error)
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
