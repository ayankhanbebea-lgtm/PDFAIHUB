'use client';
// src/app/tools/split/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Download } from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

interface Range { start: number; end: number; name: string; }
interface SplitResult { url: string; name: string; pageCount: number; size: number; }

export default function SplitPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [ranges, setRanges] = useState<Range[]>([{ start: 1, end: 1, name: 'Part 1' }]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [message, setMessage] = useState('');

  const addRange = () => setRanges([...ranges, { start: 1, end: 1, name: `Part ${ranges.length + 1}` }]);
  const removeRange = (i: number) => setRanges(ranges.filter((_, idx) => idx !== i));
  const updateRange = (i: number, field: keyof Range, value: any) => {
    const updated = [...ranges];
    updated[i] = { ...updated[i], [field]: value };
    setRanges(updated);
  };

  const handleSplit = async () => {
    if (!files[0]) return toast.error('Upload a PDF first');
    if (!ranges.length) return toast.error('Add at least one range');
    if (ranges.some(r => r.start > r.end || r.start < 1)) return toast.error('Invalid page ranges');

    setStatus('uploading');
    setProgress(20);
    setMessage('Uploading PDF...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('ranges', JSON.stringify(ranges));

      setProgress(50);
      setMessage('Splitting pages...');

      const response = await fetch('/api/pdf/split', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Split failed' }));
        throw new Error(err.error || 'Split failed');
      }

      const data = await response.json();

      setProgress(100);
      setStatus('completed');
      setResults(data.files.map((f: any) => ({ ...f, url: f.dataUrl })));
      setMessage(`PDF split into ${data.files.length} parts`);
      toast.success('PDF split successfully!');
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Split failed';
      setMessage(msg);
      toast.error(msg);
    }
  };

  const reset = () => {
    setFiles([]); setStatus('idle'); setProgress(0);
    setResults([]); setMessage('');
    setRanges([{ start: 1, end: 1, name: 'Part 1' }]);
  };

  return (
    <ToolLayout title="PDF Splitter" description="Split PDF by page ranges or extract specific pages." icon="✂️">
      <div className="space-y-6">
        <FileDropzone files={files} onFilesChange={setFiles} acceptedTypes={['application/pdf']} maxSizeMB={50} label="Drop PDF to split" />

        {files.length > 0 && status === 'idle' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">Page Ranges</p>
                <button onClick={addRange} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 cursor-pointer">
                  <Plus className="w-4 h-4" /> Add Range
                </button>
              </div>
              <div className="space-y-3">
                {ranges.map((range, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border transition-colors duration-300">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground/60 block mb-1">Start Page</label>
                        <input type="number" min={1} value={range.start}
                          onChange={(e) => updateRange(i, 'start', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground/60 block mb-1">End Page</label>
                        <input type="number" min={1} value={range.end}
                          onChange={(e) => updateRange(i, 'end', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground/60 block mb-1">Name</label>
                        <input type="text" value={range.name}
                          onChange={(e) => updateRange(i, 'name', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    {ranges.length > 1 && (
                      <button onClick={() => removeRange(i)} className="p-2 rounded-lg hover:bg-destructive/10 text-red-500 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleSplit} className="btn-brand w-full py-3.5 cursor-pointer">Split PDF</button>
          </>
        )}

        {status === 'completed' && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Download Split Files:</p>
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl transition-colors duration-300">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground/60">{r.pageCount} page{r.pageCount > 1 ? 's' : ''}</p>
                </div>
                <a href={r.url} download={r.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors cursor-pointer">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            ))}
            <button onClick={reset} className="btn-ghost w-full py-2.5 text-sm cursor-pointer">Split Another PDF</button>
          </div>
        )}
        <UploadProgress progress={progress} status={status === 'completed' ? 'idle' : status} message={message} onReset={reset} />
      </div>
    </ToolLayout>
  );
}
