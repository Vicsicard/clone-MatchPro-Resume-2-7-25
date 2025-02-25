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
    // Log request details
    console.log('Received analyze request');
    
    const formData = await request.formData();
    console.log('Form data fields:', Array.from(formData.keys()));
    
    const resumeFile = formData.get('resume') as File | null;
    const jobDescFile = formData.get('jobDesc') as File | null;
    const userId = formData.get('userId') as string | null;

    console.log('Request details:', {
      hasResumeFile: !!resumeFile,
      resumeFileType: resumeFile?.type,
      resumeFileName: resumeFile?.name,
      hasJobDescFile: !!jobDescFile,
      jobDescFileType: jobDescFile?.type,
      jobDescFileName: jobDescFile?.name,
      hasUserId: !!userId
    });

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
    console.log('Creating analysis record for user:', userId);
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
    console.log('Created analysis record:', analysisId);

    try {
      // Process files and extract text
      console.log('Processing files');
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
          console.error('Failed to parse resume PDF:', error);
          return NextResponse.json({ error: 'Failed to parse resume PDF', details: error }, { status: 400 });
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
          console.error('Failed to parse job description PDF:', error);
          return NextResponse.json({ error: 'Failed to parse job description PDF', details: error }, { status: 400 });
        }
      } else {
        console.log('Reading job description as text file');
        jobDescText = jobDescBuffer.toString('utf-8');
        console.log('Successfully read job description text, length:', jobDescText.length);
      }

      try {
        // Analyze resume using Cohere service
        console.log('Analyzing resume with Cohere service');
        const analysisResult = await cohereService.analyzeResume(resumeText, jobDescText);
        console.log('Successfully analyzed resume');

        // Update analysis record with results
        console.log('Updating analysis record with results');
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

        console.log('Analysis completed successfully');
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
