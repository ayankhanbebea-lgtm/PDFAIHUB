// src/app/api/pdf/protect/route.ts — PUBLIC
// ─────────────────────────────────────────────────────────────
// Real PDF encryption using RC4-128 (PDF 1.4 Standard Security Handler).
// The output PDF requires a password to open in any PDF reader.
// Returns the protected/unlocked PDF as a direct binary download.
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';
import { encryptPDF, decryptPDF } from '@/lib/pdf-encrypt';

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
      return NextResponse.json({ error: `Free limit reached (${check.limit}/day).`, guestLimit: true }, { status: 429 });
    }
    incrementGuestUsage(id);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as 'add' | 'remove';
    const password = (formData.get('password') as string || '').trim();
    const ownerPassword = (formData.get('ownerPassword') as string || '').trim();

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }
    if (mode === 'add' && !password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let resultBuffer: Buffer;
    let outputName: string;

    if (mode === 'add') {
      // ── Real RC4-128 encryption ──────────────────────────────────────
      const result = await encryptPDF(
        buffer,
        password,
        ownerPassword || undefined,
        // Permissions: allow printing and reading, disallow modification/copy
        -3904
      );

      if (!result.encrypted) {
        console.error('[protect] Encryption failed:', result.error);
        return NextResponse.json(
          { error: `Failed to encrypt PDF: ${result.error || 'Unknown error'}` },
          { status: 500 }
        );
      }

      resultBuffer = result.buffer;
      outputName = `protected-${file.name}`;

      if (session?.user?.id) {
        await incrementUsage(session.user.id, 'pdf');
        await logUsage(session.user.id, 'pdf_protect', { mode: 'add' });
      }
    } else {
      // ── Decrypt / remove password ────────────────────────────────────
      resultBuffer = await decryptPDF(buffer, password);
      outputName = `unlocked-${file.name}`;

      if (session?.user?.id) {
        await incrementUsage(session.user.id, 'pdf');
        await logUsage(session.user.id, 'pdf_protect', { mode: 'remove' });
      }
    }

    return new Response(new Uint8Array(resultBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(resultBuffer.length),
        'X-Encryption-Applied': mode === 'add' ? 'RC4-128' : 'none',
      },
    });
  } catch (error) {
    console.error('[protect] Error:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
