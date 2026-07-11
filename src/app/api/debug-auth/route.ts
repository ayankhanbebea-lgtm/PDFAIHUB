// src/app/api/debug-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll().map(c => ({ name: c.name, value: c.value ? c.value.substring(0, 10) + '...' : '' }));
  const headers = Object.fromEntries(request.headers.entries());

  const secret = process.env.NEXTAUTH_SECRET;
  
  let tokenDefault = null;
  let tokenSecure = null;
  let tokenInsecure = null;
  let errDefault = null;
  let errSecure = null;
  let errInsecure = null;

  try {
    tokenDefault = await getToken({ req: request as any, secret });
  } catch (e: any) {
    errDefault = e.message;
  }

  try {
    tokenSecure = await getToken({ req: request as any, secret, secureCookie: true });
  } catch (e: any) {
    errSecure = e.message;
  }

  try {
    tokenInsecure = await getToken({ req: request as any, secret, secureCookie: false });
  } catch (e: any) {
    errInsecure = e.message;
  }

  return NextResponse.json({
    env: {
      NEXTAUTH_SECRET_EXISTS: !!secret,
      NEXTAUTH_SECRET_LENGTH: secret?.length ?? 0,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      VERCEL: process.env.VERCEL || 'NOT_SET',
    },
    request: {
      url: request.url,
      protocol: request.nextUrl.protocol,
      cookies,
    },
    tokens: {
      default: tokenDefault ? { name: (tokenDefault as any).name, email: (tokenDefault as any).email, role: (tokenDefault as any).role } : null,
      secure: tokenSecure ? { name: (tokenSecure as any).name, email: (tokenSecure as any).email, role: (tokenSecure as any).role } : null,
      insecure: tokenInsecure ? { name: (tokenInsecure as any).name, email: (tokenInsecure as any).email, role: (tokenInsecure as any).role } : null,
    },
    errors: {
      default: errDefault,
      secure: errSecure,
      insecure: errInsecure,
    }
  });
}
