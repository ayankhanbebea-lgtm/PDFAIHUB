// src/app/api/pdf/ocr/run-ocr.mjs
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import mupdf from 'mupdf';

async function run() {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  const outputPath = args[1];

  if (!inputPath || !outputPath) {
    console.error('Usage: node run-ocr.mjs <inputPath> <outputPath>');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(inputPath);
  
  // Check if PDF or image by header signature
  // PDF signature starts with %PDF (0x25 0x50 0x44 0x46)
  const isPdf = fileBuffer[0] === 0x25 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x44 && fileBuffer[3] === 0x46;

  console.log(`[run-ocr] File type: ${isPdf ? 'PDF' : 'IMAGE'}`);
  console.log('[run-ocr] Initializing Tesseract worker...');
  const worker = await createWorker('eng');

  let fullText = '';

  if (isPdf) {
    console.log('[run-ocr] Opening PDF with mupdf...');
    const doc = mupdf.Document.openDocument(fileBuffer, 'application/pdf');
    const pageCount = doc.countPages();
    console.log(`[run-ocr] Pages count: ${pageCount}`);

    for (let i = 0; i < pageCount; i++) {
      console.log(`[run-ocr] Running OCR on page ${i + 1}/${pageCount}...`);
      const page = doc.loadPage(i);
      const scaleMatrix = mupdf.Matrix.scale(2, 2);
      const pixmap = page.toPixmap(scaleMatrix, mupdf.ColorSpace.DeviceRGB);
      const jpegBytes = pixmap.asJPEG(90);
      const buffer = Buffer.from(jpegBytes);
      
      const { data: { text } } = await worker.recognize(buffer);
      fullText += `--- PAGE ${i + 1} ---\n` + text + '\n';
    }
  } else {
    console.log('[run-ocr] Running OCR on image...');
    const { data: { text } } = await worker.recognize(fileBuffer);
    fullText = text;
  }

  await worker.terminate();
  console.log('[run-ocr] Writing OCR results to output path...');
  fs.writeFileSync(outputPath, fullText, 'utf8');
  console.log('[run-ocr] OCR runner completed successfully.');
}

run().catch((err) => {
  console.error('[run-ocr] OCR Runner failed:', err);
  process.exit(1);
});
