// src/app/api/pdf/image-to-pdf/route.ts — PUBLIC
// Returns the generated PDF as a direct binary download (no Cloudinary required).
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

    // Import pdf-lib once
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();

    // Process images sequentially to avoid loading all into memory at once.
    // Each buffer is released (GC-eligible) after it is embedded into the document.
    for (const file of orderedFiles) {
      try {
        let buffer = Buffer.from(await file.arrayBuffer());
        let mimeType = file.type;

        // Convert WebP to JPEG because pdf-lib does not support WebP natively
        if (mimeType === 'image/webp' && sharp) {
          buffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
          mimeType = 'image/jpeg';
        }

        // For very large images, down-scale to at most 4000px on the longest side
        // to prevent OOM. This only applies when sharp is available.
        if (sharp && (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/png')) {
          const meta = await sharp(buffer).metadata();
          const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
          if (longest > 4000) {
            buffer = await sharp(buffer)
              .resize({ width: 4000, height: 4000, fit: 'inside', withoutEnlargement: true })
              .toBuffer();
          }
        }

        let image;
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
          image = await doc.embedJpg(buffer);
        } else if (mimeType === 'image/png') {
          image = await doc.embedPng(buffer);
        } else {
          continue; // Skip unsupported types
        }

        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      } catch (e) {
        console.error(`Image to PDF — error embedding ${file.name}:`, e);
        // Continue with remaining images instead of failing the whole batch
      }
    }

    const pdfBuffer = Buffer.from(await doc.save());

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
  } catch (error: any) {
    console.error('Image to PDF error:', error?.message || error);
    console.error('Image to PDF stack:', error?.stack);
    return NextResponse.json({
      error: error?.message || 'Failed to convert images to PDF',
    }, { status: 500 });
  }
}
