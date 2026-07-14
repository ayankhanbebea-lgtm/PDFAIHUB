// c:\Users\ayank\OneDrive\Desktop\PDFAIHUB\scratch\test-spawn-ocr.mjs
import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import mupdf from 'mupdf';

async function run() {
  console.log('test-spawn-ocr started');
  const pdfPath = 'C:/Users/ayank/.gemini/antigravity/brain/9b0b90e6-bed4-45f2-9005-c24b4bd41d01/scratch/test-saved.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  console.log('Opening document with mupdf...');
  const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
  const pageCount = doc.countPages();
  console.log(`PDF has ${pageCount} pages.`);
  
  console.log('Initializing Tesseract worker...');
  const worker = await createWorker('eng');
  
  let fullText = '';
  for (let i = 0; i < pageCount; i++) {
    console.log(`Processing page ${i + 1}/${pageCount}...`);
    const page = doc.loadPage(i);
    const scaleMatrix = mupdf.Matrix.scale(2, 2);
    const pixmap = page.toPixmap(scaleMatrix, mupdf.ColorSpace.DeviceRGB);
    const jpegBytes = pixmap.asJPEG(90);
    const buffer = Buffer.from(jpegBytes);
    
    const { data: { text } } = await worker.recognize(buffer);
    fullText += text + '\n';
  }
  
  await worker.terminate();
  console.log('OCR completed successfully.');
  console.log('RESULT_START');
  console.log(fullText);
  console.log('RESULT_END');
}

run().catch(console.error);
