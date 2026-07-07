'use client';
// src/app/tools/watermark/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function WatermarkPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('PDFAI HUB');
  const [color, setColor] = useState('#e11d48');
  const [fontSize, setFontSize] = useState(40);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center');
  
  // Image states
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageScale, setImageScale] = useState(0.5);

  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [message, setMessage] = useState('');

  const handleWatermark = async () => {
    if (!files[0]) return toast.error('Please upload a PDF');
    if (type === 'text' && !text.trim()) return toast.error('Enter watermark text');
    if (type === 'image' && !imageFiles[0]) return toast.error('Please upload a watermark image');

    setStatus('uploading');
    setProgress(0);
    setOriginalSize(files[0].size);
    setMessage('Uploading files...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('type', type);
      formData.append('text', text);
      formData.append('color', color);
      formData.append('fontSize', fontSize.toString());
      formData.append('opacity', opacity.toString());
      formData.append('rotation', rotation.toString());
      formData.append('position', position);

      if (type === 'image' && imageFiles[0]) {
        formData.append('image', imageFiles[0]);
        formData.append('imageScale', imageScale.toString());
      }

      const res = await axios.post('/api/pdf/watermark', formData, {
        responseType: 'blob',
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(percent);
          if (percent === 100) {
            setStatus('processing');
            setMessage('Embedding custom watermark onto all PDF pages...');
          }
        },
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultSize(blob.size);
      setStatus('completed');
      setMessage('Custom watermark applied successfully!');
      toast.success('Watermark added!');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Failed to apply watermark.';
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
    setImageFiles([]);
    setText('PDFAI HUB');
    setColor('#e11d48');
    setFontSize(40);
    setOpacity(0.3);
    setRotation(45);
    setPosition('center');
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setOriginalSize(0);
    setResultSize(0);
    setMessage('');
  };

  return (
    <ToolLayout
      title="Watermark PDF"
      description="Apply a fully customized text or image watermark overlay to all pages of your PDF."
      icon="📝"
      isPro={true}
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxFiles={1}
          maxSizeMB={50}
          label="Drop PDF to watermark"
        />

        {files.length > 0 && status === 'idle' && (
          <div className="glass rounded-2xl p-6 border border-border space-y-6">
            <div className="flex gap-2 border-b border-border pb-3">
              <button
                type="button"
                onClick={() => setType('text')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  type === 'text'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                Text Watermark
              </button>
              <button
                type="button"
                onClick={() => setType('image')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  type === 'image'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                Image Watermark
              </button>
            </div>

            {type === 'text' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Watermark Text</label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Font Size ({fontSize}px)</label>
                  <input
                    type="range"
                    min="12"
                    max="100"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full accent-primary mt-3 cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Text Color</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                    />
                    <span className="text-sm font-mono uppercase text-muted-foreground">{color}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Watermark Image (PNG/JPEG)</label>
                  <FileDropzone
                    files={imageFiles}
                    onFilesChange={setImageFiles}
                    acceptedTypes={['image/png', 'image/jpeg', 'image/jpg']}
                    maxFiles={1}
                    maxSizeMB={10}
                    label="Drop png/jpg watermark file here"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Image Scale ({Math.round(imageScale * 100)}%)</label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={imageScale}
                    onChange={(e) => setImageScale(parseFloat(e.target.value))}
                    className="w-full accent-primary mt-3 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Opacity ({Math.round(opacity * 100)}%)</label>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-primary mt-2 cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Rotation ({rotation}°)</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full accent-primary mt-2 cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Position Alignment</label>
                <select
                  value={position}
                  onChange={(e: any) => setPosition(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm cursor-pointer"
                >
                  <option value="center">Center</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>
            </div>

            <button onClick={handleWatermark} className="btn-brand w-full py-3.5 cursor-pointer">
              Apply Watermark & Export
            </button>
          </div>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`watermarked-${files[0]?.name || 'file.pdf'}`}
          originalSize={originalSize}
          resultSize={resultSize}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
