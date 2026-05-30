/**
 * Phase 4E — Retry script for 2 errored TEKS standards
 * A.6(B) (ids 8 and 44) and A.7(C) (id 11) hit HTTP 429 rate limits.
 * This script retries them with a 5-second delay between calls.
 */

import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
import { writeFileSync, readFileSync } from 'fs';

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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Load all CCSS standards (framework id=3)
const [ccssStandards] = await conn.execute(
  `SELECT id, code, description FROM standards WHERE frameworkId = 3 ORDER BY code`
);
const ccssIndex = ccssStandards.map(s => `${s.code}: ${s.description.substring(0, 100)}`).join('\n');

// Load existing TEKS→CCSS pairs to avoid duplicates
const [existingRows] = await conn.execute(
  `SELECT sc.sourceStandardId, sc.targetStandardId
   FROM standardCrosswalk sc
   JOIN standards src ON src.id = sc.sourceStandardId AND src.frameworkId = 1
   JOIN standards tgt ON tgt.id = sc.targetStandardId AND tgt.frameworkId = 3`
);
const existingPairs = new Set(existingRows.map(r => `${r.sourceStandardId}:${r.targetStandardId}`));
console.log(`Existing TEKS→CCSS rows: ${existingRows.length}`);

// Standards to retry
const toRetry = [
  { id: 8,  code: 'A.6(B)', description: 'Write equations of quadratic functions given the vertex and another point on the graph, write the equation in vertex form f(x) = a(x − h)² + k, and rewrite the equation from vertex form to standard form f(x) = ax² + bx + c.' },
  { id: 44, code: 'A.6(B)', description: 'TEKS §111.39 Algebra I — A.6(B): Write the equation of a parabola using given attributes, including vertex, axis of symmetry, focus, directrix, and direction of opening. (Polynomial operations)' },
  { id: 11, code: 'A.7(C)', description: 'Determine the effects on the graph of the parent function f(x) = x² when f(x) is replaced by af(x), f(x) + d, f(x − c), f(bx) for specific values of a, b, c, and d.' },
];

// Load existing results to append to
const resultsPath = '/home/ubuntu/educhamp/docs/phase4e-crosswalk-results.json';
const results = JSON.parse(readFileSync(resultsPath, 'utf8'));
// Remove old errors for these codes
results.errors = results.errors.filter(e => e.teksCode !== 'A.6(B)' && e.teksCode !== 'A.7(C)');

for (let i = 0; i < toRetry.length; i++) {
  const teks = toRetry[i];
  console.log(`\n[${i+1}/${toRetry.length}] ${teks.code} (id=${teks.id})`);

  if (i > 0) {
    console.log('  Waiting 8 seconds to avoid rate limit...');
    await sleep(8000);
  }

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
      results.approximate.push(row);
      console.log(`  🔶 FLAGGED FOR REVIEW (approximate)`);
    }

  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}`);
    results.errors.push({ teksCode: teks.code, issue: err.message });
  }
}

await conn.end();

// Save updated results
writeFileSync(resultsPath, JSON.stringify(results, null, 2));

console.log('\n=== Retry Complete ===');
console.log(`Exact (auto-committed):    ${results.exact.length}`);
console.log(`Partial (auto-committed):  ${results.partial.length}`);
console.log(`Approximate (for review):  ${results.approximate.length}`);
console.log(`None (excluded):           ${results.none.length}`);
console.log(`Errors remaining:          ${results.errors.length}`);
