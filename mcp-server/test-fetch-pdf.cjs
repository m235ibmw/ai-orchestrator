const puppeteer = require('puppeteer');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function test() {
  console.log('Starting test...');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test fetching PDF
  const pdfUrl = 'http://localhost:3000/pdfs/world-history-2.pdf';
  console.log('Fetching:', pdfUrl);
  
  const pdfBuffer = await page.evaluate(async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return Array.from(new Uint8Array(arrayBuffer));
  }, pdfUrl);
  
  const buffer = Buffer.from(pdfBuffer);
  console.log('Downloaded:', buffer.length, 'bytes');
  
  // Save to temp
  const tmpPath = '/tmp/test-download.pdf';
  fs.writeFileSync(tmpPath, buffer);
  console.log('Saved to:', tmpPath);
  
  // Try to parse
  try {
    const parser = new PDFParse({ url: 'file://' + tmpPath });
    const result = await parser.getText();
    console.log('✓ PDF parsed!');
    console.log('  Text length:', result.text.length);
    console.log('  First 200 chars:', result.text.substring(0, 200));
  } catch (err) {
    console.error('✗ Parse failed:', err.message);
  }
  
  await browser.close();
}

test().catch(console.error);
