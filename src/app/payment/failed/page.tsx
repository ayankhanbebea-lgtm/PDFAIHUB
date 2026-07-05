'use client';
// src/app/payment/failed/page.tsx — Theme-aware
import Link from 'next/link';
import { XCircle, LifeBuoy } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-4">
        <div className="text-center max-w-md mx-auto bg-card border border-border rounded-3xl p-8 shadow-2xl transition-colors duration-300">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Your payment could not be processed. Please check your payment details, try again, or reach out to our team for assistance.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/pricing"
              className="w-full btn-brand py-3 flex items-center justify-center gap-2 cursor-pointer"
            >
              Try Again
            </Link>
            <Link
              href="/contact"
              className="w-full py-3 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <LifeBuoy className="w-4 h-4" /> Contact Support
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
