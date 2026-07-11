'use client';

import { useEffect } from 'react';

export default function AIError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AI Page Client Error]:', error);
  }, [error]);

  return (
    <div className="p-10 max-w-2xl mx-auto my-10 bg-card border border-border rounded-2xl space-y-6 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-3xl">⚠️</span>
        <div>
          <h2 className="text-xl font-bold text-red-500">AI Component Error</h2>
          <p className="text-xs text-muted-foreground">Digest: {error.digest || 'N/A'}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Error Message:</p>
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-mono text-red-600 dark:text-red-400">
          {error.message || 'Unknown runtime error'}
        </div>
      </div>

      {error.stack && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Stack Trace:</p>
          <pre className="p-4 bg-secondary border border-border rounded-xl text-xs font-mono overflow-auto max-h-80 whitespace-pre-wrap text-muted-foreground">
            {error.stack}
          </pre>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="btn-brand px-6 py-2.5 cursor-pointer text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90"
        >
          Reset / Try Again
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-6 py-2.5 cursor-pointer text-sm font-semibold rounded-xl border border-border text-muted-foreground hover:bg-secondary"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
