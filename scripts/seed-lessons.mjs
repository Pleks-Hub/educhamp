/**
 * EduChamp Bulk Lesson Seed Script
 * Generates 3 lessons per unit for all courses that currently have 0 lessons.
 * Uses the Manus Forge LLM API (Gemini 2.5 Flash) for content generation.
 *
 * Lessons table schema:
 *   id, unitId, lessonNumber, title, teksAlignment, explanation,
 *   workedExamples (JSON), guidedProblems (JSON), independentProblems (JSON),
 *   misconceptions (JSON), sortOrder
 *
 * Usage: node scripts/seed-lessons.mjs [--dry-run] [--course COURSECODE] [--batch-size N]
 */

import mysql from "mysql2/promise";

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const COURSE_FILTER = args.includes("--course") ? args[args.indexOf("--course") + 1] : null;
const BATCH_SIZE = args.includes("--batch-size") ? parseInt(args[args.indexOf("--batch-size") + 1]) : 3;

if (!FORGE_API_KEY) throw new Error("BUILT_IN_FORGE_API_KEY is not set");
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

// ─── LLM helper ──────────────────────────────────────────────────────────────

async function invokeLLM(messages, responseFormat) {
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Lesson generation ────────────────────────────────────────────────────────

async function generateLessonsForUnit(unit) {
  const { id: unitId, unitNumber, title: unitTitle, courseTitle, subject, gradeLevel } = unit;

  const gradeLabel = gradeLevel === "Pre-K" ? "Pre-Kindergarten"
    : gradeLevel === "Kindergarten" ? "Kindergarten"
    : `Grade ${gradeLevel}`;

  const isYoung = ["Pre-K", "Kindergarten", "1", "2", "3"].includes(gradeLevel);
  const isElementary = ["4", "5", "6"].includes(gradeLevel);
  const isMiddle = ["7", "8"].includes(gradeLevel);

  const languageGuidance = isYoung
    ? "Use very simple language with short sentences. Focus on concrete, hands-on concepts. Use relatable examples from a child's everyday life (toys, food, family, nature)."
    : isElementary
    ? "Use clear, grade-appropriate vocabulary. Connect concepts to real-world situations students encounter. Include visual descriptions (e.g., 'imagine a number line')."
    : isMiddle
    ? "Use academic vocabulary with clear definitions. Include real-world applications and connections to other subjects."
    : "Use rigorous academic vocabulary. Include connections to standards, real-world applications, and college/career readiness.";

  const prompt = `You are an expert K-12 curriculum designer creating lesson content for the EduChamp adaptive learning platform.

Course: ${courseTitle}
Subject: ${subject}
Grade Level: ${gradeLabel}
Unit ${unitNumber}: ${unitTitle}

${languageGuidance}

Generate exactly 3 sequential lessons for this unit. Each lesson should build on the previous one, progressing from foundational to more complex concepts within the unit topic.

For each lesson provide:
1. title: A concise lesson title (4-8 words)
2. explanation: 3-5 paragraphs of clear instructional content (markdown allowed, use ## for subheadings if helpful). This is the main teaching content students read.
3. workedExamples: Exactly 2 worked examples showing how to solve problems step by step
4. guidedProblems: Exactly 2 guided practice problems (with hints to scaffold student thinking)
5. independentProblems: Exactly 2 independent practice problems (students solve on their own)
6. misconceptions: Exactly 2 common student misconceptions about this lesson's content

Return valid JSON matching this exact schema — no extra fields, no markdown fences:
{
  "lessons": [
    {
      "title": "string",
      "explanation": "string",
      "workedExamples": [
        {
          "title": "string (brief label for this example)",
          "problem": "string",
          "steps": [
            { "step": "string (what to do)", "explanation": "string (why)" }
          ],
          "answer": "string"
        }
      ],
      "guidedProblems": [
        {
          "problem": "string",
          "hint1": "string (first hint)",
          "hint2": "string (second, more specific hint)",
          "solution": "string",
          "explanation": "string (why this is the answer)"
        }
      ],
      "independentProblems": [
        {
          "problem": "string",
          "solution": "string",
          "explanation": "string (brief explanation of the solution)"
        }
      ],
      "misconceptions": ["string", "string"]
    }
  ]
}`;

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

  const raw = await invokeLLM(
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
    throw new Error(`Unexpected response shape for unit ${unitId}: ${JSON.stringify(parsed).slice(0, 200)}`);
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

// ─── DB insert ────────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // Fetch all units for courses with 0 lessons
  const courseFilter = COURSE_FILTER ? `AND c.courseCode = '${COURSE_FILTER}'` : "";
  const [units] = await conn.execute(`
    SELECT u.id, u.courseId, u.unitNumber, u.title,
           c.courseCode, c.title as courseTitle, c.subject, c.gradeLevel
    FROM units u
    JOIN courses c ON c.id = u.courseId
    WHERE c.id IN (
      SELECT c2.id FROM courses c2
      LEFT JOIN units u2 ON u2.courseId = c2.id
      LEFT JOIN lessons l2 ON l2.unitId = u2.id
      WHERE c2.isActive = 1
      GROUP BY c2.id
      HAVING COUNT(DISTINCT l2.id) = 0
    )
    ${courseFilter}
    ORDER BY c.gradeLevel, c.courseCode, u.unitNumber
  `);

  console.log(`\n📚 EduChamp Bulk Lesson Seed`);
  console.log(`   Units to process: ${units.length}`);
  console.log(`   Lessons per unit: 3`);
  console.log(`   Total lessons:    ${units.length * 3}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  if (COURSE_FILTER) console.log(`   Course filter: ${COURSE_FILTER}`);
  console.log("");

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process in batches to avoid overwhelming the LLM API
  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch = units.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(units.length / BATCH_SIZE);

    process.stdout.write(`Batch ${batchNum}/${totalBatches}: ${batch.map(u => `${u.courseCode}:U${u.unitNumber}`).join(", ")} ... `);

    const results = await Promise.allSettled(
      batch.map(async (unit) => {
        const lessons = await generateLessonsForUnit(unit);
        if (!DRY_RUN) {
          await insertLessons(conn, lessons);
        }
        return { unit, lessons };
      })
    );

    let batchOk = 0;
    let batchErr = 0;
    for (const result of results) {
      if (result.status === "fulfilled") {
        batchOk++;
        successCount++;
      } else {
        batchErr++;
        errorCount++;
        const errMsg = result.reason?.message || String(result.reason);
        errors.push(errMsg);
        process.stdout.write(`\n  ❌ ${errMsg.slice(0, 120)}\n`);
      }
    }
    console.log(`✅ ${batchOk}/${batch.length}${batchErr > 0 ? ` ❌ ${batchErr} failed` : ""}`);

    // Small delay between batches
    if (i + BATCH_SIZE < units.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  await conn.end();

  console.log(`\n📊 Summary`);
  console.log(`   ✅ Success: ${successCount} units → ${successCount * 3} lessons inserted`);
  console.log(`   ❌ Errors:  ${errorCount} units`);
  if (errors.length > 0) {
    console.log(`\n   Error details:`);
    errors.forEach((e, i) => console.log(`   ${i + 1}. ${e.slice(0, 200)}`));
  }
  if (DRY_RUN) {
    console.log(`\n   ℹ️  DRY RUN — no data was written to the database`);
  } else {
    console.log(`\n   ✅ All lessons written to database successfully`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
