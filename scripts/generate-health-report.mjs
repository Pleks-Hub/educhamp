/**
 * Sprint A Step A5 — Post-generation question bank health report
 * Writes docs/QUESTION_BANK_HEALTH.md
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;

function categorise(courseCode, gradeLevel, courseTitle) {
  const code = (courseCode || "").toUpperCase();
  const grade = gradeLevel || "";
  const title = (courseTitle || "").toLowerCase();
  if (code.startsWith("AP") || title.startsWith("ap ")) return "AP";
  if (code.includes("SAT") || title.includes("sat prep")) return "SAT";
  const staarEoc = ["ALG1", "BIO1", "ENG1", "ENG2", "USH"];
  if (staarEoc.includes(code)) return "STAAR_EOC";
  const gradeNum = parseInt(grade, 10);
  if (grade === "PK" || grade === "K" || (!isNaN(gradeNum) && gradeNum <= 2)) return "EARLY_CHILDHOOD";
  return "K12_REGULAR";
}

const MIN_TARGET = { STAAR_EOC: 140, AP: 70, SAT: 100, K12_REGULAR: 70, EARLY_CHILDHOOD: 50 };

const conn = await mysql.createConnection(DB_URL);

// Per-course counts
const [courseRows] = await conn.execute(`
  SELECT c.id, c.courseCode, c.title AS courseTitle, c.gradeLevel, c.subject,
    COUNT(qq.id) AS total,
    SUM(CASE WHEN qq.difficulty = 'easy' THEN 1 ELSE 0 END) AS easy,
    SUM(CASE WHEN qq.difficulty = 'medium' THEN 1 ELSE 0 END) AS medium,
    SUM(CASE WHEN qq.difficulty = 'hard' THEN 1 ELSE 0 END) AS hard,
    SUM(CASE WHEN qq.difficulty = 'challenge' THEN 1 ELSE 0 END) AS challenge
  FROM courses c
  LEFT JOIN units u ON u.courseId = c.id
  LEFT JOIN quizQuestions qq ON qq.unitId = u.id
  WHERE c.isActive = 1
  GROUP BY c.id, c.courseCode, c.title, c.gradeLevel, c.subject
  ORDER BY c.gradeLevel + 0, c.subject, c.title
`);

// Total before/after
const [[totalRow]] = await conn.execute('SELECT COUNT(*) AS t FROM quizQuestions');
await conn.end();

const BEFORE = 3094; // from audit before generation
const AFTER = Number(totalRow.t);
const ADDED = AFTER - BEFORE;

// Categorise and compute health
const categories = {};
for (const row of courseRows) {
  const cat = categorise(row.courseCode, row.gradeLevel, row.courseTitle);
  if (!categories[cat]) categories[cat] = { courses: [], healthy: 0, thin: 0, empty: 0 };
  const target = MIN_TARGET[cat];
  const total = Number(row.total);
  const status = total === 0 ? "empty" : total < target ? "thin" : "healthy";
  categories[cat].courses.push({ ...row, total, cat, target, status });
  categories[cat][status]++;
}

// ── Build markdown ────────────────────────────────────────────────────────────

const now = new Date().toISOString().split("T")[0];
let md = `# Question Bank Health Report\n\n`;
md += `**Generated:** ${now}  \n`;
md += `**Sprint:** Content Sprint A — Post-Generation Audit\n\n`;
md += `---\n\n`;

md += `## Executive Summary\n\n`;
md += `| Metric | Value |\n|---|---|\n`;
md += `| Questions before generation | ${BEFORE.toLocaleString()} |\n`;
md += `| Questions added | +${ADDED.toLocaleString()} |\n`;
md += `| Questions after generation | **${AFTER.toLocaleString()}** |\n`;
md += `| Active courses | ${courseRows.length} |\n`;

let totalHealthy = 0, totalThin = 0, totalEmpty = 0;
for (const cat of Object.values(categories)) {
  totalHealthy += cat.healthy;
  totalThin += cat.thin;
  totalEmpty += cat.empty;
}
md += `| Healthy courses (≥ target) | ${totalHealthy} |\n`;
md += `| Thin courses (< target) | ${totalThin} |\n`;
md += `| Empty courses (0 questions) | ${totalEmpty} |\n\n`;

md += `---\n\n`;
md += `## By Category\n\n`;

const CAT_LABELS = {
  STAAR_EOC: "STAAR EOC",
  AP: "Advanced Placement (AP)",
  SAT: "SAT Prep",
  K12_REGULAR: "K-12 Regular",
  EARLY_CHILDHOOD: "Early Childhood (PK–2)",
};

for (const [catKey, catData] of Object.entries(categories)) {
  const target = MIN_TARGET[catKey];
  const totalInCat = catData.courses.reduce((s, c) => s + c.total, 0);
  const avgPerCourse = Math.round(totalInCat / catData.courses.length);

  md += `### ${CAT_LABELS[catKey] || catKey}\n\n`;
  md += `**Target per course:** ${target} | **Courses:** ${catData.courses.length} | **Avg items:** ${avgPerCourse}\n\n`;
  md += `| Status | Count |\n|---|---|\n`;
  md += `| ✅ Healthy (≥ ${target}) | ${catData.healthy} |\n`;
  md += `| ⚠ Thin (< ${target}) | ${catData.thin} |\n`;
  md += `| ❌ Empty (0) | ${catData.empty} |\n\n`;

  md += `<details>\n<summary>Per-course breakdown (${catData.courses.length} courses)</summary>\n\n`;
  md += `| Course | Grade | Items | Easy | Med | Hard | Status |\n|---|---|---|---|---|---|---|\n`;
  for (const c of catData.courses) {
    const statusIcon = c.status === "healthy" ? "✅" : c.status === "thin" ? "⚠" : "❌";
    md += `| ${c.courseTitle} | ${c.gradeLevel} | ${c.total} | ${c.easy} | ${c.medium} | ${c.hard} | ${statusIcon} |\n`;
  }
  md += `\n</details>\n\n`;
}

md += `---\n\n`;
md += `## Recommended Next Actions\n\n`;

// Find still-thin courses
const stillThin = [];
const stillEmpty = [];
for (const catData of Object.values(categories)) {
  for (const c of catData.courses) {
    if (c.status === "empty") stillEmpty.push(c);
    else if (c.status === "thin") stillThin.push(c);
  }
}

if (stillEmpty.length > 0) {
  md += `### Empty Courses (Priority: High)\n\n`;
  md += `The following courses have zero questions and need immediate attention:\n\n`;
  md += `| Course | Category | Target |\n|---|---|---|\n`;
  for (const c of stillEmpty) {
    md += `| ${c.courseTitle} (${c.courseCode}) | ${CAT_LABELS[c.cat] || c.cat} | ${c.target} |\n`;
  }
  md += `\n`;
}

if (stillThin.length > 0) {
  md += `### Thin Courses (Priority: Medium)\n\n`;
  md += `${stillThin.length} courses are below their minimum target. The most critical are:\n\n`;
  const sorted = [...stillThin].sort((a, b) => (a.total / a.target) - (b.total / b.target));
  md += `| Course | Current | Target | Gap |\n|---|---|---|---|\n`;
  for (const c of sorted.slice(0, 15)) {
    md += `| ${c.courseTitle} (${c.courseCode}) | ${c.total} | ${c.target} | ${c.target - c.total} |\n`;
  }
  if (sorted.length > 15) md += `\n_...and ${sorted.length - 15} more thin courses._\n`;
  md += `\n`;
}

md += `### Difficulty Distribution\n\n`;
md += `Run a second generation pass targeting \`hard\` and \`challenge\` difficulty items for STAAR EOC and AP courses to improve exam-readiness coverage.\n\n`;

md += `---\n\n`;
md += `_Report generated by \`scripts/generate-health-report.mjs\`_\n`;

const docsDir = path.join(__dirname, "../docs");
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, "QUESTION_BANK_HEALTH.md"), md, "utf-8");
console.log(`✓ Written docs/QUESTION_BANK_HEALTH.md`);
console.log(`  Total questions: ${AFTER}`);
console.log(`  Added this sprint: +${ADDED}`);
console.log(`  Healthy: ${totalHealthy} | Thin: ${totalThin} | Empty: ${totalEmpty}`);
