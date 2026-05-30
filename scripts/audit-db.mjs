/**
 * audit-db.mjs — Phase 1C pre-flight audit
 * Run: node scripts/audit-db.mjs
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) {
  // Try reading from the webdev env
  console.error("DATABASE_URL not set — loading from webdev env");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const tables = [
  "courses",
  "units",
  "skills",
  "userMastery",
  "users",
  "userProfiles",
  "standardFrameworks",
  "standards",
  "unitStandards",
  "enrollmentContexts",
  "masteryRecords",
  "districts",
  "parentChildren",
];

console.log("\n=== Phase 1C DB Audit ===\n");
for (const t of tables) {
  const [[row]] = await conn.execute(`SELECT COUNT(*) AS cnt FROM \`${t}\``);
  console.log(`  ${t.padEnd(24)} ${row.cnt}`);
}

// Sample 5 units with teksAlignment to understand the data
console.log("\n=== Sample units.teksAlignment (first 10) ===\n");
const [units] = await conn.execute(
  `SELECT id, courseId, unitNumber, title, teksAlignment FROM units WHERE teksAlignment IS NOT NULL LIMIT 10`
);
for (const u of units) {
  console.log(`  [${u.id}] Course ${u.courseId} Unit ${u.unitNumber}: ${u.title}`);
  console.log(`       teksAlignment: ${u.teksAlignment}`);
}

// Count units by teksAlignment pattern
console.log("\n=== teksAlignment pattern breakdown ===\n");
const [allUnits] = await conn.execute(
  `SELECT id, courseId, teksAlignment FROM units`
);
let explicit = 0, narrative = 0, nullCount = 0;
for (const u of allUnits) {
  if (!u.teksAlignment) { nullCount++; continue; }
  const hasCode = /TEKS\s+\d+\.\d+/i.test(u.teksAlignment);
  if (hasCode) explicit++;
  else narrative++;
}
console.log(`  Explicit TEKS code (e.g. TEKS 111.5(b)(2)): ${explicit}`);
console.log(`  Narrative-only (e.g. "Aligned to TEKS Algebra I — ..."): ${narrative}`);
console.log(`  NULL teksAlignment: ${nullCount}`);
console.log(`  Total units: ${allUnits.length}`);

// Sample userMastery to understand skillId format
console.log("\n=== Sample userMastery skillIds (first 10 distinct) ===\n");
const [mastery] = await conn.execute(
  `SELECT DISTINCT skillId FROM userMastery LIMIT 10`
);
for (const m of mastery) {
  console.log(`  ${m.skillId}`);
}

// Count distinct users with userMastery rows
const [[umUsers]] = await conn.execute(
  `SELECT COUNT(DISTINCT userId) AS cnt FROM userMastery`
);
console.log(`\n  Distinct users with userMastery rows: ${umUsers.cnt}`);

await conn.end();
console.log("\n=== Audit complete ===\n");
