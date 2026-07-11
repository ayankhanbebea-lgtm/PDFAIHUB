// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const plan = searchParams.get('plan') as 'FREE' | 'PRO' | null;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (plan) where.plan = plan;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        plan: true,
        role: true,
        banned: true,
        bannedReason: true,
        aiUsed: true,
        pdfUsed: true,
        createdAt: true,
        _count: { select: { files: true, usageLogs: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { userId, action, reason, plan } = await request.json();

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    let updateData: any = {};

    switch (action) {
      case 'ban':
        updateData = { banned: true, bannedReason: reason || 'Violated terms of service' };
        break;
      case 'unban':
        updateData = { banned: false, bannedReason: null };
        break;
      case 'setPlan':
        if (!['FREE', 'PRO'].includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        updateData = { plan };
        break;
      case 'makeAdmin':
        updateData = { role: 'ADMIN' };
        break;
      case 'removeAdmin':
        updateData = { role: 'USER' };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, plan: true, role: true, banned: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
