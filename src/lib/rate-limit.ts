// src/lib/rate-limit.ts
import prisma from './prisma';

const FREE_AI_LIMIT = 5;
const FREE_PDF_LIMIT = 50;

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
    
    // Get parts for the current time in the user's timezone
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

export interface UsageStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInMs: number;
}

async function verifyActiveProSubscription(userId: string, currentPlan: string): Promise<string> {
  if (currentPlan !== 'PRO') return currentPlan;

  const activeSub = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { currentPeriodEnd: 'desc' },
  });

  const now = new Date();
  if (!activeSub || activeSub.currentPeriodEnd < now) {
    // Downgrade user to FREE in database
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
    return 'FREE';
  }
  return 'PRO';
}

// Check if the user is allowed to perform the operation (read-only)
export async function checkUsage(
  userId: string,
  type: 'ai' | 'pdf',
  timezone: string = 'UTC'
): Promise<UsageStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      pdfUsed: true,
      aiUsed: true,
      lastReset: true,
    },
  });

  if (!user) throw new Error('User not found');

  const resolvedPlan = await verifyActiveProSubscription(userId, user.plan);

  // PRO users have unlimited usage
  if (resolvedPlan === 'PRO') {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetInMs: 0 };
  }

  const now = new Date();
  const currentDateStr = getLocalDateString(now, timezone);
  const lastResetDateStr = getLocalDateString(new Date(user.lastReset), timezone);
  const isExpired = currentDateStr !== lastResetDateStr;

  const limit = type === 'ai' ? FREE_AI_LIMIT : FREE_PDF_LIMIT;

  if (isExpired) {
    // If the day has changed, the user is fully reset
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetInMs: getMsUntilNextMidnight(timezone),
    };
  }

  const currentUsed = type === 'ai' ? user.aiUsed : user.pdfUsed;
  const remaining = Math.max(0, limit - currentUsed);
  const resetInMs = getMsUntilNextMidnight(timezone);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetInMs,
  };
}

// Increment usage ONLY after successful operations
// For FREE users: enforces daily limits.
// For PRO users: still increments for analytics — never blocked.
export async function incrementUsage(
  userId: string,
  type: 'ai' | 'pdf',
  timezone: string = 'UTC'
): Promise<UsageStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      pdfUsed: true,
      aiUsed: true,
      lastReset: true,
    },
  });

  if (!user) throw new Error('User not found');

  const resolvedPlan = await verifyActiveProSubscription(userId, user.plan);
  const isPro = resolvedPlan === 'PRO';
  const limit = type === 'ai' ? FREE_AI_LIMIT : FREE_PDF_LIMIT;

  const now = new Date();
  const currentDateStr = getLocalDateString(now, timezone);
  const lastResetDateStr = getLocalDateString(new Date(user.lastReset), timezone);
  const isExpired = currentDateStr !== lastResetDateStr;

  let newPdfUsed = user.pdfUsed;
  let newAiUsed = user.aiUsed;
  let newLastReset = new Date(user.lastReset);

  if (isExpired) {
    // Window expired: Reset daily counters and start a new window
    newPdfUsed = type === 'pdf' ? 1 : 0;
    newAiUsed = type === 'ai' ? 1 : 0;
    newLastReset = now;
  } else {
    // Same day: always increment (both Free and Pro)
    if (type === 'pdf') {
      newPdfUsed += 1;
    } else {
      newAiUsed += 1;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      pdfUsed: newPdfUsed,
      aiUsed: newAiUsed,
      lastReset: newLastReset,
    },
  });

  if (isPro) {
    // Pro users: unlimited, just return status for the response
    return { allowed: true, remaining: Infinity, limit: Infinity, resetInMs: 0 };
  }

  const currentUsed = type === 'ai' ? newAiUsed : newPdfUsed;
  const remaining = Math.max(0, limit - currentUsed);
  const resetInMs = getMsUntilNextMidnight(timezone);

  return {
    allowed: true,
    remaining,
    limit,
    resetInMs,
  };
}


export async function logUsage(
  userId: string,
  type: string,
  metadata?: Record<string, any>
): Promise<void> {
  await prisma.usageLog.create({
    data: { userId, type, metadata },
  });
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const cache = new Map<string, RateLimitRecord>();

export function rateLimitCheck(key: string, limit: number, windowMs: number): { allowed: boolean } {
  const now = Date.now();
  const record = cache.get(key);

  if (!record || now > record.resetAt) {
    cache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= limit) {
    return { allowed: false };
  }

  record.count += 1;
  return { allowed: true };
}
