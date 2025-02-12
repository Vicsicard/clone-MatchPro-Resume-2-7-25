import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Initialize Supabase client with service role key
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

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
    .normalize('NFKC')
    .replace(/[\uFEFF\uFFFF]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readFileAsText(file: File | Blob): Promise<string> {
  try {
    const text = await file.text();
    return sanitizeText(text);
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error('Failed to read file content');
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not configured');
  }

  const response = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: [text],
      model: 'embed-english-v3.0',
      input_type: 'search_document',
      truncate: 'END'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Cohere API error: ${error.message}`);
  }

  const data = await response.json();
  if (!data.embeddings?.[0]) {
    throw new Error('Failed to generate embedding');
  }

  // Log the embedding dimensions
  console.log('Generated embedding dimensions:', data.embeddings[0].length);

  return data.embeddings[0];
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function POST(request: Request) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.COHERE_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No Bearer token found');
    }

    // Create Supabase client
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    // Get user ID from token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error(userError?.message || 'User not found');
    }

    // Get form data
    const formData = await request.formData();
    const resume = formData.get('resume') as File | null;
    const jobDescription = formData.get('jobDescription') as File | null;

    if (!resume || !jobDescription) {
      throw new Error('Missing required files');
    }

    // Read and sanitize file contents
    const [resumeText, jobDescriptionText] = await Promise.all([
      readFileAsText(resume),
      readFileAsText(jobDescription)
    ]);

    if (!resumeText.trim() || !jobDescriptionText.trim()) {
      throw new Error('One or more files are empty');
    }

    // Create analysis record
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

    if (analysisError || !analysis) {
      throw new Error(analysisError?.message || 'Failed to create analysis record');
    }

    // Generate embeddings
    const [resumeEmbedding, jobDescriptionEmbedding] = await Promise.all([
      generateEmbedding(resumeText),
      generateEmbedding(jobDescriptionText)
    ]);

    // Store document embeddings
    const { error: embedError } = await supabase
      .from('document_embeddings')
      .insert([
        {
          content: resumeText,
          embedding: resumeEmbedding,
          metadata: {
            type: 'resume',
            analysis_id: analysis.id,
            filename: resume instanceof File ? resume.name : 'resume.txt'
          },
          created_at: new Date().toISOString()
        },
        {
          content: jobDescriptionText,
          embedding: jobDescriptionEmbedding,
          metadata: {
            type: 'job_description',
            analysis_id: analysis.id,
            filename: jobDescription instanceof File ? jobDescription.name : 'job.txt'
          },
          created_at: new Date().toISOString()
        }
      ]);

    if (embedError) {
      throw new Error(`Failed to store document embeddings: ${embedError.message}`);
    }

    // Calculate similarity score
    const similarityScore = calculateCosineSimilarity(resumeEmbedding, jobDescriptionEmbedding);

    // Update analysis with results
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        results: {
          similarity_score: similarityScore,
          timestamp: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', analysis.id);

    if (updateError) {
      throw new Error(`Failed to update analysis results: ${updateError.message}`);
    }

    return NextResponse.json({
      message: 'Analysis completed successfully',
      analysisId: analysis.id,
      status: 'completed',
      similarity_score: similarityScore
    });

  } catch (error: any) {
    console.error('Analysis error:', error);

    // If we have an analysis ID, update its status to failed
    const analysisId = error.analysisId;
    if (analysisId && supabase) {
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);
    }

    return NextResponse.json(
      { 
        error: error.message || 'An unexpected error occurred',
        details: error.details || undefined
      },
      { status: error.status || 500 }
    );
  }
}
