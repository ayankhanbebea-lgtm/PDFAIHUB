'use client';
// src/components/layout/footer.tsx
import Link from 'next/link';
import { FileText, Github, Linkedin } from 'lucide-react';

const footerLinks = {
  'PDF Tools': [
    { name: 'PDF Merge', href: '/tools/merge' },
    { name: 'PDF Compress', href: '/tools/compress' },
    { name: 'PDF Split', href: '/tools/split' },
    { name: 'PDF to Word', href: '/tools/pdf-to-word' },
    { name: 'Image to PDF', href: '/tools/image-to-pdf' },
    { name: 'PDF Protect', href: '/tools/protect' },
  ],
  'AI Features': [
    { name: 'AI Summarizer', href: '/ai/summarize' },
    { name: 'AI PDF Chat', href: '/ai/chat' },
    { name: 'Flashcard Generator', href: '/ai/flashcards' },
    { name: 'Quiz Generator', href: '/ai/quiz' },
  ],
  Company: [
    { name: 'Pricing', href: '/pricing' },
    { name: 'Blog', href: '/blog' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ],
  Legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-surface-dark-2 border-t border-gray-200 dark:border-white/5">
      <div className="section-container py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <div className="w-8 h-8 bg-[#10B981] rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="gradient-text">PDFAI Hub</span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              The most powerful AI PDF toolkit for students and professionals.
            </p>
            <div className="flex gap-3">
              <a href="https://github.com/ayankhanbebea-lgtm" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/in/ayan-khan-8b630337a/?skipRedirect=true" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{category}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} PDFAI Hub. All rights reserved.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built with ❤️ for students and professionals worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
