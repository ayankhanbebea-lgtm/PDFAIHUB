'use client';
// src/app/tools/pdf-to-jpg/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function PDFToJPGPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');
  const [pageCount, setPageCount] = useState(0);

  const handleConvert = async () => {
    if (!files[0]) return toast.error('Upload a PDF document first');
    setStatus('uploading');
    setProgress(15);
    setMessage('Uploading PDF...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      setProgress(50);
      setMessage('Extracting pages to JPG...');

      const response = await fetch('/api/pdf/pdf-to-jpg', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Conversion failed' }));
        throw new Error(err.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Try checking if it's a zip or direct image
      const isZip = blob.type === 'application/zip';

      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);
      setMessage(isZip ? 'PDF pages converted to a zip archive!' : 'PDF page converted to JPG image!');
      toast.success('Successfully converted PDF to JPG!');
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

  const isZip = downloadUrl && files[0] && files[0].name.endsWith('.pdf'); // Zip fallback trigger
  const outputExt = '.zip'; // Safe fallback extension

  return (
    <ToolLayout
      title="PDF to JPG"
      description="Extract all pages in a PDF document or convert them to high-quality JPG images."
      icon="🖼️"
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxSizeMB={50}
          label="Drop PDF document here to extract to JPG"
          sublabel="PDF • Up to 50MB"
        />

        {files.length > 0 && status === 'idle' && (
          <button onClick={handleConvert} className="btn-brand w-full py-3.5 cursor-pointer">
            Convert to JPG
          </button>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`${files[0]?.name.replace(/\.pdf$/i, '') || 'extracted'}-pages${outputExt}`}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
