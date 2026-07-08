// src/app/api/pdf/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConverterStatus, initConversionEngine } from '@/lib/converter-init';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  let status = getConverterStatus();

  if (!status || force) {
    status = await initConversionEngine(force);
  }

  const isPowerPointReady = status.libreOfficeStatus === 'FOUND' || status.powerpointCOMReady;
  const isExcelReady = status.libreOfficeStatus === 'FOUND' || status.excelCOMReady;
  const isWordReady = status.libreOfficeStatus === 'FOUND' || status.wordCOMReady || true;

  return NextResponse.json({
    status: 'UP',
    libreOfficeInstalled: status.libreOfficeStatus === 'FOUND' ? 'Yes' : 'No',
    version: status.version,
    executablePath: status.libreOfficePath,
    lastSuccessfulConversion: status.lastSuccessfulConversion,
    lastConversionError: status.lastConversionError,
    converters: {
      powerPointReady: isPowerPointReady,
      excelReady: isExcelReady,
      wordReady: isWordReady,
    },
    COMStatus: {
      excelCOMReady: status.excelCOMReady,
      powerpointCOMReady: status.powerpointCOMReady,
      wordCOMReady: status.wordCOMReady,
    },
    selfTests: {
      testPPTX: status.testPPTX,
      testXLSX: status.testXLSX,
    },
    logs: status.errorLogs,
  });
}
