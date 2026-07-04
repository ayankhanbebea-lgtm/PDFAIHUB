// src/app/api/ai/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateSummary } from '@/lib/ai';
import { extractTextFromPDF } from '@/lib/pdf-ai';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { uploadToCloudinary } from '@/lib/cloudinary';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required to use AI features' }, { status: 401 });
  }

  const usage = await checkUsage(session.user.id, 'ai');
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "You've used all 10 free AI requests. Upgrade to Pro for unlimited AI features, or wait until your 24-hour limit resets.", upgrade: true },
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);
    console.log(`[summarize] extracted: ${text?.length ?? 0} chars`);

    if (!text || text.trim().length < 100) {
      return NextResponse.json({
        error: 'Could not extract readable text from this PDF.',
        detail: `Only ${text?.trim().length ?? 0} characters extracted. PDF may be scanned or image-based.`,
      }, { status: 400 });
    }

    const summary = await generateSummary(text, provider);
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
        metadata: { summaryGenerated: true, provider },
      },
    });

    await incrementUsage(session.user.id, 'ai');
    await logUsage(session.user.id, 'ai_summary', { fileName: file.name, provider });

    return NextResponse.json({ success: true, summary, fileId: fileRecord.id, remaining: usage.remaining - 1 });
  } catch (error: any) {
    console.error('[summarize] ERROR:', error.message);
    console.error('[summarize] STACK:', error.stack);
    return NextResponse.json({
      error: error.message || 'Failed to generate summary',
    }, { status: 500 });
  }
}
