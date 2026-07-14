import fs from 'fs';
import path from 'path';
import { extractTextFromPDF, extractPagesFromPDF } from '../src/lib/pdf-ai';
import { generateSummary, generateFlashcards, generateQuiz, generateExamChunk, mergeChunkResults } from '../src/lib/ai';

async function runTests() {
  console.log('==================================================');
  console.log('          RUNNING AI REGRESSION TESTS            ');
  console.log('==================================================');

  const pdfPath = path.resolve('test.pdf');
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Test PDF not found at ${pdfPath}`);
  }

  const buffer = fs.readFileSync(pdfPath);
  console.log(`Loaded test.pdf: ${buffer.length} bytes`);

  // 1. Test: PDF text extraction (extractTextFromPDF)
  console.log('\n[TEST 1] Testing extractTextFromPDF...');
  const text = await extractTextFromPDF(buffer);
  console.log(`Extracted text: "${text}" (${text.length} chars)`);
  if (!text || text.trim().length === 0) {
    throw new Error('FAILED: extractTextFromPDF returned empty text.');
  }
  console.log('PASSED: extractTextFromPDF');

  // 2. Test: PDF page extraction (extractPagesFromPDF)
  console.log('\n[TEST 2] Testing extractPagesFromPDF...');
  const pages = await extractPagesFromPDF(buffer);
  console.log(`Extracted ${pages.length} pages.`);
  if (pages.length === 0) {
    throw new Error('FAILED: extractPagesFromPDF returned 0 pages.');
  }
  pages.forEach(p => {
    console.log(`  Page ${p.pageNumber}: ${p.text.length} chars`);
    if (p.text.trim().length === 0) {
      throw new Error(`FAILED: Page ${p.pageNumber} text is empty.`);
    }
  });
  console.log('PASSED: extractPagesFromPDF');

  // 3. Test: Smart Notes (generateSummary)
  console.log('\n[TEST 3] Testing Smart Notes generation...');
  const summaryText = 'This is a test document text covering fundamental computer science concepts. It explains data structures, algorithms, and complex systems architecture.';
  const summary = await generateSummary(summaryText, 'groq');
  console.log('Generated summary metadata keys:', Object.keys(summary));
  if (!summary.shortSummary || !summary.detailedSummary || !summary.keyPoints || summary.keyPoints.length === 0) {
    throw new Error('FAILED: generateSummary returned invalid or incomplete summary structure.');
  }
  console.log('PASSED: Smart Notes (generateSummary)');

  // 4. Test: Flashcards (generateFlashcards)
  console.log('\n[TEST 4] Testing Flashcards generation...');
  const cards = await generateFlashcards(summaryText, 3, 'groq');
  console.log(`Generated ${cards.length} flashcards.`);
  if (cards.length === 0) {
    throw new Error('FAILED: generateFlashcards returned 0 cards.');
  }
  cards.forEach((c, idx) => {
    console.log(`  Card ${idx + 1}: Q: "${c.front}" | A: "${c.back}"`);
    if (!c.front || !c.back) {
      throw new Error('FAILED: Flashcard has empty fields.');
    }
  });
  console.log('PASSED: Flashcards (generateFlashcards)');

  // 5. Test: Quiz (generateQuiz)
  console.log('\n[TEST 5] Testing Quiz generation...');
  const questions = await generateQuiz(summaryText, 2, 'groq');
  console.log(`Generated ${questions.length} quiz questions.`);
  if (questions.length === 0) {
    throw new Error('FAILED: generateQuiz returned 0 questions.');
  }
  questions.forEach((q, idx) => {
    console.log(`  Q ${idx + 1}: "${q.question}" | options: ${q.options.join(', ')} | correctIndex: ${q.correctIndex}`);
    if (!q.question || !q.options || q.options.length < 2 || q.correctIndex === undefined) {
      throw new Error(`FAILED: Quiz question ${idx + 1} is invalid.`);
    }
  });
  console.log('PASSED: Quiz (generateQuiz)');

  // 6. Test: Exam Mode (generateExamChunk and mergeChunkResults)
  console.log('\n[TEST 6] Testing Exam Mode...');
  const mockChunk = {
    chunkIndex: 0,
    startPage: 1,
    endPage: 1,
    text: summaryText,
    pages: [{ pageNumber: 1, text: summaryText }]
  };
  const chunkResult = await generateExamChunk(mockChunk, 'groq');
  console.log('Exam chunk keys generated:', Object.keys(chunkResult));
  if (!chunkResult.chapterTitle || !chunkResult.smartNotes || !chunkResult.mcqs || !chunkResult.flashcards) {
    throw new Error('FAILED: generateExamChunk returned invalid chunk structure.');
  }

  const merged = mergeChunkResults([chunkResult], 'test.pdf', 100);
  console.log('Merged Exam package properties:', Object.keys(merged));
  if (!merged.smartNotes || !merged.mcqs || !merged.flashcards || !merged.mockTest) {
    throw new Error('FAILED: mergeChunkResults returned invalid merged package.');
  }
  console.log('PASSED: Exam Mode');

  console.log('\n==================================================');
  console.log('         ALL REGRESSION TESTS PASSED!             ');
  console.log('==================================================');
}

runTests().catch(err => {
  console.error('\n❌ REGRESSION TEST RUN FAILED:', err);
  process.exit(1);
});
