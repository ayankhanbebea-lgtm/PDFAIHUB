// src/app/api/pdf/compress/route.ts — PUBLIC
// ─────────────────────────────────────────────────────────────
// Real PDF compression: pdf-lib structural + sharp image recompression.
// Returns the compressed PDF as a direct binary download.
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';
import { compressPDFReal } from '@/lib/pdf-compress';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    const usage = await checkUsage(session.user.id, 'pdf');
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "You have reached today's free PDF limit. Your limit will reset 24 hours after your first PDF operation, or upgrade to Pro for unlimited usage.", upgrade: true },
        { status: 429 }
      );
    }
  } else {
    const id = getGuestIdentifier(request);
    const check = checkGuestLimit(id);
    if (!check.allowed) {
      return NextResponse.json({ error: `Free limit reached (${check.limit}/day). Sign up for more.`, guestLimit: true }, { status: 429 });
    }
    incrementGuestUsage(id);
  }

  const startTime = performance.now();

  let file: File | null = null;

  try {
    const formData = await request.formData();
    file  = formData.get('file')  as File;
    const level = (formData.get('level') as 'low' | 'medium' | 'high') || 'medium';

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF file required' }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await compressPDFReal(buffer, level);

    const processingTime = Math.round(performance.now() - startTime);

    let version = 'unknown';
    const header = buffer.toString('utf8', 0, 8);
    if (header.startsWith('%PDF-')) {
      version = header.substring(5, 8);
    }

    let pageCount = 0;
    let isEncrypted = false;
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
      isEncrypted = doc.isEncrypted;
    } catch (_) {}

    console.log(`[Diagnostic Log - PDF Compress]
  - Uploaded File Name: ${file.name}
  - Uploaded File Type: ${file.type}
  - PDF Version: ${version}
  - Pages: ${pageCount}
  - Encryption Status: ${isEncrypted ? 'Encrypted' : 'Unencrypted'}
  - Embedded Images Recompressed: ${result.imagesRecompressed}
  - Compression Method: Hybrid Engine (pdf-lib + sharp image pipeline + Artifex MuPDF mutool clean)
  - Library Used: pdf-lib, sharp, mutool
  - Original Size: ${result.originalSize} bytes
  - Compressed Size: ${result.compressedSize} bytes
  - Reduction: ${result.reduction}%
  - Already Optimized: ${result.alreadyOptimized}
  - Processing Time: ${processingTime}ms
    `);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_compress', {
        level,
        reduction:          result.reduction,
        imagesRecompressed: result.imagesRecompressed,
        alreadyOptimized:   result.alreadyOptimized,
      });
    }

    // Even when "already optimized", return the structurally-cleaned PDF
    // so the user always gets a download. Surface the flag in a header.
    const outputName = `compressed-${file.name}`;
    const message = result.alreadyOptimized
      ? `This PDF is already optimized and cannot be compressed further.`
      : `Successfully compressed ${result.imagesRecompressed} image(s) using sharp and optimized structural streams.`;

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type':                  'application/pdf',
        'Content-Disposition':           `attachment; filename="${outputName}"`,
        'Content-Length':                String(result.compressedSize),
        'X-Original-Size':               String(result.originalSize),
        'X-Compressed-Size':             String(result.compressedSize),
        'X-Reduction-Percent':           String(result.reduction),
        'X-Images-Recompressed':         String(result.imagesRecompressed),
        'X-Already-Optimized':           String(result.alreadyOptimized),
        'X-Compression-Engine':          result.engine,
        'X-Compression-Message':         message,
        'Access-Control-Expose-Headers': 'X-Original-Size, X-Compressed-Size, X-Reduction-Percent, X-Images-Recompressed, X-Already-Optimized, X-Compression-Engine, X-Compression-Message',
      },
    });
  } catch (error: any) {
    const processingTime = Math.round(performance.now() - startTime);
    console.error(`[Diagnostic Log - PDF Compress FAIL]
  - Uploaded File Name: ${file?.name || 'unknown'}
  - Uploaded File Type: ${file?.type || 'unknown'}
  - Processing Time: ${processingTime}ms
  - Exact Exception: ${error.message || String(error)}
    `);
    return NextResponse.json({ error: 'Failed to compress PDF' }, { status: 500 });
  }
}
