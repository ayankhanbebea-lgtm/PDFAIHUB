// src/app/api/pdf/pdf-to-pdfa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pdfToPDFA } from '@/lib/office-converter';
import { initConversionEngine, getConverterStatus } from '@/lib/converter-init';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

  const tempFiles: string[] = [];
  const tempDirs: string[] = [];

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Valid PDF document required' }, { status: 400 });
    }

    const hasExternalEngine = !!(process.env.CONVERTAPI_SECRET || process.env.CONVERSION_BACKEND_URL);

    // Ensure conversion engine status is loaded
    let status = getConverterStatus();
    if (!status || status.libreOfficeStatus === 'MISSING') {
      status = await initConversionEngine(true);
    }

    if (!hasExternalEngine && status.libreOfficeStatus === 'MISSING') {
      return NextResponse.json({
        error: 'PDF/A conversion is temporarily unavailable. Please verify LibreOffice is installed on the server host.',
        logs: status.errorLogs
      }, { status: 503 });
    }

    // Create unique temp directory
    const tempDir = path.join(os.tmpdir(), `pdfai-pdfa-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    tempDirs.push(tempDir);

    const inputPath = path.join(tempDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    tempFiles.push(inputPath);

    // Convert PDF to PDF/A using LibreOffice
    const pdfaPath = await pdfToPDFA(inputPath, tempDir);
    tempFiles.push(pdfaPath);

    const pdfaBuffer = fs.readFileSync(pdfaPath);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_to_pdfa', { fileName: file.name });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `${file.name.replace(/\.pdf$/i, '')}-pdfa.pdf`,
          originalName: file.name,
          size: file.size,
          mimeType: 'application/pdf',
          url: 'local',
          tool: 'pdf-to-pdfa',
          status: 'COMPLETED',
          resultSize: pdfaBuffer.length,
        },
      });
    }

    const outputName = `${file.name.replace(/\.pdf$/i, '')}-pdfa.pdf`;

    return new Response(new Uint8Array(pdfaBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pdfaBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('PDF to PDF/A error:', error);
    return NextResponse.json({ error: error.message || 'Failed to convert PDF to PDF/A' }, { status: 500 });
  } finally {
    // Cleanup temporary files
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
    for (const d of tempDirs) {
      try {
        if (fs.existsSync(d)) fs.rmdirSync(d);
      } catch {}
    }
  }
}
