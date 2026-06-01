import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();
const db = await createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute(`
  SELECT c.id, c.courseCode, c.title,
    COUNT(DISTINCT u.id) as units,
    COUNT(DISTINCT l.id) as lessons,
    COUNT(DISTINCT q.id) as quizQs
  FROM courses c
  LEFT JOIN units u ON u.courseId = c.id
  LEFT JOIN lessons l ON l.unitId = u.id
  LEFT JOIN quizQuestions q ON q.unitId = u.id
  WHERE c.isActive = 1
  GROUP BY c.id ORDER BY c.id
`);
for (const r of rows) {
  const flag = r.lessons === 0 ? "NO_LESSONS" : r.quizQs === 0 ? "NO_QUIZ" : r.lessons < 5 ? "THIN" : "OK";
  console.log(`${flag} [${r.courseCode}] ${r.title}: ${r.units}u / ${r.lessons}l / ${r.quizQs}q`);
}
await db.end();
