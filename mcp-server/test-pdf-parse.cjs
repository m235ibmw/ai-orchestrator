const { PDFParse } = require('pdf-parse');

console.log('Testing pdf-parse with PDFParse...');
console.log('Type of PDFParse:', typeof PDFParse);

const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000317 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n410\n%%EOF');

PDFParse(testPdfBuffer).then(data => {
  console.log('✓ PDF parsed successfully!');
  console.log('  Text:', data.text);
  process.exit(0);
}).catch(err => {
  console.error('✗ Failed:', err.message);
  process.exit(1);
});
