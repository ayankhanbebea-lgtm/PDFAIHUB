// src/app/api/pdf/pdf-to-powerpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pdfToPPTX } from '@/lib/office-converter';
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
    console.log('[PDF to PowerPoint] Step 1: Upload received');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || !file.name.endsWith('.pdf')) {
      console.error('[PDF to PowerPoint] Error: Valid PDF document required');
      return NextResponse.json({ error: 'Valid PDF document required' }, { status: 400 });
    }

    console.log(`[PDF to PowerPoint] File details: Name=${file.name}, Size=${file.size} bytes`);

    // Ensure conversion engine status is loaded (keeps self-tests / diagnostics running)
    console.log('[PDF to PowerPoint] Step 2: Verifying conversion engine status');
    let status = getConverterStatus();
    if (!status) {
      console.log('[PDF to PowerPoint] Engine status not cached. Initializing...');
      status = await initConversionEngine();
    }

    // Create unique temp directory
    const tempDir = path.join(os.tmpdir(), `pdfai-pptx-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    console.log(`[PDF to PowerPoint] Step 3: Creating temp directory: ${tempDir}`);
    fs.mkdirSync(tempDir, { recursive: true });
    tempDirs.push(tempDir);

    const inputPath = path.join(tempDir, file.name);
    console.log(`[PDF to PowerPoint] Step 4: Saving upload to temp path: ${inputPath}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    tempFiles.push(inputPath);
    console.log('[PDF to PowerPoint] File saved to disk successfully.');

    // Convert PDF to PPTX using LibreOffice Draw or COM Fallback
    console.log('[PDF to PowerPoint] Step 5: Invoking pdfToPPTX...');
    const pptxPath = await pdfToPPTX(inputPath, tempDir);
    tempFiles.push(pptxPath);
    console.log(`[PDF to PowerPoint] pdfToPPTX returned output path: ${pptxPath}`);

    if (!fs.existsSync(pptxPath) || fs.statSync(pptxPath).size === 0) {
      console.error('[PDF to PowerPoint] Error: Converted PPTX is missing or empty on disk.');
      throw new Error('PDF to PowerPoint conversion failed. Converted file is empty or missing.');
    }

    const pptxSize = fs.statSync(pptxPath).size;
    console.log(`[PDF to PowerPoint] Step 6: Generated PPTX successfully. Size: ${pptxSize} bytes`);
    const pptxBuffer = fs.readFileSync(pptxPath);

    if (session?.user?.id) {
      console.log(`[PDF to PowerPoint] Step 7: Saving to user history database for user ID: ${session.user.id}`);
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_to_powerpoint', { fileName: file.name });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `${file.name.replace(/\.pdf$/i, '')}-converted.pptx`,
          originalName: file.name,
          size: file.size,
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          url: 'local',
          tool: 'pdf-to-powerpoint',
          status: 'COMPLETED',
          resultSize: pptxBuffer.length,
        },
      });
    }

    const outputName = `${file.name.replace(/\.pdf$/i, '')}.pptx`;
    console.log(`[PDF to PowerPoint] Step 8: Sending response back to client: ${outputName}`);

    return new Response(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pptxBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('[PDF to PowerPoint] ERROR:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to convert PDF to PowerPoint' }, { status: 500 });
  } finally {
    console.log('[PDF to PowerPoint] Step 9: Cleaning up temporary directories and files');
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
          console.log(`[PDF to PowerPoint] Deleted temp file: ${f}`);
        }
      } catch {}
    }
    for (const d of tempDirs) {
      try {
        if (fs.existsSync(d)) {
          fs.rmdirSync(d);
          console.log(`[PDF to PowerPoint] Deleted temp directory: ${d}`);
        }
      } catch {}
    }
  }
}
