import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check quiz questions per course
const [rows] = await conn.execute(`
  SELECT c.id as courseId, c.title, c.gradeLevel, COUNT(qq.id) as qCount
  FROM courses c
  LEFT JOIN units u ON u.courseId = c.id
  LEFT JOIN quizQuestions qq ON qq.unitId = u.id
  GROUP BY c.id, c.title, c.gradeLevel
  ORDER BY c.id
`);

console.log("\n=== Quiz Questions per Course ===");
for (const r of rows) {
  console.log(`  Course ${r.courseId}: ${r.title} (${r.gradeLevel}) → ${r.qCount} questions`);
}

// Check if there are any quiz questions with unitId pointing to wrong course
const [sample] = await conn.execute(`
  SELECT qq.id, qq.questionText, qq.skillTag, u.unitNumber, u.courseId, c.title as courseTitle
  FROM quizQuestions qq
  JOIN units u ON u.id = qq.unitId
  JOIN courses c ON c.id = u.courseId
  WHERE c.id != 1
  LIMIT 10
`);

console.log("\n=== Sample Non-Algebra Quiz Questions ===");
for (const r of sample) {
  console.log(`  Q${r.id}: "${r.questionText.substring(0, 60)}..." → Unit ${r.unitNumber} of course "${r.courseTitle}" (skill: ${r.skillTag})`);
}

// Check if Grade 3 courses have questions
const [grade3] = await conn.execute(`
  SELECT c.id as courseId, c.title, COUNT(qq.id) as qCount
  FROM courses c
  LEFT JOIN units u ON u.courseId = c.id
  LEFT JOIN quizQuestions qq ON qq.unitId = u.id
  WHERE c.gradeLevel LIKE '%3%'
  GROUP BY c.id, c.title
`);

console.log("\n=== Grade 3 Courses Quiz Questions ===");
for (const r of grade3) {
  console.log(`  Course ${r.courseId}: ${r.title} → ${r.qCount} questions`);
}

await conn.end();
