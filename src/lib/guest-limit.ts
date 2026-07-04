// src/lib/guest-limit.ts
// Guest users: 30 PDF ops/day by IP. No login required.

const GUEST_DAILY_LIMIT = 30;

// In-memory store for development. In production use Redis or DB.
const guestStore = new Map<string, { count: number; date: string }>();

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getGuestIdentifier(request: Request): string {
  // Try to get real IP from headers
  const forwarded = (request.headers as any).get?.('x-forwarded-for') ||
    (request.headers as any)['x-forwarded-for'];
  const realIp = (request.headers as any).get?.('x-real-ip') ||
    (request.headers as any)['x-real-ip'];

  const ip = (forwarded ? forwarded.split(',')[0] : realIp) || 'unknown';
  return `guest:${ip.trim()}`;
}

export function checkGuestLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  const today = todayStr();
  const entry = guestStore.get(identifier);

  if (!entry || entry.date !== today) {
    // New day or new guest
    return { allowed: true, remaining: GUEST_DAILY_LIMIT - 1, limit: GUEST_DAILY_LIMIT };
  }

  if (entry.count >= GUEST_DAILY_LIMIT) {
    return { allowed: false, remaining: 0, limit: GUEST_DAILY_LIMIT };
  }

  return {
    allowed: true,
    remaining: GUEST_DAILY_LIMIT - entry.count - 1,
    limit: GUEST_DAILY_LIMIT,
  };
}

export function incrementGuestUsage(identifier: string): void {
  const today = todayStr();
  const entry = guestStore.get(identifier);

  if (!entry || entry.date !== today) {
    guestStore.set(identifier, { count: 1, date: today });
  } else {
    entry.count++;
  }
}

// Cleanup old entries every hour
setInterval(() => {
  const today = todayStr();
  for (const [key, value] of guestStore.entries()) {
    if (value.date !== today) guestStore.delete(key);
  }
}, 60 * 60 * 1000);
