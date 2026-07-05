'use client';
// src/app/dashboard/billing/page.tsx — Theme-aware
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CreditCard, Zap, CheckCircle, ExternalLink, Calendar } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { formatDate } from '@/lib/utils';

export default function BillingPage() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (session) {
      axios.get('/api/user/subscription')
        .then(({ data }) => setSubscription(data.subscription))
        .catch(console.error);

      axios.get('/api/user/usage')
        .then(({ data }) => setUsage(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [session]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await axios.post('/api/payments/stripe/portal');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error('Could not open billing portal');
      setPortalLoading(false);
    }
  };

  if (!session) return null;
  const isPro = session.user.plan === 'PRO';

  // Extract usage counters
  const pdfUsed = usage?.pdfUsed ?? 0;
  const pdfLimit = isPro ? Infinity : (usage?.pdfLimit ?? 50);

  const aiUsed = usage?.aiUsed ?? 0;
  const aiLimit = isPro ? Infinity : (usage?.aiLimit ?? 10);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="pt-20">
        <div className="section-container py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Billing & Subscription</h1>

          {/* Current plan */}
          <div className={`rounded-2xl p-6 border mb-6 transition-colors duration-300 ${
            isPro
              ? 'bg-card border-primary/30'
              : 'bg-card border-border'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-5 h-5 ${isPro ? 'text-primary' : 'text-muted-foreground'}`} />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isPro ? 'Pro Plan' : 'Free Plan'}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPro ? 'Unlimited AI & PDF operations' : '50 PDF operations + 10 AI requests per rolling 24 hours'}
                </p>
                {subscription && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {subscription.cancelAtPeriodEnd
                        ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                        : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}
                    </span>
                  </div>
                )}
              </div>
              {isPro ? (
                <span className="bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full">Active</span>
              ) : (
                <Link href="/pricing" className="btn-brand text-sm py-2 px-4 cursor-pointer">
                  Upgrade
                </Link>
              )}
            </div>
          </div>

          {/* Usage stats */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 transition-colors duration-300">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Live Usage</h3>
            <div className="space-y-4">
              {[
                { label: 'AI Requests', used: aiUsed, limit: aiLimit },
                { label: 'PDF Operations', used: pdfUsed, limit: pdfLimit },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-muted-foreground">
                      {item.used} / {item.limit === Infinity ? '∞' : item.limit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: item.limit === Infinity ? '10%' : `${Math.min((item.used / item.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manage subscription (Stripe users) */}
          {isPro && subscription?.provider === 'stripe' && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 transition-colors duration-300">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Manage Subscription</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update payment method, download invoices, switch plans or cancel your subscription.
              </p>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors text-sm cursor-pointer"
              >
                {portalLoading ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Open Billing Portal
              </button>
            </div>
          )}

          {/* Payment history placeholder */}
          <div className="bg-card border border-border rounded-2xl p-6 transition-colors duration-300">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment History</h3>
            {!isPro ? (
              <div className="text-center py-8">
                <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No payments yet.</p>
                <Link href="/pricing" className="text-sm text-primary hover:text-primary/80 mt-2 inline-block cursor-pointer">
                  Upgrade to Pro starting at ₹99/mo →
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl transition-colors">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Pro Subscription Active</p>
                  <p className="text-xs text-muted-foreground">View and manage full billing options in the portal</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
