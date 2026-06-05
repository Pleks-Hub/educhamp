import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check if multiple units share the same unitNumber across courses
const [rows] = await conn.execute(`
  SELECT unitNumber, COUNT(*) as cnt, GROUP_CONCAT(CONCAT(courseId, ':', title) SEPARATOR ' | ') as courses
  FROM units
  GROUP BY unitNumber
  HAVING COUNT(*) > 1
  ORDER BY unitNumber
  LIMIT 15
`);

console.log("\n=== Unit Numbers shared across multiple courses ===");
for (const r of rows) {
  console.log(`  unitNumber ${r.unitNumber}: ${r.cnt} courses → ${r.courses.substring(0, 120)}`);
}

// Check what getUnitByNumber(1) would return (first match)
const [unit1] = await conn.execute(`
  SELECT id, courseId, unitNumber, title FROM units WHERE unitNumber = 1 ORDER BY id LIMIT 5
`);
console.log("\n=== Units with unitNumber=1 (first 5) ===");
for (const u of unit1) {
  console.log(`  id=${u.id}, courseId=${u.courseId}, title="${u.title}"`);
}

await conn.end();
