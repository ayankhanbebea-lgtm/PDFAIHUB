// src/app/api/pdf/unlock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { decryptPDF } from '@/lib/pdf-encrypt';
import { incrementUsage, logUsage } from '@/lib/rate-limit';
import { priorityScheduler } from '@/lib/priority-queue';
import { PDFDocument, PDFRawStream, PDFName } from 'pdf-lib';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function isPDFEncrypted(buffer: Buffer): Promise<boolean> {
  try {
    // If pdf-lib loads it without throwing, it is not encrypted
    await PDFDocument.load(buffer, { ignoreEncryption: false });
    return false;
  } catch (err: any) {
    const msg = err.message?.toLowerCase() || '';
    if (msg.includes('encrypt') || msg.includes('password') || msg.includes('decrypt')) {
      return true;
    }
    return false;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Strict backend Pro gating
  const activeSub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
  });

  const now = new Date();
  if (!activeSub || activeSub.currentPeriodEnd < now) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
  }

  let file: File | null = null;

  try {
    const formData = await request.formData();
    file = formData.get('file') as File;
    const password = (formData.get('password') as string || '').trim();

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Check if PDF is encrypted
    const encrypted = await isPDFEncrypted(buffer);

    if (!encrypted) {
      return NextResponse.json(
        { error: 'This PDF does not require unlocking because it is not password protected or encrypted.' },
        { status: 400 }
      );
    }

    // 2. Required password input check
    if (!password) {
      return NextResponse.json(
        { error: 'This PDF is encrypted. Please enter the correct password to unlock it.' },
        { status: 400 }
      );
    }

    const startTime = performance.now();

    // 3. Process decryption in priority scheduler
    try {
      const resultBuffer = await priorityScheduler.enqueue(async () => {
        return decryptPDF(buffer, password);
      }, true);

      const processingTime = Math.round(performance.now() - startTime);
      
      let version = 'unknown';
      const header = resultBuffer.toString('utf8', 0, 8);
      if (header.startsWith('%PDF-')) {
        version = header.substring(5, 8);
      }

      let pageCount = 0;
      let imgCount = 0;
      try {
        const doc = await PDFDocument.load(resultBuffer, { ignoreEncryption: true });
        pageCount = doc.getPageCount();
        const objects = (doc as any).context.enumerateIndirectObjects();
        for (const [ref, pdfObject] of objects) {
          if (pdfObject instanceof PDFRawStream) {
            const subtype = pdfObject.dict.get(PDFName.of('Subtype'));
            if (subtype && subtype.toString() === '/Image') {
              imgCount++;
            }
          }
        }
      } catch (logErr) {
        console.warn('[unlock-diagnostics] failed to parse decrypted PDF:', logErr);
      }

      console.log(`[Diagnostic Log - PDF Unlock]
  - Uploaded File Name: ${file.name}
  - Uploaded File Type: ${file.type}
  - PDF Version: ${version}
  - Pages: ${pageCount}
  - Embedded Images: ${imgCount}
  - Encryption Status: Decrypted successfully
  - Library Used: muhammara (recrypt)
  - Processing Time: ${processingTime}ms
      `);

      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_unlock', { fileName: file.name, encrypted: true });
      await prisma.file.create({
        data: {
          userId: session.user.id,
          name: `unlocked-${file.name}`,
          originalName: file.name,
          size: buffer.length,
          mimeType: 'application/pdf',
          url: 'local',
          tool: 'unlock',
          status: 'COMPLETED',
          resultSize: resultBuffer.length,
        },
      });

      return new Response(new Uint8Array(resultBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="unlocked-${file.name}"`,
          'Content-Length': String(resultBuffer.length),
        },
      });
    } catch (err: any) {
      const processingTime = Math.round(performance.now() - startTime);
      console.error(`[Diagnostic Log - PDF Unlock FAIL]
  - Uploaded File Name: ${file.name}
  - Uploaded File Type: ${file.type}
  - Encryption Status: Encrypted
  - Processing Time: ${processingTime}ms
  - Exact Exception: ${err.message || String(err)}
      `);
      return NextResponse.json(
        { error: 'Incorrect password. Verification failed.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[unlock] error:', error);
    return NextResponse.json({ error: error.message || 'Unlock operation failed' }, { status: 500 });
  }
}
