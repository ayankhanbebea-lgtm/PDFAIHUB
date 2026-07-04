// src/app/api/user/usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const FREE_AI_LIMIT = 10;
const FREE_PDF_LIMIT = 50;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      pdfUsed: true,
      aiUsed: true,
      lastReset: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const isPro = user.plan === 'PRO';
  const now = Date.now();
  const lastResetTime = new Date(user.lastReset).getTime();
  const timeElapsed = now - lastResetTime;
  const isExpired = timeElapsed >= WINDOW_MS;

  let pdfUsed = user.pdfUsed;
  let aiUsed = user.aiUsed;
  let resetInMs = 0;

  if (!isPro) {
    if (isExpired) {
      pdfUsed = 0;
      aiUsed = 0;
    } else {
      resetInMs = WINDOW_MS - timeElapsed;
    }
  }

  return NextResponse.json({
    plan: user.plan,
    pdfUsed,
    pdfLimit: isPro ? Infinity : FREE_PDF_LIMIT,
    pdfRemaining: isPro ? Infinity : Math.max(0, FREE_PDF_LIMIT - pdfUsed),
    aiUsed,
    aiLimit: isPro ? Infinity : FREE_AI_LIMIT,
    aiRemaining: isPro ? Infinity : Math.max(0, FREE_AI_LIMIT - aiUsed),
    resetInMs,
    lastReset: user.lastReset,
  });
}
