/**
 * commit-approximate-crosswalk.mjs
 * Commits the 8 approved approximate TEKS → NY_NGLS mappings.
 * Skips the 19 "none" rows per founder instruction.
 * Process standards (A.1(A), A.1(B), A.1(G)) remain permanently none.
 */
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  console.log("=== Committing Approved Approximate Mappings ===\n");

  // Load the crosswalk results JSON
  const jsonPath = path.join(__dirname, "../docs/crosswalk-results.json");
  const results = JSON.parse(await fs.readFile(jsonPath, "utf-8"));

  // Filter: only approximate rows that have a valid nyId
  const approvedApproximate = results.filter(
    (r) => r.alignmentType === "approximate" && r.nyId !== null
  );

  console.log(`Approximate mappings to commit: ${approvedApproximate.length}`);
  console.log("Skipping 'none' rows per founder instruction (DB gaps, not curriculum gaps)\n");

  const db = await mysql.createConnection(DATABASE_URL);
  let inserted = 0;
  let skipped = 0;

  for (const r of approvedApproximate) {
    try {
      const [existing] = await db.execute(
        "SELECT id FROM standardCrosswalk WHERE sourceStandardId = ? AND targetStandardId = ?",
        [r.teksId, r.nyId]
      );
      if (existing.length > 0) {
        console.log(`  ↷ Already exists: ${r.teksCode} → ${r.nyCode}`);
        skipped++;
        continue;
      }
      await db.execute(
        `INSERT INTO standardCrosswalk
          (sourceStandardId, targetStandardId, alignmentType, alignmentWeight, alignmentScore, notes, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [r.teksId, r.nyId, r.alignmentType, r.alignmentWeight, r.alignmentScore, r.reasoning]
      );
      console.log(`  ✓ Inserted: ${r.teksCode} → ${r.nyCode} (weight=${r.alignmentWeight}, score=${r.alignmentScore?.toFixed(2)})`);
      inserted++;
    } catch (err) {
      console.error(`  ✗ Error for ${r.teksCode}: ${err.message}`);
    }
  }

  await db.end();

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Already existed (skipped): ${skipped}`);
  console.log(`Total crosswalk rows now: exact(2) + partial(15) + approximate(${inserted + skipped})`);
}

main().catch(console.error);
