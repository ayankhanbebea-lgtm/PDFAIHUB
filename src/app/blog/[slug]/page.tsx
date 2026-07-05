// src/app/blog/[slug]/page.tsx — Theme-aware
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { blogArticles } from '@/lib/blog-data';
import { ChevronLeft, Calendar, Clock, ArrowRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(blogArticles).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = blogArticles[slug];
  if (!article) {
    return {
      title: 'Article Not Found – PDFAI Hub',
    };
  }

  return {
    title: `${article.title} – PDFAI Hub Blog`,
    description: article.excerpt,
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = blogArticles[slug];

  if (!article) {
    notFound();
  }

  // Get related articles (up to 2 articles excluding the current one)
  const relatedArticles = Object.values(blogArticles)
    .filter((item) => item.slug !== slug)
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="section-container max-w-6xl mx-auto px-4">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mb-8 group"
          >
            <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
            Back to Blog
          </Link>

          {/* Article Header */}
          <header className="mb-12">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              {article.category}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-4 mb-6 leading-tight text-foreground">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-border pb-8">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {article.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {article.readTime}
              </span>
            </div>
          </header>

          {/* 2-Column Article Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Article Text */}
            <article className="lg:col-span-8 space-y-6">
              {/* Introduction */}
              <p className="text-lg text-muted-foreground leading-relaxed font-normal mb-8">
                {article.introduction}
              </p>

              {/* Sections */}
              {article.sections.map((sec) => (
                <section key={sec.headingId} className="space-y-4">
                  <h2
                    id={sec.headingId}
                    className="text-2xl font-bold text-foreground mt-10 mb-4 scroll-mt-24 border-l-4 border-primary pl-4"
                  >
                    {sec.headingText}
                  </h2>
                  {sec.paragraphs.map((para, pIdx) => (
                    <p key={pIdx} className="text-muted-foreground leading-relaxed mb-6 text-base">
                      {para}
                    </p>
                  ))}
                </section>
              ))}

              {/* Conclusion Box */}
              <div className="mt-12 p-6 bg-card border border-border rounded-2xl relative overflow-hidden transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                <h3 className="text-lg font-bold text-foreground mb-3">Conclusion</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {article.conclusion}
                </p>
              </div>
            </article>

            {/* Right Column: Sidebar */}
            <aside className="lg:col-span-4 space-y-8 sticky top-24">
              {/* Table of Contents */}
              <div className="bg-card border border-border p-6 rounded-2xl transition-colors duration-300">
                <h3 className="text-base font-bold text-foreground mb-4 border-b border-border pb-2">
                  Table of Contents
                </h3>
                <nav className="space-y-3">
                  {article.sections.map((sec) => (
                    <a
                      key={sec.headingId}
                      href={`#${sec.headingId}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors leading-snug"
                    >
                      {sec.headingText}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Related Articles */}
              <div className="bg-card border border-border p-6 rounded-2xl transition-colors duration-300">
                <h3 className="text-base font-bold text-foreground mb-4 border-b border-border pb-2">
                  Related Articles
                </h3>
                <div className="space-y-5">
                  {relatedArticles.map((rel) => (
                    <div key={rel.slug} className="group">
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase">
                        {rel.category}
                      </span>
                      <Link
                        href={`/blog/${rel.slug}`}
                        className="block text-sm font-bold text-foreground hover:text-primary transition-colors mt-2 mb-1 line-clamp-2 leading-snug"
                      >
                        {rel.title}
                      </Link>
                      <Link
                        href={`/blog/${rel.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group-hover:underline"
                      >
                        Read Article
                        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
