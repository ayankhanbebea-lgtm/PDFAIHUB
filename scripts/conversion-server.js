// scripts/conversion-server.js
// ─────────────────────────────────────────────────────────────
// Dedicated LibreOffice Conversion Microservice for Railway/Render/VPS
// Handles PowerPoint-to-PDF, Excel-to-PDF, PDF-to-PDF/A, and legacy DOC conversions.
// Includes in-memory log buffer for remote diagnostics.
// ─────────────────────────────────────────────────────────────

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

// Log buffer for remote diagnostics
const logBuffer = [];
function log(msg, type = 'INFO') {
  const time = new Date().toISOString();
  const entry = `[${time}] [${type}] ${msg}`;
  console.log(entry);
  logBuffer.push(entry);
  if (logBuffer.length > 500) logBuffer.shift(); // Keep last 500 lines
}

log('Starting conversion microservice...');

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
    log(`⚠️ LibreOffice not found or failed to start: ${err.message}`, 'WARN');
  } else {
    log(`✅ LibreOffice detected: ${stdout.trim()}`, 'INFO');
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

  // Logs diagnostic endpoint
  if (req.url === '/logs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(logBuffer.join('\n'));
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
    log(`Received POST conversion request. Content-Type: ${req.headers['content-type']}`);
    
    const boundaryMatch = req.headers['content-type'] && req.headers['content-type'].match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      log('Request rejected: Multipart/form-data boundary missing', 'ERROR');
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
        log(`Finished reading body stream. Total size: ${body.length} bytes`);

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

        log(`Parsed multipart body. Found ${parts.length} parts.`);

        // Find file part
        let fileData = null;
        let filename = 'document.pptx';
        let convertToType = 'pdf';

        for (const part of parts) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;

          const headers = part.slice(0, headerEnd).toString('utf-8');
          const data = part.slice(headerEnd + 4, part.length - 2); // Exclude trailing \r\n

          if (headers.includes('name="file"') || headers.includes('name="File"')) {
            const filenameMatch = headers.match(/filename="([^"]+)"/);
            if (filenameMatch) filename = filenameMatch[1];
            fileData = data;
          } else if (headers.includes('name="type"')) {
            convertToType = data.toString('utf-8').trim();
          }
        }

        if (!fileData || fileData.length === 0) {
          log('Request rejected: No file found in multipart payload', 'ERROR');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No file uploaded' }));
          return;
        }

        log(`Processing file: ${filename} (${fileData.length} bytes), convertToType: ${convertToType}`);

        // Setup unique temporary directories/files
        const tempDir = path.join(os.tmpdir(), `soffice-${crypto.randomBytes(8).toString('hex')}`);
        fs.mkdirSync(tempDir, { recursive: true });

        const inputPath = path.join(tempDir, filename);
        fs.writeFileSync(inputPath, fileData);

        // Map conversion options
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
        log(`Executing LibreOffice command: ${cmd}`);

        const startExec = Date.now();
        exec(cmd, { timeout: 60000 }, (convertErr, stdout, stderr) => {
          try {
            const duration = Date.now() - startExec;
            log(`LibreOffice execution finished in ${duration}ms.`);
            if (stdout) log(`LibreOffice stdout: ${stdout.trim()}`);
            if (stderr) log(`LibreOffice stderr: ${stderr.trim()}`);

            if (convertErr) {
              log(`LibreOffice error: ${convertErr.message}`, 'ERROR');
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'LibreOffice conversion failed', details: convertErr.message }));
              return;
            }

            const inputBasename = path.basename(inputPath, path.extname(inputPath));
            const expectedPdfPath = path.join(tempDir, `${inputBasename}.pdf`);

            if (!fs.existsSync(expectedPdfPath) || fs.statSync(expectedPdfPath).size === 0) {
              log(`Conversion output PDF missing or empty at: ${expectedPdfPath}`, 'ERROR');
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'LibreOffice succeeded but output PDF was not found or empty.' }));
              return;
            }

            const outputBuffer = fs.readFileSync(expectedPdfPath);
            log(`Successfully converted. Returning PDF of size ${outputBuffer.length} bytes.`);
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Length': outputBuffer.length
            });
            res.end(outputBuffer);
          } finally {
            // Cleanup temp dir
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
              log(`Cleaned up temporary directory: ${tempDir}`);
            } catch (cleanupErr) {
              log(`Cleanup warning: ${cleanupErr.message}`, 'WARN');
            }
          }
        });
      } catch (parseErr) {
        log(`Request parse error: ${parseErr.stack}`, 'ERROR');
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
  log(`🚀 LibreOffice conversion microservice listening on port ${PORT}`);
});
