// src/lib/pdf.ts
// ─────────────────────────────────────────────────────────────
// Standard PDF processing utilities — uses pdf-lib ONLY.
// These functions work on ANY PDF (text-based or scanned/image-based).
// They must NEVER call text extraction, OCR, or AI pipelines.
//
// Standard tools that import from here:
//   Merge PDF, Split PDF, Compress PDF, Image to PDF,
//   Protect/Unlock PDF, PDF to Word
//
// AI features must import from @/lib/pdf-ai instead.
// ─────────────────────────────────────────────────────────────
import { PDFDocument } from 'pdf-lib';

export async function mergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
  const mergedDoc = await PDFDocument.create();
  for (const buffer of pdfBuffers) {
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach((page) => mergedDoc.addPage(page));
    } catch (e) {
      console.error('Error loading PDF for merge:', e);
      throw new Error('One or more PDFs could not be read. Ensure they are valid PDF files.');
    }
  }
  return Buffer.from(await mergedDoc.save());
}

export async function splitPDF(
  pdfBuffer: Buffer,
  ranges: Array<{ start: number; end: number; name?: string }>
): Promise<Array<{ buffer: Buffer; name: string; pageCount: number }>> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();
  const results = [];

  for (const range of ranges) {
    const start = Math.max(0, range.start - 1);
    const end = Math.min(totalPages - 1, range.end - 1);
    if (start > end) continue;

    const newDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const pages = await newDoc.copyPages(doc, pageIndices);
    pages.forEach((p) => newDoc.addPage(p));

    results.push({
      buffer: Buffer.from(await newDoc.save()),
      name: range.name || `pages-${range.start}-${range.end}.pdf`,
      pageCount: pageIndices.length,
    });
  }
  return results;
}

export async function compressPDF(
  pdfBuffer: Buffer,
  level: 'low' | 'medium' | 'high' = 'medium'
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('PDFAI Hub');
  doc.setCreator('PDFAI Hub');
  const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  return Buffer.from(bytes);
}

export async function imagesToPDF(
  imageBuffers: Array<{ buffer: Buffer; mimeType: string }>
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (const { buffer, mimeType } of imageBuffers) {
    try {
      let image;
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        image = await doc.embedJpg(buffer);
      } else if (mimeType === 'image/png') {
        image = await doc.embedPng(buffer);
      } else {
        continue;
      }
      const page = doc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    } catch (e) {
      console.error('Error embedding image:', e);
    }
  }
  return Buffer.from(await doc.save());
}

export async function getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 0;
  }
}
