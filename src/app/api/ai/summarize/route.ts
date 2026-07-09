// src/app/api/ai/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateSummary } from '@/lib/ai';
import { extractTextFromPDF } from '@/lib/pdf-ai';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { priorityScheduler } from '@/lib/priority-queue';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usage = await checkUsage(session.user.id, 'ai');
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "You've reached your free daily limit for AI operations. Upgrade to Pro for unlimited usage.", upgrade: true },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const provider = (formData.get('provider') as string) || 'groq';

    console.log(`[summarize] file: ${file?.name}, provider: ${provider}`);

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF must be under 20MB' }, { status: 400 });
    }

    // Check if same file was already summarized (Token Optimization: Local Cache)
    const existingFile = await prisma.file.findFirst({
      where: {
        userId: session.user.id,
        name: file.name,
        size: file.size,
        tool: 'summarize',
        status: 'COMPLETED',
      },
    });

    if (existingFile && existingFile.metadata) {
      const meta = existingFile.metadata as any;
      if (meta.summary) {
        console.log(`[summarize] Cache hit for ${file.name} (${file.size} bytes). Returning cached summary.`);
        return NextResponse.json({
          success: true,
          summary: meta.summary,
          fileId: existingFile.id,
          remaining: usage.remaining,
        });
      }
    }

    const isPro = session.user.plan === 'PRO';
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Wrap text extraction in priority scheduler
    const text = await priorityScheduler.enqueue(async () => {
      return extractTextFromPDF(buffer);
    }, isPro);
    
    console.log(`[summarize] extracted: ${text?.length ?? 0} chars`);

    if (!text || text.trim().length < 100) {
      return NextResponse.json({
        error: 'Could not extract readable text from this PDF.',
        detail: `Only ${text?.trim().length ?? 0} characters extracted. PDF may be scanned or image-based.`,
      }, { status: 400 });
    }

    // Wrap AI model call in priority scheduler
    const summary = await priorityScheduler.enqueue(async () => {
      return generateSummary(text, provider);
    }, isPro);
    
    console.log(`[summarize] summary generated — shortSummary: ${summary?.shortSummary?.length ?? 0} chars`);

    // Cloudinary — optional
    let url = 'local';
    let publicId = '';
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name'
    ) {
      try {
        const uploaded = await uploadToCloudinary(buffer, {
          folder: `pdfai-hub/${session.user.id}/ai-files`,
          resourceType: 'raw',
          format: 'pdf',
        });
        url = uploaded.url;
        publicId = uploaded.publicId;
      } catch (e: any) {
        console.warn('[summarize] Cloudinary skip:', e.message);
      }
    }

    const fileRecord = await prisma.file.create({
      data: {
        userId: session.user.id,
        name: file.name,
        originalName: file.name,
        size: buffer.length,
        mimeType: 'application/pdf',
        url,
        publicId,
        tool: 'summarize',
        status: 'COMPLETED',
        metadata: { summaryGenerated: true, provider, summary },
      },
    });

    await incrementUsage(session.user.id, 'ai');
    await logUsage(session.user.id, 'ai_summary', { fileName: file.name, provider });

    return NextResponse.json({ success: true, summary, fileId: fileRecord.id, remaining: usage.remaining - 1 });
  } catch (error: any) {
    console.error('[summarize] ERROR:', error.message);
    const friendlyMsg = error.message?.includes('429') || error.message?.includes('rate limit')
      ? 'AI is currently busy. Switching to another AI model...'
      : 'Failed to generate summary due to a temporary processing issue. Please try again.';
    return NextResponse.json({
      error: friendlyMsg,
    }, { status: 500 });
  }
}
