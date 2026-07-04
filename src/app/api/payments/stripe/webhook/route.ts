// src/app/api/payments/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  try {
    await handleStripeWebhook(payload, signature);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
