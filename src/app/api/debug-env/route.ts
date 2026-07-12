// src/app/api/debug-env/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const envKeys = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'RESEND_API_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'CONVERSION_BACKEND_URL',
    'CONVERTAPI_SECRET',
  ];

  const envs: Record<string, { defined: boolean; length: number; prefix?: string }> = {};
  for (const k of envKeys) {
    const val = process.env[k];
    envs[k] = {
      defined: !!val,
      length: val?.length ?? 0,
      prefix: val ? val.substring(0, 5) + '...' : undefined,
    };
  }

  // Test 1: Database Connectivity
  let dbStatus = 'NOT_TESTED';
  let dbError = null;
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = `PASSED (took ${Date.now() - start}ms)`;
  } catch (err: any) {
    dbStatus = 'FAILED';
    dbError = err.message || err;
  }

  // Test 2: Groq Connectivity
  let groqStatus = 'NOT_TESTED';
  let groqError = null;
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.startsWith('gsk_')) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const start = Date.now();
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      groqStatus = `PASSED (took ${Date.now() - start}ms) - response: ${completion.choices[0]?.message?.content}`;
    } catch (err: any) {
      groqStatus = 'FAILED';
      groqError = err.message || err;
    }
  } else {
    groqStatus = 'SKIPPED (Key invalid format or missing)';
  }

  // Test 3: Gemini Connectivity
  let geminiStatus = 'NOT_TESTED';
  let geminiError = null;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const start = Date.now();
      const result = await model.generateContent('test');
      geminiStatus = `PASSED (took ${Date.now() - start}ms) - response: ${result.response.text().substring(0, 20)}`;
    } catch (err: any) {
      geminiStatus = 'FAILED';
      geminiError = err.message || err;
    }
  } else {
    geminiStatus = 'SKIPPED (Key missing)';
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    envs,
    tests: {
      database: { status: dbStatus, error: dbError },
      groq: { status: groqStatus, error: groqError },
      gemini: { status: geminiStatus, error: geminiError },
    }
  });
}
