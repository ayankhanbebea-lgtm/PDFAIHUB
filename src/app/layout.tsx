// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers/session-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://pdfaihub.com'),
  title: {
    default: 'PDFAI Hub – Free PDF Tools + AI PDF Summarizer Online',
    template: '%s | PDFAI Hub',
  },
  description:
    'Free online PDF tools — merge, compress, split, convert PDFs. No login required. Plus AI-powered summaries, PDF chat, flashcards & quizzes for students.',
  keywords: [
    'pdf merge online free', 'compress pdf online', 'pdf to word converter',
    'image to pdf', 'split pdf', 'ai pdf summarizer', 'chat with pdf',
    'pdf tools no login', 'free pdf tools online', 'ai flashcard generator',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'PDFAI Hub',
    title: 'PDFAI Hub – Free PDF Tools + AI Features',
    description: 'Merge, compress, split PDFs for free. No login needed. AI summaries, PDF chat & more.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PDFAI Hub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDFAI Hub – Free PDF Tools + AI',
    description: 'Free PDF tools, no login required. AI summaries, chat with PDF, flashcards & quizzes.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
