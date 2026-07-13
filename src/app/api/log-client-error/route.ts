// src/app/api/log-client-error/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.error('\n==================== CLIENT-SIDE EXCEPTION LOG ====================');
    console.error('URL:', body.url);
    console.error('Message:', body.message);
    console.error('Stack:', body.stack);
    console.error('User Agent:', body.userAgent);
    console.error('==================================================================\n');

    const session = await getServerSession(authOptions);
    let userId = session?.user?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      userId = firstUser?.id;
    }

    if (userId) {
      await prisma.usageLog.create({
        data: {
          userId,
          type: 'CLIENT_ERROR',
          metadata: {
            url: body.url || '',
            message: body.message || '',
            stack: body.stack || '',
            userAgent: body.userAgent || ''
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to log client error to db:', err.message);
    return NextResponse.json({ success: false });
  }
}
