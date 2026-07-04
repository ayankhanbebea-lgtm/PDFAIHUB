// src/lib/pdf-compress.ts
// ─────────────────────────────────────────────────────────────
// Real PDF compression: Hybrid pipeline.
//
// strategy:
//   1. Parse PDF using pdf-lib.
//   2. Identify and compress image streams using sharp:
//      - DCTDecode (JPEG): Re-encode at lower quality and downscale if large.
//      - FlateDecode (PNG/lossless): Decompress, unfilter PNG predictors,
//        convert to lossy JPEG, and downscale.
//   3. Save intermediate PDF to a unique temporary file.
//   4. Invoke "mutool clean" (Artifex MuPDF) to optimize PDF structure,
//      garbage-collect unused objects, compact xref tables, merge duplicate
//      objects/streams, and deflate uncompressed streams.
//   5. If mutool is not found or fails, fallback to pdf-lib structural save.
//   6. Clean up temporary files.
// ─────────────────────────────────────────────────────────────

import { PDFDocument, PDFRawStream, PDFName, PDFArray, PDFDict } from 'pdf-lib';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execFile } from 'child_process';

// Quality targets per level (JPEG quality 1–100)
const JPEG_QUALITY: Record<string, number> = {
  low:    80,  // low compression, high quality
  medium: 55,  // recommended/medium
  high:   30,  // maximum compression, lower quality
};

// Max dimension per level
const MAX_DIMENSION: Record<string, number> = {
  low:    2400,
  medium: 1500,
  high:   1000,
};

export interface CompressResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  reduction: number;
  alreadyOptimized: boolean;
  imagesRecompressed: number;
  engine: string;
  technicalReason?: string;
}

/**
 * Automatically finds the path to the mutool.exe binary installed via winget or system path.
 */
function findMutoolPath(): string | null {
  // 1. Check if mutool is available globally
  try {
    const { execSync } = require('child_process');
    execSync('mutool --version', { stdio: 'ignore' });
    return 'mutool';
  } catch {}

  // 2. Check local AppData WinGet packages folder
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const packagesDir = path.join(localAppData, 'Microsoft/WinGet/Packages');
    if (fs.existsSync(packagesDir)) {
      try {
        const dirs = fs.readdirSync(packagesDir);
        const mutoolDir = dirs.find(d => d.startsWith('ArtifexSoftware.mutool'));
        if (mutoolDir) {
          const binPath = path.join(packagesDir, mutoolDir, 'mupdf-1.23.0-windows/mutool.exe');
          if (fs.existsSync(binPath)) {
            return binPath;
          }
        }
      } catch {}
    }
  }

  // 3. Hardcoded fallback for default ayank user just in case env is different
  const fallbackPath = 'C:/Users/ayank/AppData/Local/Microsoft/WinGet/Packages/ArtifexSoftware.mutool_Microsoft.Winget.Source_8wekyb3d8bbwe/mupdf-1.23.0-windows/mutool.exe';
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}

/**
 * Returns the filter name(s) from a PDF image dict as an array of strings.
 */
function getFilters(dict: any): string[] {
  const filterObj = dict.get(PDFName.of('Filter'));
  if (!filterObj) return [];
  if (filterObj instanceof PDFArray) {
    return filterObj.asArray().map((f: any) => f.toString());
  }
  return [filterObj.toString()];
}

/**
 * Reconstructs raw pixel data from a PNG-predicted FlateDecode stream.
 */
function unfilterPngPredictor(
  data: Buffer,
  width: number,
  height: number,
  bytesPerPixel: number
): Buffer {
  const rowBytes = width * bytesPerPixel;
  const out = Buffer.alloc(width * height * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    if (rowStart >= data.length) break;

    const filterType = data[rowStart];
    
    for (let x = 0; x < rowBytes; x++) {
      const dataIdx = rowStart + 1 + x;
      if (dataIdx >= data.length) break;

      const rawByte = data[dataIdx];
      const leftIdx = x - bytesPerPixel;
      const reconLeft = leftIdx >= 0 ? out[y * rowBytes + leftIdx] : 0;
      const reconAbove = y > 0 ? out[(y - 1) * rowBytes + x] : 0;
      const reconAboveLeft = (y > 0 && leftIdx >= 0) ? out[(y - 1) * rowBytes + leftIdx] : 0;

      let reconByte = 0;
      if (filterType === 0) {
        reconByte = rawByte;
      } else if (filterType === 1) {
        reconByte = rawByte + reconLeft;
      } else if (filterType === 2) {
        reconByte = rawByte + reconAbove;
      } else if (filterType === 3) {
        reconByte = rawByte + Math.floor((reconLeft + reconAbove) / 2);
      } else if (filterType === 4) {
        const p = reconLeft + reconAbove - reconAboveLeft;
        const pa = Math.abs(p - reconLeft);
        const pb = Math.abs(p - reconAbove);
        const pc = Math.abs(p - reconAboveLeft);
        let paethVal = reconLeft;
        if (pb < pa && pb < pc) {
          paethVal = reconAbove;
        } else if (pc < pa && pc < pb) {
          paethVal = reconAboveLeft;
        }
        reconByte = rawByte + paethVal;
      } else {
        reconByte = rawByte;
      }

      out[y * rowBytes + x] = reconByte & 0xff;
    }
  }

  return out;
}

/**
 * Compresses an image raw stream and returns the new JPEG buffer.
 */
async function compressImageStream(
  pdfObject: PDFRawStream,
  jpegQuality: number,
  maxDim: number,
  sharpLib: any
): Promise<{ buffer: Buffer; colorSpace: string } | null> {
  const dict = pdfObject.dict;
  const filters = getFilters(dict);

  const widthObj  = dict.get(PDFName.of('Width'));
  const heightObj = dict.get(PDFName.of('Height'));
  if (!widthObj || !heightObj) return null;

  const width  = parseInt(widthObj.toString(),  10);
  const height = parseInt(heightObj.toString(), 10);
  if (!width || !height || width < 8 || height < 8) return null;

  const imageMask = dict.get(PDFName.of('ImageMask'));
  if (imageMask && imageMask.toString() === 'true') return null;

  const isDCT = filters.length === 1 && filters[0] === '/DCTDecode';
  const isFlate = filters.length === 1 && filters[0] === '/FlateDecode';

  try {
    if (isDCT) {
      const jpegBytes = Buffer.from(pdfObject.contents);
      if (jpegBytes.length < 4 || jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) return null;

      let pipeline = sharpLib(jpegBytes);
      if (width > maxDim || height > maxDim) {
        pipeline = pipeline.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
      }

      const recompressed = await pipeline
        .jpeg({ quality: jpegQuality, mozjpeg: false, progressive: false })
        .toBuffer();

      return { buffer: recompressed, colorSpace: 'DeviceRGB' };
    } 

    if (isFlate) {
      const bpcObj = dict.get(PDFName.of('BitsPerComponent'));
      const bpc = bpcObj ? parseInt(bpcObj.toString(), 10) : 8;
      if (bpc !== 8) return null;

      const csObj = dict.get(PDFName.of('ColorSpace'));
      const csStr = csObj ? csObj.toString() : '/DeviceRGB';

      let channels = 3;
      let colorSpace = 'DeviceRGB';
      if (csStr.includes('Gray') || csStr.includes('gray')) {
        channels = 1;
        colorSpace = 'DeviceGray';
      } else if (csStr.includes('CMYK') || csStr.includes('cmyk')) {
        channels = 4;
        colorSpace = 'DeviceCMYK';
      } else if (csStr.includes('Indexed') || csStr.includes('indexed')) {
        return null;
      }

      let decompressed: Buffer;
      try {
        decompressed = zlib.inflateSync(Buffer.from(pdfObject.contents));
      } catch {
        return null;
      }

      const decodeParms = dict.get(PDFName.of('DecodeParms'));
      let predictor = 1;
      if (decodeParms instanceof PDFDict) {
        const predObj = decodeParms.get(PDFName.of('Predictor'));
        if (predObj) predictor = parseInt(predObj.toString(), 10);
      }

      let rawPixelData = decompressed;
      if (predictor > 1) {
        rawPixelData = unfilterPngPredictor(decompressed, width, height, channels);
      }

      let pipeline = sharpLib(rawPixelData, {
        raw: { width, height, channels: channels as any }
      });

      if (width > maxDim || height > maxDim) {
        pipeline = pipeline.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
      }

      const recompressed = await pipeline
        .jpeg({ quality: jpegQuality })
        .toBuffer();

      return { buffer: recompressed, colorSpace: colorSpace === 'DeviceGray' ? 'DeviceGray' : 'DeviceRGB' };
    }
  } catch (err: any) {
    console.warn('[pdf-compress] Image recompression skipped:', err.message);
  }
  return null;
}

/**
 * Strips metadata and page thumbnails.
 */
function stripMetadata(doc: PDFDocument): void {
  try { doc.setTitle(''); }       catch {}
  try { doc.setAuthor(''); }      catch {}
  try { doc.setSubject(''); }     catch {}
  try { doc.setKeywords([]); }    catch {}
  try { doc.setProducer('PDFAI Hub'); } catch {}
  try { doc.setCreator('PDFAI Hub'); }  catch {}
  try {
    const catalog = doc.catalog;
    if (catalog.get(PDFName.of('Metadata'))) catalog.delete(PDFName.of('Metadata'));
  } catch {}
}

function stripThumbnails(doc: PDFDocument): void {
  try {
    for (let i = 0; i < doc.getPageCount(); i++) {
      try {
        const node = doc.getPage(i).node;
        if (node.get(PDFName.of('Thumb'))) node.delete(PDFName.of('Thumb'));
      } catch {}
    }
  } catch {}
}

/**
 * Main compression function.
 */
export async function compressPDFReal(
  pdfBuffer: Buffer,
  level: 'low' | 'medium' | 'high' = 'medium'
): Promise<CompressResult> {
  const originalSize = pdfBuffer.length;
  const jpegQuality  = JPEG_QUALITY[level];
  const maxDim       = MAX_DIMENSION[level];

  // Try to load sharp
  let sharp: any = null;
  try {
    const mod = await import('sharp');
    sharp = mod.default ?? mod;
  } catch {
    console.warn('[pdf-compress] sharp unavailable — structural compression only');
  }

  const doc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
    updateMetadata:   false,
  });

  const context = doc.context;
  let imagesRecompressed = 0;

  if (sharp) {
    const objects = context.enumerateIndirectObjects();
    for (const [ref, pdfObject] of objects) {
      if (!(pdfObject instanceof PDFRawStream)) continue;

      const subtype = pdfObject.dict.get(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;

      const result = await compressImageStream(pdfObject, jpegQuality, maxDim, sharp);
      if (!result) continue;

      const originalStreamSize = pdfObject.contents.length;
      if (result.buffer.length >= originalStreamSize) continue;

      try {
        const dict = pdfObject.dict;
        const newDict: Record<string, any> = {
          Type:             PDFName.of('XObject'),
          Subtype:          PDFName.of('Image'),
          Width:            dict.get(PDFName.of('Width')),
          Height:           dict.get(PDFName.of('Height')),
          ColorSpace:       PDFName.of(result.colorSpace),
          BitsPerComponent: context.obj(8),
          Filter:           PDFName.of('DCTDecode'),
        };

        const newStream = context.stream(result.buffer, newDict);
        context.assign(ref, newStream);
        imagesRecompressed++;
      } catch (e: any) {
        console.warn(`[pdf-compress] Failed to assign stream:`, e.message);
      }
    }
  }

  // Strip metadata and thumbnails
  stripMetadata(doc);
  stripThumbnails(doc);

  // Save intermediate PDF
  const intermediateBytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage:   false,
  });

  const mutoolBin = findMutoolPath();
  let finalBuffer = Buffer.from(intermediateBytes);
  let engineUsed = 'PDFAI-Hub Engine (pdf-lib + sharp image pipeline)';

  if (mutoolBin) {
    const tempInFile = path.join(os.tmpdir(), `compress-in-${crypto.randomUUID()}.pdf`);
    const tempOutFile = path.join(os.tmpdir(), `compress-out-${crypto.randomUUID()}.pdf`);

    try {
      fs.writeFileSync(tempInFile, finalBuffer);

      // Run mutool clean for deep structural compression, font subsetting, stream deduplication, and xref rebuilding
      const args = ['clean', '-gggg', '-z', '-f', '-i', '-c', '-s', tempInFile, tempOutFile];
      await new Promise<void>((resolve, reject) => {
        execFile(mutoolBin, args, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (fs.existsSync(tempOutFile)) {
        finalBuffer = fs.readFileSync(tempOutFile);
        engineUsed = 'Hybrid Engine (pdf-lib + sharp image pipeline + Artifex MuPDF mutool clean)';
      }
    } catch (e: any) {
      console.warn('[pdf-compress] mutool clean failed, fallback to pure JS output:', e.message);
    } finally {
      // Clean up temporary files
      try { if (fs.existsSync(tempInFile)) fs.unlinkSync(tempInFile); } catch {}
      try { if (fs.existsSync(tempOutFile)) fs.unlinkSync(tempOutFile); } catch {}
    }
  }

  const finalSize = finalBuffer.length;
  const reduction = Math.max(0, Math.round(((originalSize - finalSize) / originalSize) * 100));
  const didCompress = finalSize < originalSize && reduction >= 1;

  let technicalReason: string | undefined = undefined;
  if (!didCompress) {
    technicalReason = 'No large images were found in the PDF, or all images and fonts are already compressed and optimized to their maximum capacity.';
  }

  return {
    buffer:           didCompress ? finalBuffer : pdfBuffer,
    originalSize,
    compressedSize:   didCompress ? finalSize   : originalSize,
    reduction:        didCompress ? reduction   : 0,
    alreadyOptimized: !didCompress,
    imagesRecompressed,
    engine:           engineUsed,
    technicalReason,
  };
}
