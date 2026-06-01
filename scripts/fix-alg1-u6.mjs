/**
 * Fix ALG1 U6 "Systems of Equations" — generate 6 lessons in 2 batches of 3
 * to avoid the 16k token truncation issue.
 */

import mysql from "mysql2/promise";

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!FORGE_API_KEY) throw new Error("BUILT_IN_FORGE_API_KEY is not set");
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function invokeLLM(messages, responseFormat, maxRetries = 5) {
  let delay = 8000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const payload = { model: "gemini-2.5-flash", messages, max_tokens: 8192 };
    if (responseFormat) payload.response_format = responseFormat;
    const res = await fetch(`${FORGE_API_URL.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${FORGE_API_KEY}` },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) {
      if (attempt < maxRetries) { await sleep(delay); delay = Math.min(delay * 2, 60000); continue; }
      throw new Error(`429 after ${maxRetries} retries`);
    }
    if (!res.ok) throw new Error(`LLM error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()).choices[0].message.content;
  }
}

const RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "lesson_batch",
    strict: true,
    schema: {
      type: "object",
      properties: {
        lessons: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              explanation: { type: "string" },
              workedExamples: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" }, problem: { type: "string" },
                    steps: { type: "array", items: { type: "object", properties: { step: { type: "string" }, explanation: { type: "string" } }, required: ["step","explanation"], additionalProperties: false } },
                    answer: { type: "string" }
                  },
                  required: ["title","problem","steps","answer"], additionalProperties: false
                }
              },
              guidedProblems: {
                type: "array",
                items: {
                  type: "object",
                  properties: { problem: { type: "string" }, hint1: { type: "string" }, hint2: { type: "string" }, solution: { type: "string" }, explanation: { type: "string" } },
                  required: ["problem","hint1","hint2","solution","explanation"], additionalProperties: false
                }
              },
              independentProblems: {
                type: "array",
                items: {
                  type: "object",
                  properties: { problem: { type: "string" }, solution: { type: "string" }, explanation: { type: "string" } },
                  required: ["problem","solution","explanation"], additionalProperties: false
                }
              },
              misconceptions: { type: "array", items: { type: "string" } }
            },
            required: ["title","explanation","workedExamples","guidedProblems","independentProblems","misconceptions"],
            additionalProperties: false
          }
        }
      },
      required: ["lessons"],
      additionalProperties: false
    }
  }
};

async function generateBatch(existingTitles, startNum, count) {
  const prompt = `You are an expert K-12 curriculum designer for the EduChamp adaptive learning platform.

Course: Algebra I
Subject: Mathematics
Grade Level: Grade 9

Unit 6: Systems of Equations

The unit already has these lessons:
${existingTitles}

Generate exactly ${count} NEW sequential lessons (lessons ${startNum} through ${startNum + count - 1}) that:
1. Build progressively on the existing lessons
2. Cover deeper aspects: applications, word problems, special cases, real-world contexts
3. Do NOT repeat topics already covered
4. Keep explanations focused and concise (2 paragraphs each)

Return valid JSON — no markdown fences:
{ "lessons": [ { "title": "...", "explanation": "...", "workedExamples": [{"title":"...","problem":"...","steps":[{"step":"...","explanation":"..."}],"answer":"..."}], "guidedProblems": [{"problem":"...","hint1":"...","hint2":"...","solution":"...","explanation":"..."}], "independentProblems": [{"problem":"...","solution":"...","explanation":"..."}], "misconceptions": ["...","..."] } ] }

Include exactly 2 workedExamples, 2 guidedProblems, 2 independentProblems, and 2 misconceptions per lesson.`;

  const raw = await invokeLLM([{ role: "user", content: prompt }], RESPONSE_FORMAT);
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return parsed.lessons;
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // Get unit info
  const [[unit]] = await conn.execute(
    `SELECT u.id as unitId, u.unitNumber, u.title FROM units u
     JOIN courses c ON c.id = u.courseId
     WHERE c.courseCode = 'ALG1' AND u.unitNumber = 6`
  );

  // Get existing lessons
  const [existing] = await conn.execute(
    `SELECT lessonNumber, title FROM lessons WHERE unitId = ? ORDER BY lessonNumber`,
    [unit.unitId]
  );

  console.log(`ALG1 U6 currently has ${existing.length} lessons`);
  const existingTitles = existing.map(l => `  Lesson ${l.lessonNumber}: ${l.title}`).join("\n");
  const startNum = existing.length + 1;
  const needed = 9 - existing.length;

  if (needed <= 0) {
    console.log("Already has 9+ lessons, nothing to do.");
    await conn.end();
    return;
  }

  console.log(`Generating ${needed} new lessons in batches of 3...`);

  let inserted = 0;
  const batchSize = 3;

  for (let batchStart = startNum; batchStart < startNum + needed; batchStart += batchSize) {
    const batchCount = Math.min(batchSize, startNum + needed - batchStart);
    console.log(`  Batch: lessons ${batchStart}–${batchStart + batchCount - 1}...`);

    try {
      const lessons = await generateBatch(existingTitles, batchStart, batchCount);
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const lessonNum = batchStart + i;
        await conn.execute(
          `INSERT INTO lessons (unitId, lessonNumber, title, teksAlignment, explanation, workedExamples, guidedProblems, independentProblems, misconceptions, sortOrder)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [unit.unitId, lessonNum, lesson.title, null, lesson.explanation,
           JSON.stringify(lesson.workedExamples), JSON.stringify(lesson.guidedProblems),
           JSON.stringify(lesson.independentProblems), JSON.stringify(lesson.misconceptions), lessonNum]
        );
        console.log(`    ✅ Inserted lesson ${lessonNum}: "${lesson.title}"`);
        inserted++;
      }
    } catch (err) {
      console.log(`    ❌ Batch failed: ${err.message.slice(0, 100)}`);
    }

    if (batchStart + batchSize < startNum + needed) await sleep(5000);
  }

  const [[{finalCount}]] = await conn.execute(
    `SELECT COUNT(*) as finalCount FROM lessons WHERE unitId = ?`, [unit.unitId]
  );

  await conn.end();
  console.log(`\nDone. ALG1 U6 now has ${finalCount} lessons (inserted ${inserted} new).`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
