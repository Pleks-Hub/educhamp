import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT at.courseId, c.title FROM assessmentTemplates at
  JOIN courses c ON c.id = at.courseId
  GROUP BY at.courseId, c.title
`);
console.log("Courses WITH assessment templates:");
for (const r of rows) console.log(`  ${r.courseId}: ${r.title}`);
await conn.end();
