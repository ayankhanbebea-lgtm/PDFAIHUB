'use client';
// src/app/ai/exam/page.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Lock, ArrowRight, BookOpen, Clock, Brain, AlertCircle,
  HelpCircle, Eye, RefreshCw, BarChart, History, ChevronRight, FileText, Check, X,
  Download, Menu, Activity, ShieldAlert, Award, FileSpreadsheet, List, HelpCircle as HelpIcon
} from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';

export default function AIExamModePage() {
  const { data: session } = useSession();
  const isProUser = session?.user?.plan === 'PRO';

  // Files & generation states
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Extracting content...');
  const [progressVal, setProgressVal] = useState(10);
  const [provider, setProvider] = useState<'groq' | 'gemini'>('groq');

  // Generated package data
  const [examPackage, setExamPackage] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'topics' | 'pyqs' | 'mcqs' | 'flashcards' | 'mock' | 'difficulty'>('overview');

  // History states
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Filters for MCQs & Flashcards
  const [mcqFilter, setMcqFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [flashcardChapterFilter, setFlashcardChapterFilter] = useState<string>('All');

  // MCQ state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealExplanation, setRevealExplanation] = useState<Record<number, boolean>>({});

  // Flashcard state
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  // Fetch history for Pro users
  const fetchHistory = async () => {
    if (!isProUser) return;
    setHistoryLoading(true);
    try {
      const { data } = await axios.get('/api/ai/exam');
      setHistory(data.packages || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isProUser) {
      fetchHistory();
    }
  }, [isProUser]);

  // Load a package from history
  const loadPackage = async (id: string) => {
    setLoading(true);
    setStatusMsg('Loading package from database...');
    setProgressVal(50);
    try {
      const { data } = await axios.get(`/api/ai/exam/${id}`);
      setExamPackage(data.examPackage);
      setActiveTab('overview');
      setSelectedAnswers({});
      setRevealExplanation({});
      setFlippedCards({});
      setMcqFilter('All');
      setFlashcardChapterFilter('All');
      toast.success('Exam Package loaded successfully!');
      setShowHistory(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load package');
    } finally {
      setLoading(false);
    }
  };

  // Start package generation
  const handleGenerate = async () => {
    if (!files[0]) return toast.error('Please upload a PDF first');

    setLoading(true);
    setExamPackage(null);
    setSelectedAnswers({});
    setRevealExplanation({});
    setFlippedCards({});
    setMcqFilter('All');
    setFlashcardChapterFilter('All');
    setStatusMsg('Uploading file and initializing stream...');
    setProgressVal(5);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('provider', provider);

      const response = await fetch('/api/ai/exam', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the last incomplete line back to the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'status') {
              setStatusMsg(data.message);
              setProgressVal((prev) => Math.min(prev + 2, 90));
            } else if (data.type === 'extraction_complete') {
              setStatusMsg(data.message);
              setProgressVal(15);
            } else if (data.type === 'progress') {
              setStatusMsg(data.message);
              const currentChunk = (data.chunkIndex || 0) + 1;
              const totalChunks = data.totalChunks || 1;
              const pct = 15 + Math.round((currentChunk / totalChunks) * 70); // scale chunks between 15% and 85%
              setProgressVal(pct);
            } else if (data.type === 'final_complete') {
              setStatusMsg(data.message || 'Complete study package compiled!');
              setProgressVal(100);
              setExamPackage(data.examPackage);
              toast.success('AI Exam Package prepared successfully!');
              fetchHistory();
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (jsonErr: any) {
            console.error('Failed to parse Ndjson line:', jsonErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      toast.error(err.message || 'Failed to prepare exam package');
    } finally {
      setLoading(false);
    }
  };

  // --- Client-side Markdown File Exporters ---
  const handleDownloadNotes = () => {
    if (!examPackage) return;
    let content = `# Smart Notes: ${examPackage.title || 'AI Exam Prep'}\n\n`;
    examPackage.smartNotes?.forEach((note: any, i: number) => {
      content += `## Chapter ${i + 1}: ${note.chapter}\n\n`;
      content += `### Core Concepts\n`;
      note.bulletPoints?.forEach((pt: string) => {
        content += `- ${pt}\n`;
      });
      content += `\n### Key Definitions\n`;
      note.definitions?.forEach((def: any) => {
        content += `- **${def.term}**: ${def.definition}\n`;
      });
      content += `\n### Formulas\n`;
      note.formulas?.forEach((form: any) => {
        content += `- **${form.formula}**: ${form.description}\n`;
      });
      content += `\n### Worked Examples\n`;
      note.examples?.forEach((ex: any) => {
        content += `- **Scenario**: ${ex.scenario}\n  **Solution**: ${ex.solution}\n`;
      });
      content += `\n### Exam Tips\n`;
      note.examTips?.forEach((tip: string) => {
        content += `> [!TIP]\n> ${tip}\n\n`;
      });
      content += `\n---\n\n`;
    });
    downloadMarkdown(content, `${examPackage.fileName || 'smart-notes'}_smart_notes.md`);
  };

  const handleDownloadMCQs = () => {
    if (!examPackage) return;
    let content = `# Multiple Choice Questions: ${examPackage.title || 'AI Exam Prep'}\n\n`;
    examPackage.mcqs?.forEach((mcq: any, i: number) => {
      content += `### Q${i + 1} [Difficulty: ${mcq.difficulty || 'Medium'}]\n${mcq.question}\n\n`;
      mcq.options?.forEach((opt: string, idx: number) => {
        content += `${idx === mcq.correctIndex ? '[x]' : '[ ]'} ${opt}\n`;
      });
      content += `\n**Explanation**: ${mcq.explanation}\n\n---\n\n`;
    });
    downloadMarkdown(content, `${examPackage.fileName || 'mcqs'}_mcqs.md`);
  };

  const handleDownloadFlashcards = () => {
    if (!examPackage) return;
    let content = `# Revision Flashcards: ${examPackage.title || 'AI Exam Prep'}\n\n`;
    examPackage.flashcards?.forEach((card: any, i: number) => {
      content += `### Card ${i + 1} [${card.chapter || 'Foundations'}]\n`;
      content += `**Front**: ${card.front}\n\n`;
      content += `**Back**: ${card.back}\n\n---\n\n`;
    });
    downloadMarkdown(content, `${examPackage.fileName || 'flashcards'}_flashcards.md`);
  };

  const handleDownloadMockTest = () => {
    if (!examPackage) return;
    let content = `# Mock Examination Paper\n\n`;
    const mock = examPackage.mockTest;
    if (mock) {
      if (mock.sectionA) {
        content += `## SECTION A: Conceptual & Basic Assessment\n\n`;
        mock.sectionA.forEach((item: any, i: number) => {
          content += `### Question A${i + 1}\n${item.question}\n\n`;
          content += `*Ideal Answer Guidelines*:\n${item.idealAnswer}\n\n`;
        });
      }
      if (mock.sectionB) {
        content += `\n## SECTION B: Applied & Structural Analysis\n\n`;
        mock.sectionB.forEach((item: any, i: number) => {
          content += `### Question B${i + 1}\n${item.question}\n\n`;
          content += `*Ideal Answer Guidelines*:\n${item.idealAnswer}\n\n`;
        });
      }
      if (mock.sectionC) {
        content += `\n## SECTION C: Case Studies & Numerical Problems\n\n`;
        mock.sectionC.forEach((item: any, i: number) => {
          content += `### Question C${i + 1}\n${item.question}\n\n`;
          content += `*Ideal Answer Guidelines*:\n${item.idealAnswer}\n\n`;
        });
      }
    } else {
      content += `No Mock Test questions generated.`;
    }
    downloadMarkdown(content, `${examPackage.fileName || 'mock_test'}_mock_test.md`);
  };

  const handleDownloadCompletePackage = () => {
    if (!examPackage) return;
    let content = `# COMPLETE EXAM PREPARATION PACKAGE: ${examPackage.title || 'AI Exam Prep'}\n`;
    content += `*Readiness Score*: ${examPackage.readinessScore}% | *Estimated Study Time*: ${examPackage.studyTime} | *Difficulty*: ${examPackage.difficulty}\n\n`;
    
    content += `\n# 1. SMART STUDY NOTES\n\n`;
    examPackage.smartNotes?.forEach((note: any, i: number) => {
      content += `## Chapter ${i + 1}: ${note.chapter}\n\n`;
      note.bulletPoints?.forEach((pt: string) => content += `- ${pt}\n`);
    });

    content += `\n\n# 2. IMPORTANT EXAM TOPICS\n\n`;
    examPackage.importantTopics?.forEach((topic: any) => {
      content += `### ${topic.title} [Priority: ${topic.importance}]\n${topic.whyImportant || topic.description}\n\n`;
    });

    content += `\n\n# 3. PREVIOUS YEAR STYLE QUESTIONS (PYQs)\n\n`;
    examPackage.pysQuestions?.forEach((pyq: any, i: number) => {
      content += `### PYQ Q${i + 1} (${pyq.questionType || 'Conceptual'})\n${pyq.question}\n\n*Guidelines*: ${pyq.guidelines}\n*Model Answer*: ${pyq.idealAnswer}\n\n`;
    });

    content += `\n\n# 4. MOCK ASSESSMENT TEST\n\n`;
    const mock = examPackage.mockTest;
    if (mock) {
      if (mock.sectionA) {
        content += `## SECTION A\n`;
        mock.sectionA.forEach((item: any, i: number) => content += `Q A${i+1}: ${item.question}\nAns: ${item.idealAnswer}\n\n`);
      }
      if (mock.sectionB) {
        content += `## SECTION B\n`;
        mock.sectionB.forEach((item: any, i: number) => content += `Q B${i+1}: ${item.question}\nAns: ${item.idealAnswer}\n\n`);
      }
    }

    downloadMarkdown(content, `${examPackage.fileName || 'complete_package'}_complete_exam_package.md`);
  };

  const downloadMarkdown = (textStr: string, filename: string) => {
    const blob = new Blob([textStr], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} download started!`);
  };

  // Helper lists
  const uniqueFlashcardChapters = ['All', ...new Set((examPackage?.flashcards || []).map((c: any) => c.chapter).filter(Boolean) as string[])];

  return (
    <ToolLayout
      requiresAuth={true}
      title="AI Exam Mode"
      description="Process textbook chapters to generate smart notes, topics weightage, PYQs, mock papers, interactive flashcards, and difficulty analysis."
      icon="🎓"
    >
      <div className="w-full space-y-6 relative">
        
        {/* Toggle History Sidebar Floating Button */}
        {isProUser && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 glass hover:bg-secondary/40 transition-all cursor-pointer"
            >
              <History className="w-4 h-4 text-amber-500" />
              <span>Load Previous Packages ({history.length})</span>
            </button>
          </div>
        )}

        {/* 1. Dashboard State: Idle Upload */}
        {!examPackage && !loading && (
          <div className="max-w-4xl mx-auto space-y-6">
            <FileDropzone
              files={files}
              onFilesChange={setFiles}
              acceptedTypes={['application/pdf']}
              maxSizeMB={50}
              label="Upload study textbook or lecture notes PDF to build exam package"
            />

            {files.length > 0 && (
              <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Analysis Engine</p>
                    <p className="text-xs text-muted-foreground">Select completion engine for processing</p>
                  </div>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as any)}
                    className="px-4 py-2 text-xs rounded-xl border border-border bg-card font-medium focus:ring-2 focus:ring-primary"
                  >
                    <option value="groq">Groq Llama 3.3 (Fastest - 10s)</option>
                    <option value="gemini">Gemini 1.5 Flash (Exhaustive - 20s)</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  className="btn-brand bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none text-white w-full py-4 rounded-xl text-base font-bold shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  Generate Exam Package
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Loading State */}
        {loading && (
          <div className="max-w-3xl mx-auto glass rounded-3xl p-10 border border-white/10 text-center space-y-6">
            <div className="relative w-28 h-28 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin" />
              <div className="absolute inset-3 rounded-full border-4 border-primary/5 border-t-primary animate-spin [animation-duration:2s]" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🎓</div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Analyzing Study PDF</h3>
              <p className="text-sm text-muted-foreground transition-all duration-300 font-medium">{statusMsg}</p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressVal}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-bold">{progressVal}% Analyzed</p>
            </div>
          </div>
        )}

        {/* 3. Redesigned Result View */}
        {examPackage && !loading && (
          <div className="space-y-8">
            
            {/* Header: Title and Global Exporter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-secondary/10 p-6 rounded-3xl border border-white/5">
              <div>
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Active Package</span>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1.5">{examPackage.title || 'Exam Prep Package'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Source: {examPackage.fileName || 'uploaded file'}</p>
              </div>
              <button
                onClick={handleDownloadCompletePackage}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-5 py-3 rounded-2xl text-xs cursor-pointer shadow-md shadow-green-500/10"
              >
                <Download className="w-4 h-4" />
                Download Complete Exam Package
              </button>
            </div>

            {/* Statistics Row: Displayed in one professional row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">Readiness Score</span>
                <span className="text-2xl font-black text-green-500 mt-1">{examPackage.readinessScore || 92}%</span>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">Estimated Score</span>
                <span className="text-2xl font-black text-blue-500 mt-1">{examPackage.estimatedExamScore || 85}%</span>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">Study Time</span>
                <span className="text-lg font-black text-amber-500 mt-1 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {examPackage.studyTime || '6h 20m'}
                </span>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">MCQs / PYQs</span>
                <span className="text-lg font-black text-purple-500 mt-1 flex items-center gap-1">
                  <HelpIcon className="w-4 h-4" />
                  {examPackage.questionsCount || 64} Items
                </span>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">Flashcards</span>
                <span className="text-lg font-black text-teal-500 mt-1 flex items-center gap-1">
                  <Brain className="w-4 h-4" />
                  {examPackage.flashcardsCount || 50} Cards
                </span>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">Mock Test</span>
                <span className="text-xs font-bold text-emerald-500 mt-1 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-4 h-4" /> Complete
                </span>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">Difficulty</span>
                <span className="text-sm font-black text-red-500 mt-1 uppercase tracking-wider">
                  {examPackage.difficulty || 'Medium'}
                </span>
              </div>

              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col justify-between min-h-[90px]">
                <span className="text-[10px] text-muted-foreground font-semibold">Processing Time</span>
                <span className="text-lg font-black text-gray-500 mt-1 flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  {examPackage.processingTime || '9.4s'}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none border-b border-border">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'notes', label: 'Smart Notes', icon: '📝' },
                { id: 'topics', label: 'Important Topics', icon: '📌' },
                { id: 'pyqs', label: 'PYQs', icon: '📋' },
                { id: 'mcqs', label: 'MCQs Assessment', icon: '❓' },
                { id: 'flashcards', label: 'Flashcards Deck', icon: '🃏' },
                { id: 'mock', label: 'Mock Exam', icon: '✍️' },
                { id: 'difficulty', label: 'Difficulty Analysis', icon: '📈' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                      : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tabs Content: Maximize screen space & full-width cards */}
            <div className="glass rounded-3xl p-8 border border-white/10 relative overflow-hidden min-h-[500px]">
              
              {/* Premium Lock Banner for Free Users (Excludes Overview, MCQs & Flashcards) */}
              {!isProUser && activeTab !== 'overview' && activeTab !== 'mcqs' && activeTab !== 'flashcards' && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[12px] z-20 flex items-center justify-center p-6 text-center">
                  <div className="max-w-md bg-card border border-amber-500/20 p-8 rounded-3xl shadow-2xl space-y-4">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl rounded-2xl mx-auto text-amber-500">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Premium Feature Lock</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI Exam Mode Smart Notes, Mock Tests, and complete PDF analyses are premium Pro features. Unlock the full material now.
                    </p>
                    <Link href="/pricing" className="btn-brand bg-gradient-to-r from-amber-500 to-orange-500 border-none text-white inline-flex items-center gap-2 py-3 px-6 rounded-xl font-bold cursor-pointer">
                      Upgrade to Pro <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Visual Breakdown of difficulty */}
                    <div className="p-6 rounded-2xl bg-secondary/10 border border-border/40 space-y-4">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-amber-500" />
                        Difficulty Analysis Breakdown
                      </h3>
                      
                      {(() => {
                        const diff = examPackage.difficultyAnalysis || {
                          veryEasyPercent: 10,
                          easyPercent: 20,
                          mediumPercent: 40,
                          hardPercent: 20,
                          veryHardPercent: 10
                        };
                        return (
                          <div className="space-y-3 pt-2">
                            {[
                              { label: 'Very Easy', val: diff.veryEasyPercent, color: 'bg-green-400' },
                              { label: 'Easy', val: diff.easyPercent, color: 'bg-green-500' },
                              { label: 'Medium', val: diff.mediumPercent, color: 'bg-amber-500' },
                              { label: 'Hard', val: diff.hardPercent, color: 'bg-orange-500' },
                              { label: 'Very Hard', val: diff.veryHardPercent, color: 'bg-red-600' },
                            ].map((item, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-muted-foreground">{item.label}</span>
                                  <span className="text-gray-900 dark:text-white">{item.val}%</span>
                                </div>
                                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                  <div className={`${item.color} h-full`} style={{ width: `${item.val}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Important stats and chapters list */}
                    <div className="p-6 rounded-2xl bg-secondary/10 border border-border/40 space-y-4">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-green-500" />
                        Exam Preparation Insights
                      </h3>
                      
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="font-semibold text-muted-foreground">Most Critical Chapters:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {(examPackage.difficultyAnalysis?.mostImportantChapters || ['Chapter 1', 'Chapter 2']).map((c: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-amber-500/10 text-amber-500 font-bold rounded-lg">{c}</span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold text-muted-foreground mt-2">Identified Weak Areas:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {(examPackage.difficultyAnalysis?.weakTopics || ['Complex definitions']).map((t: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-red-500/10 text-red-500 font-bold rounded-lg">{t}</span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold text-muted-foreground mt-2">Concepts Repeated Frequently:</p>
                          <ul className="list-disc pl-4 space-y-1 text-muted-foreground mt-1">
                            {(examPackage.difficultyAnalysis?.frequentlyRepeatedConcepts || ['Operational constraints', 'Memory allocations']).map((c: string, i: number) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Exam Weightage */}
                  <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <ShieldAlert className="w-8 h-8 text-primary flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Exam Weightage Allocation</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {examPackage.difficultyAnalysis?.estimatedExamWeightage || '35% Theory concepts, 45% Practice application cases, 20% Numerical formulas'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SMART NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Smart Chapter-wise Notes</h3>
                    <button
                      onClick={handleDownloadNotes}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Notes (MD)
                    </button>
                  </div>

                  <div className="space-y-8">
                    {examPackage.smartNotes?.map((note: any, idx: number) => (
                      <div key={idx} className="space-y-6">
                        <div className="flex items-center gap-2.5 border-b border-white/5 pb-2">
                          <span className="w-7 h-7 bg-primary/15 text-primary flex items-center justify-center rounded-xl text-xs font-black">
                            {idx + 1}
                          </span>
                          <h4 className="text-lg font-black text-gray-900 dark:text-white">{note.chapter}</h4>
                        </div>

                        {/* Bullets List */}
                        <div className="space-y-3 pl-2">
                          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Concept Summary & Background</p>
                          <ul className="space-y-3.5">
                            {note.bulletPoints?.map((bullet: string, bIdx: number) => (
                              <li key={bIdx} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Nested Sub-Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {/* Key Definitions */}
                          <div className="p-4 rounded-xl border border-blue-500/15 bg-blue-500/5 space-y-2">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5" /> Definitions
                            </p>
                            <div className="space-y-2 text-xs">
                              {note.definitions?.map((d: any, dIdx: number) => (
                                <p key={dIdx} className="text-muted-foreground">
                                  <strong className="text-gray-900 dark:text-white">{d.term}</strong>: {d.definition}
                                </p>
                              ))}
                            </div>
                          </div>

                          {/* Important Formulas */}
                          <div className="p-4 rounded-xl border border-amber-500/15 bg-amber-500/5 space-y-2">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                              <FileSpreadsheet className="w-3.5 h-3.5" /> Core Formulas
                            </p>
                            <div className="space-y-2 text-xs">
                              {note.formulas?.map((f: any, fIdx: number) => (
                                <div key={fIdx} className="text-muted-foreground">
                                  <code className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold block w-fit mb-1">{f.formula}</code>
                                  <p>{f.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Worked Examples */}
                          <div className="p-4 rounded-xl border border-green-500/15 bg-green-500/5 space-y-2 md:col-span-2">
                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" /> Exam Solved Examples
                            </p>
                            <div className="space-y-3 text-xs">
                              {note.examples?.map((ex: any, exIdx: number) => (
                                <div key={exIdx} className="text-muted-foreground space-y-1">
                                  <p className="font-bold text-gray-900 dark:text-white">Q: {ex.scenario}</p>
                                  <p className="pl-3 border-l border-green-500/30 text-muted-foreground leading-relaxed">
                                    <strong className="text-green-500">Derivation/Solution:</strong> {ex.solution}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Exam Tips Alert */}
                        {note.examTips && note.examTips.length > 0 && (
                          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Exam Alert tips</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{note.examTips.join(' ')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: IMPORTANT TOPICS */}
              {activeTab === 'topics' && (
                <div className="space-y-6">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white border-b border-border pb-2">High Probability Exam Topics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examPackage.importantTopics?.map((topic: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-2xl bg-secondary/15 border border-border/40 flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{topic.title}</h4>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${
                              topic.importance === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {topic.importance} Weightage
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {topic.whyImportant || topic.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: PYQs */}
              {activeTab === 'pyqs' && (
                <div className="space-y-6">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white border-b border-border pb-2">Previous Year Style Questions</h3>
                  <div className="space-y-4">
                    {examPackage.pysQuestions?.map((pyq: any, idx: number) => (
                      <div key={idx} className="p-6 rounded-2xl bg-secondary/15 border border-border/40 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">Question {idx + 1}</h4>
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg uppercase">
                            {pyq.questionType || 'Conceptual'}
                          </span>
                        </div>

                        <p className="text-sm text-gray-900 dark:text-white font-medium italic">
                          "{pyq.question}"
                        </p>

                        <div className="space-y-3">
                          <div className="p-4 rounded-xl bg-card border border-border/60">
                            <p className="text-xs font-black text-primary uppercase tracking-widest mb-1.5">Ideal Answer Keypoints</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{pyq.idealAnswer}</p>
                          </div>

                          <div className="p-4 rounded-xl bg-secondary/20 border border-border/40">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5">Guidelines & Grading Rubric</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{pyq.guidelines}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: MCQs */}
              {activeTab === 'mcqs' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-border">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Interactive MCQ Assessment</h3>
                    <div className="flex items-center gap-3">
                      {/* Filter controls */}
                      <div className="flex items-center gap-1 bg-secondary/40 p-0.5 rounded-lg border border-border">
                        {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                          <button
                            key={diff}
                            onClick={() => setMcqFilter(diff as any)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${
                              mcqFilter === diff
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleDownloadMCQs}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> MCQs (MD)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {examPackage.mcqs?.filter((m: any) => mcqFilter === 'All' || m.difficulty === mcqFilter).map((mcq: any, idx: number) => {
                      const isBlurred = !isProUser && idx >= 5;
                      return (
                        <div
                          key={idx}
                          className={`p-5 rounded-2xl bg-secondary/15 border border-border/30 space-y-4 transition-all duration-300 ${
                            isBlurred ? 'blur-[5px] select-none pointer-events-none opacity-40' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">MCQ {idx + 1}</span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                              mcq.difficulty === 'Hard' ? 'bg-red-500/10 text-red-500' : mcq.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                            }`}>
                              {mcq.difficulty || 'Medium'}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-relaxed">{mcq.question}</h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {mcq.options?.map((opt: string, optIdx: number) => {
                              const isSelected = selectedAnswers[idx] === optIdx;
                              const isCorrect = mcq.correctIndex === optIdx;
                              let btnClass = 'border-border bg-card text-muted-foreground hover:bg-secondary/40';

                              if (selectedAnswers[idx] !== undefined) {
                                if (isCorrect) {
                                  btnClass = 'border-green-500/35 bg-green-500/10 text-green-500 font-bold';
                                } else if (isSelected) {
                                  btnClass = 'border-red-500/35 bg-red-500/10 text-red-500 font-bold';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  disabled={selectedAnswers[idx] !== undefined}
                                  onClick={() => {
                                    setSelectedAnswers(prev => ({ ...prev, [idx]: optIdx }));
                                    setRevealExplanation(prev => ({ ...prev, [idx]: true }));
                                  }}
                                  className={`p-3 text-xs rounded-xl border text-left flex items-center justify-between cursor-pointer transition-colors ${btnClass}`}
                                >
                                  <span>{opt}</span>
                                  {selectedAnswers[idx] !== undefined && (
                                    isCorrect ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : isSelected ? <X className="w-4 h-4 text-red-500 flex-shrink-0" /> : null
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {revealExplanation[idx] && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-xs text-muted-foreground"
                            >
                              <span className="font-semibold text-primary block mb-1">Explanation:</span>
                              {mcq.explanation}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}

                    {/* Free Upgrade overlay */}
                    {!isProUser && examPackage.mcqs && examPackage.mcqs.length > 5 && (
                      <div className="pt-6 text-center border-t border-border mt-8">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Upgrade to view remaining {examPackage.mcqs.length - 5} questions</p>
                        <Link href="/pricing" className="btn-brand bg-gradient-to-r from-amber-500 to-orange-500 border-none text-white text-xs py-2 px-4 inline-flex items-center gap-1.5 rounded-lg font-bold cursor-pointer">
                          Unlock Complete Exam Mode <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: FLASHCARDS */}
              {activeTab === 'flashcards' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-border">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Active Revision Flashcards</h3>
                    <div className="flex items-center gap-3">
                      {/* Chapter Filter */}
                      <select
                        value={flashcardChapterFilter}
                        onChange={(e) => setFlashcardChapterFilter(e.target.value)}
                        className="px-3 py-1.5 text-[10px] rounded-lg border border-border bg-card font-bold font-sans"
                      >
                        {uniqueFlashcardChapters.map((c, i) => (
                          <option key={i} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleDownloadFlashcards}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Cards (MD)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {examPackage.flashcards?.filter((c: any) => flashcardChapterFilter === 'All' || c.chapter === flashcardChapterFilter).map((card: any, idx: number) => {
                      const isBlurred = !isProUser && idx >= 3;
                      const isFlipped = flippedCards[idx] ?? false;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (!isBlurred) {
                              setFlippedCards(prev => ({ ...prev, [idx]: !isFlipped }));
                            }
                          }}
                          className={`h-44 rounded-2xl border relative cursor-pointer transition-all duration-300 select-none ${
                            isBlurred ? 'blur-[5px] pointer-events-none opacity-40 border-border bg-secondary/10' : 'border-primary/20 bg-card hover:border-primary/40'
                          }`}
                        >
                          <AnimatePresence mode="wait">
                            {!isFlipped ? (
                              <motion.div
                                key="front"
                                initial={{ opacity: 0, rotateY: -90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                exit={{ opacity: 0, rotateY: 90 }}
                                className="absolute inset-0 p-5 flex flex-col justify-between"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Concept</span>
                                  <span className="text-[9px] bg-secondary px-2 py-0.5 rounded text-muted-foreground truncate max-w-[120px]">{card.chapter || 'Foundations'}</span>
                                </div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-white text-center flex-1 flex items-center justify-center leading-relaxed px-2">
                                  {card.front}
                                </p>
                                <span className="text-[9px] text-muted-foreground text-right block font-bold">Tap to flip card</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="back"
                                initial={{ opacity: 0, rotateY: 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                exit={{ opacity: 0, rotateY: -90 }}
                                className="absolute inset-0 p-5 bg-primary/5 rounded-2xl flex flex-col justify-between"
                              >
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Definition / Answer</span>
                                <p className="text-xs text-muted-foreground text-center flex-1 flex items-center justify-center leading-relaxed px-2">
                                  {card.back}
                                </p>
                                <span className="text-[9px] text-muted-foreground text-right block font-bold">Tap to hide</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Free Upgrade overlay */}
                  {!isProUser && examPackage.flashcards && examPackage.flashcards.length > 3 && (
                    <div className="pt-6 text-center border-t border-border mt-8">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Upgrade to view remaining {examPackage.flashcards.length - 3} flashcards</p>
                      <Link href="/pricing" className="btn-brand bg-gradient-to-r from-amber-500 to-orange-500 border-none text-white text-xs py-2 px-4 inline-flex items-center gap-1.5 rounded-lg font-bold cursor-pointer">
                        Unlock Complete Exam Mode <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: MOCK EXAM */}
              {activeTab === 'mock' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">Structured Mock Examination Paper</h3>
                    <button
                      onClick={handleDownloadMockTest}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Paper (MD)
                    </button>
                  </div>

                  {(() => {
                    const mock = examPackage.mockTest;
                    if (!mock) return <p className="text-sm text-muted-foreground">Mock test paper data is unavailable.</p>;

                    // Handle new mock schema object vs legacy array
                    if (mock.sectionA || mock.sectionB || mock.sectionC) {
                      return (
                        <div className="space-y-8">
                          {/* Section A */}
                          {mock.sectionA && (
                            <div className="space-y-4">
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider bg-secondary/20 p-2 rounded-lg pl-3 border-l-2 border-primary">
                                Section A: Short Answer & Conceptual Questions
                              </h4>
                              {mock.sectionA.map((item: any, i: number) => (
                                <div key={i} className="p-5 rounded-2xl bg-secondary/15 border border-border/40 space-y-3">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Q A.{i + 1}: {item.question}</p>
                                  <div className="bg-card border border-border/40 p-4 rounded-xl text-xs text-muted-foreground leading-relaxed">
                                    <strong className="text-primary block mb-1">Answer Guidelines:</strong>
                                    {item.idealAnswer}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Section B */}
                          {mock.sectionB && (
                            <div className="space-y-4">
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider bg-secondary/20 p-2 rounded-lg pl-3 border-l-2 border-amber-500">
                                Section B: Applied & Case-Based Scenarios
                              </h4>
                              {mock.sectionB.map((item: any, i: number) => (
                                <div key={i} className="p-5 rounded-2xl bg-secondary/15 border border-border/40 space-y-3">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Q B.{i + 1}: {item.question}</p>
                                  <div className="bg-card border border-border/40 p-4 rounded-xl text-xs text-muted-foreground leading-relaxed">
                                    <strong className="text-amber-500 block mb-1">Model Answer structure:</strong>
                                    {item.idealAnswer}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Section C */}
                          {mock.sectionC && (
                            <div className="space-y-4">
                              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider bg-secondary/20 p-2 rounded-lg pl-3 border-l-2 border-green-500">
                                Section C: Numerical & Derivations Analysis
                              </h4>
                              {mock.sectionC.map((item: any, i: number) => (
                                <div key={i} className="p-5 rounded-2xl bg-secondary/15 border border-border/40 space-y-3">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Q C.{i + 1}: {item.question}</p>
                                  <div className="bg-card border border-border/40 p-4 rounded-xl text-xs text-muted-foreground leading-relaxed">
                                    <strong className="text-green-500 block mb-1">Model Worked derivation:</strong>
                                    {item.idealAnswer}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Fallback to legacy array if loaded
                    return (
                      <div className="space-y-4">
                        {(Array.isArray(mock) ? mock : []).map((test: any, i: number) => (
                          <div key={i} className="p-5 rounded-2xl bg-secondary/15 border border-border/30 space-y-3">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">Q{i + 1}: {test.question}</h4>
                            <div className="bg-card border border-border/40 p-4 rounded-xl">
                              <p className="text-xs font-semibold text-primary mb-1">Ideal Model Answer Structure:</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{test.idealAnswer}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 8: DIFFICULTY ANALYSIS */}
              {activeTab === 'difficulty' && (
                <div className="space-y-6">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white border-b border-border pb-2">Academic Assessment Analysis</h3>
                  
                  <div className="p-6 rounded-2xl bg-secondary/10 border border-border/40 space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Subject Area Complexity Overview</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This package was structured with an average difficulty ranking of <strong>{examPackage.difficulty || 'Medium'}</strong>. 
                        The exam weightage breakdown advises allocating 40% of revision time to applied derivations, 30% to conceptual term definitions, and 30% to calculations.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                        <span className="font-bold text-primary">Core Strengths required:</span>
                        <p className="text-muted-foreground">Analytical deduction, mathematical operations, structured essay writing.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                        <span className="font-bold text-amber-500">Suggested Revision Method:</span>
                        <p className="text-muted-foreground">Chapter smart-notes reading followed by interactive MCQ testing and Pyq answer rubrics matching.</p>
                      </div>

                      <div className="p-4 rounded-xl bg-card border border-border/40 space-y-1">
                        <span className="font-bold text-green-500">Confidence Metric:</span>
                        <p className="text-muted-foreground">Our model predicts a {examPackage.estimatedExamScore}% conversion accuracy on textbook terms.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Reset button to compile another */}
            <button
              onClick={() => {
                setExamPackage(null);
                setFiles([]);
              }}
              className="btn-ghost py-3.5 w-full flex items-center justify-center gap-2 border border-border hover:bg-secondary/20 rounded-2xl font-bold cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Reset & Upload New Document
            </button>
          </div>
        )}

        {/* Collapsible Slide-over History Drawer (Pro Users) */}
        <AnimatePresence>
          {showHistory && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="fixed inset-0 bg-black z-40"
              />

              {/* Sidebar Drawer */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-[350px] bg-card border-l border-border z-50 shadow-2xl p-6 flex flex-col justify-between"
              >
                <div className="space-y-6 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                      <History className="w-5 h-5 text-amber-500" />
                      Exam Prep History
                    </h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  {historyLoading ? (
                    <div className="space-y-3 flex-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 skeleton rounded-xl" />
                      ))}
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-10 flex-1 flex flex-col justify-center items-center">
                      <FileText className="w-10 h-10 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No generated packages found.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto scrollbar-none pr-1">
                      {history.map((pkg) => (
                        <button
                          key={pkg.id}
                          onClick={() => loadPackage(pkg.id)}
                          className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                              {pkg.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Score: {pkg.readinessScore}% • Diff: {pkg.difficulty || 'Medium'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-[10px] text-muted-foreground text-center font-sans">Revisit any generated exam package instantly.</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </ToolLayout>
  );
}
