// src/app/api/pdf/jpg-to-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { imagesToPDF } from '@/lib/pdf';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';
import prisma from '@/lib/prisma';

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
  console.log('[DEBUG-JPG-TO-PDF] Start processing POST request');
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
    console.error('[DEBUG-JPG-TO-PDF] Request parsing failed:', e.message);
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
      await logUsage(session.user.id, 'jpg_to_pdf', { imageCount });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `jpg-converted-${Date.now()}.pdf`,
          originalName: 'images.zip',
          size: 0,
          mimeType: 'application/pdf',
          url: 'local',
          tool: 'jpg-to-pdf',
          status: 'COMPLETED',
          resultSize: 0,
        },
      });
    }
    return NextResponse.json({ success: true });
  }

  const files = formData.getAll('files') as File[];
  const orderJson = formData.get('order') as string;
  const order: number[] = orderJson ? JSON.parse(orderJson) : files.map((_, i) => i);

  if (!files?.length) {
    return NextResponse.json({ error: 'At least one JPG image required' }, { status: 400 });
  }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
  const individualSizes = files.map(f => `${f.name}: ${(f.size / 1024 / 1024).toFixed(2)} MB`);

  console.log('[DEBUG-JPG-TO-PDF] Number of uploaded images:', files.length);
  console.log('[DEBUG-JPG-TO-PDF] Total upload size (MB):', totalMB);
  console.log('[DEBUG-JPG-TO-PDF] Individual image sizes:', individualSizes);
  console.log('[DEBUG-JPG-TO-PDF] Memory usage before processing:', memoryBefore);

  try {
    const ACCEPTED = ['image/jpeg', 'image/jpg'];
    for (const file of files) {
      if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(jpg|jpeg)$/i)) {
        return NextResponse.json({ error: `${file.name} is not a supported JPG/JPEG image` }, { status: 400 });
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
        let mimeType = 'image/jpeg';

        // Limit size on the backend too
        if (sharp) {
          const meta = await sharp(buffer).metadata();
          const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
          if (longest > 3000) {
            buffer = await sharp(buffer)
              .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
              .toBuffer();
          }
        }

        const image = await doc.embedJpg(buffer);
        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      } catch (e: any) {
        console.error(`[DEBUG-JPG-TO-PDF] Error processing ${file.name} at index ${idx}:`, e.message);
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

    console.log('[DEBUG-JPG-TO-PDF] Saving PDF document...');
    const pdfBuffer = Buffer.from(await doc.save());
    const memoryAfter = getMemInfo();

    console.log('[DEBUG-JPG-TO-PDF] PDF generated. Size:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');
    console.log('[DEBUG-JPG-TO-PDF] Memory usage after processing:', memoryAfter);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'jpg_to_pdf', { imageCount: files.length });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `jpg-converted-${Date.now()}.pdf`,
          originalName: files[0].name,
          size: files[0].size,
          mimeType: 'application/pdf',
          url: 'local',
          tool: 'jpg-to-pdf',
          status: 'COMPLETED',
          resultSize: pdfBuffer.length,
        },
      });
    }

    const outputName = `${files[0].name.replace(/\.(jpg|jpeg)$/i, '')}-converted.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    const errorMem = getMemInfo();
    console.error('[DEBUG-JPG-TO-PDF] Exception occurred:', error.message);
    console.error(error.stack);
    return NextResponse.json({
      error: error.message || 'Failed to convert JPG to PDF',
      stack: error.stack,
      numImages: files.length,
      totalMB,
      individualSizes,
      memoryBefore,
      memoryAfter: errorMem
    }, { status: 500 });
  }
}

