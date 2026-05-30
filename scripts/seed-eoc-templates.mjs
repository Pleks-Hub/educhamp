/**
 * Phase 3A — Seed 4 missing STAAR EOC assessment templates
 * Courses: BIO1, ENG1, ENG2, USH
 * ALG1 template (id=1) already exists.
 */
import mysql from "mysql2/promise";

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Step 1: Get courseIds for the 5 EOC courses
const [courses] = await db.execute(
  `SELECT id, courseCode, title FROM courses WHERE courseCode IN ('ALG1','BIO1','ENG1','ENG2','USH') ORDER BY courseCode`
);
console.log("EOC courses found:", courses.length);
courses.forEach(c => console.log(`  ${c.courseCode} → id=${c.id} (${c.title})`));

// Step 2: Get Texas stateId
const [states] = await db.execute(
  `SELECT id, code FROM states WHERE code = 'TX' LIMIT 1`
);
const txStateId = states[0]?.id ?? null;
console.log(`Texas stateId: ${txStateId}`);

// Step 3: Check existing templates
const [existing] = await db.execute(
  `SELECT assessmentRegime, courseId FROM assessmentTemplates WHERE assessmentRegime LIKE 'staar_%'`
);
const existingKeys = new Set(existing.map(r => `${r.assessmentRegime}:${r.courseId}`));
console.log("Existing STAAR templates:", existing.length);
existing.forEach(r => console.log(`  ${r.assessmentRegime} courseId=${r.courseId}`));

const courseMap = {};
courses.forEach(c => { courseMap[c.courseCode] = c.id; });

// Step 4: Define the 4 missing templates
const diffDist = JSON.stringify({ easy: 0.30, medium: 0.50, hard: 0.20 });
const templates = [
  {
    regime: "staar_eoc",
    code: "BIO1",
    name: "STAAR EOC — Biology",
    itemCount: 54,
    timeLimit: 300,
  },
  {
    regime: "staar_eoc",
    code: "ENG1",
    name: "STAAR EOC — English I",
    itemCount: 54,
    timeLimit: 300,
  },
  {
    regime: "staar_eoc",
    code: "ENG2",
    name: "STAAR EOC — English II",
    itemCount: 54,
    timeLimit: 300,
  },
  {
    regime: "staar_eoc",
    code: "USH",
    name: "STAAR EOC — U.S. History",
    itemCount: 54,
    timeLimit: 300,
  },
];

let inserted = 0;
let skipped = 0;

for (const t of templates) {
  const courseId = courseMap[t.code];
  if (!courseId) {
    console.warn(`  SKIP: course ${t.code} not found in DB`);
    skipped++;
    continue;
  }
  const key = `${t.regime}:${courseId}`;
  if (existingKeys.has(key)) {
    console.log(`  SKIP (already exists): ${t.name}`);
    skipped++;
    continue;
  }
  await db.execute(
    `INSERT INTO assessmentTemplates (stateId, courseId, assessmentRegime, name, itemCount, timeLimitMinutes, difficultyDistribution, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
    [txStateId, courseId, t.regime, t.name, t.itemCount, t.timeLimit, diffDist]
  );
  console.log(`  INSERTED: ${t.name} (courseId=${courseId})`);
  inserted++;
}

// Step 5: Verify final state
const [all] = await db.execute(
  `SELECT at.id, at.assessmentRegime, at.name, at.itemCount, c.courseCode
   FROM assessmentTemplates at
   JOIN courses c ON c.id = at.courseId
   WHERE at.assessmentRegime = 'staar_eoc'
   ORDER BY c.courseCode`
);
console.log(`\nFinal STAAR EOC templates (${all.length}):`);
all.forEach(r => console.log(`  [${r.id}] ${r.name} (${r.courseCode}, ${r.itemCount} items)`));

console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
await db.end();
