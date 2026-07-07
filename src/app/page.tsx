'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PricingSection } from '@/components/pricing-section';
import { ArrowRight } from 'lucide-react';const freePdfTools = [
  { icon: '🔗', name: 'PDF Merge', desc: 'Combine multiple PDFs into one file', href: '/tools/merge', color: 'from-blue-500 to-indigo-500' },
  { icon: '✂️', name: 'PDF Split', desc: 'Extract specific pages or split by range', href: '/tools/split', color: 'from-purple-500 to-pink-500' },
  { icon: '🗜️', name: 'PDF Compress', desc: 'Reduce file size without quality loss', href: '/tools/compress', color: 'from-green-500 to-emerald-500' },
  { icon: '📝', name: 'PDF to Word', desc: 'Convert PDF to editable DOCX format', href: '/tools/pdf-to-word', color: 'from-orange-500 to-amber-500' },
  { icon: '🖼️', name: 'Image to PDF', desc: 'Convert JPG, PNG, WEBP to PDF', href: '/tools/image-to-pdf', color: 'from-red-500 to-rose-500' },
  { icon: '🔒', name: 'PDF Protect', desc: 'Add password security to your document', href: '/tools/protect', color: 'from-slate-500 to-gray-600' },
  { icon: '🖼️', name: 'JPG to PDF', desc: 'Convert JPG/JPEG images to PDF', href: '/tools/jpg-to-pdf', color: 'from-orange-500 to-rose-500' },
  { icon: '📝', name: 'Word to PDF', desc: 'Convert DOCX and DOC files to PDF', href: '/tools/word-to-pdf', color: 'from-blue-600 to-sky-500' },
  { icon: '📊', name: 'PowerPoint to PDF', desc: 'Convert PPTX and PPT slides to PDF', href: '/tools/powerpoint-to-pdf', color: 'from-red-600 to-orange-500' },
  { icon: '📈', name: 'Excel to PDF', desc: 'Convert Excel spreadsheets to PDF', href: '/tools/excel-to-pdf', color: 'from-green-600 to-emerald-500' },
  { icon: '🌐', name: 'HTML to PDF', desc: 'Convert web pages/HTML files to PDF', href: '/tools/html-to-pdf', color: 'from-purple-600 to-indigo-500' },
  { icon: '🖼️', name: 'PDF to JPG', desc: 'Convert PDF pages into high-quality JPGs', href: '/tools/pdf-to-jpg', color: 'from-rose-500 to-pink-500' },
  { icon: '📊', name: 'PDF to PowerPoint', desc: 'Convert PDF slides to PPTX presentation', href: '/tools/pdf-to-powerpoint', color: 'from-orange-600 to-red-500' },
  { icon: '📈', name: 'PDF to Excel', desc: 'Extract PDF data to Excel spreadsheets', href: '/tools/pdf-to-excel', color: 'from-emerald-500 to-teal-500' },
  { icon: '🏛️', name: 'PDF to PDF/A', desc: 'Convert PDF to PDF/A ISO archive standard', href: '/tools/pdf-to-pdfa', color: 'from-gray-500 to-slate-700' },
];

const proPdfTools = [
  { icon: '🔓', name: 'Unlock PDF', desc: 'Remove password security and encryption', href: '/tools/unlock', color: 'from-cyan-500 to-blue-500', isPro: true },
  { icon: '📝', name: 'Watermark PDF', desc: 'Add text or image watermark overlays to pages', href: '/tools/watermark', color: 'from-amber-500 to-red-500', isPro: true },
  { icon: '🔄', name: 'Rotate PDF', desc: 'Rotate specific or all PDF pages easily', href: '/tools/rotate', color: 'from-pink-500 to-indigo-500', isPro: true },
  { icon: '📊', name: 'Organize PDF', desc: 'Reorder, duplicate, rotate, or delete pages', href: '/tools/organize', color: 'from-violet-500 to-purple-500', isPro: true },
  { icon: '🔍', name: 'OCR Text Extractor', desc: 'Extract plain text from scanned PDFs & images', href: '/tools/ocr', color: 'from-emerald-500 to-teal-500', isPro: true },
];
export default function HomePage() {
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthenticated = mounted && status === 'authenticated';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient pt-24 pb-20 lg:pt-32 lg:pb-28 border-b border-border">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="section-container relative">
          <div className="max-w-3xl mx-auto text-center">

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-none"
            >
              Master Your Studies with <span className="gradient-text">AI & PDF Tools</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Convert, merge, split, and compress PDFs. Chat with your documents, generate revision notes, flashcards, and interactive practice tests instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {isAuthenticated ? (
                <Link href="/tools/merge" className="btn-brand text-base px-8 py-3.5 flex items-center gap-2 justify-center shadow-lg hover:shadow-xl transition-all duration-300">
                  Explore PDF Tools <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link href="/pricing" className="btn-brand text-base px-8 py-3.5 flex items-center gap-2 justify-center shadow-lg hover:shadow-xl transition-all duration-300">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/tools/merge" className="btn-ghost text-base px-8 py-3.5 flex items-center gap-2 justify-center">
                    Explore PDF Tools
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Free PDF Tools */}
      <section className="py-20 bg-secondary/30">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Free PDF Tools
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Professional-grade PDF processing — fast, secure, and completely free to use.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {freePdfTools.map((tool, i) => (
              <motion.div
                key={tool.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
              >
                <Link href={tool.href} className="feature-card block group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200">
                      {tool.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground">{tool.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Try now <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro PDF Tools */}
      <section className="py-20 bg-gradient-to-b from-secondary/15 to-transparent border-t border-border/40">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
              ⭐ Pro PDF Tools
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-medium">
              Unlock advanced document manipulation with our premium Pro-only toolset.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {proPdfTools.map((tool, i) => (
              <motion.div
                key={tool.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
              >
                <Link href={tool.href} className="feature-card block group border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200">
                      {tool.icon}
                    </div>
                    <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                      PRO ONLY
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{tool.name}</h3>
                  <p className="text-sm text-muted-foreground">{tool.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-amber-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Try now <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Pricing */}
      <PricingSection />

      {/* CTA */}
      <section className="py-20 bg-card border-t border-border relative overflow-hidden transition-colors duration-300">
        <div className="section-container relative z-10 text-center">
          {isAuthenticated ? (
            <>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Back to Dashboard
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Students and professionals use PDFAI Hub every day.
              </p>
              <Link href="/dashboard" className="btn-brand inline-flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of students and professionals who use PDFAI Hub every day.
              </p>
              <Link href="/auth/register" className="btn-brand inline-flex items-center gap-2">
                Start Free Today
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
