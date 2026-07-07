'use client';
// src/app/tools/organize/page.tsx — Theme-aware
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import { UploadProgress } from '@/components/tools/upload-progress';
import { Trash2, Copy, RotateCw, RefreshCw, GripVertical } from 'lucide-react';

interface OrganizePageItem {
  id: string;
  originalIndex: number;
  rotation: number;
}

export default function OrganizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageItems, setPageItems] = useState<OrganizePageItem[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse pages on selection
  useEffect(() => {
    async function loadPdfStructure() {
      if (files.length === 0) {
        setPageItems([]);
        return;
      }
      setLoadingPages(true);
      try {
        const file = files[0];
        const arrayBuf = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuf, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        const initialItems: OrganizePageItem[] = [];
        for (let i = 0; i < count; i++) {
          initialItems.push({
            id: `page-${i}-${Math.random().toString(36).substr(2, 9)}`,
            originalIndex: i,
            rotation: 0,
          });
        }
        setPageItems(initialItems);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to analyze PDF pages.');
      } finally {
        setLoadingPages(false);
      }
    }
    loadPdfStructure();
  }, [files]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(pageItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setPageItems(items);
  };

  const rotatePage = (id: string) => {
    setPageItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, rotation: (item.rotation + 90) % 360 };
      })
    );
  };

  const deletePage = (id: string) => {
    setPageItems((prev) => {
      const nextList = prev.filter((item) => item.id !== id);
      if (nextList.length === 0) {
        toast.error('PDF must contain at least 1 page!');
        return prev;
      }
      return nextList;
    });
  };

  const duplicatePage = (id: string) => {
    setPageItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx === -1) return prev;
      const target = prev[idx];
      const clone: OrganizePageItem = {
        ...target,
        id: `clone-${target.originalIndex}-${Math.random().toString(36).substr(2, 9)}`,
      };
      const result = [...prev];
      result.splice(idx + 1, 0, clone);
      return result;
    });
    toast.success('Page duplicated!');
  };

  const handleExport = async () => {
    if (!files[0]) return toast.error('Please upload a PDF');
    if (pageItems.length === 0) return toast.error('Add at least one page');

    setStatus('uploading');
    setProgress(0);
    setOriginalSize(files[0].size);
    setMessage('Uploading your PDF...');

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      
      const payload = pageItems.map((item) => ({
        originalIndex: item.originalIndex,
        rotation: item.rotation,
      }));
      formData.append('pages', JSON.stringify(payload));

      const res = await axios.post('/api/pdf/organize', formData, {
        responseType: 'blob',
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(percent);
          if (percent === 100) {
            setStatus('processing');
            setMessage('Building reorganized PDF file structure...');
          }
        },
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultSize(blob.size);
      setStatus('completed');
      setMessage('PDF pages organized successfully!');
      toast.success('PDF successfully organized!');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Failed to organize PDF.';
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
    setPageItems([]);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl('');
    setOriginalSize(0);
    setResultSize(0);
    setMessage('');
  };

  return (
    <ToolLayout
      title="Organize PDF"
      description="Rearrange, delete, duplicate, and rotate individual pages visually using drag and drop."
      icon="📊"
      isPro={true}
    >
      <div className="space-y-6">
        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxFiles={1}
          maxSizeMB={50}
          label="Drop PDF to organize pages"
        />

        {loadingPages && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing PDF structure...</p>
          </div>
        )}

        {mounted && files.length > 0 && pageItems.length > 0 && status === 'idle' && (
          <div className="space-y-6">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="pages" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto p-2 border border-border/40 rounded-2xl bg-secondary/15"
                  >
                    {pageItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className="glass rounded-xl p-3 border border-border bg-card flex flex-col items-center gap-3 relative select-none"
                          >
                            <div className="flex items-center w-full justify-between">
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                Page {item.originalIndex + 1}
                              </span>
                              <div
                                {...dragProvided.dragHandleProps}
                                className="p-1 rounded hover:bg-secondary cursor-grab text-muted-foreground"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            {/* Page Visual Preview */}
                            <div
                              className="w-20 h-28 bg-card rounded shadow-sm border border-border/80 flex items-center justify-center relative overflow-hidden transition-transform duration-300"
                              style={{ transform: `rotate(${item.rotation}deg)` }}
                            >
                              <div className="text-xl font-bold text-primary/30">
                                {item.originalIndex + 1}
                              </div>
                            </div>

                            {/* Action Tools */}
                            <div className="flex justify-between w-full border-t border-border/60 pt-2 gap-1">
                              <button
                                type="button"
                                onClick={() => rotatePage(item.id)}
                                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Rotate page 90°"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicatePage(item.id)}
                                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Duplicate page"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePage(item.id)}
                                className="p-1.5 rounded hover:bg-secondary text-red-500 hover:bg-red-500/15 transition-colors cursor-pointer"
                                title="Delete page"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

            <button onClick={handleExport} className="btn-brand w-full py-3.5 cursor-pointer">
              Export Organized PDF
            </button>
          </div>
        )}

        <UploadProgress
          progress={progress}
          status={status}
          message={message}
          downloadUrl={downloadUrl}
          downloadName={`organized-${files[0]?.name || 'file.pdf'}`}
          originalSize={originalSize}
          resultSize={resultSize}
          onReset={reset}
        />
      </div>
    </ToolLayout>
  );
}
