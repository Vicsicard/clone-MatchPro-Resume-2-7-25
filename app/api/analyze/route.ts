import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

type FormDataFile = File | Blob;

type AnalysisStatus = 'processing' | 'completed' | 'failed';

interface Analysis {
  id: string;
  user_id: string;
  status: AnalysisStatus;
  resume_name: string;
  job_description_name: string;
  created_at: string;
  updated_at?: string;
  error?: string;
  results?: any;
}

function sanitizeText(text: string): string {
  return text
    // Normalize Unicode characters
    .normalize('NFKC')
    // Remove BOM and other special Unicode characters
    .replace(/[\uFEFF\uFFFF]/g, '')
    // Replace Unicode quotes with ASCII quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace Unicode dashes with ASCII dashes
    .replace(/[\u2013\u2014]/g, '-')
    // Replace other problematic characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    .trim();
}

async function readFileAsText(file: FormDataFile): Promise<string> {
  try {
    const text = await file.text();
    return sanitizeText(text);
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read file content');
  }
}

export async function POST(request: Request) {
  console.log('Starting analysis request...');

  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

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
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user ID from token
    const token = authHeader.split(' ')[1];
    console.log('Verifying token...');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      console.error('Invalid token:', userError);
      return NextResponse.json(
        { error: `Authentication failed: ${userError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('No user found for token');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Get form data
    const formData = await request.formData();
    console.log('Form data keys:', Array.from(formData.keys()));

    // Get files
    const resume = formData.get('resume') as FormDataFile | null;
    const jobDescription = formData.get('jobDescription') as FormDataFile | null;

    if (!resume || !jobDescription) {
      const error = `Missing required files: ${!resume ? 'resume' : ''} ${!jobDescription ? 'jobDescription' : ''}`.trim();
      console.error(error);
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    // Read file contents with proper error handling
    let resumeText: string;
    let jobDescriptionText: string;
    
    try {
      resumeText = await readFileAsText(resume);
      jobDescriptionText = await readFileAsText(jobDescription);
    } catch (error: any) {
      console.error('Error reading files:', error);
      return NextResponse.json(
        { error: 'Failed to read file contents: ' + error.message },
        { status: 500 }
      );
    }

    // Validate text content
    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: 'Resume file is empty' },
        { status: 400 }
      );
    }

    if (!jobDescriptionText.trim()) {
      return NextResponse.json(
        { error: 'Job description file is empty' },
        { status: 400 }
      );
    }

    // Create analysis record
    console.log('Creating analysis record for user:', user.id);
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert([
        {
          user_id: user.id,
          status: 'processing',
          resume_name: resume instanceof File ? resume.name : 'resume.txt',
          job_description_name: jobDescription instanceof File ? jobDescription.name : 'job.txt',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (analysisError) {
      console.error('Failed to create analysis:', {
        error: analysisError,
        message: analysisError.message,
        details: analysisError.details,
        hint: analysisError.hint,
        code: analysisError.code
      });
      return NextResponse.json(
        { error: `Failed to create analysis: ${analysisError.message}` },
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

    // Create document embeddings records
    try {
      console.log('Creating document embeddings...');
      const { error: embedError } = await supabase
        .from('document_embeddings')
        .insert([
          {
            content: resumeText,
            metadata: {
              type: 'resume',
              analysis_id: analysis.id,
              filename: resume instanceof File ? resume.name : 'resume.txt'
            },
            created_at: new Date().toISOString()
          },
          {
            content: jobDescriptionText,
            metadata: {
              type: 'job_description',
              analysis_id: analysis.id,
              filename: jobDescription instanceof File ? jobDescription.name : 'job.txt'
            },
            created_at: new Date().toISOString()
          }
        ]);

      if (embedError) {
        console.error('Failed to create document embeddings:', {
          error: embedError,
          message: embedError.message,
          details: embedError.details,
          hint: embedError.hint,
          code: embedError.code
        });
        // Update analysis status to failed
        await supabase
          .from('analyses')
          .update({ 
            status: 'failed',
            error: `Failed to store documents: ${embedError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', analysis.id);

        return NextResponse.json(
          { error: `Failed to create document embeddings: ${embedError.message}` },
          { status: 500 }
        );
      }

      console.log('Documents stored successfully');

      // Trigger processing
      try {
        console.log('Triggering document processing...');
        const requestUrl = new URL(request.url);
        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
        const processUrl = `${baseUrl}/api/process-analysis?analysisId=${analysis.id}`;
        console.log('Process URL:', processUrl);
        
        const processResponse = await fetch(processUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          }
        });

        if (!processResponse.ok) {
          const error = await processResponse.json();
          console.error('Failed to trigger processing:', error);
          // Don't fail the request, just log the error
        } else {
          console.log('Processing triggered successfully');
        }
      } catch (error) {
        console.error('Error triggering processing:', error);
        // Don't fail the request, just log the error
      }

      return NextResponse.json({
        message: 'Analysis started',
        analysisId: analysis.id
      });
    } catch (error: any) {
      console.error('Error storing documents:', error);
      // Update analysis status to failed
      await supabase
        .from('analyses')
        .update({ 
          status: 'failed',
          error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysis.id);

      return NextResponse.json(
        { error: 'Failed to store documents: ' + error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
