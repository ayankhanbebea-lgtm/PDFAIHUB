// src/lib/rate-limit.ts
import prisma from './prisma';

const FREE_AI_LIMIT = 10;
const FREE_PDF_LIMIT = 50;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UsageStatus {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInMs: number;
}

// Check if the user is allowed to perform the operation (read-only)
export async function checkUsage(
  userId: string,
  type: 'ai' | 'pdf'
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

  // PRO users have unlimited usage
  if (user.plan === 'PRO') {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetInMs: 0 };
  }

  const now = Date.now();
  const lastResetTime = new Date(user.lastReset).getTime();
  const timeElapsed = now - lastResetTime;
  const isExpired = timeElapsed >= WINDOW_MS;

  const limit = type === 'ai' ? FREE_AI_LIMIT : FREE_PDF_LIMIT;

  if (isExpired) {
    // If the 24h window has passed, the user is fully reset
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetInMs: 0,
    };
  }

  const currentUsed = type === 'ai' ? user.aiUsed : user.pdfUsed;
  const remaining = Math.max(0, limit - currentUsed);
  const resetInMs = Math.max(0, WINDOW_MS - timeElapsed);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetInMs,
  };
}

// Increment usage ONLY after successful operations
export async function incrementUsage(
  userId: string,
  type: 'ai' | 'pdf'
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

  // PRO users have unlimited usage
  if (user.plan === 'PRO') {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetInMs: 0 };
  }

  const now = new Date();
  const lastResetTime = new Date(user.lastReset).getTime();
  const timeElapsed = now.getTime() - lastResetTime;
  const isExpired = timeElapsed >= WINDOW_MS;

  let newPdfUsed = user.pdfUsed;
  let newAiUsed = user.aiUsed;
  let newLastReset = new Date(user.lastReset);

  if (isExpired) {
    // Window expired: Reset both counters and start a new 24h window now
    newPdfUsed = type === 'pdf' ? 1 : 0;
    newAiUsed = type === 'ai' ? 1 : 0;
    newLastReset = now;
  } else {
    // Active window: Increment the specific usage
    const isFirstUsageInWindow = user.pdfUsed === 0 && user.aiUsed === 0;

    if (type === 'pdf') {
      newPdfUsed += 1;
    } else {
      newAiUsed += 1;
    }

    if (isFirstUsageInWindow) {
      newLastReset = now;
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

  const limit = type === 'ai' ? FREE_AI_LIMIT : FREE_PDF_LIMIT;
  const currentUsed = type === 'ai' ? newAiUsed : newPdfUsed;
  const remaining = Math.max(0, limit - currentUsed);
  const resetInMs = Math.max(0, WINDOW_MS - (now.getTime() - newLastReset.getTime()));

  return {
    allowed: remaining > 0,
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
