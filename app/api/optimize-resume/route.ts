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
      .select('content_json')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      console.error('Error fetching analysis:', analysisError);
      return NextResponse.json({ error: 'Analysis record not found' }, { status: 404 });
    }

    // Extract resume text and file path from content_json
    const resumeText = analysis.content_json?.resumeText;
    const originalSuggestions = analysis.content_json?.suggestions || [];
    
    if (!resumeText) {
      return NextResponse.json({ error: 'Resume text not found in analysis record' }, { status: 400 });
    }

    // Filter selected suggestions
    const suggestionsToImplement = originalSuggestions.filter(s => 
      selectedSuggestions.includes(s.suggestion)
    );

    console.log('Implementing suggestions:', suggestionsToImplement);

    // Generate optimized resume
    try {
      // Generate optimized resume using chat
      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cohereApiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: "command-r-plus",
          message: `You are a professional resume optimizer. Improve the following resume to better match the job description by implementing the selected suggestions.

Resume Text:
${resumeText}

Job Description:
${jobDescText}

Suggestions to implement (3-5 improvements total):
${suggestionsToImplement.map((s, i) => `${i+1}. ${s.suggestion}: ${s.details}`).join('\n')}

Please provide:
1. An optimized version of the resume text that implements ALL of the suggestions above
2. Keep the same overall structure and formatting of the original resume
3. Format your response as a clean resume document that can be easily converted to PDF
4. Include ALL sections from the original resume, with improvements integrated naturally

DO NOT include explanations, just return the optimized resume text.`
        }),
      });

      const result = await response.json();
      
      // Parse the response
      try {
        let optimizedText = '';
        
        if (result.text) {
          optimizedText = result.text;
        } else if (result.message?.content) {
          optimizedText = result.message.content;
        } else if (result.generations && result.generations[0]) {
          optimizedText = result.generations[0].text;
        }

        // Clean and validate the optimized text
        const cleanedOptimizedText = optimizedText
          .trim()
          .replace(/^```[\w]*\n/, '')  // Remove beginning markdown code block
          .replace(/```$/, '')         // Remove ending markdown code block
          .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII characters
          .replace(/\r\n/g, '\n')      // Normalize line endings
          .replace(/[\n]{3,}/g, '\n\n'); // Remove excessive line breaks

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

        // Create unique filename
        const timestamp = new Date().getTime();
        const optimizedFileName = `optimized_resume_${timestamp}.pdf`;
        
        // Save optimized resume to storage
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
