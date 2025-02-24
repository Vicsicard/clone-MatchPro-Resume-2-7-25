import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { createPDFFromText } from './pdf-utils';
import { ChatRequest } from 'cohere-ai/api';

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

// Initialize Supabase client
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { analysisId, selectedSuggestions, jobDescText } = data;

    if (!analysisId || !selectedSuggestions || !Array.isArray(selectedSuggestions)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('resume_text, file_path')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      console.error('Error fetching analysis:', analysisError);
      return NextResponse.json({ error: 'Analysis record not found' }, { status: 404 });
    }

    const { resume_text: resumeText, file_path: filePath } = analysis;

    if (!resumeText || !filePath) {
      return NextResponse.json({ error: 'Resume text or file path not found in analysis record' }, { status: 400 });
    }

    // Get suggestions from selected IDs
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('suggestions')
      .select('suggestion, details')
      .eq('analysis_id', analysisId)
      .in('id', selectedSuggestions);

    if (suggestionsError || !suggestions) {
      console.error('Error fetching suggestions:', suggestionsError);
      return NextResponse.json({ error: 'Failed to fetch selected suggestions' }, { status: 500 });
    }

    const suggestionsToImplement = suggestions.map(s => ({
      suggestion: s.suggestion,
      details: s.details
    }));

    // Generate optimized resume
    try {
      // Generate optimized resume using chat
      const response = await fetch('https://api.cohere.ai/v2/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cohereApiKey}`,
        },
        body: JSON.stringify({
          model: "command-r-plus-08-2024",
          messages: [
            {
              role: "user",
              content: `You are a professional resume optimizer. Improve the following resume section to better match the job description.

Resume Text:
${resumeText}

Job Description:
${jobDescText}

Please provide:
1. An optimized version of the resume text
2. A list of specific improvements made
3. Format your response as JSON with 'optimizedText' and 'improvements' array

Example format:
{
  "optimizedText": "Improved resume text here...",
  "improvements": [
    {
      "original": "Original text",
      "improved": "Improved text",
      "reason": "Explanation of improvement"
    }
  ]
}`
            }
          ]
        }),
      });

      const result = await response.json();

      // Parse the response
      try {
        const text = result.message.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          const optimizedText = result.optimizedText || '';

          // Clean and validate the optimized text
          const cleanedOptimizedText = optimizedText
            .trim()
            .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII characters
            .replace(/\r\n/g, '\n')          // Normalize line endings
            .replace(/[\n]{3,}/g, '\n\n');   // Remove excessive line breaks

          if (!cleanedOptimizedText) {
            throw new Error('Generated text is empty after cleaning');
          }

          // Create PDF from optimized text
          let optimizedFile: Buffer;
          try {
            optimizedFile = await createPDFFromText(cleanedOptimizedText);
          } catch (error) {
            console.error('PDF creation error:', error);
            throw new Error('Failed to create optimized PDF');
          }

          // Save optimized resume to storage
          const optimizedFileName = `optimized_${filePath}`;
          const { error: uploadError } = await supabase.storage
            .from('optimized-resumes')
            .upload(optimizedFileName, optimizedFile, {
              contentType: 'application/pdf',
              cacheControl: '3600'
            });

          if (uploadError) {
            console.error('Error uploading optimized resume:', uploadError);
            throw new Error('Failed to save optimized resume');
          }

          // Get download URL
          const { data: { publicUrl } } = supabase.storage
            .from('optimized-resumes')
            .getPublicUrl(optimizedFileName);

          return NextResponse.json({
            success: true,
            downloadUrl: publicUrl,
            message: 'Resume optimized successfully'
          });
        }
      } catch (error) {
        console.error('Failed to parse optimization result:', error);
      }

      // Return original text if parsing fails
      return NextResponse.json({
        success: false,
        message: 'Failed to optimize resume'
      });
    } catch (error) {
      console.error('Optimization error:', error);
      return NextResponse.json({ error: 'Failed to optimize resume' }, { status: 500 });
    }

  } catch (error) {
    console.error('Optimization error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const preferredRegion = 'auto';
