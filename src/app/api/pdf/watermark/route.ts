// src/app/api/pdf/watermark/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { incrementUsage, logUsage } from '@/lib/rate-limit';
import { priorityScheduler } from '@/lib/priority-queue';

export const runtime = 'nodejs';
export const maxDuration = 60;

function hexToRgb(hex: string) {
  const cleanHex = hex.replace(/^#/, '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return { r, g, b };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Strict Pro gating
  const activeSub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
  });

  const now = new Date();
  if (!activeSub || activeSub.currentPeriodEnd < now) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'text' | 'image' || 'text';
    const text = (formData.get('text') as string || 'PDFAI HUB').trim();
    const colorHex = formData.get('color') as string || '#000000';
    const fontSize = parseInt(formData.get('fontSize') as string || '40');
    const opacity = parseFloat(formData.get('opacity') as string || '0.3');
    const rotation = parseInt(formData.get('rotation') as string || '45');
    const position = formData.get('position') as 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' || 'center';
    
    // Image properties
    const imageFile = formData.get('image') as File | null;
    const imageScale = parseFloat(formData.get('imageScale') as string || '0.5');

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process in the priority scheduler
    const resultBuffer = await priorityScheduler.enqueue(async () => {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      let embeddedImage: any = null;
      if (type === 'image' && imageFile) {
        const imgBuffer = Buffer.from(await imageFile.arrayBuffer());
        if (imageFile.type === 'image/png' || imageFile.name.toLowerCase().endsWith('.png')) {
          embeddedImage = await pdfDoc.embedPng(imgBuffer);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imgBuffer);
        }
      }

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const { r, g, b } = hexToRgb(colorHex);

      pages.forEach((page) => {
        const { width, height } = page.getSize();

        if (type === 'image' && embeddedImage) {
          const dims = embeddedImage.scale(imageScale);
          let imgX = width / 2;
          let imgY = height / 2;

          if (position === 'top-left') {
            imgX = 50;
            imgY = height - dims.height - 50;
          } else if (position === 'top-right') {
            imgX = width - dims.width - 50;
            imgY = height - dims.height - 50;
          } else if (position === 'bottom-left') {
            imgX = 50;
            imgY = 50;
          } else if (position === 'bottom-right') {
            imgX = width - dims.width - 50;
            imgY = 50;
          } else {
            imgX = width / 2 - dims.width / 2;
            imgY = height / 2 - dims.height / 2;
          }

          page.drawImage(embeddedImage, {
            x: imgX,
            y: imgY,
            width: dims.width,
            height: dims.height,
            opacity: opacity,
            rotate: degrees(rotation),
          });
        } else {
          // Text watermark
          let textX = width / 2;
          let textY = height / 2;

          if (position === 'top-left') {
            textX = 50;
            textY = height - 50;
          } else if (position === 'top-right') {
            textX = width - fontSize * 6 - 50;
            textY = height - 50;
          } else if (position === 'bottom-left') {
            textX = 50;
            textY = 50;
          } else if (position === 'bottom-right') {
            textX = width - fontSize * 6 - 50;
            textY = 50;
          } else {
            textX = width / 2 - (text.length * fontSize) / 4;
            textY = height / 2;
          }

          page.drawText(text, {
            x: textX,
            y: textY,
            size: fontSize,
            font,
            color: rgb(r, g, b),
            opacity: opacity,
            rotate: degrees(rotation),
          });
        }
      });

      return Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
    }, true);

    await incrementUsage(session.user.id, 'pdf');
    await logUsage(session.user.id, 'pdf_watermark', { fileName: file.name, type });
    await prisma.file.create({
      data: {
        userId: session.user.id,
        name: `watermarked-${file.name}`,
        originalName: file.name,
        size: buffer.length,
        mimeType: 'application/pdf',
        url: 'local',
        tool: 'watermark',
        status: 'COMPLETED',
        resultSize: resultBuffer.length,
      },
    });

    return new Response(new Uint8Array(resultBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="watermarked-${file.name}"`,
        'Content-Length': String(resultBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('[watermark] error:', error);
    return NextResponse.json({ error: error.message || 'Watermark operation failed' }, { status: 500 });
  }
}
