'use client';
// src/app/dashboard/page.tsx — Theme-aware
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FileText, Zap, ArrowRight, Download,
  Brain, TrendingUp, Clock, Plus
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { formatBytes, formatRelativeTime } from '@/lib/utils';

const quickActions = [
  { name: 'Merge PDFs', href: '/tools/merge', icon: '🔗', category: 'pdf' },
  { name: 'Compress', href: '/tools/compress', icon: '🗜️', category: 'pdf' },
  { name: 'Split PDF', href: '/tools/split', icon: '✂️', category: 'pdf' },
  { name: 'Unlock PDF', href: '/tools/unlock', icon: '🔓', category: 'pdf', isPro: true },
  { name: 'Watermark', href: '/tools/watermark', icon: '📝', category: 'pdf', isPro: true },
  { name: 'Rotate PDF', href: '/tools/rotate', icon: '🔄', category: 'pdf', isPro: true },
  { name: 'Organize', href: '/tools/organize', icon: '📊', category: 'pdf', isPro: true },
  { name: 'OCR Extract', href: '/tools/ocr', icon: '🔍', category: 'pdf', isPro: true },
  { name: 'AI Summary', href: '/ai/summarize', icon: '🤖', category: 'ai' },
  { name: 'AI Chat', href: '/ai/chat', icon: '💬', category: 'ai' },
  { name: 'Flashcards', href: '/ai/flashcards', icon: '🃏', category: 'ai' },
];

const toolLabels: Record<string, string> = {
  merge: 'PDF Merge', compress: 'PDF Compress', split: 'PDF Split',
  'pdf-to-word': 'PDF to Word', 'image-to-pdf': 'Image to PDF',
  protect: 'PDF Protect', summarize: 'AI Summary',
  chat: 'AI Chat', flashcards: 'Flashcards', quiz: 'Quiz',
  unlock: 'PDF Unlock', watermark: 'PDF Watermark', rotate: 'PDF Rotate',
  organize: 'PDF Organize', ocr: 'OCR Extract',
};

const toolEmoji: Record<string, string> = {
  merge: '🔗', compress: '🗜️', split: '✂️', 'pdf-to-word': '📝',
  'image-to-pdf': '🖼️', protect: '🔒', summarize: '🤖',
  chat: '💬', flashcards: '🃏', quiz: '❓',
  unlock: '🔓', watermark: '📝', rotate: '🔄',
  organize: '📊', ocr: '🔍',
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login?redirect=/dashboard');
    }
  }, [status, router]);

  // Fetch usage stats
  useEffect(() => {
    if (status === 'authenticated') {
      axios.get('/api/user/files?limit=8')
        .then(({ data }) => setFiles(data.files || []))
        .catch(() => setFiles([]))
        .finally(() => setFilesLoading(false));

      axios.get('/api/user/usage')
        .then(({ data }) => setUsage(data))
        .catch(console.error);

      axios.get('/api/user/subscription')
        .then(({ data }) => setSubscription(data.subscription))
        .catch(console.error);
    }
  }, [status]);

  // Countdown timer
  useEffect(() => {
    if (!usage || usage.resetInMs <= 0) return;

    let remainingMs = usage.resetInMs;
    const updateTimer = () => {
      if (remainingMs <= 0) {
        setCountdown('0h 0m');
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${hours}h ${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(() => {
      remainingMs -= 1000;
      updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [usage]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground transition-colors duration-300">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const isPro = session.user.plan === 'PRO';

  // Extract usage counters
  const pdfUsed = usage?.pdfUsed ?? 0;
  const pdfLimit = isPro ? '∞' : (usage?.pdfLimit ?? 50);
  const pdfRemaining = isPro ? '∞' : (usage?.pdfRemaining ?? 50);

  const aiUsed = usage?.aiUsed ?? 0;
  const aiLimit = isPro ? '∞' : (usage?.aiLimit ?? 10);
  const aiRemaining = isPro ? '∞' : (usage?.aiRemaining ?? 10);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="section-container py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {session.user.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isPro
                ? '⚡ Pro Plan — Unlimited AI & PDF operations'
                : 'Free plan — 50 PDF operations + 10 AI requests per rolling 24 hours'}
            </p>
          </div>

          {/* Upgrade banner for free users */}
          {!isPro && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-card rounded-2xl p-5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-300"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Upgrade to Pro</p>
                  <p className="text-sm text-muted-foreground">Unlimited AI & PDF operations, priority processing</p>
                </div>
              </div>
              <Link href="/pricing" className="btn-brand py-2.5 px-5 text-sm flex items-center gap-2 whitespace-nowrap">
                Upgrade from ₹99/mo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          )}

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Card 1: Plan */}
            <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between transition-colors duration-300">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Plan</p>
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {isPro 
                  ? (subscription?.planType === 'yearly' || subscription?.providerPlanId === 'yearly' ? 'Pro Yearly' : 'Pro Monthly')
                  : 'Free'}
              </p>
              <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                {isPro ? `Status: ${subscription?.status || 'Active'}` : '₹0 / forever'}
              </span>
            </div>

            {/* Card 2: PDF Usage */}
            <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between transition-colors duration-300">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">PDF Usage</p>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {pdfUsed} / {isPro ? 'Unlimited' : pdfLimit}
              </p>
              <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                {isPro ? 'Unlimited remaining' : `${pdfRemaining} operations left`}
              </span>
            </div>

            {/* Card 3: AI Usage */}
            <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between transition-colors duration-300">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">AI Usage</p>
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {aiUsed} / {isPro ? 'Unlimited' : aiLimit}
              </p>
              <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                {isPro ? 'Unlimited remaining' : `${aiRemaining} requests left`}
              </span>
            </div>

            {/* Card 4: Next Reset / Subscription info */}
            {isPro && subscription ? (
              <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between transition-colors duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Days
                  </p>
                  <div className="text-[9px] text-muted-foreground mt-1 space-y-0.5">
                    <p>Started: {new Date(subscription.currentPeriodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p>Expires: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-5 border border-border flex flex-col justify-between transition-colors duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Resets In</p>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {countdown || 'Active'}
                </p>
                <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                  Rolling 24h timer
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action, i) => {
                // Check if this action is locked
                const isLocked = !isPro && (
                  (action as any).isPro || (usage && (
                    action.category === 'ai' ? usage.aiRemaining <= 0 : usage.pdfRemaining <= 0
                  ))
                );

                return (
                  <motion.div
                    key={action.href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {isLocked ? (
                      <div
                        className="glass rounded-2xl p-4 flex flex-col items-center gap-2 text-center border border-amber-500/20 bg-amber-500/5 opacity-75 cursor-not-allowed relative group"
                        title="Free quota reached. Upgrade or wait for reset."
                      >
                        <span className="text-2xl">🔒</span>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground line-through">{action.name}</p>
                          <p className="text-[9px] text-amber-500 font-semibold mt-0.5">Quota Limit</p>
                        </div>
                      </div>
                    ) : (
                      <Link
                        href={action.href}
                        className="bg-card rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-card-hover hover:-translate-y-0.5 transition-all border border-border hover:border-primary/20 group"
                      >
                        <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">{action.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{action.category.toUpperCase()}</p>
                        </div>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Recent Files */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Recent Files
              </h2>
              <Link href="/dashboard/files" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {filesLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 skeleton rounded-xl" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="bg-card rounded-2xl p-12 text-center border border-border transition-colors duration-300">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-gray-900 dark:text-white font-medium mb-1">No files yet</p>
                <p className="text-sm text-muted-foreground mb-4">Start with any tool above</p>
                <Link href="/tools/merge" className="btn-brand text-sm py-2 px-4 inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Process First File
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 hover:border-primary/20 transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                      {toolEmoji[file.tool] || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.originalName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {toolLabels[file.tool] || file.tool} • {formatBytes(file.size)} • {formatRelativeTime(file.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full hidden sm:block bg-primary/10 text-primary`}>
                        {file.status === 'COMPLETED' ? '✓' : file.status}
                      </span>
                      {file.resultUrl && (
                        <a
                          href={file.resultUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
