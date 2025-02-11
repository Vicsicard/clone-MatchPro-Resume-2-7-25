import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Initialize clients only if environment variables are present
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY_SECRET
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY_SECRET)
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
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const jobDescription = formData.get('jobDescription') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!jobDescription) {
            return NextResponse.json({ error: 'No job description provided' }, { status: 400 });
        }

        console.log('Processing file:', file.name);
        console.log('File type:', file.type);
        console.log('File size:', file.size);

        // Convert File to text
        let text;
        try {
            text = await extractTextFromPDF(file);
            console.log('Extracted text length:', text.length);
            
            if (!text || text.length < 10) {
                throw new Error('Extracted text is too short or empty');
            }
        } catch (error) {
            console.error('Text extraction error:', error);
            return NextResponse.json(
                { error: 'Failed to extract text from file' },
                { status: 400 }
            );
        }

        console.log('Generating embeddings...');
        // Generate embeddings using Cohere
        let documentEmbedding;
        try {
            documentEmbedding = await generateEmbedding(text);
            console.log('Generated document embedding');
        } catch (error) {
            console.error('Embedding generation error:', error);
            return NextResponse.json(
                { error: 'Failed to generate document embedding' },
                { status: 500 }
            );
        }

        console.log('Storing document...');
        // Store in Supabase
        try {
            const { data: documentData, error: insertError } = await supabase
                .from('document_embeddings')
                .insert([
                    {
                        content: text,
                        embedding: documentEmbedding,
                        metadata: {
                            filename: file.name,
                            type: 'resume',
                            size: file.size,
                            mime_type: file.type
                        },
                    },
                ])
                .select();

            if (insertError) {
                console.error('Error inserting document:', insertError);
                return NextResponse.json(
                    { error: 'Failed to store document: ' + insertError.message },
                    { status: 500 }
                );
            }

            if (!documentData?.[0]) {
                throw new Error('No document data returned after insert');
            }

            console.log('Document stored successfully');

            // Generate job description embedding
            console.log('Generating job description embedding...');
            const jobEmbeddingResponse = await fetch('https://api.cohere.ai/v1/embed', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                texts: [jobDescription],
                model: 'embed-english-v3.0',
                input_type: 'search_query',
              })
            });

            // Handle the response without relying on specific types
            const jobEmbeddings = (await jobEmbeddingResponse.json())?.embeddings;
            if (!jobEmbeddings?.[0]) {
              throw new Error('Failed to generate job description embedding');
            }

            const jobEmbedding = jobEmbeddings[0];
            console.log('Generated job description embedding');

            console.log('Finding similar documents...');
            const { data: similarDocs, error: searchError } = await supabase
                .rpc('match_documents', {
                    query_embedding: jobEmbedding,
                    match_threshold: 0.7,
                    match_count: 5,
                });

            if (searchError) {
                console.error('Error searching similar documents:', searchError);
                return NextResponse.json(
                    { error: 'Failed to search similar documents: ' + searchError.message },
                    { status: 500 }
                );
            }

            console.log('Found similar documents:', similarDocs?.length || 0);
            return NextResponse.json({
                message: 'Analysis completed successfully',
                document: documentData[0],
                similarDocuments: similarDocs,
                matchScore: similarDocs?.[0]?.similarity || 0,
            });
        } catch (error: any) {
            console.error('Database operation error:', error);
            return NextResponse.json(
                { error: 'Database operation failed: ' + error.message },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('Error processing document:', error);
        return NextResponse.json(
            { error: 'Failed to process document: ' + error.message },
            { status: 500 }
        );
    }
}

async function extractTextFromPDF(file: File): Promise<string> {
    // For testing purposes, just read the file as text
    // In production, you would want to use a proper PDF parser
    try {
        const text = await file.text();
        // Clean up the text
        return text
            .replace(/[\r\n]+/g, ' ') // Replace multiple newlines with space
            .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
            .trim();                  // Remove leading/trailing whitespace
    } catch (error) {
        console.error('Error reading file:', error);
        throw new Error('Failed to read file content');
    }
}
