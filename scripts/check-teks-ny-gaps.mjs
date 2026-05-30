/**
 * check-teks-ny-gaps.mjs
 * Lists TEKS Algebra I standards that have no NY_NGLS crosswalk mapping.
 */
import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [[teksRow]] = await conn.execute("SELECT id FROM standardFrameworks WHERE code = 'TEKS'");
const [[nyRow]] = await conn.execute("SELECT id FROM standardFrameworks WHERE code = 'NY_NGLS'");
const teksId = teksRow.id;
const nyId = nyRow.id;

const [teks] = await conn.execute(
  'SELECT id, code FROM standards WHERE frameworkId = ? ORDER BY code',
  [teksId]
);

const [cw] = await conn.execute(
  `SELECT sc.sourceStandardId, sc.alignmentType
   FROM standardCrosswalk sc
   JOIN standards ts ON ts.id = sc.sourceStandardId
   JOIN standards ns ON ns.id = sc.targetStandardId
   WHERE ts.frameworkId = ? AND ns.frameworkId = ?`,
  [teksId, nyId]
);

const mappedIds = new Set(cw.map((r) => r.sourceStandardId));
const unmapped = teks.filter((t) => !mappedIds.has(t.id));

console.log('=== TEKS → NY_NGLS Gap Analysis ===');
console.log('Total TEKS standards:', teks.length);
console.log('Mapped:', mappedIds.size);
console.log('Unmapped:', unmapped.length);
console.log('\nUnmapped TEKS codes:');
unmapped.forEach((t) => console.log(' ', t.id, t.code));

// Also show current NY_NGLS standards
const [nyStds] = await conn.execute(
  'SELECT id, code, description FROM standards WHERE frameworkId = ? ORDER BY code',
  [nyId]
);
console.log('\nCurrent NY_NGLS standards (' + nyStds.length + ' total):');
nyStds.forEach((s) => console.log(' ', s.code));

await conn.end();
