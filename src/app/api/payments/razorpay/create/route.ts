// src/app/api/payments/razorpay/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createRazorpaySubscription } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { planId } = await request.json();
    const result = await createRazorpaySubscription(session.user.id, planId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Razorpay error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
