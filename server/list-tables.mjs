import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();
const db = await createConnection(process.env.DATABASE_URL);
const [rows] = await db.execute('SHOW TABLES');
rows.forEach(r => console.log(Object.values(r)[0]));
await db.end();
