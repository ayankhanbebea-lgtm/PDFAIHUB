'use client';
// src/app/dashboard/files/page.tsx — Theme-aware
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Download, Trash2, Search, Filter } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { formatBytes, formatRelativeTime } from '@/lib/utils';

const toolLabels: Record<string, string> = {
  merge: 'PDF Merge', compress: 'PDF Compress', split: 'PDF Split',
  'pdf-to-word': 'PDF to Word', 'image-to-pdf': 'Image to PDF',
  protect: 'PDF Protect', summarize: 'AI Summary',
  chat: 'AI Chat', flashcards: 'Flashcards', quiz: 'Quiz',
};

const toolEmoji: Record<string, string> = {
  merge: '🔗', compress: '🗜️', split: '✂️', 'pdf-to-word': '📝',
  'image-to-pdf': '🖼️', protect: '🔒', summarize: '🤖',
  chat: '💬', flashcards: '🃏', quiz: '❓',
};

export default function FilesPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  const [deleting, setDeleting] = useState<string>('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (toolFilter) params.set('tool', toolFilter);
      const { data } = await axios.get(`/api/user/files?${params}`);
      setFiles(data.files || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session) fetchFiles(); }, [session, page, toolFilter]);

  const deleteFile = async (fileId: string) => {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    setDeleting(fileId);
    try {
      await axios.delete('/api/user/files', { data: { fileId } });
      toast.success('File deleted');
      fetchFiles();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting('');
    }
  };

  const filteredFiles = files.filter(f =>
    !search || f.originalName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / 20);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="pt-20">
        <div className="section-container py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">File History</h1>
            <span className="text-sm text-muted-foreground">{total} total files</span>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder-muted-foreground/60 text-sm focus:outline-none focus:border-primary transition-colors duration-300"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={toolFilter}
                onChange={(e) => { setToolFilter(e.target.value); setPage(1); }}
                className="pl-9 pr-8 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none appearance-none transition-colors duration-300 cursor-pointer"
              >
                <option value="">All Tools</option>
                {Object.entries(toolLabels).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Files list */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-16 text-center transition-colors duration-300">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">No files found</p>
              <p className="text-sm text-muted-foreground">Your processed files will appear here</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/20 transition-all duration-300 group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">
                      {toolEmoji[file.tool] || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.originalName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{toolLabels[file.tool] || file.tool}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                        {file.resultSize && file.resultSize !== file.size && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-xs text-primary">{formatBytes(file.resultSize)}</span>
                          </>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(file.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.resultUrl && (
                        <a
                          href={file.resultUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteFile(file.id)}
                        disabled={deleting === file.id}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title="Delete"
                      >
                        {deleting === file.id ? (
                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 bg-primary/10 text-primary`}>
                      {file.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl border border-border text-sm disabled:opacity-40 hover:bg-secondary text-gray-900 dark:text-white transition-colors duration-300 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-xl border border-border text-sm disabled:opacity-40 hover:bg-secondary text-gray-900 dark:text-white transition-colors duration-300 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
