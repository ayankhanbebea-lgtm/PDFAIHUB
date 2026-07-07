import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';

// Lazy-import muhammara
let muhammara: any = null;
let Recipe: any = null;
try {
  muhammara = require('muhammara');
  Recipe = muhammara.Recipe;
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
 * Remove password protection from a PDF using pdf-lib (in-memory) and muhammara fallback.
 */
export async function decryptPDF(
  pdfBuffer: Buffer,
  password = ''
): Promise<Buffer> {
  if (!muhammara) {
    throw new Error('PDF Decryption engine (muhammara) is not available.');
  }

  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(16).toString('hex');
  const tempInputPath = path.join(tmpDir, `input_${id}.pdf`);
  const tempOutputPath = path.join(tmpDir, `output_${id}.pdf`);

  try {
    fs.writeFileSync(tempInputPath, pdfBuffer);
    muhammara.recrypt(tempInputPath, tempOutputPath, { password });
    
    const decryptedBuffer = fs.readFileSync(tempOutputPath);
    return decryptedBuffer;
  } catch (err: any) {
    console.error('[pdf-encrypt] muhammara decryption failed:', err.message);
    throw new Error('Failed to decrypt PDF. Verify the password is correct.');
  } finally {
    try {
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    } catch (e: any) {
      console.warn('[pdf-encrypt] Temporary file cleanup warning:', e.message);
    }
  }
}
