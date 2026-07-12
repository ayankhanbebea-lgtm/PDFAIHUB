import fs from 'fs';
import path from 'path';
import os from 'os';
import mammoth from 'mammoth';
import { initConversionEngine, getConverterStatus, runPowerShell, recordSuccess, recordError, execWithTimeout, executeSofficeHeadless } from './converter-init';

class TaskQueue {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }> = [];
  private active = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.active || this.queue.length === 0) return;
    this.active = true;

    const { fn, resolve, reject } = this.queue.shift()!;
    try {
      const res = await fn();
      resolve(res);
    } catch (err) {
      reject(err);
    } finally {
      this.active = false;
      this.processNext();
    }
  }
}

const globalConversionQueue = new TaskQueue();

// Automatically initialize the conversion engine during server startup (skip during next build phase)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  initConversionEngine()
    .then((status) => {
      console.log('[office-converter] Engine startup check completed successfully:', status);
    })
    .catch((err) => {
      console.error('[office-converter] Engine startup check failed:', err);
    });
}

/**
 * Converts a PowerPoint presentation to PDF using native Windows COM Automation.
 */
export async function convertPowerPointViaCOM(inputPath: string, outputPath: string): Promise<void> {
  const script = `
    $ppt = New-Object -ComObject PowerPoint.Application
    try {
      $pres = $ppt.Presentations.Open('${inputPath.replace(/\\/g, '\\\\')}', -1, -1, 0)
      $pres.SaveAs('${outputPath.replace(/\\/g, '\\\\')}', 32)
      $pres.Close()
    } finally {
      $ppt.Quit()
    }
  `;
  console.log(`[convertPowerPointViaCOM] Executing safe script...`);
  await runPowerShell(script);
}

/**
 * Converts an Excel spreadsheet to PDF using native Windows COM Automation.
 */
export async function convertExcelViaCOM(inputPath: string, outputPath: string): Promise<void> {
  const script = `
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    try {
      $wb = $excel.Workbooks.Open('${inputPath.replace(/\\/g, '\\\\')}')
      $wb.ExportAsFixedFormat(0, '${outputPath.replace(/\\/g, '\\\\')}')
      $wb.Close($false)
    } finally {
      $excel.Quit()
    }
  `;
  console.log(`[convertExcelViaCOM] Executing safe script...`);
  await runPowerShell(script);
}

/**
 * Converts a PDF file to a PowerPoint presentation (.pptx) using native Windows COM Automation.
 */
export async function convertPDFToPPTXViaCOM(pdfPath: string, outputPath: string): Promise<void> {
  const script = `
    $ppt = New-Object -ComObject PowerPoint.Application
    try {
      $pres = $ppt.Presentations.Open('${pdfPath.replace(/\\/g, '\\\\')}', -1, -1, 0)
      $pres.SaveAs('${outputPath.replace(/\\/g, '\\\\')}')
      $pres.Close()
    } finally {
      $ppt.Quit()
    }
  `;
  console.log(`[convertPDFToPPTXViaCOM] Executing safe script...`);
  await runPowerShell(script);
}


/**
 * Dynamically resolves the absolute path of the soffice.exe executable on Windows.
 */
export function getSofficePath(): string | null {
  const standardPaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    'C:\\Users\\ayank\\AppData\\Local\\Programs\\LibreOffice\\program\\soffice.exe',
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

export async function convertToPDF(inputPath: string, outDir: string): Promise<string> {
  return globalConversionQueue.enqueue(async () => {
    const inputExt = path.extname(inputPath).toLowerCase();
    const inputBasename = path.basename(inputPath, path.extname(inputPath));
    const expectedPdfPath = path.join(outDir, `${inputBasename}.pdf`);

    const sofficePath = getSofficePath();
    const status = getConverterStatus();

    console.log(`[convertToPDF] Converting: ${inputPath}. Ext: ${inputExt}. Soffice: ${sofficePath || 'none'}`);

    try {
      if (sofficePath) {
        const sharedProfile = path.join(os.tmpdir(), 'libreoffice-shared-profile');
        const userProfileArg = `-env:UserInstallation=file:///${sharedProfile.replace(/\\/g, '/')}`;
        const args = [
          userProfileArg,
          '--headless',
          '--invisible',
          '--nodefault',
          '--nofirststartwizard',
          '--nologo',
          '--convert-to',
          'pdf',
          '--outdir',
          outDir,
          inputPath
        ];
        await executeSofficeHeadless(sofficePath, args, 60000);
      } else {
        console.log(`[convertToPDF] LibreOffice is not installed. Using native conversion fallback...`);
        
        if (inputExt === '.pptx' || inputExt === '.ppt') {
          if (status?.powerpointCOMReady) {
            console.log(`[convertToPDF] Converting PowerPoint via COM Automation: ${inputPath}`);
            await convertPowerPointViaCOM(inputPath, expectedPdfPath);
          } else {
            throw new Error(
              'PowerPoint conversion failed: Neither LibreOffice nor Microsoft PowerPoint COM engine is installed on the host system.'
            );
          }
        } else if (inputExt === '.xlsx' || inputExt === '.xls') {
          if (status?.excelCOMReady) {
            console.log(`[convertToPDF] Converting Excel via COM Automation: ${inputPath}`);
            await convertExcelViaCOM(inputPath, expectedPdfPath);
          } else {
            throw new Error(
              'Excel conversion failed: Neither LibreOffice nor Microsoft Excel COM engine is installed on the host system.'
            );
          }
        } else if (inputExt === '.docx') {
          console.log(`[convertToPDF] Word document. Falling back to Mammoth pure JS parser...`);
          await docxToPDF(inputPath, expectedPdfPath);
        } else {
          throw new Error(
            `Unsupported conversion file type "${inputExt}" without LibreOffice installation.`
          );
        }
      }

      if (!fs.existsSync(expectedPdfPath) || fs.statSync(expectedPdfPath).size === 0) {
        throw new Error('Office to PDF conversion failed. The output PDF file was not generated or has a size of 0 bytes.');
      }

      recordSuccess();
      return expectedPdfPath;
    } catch (err: any) {
      recordError(err.message);
      throw err;
    }
  });
}

/**
 * Converts an HTML file to PDF using pure WASM MuPDF.
 */
export async function htmlToPDF(htmlPath: string, outPdfPath: string): Promise<void> {
  console.log(`[htmlToPDF] Converting via mupdf WASM: ${htmlPath} -> ${outPdfPath}`);
  
  // @ts-ignore
  const mupdf = await import('mupdf');
  
  const htmlBuffer = fs.readFileSync(htmlPath);
  const doc = mupdf.Document.openDocument(htmlBuffer, 'text/html');
  
  // Layout as A4 (595x842 points) at font size 12
  doc.layout(595, 842, 12);
  const pageCount = doc.countPages();
  
  const outBuf = new mupdf.Buffer();
  const writer = new mupdf.DocumentWriter(outBuf, 'pdf', '');
  
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const bounds = page.getBounds();
    const device = writer.beginPage(bounds);
    page.run(device, mupdf.Matrix.identity);
    writer.endPage();
  }
  
  writer.close();
  
  const finalBuf = Buffer.from(outBuf.asUint8Array());
  fs.writeFileSync(outPdfPath, finalBuf);
}

/**
 * Renders all pages of a PDF into JPG images using pure WASM MuPDF.
 */
export async function pdfToImages(pdfPath: string, outDir: string): Promise<string[]> {
  console.log(`[pdfToImages] Rendering via mupdf WASM: ${pdfPath}`);
  
  // @ts-ignore
  const mupdf = await import('mupdf');
  
  const pdfBuffer = fs.readFileSync(pdfPath);
  const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
  const pageCount = doc.countPages();
  
  const jpgPaths: string[] = [];
  
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    // Render the page to a pixmap at high-resolution (scale = 2)
    const scaleMatrix = mupdf.Matrix.scale(2, 2);
    const pixmap = page.toPixmap(scaleMatrix, mupdf.ColorSpace.DeviceRGB);
    
    // Save directly as JPEG
    const jpegBytes = pixmap.asJPEG(90);
    const jpgFile = `page-${i + 1}.jpg`;
    const jpgPath = path.join(outDir, jpgFile);
    
    fs.writeFileSync(jpgPath, Buffer.from(jpegBytes));
    jpgPaths.push(jpgPath);
  }
  
  return jpgPaths;
}

/**
 * Converts a PDF file to PowerPoint (PPTX) using LibreOffice Draw's headless export.
 */
export async function pdfToPPTX(pdfPath: string, outDir: string): Promise<string> {
  const inputBasename = path.basename(pdfPath, path.extname(pdfPath));
  const expectedPptxPath = path.join(outDir, `${inputBasename}.pptx`);

  console.log(`[pdfToPPTX] Redesigned Architecture: PDF -> Images -> PPTX`);
  
  const tempImgDir = path.join(outDir, `pdf-to-ppt-img-${Date.now()}`);
  fs.mkdirSync(tempImgDir, { recursive: true });

  try {
    // 1. Convert PDF pages to high-resolution JPG images using mutool + sharp
    console.log(`[pdfToPPTX] Rendering PDF pages to images...`);
    const imgPaths = await pdfToImages(pdfPath, tempImgDir);
    console.log(`[pdfToPPTX] Rendered ${imgPaths.length} pages.`);

    if (imgPaths.length === 0) {
      throw new Error('No pages could be rendered from the PDF file.');
    }

    // 2. Create PPTX presentation and place one image per slide
    console.log(`[pdfToPPTX] Generating PPTX slides via pptxgenjs...`);
    const pptxgen = (await import('pptxgenjs')).default;
    const pptx = new pptxgen();

    for (const imgPath of imgPaths) {
      const slide = pptx.addSlide();
      
      // Place image spanning the entire slide area to preserve aspect ratio / cover page size
      slide.addImage({
        path: imgPath,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
      });
    }

    // 3. Save the presentation
    console.log(`[pdfToPPTX] Writing PPTX file to: ${expectedPptxPath}`);
    await pptx.writeFile({ fileName: expectedPptxPath });
    console.log(`[pdfToPPTX] PPTX generated successfully. Size: ${fs.statSync(expectedPptxPath).size} bytes`);

    recordSuccess();
    return expectedPptxPath;
  } catch (err: any) {
    console.error(`[pdfToPPTX] Error during conversion: ${err.message}`);
    recordError(err.message);
    throw err;
  } finally {
    // Clean up temporary image directory and files
    try {
      fs.rmSync(tempImgDir, { recursive: true, force: true });
    } catch {}
  }
}

export async function pdfToPDFA(pdfPath: string, outDir: string): Promise<string> {
  return globalConversionQueue.enqueue(async () => {
    const sofficePath = getSofficePath();
    const inputBasename = path.basename(pdfPath, path.extname(pdfPath));
    const expectedPdfPath = path.join(outDir, `${inputBasename}.pdf`);

    try {
      if (!sofficePath) {
        throw new Error('PDF to PDF/A conversion failed: LibreOffice Writer is not installed on this server.');
      }
      const sharedProfile = path.join(os.tmpdir(), 'libreoffice-shared-profile');
      const userProfileArg = `-env:UserInstallation=file:///${sharedProfile.replace(/\\/g, '/')}`;
      const args = [
        userProfileArg,
        '--headless',
        '--invisible',
        '--nodefault',
        '--nofirststartwizard',
        '--nologo',
        '--convert-to',
        'pdf:writer_pdf_Export',
        '--outdir',
        outDir,
        pdfPath
      ];
      await executeSofficeHeadless(sofficePath, args, 60000);

      if (!fs.existsSync(expectedPdfPath) || fs.statSync(expectedPdfPath).size === 0) {
        throw new Error('PDF to PDF/A conversion failed. Output PDF/A file not found or size is 0.');
      }

      recordSuccess();
      return expectedPdfPath;
    } catch (err: any) {
      recordError(err.message);
      throw err;
    }
  });
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

