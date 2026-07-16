import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
  const maskedKeyId = rawKeyId
    ? `${rawKeyId.slice(0, 8)}...${rawKeyId.slice(-4)}`
    : 'NONE';
  const isLive = rawKeyId.startsWith('rzp_live');
  const isTest = rawKeyId.startsWith('rzp_test');
  const mode = isLive ? 'Live' : isTest ? 'Test' : 'Unknown';

  const clientKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const maskedClientKeyId = clientKeyId
    ? `${clientKeyId.slice(0, 8)}...${clientKeyId.slice(-4)}`
    : 'NONE';

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    serverKeyIdMasked: maskedKeyId,
    clientKeyIdMasked: maskedClientKeyId,
    mode,
    nodeEnv: process.env.NODE_ENV,
    isLiveKeyLoaded: isLive,
    isTestKeyLoaded: isTest,
  });
}
