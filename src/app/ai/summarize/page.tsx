'use client';
// src/app/ai/summarize/page.tsx — Theme-aware
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, BookOpen, List, HelpCircle, FileText, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import type { AISummary } from '@/types';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  content: string | string[];
  defaultOpen?: boolean;
}

function Section({ title, icon, content, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-colors duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-secondary transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border">
              {Array.isArray(content) ? (
                <ul className="mt-3 space-y-2">
                  {content.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {content}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SummarizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'groq'>('groq');

  const handleSummarize = async () => {
    if (!files[0]) return toast.error('Please upload a PDF');

    setLoading(true);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('provider', provider);

      const { data } = await axios.post('/api/ai/summarize', formData);
      setSummary(data.summary);
      toast.success('Summary generated!');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to generate summary';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSummary(null);
    setFiles([]);
  };

  return (
    <ToolLayout
      requiresAuth={true}
      isAI={true}
      title="AI Notes Summarizer"
      description="Upload your PDF notes and get instant AI-powered summaries, key points, and exam prep content."
      icon="🤖"
    >
      <div className="space-y-6">
        {/* Provider selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">AI Provider:</span>
          {([
            { id: 'groq', label: '🤖 Groq AI' },
            { id: 'gemini', label: '✨ Gemini' }
          ] as const).map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                provider === p.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <FileDropzone
          files={files}
          onFilesChange={setFiles}
          acceptedTypes={['application/pdf']}
          maxSizeMB={20}
          label="Drop your study notes PDF"
          sublabel="Textbooks, lecture notes, study guides • Max 20MB"
        />

        {files.length > 0 && !loading && !summary && (
          <button onClick={handleSummarize} className="btn-brand w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer">
            <Sparkles className="w-4 h-4" />
            Generate AI Summary
          </button>
        )}

        {loading && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center transition-colors duration-300">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-medium">Analyzing your notes...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take 15-30 seconds</p>
          </div>
        )}

        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Summary Results</h2>
              <button
                onClick={reset}
                className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                Summarize Another
              </button>
            </div>

            <Section
              title="Quick Summary"
              icon={<Brain className="w-4 h-4 text-primary" />}
              content={summary.shortSummary}
              defaultOpen
            />
            <Section
              title="Detailed Summary"
              icon={<FileText className="w-4 h-4 text-primary" />}
              content={summary.detailedSummary}
            />
            <Section
              title="Key Points"
              icon={<List className="w-4 h-4 text-primary" />}
              content={summary.keyPoints}
            />
            <Section
              title="Exam Revision Notes"
              icon={<BookOpen className="w-4 h-4 text-primary" />}
              content={summary.examRevisionNotes}
            />
            <Section
              title="Important Questions"
              icon={<HelpCircle className="w-4 h-4 text-primary" />}
              content={summary.importantQuestions}
            />
          </motion.div>
        )}
      </div>
    </ToolLayout>
  );
}
