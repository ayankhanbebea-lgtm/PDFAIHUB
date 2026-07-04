// src/app/api/ai/chat/route.ts — REQUIRES AUTH
// AI Feature: text extraction is intentional here — uses pdf-ai.ts (not pdf.ts)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chatWithPDF } from '@/lib/ai';
import { extractTextFromPDF } from '@/lib/pdf-ai';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { uploadToCloudinary } from '@/lib/cloudinary';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
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
    const file = formData.get('file') as File | null;
    const question = formData.get('question') as string;
    const sessionId = formData.get('sessionId') as string | null;
    const provider = (formData.get('provider') as 'openai' | 'gemini' | 'groq') || 'groq';

    console.log(`[chat] Request — question: ${question?.slice(0,50)}, sessionId: ${sessionId}, provider: ${provider}, hasFile: ${!!file}`);

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    let chatSessionId = sessionId;
    let pdfContent = '';

    if (file && !sessionId) {
      // New session — upload and extract PDF
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      pdfContent = await extractTextFromPDF(buffer);
      console.log(`[chat] Extracted PDF text: ${pdfContent?.length ?? 0} chars`);
      if (!pdfContent || pdfContent.trim().length < 50) {
        return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
      }

      // Cloudinary upload is optional
      const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name';
      let uploadUrl = 'local';
      let uploadPublicId = '';
      if (cloudinaryConfigured) {
        try {
          const uploaded = await uploadToCloudinary(buffer, {
            folder: `pdfai-hub/${session.user.id}/chat`,
            resourceType: 'raw',
            format: 'pdf',
          });
          uploadUrl = uploaded.url;
          uploadPublicId = uploaded.publicId;
        } catch (upErr: any) {
          console.warn('[chat] Cloudinary upload skipped:', upErr.message);
        }
      }

      const newSession = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          fileName: file.name,
          title: `Chat: ${file.name}`,
          pdfText: pdfContent.slice(0, 50000),
        },
      });
      chatSessionId = newSession.id;

      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: file.name,
          originalName: file.name,
          size: buffer.length,
          mimeType: 'application/pdf',
          url: uploadUrl,
          publicId: uploadPublicId,
          tool: 'chat',
          status: 'COMPLETED',
          metadata: { sessionId: chatSessionId },
        },
      });
    } else if (sessionId) {
      const existingSession = await prisma.chatSession.findUnique({
        where: { id: sessionId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
      if (!existingSession) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
      }
      pdfContent = existingSession.pdfText || '';
      chatSessionId = existingSession.id;
    } else {
      return NextResponse.json({ error: 'Provide either a PDF file or sessionId' }, { status: 400 });
    }

    // Get conversation history
    const history = sessionId
      ? (await prisma.chatSession.findUnique({
          where: { id: chatSessionId! },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
        }))?.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })) || []
      : [];

    const answer = await chatWithPDF(question, pdfContent, history, provider);

    await prisma.chatMessage.createMany({
      data: [
        { sessionId: chatSessionId!, role: 'user', content: question },
        { sessionId: chatSessionId!, role: 'assistant', content: answer },
      ],
    });

    await incrementUsage(session.user.id, 'ai');
    await logUsage(session.user.id, 'ai_chat');

    return NextResponse.json({ success: true, sessionId: chatSessionId, answer, remaining: usage.remaining - 1 });
  } catch (error: any) {
    console.error('[chat] FULL ERROR:', error);
    console.error('[chat] Stack:', error?.stack);
    return NextResponse.json({
      error: 'Failed to process question',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId, userId: session.user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json({ session: chatSession });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, title: true, fileName: true, createdAt: true },
  });
  return NextResponse.json({ sessions });
}
