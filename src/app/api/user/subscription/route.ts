// src/app/api/user/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  console.log('[DEBUG /api/user/subscription] GET request received');
  
  let session;
  try {
    console.log('[DEBUG /api/user/subscription] Calling getServerSession...');
    session = await getServerSession(authOptions);
    console.log('[DEBUG /api/user/subscription] getServerSession completed successfully. Session User ID:', session?.user?.id);
  } catch (err: any) {
    console.error('[DEBUG /api/user/subscription] getServerSession THREW AN ERROR:', err.message, err.stack);
    return NextResponse.json({ error: 'Auth session error: ' + err.message }, { status: 500 });
  }

  if (!session?.user?.id) {
    console.warn('[DEBUG /api/user/subscription] Session unauthorized (no user.id)');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    console.log('[DEBUG /api/user/subscription] Querying prisma.subscription.findFirst for user ID:', session.user.id);
    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    console.log('[DEBUG /api/user/subscription] prisma query completed successfully. Active subscription found:', !!subscription);

    if (subscription && subscription.currentPeriodEnd < now) {
      console.log('[DEBUG /api/user/subscription] Subscription has expired. Performing downgrade transaction...');
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
      console.log('[DEBUG /api/user/subscription] Downgrade transaction completed successfully');
      return NextResponse.json({ subscription: null });
    }

    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error('[DEBUG /api/user/subscription] Database operation FAILED with error:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Failed to fetch subscription' }, { status: 500 });
  }
}
