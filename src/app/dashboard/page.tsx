'use client';
// src/app/dashboard/page.tsx
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FileText, Zap, ArrowRight, Download,
  Brain, TrendingUp, Clock, Plus, Lock, HelpCircle
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { formatBytes, formatRelativeTime } from '@/lib/utils';

const quickActions = [
  { name: 'Merge PDFs', href: '/tools/merge', icon: '🔗', category: 'pdf' },
  { name: 'Compress', href: '/tools/compress', icon: '🗜️', category: 'pdf' },
  { name: 'Split PDF', href: '/tools/split', icon: '✂️', category: 'pdf' },
  { name: 'AI Summary', href: '/ai/summarize', icon: '🤖', category: 'ai' },
  { name: 'AI Chat', href: '/ai/chat', icon: '💬', category: 'ai' },
  { name: 'Flashcards', href: '/ai/flashcards', icon: '🃏', category: 'ai' },
];

const toolLabels: Record<string, string> = {
  merge: 'PDF Merge', compress: 'PDF Compress', split: 'PDF Split',
  'pdf-to-word': 'PDF to Word', 'image-to-pdf': 'Image to PDF',
  protect: 'PDF Protect', summarize: 'AI Summary',
  chat: 'AI Chat', flashcards: 'Flashcards', quiz: 'Quiz',
};

const toolEmoji: Record<string, string> = {
  merge: '🔗', compress: '🗜️', split: '✂️', 'pdf-to-word': '📝',
  'image-to-pdf': '🖼️', protect: '🔒', summarize: '🤖',
  chat: '💬', flashcards: '🃏', quiz: '❓',
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-surface-dark">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-gray-50 dark:bg-surface-dark">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="section-container py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {session.user.name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
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
              className="mb-6 bg-[#161B22] rounded-2xl p-5 border border-[#10B981]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-[#10B981] flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Upgrade to Pro</p>
                  <p className="text-sm text-[#9CA3AF]">Unlimited AI & PDF operations, priority processing</p>
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
            <div className="bg-[#161B22] rounded-2xl p-5 border border-[#1F2937] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#9CA3AF]">Plan</p>
                <Zap className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-xl font-bold text-white">{isPro ? '⚡ Pro' : 'Free'}</p>
              {!isPro && <span className="text-[10px] text-[#6B7280] mt-1">₹0 / forever</span>}
            </div>

            {/* Card 2: PDF Usage */}
            <div className="bg-[#161B22] rounded-2xl p-5 border border-[#1F2937] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#9CA3AF]">PDF Usage</p>
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-xl font-bold text-white">{pdfUsed} / {pdfLimit}</p>
              <span className="text-[10px] text-[#6B7280] mt-1">{isPro ? 'Unlimited remaining' : `${pdfRemaining} operations left`}</span>
            </div>

            {/* Card 3: AI Usage */}
            <div className="bg-[#161B22] rounded-2xl p-5 border border-[#1F2937] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#9CA3AF]">AI Usage</p>
                <Brain className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-xl font-bold text-white">{aiUsed} / {aiLimit}</p>
              <span className="text-[10px] text-[#6B7280] mt-1">{isPro ? 'Unlimited remaining' : `${aiRemaining} requests left`}</span>
            </div>

            {/* Card 4: Next Reset */}
            <div className="bg-[#161B22] rounded-2xl p-5 border border-[#1F2937] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#9CA3AF]">Resets In</p>
                <Clock className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-xl font-bold text-white">{isPro ? 'Never' : (countdown || 'Active')}</p>
              <span className="text-[10px] text-[#6B7280] mt-1">{isPro ? 'No limits apply' : 'Rolling 24h timer'}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action, i) => {
                // Check if this action is locked
                const isLocked = !isPro && usage && (
                  action.category === 'ai' ? usage.aiRemaining <= 0 : usage.pdfRemaining <= 0
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
                          <p className="text-xs font-medium text-gray-400 line-through">{action.name}</p>
                          <p className="text-[9px] text-amber-500 font-semibold mt-0.5">Quota Limit</p>
                        </div>
                      </div>
                    ) : (
                      <Link
                        href={action.href}
                        className="bg-[#161B22] rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-card-hover hover:-translate-y-0.5 transition-all border border-[#1F2937] hover:border-[#10B981]/20 group"
                      >
                        <span className="text-2xl group-hover:scale-110 transition-transform">{action.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-white">{action.name}</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{action.category.toUpperCase()}</p>
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
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#9CA3AF]" />
                Recent Files
              </h2>
              <Link href="/dashboard/files" className="text-sm text-[#10B981] hover:text-[#059669] flex items-center gap-1 transition-colors">
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
              <div className="bg-[#161B22] rounded-2xl p-12 text-center border border-[#1F2937]">
                <FileText className="w-12 h-12 text-[#6B7280] mx-auto mb-3" />
                <p className="text-white font-medium mb-1">No files yet</p>
                <p className="text-sm text-[#9CA3AF] mb-4">Start with any tool above</p>
                <Link href="/tools/merge" className="btn-brand text-sm py-2 px-4 inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Process First File
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-[#161B22] rounded-xl p-4 border border-[#1F2937] flex items-center gap-4 hover:border-[#10B981]/20 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-xl flex-shrink-0">
                      {toolEmoji[file.tool] || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{file.originalName}</p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {toolLabels[file.tool] || file.tool} • {formatBytes(file.size)} • {formatRelativeTime(file.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full hidden sm:block bg-[#10B981]/10 text-[#10B981]`}>
                        {file.status === 'COMPLETED' ? '✓' : file.status}
                      </span>
                      {file.resultUrl && (
                        <a
                          href={file.resultUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#10B981]/10 text-gray-400 hover:text-[#10B981] transition-all"
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
