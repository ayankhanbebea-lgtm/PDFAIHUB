'use client';
// src/components/tools/upload-progress.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Download } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface UploadProgressProps {
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  downloadUrl?: string;
  downloadName?: string;
  resultSize?: number;
  originalSize?: number;
  onReset?: () => void;
}

export function UploadProgress({
  progress,
  status,
  message,
  downloadUrl,
  downloadName = 'result.pdf',
  resultSize,
  originalSize,
  onReset,
}: UploadProgressProps) {
  if (status === 'idle') return null;

  const reduction = originalSize && resultSize
    ? Math.round(((originalSize - resultSize) / originalSize) * 100)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="glass rounded-2xl p-6 border border-white/10 space-y-4"
      >
        {/* Status header */}
        <div className="flex items-center gap-3">
          {status === 'completed' ? (
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
          ) : status === 'error' ? (
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          ) : (
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {status === 'completed' ? 'Done!' : status === 'error' ? 'Failed' : status === 'uploading' ? 'Uploading...' : 'Processing...'}
            </p>
            {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
          </div>
        </div>

        {/* Progress bar */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="progress-bar">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
        )}

        {/* Completed state */}
        {status === 'completed' && downloadUrl && (
          <div className="space-y-3">
            {reduction !== null && (
              <div className="flex items-center gap-4 text-sm">
                {originalSize && (
                  <div>
                    <p className="text-gray-500">Original</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatBytes(originalSize)}</p>
                  </div>
                )}
                {resultSize && (
                  <div>
                    <p className="text-gray-500">Compressed</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatBytes(resultSize)}</p>
                  </div>
                )}
                {reduction > 0 && (
                  <div>
                    <p className="text-gray-500">Saved</p>
                    <p className="font-medium text-green-500">{reduction}%</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <a
                href={downloadUrl}
                download={downloadName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 btn-brand flex items-center justify-center gap-2 py-3"
              >
                <Download className="w-4 h-4" />
                Download Result
              </a>
              {onReset && (
                <button
                  onClick={onReset}
                  className="px-4 py-3 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors text-sm cursor-pointer"
                >
                  Process Another
                </button>
              )}
            </div>
          </div>
        )}

        {status === 'error' && onReset && (
          <button
            onClick={onReset}
            className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors text-sm cursor-pointer"
          >
            Try Again
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
