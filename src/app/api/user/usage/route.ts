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
  console.log('[DEBUG /api/user/usage] GET request received');
  console.log('[DEBUG /api/user/usage] Env availability - DATABASE_URL:', !!process.env.DATABASE_URL, 'NEXTAUTH_SECRET:', !!process.env.NEXTAUTH_SECRET, 'NEXTAUTH_URL:', !!process.env.NEXTAUTH_URL);

  let session;
  try {
    console.log('[DEBUG /api/user/usage] Calling getServerSession...');
    session = await getServerSession(authOptions);
    console.log('[DEBUG /api/user/usage] getServerSession completed successfully. Session User ID:', session?.user?.id, 'Role:', session?.user?.role, 'Plan:', session?.user?.plan);
  } catch (err: any) {
    console.error('[DEBUG /api/user/usage] getServerSession THREW AN ERROR:', err.message, err.stack);
    return NextResponse.json({ error: 'Auth session error: ' + err.message }, { status: 500 });
  }

  if (!session?.user?.id) {
    console.warn('[DEBUG /api/user/usage] Session unauthorized (no user.id)');
    return NextResponse.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }

  try {
    console.log('[DEBUG /api/user/usage] Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('[DEBUG /api/user/usage] Database connectivity check PASSED');
  } catch (dbErr: any) {
    console.error('[DEBUG /api/user/usage] Database connectivity check FAILED:', dbErr.message, dbErr.stack);
    return NextResponse.json({ error: 'Database connectivity error: ' + dbErr.message }, { status: 500 });
  }

  try {
    console.log('[DEBUG /api/user/usage] Querying prisma.user.findUnique for user ID:', session.user.id);
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
    console.log('[DEBUG /api/user/usage] prisma query completed successfully. User details fetched:', !!user);

    if (!user) {
      console.warn('[DEBUG /api/user/usage] User not found in DB for ID:', session.user.id);
      return NextResponse.json({ error: 'User not found' }, {
        status: 404,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const now = new Date();
    const activeSub = user.subscriptions[0];
    const hasActiveSub = activeSub && activeSub.currentPeriodEnd > now;
    const isPro = user.plan === 'PRO' && !!hasActiveSub;

    const todayUTC = now.toISOString().slice(0, 10);
    const lastResetUTC = user.lastReset.toISOString().slice(0, 10);
    const isNewDay = todayUTC !== lastResetUTC;

    const aiUsedToday = isNewDay ? 0 : user.aiUsed;
    const pdfUsedToday = isNewDay ? 0 : user.pdfUsed;

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
    console.error('[DEBUG /api/user/usage] Query execution FAILED with error:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Failed to fetch usage' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }
}
