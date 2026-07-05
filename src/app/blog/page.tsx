// src/app/blog/page.tsx — Theme-aware
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PDFAI Hub Blog – Latest AI Tips, PDF Guides & Tutorials',
  description: 'Discover how AI is changing PDF workflows, read productivity guides, study tips, and PDF tutorials on the official PDFAI Hub Blog.',
};

const blogPosts = [
  {
    slug: 'how-ai-is-changing-pdf-workflows',
    title: 'How AI is Changing PDF Workflows',
    excerpt: 'Artificial Intelligence is transforming how we interact with documents. Discover how AI summarization and chat are redefining professional workflows.',
    category: 'AI & Tech',
    date: 'July 5, 2026',
    readTime: '5 min read',
  },
  {
    slug: '10-best-free-pdf-productivity-tips',
    title: '10 Best Free PDF Productivity Tips',
    excerpt: 'Learn the top hacks to edit, compress, and organize your PDF files quickly without spending a dime.',
    category: 'Productivity',
    date: 'June 28, 2026',
    readTime: '4 min read',
  },
  {
    slug: 'ai-pdf-summarization-explained',
    title: 'AI PDF Summarization Explained',
    excerpt: 'How does AI actually extract key insights from a 100-page document? A deep dive into modern LLMs and semantic search for PDFs.',
    category: 'AI & Tech',
    date: 'June 15, 2026',
    readTime: '6 min read',
  },
  {
    slug: 'best-pdf-tools-for-students',
    title: 'Best PDF Tools for Students',
    excerpt: 'From quiz generation to flashcards, here are the absolute best tools every student needs to ace their exams.',
    category: 'Study Guide',
    date: 'June 08, 2026',
    readTime: '3 min read',
  },
  {
    slug: 'compress-pdfs-without-losing-quality',
    title: 'Compress PDFs Without Losing Quality',
    excerpt: 'Struggling with large files? Learn how our compression engine shrinks documents while keeping text and images sharp.',
    category: 'PDF Hacks',
    date: 'May 29, 2026',
    readTime: '4 min read',
  },
  {
    slug: 'how-secure-is-online-pdf-processing',
    title: 'How Secure is Online PDF Processing?',
    excerpt: 'Is it safe to upload confidential agreements online? Find out how data encryption and auto-deletion protect your privacy.',
    category: 'Security',
    date: 'May 15, 2026',
    readTime: '5 min read',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-hero-gradient py-16 border-b border-border transition-colors duration-300">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="section-container relative z-10 text-center max-w-3xl mx-auto">
            <span className="text-xs bg-primary/10 text-primary px-3.5 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              Knowledge Hub
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-4 text-foreground">
              PDFAI Hub Blog
            </h1>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Latest articles, AI tips, productivity guides, and PDF tutorials to help you work smarter.
            </p>
          </div>
        </section>

        {/* Blog Post Grid */}
        <section className="py-16">
          <div className="section-container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex flex-col bg-card border border-border hover:border-primary/30 hover:shadow-card-hover rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Meta Category and Reading Time */}
                      <div className="flex items-center gap-3 text-xs mb-4">
                        <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime}
                        </span>
                      </div>

                      {/* Title */}
                      <Link href={`/blog/${post.slug}`} className="block">
                        <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-snug">
                          {post.title}
                        </h2>
                      </Link>

                      {/* Excerpt */}
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                        {post.excerpt}
                      </p>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {post.date}
                      </span>

                      <Link
                        href={`/blog/${post.slug}`}
                        className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline"
                      >
                        Read More
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
