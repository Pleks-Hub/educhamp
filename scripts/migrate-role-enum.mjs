import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);

const steps = [
  // Step 1: expand enum to include old + new values so no data is truncated
  `ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum('user','admin','student','parent','teacher') NOT NULL DEFAULT 'user'`,
  // Step 2: map old values to new canonical values
  `UPDATE \`users\` SET \`role\` = 'student' WHERE \`role\` = 'user'`,
  // Step 3: now shrink to final enum (no 'user' value remains)
  `ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum('student','parent','admin','teacher') NOT NULL DEFAULT 'student'`,
];

for (const sql of steps) {
  try {
    const [result] = await conn.execute(sql);
    console.log("OK:", sql.slice(0, 80), "| affected:", result.affectedRows ?? "-");
  } catch (e) {
    console.error("FAIL:", sql.slice(0, 80), "\n  ERR:", e.message);
  }
}

// Verify
const [rows] = await conn.execute("SELECT DISTINCT role, COUNT(*) as cnt FROM users GROUP BY role");
console.log("Final roles:", JSON.stringify(rows));
const [cols] = await conn.execute("SHOW COLUMNS FROM users WHERE Field='role'");
console.log("Column def:", cols[0]?.Type);

await conn.end();
