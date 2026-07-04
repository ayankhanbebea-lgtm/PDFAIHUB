'use client';
// src/app/page.tsx
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PricingSection } from '@/components/pricing-section';
import {
  ArrowRight, Zap, FileText, Sparkles, Brain, BookOpen, MessageSquare
} from 'lucide-react';

const pdfTools = [
  { icon: '🔗', name: 'PDF Merge', desc: 'Combine multiple PDFs into one file', href: '/tools/merge', color: 'from-blue-500 to-indigo-500' },
  { icon: '✂️', name: 'PDF Split', desc: 'Extract specific pages or split by range', href: '/tools/split', color: 'from-purple-500 to-pink-500' },
  { icon: '🗜️', name: 'PDF Compress', desc: 'Reduce file size without quality loss', href: '/tools/compress', color: 'from-green-500 to-emerald-500' },
  { icon: '📝', name: 'PDF to Word', desc: 'Convert PDF to editable DOCX format', href: '/tools/pdf-to-word', color: 'from-orange-500 to-amber-500' },
  { icon: '🖼️', name: 'Image to PDF', desc: 'Convert JPG, PNG, WEBP to PDF', href: '/tools/image-to-pdf', color: 'from-red-500 to-rose-500' },
  { icon: '🔒', name: 'PDF Protect', desc: 'Add or remove password protection', href: '/tools/protect', color: 'from-slate-500 to-gray-600' },
];

const aiFeatures = [
  { icon: Brain, name: 'AI Notes Summarizer', desc: 'Upload your notes and get short summaries, key points, and exam revision content instantly.', href: '/ai/summarize', badge: 'Most Popular' },
  { icon: MessageSquare, name: 'AI PDF Chat', desc: 'Ask any question about your document. Get accurate answers based only on the uploaded PDF.', href: '/ai/chat', badge: 'Powerful' },
  { icon: BookOpen, name: 'Flashcard Generator', desc: 'Auto-generate study flashcards from any PDF. Perfect for last-minute exam prep.', href: '/ai/flashcards', badge: 'Students Love' },
  { icon: Sparkles, name: 'AI Quiz Generator', desc: 'Create MCQ quizzes from your study material with instant scoring and explanations.', href: '/ai/quiz', badge: 'Interactive' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-dark">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient pt-24 pb-20 lg:pt-32 lg:pb-28 border-b border-gray-200 dark:border-white/5">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="section-container relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            >
              The Smartest PDF
              <br />
              Toolkit on the Web
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto"
            >
              Merge, compress, convert PDFs — then supercharge your workflow with AI summaries,
              document chat, flashcards, and auto-generated quizzes. Built for students & professionals.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/auth/register" className="btn-brand text-base px-8 py-3.5 flex items-center gap-2 justify-center">
                Start for Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/tools/merge" className="btn-ghost text-base px-8 py-3.5 flex items-center gap-2 justify-center">
                <FileText className="w-4 h-4" />
                Try PDF Tools
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-sm text-gray-500"
            >
              No credit card required • 10 AI summaries free daily • 50 PDF operations free
            </motion.p>
          </div>
        </div>
      </section>

      {/* PDF Tools Grid */}
      <section className="py-20 bg-gray-50 dark:bg-surface-dark-2">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              All the PDF Tools You Need
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Professional-grade PDF processing — fast, secure, and free to use.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pdfTools.map((tool, i) => (
              <motion.div
                key={tool.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Link href={tool.href} className="feature-card block group">
                  <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-200">
                    {tool.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{tool.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tool.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-[#10B981] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Try now <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-20 dark:bg-surface-dark">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Study Smarter with AI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Upload your notes or textbooks and let AI do the heavy lifting — summaries, flashcards, quizzes, and more.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {aiFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.href}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link href={feature.href} className="feature-card block group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center flex-shrink-0 group-hover:border-[#10B981]/40 transition-colors">
                        <Icon className="w-6 h-6 text-[#10B981]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-[#FFFFFF]">{feature.name}</h3>
                          <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full">{feature.badge}</span>
                        </div>
                        <p className="text-sm text-gray-400">{feature.desc}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* CTA */}
      <section className="py-20 bg-[#111827] border-t border-[#1F2937] relative overflow-hidden">
        <div className="section-container relative z-10 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-[#9CA3AF] mb-8 max-w-lg mx-auto">
            Join thousands of students and professionals who use PDFAI Hub every day.
          </p>
          <Link href="/auth/register" className="btn-brand inline-flex items-center gap-2">
            Start Free Today
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
