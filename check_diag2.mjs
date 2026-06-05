import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`SELECT COUNT(DISTINCT courseId) as cnt FROM diagnosticQuestions`);
const [courses] = await conn.execute(`SELECT COUNT(*) as cnt FROM courses`);
console.log(`Courses with diagnostic questions: ${rows[0].cnt} / ${courses[0].cnt} total courses`);
await conn.end();
