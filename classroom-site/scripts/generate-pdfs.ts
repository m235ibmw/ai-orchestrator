import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import coursesData from '../data/courses.json';

async function generateBlankPDF(filename: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { height } = page.getSize();

  page.drawText(`Course Material: ${filename}`, {
    x: 50,
    y: height - 100,
    size: 16,
    font: font,
    color: rgb(0, 0, 0),
  });

  page.drawText('(Blank PDF for demonstration)', {
    x: 50,
    y: height - 150,
    size: 12,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, '..', 'public', 'pdfs', filename);

  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Generated: ${filename}`);
}

async function generateAllPDFs() {
  const publicPdfsDir = path.join(__dirname, '..', 'public', 'pdfs');

  if (!fs.existsSync(publicPdfsDir)) {
    fs.mkdirSync(publicPdfsDir, { recursive: true });
  }

  for (const course of coursesData.courses) {
    for (const lesson of course.lessons) {
      const filename = path.basename(lesson.pdfUrl);
      await generateBlankPDF(filename);
    }
  }

  console.log('\nAll PDFs generated successfully!');
}

generateAllPDFs().catch(console.error);
