// src/app/contact/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ContactForm } from '@/components/contact-form';
import { Mail, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us – PDFAI Hub',
  description: 'Have questions, suggestions, or business inquiries about PDFAI Hub? Reach out to us via email, or use our contact form.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#FFFFFF]">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="relative overflow-hidden bg-hero-gradient py-16 border-b border-gray-200 dark:border-white/5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#10B981]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="section-container relative z-10 text-center max-w-3xl mx-auto">
            <span className="text-xs bg-[#10B981]/15 text-[#10B981] px-3.5 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              Get In Touch
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mt-4 mb-4 text-white">
              Contact Us
            </h1>
            <p className="text-base text-gray-400 max-w-xl mx-auto">
              Have questions, suggestions or business inquiries? We&apos;d love to hear from you.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="section-container">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-6xl mx-auto items-start">
              {/* Left Column: Contact Cards */}
              <div className="lg:col-span-5 space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>

                {/* Email card */}
                <div className="flex gap-4 p-5 bg-[#161B22] border border-[#1F2937] rounded-2xl group hover:border-[#10B981]/25 transition-colors">
                  <div className="w-11 h-11 bg-[#10B981]/15 border border-[#10B981]/20 rounded-xl flex items-center justify-center flex-shrink-0 text-[#10B981] group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Email Us</h3>
                    <a
                      href="mailto:pdfaihub@gmail.com"
                      className="text-base font-bold text-white hover:text-[#10B981] transition-colors break-all mt-1 block"
                    >
                      pdfaihub@gmail.com
                    </a>
                  </div>
                </div>

                {/* Trust/Support info */}
                <div className="bg-[#161B22]/50 border border-[#1F2937]/60 p-6 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Support Promise
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    We typically respond to business and technical inquiries within 24 to 48 hours. If you are experiencing tool execution issues, please provide screenshots or file format details.
                  </p>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="lg:col-span-7 bg-[#161B22] border border-[#1F2937] p-6 sm:p-8 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-2">Send a Message</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Fill out the form below and our team will get back to you as soon as possible.
                </p>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
