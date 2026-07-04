// src/lib/razorpay.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from './prisma';

let _razorpay: Razorpay | null = null;
export const razorpay = new Proxy({} as Razorpay, {
  get(target, prop, receiver) {
    if (!_razorpay) {
      _razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
        key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
      });
    }
    return Reflect.get(_razorpay, prop, receiver);
  }
});

export async function createRazorpaySubscription(
  userId: string,
  planId: string
): Promise<{ subscriptionId: string; orderId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, razorpayCustomerId: true },
  });

  if (!user) throw new Error('User not found');

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    total_count: 12,
    notes: {
      userId,
      userEmail: user.email,
    },
  } as any);

  return {
    subscriptionId: (subscription as any).id,
    orderId: (subscription as any).id,
  };
}

export function verifyRazorpayPayment(
  subscriptionId: string,
  paymentId: string,
  signature: string
): boolean {
  const text = `${paymentId}|${subscriptionId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(text)
    .digest('hex');

  return expectedSignature === signature;
}

export async function handleRazorpayWebhook(
  payload: Record<string, any>,
  signature: string
): Promise<void> {
  // Verify webhook signature
  const body = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new Error('Invalid webhook signature');
  }

  const event = payload.event;

  switch (event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      const sub = payload.payload.subscription.entity;
      const userId = sub.notes?.userId;
      if (!userId) break;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { plan: 'PRO' },
        }),
        prisma.subscription.upsert({
          where: { providerSubId: sub.id },
          create: {
            userId,
            plan: 'PRO',
            status: 'ACTIVE',
            provider: 'razorpay',
            providerSubId: sub.id,
            providerPlanId: sub.plan_id,
            currentPeriodStart: new Date(sub.current_start * 1000),
            currentPeriodEnd: new Date(sub.current_end * 1000),
          },
          update: {
            status: 'ACTIVE',
            currentPeriodEnd: new Date(sub.current_end * 1000),
          },
        }),
      ]);
      break;
    }

    case 'subscription.cancelled':
    case 'subscription.completed':
    case 'subscription.expired': {
      const sub = payload.payload.subscription.entity;
      const userId = sub.notes?.userId;
      if (!userId) break;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { plan: 'FREE' },
        }),
        prisma.subscription.updateMany({
          where: { providerSubId: sub.id },
          data: {
            status: event === 'subscription.cancelled' ? 'CANCELLED' : 'EXPIRED',
          },
        }),
      ]);
      break;
    }
  }
}
