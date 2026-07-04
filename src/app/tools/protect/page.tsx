'use client';
// src/app/tools/protect/page.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function ProtectPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleProtect = async () => {
    if (!files[0]) return toast.error('Upload a PDF first');
    if (mode === 'add' && !password.trim()) return toast.error('Enter a password');

    setStatus('uploading');
    setProgress(20);
    setMessage(mode === 'add' ? 'Adding password protection...' : 'Removing password...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('mode', mode);
      if (mode === 'add') formData.append('password', password);

      setProgress(60);
      const response = await fetch('/api/pdf/protect', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Operation failed' }));
        throw new Error(err.error || 'Operation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);
      setMessage(mode === 'add' ? 'Password added successfully!' : 'Password removed!');
      toast.success(mode === 'add' ? 'PDF password protected!' : 'Password removed!');
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Operation failed';
      setMessage(msg);
      toast.error(msg);
    }
  };


  const reset = () => {
    setFiles([]); setStatus('idle'); setProgress(0);
    setDownloadUrl(''); setMessage(''); setPassword('');
  };

  return (
    <ToolLayout
      title="PDF Password Protection"
      description="Add or remove password protection from your PDF files."
      icon="🔒"
    >
      <div className="space-y-6">
        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'add', label: 'Add Password', icon: Lock, desc: 'Encrypt & protect PDF' },
            { id: 'remove', label: 'Remove Password', icon: Unlock, desc: 'Decrypt protected PDF' },
          ].map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => setMode(id as any)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                mode === id
                  ? 'border-[#10B981] bg-[#10B981]/10 text-white'
                  : 'border-[#1F2937] hover:border-[#374151]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${mode === id ? 'text-[#10B981]' : 'text-gray-400'}`} />
              <p className="font-semibold text-sm text-white">{label}</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxSizeMB={50}
          label={mode === 'add' ? 'Drop PDF to protect' : 'Drop protected PDF'}
        />

        {files.length > 0 && status === 'idle' && mode === 'add' && (
          <div>
            <label className="text-sm font-medium text-[#9CA3AF] block mb-1.5">
              Set Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-[#111827] border border-[#1F2937] text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Use a strong password. You'll need it to open the PDF.
            </p>
          </div>
        )}

        {files.length > 0 && status === 'idle' && (
          <button onClick={handleProtect} className="btn-brand w-full py-3.5 flex items-center justify-center gap-2">
            {mode === 'add' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {mode === 'add' ? 'Add Password Protection' : 'Remove Password'}
          </button>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`${mode === 'add' ? 'protected' : 'unlocked'}-${files[0]?.name || 'file.pdf'}`}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
