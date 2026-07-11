// src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2).max(50),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = schema.parse(body);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('[DEBUG /api/user/profile] GET request received');

  let session;
  try {
    console.log('[DEBUG /api/user/profile] Calling getServerSession...');
    session = await getServerSession(authOptions);
    console.log('[DEBUG /api/user/profile] getServerSession completed successfully. Session User ID:', session?.user?.id);
  } catch (err: any) {
    console.error('[DEBUG /api/user/profile] getServerSession THREW AN ERROR:', err.message, err.stack);
    return NextResponse.json({ error: 'Auth session error: ' + err.message }, { status: 500 });
  }

  if (!session?.user?.id) {
    console.warn('[DEBUG /api/user/profile] Session unauthorized (no user.id)');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[DEBUG /api/user/profile] Querying prisma.user.findUnique for user ID:', session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, image: true,
        plan: true, role: true, createdAt: true,
        aiUsed: true, pdfUsed: true, lastReset: true,
        _count: { select: { files: true, usageLogs: true } },
      },
    });
    console.log('[DEBUG /api/user/profile] prisma query completed successfully. User details fetched:', !!user);

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('[DEBUG /api/user/profile] Database operation FAILED with error:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Failed to fetch profile' }, { status: 500 });
  }
}
