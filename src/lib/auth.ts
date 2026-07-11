// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const isGoogleConfigured = !!(
  googleClientId &&
  googleClientSecret &&
  googleClientId !== 'your-google-client-id.apps.googleusercontent.com' &&
  googleClientSecret !== 'GOCSPX-your-google-client-secret'
);

const providers: any[] = [];

if (isGoogleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password required');
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase().trim() },
      });

      if (!user) throw new Error('No account found with this email');
      if (!user.password) throw new Error('Please sign in with Google');
      if (user.banned) throw new Error('Account suspended. Contact support.');

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) throw new Error('Incorrect password');

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        plan: user.plan,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  useSecureCookies: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers,
  events: {
    async signIn(message) {
      console.log('[NextAuth] signIn event:', message.user?.email, 'provider:', message.account?.provider);
    },
    async createUser(message) {
      console.log('[NextAuth] createUser event:', message.user?.email);
    },
    async linkAccount(message) {
      console.log('[NextAuth] linkAccount event:', message.user?.email, 'provider:', message.account?.provider);
    },
    async session(message) {
      console.log('[NextAuth] session event for:', (message as any).session?.user?.email);
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        console.log('[NextAuth] signIn callback - provider:', account?.provider, 'user:', user?.email);
        // Allow OAuth without email verification
        if (account?.provider !== 'credentials') return true;
        return true;
      } catch (err) {
        console.error('[NextAuth] signIn callback ERROR:', err);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'USER';
        token.plan = (user as any).plan ?? 'FREE';
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.plan) token.plan = session.plan;
      }
      // Refresh from DB to pick up ban/plan changes (throttled to once per 30s to prevent DB pool exhaustion)
      // Skip if running on Edge runtime to avoid Prisma Edge errors
      const isEdge = process.env.NEXT_RUNTIME === 'edge';
      const lastRefreshed = (token.lastRefreshed as number) || 0;
      const nowMs = Date.now();

      if (token.id && !user && !isEdge && nowMs - lastRefreshed > 30000) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true, plan: true, banned: true, name: true, image: true },
          });
          if (dbUser) {
            // Check if user has PRO plan but active subscription expired
            if (dbUser.plan === 'PRO') {
              const now = new Date();
              const activeSub = await prisma.subscription.findFirst({
                where: { userId: dbUser.id, status: 'ACTIVE' },
                orderBy: { currentPeriodEnd: 'desc' },
              });

              if (!activeSub || activeSub.currentPeriodEnd < now) {
                // Downgrade user to FREE in database
                await prisma.user.update({
                  where: { id: dbUser.id },
                  data: { plan: 'FREE' },
                });
                if (activeSub) {
                  await prisma.subscription.update({
                    where: { id: activeSub.id },
                    data: { status: 'EXPIRED' },
                  });
                }
                dbUser.plan = 'FREE';
              }
            }

            token.role = dbUser.role;
            token.plan = dbUser.plan;
            if (dbUser.name) token.name = dbUser.name;
            if (dbUser.image) token.picture = dbUser.image;
            token.lastRefreshed = nowMs;
          }
        } catch (err) {
          console.error('[NextAuth] jwt DB refresh ERROR:', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.plan = token.plan as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

// Extend types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      plan: string;
    };
  }
  interface User {
    role?: string;
    plan?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    plan?: string;
  }
}
