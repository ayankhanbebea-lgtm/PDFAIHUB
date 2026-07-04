import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken) return NextResponse.json({ error: 'Invalid reset link' }, { status: 400 });
    if (resetToken.used) return NextResponse.json({ error: 'Link already used' }, { status: 400 });
    if (new Date() > resetToken.expires) return NextResponse.json({ error: 'Link expired' }, { status: 400 });
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { email: resetToken.email }, data: { password: hashedPassword } }),
      prisma.passwordResetToken.update({ where: { token }, data: { used: true } }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
