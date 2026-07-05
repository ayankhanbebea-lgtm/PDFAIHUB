// src/app/about/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import {
  Brain, MessageSquare, BookOpen, Sparkles, Merge, Scissors,
  FileDown, RefreshCw, Shield, Zap, CheckCircle2, ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us – PDFAI Hub',
  description: 'Learn about PDFAI Hub—our mission to simplify document workflows and make PDF editing and AI-powered document productivity accessible, secure, and fast.',
};

const features = [
  { icon: Brain, title: 'AI PDF Summarizer', desc: 'Instantly extract key insights, summaries, and core concepts from massive PDF files.' },
  { icon: MessageSquare, title: 'AI PDF Chat', desc: 'Query and converse with your documents directly to find specific details instantly.' },
  { icon: BookOpen, title: 'Flashcard Generator', desc: 'Transform textbooks and lecture slides into custom study flashcards automatically.' },
  { icon: Sparkles, title: 'Quiz Generator', desc: 'Generate multiple-choice interactive quizzes to test your understanding of any document.' },
  { icon: Merge, title: 'Merge PDFs', desc: 'Combine multiple documents, reports, or sheets into a single, clean PDF file.' },
  { icon: Scissors, title: 'Split PDFs', desc: 'Extract specific pages or break a massive document down into smaller sections.' },
  { icon: FileDown, title: 'Compress PDFs', desc: 'Shrink file size for easy email sharing while preserving original text and image quality.' },
  { icon: RefreshCw, title: 'Convert PDFs', desc: 'Seamlessly convert files to and from PDF, including Word documents and image sets.' },
  { icon: Shield, title: 'Secure Processing', desc: 'All uploaded files are encrypted in transit and auto-deleted within hours of completion.' },
  { icon: Zap, title: 'Fast Performance', desc: 'Built on a high-speed engine that parses text and edits files in milliseconds.' },
];

const timelineSteps = [
  {
    phase: 'Phase 1: Foundations',
    title: 'High-Speed PDF Utilities',
    desc: 'We started with a simple goal: build free, professional-grade PDF tools like merge, split, and compress that work entirely in the browser without requiring tedious sign-ups or payments.',
  },
  {
    phase: 'Phase 2: AI Integration',
    title: 'Interacting with Documents',
    desc: 'We integrated advanced Large Language Models to allow users to interact with their documents. Summarizing and chatting with PDFs shifted document research from manual reading to active conversations.',
  },
  {
    phase: 'Phase 3: Active Learning',
    title: 'Study Aids & Gamification',
    desc: 'Understanding that students are our primary users, we added auto-generating flashcards and MCQ quizzes with scoring systems to turn static PDFs into dynamic study tools.',
  },
  {
    phase: 'Phase 4: Privacy & Scaling',
    title: 'Zero-Trust Data Pipelines',
    desc: 'Today, we focus heavily on security. We process files through isolated pipelines, respect data privacy with strictly zero model training on user files, and automatically wipe all customer documents.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#FFFFFF]">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-hero-gradient py-20 border-b border-gray-200 dark:border-white/5">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#10B981]/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="section-container relative z-10 text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              About PDFAI Hub
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              PDFAI Hub is an all-in-one AI-powered PDF platform designed to simplify document management for students, professionals, freelancers, teachers, and businesses.
            </p>
          </div>
        </section>

        {/* Overview & Mission Section */}
        <section className="py-20">
          <div className="section-container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Our Mission</h2>
                <p className="text-gray-400 leading-relaxed text-base">
                  Our mission is to make PDF editing and AI productivity accessible, affordable, and incredibly easy for everyone. We believe nobody should have to pay expensive monthly subscriptions just to merge two files or extract summaries from their lecture notes.
                </p>
                <p className="text-gray-400 leading-relaxed text-base">
                  By pairing traditional document utilities with state-of-the-art AI technology, we help you parse, study, compress, and secure your files in a single, fast, unified web experience.
                </p>
                <div className="pt-4">
                  <Link href="/auth/register" className="btn-brand inline-flex items-center gap-2">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Mission Visual Card */}
              <div className="bg-[#161B22] border border-[#1F2937] p-8 rounded-2xl relative overflow-hidden group hover:border-[#10B981]/20 transition-colors">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#10B981]/10 rounded-full blur-[40px]" />
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="text-[#10B981] w-5 h-5" /> Why Choose Us?
                </h3>
                <ul className="space-y-4">
                  {[
                    'No registration required for basic PDF tools',
                    'Powerful AI model integrations (OpenAI & Gemini)',
                    'Secure HTTPS encryption & automatic file cleanup',
                    'Affordable, user-centric billing starting under $2/mo',
                    'Clean interface designed for maximum speed',
                  ].map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-2 flex-shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Features Showcase Grid */}
        <section className="py-20 bg-gray-50/5 dark:bg-surface-dark-2 border-y border-[#1F2937]/50">
          <div className="section-container">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">Core Platform Capabilities</h2>
              <p className="text-gray-400">
                Explore the powerful tools engineered to simplify document management and turbocharge your studying or professional work.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 bg-[#161B22] border border-[#1F2937] hover:border-[#10B981]/30 hover:shadow-card-hover rounded-2xl transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Modern Timeline section */}
        <section className="py-20">
          <div className="section-container">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-4">Our Journey & Values</h2>
              <p className="text-gray-400">
                How we built PDFAI Hub and what core values drive our decisions every single day.
              </p>
            </div>

            <div className="relative max-w-3xl mx-auto border-l-2 border-[#1F2937] pl-6 md:pl-8 space-y-12">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] md:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-[#0B0F19] border-2 border-[#10B981] shadow-[0_0_8px_#10B981]" />

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#10B981]">
                      {step.phase}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
