import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT courseId, COUNT(*) as cnt FROM diagnosticQuestions GROUP BY courseId ORDER BY courseId LIMIT 20
`);
console.log("=== Diagnostic Questions per Course ===");
for (const r of rows) console.log(`  courseId ${r.courseId}: ${r.cnt} questions`);
await conn.end();
