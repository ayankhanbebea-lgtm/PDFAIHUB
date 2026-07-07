// src/types/index.ts

export type UserRole = 'USER' | 'ADMIN';
export type UserPlan = 'FREE' | 'PRO';
export type FileStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';
export type PaymentProvider = 'stripe' | 'razorpay';

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  plan: UserPlan;
  banned: boolean;
  aiUsed: number;
  pdfUsed: number;
  lastReset: Date;
  createdAt: Date;
}

export interface File {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  tool: string;
  status: FileStatus;
  resultUrl: string | null;
  resultSize: number | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: UserPlan;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  title: string | null;
  fileName: string | null;
  messages: ChatMessage[];
  createdAt: Date;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  cards: Flashcard[];
  createdAt: Date;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: Date;
}

export interface AISummary {
  shortSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  examRevisionNotes: string;
  importantQuestions: string[];
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
  razorpayPlanId?: string;
}

export interface AdminStats {
  totalUsers: number;
  proUsers: number;
  totalFiles: number;
  totalRevenue: number;
  dailyActiveUsers: number;
  newUsersToday: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tool configs
export type PDFTool =
  | 'merge'
  | 'split'
  | 'compress'
  | 'pdf-to-word'
  | 'image-to-pdf'
  | 'protect'
  | 'unlock';

export type AITool =
  | 'summarize'
  | 'chat'
  | 'flashcards'
  | 'quiz';

export interface ToolConfig {
  id: PDFTool | AITool;
  name: string;
  description: string;
  icon: string;
  category: 'pdf' | 'ai';
  isPro: boolean;
  acceptedFiles: string[];
  maxFiles: number;
}

export interface ExamPackage {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  fileSize: number;
  readinessScore: number;
  studyTime: string;
  questionsCount: number;
  flashcardsCount: number;
  difficulty: string | null;
  smartNotes: any;
  importantTopics: any;
  pysQuestions: any;
  mcqs: any;
  flashcards: any;
  revisionNotes: any;
  memoryTricks: any;
  mockTest: any;
  createdAt: Date;
}

