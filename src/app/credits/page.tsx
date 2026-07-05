// src/app/credits/page.tsx — Theme-aware
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Credits – PDFAI Hub',
  description: 'Meet the people behind PDFAI Hub. Learn about the team responsible for design, development, content, and quality assurance.',
};

export default function CreditsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-hero-gradient py-16 border-b border-border transition-colors duration-300">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="section-container relative z-10 text-center max-w-3xl mx-auto">
            <span className="text-xs bg-primary/10 text-primary px-3.5 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              About the Creators
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-4 text-foreground">
              Credits
            </h1>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Meet the people behind PDFAI Hub.
            </p>
          </div>
        </section>

        {/* Members Showcase */}
        <section className="py-16">
          <div className="section-container max-w-4xl mx-auto px-4">
            
            {/* Owner Section */}
            <div className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6 border-b border-border pb-2">
                Owner & Lead Architect
              </h2>
              
              <div className="p-8 bg-card border-2 border-primary/30 hover:border-primary rounded-2xl transition-all duration-300 shadow-glow-brand hover:shadow-card-hover group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[30px]" />
                
                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h3 className="text-2xl font-bold text-foreground">
                      Ezio (Ayan)
                    </h3>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">
                      Founder & Lead
                    </span>
                  </div>
                  
                  <p className="text-sm font-semibold text-muted-foreground">
                    Founder & Full Stack Developer
                  </p>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    Designed, developed and maintained the complete PDFAI Hub platform including frontend, backend, AI integration, authentication, payments, dashboard, and deployment.
                  </p>
                </div>
              </div>
            </div>

            {/* Team Section */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6 border-b border-border pb-2">
                Team Members
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Dexo (Preet) Card */}
                <div className="p-6 bg-card border border-border hover:border-primary/30 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover group relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-[20px]" />
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      Dexo (Preet)
                    </h3>
                    <p className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold inline-block">
                      UI/UX Designer
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground pt-1">
                      UI/UX Designer
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Responsible for interface planning, design consistency, user experience improvements and design feedback.
                    </p>
                  </div>
                </div>

                {/* Olivia (Anika) Card */}
                <div className="p-6 bg-card border border-border hover:border-primary/30 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover group relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-[20px]" />
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      Olivia (Anika)
                    </h3>
                    <p className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold inline-block">
                      Content & Quality
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground pt-1">
                      Content & Quality Manager
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Responsible for documentation, blog content, proofreading, testing and overall quality assurance.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
