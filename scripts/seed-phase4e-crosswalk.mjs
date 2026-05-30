/**
 * Phase 4E — TEKS → CCSS Crosswalk Seeder
 *
 * Maps all TEKS Algebra I standards to CCSS equivalents.
 * Auto-commits exact and partial rows.
 * Collects approximate and none rows for founder review (does NOT insert them).
 *
 * Alignment types:
 *   exact       — same concept, same scope, same rigor (weight 1.00)
 *   partial     — overlapping concept, minor scope difference (weight 0.75)
 *   approximate — related concept, meaningful scope difference (weight 0.50) — FOUNDER REVIEW REQUIRED
 *   none        — no CCSS equivalent (weight 0.00) — PERMANENTLY EXCLUDED
 *
 * standardCrosswalk columns (confirmed via DESCRIBE):
 *   id, sourceStandardId, targetStandardId, alignmentType, alignmentScore, notes, createdAt, alignmentWeight
 *   (NO sourceFrameworkId or targetFrameworkId columns)
 */

import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';

// Direct Forge API fetch — no TS import needed
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
async function invokeLLM({ messages, response_format }) {
  const body = { messages };
  if (response_format) body.response_format = response_format;
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FORGE_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Load all TEKS Algebra I standards (frameworkId=1)
const [teksStandards] = await conn.execute(
  `SELECT id, code, description FROM standards WHERE frameworkId = 1 AND code LIKE 'A.%' ORDER BY code`
);

// Load all CCSS standards (frameworkId=3)
const [ccssStandards] = await conn.execute(
  `SELECT id, code, description FROM standards WHERE frameworkId = 3 ORDER BY code`
);

// Load already-committed TEKS→CCSS crosswalk rows to avoid duplicates.
// Must JOIN on standards table because there is no targetFrameworkId column.
const [existingRows] = await conn.execute(
  `SELECT sc.sourceStandardId, sc.targetStandardId
   FROM standardCrosswalk sc
   JOIN standards src ON src.id = sc.sourceStandardId AND src.frameworkId = 1
   JOIN standards tgt ON tgt.id = sc.targetStandardId AND tgt.frameworkId = 3`
);
const existingPairs = new Set(existingRows.map(r => `${r.sourceStandardId}:${r.targetStandardId}`));

console.log(`TEKS Algebra I standards: ${teksStandards.length}`);
console.log(`CCSS standards: ${ccssStandards.length}`);
console.log(`Existing TEKS→CCSS crosswalk rows: ${existingRows.length}`);

// Build CCSS lookup string for the LLM
const ccssIndex = ccssStandards.map(s => `${s.code}: ${s.description.substring(0, 100)}`).join('\n');

const results = {
  exact: [],
  partial: [],
  approximate: [],
  none: [],
  errors: [],
};

let processed = 0;

for (const teks of teksStandards) {
  processed++;
  console.log(`\n[${processed}/${teksStandards.length}] ${teks.code}`);

  try {
    const prompt = `You are a curriculum alignment expert. Map this TEKS Algebra I standard to the best matching CCSS standard.

TEKS standard:
Code: ${teks.code}
Description: ${teks.description}

Available CCSS standards:
${ccssIndex}

Respond with JSON only:
{
  "ccssCode": "<exact CCSS code from the list above, or null if no match>",
  "alignmentType": "exact" | "partial" | "approximate" | "none",
  "alignmentWeight": <1.0 for exact, 0.75 for partial, 0.50 for approximate, 0.00 for none>,
  "rationale": "<one sentence explaining the mapping>"
}

Rules:
- exact: same concept, same scope, same rigor
- partial: overlapping concept, minor scope difference  
- approximate: related concept, meaningful scope difference
- none: no CCSS equivalent exists
- If ccssCode is null, alignmentType must be "none"`;

    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a curriculum alignment expert. Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'crosswalk_mapping',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              ccssCode: { type: ['string', 'null'] },
              alignmentType: { type: 'string', enum: ['exact', 'partial', 'approximate', 'none'] },
              alignmentWeight: { type: 'number' },
              rationale: { type: 'string' },
            },
            required: ['ccssCode', 'alignmentType', 'alignmentWeight', 'rationale'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const mapping = typeof content === 'string' ? JSON.parse(content) : content;

    console.log(`  → ${mapping.alignmentType.toUpperCase()} | ${mapping.ccssCode || 'none'} | ${mapping.rationale}`);

    if (mapping.alignmentType === 'none' || !mapping.ccssCode) {
      results.none.push({ teksCode: teks.code, teksId: teks.id, rationale: mapping.rationale });
      continue;
    }

    // Find the CCSS standard row by code
    const ccssRow = ccssStandards.find(s => s.code === mapping.ccssCode);
    if (!ccssRow) {
      console.log(`  ⚠ CCSS code ${mapping.ccssCode} not found in DB — skipping`);
      results.errors.push({ teksCode: teks.code, issue: `CCSS code ${mapping.ccssCode} not in DB` });
      continue;
    }

    const pairKey = `${teks.id}:${ccssRow.id}`;
    if (existingPairs.has(pairKey)) {
      console.log(`  ↳ SKIP (already committed)`);
      continue;
    }

    const row = {
      teksCode: teks.code,
      teksId: teks.id,
      ccssCode: ccssRow.code,
      ccssId: ccssRow.id,
      alignmentType: mapping.alignmentType,
      alignmentWeight: mapping.alignmentWeight,
      rationale: mapping.rationale,
    };

    if (mapping.alignmentType === 'exact' || mapping.alignmentType === 'partial') {
      // Auto-commit exact and partial rows
      // Columns: sourceStandardId, targetStandardId, alignmentType, alignmentWeight, alignmentScore, notes, createdAt
      await conn.execute(
        `INSERT INTO standardCrosswalk
           (sourceStandardId, targetStandardId, alignmentType, alignmentWeight, alignmentScore, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [teks.id, ccssRow.id, mapping.alignmentType, mapping.alignmentWeight, mapping.alignmentWeight, mapping.rationale]
      );
      existingPairs.add(pairKey);
      console.log(`  ✅ COMMITTED ${mapping.alignmentType}`);
      results[mapping.alignmentType].push(row);
    } else {
      // approximate — collect for founder review, do NOT insert
      results.approximate.push(row);
      console.log(`  🔶 FLAGGED FOR REVIEW (approximate)`);
    }

  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}`);
    results.errors.push({ teksCode: teks.code, issue: err.message });
  }
}

await conn.end();

// Write results JSON for report generation
writeFileSync('/home/ubuntu/educhamp/docs/phase4e-crosswalk-results.json', JSON.stringify(results, null, 2));

console.log('\n=== Phase 4E Crosswalk Seeder Complete ===');
console.log(`Exact (auto-committed):    ${results.exact.length}`);
console.log(`Partial (auto-committed):  ${results.partial.length}`);
console.log(`Approximate (for review):  ${results.approximate.length}`);
console.log(`None (excluded):           ${results.none.length}`);
console.log(`Errors:                    ${results.errors.length}`);
console.log(`Results saved to docs/phase4e-crosswalk-results.json`);
