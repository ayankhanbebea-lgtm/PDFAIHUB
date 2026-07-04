'use client';
// src/components/pricing-section.tsx
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
        // Razorpay
        const planId = planType === 'yearly'
          ? process.env.NEXT_PUBLIC_RAZORPAY_PRO_YEARLY
          : process.env.NEXT_PUBLIC_RAZORPAY_PRO_MONTHLY;

        const { data } = await axios.post('/api/payments/razorpay/create', { planId });

        const rzpScript = document.createElement('script');
        rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(rzpScript);

        rzpScript.onload = () => {
          const rzp = new (window as any).Razorpay({
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            subscription_id: data.subscriptionId,
            name: 'PDFAI Hub',
            description: `Pro Plan - ${planType === 'yearly' ? 'Yearly' : 'Monthly'}`,
            prefill: {
              email: session.user.email,
              name: session.user.name,
            },
            theme: { color: '#4f6bff' },
            handler: () => {
              toast.success('Payment successful! Pro features unlocked.');
              window.location.href = '/dashboard?payment=success';
            },
          });
          rzp.open();
        };
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Payment failed');
    } finally {
      setLoadingPlan(null);
    }
  };

  const freeFeatures = [
    { text: '50 PDF operations per rolling 24 hours', included: true },
    { text: '10 AI requests per rolling 24 hours', included: true },
    { text: 'PDF Merge, Split, Compress', included: true },
    { text: 'Image to PDF', included: true },
    { text: 'AI PDF Chat', included: false },
    { text: 'Flashcard & Quiz Generator', included: false },
    { text: 'Priority processing', included: false },
    { text: 'Download history', included: false },
    { text: 'No ads', included: false },
  ];

  const proFeatures = [
    { text: 'Unlimited AI requests', included: true },
    { text: 'Unlimited PDF operations', included: true },
    { text: 'All PDF Tools', included: true },
    { text: 'AI PDF Chat', included: true },
    { text: 'Flashcard & Quiz Generator', included: true },
    { text: 'Priority processing', included: true },
    { text: 'Full download history', included: true },
    { text: 'No ads, ever', included: true },
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50 dark:bg-surface-dark-2">
      <div className="section-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-6">
            Start free. Upgrade when you need more power.
          </p>

          {/* Payment provider selector */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-xs text-gray-500">Pay via:</span>
            <button
              onClick={() => setProvider('razorpay')}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${provider === 'razorpay' ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}
            >
              Razorpay (India)
            </button>
            <button
              onClick={() => setProvider('stripe')}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${provider === 'stripe' ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-gray-300 dark:border-gray-700 text-gray-500'}`}
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
            className="bg-[#161B22] border border-[#1F2937] rounded-3xl p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Free Plan</h3>
              <p className="text-sm text-[#9CA3AF] mb-4">Great for casual users</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">₹0</span>
                <span className="text-[#9CA3AF] ml-1">forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {freeFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                    )}
                    <span className={f.included ? 'text-[#9CA3AF]' : 'text-[#6B7280] line-through'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/auth/register"
              className="block w-full py-3 text-center rounded-xl border border-[#374151] hover:bg-[#111827] text-white font-medium transition-colors"
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
            className="bg-[#161B22] border border-[#10B981] rounded-3xl p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                Pro Monthly <Zap className="w-4 h-4 text-[#10B981]" />
              </h3>
              <p className="text-sm text-[#9CA3AF] mb-4">For power users & students</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">₹149</span>
                <span className="text-[#9CA3AF] ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                    <span className="text-[#9CA3AF]">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={loadingPlan !== null}
              className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'monthly' ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            className="relative bg-[#161B22] border-2 border-[#10B981] rounded-3xl p-8 flex flex-col justify-between"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[#10B981] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                BEST VALUE
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1 flex items-center gap-2 text-white">
                Pro Yearly <Zap className="w-4 h-4 text-[#10B981]" />
              </h3>
              <p className="text-sm text-[#9CA3AF] mb-4">Ultimate value, maximum features</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">₹99</span>
                <span className="text-[#9CA3AF] ml-1">/month</span>
                <p className="text-xs text-[#9CA3AF] mt-1">Billed annually at ₹1188/year</p>
              </div>
              <ul className="space-y-3 mb-8">
                {proFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                    <span className="text-[#9CA3AF]">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={loadingPlan !== null}
              className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loadingPlan === 'yearly' ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {session?.user?.plan === 'PRO' ? 'Upgrade Plan' : 'Buy Yearly'}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
