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

// Price amounts in paise (1 INR = 100 paise)
export const PLAN_PRICES = {
  monthly: 14900, // ₹149
  yearly: 118800, // ₹1188 (₹99 * 12)
};

export async function createRazorpayOrder(
  userId: string,
  planType: 'monthly' | 'yearly'
): Promise<{ orderId: string; amount: number; currency: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) throw new Error('User not found');

  const amount = PLAN_PRICES[planType];
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `rcpt_${userId.slice(-10)}_${Date.now().toString().slice(-8)}`,
    notes: {
      userId,
      userEmail: user.email,
      planType,
    },
  });

  return {
    orderId: order.id,
    amount: order.amount as number,
    currency: order.currency as string,
  };
}

export function verifyRazorpayOrderSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const text = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(text)
    .digest('hex');

  return expectedSignature === signature;
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set');
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
}

export async function fulfillOrder(
  userId: string,
  planType: 'monthly' | 'yearly',
  providerOrderId: string,
  amount: number,
  paymentId?: string
): Promise<void> {
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();

  if (planType === 'yearly') {
    // Check if user has active monthly subscription
    const activeMonthly = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [
          { providerPlanId: 'monthly' },
          { planType: 'monthly' }
        ]
      },
    });

    if (activeMonthly) {
      // Deactivate the old monthly subscription
      await prisma.subscription.update({
        where: { id: activeMonthly.id },
        data: { status: 'CANCELLED' },
      });
      // Upgrade logic: extend by 13 months (395 days)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 13);
    } else {
      // Standard 12 months (365 days)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 12);
    }
  } else {
    // Standard 1 month (30 days)
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { plan: 'PRO' },
    }),
    prisma.subscription.upsert({
      where: { providerSubId: providerOrderId },
      create: {
        userId,
        plan: 'PRO',
        status: 'ACTIVE',
        provider: 'razorpay',
        providerSubId: providerOrderId,
        providerPlanId: planType,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: true,
        // Audit columns
        planType,
        startDate: currentPeriodStart,
        expiryDate: currentPeriodEnd,
        nextBillingDate: currentPeriodEnd,
        orderId: providerOrderId,
        paymentId: paymentId || null,
      },
      update: {
        status: 'ACTIVE',
        currentPeriodEnd,
        expiryDate: currentPeriodEnd,
        paymentId: paymentId || null,
      },
    }),
    // Also save transaction log
    prisma.usageLog.create({
      data: {
        userId,
        type: 'PAYMENT_SUCCESS',
        metadata: {
          orderId: providerOrderId,
          paymentId: paymentId || null,
          planType,
          amount,
        },
      },
    }),
  ]);
}

export async function handleRazorpayWebhook(
  payload: Record<string, any>
): Promise<void> {
  const event = payload.event;

  // For orders api, handle order.paid or payment.captured
  if (event === 'order.paid' || event === 'payment.captured') {
    const orderEntity = event === 'order.paid' 
      ? payload.payload.order.entity 
      : payload.payload.payment.entity;

    const orderNotes = orderEntity.notes || {};
    const userId = orderNotes.userId;
    const planType = orderNotes.planType as 'monthly' | 'yearly';
    const orderId = event === 'order.paid' ? orderEntity.id : orderEntity.order_id;
    const amount = orderEntity.amount;
    const paymentId = event === 'payment.captured' 
      ? orderEntity.id 
      : (payload.payload.payment?.entity?.id || undefined);

    if (userId && planType && orderId) {
      await fulfillOrder(userId, planType, orderId, amount, paymentId);
    }
  }
}
