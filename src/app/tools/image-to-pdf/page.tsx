'use client';
// src/app/tools/image-to-pdf/page.tsx — Theme-aware
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';

export default function ImageToPDFPage() {
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
    if (!files.length) return toast.error('Please add at least one image');

    setStatus('uploading');
    setProgress(10);
    setMessage('Uploading images...');

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('order', JSON.stringify(files.map((_, i) => i)));

      setProgress(50);
      setMessage('Converting to PDF...');

      const response = await fetch('/api/pdf/image-to-pdf', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Conversion failed' }));
        throw new Error(err.error || 'Conversion failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);
      setMessage(`${files.length} image${files.length > 1 ? 's' : ''} converted!`);
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
      title="Image to PDF"
      description="Convert JPG, PNG, and WEBP images to PDF. Drag to reorder."
      icon="🖼️"
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={handleFilesChange}
          acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
          maxFiles={30}
          maxSizeMB={20}
          multiple
          label="Drop images here"
          sublabel="JPG, PNG, WEBP • Up to 30 images • 20MB each"
          showPreview={false}
        />

        {/* Image grid with drag reorder */}
        {files.length > 0 && status === 'idle' && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3 font-sans">
              {files.length} image{files.length > 1 ? 's' : ''} — drag to reorder:
            </p>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="image-list" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex flex-wrap gap-3"
                  >
                    {files.map((file, i) => (
                      <Draggable key={`${file.name}-${i}`} draggableId={`${file.name}-${i}`} index={i}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`relative w-24 h-24 rounded-xl overflow-hidden border border-border bg-card transition-colors duration-300 cursor-grab ${
                              snapshot.isDragging ? 'border-primary shadow-lg scale-105' : ''
                            }`}
                          >
                            <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5">
                              <p className="text-white text-center text-[10px] font-medium">{i + 1}</p>
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
        )}

        {files.length > 0 && status === 'idle' && (
          <button onClick={handleConvert} className="btn-brand w-full py-3.5 cursor-pointer">
            Convert to PDF
          </button>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName="images-converted.pdf"
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
