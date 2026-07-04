// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function validateFileSize(size: number, maxMB = 50): boolean {
  return size <= maxMB * 1024 * 1024;
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isPDF(filename: string): boolean {
  return getFileExtension(filename) === 'pdf';
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const TOOL_CONFIGS = {
  merge: {
    name: 'PDF Merge',
    description: 'Combine multiple PDFs into one',
    acceptedTypes: ['application/pdf'],
    maxFiles: 20,
    icon: '🔗',
  },
  split: {
    name: 'PDF Splitter',
    description: 'Split PDF into multiple files',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '✂️',
  },
  compress: {
    name: 'PDF Compressor',
    description: 'Reduce PDF file size',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '🗜️',
  },
  'pdf-to-word': {
    name: 'PDF to Word',
    description: 'Convert PDF to editable DOCX',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '📝',
  },
  'image-to-pdf': {
    name: 'Image to PDF',
    description: 'Convert images to PDF',
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles: 30,
    icon: '🖼️',
  },
  protect: {
    name: 'PDF Protect',
    description: 'Add password protection',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '🔒',
  },
  summarize: {
    name: 'AI Summarizer',
    description: 'Generate AI summaries',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '🤖',
  },
  chat: {
    name: 'AI Chat',
    description: 'Chat with your PDF',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '💬',
  },
  flashcards: {
    name: 'Flashcard Generator',
    description: 'Auto-generate study flashcards',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '🃏',
  },
  quiz: {
    name: 'Quiz Generator',
    description: 'Generate MCQ quizzes',
    acceptedTypes: ['application/pdf'],
    maxFiles: 1,
    icon: '❓',
  },
};
