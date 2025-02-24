import { createClient } from '@supabase/supabase-js';
import { NextResponse, NextRequest } from 'next/server';
import { CohereClient } from 'cohere-ai';
import pdfParse from 'pdf-parse';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!
});

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
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { analysisId, selectedSuggestions } = await request.json();
    if (!analysisId || !selectedSuggestions || !selectedSuggestions.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Get file path and verify it exists
    if (!analysis.file_path) {
      return NextResponse.json({ error: 'Resume file path not found' }, { status: 400 });
    }

    // Extract file name from path
    const fileName = analysis.file_path.split('/').pop();
    if (!fileName) {
      return NextResponse.json({ error: 'Invalid file path format' }, { status: 400 });
    }

    // Verify file type is PDF
    const fileType = fileName.split('.').pop()?.toLowerCase();
    if (fileType !== 'pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Get original resume file
    const { data: resumeFile, error: resumeError } = await supabase.storage
      .from('resumes')
      .download(analysis.file_path);

    if (resumeError || !resumeFile) {
      console.error('Resume file error:', resumeError);
      return NextResponse.json({ error: 'Failed to retrieve resume file' }, { status: 404 });
    }

    // Extract text from PDF
    let resumeText;
    try {
      const data = await pdfParse(Buffer.from(await resumeFile.arrayBuffer()));
      resumeText = data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return NextResponse.json({ error: 'Failed to parse PDF file' }, { status: 500 });
    }

    // Verify suggestions exist
    if (!analysis.suggestions || !Array.isArray(analysis.suggestions)) {
      return NextResponse.json({ error: 'No suggestions found for this analysis' }, { status: 400 });
    }

    // Get suggestions to implement
    const suggestionsToImplement = analysis.suggestions.filter(
      (s: any) => selectedSuggestions.includes(s.suggestion)
    );

    if (suggestionsToImplement.length === 0) {
      return NextResponse.json({ error: 'None of the selected suggestions were found' }, { status: 400 });
    }

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
      model: 'command',
      prompt,
      maxTokens: 2000,
      temperature: 0.2,
      k: 0,
      stopSequences: ["\n\n\n"],
      returnLikelihoods: 'NONE'
    });

    if (!optimizeResponse.generations?.[0]?.text) {
      throw new Error('Failed to generate optimized resume');
    }

    // Clean and validate the optimized text
    const optimizedText = optimizeResponse.generations[0].text
      .trim()
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII characters
      .replace(/\r\n/g, '\n')          // Normalize line endings
      .replace(/[\n]{3,}/g, '\n\n');   // Remove excessive line breaks

    if (!optimizedText) {
      throw new Error('Generated text is empty after cleaning');
    }

    // Create new PDF with optimized content
    let optimizedFile: Buffer;
    try {
      optimizedFile = await createPDFFromText(optimizedText);
    } catch (error) {
      console.error('PDF creation error:', error);
      throw new Error('Failed to create optimized PDF');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const optimizedFileName = `optimized_${timestamp}_${fileName}`;

    // Upload optimized file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('optimized-resumes')
      .upload(`${user.id}/${optimizedFileName}`, optimizedFile, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload optimized resume: ${uploadError.message}`);
    }

    // Generate download URL
    const { data: { signedUrl } } = await supabase.storage
      .from('optimized-resumes')
      .createSignedUrl(`${user.id}/${optimizedFileName}`, 60 * 60); // 1 hour expiry

    // Update analysis record with optimization details
    await supabase
      .from('analyses')
      .update({
        optimized_at: new Date().toISOString(),
        optimized_file_name: optimizedFileName,
        implemented_suggestions: selectedSuggestions
      })
      .eq('id', analysisId);

    return NextResponse.json({
      message: 'Resume optimized successfully',
      downloadUrl: signedUrl
    });

  } catch (error) {
    console.error('Error in optimize-resume:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize resume' },
      { status: 500 }
    );
  }
}
