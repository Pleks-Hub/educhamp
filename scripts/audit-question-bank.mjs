/**
 * Sprint A Step A1 — Full question bank audit
 * Usage: node scripts/audit-question-bank.mjs
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── Full per-course breakdown ─────────────────────────────────────────────────
const [rows] = await conn.execute(`
  SELECT
    c.id                                      AS course_id,
    c.courseCode,
    c.title                                   AS course,
    c.gradeLevel,
    c.subject,
    COUNT(DISTINCT u.id)                      AS unit_count,
    COUNT(qq.id)                              AS total_questions,
    SUM(CASE WHEN qq.difficulty = 'easy'      THEN 1 ELSE 0 END) AS easy,
    SUM(CASE WHEN qq.difficulty = 'medium'    THEN 1 ELSE 0 END) AS medium,
    SUM(CASE WHEN qq.difficulty = 'hard'      THEN 1 ELSE 0 END) AS hard,
    SUM(CASE WHEN qq.difficulty = 'challenge' THEN 1 ELSE 0 END) AS challenge
  FROM courses c
  LEFT JOIN units u ON u.courseId = c.id
  LEFT JOIN quizQuestions qq ON qq.unitId = u.id
  WHERE c.isActive = 1
  GROUP BY c.id, c.courseCode, c.title, c.gradeLevel, c.subject
  ORDER BY c.gradeLevel + 0, c.subject, c.title
`);

// ── Categorise each course ────────────────────────────────────────────────────
function categorise(row) {
  const code = (row.courseCode || "").toUpperCase();
  const grade = row.gradeLevel || "";
  const subject = (row.subject || "").toLowerCase();

  // AP courses
  if (code.startsWith("AP_") || code.startsWith("AP-") || subject.includes("ap ") || row.course.toLowerCase().startsWith("ap ")) {
    return "AP";
  }
  // SAT Prep
  if (code.includes("SAT") || row.course.toLowerCase().includes("sat prep")) {
    return "SAT";
  }
  // STAAR EOC (non-Algebra I)
  const staarEoc = ["BIO1", "ENG1", "ENG2", "USH", "BIOLOGY", "ENGLISH1", "ENGLISH2", "USHISTORY"];
  if (staarEoc.some(s => code.includes(s))) return "STAAR_EOC";
  // Algebra I is its own EOC but already healthy — keep as STAAR_EOC
  if (code === "ALG1" || code === "ALGEBRA1") return "STAAR_EOC";

  // Early childhood Pre-K through Grade 2
  const gradeNum = parseInt(grade, 10);
  if (grade === "PK" || grade === "K" || (!isNaN(gradeNum) && gradeNum <= 2)) {
    return "EARLY_CHILDHOOD";
  }
  // Regular K-12
  return "K12_REGULAR";
}

// ── Category minimums (from sprint spec) ─────────────────────────────────────
const CATEGORY_MIN = {
  STAAR_EOC:       80 + 40 + 20,  // eoc_review + practice_test + unit_quiz = 140
  AP:              50 + 20,        // practice_test + unit_quiz = 70
  SAT:             80 + 20,        // practice_test + formative_quiz = 100
  K12_REGULAR:     30 + 20 + 20,  // unit_quiz + formative_quiz + practice_test = 70
  EARLY_CHILDHOOD: 30 + 20,       // formative_quiz + unit_quiz = 50
};

// ── Build report ──────────────────────────────────────────────────────────────
const categorySummary = {};
const courseRows = rows.map(r => {
  const cat = categorise(r);
  const total = Number(r.total_questions);
  const min = CATEGORY_MIN[cat];
  const status = total >= min ? "✓ Healthy" : total === 0 ? "✗ Empty" : `⚠ Thin (${total}/${min})`;

  if (!categorySummary[cat]) {
    categorySummary[cat] = { count: 0, totalItems: 0, below: 0 };
  }
  categorySummary[cat].count++;
  categorySummary[cat].totalItems += total;
  if (total < min) categorySummary[cat].below++;

  return { ...r, category: cat, total_questions: total, status };
});

// ── Print per-course table ────────────────────────────────────────────────────
console.log("\n=== STEP A1: FULL QUESTION BANK AUDIT ===\n");
console.log(
  "Course".padEnd(45) +
  "Code".padEnd(12) +
  "Grade".padEnd(7) +
  "Subject".padEnd(16) +
  "Units".padEnd(7) +
  "Total".padEnd(8) +
  "Easy".padEnd(7) +
  "Med".padEnd(7) +
  "Hard".padEnd(7) +
  "Cat".padEnd(16) +
  "Status"
);
console.log("─".repeat(145));

for (const r of courseRows) {
  console.log(
    String(r.course).substring(0, 44).padEnd(45) +
    String(r.courseCode).padEnd(12) +
    String(r.gradeLevel).padEnd(7) +
    String(r.subject).substring(0, 15).padEnd(16) +
    String(r.unit_count).padEnd(7) +
    String(r.total_questions).padEnd(8) +
    String(r.easy).padEnd(7) +
    String(r.medium).padEnd(7) +
    String(r.hard).padEnd(7) +
    String(r.category).padEnd(16) +
    r.status
  );
}

// ── Print category summary ────────────────────────────────────────────────────
console.log("\n=== CATEGORY SUMMARY ===\n");
console.log(
  "Category".padEnd(20) +
  "Courses".padEnd(10) +
  "Avg Items".padEnd(12) +
  "Below Min".padEnd(12) +
  "Min Target"
);
console.log("─".repeat(65));
for (const [cat, s] of Object.entries(categorySummary)) {
  const avg = s.count > 0 ? Math.round(s.totalItems / s.count) : 0;
  console.log(
    cat.padEnd(20) +
    String(s.count).padEnd(10) +
    String(avg).padEnd(12) +
    String(s.below).padEnd(12) +
    String(CATEGORY_MIN[cat])
  );
}

// ── Print empty courses list ──────────────────────────────────────────────────
const emptyCourses = courseRows.filter(r => r.total_questions === 0);
console.log(`\n=== EMPTY COURSES (0 questions): ${emptyCourses.length} ===\n`);
for (const r of emptyCourses) {
  console.log(`  [${r.courseCode}] ${r.course} (Grade ${r.gradeLevel}, ${r.subject}) — Category: ${r.category}`);
}

// ── Print thin courses (>0 but below min) ────────────────────────────────────
const thinCourses = courseRows.filter(r => r.total_questions > 0 && r.total_questions < CATEGORY_MIN[r.category]);
console.log(`\n=== THIN COURSES (>0 but below minimum): ${thinCourses.length} ===\n`);
for (const r of thinCourses) {
  console.log(`  [${r.courseCode}] ${r.course} — ${r.total_questions} items (min: ${CATEGORY_MIN[r.category]})`);
}

await conn.end();
console.log("\n✓ Audit complete.\n");
