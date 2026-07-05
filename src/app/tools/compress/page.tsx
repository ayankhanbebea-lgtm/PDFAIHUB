'use client';
// src/app/tools/compress/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

const levels = [
  { id: 'low', label: 'Low', desc: 'Best quality, smaller reduction', reduction: '10-30%' },
  { id: 'medium', label: 'Medium', desc: 'Balanced quality & size', reduction: '30-60%' },
  { id: 'high', label: 'High', desc: 'Maximum compression', reduction: '60-80%' },
];

export default function CompressPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [message, setMessage] = useState('');
  const [engine, setEngine] = useState('');
  const [engineMessage, setEngineMessage] = useState('');

  const handleCompress = async () => {
    if (!files[0]) return toast.error('Please upload a PDF');

    setStatus('uploading');
    setProgress(10);
    setOriginalSize(files[0].size);
    setMessage('Uploading...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('level', level);

      setProgress(40);
      setMessage('Compressing PDF (recompressing images)...');

      const response = await fetch('/api/pdf/compress', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Compression failed' }));
        throw new Error(err.error || 'Compression failed');
      }

      const blob = await response.blob();
      const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || String(blob.size));
      const originalSz = parseInt(response.headers.get('X-Original-Size') || String(files[0].size));
      const reduction = parseInt(response.headers.get('X-Reduction-Percent') || '0');
      const imagesRecompressed = parseInt(response.headers.get('X-Images-Recompressed') || '0');
      const alreadyOptimized = response.headers.get('X-Already-Optimized') === 'true';
      const responseEngine = response.headers.get('X-Compression-Engine') || 'PDFAI-Hub Engine';
      const responseMessage = response.headers.get('X-Compression-Message') || '';
      const url = URL.createObjectURL(blob);

      setEngine(responseEngine);
      setEngineMessage(responseMessage);
      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);
      setResultSize(compressedSize);
      setOriginalSize(originalSz);

      if (alreadyOptimized) {
        setMessage('PDF is already optimized — no significant size reduction possible.');
        toast('This PDF is already well-optimized. Downloaded a cleaned copy.', { icon: 'ℹ️', duration: 5000 });
      } else {
        const detail = imagesRecompressed > 0 ? ` (${imagesRecompressed} image${imagesRecompressed > 1 ? 's' : ''} recompressed)` : '';
        setMessage(`Reduced by ${reduction}%${detail}`);
        toast.success(`PDF compressed by ${reduction}%!`);
      }
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Compression failed';
      setMessage(msg);
      toast.error(msg);
    }
  };

  const reset = () => {
    setFiles([]);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setMessage('');
    setEngine('');
    setEngineMessage('');
  };

  return (
    <ToolLayout
      title="PDF Compressor"
      description="Reduce your PDF file size without compromising quality."
      icon="🗜️"
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxFiles={1}
          maxSizeMB={50}
          label="Drop PDF to compress"
        />

        {/* Compression level */}
        {files.length > 0 && status === 'idle' && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Compression Level:</p>
            <div className="grid grid-cols-3 gap-3">
              {levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id as any)}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    level === l.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{l.label}</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{l.desc}</p>
                  <p className="text-xs text-primary mt-1 font-medium">{l.reduction}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        {files.length > 0 && status === 'idle' && (
          <button onClick={handleCompress} className="btn-brand w-full py-3.5 cursor-pointer">
            Compress PDF
          </button>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`compressed-${files[0]?.name || 'file.pdf'}`}
          originalSize={originalSize}
          resultSize={resultSize}
          onReset={reset}
        />

        {status === 'completed' && engine && (
          <div className="rounded-2xl p-5 border border-border bg-card space-y-2 transition-colors duration-300">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compression Diagnostics</h4>
            <div className="text-sm space-y-1">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium text-gray-900 dark:text-white">Engine: </span>
                {engine}
              </p>
              {engineMessage && (
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">Status Details: </span>
                  {engineMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
