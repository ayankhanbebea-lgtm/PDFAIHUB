// src/app/api/pdf/image-to-pdf/route.ts — PUBLIC
// Returns the generated PDF as a direct binary download (no Cloudinary required).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

function getMemInfo() {
  const mem = process.memoryUsage();
  return {
    rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`,
  };
}

export async function POST(request: NextRequest) {
  console.log('[DEBUG-IMAGE-TO-PDF] Start processing POST request');
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

  const memoryBefore = getMemInfo();
  let formData;
  try {
    formData = await request.formData();
  } catch (e: any) {
    console.error('[DEBUG-IMAGE-TO-PDF] Request parsing failed:', e.message);
    return NextResponse.json({
      error: `Failed to parse upload body: ${e.message}`,
      stack: e.stack,
      phase: 'parsing_request_body',
      memory: getMemInfo()
    }, { status: 400 });
  }

  const checkOnly = formData.get('checkOnly') === 'true';
  const imageCount = parseInt(formData.get('imageCount') as string || '0');

  if (checkOnly) {
    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'image_to_pdf', { imageCount });
    }
    return NextResponse.json({ success: true });
  }

  const files = formData.getAll('files') as File[];
  const orderJson = formData.get('order') as string;
  const order: number[] = orderJson ? JSON.parse(orderJson) : files.map((_, i) => i);

  if (!files?.length) {
    return NextResponse.json({ error: 'At least one image required' }, { status: 400 });
  }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
  const individualSizes = files.map(f => `${f.name}: ${(f.size / 1024 / 1024).toFixed(2)} MB`);

  console.log('[DEBUG-IMAGE-TO-PDF] Number of uploaded images:', files.length);
  console.log('[DEBUG-IMAGE-TO-PDF] Total upload size (MB):', totalMB);
  console.log('[DEBUG-IMAGE-TO-PDF] Individual image sizes:', individualSizes);
  console.log('[DEBUG-IMAGE-TO-PDF] Memory usage before processing:', memoryBefore);

  try {
    const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) {
        return NextResponse.json({ error: `${file.name} is not a supported image format` }, { status: 400 });
      }
    }

    const orderedFiles = order.map((i) => files[i]);
    let sharp: any;
    try { sharp = (await import('sharp')).default; } catch {}

    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();

    const memoryDuring: any[] = [];

    // Process images sequentially
    for (let idx = 0; idx < orderedFiles.length; idx++) {
      const file = orderedFiles[idx];
      const memBeforeImg = getMemInfo();

      try {
        let buffer = Buffer.from(await file.arrayBuffer());
        let mimeType = file.type;

        // Convert WebP to JPEG
        if (mimeType === 'image/webp' && sharp) {
          buffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
          mimeType = 'image/jpeg';
        }

        // Limit size on the backend too
        if (sharp && (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/png')) {
          const meta = await sharp(buffer).metadata();
          const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
          if (longest > 3000) {
            buffer = await sharp(buffer)
              .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
              .toBuffer();
          }
        }

        let image;
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
          image = await doc.embedJpg(buffer);
        } else if (mimeType === 'image/png') {
          image = await doc.embedPng(buffer);
        } else {
          continue; // Skip unsupported
        }

        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      } catch (e: any) {
        console.error(`[DEBUG-IMAGE-TO-PDF] Error processing ${file.name} at index ${idx}:`, e.message);
        throw new Error(`Failed to embed image "${file.name}" at index ${idx}: ${e.message}\nStack: ${e.stack}`);
      }

      const memAfterImg = getMemInfo();
      memoryDuring.push({
        index: idx,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        memBefore: memBeforeImg,
        memAfter: memAfterImg
      });
    }

    console.log('[DEBUG-IMAGE-TO-PDF] Saving PDF document...');
    const pdfBuffer = Buffer.from(await doc.save());
    const memoryAfter = getMemInfo();

    console.log('[DEBUG-IMAGE-TO-PDF] PDF generated. Size:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');
    console.log('[DEBUG-IMAGE-TO-PDF] Memory usage after processing:', memoryAfter);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'image_to_pdf', { imageCount: files.length });
    }

    const outputName = `images-${Date.now()}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pdfBuffer.length),
        'X-File-Size': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    const errorMem = getMemInfo();
    console.error('[DEBUG-IMAGE-TO-PDF] Exception occurred:', error.message);
    console.error(error.stack);
    return NextResponse.json({
      error: error.message || 'Failed to convert images to PDF',
      stack: error.stack,
      numImages: files.length,
      totalMB,
      individualSizes,
      memoryBefore,
      memoryAfter: errorMem
    }, { status: 500 });
  }
}

