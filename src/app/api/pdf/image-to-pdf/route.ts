// src/app/api/pdf/image-to-pdf/route.ts — PUBLIC
// Returns the generated PDF as a direct binary download (no Cloudinary required).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { imagesToPDF } from '@/lib/pdf';
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
    const files = formData.getAll('files') as File[];
    const orderJson = formData.get('order') as string;
    const order: number[] = orderJson ? JSON.parse(orderJson) : files.map((_, i) => i);

    if (!files?.length) return NextResponse.json({ error: 'At least one image required' }, { status: 400 });

    const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) {
        return NextResponse.json({ error: `${file.name} is not a supported image format` }, { status: 400 });
      }
    }

    const orderedFiles = order.map((i) => files[i]);
    let sharp: any;
    try { sharp = (await import('sharp')).default; } catch {}

    const imageBuffers: Array<{ buffer: Buffer; mimeType: string }> = [];
    const batchSize = 8;
    for (let i = 0; i < orderedFiles.length; i += batchSize) {
      const batch = orderedFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          let buffer = Buffer.from(await file.arrayBuffer());
          if (file.type === 'image/webp' && sharp) {
            buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
            return { buffer, mimeType: 'image/jpeg' };
          }
          return { buffer, mimeType: file.type };
        })
      );
      imageBuffers.push(...batchResults);
    }

    const pdfBuffer = await imagesToPDF(imageBuffers);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'image_to_pdf', { imageCount: files.length });
    }

    const outputName = `images-${Date.now()}.pdf`;

    // Return the PDF as a direct binary download
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pdfBuffer.length),
        'X-File-Size': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('Image to PDF error:', error);
    return NextResponse.json({ error: 'Failed to convert images to PDF' }, { status: 500 });
  }
}
