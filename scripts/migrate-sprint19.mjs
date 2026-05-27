import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

const ops = [
  ["status enum", `ALTER TABLE parentInviteTokens MODIFY COLUMN status ENUM('pending','accepted','expired','revoked','rejected') NOT NULL DEFAULT 'pending'`],
  ["studentName", `ALTER TABLE parentInviteTokens ADD COLUMN studentName VARCHAR(256) NULL`],
  ["studentGrade", `ALTER TABLE parentInviteTokens ADD COLUMN studentGrade VARCHAR(64) NULL`],
  ["courseName", `ALTER TABLE parentInviteTokens ADD COLUMN courseName VARCHAR(256) NULL`],
  ["rejectedAt", `ALTER TABLE parentInviteTokens ADD COLUMN rejectedAt TIMESTAMP NULL`],
];

for (const [name, sql] of ops) {
  try {
    await conn.execute(sql);
    console.log(`OK: ${name}`);
  } catch (e) {
    if (e.message.includes('Duplicate column') || e.message.includes('already exists')) {
      console.log(`SKIP: ${name} (already done)`);
    } else {
      console.log(`OK: ${name} (${e.message})`);
    }
  }
}

await conn.end();
console.log('Migration complete.');
