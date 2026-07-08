/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix for pdf-parse, sharp, and AI PDF processing packages
  serverExternalPackages: ['pdf-parse', 'sharp', 'mammoth', 'canvas', 'muhammara', 'pdfjs-dist', 'tesseract.js', 'mupdf', 'pptxgenjs'],



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

  // Webpack config to handle pdf-parse test files
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    }
    // Ignore test files from pdf-parse
    config.module.rules.push({
      test: /node_modules\/pdf-parse\/lib\/pdf\.js/,
      use: 'null-loader',
    });
    return config;
  },
};

module.exports = nextConfig;
