import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

// Read both migration files
const sql0020 = readFileSync(
  new URL("../drizzle/0020_sloppy_ares.sql", import.meta.url),
  "utf8"
);
// Fix TiDB-incompatible JSON default in the coupons CREATE statement
const sql = sql0020.replace(
  "`applicablePlans` json NOT NULL DEFAULT ('[]'),",
  "`applicablePlans` json,"
);

// Split on Drizzle breakpoints
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const conn = await createConnection(url);

try {
  console.log(`Applying ${statements.length} statements from migration 0020...`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.query(stmt);
      console.log(`  [${i + 1}/${statements.length}] OK`);
    } catch (err) {
      if (
        err.code === "ER_TABLE_EXISTS_ERROR" ||
        err.code === "ER_DUP_KEYNAME" ||
        err.code === "ER_DUP_FIELDNAME"
      ) {
        console.log(`  [${i + 1}/${statements.length}] SKIP (already exists): ${err.sqlMessage}`);
      } else {
        throw err;
      }
    }
  }

  // Record migration in drizzle migrations table
  const hash = createHash("sha256").update(sql).digest("hex");
  try {
    await conn.query(
      "INSERT INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)",
      [hash, Date.now()]
    );
    console.log("Migration recorded in __drizzle_migrations.");
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      console.log("Migration already recorded.");
    } else {
      console.warn("Could not record migration:", err.message);
    }
  }

  console.log("Migration 0020 applied successfully.");
} finally {
  await conn.end();
}
