'use client';
// src/app/ai/quiz/page.tsx
import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import type { QuizQuestion } from '@/types';

export default function QuizPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [count, setCount] = useState(10);

  const handleGenerate = async () => {
    if (!files[0]) return toast.error('Upload a PDF first');

    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('count', count.toString());

      const { data } = await axios.post('/api/ai/quiz', formData);
      setQuestions(data.questions);
      toast.success(`${data.questions.length} questions generated!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const submitQuiz = () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }
    setSubmitted(true);
  };

  const score = submitted
    ? questions.filter((q, i) => answers[i] === q.correctIndex).length
    : 0;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const reset = () => {
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setFiles([]);
  };

  return (
    <ToolLayout requiresAuth={true} isAI={true}
      title="AI Quiz Generator"
      description="Generate MCQ quizzes from your study material with instant scoring."
      icon="❓"
    >
      <div className="space-y-6">
        {questions.length === 0 ? (
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
                  <label className="text-sm font-medium text-[#9CA3AF] mb-2 block">
                    Number of questions: <span className="text-[#10B981] font-semibold">{count}</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={5}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full accent-[#10B981]"
                  />
                </div>
                <button onClick={handleGenerate} className="btn-brand w-full py-3.5 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate {count} Questions
                </button>
              </div>
            )}

            {loading && (
              <div className="bg-[#161B22] border border-[#1F2937] rounded-2xl p-10 text-center">
                <div className="w-12 h-12 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-medium text-white">Generating quiz...</p>
              </div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Score (after submit) */}
            {submitted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-[#161B22] rounded-2xl p-6 text-center border ${
                  percentage >= 70 ? 'border-green-500/30' : 'border-red-500/30'
                }`}
              >
                <Trophy className={`w-10 h-10 mx-auto mb-3 ${percentage >= 70 ? 'text-yellow-400' : 'text-gray-400'}`} />
                <p className="text-3xl font-bold text-white">{score}/{questions.length}</p>
                <p className={`text-lg font-semibold mt-1 ${percentage >= 70 ? 'text-[#10B981]' : 'text-red-500'}`}>
                  {percentage}% — {percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good job!' : 'Keep practicing!'}
                </p>
                <button onClick={reset} className="mt-4 btn-ghost flex items-center gap-2 mx-auto">
                  <RotateCcw className="w-4 h-4" />
                  Take Another Quiz
                </button>
              </motion.div>
            )}

            {/* Questions */}
            {questions.map((q, qi) => {
              const userAnswer = answers[qi];
              const isCorrect = userAnswer === q.correctIndex;

              return (
                <div key={qi} className="bg-[#161B22] border border-[#1F2937] rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#10B981]/15 text-[#10B981] text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {qi + 1}
                    </span>
                    <p className="text-sm font-medium text-white">{q.question}</p>
                  </div>

                  <div className="space-y-2 pl-10">
                    {q.options.map((opt, oi) => {
                      let style = 'border-[#1F2937] text-[#9CA3AF] hover:border-[#374151] hover:text-white';

                      if (submitted) {
                        if (oi === q.correctIndex) {
                          style = 'border-green-500 bg-green-500/10 text-green-400';
                        } else if (oi === userAnswer && !isCorrect) {
                          style = 'border-red-500 bg-red-500/10 text-red-400';
                        }
                      } else if (userAnswer === oi) {
                        style = 'border-[#10B981] bg-[#10B981]/10 text-white';
                      }

                      return (
                        <button
                          key={oi}
                          onClick={() => selectAnswer(qi, oi)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${style}`}
                        >
                          <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                          {submitted && oi === q.correctIndex && (
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />
                          )}
                          {submitted && oi === userAnswer && !isCorrect && (
                            <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="pl-10 text-xs text-[#9CA3AF] bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-2">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {!submitted && (
              <button
                onClick={submitQuiz}
                disabled={Object.keys(answers).length < questions.length}
                className="btn-brand w-full py-3.5 disabled:opacity-60"
              >
                Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
              </button>
            )}
          </motion.div>
        )}
      </div>
    </ToolLayout>
  );
}
