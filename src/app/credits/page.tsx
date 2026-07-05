// src/app/credits/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Credits – PDFAI Hub',
  description: 'Meet the people behind PDFAI Hub. Learn about the team responsible for design, development, content, and quality assurance.',
};

export default function CreditsPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#FFFFFF]">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-hero-gradient py-16 border-b border-gray-200 dark:border-white/5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#10B981]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="section-container relative z-10 text-center max-w-3xl mx-auto">
            <span className="text-xs bg-[#10B981]/15 text-[#10B981] px-3.5 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              About the Creators
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-4 text-white">
              Credits
            </h1>
            <p className="text-base text-gray-400 max-w-xl mx-auto">
              Meet the people behind PDFAI Hub.
            </p>
          </div>
        </section>

        {/* Members Showcase */}
        <section className="py-16">
          <div className="section-container max-w-4xl mx-auto px-4">
            
            {/* Owner Section */}
            <div className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6 border-b border-[#1F2937]/50 pb-2">
                Owner & Lead Architect
              </h2>
              
              <div className="p-8 bg-[#161B22] border-2 border-[#10B981]/30 hover:border-[#10B981] rounded-2xl transition-all duration-300 shadow-glow-brand hover:shadow-card-hover group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-full blur-[30px]" />
                
                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h3 className="text-2xl font-bold text-white">
                      Ezio (Ayan)
                    </h3>
                    <span className="text-xs bg-[#10B981]/15 text-[#10B981] px-2.5 py-0.5 rounded-full font-semibold">
                      Founder & Lead
                    </span>
                  </div>
                  
                  <p className="text-sm font-semibold text-gray-300">
                    Founder & Full Stack Developer
                  </p>
                  
                  <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
                    Designed, developed and maintained the complete PDFAI Hub platform including frontend, backend, AI integration, authentication, payments, dashboard, and deployment.
                  </p>
                </div>
              </div>
            </div>

            {/* Team Section */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6 border-b border-[#1F2937]/50 pb-2">
                Team Members
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Dexo (Preet) Card */}
                <div className="p-6 bg-[#161B22] border border-[#1F2937] hover:border-[#10B981]/30 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover group relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#10B981]/5 rounded-full blur-[20px]" />
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">
                      Dexo (Preet)
                    </h3>
                    <p className="text-xs bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded-full font-semibold inline-block">
                      UI/UX Designer
                    </p>
                    <p className="text-xs font-semibold text-gray-300 pt-1">
                      UI/UX Designer
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Responsible for interface planning, design consistency, user experience improvements and design feedback.
                    </p>
                  </div>
                </div>

                {/* Olivia (Anika) Card */}
                <div className="p-6 bg-[#161B22] border border-[#1F2937] hover:border-[#10B981]/30 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover group relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#10B981]/5 rounded-full blur-[20px]" />
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">
                      Olivia (Anika)
                    </h3>
                    <p className="text-xs bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded-full font-semibold inline-block">
                      Content & Quality
                    </p>
                    <p className="text-xs font-semibold text-gray-300 pt-1">
                      Content & Quality Manager
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed">
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
