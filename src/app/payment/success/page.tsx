'use client';
// src/app/payment/success/page.tsx — Theme-aware
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || '';

  return (
    <div className="text-center max-w-md mx-auto bg-card border border-border rounded-3xl p-8 shadow-2xl transition-colors duration-300">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-6">
        <CheckCircle className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Thank you for upgrading to Pro. Your account has been upgraded successfully, and you now have full access to all Pro features.
      </p>

      {orderId && (
        <div className="bg-secondary rounded-2xl p-4 mb-6 text-left border border-border">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Order ID</p>
          <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{orderId}</p>
        </div>
      )}

      <Link
        href="/dashboard"
        className="w-full btn-brand py-3 flex items-center justify-center gap-2 cursor-pointer"
      >
        Go to Dashboard <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-4">
        <Suspense fallback={
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying order details...</p>
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
