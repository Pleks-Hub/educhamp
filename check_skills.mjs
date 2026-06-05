import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check if skills with unitNumber=1 span multiple courses
const [rows] = await conn.execute(`
  SELECT s.id, s.skillId, s.skillName, s.unitId, s.unitNumber, u.courseId, c.title as courseTitle
  FROM skills s
  JOIN units u ON u.id = s.unitId
  JOIN courses c ON c.id = u.courseId
  WHERE s.unitNumber = 1
  LIMIT 10
`);
console.log("=== Skills with unitNumber=1 (first 10) ===");
for (const r of rows) {
  console.log(`  ${r.skillId}: "${r.skillName}" → course ${r.courseId} (${r.courseTitle})`);
}
await conn.end();
