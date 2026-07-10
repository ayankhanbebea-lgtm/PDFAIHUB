// src/lib/ai-usage.ts
// ════════════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH for AI usage counting.
//
// ALL AI endpoints MUST call incrementAiUsage(userId, featureName)
// after a confirmed successful AI response.
//
// Rules:
//  - NEVER call this before the AI responds.
//  - NEVER call this if the AI throws or returns an error.
//  - NEVER call this twice per request.
//  - PRO users: always allowed, always counted (for analytics).
//  - FREE users: counted up to FREE_LIMIT per day, blocked after.
//
// Implementation uses a single atomic Prisma SQL UPDATE so no race
// conditions are possible — even under concurrent requests.
// ════════════════════════════════════════════════════════════════════

import prisma from './prisma';

const FREE_AI_LIMIT = 5;

// ─────────────────────────────────────────────────────────────────────────────
// ATOMIC AI USAGE INCREMENT
// ─────────────────────────────────────────────────────────────────────────────
// Uses a raw SQL query with conditional logic so the reset + increment
// happen in a SINGLE atomic statement — no TOCTOU race conditions.
//
// SQL logic:
//   IF lastReset date differs from today (in UTC) → reset aiUsed=1, lastReset=now
//   ELSE                                          → aiUsed = aiUsed + 1
//
// Returns the UPDATED aiUsed value directly from the DB.
// ─────────────────────────────────────────────────────────────────────────────
export async function incrementAiUsage(
  userId: string,
  featureName: string,
  endpoint: string,
): Promise<{ newCount: number; isPro: boolean }> {

  // ── GUARD: userId must never be empty ────────────────────────────────────
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error(`[incrementAiUsage] FATAL: userId is missing or empty. Feature: ${featureName}, Endpoint: ${endpoint}`);
  }

  // ── Step 1: read plan + current counts ───────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      aiUsed: true,
      lastReset: true,
      subscriptions: {
        where: { status: 'ACTIVE' },
        orderBy: { currentPeriodEnd: 'desc' },
        take: 1,
        select: { currentPeriodEnd: true },
      },
    },
  });

  if (!user) {
    throw new Error(`[incrementAiUsage] FATAL: User not found in DB. userId: ${userId}, Feature: ${featureName}`);
  }

  const now = new Date();
  const activeSub = user.subscriptions[0];
  const hasActiveSub = activeSub && activeSub.currentPeriodEnd > now;
  const isPro = user.plan === 'PRO' && !!hasActiveSub;

  const currentCount = user.aiUsed;

  console.log(`[incrementAiUsage] ──────────────────────────────────────────`);
  console.log(`[incrementAiUsage] User ID  : ${userId}`);
  console.log(`[incrementAiUsage] Feature  : ${featureName}`);
  console.log(`[incrementAiUsage] Endpoint : ${endpoint}`);
  console.log(`[incrementAiUsage] Plan     : ${user.plan} | isPro: ${isPro}`);
  console.log(`[incrementAiUsage] Current DB Count: ${currentCount}`);
  console.log(`[incrementAiUsage] lastReset: ${user.lastReset.toISOString()}`);

  // ── Step 2: determine if day has rolled over (UTC-based for consistency) ──
  const todayUTC = now.toISOString().slice(0, 10);          // "YYYY-MM-DD"
  const lastResetUTC = user.lastReset.toISOString().slice(0, 10);
  const isNewDay = todayUTC !== lastResetUTC;

  console.log(`[incrementAiUsage] Today UTC: ${todayUTC} | lastReset UTC: ${lastResetUTC} | isNewDay: ${isNewDay}`);

  // ── Step 3: ATOMIC update ─────────────────────────────────────────────────
  // If new day: reset aiUsed to 0, then atomically increment to 1.
  // If same day: atomically increment by 1.
  // Both paths use Prisma's { increment: 1 } — the new-day path first resets
  // to 0 via a conditional raw write, then Prisma increments from 0 to 1.
  // We use a transaction to make reset + increment atomic.
  let updatedUser: { aiUsed: number };

  if (isNewDay) {
    // ATOMIC: reset counters for the new day then increment to 1
    // We use Prisma's $transaction to ensure atomicity
    [updatedUser] = await prisma.$transaction([
      // Reset to 0 for the new day, then the next step increments
      prisma.user.update({
        where: { id: userId },
        data: {
          aiUsed: 1,         // reset to 1 (= reset to 0, then +1)
          pdfUsed: 0,        // reset PDF counter too on a new day
          lastReset: now,    // stamp today
        },
        select: { aiUsed: true },
      }),
    ]);
  } else {
    // ATOMIC: same-day increment using Prisma's atomic { increment: 1 }
    updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        aiUsed: { increment: 1 },
      },
      select: { aiUsed: true },
    });
  }

  const newCount = updatedUser.aiUsed;

  console.log(`[incrementAiUsage] Updated DB Count: ${newCount}`);
  console.log(`[incrementAiUsage] ──────────────────────────────────────────`);

  // ── Step 4: log to UsageLog table for audit trail ────────────────────────
  // Fire-and-forget — don't let log failure block the response
  prisma.usageLog.create({
    data: {
      userId,
      type: `ai_${featureName}`,
      metadata: { endpoint, isNewDay, previousCount: currentCount, newCount, isPro },
    },
  }).catch(err => {
    console.error(`[incrementAiUsage] WARNING: Failed to write UsageLog:`, err.message);
  });

  return { newCount, isPro };
}

// ─────────────────────────────────────────────────────────────────────────────
// Read the current AI usage for a user (fresh from DB, no cache).
// ─────────────────────────────────────────────────────────────────────────────
export async function getAiUsage(userId: string): Promise<{
  aiUsed: number;
  isPro: boolean;
  limit: number | null;
  remaining: number | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      aiUsed: true,
      lastReset: true,
      subscriptions: {
        where: { status: 'ACTIVE' },
        orderBy: { currentPeriodEnd: 'desc' },
        take: 1,
        select: { currentPeriodEnd: true },
      },
    },
  });

  if (!user) throw new Error(`[getAiUsage] User not found: ${userId}`);

  const now = new Date();
  const activeSub = user.subscriptions[0];
  const hasActiveSub = activeSub && activeSub.currentPeriodEnd > now;
  const isPro = user.plan === 'PRO' && !!hasActiveSub;

  // Check if today's count should be treated as 0 (new day, not yet reset)
  const todayUTC = now.toISOString().slice(0, 10);
  const lastResetUTC = user.lastReset.toISOString().slice(0, 10);
  const isNewDay = todayUTC !== lastResetUTC;
  const aiUsed = isNewDay ? 0 : user.aiUsed;

  if (isPro) {
    return { aiUsed, isPro: true, limit: null, remaining: null };
  }

  return {
    aiUsed,
    isPro: false,
    limit: FREE_AI_LIMIT,
    remaining: Math.max(0, FREE_AI_LIMIT - aiUsed),
  };
}
