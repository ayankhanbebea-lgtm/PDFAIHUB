// src/lib/office-converter.ts
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import mammoth from 'mammoth';

const execPromise = promisify(exec);

/**
 * Dynamically resolves the absolute path of the soffice.exe executable on Windows.
 */
export function getSofficePath(): string | null {
  const standardPaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ];
  for (const p of standardPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Returns the command prefix for soffice.
 */
export function getSofficeCmd(): string {
  const path = getSofficePath();
  return path ? `"${path}"` : 'soffice';
}

/**
 * Converts any supported Office document (Word, PowerPoint, Excel) to PDF using LibreOffice.
 */
export async function convertToPDF(inputPath: string, outDir: string): Promise<string> {
  const cmd = getSofficeCmd();
  const command = `${cmd} --headless --convert-to pdf --outdir "${outDir}" "${inputPath}"`;
  console.log(`[convertToPDF] Executing: ${command}`);
  await execPromise(command);

  // The output file name matches the input but has a .pdf extension
  const inputBasename = path.basename(inputPath, path.extname(inputPath));
  const expectedPdfPath = path.join(outDir, `${inputBasename}.pdf`);

  if (!fs.existsSync(expectedPdfPath)) {
    throw new Error('Office to PDF conversion failed. Output PDF file was not generated.');
  }

  return expectedPdfPath;
}

/**
 * Converts an HTML file to PDF using mutool.
 */
export async function htmlToPDF(htmlPath: string, outPdfPath: string): Promise<void> {
  const command = `mutool convert -o "${outPdfPath}" "${htmlPath}"`;
  console.log(`[htmlToPDF] Executing: ${command}`);
  await execPromise(command);

  if (!fs.existsSync(outPdfPath)) {
    throw new Error('HTML to PDF conversion failed. Output PDF file was not generated.');
  }
}

/**
 * Renders all pages of a PDF into JPG images.
 */
export async function pdfToImages(pdfPath: string, outDir: string): Promise<string[]> {
  const outputPattern = path.join(outDir, 'page-%d.png');
  const command = `mutool convert -o "${outputPattern}" "${pdfPath}"`;
  console.log(`[pdfToImages] Executing: ${command}`);
  await execPromise(command);

  const files = fs.readdirSync(outDir);
  const pngFiles = files
    .filter(f => f.startsWith('page-') && f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('page-', '').replace('.png', ''));
      const numB = parseInt(b.replace('page-', '').replace('.png', ''));
      return numA - numB;
    });

  const sharp = (await import('sharp')).default;
  const jpgPaths: string[] = [];

  for (const pngFile of pngFiles) {
    const pngPath = path.join(outDir, pngFile);
    const jpgFile = pngFile.replace('.png', '.jpg');
    const jpgPath = path.join(outDir, jpgFile);

    // Convert PNG to JPG
    await sharp(pngPath).jpeg({ quality: 90 }).toFile(jpgPath);
    jpgPaths.push(jpgPath);

    // Clean up temporary PNG file
    try {
      fs.unlinkSync(pngPath);
    } catch {}
  }

  return jpgPaths;
}

/**
 * Converts a PDF file to PowerPoint (PPTX) using LibreOffice Draw's headless export.
 */
export async function pdfToPPTX(pdfPath: string, outDir: string): Promise<string> {
  const cmd = getSofficeCmd();
  const command = `${cmd} --headless --convert-to pptx --outdir "${outDir}" "${pdfPath}"`;
  console.log(`[pdfToPPTX] Executing: ${command}`);
  await execPromise(command);

  const inputBasename = path.basename(pdfPath, path.extname(pdfPath));
  const expectedPptxPath = path.join(outDir, `${inputBasename}.pptx`);

  if (!fs.existsSync(expectedPptxPath)) {
    throw new Error('PDF to PPTX conversion failed. Output PPTX file not found.');
  }

  return expectedPptxPath;
}

/**
 * Converts a PDF file to PDF/A archive standard format using LibreOffice's writer_pdf_Export filter.
 */
export async function pdfToPDFA(pdfPath: string, outDir: string): Promise<string> {
  const cmd = getSofficeCmd();
  const command = `${cmd} --headless --convert-to pdf:writer_pdf_Export --outdir "${outDir}" "${pdfPath}"`;
  console.log(`[pdfToPDFA] Executing: ${command}`);
  await execPromise(command);

  const inputBasename = path.basename(pdfPath, path.extname(pdfPath));
  const expectedPdfPath = path.join(outDir, `${inputBasename}.pdf`);

  if (!fs.existsSync(expectedPdfPath)) {
    throw new Error('PDF to PDF/A conversion failed. Output PDF file not found.');
  }

  return expectedPdfPath;
}

/**
 * Helper to build an HTML table XLS file from extracted PDF text content.
 */
export function convertTextToExcelHTML(text: string): string {
  const lines = text.split('\n');
  let html = '<html><head><meta charset="utf-8"></head><body><table border="1">';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split by multiple spaces
    const cells = trimmed.split(/\s{2,}/);
    html += '<tr>';
    for (const cell of cells) {
      html += `<td>${escapeHtml(cell)}</td>`;
    }
    html += '</tr>';
  }

  html += '</table></body></html>';
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Fallback converter: Converts DOCX to PDF using mammoth (pure JS) and mutool (clean HTML-to-PDF).
 */
export async function docxToPDF(docxPath: string, outPdfPath: string): Promise<void> {
  const result = await mammoth.convertToHtml({ path: docxPath });
  const htmlContent = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; line-height: 1.6; color: #1f2937; }
        h1, h2, h3 { color: #111827; margin-top: 1.5em; margin-bottom: 0.5em; }
        p { margin-bottom: 1em; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
        th { background-color: #f9fafb; font-weight: 600; }
        ul, ol { padding-left: 20px; margin-bottom: 1em; }
        li { margin-bottom: 0.5em; }
      </style>
    </head>
    <body>
      ${result.value}
    </body>
    </html>
  `;
  const tempHtmlPath = docxPath.replace(/\.docx$/i, '.html');
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');
  
  try {
    await htmlToPDF(tempHtmlPath, outPdfPath);
  } finally {
    try {
      if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
    } catch {}
  }
}

