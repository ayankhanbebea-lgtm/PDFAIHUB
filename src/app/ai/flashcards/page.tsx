'use client';
// src/app/ai/flashcards/page.tsx — Theme-aware
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight, RotateCcw, Download } from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import type { Flashcard } from '@/types';

export default function FlashcardsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [count, setCount] = useState(20);

  const handleGenerate = async () => {
    if (!files[0]) return toast.error('Upload a PDF first');

    setLoading(true);
    setFlashcards([]);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('count', count.toString());

      const { data } = await axios.post('/api/ai/flashcards', formData);
      setFlashcards(data.flashcards);
      setCurrentIndex(0);
      setFlipped(false);
      toast.success(`${data.flashcards.length} flashcards created!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex((i) => (i + 1) % flashcards.length), 150);
  };

  const prev = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex((i) => (i - 1 + flashcards.length) % flashcards.length), 150);
  };

  const exportFlashcards = () => {
    const text = flashcards.map((c, i) => `Card ${i + 1}\nQ: ${c.front}\nA: ${c.back}`).join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const current = flashcards[currentIndex];

  return (
    <ToolLayout requiresAuth={true} isAI={true}
      title="AI Flashcard Generator"
      description="Auto-generate study flashcards from any PDF. Perfect for exam prep."
      icon="🃏"
    >
      <div className="space-y-6">
        {flashcards.length === 0 ? (
          <>
            <FileDropzone
              files={files}
              onFilesChange={setFiles}
              acceptedTypes={['application/pdf']}
              maxSizeMB={20}
              label="Drop study material PDF"
            />

            {files.length > 0 && !loading && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Number of flashcards: <span className="text-primary font-semibold">{count}</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground/60 mt-1">
                    <span>5</span><span>50</span>
                  </div>
                </div>
                <button onClick={handleGenerate} className="btn-brand w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer">
                  <Sparkles className="w-4 h-4" />
                  Generate {count} Flashcards
                </button>
              </div>
            )}

            {loading && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center transition-colors duration-300">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-medium text-gray-900 dark:text-white">Generating flashcards...</p>
                <p className="text-sm text-muted-foreground mt-1">This may take 20-40 seconds</p>
              </div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Card {currentIndex + 1} of {flashcards.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={exportFlashcards}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={() => { setFlashcards([]); setFiles([]); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentIndex}-${flipped}`}
                initial={{ opacity: 0, scale: 0.95, rotateY: flipped ? -90 : 90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFlipped(!flipped)}
                className="cursor-pointer min-h-48 bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-colors flex flex-col items-center justify-center text-center gap-4"
              >
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {flipped ? 'Answer' : 'Question'}
                </span>
                <p className="text-lg text-gray-900 dark:text-white font-medium">
                  {flipped ? current.back : current.front}
                </p>
                <p className="text-xs text-muted-foreground/60">Click to {flipped ? 'see question' : 'reveal answer'}</p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-4">
              <button onClick={prev} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button onClick={next} className="flex-1 btn-brand flex items-center justify-center gap-2 py-3 cursor-pointer">
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* All cards grid */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">All Cards</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {flashcards.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentIndex(i); setFlipped(false); }}
                    className={`p-3 rounded-xl text-left text-xs border transition-colors cursor-pointer ${
                      i === currentIndex
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    <p className="font-medium mb-0.5">#{i + 1}</p>
                    <p className="truncate">{card.front}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </ToolLayout>
  );
}
