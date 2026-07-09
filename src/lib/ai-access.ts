// src/lib/ai-access.ts
// Centralized AI access control — used by ALL AI API endpoints.
// This is the single source of truth for who can use AI features.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from './prisma';

export interface UsageStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInMs: number;
}

export type AiAccessResult = {
  allowed: true;
  userId: string;
  isPro: boolean;
  usage: UsageStatus;
  timezone: string;
} | {
  allowed: false;
  response: Response | NextResponse;
};

function getLocalDateString(date: Date, timezone: string = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date); // Returns YYYY-MM-DD
  } catch (e) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  }
}

function getMsUntilNextMidnight(timezone: string = 'UTC'): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const partsMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    const pad = (v: string | undefined) => (v || '0').padStart(2, '0');
    const tzOffsetDateStr = `${partsMap.year}-${pad(partsMap.month)}-${pad(partsMap.day)}T00:00:00`;
    
    const localMidnightToday = new Date(new Date(tzOffsetDateStr).toLocaleString('en-US', { timeZone: timezone }));
    const tomorrowMidnight = new Date(localMidnightToday.getTime() + 24 * 60 * 60 * 1000);
    
    const ms = tomorrowMidnight.getTime() - now.getTime();
    return ms > 0 ? ms : 24 * 60 * 60 * 1000;
  } catch (e) {
    return 24 * 60 * 60 * 1000;
  }
}

/**
 * Call at the top of every AI POST handler.
 * Returns either an allow object with resolved user/usage data,
 * or a deny object with the ready-to-return HTTP response.
 *
 * FREE limit: 5 AI requests/day (shared across all AI tools).
 * PRO:        Unlimited.
 * Guest:      Blocked with 401.
 */
export async function checkAiAccess(request: NextRequest, mockSessionUserId?: string): Promise<AiAccessResult> {
  const session = mockSessionUserId
    ? (mockSessionUserId === 'GUEST' ? null : { user: { id: mockSessionUserId } })
    : await getServerSession(authOptions);
  const endpoint = request.nextUrl.pathname;

  // 1. Authenticate user (reject guests)
  if (!session?.user?.id) {
    console.log(`[ACCESS] User ID: GUEST | Plan: NONE | isPro: false | Today's AI usage: 0 | Endpoint: ${endpoint} | Allowed: false | Reason: UNAUTHENTICATED`);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          code: 'UNAUTHENTICATED',
          message: 'You must be signed in to use AI features.',
        },
        { status: 401 }
      ),
    };
  }

  const userId = session.user.id;
  const timezone = request.headers.get('x-timezone') || 'UTC';

  // 2. Fetch user and subscription directly from the database (DO NOT trust session cached plan)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        where: { status: 'ACTIVE' },
        orderBy: { currentPeriodEnd: 'desc' },
        take: 1,
      }
    }
  });

  if (!user) {
    console.log(`[ACCESS] User ID: ${userId} | Plan: NONE | isPro: false | Today's AI usage: 0 | Endpoint: ${endpoint} | Allowed: false | Reason: USER_NOT_FOUND`);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
        },
        { status: 404 }
      ),
    };
  }

  const now = new Date();
  const activeSub = user.subscriptions[0];
  const hasActiveSub = activeSub && activeSub.currentPeriodEnd > now;
  const isPro = user.plan === 'PRO' && !!hasActiveSub;

  // Sync / self-correct db plan if active sub expired
  if (user.plan === 'PRO' && !isPro) {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'FREE' },
    });
    if (activeSub) {
      await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { status: 'EXPIRED' },
      });
    }
  }

  // 3. Pro gating for AI Exam Mode
  const isExamRoute = endpoint.startsWith('/api/ai/exam');
  if (isExamRoute && !isPro) {
    console.log(`[ACCESS] User ID: ${userId} | Plan: ${user.plan} | isPro: ${isPro} | Today's AI usage: ${user.aiUsed} | Endpoint: ${endpoint} | Allowed: false | Reason: PRO_PLAN_REQUIRED`);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          code: 'PRO_PLAN_REQUIRED',
          message: 'AI Exam Mode is a Pro-only feature.',
        },
        { status: 403 }
      ),
    };
  }

  // 4. Timezone-aware daily quota check for Free users
  const currentDateStr = getLocalDateString(now, timezone);
  const lastResetDateStr = getLocalDateString(new Date(user.lastReset), timezone);
  const isExpired = currentDateStr !== lastResetDateStr;

  const todayUsage = isExpired ? 0 : user.aiUsed;
  const limit = 5;
  const remaining = isPro ? Infinity : Math.max(0, limit - todayUsage);
  const resetInMs = getMsUntilNextMidnight(timezone);

  const usageStatus: UsageStatus = {
    allowed: isPro || remaining > 0,
    remaining,
    limit: isPro ? Infinity : limit,
    resetInMs,
  };

  if (!isPro && todayUsage >= limit) {
    console.log(`[ACCESS] User ID: ${userId} | Plan: ${user.plan} | isPro: ${isPro} | Today's AI usage: ${todayUsage} | Endpoint: ${endpoint} | Allowed: false | Reason: FREE_LIMIT_REACHED`);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          code: 'FREE_LIMIT_REACHED',
          message: 'You have used all 5 free AI requests today.',
        },
        { status: 403 }
      ),
    };
  }

  // Log allowed access
  console.log(`[ACCESS] User ID: ${userId} | Plan: ${user.plan} | isPro: ${isPro} | Today's AI usage: ${todayUsage} | Endpoint: ${endpoint} | Allowed: true | Reason: ALLOWED`);

  return {
    allowed: true,
    userId,
    isPro,
    usage: usageStatus,
    timezone,
  };
}
