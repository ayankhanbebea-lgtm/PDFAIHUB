'use client';
// src/app/tools/pdf-to-word/page.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function PDFToWordPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleConvert = async () => {
    if (!files[0]) return toast.error('Upload a PDF first');
    setStatus('uploading');
    setProgress(15);
    setMessage('Uploading PDF...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      setProgress(50);
      setMessage('Converting to Word...');

      const response = await fetch('/api/pdf/pdf-to-word', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Conversion failed' }));
        throw new Error(err.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const hasText = response.headers.get('X-Has-Selectable-Text') === 'true';
      const url = URL.createObjectURL(blob);

      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);

      if (!hasText) {
        setMessage('Converted — note: PDF appears image-based. See DOCX for details.');
        toast('PDF appears to be image-based. A DOCX with a note was created. Use AI OCR for full text.', {
          icon: '⚠️',
          duration: 7000,
        });
      } else {
        setMessage('Conversion complete!');
        toast.success('PDF converted to Word!');
      }
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Conversion failed';
      setMessage(msg);
      toast.error(msg);
    }
  };

  const reset = () => { setFiles([]); setStatus('idle'); setProgress(0); setDownloadUrl(''); setMessage(''); };


  return (
    <ToolLayout
      title="PDF to Word"
      description="Convert PDF files to editable Microsoft Word (.docx) format."
      icon="📝"
      seoContent={
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Convert PDF to Word Online — Free</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Need to edit a PDF? PDFAI Hub converts your PDF to an editable Word (.docx) document in seconds.
            Our converter preserves formatting, tables, and text as accurately as possible.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">How it works</h3>
          <ol className="space-y-2 text-gray-400">
            {['Upload your PDF file', 'Click "Convert to Word"', 'Download the editable DOCX file'].map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-sm text-[#9CA3AF]">
                <span className="w-6 h-6 rounded-full bg-[#10B981]/15 text-[#10B981] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      }
    >
      <div className="space-y-6">
        <FileDropzone files={files} onFilesChange={setFiles} acceptedTypes={['application/pdf']} maxSizeMB={50} label="Drop PDF to convert to Word" />
        {files.length > 0 && status === 'idle' && (
          <button onClick={handleConvert} className="btn-brand w-full py-3.5">Convert to Word (.docx)</button>
        )}
        <UploadProgress
          progress={progress} status={status} message={message}
          downloadUrl={downloadUrl} downloadName={files[0]?.name.replace('.pdf', '.docx') || 'converted.docx'}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
