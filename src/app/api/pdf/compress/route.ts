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

  try {
    const formData = await request.formData();
    const file  = formData.get('file')  as File;
    const level = (formData.get('level') as 'low' | 'medium' | 'high') || 'medium';

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF file required' }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await compressPDFReal(buffer, level);

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
      ? (result.technicalReason || `This PDF is already optimized. No images could be further compressed by the engine.`)
      : `Successfully compressed ${result.imagesRecompressed} image(s) using sharp and optimized structural streams.`;

    return new Response(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type':          'application/pdf',
        'Content-Disposition':   `attachment; filename="${outputName}"`,
        'Content-Length':        String(result.compressedSize),
        'X-Original-Size':       String(result.originalSize),
        'X-Compressed-Size':     String(result.compressedSize),
        'X-Reduction-Percent':   String(result.reduction),
        'X-Images-Recompressed': String(result.imagesRecompressed),
        'X-Already-Optimized':   String(result.alreadyOptimized),
        'X-Compression-Engine':  result.engine,
        'X-Compression-Message': message,
      },
    });
  } catch (error) {
    console.error('[compress] Error:', error);
    return NextResponse.json({ error: 'Failed to compress PDF' }, { status: 500 });
  }
}
