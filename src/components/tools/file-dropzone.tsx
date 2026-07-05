'use client';
// src/components/tools/file-dropzone.tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Image, AlertCircle } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface FileDropzoneProps {
  onFilesChange: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  files: File[];
  showPreview?: boolean;
  allowReorder?: boolean;
}

export function FileDropzone({
  onFilesChange,
  acceptedTypes = ['application/pdf'],
  maxFiles = 1,
  maxSizeMB = 50,
  multiple = false,
  label = 'Drop your file here',
  sublabel,
  files,
  showPreview = true,
}: FileDropzoneProps) {
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      setError('');

      if (rejected.length > 0) {
        const firstError = rejected[0].errors[0];
        if (firstError.code === 'file-too-large') {
          setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
        } else if (firstError.code === 'file-invalid-type') {
          setError('Invalid file type. Please upload the correct format.');
        } else {
          setError(firstError.message);
        }
        return;
      }

      if (multiple) {
        const combined = [...files, ...accepted].slice(0, maxFiles);
        onFilesChange(combined);
      } else {
        onFilesChange(accepted.slice(0, 1));
      }
    },
    [files, multiple, maxFiles, maxSizeMB, onFilesChange]
  );

  const accept = acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {});

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: multiple ? maxFiles : 1,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple,
  });

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  const isPDF = (file: File) => file.type === 'application/pdf';
  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`upload-zone transition-all ${isDragActive ? 'dragover' : ''} ${files.length > 0 && !multiple ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-primary/20' : 'bg-secondary'}`}>
            <Upload className={`w-7 h-7 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {isDragActive ? 'Drop files here...' : label}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {sublabel || `or click to browse • Max ${maxSizeMB}MB${multiple ? ` • Up to ${maxFiles} files` : ''}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {acceptedTypes.map((type) => (
              <span key={type} className="text-xs px-2 py-1 rounded-lg bg-secondary text-muted-foreground">
                {type.split('/')[1]?.toUpperCase() || type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 rounded-xl px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File list */}
      {showPreview && files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {files.map((file, i) => (
                <motion.div
                  key={`${file.name}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border transition-colors duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {isImage(file) ? (
                      <Image className="w-5 h-5 text-primary" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
