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

    console.log('>>> [PRODUCTION AUDIT] RAZORPAY KEY ID IN USE:', maskedKeyId);
    console.log('>>> [PRODUCTION AUDIT] DETECTED MODE:', mode);
    console.log('>>> [PRODUCTION AUDIT] NODE ENVIRONMENT:', process.env.NODE_ENV);

    if (isLive) {
      console.warn('>>> [PRODUCTION AUDIT] WARNING: LIVE mode enabled for this order creation.');
    } else {
      console.warn('>>> [PRODUCTION AUDIT] WARNING: TEST mode enabled. Live keys are NOT in use!');
    }

    const result = await createRazorpayOrder(session.user.id, planType);

    console.log('>>> [PRODUCTION AUDIT] RAZORPAY ORDER RESPONSE:', JSON.stringify(result, null, 2));
    console.log('>>> [PRODUCTION AUDIT] ORDER ID GENERATED:', result.orderId);

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
