/**
 * generate-thin-courses.mjs
 * Targeted retry for courses with fewer than 70 questions.
 * Generates 8 questions per unit (2 easy, 3 medium, 2 hard, 1 challenge)
 * using fresh DB connections per batch to avoid timeout.
 */
import mysql from "mysql2/promise";
// Use direct Forge API fetch (same pattern as other generation scripts)
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM({ messages }) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_KEY}` },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const DATABASE_URL = process.env.DATABASE_URL;

// Thin courses from audit (< 70 questions)
const THIN_COURSE_CODES = [
  "ENG2", "USH",
  "G1-SCI", "G2-SCI", "G2-SS", "G1-SS",
  "PREK-SCI", "K-SCI", "PREK-SS", "K-SS",
  "G1-ELA", "G2-ELA", "G1-MATH", "APHG",
  "K-ELA", "PREK-MATH", "PREK-ELA", "G2-MATH",
  "G8TECH"
];

const DIFFICULTY_DISTRIBUTION = [
  { difficulty: "easy", count: 2 },
  { difficulty: "medium", count: 3 },
  { difficulty: "hard", count: 2 },
  { difficulty: "challenge", count: 1 },
];

function getCategoryForCourse(subject, gradeLevel) {
  const gl = String(gradeLevel).toLowerCase();
  if (["pre-k", "prek", "kindergarten", "k", "1", "2"].includes(gl)) return "early_childhood";
  if (subject?.toLowerCase().includes("ap ") || subject?.startsWith("AP")) return "ap";
  if (subject?.toLowerCase().includes("sat")) return "sat";
  return "k12_regular";
}

function getChoiceCount(category, gradeLevel) {
  const gl = String(gradeLevel).toLowerCase();
  if (["pre-k", "prek", "kindergarten", "k", "1", "2"].includes(gl)) return 3;
  return 4;
}

async function generateQuestionsForUnit(unit, course, difficulty, count) {
  const category = getCategoryForCourse(course.subject, course.gradeLevel);
  const choiceCount = getChoiceCount(category, course.gradeLevel);
  const isYoung = category === "early_childhood";

  const prompt = `Generate ${count} multiple-choice quiz questions for:
Course: ${course.title} (Grade ${course.gradeLevel}, ${course.subject})
Unit: ${unit.title}
Difficulty: ${difficulty}
Number of choices per question: ${choiceCount}
${isYoung ? "Style: Very short sentences, simple vocabulary, encouraging tone, real-world objects." : "Style: Clear, precise, curriculum-aligned."}

Return ONLY a JSON array (no markdown, no explanation) with exactly ${count} objects:
[
  {
    "questionText": "...",
    "choices": ["A) ...", "B) ...", ${choiceCount >= 3 ? '"C) ...", ' : ""}${choiceCount >= 4 ? '"D) ..."' : ""}],
    "correctAnswer": "A",
    "explanation": "...",
    "skillTag": "short_skill_tag",
    "teksCode": "optional_teks_code_or_empty_string"
  }
]
Rules:
- correctAnswer must be exactly one letter: A, B, C${choiceCount >= 4 ? ", or D" : ""}
- skillTag must be 1-3 words, max 20 chars, no spaces (use underscores)
- explanation must be 1-2 sentences
- All ${count} items required
- Return ONLY the JSON array, nothing else`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a curriculum expert. Return only valid JSON arrays." },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0].message.content.trim();
  // Strip markdown code blocks if present
  const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

async function insertQuestions(db, questions, unitId, difficulty) {
  let inserted = 0;
  for (const q of questions) {
    try {
      const rawChoices = q.choices || [];
      // Strip letter prefixes ("A) ...") and store as JSON array
      const cleanChoices = rawChoices.map(c => c.replace(/^[A-D]\)\s*/, ""));
      const choicesJson = JSON.stringify(cleanChoices);
      const correctAnswer = (q.correctAnswer || "A").toUpperCase().charAt(0);
      const skillTag = (q.skillTag || "general").replace(/\s+/g, "_").substring(0, 20);

      await db.execute(
        `INSERT INTO quizQuestions
          (unitId, questionText, questionType, choices,
           correctAnswer, explanation, difficulty, skillTag)
         VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?)`,
        [unitId, q.questionText, choicesJson,
         correctAnswer, q.explanation || "", difficulty, skillTag]
      );
      inserted++;
    } catch (err) {
      console.error(`  INSERT error: ${err.message}`);
    }
  }
  return inserted;
}

async function main() {
  console.log("=== Thin-Bank Second Pass ===");
  console.log(`Target courses: ${THIN_COURSE_CODES.length}`);

  // Get all thin courses with their units
  const db = await mysql.createConnection(DATABASE_URL);
  const [courses] = await db.execute(
    `SELECT c.id, c.courseCode, c.title, c.gradeLevel, c.subject,
            COUNT(q.id) as currentCount
     FROM courses c
     LEFT JOIN units u ON u.courseId = c.id
     LEFT JOIN quizQuestions q ON q.unitId = u.id
     WHERE c.courseCode IN (${THIN_COURSE_CODES.map(() => "?").join(",")})
     GROUP BY c.id, c.courseCode, c.title, c.gradeLevel, c.subject`,
    THIN_COURSE_CODES
  );

  const [allUnits] = await db.execute(
    `SELECT u.id, u.courseId, u.title, u.unitNumber
     FROM units u
     WHERE u.courseId IN (
       SELECT id FROM courses WHERE courseCode IN (${THIN_COURSE_CODES.map(() => "?").join(",")})
     )
     ORDER BY u.courseId, u.unitNumber`,
    THIN_COURSE_CODES
  );
  await db.end();

  // Build course→units map
  const unitsByCourse = {};
  for (const unit of allUnits) {
    if (!unitsByCourse[unit.courseId]) unitsByCourse[unit.courseId] = [];
    unitsByCourse[unit.courseId].push(unit);
  }

  let totalInserted = 0;
  let totalErrors = 0;

  for (const course of courses) {
    const units = unitsByCourse[course.id] || [];
    if (units.length === 0) {
      console.log(`⚠ ${course.courseCode}: no units found, skipping`);
      continue;
    }

    console.log(`\n→ ${course.courseCode} (${course.title}) — ${course.currentCount} questions, ${units.length} units`);
    let courseInserted = 0;

    for (const unit of units) {
      for (const { difficulty, count } of DIFFICULTY_DISTRIBUTION) {
        try {
          const questions = await generateQuestionsForUnit(unit, course, difficulty, count);
          // Fresh connection per batch
          const batchDb = await mysql.createConnection(DATABASE_URL);
          const inserted = await insertQuestions(batchDb, questions, unit.id, difficulty);
          await batchDb.end();
          courseInserted += inserted;
          process.stdout.write(".");
        } catch (err) {
          process.stdout.write("✗");
          totalErrors++;
          // Small delay before retry
          await new Promise(r => setTimeout(r, 500));
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`\n  ✓ ${course.courseCode}: +${courseInserted} questions`);
    totalInserted += courseInserted;
  }

  console.log(`\n=== Done ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total errors: ${totalErrors}`);
}

main().catch(console.error);
