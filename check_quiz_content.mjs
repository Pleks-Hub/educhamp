import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check quiz questions for Grade 3 Math (courseId 30006)
const [g3math] = await conn.execute(`
  SELECT q.id, q.questionText, q.unitId, u.title as unitTitle, u.courseId
  FROM quizQuestions q
  JOIN units u ON u.id = q.unitId
  WHERE u.courseId = 30006
  LIMIT 5
`);
console.log("=== Grade 3 Math Quiz Questions (first 5) ===");
for (const r of g3math) {
  console.log(`  Q${r.id}: "${r.questionText.substring(0, 80)}..." (unit: ${r.unitTitle})`);
}

// Check quiz questions for Grade 3 ELA (courseId 30007)
const [g3ela] = await conn.execute(`
  SELECT q.id, q.questionText, q.unitId, u.title as unitTitle, u.courseId
  FROM quizQuestions q
  JOIN units u ON u.id = q.unitId
  WHERE u.courseId = 30007
  LIMIT 5
`);
console.log("\n=== Grade 3 ELA Quiz Questions (first 5) ===");
for (const r of g3ela) {
  console.log(`  Q${r.id}: "${r.questionText.substring(0, 80)}..." (unit: ${r.unitTitle})`);
}

// Check quiz questions for Grade 3 Science (courseId 30008)
const [g3sci] = await conn.execute(`
  SELECT q.id, q.questionText, q.unitId, u.title as unitTitle, u.courseId
  FROM quizQuestions q
  JOIN units u ON u.id = q.unitId
  WHERE u.courseId = 30008
  LIMIT 5
`);
console.log("\n=== Grade 3 Science Quiz Questions (first 5) ===");
for (const r of g3sci) {
  console.log(`  Q${r.id}: "${r.questionText.substring(0, 80)}..." (unit: ${r.unitTitle})`);
}

await conn.end();
