// src/app/api/pdf/ocr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { extractWithOCR } from '@/lib/pdf-ai';
import { incrementUsage, logUsage } from '@/lib/rate-limit';
import { priorityScheduler } from '@/lib/priority-queue';

export const runtime = 'nodejs';
export const maxDuration = 120; // OCR takes longer

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

    if (!file) {
      return NextResponse.json({ error: 'Valid PDF or Image file required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Process in the priority scheduler
    const extractedText = await priorityScheduler.enqueue(async () => {
      return extractWithOCR(buffer);
    }, true);

    await incrementUsage(session.user.id, 'pdf');
    await logUsage(session.user.id, 'pdf_ocr', { fileName: file.name });
    await prisma.file.create({
      data: {
        userId: session.user.id,
        name: `${file.name.replace(/\.[^/.]+$/, '')}-ocr.txt`,
        originalName: file.name,
        size: buffer.length,
        mimeType: 'text/plain',
        url: 'local',
        tool: 'ocr',
        status: 'COMPLETED',
        resultSize: Buffer.from(extractedText || '').length,
      },
    });

    return NextResponse.json({
      text: extractedText || 'No text could be extracted.'
    });
  } catch (error: any) {
    console.error('[ocr] error:', error);
    return NextResponse.json({ error: error.message || 'OCR extraction failed' }, { status: 500 });
  }
}
