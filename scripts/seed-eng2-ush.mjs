/**
 * Phase 3A — Create stub courses for ENG2 and USH, then seed their STAAR EOC templates.
 * These are STAAR EOC courses that don't yet exist in the DB.
 */
import mysql from "mysql2/promise";

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Get TX stateId
const [states] = await db.execute(`SELECT id FROM states WHERE code = 'TX' LIMIT 1`);
const txStateId = states[0]?.id ?? null;
console.log(`TX stateId: ${txStateId}`);

// Check if courses already exist
const [existing] = await db.execute(
  `SELECT id, courseCode FROM courses WHERE courseCode IN ('ENG2', 'USH')`
);
const existingCodes = new Set(existing.map(r => r.courseCode));
const courseMap = {};
existing.forEach(r => { courseMap[r.courseCode] = r.id; });

// Get the courses table schema to know what columns are required
const [cols] = await db.execute(`DESCRIBE courses`);
const colNames = cols.map(c => c.Field);
console.log("courses columns:", colNames.slice(0, 15).join(", "));

// Create stub courses if missing
const stubCourses = [
  {
    code: "ENG2",
    title: "English II",
    subject: "English Language Arts",
    gradeLevel: "10",
    description: "STAAR EOC English II — Reading and Writing",
  },
  {
    code: "USH",
    title: "U.S. History",
    subject: "Social Studies",
    gradeLevel: "11",
    description: "STAAR EOC U.S. History",
  },
];

for (const c of stubCourses) {
  if (existingCodes.has(c.code)) {
    console.log(`  SKIP (exists): ${c.code}`);
    continue;
  }
  // Insert minimal course row — use only columns we know exist
  const [result] = await db.execute(
    `INSERT INTO courses (courseCode, title, subject, gradeLevel, description, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [c.code, c.title, c.subject, c.gradeLevel, c.description]
  );
  courseMap[c.code] = result.insertId;
  console.log(`  CREATED course: ${c.code} → id=${result.insertId}`);
}

// Seed EOC templates for ENG2 and USH
const diffDist = JSON.stringify({ easy: 0.30, medium: 0.50, hard: 0.20 });
const templates = [
  { code: "ENG2", name: "STAAR EOC — English II", itemCount: 54, timeLimit: 300 },
  { code: "USH",  name: "STAAR EOC — U.S. History", itemCount: 54, timeLimit: 300 },
];

// Check existing templates
const [existingTemplates] = await db.execute(
  `SELECT assessmentRegime, courseId FROM assessmentTemplates WHERE assessmentRegime = 'staar_eoc'`
);
const existingTplKeys = new Set(existingTemplates.map(r => `${r.assessmentRegime}:${r.courseId}`));

let inserted = 0;
for (const t of templates) {
  const courseId = courseMap[t.code];
  if (!courseId) { console.warn(`  SKIP: no courseId for ${t.code}`); continue; }
  const key = `staar_eoc:${courseId}`;
  if (existingTplKeys.has(key)) { console.log(`  SKIP (template exists): ${t.name}`); continue; }
  await db.execute(
    `INSERT INTO assessmentTemplates (stateId, courseId, assessmentRegime, name, itemCount, timeLimitMinutes, difficultyDistribution, isActive, createdAt)
     VALUES (?, ?, 'staar_eoc', ?, ?, ?, ?, 1, NOW())`,
    [txStateId, courseId, t.name, t.itemCount, t.timeLimit, diffDist]
  );
  console.log(`  INSERTED template: ${t.name} (courseId=${courseId})`);
  inserted++;
}

// Final state
const [all] = await db.execute(
  `SELECT at.id, at.name, at.itemCount, c.courseCode
   FROM assessmentTemplates at JOIN courses c ON c.id = at.courseId
   WHERE at.assessmentRegime = 'staar_eoc' ORDER BY c.courseCode`
);
console.log(`\nFinal STAAR EOC templates (${all.length}):`);
all.forEach(r => console.log(`  [${r.id}] ${r.name} (${r.courseCode}, ${r.itemCount} items)`));

await db.end();
