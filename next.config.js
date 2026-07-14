/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for pdf-parse, sharp, and AI PDF processing packages
  serverExternalPackages: ['pdf-parse', 'sharp', 'mammoth', 'canvas', 'muhammara', 'pdfjs-dist', 'tesseract.js', 'mupdf', 'pptxgenjs'],

  // Explicitly include pdf-parse engine files in Vercel serverless bundle.
  // Without this, Vercel's Node File Tracing cannot follow the dynamic require:
  //   require(`./pdf.js/${options.version}/build/pdf.js`)
  // and the files are absent at runtime, causing MODULE_NOT_FOUND → "Could not extract text from PDF".
  outputFileTracingIncludes: {
    '/api/ai/**': [
      './node_modules/pdf-parse/lib/pdf.js/**/*',
    ],
    '/api/pdf/ocr': [
      './src/app/api/pdf/ocr/run-ocr.mjs',
    ],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Webpack config to handle server-side only packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    }
    return config;
  },
};

module.exports = nextConfig;
