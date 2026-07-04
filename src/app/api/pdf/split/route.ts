// src/app/api/pdf/split/route.ts — PUBLIC
// Returns each split PDF as a base64-encoded string in JSON (no Cloudinary required).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { splitPDF } from '@/lib/pdf';
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
    const id = getGuestIdentifier(request);
    const check = checkGuestLimit(id);
    if (!check.allowed) {
      return NextResponse.json({ error: `Free limit reached (${check.limit}/day). Sign up for more.`, guestLimit: true }, { status: 429 });
    }
    incrementGuestUsage(id);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rangesJson = formData.get('ranges') as string;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }
    const ranges = JSON.parse(rangesJson) as Array<{ start: number; end: number; name?: string }>;
    if (!ranges?.length) return NextResponse.json({ error: 'Page ranges required' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const splits = await splitPDF(buffer, ranges);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_split', { splitCount: splits.length });
    }

    // Return each split as a base64 data URI so the browser can download without Cloudinary
    const results = splits.map((split) => ({
      name: split.name,
      pageCount: split.pageCount,
      size: split.buffer.length,
      // data URI the frontend can use directly as an <a href> download
      dataUrl: `data:application/pdf;base64,${split.buffer.toString('base64')}`,
    }));

    return NextResponse.json({ success: true, files: results });
  } catch (error) {
    console.error('Split error:', error);
    return NextResponse.json({ error: 'Failed to split PDF' }, { status: 500 });
  }
}
