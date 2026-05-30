import mysql from "mysql2/promise";
const db = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute(
  `SELECT id, courseCode, title FROM courses WHERE title LIKE '%English%' OR title LIKE '%History%' OR courseCode LIKE 'ENG%' OR courseCode LIKE 'USH%' OR courseCode LIKE 'US%' ORDER BY id`
);
rows.forEach(r => console.log(`id=${r.id} code=${r.courseCode} title="${r.title}"`));
await db.end();
