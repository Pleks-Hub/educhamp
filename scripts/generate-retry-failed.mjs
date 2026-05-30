/**
 * Sprint A Step A2 — Retry generation for 8 failed courses
 * Reconnects to DB for each unit to avoid connection timeout
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

// Failed courses from the generation log
const FAILED_COURSE_CODES = ["G8SCI", "G8KAPSS", "G8SS", "G8TECH", "ENG1", "SPA2", "ALG1", "BIO1", "APHG"];

// ── Category classification ───────────────────────────────────────────────────
function categorise(courseCode, gradeLevel, subject, courseTitle) {
  const code = (courseCode || "").toUpperCase();
  const grade = gradeLevel || "";
  const title = (courseTitle || "").toLowerCase();
  if (code.startsWith("AP") || title.startsWith("ap ")) return "AP";
  if (code.includes("SAT") || title.includes("sat prep")) return "SAT";
  const staarEoc = ["ALG1", "BIO1", "ENG1", "ENG2", "USH", "ALGEBRA1", "BIOLOGY", "ENGLISH1", "ENGLISH2", "USHISTORY"];
  if (staarEoc.includes(code)) return "STAAR_EOC";
  const gradeNum = parseInt(grade, 10);
  if (grade === "PK" || grade === "K" || (!isNaN(gradeNum) && gradeNum <= 2)) return "EARLY_CHILDHOOD";
  return "K12_REGULAR";
}

const UNIT_TARGET = { STAAR_EOC: 12, AP: 6, SAT: 9, K12_REGULAR: 9, EARLY_CHILDHOOD: 7 };

function buildPrompt(unit, category, count) {
  const easy = Math.max(1, Math.round(count * 0.4));
  const hard = Math.max(1, Math.round(count * 0.2));
  const medium = count - easy - hard;
  const difficulties = [...Array(easy).fill("easy"), ...Array(Math.max(0,medium)).fill("medium"), ...Array(hard).fill("hard")];

  const isEarlyChildhood = category === "EARLY_CHILDHOOD";
  const isAP = category === "AP";
  const isSTAAR = category === "STAAR_EOC";

  let systemPrompt, userPrompt;
  if (isEarlyChildhood) {
    systemPrompt = `You are an expert early childhood teacher (grades PK-2). Write simple, age-appropriate multiple-choice questions with exactly 3 choices (A, B, C). Use short sentences. Keep explanations encouraging and under 30 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle} (Grade ${unit.gradeLevel}).
Difficulties: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode.substring(0,10)}-U${unit.unitNumber}-S[1-${count}] (max 32 chars total).
standardNote: cite the TEKS standard.
3 choices each (A,B,C). correctAnswer = label. explanation max 30 words.`;
  } else if (isAP) {
    systemPrompt = `You are an AP teacher. Write AP-style multiple-choice questions only. Keep explanations under 70 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} AP multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle}.
Difficulties: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode.substring(0,10)}-U${unit.unitNumber}-S[1-${count}] (max 32 chars total).
standardNote: cite the AP learning objective.
4 choices each (A,B,C,D). correctAnswer = label. explanation max 70 words.`;
  } else if (isSTAAR) {
    systemPrompt = `You are a Texas high school teacher and STAAR exam question writer. Write STAAR-aligned multiple-choice questions. Keep explanations under 70 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} STAAR-aligned multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle} (Grade ${unit.gradeLevel}).
Difficulties: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode.substring(0,10)}-U${unit.unitNumber}-S[1-${count}] (max 32 chars total).
standardNote: cite the TEKS standard.
4 choices each (A,B,C,D). correctAnswer = label. explanation max 70 words.`;
  } else {
    systemPrompt = `You are an expert teacher. Write grade-appropriate, TEKS-aligned multiple-choice questions. Keep explanations under 70 words. Return valid JSON only.`;
    userPrompt = `Generate ${count} multiple-choice questions for "${unit.unitTitle}" in ${unit.courseTitle} (Grade ${unit.gradeLevel}, ${unit.subject}).
Difficulties: ${difficulties.join(", ")}.
skillTag format: ${unit.courseCode.substring(0,10)}-U${unit.unitNumber}-S[1-${count}] (max 32 chars total).
standardNote: cite the TEKS standard.
4 choices each (A,B,C,D). correctAnswer = label. explanation max 70 words.`;
  }
  return { systemPrompt, userPrompt };
}

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
          choices: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } }, required: ["label", "text"], additionalProperties: false } },
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
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          response_format: { type: "json_schema", json_schema: { name: "question_set", strict: true, schema: QUESTION_SCHEMA } },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return JSON.parse(data.choices?.[0]?.message?.content)?.questions || [];
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

// Get units for failed courses
const conn0 = await mysql.createConnection(DB_URL);
const [allUnits] = await conn0.execute(`
  SELECT c.id AS courseId, c.courseCode, c.title AS courseTitle,
    c.gradeLevel, c.subject,
    u.id AS unitId, u.title AS unitTitle, u.unitNumber, u.sortOrder,
    COUNT(qq.id) AS existingCount
  FROM courses c
  JOIN units u ON u.courseId = c.id
  LEFT JOIN quizQuestions qq ON qq.unitId = u.id
  WHERE c.isActive = 1 AND c.courseCode IN (${FAILED_COURSE_CODES.map(() => '?').join(',')})
  GROUP BY c.id, c.courseCode, c.title, c.gradeLevel, c.subject, u.id, u.title, u.unitNumber, u.sortOrder
  ORDER BY c.gradeLevel + 0, c.subject, c.title, u.sortOrder
`, FAILED_COURSE_CODES);
await conn0.end();

// Group by course
const courseMap = new Map();
for (const unit of allUnits) {
  if (!courseMap.has(unit.courseId)) {
    courseMap.set(unit.courseId, { ...unit, units: [] });
  }
  courseMap.get(unit.courseId).units.push(unit);
}

let totalInserted = 0, totalErrors = 0;
console.log(`\nRetrying ${courseMap.size} courses (${allUnits.length} units)...\n`);

for (const course of courseMap.values()) {
  const category = categorise(course.courseCode, course.gradeLevel, course.subject, course.courseTitle);
  const unitTarget = UNIT_TARGET[category];
  let courseInserted = 0, courseErrors = 0;

  for (const unit of course.units) {
    const existing = Number(unit.existingCount) || 0;
    const needed = Math.max(0, unitTarget - existing);
    if (needed === 0) continue;

    const batches = [];
    let remaining = needed;
    while (remaining > 0) { batches.push(Math.min(5, remaining)); remaining -= 5; }

    for (const batchSize of batches) {
      // Fresh connection per batch to avoid timeout
      const conn = await mysql.createConnection(DB_URL);
      try {
        const { systemPrompt, userPrompt } = buildPrompt(unit, category, batchSize);
        const questions = await callLLM(systemPrompt, userPrompt);

        for (const q of questions) {
          try {
            const choicesJson = JSON.stringify(q.choices || []);
            let qType = (q.questionType || "multiple_choice").toLowerCase().replace(/-/g, "_");
            if (!['multiple_choice', 'short_answer', 'open_response'].includes(qType)) qType = 'multiple_choice';
            let diff = (q.difficulty || "medium").toLowerCase();
            if (!['easy', 'medium', 'hard', 'challenge'].includes(diff)) diff = 'medium';
            const skillTag = (q.skillTag || 'GENERAL').substring(0, 32);
            await conn.execute(
              `INSERT INTO quizQuestions (unitId, courseId, questionText, questionType, choices, correctAnswer, explanation, difficulty, skillTag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [unit.unitId, course.courseId, q.questionText, qType, choicesJson, q.correctAnswer, q.explanation || '', diff, skillTag]
            );
            courseInserted++;
            totalInserted++;
          } catch (err) {
            if (!err.message.includes('Duplicate')) {
              process.stderr.write(`  INSERT error: ${err.message.substring(0, 100)}\n`);
            }
          }
        }
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        courseErrors++;
        totalErrors++;
        console.error(`  ✗ [${course.courseCode}] Unit ${unit.unitNumber}: ${err.message.substring(0, 80)}`);
      } finally {
        await conn.end();
      }
    }
  }

  console.log(`${course.courseCode} (${category}): +${courseInserted} questions${courseErrors > 0 ? `, ${courseErrors} errors` : ""}`);
}

console.log(`\n✓ Retry complete.`);
console.log(`  Inserted: ${totalInserted}`);
console.log(`  Errors: ${totalErrors}`);
