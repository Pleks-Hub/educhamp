import { createConnection } from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await createConnection(url);

const migrations = [
  // diagnosticAttempts.courseId
  `ALTER TABLE diagnosticAttempts ADD COLUMN IF NOT EXISTS courseId INT NOT NULL DEFAULT 1`,
  // diagnosticQuestions.courseId  
  `ALTER TABLE diagnosticQuestions ADD COLUMN IF NOT EXISTS courseId INT NOT NULL DEFAULT 1`,
  // userProfiles.colorPalette
  `ALTER TABLE userProfiles ADD COLUMN IF NOT EXISTS colorPalette VARCHAR(32) DEFAULT 'indigo'`,
  // userProfiles.displayName
  `ALTER TABLE userProfiles ADD COLUMN IF NOT EXISTS displayName VARCHAR(128) DEFAULT NULL`,
];

for (const sql of migrations) {
  try {
    await conn.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("SKIP (already exists):", sql.slice(0, 60));
    } else {
      console.error("FAIL:", e.message, sql.slice(0, 60));
    }
  }
}

await conn.end();
console.log("Migration complete");
