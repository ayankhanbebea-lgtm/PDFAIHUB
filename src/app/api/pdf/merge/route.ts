// src/app/api/pdf/merge/route.ts
// PUBLIC — No login required. Guest limit: 30/day.
// Returns the merged PDF as a direct binary download (no Cloudinary required).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mergePDFs } from '@/lib/pdf';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    const usage = await checkUsage(session.user.id, 'pdf');
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "You have reached today's free PDF limit. Your limit will reset 24 hours after your first PDF operation, or upgrade to Pro for unlimited usage.", upgrade: true },
        { status: 429 }
      );
    }
  } else {
    const identifier = getGuestIdentifier(request);
    const guestCheck = checkGuestLimit(identifier);
    if (!guestCheck.allowed) {
      return NextResponse.json(
        { error: `You've reached today's free limit (${guestCheck.limit} operations). Create a free account for higher limits.`, guestLimit: true },
        { status: 429 }
      );
    }
    incrementGuestUsage(identifier);
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const orderJson = formData.get('order') as string;
    const order: number[] = orderJson ? JSON.parse(orderJson) : files.map((_, i) => i);

    if (!files || files.length < 2) {
      return NextResponse.json({ error: 'At least 2 PDFs required' }, { status: 400 });
    }
    if (files.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 PDFs allowed' }, { status: 400 });
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: `${file.name} is not a PDF` }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `${file.name} exceeds 100MB limit` }, { status: 400 });
      }
    }

    const orderedFiles = order.map((i) => files[i]);
    const buffers = await Promise.all(orderedFiles.map(async (f) => Buffer.from(await f.arrayBuffer())));
    const mergedBuffer = await mergePDFs(buffers);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_merge', { fileCount: files.length });
    }

    // Return the merged PDF as a direct binary download
    return new Response(new Uint8Array(mergedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="merged-${Date.now()}.pdf"`,
        'Content-Length': String(mergedBuffer.length),
        'X-File-Size': String(mergedBuffer.length),
      },
    });
  } catch (error) {
    console.error('PDF merge error:', error);
    return NextResponse.json({ error: 'Failed to merge PDFs' }, { status: 500 });
  }
}
