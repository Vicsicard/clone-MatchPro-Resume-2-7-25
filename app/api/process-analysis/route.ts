import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Initialize Supabase client with service role key
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

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
  const response = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: [text],
      model: 'embed-english-v3.0',
      input_type: 'search_document'
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

  return data.embeddings[0];
}

export async function POST(req: Request) {
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

    // Get the document embeddings
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
      console.error('Missing required documents');
      return NextResponse.json(
        { error: 'Missing required documents' },
        { status: 400 }
      );
    }

    console.log('Generating embeddings...');

    // Generate embeddings for both documents
    try {
      const [resumeEmbedding, jobEmbedding] = await Promise.all([
        generateEmbedding(resume.content),
        generateEmbedding(jobDescription.content)
      ]);

      // Update document embeddings with vectors
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
        throw updateError;
      }

      // Calculate similarity score
      const similarity = calculateCosineSimilarity(resumeEmbedding, jobEmbedding);

      // Update analysis with results
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
        throw resultError;
      }

      return NextResponse.json({
        message: 'Analysis completed successfully',
        similarity_score: similarity
      });

    } catch (error: any) {
      console.error('Error processing documents:', error);
      
      // Update analysis status to failed
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
