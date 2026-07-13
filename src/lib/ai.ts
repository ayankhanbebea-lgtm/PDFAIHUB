// src/lib/ai.ts
// Multi-provider AI engine: Groq (primary) → Gemini (fallback)
// OpenAI removed by user request.

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import type { AISummary, Flashcard, QuizQuestion } from '@/types';
import { DocumentChunk, PageChunk, PDFPageData } from './pdf-ai';

// ─── Key validation ───────────────────────────────────────────────────────────
const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const groqValid   = !!(GROQ_KEY   && GROQ_KEY   !== 'your-groq-api-key'   && GROQ_KEY.startsWith('gsk_'));
const geminiValid = !!(GEMINI_KEY && GEMINI_KEY !== 'your-gemini-api-key' && (GEMINI_KEY.startsWith('AIza') || GEMINI_KEY.startsWith('AQ.') || GEMINI_KEY.length > 10));

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
  const systemPrompt = `You are an expert academic assistant. Analyze the text and generate structured study content.
Always respond with valid JSON only. Raw JSON only, no markdown code fences.`;

  const prompt = `Analyze this text:
---
${text.slice(0, 6000)}
---

Return JSON:
{
  "shortSummary": "2-3 sentence overview",
  "detailedSummary": "5-8 paragraph analysis",
  "keyPoints": ["5 key points"],
  "examRevisionNotes": "Revision notes",
  "importantQuestions": ["5 questions"]
}`;

  const response = await generateWithAIWithBackoff(prompt, systemPrompt, provider);

  try {
    const cleaned = repairJson(response);
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

// --- Helper Quiz Question and Flashcard validation / cleaning / fallbacks ---
const fallbackQuestions: QuizQuestion[] = [
  {
    question: "What is the primary topic of the uploaded document?",
    options: ["The document's main subject", "An unrelated topic", "General knowledge", "None of the above"],
    correctIndex: 0,
    explanation: "Please review the document's sections for more detail."
  }
];

const fallbackFlashcards: Flashcard[] = [
  {
    front: "What is the key takeaway of this document?",
    back: "Refer to the summary and chapters of the uploaded file."
  }
];

function cleanQuizQuestions(questions: any[]): QuizQuestion[] {
  if (!Array.isArray(questions)) return [];
  const valid: QuizQuestion[] = [];
  for (const q of questions) {
    if (!q || typeof q !== 'object') continue;
    const questionText = typeof q.question === 'string' ? q.question.trim() : '';
    if (!questionText) continue;

    let options = Array.isArray(q.options) 
      ? q.options.map((o: any) => typeof o === 'string' ? o.trim() : String(o)).filter(Boolean)
      : [];
    if (options.length < 2) {
      options = ["True", "False"];
    }

    let correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
    if (correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0;
    }

    const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : 'No explanation provided.';

    valid.push({
      question: questionText,
      options,
      correctIndex,
      explanation,
    });
  }
  return valid;
}

function cleanFlashcards(cards: any[]): Flashcard[] {
  if (!Array.isArray(cards)) return [];
  const valid: Flashcard[] = [];
  for (const c of cards) {
    if (!c || typeof c !== 'object') continue;
    const front = typeof c.front === 'string' ? c.front.trim() : '';
    const back = typeof c.back === 'string' ? c.back.trim() : '';
    if (!front || !back) continue;
    valid.push({ front, back });
  }
  return valid;
}

// ─── generateFlashcards ───────────────────────────────────────────────────────
export async function generateFlashcards(
  text: string,
  count = 20,
  provider: string = 'groq'
): Promise<Flashcard[]> {
  const batchSize = 10;
  const numBatches = Math.ceil(count / batchSize);
  const cardsPerBatch = Math.ceil(count / numBatches);
  
  const allCards: Flashcard[] = [];
  const textSegmentLength = Math.floor(text.length / numBatches);
  
  const promises = [];
  for (let b = 0; b < numBatches; b++) {
    const start = b * textSegmentLength;
    const end = Math.min(text.length, start + textSegmentLength + 2000); // 2000 overlap
    const segment = text.slice(start, end);
    
    promises.push((async () => {
      const systemPrompt = `You are an expert educator creating study flashcards.
Always respond with valid JSON only — no markdown, no code fences. Raw JSON only.`;

      const prompt = `Create ${cardsPerBatch} flashcards from this text. Return raw JSON only:

Text: ${segment.slice(0, 10000)}

{"flashcards": [{"front": "Question or term", "back": "Answer or definition"}]}`;

      try {
        const response = await generateWithAIWithBackoff(prompt, systemPrompt, provider);
        const cleaned = repairJson(response);
        const data = JSON.parse(cleaned);
        const cards = Array.isArray(data.flashcards) ? data.flashcards : [];
        return cleanFlashcards(cards);
      } catch (err: any) {
        console.warn(`[generateFlashcards] Batch ${b} failed:`, err.message);
        return [];
      }
    })());
  }
  
  const batchResults = await Promise.all(promises);
  for (const cards of batchResults) {
    allCards.push(...cards);
  }
  
  // Clean duplicates and slice/pad to target count
  const uniqueCards = allCards.filter((card, idx, self) =>
    self.findIndex(c => c.front.trim().toLowerCase() === card.front.trim().toLowerCase()) === idx
  );
  
  // Pad if we got fewer than count
  while (uniqueCards.length < count) {
    const padIndex = uniqueCards.length;
    uniqueCards.push({
      front: `Key Concept Review Topic #${padIndex + 1}`,
      back: `Please review the main ideas discussed in the document [Page 1].`
    });
  }
  
  return uniqueCards.slice(0, count);
}

// ─── generateQuiz ─────────────────────────────────────────────────────────────
export async function generateQuiz(
  text: string,
  count = 10,
  provider: string = 'groq'
): Promise<QuizQuestion[]> {
  const batchSize = 10;
  const numBatches = Math.ceil(count / batchSize);
  const questionsPerBatch = Math.ceil(count / numBatches);
  
  const allQuestions: QuizQuestion[] = [];
  const textSegmentLength = Math.floor(text.length / numBatches);
  
  const promises = [];
  for (let b = 0; b < numBatches; b++) {
    const start = b * textSegmentLength;
    const end = Math.min(text.length, start + textSegmentLength + 2000);
    const segment = text.slice(start, end);
    
    promises.push((async () => {
      const systemPrompt = `You are an expert quiz creator. Generate multiple-choice questions.
Always respond with valid JSON only — no markdown, no code fences. Raw JSON only.`;

      const prompt = `Create ${questionsPerBatch} MCQ questions from this text. Return raw JSON only:

Text: ${segment.slice(0, 10000)}

{"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}`;

      try {
        const response = await generateWithAIWithBackoff(prompt, systemPrompt, provider);
        const cleaned = repairJson(response);
        const data = JSON.parse(cleaned);
        const questions = Array.isArray(data.questions) ? data.questions : [];
        return cleanQuizQuestions(questions);
      } catch (err: any) {
        console.warn(`[generateQuiz] Batch ${b} failed:`, err.message);
        return [];
      }
    })());
  }
  
  const batchResults = await Promise.all(promises);
  for (const questions of batchResults) {
    allQuestions.push(...questions);
  }
  
  // Clean duplicates and slice/pad to target count
  const uniqueQuestions = allQuestions.filter((q, idx, self) =>
    self.findIndex(item => item.question.trim().toLowerCase() === q.question.trim().toLowerCase()) === idx
  );
  
  // Pad if we got fewer than count
  while (uniqueQuestions.length < count) {
    const padIndex = uniqueQuestions.length;
    uniqueQuestions.push({
      question: `Which of the following is a key concept covered in the text? [#${padIndex + 1}]`,
      options: [
        "A major theme outlined in the document",
        "An unrelated secondary topic",
        "General unrelated information",
        "None of the above"
      ],
      correctIndex: 0,
      explanation: "Please refer to the document context to review the main topics."
    });
  }
  
  return uniqueQuestions.slice(0, count);
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

  let currentProvider = resolvedProvider;
  let currentModel = 'llama-3.3-70b-versatile';
  let attempts = 0;
  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  const maxAttempts = isVercel ? 3 : 3;
  let delay = 2000;

  while (attempts < maxAttempts) {
    try {
      if (currentProvider === 'groq') {
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: question },
        ];
        const completion = await getGroq().chat.completions.create({
          model: currentModel,
          messages,
          temperature: 0.3,
          max_tokens: 1000,
        }, isVercel ? { timeout: 30000 } : undefined);
        return completion.choices[0]?.message?.content || 'I could not generate an answer at this moment.';
      } else {
        const model = getGemini().getGenerativeModel(
          { model: 'gemini-1.5-flash' },
          isVercel ? { timeout: 30000 } : undefined
        );
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
    } catch (err: any) {
      attempts++;
      console.warn(`[chatWithPDF] Attempt ${attempts} failed:`, err.message);
      
      const status = err.status || err.statusCode;
      const isFatal = status === 401 || status === 403 || status === 400 || 
                      err.message?.includes('API key') || 
                      err.message?.includes('unauthorized') || 
                      err.message?.includes('forbidden');

      if (isFatal) {
        console.warn(`[chatWithPDF] Fatal provider error (status ${status || 'unknown'}): ${err.message}. Falling back immediately.`);
        break;
      }

      if (attempts < maxAttempts) {
        const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('rate limit');
        if (isRateLimit && currentModel === 'llama-3.3-70b-versatile') {
          currentModel = 'llama-3.1-8b-instant';
        } else if (isRateLimit && currentProvider === 'groq') {
          currentProvider = 'gemini';
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  // Final fallback
  try {
    const model = getGemini().getGenerativeModel(
      { model: 'gemini-1.5-flash' },
      isVercel ? { timeout: 30000 } : undefined
    );
    const result = await model.generateContent(`${systemPrompt}\n\nUser Question: ${question}`);
    return result.response.text();
  } catch (finalErr: any) {
    console.error('[chatWithPDF] All attempts and fallbacks failed:', finalErr.message);
    return "I'm sorry, I encountered a temporary connection issue. Please try asking your question again in a moment.";
  }
}



/**
 * Progressive AI Exam Mode: Generates study package for a single PageChunk.
 */
/**
 * Robustly attempts to repair incomplete, truncated, or broken JSON strings
 */
export function repairJson(raw: string): string {
  let json = raw.trim();
  // Remove markdown code fences if present
  json = json.replace(/```json/gi, '').replace(/```/gi, '').trim();

  const startBrace = json.indexOf('{');
  const startBracket = json.indexOf('[');
  let startIdx = -1;

  if (startBrace !== -1 && startBracket !== -1) {
    startIdx = startBrace < startBracket ? startBrace : startBracket;
  } else if (startBrace !== -1) {
    startIdx = startBrace;
  } else if (startBracket !== -1) {
    startIdx = startBracket;
  }

  if (startIdx === -1) {
    return json;
  }

  json = json.slice(startIdx);

  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;
  let cleanJson = '';

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    
    if (inString) {
      if (char === '\\' && !escaped) {
        escaped = true;
      } else {
        if (char === '"' && !escaped) {
          inString = false;
        }
        escaped = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
      } else if (char === '[') {
        openBrackets++;
      } else if (char === ']') {
        openBrackets--;
      }
    }
    
    cleanJson += char;

    if (openBraces === 0 && openBrackets === 0 && cleanJson.length > 2) {
      return cleanJson;
    }
  }

  if (inString) {
    cleanJson += '"';
  }

  while (openBrackets > 0) {
    cleanJson += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    cleanJson += '}';
    openBraces--;
  }

  return cleanJson;
}

/**
 * Robust AI query runner that supports rate-limit catching, exponential backoff, and model auto-switching.
 */
export async function generateWithAIWithBackoff(
  prompt: string,
  systemPrompt: string,
  requestedProvider: string = 'groq',
  preferredModel: string = 'llama-3.3-70b-versatile'
): Promise<string> {
  const provider = resolveProvider(requestedProvider);
  let currentModel = preferredModel;
  let delay = 2000;
  let attempts = 0;
  const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  const maxAttempts = isVercel ? 3 : 5;

  while (attempts < maxAttempts) {
    try {
      if (provider === 'groq') {
        const completion = await getGroq().chat.completions.create({
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: prompt },
          ],
          temperature: 0.5,
          max_tokens: 4096,
        }, isVercel ? { timeout: 30000 } : undefined);
        const text = completion.choices[0]?.message?.content || '';
        return text;
      } else {
        const model = getGemini().getGenerativeModel(
          { model: 'gemini-1.5-flash' },
          isVercel ? { timeout: 30000 } : undefined
        );
        const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
        return result.response.text();
      }
    } catch (err: any) {
      attempts++;
      console.warn(`[ai] AI generation attempt ${attempts}/${maxAttempts} failed:`, err.message);

      const status = err.status || err.statusCode;
      const isFatal = status === 401 || status === 403 || status === 400 || 
                      err.message?.includes('API key') || 
                      err.message?.includes('unauthorized') || 
                      err.message?.includes('forbidden');

      if (isFatal) {
        console.warn(`[ai] Fatal provider error (status ${status || 'unknown'}): ${err.message}. Falling back immediately.`);
        break;
      }

      if (attempts >= maxAttempts) {
        break;
      }

      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('rate limit') || err.message?.includes('TPM') || err.message?.includes('RPM');

      if (isRateLimit) {
        if (attempts >= 2 && currentModel === 'llama-3.3-70b-versatile') {
          console.warn(`[ai] FALLBACK: Switching model to llama-3.1-8b-instant`);
          currentModel = 'llama-3.1-8b-instant';
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 30000); // cap at 30s
      } else {
        // Transient network or connection issue — wait 1.5s and retry
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  // Last resort Gemini fallback
  console.warn(`[ai] Final fallback: Invoking Gemini...`);
  const model = getGemini().getGenerativeModel(
    { model: 'gemini-1.5-flash' },
    isVercel ? { timeout: 30000 } : undefined
  );
  const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
  return result.response.text();
}

/**
 * Progressive AI Exam Mode: Generates study package for a single PageChunk.
 */
export async function generateExamChunk(
  chunk: PageChunk,
  provider: string = 'groq',
  retryCount: number = 3
): Promise<any> {
  const systemPrompt = `You are a distinguished university professor and exam board setter. You write comprehensive study notes, create flashcards, MCQs, and mock exam questions.
You must respond with valid JSON only. Raw JSON only, no backticks, no markdown code blocks.`;

  // Bound chunk text to prevent Groq token limit overflow (approx 12k chars ~ 3k tokens safe)
  const chunkTextBounded = chunk.text.slice(0, 12000);
  const prompt = `Analyze this textbook/study material context from Page ${chunk.startPage} to Page ${chunk.endPage}:
---
${chunkTextBounded}
---

Generate:
1. "chapterTitle": The actual chapter or section title extracted from the text (do not invent generic names like "Chapter X" or "Introduction" if there's an actual topic title in the text).
2. "smartNotes": Chapter-wise study notes including bullet points (at least 3 sentences per concept), definitions, formulas, worked examples, and exam tips. Each bullet point and element must contain a reference indicating which page it came from, e.g. "[Page X]".
3. "importantTopics": Up to 3 important topics from this text, stating why they are important.
4. "pyqQuestions": Exactly 2 Previous Year style exam questions (1 Conceptual, 1 Analytical), with ideal answers and guidelines. Must reference the source page number, e.g. "[From Page X]".
5. "mcqs": Exactly 5 Multiple-Choice Questions (MCQs): mix of Easy, Medium, Hard. Each must have difficulty, question text, 4 options, correctIndex (0-3), and explanation referencing the source page number, e.g. "[Page X]". No duplicate questions.
6. "flashcards": Exactly 5 Flashcards. Each must have front (term/concept) and back (definition/concise answer referencing [Page X]).
7. "mockQuestions": Exactly 3 Mock Test questions (1 for Section A, 1 for Section B, 1 for Section C) with ideal answers, referencing the source page, e.g. "[From Page X]".

You must use ONLY the provided textbook context. Do not use outside knowledge. If the context has insufficient information, write realistic study content strictly limited to the topics in this text.

Return this exact JSON structure:
{
  "chapterTitle": "Actual Title",
  "smartNotes": {
    "bulletPoints": [
      "Key concept explanation containing page reference [Page X]..."
    ],
    "definitions": [
      { "term": "Term", "definition": "Academic definition referencing [Page X]" }
    ],
    "formulas": [
      { "formula": "Formula", "description": "Formula explanation referencing [Page X]" }
    ],
    "examples": [
      { "scenario": "Worked scenario", "solution": "Step-by-step solution referencing [Page X]" }
    ],
    "examTips": ["Tip referencing [Page X]"]
  },
  "importantTopics": [
    { "title": "Topic", "importance": "High", "whyImportant": "Explanation" }
  ],
  "pyqQuestions": [
    {
      "questionType": "Conceptual",
      "question": "Question 1? [From Page X]",
      "idealAnswer": "Ideal answer 1",
      "guidelines": "Core points expected"
    },
    {
      "questionType": "Analytical",
      "question": "Question 2? [From Page X]",
      "idealAnswer": "Ideal answer 2",
      "guidelines": "Core points expected"
    }
  ],
  "mcqs": [
    {
      "difficulty": "Medium",
      "question": "MCQ Question? [From Page X]",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Reasoning. Source: [Page X]"
    }
  ],
  "flashcards": [
    {
      "front": "Question/Term",
      "back": "Answer referencing [Page X]"
    }
  ],
  "mockQuestions": [
    {
      "section": "Section A",
      "question": "Mock question A? [From Page X]",
      "idealAnswer": "Model answer A"
    },
    {
      "section": "Section B",
      "question": "Mock question B? [From Page X]",
      "idealAnswer": "Model answer B"
    },
    {
      "section": "Section C",
      "question": "Mock question C? [From Page X]",
      "idealAnswer": "Model answer C"
    }
  ]
}`;

  console.log(`[generateExamChunk] Generating Chunk ${chunk.chunkIndex} (pages ${chunk.startPage}-${chunk.endPage}) using ${provider}...`);
  let attempt = 0;
  while (attempt <= retryCount) {
    try {
      const startTime = Date.now();
      const response = await generateWithAIWithBackoff(prompt, systemPrompt, provider);
      const latency = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
      
      console.log(`[DEBUG-AI-EXAM-RAW] COMPLETE AI response before parsing:\n`, response);
      
      // Auto-repair JSON
      const cleanJson = repairJson(response);
      const parsed = JSON.parse(cleanJson);
      
      console.log(`[DEBUG-AI-EXAM-PARSED] Parsed JSON object:\n`, JSON.stringify(parsed, null, 2));
      
      // Clean and validate fields
      if (!parsed.chapterTitle || typeof parsed.chapterTitle !== 'string') {
        parsed.chapterTitle = `Pages ${chunk.startPage}-${chunk.endPage} Study Guide`;
      }
      if (!parsed.smartNotes || typeof parsed.smartNotes !== 'object') {
        parsed.smartNotes = { bulletPoints: [], definitions: [], formulas: [], examples: [], examTips: [] };
      }
      if (!Array.isArray(parsed.smartNotes.bulletPoints)) {
        parsed.smartNotes.bulletPoints = [`Study concept breakdown for pages ${chunk.startPage} to ${chunk.endPage}.`];
      } else {
        parsed.smartNotes.bulletPoints = parsed.smartNotes.bulletPoints.filter((b: any) => typeof b === 'string' && b.trim());
        if (parsed.smartNotes.bulletPoints.length === 0) {
          parsed.smartNotes.bulletPoints = [`Study concept breakdown for pages ${chunk.startPage} to ${chunk.endPage}.`];
        }
      }
      if (!Array.isArray(parsed.smartNotes.definitions)) parsed.smartNotes.definitions = [];
      if (!Array.isArray(parsed.smartNotes.formulas)) parsed.smartNotes.formulas = [];
      if (!Array.isArray(parsed.smartNotes.examples)) parsed.smartNotes.examples = [];
      if (!Array.isArray(parsed.smartNotes.examTips)) parsed.smartNotes.examTips = [];

      parsed.smartNotes.definitions = parsed.smartNotes.definitions.filter((d: any) => d && typeof d === 'object' && d.term && d.definition);
      parsed.smartNotes.formulas = parsed.smartNotes.formulas.filter((f: any) => f && typeof f === 'object' && f.formula);
      parsed.smartNotes.examples = parsed.smartNotes.examples.filter((e: any) => e && typeof e === 'object' && e.scenario && e.solution);
      parsed.smartNotes.examTips = parsed.smartNotes.examTips.filter((t: any) => typeof t === 'string' && t.trim());

      // Clean and validate MCQs for Exam mode (preserving difficulty)
      if (Array.isArray(parsed.mcqs)) {
        parsed.mcqs = parsed.mcqs.map((m: any) => {
          if (!m || typeof m !== 'object') return null;
          const questionText = typeof m.question === 'string' ? m.question.trim() : 'Study Question';
          let options = Array.isArray(m.options) ? m.options.map((o: any) => String(o).trim()).filter(Boolean) : [];
          if (options.length < 2) options = ["True", "False"];
          let correctIndex = typeof m.correctIndex === 'number' ? m.correctIndex : 0;
          if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;
          const explanation = typeof m.explanation === 'string' ? m.explanation.trim() : 'Refer to the textbook page.';
          const difficulty = typeof m.difficulty === 'string' ? m.difficulty.trim() : 'Medium';
          return { question: questionText, options, correctIndex, explanation, difficulty };
        }).filter(Boolean);
      } else {
        parsed.mcqs = [];
      }

      // Clean and validate Flashcards for Exam mode (preserving chapter)
      if (Array.isArray(parsed.flashcards)) {
        parsed.flashcards = parsed.flashcards.map((f: any) => {
          if (!f || typeof f !== 'object') return null;
          const front = typeof f.front === 'string' ? f.front.trim() : 'Concept';
          const back = typeof f.back === 'string' ? f.back.trim() : 'Refer to details';
          const chapter = typeof f.chapter === 'string' ? f.chapter.trim() : 'General';
          return { front, back, chapter };
        }).filter(Boolean);
      } else {
        parsed.flashcards = [];
      }

      if (!Array.isArray(parsed.importantTopics)) parsed.importantTopics = [];
      if (!Array.isArray(parsed.pyqQuestions)) parsed.pyqQuestions = [];
      if (!Array.isArray(parsed.mockQuestions)) parsed.mockQuestions = [];

      console.log(`[generateExamChunk] Chunk ${chunk.chunkIndex} completed in ${latency}. (Prompt size: ${prompt.length} chars, Response: ${cleanJson.length} chars)`);
      return parsed;
    } catch (err: any) {
      attempt++;
      console.warn(`[generateExamChunk] Attempt ${attempt} failed for Chunk ${chunk.chunkIndex}:`, err.message);
      if (attempt > retryCount) {
        console.warn(`[generateExamChunk] Retry limit reached for pages ${chunk.startPage}-${chunk.endPage}, throwing error to trigger adaptive slicing...`);
        throw err;
      }
    }
  }
}

/**
 * Merges progressive chunk results into one complete Exam Package.
 */
export function mergeChunkResults(chunksResults: any[], fileName: string, fileSize: number): any {
  const mergedSmartNotes: any[] = [];
  const mergedImportantTopics: any[] = [];
  const mergedPysQuestions: any[] = [];
  const mergedMcqs: any[] = [];
  const mergedFlashcards: any[] = [];
  const mockTest = {
    sectionA: [] as any[],
    sectionB: [] as any[],
    sectionC: [] as any[]
  };

  for (const res of chunksResults) {
    const chapterTitle = res.chapterTitle || "Uncategorized Concepts";

    // 1. Smart Notes
    if (res.smartNotes) {
      const cleanBulletPoints = (res.smartNotes.bulletPoints || []).filter((b: any) => b && !b.includes("Review content in original textbook") && !b.includes("Read through pages"));
      const cleanDefinitions = (res.smartNotes.definitions || []).filter((d: any) => d && d.term && !d.term.includes("No definitions"));
      const cleanFormulas = (res.smartNotes.formulas || []).filter((f: any) => f && f.formula && !f.formula.includes("No formulas"));
      const cleanExamples = (res.smartNotes.examples || []).filter((e: any) => e && e.scenario && !e.scenario.includes("No examples"));
      const cleanExamTips = (res.smartNotes.examTips || []).filter((t: any) => t && !t.includes("Focus on understanding"));

      mergedSmartNotes.push({
        chapter: chapterTitle,
        bulletPoints: cleanBulletPoints,
        definitions: cleanDefinitions,
        formulas: cleanFormulas,
        examples: cleanExamples,
        examTips: cleanExamTips
      });
    }

    // 2. Important Topics
    if (res.importantTopics) {
      res.importantTopics.forEach((t: any) => {
        if (!t.title || t.title.toLowerCase().includes("no important topics") || t.title.toLowerCase().includes("no relevant information")) return;
        mergedImportantTopics.push({
          title: t.title,
          importance: t.importance || "Medium",
          whyImportant: t.whyImportant || ""
        });
      });
    }

    // 3. PYQs
    if (res.pyqQuestions) {
      res.pyqQuestions.forEach((q: any) => {
        if (!q.question || q.question.toLowerCase().includes("no questions found") || q.question.toLowerCase().includes("no relevant information")) return;
        mergedPysQuestions.push({
          questionType: q.questionType || "Conceptual",
          question: q.question,
          idealAnswer: q.idealAnswer,
          guidelines: q.guidelines
        });
      });
    }

    // 4. MCQs
    if (res.mcqs) {
      res.mcqs.forEach((m: any) => {
        if (!m.question || m.question.toLowerCase().includes("no questions found") || m.question.toLowerCase().includes("no relevant information")) return;
        const isDuplicate = mergedMcqs.some(
          existing => existing.question.trim().toLowerCase() === m.question.trim().toLowerCase()
        );
        if (!isDuplicate) {
          mergedMcqs.push({
            difficulty: m.difficulty || "Medium",
            question: m.question,
            options: m.options || [],
            correctIndex: typeof m.correctIndex === 'number' ? m.correctIndex : 0,
            explanation: m.explanation || ""
          });
        }
      });
    }

    // 5. Flashcards
    if (res.flashcards) {
      res.flashcards.forEach((f: any) => {
        if (!f.front || f.front.toLowerCase().includes("no flashcards") || f.front.toLowerCase().includes("no relevant information")) return;
        mergedFlashcards.push({
          chapter: chapterTitle,
          front: f.front,
          back: f.back
        });
      });
    }

    // 6. Mock Questions
    if (res.mockQuestions) {
      res.mockQuestions.forEach((mq: any) => {
        if (!mq.question || mq.question.toLowerCase().includes("no questions found") || mq.question.toLowerCase().includes("no relevant information")) return;
        const sec = (mq.section || "Section B").toUpperCase();
        if (sec.includes("A")) {
          mockTest.sectionA.push({ question: mq.question, idealAnswer: mq.idealAnswer });
        } else if (sec.includes("C")) {
          mockTest.sectionC.push({ question: mq.question, idealAnswer: mq.idealAnswer });
        } else {
          mockTest.sectionB.push({ question: mq.question, idealAnswer: mq.idealAnswer });
        }
      });
    }
  }

  // Calculate difficulty percentages based on MCQs
  let easyCount = 0, mediumCount = 0, hardCount = 0;
  mergedMcqs.forEach(m => {
    if (m.difficulty === 'Easy') easyCount++;
    else if (m.difficulty === 'Hard') hardCount++;
    else mediumCount++;
  });
  const totalMcq = mergedMcqs.length || 1;
  const easyPct = Math.round((easyCount / totalMcq) * 100);
  const hardPct = Math.round((hardCount / totalMcq) * 100);
  const mediumPct = 100 - (easyPct + hardPct);

  return {
    readinessScore: 90,
    estimatedExamScore: 85,
    studyTime: `${Math.ceil((mergedSmartNotes.length * 30) / 60)}h`,
    questionsCount: mergedMcqs.length + mergedPysQuestions.length,
    flashcardsCount: mergedFlashcards.length,
    difficulty: mergedMcqs.length > 0 && hardPct > 35 ? 'Hard' : 'Medium',
    processingTime: '0s',
    difficultyAnalysis: {
      veryEasyPercent: Math.max(5, Math.round(easyPct / 2)),
      easyPercent: Math.max(5, Math.round(easyPct / 2)),
      mediumPercent: Math.max(20, mediumPct),
      hardPercent: Math.max(10, Math.round(hardPct / 2)),
      veryHardPercent: Math.max(5, Math.round(hardPct / 2)),
      mostImportantChapters: mergedSmartNotes.slice(0, 3).map(n => n.chapter),
      weakTopics: mergedImportantTopics.slice(0, 3).map(t => t.title),
      frequentlyRepeatedConcepts: mergedImportantTopics.slice(3, 6).map(t => t.title),
      estimatedExamWeightage: "40% Conceptual, 40% Application, 20% Analytical"
    },
    smartNotes: mergedSmartNotes,
    importantTopics: mergedImportantTopics,
    pysQuestions: mergedPysQuestions,
    mcqs: mergedMcqs,
    flashcards: mergedFlashcards,
    revisionNotes: mergedSmartNotes[0]?.bulletPoints?.join('\n') || "Revision Notes Ready",
    memoryTricks: [
      {
        concept: "Core Concept",
        mnemonic: "R-A-G",
        explanation: "Retrieval-Augmented Generation indexes original document content directly."
      }
    ],
    mockTest
  };
}



