import { createClient } from '@supabase/supabase-js';
import { CohereClient } from 'cohere-ai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Initialize clients only if environment variables are present
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY_SECRET
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY_SECRET)
    : null;

const cohere = process.env.COHERE_API_KEY
    ? new CohereClient({
        token: process.env.COHERE_API_KEY,
    })
    : null;

export async function POST(req: Request) {
    // Return early if services are not configured
    if (!supabase || !cohere) {
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

        // Convert File to text
        const text = await extractTextFromPDF(file);
        console.log('Extracted text length:', text.length);

        // Generate embeddings using Cohere
        const documentEmbeddingResponse = await cohere.embed({
            texts: [text],
            model: 'embed-english-v3.0',
            inputType: 'search_document',
        });

        const embeddings = documentEmbeddingResponse.embeddings as number[][];
        if (!embeddings?.[0]) {
            throw new Error('Failed to generate document embedding');
        }

        const documentEmbedding = embeddings[0];

        // Store in Supabase
        const { data: documentData, error: insertError } = await supabase
            .from('document_embeddings')
            .insert([
                {
                    content: text,
                    embedding: documentEmbedding,
                    metadata: {
                        filename: file.name,
                        type: 'resume',
                    },
                },
            ])
            .select();

        if (insertError) {
            console.error('Error inserting document:', insertError);
            return NextResponse.json({ error: 'Failed to store document' }, { status: 500 });
        }

        // If job description provided, find similar documents
        if (jobDescription) {
            const jobEmbeddingResponse = await cohere.embed({
                texts: [jobDescription],
                model: 'embed-english-v3.0',
                inputType: 'search_query',
            });

            const jobEmbeddings = jobEmbeddingResponse.embeddings as number[][];
            if (!jobEmbeddings?.[0]) {
                throw new Error('Failed to generate job description embedding');
            }

            const jobEmbedding = jobEmbeddings[0];

            const { data: similarDocs, error: searchError } = await supabase
                .rpc('match_documents', {
                    query_embedding: jobEmbedding,
                    match_threshold: 0.7,
                    match_count: 5,
                });

            if (searchError) {
                console.error('Error searching similar documents:', searchError);
                return NextResponse.json({ error: 'Failed to search similar documents' }, { status: 500 });
            }

            return NextResponse.json({
                message: 'Document processed and similar documents found',
                document: documentData[0],
                similarDocuments: similarDocs,
            });
        }

        return NextResponse.json({
            message: 'Document processed successfully',
            document: documentData[0],
        });
    } catch (error) {
        console.error('Error processing document:', error);
        return NextResponse.json(
            { error: 'Failed to process document' },
            { status: 500 }
        );
    }
}

async function extractTextFromPDF(file: File): Promise<string> {
    // For now, we'll just read the file as text
    // This won't give perfect results but will work for text-based PDFs
    // We can improve this later with a more sophisticated PDF parser
    const text = await file.text();
    return text;
}
