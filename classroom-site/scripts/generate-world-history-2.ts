import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateWorldHistory2PDF() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  let { height } = page.getSize();
  let yPosition = height - 50;

  // Title
  page.drawText('World History: Greek and Roman Era', {
    x: 50,
    y: yPosition,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 40;

  // Section 1: Ancient Greece
  page.drawText('1. Ancient Greece (800-323 BCE)', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  const greekText = [
    'The ancient Greek civilization flourished in the Mediterranean region,',
    'particularly in the Greek peninsula, Asia Minor, and southern Italy.',
    '',
    'Key Characteristics:',
    '- City-states (polis) as the basic political unit',
    '- Athens: Democracy, philosophy, and arts',
    '- Sparta: Military society and discipline',
    '- Olympic Games originated in 776 BCE',
    '',
    'Cultural Achievements:',
    '- Philosophy: Socrates, Plato, Aristotle',
    '- Literature: Homer\'s Iliad and Odyssey',
    '- Architecture: Parthenon temple',
    '- Science: Pythagoras, Archimedes',
  ];

  for (const line of greekText) {
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 18;
  }

  yPosition -= 10;

  // Section 2: Roman Republic
  page.drawText('2. Roman Republic (509-27 BCE)', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  const republicText = [
    'Rome transitioned from monarchy to republic in 509 BCE.',
    '',
    'Political Structure:',
    '- Senate: Advisory body of aristocrats',
    '- Consuls: Two annually elected leaders',
    '- Tribunes: Representatives of common people',
    '',
    'Expansion:',
    '- Punic Wars against Carthage (264-146 BCE)',
    '- Conquered the entire Mediterranean region',
    '- Julius Caesar\'s conquests in Gaul',
  ];

  for (const line of republicText) {
    if (yPosition < 50) {
      // Create new page if running out of space
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 50;
    }
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 18;
  }

  // Page 2 (if needed)
  if (yPosition < 200) {
    page = pdfDoc.addPage([595.28, 841.89]);
    yPosition = height - 50;
  }

  yPosition -= 10;

  // Section 3: Roman Empire
  page.drawText('3. Roman Empire (27 BCE - 476 CE)', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  const empireText = [
    'Augustus Caesar established the Roman Empire in 27 BCE.',
    '',
    'Key Features:',
    '- Pax Romana (Roman Peace): 200 years of stability',
    '- Extensive road network and infrastructure',
    '- Roman law as foundation of modern legal systems',
    '- Latin language spread across Europe',
    '',
    'Cultural Legacy:',
    '- Architecture: Colosseum, aqueducts, Pantheon',
    '- Engineering: Roads, bridges, concrete',
    '- Christianity emerged and spread',
    '',
    'Decline:',
    '- Division into East and West (395 CE)',
    '- Western Empire fell to Germanic tribes (476 CE)',
    '- Eastern Empire (Byzantine) continued until 1453 CE',
  ];

  for (const line of empireText) {
    if (yPosition < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 50;
    }
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 18;
  }

  yPosition -= 20;

  // Summary
  page.drawText('Summary:', {
    x: 50,
    y: yPosition,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  yPosition -= 25;

  const summaryText = [
    'The Greek and Roman civilizations laid the foundation for Western culture.',
    'Their contributions in government, law, philosophy, and engineering',
    'continue to influence modern society.',
  ];

  for (const line of summaryText) {
    if (yPosition < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 50;
    }
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= 18;
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, '..', 'public', 'pdfs', 'world-history-2.pdf');

  fs.writeFileSync(outputPath, pdfBytes);
  console.log('Generated: world-history-2.pdf with enriched content');
}

generateWorldHistory2PDF().catch(console.error);
