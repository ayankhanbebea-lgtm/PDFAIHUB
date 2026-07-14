// src/lib/pdf-ai.ts
// ─────────────────────────────────────────────────────────────
// Production-grade PDF text extraction for AI features.
// Supports:
//   - Modern PDFs with FlateDecode compressed streams (pdf-lib, Adobe, etc.)
//   - Hex-encoded strings <AABBCC> (used by pdf-lib and many modern tools)
//   - Literal strings (text) (used by older PDF generators)
//   - pdf-parse fallback for legacy PDFs
//   - Tesseract.js OCR for scanned/image-only PDFs
// ─────────────────────────────────────────────────────────────

import { PDFDocument } from 'pdf-lib';
import zlib from 'zlib';
import { promisify } from 'util';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Hint for Vercel Next File Tracer:
if (false) {
  import('mupdf');
}

const inflate = promisify(zlib.inflate);
const inflateRaw = promisify(zlib.inflateRaw);

// ─── Decode a PDF content stream (handles FlateDecode / uncompressed) ─────────
async function decodePDFStream(streamBytes: Buffer, filters: string[]): Promise<string> {
  let data = streamBytes;
  for (const filter of filters) {
    if (filter === 'FlateDecode' || filter === 'Fl') {
      try {
        data = await inflate(data);
      } catch {
        try {
          data = await inflateRaw(data);
        } catch {
          break;
        }
      }
    }
  }
  return data.toString('latin1');
}

// ─── Decode a hex string like <48656C6C6F> → 'Hello' ─────────────────────────
function hexToString(hex: string): string {
  // Pad to even length
  if (hex.length % 2 !== 0) hex += '0';
  let result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    if (code > 0) result += String.fromCharCode(code);
  }
  return result;
}

// ─── Decode PDF literal string escape sequences ───────────────────────────────
function decodePDFLiteralString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

// ─── Extract text tokens from a decoded PDF content stream ────────────────────
function extractTextFromStream(content: string): string {
  const chunks: string[] = [];

  // Match BT...ET text blocks
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let block;

  while ((block = btEtRegex.exec(content)) !== null) {
    const bc = block[1];

    // Hex strings: <AABBCC> Tj  (used by pdf-lib and modern tools)
    for (const m of bc.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
      const hex = m[1].replace(/\s/g, '');
      const text = hexToString(hex);
      if (text.trim()) chunks.push(text);
    }

    // Hex arrays in TJ: [<AABB> -20 <CCDD>] TJ
    for (const m of bc.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      const inner = m[1];
      for (const p of inner.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
        const hex = p[1].replace(/\s/g, '');
        const text = hexToString(hex);
        if (text.trim()) chunks.push(text);
      }
      // Also literal strings inside TJ arrays
      for (const p of inner.matchAll(/\(([^)]*)\)/g)) {
        const text = decodePDFLiteralString(p[1]);
        if (text.trim()) chunks.push(text);
      }
    }

    // Literal strings: (text) Tj
    for (const m of bc.matchAll(/\(([^)]*)\)\s*Tj/g)) {
      const text = decodePDFLiteralString(m[1]);
      if (text.trim()) chunks.push(text);
    }

    // ' and " operators (move to next line + show text) — literal
    for (const m of bc.matchAll(/\(([^)]*)\)\s*['"]$/gm)) {
      chunks.push('\n' + decodePDFLiteralString(m[1]));
    }

    // Td/TD/Tm operators suggest a new line — insert space between adjacent chunks
    if (/\bT[dDm*]\b/.test(bc) && chunks.length > 0) {
      chunks.push(' ');
    }
  }

  return chunks.join('').replace(/\s+/g, ' ').trim();
}

// ─── Main: Multi-strategy PDF text extraction ─────────────────────────────────
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  console.log(`[pdf-ai] Starting extraction — buffer: ${pdfBuffer.length} bytes`);

  // ── Strategy 1: Raw stream parse with zlib decompression ──────────────────
  let strategy1Text = '';
  try {
    const rawPDF = pdfBuffer.toString('latin1');
    const allText: string[] = [];
    const objRegex = /\d+\s+\d+\s+obj([\s\S]*?)endobj/g;
    let objMatch;
    let streamsFound = 0;

    while ((objMatch = objRegex.exec(rawPDF)) !== null) {
      const objContent = objMatch[1];

      // Skip Font/FontDescriptor/non-content objects
      if (
        /\/Type\s*\/Font\b/.test(objContent) ||
        /\/Type\s*\/FontDescriptor\b/.test(objContent) ||
        (/\/Type\s*\/XObject\b/.test(objContent) && !/\/Subtype\s*\/Form\b/.test(objContent))
      ) continue;

      const streamStart = objContent.indexOf('stream');
      if (streamStart === -1) continue;

      let dataStart = streamStart + 6;
      if (objContent[dataStart] === '\r') dataStart++;
      if (objContent[dataStart] === '\n') dataStart++;

      const streamEnd = objContent.lastIndexOf('endstream');
      if (streamEnd === -1 || streamEnd <= dataStart) continue;

      streamsFound++;
      const streamBytes = Buffer.from(objContent.slice(dataStart, streamEnd), 'latin1');

      // Parse filters
      const filters: string[] = [];
      const filterMatch = objContent.match(/\/Filter\s*(?:\/(\w+)|\[([^\]]*)\])/);
      if (filterMatch) {
        if (filterMatch[1]) filters.push(filterMatch[1]);
        else if (filterMatch[2]) {
          filters.push(...(filterMatch[2].match(/\/(\w+)/g) || []).map((n: string) => n.slice(1)));
        }
      }

      let decoded: string;
      if (filters.length > 0) {
        try {
          decoded = await decodePDFStream(streamBytes, filters);
        } catch {
          decoded = objContent.slice(dataStart, streamEnd);
        }
      } else {
        decoded = objContent.slice(dataStart, streamEnd);
      }

      const text = extractTextFromStream(decoded);
      if (text && text.length > 3) allText.push(text);
    }

    console.log(`[pdf-ai] Strategy 1: scanned ${streamsFound} streams`);
    strategy1Text = allText.join('\n').trim();
    console.log(`[pdf-ai] Strategy 1 result: ${strategy1Text.length} chars`);
    if (strategy1Text.length > 5) {
      console.log(`[pdf-ai] Sample: "${strategy1Text.slice(0, 150)}"`);
    }
  } catch (e: any) {
    console.warn('[pdf-ai] Strategy 1 error:', e.message);
  }

  if (strategy1Text.length > 50) return strategy1Text;

  // ── Strategy 2: pdf-parse fallback ────────────────────────────────────────
  console.log('[pdf-ai] Strategy 2: trying pdf-parse...');
  try {
    // Use internal lib to avoid Next.js module-time execution issues.
    // Do NOT pass version — use the default (v1.10.100) which is stable on Vercel.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParseFn = require('pdf-parse/lib/pdf-parse.js');
    const result = await pdfParseFn(pdfBuffer, { max: 0 });
    const text = (result.text || '').trim();
    console.log(`[pdf-ai] Strategy 2 result: ${text.length} chars, ${result.numpages} pages`);
    if (text.length > 50) return text;
  } catch (e: any) {
    console.error('[pdf-ai] Strategy 2 (pdf-parse) FULL ERROR:', e.message);
    console.error('[pdf-ai] Strategy 2 stack:', e.stack?.slice(0, 500));
  }

  // ── Strategy 3: Tesseract.js OCR for scanned PDFs ─────────────────────────
  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  if (isVercel) {
    console.log('[pdf-ai] Strategy 3 (OCR) skipped in production/Vercel to prevent 10s gateway timeout.');
    return strategy1Text;
  }

  console.log('[pdf-ai] Strategy 3: attempting Tesseract.js OCR...');
  try {
    const ocrText = await extractWithOCR(pdfBuffer);
    if (ocrText && ocrText.trim().length > 50) {
      console.log(`[pdf-ai] Strategy 3 (OCR) result: ${ocrText.length} chars`);
      return ocrText;
    }
  } catch (e: any) {
    console.warn('[pdf-ai] Strategy 3 (OCR) failed:', e.message?.slice(0, 120));
  }

  console.log('[pdf-ai] All strategies exhausted — returning what we have');
  return strategy1Text; // Return whatever partial text we got
}

// ─── OCR using Tesseract.js (for scanned/image PDFs) ─────────────────────────
export async function extractWithOCR(pdfBuffer: Buffer): Promise<string> {
  // ── Strategy A: Proxy to Render backend (production/Vercel) ──────────────
  // Vercel serverless lambdas cannot run mupdf (ESM top-level await) or cache
  // Tesseract language data. The Render backend is a Docker container that has
  // full filesystem access and can run these natively.
  if (process.env.CONVERSION_BACKEND_URL) {
    console.log('[pdf-ai] OCR: proxying to Render backend for OCR extraction...');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const axios = require('axios');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FormData = require('form-data');

    const form = new FormData();
    form.append('file', pdfBuffer, { filename: 'input.pdf', contentType: 'application/pdf' });

    const response = await axios.post(
      `${process.env.CONVERSION_BACKEND_URL}/ocr`,
      form,
      {
        headers: form.getHeaders(),
        responseType: 'json',
        timeout: 110000,
      }
    );

    const text = response.data?.text;
    if (typeof text !== 'string') {
      throw new Error(`OCR backend returned unexpected response: ${JSON.stringify(response.data)}`);
    }
    console.log(`[pdf-ai] OCR: backend returned ${text.length} chars`);
    return text;
  }

  // ── Strategy B: Spawn local child process (dev/localhost only) ────────────
  // This uses run-ocr.mjs which runs as a native ESM module and can import
  // mupdf (WASM top-level await) without Webpack/Next.js CommonJS restrictions.
  console.log('[pdf-ai] OCR: no CONVERSION_BACKEND_URL, spawning local child process...');
  const tempDir = os.tmpdir();
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const inputPath = path.join(tempDir, `ocr-input-${uniqueSuffix}.pdf`);
  const outputPath = path.join(tempDir, `ocr-output-${uniqueSuffix}.txt`);

  // Collect stderr for better diagnostics on failure
  const stderrLines: string[] = [];

  try {
    console.log(`[pdf-ai] OCR: Writing buffer to temp input: ${inputPath}`);
    fs.writeFileSync(inputPath, pdfBuffer);

    // Try __dirname-relative path first (works after Next.js compilation)
    // Fall back to process.cwd()-relative (works in tsx/ts-node dev mode)
    const possiblePaths = [
      path.join(__dirname, 'run-ocr.mjs'),
      path.join(process.cwd(), 'src/app/api/pdf/ocr/run-ocr.mjs'),
    ];
    const scriptPath = possiblePaths.find(p => fs.existsSync(p)) ?? possiblePaths[1];
    console.log(`[pdf-ai] OCR: Spawning child process: ${scriptPath}`);

    const child = spawn(process.execPath, [scriptPath, inputPath, outputPath]);

    child.stdout.on('data', (data) => {
      console.log(`[child-ocr] ${data.toString().trim()}`);
    });
    child.stderr.on('data', (data) => {
      const line = data.toString().trim();
      stderrLines.push(line);
      console.error(`[child-ocr-error] ${line}`);
    });

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(
            `OCR child process exited with code ${code}` +
            (stderrLines.length ? `\n${stderrLines.join('\n')}` : '')
          ));
        }
      });
      child.on('error', (err) => reject(err));
    });

    console.log(`[pdf-ai] OCR: Reading output: ${outputPath}`);
    if (fs.existsSync(outputPath)) {
      return fs.readFileSync(outputPath, 'utf8');
    }
    throw new Error('OCR output file was not created by child process');
  } catch (err: any) {
    console.error('[pdf-ai] OCR execution failed:', err);
    throw err;
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (_) { /* ignore */ }
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) { /* ignore */ }
  }
}

// ─── Detect if PDF has selectable text ────────────────────────────────────────
export async function hasSelectableText(pdfBuffer: Buffer): Promise<boolean> {
  try {
    const text = await extractTextFromPDF(pdfBuffer);
    return (text?.trim().length ?? 0) > 50;
  } catch {
    return false;
  }
}

// ─── Get page count ───────────────────────────────────────────────────────────
export async function getPDFPageCount(pdfBuffer: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 0;
  }
}

export interface PDFPageData {
  pageNumber: number;
  text: string;
}

/**
 * Extracts selectable text page-by-page from the provided PDF.
 */
export async function extractPagesFromPDF(pdfBuffer: Buffer): Promise<PDFPageData[]> {
  console.log(`[pdf-ai] Starting page-by-page extraction — buffer: ${pdfBuffer.length} bytes`);
  const pages: PDFPageData[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');

    await pdfParse(pdfBuffer, {
      max: 0,
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let text = '';
          let lastY = -1;
          for (const item of textContent.items) {
            if (lastY !== -1 && item.transform[5] !== lastY) {
              text += '\n';
            }
            text += item.str;
            lastY = item.transform[5];
          }
          const pageNumber = pageData.pageIndex + 1;
          pages.push({ pageNumber, text: text.trim() });
          return text;
        });
      }
    });
  } catch (err: any) {
    console.error('[pdf-ai] page-by-page pdf-parse failed:', err.message);
    const fullText = await extractTextFromPDF(pdfBuffer);
    const mockPages = fullText.split('\n\n');
    mockPages.forEach((pText, i) => {
      pages.push({ pageNumber: i + 1, text: pText.trim() });
    });
  }

  pages.sort((a, b) => a.pageNumber - b.pageNumber);
  console.log(`[pdf-ai] Successfully extracted ${pages.length} pages.`);
  return pages;
}

export interface DocumentChunk {
  id: string;
  pageNumber: number;
  text: string;
  wordCount: number;
}

/**
 * Splits extracted pages into overlapping chunks of word/token count.
 */
export function chunkPages(pages: PDFPageData[], chunkSize: number = 300, overlap: number = 50): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkId = 0;

  for (const page of pages) {
    const words = page.text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');

      chunks.push({
        id: `chunk-${chunkId++}`,
        pageNumber: page.pageNumber,
        text: chunkText,
        wordCount: chunkWords.length
      });

      i += (chunkSize - overlap);
      if (i >= words.length || chunkWords.length < chunkSize) {
        break;
      }
    }
  }

  console.log(`[pdf-ai] Chunked ${pages.length} pages into ${chunks.length} chunks (chunkSize=${chunkSize}, overlap=${overlap}).`);
  return chunks;
}

export interface PageChunk {
  chunkIndex: number;
  startPage: number;
  endPage: number;
  text: string;
  pages: PDFPageData[];
}

/**
 * Groups pages into page chunks (e.g. 10 pages per chunk) for progressive generation.
 */
export function groupPagesIntoChunks(pages: PDFPageData[], pageSize: number = 10): PageChunk[] {
  const chunks: PageChunk[] = [];
  let chunkIndex = 0;
  for (let i = 0; i < pages.length; i += pageSize) {
    const chunkPages = pages.slice(i, i + pageSize);
    const text = chunkPages.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join('\n\n');
    chunks.push({
      chunkIndex: chunkIndex++,
      startPage: chunkPages[0].pageNumber,
      endPage: chunkPages[chunkPages.length - 1].pageNumber,
      text,
      pages: chunkPages
    });
  }
  console.log(`[pdf-ai] Grouped ${pages.length} pages into ${chunks.length} page-chunks (pageSize=${pageSize}).`);
  return chunks;
}







