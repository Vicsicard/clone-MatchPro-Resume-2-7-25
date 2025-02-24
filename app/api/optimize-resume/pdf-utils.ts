import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

export async function createPDFFromText(text: string): Promise<Buffer> {
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
