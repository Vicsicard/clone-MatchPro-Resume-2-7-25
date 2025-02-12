import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

type FormDataFile = File | Blob;

export async function POST(request: Request) {
  console.log('Starting analysis request...');

  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No Bearer token found');
      return NextResponse.json(
        { error: 'No Bearer token found' },
        { status: 401 }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user ID from token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid token:', userError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    console.log('Form data keys:', Array.from(formData.keys()));

    // Get files and user ID
    const resume = formData.get('resume') as FormDataFile | null;
    const jobDescription = formData.get('jobDescription') as FormDataFile | null;

    if (!resume || !jobDescription) {
      const error = `Missing required files: ${!resume ? 'resume' : ''} ${!jobDescription ? 'jobDescription' : ''}`;
      console.error(error);
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    // Convert files to text
    let resumeText = '';
    let jobDescriptionText = '';

    if (resume instanceof Blob) {
      resumeText = await resume.text();
    } else {
      console.error('Invalid resume type:', typeof resume);
      return NextResponse.json(
        { error: 'Invalid resume format' },
        { status: 400 }
      );
    }

    if (jobDescription instanceof Blob) {
      jobDescriptionText = await jobDescription.text();
    } else {
      console.error('Invalid job description type:', typeof jobDescription);
      return NextResponse.json(
        { error: 'Invalid job description format' },
        { status: 400 }
      );
    }

    // Validate text content
    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: 'Resume is empty' },
        { status: 400 }
      );
    }

    if (!jobDescriptionText.trim()) {
      return NextResponse.json(
        { error: 'Job description is empty' },
        { status: 400 }
      );
    }

    console.log('Creating analysis record...');
    // Create an analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        status: 'processing',
        resume_name: resume instanceof File ? resume.name : 'resume.txt',
        job_description_name: jobDescription instanceof File ? jobDescription.name : 'job.txt'
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Error creating analysis:', analysisError);
      return NextResponse.json(
        { error: `Database error: ${analysisError.message}` },
        { status: 500 }
      );
    }

    if (!analysis) {
      console.error('No analysis record created');
      return NextResponse.json(
        { error: 'Failed to create analysis record' },
        { status: 500 }
      );
    }

    console.log('Analysis record created:', analysis.id);

    // Create document embeddings
    console.log('Creating document embeddings...');
    const { data: documentData, error: documentError } = await supabase
      .from('document_embeddings')
      .insert([
        {
          content: resumeText,
          metadata: {
            filename: resume instanceof File ? resume.name : 'resume.txt',
            type: 'resume',
            analysis_id: analysis.id
          }
        },
        {
          content: jobDescriptionText,
          metadata: {
            filename: jobDescription instanceof File ? jobDescription.name : 'job.txt',
            type: 'job_description',
            analysis_id: analysis.id
          }
        }
      ])
      .select();

    if (documentError) {
      console.error('Error creating document embeddings:', documentError);
      // Update analysis status to failed
      await supabase
        .from('analyses')
        .update({ status: 'failed' })
        .eq('id', analysis.id);

      return NextResponse.json(
        { error: `Failed to store documents: ${documentError.message}` },
        { status: 500 }
      );
    }

    console.log('Documents stored successfully');

    // Update analysis status to completed with mock results
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        results: {
          score: 0.85,
          match_points: [
            { skill: 'JavaScript', score: 0.9 },
            { skill: 'Python', score: 0.8 }
          ]
        }
      })
      .eq('id', analysis.id);

    if (updateError) {
      console.error('Error updating analysis:', updateError);
      return NextResponse.json(
        { error: 'Failed to update analysis status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Analysis completed successfully',
      analysisId: analysis.id
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
}
