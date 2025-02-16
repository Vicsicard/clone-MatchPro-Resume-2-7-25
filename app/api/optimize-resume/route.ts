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

async function optimizeResume(resumeText: string, selectedSuggestion: string): Promise<string> {
  if (!process.env.COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not configured');
  }

  // Parse the suggestion to understand what needs to be changed
  const [categoryLine, whyLine, howLine] = selectedSuggestion.split('\n');
  const category = categoryLine.split(':')[0];
  const suggestion = categoryLine.split(':')[1].trim();
  const implementation = howLine.replace('How: ', '').trim();

  // Create a prompt for optimizing the resume
  const prompt = `
As an expert resume optimizer, improve this resume based on the following suggestion:

Category: ${category}
Suggestion: ${suggestion}
Implementation: ${implementation}

Original Resume:
${resumeText}

Please provide an optimized version of the resume that implements this suggestion. 
Maintain the same basic structure but enhance it according to the suggestion.
Keep all existing contact information and other personal details.
Return only the optimized resume text, with no additional explanations.`;

  try {
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt,
        max_tokens: 2000,
        temperature: 0.4,
        num_generations: 1,
        return_likelihoods: 'NONE'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere API error: ${error.message}`);
    }

    const data = await response.json();
    if (!data.generations?.[0]?.text) {
      throw new Error('Failed to generate optimized resume');
    }

    return data.generations[0].text.trim();
  } catch (error) {
    console.error('Error optimizing resume:', error);
    throw error;
  }
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

    // Get request body
    const body = await request.json();
    const { analysisId, selectedSuggestion } = body;

    if (!analysisId || !selectedSuggestion) {
      throw new Error('Missing required parameters');
    }

    // Get the original resume content
    const { data: documents, error: documentsError } = await supabase
      .from('document_embeddings')
      .select('*')
      .eq('metadata->analysis_id', analysisId)
      .eq('metadata->type', 'resume')
      .single();

    if (documentsError || !documents) {
      throw new Error('Failed to fetch original resume');
    }

    // Generate optimized resume
    const optimizedResume = await optimizeResume(documents.content, selectedSuggestion);

    // Store the optimized version
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        optimized_resume: optimizedResume,
        selected_suggestion: selectedSuggestion,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    if (updateError) {
      throw new Error('Failed to store optimized resume');
    }

    return NextResponse.json({
      message: 'Resume optimized successfully',
      optimizedResume
    });

  } catch (error: any) {
    console.error('Optimization error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An unexpected error occurred',
        details: error.details || undefined
      },
      { status: error.status || 500 }
    );
  }
}
