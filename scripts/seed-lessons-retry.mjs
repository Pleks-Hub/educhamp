/**
 * EduChamp Lesson Seed RETRY Script
 * Seeds only the units that still have 0 lessons (after the main seed run).
 * Adds exponential backoff for 429 rate limit errors.
 *
 * Usage: node scripts/seed-lessons-retry.mjs [--dry-run]
 */

import mysql from "mysql2/promise";

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

if (!FORGE_API_KEY) throw new Error("BUILT_IN_FORGE_API_KEY is not set");
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function invokeLLMWithRetry(messages, responseFormat, maxRetries = 5) {
  let delay = 5000; // start with 5s
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const payload = {
      model: "gemini-2.5-flash",
      messages,
      max_tokens: 8192,
    };
    if (responseFormat) payload.response_format = responseFormat;

    const res = await fetch(`${FORGE_API_URL.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${FORGE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      if (attempt < maxRetries) {
        console.log(`    Rate limited (attempt ${attempt}/${maxRetries}), waiting ${delay / 1000}s...`);
        await sleep(delay);
        delay *= 2; // exponential backoff
        continue;
      }
      const text = await res.text();
      throw new Error(`LLM error 429 after ${maxRetries} retries: ${text.slice(0, 200)}`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM error ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }
}

async function generateLessonsForUnit(unit) {
  const { id: unitId, unitNumber, title: unitTitle, courseTitle, subject, gradeLevel } = unit;

  const gradeLabel = gradeLevel === "Pre-K" ? "Pre-Kindergarten"
    : gradeLevel === "Kindergarten" ? "Kindergarten"
    : `Grade ${gradeLevel}`;

  const isYoung = ["Pre-K", "Kindergarten", "1", "2", "3"].includes(gradeLevel);
  const isElementary = ["4", "5", "6"].includes(gradeLevel);

  const languageGuidance = isYoung
    ? "Use very simple language with short sentences. Focus on concrete, hands-on concepts. Use relatable examples from a child's everyday life (toys, food, family, nature)."
    : isElementary
    ? "Use clear, grade-appropriate vocabulary. Connect concepts to real-world situations students encounter."
    : "Use academic vocabulary with clear definitions. Include real-world applications and connections to other subjects.";

  const prompt = `You are an expert K-12 curriculum designer creating lesson content for the EduChamp adaptive learning platform.

Course: ${courseTitle}
Subject: ${subject}
Grade Level: ${gradeLabel}
Unit ${unitNumber}: ${unitTitle}

${languageGuidance}

Generate exactly 3 sequential lessons for this unit. Each lesson should build on the previous one.

Return valid JSON matching this exact schema — no extra fields, no markdown fences:
{
  "lessons": [
    {
      "title": "string",
      "explanation": "string",
      "workedExamples": [
        {
          "title": "string",
          "problem": "string",
          "steps": [
            { "step": "string", "explanation": "string" }
          ],
          "answer": "string"
        }
      ],
      "guidedProblems": [
        {
          "problem": "string",
          "hint1": "string",
          "hint2": "string",
          "solution": "string",
          "explanation": "string"
        }
      ],
      "independentProblems": [
        {
          "problem": "string",
          "solution": "string",
          "explanation": "string"
        }
      ],
      "misconceptions": ["string", "string"]
    }
  ]
}

Include exactly 2 workedExamples, 2 guidedProblems, 2 independentProblems, and 2 misconceptions per lesson.`;

  const responseFormat = {
    type: "json_schema",
    json_schema: {
      name: "lesson_content",
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
                      title: { type: "string" },
                      problem: { type: "string" },
                      steps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            step: { type: "string" },
                            explanation: { type: "string" },
                          },
                          required: ["step", "explanation"],
                          additionalProperties: false,
                        },
                      },
                      answer: { type: "string" },
                    },
                    required: ["title", "problem", "steps", "answer"],
                    additionalProperties: false,
                  },
                },
                guidedProblems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      problem: { type: "string" },
                      hint1: { type: "string" },
                      hint2: { type: "string" },
                      solution: { type: "string" },
                      explanation: { type: "string" },
                    },
                    required: ["problem", "hint1", "hint2", "solution", "explanation"],
                    additionalProperties: false,
                  },
                },
                independentProblems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      problem: { type: "string" },
                      solution: { type: "string" },
                      explanation: { type: "string" },
                    },
                    required: ["problem", "solution", "explanation"],
                    additionalProperties: false,
                  },
                },
                misconceptions: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["title", "explanation", "workedExamples", "guidedProblems", "independentProblems", "misconceptions"],
              additionalProperties: false,
            },
          },
        },
        required: ["lessons"],
        additionalProperties: false,
      },
    },
  };

  const raw = await invokeLLMWithRetry(
    [{ role: "user", content: prompt }],
    responseFormat
  );

  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    throw new Error(`JSON parse failed for unit ${unitId} "${unitTitle}": ${e.message}`);
  }

  if (!parsed.lessons || !Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
    throw new Error(`Unexpected response shape for unit ${unitId}`);
  }

  return parsed.lessons.map((lesson, idx) => ({
    unitId,
    lessonNumber: idx + 1,
    title: lesson.title,
    teksAlignment: null,
    explanation: lesson.explanation,
    workedExamples: JSON.stringify(lesson.workedExamples || []),
    guidedProblems: JSON.stringify(lesson.guidedProblems || []),
    independentProblems: JSON.stringify(lesson.independentProblems || []),
    misconceptions: JSON.stringify(lesson.misconceptions || []),
    sortOrder: idx + 1,
  }));
}

async function insertLessons(conn, lessons) {
  for (const lesson of lessons) {
    await conn.execute(
      `INSERT INTO lessons
         (unitId, lessonNumber, title, teksAlignment, explanation,
          workedExamples, guidedProblems, independentProblems, misconceptions, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lesson.unitId,
        lesson.lessonNumber,
        lesson.title,
        lesson.teksAlignment,
        lesson.explanation,
        lesson.workedExamples,
        lesson.guidedProblems,
        lesson.independentProblems,
        lesson.misconceptions,
        lesson.sortOrder,
      ]
    );
  }
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  const [units] = await conn.execute(`
    SELECT u.id, u.courseId, u.unitNumber, u.title,
           c.courseCode, c.title as courseTitle, c.subject, c.gradeLevel
    FROM units u
    JOIN courses c ON c.id = u.courseId
    WHERE u.id NOT IN (SELECT DISTINCT unitId FROM lessons)
    AND c.isActive = 1
    ORDER BY c.gradeLevel, c.courseCode, u.unitNumber
  `);

  console.log(`\n🔄 EduChamp Lesson Seed RETRY`);
  console.log(`   Units missing lessons: ${units.length}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log("");

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process one at a time to avoid rate limits
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    process.stdout.write(`[${i + 1}/${units.length}] ${unit.courseCode} U${unit.unitNumber}: "${unit.title}" ... `);

    try {
      const lessons = await generateLessonsForUnit(unit);
      if (!DRY_RUN) {
        await insertLessons(conn, lessons);
      }
      console.log(`✅ ${lessons.length} lessons`);
      successCount++;
    } catch (err) {
      const msg = err.message || String(err);
      console.log(`❌ ${msg.slice(0, 100)}`);
      errors.push(`${unit.courseCode} U${unit.unitNumber}: ${msg}`);
      errorCount++;
    }

    // Wait 3 seconds between each request to avoid rate limits
    if (i < units.length - 1) {
      await sleep(3000);
    }
  }

  await conn.end();

  console.log(`\n📊 Retry Summary`);
  console.log(`   ✅ Success: ${successCount} units → ${successCount * 3} lessons`);
  console.log(`   ❌ Errors:  ${errorCount} units`);
  if (errors.length > 0) {
    console.log(`\n   Remaining errors:`);
    errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  }
  if (DRY_RUN) {
    console.log(`\n   ℹ️  DRY RUN — no data was written`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
