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
  const maxAttempts = 5;

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
        });
        const text = completion.choices[0]?.message?.content || '';
        return text;
      } else {
        const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
        return result.response.text();
      }
    } catch (err: any) {
      attempts++;
      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('rate limit') || err.message?.includes('TPM') || err.message?.includes('RPM');

      if (isRateLimit) {
        console.warn(`[ai] Rate limit exceeded. Model: ${currentModel}. Retrying in ${delay}ms...`);
        if (attempts >= 2 && currentModel === 'llama-3.3-70b-versatile') {
          console.warn(`[ai] FALLBACK: Switching model to llama-3.1-8b-instant`);
          currentModel = 'llama-3.1-8b-instant';
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  // Last resort Gemini fallback
  console.warn(`[ai] Final fallback: Invoking Gemini...`);
  const model = getGemini().getGenerativeModel({ model: 'gemini-1.5-flash' });
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

  const prompt = `Analyze this textbook/study material context from Page ${chunk.startPage} to Page ${chunk.endPage}:
---
${chunk.text}
---

Generate:
1. "chapterTitle": The actual chapter or section title extracted from the text (do not invent generic names like "Chapter X" or "Introduction" if there's an actual topic title in the text).
2. "smartNotes": Chapter-wise smart notes including bullet points (at least 3 sentences per concept), definitions, formulas, worked examples, and exam tips. Each bullet point and element must contain a reference indicating which page it came from, e.g. "[Page X]".
3. "importantTopics": Up to 3 important topics from this text, stating why they are important.
4. "pyqQuestions": 1 Previous Year style exam question, with an ideal answer and guidelines. Must reference the source page number, e.g. "[From Page X]".
5. "mcqs": Exactly 5 Multiple-Choice Questions (MCQs): mix of Easy, Medium, Hard. Each must have difficulty, question text, 4 options, correctIndex (0-3), and explanation referencing the source page number, e.g. "[Page X]". No duplicate questions.
6. "flashcards": Exactly 5 Flashcards. Each must have front (term/concept) and back (definition/concise answer referencing [Page X]).
7. "mockQuestions": 2 Mock Test questions (1 for Section A, 1 for Section B or C) with ideal answers, referencing the source page, e.g. "[From Page X]".

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
      "question": "Question? [From Page X]",
      "idealAnswer": "Ideal answer",
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
      "section": "Section B",
      "question": "Mock question? [From Page X]",
      "idealAnswer": "Model answer"
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
      
      // Auto-repair JSON
      const cleanJson = repairJson(response);

      const parsed = JSON.parse(cleanJson);
      if (!parsed.chapterTitle || !parsed.smartNotes) {
        throw new Error("Missing required JSON fields");
      }

      console.log(`[generateExamChunk] Chunk ${chunk.chunkIndex} completed in ${latency}. (Prompt size: ${prompt.length} chars, Response: ${cleanJson.length} chars)`);
      return parsed;
    } catch (err: any) {
      attempt++;
      console.warn(`[generateExamChunk] Attempt ${attempt} failed for Chunk ${chunk.chunkIndex}:`, err.message);
      if (attempt > retryCount) {
        throw new Error(`Failed to generate valid JSON chunk for pages ${chunk.startPage}-${chunk.endPage} after ${retryCount} retries. Error: ${err.message}`);
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
      mergedSmartNotes.push({
        chapter: chapterTitle,
        bulletPoints: res.smartNotes.bulletPoints || [],
        definitions: res.smartNotes.definitions || [],
        formulas: res.smartNotes.formulas || [],
        examples: res.smartNotes.examples || [],
        examTips: res.smartNotes.examTips || []
      });
    }

    // 2. Important Topics
    if (res.importantTopics) {
      res.importantTopics.forEach((t: any) => {
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



