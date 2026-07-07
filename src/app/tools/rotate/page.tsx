'use client';
// src/app/tools/rotate/page.tsx — Theme-aware
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';
import { RotateCw, RotateCcw, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface PageState {
  index: number;
  rotation: number; // 0, 90, 180, 270
}

export default function RotatePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageStates, setPageStates] = useState<PageState[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [message, setMessage] = useState('');

  // Load PDF pages count using pdf-lib in browser
  useEffect(() => {
    async function loadPdfStructure() {
      if (files.length === 0) {
        setPageStates([]);
        return;
      }
      setLoadingPages(true);
      try {
        const file = files[0];
        const arrayBuf = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuf, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        const initialStates: PageState[] = [];
        for (let i = 0; i < count; i++) {
          const page = pdfDoc.getPage(i);
          const currentRotation = page.getRotation().angle;
          initialStates.push({ index: i, rotation: currentRotation });
        }
        setPageStates(initialStates);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to parse PDF pages structure.');
      } finally {
        setLoadingPages(false);
      }
    }
    loadPdfStructure();
  }, [files]);

  const rotatePage = (index: number, direction: 'cw' | 'ccw') => {
    setPageStates((prev) =>
      prev.map((p) => {
        if (p.index !== index) return p;
        let newRot = p.rotation + (direction === 'cw' ? 90 : -90);
        if (newRot < 0) newRot = 270;
        if (newRot >= 360) newRot = 0;
        return { ...p, rotation: newRot };
      })
    );
  };

  const rotateAll = (angle: number) => {
    setPageStates((prev) =>
      prev.map((p) => {
        let newRot = (p.rotation + angle) % 360;
        if (newRot < 0) newRot += 360;
        return { ...p, rotation: newRot };
      })
    );
    toast.success(`Rotated all pages by ${angle}°`);
  };

  const resetAll = () => {
    setPageStates((prev) => prev.map((p) => ({ ...p, rotation: 0 })));
    toast.success('Reset all rotations to 0°');
  };

  const handleExport = async () => {
    if (!files[0]) return toast.error('Please upload a PDF');

    setStatus('uploading');
    setProgress(0);
    setOriginalSize(files[0].size);
    setMessage('Uploading your PDF...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      // Pass the customized page-by-page rotations array
      const customRotations = pageStates.map((p) => ({
        pageIndex: p.index,
        rotation: p.rotation,
      }));
      formData.append('rotations', JSON.stringify(customRotations));

      const res = await axios.post('/api/pdf/rotate', formData, {
        responseType: 'blob',
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(percent);
          if (percent === 100) {
            setStatus('processing');
            setMessage('Processing PDF page rotations...');
          }
        },
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultSize(blob.size);
      setStatus('completed');
      setMessage('PDF pages successfully rotated!');
      toast.success('Pages rotated successfully!');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Failed to rotate pages.';
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
    setPageStates([]);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setOriginalSize(0);
    setResultSize(0);
    setMessage('');
  };

  return (
    <ToolLayout
      title="Rotate PDF"
      description="Rotate individual pages visually or rotate all pages together in seconds."
      icon="🔄"
      isPro={true}
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxFiles={1}
          maxSizeMB={50}
          label="Drop PDF to rotate pages"
        />

        {loadingPages && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing PDF structure...</p>
          </div>
        )}

        {files.length > 0 && pageStates.length > 0 && status === 'idle' && (
          <div className="space-y-6">
            {/* Batch Controls */}
            <div className="glass rounded-2xl p-4 border border-border flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Batch Actions:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => rotateAll(90)}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> +90°
                </button>
                <button
                  type="button"
                  onClick={() => rotateAll(180)}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> +180°
                </button>
                <button
                  type="button"
                  onClick={() => rotateAll(270)}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> -90°
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-red-500/10 hover:text-red-500 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* Interactive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1 border border-border/40 rounded-2xl">
              {pageStates.map((page) => (
                <div
                  key={page.index}
                  className="glass rounded-xl p-4 border border-border flex flex-col items-center gap-3 relative group"
                >
                  <div className="text-xs font-semibold text-muted-foreground">
                    Page {page.index + 1}
                  </div>

                  {/* Thumbnail Visual Container */}
                  <div className="w-24 h-32 bg-card rounded-lg shadow-sm border border-border/80 flex items-center justify-center relative overflow-hidden transition-transform duration-300"
                       style={{ transform: `rotate(${page.rotation}deg)` }}>
                    <div className="absolute top-2 left-2 right-2 border-b border-muted/50 pb-1 text-[8px] font-mono text-muted-foreground truncate">
                      DOCUMENT PREVIEW
                    </div>
                    <div className="text-2xl font-black text-primary/30">
                      {page.index + 1}
                    </div>
                    <div className="absolute bottom-2 right-2 text-[10px] font-bold text-muted-foreground/60">
                      {page.rotation}°
                    </div>
                  </div>

                  {/* Individual page controls */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => rotatePage(page.index, 'ccw')}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Rotate counter-clockwise"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(page.index, 'cw')}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Rotate clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleExport} className="btn-brand w-full py-3.5 cursor-pointer">
              Apply Rotations & Export PDF
            </button>
          </div>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`rotated-${files[0]?.name || 'file.pdf'}`}
          originalSize={originalSize}
          resultSize={resultSize}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
