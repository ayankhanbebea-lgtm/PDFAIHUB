'use client';
// src/app/tools/powerpoint-to-pdf/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function PowerPointToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleConvert = async () => {
    if (!files[0]) return toast.error('Upload a PowerPoint presentation first');
    setStatus('uploading');
    setProgress(15);
    setMessage('Uploading presentation...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      setProgress(50);
      setMessage('Converting to PDF...');

      const response = await fetch('/api/pdf/powerpoint-to-pdf', { method: 'POST', body: formData });

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
      toast.success('Converted to PDF!');
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
      title="PowerPoint to PDF"
      description="Convert Microsoft PowerPoint presentations (.pptx and .ppt) to PDF format online."
      icon="📊"
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint']}
          maxSizeMB={50}
          label="Drop PowerPoint document here to convert to PDF"
          sublabel="PPTX, PPT • Up to 50MB"
        />

        {files.length > 0 && status === 'idle' && (
          <button onClick={handleConvert} className="btn-brand w-full py-3.5 cursor-pointer">
            Convert to PDF
          </button>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`${files[0]?.name.replace(/\.(ppt|pptx)$/i, '') || 'presentation'}.pdf`}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
