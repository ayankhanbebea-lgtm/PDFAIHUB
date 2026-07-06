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

  const now = new Date();
  const subscription = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (subscription && subscription.currentPeriodEnd < now) {
    // Subscription has expired
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { plan: 'FREE' },
      }),
    ]);
    return NextResponse.json({ subscription: null });
  }

  return NextResponse.json({ subscription });
}
