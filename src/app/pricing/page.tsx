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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="pt-16">
        <div className="bg-hero-gradient border-b border-border py-16 text-center transition-colors duration-300">
          <h1 className="text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free. No credit card required. Upgrade anytime for unlimited access.
          </p>
        </div>
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
