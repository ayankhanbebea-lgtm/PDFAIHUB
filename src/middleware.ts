// src/middleware.ts
// Only protect: /dashboard, /admin, /api/user, /api/admin, /api/ai
// Everything else (PDF tools) is PUBLIC
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin-only routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (token?.role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // These paths require authentication
        const protectedPaths = ['/dashboard', '/admin', '/api/user', '/api/admin', '/api/ai'];
        const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
        if (!isProtected) return true; // Public path — allow always
        return !!token; // Protected path — require token
      },
    },
    pages: { signIn: '/auth/login' },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/user/:path*',
    '/api/admin/:path*',
    '/api/ai/:path*',
  ],
};
