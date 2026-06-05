import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`SELECT COUNT(DISTINCT courseId) as cnt FROM assessmentTemplates`);
const [missing] = await conn.execute(`
  SELECT c.id, c.title FROM courses c
  WHERE c.id NOT IN (SELECT DISTINCT courseId FROM assessmentTemplates)
  LIMIT 10
`);
console.log(`Courses with assessment templates: ${rows[0].cnt}`);
console.log("Missing (first 10):");
for (const r of missing) console.log(`  ${r.id}: ${r.title}`);
await conn.end();
