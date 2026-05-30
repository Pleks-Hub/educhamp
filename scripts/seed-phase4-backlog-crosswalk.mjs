/**
 * seed-phase4-backlog-crosswalk.mjs
 *
 * Closes the Phase 4 backlog: maps the 2 remaining unmapped Algebra I TEKS
 * content standards to their NY_NGLS equivalents.
 *
 * Permanently excluded (process standards — no content equivalent):
 *   A.1(A) ×2, A.1(B), A.1(G)
 *
 * Remaining content gaps to map:
 *   A.3(C) — write a system of two linear equations given a verbal description
 *   A.7(A) — graph quadratic functions on the coordinate plane
 *
 * NY_NGLS standards already in DB (from Phase 4C):
 *   AI-A.REI.5  — Prove that, given a system of two equations in two variables...
 *   AI-A.REI.6  — Solve systems of linear equations exactly and approximately...
 *   AI-A.REI.10 — Understand that the graph of an equation in two variables...
 *   AI-F.BF.1   — Write a function that describes a relationship between two quantities
 *
 * Alignment analysis:
 *   A.3(C) → AI-A.REI.6 (partial, 0.75) — TEKS focuses on writing the system from verbal
 *             description; CCSS focuses on solving. Overlapping concept, different emphasis.
 *   A.7(A) → AI-A.REI.10 (partial, 0.75) — TEKS focuses on graphing quadratic functions;
 *             CCSS covers graphing equations in two variables (broader). Real overlap.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [[teksRow]] = await conn.execute("SELECT id FROM standardFrameworks WHERE code = 'TEKS'");
const [[nyRow]] = await conn.execute("SELECT id FROM standardFrameworks WHERE code = 'NY_NGLS'");
const teksId = teksRow.id;
const nyId = nyRow.id;

// Resolve TEKS source standard IDs (use the lower id for duplicates)
const [a3c] = await conn.execute(
  "SELECT id, code FROM standards WHERE frameworkId = ? AND code = 'A.3(C)' ORDER BY id LIMIT 1",
  [teksId]
);
const [a7a] = await conn.execute(
  "SELECT id, code FROM standards WHERE frameworkId = ? AND code = 'A.7(A)' ORDER BY id LIMIT 1",
  [teksId]
);

// Resolve NY_NGLS target standard IDs
const [[nyREI6]] = await conn.execute(
  "SELECT id FROM standards WHERE frameworkId = ? AND code = 'AI-A.REI.6'",
  [nyId]
);
const [[nyREI10]] = await conn.execute(
  "SELECT id FROM standards WHERE frameworkId = ? AND code = 'AI-A.REI.10'",
  [nyId]
);

const mappings = [
  {
    sourceId: a3c[0]?.id,
    targetId: nyREI6?.id,
    sourceCode: 'A.3(C)',
    targetCode: 'AI-A.REI.6',
    alignmentType: 'partial',
    alignmentScore: 0.75,
    alignmentWeight: 0.75,
    notes:
      'A.3(C) focuses on writing a system of two linear equations from a verbal description; AI-A.REI.6 focuses on solving systems. Overlapping concept with different emphasis.',
  },
  {
    sourceId: a7a[0]?.id,
    targetId: nyREI10?.id,
    sourceCode: 'A.7(A)',
    targetCode: 'AI-A.REI.10',
    alignmentType: 'partial',
    alignmentScore: 0.75,
    alignmentWeight: 0.75,
    notes:
      'A.7(A) focuses on graphing quadratic functions on the coordinate plane; AI-A.REI.10 covers graphing equations in two variables (broader scope). Real overlap.',
  },
];

let inserted = 0;
let skipped = 0;

for (const m of mappings) {
  if (!m.sourceId || !m.targetId) {
    console.log(`⚠️  Could not resolve IDs for ${m.sourceCode} → ${m.targetCode}`);
    continue;
  }

  // Check for existing row
  const [existing] = await conn.execute(
    'SELECT id FROM standardCrosswalk WHERE sourceStandardId = ? AND targetStandardId = ?',
    [m.sourceId, m.targetId]
  );

  if (existing.length > 0) {
    console.log(`⏭  Already exists: ${m.sourceCode} → ${m.targetCode}`);
    skipped++;
    continue;
  }

  await conn.execute(
    `INSERT INTO standardCrosswalk
      (sourceStandardId, targetStandardId, alignmentType, alignmentScore, alignmentWeight, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [m.sourceId, m.targetId, m.alignmentType, m.alignmentScore, m.alignmentWeight, m.notes]
  );

  console.log(`✅ Inserted: ${m.sourceCode} → ${m.targetCode} (${m.alignmentType}, weight=${m.alignmentWeight})`);
  inserted++;
}

console.log(`\nDone. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);

// Final count
const [[countRow]] = await conn.execute(
  `SELECT COUNT(*) AS n FROM standardCrosswalk sc
   JOIN standards ts ON ts.id = sc.sourceStandardId
   JOIN standards ns ON ns.id = sc.targetStandardId
   WHERE ts.frameworkId = ? AND ns.frameworkId = ?`,
  [teksId, nyId]
);
console.log(`Total TEKS → NY_NGLS crosswalk rows: ${countRow.n}`);

await conn.end();
