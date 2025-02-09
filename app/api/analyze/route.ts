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
      // Sanitize filename by removing special characters and spaces
      const sanitizedResumeName = resume.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const resumePath = `${session.user.id}/${Date.now()}-${sanitizedResumeName}`
      console.log('Uploading resume to path:', resumePath)
      
      const { data: resumeData, error: resumeError } = await supabase.storage
        .from('resumes')
        .upload(resumePath, resumeBuffer, {
          contentType: resume.type,
          upsert: false
        })
      
      if (resumeError) {
        console.error('Resume upload error:', resumeError)
        console.error('Resume details:', {
          path: resumePath,
          size: resume.size,
          type: resume.type
        })
        throw new Error(`Failed to upload resume: ${resumeError.message}`)
      }
      console.log('Resume uploaded successfully:', resumeData)
      uploadedFiles.push(`resumes/${resumePath}`)

      // Upload job description
      console.log('Converting job description to buffer...')
      const jobBuffer = Buffer.from(await jobDescription.arrayBuffer())
      // Sanitize filename by removing special characters and spaces
      const sanitizedJobName = jobDescription.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const jobPath = `${session.user.id}/${Date.now()}-${sanitizedJobName}`
      console.log('Uploading job description to path:', jobPath)
      
      const { data: jobData, error: jobError } = await supabase.storage
        .from('jobs')
        .upload(jobPath, jobBuffer, {
          contentType: jobDescription.type,
          upsert: false
        })
      
      if (jobError) {
        console.error('Job description upload error:', jobError)
        console.error('Job description details:', {
          path: jobPath,
          size: jobDescription.size,
          type: jobDescription.type
        })
        throw new Error(`Failed to upload job description: ${jobError.message}`)
      }
      console.log('Job description uploaded successfully:', jobData)
      uploadedFiles.push(`jobs/${jobPath}`)

      // Verify user session and access
      console.log('Verifying user access...')
      const { data: userCheck, error: userError } = await supabase
        .from('analyses')
        .select('id')
        .limit(1)
      
      if (userError) {
        console.error('Database access verification failed:', {
          error: userError,
          userId: session.user.id
        })
        throw new Error('Database access verification failed')
      }
      
      // Create analysis record with explicit schema match
      console.log('Creating analysis record...')
      const analysisData = {
        user_id: session.user.id,
        resume_url: `resumes/${resumePath}`,
        job_description_url: `jobs/${jobPath}`,
        status: 'pending',
        results: null
      }
      
      console.log('Attempting to insert analysis record:', analysisData)
      
      const { data: analysisResult, error: analysisError } = await supabase
        .from('analyses')
        .insert(analysisData)
        .select()
        .single()
      
      if (analysisError) {
        console.error('Analysis creation error:', {
          error: analysisError,
          errorMessage: analysisError.message,
          errorDetails: analysisError.details,
          data: analysisData,
          userId: session.user.id
        })
        await cleanupFiles()
        throw new Error(`Failed to create analysis record: ${analysisError.message}`)
      }
      
      if (!analysisResult) {
        console.error('No analysis record created')
        await cleanupFiles()
        throw new Error('Failed to create analysis record: No record returned')
      }
      
      console.log('Analysis record created:', analysisResult)

      return NextResponse.json({ 
        success: true,
        analysisId: analysisResult.id,
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
