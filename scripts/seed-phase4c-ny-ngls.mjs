/**
 * Phase 4C — Seed missing NY_NGLS Algebra I standards
 *
 * These standards cover the content gaps identified in Phase 3C:
 *   - Polynomial operations (TEKS A.10.x → NY AI-A.APR.x)
 *   - Radicals and exponents (TEKS A.11.x → NY AI-N.RN.x / AI-A.SSE.x)
 *   - Systems of equations (TEKS A.3(C)/A.3(F)/A.5(C) → NY AI-A.REI.C.x)
 *   - Parallel and perpendicular lines (TEKS A.2(E)/A.2(F) → NY AI-G.GPE.x)
 *   - Correlation coefficient (TEKS A.4(A) → NY AI-S.ID.x)
 *
 * NY Next Generation Learning Standards (NY_NGLS) Algebra I codes follow the
 * pattern AI-<domain>.<cluster>.<standard>, mirroring CCSS but with NY
 * revisions.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const LOG = '/tmp/phase4c-ny-ngls.log';
import { writeFileSync, appendFileSync } from 'fs';
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + '\n');
};

writeFileSync(LOG, '');
log('Phase 4C — NY_NGLS standard seeder starting');

// NY_NGLS Algebra I standards to seed
// Each entry: { code, description, gradeLevel, domain }
const NY_NGLS_STANDARDS = [
  // ── Polynomial Operations (A.APR) ──────────────────────────────────────────
  {
    code: 'AI-A.APR.1',
    description:
      'Perform arithmetic operations on polynomials. Understand that polynomials form a system analogous to the integers, namely, they are closed under the operations of addition, subtraction, and multiplication; add, subtract, and multiply polynomials.',
    gradeLevel: '9',
    domain: 'Algebra — Arithmetic with Polynomials and Rational Expressions',
  },
  {
    code: 'AI-A.APR.3',
    description:
      'Identify zeros of polynomials when suitable factorizations are available, and use the zeros to construct a rough graph of the function defined by the polynomial.',
    gradeLevel: '9',
    domain: 'Algebra — Arithmetic with Polynomials and Rational Expressions',
  },

  // ── Radicals and Exponents (N.RN) ──────────────────────────────────────────
  {
    code: 'AI-N.RN.2',
    description:
      'Rewrite expressions involving radicals and rational exponents using the properties of exponents.',
    gradeLevel: '9',
    domain: 'Number and Quantity — The Real Number System',
  },

  // ── Structure in Expressions (A.SSE) ───────────────────────────────────────
  {
    code: 'AI-A.SSE.3c',
    description:
      'Choose and produce an equivalent form of an expression to reveal and explain properties of the quantity represented by the expression. Use the properties of exponents to transform expressions for exponential functions.',
    gradeLevel: '9',
    domain: 'Algebra — Seeing Structure in Expressions',
  },

  // ── Systems of Equations (A.REI.C) ─────────────────────────────────────────
  {
    code: 'AI-A.REI.5',
    description:
      'Prove that, given a system of two equations in two variables, replacing one equation by the sum of that equation and a multiple of the other produces a system with the same solutions.',
    gradeLevel: '9',
    domain: 'Algebra — Reasoning with Equations and Inequalities',
  },
  {
    code: 'AI-A.REI.6',
    description:
      'Solve systems of linear equations exactly and approximately (e.g., with graphs), focusing on pairs of linear equations in two variables.',
    gradeLevel: '9',
    domain: 'Algebra — Reasoning with Equations and Inequalities',
  },
  {
    code: 'AI-A.REI.10',
    description:
      'Understand that the graph of an equation in two variables is the set of all its solutions plotted in the coordinate plane, often forming a curve (which could be a line).',
    gradeLevel: '9',
    domain: 'Algebra — Reasoning with Equations and Inequalities',
  },

  // ── Parallel and Perpendicular Lines (G.GPE) ───────────────────────────────
  {
    code: 'AI-G.GPE.5',
    description:
      'Prove the slope criteria for parallel and perpendicular lines and use them to solve geometric problems (e.g., find the equation of a line parallel or perpendicular to a given line that passes through a given point).',
    gradeLevel: '9',
    domain: 'Geometry — Expressing Geometric Properties with Equations',
  },

  // ── Correlation and Statistics (S.ID) ──────────────────────────────────────
  {
    code: 'AI-S.ID.8',
    description:
      'Compute (using technology) and interpret the correlation coefficient of a linear fit.',
    gradeLevel: '9',
    domain: 'Statistics and Probability — Interpreting Categorical and Quantitative Data',
  },
  {
    code: 'AI-S.ID.9',
    description:
      'Distinguish between correlation and causation.',
    gradeLevel: '9',
    domain: 'Statistics and Probability — Interpreting Categorical and Quantitative Data',
  },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  log(`Connected to database`);

  try {
    // Get NY_NGLS framework ID
    const [fws] = await conn.execute(
      `SELECT id FROM standardFrameworks WHERE code = 'NY_NGLS'`
    );
    if (!fws.length) throw new Error('NY_NGLS framework not found');
    const frameworkId = fws[0].id;
    log(`NY_NGLS framework ID: ${frameworkId}`);

    // Get existing NY_NGLS codes to avoid duplicates
    const [existing] = await conn.execute(
      `SELECT code FROM standards WHERE frameworkId = ?`,
      [frameworkId]
    );
    const existingCodes = new Set(existing.map((r) => r.code));
    log(`Existing NY_NGLS standards: ${existingCodes.size} (${[...existingCodes].join(', ')})`);

    let inserted = 0;
    let skipped = 0;

    for (const std of NY_NGLS_STANDARDS) {
      if (existingCodes.has(std.code)) {
        log(`  SKIP (already exists): ${std.code}`);
        skipped++;
        continue;
      }

      await conn.execute(
        `INSERT INTO standards (frameworkId, code, description, gradeLevel, strand, subject, createdAt)
         VALUES (?, ?, ?, ?, ?, 'math', NOW())`,
        [frameworkId, std.code, std.description, std.gradeLevel, std.domain ?? null]
      );
      log(`  INSERT: ${std.code} — ${std.description.substring(0, 60)}...`);
      inserted++;
    }

    log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);

    // Verify final count
    const [final] = await conn.execute(
      `SELECT code FROM standards WHERE frameworkId = ? ORDER BY code`,
      [frameworkId]
    );
    log(`\nFinal NY_NGLS standards (${final.length} total):`);
    final.forEach((r) => log(`  ${r.code}`));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
