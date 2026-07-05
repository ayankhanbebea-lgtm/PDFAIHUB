// src/app/api/payments/razorpay/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleRazorpayWebhook, verifyRazorpayWebhookSignature } from '@/lib/razorpay';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Invalid Razorpay Webhook signature received');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    await handleRazorpayWebhook(payload);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
