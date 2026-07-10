// src/app/api/user/usage/route.ts
// Returns the user's LIVE usage stats directly from the database.
// All responses include Cache-Control: no-store to prevent any caching.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const FREE_AI_LIMIT = 5;
const FREE_PDF_LIMIT = 50;

// Force dynamic — disable ALL Next.js route caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  try {
    // Always read fresh from DB — never trust a cached value
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        aiUsed: true,
        pdfUsed: true,
        lastReset: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { currentPeriodEnd: 'desc' },
          take: 1,
          select: { currentPeriodEnd: true, status: true, planType: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, {
        status: 404,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const now = new Date();
    const activeSub = user.subscriptions[0];
    const hasActiveSub = activeSub && activeSub.currentPeriodEnd > now;
    const isPro = user.plan === 'PRO' && !!hasActiveSub;

    // UTC-based day check (consistent with incrementAiUsage)
    const todayUTC = now.toISOString().slice(0, 10);
    const lastResetUTC = user.lastReset.toISOString().slice(0, 10);
    const isNewDay = todayUTC !== lastResetUTC;

    // If the day has rolled over, counters are logically 0 until next increment
    const aiUsedToday = isNewDay ? 0 : user.aiUsed;
    const pdfUsedToday = isNewDay ? 0 : user.pdfUsed;

    // Time until next midnight UTC
    const tomorrowMidnight = new Date(todayUTC);
    tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1);
    const resetInMs = isPro ? 0 : Math.max(0, tomorrowMidnight.getTime() - now.getTime());

    console.log(`[usage] User: ${session.user.id} | Plan: ${user.plan} | isPro: ${isPro} | aiUsed (DB): ${user.aiUsed} | isNewDay: ${isNewDay} | aiUsedToday: ${aiUsedToday}`);

    const responseHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };

    if (isPro) {
      return NextResponse.json({
        plan: user.plan,
        isPro: true,
        aiUsed: aiUsedToday,
        aiLimit: null,
        aiRemaining: null,
        pdfUsed: pdfUsedToday,
        pdfLimit: null,
        pdfRemaining: null,
        resetInMs: 0,
      }, { headers: responseHeaders });
    }

    // Free user
    return NextResponse.json({
      plan: user.plan,
      isPro: false,
      aiUsed: aiUsedToday,
      aiLimit: FREE_AI_LIMIT,
      aiRemaining: Math.max(0, FREE_AI_LIMIT - aiUsedToday),
      aiLocked: aiUsedToday >= FREE_AI_LIMIT,
      pdfUsed: pdfUsedToday,
      pdfLimit: FREE_PDF_LIMIT,
      pdfRemaining: Math.max(0, FREE_PDF_LIMIT - pdfUsedToday),
      resetInMs,
    }, { headers: responseHeaders });

  } catch (error: any) {
    console.error('[usage] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch usage' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }
}
