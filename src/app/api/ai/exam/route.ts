// src/app/api/ai/exam/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateExamPackage } from '@/lib/ai';
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

  const isPro = session.user.plan === 'PRO';

  // Check usage limits
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
    const provider = (formData.get('provider') as 'openai' | 'gemini' | 'groq') || 'groq';

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Generate full package
    const examData = await generateExamPackage(text, provider);

    // Save package in DB only if user is PRO
    let packageId = null;
    if (isPro) {
      const pkg = await prisma.examPackage.create({
        data: {
          userId: session.user.id,
          title: `Exam Package: ${file.name.replace(/\.[^/.]+$/, "")}`,
          fileName: file.name,
          fileSize: file.size,
          readinessScore: examData.readinessScore || 85,
          studyTime: examData.studyTime || '6h 20m',
          questionsCount: examData.questionsCount || 15,
          flashcardsCount: examData.flashcardsCount || 10,
          difficulty: examData.difficulty || 'Medium',
          smartNotes: examData.smartNotes,
          importantTopics: examData.importantTopics,
          pysQuestions: examData.pysQuestions,
          mcqs: examData.mcqs,
          flashcards: examData.flashcards,
          revisionNotes: examData.revisionNotes,
          memoryTricks: examData.memoryTricks,
          mockTest: examData.mockTest,
        },
      });
      packageId = pkg.id;
    }

    // Log usage and increment quota
    await incrementUsage(session.user.id, 'ai');
    await logUsage(session.user.id, 'ai_exam_mode', { fileName: file.name, isPro });

    return NextResponse.json({
      success: true,
      packageId,
      examPackage: examData,
      remaining: usage.remaining - 1,
    });
  } catch (error: any) {
    console.error('[ai-exam] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate exam package' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Pro users can revisit old packages
  const isPro = session.user.plan === 'PRO';
  if (!isPro) {
    return NextResponse.json({ error: 'Pro plan required to view package history' }, { status: 403 });
  }

  const packages = await prisma.examPackage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return NextResponse.json({ success: true, packages });
}
