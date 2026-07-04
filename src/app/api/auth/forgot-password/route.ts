import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { rateLimitCheck } from '@/lib/rate-limit';
import crypto from 'crypto';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { allowed } = rateLimitCheck(`forgot:${ip}`, 3, 15 * 60 * 1000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const body = await request.json();
    const { email } = schema.parse(body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.password) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.passwordResetToken.deleteMany({ where: { email } });
      await prisma.passwordResetToken.create({ data: { email, token, expires } });
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔗 Reset link for ${email}:\n${resetUrl}\n`);
      }
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
