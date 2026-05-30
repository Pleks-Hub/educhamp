/**
 * Phase 4A — Bulk question generation for ENG2 and USH
 *
 * Target: 140 questions per course (STAAR_EOC category = 12 per unit × 12 units)
 * ENG2: 70% multiple_choice, 30% short_answer/open_response; 60% passage-based
 * USH:  85% multiple_choice, 15% short_answer/open_response; some with primary source excerpts
 *
 * Batches of 5 per LLM call. Difficulty: 40% easy, 40% medium, 20% hard.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

const UNIT_TARGET = 12; // STAAR_EOC: 12 per unit × 12 units = 144 total

// ── LLM prompt builders ───────────────────────────────────────────────────────

function buildENG2Prompt(unit, count) {
  const easy = Math.max(1, Math.round(count * 0.4));
  const hard = Math.max(1, Math.round(count * 0.2));
  const medium = count - easy - hard;
  const difficulties = [
    ...Array(easy).fill("easy"),
    ...Array(medium).fill("medium"),
    ...Array(hard).fill("hard"),
  ];

  // Determine mix based on unit type
  const isWriting = unit.unitNumber === 6 || unit.unitNumber === 7;
  const isConventions = unit.unitNumber === 8;
  const isReview = unit.unitNumber === 12;

  let typeInstruction = "";
  if (isWriting || isConventions) {
    // Writing/conventions: more short_answer
    typeInstruction = `Mix: 60% multiple_choice, 40% short_answer. For short_answer: write a clear revision or writing prompt. Leave choices as [].`;
  } else if (isReview) {
    typeInstruction = `Mix: 70% multiple_choice (passage-based), 30% short_answer. Span all strands: reading, writing, conventions.`;
  } else {
    // Reading units: mostly passage-based MC
    typeInstruction = `Mix: 75% multiple_choice (passage-based — embed a 3-6 sentence original excerpt in questionText), 25% short_answer.`;
  }

  const systemPrompt = `You are a Texas Grade 10 English teacher and STAAR ENG2 exam question writer.
Write high-quality STAAR English II questions aligned to TEKS §110.39.

CRITICAL RULES:
1. For passage-based MC: embed a SHORT original excerpt (3-6 sentences) at the start of questionText, then ask the question. Never reproduce copyrighted text.
2. For short_answer: write a clear prompt. Leave choices as empty array []. correctAnswer = a brief model answer (1-2 sentences).
3. For multiple_choice: exactly 4 choices (A, B, C, D). correctAnswer = the label letter.
4. All questions must be grade-appropriate for Grade 10.
Return valid JSON only.`;

  const userPrompt = `Generate ${count} STAAR ENG2 questions for Unit ${unit.unitNumber}: "${unit.unitTitle}" (${unit.teksCode}).
${typeInstruction}
Difficulties in order: ${difficulties.join(", ")}.
skillTag format: ENG2-U${unit.unitNumber}-S[1-${count}] (max 32 chars).
standardNote: cite the TEKS standard code (e.g., ELAR.10.5(A)).
explanation: max 80 words.`;

  return { systemPrompt, userPrompt };
}

function buildUSHPrompt(unit, count) {
  const easy = Math.max(1, Math.round(count * 0.4));
  const hard = Math.max(1, Math.round(count * 0.2));
  const medium = count - easy - hard;
  const difficulties = [
    ...Array(easy).fill("easy"),
    ...Array(medium).fill("medium"),
    ...Array(hard).fill("hard"),
  ];

  const isReview = unit.unitNumber === 12;

  let typeInstruction = "";
  if (isReview) {
    typeInstruction = `Mix: 80% multiple_choice (some with primary source excerpts), 20% short_answer. Span all historical periods.`;
  } else {
    typeInstruction = `Mix: 85% multiple_choice (30% with a primary source excerpt or data description embedded in questionText), 15% short_answer.`;
  }

  const systemPrompt = `You are a Texas Grade 11 U.S. History teacher and STAAR USH exam question writer.
Write high-quality STAAR U.S. History questions aligned to TEKS §113.41 (US History since 1877).

CRITICAL RULES:
1. For questions with primary source excerpts: embed a SHORT AI-generated original excerpt or data description (3-5 sentences) at the start of questionText. Never reproduce copyrighted text — describe or paraphrase.
2. For short_answer: write a clear document-based or short-answer prompt. Leave choices as []. correctAnswer = a brief model answer (1-2 sentences).
3. For multiple_choice: exactly 4 choices (A, B, C, D). correctAnswer = the label letter.
4. All questions must be grade-appropriate for Grade 11.
Return valid JSON only.`;

  const userPrompt = `Generate ${count} STAAR USH questions for Unit ${unit.unitNumber}: "${unit.unitTitle}" (${unit.teksCode}).
${typeInstruction}
Difficulties in order: ${difficulties.join(", ")}.
skillTag format: USH-U${unit.unitNumber}-S[1-${count}] (max 32 chars).
standardNote: cite the TEKS standard code (e.g., USH.9(C)).
explanation: max 80 words.`;

  return { systemPrompt, userPrompt };
}

// ── LLM schema ────────────────────────────────────────────────────────────────

const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionText: { type: "string" },
          questionType: { type: "string" },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: { label: { type: "string" }, text: { type: "string" } },
              required: ["label", "text"],
              additionalProperties: false,
            },
          },
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
          difficulty: { type: "string" },
          skillTag: { type: "string" },
          standardNote: { type: "string" },
        },
        required: ["questionText", "questionType", "choices", "correctAnswer", "explanation", "difficulty", "skillTag", "standardNote"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

async function callLLM(systemPrompt, userPrompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_KEY}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_schema", json_schema: { name: "question_set", strict: true, schema: QUESTION_SCHEMA } },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content).questions || [];
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

async function insertQuestions(conn, unitId, courseId, questions) {
  let inserted = 0;
  for (const q of questions) {
    try {
      const choicesJson = JSON.stringify(q.choices || []);
      let qType = (q.questionType || "multiple_choice").toLowerCase().replace(/-/g, "_");
      if (!["multiple_choice", "short_answer", "open_response"].includes(qType)) qType = "multiple_choice";
      let diff = (q.difficulty || "medium").toLowerCase();
      if (!["easy", "medium", "hard", "challenge"].includes(diff)) diff = "medium";
      const skillTag = (q.skillTag || "GENERAL").substring(0, 32);
      await conn.execute(
        `INSERT INTO quizQuestions (unitId, courseId, questionText, questionType, choices, correctAnswer, explanation, difficulty, skillTag)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [unitId, courseId, q.questionText, qType, choicesJson, q.correctAnswer, q.explanation || "", diff, skillTag]
      );
      inserted++;
    } catch (err) {
      if (!err.message.includes("Duplicate")) {
        process.stderr.write(`  INSERT error: ${err.message.substring(0, 100)}\n`);
      }
    }
  }
  return inserted;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Fetch ENG2 and USH units with existing question counts
const [unitRows] = await conn.execute(`
  SELECT
    u.id AS unitId,
    u.courseId,
    u.unitNumber,
    u.title AS unitTitle,
    u.teksAlignment,
    c.courseCode,
    c.title AS courseTitle,
    COUNT(q.id) AS existingCount
  FROM units u
  JOIN courses c ON c.id = u.courseId
  LEFT JOIN quizQuestions q ON q.unitId = u.id
  WHERE c.courseCode IN ('ENG2', 'USH')
  GROUP BY u.id, u.courseId, u.unitNumber, u.title, u.teksAlignment, c.courseCode, c.title
  ORDER BY c.courseCode, u.unitNumber
`);

console.log(`\nPhase 4A — Bulk generation for ENG2 and USH`);
console.log(`Found ${unitRows.length} units\n`);

const logLines = [`# Phase 4A Generation Log — ${new Date().toISOString()}\n`];
let totalInserted = 0;
let totalErrors = 0;

for (const unit of unitRows) {
  const existing = Number(unit.existingCount) || 0;
  const needed = Math.max(0, UNIT_TARGET - existing);
  const teksCode = (unit.teksAlignment || "").split(" — ")[0];
  const unitInfo = { ...unit, teksCode };

  if (needed === 0) {
    console.log(`  [${unit.courseCode}] Unit ${unit.unitNumber}: "${unit.unitTitle}" — already at target (${existing}), skipping`);
    continue;
  }

  // Generate in batches of 5
  let unitInserted = 0;
  let unitErrors = 0;
  let remaining = needed;

  while (remaining > 0) {
    const batchSize = Math.min(5, remaining);
    try {
      const { systemPrompt, userPrompt } =
        unit.courseCode === "ENG2"
          ? buildENG2Prompt(unitInfo, batchSize)
          : buildUSHPrompt(unitInfo, batchSize);
      const questions = await callLLM(systemPrompt, userPrompt);
      const ins = await insertQuestions(conn, unit.unitId, unit.courseId, questions);
      unitInserted += ins;
      totalInserted += ins;
      remaining -= batchSize;
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      unitErrors++;
      totalErrors++;
      process.stderr.write(`  ERROR [${unit.courseCode}] Unit ${unit.unitNumber}: ${err.message}\n`);
      break; // skip remaining batches for this unit on error
    }
  }

  const msg = `  [${unit.courseCode}] Unit ${unit.unitNumber}: "${unit.unitTitle}" → +${unitInserted} questions${unitErrors > 0 ? ` (${unitErrors} errors)` : ""}`;
  console.log(msg);
  logLines.push(msg);
}

await conn.end();

// Write log
const docsDir = path.join(__dirname, "../docs");
fs.writeFileSync(path.join(docsDir, "PHASE4A_GENERATION_LOG.md"), logLines.join("\n") + "\n", "utf-8");

console.log(`\n✓ Phase 4A bulk generation complete.`);
console.log(`  Total inserted: ${totalInserted}`);
console.log(`  Total errors:   ${totalErrors}`);
console.log(`  Log: docs/PHASE4A_GENERATION_LOG.md`);
