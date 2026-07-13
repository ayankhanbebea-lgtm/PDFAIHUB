'use client';
// src/app/tools/jpg-to-pdf/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function JPGToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const reorderedFiles = Array.from(files);
    const reorderedPreviews = Array.from(previews);
    const [removedFile] = reorderedFiles.splice(result.source.index, 1);
    const [removedPreview] = reorderedPreviews.splice(result.source.index, 1);
    reorderedFiles.splice(result.destination.index, 0, removedFile);
    reorderedPreviews.splice(result.destination.index, 0, removedPreview);
    setFiles(reorderedFiles);
    setPreviews(reorderedPreviews);
  };

  // Compress a single JPG/JPEG image file client-side using canvas.
  // Downscales images wider/taller than maxDim and re-encodes as JPEG.
  const compressImage = (file: File, maxDim = 3000, quality = 0.85): Promise<File> => {
    return new Promise((resolve) => {
      // If already small enough, skip compression
      if (file.size < 500 * 1024) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        const longest = Math.max(width, height);
        if (longest > maxDim) {
          const scale = maxDim / longest;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size > file.size) {
              resolve(file); // Use original if compression made it bigger
              return;
            }
            const compressed = new File([blob], file.name, { type: 'image/jpeg' });
            resolve(compressed);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const handleConvert = async () => {
    if (!files.length) return toast.error('Please add at least one JPG image');

    setStatus('uploading');
    setProgress(5);
    setMessage('Preparing JPG images...');

    try {
      // Compress all JPG images client-side sequentially to keep memory usage low
      const compressed: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = await compressImage(files[i]);
        compressed.push(f);
        setProgress(5 + Math.round((i + 1) / files.length * 45));
        setMessage(`Preparing image ${i + 1} of ${files.length}...`);
      }

      setProgress(50);
      setMessage('Uploading JPG images...');

      const formData = new FormData();
      compressed.forEach((f) => formData.append('files', f));
      formData.append('order', JSON.stringify(compressed.map((_, i) => i)));

      setProgress(60);
      setMessage('Converting to PDF...');

      const response = await fetch('/api/pdf/jpg-to-pdf', { method: 'POST', body: formData });

      if (!response.ok) {
        let errMsg = 'Conversion failed';
        try {
          const err = await response.json();
          errMsg = err.error || err.message || (err.stack ? `${err.error}\n${err.stack}` : JSON.stringify(err));
        } catch {
          try {
            const txt = await response.text();
            const match = txt.match(/<title>([\s\S]*?)<\/title>/i);
            const title = match ? match[1].trim() : '';
            errMsg = `Server error (${response.status} ${response.statusText}): ${title || txt.substring(0, 150)}`;
          } catch {
            errMsg = `Server error (${response.status} ${response.statusText})`;
          }
        }
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);
      setMessage(`${files.length} JPG image${files.length > 1 ? 's' : ''} converted!`);
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
    setPreviews([]);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setMessage('');
  };

  return (
    <ToolLayout
      title="JPG to PDF"
      description="Convert JPG and JPEG images to a single high-quality PDF document. Drag to reorder pages."
      icon="🖼️"
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={handleFilesChange}
          acceptedTypes={['image/jpeg', 'image/jpg']}
          maxFiles={30}
          maxSizeMB={20}
          multiple
          label="Drop JPG images here"
          sublabel="JPG or JPEG • Up to 30 images • 20MB each"
          showPreview={false}
        />

        {files.length > 0 && status === 'idle' && (
          <div className="space-y-6">
            {/* Reorder preview */}
            <div className="glass rounded-3xl p-6 border border-white/10">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Reorder images (Drag & Drop)</h3>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="images" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex flex-wrap gap-4"
                    >
                      {previews.map((preview, index) => (
                        <Draggable key={preview} draggableId={preview} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border group shadow-sm bg-card cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                {index + 1}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <button onClick={handleConvert} className="btn-brand w-full py-3.5 cursor-pointer">
              Convert to PDF
            </button>
          </div>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`${files[0]?.name.replace(/\.(jpg|jpeg)$/i, '') || 'converted'}.pdf`}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
