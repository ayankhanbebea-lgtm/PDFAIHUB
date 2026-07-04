# PDFAI Hub — Complete Setup Guide

## What Works After Setup
✅ Google Sign-In  
✅ Email + Password Login  
✅ Forgot/Reset Password  
✅ Session persists after refresh  
✅ Guest users: all PDF tools, no login, 30 ops/day  
✅ AI features: login required  
✅ Dashboard protected  
✅ No hydration errors  
✅ No runtime errors  

---

## Step 1 — Accounts You Need to Create

### A. Neon PostgreSQL (Free Database)
1. Go to https://neon.tech → Sign up
2. Create new project: `pdfai-hub`
3. Copy the **Connection string** (looks like `postgresql://...neon.tech/pdfai_hub`)
4. Use as `DATABASE_URL`

### B. Google OAuth (For Google Login)
1. Go to https://console.cloud.google.com
2. Create new project: `pdfai-hub`
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized JavaScript origins: `http://localhost:3000`
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret**

### C. Cloudinary (File Storage — Free 25GB)
1. Go to https://cloudinary.com → Sign up
2. Dashboard → Settings → API Keys
3. Copy **Cloud Name**, **API Key**, **API Secret**

### D. OpenAI (For AI Features)
1. Go to https://platform.openai.com/api-keys
2. Create new key
3. **Add billing** (pay-as-you-go, ~₹0.10 per summary)

### E. Razorpay (For India Payments — Optional)
1. Go to https://razorpay.com → Sign up
2. Settings → API Keys → Generate Test Key
3. Subscriptions → Plans → Create Plan:
   - Monthly: ₹499/month, interval: monthly
   - Yearly: ₹3999/year, interval: yearly
4. Settings → Webhooks → Add webhook:
   - URL: `https://yourdomain.com/api/payments/razorpay/webhook`
   - Events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`

---

## Step 2 — Environment Variables

Create `.env.local` in the project root:

```env
# Required — App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Required — Database
DATABASE_URL=postgresql://your-neon-connection-string

# Required — Google Auth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Required for AI features
OPENAI_API_KEY=sk-proj-...

# Required for file upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=your-secret

# Optional — Razorpay (for payments)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
NEXT_PUBLIC_RAZORPAY_PRO_MONTHLY=plan_...
NEXT_PUBLIC_RAZORPAY_PRO_YEARLY=plan_...
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
# Copy the output and paste as NEXTAUTH_SECRET
```

---

## Step 3 — Terminal Commands

```bash
# 1. Install dependencies
npm install

# 2. Push database schema (creates all tables)
npm run db:push

# 3. Generate Prisma client
npm run db:generate

# 4. Seed database (creates admin user)
npm run db:seed

# 5. Start development server
npm run dev
```

Visit: http://localhost:3000

---

## Step 4 — Test Everything

### Test Email Registration:
1. Go to http://localhost:3000/auth/register
2. Fill in: Name, Email, Password (8+ chars), Confirm Password
3. Click "Create Free Account"
4. Should auto-login and redirect to /dashboard ✅

### Test Email Login:
1. Go to http://localhost:3000/auth/login
2. Enter email + password
3. Should redirect to /dashboard ✅

### Test Google Login:
1. Go to http://localhost:3000/auth/login
2. Click "Continue with Google"
3. Select Google account
4. Should redirect to /dashboard ✅

### Test PDF Tools (No Login):
1. Sign out
2. Go to http://localhost:3000/tools/merge
3. Upload 2 PDFs
4. Should work without login ✅

### Test AI Features (Login Required):
1. Sign out
2. Go to http://localhost:3000/ai/summarize
3. Should show "Sign In Required" screen ✅
4. Sign in, try again — should work ✅

### Test Forgot Password:
1. Go to http://localhost:3000/auth/forgot-password
2. Enter your email
3. In development: check terminal/console for the reset link
4. Open the reset link, set new password ✅

---

## Step 5 — Admin Panel

Default admin after seeding:
- Email: `admin@pdfaihub.com`
- Password: `Admin@12345`
- **Change this immediately!**

Access admin at: http://localhost:3000/admin

---

## Step 6 — Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard:
# Project Settings → Environment Variables → Add all from .env.local
```

**Update for production:**
- `NEXTAUTH_URL=https://yourdomain.com`
- `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- `GOOGLE_CLIENT_ID` — add `https://yourdomain.com/api/auth/callback/google` to authorized URIs

---

## Troubleshooting

**Google login not working:**
- Check redirect URI exactly matches in Google Console
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- In Google Console, ensure the OAuth consent screen is configured

**Email login fails "Invalid credentials":**
- Check email is exactly what you registered with
- Password must match exactly (case-sensitive)
- In terminal, check for any DB connection errors

**PDF tools not working:**
- Check `CLOUDINARY_*` variables are set
- Test Cloudinary connection at cloudinary.com

**AI features fail:**
- Check `OPENAI_API_KEY` is valid and has billing
- Check terminal for rate limit errors

**Database errors:**
- Ensure `DATABASE_URL` is correct
- Run `npm run db:push` again
- Check Neon dashboard for connection limits

---

## Architecture Summary

```
Guest (no login) → PDF Tools → 30 ops/day by IP
Logged-in Free   → PDF Tools (5/day) + AI (10/day)
Logged-in Pro    → Everything unlimited
Admin            → Full platform management
```

PDF Tools route: `/tools/*` — NO authentication required  
AI Tools route: `/ai/*` — Login required (middleware enforces)  
Dashboard: `/dashboard/*` — Login required  
Admin: `/admin/*` — Admin role required  
