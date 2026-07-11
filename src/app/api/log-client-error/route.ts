// src/app/api/log-client-error/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.error('\n==================== CLIENT-SIDE EXCEPTION LOG ====================');
    console.error('URL:', body.url);
    console.error('Message:', body.message);
    console.error('Stack:', body.stack);
    console.error('User Agent:', body.userAgent);
    console.error('==================================================================\n');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false });
  }
}
