// src/app/api/pdf/pdf-to-jpg/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pdfToImages } from '@/lib/office-converter';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const runtime = 'nodejs';
export const maxDuration = 90;

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

    // Create unique temp directory
    const tempDir = path.join(os.tmpdir(), `pdfai-jpg-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    tempDirs.push(tempDir);

    const inputPath = path.join(tempDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(inputPath, buffer);
    tempFiles.push(inputPath);

    // Convert PDF pages to JPG
    const jpgPaths = await pdfToImages(inputPath, tempDir);
    
    if (jpgPaths.length === 0) {
      throw new Error('No pages could be extracted from this PDF.');
    }

    let responseBuffer: Buffer;
    let contentType: string;
    let outputName: string;

    if (jpgPaths.length === 1) {
      // Single page PDF - return JPG directly
      responseBuffer = fs.readFileSync(jpgPaths[0]);
      contentType = 'image/jpeg';
      outputName = `${file.name.replace(/\.pdf$/i, '')}-page1.jpg`;
    } else {
      // Multiple pages - compress into a zip archive
      const zipPath = path.join(tempDir, 'pages.zip');
      // Escape paths for powershell
      const command = `powershell -Command "Compress-Archive -Path '${tempDir}\\*.jpg' -DestinationPath '${zipPath}'"`;
      console.log(`[pdf-to-jpg] Zipping pages: ${command}`);
      await execPromise(command);

      if (!fs.existsSync(zipPath)) {
        throw new Error('Failed to package extracted pages into a zip archive.');
      }

      responseBuffer = fs.readFileSync(zipPath);
      contentType = 'application/zip';
      outputName = `${file.name.replace(/\.pdf$/i, '')}-jpg-pages.zip`;
      tempFiles.push(zipPath);
    }

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_to_jpg', { fileName: file.name, pages: jpgPaths.length });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: outputName,
          originalName: file.name,
          size: file.size,
          mimeType: contentType,
          url: 'local',
          tool: 'pdf-to-jpg',
          status: 'COMPLETED',
          resultSize: responseBuffer.length,
        },
      });
    }

    return new Response(new Uint8Array(responseBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(responseBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('PDF to JPG error:', error);
    return NextResponse.json({ error: error.message || 'Failed to convert PDF to JPG' }, { status: 500 });
  } finally {
    // Cleanup temporary files
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
    for (const d of tempDirs) {
      try {
        // Remove entire directory and remaining jpgs
        if (fs.existsSync(d)) {
          fs.readdirSync(d).forEach(file => {
            try { fs.unlinkSync(path.join(d, file)); } catch {}
          });
          fs.rmdirSync(d);
        }
      } catch {}
    }
  }
}
