// src/lib/pdf-encrypt.ts
// ─────────────────────────────────────────────────────────────
// Real PDF Encryption and Decryption using muhammara.Recipe.
// Compliant with standard PDF encryption readable by Adobe Acrobat,
// Chrome, Firefox, Safari, Edge.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Lazy-import muhammara
let Recipe: any = null;
try {
  Recipe = require('muhammara').Recipe;
} catch (err) {
  console.warn('[pdf-encrypt] muhammara not available');
}

export interface EncryptResult {
  buffer: Buffer;
  encrypted: boolean;
  error?: string;
}

/**
 * Encrypt a PDF with a user password using muhammara.Recipe.
 * Automatically verifies that opening without password fails,
 * and opening with password succeeds.
 */
export async function encryptPDF(
  pdfBuffer: Buffer,
  userPassword: string,
  ownerPassword?: string,
  permissions = -3904
): Promise<EncryptResult> {
  if (!Recipe) {
    return { buffer: pdfBuffer, encrypted: false, error: 'muhammara library is not available' };
  }
  if (!userPassword) {
    return { buffer: pdfBuffer, encrypted: false, error: 'Password is required' };
  }

  // Create unique temporary paths
  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(16).toString('hex');
  const tempInputPath = path.join(tmpDir, `input_${id}.pdf`);
  const tempOutputPath = path.join(tmpDir, `output_${id}.pdf`);

  try {
    // Write input buffer to temporary file
    fs.writeFileSync(tempInputPath, pdfBuffer);

    // 1. Run encryption using muhammara Recipe
    const ownerPwd = ownerPassword || (userPassword + '_owner');
    const pdfDoc = new Recipe(tempInputPath, tempOutputPath);
    pdfDoc
      .encrypt({
        userPassword,
        ownerPassword: ownerPwd,
        userProtectionFlag: permissions,
      })
      .endPDF();

    // Verify output file was created and is not empty
    if (!fs.existsSync(tempOutputPath) || fs.statSync(tempOutputPath).size === 0) {
      throw new Error('Encrypted PDF output file is empty or not created');
    }

    // 2. AUTOMATIC VERIFICATION: Verify that opening without password blocks access
    let wasBlocked = false;
    try {
      const reader = new Recipe(tempOutputPath, tempOutputPath, { password: '' });
      // Access metadata to trigger password checking
      const meta = reader.metadata;
      if (!meta || Object.keys(meta).length === 0) {
        wasBlocked = true;
      }
    } catch (err) {
      wasBlocked = true;
    }

    // 3. AUTOMATIC VERIFICATION: Verify that opening with correct password works
    let openedWithPassword = false;
    try {
      const readerWithPass = new Recipe(tempOutputPath, tempOutputPath, { password: userPassword });
      const meta = readerWithPass.metadata;
      if (meta && Object.keys(meta).length > 0) {
        openedWithPassword = true;
      }
    } catch (err) {
      openedWithPassword = false;
    }

    if (!wasBlocked) {
      throw new Error('Verification failed: PDF opens without password prompt');
    }
    if (!openedWithPassword) {
      throw new Error('Verification failed: PDF cannot be decrypted with the correct password');
    }

    // Read the encrypted file back into a Buffer
    const resultBuffer = fs.readFileSync(tempOutputPath);
    return { buffer: resultBuffer, encrypted: true };

  } catch (err: any) {
    console.error('[pdf-encrypt] Encryption failed:', err);
    return {
      buffer: pdfBuffer,
      encrypted: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    } catch (e: any) {
      console.warn('[pdf-encrypt] Temporary file cleanup warning:', e.message);
    }
  }
}

/**
 * Remove password protection from a PDF using muhammara.Recipe.
 */
export async function decryptPDF(
  pdfBuffer: Buffer,
  password = ''
): Promise<Buffer> {
  if (!Recipe) {
    throw new Error('muhammara library is not available');
  }

  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(16).toString('hex');
  const tempInputPath = path.join(tmpDir, `input_${id}.pdf`);
  const tempOutputPath = path.join(tmpDir, `output_${id}.pdf`);

  try {
    fs.writeFileSync(tempInputPath, pdfBuffer);

    // Read the encrypted PDF with password and write to a new unencrypted PDF
    const pdfDoc = new Recipe(tempInputPath, tempOutputPath, { password });
    
    // In hummus-recipe/muhammara, saving/ending the recipe without calling .encrypt()
    // automatically strips encryption from the output PDF
    pdfDoc.endPDF();

    const decryptedBuffer = fs.readFileSync(tempOutputPath);
    return decryptedBuffer;

  } catch (err: any) {
    console.error('[pdf-encrypt] Decryption failed:', err);
    throw new Error(`Failed to decrypt PDF: ${err.message}`);
  } finally {
    try {
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    } catch (e: any) {
      console.warn('[pdf-encrypt] Temporary file cleanup warning:', e.message);
    }
  }
}
