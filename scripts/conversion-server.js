// scripts/conversion-server.js
// ─────────────────────────────────────────────────────────────
// Dedicated LibreOffice Conversion Microservice for Railway/Render/VPS
// Handles PowerPoint-to-PDF, Excel-to-PDF, PDF-to-PDF/A, and legacy DOC conversions.
// ─────────────────────────────────────────────────────────────

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

// Resolve soffice executable path
function getSofficePath() {
  const standardPaths = [
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice'
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'soffice'; // Fallback to PATH search
}

const sofficeBin = getSofficePath();

// Check if LibreOffice is available on start
exec(`${sofficeBin} --version`, (err, stdout) => {
  if (err) {
    console.warn('⚠️ LibreOffice not found or failed to start:', err.message);
  } else {
    console.log('✅ LibreOffice detected:', stdout.trim());
  }
});

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    exec(`${sofficeBin} --version`, (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'UP',
        libreOffice: err ? 'MISSING' : 'FOUND',
        version: err ? null : stdout.trim()
      }));
    });
    return;
  }

  // Conversion endpoint
  if (req.url === '/convert' && req.method === 'POST') {
    const boundaryMatch = req.headers['content-type'] && req.headers['content-type'].match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Multipart/form-data with boundary required' }));
      return;
    }

    const boundary = boundaryMatch[1];
    let body = Buffer.alloc(0);

    req.on('data', chunk => {
      body = Buffer.concat([body, chunk]);
    });

    req.on('end', () => {
      try {
        // Parse multipart form data in-memory
        const boundaryBuffer = Buffer.from('--' + boundary);
        const parts = [];
        let index = body.indexOf(boundaryBuffer);

        while (index !== -1) {
          const nextIndex = body.indexOf(boundaryBuffer, index + boundaryBuffer.length);
          if (nextIndex === -1) break;

          const part = body.slice(index + boundaryBuffer.length, nextIndex);
          parts.push(part);
          index = nextIndex;
        }

        // Find file part
        let fileData = null;
        let filename = 'document.pptx';
        let convertToType = 'pdf'; // Default to standard PDF conversion

        for (const part of parts) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;

          const headers = part.slice(0, headerEnd).toString('utf-8');
          const data = part.slice(headerEnd + 4, part.length - 2); // Exclude trailing \r\n

          if (headers.includes('name="file"')) {
            const filenameMatch = headers.match(/filename="([^"]+)"/);
            if (filenameMatch) filename = filenameMatch[1];
            fileData = data;
          } else if (headers.includes('name="type"')) {
            convertToType = data.toString('utf-8').trim(); // 'pdf' or 'pdfa'
          }
        }

        if (!fileData || fileData.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No file uploaded' }));
          return;
        }

        // Setup unique temporary directories/files
        const tempDir = path.join(os.tmpdir(), `soffice-${crypto.randomBytes(8).toString('hex')}`);
        fs.mkdirSync(tempDir, { recursive: true });

        const inputPath = path.join(tempDir, filename);
        fs.writeFileSync(inputPath, fileData);

        // Map conversion options
        // 'pdf:writer_pdf_Export' for standard PDF, 'pdf:writer_pdf_Export' + PDFA check inside soffice
        const convertFilter = convertToType === 'pdfa' ? 'pdf:writer_pdf_Export' : 'pdf';

        const args = [
          `-env:UserInstallation=file:///${path.join(tempDir, 'profile').replace(/\\/g, '/')}`,
          '--headless',
          '--invisible',
          '--nodefault',
          '--nofirststartwizard',
          '--nologo',
          '--convert-to',
          convertFilter,
          '--outdir',
          tempDir,
          inputPath
        ];

        const cmd = `"${sofficeBin}" ${args.join(' ')}`;
        console.log(`[conversion-server] Executing: ${cmd}`);

        exec(cmd, { timeout: 60000 }, (convertErr) => {
          try {
            if (convertErr) {
              console.error('[conversion-server] LibreOffice error:', convertErr.message);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'LibreOffice conversion failed', details: convertErr.message }));
              return;
            }

            const inputBasename = path.basename(inputPath, path.extname(inputPath));
            const expectedPdfPath = path.join(tempDir, `${inputBasename}.pdf`);

            if (!fs.existsSync(expectedPdfPath) || fs.statSync(expectedPdfPath).size === 0) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'LibreOffice succeeded but output PDF was not found or empty.' }));
              return;
            }

            const outputBuffer = fs.readFileSync(expectedPdfPath);
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Length': outputBuffer.length
            });
            res.end(outputBuffer);
          } finally {
            // Cleanup temp dir
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (cleanupErr) {
              console.warn('[conversion-server] Cleanup warning:', cleanupErr.message);
            }
          }
        });
      } catch (parseErr) {
        console.error('[conversion-server] Request parse error:', parseErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to process request data' }));
      }
    });
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`🚀 LibreOffice conversion microservice listening on port ${PORT}`);
});
