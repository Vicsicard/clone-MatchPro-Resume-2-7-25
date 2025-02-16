import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { Analysis, FileFormat } from '@/types/analysis';
import { downloadFile } from '@/app/utils/storage';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getSupabaseClient(authHeader?: string | null) {
  if (!authHeader) {
    return createClient(supabaseUrl, supabaseKey);
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
}

async function applyOptimizations(text: string, suggestions: string[]): Promise<string> {
  let optimizedText = text;

  // Apply each suggestion
  for (const suggestion of suggestions) {
    // Extract key phrases from the suggestion
    const keyPhrases = suggestion.toLowerCase();

    if (keyPhrases.includes('technical skills') || keyPhrases.includes('skills')) {
      // Add a skills section or enhance existing one
      if (!optimizedText.toLowerCase().includes('technical skills')) {
        optimizedText = `TECHNICAL SKILLS\n${optimizedText}`;
      }
    }

    if (keyPhrases.includes('quantifiable') || keyPhrases.includes('achievements')) {
      // Add metrics and numbers to experience
      optimizedText = optimizedText.replace(
        /(\d+\s*(years?|yrs?)(\s+of)?\s+experience)/gi,
        (match) => `${match} with demonstrated success in delivering projects 20% ahead of schedule`
      );
    }

    if (keyPhrases.includes('industry') || keyPhrases.includes('relevant experience')) {
      // Highlight industry relevance
      optimizedText = optimizedText.replace(
        /(experience|worked|background)(\s+in\s+|\s+with\s+|\s+at\s+)/gi,
        (match) => `relevant industry ${match}`
      );
    }

    if (keyPhrases.includes('certifications')) {
      // Add a certifications section if not present
      if (!optimizedText.toLowerCase().includes('certifications')) {
        optimizedText += '\n\nCERTIFICATIONS\n- [Add relevant certifications here]';
      }
    }
  }

  // General formatting improvements
  optimizedText = optimizedText
    .replace(/•/g, '- ') // Standardize bullet points
    .replace(/([.!?])\s*(\w)/g, '$1\n$2') // Add line breaks after sentences
    .replace(/\n{3,}/g, '\n\n') // Remove excess line breaks
    .trim();

  return optimizedText;
}

async function generatePDF(text: string): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Set font and margins
  doc.setFont('helvetica');
  doc.setFontSize(12);
  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxWidth = pageWidth - (2 * margin);
  
  // Split text into sections (e.g., by double newline)
  const sections = text.split('\n\n').filter(Boolean);
  
  let yPosition = margin;
  
  sections.forEach((section, index) => {
    // Split section into lines that fit within page width
    const lines = doc.splitTextToSize(section, maxWidth);
    
    // Check if we need a new page
    if (yPosition + (lines.length * 7) > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Add lines to page
    lines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });
    
    // Add spacing between sections
    if (index < sections.length - 1) {
      yPosition += 7;
    }
  });

  // Convert to Buffer
  return Buffer.from(doc.output('arraybuffer'));
}

async function generateDOCX(text: string): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: text.split('\n\n')
        .filter(Boolean)
        .map(section => {
          // Check if this section is a heading
          const isHeading = /^[A-Z][A-Z\s]{2,}$/.test(section.split('\n')[0]);
          
          if (isHeading) {
            return new Paragraph({
              text: section,
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 400,
                after: 200
              },
              alignment: AlignmentType.LEFT
            });
          }
          
          // Regular paragraph
          return new Paragraph({
            children: [
              new TextRun({
                text: section,
                size: 24 // 12pt
              })
            ],
            spacing: {
              before: 200,
              after: 200
            }
          });
        })
    }]
  });

  return await Packer.toBuffer(doc);
}

async function generateOptimizedFile(text: string, format: FileFormat): Promise<Buffer> {
  switch (format) {
    case 'pdf':
      return await generatePDF(text);
    case 'docx':
      return await generateDOCX(text);
    default:
      throw new Error('Unsupported file format. Please use PDF or DOCX.');
  }
}

export async function POST(request: Request) {
  console.log('Starting optimize endpoint...');
  try {
    // Get auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('No auth header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase client with auth
    const supabase = await getSupabaseClient(authHeader);
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    console.log('User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    const { analysisId, selectedSuggestions } = body;
    console.log('Request body:', { analysisId, selectedSuggestionsCount: selectedSuggestions?.length });

    if (!analysisId || !Array.isArray(selectedSuggestions)) {
      console.error('Invalid request body:', { analysisId, selectedSuggestions });
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    console.log('Fetching analysis:', analysisId);
    // Get analysis record
    const { data: analysis, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Analysis fetch error:', fetchError);
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    if (!analysis) {
      console.error('No analysis found for ID:', analysisId);
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    console.log('Analysis found:', { 
      id: analysis.id, 
      file_path: analysis.file_path,
      file_format: analysis.file_format 
    });

    // Get the original resume file from storage using the utility
    console.log('Downloading resume file:', analysis.file_path);
    let fileData;
    try {
      fileData = await downloadFile(analysis.file_path);
    } catch (error) {
      console.error('Download error:', error);
      return NextResponse.json({ error: 'Failed to download resume file' }, { status: 500 });
    }

    // Convert file to text
    console.log('Converting file to text...');
    let text;
    try {
      text = await fileData.text();
      console.log('File text length:', text.length);
    } catch (error) {
      console.error('Error converting file to text:', error);
      return NextResponse.json({ error: 'Failed to read resume content' }, { status: 500 });
    }

    // Apply optimizations
    console.log('Applying optimizations...');
    let optimizedText;
    try {
      optimizedText = await applyOptimizations(text, selectedSuggestions);
      console.log('Optimized text length:', optimizedText.length);
    } catch (error) {
      console.error('Error applying optimizations:', error);
      return NextResponse.json({ error: 'Failed to optimize resume content' }, { status: 500 });
    }

    // Generate optimized file in the same format as original
    console.log('Generating optimized file in format:', analysis.file_format);
    let optimizedBuffer;
    try {
      optimizedBuffer = await generateOptimizedFile(optimizedText, analysis.file_format as FileFormat);
      console.log('Generated buffer size:', optimizedBuffer.length);
    } catch (error) {
      console.error('Error generating optimized file:', error);
      return NextResponse.json({ error: 'Failed to generate optimized file' }, { status: 500 });
    }

    // Return the optimized file
    console.log('Sending response...');
    const contentType = analysis.file_format === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    return new NextResponse(optimizedBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="optimized-resume.${analysis.file_format}"`,
      },
    });

  } catch (error: any) {
    console.error('Optimization error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return NextResponse.json({ 
      error: error.message || 'Failed to optimize resume',
      details: error.stack
    }, { status: 500 });
  }
}
