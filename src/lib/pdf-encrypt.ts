import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { execSync, execFileSync } from 'child_process';

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
 * Automatically finds the path to the mutool.exe binary installed via winget or system path.
 */
function findMutoolPath(): string | null {
  // 1. Check if mutool is available globally
  try {
    execSync('mutool --version', { stdio: 'ignore' });
    return 'mutool';
  } catch {}

  // 2. Check local AppData WinGet packages folder
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const packagesDir = path.join(localAppData, 'Microsoft/WinGet/Packages');
    if (fs.existsSync(packagesDir)) {
      try {
        const dirs = fs.readdirSync(packagesDir);
        const mutoolDir = dirs.find(d => d.startsWith('ArtifexSoftware.mutool'));
        if (mutoolDir) {
          const binPath = path.join(packagesDir, mutoolDir, 'mupdf-1.23.0-windows/mutool.exe');
          if (fs.existsSync(binPath)) {
            return binPath;
          }
        }
      } catch {}
    }
  }

  // 3. Hardcoded fallback for default ayank user just in case env is different
  const fallbackPath = 'C:/Users/ayank/AppData/Local/Microsoft/WinGet/Packages/ArtifexSoftware.mutool_Microsoft.Winget.Source_8wekyb3d8bbwe/mupdf-1.23.0-windows/mutool.exe';
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}

/**
 * Remove password protection from a PDF.
 * To satisfy strict fidelity requirements, we do a pure decryption:
 * 1. Primary: Use native "mutool clean -p <password> -D -m" which removes security dicts
 *    without deflating, rewriting, cleaning, or recompressing object streams.
 * 2. Fallback: Use muhammara.recrypt with compress: false and matching original PDF version.
 */
export async function decryptPDF(
  pdfBuffer: Buffer,
  password = ''
): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(16).toString('hex');
  const tempInputPath = path.join(tmpDir, `input_${id}.pdf`);
  const tempOutputPath = path.join(tmpDir, `output_${id}.pdf`);

  try {
    fs.writeFileSync(tempInputPath, pdfBuffer);

    // Try mutool clean (pure decryption, no optimization) first
    const mutoolBin = findMutoolPath();
    if (mutoolBin) {
      try {
        // -p <password>: authenticate
        // -D: save file without encryption
        // -m: preserve metadata
        execFileSync(mutoolBin, ['clean', '-p', password, '-D', '-m', tempInputPath, tempOutputPath], { stdio: 'ignore' });
        
        if (fs.existsSync(tempOutputPath) && fs.statSync(tempOutputPath).size > 0) {
          const decryptedBuffer = fs.readFileSync(tempOutputPath);
          return decryptedBuffer;
        }
      } catch (mutoolErr: any) {
        console.warn('[pdf-encrypt] mutool decryption failed, falling back to muhammara:', mutoolErr.message);
        // If password authentication failed, throw immediately
        if (mutoolErr.message && (mutoolErr.message.includes('authenticate') || mutoolErr.message.includes('password'))) {
          throw new Error('Failed to decrypt PDF. Verify the password is correct.');
        }
      }
    }

    // Fallback to muhammara.recrypt with strict no-compress and original version matching
    if (!muhammara) {
      throw new Error('PDF Decryption engine is not available.');
    }

    // Read PDF version from original header to keep it identical
    let pdfVersion: number | undefined;
    try {
      const header = pdfBuffer.toString('utf8', 0, 9);
      const match = header.match(/%PDF-1\.([0-7])/);
      if (match) {
        pdfVersion = 10 + parseInt(match[1], 10);
      }
    } catch (verErr) {
      console.warn('[pdf-encrypt] Could not parse PDF version:', verErr);
    }

    const options: any = { password, compress: false };
    if (pdfVersion && pdfVersion >= 10 && pdfVersion <= 17) {
      options.version = pdfVersion;
    }

    muhammara.recrypt(tempInputPath, tempOutputPath, options);
    
    const decryptedBuffer = fs.readFileSync(tempOutputPath);
    return decryptedBuffer;
  } catch (err: any) {
    console.error('[pdf-encrypt] Decryption failed:', err.message);
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
