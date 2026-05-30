/**
 * check-alg1-gaps.mjs
 * Lists Algebra I TEKS standards that have no NY_NGLS crosswalk mapping.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [[teksRow]] = await conn.execute("SELECT id FROM standardFrameworks WHERE code = 'TEKS'");
const [[nyRow]] = await conn.execute("SELECT id FROM standardFrameworks WHERE code = 'NY_NGLS'");
const teksId = teksRow.id;
const nyId = nyRow.id;

// Get only Algebra I TEKS standards (code starts with A.)
const [teks] = await conn.execute(
  "SELECT id, code FROM standards WHERE frameworkId = ? AND code LIKE 'A.%' ORDER BY code",
  [teksId]
);

// Get all TEKS->NY_NGLS crosswalk rows
const [cw] = await conn.execute(
  `SELECT sc.sourceStandardId
   FROM standardCrosswalk sc
   JOIN standards ts ON ts.id = sc.sourceStandardId
   JOIN standards ns ON ns.id = sc.targetStandardId
   WHERE ts.frameworkId = ? AND ns.frameworkId = ?`,
  [teksId, nyId]
);

const mappedSet = new Set();
for (const r of cw) {
  mappedSet.add(r.sourceStandardId);
}

const unmapped = teks.filter((t) => !mappedSet.has(t.id));

console.log('=== Algebra I TEKS → NY_NGLS Gap Analysis ===');
console.log('Total Algebra I TEKS standards:', teks.length);
console.log('Mapped to NY_NGLS:', mappedSet.size);
console.log('Unmapped:', unmapped.length);
console.log('\nUnmapped Algebra I TEKS codes:');
for (const t of unmapped) {
  console.log(`  id=${t.id}  ${t.code}`);
}

await conn.end();
