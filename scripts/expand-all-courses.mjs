/**
 * EduChamp Full Catalog Lesson Expansion Script
 *
 * Expands ALL courses that have fewer than TARGET_TOTAL_LESSONS per unit
 * up to the target, generating additional sequential lessons via LLM.
 *
 * Usage:
 *   node scripts/expand-all-courses.mjs                       # full run
 *   node scripts/expand-all-courses.mjs --dry-run             # preview only
 *   node scripts/expand-all-courses.mjs --batch 1             # batch 1 of 3 (courses 1-23)
 *   node scripts/expand-all-courses.mjs --batch 2             # batch 2 of 3 (courses 24-46)
 *   node scripts/expand-all-courses.mjs --batch 3             # batch 3 of 3 (courses 47-68)
 *   node scripts/expand-all-courses.mjs --course G6MATH       # single course
 *   node scripts/expand-all-courses.mjs --resume-from 45      # resume from unit index 45
 */

import mysql from "mysql2/promise";

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const COURSE_FILTER = (() => {
  const idx = args.indexOf("--course");
  return idx !== -1 ? args[idx + 1] : null;
})();
const BATCH = (() => {
  const idx = args.indexOf("--batch");
  return idx !== -1 ? parseInt(args[idx + 1], 10) : null;
})();
const RESUME_FROM = (() => {
  const idx = args.indexOf("--resume-from");
  return idx !== -1 ? parseInt(args[idx + 1], 10) : 0;
})();

const TARGET_TOTAL_LESSONS = 9;
const BATCH_SIZE = 23; // ~68 courses / 3 batches
const INTER_REQUEST_DELAY_MS = 4000;

if (!FORGE_API_KEY) throw new Error("BUILT_IN_FORGE_API_KEY is not set");
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function invokeLLMWithRetry(messages, responseFormat, maxRetries = 8) {
  let delay = 10000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const payload = {
      model: "gemini-2.5-flash",
      messages,
      max_tokens: 16384,
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
        console.log(`    ⏳ Rate limited (attempt ${attempt}/${maxRetries}), waiting ${delay / 1000}s...`);
        await sleep(delay);
        delay = Math.min(delay * 2, 120000);
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

function buildResponseFormat() {
  return {
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
              required: [
                "title",
                "explanation",
                "workedExamples",
                "guidedProblems",
                "independentProblems",
                "misconceptions",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["lessons"],
        additionalProperties: false,
      },
    },
  };
}

async function generateAdditionalLessons(unit, existingLessons, startLessonNumber, count) {
  const { unitId, unitNumber, unitTitle, courseTitle, subject, gradeLevel } = unit;

  const gradeLabel =
    gradeLevel === "Pre-K"
      ? "Pre-Kindergarten"
      : gradeLevel === "Kindergarten"
      ? "Kindergarten"
      : `Grade ${gradeLevel}`;

  const isYoung = ["Pre-K", "Kindergarten", "1", "2", "3"].includes(gradeLevel);
  const isElementary = ["4", "5", "6"].includes(gradeLevel);

  const languageGuidance = isYoung
    ? "Use very simple language with short sentences. Focus on concrete, hands-on concepts. Use relatable examples from a child's everyday life (toys, food, family, nature). Keep explanations brief and visual."
    : isElementary
    ? "Use clear, grade-appropriate vocabulary. Connect concepts to real-world situations students encounter. Include concrete examples before abstract concepts."
    : "Use academic vocabulary with clear definitions. Include real-world applications and connections to other subjects. Scaffold from concrete to abstract.";

  const existingTitles = existingLessons.map((l, i) => `  Lesson ${i + 1}: ${l.title}`).join("\n");

  const prompt = `You are an expert K-12 curriculum designer creating lesson content for the EduChamp adaptive learning platform.

Course: ${courseTitle}
Subject: ${subject}
Grade Level: ${gradeLabel}
Unit ${unitNumber}: ${unitTitle}

${languageGuidance}

The unit already has ${existingLessons.length} lessons covering these topics:
${existingTitles}

Generate exactly ${count} NEW sequential lessons (lessons ${startLessonNumber} through ${startLessonNumber + count - 1}) that:
1. Build progressively on the existing lessons above
2. Cover deeper, more nuanced, or more applied aspects of the unit topic
3. Do NOT repeat topics already covered in the existing lessons
4. Progress from foundational application → deeper analysis → synthesis/extension
5. Each lesson should be substantively different from the others

Return valid JSON matching this exact schema — no extra fields, no markdown fences:
{
  "lessons": [
    {
      "title": "string",
      "explanation": "string (at least 3 paragraphs, thorough and detailed)",
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

  const raw = await invokeLLMWithRetry(
    [{ role: "user", content: prompt }],
    buildResponseFormat()
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
    lessonNumber: startLessonNumber + idx,
    title: lesson.title,
    teksAlignment: null,
    explanation: lesson.explanation,
    workedExamples: JSON.stringify(lesson.workedExamples || []),
    guidedProblems: JSON.stringify(lesson.guidedProblems || []),
    independentProblems: JSON.stringify(lesson.independentProblems || []),
    misconceptions: JSON.stringify(lesson.misconceptions || []),
    sortOrder: startLessonNumber + idx,
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

async function freshConn() {
  return mysql.createConnection(DATABASE_URL);
}

async function main() {
  // Use a fresh connection per unit to avoid dropped-connection errors on long runs
  let conn = await freshConn();

  // Get all units across all active courses that need more lessons
  let query = `
    SELECT u.id as unitId, u.courseId, u.unitNumber, u.title as unitTitle,
           c.courseCode, c.title as courseTitle, c.subject, c.gradeLevel,
           COUNT(l.id) as currentLessonCount,
           MAX(l.lessonNumber) as maxLessonNumber
    FROM units u
    JOIN courses c ON c.id = u.courseId
    LEFT JOIN lessons l ON l.unitId = u.id
    WHERE c.isActive = 1
  `;
  const queryParams = [];

  if (COURSE_FILTER) {
    query += ` AND c.courseCode = ?`;
    queryParams.push(COURSE_FILTER);
  }

  query += `
    GROUP BY u.id, u.courseId, u.unitNumber, u.title, c.courseCode, c.title, c.subject, c.gradeLevel
    HAVING currentLessonCount < ?
    ORDER BY c.gradeLevel, c.courseCode, u.unitNumber
  `;
  queryParams.push(TARGET_TOTAL_LESSONS);

  const [allUnits] = await conn.execute(query, queryParams);

  // Apply batch filtering if requested
  let unitsToExpand = allUnits;
  if (BATCH !== null && !COURSE_FILTER) {
    const start = (BATCH - 1) * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    // Get unique course codes and slice by batch
    const allCourseCodes = [...new Set(allUnits.map((u) => u.courseCode))];
    const batchCodes = new Set(allCourseCodes.slice(start, end));
    unitsToExpand = allUnits.filter((u) => batchCodes.has(u.courseCode));
  }

  // Apply resume-from offset
  if (RESUME_FROM > 0) {
    unitsToExpand = unitsToExpand.slice(RESUME_FROM);
  }

  const totalNewLessons = unitsToExpand.reduce(
    (sum, u) => sum + (TARGET_TOTAL_LESSONS - u.currentLessonCount),
    0
  );

  const uniqueCourses = [...new Set(unitsToExpand.map((u) => u.courseCode))];

  console.log(`\n📚 EduChamp Full Catalog Lesson Expansion`);
  console.log(`   Target lessons per unit: ${TARGET_TOTAL_LESSONS}`);
  console.log(`   Courses to process: ${uniqueCourses.length}`);
  console.log(`   Units to expand: ${unitsToExpand.length}`);
  console.log(`   New lessons to generate: ~${totalNewLessons}`);
  console.log(`   Batch: ${BATCH ?? "all"}`);
  console.log(`   Resume from: ${RESUME_FROM}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log(`\n   Courses: ${uniqueCourses.join(", ")}`);
  console.log("");

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < unitsToExpand.length; i++) {
    const unit = unitsToExpand[i];
    const currentCount = unit.currentLessonCount;
    const newCount = TARGET_TOTAL_LESSONS - currentCount;
    const startLessonNumber = (unit.maxLessonNumber || currentCount) + 1;
    const globalIdx = RESUME_FROM + i;

    process.stdout.write(
      `[${globalIdx + 1}/${RESUME_FROM + unitsToExpand.length}] ${unit.courseCode} U${unit.unitNumber}: "${unit.unitTitle}" (${currentCount}→${TARGET_TOTAL_LESSONS}, +${newCount}) ... `
    );

    try {
      // Reconnect every 20 units to prevent MySQL timeout on long runs
      if (i > 0 && i % 20 === 0) {
        try { await conn.end(); } catch (_) {}
        conn = await freshConn();
        console.log(`   🔄 Reconnected to DB at unit ${globalIdx + 1}`);
      }

      // Fetch existing lesson titles for context
      const [existingLessons] = await conn.execute(
        `SELECT lessonNumber, title FROM lessons WHERE unitId = ? ORDER BY lessonNumber`,
        [unit.unitId]
      );

      const newLessons = await generateAdditionalLessons(
        unit,
        existingLessons,
        startLessonNumber,
        newCount
      );

      if (!DRY_RUN) {
        await insertLessons(conn, newLessons);
      }

      console.log(`✅ +${newLessons.length} lessons`);
      successCount++;
    } catch (err) {
      const msg = err.message || String(err);
      console.log(`❌ ${msg.slice(0, 120)}`);
      errors.push({ courseCode: unit.courseCode, unitNumber: unit.unitNumber, unitTitle: unit.unitTitle, error: msg });
      errorCount++;
    }

    // 4 second gap between requests
    if (i < unitsToExpand.length - 1) {
      await sleep(INTER_REQUEST_DELAY_MS);
    }
  }

  await conn.end();

  console.log(`\n📊 Expansion Summary`);
  console.log(`   ✅ Success: ${successCount} units expanded`);
  console.log(`   ❌ Errors:  ${errorCount} units failed`);
  if (errors.length > 0) {
    console.log(`\n   Failed units (re-run with --course <CODE> to retry):`);
    errors.forEach((e, i) => console.log(`   ${i + 1}. ${e.courseCode} U${e.unitNumber} "${e.unitTitle}": ${e.error.slice(0, 100)}`));
    // Write errors to file for retry
    const fs = await import("fs/promises");
    await fs.writeFile("/tmp/expand-errors.json", JSON.stringify(errors, null, 2));
    console.log(`\n   Error details saved to /tmp/expand-errors.json`);
  }
  if (DRY_RUN) {
    console.log(`\n   ℹ️  DRY RUN — no data was written`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
