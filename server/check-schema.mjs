import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();
const db = await createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute('DESCRIBE diagnosticQuestions');
console.log(JSON.stringify(rows, null, 2));
await db.end();
