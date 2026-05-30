/**
 * Phase 4E — Commit approved approximate TEKS→CCSS crosswalk rows
 *
 * Approved by founder on 2026-05-30:
 *   Row 1: A.1(G) (id=48)  → HSA-REI.A.1 (id=60012)  weight=0.50
 *   Row 2: A.2(A) (id=1)   → HSF-IF.A.1  (id=60020)  weight=0.50
 *   Row 3: A.6(B) (id=44)  → HSF-BF.A.1  (id=60025)  weight=0.50  (duplicate row 4 skipped)
 *   Row 5: A.8(A) (id=18)  → HSS-ID.B.6  (id=60031)  weight=0.50
 *
 * Rationale: at weight 0.50, these are conservative transfers — a student gets half credit
 * for a related concept rather than zero for something with genuine overlap.
 */

import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Load existing TEKS→CCSS pairs to avoid duplicates
const [existingRows] = await conn.execute(
  `SELECT sc.sourceStandardId, sc.targetStandardId
   FROM standardCrosswalk sc
   JOIN standards src ON src.id = sc.sourceStandardId AND src.frameworkId = 1
   JOIN standards tgt ON tgt.id = sc.targetStandardId AND tgt.frameworkId = 3`
);
const existingPairs = new Set(existingRows.map(r => `${r.sourceStandardId}:${r.targetStandardId}`));
console.log(`Existing TEKS→CCSS rows before commit: ${existingRows.length}`);

const toCommit = [
  {
    teksCode: 'A.1(G)', teksId: 48,
    ccssCode: 'HSA-REI.A.1', ccssId: 60012,
    alignmentWeight: 0.50,
    notes: 'A.1(G) is a process standard for mathematical communication; HSA-REI.A.1 (explaining/justifying equation-solving steps) is the closest CCSS match. Approved at weight 0.50.',
  },
  {
    teksCode: 'A.2(A)', teksId: 1,
    ccssCode: 'HSF-IF.A.1', ccssId: 60020,
    alignmentWeight: 0.50,
    notes: 'TEKS A.2(A) addresses domain/range of linear functions in context; CCSS HSF-IF.A.1 covers function notation and domain broadly. Genuine overlap. Approved at weight 0.50.',
  },
  {
    teksCode: 'A.6(B)', teksId: 44,
    ccssCode: 'HSF-BF.A.1', ccssId: 60025,
    alignmentWeight: 0.50,
    notes: 'TEKS A.6(B) (id=44) addresses writing parabola equations from attributes (vertex, axis, focus, directrix); CCSS HSF-BF.A.1 covers writing functions that describe relationships. Approved at weight 0.50.',
  },
  {
    teksCode: 'A.8(A)', teksId: 18,
    ccssCode: 'HSS-ID.B.6', ccssId: 60031,
    alignmentWeight: 0.50,
    notes: 'TEKS A.8(A) focuses on selecting regression models (linear/quadratic/exponential); CCSS HSS-ID.B.6 covers scatter plots and describing relationships. Approved at weight 0.50.',
  },
];

let committed = 0;
let skipped = 0;

for (const row of toCommit) {
  const pairKey = `${row.teksId}:${row.ccssId}`;
  if (existingPairs.has(pairKey)) {
    console.log(`  ↳ SKIP (already committed): ${row.teksCode} → ${row.ccssCode}`);
    skipped++;
    continue;
  }

  await conn.execute(
    `INSERT INTO standardCrosswalk
       (sourceStandardId, targetStandardId, alignmentType, alignmentWeight, alignmentScore, notes, createdAt)
     VALUES (?, ?, 'approximate', ?, ?, ?, NOW())`,
    [row.teksId, row.ccssId, row.alignmentWeight, row.alignmentWeight, row.notes]
  );
  existingPairs.add(pairKey);
  console.log(`  ✅ COMMITTED approximate: ${row.teksCode} (id=${row.teksId}) → ${row.ccssCode} (id=${row.ccssId})`);
  committed++;
}

// Final count
const [[countRow]] = await conn.execute(
  `SELECT COUNT(*) as cnt FROM standardCrosswalk sc
   JOIN standards src ON src.id = sc.sourceStandardId AND src.frameworkId = 1
   JOIN standards tgt ON tgt.id = sc.targetStandardId AND tgt.frameworkId = 3`
);

await conn.end();

console.log(`\n=== Approximate Commit Complete ===`);
console.log(`Committed: ${committed}`);
console.log(`Skipped (duplicates): ${skipped}`);
console.log(`Total TEKS→CCSS rows in DB: ${countRow.cnt}`);
