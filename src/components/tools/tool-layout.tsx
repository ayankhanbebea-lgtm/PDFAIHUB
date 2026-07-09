'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ArrowLeft, Lock, Sparkles, AlertTriangle, Clock, Zap, ShieldOff } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { LimitModal } from '@/components/ui/limit-modal';

interface ToolLayoutProps {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
  requiresAuth?: boolean;
  isPro?: boolean;
  seoContent?: ReactNode;
  isAI?: boolean;
}

export interface ToolUsageContextType {
  usage: any;
  isLimitReached: boolean;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  isAI: boolean;
}

export const ToolUsageContext = createContext<ToolUsageContextType | null>(null);

export function useToolUsage() {
  const context = useContext(ToolUsageContext);
  return context;
}

export function ToolLayout({
  title,
  description,
  icon,
  children,
  requiresAuth = false,
  isPro = false,
  seoContent,
  isAI = false,
}: ToolLayoutProps) {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isLoggedIn = !!session;
  const isProUser = session?.user?.plan === 'PRO';

  const [usage, setUsage] = useState<any>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch usage stats with user local timezone
  const fetchUsage = () => {
    if (isLoggedIn) {
      axios.get('/api/user/usage', {
        headers: {
          'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
        .then(({ data }) => {
          setUsage(data);
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [isLoggedIn]);

  // Live countdown timer
  useEffect(() => {
    if (!usage || usage.resetInMs <= 0) return;

    let remainingMs = usage.resetInMs;
    const interval = setInterval(() => {
      remainingMs -= 1000;
      if (remainingMs <= 0) {
        clearInterval(interval);
        setCountdown('0h 0m');
        fetchUsage(); // Refresh usage stats when timer resets
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [usage]);

  const showAuthWall = requiresAuth && !isLoggedIn && !isLoading;
  const showProWall = isPro && !isProUser && !isLoading;

  // AI is LOCKED when the free limit is reached — this is a hard lock derived from the DB
  // isLimitReached is true as long as aiRemaining <= 0 (loaded from DB on every page load)
  // Closing the modal does NOT change this — only a daily reset or upgrade will clear it
  const isLimitReached =
    !isProUser &&
    usage &&
    (isAI ? usage.aiRemaining <= 0 : usage.pdfRemaining <= 0);

  // Show the informational modal once when limit is first detected
  useEffect(() => {
    if (isAI && isLimitReached) {
      setShowUpgradeModal(true);
    }
  }, [isAI, isLimitReached]);

  const showPdfLimitWall = !isAI && isLimitReached;

  // The AI locked wall is shown when AI limit is reached — it REPLACES children entirely
  const showAiLockWall = isAI && !!isLimitReached && !isLoading && isLoggedIn;

  return (
    <ToolUsageContext.Provider
      value={{
        usage,
        isLimitReached: !!isLimitReached,
        showUpgradeModal,
        setShowUpgradeModal,
        isAI,
      }}
    >
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Navbar />
        <main className="pt-16 pb-20">
          {/* Header */}
          <div className="bg-card border-b border-border transition-colors duration-300">
            <div className="section-container py-10">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-2xl flex-shrink-0 text-primary-foreground">
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
                    {isAI && (
                      <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-full font-semibold">
                        <Sparkles className="w-3 h-3" /> AI
                      </span>
                    )}
                    {isPro && (
                      <>
                        <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-1 rounded-full font-semibold">
                          <Sparkles className="w-3 h-3 text-amber-500" /> ✨ Pro Feature
                        </span>
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                          Unlimited for Pro Members
                        </span>
                      </>
                    )}
                    {!requiresAuth && !isAI && !isPro && (
                      <span className="text-xs bg-primary/15 text-primary border border-primary/25 px-2.5 py-1 rounded-full font-semibold">
                        Free Daily Limit: 50 Ops
                      </span>
                    )}
                    {isAI && isLoggedIn && (
                      <span className="flex items-center gap-1.5 text-xs bg-secondary/80 text-foreground border border-border px-3 py-1 rounded-full font-medium">
                        {isProUser ? (
                          <span className="text-primary font-semibold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-primary fill-current" />
                            Unlimited AI Access
                          </span>
                        ) : (
                          <>
                            <span>AI Requests Remaining:</span>
                            <strong className={`font-bold ${isLimitReached ? 'text-red-500' : 'text-primary'}`}>
                              {usage ? usage.aiRemaining : '...'} / 5
                            </strong>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="section-container py-10">
            {isLoading ? (
              <div className="max-w-2xl mx-auto">
                <div className="h-64 skeleton rounded-2xl" />
              </div>
            ) : showAuthWall ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto text-center py-16"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Sign In to Use AI Features
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Please sign in to use AI-powered tools.
                </p>
                <p className="text-sm text-primary mb-8">
                  Standard PDF tools can also be tracked to your profile for free.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/auth/login" className="btn-ghost px-6 py-3">Sign In</Link>
                  <Link href="/auth/register" className="btn-brand px-6 py-3">Create Free Account</Link>
                </div>
              </motion.div>
            ) : showProWall ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto text-center py-16"
              >
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">⭐ Pro Feature</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  {isPro ? 'Upgrade to Pro for unlimited access to all premium PDF tools.' : 'Upgrade to Pro for unlimited access to all AI features.'}
                </p>
                <Link href="/pricing" className="btn-brand px-8 py-3">Upgrade to Pro</Link>
              </motion.div>
            ) : showPdfLimitWall ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto text-center py-12 p-8 bg-amber-500/5 border border-amber-500/20 rounded-3xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Limit Reached</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  You've reached your free daily limit. Upgrade to Pro or wait until your quota resets.
                </p>

                {usage && usage.resetInMs > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground border border-border mb-8 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Resets in: <strong className="text-primary">{countdown || 'calculating...'}</strong></span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Link
                    href="/pricing"
                    className="w-full btn-brand py-3 text-center rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-current" /> Upgrade to Pro
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-full py-3 text-center rounded-xl border border-border hover:bg-secondary text-foreground font-medium transition-colors text-sm"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </motion.div>
            ) : showAiLockWall ? (
              /* ─── HARD AI LOCK WALL ─────────────────────────────────────────────────
                 Shown when daily AI limit is exhausted.
                 This replaces ALL children — upload areas, buttons, everything.
                 Closing the modal does NOT remove this wall.
                 Only a daily reset OR upgrade to Pro will clear it.
              ─────────────────────────────────────────────────────────────────────── */
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto text-center py-12"
              >
                {/* Lock icon */}
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center">
                    <ShieldOff className="w-12 h-12 text-red-500" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-2xl">🔒</span>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Daily AI Limit Reached
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                  You've used all <strong>5 free AI requests</strong> for today.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  All AI features are locked until your quota resets or you upgrade to Pro.
                </p>

                {/* Countdown timer */}
                {usage && usage.resetInMs > 0 && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground border border-border mb-8 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Quota resets in: <strong className="text-primary">{countdown || 'calculating...'}</strong></span>
                  </div>
                )}

                {/* CTAs */}
                <div className="flex flex-col gap-3">
                  <Link
                    href="/pricing"
                    className="w-full btn-brand py-3.5 text-center rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Zap className="w-4 h-4 fill-current" /> Upgrade to Pro — Unlimited AI
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-full py-3 text-center rounded-xl border border-border hover:bg-secondary text-foreground font-medium transition-colors text-sm"
                  >
                    Back to Dashboard
                  </Link>
                </div>

                {/* What's locked indicator */}
                <div className="mt-8 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-left">
                  <p className="text-xs font-semibold text-red-500 mb-2 uppercase tracking-wider">Locked until reset</p>
                  <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2"><span className="text-red-400">✕</span> File upload</li>
                    <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Generate / Summarize</li>
                    <li className="flex items-center gap-2"><span className="text-red-400">✕</span> Retry / Regenerate</li>
                    <li className="flex items-center gap-2"><span className="text-red-400">✕</span> All AI features on this tool</li>
                  </ul>
                </div>
              </motion.div>
            ) : (
              <div className="max-w-2xl mx-auto">{children}</div>
            )}
          </div>

          {seoContent && (
            <div className="border-t border-border mt-10">
              <div className="section-container py-16">{seoContent}</div>
            </div>
          )}
        </main>
        <Footer />

        {/* Limit Upgrade Modal for AI features — informational only, closing does NOT unlock */}
        {isAI && (
          <LimitModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            type="ai"
            resetInMs={usage ? usage.resetInMs : 0}
          />
        )}
      </div>
    </ToolUsageContext.Provider>
  );
}
