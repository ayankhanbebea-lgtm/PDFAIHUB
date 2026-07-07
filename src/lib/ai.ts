// src/lib/ai.ts
// Multi-provider AI engine: Groq (primary) → Gemini (fallback)
// OpenAI removed by user request.

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import type { AISummary, Flashcard, QuizQuestion } from '@/types';

// ─── Key validation ───────────────────────────────────────────────────────────
const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const groqValid   = !!(GROQ_KEY   && GROQ_KEY   !== 'your-groq-api-key'   && GROQ_KEY.startsWith('gsk_'));
const geminiValid = !!(GEMINI_KEY && GEMINI_KEY !== 'your-gemini-api-key' && GEMINI_KEY.startsWith('AIza'));

console.log('[ai.ts] Provider status — Groq:', groqValid, '| Gemini:', geminiValid);

// ─── Lazy singletons ──────────────────────────────────────────────────────────
let _groq: Groq | null = null;
let _gemini: GoogleGenerativeAI | null = null;

function getGroq(): Groq {
  if (!groqValid) throw new Error('GROQ_API_KEY not valid. Get a free key at console.groq.com (must start with gsk_)');
  if (!_groq) _groq = new Groq({ apiKey: GROQ_KEY });
  return _groq;
}

function getGemini(): GoogleGenerativeAI {
  if (!geminiValid) throw new Error('GEMINI_API_KEY not valid. Get a free key at aistudio.google.com/app/apikey (must start with AIza...)');
  if (!_gemini) _gemini = new GoogleGenerativeAI(GEMINI_KEY!);
  return _gemini;
}

export type AIProvider = 'groq' | 'gemini';

// ─── Auto-select best available provider ─────────────────────────────────────
function resolveProvider(requested: string): AIProvider {
  if (requested === 'groq'   && groqValid)   return 'groq';
  if (requested === 'gemini' && geminiValid) return 'gemini';
  // Auto-fallback
  if (groqValid)   return 'groq';
  if (geminiValid) return 'gemini';
  throw new Error(
    'No AI provider configured. Add to .env.local:\n' +
    '  GROQ_API_KEY=gsk_...   (FREE — console.groq.com)\n' +
    '  GEMINI_API_KEY=AIza... (FREE — aistudio.google.com/app/apikey)'
  );
}

// ─── Core generation ─────────────────────────────────────────────────────────
async function generateWithAI(
  prompt: string,
  systemPrompt: string,
  requestedProvider: string = 'groq'
): Promise<string> {
  const provider = resolveProvider(requestedProvider);
  console.log(`[ai] provider: ${provider}, promptLen: ${prompt.length}`);

  if (provider === 'groq') {
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });
    const text = completion.choices[0]?.message?.content || '';
    console.log(`[ai] Groq OK — responseLen: ${text.length}`);
    return text;
  }

  // Gemini fallback
  const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
  const text = result.response.text();
  console.log(`[ai] Gemini OK — responseLen: ${text.length}`);
  return text;
}

// ─── generateSummary ──────────────────────────────────────────────────────────
export async function generateSummary(
  text: string,
  provider: string = 'groq'
): Promise<AISummary> {
  const systemPrompt = `You are an expert academic assistant. Analyze the provided text and generate structured study content.
Always respond with valid JSON only — no markdown, no code fences, no backticks. Raw JSON only.`;

  const prompt = `Analyze this text and return this exact JSON structure (raw JSON, no code blocks):

Text: ${text.slice(0, 8000)}

{
  "shortSummary": "2-3 sentence overview",
  "detailedSummary": "Comprehensive 5-8 paragraph analysis",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "examRevisionNotes": "Structured revision notes with key concepts",
  "importantQuestions": ["question 1", "question 2", "question 3", "question 4", "question 5"]
}`;

  const response = await generateWithAI(prompt, systemPrompt, provider);

  try {
    const cleaned = response.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned) as AISummary;
  } catch {
    return {
      shortSummary: response.slice(0, 300),
      detailedSummary: response,
      keyPoints: ['Review the document for key concepts'],
      examRevisionNotes: response.slice(0, 1000),
      importantQuestions: ['What are the main topics covered?'],
    };
  }
}

// ─── generateFlashcards ───────────────────────────────────────────────────────
export async function generateFlashcards(
  text: string,
  count = 20,
  provider: string = 'groq'
): Promise<Flashcard[]> {
  const systemPrompt = `You are an expert educator creating study flashcards.
Always respond with valid JSON only — no markdown, no code fences. Raw JSON only.`;

  const prompt = `Create ${count} flashcards from this text. Return raw JSON only:

Text: ${text.slice(0, 8000)}

{"flashcards": [{"front": "Question or term", "back": "Answer or definition"}]}`;

  const response = await generateWithAI(prompt, systemPrompt, provider);

  try {
    const cleaned = response.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleaned);
    return data.flashcards || [];
  } catch {
    return [{ front: 'What is this document about?', back: 'Review the uploaded document.' }];
  }
}

// ─── generateQuiz ─────────────────────────────────────────────────────────────
export async function generateQuiz(
  text: string,
  count = 10,
  provider: string = 'groq'
): Promise<QuizQuestion[]> {
  const systemPrompt = `You are an expert quiz creator. Generate multiple-choice questions.
Always respond with valid JSON only — no markdown, no code fences. Raw JSON only.`;

  const prompt = `Create ${count} MCQ questions from this text. Return raw JSON only:

Text: ${text.slice(0, 8000)}

{"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}`;

  const response = await generateWithAI(prompt, systemPrompt, provider);

  try {
    const cleaned = response.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const data = JSON.parse(cleaned);
    return data.questions || [];
  } catch {
    return [];
  }
}

// ─── chatWithPDF ──────────────────────────────────────────────────────────────
export async function chatWithPDF(
  question: string,
  pdfContent: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  provider: string = 'groq'
): Promise<string> {
  const resolvedProvider = resolveProvider(provider);
  console.log(`[ai] chatWithPDF — provider: ${resolvedProvider}, histLen: ${conversationHistory.length}`);

  const systemPrompt = `You are a helpful assistant answering questions based strictly on this PDF document.
If the answer is not in the document, say "I couldn't find information about this in the document."

PDF CONTENT:
${pdfContent.slice(0, 10000)}`;

  if (resolvedProvider === 'groq') {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: question },
    ];
    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 1000,
    });
    return completion.choices[0]?.message?.content || 'Unable to process your question.';
  }

  // Gemini
  const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const history = conversationHistory.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
  const chat = model.startChat({
    history: [{ role: 'user', parts: [{ text: systemPrompt }] }, ...history],
  });
  const result = await chat.sendMessage(question);
  return result.response.text();
}

/**
 * AI Exam Mode: Generates a complete exam preparation package from PDF text.
 */
export async function generateExamPackage(
  text: string,
  provider: string = 'groq'
): Promise<any> {
  const systemPrompt = `You are a world-class academic prep tutor. Create a comprehensive, premium exam preparation package from the provided textbook/notes text.
Always respond with valid JSON only. Raw JSON only, no backticks, no markdown code blocks.`;

  const prompt = `Analyze this textbook/notes text:
${text.slice(0, 10000)}

Generate a premium exam preparation package in the following JSON format. Make sure to populate every section with realistic study resources.

JSON Structure:
{
  "readinessScore": 85, // Integer between 0 and 100 representing how complete the material is for an exam
  "studyTime": "6h 20m", // Estimated study time based on length/difficulty
  "questionsCount": 15,
  "flashcardsCount": 10,
  "difficulty": "Medium", // Easy, Medium, or Hard
  "smartNotes": [
    {
      "chapter": "Chapter 1: Core Concepts",
      "summary": "Full summary of the chapter's core concepts...",
      "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"]
    }
  ],
  "importantTopics": [
    {
      "title": "Topic Title",
      "importance": "High", // High, Medium, Low
      "description": "Why this is important and what to look out for"
    }
  ],
  "pysQuestions": [
    {
      "question": "Sample Previous Year exam question?",
      "guidelines": "Step-by-step guidance on how to solve this"
    }
  ],
  "mcqs": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Detailed explanation of why this option is correct"
    }
  ],
  "flashcards": [
    {
      "front": "Term / Question",
      "back": "Definition / Answer"
    }
  ],
  "revisionNotes": "A structured, concise Markdown format review of the entire material. Bulleted lists, bold text where appropriate.",
  "memoryTricks": [
    {
      "concept": "Concept to remember",
      "mnemonic": "e.g. PEMDAS",
      "explanation": "How to apply this mnemonic"
    }
  ],
  "mockTest": [
    {
      "question": "Mock exam question?",
      "idealAnswer": "Ideal high-scoring answer guideline"
    }
  ]
}`;

  const responseText = await generateWithAI(prompt, systemPrompt, provider);

  try {
    // Strip backticks or markdown formatting if any exists
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('[generateExamPackage] Failed to parse JSON from response:', responseText);
    throw new Error('Failed to generate exam package. Please try again.');
  }
}

