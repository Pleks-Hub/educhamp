/**
 * Phase 4A — Fix TEKS codes in units table
 * Four corrections:
 * 1. ENG2 Unit 6 (Writing Process): ELAR.10.5(A) → ELAR.10.11(A)
 * 2. USH Unit 4 (WWI): USHG.5(A) → USH.5(A)
 * 3. USH Unit 6 (WWII): USHG.8(A) → USH.8(A)
 * 4. USH Unit 9 (Vietnam War): USH.9(C) → USH.10(A)
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const fixes = [
  {
    id: 210006,
    desc: "ENG2 Unit 6 — Writing Process and Composition",
    newCode: "ELAR.10.11(A)",
    newDesc: "ELAR.10.11(A) — plan a first draft by selecting a genre appropriate for a particular purpose and audience and by generating ideas through a range of strategies (e.g., brainstorming, graphic organizers, logs, journals); this is the Composition strand writing process standard (§110.39(b)(11)(A))",
  },
  {
    id: 210016,
    desc: "USH Unit 4 — World War I and the 1920s",
    newCode: "USH.5(A)",
    newDesc: "USH.5(A) — Analyze the causes and effects of World War I on the United States, including the reasons for U.S. entry into the war, the impact of significant individuals, and the Treaty of Versailles.",
  },
  {
    id: 210018,
    desc: "USH Unit 6 — World War II",
    newCode: "USH.8(A)",
    newDesc: "USH.8(A) — Identify reasons for U.S. involvement in World War II, including the attack on Pearl Harbor.",
  },
  {
    id: 210021,
    desc: "USH Unit 9 — Vietnam War and Social Change",
    newCode: "USH.10(A)",
    newDesc: "USH.10(A) — Identify the causes and effects of the Vietnam War, including the domino theory, the Gulf of Tonkin Resolution, the Tet Offensive, and the role of the media.",
  },
];

console.log("Applying TEKS code corrections...\n");

for (const fix of fixes) {
  const [result] = await conn.execute(
    "UPDATE units SET teksAlignment = ? WHERE id = ?",
    [fix.newDesc, fix.id]
  );
  const affected = result.affectedRows;
  console.log(`  ${affected === 1 ? "✓" : "✗"} ${fix.desc}`);
  console.log(`    → ${fix.newCode}`);
}

// Verify
console.log("\nVerification — all ENG2 and USH units:");
const [rows] = await conn.execute(
  "SELECT id, unitNumber, title, teksAlignment FROM units WHERE courseId IN (210001, 210002) ORDER BY courseId, unitNumber"
);
for (const r of rows) {
  const code = r.teksAlignment?.split(" — ")[0] ?? "NULL";
  console.log(`  Unit ${String(r.unitNumber).padStart(2)}: ${r.title.padEnd(45)} → ${code}`);
}

await conn.end();
console.log("\n✓ Done.");
