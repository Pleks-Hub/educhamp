import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get sample questions from Grade 3 Math
const [rows] = await conn.execute(`
  SELECT qq.id, qq.questionText, qq.skillTag, qq.difficulty, u.unitNumber, u.title as unitTitle
  FROM quizQuestions qq
  JOIN units u ON u.id = qq.unitId
  WHERE u.courseId = 30006
  ORDER BY u.unitNumber, qq.sortOrder
  LIMIT 20
`);

console.log("\n=== Grade 3 Math Quiz Questions (first 20) ===");
for (const r of rows) {
  console.log(`  Unit ${r.unitNumber} (${r.unitTitle}) [${r.skillTag}] [${r.difficulty}]: "${r.questionText.substring(0, 80)}..."`);
}

// Check the units for Grade 3 Math
const [units] = await conn.execute(`
  SELECT id, unitNumber, title FROM units WHERE courseId = 30006 ORDER BY unitNumber
`);
console.log("\n=== Grade 3 Math Units ===");
for (const u of units) {
  console.log(`  Unit ${u.unitNumber}: ${u.title} (id: ${u.id})`);
}

await conn.end();
