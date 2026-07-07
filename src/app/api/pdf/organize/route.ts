// src/app/api/pdf/organize/route.ts
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
    const orderStr = formData.get('order') as string | null;
    const pagesJson = formData.get('pages') as string | null;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process in the priority scheduler
    const resultBuffer = await priorityScheduler.enqueue(async () => {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();
      const newDoc = await PDFDocument.create();

      if (pagesJson) {
        // Structured drag-drop reordering with custom rotations and duplication
        const pageItems = JSON.parse(pagesJson) as { originalIndex: number; rotation: number }[];
        if (pageItems.length === 0) {
          throw new Error('Organized PDF must contain at least 1 page');
        }

        for (const item of pageItems) {
          if (item.originalIndex >= 0 && item.originalIndex < totalPages) {
            const [copiedPage] = await newDoc.copyPages(pdfDoc, [item.originalIndex]);
            if (item.rotation) {
              copiedPage.setRotation(degrees(item.rotation % 360));
            }
            newDoc.addPage(copiedPage);
          }
        }
      } else if (orderStr) {
        // Fallback: simple comma-separated string order
        const indices = orderStr
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n) && n >= 1 && n <= totalPages);

        if (indices.length === 0) {
          throw new Error('No valid page indices specified in order sequence');
        }

        const pageIndices = indices.map((idx) => idx - 1);
        const copiedPages = await newDoc.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach((page) => newDoc.addPage(page));
      } else {
        throw new Error('Either pages array or order sequence is required');
      }

      return Buffer.from(await newDoc.save({ useObjectStreams: false }));
    }, true);

    await incrementUsage(session.user.id, 'pdf');
    await logUsage(session.user.id, 'pdf_organize', { fileName: file.name, hasPagesJson: !!pagesJson });
    await prisma.file.create({
      data: {
        userId: session.user.id,
        name: `organized-${file.name}`,
        originalName: file.name,
        size: buffer.length,
        mimeType: 'application/pdf',
        url: 'local',
        tool: 'organize',
        status: 'COMPLETED',
        resultSize: resultBuffer.length,
      },
    });

    return new Response(new Uint8Array(resultBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="organized-${file.name}"`,
        'Content-Length': String(resultBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('[organize] error:', error);
    return NextResponse.json({ error: error.message || 'Organize operation failed' }, { status: 500 });
  }
}
