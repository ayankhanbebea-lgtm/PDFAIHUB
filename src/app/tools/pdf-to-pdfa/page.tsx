'use client';
// src/app/tools/pdf-to-pdfa/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function PDFToPDFAPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleConvert = async () => {
    if (!files[0]) return toast.error('Upload a PDF document first');
    setStatus('uploading');
    setProgress(15);
    setMessage('Uploading PDF...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      setProgress(50);
      setMessage('Converting to PDF/A (ISO standard)...');

      const response = await fetch('/api/pdf/pdf-to-pdfa', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Conversion failed' }));
        throw new Error(err.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);
      setMessage('Conversion complete!');
      toast.success('Successfully converted PDF to PDF/A!');
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Conversion failed';
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
  };

  return (
    <ToolLayout
      title="PDF to PDF/A"
      description="Convert PDF documents to PDF/A ISO archive standard for long-term preservation."
      icon="🏛️"
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxSizeMB={50}
          label="Drop PDF document here to convert to PDF/A"
          sublabel="PDF • Up to 50MB"
        />

        {files.length > 0 && status === 'idle' && (
          <button onClick={handleConvert} className="btn-brand w-full py-3.5 cursor-pointer">
            Convert to PDF/A
          </button>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`${files[0]?.name.replace(/\.pdf$/i, '') || 'document'}-pdfa.pdf`}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
