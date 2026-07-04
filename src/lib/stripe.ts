// src/lib/stripe.ts
import Stripe from 'stripe';
import prisma from './prisma';

let _stripe: Stripe | null = null;
export const stripe = new Proxy({} as Stripe, {
  get(target, prop, receiver) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
        apiVersion: '2025-02-24.acacia' as any,
        typescript: true,
      });
    }
    return Reflect.get(_stripe, prop, receiver);
  }
});

export async function createStripeCustomer(userId: string, email: string, name?: string) {
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer;
}

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  interval: 'month' | 'year'
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, stripeCustomerId: true },
  });

  if (!user) throw new Error('User not found');

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripeCustomer(userId, user.email, user.name || undefined);
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=cancelled`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return session.url!;
}

export async function createPortalSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) throw new Error('No Stripe customer');

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return session.url;
}

export async function handleStripeWebhook(payload: string, signature: string): Promise<void> {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(session.subscription as string);

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
            provider: 'stripe',
            providerSubId: sub.id,
            providerPlanId: sub.items.data[0].price.id,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
          update: {
            status: 'ACTIVE',
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        }),
      ]);
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const isActive = sub.status === 'active';
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { plan: isActive ? 'PRO' : 'FREE' },
        }),
        prisma.subscription.updateMany({
          where: { providerSubId: sub.id },
          data: {
            status: isActive ? 'ACTIVE' : sub.status === 'canceled' ? 'CANCELLED' : 'EXPIRED',
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        }),
      ]);
      break;
    }
  }
}
