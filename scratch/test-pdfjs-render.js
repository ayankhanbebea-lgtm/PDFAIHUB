// c:\Users\ayank\OneDrive\Desktop\PDFAIHUB\scratch\test-pdfjs-render.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function testPdfjsRender() {
  console.log('Loading pdfjs-dist via dynamic import...');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const pdfPath = 'C:/Users/ayank/.gemini/antigravity/brain/9b0b90e6-bed4-45f2-9005-c24b4bd41d01/scratch/test-saved.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('Test PDF not found');
    return;
  }
  
  const buffer = new Uint8Array(fs.readFileSync(pdfPath));
  console.log('Loading document...');
  const loadingTask = pdfjs.getDocument({
    data: buffer,
    useSystemFonts: true,
    disableFontFace: true
  });
  
  const doc = await loadingTask.promise;
  console.log(`Loaded PDF with ${doc.numPages} pages.`);
  
  const page = await doc.getPage(1);
  console.log('Page loaded. Getting viewport...');
  const viewport = page.getViewport({ scale: 2.0 });
  
  console.log('Getting operator list...');
  const opList = await page.getOperatorList();
  
  console.log('Creating SVG graphics context...');
  const svgGfx = new pdfjs.SVGGraphics(page.commonObjs, page.objs);
  
  console.log('Generating SVG XML...');
  const svgElement = await svgGfx.getSVG(opList, viewport);
  const svgString = svgElement.toString();
  
  console.log('Writing SVG to disk...');
  fs.writeFileSync('C:/Users/ayank/.gemini/antigravity/brain/9b0b90e6-bed4-45f2-9005-c24b4bd41d01/scratch/test-page-render.svg', svgString);
  
  console.log('Converting SVG to JPEG via sharp...');
  const jpegBuffer = await sharp(Buffer.from(svgString))
    .jpeg({ quality: 90 })
    .toBuffer();
    
  console.log(`Generated JPEG: ${jpegBuffer.length} bytes.`);
  fs.writeFileSync('C:/Users/ayank/.gemini/antigravity/brain/9b0b90e6-bed4-45f2-9005-c24b4bd41d01/scratch/test-page-render.jpg', jpegBuffer);
  console.log('Done!');
}

testPdfjsRender().catch(console.error);
