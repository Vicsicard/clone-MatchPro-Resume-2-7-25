import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { CohereClient } from 'cohere-ai';

export const runtime = 'edge';

// Initialize clients
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const cohere = new CohereClient({ 
    token: process.env.COHERE_API_KEY! 
});

async function processDocument(file: File) {
    console.log('Processing document:', file.name);

    // 1. Get PDF text
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer);
    const text = pdfDoc.getPages()
        .map(page => page.getText())
        .join(' ');
    
    console.log('Extracted text length:', text.length);

    // 2. Get embedding
    const embedding = await cohere.embed({
        texts: [text],
        model: 'embed-english-v3.0'
    });
    
    console.log('Generated embedding');

    // 3. Store in Supabase
    const { data, error } = await supabase
        .from('document_embeddings')
        .insert({
            content_type: 'resume',
            content: text,
            embedding: embedding.embeddings[0],
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
    // 1. Get query embedding
    const embedding = await cohere.embed({
        texts: [text],
        model: 'embed-english-v3.0'
    });

    // 2. Find matches
    const { data, error } = await supabase
        .rpc('match_documents', {
            query_embedding: embedding.embeddings[0]
        });

    if (error) throw error;
    return data;
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const jobDescription = formData.get('jobDescription') as string;

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
