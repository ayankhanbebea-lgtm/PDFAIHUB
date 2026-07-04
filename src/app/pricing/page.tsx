// src/app/pricing/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PricingSection } from '@/components/pricing-section';

export const metadata: Metadata = {
  title: 'Pricing – PDFAI Hub',
  description: 'Simple pricing for everyone. Free plan with daily limits. Pro plan with unlimited access starting at ₹99/month.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-dark">
      <Navbar />
      <main className="pt-20">
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-surface-dark-2 dark:to-surface-dark py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Start free. No credit card required. Upgrade anytime for unlimited access.
          </p>
        </div>
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
