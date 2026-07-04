// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return null;
  }
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const [
    totalUsers,
    proUsers,
    totalFiles,
    newUsersToday,
    activeSubscriptions,
    usageToday,
    recentUsers,
    toolUsage,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: 'PRO' } }),
    prisma.file.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.usageLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, plan: true, createdAt: true, banned: true },
    }),
    prisma.usageLog.groupBy({
      by: ['type'],
      _count: true,
      orderBy: { _count: { type: 'desc' } },
      take: 10,
    }),
  ]);

  // Monthly revenue estimate (pro users * ₹149)
  const monthlyRevenue = proUsers * 149;

  return NextResponse.json({
    stats: {
      totalUsers,
      proUsers,
      totalFiles,
      newUsersToday,
      activeSubscriptions,
      usageToday,
      monthlyRevenue,
      freeUsers: totalUsers - proUsers,
    },
    recentUsers,
    toolUsage: toolUsage.map((t) => ({ type: t.type, count: t._count })),
  });
}
