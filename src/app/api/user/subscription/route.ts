// src/app/api/user/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ subscription });
}
