/**
 * check-eng2-ush.mjs — verify ENG2 and USH are active and have content
 */
import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(
  `SELECT 
    c.id, c.course_code, c.title, c.subject, c.grade_level, c.is_active, c.is_default,
    COUNT(DISTINCT u.id) AS unit_count,
    COUNT(DISTINCT q.id) AS question_count
   FROM courses c
   LEFT JOIN units u ON u.course_id = c.id
   LEFT JOIN quiz_questions q ON q.course_id = c.id
   WHERE c.course_code IN ('ENG2', 'USH')
   GROUP BY c.id, c.course_code, c.title, c.subject, c.grade_level, c.is_active, c.is_default`
);

console.log("\n=== ENG2 & USH Course Status ===");
for (const row of rows) {
  const status = row.is_active ? "✅ ACTIVE" : "❌ INACTIVE";
  console.log(`\n${status} [${row.course_code}] ${row.title}`);
  console.log(`  Subject: ${row.subject} | Grade: ${row.grade_level}`);
  console.log(`  Units: ${row.unit_count} | Questions: ${row.question_count}`);
  console.log(`  is_default: ${row.is_default}`);
}

// Also check admin.getPublicCourses equivalent — courses visible to students
const [publicRows] = await conn.execute(
  `SELECT course_code, title, is_active FROM courses WHERE course_code IN ('ENG2', 'USH') AND is_active = 1`
);
console.log(`\n=== Enrollable (is_active=1): ${publicRows.length} courses ===`);
for (const r of publicRows) {
  console.log(`  ✅ ${r.course_code}: ${r.title}`);
}

await conn.end();
console.log("\nDone.");
