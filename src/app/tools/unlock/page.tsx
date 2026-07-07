'use client';
// src/app/tools/unlock/page.tsx — Theme-aware
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';
import { Lock, Unlock, RefreshCw } from 'lucide-react';

export default function UnlockPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [encrypted, setEncrypted] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [password, setPassword] = useState('');

  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function checkPdfEncryption() {
      if (files.length === 0) {
        setEncrypted(false);
        setPassword('');
        return;
      }
      setLoadingStructure(true);
      try {
        const file = files[0];
        const arrayBuf = await file.arrayBuffer();
        // Try loading without password
        await PDFDocument.load(arrayBuf, { ignoreEncryption: false });
        setEncrypted(false);
      } catch (err: any) {
        const msg = err.message?.toLowerCase() || '';
        if (msg.includes('encrypt') || msg.includes('password') || msg.includes('decrypt')) {
          setEncrypted(true);
        } else {
          setEncrypted(false);
        }
      } finally {
        setLoadingStructure(false);
      }
    }
    checkPdfEncryption();
  }, [files]);

  const handleUnlock = async () => {
    if (!files[0]) return toast.error('Please upload a PDF');
    if (encrypted && !password) return toast.error('Enter the decryption password');

    setStatus('uploading');
    setProgress(0);
    setOriginalSize(files[0].size);
    setMessage(encrypted ? 'Uploading encrypted PDF...' : 'Uploading PDF...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      if (encrypted) {
        formData.append('password', password);
      }

      const res = await axios.post('/api/pdf/unlock', formData, {
        responseType: 'blob',
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(percent);
          if (percent === 100) {
            setStatus('processing');
            setMessage(encrypted ? 'Decrypting and verifying password...' : 'Processing document...');
          }
        },
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultSize(blob.size);
      setStatus('completed');
      setMessage(encrypted ? 'PDF successfully unlocked!' : 'Document processed successfully!');
      toast.success(encrypted ? 'Security removed successfully!' : 'Unlocked PDF downloaded!');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Decryption failed. Please verify your password.';
      if (err.response?.data instanceof Blob) {
        try {
          const textMsg = await err.response.data.text();
          const json = JSON.parse(textMsg);
          if (json.error) errorMsg = json.error;
        } catch (_) {}
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      setStatus('error');
      setMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  const reset = () => {
    setFiles([]);
    setEncrypted(false);
    setPassword('');
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setOriginalSize(0);
    setResultSize(0);
    setMessage('');
  };

  return (
    <ToolLayout
      title="Unlock PDF"
      description="Remove password security, permissions constraints, and encryption from locked PDFs."
      icon="🔓"
      isPro={true}
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxFiles={1}
          maxSizeMB={50}
          label="Drop locked PDF to decrypt"
        />

        {loadingStructure && (
          <div className="flex flex-col items-center justify-center py-6 space-y-2">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Checking document security encryption status...</p>
          </div>
        )}

        {files.length > 0 && !loadingStructure && status === 'idle' && (
          <div className="glass rounded-2xl p-6 border border-border space-y-4">
            {encrypted ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                  <Lock className="w-4 h-4" /> This PDF is password-protected
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Decryption Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to unlock..."
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>
                <button onClick={handleUnlock} className="btn-brand w-full py-3.5 cursor-pointer">
                  Decrypt & Unlock PDF
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-500">
                  <Unlock className="w-4 h-4" /> This PDF does not require unlocking
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  This document is not password-protected or encrypted. Unlocking is not required.
                </p>
              </div>
            )}
          </div>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`unlocked-${files[0]?.name || 'file.pdf'}`}
          originalSize={originalSize}
          resultSize={resultSize}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
