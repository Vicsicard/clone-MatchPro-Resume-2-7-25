import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import { Database } from '@/types/supabase';
import { Request } from 'next/server';
import { File } from 'web-api-file';
import { Buffer } from 'buffer';
import { CohereClient } from 'cohere-ai';

// Initialize Cohere
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!,
});

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let analysisId: string | null = null;

  try {
    console.log('Starting analysis request...');

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    // Create Supabase client
    console.log('Creating Supabase client...');
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Get user
    console.log('Getting user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError) {
      console.error('User error:', userError);
      return NextResponse.json({ error: 'Unauthorized', details: userError }, { status: 401 });
    }
    if (!user) {
      console.error('No user found');
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Get form data
    console.log('Getting form data...');
    const formData = await request.formData();
    const resume = formData.get('resume') as File;
    const jobDescription = formData.get('jobDescription') as File;
    
    if (!resume || !jobDescription) {
      console.error('Missing files:', { resume: !!resume, jobDescription: !!jobDescription });
      return NextResponse.json({ error: 'Please provide both resume and job description' }, { status: 400 });
    }

    console.log('Files received:', { 
      resume: { name: resume.name, type: resume.type, size: resume.size },
      jobDescription: { name: jobDescription.name, type: jobDescription.type, size: jobDescription.size }
    });

    // Create analysis record
    console.log('Creating analysis record...');
    const { data: analysis, error: insertError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        status: 'uploading',
        file_name: resume.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create analysis record', details: insertError }, { status: 500 });
    }
    if (!analysis) {
      console.error('No analysis record created');
      return NextResponse.json({ error: 'Failed to create analysis record - no data returned' }, { status: 500 });
    }

    analysisId = analysis.id;
    console.log('Analysis record created:', analysisId);

    // Create resumes bucket if it doesn't exist
    console.log('Ensuring bucket exists...');
    const { error: bucketError } = await supabase.storage.createBucket('resumes', {
      public: false,
      allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError && bucketError.message !== 'Bucket already exists') {
      console.error('Bucket creation error:', bucketError);
      throw new Error(`Failed to create storage bucket: ${bucketError.message}`);
    }

    // Upload resume to storage
    console.log('Uploading resume...');
    const resumeUploadResult = await uploadFile(resume, user.id, analysis.id);
    if (!resumeUploadResult) {
      const error = 'Failed to upload resume';
      console.error(error);
      await supabase
        .from('analyses')
        .update({ status: 'failed', error })
        .eq('id', analysis.id);
      return NextResponse.json({ error }, { status: 500 });
    }

    // Upload job description to storage
    console.log('Uploading job description...');
    const jobDescUploadResult = await uploadFile(jobDescription, user.id, analysis.id, 'job_description.txt');
    if (!jobDescUploadResult) {
      const error = 'Failed to upload job description';
      console.error(error);
      await supabase
        .from('analyses')
        .update({ status: 'failed', error })
        .eq('id', analysis.id);
      return NextResponse.json({ error }, { status: 500 });
    }

    // Update analysis record with file paths
    console.log('Updating analysis record with file paths...');
    const { error: updateError } = await supabase
      .from('analyses')
      .update({
        file_path: resumeUploadResult.path,
        file_format: resumeUploadResult.format,
        job_description_path: jobDescUploadResult.path,
        status: 'processing'
      })
      .eq('id', analysis.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update analysis record', details: updateError }, { status: 500 });
    }

    // Extract text from resume
    console.log('Extracting text from resume...');
    const resumeBuffer = Buffer.from(await resume.arrayBuffer());
    let rawResumeText: string;
    
    try {
      if (resumeUploadResult.format === 'pdf') {
        const pdfResult = await pdfParse(resumeBuffer);
        rawResumeText = pdfResult.text;
      } else {
        rawResumeText = await resume.text();
      }
    } catch (error: any) {
      console.error('Text extraction error:', error);
      throw new Error(`Failed to extract text from resume: ${error.message}`);
    }

    // Extract text from job description
    console.log('Extracting text from job description...');
    let jobDescriptionText: string;
    try {
      jobDescriptionText = await jobDescription.text();
    } catch (error: any) {
      console.error('Job description text extraction error:', error);
      throw new Error(`Failed to extract text from job description: ${error.message}`);
    }

    // Sanitize texts
    console.log('Sanitizing texts...');
    const sanitizedResumeText = rawResumeText.replace(/[\r\n]+/g, ' ').trim();
    const sanitizedJobDescText = jobDescriptionText.replace(/[\r\n]+/g, ' ').trim();

    if (!sanitizedResumeText) {
      throw new Error('No text content found in resume');
    }
    if (!sanitizedJobDescText) {
      throw new Error('No text content found in job description');
    }

    // Analyze with Cohere
    console.log('Analyzing with Cohere...');
    const response = await cohere.generate({
      model: 'command',
      prompt: `You are a professional resume reviewer. Analyze the following resume text and provide specific, actionable suggestions for improvement. Focus on:
      1. Content and clarity
      2. Professional impact
      3. Skills presentation
      4. Formatting and organization
      5. Industry alignment
      
      Format your response as a JSON array of suggestion objects with these properties:
      - category: The category of the suggestion (e.g., "Content", "Skills", "Format")
      - suggestion: The specific suggestion
      - reason: Why this would improve the resume
      - priority: A number from 1-5 (1 being highest priority)
      
      Example:
      [
        {
          "category": "Content",
          "suggestion": "Add quantifiable achievements to your job descriptions",
          "reason": "Numbers and metrics make your accomplishments more concrete and impactful",
          "priority": 1
        }
      ]

      Resume text to analyze:
      ${sanitizedResumeText}`,
      maxTokens: 500,
      temperature: 0.7,
      k: 0,
      stopSequences: [],
      returnLikelihoods: 'NONE'
    });

    if (!response.generations?.[0]?.text) {
      throw new Error('No analysis results received from Cohere');
    }

    // Parse suggestions
    console.log('Parsing suggestions...');
    let suggestions;
    try {
      suggestions = JSON.parse(response.generations[0].text);
    } catch (error: any) {
      console.error('Failed to parse Cohere response:', error);
      throw new Error(`Failed to parse analysis results: ${error.message}`);
    }

    // Calculate similarity score using Cohere
    console.log('Calculating similarity score...');
    const similarityResponse = await cohere.embed({
      texts: [sanitizedResumeText, sanitizedJobDescText],
      model: 'embed-english-v3.0',
      inputType: 'search_document',
    });

    let similarityScore = 0.5; // Default score
    if (similarityResponse.embeddings && similarityResponse.embeddings.length === 2) {
      const [resumeEmbedding, jobDescEmbedding] = similarityResponse.embeddings;
      similarityScore = calculateCosineSimilarity(resumeEmbedding, jobDescEmbedding);
    }

    // Prepare the content JSON
    console.log('Preparing content JSON...');
    const contentJson = {
      analysis: {
        score: {
          keywords: similarityScore * 0.8,
          experience: similarityScore * 0.9,
          education: similarityScore * 0.7,
          skills: similarityScore * 1.1,
          overall: similarityScore
        },
        similarity_score: similarityScore,
        suggestions,
        improvement_areas: [
          {
            category: "Keywords",
            score: similarityScore * 0.8,
            suggestions: ["Include more industry-specific keywords", "Add relevant technical terms"]
          },
          {
            category: "Experience",
            score: similarityScore * 0.9,
            suggestions: ["Quantify your achievements", "Focus on relevant experience"]
          },
          {
            category: "Skills",
            score: similarityScore * 1.1,
            suggestions: ["Add more technical skills", "Highlight relevant certifications"]
          }
        ]
      }
    };

    // Update analysis record with results
    console.log('Updating analysis record with results...');
    const { error: finalUpdateError } = await supabase
      .from('analyses')
      .update({
        status: 'completed',
        content_json: contentJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysis.id);

    if (finalUpdateError) {
      console.error('Final update error:', finalUpdateError);
      throw new Error(`Failed to update analysis with results: ${finalUpdateError.message}`);
    }

    // Return success response
    console.log('Analysis completed successfully');
    return NextResponse.json({
      analysisId: analysis.id,
      status: 'completed',
      ...contentJson.analysis
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);

    // Update analysis status if we have an ID
    if (analysisId) {
      try {
        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('analyses')
          .update({
            status: 'failed',
            error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);
      } catch (updateError) {
        console.error('Failed to update analysis status:', updateError);
      }
    }

    return NextResponse.json(
      { 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

async function uploadFile(file: File, userId: string, analysisId: string, fileName?: string) {
  const bucket = 'resumes';
  const path = `user-${userId}/analyses/${analysisId}/${fileName || file.name}`;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    return {
      path,
      format: file.name.split('.').pop()?.toLowerCase() || 'unknown'
    };
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
