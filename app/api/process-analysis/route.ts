import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { CohereClient } from 'cohere-ai';

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

// Initialize clients
const cohereClient = new CohereClient({ token: cohereApiKey });
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export const runtime = 'edge';

interface DocumentEmbedding {
  embedding: number[];
  metadata: {
    type: 'resume' | 'job_description';
    analysis_id: string;
  };
}

interface CohereEmbedResponse {
  embeddings: number[][];
  texts: string[];
  meta: {
    api_version: string;
  };
}

async function generateEmbedding(text: string): Promise<number[]> {
  console.log('Calling Cohere API...');
  const response = await cohereClient.embed({
    texts: [text],
    model: 'embed-english-v3.0',
    inputType: 'search_document',
  });

  if (!response.embeddings || !response.embeddings[0]) {
    throw new Error('Failed to generate embedding');
  }

  return response.embeddings[0];
}

export async function POST(req: Request) {
  console.log('Starting process-analysis...');
  
  // Return early if services are not configured
  if (!supabase) {
    console.warn('Required services are not configured');
    return NextResponse.json(
      { error: 'Service configuration missing' },
      { status: 501 }
    );
  }

  try {
    // Get analysis ID from query parameters
    const url = new URL(req.url);
    const analysisId = url.searchParams.get('analysisId');
    
    if (!analysisId) {
      console.error('No analysisId provided');
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    console.log('Processing analysis:', analysisId);

    // Get the analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      console.error('Error fetching analysis:', analysisError);
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    console.log('Found analysis:', {
      id: analysis.id,
      status: analysis.status,
      created_at: analysis.created_at
    });

    // Get the document embeddings
    console.log('Fetching documents...');
    const { data: documents, error: documentsError } = await supabase
      .from('document_embeddings')
      .select('*')
      .eq('metadata->analysis_id', analysisId);

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    console.log('Found documents:', {
      count: documents?.length,
      types: documents?.map(d => d.metadata.type)
    });

    if (!documents || documents.length !== 2) {
      console.error('Invalid number of documents:', documents?.length);
      return NextResponse.json(
        { error: 'Invalid number of documents' },
        { status: 400 }
      );
    }

    const resume = documents.find(d => d.metadata.type === 'resume');
    const jobDescription = documents.find(d => d.metadata.type === 'job_description');

    if (!resume || !jobDescription) {
      console.error('Missing required documents:', {
        hasResume: !!resume,
        hasJobDescription: !!jobDescription
      });
      return NextResponse.json(
        { error: 'Missing required documents' },
        { status: 400 }
      );
    }

    console.log('Generating embeddings...');

    // Generate embeddings for both documents
    try {
      console.log('Generating resume embedding...');
      const resumeEmbedding = await generateEmbedding(resume.content);
      console.log('Resume embedding generated, length:', resumeEmbedding.length);

      console.log('Generating job description embedding...');
      const jobEmbedding = await generateEmbedding(jobDescription.content);
      console.log('Job description embedding generated, length:', jobEmbedding.length);

      // Update document embeddings with vectors
      console.log('Updating documents with embeddings...');
      const { error: updateError } = await supabase
        .from('document_embeddings')
        .upsert([
          {
            id: resume.id,
            embedding: resumeEmbedding,
            updated_at: new Date().toISOString()
          },
          {
            id: jobDescription.id,
            embedding: jobEmbedding,
            updated_at: new Date().toISOString()
          }
        ]);

      if (updateError) {
        console.error('Error updating documents:', updateError);
        throw updateError;
      }

      // Calculate similarity score
      console.log('Calculating similarity score...');
      const similarity = calculateCosineSimilarity(resumeEmbedding, jobEmbedding);
      console.log('Similarity score:', similarity);

      // Update analysis with results
      console.log('Updating analysis with results...');
      const { error: resultError } = await supabase
        .from('analyses')
        .update({
          status: 'completed',
          results: {
            similarity_score: similarity,
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (resultError) {
        console.error('Error updating analysis:', resultError);
        throw resultError;
      }

      console.log('Analysis completed successfully');
      return NextResponse.json({
        message: 'Analysis completed successfully',
        similarity_score: similarity
      });

    } catch (error: any) {
      console.error('Error processing documents:', error);
      
      // Update analysis status to failed
      console.log('Updating analysis status to failed...');
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      return NextResponse.json(
        { error: 'Failed to process documents: ' + error.message },
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

function calculateCosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
