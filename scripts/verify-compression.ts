// scripts/verify-compression.ts
import * as fs from 'fs';
import * as path from 'path';
import { compressPDFReal } from '../src/lib/pdf-compress';
import { PDFDocument } from 'pdf-lib';

async function verifyPDF(filePath: string, level: 'low' | 'medium' | 'high') {
  console.log(`\n----------------------------------------`);
  console.log(`Testing file: ${path.basename(filePath)} (${level} compression)`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return;
  }

  const originalBuffer = fs.readFileSync(filePath);
  const originalSize = originalBuffer.length;
  
  const start = Date.now();
  const result = await compressPDFReal(originalBuffer, level);
  const duration = Date.now() - start;

  console.log(`Engine used: ${result.engine}`);
  console.log(`Time taken: ${duration}ms`);
  console.log(`Original size  : ${originalSize} bytes`);
  console.log(`Compressed size: ${result.compressedSize} bytes`);
  console.log(`Reduction      : ${result.reduction}%`);
  console.log(`Already optimized: ${result.alreadyOptimized}`);
  if (result.technicalReason) {
    console.log(`Technical Reason: ${result.technicalReason}`);
  }

  // 1. Verify file size is smaller if it wasn't already optimized
  if (!result.alreadyOptimized) {
    if (result.compressedSize >= originalSize) {
      throw new Error(`CRITICAL: compressedSize is not smaller than originalSize despite didCompress=true`);
    }
    console.log(`✅ Size reduction verified!`);
  } else {
    console.log(`ℹ️ PDF was verified as already fully optimized.`);
  }

  // 2. Verify output PDF opens correctly and all pages exist
  try {
    const doc = await PDFDocument.load(result.buffer, { ignoreEncryption: true });
    const originalDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: true });
    
    const originalPages = originalDoc.getPageCount();
    const compressedPages = doc.getPageCount();
    
    console.log(`Original Page Count: ${originalPages}`);
    console.log(`Compressed Page Count: ${compressedPages}`);

    if (compressedPages !== originalPages) {
      throw new Error(`CRITICAL: Page count mismatch! Original: ${originalPages}, Compressed: ${compressedPages}`);
    }
    console.log(`✅ Page integrity verified! PDF opens successfully.`);
  } catch (e: any) {
    throw new Error(`CRITICAL: Output PDF is corrupted! ${e.message}`);
  }
}

async function run() {
  const downloadsDir = 'c:/Users/ayank/Downloads';
  const testFiles = [
    { name: 'images-converted.pdf', level: 'high' as const },
    { name: 'images-converted (1).pdf', level: 'medium' as const },
    { name: 'Part 1.pdf', level: 'medium' as const }
  ];

  for (const t of testFiles) {
    const fullPath = path.join(downloadsDir, t.name);
    try {
      await verifyPDF(fullPath, t.level);
    } catch (e: any) {
      console.error(`❌ VERIFICATION FAILED:`, e.message);
    }
  }
}

run().catch(console.error);
