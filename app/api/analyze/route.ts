import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import { Database } from '@/types/supabase';
import { Buffer } from 'buffer';
import { getCohereService } from '@/app/services/cohere';

// Initialize environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cohereApiKey = process.env.COHERE_API_KEY;

// Check required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Application configuration error: Missing Supabase credentials');
}

if (!cohereApiKey) {
  console.error('Missing Cohere API key');
  throw new Error('Application configuration error: Missing Cohere API key. Please add COHERE_API_KEY to your .env.local file');
}

// Initialize services
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
const cohereService = getCohereService(cohereApiKey);

export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    // Log request details
    console.log('Received analyze request from user:', user.id);
    
    const formData = await request.formData();
    console.log('Form data fields:', Array.from(formData.keys()));
    
    const resumeFile = formData.get('resume') as File | null;
    const jobDescFile = formData.get('jobDescription') as File | null;

    console.log('Request details:', {
      hasResumeFile: !!resumeFile,
      resumeFileType: resumeFile?.type,
      resumeFileName: resumeFile?.name,
      hasJobDescFile: !!jobDescFile,
      jobDescFileType: jobDescFile?.type,
      jobDescFileName: jobDescFile?.name,
      userId: user.id
    });

    if (!resumeFile || !jobDescFile) {
      console.error('Missing required files:', {
        hasResumeFile: !!resumeFile,
        hasJobDescFile: !!jobDescFile
      });
      return NextResponse.json({ 
        error: 'Missing required files',
        details: {
          resume: !resumeFile ? 'Missing resume file' : null,
          jobDesc: !jobDescFile ? 'Missing job description file' : null
        }
      }, { status: 400 });
    }

    // Create analysis record
    console.log('Creating analysis record for user:', user.id);
    const { data: analysis, error: createError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        status: 'processing',
        file_name: resumeFile.name,
        original_filename: resumeFile.name,
        job_description_path: jobDescFile.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError || !analysis) {
      console.error('Failed to create analysis record:', createError);
      return NextResponse.json({ error: 'Failed to create analysis record', details: createError }, { status: 500 });
    }

    const analysisId = analysis.id;
    console.log('Created analysis record:', analysisId);

    try {
      // Process files and extract text
      console.log('Processing files with details:', {
        resumeType: resumeFile.type,
        resumeSize: resumeFile.size,
        jobDescType: jobDescFile.type,
        jobDescSize: jobDescFile.size
      });
      
      const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
      const jobDescBuffer = Buffer.from(await jobDescFile.arrayBuffer());

      let resumeText = '';
      let jobDescText = '';

      // Extract text from PDF files
      if (resumeFile.type === 'application/pdf') {
        try {
          console.log('Parsing resume PDF');
          const resumeData = await pdfParse(resumeBuffer);
          resumeText = resumeData.text;
          console.log('Successfully parsed resume PDF, text length:', resumeText.length);
        } catch (error) {
          console.error('Failed to parse resume PDF:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            fileType: resumeFile.type,
            fileSize: resumeBuffer.length
          });
          return NextResponse.json({ 
            error: 'Failed to parse resume PDF', 
            details: {
              message: error instanceof Error ? error.message : 'Unknown error',
              phase: 'resume_parsing'
            }
          }, { status: 400 });
        }
      } else {
        console.log('Reading resume as text file');
        resumeText = resumeBuffer.toString('utf-8');
        console.log('Successfully read resume text, length:', resumeText.length);
      }

      if (jobDescFile.type === 'application/pdf') {
        try {
          console.log('Parsing job description PDF');
          const jobDescData = await pdfParse(jobDescBuffer);
          jobDescText = jobDescData.text;
          console.log('Successfully parsed job description PDF, text length:', jobDescText.length);
        } catch (error) {
          console.error('Failed to parse job description PDF:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            fileType: jobDescFile.type,
            fileSize: jobDescBuffer.length
          });
          return NextResponse.json({ 
            error: 'Failed to parse job description PDF', 
            details: {
              message: error instanceof Error ? error.message : 'Unknown error',
              phase: 'job_description_parsing'
            }
          }, { status: 400 });
        }
      } else {
        console.log('Reading job description as text file');
        jobDescText = jobDescBuffer.toString('utf-8');
        console.log('Successfully read job description text, length:', jobDescText.length);
      }

      try {
        // Test Cohere connection first
        console.log('Testing Cohere API connection...');
        await cohereService.callCohereAPI('chat', {
          model: 'command-r-plus-08-2024',
          messages: [{ role: 'user', content: 'test' }],
          temperature: 0.7,
          max_tokens: 10
        });
        console.log('Cohere API connection test successful');

        // Analyze resume using Cohere service
        console.log('Starting resume analysis with text lengths:', {
          resumeLength: resumeText.length,
          jobDescLength: jobDescText.length
        });
        
        const analysisResult = await cohereService.analyzeResume(resumeText, jobDescText);
        console.log('Successfully completed analysis:', {
          hasSuggestions: analysisResult.suggestions?.length > 0,
          similarityScore: analysisResult.similarityScore
        });

        // Update analysis record with results
        const { error: updateError } = await supabase
          .from('analyses')
          .update({
            status: 'completed',
            content_json: {
              suggestions: analysisResult.suggestions,
              similarityScore: analysisResult.similarityScore,
              resumeText: resumeText,
              jobDescriptionText: jobDescText
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);

        if (updateError) {
          console.error('Failed to update analysis record:', updateError);
          return NextResponse.json({ error: 'Failed to update analysis record', details: updateError }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          analysisId,
          suggestions: analysisResult.suggestions,
          similarity_score: analysisResult.similarityScore
        });
      } catch (error) {
        console.error('Analysis error:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          phase: 'cohere_analysis'
        });

        // Update analysis record to failed state
        const { error: updateError } = await supabase
          .from('analyses')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);

        if (updateError) {
          console.error('Failed to update analysis record after error:', updateError);
        }

        return NextResponse.json({ 
          error: 'Failed to analyze resume', 
          details: {
            message: error instanceof Error ? error.message : 'Unknown error',
            phase: 'cohere_analysis'
          }
        }, { status: 500 });
      }
    } catch (error) {
      console.error('Unexpected error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return NextResponse.json({ 
        error: 'An unexpected error occurred', 
        details: {
          message: error instanceof Error ? error.message : 'Unknown error',
          phase: 'unknown'
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error }, { status: 500 });
  }
}
