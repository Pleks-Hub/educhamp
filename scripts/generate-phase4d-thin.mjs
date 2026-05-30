/**
 * generate-phase4d-thin.mjs
 * Phase 4D — Thin Course Second Pass
 *
 * Targets all 16 thin courses from the Phase 4C health report.
 * Uses enriched prompts: unit title + strand context + course description
 * injected into every generation call. Generates enough questions to
 * bring each course to its minimum target.
 *
 * Thin courses and gaps (from QUESTION_BANK_HEALTH.md, post Phase 4C):
 *   AP Human Geography (APHG):         65 → need 70  (gap: 5)
 *   Kindergarten Mathematics (K-MATH): 54 → need 70  (gap: 16)
 *   Kindergarten Science (K-SCI):      67 → need 70  (gap: 3)
 *   Kindergarten Social Studies (K-SS):68 → need 70  (gap: 2)
 *   Pre-K Science (PREK-SCI):          68 → need 70  (gap: 2)
 *   Pre-K Social Studies (PREK-SS):    68 → need 70  (gap: 2)  [was listed as K-SS in report]
 *   3rd Grade ELA (GR3ELA):            63 → need 70  (gap: 7)
 *   3rd Grade Math (GR3MATH):          63 → need 70  (gap: 7)
 *   3rd Grade Science (GR3SCI):        63 → need 70  (gap: 7)
 *   3rd Grade Social Studies (GR3SS):  54 → need 70  (gap: 16)
 *   Grade 6 Technology Apps (G6TECH):  54 → need 70  (gap: 16)
 *   Grade 7 Technology Apps (G7TECH):  54 → need 70  (gap: 16)
 *   Spanish 2 (SPA2):                  63 → need 70  (gap: 7)
 *   Grade 1 Social Studies (G1-SS):    31 → need 50  (gap: 19)
 *   English I (ENG1):                  96 → need 140 (gap: 44)
 *   Biology I (BIO1):                  96 → need 140 (gap: 44)
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

async function invokeLLM({ messages }) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Course-specific strand context for enriched prompts ────────────────────────

const STRAND_CONTEXT = {
  APHG: "AP Human Geography strands: Thinking Geographically, Population & Migration, Cultural Patterns, Political Organization, Agriculture & Rural Land Use, Industrialization & Economic Development, Cities & Urban Land Use. Questions should use geographic reasoning, spatial analysis, and case studies.",
  "K-MATH": "Kindergarten Mathematics strands: Counting and Cardinality, Operations and Algebraic Thinking, Number and Operations in Base Ten, Measurement and Data, Geometry. Use manipulatives language, simple number sentences, and real-world counting contexts.",
  "K-SCI": "Kindergarten Science strands: Matter and Energy, Force Motion and Energy, Earth and Space, Organisms and Environments. Use observable phenomena, simple cause-and-effect, and age-appropriate vocabulary.",
  "K-SS": "Kindergarten Social Studies strands: History, Geography, Economics, Government and Citizenship. Focus on family, community helpers, basic maps, and simple rules.",
  "PREK-SCI": "Pre-K Science strands: Matter and Energy, Force Motion and Energy, Earth and Space, Organisms and Environments. Use very simple observations, sorting, and descriptive language appropriate for 4-year-olds.",
  "PREK-SS": "Pre-K Social Studies strands: Self, Family, Community. Focus on personal identity, family roles, and immediate community. Very simple vocabulary.",
  GR3ELA: "3rd Grade ELA strands: Reading/Comprehension of Literary Text, Reading/Comprehension of Informational Text, Writing, Oral and Written Conventions, Research. Include short passage excerpts (2-3 sentences) where appropriate.",
  GR3MATH: "3rd Grade Mathematics strands: Number and Operations, Algebraic Reasoning, Geometry and Measurement, Data Analysis. Include word problems with real-world contexts (sharing, measuring, grouping).",
  GR3SCI: "3rd Grade Science strands: Matter and Energy, Force Motion and Energy, Earth and Space, Organisms and Environments. Use observable experiments, life cycles, weather patterns, and simple physical properties.",
  GR3SS: "3rd Grade Social Studies strands: History, Geography, Economics, Government and Citizenship. Focus on Texas communities, geographic features, economic concepts (goods/services), and civic responsibilities.",
  G6TECH: "Grade 6 Technology Applications strands: Digital Citizenship, Communication and Collaboration, Critical Thinking Problem Solving and Decision Making, Technology Operations and Concepts. Include practical scenarios involving internet safety, file management, and digital tools.",
  G7TECH: "Grade 7 Technology Applications strands: Digital Citizenship, Communication and Collaboration, Critical Thinking Problem Solving and Decision Making, Technology Operations and Concepts. Include scenarios involving coding concepts, data analysis tools, and responsible digital communication.",
  SPA2: "Spanish 2 strands: Interpersonal Communication, Interpretive Communication, Presentational Communication, Cultural Comparisons. Include questions in Spanish where appropriate. Focus on past tense (preterite/imperfect), subjunctive introduction, and cultural practices of Spanish-speaking countries.",
  "G1-SS": "Grade 1 Social Studies strands: History, Geography, Economics, Government and Citizenship. Focus on timelines, map skills (cardinal directions), needs vs. wants, community rules, and national symbols.",
  ENG1: "English I (Grade 9 STAAR EOC) strands: Reading/Literary Text, Reading/Informational Text, Writing, Oral and Written Conventions, Research. Questions should mirror STAAR format: passage-based multiple choice (literary and informational), revision/editing items, and short constructed responses. Include 2-3 sentence passage excerpts.",
  BIO1: "Biology I (Grade 9 STAAR EOC) strands: Cell Structure and Function, Mechanisms of Genetics, Biological Evolution, Interdependence within Environmental Systems, Matter and Energy in Organisms and Ecosystems. Questions should mirror STAAR format: data interpretation, experimental design, diagram-based questions, and application of biological concepts.",
};

// ── How many extra questions each course needs ─────────────────────────────────

const COURSE_TARGETS = {
  APHG: { target: 70, current: 65 },
  "K-MATH": { target: 70, current: 54 },
  "K-SCI": { target: 70, current: 67 },
  "K-SS": { target: 70, current: 68 },
  "PREK-SCI": { target: 70, current: 68 },
  "PREK-SS": { target: 70, current: 68 },
  GR3ELA: { target: 70, current: 63 },
  GR3MATH: { target: 70, current: 63 },
  GR3SCI: { target: 70, current: 63 },
  GR3SS: { target: 70, current: 54 },
  G6TECH: { target: 70, current: 54 },
  G7TECH: { target: 70, current: 54 },
  SPA2: { target: 70, current: 63 },
  "G1-SS": { target: 50, current: 31 },
  ENG1: { target: 140, current: 96 },
  BIO1: { target: 140, current: 96 },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getChoiceCount(gradeLevel) {
  const gl = String(gradeLevel).toLowerCase();
  if (["pre-k", "prek", "kindergarten", "k", "1", "2"].includes(gl)) return 3;
  return 4;
}

function isYoungLearner(gradeLevel) {
  const gl = String(gradeLevel).toLowerCase();
  return ["pre-k", "prek", "kindergarten", "k", "1", "2"].includes(gl);
}

async function generateQuestionsForUnit(unit, course, difficulty, count) {
  const choiceCount = getChoiceCount(course.gradeLevel);
  const young = isYoungLearner(course.gradeLevel);
  const strandCtx = STRAND_CONTEXT[course.courseCode] || "";

  const prompt = `Generate ${count} multiple-choice quiz questions for a student assessment.

Course: ${course.title} (Grade ${course.gradeLevel})
Subject: ${course.subject}
Unit: ${unit.title}
Unit description: ${unit.description || unit.title}
Difficulty: ${difficulty}
Number of answer choices: ${choiceCount}

Curriculum context:
${strandCtx}

Style guidelines:
${young
    ? "- Very short sentences (max 12 words per question)\n- Simple, everyday vocabulary\n- Use concrete objects, animals, or familiar situations\n- Encouraging, positive tone\n- Avoid abstract concepts"
    : "- Clear, precise academic language\n- Curriculum-aligned terminology\n- Include data, diagrams described in text, or passage excerpts where appropriate\n- Mirror standardized test format (STAAR/AP) where applicable"
  }

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
- skillTag: 1-3 words, max 20 chars, underscores only (e.g. "cell_division")
- explanation: 1-2 sentences explaining why the answer is correct
- All ${count} items required
- Return ONLY the JSON array, nothing else`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a curriculum expert and assessment designer. Return only valid JSON arrays with no additional text.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0].message.content.trim();
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function insertQuestions(db, questions, unitId, difficulty) {
  let inserted = 0;
  for (const q of questions) {
    try {
      const rawChoices = q.choices || [];
      const cleanChoices = rawChoices.map((c) => c.replace(/^[A-D]\)\s*/, ""));
      const choicesJson = JSON.stringify(cleanChoices);
      const correctAnswer = (q.correctAnswer || "A").toUpperCase().charAt(0);
      const skillTag = (q.skillTag || "general")
        .replace(/\s+/g, "_")
        .substring(0, 20);

      await db.execute(
        `INSERT INTO quizQuestions
          (unitId, questionText, questionType, choices,
           correctAnswer, explanation, difficulty, skillTag)
         VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?)`,
        [
          unitId,
          q.questionText,
          choicesJson,
          correctAnswer,
          q.explanation || "",
          difficulty,
          skillTag,
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`  INSERT error: ${err.message}`);
    }
  }
  return inserted;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Phase 4D — Thin Course Second Pass ===");
  console.log(`Targeting ${Object.keys(COURSE_TARGETS).length} thin courses\n`);

  const courseCodes = Object.keys(COURSE_TARGETS);

  const db = await mysql.createConnection(DATABASE_URL);

  const [courses] = await db.execute(
    `SELECT c.id, c.courseCode, c.title, c.gradeLevel, c.subject,
            COUNT(q.id) as currentCount
     FROM courses c
     LEFT JOIN units u ON u.courseId = c.id
     LEFT JOIN quizQuestions q ON q.unitId = u.id
     WHERE c.courseCode IN (${courseCodes.map(() => "?").join(",")})
     GROUP BY c.id, c.courseCode, c.title, c.gradeLevel, c.subject`,
    courseCodes
  );

  const [allUnits] = await db.execute(
    `SELECT u.id, u.courseId, u.title, u.unitNumber
     FROM units u
     WHERE u.courseId IN (
       SELECT id FROM courses WHERE courseCode IN (${courseCodes.map(() => "?").join(",")})
     )
     ORDER BY u.courseId, u.unitNumber`,
    courseCodes
  );

  await db.end();

  const unitsByCourse = {};
  for (const unit of allUnits) {
    if (!unitsByCourse[unit.courseId]) unitsByCourse[unit.courseId] = [];
    unitsByCourse[unit.courseId].push(unit);
  }

  let totalInserted = 0;
  let totalErrors = 0;
  const results = [];

  for (const course of courses) {
    const targetInfo = COURSE_TARGETS[course.courseCode];
    if (!targetInfo) {
      console.log(`⚠ ${course.courseCode}: not in target list, skipping`);
      continue;
    }

    const units = unitsByCourse[course.id] || [];
    if (units.length === 0) {
      console.log(`❌ ${course.courseCode}: no units found, cannot generate`);
      results.push({ code: course.courseCode, title: course.title, status: "no_units", inserted: 0 });
      continue;
    }

    const gap = targetInfo.target - Number(course.currentCount);
    if (gap <= 0) {
      console.log(`✅ ${course.courseCode}: already at target (${course.currentCount}/${targetInfo.target}), skipping`);
      results.push({ code: course.courseCode, title: course.title, status: "already_healthy", inserted: 0 });
      continue;
    }

    console.log(`\n→ ${course.courseCode} (${course.title})`);
    console.log(`  Current: ${course.currentCount} | Target: ${targetInfo.target} | Gap: ${gap}`);
    console.log(`  Units: ${units.length}`);

    // Distribute gap across units evenly, rounding up
    const questionsPerUnit = Math.ceil(gap / units.length);
    // Difficulty distribution for the extra questions
    const diffDist = buildDifficultyDistribution(questionsPerUnit, course.courseCode);

    let courseInserted = 0;
    let courseErrors = 0;

    for (const unit of units) {
      for (const { difficulty, count } of diffDist) {
        if (count === 0) continue;
        try {
          const questions = await generateQuestionsForUnit(unit, course, difficulty, count);
          const batchDb = await mysql.createConnection(DATABASE_URL);
          const inserted = await insertQuestions(batchDb, questions, unit.id, difficulty);
          await batchDb.end();
          courseInserted += inserted;
          process.stdout.write(".");
        } catch (err) {
          process.stdout.write("✗");
          courseErrors++;
          totalErrors++;
          await new Promise((r) => setTimeout(r, 500));
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    console.log(`\n  ✓ ${course.courseCode}: +${courseInserted} questions (${courseErrors} errors)`);
    totalInserted += courseInserted;
    results.push({
      code: course.courseCode,
      title: course.title,
      status: "generated",
      inserted: courseInserted,
      errors: courseErrors,
    });
  }

  console.log(`\n=== Phase 4D Complete ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`\nPer-course summary:`);
  for (const r of results) {
    if (r.status === "generated") {
      console.log(`  ${r.code}: +${r.inserted} (${r.errors || 0} errors)`);
    } else if (r.status === "no_units") {
      console.log(`  ${r.code}: ❌ no units`);
    } else if (r.status === "already_healthy") {
      console.log(`  ${r.code}: ✅ already healthy`);
    }
  }
}

function buildDifficultyDistribution(totalPerUnit, courseCode) {
  // STAAR EOC and AP courses: heavier hard/challenge weighting
  const isAdvanced = ["ENG1", "BIO1", "APHG"].includes(courseCode);
  if (isAdvanced) {
    // 25% easy, 35% medium, 30% hard, 10% challenge
    const easy = Math.max(1, Math.round(totalPerUnit * 0.25));
    const medium = Math.max(1, Math.round(totalPerUnit * 0.35));
    const hard = Math.max(1, Math.round(totalPerUnit * 0.30));
    const challenge = Math.max(0, totalPerUnit - easy - medium - hard);
    return [
      { difficulty: "easy", count: easy },
      { difficulty: "medium", count: medium },
      { difficulty: "hard", count: hard },
      { difficulty: "challenge", count: challenge },
    ];
  }
  // Standard: 35% easy, 40% medium, 20% hard, 5% challenge
  const easy = Math.max(1, Math.round(totalPerUnit * 0.35));
  const medium = Math.max(1, Math.round(totalPerUnit * 0.40));
  const hard = Math.max(1, Math.round(totalPerUnit * 0.20));
  const challenge = Math.max(0, totalPerUnit - easy - medium - hard);
  return [
    { difficulty: "easy", count: easy },
    { difficulty: "medium", count: medium },
    { difficulty: "hard", count: hard },
    { difficulty: "challenge", count: challenge },
  ];
}

main().catch(console.error);
