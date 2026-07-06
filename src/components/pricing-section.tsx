'use client';
// src/components/pricing-section.tsx — Theme-aware
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Check, Zap, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

export function PricingSection() {
  const { data: session } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [provider, setProvider] = useState<'stripe' | 'razorpay'>('razorpay');

  const handleUpgrade = async (planType: 'monthly' | 'yearly') => {
    if (!session) {
      window.location.href = `/auth/register?redirect=/pricing`;
      return;
    }
    if (session.user.plan === 'PRO') {
      toast.success('You are already on Pro!');
      return;
    }

    setLoadingPlan(planType);
    try {
      if (provider === 'stripe') {
        const priceId = planType === 'yearly'
          ? process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY
          : process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY;

        const { data } = await axios.post('/api/payments/stripe/checkout', {
          priceId,
          interval: planType === 'yearly' ? 'year' : 'month',
        });
        window.location.href = data.url;
      } else {
        // Razorpay (One-Time Order)
        const { data } = await axios.post('/api/payments/razorpay/create', { planType });

        const rzpScript = document.createElement('script');
        rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(rzpScript);

        rzpScript.onload = () => {
          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: data.amount,
            currency: data.currency || 'INR',
            order_id: data.orderId,
            name: 'PDFAI Hub',
            description: `Pro Plan - ${planType === 'yearly' ? 'Yearly' : 'Monthly'}`,
            prefill: {
              email: session?.user?.email || '',
              name: session?.user?.name || '',
            },
            theme: { color: '#10B981' }, // Primary brand green
            handler: async function (response: any) {
              setLoadingPlan(planType);
              try {
                const verifyRes = await axios.post('/api/payments/razorpay/verify', {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  planType,
                });

                if (verifyRes.data.success) {
                  toast.success('Payment verified successfully!');
                  window.location.href = `/payment/success?orderId=${response.razorpay_order_id}`;
                } else {
                  window.location.href = '/payment/failed';
                }
              } catch (verifyErr: any) {
                console.error('Payment verification failed:', verifyErr);
                toast.error(verifyErr.response?.data?.error || 'Payment verification failed');
                window.location.href = '/payment/failed';
              } finally {
                setLoadingPlan(null);
              }
            },
            modal: {
              ondismiss: function () {
                setLoadingPlan(null);
              }
            }
          };

          console.log('[Razorpay Checkout initialized] Options object details:', {
            key: options.key,
            amount: options.amount,
            currency: options.currency,
            order_id: options.order_id,
            planType,
            prefill: options.prefill
          });

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Upgrade failed. Please contact support.');
      setLoadingPlan(null);
    }
  };

  const freeFeatures = [
    { text: '50 PDF operations daily', included: true },
    { text: '10 AI Notes Summaries daily', included: true },
    { text: 'All standard PDF Tools', included: true },
    { text: 'Flashcard Generator', included: false },
    { text: 'Interactive Quiz Generator', included: false },
    { text: 'Priority processing', included: false },
    { text: 'Full download history', included: false },
  ];

  const proFeatures = [
    { text: 'Unlimited PDF operations', included: true },
    { text: 'All PDF Tools', included: true },
    { text: 'AI PDF Chat', included: true },
    { text: 'Flashcard & Quiz Generator', included: true },
    { text: 'Priority processing', included: true },
    { text: 'Full download history', included: true },
    { text: 'No ads, ever', included: true },
  ];

  return (
    <section id="pricing" className="py-20 bg-secondary/30 transition-colors duration-300">
      <div className="section-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Start free. Upgrade when you need more power.
          </p>

          {/* Payment provider selector */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground">Pay via:</span>
            <button
              onClick={() => setProvider('razorpay')}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${provider === 'razorpay' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Razorpay (India)
            </button>
            <button
              onClick={() => setProvider('stripe')}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${provider === 'stripe' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              Stripe (Global)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Card 1: Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-3xl p-8 flex flex-col justify-between transition-colors duration-300"
          >
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">Free Plan</h3>
              <p className="text-sm text-muted-foreground mb-4">Great for casual users</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">₹0</span>
                <span className="text-muted-foreground ml-1">forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {freeFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className={f.included ? 'text-muted-foreground' : 'text-muted-foreground/40 line-through'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/auth/register"
              className="block w-full py-3 text-center rounded-xl border border-border hover:bg-secondary text-foreground font-medium transition-colors"
            >
              Get Started Free
            </Link>
          </motion.div>

          {/* Card 2: Pro Monthly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-card border border-primary rounded-3xl p-8 flex flex-col justify-between transition-colors duration-300"
          >
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                Pro Monthly <Zap className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-sm text-muted-foreground mb-4">For power users & students</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">₹149</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={loadingPlan !== null}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlan === 'monthly' ? (
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : null}
              {session?.user?.plan === 'PRO' ? 'Upgrade Plan' : 'Buy Monthly'}
            </button>
          </motion.div>

          {/* Card 3: Pro Yearly (Billed annually) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="relative bg-card border-2 border-primary rounded-3xl p-8 flex flex-col justify-between transition-colors duration-300"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                BEST VALUE
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-foreground">
                Pro Yearly <Zap className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Ultimate value, maximum features</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">₹99</span>
                <span className="text-muted-foreground ml-1">/month</span>
                <p className="text-xs text-muted-foreground mt-1">Billed annually at ₹1188/year</p>
              </div>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={loadingPlan !== null}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadingPlan === 'yearly' ? (
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : null}
              {session?.user?.plan === 'PRO' ? 'Upgrade Plan' : 'Buy Yearly'}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
