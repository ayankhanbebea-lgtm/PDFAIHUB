// src/app/privacy-policy/page.tsx — Theme-aware
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Shield, Lock, FileText, Globe, Eye, Server } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy – PDFAI Hub',
  description: 'Read the PDFAI Hub Privacy Policy. Learn about what data we collect, file processing, payment handling, and your rights.',
};

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: Eye,
      title: 'Information We Collect',
      content: `We collect information to provide better services to our users. This includes:
      - **Account Information**: When you log in via Google, we collect your name, email address, and profile image to identify your account and personalize your workspace.
      - **Usage Data**: We collect metadata regarding your interactions with the site (e.g., tools used, timestamp of uploads) to monitor performance and improve our features.`,
    },
    {
      icon: Globe,
      title: 'Google Login Information',
      content: `We offer Google authentication to simplify sign-up and sign-in processes. When logging in with Google:
      - We access basic profile details (Name, Email, Profile Picture) authorized via Google OAuth.
      - We never collect, see, or store your Google password.
      - You can revoke access at any time through your Google Account security configurations.`,
    },
    {
      icon: FileText,
      title: 'Uploaded PDFs & Files',
      content: `Your documents are processed with the highest privacy standards:
      - **No Training**: We do not use your uploaded files, notes, or extracted text to train or fine-tune AI models.
      - **Auto-Deletion**: All uploaded files are stored in secure temporary directories and are automatically deleted within 2 to 4 hours of processing.
      - **Access Limits**: Files are encrypted in transit and at rest, and no human member of the PDFAI Hub team will ever open or review your uploads.`,
    },
    {
      icon: Server,
      title: 'AI Requests & Prompts',
      content: `When you use our AI features (AI Summarizer, AI PDF Chat, Quiz/Flashcard Generator):
      - We extract text from your PDF and send context-specific prompts to our AI processing engines.
      - The prompts and extracted text are only cached temporarily to fulfill your query and are not stored permanently.`,
    },
    {
      icon: Shield,
      title: 'Data Security & Storage',
      content: `We implement industry-standard technical measures to protect your personal details:
      - All communication between your browser and our servers is encrypted using Secure Socket Layer (SSL/TLS).
      - Database records are stored securely, using modern encryption and permission frameworks.`,
    },
    {
      icon: Lock,
      title: 'Third-Party Services',
      content: `We collaborate with reliable third-party infrastructure providers to host and secure our platform:
      - **OpenAI & Google AI**: Used for executing semantic searches, summaries, chat functions, and study aid generations.
      - **Stripe & Razorpay**: Secure processors for membership billing. We never store or log your credit card numbers on our own servers.
      - **Neon Database**: Serverless database hosting that secures account settings, workspace metadata, and user quotas.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Header */}
        <section className="relative overflow-hidden bg-hero-gradient py-12 border-b border-border transition-colors duration-300">
          <div className="section-container relative z-10 max-w-4xl mx-auto">
            <span className="text-xs bg-primary/10 text-primary px-3.5 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              Legal Center
            </span>
            <h1 className="text-4xl font-bold mt-4 mb-2 text-foreground">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Last Updated: July 5, 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="section-container max-w-4xl mx-auto">
            <div className="grid grid-cols-1 gap-8">
              {/* Introduction */}
              <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl transition-colors duration-300">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Welcome to PDFAI Hub (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy details how we collect, process, and protect your information when you access our tools and services.
                </p>
              </div>

              {/* Main Sections */}
              {sections.map((section, idx) => {
                const Icon = section.icon;
                return (
                  <div key={idx} className="bg-card border border-border p-6 sm:p-8 rounded-2xl space-y-4 transition-colors duration-300">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary border border-primary/25 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      {section.title}
                    </h2>
                    <div className="text-sm text-muted-foreground leading-relaxed space-y-2 whitespace-pre-line pl-12">
                      {section.content}
                    </div>
                  </div>
                );
              })}

              {/* Cookies, Payments, User Rights */}
              <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl space-y-4 transition-colors duration-300">
                <h2 className="text-xl font-bold text-foreground pl-12">
                  Cookies, Payment Information & User Rights
                </h2>
                <div className="text-sm text-muted-foreground leading-relaxed pl-12 space-y-4">
                  <p>
                    <strong>Cookies:</strong> We use standard security and functional cookies to remember authorization sessions and configuration settings. Read our full <a href="/cookies" className="text-primary hover:underline font-semibold">Cookie Policy</a> to learn how to manage them.
                  </p>
                  <p>
                    <strong>Payment Information:</strong> Upgrading to a premium membership is routed through Stripe or Razorpay. PDFAI Hub does not receive, view, or log any credit card details or payment secrets.
                  </p>
                  <p>
                    <strong>User Rights:</strong> You have the right to request access to the information we hold about you, request corrections, or ask for the deletion of your account and related records. To exercise these rights, please write to us at the contact email below.
                  </p>
                </div>
              </div>

              {/* Contact Email */}
              <div className="bg-primary/5 border border-primary/20 p-6 sm:p-8 rounded-2xl text-center space-y-3 transition-colors duration-300">
                <h3 className="text-lg font-bold text-foreground">Questions About Our Privacy Policy?</h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  If you have queries, need data access, or wish to request complete deletion of your records, contact our privacy compliance officer.
                </p>
                <a
                  href="mailto:pdfaihub@gmail.com"
                  className="inline-block text-base font-bold text-primary hover:underline"
                >
                  pdfaihub@gmail.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
