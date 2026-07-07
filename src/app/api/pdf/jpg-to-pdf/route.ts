// src/app/api/pdf/jpg-to-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { imagesToPDF } from '@/lib/pdf';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';
import prisma from '@/lib/prisma';

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

    if (!files?.length) return NextResponse.json({ error: 'At least one JPG image required' }, { status: 400 });

    const ACCEPTED = ['image/jpeg', 'image/jpg'];
    for (const file of files) {
      if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(jpg|jpeg)$/i)) {
        return NextResponse.json({ error: `${file.name} is not a supported JPG/JPEG image` }, { status: 400 });
      }
    }

    const orderedFiles = order.map((i) => files[i]);
    const imageBuffers = await Promise.all(
      orderedFiles.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return { buffer, mimeType: 'image/jpeg' };
      })
    );

    const pdfBuffer = await imagesToPDF(imageBuffers);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'jpg_to_pdf', { imageCount: files.length });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `jpg-converted-${Date.now()}.pdf`,
          originalName: files[0].name,
          size: files[0].size,
          mimeType: 'application/pdf',
          url: 'local',
          tool: 'jpg-to-pdf',
          status: 'COMPLETED',
          resultSize: pdfBuffer.length,
        },
      });
    }

    const outputName = `${files[0].name.replace(/\.(jpg|jpeg)$/i, '')}-converted.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('JPG to PDF error:', error);
    return NextResponse.json({ error: 'Failed to convert JPG to PDF' }, { status: 500 });
  }
}
