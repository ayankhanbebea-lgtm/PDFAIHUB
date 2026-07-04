'use client';
// src/components/tools/tool-layout.tsx
// PDF tools: PUBLIC (no auth). AI tools: requiresAuth=true
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ArrowLeft, Lock, Sparkles, AlertTriangle, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface ToolLayoutProps {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
  requiresAuth?: boolean; // default false — PDF tools are public
  isPro?: boolean;
  seoContent?: ReactNode;
  isAI?: boolean;
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

  useEffect(() => {
    if (isLoggedIn && !isProUser) {
      axios.get('/api/user/usage')
        .then(({ data }) => {
          setUsage(data);
        })
        .catch(console.error);
    }
  }, [isLoggedIn, isProUser]);

  // Live countdown timer
  useEffect(() => {
    if (!usage || usage.resetInMs <= 0) return;

    let remainingMs = usage.resetInMs;
    const interval = setInterval(() => {
      remainingMs -= 1000;
      if (remainingMs <= 0) {
        clearInterval(interval);
        setCountdown('0h 0m');
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [usage]);

  const showAuthWall = requiresAuth && !isLoggedIn && !isLoading;
  const showProWall = isPro && !isProUser && !isLoading && isLoggedIn;

  // Usage limits check
  const isLimitReached = 
    !isProUser && 
    usage && 
    (isAI ? usage.aiRemaining <= 0 : usage.pdfRemaining <= 0);

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      <Navbar />
      <main className="pt-20 pb-20">
        {/* Header */}
        <div className="bg-[#111827] border-b border-[#1F2937]">
          <div className="section-container py-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#10B981] flex items-center justify-center text-2xl flex-shrink-0 text-white">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">{title}</h1>
                  {isAI && (
                    <span className="flex items-center gap-1 text-xs bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 px-2.5 py-1 rounded-full font-semibold">
                      <Sparkles className="w-3 h-3" /> AI
                    </span>
                  )}
                  {isPro && (
                    <span className="flex items-center gap-1 text-xs bg-[#10B981] text-white px-2.5 py-1 rounded-full font-semibold">
                      <Lock className="w-3 h-3" /> Pro
                    </span>
                  )}
                  {!requiresAuth && !isAI && (
                    <span className="text-xs bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 px-2.5 py-1 rounded-full font-semibold">
                      Free Daily Limit: 50 Ops
                    </span>
                  )}
                </div>
                <p className="text-[#9CA3AF] mt-1">{description}</p>
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
            // AI features require login
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto text-center py-16"
            >
              <div className="w-20 h-20 rounded-3xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-[#10B981]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Sign In to Use AI Features
              </h2>
              <p className="text-[#9CA3AF] mb-2">
                Please sign in to use AI-powered tools.
              </p>
              <p className="text-sm text-[#10B981] mb-8">
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
              <div className="w-20 h-20 rounded-3xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-[#10B981]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Pro Feature</h2>
              <p className="text-[#9CA3AF] mb-8">
                Upgrade to Pro for unlimited access to all AI features.
              </p>
              <Link href="/pricing" className="btn-brand px-8 py-3">Upgrade to Pro</Link>
            </motion.div>
          ) : isLimitReached ? (
            // Custom limit reached screen replacing tool content to prevent uploads
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center py-12 p-8 bg-[#161B22] border border-[#F59E0B]/20 bg-[#F59E0B]/5 rounded-3xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Limit Reached</h2>
              <p className="text-sm text-[#9CA3AF] leading-relaxed mb-6">
                You've reached your free daily limit. Upgrade to Pro or wait until your quota resets.
              </p>

              {usage && usage.resetInMs > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111827] text-white border border-[#1F2937] mb-8 text-sm">
                  <Clock className="w-4 h-4 text-[#10B981]" />
                  <span>Resets in: <strong className="text-[#10B981]">{countdown || 'calculating...'}</strong></span>
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
                  className="w-full py-3 text-center rounded-xl border border-[#374151] hover:bg-[#111827] text-white font-medium transition-colors text-sm"
                >
                  Back to Dashboard
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-2xl mx-auto">{children}</div>
          )}
        </div>

        {seoContent && (
          <div className="border-t border-[#1F2937] mt-10">
            <div className="section-container py-16">{seoContent}</div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
