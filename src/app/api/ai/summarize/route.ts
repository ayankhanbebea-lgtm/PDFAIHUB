// src/app/api/ai/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/ai';
import { extractTextFromPDF } from '@/lib/pdf-ai';
import { checkAiAccess } from '@/lib/ai-access';
import { incrementUsage, logUsage } from '@/lib/rate-limit';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { priorityScheduler } from '@/lib/priority-queue';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  // ── ACCESS GUARD ─────────────────────────────────────────────────────────────
  const access = await checkAiAccess(request);
  if (!access.allowed) return access.response;
  const { userId, isPro, usage, timezone } = access;
  // ─────────────────────────────────────────────────────────────────────────────

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
        userId,
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
        // Cached: don't consume a request
        return NextResponse.json({
          success: true,
          summary: meta.summary,
          fileId: existingFile.id,
          remaining: usage.remaining,
        });
      }
    }

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
          folder: `pdfai-hub/${userId}/ai-files`,
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
        userId,
        name: file.name,
        originalName: file.name,
        size: buffer.length,
        mimeType: 'application/pdf',
        url,
        publicId,
        tool: 'summarize',
        status: 'COMPLETED',
        metadata: { summaryGenerated: true, provider, summary } as any,
      },
    });

    // ── Consume one AI request (after success) ────────────────────────────────
    await incrementUsage(userId, 'ai', timezone);
    await logUsage(userId, 'ai_summary', { fileName: file.name, provider });
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      summary,
      fileId: fileRecord.id,
      remaining: usage.remaining - 1,
    });
  } catch (error: any) {
    console.error('[summarize] ERROR:', error.message);
    const friendlyMsg = error.message?.includes('429') || error.message?.includes('rate limit')
      ? 'AI is currently busy. Switching to another AI model...'
      : 'Failed to generate summary due to a temporary processing issue. Please try again.';
    return NextResponse.json({ error: friendlyMsg }, { status: 500 });
  }
}
