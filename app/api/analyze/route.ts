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
    const formData = await request.formData();
    const resumeFile = formData.get('resume') as File;
    const jobDescFile = formData.get('jobDesc') as File;
    const userId = formData.get('userId') as string;

    if (!resumeFile || !jobDescFile || !userId) {
      console.error('Missing required fields:', {
        hasResumeFile: !!resumeFile,
        hasJobDescFile: !!jobDescFile,
        hasUserId: !!userId
      });
      return NextResponse.json({ 
        error: 'Missing required files or user ID',
        details: {
          resume: !resumeFile ? 'Missing resume file' : null,
          jobDesc: !jobDescFile ? 'Missing job description file' : null,
          userId: !userId ? 'Missing user ID' : null
        }
      }, { status: 400 });
    }

    // Create analysis record
    const { data: analysis, error: createError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        status: 'processing',
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

    try {
      // Process files and extract text
      const resumeBuffer = Buffer.from(await resumeFile.arrayBuffer());
      const jobDescBuffer = Buffer.from(await jobDescFile.arrayBuffer());

      let resumeText = '';
      let jobDescText = '';

      // Extract text from PDF files
      if (resumeFile.type === 'application/pdf') {
        try {
          const resumeData = await pdfParse(resumeBuffer);
          resumeText = resumeData.text;
        } catch (error) {
          console.error('Failed to parse resume PDF:', error);
          return NextResponse.json({ error: 'Failed to parse resume PDF', details: error }, { status: 400 });
        }
      } else {
        resumeText = resumeBuffer.toString('utf-8');
      }

      if (jobDescFile.type === 'application/pdf') {
        try {
          const jobDescData = await pdfParse(jobDescBuffer);
          jobDescText = jobDescData.text;
        } catch (error) {
          console.error('Failed to parse job description PDF:', error);
          return NextResponse.json({ error: 'Failed to parse job description PDF', details: error }, { status: 400 });
        }
      } else {
        jobDescText = jobDescBuffer.toString('utf-8');
      }

      try {
        // Analyze resume using Cohere service
        const analysisResult = await cohereService.analyzeResume(resumeText, jobDescText);

        // Update analysis record with results
        const { error: finalUpdateError } = await supabase
          .from('analyses')
          .update({
            status: 'completed',
            similarity_score: analysisResult.similarityScore,
            suggestions: analysisResult.suggestions,
            content_json: {
              suggestions: analysisResult.suggestions,
              similarity_score: analysisResult.similarityScore
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);

        if (finalUpdateError) {
          console.error('Failed to update analysis record with results:', finalUpdateError);
          return NextResponse.json({ error: 'Failed to update analysis record', details: finalUpdateError }, { status: 500 });
        }

        return NextResponse.json({
          id: analysisId,
          status: 'completed',
          similarityScore: analysisResult.similarityScore,
          suggestions: analysisResult.suggestions
        });
      } catch (error) {
        console.error('Failed to analyze resume:', error);
        
        // Update analysis record with error
        await supabase
          .from('analyses')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : String(error),
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);

        return NextResponse.json({ error: 'Failed to analyze resume', details: error }, { status: 500 });
      }
    } catch (error) {
      console.error('Failed to process files:', error);

      // Update analysis record with error
      await supabase
        .from('analyses')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      return NextResponse.json({ error: 'Failed to process files', details: error }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error }, { status: 500 });
  }
}
