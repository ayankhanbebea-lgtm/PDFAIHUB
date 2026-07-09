// src/app/api/user/usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { checkUsage } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timezone = request.headers.get('x-timezone') || 'UTC';

  try {
    // Fetch live user record (plan, daily counters)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        aiUsed: true,
        pdfUsed: true,
        lastReset: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const plan = user.plan;
    const isPro = plan === 'PRO';

    // Timezone-aware daily reset check
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const todayStr = formatter.format(now);
    const lastResetStr = formatter.format(new Date(user.lastReset));
    const isNewDay = todayStr !== lastResetStr;

    // If day has changed, daily counters are logically 0 (reset not yet triggered in DB)
    const aiUsedToday = isNewDay ? 0 : user.aiUsed;
    const pdfUsedToday = isNewDay ? 0 : user.pdfUsed;

    if (isPro) {
      // Pro users: return real usage for analytics, never show limits
      const resetInMs = 0; // Pro users don't reset
      return NextResponse.json({
        plan,
        isPro: true,
        // Daily AI usage (today's actual requests)
        aiUsed: aiUsedToday,
        aiLimit: null,         // null = unlimited
        aiRemaining: null,     // null = unlimited
        // Daily PDF usage
        pdfUsed: pdfUsedToday,
        pdfLimit: null,
        pdfRemaining: null,
        resetInMs,
      });
    }

    // Free user — enforce limits
    const aiUsage = await checkUsage(session.user.id, 'ai', timezone);
    const pdfUsage = await checkUsage(session.user.id, 'pdf', timezone);

    const aiRemaining = aiUsage.remaining;
    const pdfRemaining = pdfUsage.remaining;

    return NextResponse.json({
      plan,
      isPro: false,
      aiUsed: aiUsedToday,
      aiLimit: 5,
      aiRemaining,
      aiLocked: aiRemaining <= 0,   // UI uses this to render lock wall
      pdfUsed: pdfUsedToday,
      pdfLimit: 50,
      pdfRemaining,
      resetInMs: Math.max(aiUsage.resetInMs, pdfUsage.resetInMs),
    });
  } catch (error: any) {
    console.error('[usage] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch usage' }, { status: 500 });
  }
}
