/**
 * Phase 4C — Seed TEKS→NY_NGLS crosswalk rows for the 16 previously-uncommitted
 * content-gap standards.
 *
 * These were excluded in Phase 3C because the target NY_NGLS standards did not
 * yet exist in the database. They have now been seeded (seed-phase4c-ny-ngls.mjs).
 *
 * Alignment decisions follow the Phase 3C confidence report methodology:
 *   exact       (1.00) — same concept, same scope, same grade level
 *   partial     (0.75) — same concept, slightly different scope or emphasis
 *   approximate (0.50) — related concept, different framing or depth
 *   none        (0.00) — no meaningful NY equivalent (process standards only)
 *
 * The three process standards (A.1(A), A.1(B), A.1(G)) remain none permanently.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const LOG = '/tmp/phase4c-crosswalk.log';
import { writeFileSync, appendFileSync } from 'fs';
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + '\n');
};

writeFileSync(LOG, '');
log('Phase 4C — crosswalk seeder starting');

// Crosswalk mappings: { teksCode, nyCode, alignmentType, alignmentWeight, notes }
// All target codes must now exist in the standards table (seeded by seed-phase4c-ny-ngls.mjs)
const CROSSWALK_MAPPINGS = [
  // ── Polynomial Operations ──────────────────────────────────────────────────
  // A.10(A) Add/subtract polynomials → AI-A.APR.1 (arithmetic on polynomials)
  {
    teksCode: 'A.10(A)',
    nyCode: 'AI-A.APR.1',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.10(A) add/subtract polynomials maps exactly to NY AI-A.APR.1 arithmetic on polynomials.',
  },
  // A.10(B) Multiply polynomials → AI-A.APR.1 (same standard covers multiply)
  {
    teksCode: 'A.10(B)',
    nyCode: 'AI-A.APR.1',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.10(B) multiply polynomials is covered by NY AI-A.APR.1 (closed under multiplication).',
  },
  // A.10(C) Divide polynomial degree-1 → AI-A.APR.1 (partial — APR.1 focuses on add/sub/mult)
  {
    teksCode: 'A.10(C)',
    nyCode: 'AI-A.APR.1',
    alignmentType: 'partial',
    alignmentWeight: 0.75,
    notes: 'TEKS A.10(C) polynomial division is partially covered by AI-A.APR.1; NY does not emphasize division at Alg I level.',
  },
  // A.10(D) Rewrite polynomial expressions → AI-A.APR.1 + AI-A.SSE.3c
  {
    teksCode: 'A.10(D)',
    nyCode: 'AI-A.SSE.3c',
    alignmentType: 'partial',
    alignmentWeight: 0.75,
    notes: 'TEKS A.10(D) rewriting polynomial expressions aligns with NY AI-A.SSE.3c (equivalent forms to reveal structure).',
  },
  // A.10(E) Factor trinomials → AI-A.APR.3 (identify zeros via factorization)
  {
    teksCode: 'A.10(E)',
    nyCode: 'AI-A.APR.3',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.10(E) factor trinomials maps exactly to NY AI-A.APR.3 (identify zeros via factorization).',
  },
  // A.10(F) Difference of two squares → AI-A.APR.3
  {
    teksCode: 'A.10(F)',
    nyCode: 'AI-A.APR.3',
    alignmentType: 'partial',
    alignmentWeight: 0.75,
    notes: 'TEKS A.10(F) difference of two squares is a specific factoring case covered under NY AI-A.APR.3.',
  },

  // ── Radicals and Exponents ─────────────────────────────────────────────────
  // A.11(A) Simplify numerical radical expressions → AI-N.RN.2
  {
    teksCode: 'A.11(A)',
    nyCode: 'AI-N.RN.2',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.11(A) simplify numerical radicals maps exactly to NY AI-N.RN.2 (rewrite radical expressions using exponent properties).',
  },
  // A.11(B) Laws of exponents → AI-N.RN.2 + AI-A.SSE.3c
  {
    teksCode: 'A.11(B)',
    nyCode: 'AI-N.RN.2',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.11(B) laws of exponents maps exactly to NY AI-N.RN.2 (properties of exponents for radicals and rational exponents).',
  },

  // ── Systems of Equations ───────────────────────────────────────────────────
  // A.3(C) [systems variant] Graph systems → AI-A.REI.10
  {
    teksCode: 'A.3(C)',
    nyCode: 'AI-A.REI.10',
    alignmentType: 'partial',
    alignmentWeight: 0.75,
    notes: 'TEKS A.3(C) systems variant (graph linear functions / identify key features) partially aligns with NY AI-A.REI.10 (graph of equation = set of solutions).',
  },
  // A.3(F) Graph systems of two linear equations → AI-A.REI.6 + AI-A.REI.10
  {
    teksCode: 'A.3(F)',
    nyCode: 'AI-A.REI.6',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.3(F) graph systems of two linear equations maps exactly to NY AI-A.REI.6 (solve systems exactly and approximately, including graphically).',
  },
  // A.5(C) Solve systems algebraically → AI-A.REI.5 + AI-A.REI.6
  {
    teksCode: 'A.5(C)',
    nyCode: 'AI-A.REI.5',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.5(C) solve systems algebraically maps exactly to NY AI-A.REI.5 (elimination method) and AI-A.REI.6 (solve systems exactly).',
  },

  // ── Parallel and Perpendicular Lines ───────────────────────────────────────
  // A.2(E) Write equation of parallel line → AI-G.GPE.5
  {
    teksCode: 'A.2(E)',
    nyCode: 'AI-G.GPE.5',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.2(E) write equation of parallel line maps exactly to NY AI-G.GPE.5 (slope criteria for parallel lines, find equation through a point).',
  },
  // A.2(F) Write equation of perpendicular line → AI-G.GPE.5
  {
    teksCode: 'A.2(F)',
    nyCode: 'AI-G.GPE.5',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.2(F) write equation of perpendicular line maps exactly to NY AI-G.GPE.5 (slope criteria for perpendicular lines, find equation through a point).',
  },

  // ── Correlation Coefficient ────────────────────────────────────────────────
  // A.4(A) [correlation variant] Calculate correlation coefficient → AI-S.ID.8
  {
    teksCode: 'A.4(A)',
    nyCode: 'AI-S.ID.8',
    alignmentType: 'exact',
    alignmentWeight: 1.0,
    notes: 'TEKS A.4(A) correlation variant (calculate correlation coefficient using technology) maps exactly to NY AI-S.ID.8 (compute and interpret correlation coefficient).',
  },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  log(`Connected to database`);

  try {
    // Build lookup maps for TEKS and NY_NGLS standards
    const [teksRows] = await conn.execute(`
      SELECT s.id, s.code FROM standards s
      JOIN standardFrameworks f ON s.frameworkId = f.id
      WHERE f.code = 'TEKS'
    `);
    const [nyRows] = await conn.execute(`
      SELECT s.id, s.code FROM standards s
      JOIN standardFrameworks f ON s.frameworkId = f.id
      WHERE f.code = 'NY_NGLS'
    `);

    // Build maps: code → [ids] (some TEKS codes have duplicates)
    const teksMap = {};
    for (const r of teksRows) {
      if (!teksMap[r.code]) teksMap[r.code] = [];
      teksMap[r.code].push(r.id);
    }
    const nyMap = {};
    for (const r of nyRows) nyMap[r.code] = r.id;

    log(`TEKS standards loaded: ${Object.keys(teksMap).length} unique codes`);
    log(`NY_NGLS standards loaded: ${Object.keys(nyMap).length} codes`);

    // Get existing crosswalk pairs to avoid duplicates
    const [existing] = await conn.execute(`
      SELECT sourceStandardId, targetStandardId FROM standardCrosswalk
    `);
    const existingPairs = new Set(
      existing.map((r) => `${r.sourceStandardId}:${r.targetStandardId}`)
    );
    log(`Existing crosswalk rows: ${existing.length}`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const mapping of CROSSWALK_MAPPINGS) {
      const teksIds = teksMap[mapping.teksCode];
      const nyId = nyMap[mapping.nyCode];

      if (!teksIds || teksIds.length === 0) {
        log(`  ERROR: TEKS code not found: ${mapping.teksCode}`);
        errors++;
        continue;
      }
      if (!nyId) {
        log(`  ERROR: NY_NGLS code not found: ${mapping.nyCode}`);
        errors++;
        continue;
      }

      // Use the first (canonical) TEKS ID if there are duplicates
      const teksId = teksIds[0];
      const pairKey = `${teksId}:${nyId}`;

      if (existingPairs.has(pairKey)) {
        log(`  SKIP (already exists): ${mapping.teksCode} → ${mapping.nyCode}`);
        skipped++;
        continue;
      }

      await conn.execute(
        `INSERT INTO standardCrosswalk 
         (sourceStandardId, targetStandardId, alignmentType, alignmentWeight, alignmentScore, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          teksId,
          nyId,
          mapping.alignmentType,
          mapping.alignmentWeight,
          mapping.alignmentWeight, // alignmentScore mirrors weight for LLM-generated rows
          mapping.notes,
        ]
      );
      existingPairs.add(pairKey);
      log(`  INSERT: ${mapping.teksCode} → ${mapping.nyCode} [${mapping.alignmentType} / ${mapping.alignmentWeight}]`);
      inserted++;
    }

    log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);

    // Final count
    const [total] = await conn.execute(`SELECT COUNT(*) as cnt FROM standardCrosswalk`);
    log(`Total crosswalk rows: ${total[0].cnt}`);

    // Summary by alignment type
    const [summary] = await conn.execute(`
      SELECT alignmentType, COUNT(*) as cnt, AVG(alignmentWeight) as avgWeight
      FROM standardCrosswalk
      GROUP BY alignmentType
      ORDER BY alignmentType
    `);
    log('\nCrosswalk summary:');
    summary.forEach((r) =>
      log(`  ${r.alignmentType}: ${r.cnt} rows, avg weight ${Number(r.avgWeight).toFixed(2)}`)
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
