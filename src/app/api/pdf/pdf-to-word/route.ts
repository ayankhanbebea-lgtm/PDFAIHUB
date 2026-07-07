// src/app/api/pdf/pdf-to-word/route.ts — PUBLIC
// ─────────────────────────────────────────────────────────────
// Standard PDF tool — converts PDF to editable Word (.docx).
// Returns the DOCX as a direct binary download (no Cloudinary required).
// Handles scanned/image-based PDFs gracefully — never returns a 400 error.
// Does NOT call any AI/OCR pipeline.
// ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkUsage, incrementUsage, logUsage } from '@/lib/rate-limit';
import { getGuestIdentifier, checkGuestLimit, incrementGuestUsage } from '@/lib/guest-limit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { priorityScheduler } from '@/lib/priority-queue';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Extracts selectable text from a PDF buffer.
 * Returns empty string instead of throwing — never blocks conversion.
 */
async function safeExtractText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer, { max: 0 });
    return data.text || '';
  } catch {
    return '';
  }
}

/**
 * Builds a DOCX document from extracted text lines.
 */
function buildDocxFromText(text: string, title: string): Document {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isHeading =
      trimmed.length < 80 &&
      (trimmed === trimmed.toUpperCase() ||
        (/^[A-Z]/.test(trimmed) && !trimmed.endsWith('.') && trimmed.split(' ').length < 8));

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: trimmed,
            size: isHeading ? 28 : 22,
            bold: isHeading,
            font: 'Calibri',
          }),
        ],
        heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
        spacing: { after: isHeading ? 200 : 120, before: isHeading ? 300 : 0 },
      })
    );
  }

  return new Document({
    creator: 'PDFAI Hub',
    title,
    sections: [{ properties: {}, children: paragraphs }],
  });
}

/**
 * Builds a placeholder DOCX for scanned/image-based PDFs.
 */
function buildScannedFallbackDocx(title: string): Document {
  return new Document({
    creator: 'PDFAI Hub',
    title,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '⚠️ This PDF appears to be image-based or scanned.',
                bold: true,
                size: 24,
                font: 'Calibri',
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  'The PDF you uploaded does not contain selectable text — it is likely a scanned document ' +
                  'or an image-only PDF. Text-based conversion was not possible for this file.',
                size: 22,
                font: 'Calibri',
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'To extract text from a scanned PDF, please use the AI OCR or AI Summarize feature instead.',
                size: 22,
                font: 'Calibri',
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

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
      return NextResponse.json(
        { error: `Free limit reached (${check.limit}/day). Sign up for more.`, guestLimit: true },
        { status: 429 }
      );
    }
    incrementGuestUsage(id);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Valid PDF required' }, { status: 400 });
    }
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const baseTitle = file.name.replace(/\.pdf$/i, '');
    const outputName = baseTitle + '.docx';

    const isPro = session?.user?.plan === 'PRO';

    const { docxBuffer, hasText } = await priorityScheduler.enqueue(async () => {
      // Attempt text extraction — never throws, returns '' for scanned PDFs
      const text = await safeExtractText(buffer);
      const hasText = text.trim().length >= 10;

      // Build DOCX: rich content for text PDFs, informative placeholder for scanned ones
      const doc = hasText ? buildDocxFromText(text, baseTitle) : buildScannedFallbackDocx(baseTitle);
      const docxBuffer = await Packer.toBuffer(doc);
      return { docxBuffer, hasText };
    }, isPro);

    if (session?.user?.id) {
      await incrementUsage(session.user.id, 'pdf');
      await logUsage(session.user.id, 'pdf_to_word', { hasText });
    }

    // Return the DOCX as a direct binary download
    return new Response(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'Content-Length': String(docxBuffer.length),
        // Soft signal for the frontend — not an error
        'X-Has-Selectable-Text': String(hasText),
      },
    });
  } catch (error) {
    console.error('PDF to Word error:', error);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
