'use client';
// src/app/ai/chat/page.tsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, FileText, RefreshCw } from 'lucide-react';
import { ToolLayout } from '@/components/tools/tool-layout';
import { FileDropzone } from '@/components/tools/file-dropzone';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat() {
  const [files, setFiles] = useState<File[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async () => {
    if (!files[0]) return toast.error('Upload a PDF first');

    setUploadingPDF(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('question', 'Hello! Please briefly introduce what this document is about.');

      const { data } = await axios.post('/api/ai/chat', formData);
      setSessionId(data.sessionId);
      setPdfReady(true);
      setMessages([{ role: 'assistant', content: data.answer }]);
      toast.success('PDF ready! Start asking questions.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to process PDF');
    } finally {
      setUploadingPDF(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('question', userMessage);
      formData.append('sessionId', sessionId);

      const { data } = await axios.post('/api/ai/chat', formData);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to get answer');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setSessionId('');
    setMessages([]);
    setPdfReady(false);
  };

  return (
    <ToolLayout requiresAuth={true} isAI={true}
      title="AI PDF Chat"
      description="Upload any PDF and ask questions. AI answers based only on your document."
      icon="💬"
    >
      {!pdfReady ? (
        <div className="space-y-6">
          <FileDropzone
            files={files}
            onFilesChange={setFiles}
            acceptedTypes={['application/pdf']}
            maxSizeMB={20}
            label="Drop PDF to chat with"
            sublabel="Reports, textbooks, contracts • Max 20MB"
          />
          {files.length > 0 && (
            <button
              onClick={startSession}
              disabled={uploadingPDF}
              className="btn-brand w-full py-3.5 flex items-center justify-center gap-2"
            >
              {uploadingPDF ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing PDF...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  Start AI Chat
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-[600px] bg-[#161B22] rounded-2xl border border-[#1F2937] overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b border-[#1F2937]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#10B981]/15 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate max-w-[250px]">{files[0]?.name}</p>
                <p className="text-xs text-[#10B981] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full" /> AI Ready
                </p>
              </div>
            </div>
            <button onClick={reset} className="p-2 rounded-lg hover:bg-white/5 text-[#9CA3AF] hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#1F2937]'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#10B981]" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#10B981] text-white rounded-tr-sm'
                      : 'bg-[#111827] border border-[#1F2937] text-white rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown className="prose dark:prose-invert prose-sm max-w-none">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#10B981]" />
                </div>
                <div className="bg-[#111827] border border-[#1F2937] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 bg-[#10B981] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[#1F2937]">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask anything about this document..."
                className="flex-1 bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#10B981] transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
