import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Simulate what happens when getUnitByNumber(1) is called WITHOUT courseId
const [withoutCourse] = await conn.execute(`
  SELECT id, unitNumber, title, courseId FROM units WHERE unitNumber = 1 ORDER BY id LIMIT 3
`);
console.log("=== getUnitByNumber(1) WITHOUT courseId (first 3 results) ===");
for (const r of withoutCourse) {
  console.log(`  id=${r.id}, course=${r.courseId}, title="${r.title}"`);
}

// Simulate what happens when getUnitByNumber(1, 30006) is called WITH courseId for Grade 3 Math
const [withCourse] = await conn.execute(`
  SELECT id, unitNumber, title, courseId FROM units WHERE unitNumber = 1 AND courseId = 30006 LIMIT 1
`);
console.log("\n=== getUnitByNumber(1, 30006) WITH courseId (Grade 3 Math) ===");
for (const r of withCourse) {
  console.log(`  id=${r.id}, course=${r.courseId}, title="${r.title}"`);
}

// Check quiz questions for that unit
if (withCourse[0]) {
  const [qs] = await conn.execute(`
    SELECT id, questionText FROM quizQuestions WHERE unitId = ? LIMIT 3
  `, [withCourse[0].id]);
  console.log(`\n=== Quiz questions for unit ${withCourse[0].id} (Grade 3 Math, Unit 1) ===`);
  for (const q of qs) {
    console.log(`  Q${q.id}: "${q.questionText.substring(0, 80)}"`);
  }
}

await conn.end();
