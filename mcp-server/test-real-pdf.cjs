const { PDFParse } = require('pdf-parse');

async function testRealPDF() {
  const pdfPath = '/Users/kurikinton/Documents/niko-dev/ai-orchestrator/classroom-site/public/pdfs/world-history-2.pdf';
  
  console.log('Testing with actual PDF file:', pdfPath);
  
  try {
    console.log('Parsing...');
    const parser = new PDFParse({ url: 'file://' + pdfPath });
    const result = await parser.getText();
    
    console.log('✓ PDF parsed successfully!');
    console.log('  Text length:', result.text.length);
    console.log('  Text content:\n', result.text);
    
  } catch (err) {
    console.error('✗ Failed:', err.message);
    console.error('  Stack:', err.stack);
    process.exit(1);
  }
}

testRealPDF();
