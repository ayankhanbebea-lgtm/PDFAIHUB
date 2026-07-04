// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { rateLimitCheck } from '@/lib/rate-limit';

const schema = z.object({
  name: z.string().min(2, 'Name too short').max(50).trim(),
  email: z.string().email('Invalid email').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { allowed } = rateLimitCheck(`register:${ip}`, 5, 60 * 60 * 1000);

  if (!allowed) {
    return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, password } = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
