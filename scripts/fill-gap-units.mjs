/**
 * fill-gap-units.mjs
 * Generates lessons for all units that currently have fewer than 9 lessons,
 * but only for courses that are "partially expanded" (max lessons in any unit >= 7).
 * Uses 3-lesson batches per request to avoid JSON truncation on verbose content.
 */

import mysql from 'mysql2/promise';

const API_URL = process.env.BUILT_IN_FORGE_API_URL;
const API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const TARGET = 9;
const BATCH_SIZE = 3; // lessons per LLM call — small to avoid truncation
const DELAY_MS = 2000; // 2s between calls to respect rate limits
const MAX_RETRIES = 3;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getConnection() {
  return mysql.createConnection(process.env.DATABASE_URL);
}

async function invokeLLM(messages) {
  const res = await fetch(`${API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 16000,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`LLM ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

function gradeLabel(courseCode) {
  if (courseCode.startsWith('PREK')) return 'Pre-Kindergarten';
  if (courseCode.startsWith('K-')) return 'Kindergarten';
  if (courseCode.startsWith('G1-')) return 'Grade 1';
  if (courseCode.startsWith('G2-')) return 'Grade 2';
  if (courseCode.startsWith('GR3') || courseCode.startsWith('G3')) return 'Grade 3';
  if (courseCode.startsWith('G4')) return 'Grade 4';
  if (courseCode.startsWith('G5')) return 'Grade 5';
  if (courseCode.startsWith('G6')) return 'Grade 6';
  if (courseCode.startsWith('G7')) return 'Grade 7';
  if (courseCode.startsWith('G8')) return 'Grade 8';
  if (courseCode.startsWith('ALG1') || courseCode.startsWith('ENG1') || courseCode.startsWith('BIO1')) return 'Grade 9';
  if (courseCode.startsWith('ENG2') || courseCode.startsWith('USH')) return 'Grade 10';
  if (courseCode.startsWith('AP')) return 'Advanced Placement';
  if (courseCode.startsWith('SAT')) return 'SAT Prep';
  if (courseCode.startsWith('SPA')) return 'High School';
  return 'High School';
}

async function generateLessonBatch(courseCode, courseTitle, unitTitle, existingCount, batchNum, batchSize) {
  const grade = gradeLabel(courseCode);
  const startNum = existingCount + (batchNum - 1) * batchSize + 1;
  const endNum = startNum + batchSize - 1;

  const prompt = `You are an expert curriculum designer creating ${grade}-level lessons for the unit "${unitTitle}" in the course "${courseTitle}" (${courseCode}).

Generate exactly ${batchSize} sequential lessons numbered ${startNum} through ${endNum} for this unit.
These lessons continue from the ${existingCount + (batchNum - 1) * batchSize} lessons already written.
Each lesson should build on the previous ones and increase in depth/complexity.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "lessons": [
    {
      "title": "Lesson title",
      "content": "Full explanation (3-5 paragraphs, grade-appropriate, clear and engaging)",
      "workedExamples": [
        {
          "problem": "Example problem statement",
          "steps": ["Step 1 explanation", "Step 2 explanation", "Step 3 explanation"],
          "answer": "Final answer"
        },
        {
          "problem": "Second example problem",
          "steps": ["Step 1", "Step 2"],
          "answer": "Answer"
        }
      ],
      "guidedProblems": [
        {
          "problem": "Guided practice problem",
          "hint1": "First hint",
          "hint2": "More specific hint",
          "answer": "Answer"
        },
        {
          "problem": "Second guided problem",
          "hint1": "Hint",
          "hint2": "Specific hint",
          "answer": "Answer"
        }
      ],
      "independentProblems": [
        { "problem": "Independent practice problem 1", "answer": "Answer 1" },
        { "problem": "Independent practice problem 2", "answer": "Answer 2" }
      ],
      "misconceptions": [
        { "misconception": "Common mistake students make", "correction": "How to correct it" },
        { "misconception": "Another common error", "correction": "Correction" }
      ]
    }
  ]
}

Keep content concise to avoid truncation. Each lesson content should be 2-3 paragraphs maximum.`;

  const raw = await invokeLLM([
    { role: 'system', content: 'You are a curriculum designer. Return only valid JSON, no markdown.' },
    { role: 'user', content: prompt },
  ]);

  const parsed = JSON.parse(raw);
  if (!parsed.lessons || !Array.isArray(parsed.lessons)) throw new Error('No lessons array in response');
  return parsed.lessons;
}

async function insertLessons(conn, unitId, lessons, startOrderIndex) {
  let idx = startOrderIndex;
  for (const lesson of lessons) {
    // Normalize misconceptions: schema expects string[] but LLM returns object[]
    const misconceptions = (lesson.misconceptions || []).map(m =>
      typeof m === 'string' ? m : `${m.misconception}: ${m.correction}`
    );
    // Normalize workedExamples: schema expects {title, problem, steps:[{step,explanation}], answer}
    const workedExamples = (lesson.workedExamples || []).map((we, wi) => ({
      title: we.title || `Example ${wi + 1}`,
      problem: we.problem || '',
      steps: (we.steps || []).map((s, si) =>
        typeof s === 'string' ? { step: `Step ${si + 1}`, explanation: s } : s
      ),
      answer: we.answer || '',
    }));
    // Normalize guidedProblems: schema expects {problem, hint1, hint2, solution, explanation}
    const guidedProblems = (lesson.guidedProblems || []).map(gp => ({
      problem: gp.problem || '',
      hint1: gp.hint1 || '',
      hint2: gp.hint2 || '',
      solution: gp.answer || gp.solution || '',
      explanation: gp.explanation || gp.answer || '',
    }));
    // Normalize independentProblems: schema expects {problem, solution, explanation}
    const independentProblems = (lesson.independentProblems || []).map(ip => ({
      problem: ip.problem || '',
      solution: ip.answer || ip.solution || '',
      explanation: ip.explanation || ip.answer || '',
    }));
    await conn.execute(
      `INSERT INTO lessons (unitId, lessonNumber, title, explanation, workedExamples, guidedProblems, independentProblems, misconceptions, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unitId,
        idx + 1,
        lesson.title,
        lesson.content || lesson.explanation || '',
        JSON.stringify(workedExamples),
        JSON.stringify(guidedProblems),
        JSON.stringify(independentProblems),
        JSON.stringify(misconceptions),
        idx++,
      ]
    );
  }
  return idx;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const conn = await getConnection();

// Find all gap units: courses where max(lessons per unit) >= 7 but some units < 9
const [gapRows] = await conn.execute(`
  SELECT 
    c.courseCode,
    c.title AS courseTitle,
    u.id AS unitId,
    u.title AS unitTitle,
    u.unitNumber,
    COUNT(l.id) AS lessonCount
  FROM courses c
  JOIN units u ON u.courseId = c.id
  LEFT JOIN lessons l ON l.unitId = u.id
  WHERE c.isActive = 1
  GROUP BY c.id, c.courseCode, c.title, u.id, u.title, u.unitNumber
  HAVING COUNT(l.id) < ${TARGET}
  ORDER BY c.courseCode, u.unitNumber
`);

// Get max lessons per course to identify "partially expanded" vs "not started"
const [maxRows] = await conn.execute(`
  SELECT c.courseCode, MAX(lc.cnt) AS maxLessons
  FROM courses c
  JOIN units u ON u.courseId = c.id
  LEFT JOIN (SELECT unitId, COUNT(*) AS cnt FROM lessons GROUP BY unitId) lc ON lc.unitId = u.id
  WHERE c.isActive = 1
  GROUP BY c.courseCode
`);
await conn.end();

const maxByCode = {};
for (const r of maxRows) maxByCode[r.courseCode] = Number(r.maxLessons || 0);

// Filter to only partially expanded courses (max >= 7 means expansion was attempted)
const gapUnits = gapRows.filter(r => maxByCode[r.courseCode] >= 7);

console.log(`Found ${gapUnits.length} gap units across partially expanded courses`);
console.log(`Target: ${TARGET} lessons per unit | Batch size: ${BATCH_SIZE} lessons per LLM call\n`);

let totalInserted = 0;
let successCount = 0;
let failCount = 0;
const failures = [];

for (let i = 0; i < gapUnits.length; i++) {
  const unit = gapUnits[i];
  const existing = Number(unit.lessonCount);
  const needed = TARGET - existing;
  const batches = Math.ceil(needed / BATCH_SIZE);

  console.log(`[${i + 1}/${gapUnits.length}] ${unit.courseCode} U${unit.unitNumber}: "${unit.unitTitle}" (${existing}→${TARGET}, +${needed} in ${batches} batch${batches > 1 ? 'es' : ''})`);

  let currentCount = existing;
  let unitFailed = false;

  for (let b = 1; b <= batches; b++) {
    const thisBatchSize = Math.min(BATCH_SIZE, TARGET - currentCount);
    if (thisBatchSize <= 0) break;

    let attempt = 0;
    let inserted = false;

    while (attempt < MAX_RETRIES && !inserted) {
      attempt++;
      try {
        const lessons = await generateLessonBatch(
          unit.courseCode, unit.courseTitle, unit.unitTitle,
          currentCount, b, thisBatchSize
        );

        const dbConn = await getConnection();
        try {
          // Re-check current count to get correct orderIndex
          const [countRows] = await dbConn.execute(
            'SELECT COUNT(*) AS cnt FROM lessons WHERE unitId = ?', [unit.unitId]
          );
          const currentOrderIndex = Number(countRows[0].cnt);
          await insertLessons(dbConn, unit.unitId, lessons.slice(0, thisBatchSize), currentOrderIndex);
          currentCount += lessons.slice(0, thisBatchSize).length;
          totalInserted += lessons.slice(0, thisBatchSize).length;
        } finally {
          await dbConn.end();
        }

        inserted = true;
        process.stdout.write(`  Batch ${b}/${batches}: +${thisBatchSize} lessons ✅\n`);
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          process.stdout.write(`  Batch ${b} attempt ${attempt} failed: ${err.message.slice(0, 80)} — retrying in 5s...\n`);
          await sleep(5000);
        } else {
          process.stdout.write(`  ❌ Batch ${b} failed after ${MAX_RETRIES} attempts: ${err.message.slice(0, 100)}\n`);
          unitFailed = true;
        }
      }
    }

    if (unitFailed) break;
    if (b < batches) await sleep(DELAY_MS);
  }

  if (!unitFailed && currentCount >= TARGET) {
    successCount++;
    console.log(`  ✅ Unit complete: ${currentCount} lessons total`);
  } else if (unitFailed) {
    failCount++;
    failures.push(`${unit.courseCode} U${unit.unitNumber}: "${unit.unitTitle}"`);
    console.log(`  ⚠️  Unit partially filled: ${currentCount}/${TARGET} lessons`);
  }

  await sleep(DELAY_MS);
}

console.log('\n' + '='.repeat(60));
console.log(`FILL-GAP-UNITS COMPLETE`);
console.log(`  Units processed: ${gapUnits.length}`);
console.log(`  Fully filled:    ${successCount}`);
console.log(`  Still incomplete: ${failCount}`);
console.log(`  Total lessons inserted: ${totalInserted}`);
if (failures.length > 0) {
  console.log('\nRemaining failures:');
  failures.forEach(f => console.log('  - ' + f));
}
