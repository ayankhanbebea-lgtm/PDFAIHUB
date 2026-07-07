// src/app/api/ai/exam/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Pro users can load old packages
  const isPro = session.user.plan === 'PRO';
  if (!isPro) {
    return NextResponse.json({ error: 'Pro plan required to load package history' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const pkg = await prisma.examPackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      return NextResponse.json({ error: 'Exam package not found' }, { status: 404 });
    }

    if (pkg.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, examPackage: pkg });
  } catch (error: any) {
    console.error('[ai-exam-single] error:', error);
    return NextResponse.json({ error: 'Failed to load exam package' }, { status: 500 });
  }
}
