// src/app/api/payments/razorpay/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyRazorpayOrderSignature, fulfillOrder, PLAN_PRICES } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planType } = await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !planType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (planType !== 'monthly' && planType !== 'yearly') {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const isValid = verifyRazorpayOrderSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const amount = PLAN_PRICES[planType as 'monthly' | 'yearly'];
    await fulfillOrder(session.user.id, planType as 'monthly' | 'yearly', razorpayOrderId, amount, razorpayPaymentId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
