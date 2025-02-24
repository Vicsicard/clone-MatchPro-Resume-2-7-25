import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import cohere from 'cohere-ai';
import { createPDFFromText } from './pdf-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cohereApiKey = process.env.COHERE_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Application configuration error: Missing Supabase credentials');
}

if (!cohereApiKey) {
  console.error('Missing Cohere API key');
  throw new Error('Application configuration error: Missing Cohere API key. Please add COHERE_API_KEY to your .env.local file');
}

cohere.init(cohereApiKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPDFFromText(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  
  // PDF settings
  const fontSize = 11;
  const lineHeight = fontSize * 1.5;  // Increased for better readability
  const margin = 72;  // Standard 1-inch margin
  let y = height - margin;
  const maxWidth = width - (margin * 2);
  
  // Clean and normalize text
  const cleanText = text
    .replace(/[^\x20-\x7E\n]/g, ' ')  // Replace non-ASCII with space instead of removing
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/[\n]{3,}/g, '\n\n')     // Remove excessive line breaks
    .replace(/\t/g, '    ')           // Convert tabs to spaces
    .replace(/ {2,}/g, ' ')           // Remove multiple spaces
    .trim();

  // Split text into sections
  const sections = cleanText.split('\n\n');
  
  // Function to add a new page
  const addNewPage = () => {
    page = pdfDoc.addPage(PageSizes.A4);
    y = height - margin;
    return page;
  };

  // Function to write a line of text
  const writeLine = (text: string, indent: number = 0) => {
    if (y < margin + lineHeight) {
      addNewPage();
    }
    page.drawText(text, {
      x: margin + indent,
      y,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
      lineHeight,
    });
    y -= lineHeight;
  };

  for (const section of sections) {
    if (y < margin + lineHeight * 2) {
      addNewPage();
    }

    // Handle each line in the section
    const lines = section.split('\n');
    for (const line of lines) {
      // Detect if line is a bullet point
      const isListItem = line.trim().startsWith('•') || line.trim().startsWith('-');
      const indent = isListItem ? 20 : 0;
      
      // Word wrap long lines
      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
        
        if (lineWidth > maxWidth - indent) {
          writeLine(currentLine, indent);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      // Write remaining text
      if (currentLine) {
        writeLine(currentLine, indent);
      }
    }
    
    // Add extra space between sections
    y -= lineHeight;
  }
  
  return Buffer.from(await pdfDoc.save());
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { analysisId, selectedSuggestions } = data;

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

    // Generate optimization prompt
    const prompt = `You are a professional resume optimizer. Your task is to improve the following resume based on specific suggestions.
    Keep the formatting clean and simple, using only basic characters (letters, numbers, spaces, and basic punctuation).
    Use bullet points (•) for listing items.
    Maintain clear section headings.
    Use consistent spacing.

Original Resume:
${resumeText}

Suggestions to implement:
${suggestionsToImplement.map((s: any) => `- ${s.suggestion}: ${s.details}`).join('\n')}

Instructions:
1. Maintain the same overall structure and sections
2. Keep all existing contact information and personal details
3. Implement the suggested improvements while preserving other content
4. Return only the optimized resume text, no explanations
5. Use simple formatting:
   - Basic bullet points (•) for lists
   - Clear section headings in ALL CAPS
   - Single blank line between sections
   - No special characters or symbols
6. Preserve all relevant experience and qualifications
7. Keep formatting consistent throughout

Optimized Resume:`;

    // Generate optimized content
    const optimizeResponse = await cohere.generate({
      prompt,
      model: 'command',
      maxTokens: 2000,
      temperature: 0.2,
      returnLikelihoods: 'NONE',
      truncate: 'END'
    });

    if (!optimizeResponse.generations || !optimizeResponse.generations[0]) {
      throw new Error('Failed to generate optimized resume');
    }

    const optimizedText = optimizeResponse.generations[0].text;

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

  } catch (error) {
    console.error('Optimization error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
