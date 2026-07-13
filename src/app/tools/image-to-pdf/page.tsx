'use client';
// src/app/tools/image-to-pdf/page.tsx — Theme-aware & highly optimized
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';
import { Download, Trash2, CheckSquare, Square, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

// Memory Optimization: LazyImageThumbnail loads and revokes Object URLs dynamically
function LazyImageThumbnail({ file }: { file: File }) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!src) {
    return <div className="w-full h-full bg-secondary animate-pulse" />;
  }
  return <img src={src} alt={file.name} className="w-full h-full object-cover" />;
}

export default function ImageToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [message, setMessage] = useState('');

  // Pagination for virtualized list performance
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 36;

  const totalPages = Math.ceil(files.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, files.length);
  const currentPageFiles = files.slice(startIndex, endIndex);

  // Sync selected index sets
  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === files.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(files.map((_, i) => i)));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedIndices.size === 0) return toast.error('No images selected');
    const nextFiles = files.filter((_, i) => !selectedIndices.has(i));
    setFiles(nextFiles);
    setSelectedIndices(new Set());
    // Adjust current page if needed
    const nextTotalPages = Math.ceil(nextFiles.length / itemsPerPage) || 1;
    if (currentPage > nextTotalPages) {
      setCurrentPage(nextTotalPages);
    }
    toast.success('Removed selected images');
  };

  const handleClearAll = () => {
    setFiles([]);
    setSelectedIndices(new Set());
    setCurrentPage(1);
  };

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const fromIndex = startIndex + result.source.index;
    const toIndex = startIndex + result.destination.index;

    const reorderedFiles = Array.from(files);
    const [removedFile] = reorderedFiles.splice(fromIndex, 1);
    reorderedFiles.splice(toIndex, 0, removedFile);
    setFiles(reorderedFiles);
    
    // Shift selected indices to match new order
    const nextSelected = new Set<number>();
    selectedIndices.forEach((idx) => {
      if (idx === fromIndex) {
        nextSelected.add(toIndex);
      } else if (idx > fromIndex && idx <= toIndex) {
        nextSelected.add(idx - 1);
      } else if (idx < fromIndex && idx >= toIndex) {
        nextSelected.add(idx + 1);
      } else {
        nextSelected.add(idx);
      }
    });
    setSelectedIndices(nextSelected);
  };

  // Reorder buttons for convenience across pages
  const moveItem = (index: number, direction: 'prev' | 'next') => {
    const globalIdx = startIndex + index;
    const targetIdx = direction === 'prev' ? globalIdx - 1 : globalIdx + 1;
    if (targetIdx < 0 || targetIdx >= files.length) return;

    const reordered = Array.from(files);
    const [item] = reordered.splice(globalIdx, 1);
    reordered.splice(targetIdx, 0, item);
    setFiles(reordered);

    // Update selected indices too
    const nextSelected = new Set<number>();
    selectedIndices.forEach((idx) => {
      if (idx === globalIdx) nextSelected.add(targetIdx);
      else if (idx === targetIdx) nextSelected.add(globalIdx);
      else nextSelected.add(idx);
    });
    setSelectedIndices(nextSelected);
  };

  // Compress a single image file client-side using canvas.
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
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
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
    if (!files.length) return toast.error('Please add at least one image');

    setStatus('uploading');
    setProgress(5);
    setMessage('Validating access and usage limits...');

    try {
      // 1. Validate limits and check access with a lightweight request (checkOnly)
      const form = new FormData();
      form.append('checkOnly', 'true');
      form.append('imageCount', String(files.length));

      const checkResponse = await fetch('/api/pdf/image-to-pdf', { method: 'POST', body: form });

      if (!checkResponse.ok) {
        let errMsg = 'Failed limit check';
        try {
          const err = await checkResponse.json();
          errMsg = err.error || err.message || JSON.stringify(err);
        } catch {
          try {
            const txt = await checkResponse.text();
            const match = txt.match(/<title>([\s\S]*?)<\/title>/i);
            const title = match ? match[1].trim() : '';
            errMsg = `Server error (${checkResponse.status} ${checkResponse.statusText}): ${title || txt.substring(0, 150)}`;
          } catch {
            errMsg = `Server error (${checkResponse.status} ${checkResponse.statusText})`;
          }
        }
        throw new Error(errMsg);
      }

      // 2. Compress and resize images client-side sequentially
      const compressed: File[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(10 + Math.round((i / files.length) * 40));
        setMessage(`Processing image ${i + 1} of ${files.length}...`);
        const f = await compressImage(files[i]);
        compressed.push(f);
      }

      setProgress(50);
      setMessage('Importing PDF engine...');

      // 3. Import pdf-lib dynamically to avoid hydration or SSR issues
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.create();

      // 4. Sequentially embed images into the PDF document in browser memory
      for (let i = 0; i < compressed.length; i++) {
        setProgress(55 + Math.round((i / compressed.length) * 35));
        setMessage(`Generating PDF pages: ${i + 1} of ${compressed.length}...`);

        const file = compressed[i];
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        let image;
        if (file.type === 'image/png') {
          image = await doc.embedPng(buffer);
        } else {
          // Fallback to JPEG for jpeg, jpg, webp (which got compressed to jpeg)
          image = await doc.embedJpg(buffer);
        }

        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      setProgress(90);
      setMessage('Compiling final PDF...');

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
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
    setSelectedIndices(new Set());
    setCurrentPage(1);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setMessage('');
  };

  return (
    <ToolLayout
      title="Image to PDF"
      description="Convert JPG, PNG, and WEBP images to PDF. Drag to reorder or paginate through large uploads."
      icon="🖼️"
    >
      <div className="space-y-6">
        {status === 'idle' && (
          <FileDropzone
            files={files}
            onFilesChange={handleFilesChange}
            acceptedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
            maxFiles={1000} // High limit to allow unlimited files
            maxSizeMB={20}
            multiple
            label="Drop images here"
            sublabel="JPG, PNG, WEBP • Unlimited uploads • 20MB per image"
            showPreview={false}
          />
        )}

        {files.length > 0 && status === 'idle' && (
          <div className="space-y-4">
            {/* Control buttons bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/20 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground text-xs font-semibold rounded-xl hover:bg-secondary/80 cursor-pointer"
                >
                  {selectedIndices.size === files.length ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                  {selectedIndices.size === files.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleRemoveSelected}
                  disabled={selectedIndices.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 text-xs font-semibold rounded-xl hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Selected ({selectedIndices.size})
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Clear All
                </button>
              </div>
              <p className="text-xs text-muted-foreground font-semibold font-sans">
                Total uploads: {files.length} images
              </p>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Showing {startIndex + 1}–{endIndex} of {files.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1.5 bg-secondary hover:bg-secondary/80 disabled:opacity-40 rounded-lg cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1.5 bg-secondary hover:bg-secondary/80 disabled:opacity-40 rounded-lg cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Draggable grid representing current page files */}
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="image-list-grid" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 bg-secondary/10 p-4 rounded-3xl border border-white/5"
                  >
                    {currentPageFiles.map((file, i) => {
                      const globalIdx = startIndex + i;
                      const isSelected = selectedIndices.has(globalIdx);

                      return (
                        <Draggable key={`${file.name}-${globalIdx}`} draggableId={`${file.name}-${globalIdx}`} index={i}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`relative aspect-square rounded-2xl overflow-hidden border bg-card transition-all duration-300 cursor-grab group select-none ${
                                snapshot.isDragging
                                  ? 'border-primary shadow-2xl scale-105 z-50'
                                  : isSelected
                                  ? 'border-primary/60 ring-2 ring-primary/20'
                                  : 'border-border hover:border-muted-foreground/40'
                              }`}
                            >
                              <LazyImageThumbnail file={file} />
                              
                              {/* Overlay for index count & selection */}
                              <div className="absolute top-2 left-2 z-10">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(globalIdx)}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                />
                              </div>

                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 flex items-center justify-between px-2">
                                <span className="text-white text-[10px] font-black">{globalIdx + 1}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveItem(i, 'prev');
                                    }}
                                    disabled={globalIdx === 0}
                                    className="text-white hover:text-primary disabled:opacity-30"
                                  >
                                    ◀
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveItem(i, 'next');
                                    }}
                                    disabled={globalIdx === files.length - 1}
                                    className="text-white hover:text-primary disabled:opacity-30"
                                  >
                                    ▶
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <button onClick={handleConvert} className="btn-brand w-full py-4 cursor-pointer text-sm font-bold mt-4 shadow-lg shadow-primary/10">
              Convert {files.length} Image{files.length > 1 ? 's' : ''} to PDF
            </button>
          </div>
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
