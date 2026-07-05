'use client';
// src/app/tools/merge/page.tsx — Theme-aware
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { GripVertical, FileText, Merge } from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';
import { formatBytes } from '@/lib/utils';

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [message, setMessage] = useState('');

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const reordered = Array.from(files);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setFiles(reordered);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast.error('Please add at least 2 PDFs to merge');
      return;
    }

    setStatus('uploading');
    setProgress(10);
    setMessage('Uploading PDFs...');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('order', JSON.stringify(files.map((_, i) => i)));

      setProgress(40);
      setMessage('Merging PDFs...');

      const response = await fetch('/api/pdf/merge', { method: 'POST', body: formData });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to merge PDFs' }));
        throw new Error(err.error || 'Failed to merge PDFs');
      }

      const blob = await response.blob();
      const size = parseInt(response.headers.get('X-File-Size') || String(blob.size));
      const url = URL.createObjectURL(blob);

      setProgress(100);
      setStatus('completed');
      setDownloadUrl(url);
      setResultSize(size);
      setMessage(`${files.length} PDFs merged successfully!`);
      toast.success('PDFs merged!');
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Failed to merge PDFs';
      setMessage(msg);
      toast.error(msg);
    }
  };

  const reset = () => {
    setFiles([]);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setMessage('');
  };

  return (
    <ToolLayout
      title="PDF Merge"
      description="Combine multiple PDFs into a single document. Drag to reorder pages."
      icon="🔗"
      seoContent={<MergeSEO />}
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxFiles={20}
          maxSizeMB={50}
          multiple
          label="Drop PDFs here to merge"
          sublabel="Upload up to 20 PDFs • Max 50MB each"
        />

        {/* Drag to reorder */}
        {files.length > 1 && status === 'idle' && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Drag to reorder files:
            </p>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="pdf-list">
                {(provided) => (
                  <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {files.map((file, i) => (
                      <Draggable key={`${file.name}-${i}`} draggableId={`${file.name}-${i}`} index={i}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors duration-300 ${
                              snapshot.isDragging
                                ? 'border-primary bg-primary/10 shadow-lg'
                                : 'border-border bg-card'
                            }`}
                          >
                            <span
                              {...provided.dragHandleProps}
                              className="drag-handle text-muted-foreground hover:text-foreground"
                            >
                              <GripVertical className="w-4 h-4" />
                            </span>
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground/80">{formatBytes(file.size)}</span>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}

        {/* Merge button */}
        {files.length >= 2 && status === 'idle' && (
          <button onClick={handleMerge} className="btn-brand w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer">
            <Merge className="w-4 h-4" />
            Merge {files.length} PDFs
          </button>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName="merged.pdf"
          resultSize={resultSize}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}

function MergeSEO() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How to Merge PDFs Online</h2>
      <p className="text-gray-600 dark:text-gray-400">
        PDFAI Hub makes it easy to combine multiple PDF files into one document. Upload your PDFs,
        drag to reorder them, and click merge. Your combined PDF is ready to download in seconds.
      </p>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">Why use PDFAI Hub to merge PDFs?</h3>
      <ul className="space-y-2 text-gray-600 dark:text-gray-400 list-none pl-0">
        {['100% secure — files are deleted after processing', 'Merge up to 20 PDFs at once', 'Drag & drop to reorder pages', 'Works on all devices — no app required', 'Free to use — no signup needed'].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="text-green-500">✓</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
