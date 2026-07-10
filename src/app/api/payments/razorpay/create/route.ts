// src/app/api/payments/razorpay/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createRazorpayOrder } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 10. Log: "Contact/Payment API reached"
  console.log('[razorpay-create] API reached');

  try {
    const { planType } = await request.json();
    if (planType !== 'monthly' && planType !== 'yearly') {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    // 1. Audit key loading
    const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
    const maskedKeyId = rawKeyId
      ? `${rawKeyId.slice(0, 8)}...${rawKeyId.slice(-4)}`
      : 'NONE';
    const isLive = rawKeyId.startsWith('rzp_live');
    const isTest = rawKeyId.startsWith('rzp_test');
    const mode = isLive ? 'Live' : isTest ? 'Test' : 'Unknown';

    // 4. Log environment & credentials
    console.log('[razorpay-create] Audit Details:', {
      loadedKeyIdMasked: maskedKeyId,
      isLiveKeyLoaded: isLive,
      isTestKeyLoaded: isTest,
      mode,
      environment: process.env.NODE_ENV,
    });

    if (isLive) {
      console.warn('[razorpay-create] WARNING: Live Razorpay key detected in non-production/debug run!');
    }

    const result = await createRazorpayOrder(session.user.id, planType);

    // 4. Log Razorpay response & order details
    console.log('[razorpay-create] Razorpay Response:', result);

    return NextResponse.json({
      ...result,
      keyId: rawKeyId, // Send back so client always initializes with matching server key
      mode,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
