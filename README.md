# PDFAI Hub 🚀

**The most powerful AI PDF toolkit for students & professionals.**

Built with Next.js 15, TypeScript, Prisma, OpenAI, Razorpay, Stripe, and Cloudinary.

---

## 📁 Project Structure

```
pdfai-hub/
├── prisma/
│   └── schema.prisma              # Database schema
├── public/                        # Static assets
├── scripts/
│   └── seed.ts                    # DB seed script
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── admin/page.tsx         # Admin panel
│   │   ├── ai/
│   │   │   ├── chat/page.tsx
│   │   │   ├── flashcards/page.tsx
│   │   │   ├── quiz/page.tsx
│   │   │   └── summarize/page.tsx
│   │   ├── api/
│   │   │   ├── ai/                # AI feature APIs
│   │   │   ├── auth/              # NextAuth + register
│   │   │   ├── admin/             # Admin APIs
│   │   │   ├── payments/          # Stripe + Razorpay
│   │   │   ├── pdf/               # PDF tool APIs
│   │   │   └── user/              # User profile, files
│   │   ├── dashboard/             # User dashboard
│   │   ├── pricing/page.tsx
│   │   ├── tools/                 # PDF tool pages
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Homepage
│   │   └── globals.css
│   ├── components/
│   │   ├── ai/                    # AI-specific components
│   │   ├── auth/                  # Auth components
│   │   ├── dashboard/             # Dashboard components
│   │   ├── layout/                # Navbar, Footer
│   │   ├── providers/             # Context providers
│   │   ├── tools/                 # FileDropzone, UploadProgress
│   │   └── pricing-section.tsx
│   ├── lib/
│   │   ├── ai.ts                  # OpenAI + Gemini
│   │   ├── auth.ts                # NextAuth config
│   │   ├── cloudinary.ts          # File storage
│   │   ├── pdf.ts                 # PDF operations
│   │   ├── prisma.ts              # DB client
│   │   ├── rate-limit.ts          # Usage limiting
│   │   ├── razorpay.ts            # Razorpay payments
│   │   ├── stripe.ts              # Stripe payments
│   │   └── utils.ts               # Utilities
│   └── types/index.ts             # TypeScript types
├── .env.example                   # Environment template
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd pdfai-hub
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Fill in all required values in `.env.local`:

**Required for basic functionality:**
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` — Your app URL (http://localhost:3000 for dev)

**Required for AI features:**
- `OPENAI_API_KEY` — From https://platform.openai.com
- `GEMINI_API_KEY` — From https://makersuite.google.com

**Required for file storage:**
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  → From https://cloudinary.com (free tier available)

**Required for auth:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  → From https://console.cloud.google.com/apis/credentials

**Required for payments:**
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`

### 3. Set Up Database

```bash
# Push schema to DB
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed initial data (admin user + pricing plans)
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## 🗄️ Database Setup (PostgreSQL)

### Option A — Local PostgreSQL

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createdb pdfai_hub

# Ubuntu/Debian
sudo apt install postgresql
sudo -u postgres createdb pdfai_hub
```

Set `DATABASE_URL=postgresql://postgres:password@localhost:5432/pdfai_hub`

### Option B — Free Cloud DB (Recommended for production)
- **Neon**: https://neon.tech (free tier, 10GB)
- **Supabase**: https://supabase.com (free tier)
- **PlanetScale**: https://planetscale.com

---

## ☁️ Cloudinary Setup

1. Sign up at https://cloudinary.com (free tier: 25GB storage)
2. Dashboard → Settings → API Keys
3. Copy Cloud Name, API Key, API Secret to `.env.local`

---

## 🔐 Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project
3. APIs & Services → Credentials → Create OAuth 2.0 Client
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID & Secret

---

## 💳 Payment Setup

### Razorpay (Recommended for India)
1. Sign up at https://razorpay.com
2. Settings → API Keys → Generate Key
3. Create Plans:
   - Go to Subscriptions → Plans → Create Plan
   - Monthly: ₹499/month
   - Yearly: ₹3999/year
4. Add `RAZORPAY_PRO_MONTHLY_PLAN_ID` and `RAZORPAY_PRO_YEARLY_PLAN_ID`

### Stripe (Global)
1. Sign up at https://stripe.com
2. Developers → API Keys
3. Create Products:
   - Go to Products → Add Product → Add Price
   - Monthly: ₹499/month recurring
   - Yearly: ₹3999/year recurring
4. Set up webhook: Developers → Webhooks → Add endpoint
   - URL: `https://yourdomain.com/api/payments/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 🤖 AI Setup

### OpenAI
1. Sign up at https://platform.openai.com
2. API Keys → Create new key
3. The app uses `gpt-4o-mini` by default (most cost-effective)

### Google Gemini
1. Go to https://makersuite.google.com/app/apikey
2. Create API Key
3. Users can choose between OpenAI and Gemini in the UI

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel

# Set all environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

Important Vercel settings:
- Framework: Next.js
- Node version: 18.x
- Build command: `npm run build`
- Root directory: `/`

### Docker (Self-hosted)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t pdfai-hub .
docker run -p 3000:3000 --env-file .env.local pdfai-hub
```

### Environment Variables for Production

Make sure these are set in production:
```
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

## 📊 Admin Panel

Access at `/admin` — requires ADMIN role.

Default admin credentials (from seed):
- Email: `admin@pdfaihub.com`
- Password: `Admin@12345`
- **⚠️ Change immediately after first login!**

Admin can:
- View platform statistics and charts
- Manage users (ban, unban, grant/revoke Pro)
- Monitor file uploads
- View tool usage analytics

---

## 🔒 Security Features

- ✅ NextAuth JWT sessions with auto-refresh
- ✅ Rate limiting per user (daily AI + PDF quotas)
- ✅ File size validation (50MB default)
- ✅ MIME type validation
- ✅ Input validation with Zod
- ✅ CORS and security headers
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention (React)
- ✅ Webhook signature verification (Stripe + Razorpay)
- ✅ Admin-only routes protected

---

## 📈 SEO Optimization

- Meta tags on all pages
- Open Graph and Twitter cards
- JSON-LD schema markup
- Auto-generated sitemap at `/sitemap.xml`
- Robots.txt at `/robots.txt`
- SEO content sections on tool pages

Target keywords:
- "pdf merge online free"
- "compress pdf online"
- "pdf to word converter"
- "image to pdf online"
- "ai pdf summarizer"
- "chat with pdf ai"

---

## 🛠️ Adding More Features

### Add a new PDF tool:
1. Create API: `src/app/api/pdf/your-tool/route.ts`
2. Create page: `src/app/tools/your-tool/page.tsx`
3. Add to navbar: `src/components/layout/navbar.tsx`
4. Add to sitemap: `src/app/api/sitemap/route.ts`
5. Add to homepage: `src/app/page.tsx`

### Add a new AI feature:
1. Add function to `src/lib/ai.ts`
2. Create API: `src/app/api/ai/your-feature/route.ts`
3. Create page: `src/app/ai/your-feature/page.tsx`

---

## 💰 Revenue Optimization Tips

1. **Free limits** — Keep them just low enough to push upgrades
2. **Show upgrade prompts** — When limits are hit, show upgrade modal
3. **Email sequences** — Send "you're almost at your limit" emails
4. **Annual discount** — Offer 33% off yearly (₹3999 vs ₹499×12=₹5988)
5. **SEO pages** — Target high-traffic keywords for organic growth
6. **Student focus** — AI features are extremely valuable for students

---

## 📞 Support

- GitHub Issues: [your-repo]/issues
- Email: support@pdfaihub.com

---

## 📄 License

MIT License — see LICENSE file.
