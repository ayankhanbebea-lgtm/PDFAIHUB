// src/app/api/sitemap/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pdfaihub.com';

const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/tools/merge', priority: '0.9', changefreq: 'weekly' },
  { url: '/tools/compress', priority: '0.9', changefreq: 'weekly' },
  { url: '/tools/split', priority: '0.9', changefreq: 'weekly' },
  { url: '/tools/pdf-to-word', priority: '0.9', changefreq: 'weekly' },
  { url: '/tools/image-to-pdf', priority: '0.9', changefreq: 'weekly' },
  { url: '/tools/protect', priority: '0.8', changefreq: 'weekly' },
  { url: '/ai/summarize', priority: '0.9', changefreq: 'weekly' },
  { url: '/ai/chat', priority: '0.9', changefreq: 'weekly' },
  { url: '/ai/flashcards', priority: '0.8', changefreq: 'weekly' },
  { url: '/ai/quiz', priority: '0.8', changefreq: 'weekly' },
  { url: '/pricing', priority: '0.8', changefreq: 'monthly' },
  { url: '/blog', priority: '0.7', changefreq: 'weekly' },
  { url: '/auth/login', priority: '0.5', changefreq: 'yearly' },
  { url: '/auth/register', priority: '0.5', changefreq: 'yearly' },
];

export async function GET() {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
