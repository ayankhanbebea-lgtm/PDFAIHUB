// src/app/api/pdf/pdf-to-excel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { convertTextToExcelHTML } from '@/lib/office-converter';
import { extractTextFromPDF } from '@/lib/pdf-ai';
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
    const file = formData.get('file') as File;

    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Valid PDF document required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extract plain text from PDF
    const text = await extractTextFromPDF(buffer);

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Could not extract text or table structures from this PDF.' }, { status: 400 });
    }

    // Convert text lines to Excel-compatible HTML table structure
    const xlsContent = convertTextToExcelHTML(text);
    const xlsBuffer = Buffer.from(xlsContent, 'utf-8');

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_to_excel', { fileName: file.name });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `${file.name.replace(/\.pdf$/i, '')}-converted.xls`,
          originalName: file.name,
          size: file.size,
          mimeType: 'application/vnd.ms-excel',
          url: 'local',
          tool: 'pdf-to-excel',
          status: 'COMPLETED',
          resultSize: xlsBuffer.length,
        },
      });
    }

    const outputName = `${file.name.replace(/\.pdf$/i, '')}.xls`;

    return new Response(new Uint8Array(xlsBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(xlsBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('PDF to Excel error:', error);
    return NextResponse.json({ error: error.message || 'Failed to convert PDF to Excel' }, { status: 500 });
  }
}
