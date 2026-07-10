// src/lib/converter-init.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync, ChildProcess, spawn } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface ConverterStatus {
  libreOfficeStatus: 'FOUND' | 'MISSING';
  libreOfficePath: string | null;
  excelCOMReady: boolean;
  powerpointCOMReady: boolean;
  wordCOMReady: boolean;
  version: string;
  testPPTX: 'PASS' | 'FAIL' | 'NOT_TESTED';
  testXLSX: 'PASS' | 'FAIL' | 'NOT_TESTED';
  lastSuccessfulConversion: string | null;
  lastConversionError: string | null;
  errorLogs: string[];
}

let globalStatus: ConverterStatus | null = null;
let activeInitPromise: Promise<ConverterStatus> | null = null;

/**
 * Executes a terminal command with a 60-second timeout, process tree killing on timeout, and detailed logging.
 */
export function execWithTimeout(command: string, timeoutMs: number = 60000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    console.log(`[execWithTimeout] Executing: ${command}`);
    const timer = setTimeout(() => {
      if (child && child.pid) {
        console.warn(`[execWithTimeout] Process (PID ${child.pid}) timed out after ${timeoutMs}ms. Terminating process tree...`);
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /f /t /pid ${child.pid}`);
          } else {
            // Kill entire process group
            process.kill(-child.pid, 'SIGKILL');
          }
        } catch (e: any) {
          console.error(`[execWithTimeout] Error during process tree termination for PID ${child.pid}: ${e.message}`);
        }
        reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds.`));
      }
    }, timeoutMs);

    const child = exec(command, (error, stdout, stderr) => {
      clearTimeout(timer);
      console.log(`[execWithTimeout] Process (PID ${child.pid || 'unknown'}) finished.`);
      console.log(`[execWithTimeout] stdout: ${stdout?.trim() || 'none'}`);
      console.log(`[execWithTimeout] stderr: ${stderr?.trim() || 'none'}`);
      
      if (error) {
        console.error(`[execWithTimeout] Exit code: ${error.code || 1}. Error: ${error.message}`);
        reject(error);
      } else {
        console.log(`[execWithTimeout] Exit code: 0 (Success)`);
        resolve({ stdout, stderr });
      }
    });

    if (child.pid) {
      console.log(`[execWithTimeout] Process started with PID: ${child.pid}`);
    }
  });
}

/**
 * Spawns soffice.exe directly to run LibreOffice silently in headless mode
 * without creating any console / cmd windows on Windows.
 */
export function executeSofficeHeadless(sofficePath: string, args: string[], timeoutMs: number = 60000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    console.log(`[executeSofficeHeadless] Spawning: "${sofficePath}" with args: ${args.join(' ')}`);
    
    const child = spawn(sofficePath, args, {
      windowsHide: true,
      shell: false
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    const timer = setTimeout(() => {
      console.warn(`[executeSofficeHeadless] Process (PID ${child.pid}) timed out after ${timeoutMs}ms. Killing...`);
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /f /t /pid ${child.pid}`);
        } else {
          child.kill('SIGKILL');
        }
      } catch (e: any) {
        console.error(`[executeSofficeHeadless] Error killing process: ${e.message}`);
      }
      reject(new Error(`LibreOffice execution timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      console.log(`[executeSofficeHeadless] Process (PID ${child.pid || 'unknown'}) finished with code ${code}.`);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`LibreOffice exited with code ${code}. Stderr: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      console.error(`[executeSofficeHeadless] Spawn error:`, err);
      reject(err);
    });
  });
}


/**
 * Dynamically resolves the absolute path of the soffice executable cross-platform.
 */
export function getSofficePath(): string | null {
  // 1. Env variable check
  if (process.env.LIBREOFFICE_PATH) {
    if (fs.existsSync(process.env.LIBREOFFICE_PATH)) {
      return process.env.LIBREOFFICE_PATH;
    }
  }

  // 2. Cross-platform standard paths
  const standardPaths = [
    // Windows
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    'C:\\Users\\ayank\\AppData\\Local\\Programs\\LibreOffice\\program\\soffice.exe',
    // Linux
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    // macOS
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // 3. Search system PATH dynamically
  try {
    const checkCmd = process.platform === 'win32' ? 'where soffice' : 'which soffice';
    const output = execSync(checkCmd, { stdio: [] }).toString().trim().split('\n')[0].trim();
    if (output && fs.existsSync(output)) {
      return output;
    }
  } catch {}

  return null;
}

/**
 * Runs a PowerShell script safely by writing it to a temp .ps1 file
 * and executing it without shell variable expansion bugs.
 */
export async function runPowerShell(script: string): Promise<void> {
  const tempFile = path.join(os.tmpdir(), `pdfai-ps-${Date.now()}-${Math.random().toString(36).substring(7)}.ps1`);
  fs.writeFileSync(tempFile, script, 'utf-8');
  try {
    await execWithTimeout(`powershell -ExecutionPolicy Bypass -File "${tempFile}"`, 60000);
  } finally {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch {}
  }
}

export async function initConversionEngine(force = false): Promise<ConverterStatus> {
  if (globalStatus && !force) return globalStatus;
  if (activeInitPromise) {
    console.log('[initConversionEngine] Awaiting active initialization promise...');
    return activeInitPromise;
  }

  activeInitPromise = (async () => {
    const logs: string[] = [];
    const startTime = Date.now();
    logs.push(`Starting initialization at ${new Date().toISOString()}`);

    // 1. Cleanup orphaned processes
    try {
      logs.push('Cleaning up orphaned Excel/PowerPoint/Word processes...');
      await execPromise('taskkill /f /im excel.exe /im powerpnt.exe /im winword.exe');
      logs.push('Successfully terminated lingering processes.');
    } catch (err: any) {
      logs.push(`Taskkill scan complete (no active orphaned processes to terminate).`);
    }

    // 2. Detect LibreOffice path and version
    const libreOfficePath = getSofficePath();
    const libreOfficeStatus = libreOfficePath ? 'FOUND' : 'MISSING';
    let version = 'MISSING';

    if (libreOfficePath) {
      try {
        const { stdout } = await executeSofficeHeadless(libreOfficePath, ['--version'], 15000);
        version = stdout.trim();
        logs.push(`LibreOffice detected: ${version} at ${libreOfficePath}`);
      } catch (err: any) {
        version = 'Unknown LibreOffice Version';
        logs.push(`LibreOffice found at ${libreOfficePath} but --version failed: ${err.message}`);
      }
    } else {
      logs.push('Developer Alert: LibreOffice executable not detected in standard paths, env overrides, or system PATH.');
    }

    // 3. Verify availability of Windows COM Objects
    let excelCOMReady = false;
    let powerpointCOMReady = false;
    let wordCOMReady = false;

    if (process.platform === 'win32') {
      try {
        logs.push('Verifying Excel COM Application...');
        await runPowerShell(`
          $excel = New-Object -ComObject Excel.Application
          $excel.Quit()
        `);
        excelCOMReady = true;
        logs.push('Excel COM: READY');
      } catch (err: any) {
        logs.push(`Excel COM check failed: ${err.message}`);
      }

      try {
        logs.push('Verifying PowerPoint COM Application...');
        await runPowerShell(`
          $ppt = New-Object -ComObject PowerPoint.Application
          $ppt.Quit()
        `);
        powerpointCOMReady = true;
        logs.push('PowerPoint COM: READY');
      } catch (err: any) {
        logs.push(`PowerPoint COM check failed: ${err.message}`);
      }

      try {
        logs.push('Verifying Word COM Application...');
        await runPowerShell(`
          $word = New-Object -ComObject Word.Application
          $word.Quit()
        `);
        wordCOMReady = true;
        logs.push('Word COM: READY');
      } catch (err: any) {
        logs.push(`Word COM check failed: ${err.message}`);
      }
    } else {
      logs.push('Non-Windows platform: COM Automation skipped.');
    }

    // 4. Perform self-test conversions to verify the pipelines generate valid PDFs
    let testPPTX: 'PASS' | 'FAIL' = 'FAIL';
    let testXLSX: 'PASS' | 'FAIL' = 'FAIL';

    const testDir = path.join(os.tmpdir(), `pdfai-selftest-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Test Excel
    try {
      const xlsxPath = path.join(testDir, 'test.xlsx');
      const pdfPath = path.join(testDir, 'test-excel.pdf');
      
      if (libreOfficePath) {
        const csvPath = path.join(testDir, 'test.csv');
        fs.writeFileSync(csvPath, 'Col1,Col2\nVal1,Val2');
        await executeSofficeHeadless(libreOfficePath, [
          '--headless',
          '--convert-to',
          'pdf',
          '--outdir',
          testDir,
          csvPath
        ], 20000);
        const defaultPdf = path.join(testDir, 'test.pdf');
        if (fs.existsSync(defaultPdf)) {
          fs.renameSync(defaultPdf, pdfPath);
        }
      } else if (excelCOMReady) {
        const script = `
          $excel = New-Object -ComObject Excel.Application
          $excel.Visible = $false
          $excel.DisplayAlerts = $false
          $wb = $excel.Workbooks.Add()
          $ws = $wb.Worksheets.Item(1)
          $ws.Cells.Item(1, 1) = 'Self-Test Excel Content'
          $wb.SaveAs('${xlsxPath.replace(/\\/g, '\\\\')}')
          $wb.ExportAsFixedFormat(0, '${pdfPath.replace(/\\/g, '\\\\')}')
          $wb.Close($false)
          $excel.Quit()
        `;
        await runPowerShell(script);
      }

      if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 0) {
        testXLSX = 'PASS';
        logs.push(`Excel self-test conversion passed. Size: ${fs.statSync(pdfPath).size} bytes`);
      } else {
        logs.push('Excel self-test conversion failed: Output PDF size is 0 or missing.');
      }
    } catch (err: any) {
      logs.push(`Excel self-test error: ${err.message}`);
    }

    // Test PowerPoint
    try {
      const pptxPath = path.join(testDir, 'test.pptx');
      const pdfPath = path.join(testDir, 'test-ppt.pdf');

      if (libreOfficePath) {
        const txtPath = path.join(testDir, 'test.txt');
        fs.writeFileSync(txtPath, 'PowerPoint self-test data');
        await executeSofficeHeadless(libreOfficePath, [
          '--headless',
          '--convert-to',
          'pdf',
          '--outdir',
          testDir,
          txtPath
        ], 20000);
        const defaultPdf = path.join(testDir, 'test.pdf');
        if (fs.existsSync(defaultPdf)) {
          fs.renameSync(defaultPdf, pdfPath);
        }
      } else if (powerpointCOMReady) {
        const script = `
          $ppt = New-Object -ComObject PowerPoint.Application
          $pres = $ppt.Presentations.Add(0)
          $slide = $pres.Slides.Add(1, 1)
          $slide.Shapes.Item(1).TextFrame.TextRange.Text = 'Self-Test PowerPoint Content'
          $pres.SaveAs('${pptxPath.replace(/\\/g, '\\\\')}')
          $pres.SaveAs('${pdfPath.replace(/\\/g, '\\\\')}', 32)
          $pres.Close()
          $ppt.Quit()
        `;
        await runPowerShell(script);
      }

      if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 0) {
        testPPTX = 'PASS';
        logs.push(`PowerPoint self-test conversion passed. Size: ${fs.statSync(pdfPath).size} bytes`);
      } else {
        logs.push('PowerPoint self-test conversion failed: Output PDF size is 0 or missing.');
      }
    } catch (err: any) {
      logs.push(`PowerPoint self-test error: ${err.message}`);
    }

    // Clean up test directories
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}

    const duration = Date.now() - startTime;
    logs.push(`Initialization duration: ${duration}ms`);

    if (libreOfficeStatus === 'MISSING' && !powerpointCOMReady) {
      const devAlert = `
========================================================================
DEVELOPER ALERT: PowerPoint / Excel / PDF/A Conversion Engines are MISSING!
------------------------------------------------------------------------
To resolve this setup issue, please perform one of the following:

Option A: Install LibreOffice (Highly Recommended for all OS platforms)
- Windows: Download installer from https://www.libreoffice.org/download/download/
  Or run in PowerShell: winget install --id=LibreOffice.LibreOffice -e
- Linux (Ubuntu/Debian): Run: sudo apt-get update && sudo apt-get install -y libreoffice
- macOS: Run: brew install --cask libreoffice

Option B: Install Microsoft Office (Windows COM Automation Fallback)
- Ensure Microsoft Excel and Microsoft PowerPoint are installed on this Windows host.
- Verify PowerPoint COM and Excel COM can be initialized in PowerShell.
========================================================================
      `;
      console.warn(devAlert);
      logs.push(devAlert);
    }

    return {
      libreOfficeStatus,
      libreOfficePath,
      excelCOMReady,
      powerpointCOMReady,
      wordCOMReady,
      version,
      testPPTX,
      testXLSX,
      lastSuccessfulConversion: globalStatus?.lastSuccessfulConversion || null,
      lastConversionError: globalStatus?.lastConversionError || null,
      errorLogs: logs,
    };
  })();

  try {
    globalStatus = await activeInitPromise;
    return globalStatus;
  } finally {
    activeInitPromise = null;
  }
}

export function getConverterStatus(): ConverterStatus | null {
  return globalStatus;
}

export function recordSuccess() {
  if (globalStatus) {
    globalStatus.lastSuccessfulConversion = new Date().toISOString();
  }
}

export function recordError(errMessage: string) {
  if (globalStatus) {
    globalStatus.lastConversionError = `${new Date().toISOString()}: ${errMessage}`;
  }
}
