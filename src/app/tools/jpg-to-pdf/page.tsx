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

  const handleConvert = async () => {
    if (!files.length) return toast.error('Please add at least one JPG image');

    setStatus('uploading');
    setProgress(15);
    setMessage('Uploading images...');

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('order', JSON.stringify(files.map((_, i) => i)));

      setProgress(50);
      setMessage('Converting to PDF...');

      const response = await fetch('/api/pdf/jpg-to-pdf', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Conversion failed' }));
        throw new Error(err.error || 'Conversion failed');
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
