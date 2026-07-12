// src/app/api/pdf/word-to-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { convertToPDF, getSofficePath, docxToPDF } from '@/lib/office-converter';
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

    if (!file || (!file.name.endsWith('.docx') && !file.name.endsWith('.doc'))) {
      return NextResponse.json({ error: 'Valid Word document (.doc or .docx) required' }, { status: 400 });
    }

    // Create unique temp directory
    const tempDir = path.join(os.tmpdir(), `pdfai-word-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    tempDirs.push(tempDir);

    const inputPath = path.join(tempDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    tempFiles.push(inputPath);

    let pdfPath = path.join(tempDir, `${file.name.replace(/\.(doc|docx)$/i, '')}.pdf`);
    
    const sofficePath = getSofficePath();
    const hasExternalEngine = !!(process.env.CONVERTAPI_SECRET || process.env.CONVERSION_BACKEND_URL);

    if (sofficePath || hasExternalEngine) {
      // Convert Word doc to PDF using LibreOffice or External Engine
      pdfPath = await convertToPDF(inputPath, tempDir);
    } else {
      // Use Mammoth pure-JS fallback for DOCX
      if (file.name.endsWith('.docx')) {
        await docxToPDF(inputPath, pdfPath);
      } else {
        return NextResponse.json({ error: 'LibreOffice engine is not installed on this server. Conversion of legacy .doc files requires LibreOffice. Please upload a modern .docx file instead.' }, { status: 503 });
      }
    }
    
    tempFiles.push(pdfPath);
    const pdfBuffer = fs.readFileSync(pdfPath);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'word_to_pdf', { fileName: file.name });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `${file.name.replace(/\.(doc|docx)$/i, '')}-converted.pdf`,
          originalName: file.name,
          size: file.size,
          mimeType: 'application/pdf',
          url: 'local',
          tool: 'word-to-pdf',
          status: 'COMPLETED',
          resultSize: pdfBuffer.length,
        },
      });
    }

    const outputName = `${file.name.replace(/\.(doc|docx)$/i, '')}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('Word to PDF error:', error);
    return NextResponse.json({ error: error.message || 'Failed to convert Word to PDF' }, { status: 500 });
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
