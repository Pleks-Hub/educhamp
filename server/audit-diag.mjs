import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const db = await createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute(`
  SELECT c.id, c.courseCode, c.title, c.subject, COUNT(dq.id) as diagCount
  FROM courses c
  LEFT JOIN diagnosticQuestions dq ON dq.courseId = c.id
  GROUP BY c.id, c.courseCode, c.title, c.subject
  ORDER BY c.id
`);
console.log(JSON.stringify(rows, null, 2));
await db.end();
