// src/app/api/payments/razorpay/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleRazorpayWebhook } from '@/lib/razorpay';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const signature = request.headers.get('x-razorpay-signature') || '';

  try {
    await handleRazorpayWebhook(payload, signature);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
