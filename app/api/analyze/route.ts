import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import { Database } from '@/types/supabase';
import { Buffer } from 'buffer';
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

// Initialize Cohere
const cohere = new CohereClient({ token: cohereApiKey });

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get files from request
    const formData = await request.formData();
    const resume = formData.get('resume') as File;
    const jobDescription = formData.get('jobDescription') as File;

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: 'Missing required files' }, { status: 400 });
    }

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create initial analysis record
    console.log('Creating analysis record...');
    const { data: analysis, error: createError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        status: 'uploading',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError || !analysis) {
      console.error('Create error:', createError);
      return NextResponse.json({ error: 'Failed to create analysis record' }, { status: 500 });
    }

    const analysisId = analysis.id;
    console.log('Analysis record created:', analysisId);

    // Get bucket info first
    console.log('Checking if bucket exists...');
    const { data: bucketList } = await supabase.storage.listBuckets();
    const bucketExists = bucketList?.some(b => b.name === 'resumes');

    // Create bucket only if it doesn't exist
    if (!bucketExists) {
      console.log('Creating resumes bucket...');
      const { error: bucketError } = await supabase.storage.createBucket('resumes', {
        public: false,
        allowedMimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        fileSizeLimit: '10MB'
      });

      if (bucketError) {
        console.error('Bucket creation error:', bucketError);
        return NextResponse.json({ error: 'Failed to create storage bucket', details: bucketError }, { status: 500 });
      }
    }

    // Process files and get text content
    console.log('Processing files...');
    let resumeText: string;
    let jobDescText: string;

    try {
      // Process resume
      console.log('Processing resume file:', {
        name: resume.name,
        type: resume.type,
        size: resume.size
      });
      
      const uploadResult = await uploadFile(resume, user.id, analysisId);
      console.log('Resume upload result:', uploadResult);

      if (!uploadResult) {
        throw new Error('Resume upload failed: upload result is null');
      }

      // Update analysis record with resume info
      console.log('Updating analysis record with resume info...');
      const { error: resumeUpdateError } = await supabase
        .from('analyses')
        .update({
          file_path: uploadResult.path,
          file_format: uploadResult.format,
          original_filename: uploadResult.originalFileName,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (resumeUpdateError) {
        console.error('Resume update error:', resumeUpdateError);
        throw new Error(`Failed to update analysis record with resume: ${resumeUpdateError.message}`);
      }

      // Extract resume text
      console.log('Extracting text from resume...');
      const resumeBuffer = await resume.arrayBuffer();
      if (uploadResult.format === 'pdf') {
        console.log('Parsing PDF file...');
        try {
          const pdfResult = await pdfParse(Buffer.from(resumeBuffer));
          resumeText = pdfResult.text;
          console.log('PDF parsing successful, text length:', resumeText.length);
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError);
          throw new Error(`Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
        }
      } else {
        console.log('Converting text file...');
        try {
          resumeText = Buffer.from(resumeBuffer).toString('utf-8');
          console.log('Text conversion successful, length:', resumeText.length);
        } catch (textError) {
          console.error('Text conversion error:', textError);
          throw new Error(`Failed to convert text file: ${textError instanceof Error ? textError.message : String(textError)}`);
        }
      }

      // Process job description
      console.log('Processing job description file:', {
        name: jobDescription.name,
        type: jobDescription.type,
        size: jobDescription.size
      });
      
      const jobDescUploadResult = await uploadFile(jobDescription, user.id, analysisId, 'job_description.txt');
      console.log('Job description upload result:', jobDescUploadResult);

      if (!jobDescUploadResult) {
        throw new Error('Job description upload failed: upload result is null');
      }

      // Update analysis record with job description info
      console.log('Updating analysis record with job description info...');
      const { error: jobDescUpdateError } = await supabase
        .from('analyses')
        .update({
          job_description_path: jobDescUploadResult.path,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (jobDescUpdateError) {
        console.error('Job description update error:', jobDescUpdateError);
        throw new Error(`Failed to update analysis record with job description: ${jobDescUpdateError.message}`);
      }

      // Extract job description text
      console.log('Extracting text from job description...');
      try {
        jobDescText = await jobDescription.text();
        console.log('Job description text extraction successful, length:', jobDescText.length);
      } catch (textError) {
        console.error('Job description text extraction error:', textError);
        throw new Error(`Failed to extract job description text: ${textError instanceof Error ? textError.message : String(textError)}`);
      }

      // Sanitize both texts
      console.log('Sanitizing texts...');
      resumeText = resumeText.replace(/[\r\n]+/g, ' ').trim();
      jobDescText = jobDescText.replace(/[\r\n]+/g, ' ').trim();

      if (!resumeText) {
        throw new Error('No text content found in resume after sanitization');
      }
      if (!jobDescText) {
        throw new Error('No text content found in job description after sanitization');
      }

      console.log('File processing completed successfully');

      // Analyze with Cohere
      console.log('Starting Cohere analysis...');
      try {
        // Generate suggestions using Cohere
        let response;
        try {
          response = await cohere.chat({
            message: `You are a professional resume analyzer. Analyze the resume and provide suggestions for improvement based on the job description.

Your task is to return ONLY a valid JSON array containing 3-5 suggestions in this exact format:
[
  {
    "suggestion": "Brief, clear suggestion title",
    "details": "Detailed explanation of the suggestion with specific examples from the resume"
  }
]

Resume Text:
${resumeText}

Job Description:
${jobDescText}

Remember:
1. Focus on actionable, specific improvements
2. Consider both the resume content and the job requirements
3. Maintain professional tone
4. Return ONLY valid JSON array
5. Include 3-5 suggestions maximum

Suggestions:`,
            model: 'command',
            temperature: 0.2,
            stream: false
          });
        } catch (error) {
          console.error('Cohere API error:', error);
          throw new Error('Failed to generate suggestions');
        }

        if (!response.text) {
          throw new Error('No suggestions generated');
        }

        const generatedText = response.text;
        console.log('Raw suggestions:', generatedText);

        // Parse suggestions
        let parsedSuggestions = [
          {
            suggestion: "Highlight relevant skills",
            details: "Add specific skills mentioned in the job description to your resume. Focus on technical skills and industry-specific knowledge that directly match the requirements.",
            impact: "High",
            category: "Skills"
          },
          {
            suggestion: "Quantify achievements",
            details: "Add specific numbers and metrics to your work experience. For example, include project outcomes, team sizes, or percentage improvements you achieved.",
            impact: "Medium",
            category: "Experience"
          },
          {
            suggestion: "Improve formatting",
            details: "Enhance the resume layout to make it more readable and professional. Use consistent spacing, bullet points, and sections to organize information clearly.",
            impact: "Medium",
            category: "Format"
          }
        ];

        try {
          console.log('Parsing suggestions...');
          // Clean up the response to ensure valid JSON
          const suggestionText = generatedText
            .trim()
            .replace(/^[^[]*\[/, '[') // Remove any text before the first [
            .replace(/][^]]*$/, ']') // Remove any text after the last ]
            .replace(/\n/g, ' ') // Remove newlines
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          if (suggestionText.startsWith('[') && suggestionText.endsWith(']')) {
            try {
              const tempSuggestions = JSON.parse(suggestionText);
              if (Array.isArray(tempSuggestions) && tempSuggestions.length > 0) {
                // Validate each suggestion
                const validSuggestions = tempSuggestions.filter(suggestion => 
                  suggestion.suggestion && 
                  suggestion.details
                );
                
                if (validSuggestions.length >= 3) {
                  parsedSuggestions = validSuggestions.slice(0, 3);
                }
              }
            } catch (error) {
              console.error('Error parsing suggestions JSON:', error);
            }
          }
        } catch (parseError) {
          console.error('Failed to parse suggestions:', parseError);
          console.log('Raw suggestions text:', generatedText);
        }
        
        console.log('Final suggestions:', parsedSuggestions);

        // Calculate similarity score
        console.log('Calculating similarity score with Cohere...');
        let similarityResponse;
        try {
          similarityResponse = await cohere.embed({
            texts: [resumeText, jobDescText],
            model: 'embed-english-v3.0',
            inputType: 'search_document',
          });
        } catch (embedError) {
          console.error('Cohere embed API error:', embedError);
          const errorMessage = embedError instanceof Error ? embedError.message : JSON.stringify(embedError);
          throw new Error(`Cohere embed API failed: ${errorMessage}`);
        }

        if (!similarityResponse.embeddings || similarityResponse.embeddings.length !== 2) {
          throw new Error('Invalid embedding response from Cohere');
        }

        const embeddings = similarityResponse.embeddings;
        const similarityScore = calculateCosineSimilarity(embeddings[0], embeddings[1]);
        console.log('Similarity score:', similarityScore);

        // Update analysis record with results
        console.log('Updating analysis record with results...');
        const { error: finalUpdateError } = await supabase
          .from('analyses')
          .update({
            status: 'completed',
            similarity_score: similarityScore,
            suggestions: parsedSuggestions,
            content_json: {
              suggestions: parsedSuggestions,
              similarity_score: similarityScore
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);

        if (finalUpdateError) {
          console.error('Final update error:', finalUpdateError);
          throw finalUpdateError;
        }

        console.log('Analysis completed successfully');
        return NextResponse.json({
          id: analysisId,
          status: 'completed',
          similarity_score: similarityScore,
          suggestions: parsedSuggestions
        });
      } catch (error) {
        console.error('Analysis error:', error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.log('Updating analysis record with error...');
        await supabase
          .from('analyses')
          .update({ 
            status: 'failed',
            error: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', analysisId);

        return NextResponse.json({ 
          error: 'Failed to analyze resume', 
          details: {
            message: errorMessage,
            stack: errorStack,
            phase: 'cohere_analysis'
          }
        }, { status: 500 });
      }
    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      console.log('Updating analysis record with error...');
      await supabase
        .from('analyses')
        .update({ 
          status: 'failed',
          error: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      return NextResponse.json({ 
        error: 'Failed to process files', 
        details: {
          message: errorMessage,
          stack: errorStack,
          phase: 'file_processing'
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Unexpected error', 
        details: {
          message: error.message,
          stack: error.stack
        }
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: String(error)
    }, { status: 500 });
  }
}

function sanitizeFileName(fileName: string): string {
  // Remove special characters and replace spaces with underscores
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .toLowerCase(); // Convert to lowercase
}

async function uploadFile(file: File, userId: string, analysisId: string, fileName?: string) {
  const bucket = 'resumes';
  const sanitizedFileName = sanitizeFileName(fileName || file.name);
  const path = `user-${userId}/analyses/${analysisId}/${sanitizedFileName}`;
  
  console.log('Starting file upload:', {
    bucket,
    path,
    originalFileName: fileName || file.name,
    sanitizedFileName,
    fileType: file.type,
    fileSize: file.size
  });

  if (!file || file.size === 0) {
    throw new Error('Invalid file provided');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('Reading file buffer...');
    const buffer = await file.arrayBuffer();
    console.log('File buffer read successfully, size:', buffer.byteLength);

    console.log('Uploading to Supabase storage...');
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    if (!data) {
      console.error('No data returned from upload');
      throw new Error('No data returned from upload');
    }

    console.log('Upload successful:', data);

    return {
      path,
      format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      originalFileName: fileName || file.name
    };
  } catch (error) {
    console.error('Upload function error:', error);
    throw error;
  }
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
