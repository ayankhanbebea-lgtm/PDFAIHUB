// src/app/api/pdf/rotate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PDFDocument, degrees } from 'pdf-lib';
import { incrementUsage, logUsage } from '@/lib/rate-limit';
import { priorityScheduler } from '@/lib/priority-queue';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const angleStr = formData.get('angle') as string || '90';
    const rotationsStr = formData.get('rotations') as string | null;

    const rotationAngle = parseInt(angleStr, 10);

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process in the priority scheduler
    const resultBuffer = await priorityScheduler.enqueue(async () => {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      if (rotationsStr) {
        // Page-by-page custom rotations
        const customRotations = JSON.parse(rotationsStr) as { pageIndex: number; rotation: number }[];
        customRotations.forEach(({ pageIndex, rotation }) => {
          if (pageIndex >= 0 && pageIndex < pages.length) {
            const page = pages[pageIndex];
            page.setRotation(degrees(rotation % 360));
          }
        });
      } else {
        // Fallback: Rotate all pages by the single angle relative to current state
        pages.forEach((page) => {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees((currentRotation + rotationAngle) % 360));
        });
      }

      return Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
    }, true);

    await incrementUsage(session.user.id, 'pdf');
    await logUsage(session.user.id, 'pdf_rotate', { fileName: file.name, hasCustomRotations: !!rotationsStr });
    await prisma.file.create({
      data: {
        userId: session.user.id,
        name: `rotated-${file.name}`,
        originalName: file.name,
        size: buffer.length,
        mimeType: 'application/pdf',
        url: 'local',
        tool: 'rotate',
        status: 'COMPLETED',
        resultSize: resultBuffer.length,
      },
    });

    return new Response(new Uint8Array(resultBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rotated-${file.name}"`,
        'Content-Length': String(resultBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('[rotate] error:', error);
    return NextResponse.json({ error: error.message || 'Rotate operation failed' }, { status: 500 });
  }
}
