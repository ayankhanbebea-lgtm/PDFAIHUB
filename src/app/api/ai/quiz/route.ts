// src/app/api/ai/quiz/route.ts
// AI Feature: text extraction is intentional here — uses pdf-ai.ts (not pdf.ts)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateQuiz } from '@/lib/ai';
import { extractTextFromPDF } from '@/lib/pdf-ai';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
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
      { error: "You've used all 10 free AI requests. Upgrade to Pro for unlimited AI features, or wait until your 24-hour limit resets.", upgrade: true },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const count = parseInt(formData.get('count') as string || '10');
    const provider = (formData.get('provider') as 'openai' | 'gemini' | 'groq') || 'groq';
    console.log(`[quiz] Request — file: ${file?.name}, count: ${count}, provider: ${provider}`);

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);
    console.log(`[quiz] Extracted text: ${text?.length ?? 0} chars`);

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    const questions = await generateQuiz(text, Math.min(count, 20), provider);

    const quiz = await prisma.quiz.create({
      data: {
        userId: session.user.id,
        title: `Quiz: ${file.name}`,
        questions: questions as unknown as any,
      },
    });

    await incrementUsage(session.user.id, 'ai');
    await logUsage(session.user.id, 'ai_quiz', { questionCount: questions.length });

    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      questions,
      remaining: usage.remaining - 1,
    });
  } catch (error: any) {
    console.error('[quiz] FULL ERROR:', error);
    console.error('[quiz] Stack:', error?.stack);
    return NextResponse.json({
      error: 'Failed to generate quiz',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quizzes = await prisma.quiz.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({ quizzes });
}
