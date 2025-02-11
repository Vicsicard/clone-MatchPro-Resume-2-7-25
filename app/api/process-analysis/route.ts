import { createClient } from '@supabase/supabase-js';
import { CohereClient } from 'cohere-ai';
import { NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist';

export const runtime = 'edge';

// Initialize clients
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY_SECRET!
);

const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY!,
});

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

async function processDocument(file: File) {
    console.log('Processing document:', file.name);

    // Convert File to ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item: any) => item.str)
            .join(' ');
        text += pageText + ' ';
    }

    console.log('Extracted text length:', text.length);

    // Generate embeddings using Cohere
    const documentEmbeddingResponse = await cohere.embed({
        texts: [text],
        model: 'embed-english-v3.0',
        inputType: 'search_document',
    });

    if (!documentEmbeddingResponse.embeddings?.[0]) {
        throw new Error('Failed to generate document embedding');
    }

    const documentEmbedding = documentEmbeddingResponse.embeddings[0];

    console.log('Generated embedding');

    // Store in Supabase
    const { data, error } = await supabase
        .from('document_embeddings')
        .insert({
            content_type: 'resume',
            content: text,
            embedding: documentEmbedding,
            metadata: {
                filename: file.name,
                processed_at: new Date().toISOString()
            }
        })
        .select()
        .single();

    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }
    
    console.log('Stored document with ID:', data.id);
    return data;
}

async function findMatches(text: string) {
    // Generate embeddings using Cohere
    const jobEmbeddingResponse = await cohere.embed({
        texts: [text],
        model: 'embed-english-v3.0',
        inputType: 'search_query',
    });

    if (!jobEmbeddingResponse.embeddings?.[0]) {
        throw new Error('Failed to generate job description embedding');
    }

    const jobEmbedding = jobEmbeddingResponse.embeddings[0];

    // Find matches
    const { data, error } = await supabase
        .rpc('match_documents', {
            query_embedding: jobEmbedding
        });

    if (error) throw error;
    return data;
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const jobDescription = formData.get('jobDescription') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Process the uploaded resume
        const resumeResult = await processDocument(file);

        // If job description is provided, find matches
        let matches = null;
        if (jobDescription) {
            matches = await findMatches(jobDescription);
        }
        
        return NextResponse.json({ 
            success: true, 
            data: {
                resume: resumeResult,
                matches: matches
            }
        });
    } catch (error) {
        console.error('Processing failed:', error);
        return NextResponse.json(
            { error: 'Processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
