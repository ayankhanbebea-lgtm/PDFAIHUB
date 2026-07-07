'use client';
// src/app/ai/exam/page.tsx — Theme-aware
import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Lock, ArrowRight, BookOpen, Clock, Brain, AlertCircle,
  HelpCircle, Eye, RefreshCw, BarChart, History, ChevronRight, FileText, Check, X
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
  const [activeTab, setActiveTab] = useState<'notes' | 'topics' | 'pyqs' | 'mcqs' | 'flashcards' | 'revision' | 'mnemonics' | 'mock'>('notes');

  // History states
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      toast.success('Exam Package loaded successfully!');
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
    
    // Simulate multi-step progress logging
    const steps = [
      { msg: 'Extracting plain text from PDF...', p: 20 },
      { msg: 'Analyzing topic difficulty...', p: 35 },
      { msg: 'Structuring chapter-wise smart notes...', p: 55 },
      { msg: 'Drafting high probability PYQs & MCQs...', p: 75 },
      { msg: 'Creating flashcards & mock tests...', p: 90 },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setStatusMsg(steps[currentStep].msg);
        setProgressVal(steps[currentStep].p);
        currentStep++;
      }
    }, 2500);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('provider', provider);

      const { data } = await axios.post('/api/ai/exam', formData);
      clearInterval(interval);
      setProgressVal(100);
      setExamPackage(data.examPackage || data);
      toast.success('AI Exam Package prepared successfully!');
      fetchHistory();
    } catch (err: any) {
      clearInterval(interval);
      toast.error(err.response?.data?.error || 'Failed to prepare exam package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout
      requiresAuth={true}
      title="AI Exam Mode"
      description="Automatically generate comprehensive study notes, flashcards, MCQs, memory aids, and mock tests from your textbooks."
      icon="🎓"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Dashboard state (Idle upload) */}
          {!examPackage && !loading && (
            <div className="space-y-6">
              <FileDropzone
                files={files}
                onFilesChange={setFiles}
                acceptedTypes={['application/pdf']}
                maxSizeMB={25}
                label="Drop study material PDF to prepare Exam Mode package"
              />

              {files.length > 0 && (
                <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Provider</p>
                      <p className="text-xs text-muted-foreground">Select completion engine</p>
                    </div>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as any)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-border bg-card"
                    >
                      <option value="groq">Groq Llama 3.3 (Fastest)</option>
                      <option value="gemini">Gemini 1.5 Flash (Large Context)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="btn-brand bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none text-white w-full py-4 text-base font-semibold shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Prepare Exam Package
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className="glass rounded-2xl p-8 border border-white/10 text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/15 border-t-amber-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-primary/10 border-t-primary animate-spin [animation-duration:1.5s]" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🎓</div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generating AI Exam Package</h3>
                <p className="text-sm text-muted-foreground">{statusMsg}</p>
              </div>

              {/* Progress bar */}
              <div className="max-w-md mx-auto">
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressVal}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{progressVal}% Complete</p>
              </div>
            </div>
          )}

          {/* Result view */}
          {examPackage && !loading && (
            <div className="space-y-6">
              
              {/* Header Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 text-lg font-bold">
                    {examPackage.readinessScore || 85}%
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Exam Readiness</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Readiness Score</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Study Time</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{examPackage.studyTime || '6h 20m'}</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Questions</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{examPackage.questionsCount || 150} items</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {examPackage.difficulty || 'Medium'}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Difficulty</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Level</p>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border">
                {[
                  { id: 'notes', label: 'Smart Notes', icon: '📝' },
                  { id: 'topics', label: 'Important Topics', icon: '📌' },
                  { id: 'pyqs', label: 'PYQs Guidelines', icon: '📋' },
                  { id: 'mcqs', label: 'MCQs', icon: '❓' },
                  { id: 'flashcards', label: 'Flashcards', icon: '🃏' },
                  { id: 'revision', label: 'Revision Notes', icon: '📑' },
                  { id: 'mnemonics', label: 'Mnemonics', icon: '💡' },
                  { id: 'mock', label: 'Mock Test', icon: '✍️' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tabs Content */}
              <div className="glass rounded-3xl p-6 border border-white/10 relative overflow-hidden min-h-[400px]">
                
                {/* Free User Blur & Upgrade Banner */}
                {!isProUser && activeTab !== 'mcqs' && activeTab !== 'flashcards' && (
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-[8px] z-20 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md bg-card border border-amber-500/20 p-8 rounded-3xl shadow-2xl space-y-4">
                      <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl rounded-2xl mx-auto text-amber-500">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Unlock your complete AI Exam Package with Pro</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Get unlimited access to Smart Notes, Memory tricks, Mock Tests, and customized exam prep history.
                      </p>
                      <Link href="/pricing" className="btn-brand bg-gradient-to-r from-amber-500 to-orange-500 border-none text-white inline-flex items-center gap-2 py-3 px-6 rounded-xl font-bold cursor-pointer">
                        Upgrade to Pro <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* 1. Smart Notes */}
                {activeTab === 'notes' && (
                  <div className="space-y-6">
                    {examPackage.smartNotes?.map((note: any, index: number) => (
                      <div key={index} className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="w-6 h-6 bg-primary/10 text-primary flex items-center justify-center rounded-lg text-xs font-bold">
                            {index + 1}
                          </span>
                          {note.chapter}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{note.summary}</p>
                        <div className="space-y-1.5 pl-8">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Key Takeaways:</p>
                          <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                            {note.keyTakeaways?.map((takeaway: string, idx: number) => (
                              <li key={idx}>{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Important Topics */}
                {activeTab === 'topics' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examPackage.importantTopics?.map((topic: any, index: number) => (
                      <div key={index} className="p-4 rounded-2xl bg-secondary/20 border border-border/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 dark:text-white">{topic.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            topic.importance === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {topic.importance} Importance
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{topic.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. PYQs */}
                {activeTab === 'pyqs' && (
                  <div className="space-y-4">
                    {examPackage.pysQuestions?.map((pyq: any, index: number) => (
                      <div key={index} className="p-5 rounded-2xl bg-secondary/15 border border-border/30 space-y-2">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Q{index + 1}: {pyq.question}</h4>
                        <div className="pl-4 border-l-2 border-primary/30 mt-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Answering Strategy:</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{pyq.guidelines}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. MCQs */}
                {activeTab === 'mcqs' && (
                  <div className="space-y-6 relative">
                    {examPackage.mcqs?.map((mcq: any, index: number) => {
                      const isBlurred = !isProUser && index >= 5;
                      return (
                        <div
                          key={index}
                          className={`p-5 rounded-2xl bg-secondary/20 border border-border/30 space-y-4 transition-all duration-300 ${
                            isBlurred ? 'blur-[5px] select-none pointer-events-none opacity-40' : ''
                          }`}
                        >
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">Q{index + 1}: {mcq.question}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mcq.options?.map((opt: string, optIdx: number) => {
                              const isSelected = selectedAnswers[index] === optIdx;
                              const isCorrect = mcq.correctIndex === optIdx;
                              let btnClass = 'border-border bg-card text-muted-foreground hover:bg-secondary/40';

                              if (selectedAnswers[index] !== undefined) {
                                if (isCorrect) {
                                  btnClass = 'border-green-500/35 bg-green-500/10 text-green-500 font-bold';
                                } else if (isSelected) {
                                  btnClass = 'border-red-500/35 bg-red-500/10 text-red-500 font-bold';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  disabled={selectedAnswers[index] !== undefined}
                                  onClick={() => {
                                    setSelectedAnswers(prev => ({ ...prev, [index]: optIdx }));
                                    setRevealExplanation(prev => ({ ...prev, [index]: true }));
                                  }}
                                  className={`p-3 text-xs rounded-xl border text-left flex items-center justify-between cursor-pointer transition-colors ${btnClass}`}
                                >
                                  <span>{opt}</span>
                                  {selectedAnswers[index] !== undefined && (
                                    isCorrect ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> : isSelected ? <X className="w-4 h-4 text-red-500 flex-shrink-0" /> : null
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {revealExplanation[index] && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-xs text-muted-foreground"
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
                )}

                {/* 5. Flashcards */}
                {activeTab === 'flashcards' && (
                  <div className="space-y-6 relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {examPackage.flashcards?.map((card: any, index: number) => {
                        const isBlurred = !isProUser && index >= 3;
                        const isFlipped = flippedCards[index] ?? false;

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              if (!isBlurred) {
                                setFlippedCards(prev => ({ ...prev, [index]: !isFlipped }));
                              }
                            }}
                            className={`h-40 rounded-2xl border relative cursor-pointer transition-all duration-300 select-none ${
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
                                  className="absolute inset-0 p-4 flex flex-col justify-between"
                                >
                                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Question</span>
                                  <p className="text-xs font-semibold text-gray-900 dark:text-white text-center flex-1 flex items-center justify-center leading-relaxed">
                                    {card.front}
                                  </p>
                                  <span className="text-[9px] text-muted-foreground text-right block">Tap to flip</span>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="back"
                                  initial={{ opacity: 0, rotateY: 90 }}
                                  animate={{ opacity: 1, rotateY: 0 }}
                                  exit={{ opacity: 0, rotateY: -90 }}
                                  className="absolute inset-0 p-4 bg-primary/5 rounded-2xl flex flex-col justify-between"
                                >
                                  <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Answer</span>
                                  <p className="text-xs text-muted-foreground text-center flex-1 flex items-center justify-center leading-relaxed">
                                    {card.back}
                                  </p>
                                  <span className="text-[9px] text-muted-foreground text-right block">Tap to flip back</span>
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

                {/* 6. Revision Notes */}
                {activeTab === 'revision' && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed space-y-4">
                    {examPackage.revisionNotes?.split('\n').map((para: string, idx: number) => {
                      if (para.startsWith('-')) {
                        return <li key={idx} className="ml-4">{para.replace('-', '').trim()}</li>;
                      }
                      return <p key={idx}>{para}</p>;
                    })}
                  </div>
                )}

                {/* 7. Mnemonics */}
                {activeTab === 'mnemonics' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examPackage.memoryTricks?.map((trick: any, index: number) => (
                      <div key={index} className="p-4 rounded-2xl bg-secondary/15 border border-border/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-bold">
                            Mnemonic
                          </span>
                          <span className="text-sm font-black text-amber-500 tracking-wider">
                            {trick.mnemonic}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{trick.concept}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{trick.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 8. Mock Test */}
                {activeTab === 'mock' && (
                  <div className="space-y-6">
                    {examPackage.mockTest?.map((test: any, index: number) => (
                      <div key={index} className="p-5 rounded-2xl bg-secondary/20 border border-border/30 space-y-3">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Q{index + 1}: {test.question}</h4>
                        <div className="bg-card border border-border/40 p-4 rounded-xl">
                          <p className="text-xs font-semibold text-primary mb-1">Ideal Model Answer Structure:</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{test.idealAnswer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset button to compile another */}
              <button
                onClick={() => {
                  setExamPackage(null);
                  setFiles([]);
                }}
                className="btn-ghost py-3.5 w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reset & Upload New Document
              </button>
            </div>
          )}
        </div>

        {/* Sidebar History (Pro Users) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
              <History className="w-5 h-5 text-amber-500" />
              Exam Package History
            </h3>

            {!isProUser ? (
              <div className="rounded-2xl p-4 bg-amber-500/5 border border-amber-500/20 text-center space-y-3">
                <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs text-gray-900 dark:text-white font-semibold">Pro Feature History</p>
                <p className="text-[11px] text-muted-foreground">
                  Upgrade to Pro to automatically save and revisit your generated Exam packages anytime.
                </p>
                <Link href="/pricing" className="btn-brand bg-gradient-to-r from-amber-500 to-orange-500 border-none text-white text-xs py-2 px-4 rounded-lg block font-bold cursor-pointer">
                  View Pro Plans
                </Link>
              </div>
            ) : historyLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 skeleton rounded-xl" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">No generated packages found.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto scrollbar-none">
                {history.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => loadPackage(pkg.id)}
                    className="w-full text-left p-3.5 rounded-xl border border-border bg-card hover:border-primary/30 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {pkg.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Readiness: {pkg.readinessScore}% • {new Date(pkg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
