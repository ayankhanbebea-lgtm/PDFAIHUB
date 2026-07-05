// src/app/cookies/page.tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Info, ShieldCheck, UserCheck, BarChart2, Settings, CreditCard, EyeOff } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy – PDFAI Hub',
  description: 'Read the PDFAI Hub Cookie Policy. Learn about what cookies are, how we use cookies, and how to manage cookie preferences in your browser.',
};

export default function CookiePolicyPage() {
  const cookieTypes = [
    {
      icon: ShieldCheck,
      title: 'Essential Cookies',
      desc: 'These cookies are strictly necessary to deliver the services available through our website and to utilize some of its features, such as accessing secure page areas. They cannot be disabled as the website cannot function properly without them.',
    },
    {
      icon: UserCheck,
      title: 'Authentication Cookies',
      desc: 'When you sign in using your Google account, authentication cookies are set to keep you logged in between visits and ensure that your queries are routed to your account workspace securely.',
    },
    {
      icon: BarChart2,
      title: 'Analytics Cookies',
      desc: 'These cookies collect information that is used in aggregate form to help us understand how our website is being used, the efficacy of our marketing campaigns, or to help us customize our site design to improve user experience.',
    },
    {
      icon: Settings,
      title: 'Preference Cookies',
      desc: 'Preference cookies enable our website to remember settings you customize, such as your chosen theme (Light/Dark mode) or preferred language preferences, so you do not need to reconfigure them each time you load a tool.',
    },
    {
      icon: CreditCard,
      title: 'Payment Cookies',
      desc: 'Our payment processor services (Stripe & Razorpay) set cookies to safely authorize payment requests, detect potential fraud, and process premium membership billing queries.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#FFFFFF]">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Header */}
        <section className="relative overflow-hidden bg-hero-gradient py-12 border-b border-gray-200 dark:border-white/5">
          <div className="section-container relative z-10 max-w-4xl mx-auto">
            <span className="text-xs bg-[#10B981]/15 text-[#10B981] px-3.5 py-1.5 rounded-full font-semibold uppercase tracking-wider">
              Legal Center
            </span>
            <h1 className="text-4xl font-bold mt-4 mb-2 text-white">
              Cookie Policy
            </h1>
            <p className="text-sm text-gray-400">
              Last Updated: July 5, 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="section-container max-w-4xl mx-auto">
            <div className="grid grid-cols-1 gap-8">
              {/* What are cookies */}
              <div className="bg-[#161B22] border border-[#1F2937] p-6 sm:p-8 rounded-2xl space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 flex items-center justify-center flex-shrink-0">
                    <Info className="w-4.5 h-4.5" />
                  </div>
                  What Are Cookies?
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed pl-12 space-y-2">
                  <p>
                    Cookies are small text files placed on your computer or mobile device by websites that you visit. They are widely used to make websites work, or work more efficiently, as well as to provide reporting data.
                  </p>
                  <p>
                    Cookies set by the website owner (in this case, PDFAI Hub) are called &quot;first-party cookies.&quot; Cookies set by parties other than the website owner are called &quot;third-party cookies.&quot; Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., payment gateways or security checking).
                  </p>
                </div>
              </div>

              {/* Types of cookies */}
              <div className="bg-[#161B22] border border-[#1F2937] p-6 sm:p-8 rounded-2xl space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-4.5 h-4.5" />
                  </div>
                  Cookies We Use
                </h2>
                <p className="text-sm text-gray-400 pl-12">
                  We use cookies for a variety of reasons detailed below. Unfortunately, in most cases, there are no industry-standard options for disabling cookies without completely disabling the functionality and features they add to this site.
                </p>

                <div className="space-y-6 pl-12 pt-2">
                  {cookieTypes.map((cookie, idx) => {
                    const Icon = cookie.icon;
                    return (
                      <div key={idx} className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-gray-300">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white mb-1">{cookie.title}</h3>
                          <p className="text-sm text-gray-400 leading-relaxed">{cookie.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* How to disable */}
              <div className="bg-[#161B22] border border-[#1F2937] p-6 sm:p-8 rounded-2xl space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 flex items-center justify-center flex-shrink-0">
                    <EyeOff className="w-4.5 h-4.5" />
                  </div>
                  How to Control & Disable Cookies
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed pl-12 space-y-3">
                  <p>
                    You have the right to decide whether to accept or reject cookies. You can set or amend your web browser controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website, though your access to some features and secure areas of our website may be restricted.
                  </p>
                  <p>
                    Most web browsers allow some control of most cookies through the browser settings. To find out more about how to manage and delete cookies on popular browsers, use these resources:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline">Google Chrome</a></li>
                    <li><a href="https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline">Mozilla Firefox</a></li>
                    <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline">Apple Safari</a></li>
                    <li><a href="https://support.microsoft.com/microsoft-edge/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-[#10B981] hover:underline">Microsoft Edge</a></li>
                  </ul>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-[#10B981]/5 border border-[#10B981]/20 p-6 sm:p-8 rounded-2xl text-center space-y-3">
                <h3 className="text-lg font-bold text-white">Questions About Cookie Use?</h3>
                <p className="text-sm text-gray-400 max-w-lg mx-auto">
                  If you have any questions or concerns regarding how we utilize cookies, tracking mechanisms, or data cache policies, please reach out to us.
                </p>
                <a
                  href="mailto:pdfaihub@gmail.com"
                  className="inline-block text-base font-bold text-[#10B981] hover:underline"
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
