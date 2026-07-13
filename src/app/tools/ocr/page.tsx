'use client';
// src/app/tools/ocr/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';
import { Copy, Download, FileText, RefreshCw, Check } from 'lucide-react';

export default function OCRPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);

  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleOCR = async () => {
    if (!files[0]) return toast.error('Please upload a PDF or image file');

    setStatus('uploading');
    setProgress(0);
    setExtractedText('');
    setMessage('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const res = await axios.post('/api/pdf/ocr', formData, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(percent);
          if (percent === 100) {
            setStatus('processing');
            setMessage('Running OCR text extraction engine... This might take up to a minute.');
          }
        },
      });

      setExtractedText(res.data.text || 'No text found.');
      setStatus('completed');
      setMessage('OCR Text extraction completed!');
      toast.success('Text extracted successfully!');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      const rawErr = err.response?.data?.error;
      const errorMsg = typeof rawErr === 'string'
        ? rawErr
        : (rawErr?.message || err.message || 'OCR extraction failed.');
      setMessage(errorMsg);
      toast.error('Operation failed.');
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      toast.success('Text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy text.');
    }
  };

  const handleDownloadTxt = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${files[0]?.name.replace(/\.[^/.]+$/, '') || 'extracted'}-ocr.txt`;
    a.click();
    toast.success('TXT file downloaded!');
  };

  const handleDownloadDocx = async () => {
    if (!extractedText) return;
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: extractedText.split('\n').map((line) => {
              return new Paragraph({
                children: [new TextRun({ text: line, font: 'Arial', size: 24 })],
                spacing: { after: 120 },
              });
            }),
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${files[0]?.name.replace(/\.[^/.]+$/, '') || 'extracted'}-ocr.docx`;
      a.click();
      toast.success('DOCX file downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to compile DOCX.');
    }
  };

  const reset = () => {
    setFiles([]);
    setExtractedText('');
    setStatus('idle');
    setProgress(0);
    setMessage('');
  };

  return (
    <ToolLayout
      title="OCR Text Extractor"
      description="Convert scanned PDFs, book pages, or images into fully selectable plain text."
      icon="🔍"
      isPro={true}
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']}
          maxFiles={1}
          maxSizeMB={20}
          label="Drop scanned PDF or image to extract text"
        />

        {files.length > 0 && status === 'idle' && (
          <button onClick={handleOCR} className="btn-brand w-full py-3.5 cursor-pointer">
            Run OCR & Extract Text
          </button>
        )}

        {status !== 'completed' && (
          <UploadProgress
            progress={progress}
            status={status}
            message={message}
            originalSize={files[0]?.size || 0}
            onReset={reset}
          />
        )}

        {status === 'completed' && extractedText && (
          <div className="glass rounded-2xl p-5 border border-border space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Extracted Text Preview
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> TXT
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> DOCX
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={extractedText}
              className="w-full h-[220px] rounded-xl bg-card border border-border p-4 text-sm font-mono text-foreground focus:outline-none resize-none"
            />

            <button onClick={reset} className="btn-ghost w-full py-3">
              Start New OCR Scan
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
