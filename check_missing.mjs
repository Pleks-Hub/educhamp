import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT c.id, c.title, c.gradeLevel FROM courses c
  WHERE c.id NOT IN (SELECT DISTINCT courseId FROM diagnosticQuestions)
`);
console.log("Courses missing diagnostic questions:");
for (const r of rows) console.log(`  ${r.id}: ${r.title} (${r.gradeLevel})`);
await conn.end();
