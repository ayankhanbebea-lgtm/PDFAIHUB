// src/lib/pdf-encrypt.ts
// ─────────────────────────────────────────────────────────────
// Real PDF Encryption and Decryption using pure JS/WASM MuPDF.
// Runs entirely in memory, eliminating muhammara/mutool native binaries.
// ─────────────────────────────────────────────────────────────

export interface EncryptResult {
  buffer: Buffer;
  encrypted: boolean;
  error?: string;
}

/**
 * Encrypt a PDF with a user password using pure WASM MuPDF.
 */
export async function encryptPDF(
  pdfBuffer: Buffer,
  userPassword: string,
  ownerPassword?: string,
  permissions = -3904
): Promise<EncryptResult> {
  if (!userPassword) {
    return { buffer: pdfBuffer, encrypted: false, error: 'Password is required' };
  }

  try {
    // Dynamic import to support ESM package in CommonJS/Next.js routes
    // @ts-ignore
    const mupdf = await import('mupdf');
    
    // Open document
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      throw new Error('This document is not a valid PDF or cannot be parsed.');
    }

    // Save with encryption options
    const encryptedBytes = pdfDoc.saveToBuffer({
      encrypt: 'rc4-128',
      'user-password': userPassword,
      'owner-password': ownerPassword || (userPassword + '_owner'),
      permissions: permissions
    });

    const resultBuffer = Buffer.from(encryptedBytes.asUint8Array());
    return { buffer: resultBuffer, encrypted: true };
  } catch (err: any) {
    console.error('[pdf-encrypt] Encryption failed:', err);
    return {
      buffer: pdfBuffer,
      encrypted: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Remove password protection from a PDF using pure WASM MuPDF.
 */
export async function decryptPDF(
  pdfBuffer: Buffer,
  password = ''
): Promise<Buffer> {
  try {
    // Dynamic import to support ESM package
    // @ts-ignore
    const mupdf = await import('mupdf');
    
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    
    if (doc.needsPassword()) {
      const authRes = doc.authenticatePassword(password);
      if (authRes === 0) {
        throw new Error('Failed to decrypt PDF. Verify the password is correct.');
      }
    }

    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      throw new Error('This document is not a valid PDF or cannot be parsed.');
    }

    const decryptedBytes = pdfDoc.saveToBuffer({ encrypt: 'none' });
    return Buffer.from(decryptedBytes.asUint8Array());
  } catch (err: any) {
    console.error('[pdf-encrypt] Decryption failed:', err.message);
    throw new Error('Failed to decrypt PDF. Verify the password is correct.');
  }
}
