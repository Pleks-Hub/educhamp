/**
 * Sprint A Step A2 — Bulk question generation for all 75 courses
 * Usage: node scripts/generate-all-questions.mjs
 *
 * Strategy:
 *  - Categorise each course (STAAR_EOC, AP, SAT, K12_REGULAR, EARLY_CHILDHOOD)
 *  - Determine how many questions each unit needs (target - existing)
 *  - Generate in batches of 5 per LLM call
 *  - Insert directly into quizQuestions table
 *  - Write progress log to docs/GENERATION_LOG.md
 *
 * Per-category targets (total per course):
 *  STAAR_EOC:       140 total → ~12 per unit (12 units avg)
 *  AP:               70 total → ~6 per unit  (12 units avg)
 *  SAT:             100 total → ~9 per unit  (12 units avg)
 *  K12_REGULAR:      70 total → ~9 per unit  (8 units avg)
 *  EARLY_CHILDHOOD:  50 total → ~10 per unit (5 units avg)
 *
 * Difficulty distribution per batch of 5:
 *  easy:2, medium:2, hard:1
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
const DB_URL = process.env.DATABASE_URL;

// ── Category classification ───────────────────────────────────────────────────

function categorise(courseCode, gradeLevel, subject, courseTitle) {
  const code = (courseCode || "").toUpperCase();
  const grade = gradeLevel || "";
  const subj = (subject || "").toLowerCase();
  const title = (courseTitle || "").toLowerCase();

  if (code.startsWith("AP") || title.startsWith("ap ")) return "AP";
  if (code.includes("SAT") || title.includes("sat prep")) return "SAT";

  const staarEoc = ["ALG1", "BIO1", "ENG1", "ENG2", "USH", "ALGEBRA1", "BIOLOGY", "ENGLISH1", "ENGLISH2", "USHISTORY"];
  if (staarEoc.includes(code)) return "STAAR_EOC";

  const gradeNum = parseInt(grade, 10);
  if (grade === "PK" || grade === "K" || (!isNaN(gradeNum) && gradeNum <= 2)) return "EARLY_CHILDHOOD";

  return "K12_REGULAR";
}

// ── Per-category question targets per unit ────────────────────────────────────

const UNIT_TARGET = {
  STAAR_EOC: 12,
  AP: 6,
  SAT: 9,
  K12_REGULAR: 9,
  EARLY_CHILDHOOD: 7,
};

// ── Build LLM prompt for a unit ───────────────────────────────────────────────

function buildPrompt(unit, category, count) {
  const difficulties = [];
  // Fill with easy:40%, medium:40%, hard:20%
  const easy = Math.max(1, Math.round(count * 0.4));
  const hard = Math.max(1, Math.round(count * 0.2));
  const medium = count - easy - hard;
  for (let i = 0; i < easy; i++) difficulties.push("easy");
  for (let i = 0; i < medium; i++) difficulties.push("medium");
  for (let i = 0; i < hard; i++) difficulties.push("hard");

  const isEarlyChildhood = category === "EARLY_CHILDHOOD";
  const isAP = category === "AP";
  const isSAT = category === "SAT";
  const isSTAAR = category === "STAAR_EOC";

  let systemPrompt = "";
  let userPrompt = "";

  if (isEarlyChildhood) {
    systemPrompt = `You are an expert early childhood teacher (grades PK-2). Write simple, age-appropriate multiple-choice questions with exactly 3 choices (A, B, C). Use short sentences (under 20 words). Keep explanations encouraging and under 30 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle} (Grade ${unit.gradeLevel}).
Difficulties in order: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode}-U${unit.unitNumber}-S[1-${count}].
standardNote: cite the TEKS standard.
3 choices each (A,B,C). correctAnswer = label. explanation max 30 words, encouraging tone.`;
  } else if (isAP) {
    systemPrompt = `You are an AP teacher and College Board exam question writer. Write AP-style multiple-choice questions only. Keep explanations under 80 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} AP multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle}.
Difficulties in order: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode}-U${unit.unitNumber}-S[1-${count}].
standardNote: cite the AP learning objective.
4 choices each (A,B,C,D). correctAnswer = label. explanation max 80 words.`;
  } else if (isSAT) {
    systemPrompt = `You are an SAT prep tutor. Write SAT-style multiple-choice questions (math and verbal). Keep explanations under 80 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} SAT-style multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle}.
Mix: 60% math (algebra/data), 40% verbal (reading/grammar).
Difficulties in order: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode}-U${unit.unitNumber}-S[1-${count}].
standardNote: cite the SAT domain.
4 choices each (A,B,C,D). correctAnswer = label. explanation max 80 words.`;
  } else if (isSTAAR) {
    systemPrompt = `You are a Texas high school teacher and STAAR exam question writer. Write STAAR-aligned multiple-choice questions. Keep explanations under 80 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} STAAR-aligned multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle} (Grade ${unit.gradeLevel}).
Difficulties in order: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode}-U${unit.unitNumber}-S[1-${count}].
standardNote: cite the TEKS standard.
4 choices each (A,B,C,D). correctAnswer = label. explanation max 80 words.`;
  } else {
    // K12_REGULAR
    const gradeNum = parseInt(unit.gradeLevel, 10);
    const isMiddle = gradeNum >= 3 && gradeNum <= 8;
    systemPrompt = `You are an expert ${isMiddle ? "middle school" : "high school"} teacher. Write grade-appropriate, TEKS-aligned multiple-choice questions. Keep explanations under 80 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle} (Grade ${unit.gradeLevel}, ${unit.subject}).
Difficulties in order: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode}-U${unit.unitNumber}-S[1-${count}].
standardNote: cite the TEKS standard.
4 choices each (A,B,C,D). correctAnswer = label. explanation max 80 words.`;
  }

  return { systemPrompt, userPrompt, difficulties };
}

// ── LLM call with retry ───────────────────────────────────────────────────────

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
              properties: {
                label: { type: "string" },
                text: { type: "string" },
              },
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FORGE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "question_set", strict: true, schema: QUESTION_SCHEMA },
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);
      return parsed.questions || [];
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

// ── Insert questions into DB ──────────────────────────────────────────────────

async function insertQuestions(conn, unitId, questions) {
  if (!questions || questions.length === 0) return 0;
  let inserted = 0;
  // Get courseId for this unit
  const [[unitRow]] = await conn.execute('SELECT courseId FROM units WHERE id = ?', [unitId]);
  const courseId = unitRow?.courseId;
  if (!courseId) return 0;

  for (const q of questions) {
    try {
      const choicesJson = JSON.stringify(q.choices || []);
      // Normalise questionType to valid enum values
      let qType = (q.questionType || "multiple_choice").toLowerCase().replace(/-/g, "_");
      if (!['multiple_choice', 'short_answer', 'open_response'].includes(qType)) {
        qType = 'multiple_choice';
      }
      // Normalise difficulty to valid enum values
      let diff = (q.difficulty || "medium").toLowerCase();
      if (!['easy', 'medium', 'hard', 'challenge'].includes(diff)) {
        diff = 'medium';
      }
      // skillTag max 32 chars
      const skillTag = (q.skillTag || 'GENERAL').substring(0, 32);
      await conn.execute(
        `INSERT INTO quizQuestions (unitId, courseId, questionText, questionType, choices, correctAnswer, explanation, difficulty, skillTag)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [unitId, courseId, q.questionText, qType, choicesJson, q.correctAnswer, q.explanation || '', diff, skillTag]
      );
      inserted++;
    } catch (err) {
      // Log errors for debugging
      if (!err.message.includes('Duplicate')) {
        process.stderr.write(`  INSERT error: ${err.message.substring(0, 100)}\n`);
      }
    }
  }
  return inserted;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const allUnits = JSON.parse(fs.readFileSync("/tmp/all-units.json", "utf-8"));

// Group units by course
const courseMap = new Map();
for (const unit of allUnits) {
  const key = unit.courseId;
  if (!courseMap.has(key)) {
    courseMap.set(key, {
      courseId: unit.courseId,
      courseCode: unit.courseCode,
      courseTitle: unit.courseTitle,
      gradeLevel: unit.gradeLevel,
      subject: unit.subject,
      units: [],
    });
  }
  courseMap.get(key).units.push(unit);
}

const conn = await mysql.createConnection(DB_URL);

const logLines = [`# Generation Log — ${new Date().toISOString()}\n`];
let totalInserted = 0;
let totalSkipped = 0;
let totalErrors = 0;

const courses = Array.from(courseMap.values());
console.log(`\nStarting bulk generation for ${courses.length} courses (${allUnits.length} units)...\n`);

for (let ci = 0; ci < courses.length; ci++) {
  const course = courses[ci];
  const category = categorise(course.courseCode, course.gradeLevel, course.subject, course.courseTitle);
  const unitTarget = UNIT_TARGET[category];

  let courseInserted = 0;
  let courseErrors = 0;

  for (const unit of course.units) {
    const existing = Number(unit.existingCount) || 0;
    const needed = Math.max(0, unitTarget - existing);

    if (needed === 0) {
      totalSkipped++;
      continue;
    }

    // Generate in batches of max 5 to avoid JSON truncation
    const batches = [];
    let remaining = needed;
    while (remaining > 0) {
      batches.push(Math.min(5, remaining));
      remaining -= 5;
    }

    for (const batchSize of batches) {
      try {
        const { systemPrompt, userPrompt } = buildPrompt(unit, category, batchSize);
        const questions = await callLLM(systemPrompt, userPrompt);
        const inserted = await insertQuestions(conn, unit.unitId, questions);
        courseInserted += inserted;
        totalInserted += inserted;
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        courseErrors++;
        totalErrors++;
        logLines.push(`  ✗ ERROR [${course.courseCode}] Unit ${unit.unitNumber} "${unit.unitTitle}": ${err.message}`);
      }
    }
  }

  const progress = `[${ci + 1}/${courses.length}]`;
  const msg = `${progress} ${course.courseCode} (${category}): +${courseInserted} questions${courseErrors > 0 ? `, ${courseErrors} errors` : ""}`;
  console.log(msg);
  logLines.push(msg);
}

await conn.end();

// ── Write log ─────────────────────────────────────────────────────────────────

const docsDir = path.join(__dirname, "../docs");
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, "GENERATION_LOG.md"), logLines.join("\n"), "utf-8");

console.log(`\n✓ Bulk generation complete.`);
console.log(`  Total inserted: ${totalInserted}`);
console.log(`  Total skipped (already at target): ${totalSkipped}`);
console.log(`  Total errors: ${totalErrors}`);
console.log(`  Log written to docs/GENERATION_LOG.md`);
