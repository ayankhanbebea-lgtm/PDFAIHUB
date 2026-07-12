// src/app/api/pdf/powerpoint-to-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { convertToPDF } from '@/lib/office-converter';
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
  const uploadStart = performance.now();
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

    if (!file || (!file.name.endsWith('.pptx') && !file.name.endsWith('.ppt'))) {
      return NextResponse.json({ error: 'Valid PowerPoint presentation (.ppt or .pptx) required' }, { status: 400 });
    }

    const hasExternalEngine = !!(process.env.CONVERTAPI_SECRET || process.env.CONVERSION_BACKEND_URL);

    // Ensure conversion engine status is loaded
    let status = getConverterStatus();
    if (!status || (status.libreOfficeStatus === 'MISSING' && !status.powerpointCOMReady)) {
      status = await initConversionEngine(true);
    }

    if (!hasExternalEngine && status.libreOfficeStatus === 'MISSING' && !status.powerpointCOMReady) {
      return NextResponse.json({
        error: 'PowerPoint conversion engine is not available. Please verify Microsoft PowerPoint or LibreOffice is installed on the server host.',
        logs: status.errorLogs
      }, { status: 503 });
    }

    // Create unique temp directory
    const tempDir = path.join(os.tmpdir(), `pdfai-ppt-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    tempDirs.push(tempDir);

    const inputPath = path.join(tempDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    tempFiles.push(inputPath);

    const uploadDuration = Math.round(performance.now() - uploadStart);

    // Convert PPT to PDF using LibreOffice / COM
    const conversionStart = performance.now();
    const pdfPath = await convertToPDF(inputPath, tempDir);
    tempFiles.push(pdfPath);
    const conversionDuration = Math.round(performance.now() - conversionStart);

    // PDF Generation / Save / Read Buffer
    const generationStart = performance.now();
    const pdfBuffer = fs.readFileSync(pdfPath);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'powerpoint_to_pdf', { fileName: file.name });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `${file.name.replace(/\.(ppt|pptx)$/i, '')}-converted.pdf`,
          originalName: file.name,
          size: file.size,
          mimeType: 'application/pdf',
          url: 'local',
          tool: 'powerpoint-to-pdf',
          status: 'COMPLETED',
          resultSize: pdfBuffer.length,
        },
      });
    }

    const pdfGenerationDuration = Math.round(performance.now() - generationStart);

    // PrintTimingLogs
    console.log(`[powerpoint-to-pdf] Timings:
    - Upload: ${uploadDuration}ms
    - Conversion: ${conversionDuration}ms
    - PDF Generation & Save: ${pdfGenerationDuration}ms`);

    const outputName = `${file.name.replace(/\.(ppt|pptx)$/i, '')}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pdfBuffer.length),
        'X-File-Size': String(pdfBuffer.length),
        'X-Upload-Time': `${uploadDuration}ms`,
        'X-Conversion-Time': `${conversionDuration}ms`,
        'X-Generation-Time': `${pdfGenerationDuration}ms`,
      },
    });
  } catch (error: any) {
    console.error('PowerPoint to PDF error:', error);
    return NextResponse.json({ error: error.message || 'Failed to convert PowerPoint to PDF' }, { status: 500 });
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
