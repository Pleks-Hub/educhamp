/**
 * seed-crosswalk.mjs
 * LLM-assisted TEKS → NY_NGLS standard crosswalk seeder.
 *
 * Strategy:
 *   1. Fetch all TEKS Algebra I standards (Grade 9 math, frameworkId=1)
 *   2. Fetch all NY_NGLS standards (frameworkId=2)
 *   3. For each TEKS standard, ask the LLM to find the best NY match
 *      and assign an alignmentType + alignmentWeight
 *   4. Write results to docs/CROSSWALK_CONFIDENCE_REPORT.md
 *   5. Insert exact + partial mappings immediately
 *   6. Pause for founder review of approximate + none mappings
 *
 * Alignment weights:
 *   exact       → 1.00  (same concept, same grade, same rigor)
 *   partial     → 0.75  (same concept, minor scope difference)
 *   approximate → 0.50  (related concept, different scope/rigor)
 *   none        → 0.00  (no meaningful alignment)
 */
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Use direct Forge API fetch (same pattern as other generation scripts)
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM({ messages }) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_KEY}` },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;

const ALIGNMENT_WEIGHTS = {
  exact: 1.0,
  partial: 0.75,
  approximate: 0.5,
  none: 0.0,
};

async function mapStandardToNY(teksStandard, nyStandards) {
  const nyList = nyStandards
    .map((s) => `  - ${s.code}: ${s.description} [${s.strand}]`)
    .join("\n");

  const prompt = `You are a curriculum alignment expert. Map the following Texas TEKS standard to the best matching New York Next Generation Learning Standard.

TEKS Standard:
  Code: ${teksStandard.code}
  Description: ${teksStandard.description}
  Grade: ${teksStandard.gradeLevel}
  Subject: ${teksStandard.subject}
  Strand: ${teksStandard.strand || "N/A"}

Available NY Standards:
${nyList}

Return ONLY a JSON object (no markdown):
{
  "targetCode": "the NY standard code that best matches, or null if none match",
  "alignmentType": "exact" | "partial" | "approximate" | "none",
  "alignmentScore": 0.0-1.0,
  "reasoning": "one sentence explaining the mapping"
}

Rules:
- exact: same mathematical concept, same grade level, same cognitive demand
- partial: same concept but slightly different scope or emphasis
- approximate: related concept but different scope, rigor, or grade band
- none: no meaningful alignment exists
- If targetCode is null, set alignmentType to "none" and alignmentScore to 0.0`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a curriculum alignment expert. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0].message.content.trim();
  const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

async function main() {
  console.log("=== TEKS → NY_NGLS Crosswalk Seeder ===\n");

  const db = await mysql.createConnection(DATABASE_URL);

  // Fetch TEKS Algebra I standards (Grade 9 math, non-AP)
  const [teksStandards] = await db.execute(`
    SELECT id, code, description, gradeLevel, subject, strand
    FROM standards
    WHERE frameworkId = 1
      AND gradeLevel = '9'
      AND subject = 'math'
      AND code NOT LIKE 'AP.%'
    ORDER BY code
  `);

  // Fetch all NY standards
  const [nyStandards] = await db.execute(`
    SELECT id, code, description, gradeLevel, subject, strand
    FROM standards
    WHERE frameworkId = 2
    ORDER BY code
  `);

  // Build NY lookup by code
  const nyByCode = {};
  for (const s of nyStandards) nyByCode[s.code] = s;

  await db.end();

  console.log(`TEKS Algebra I standards: ${teksStandards.length}`);
  console.log(`NY_NGLS standards: ${nyStandards.length}\n`);

  const results = [];
  let processed = 0;

  for (const teks of teksStandards) {
    try {
      const mapping = await mapStandardToNY(teks, nyStandards);
      const nyStandard = mapping.targetCode ? nyByCode[mapping.targetCode] : null;
      const weight = ALIGNMENT_WEIGHTS[mapping.alignmentType] ?? 0.5;

      results.push({
        teksId: teks.id,
        teksCode: teks.code,
        teksDesc: teks.description,
        nyCode: mapping.targetCode,
        nyId: nyStandard?.id ?? null,
        alignmentType: mapping.alignmentType,
        alignmentWeight: weight,
        alignmentScore: mapping.alignmentScore,
        reasoning: mapping.reasoning,
      });

      processed++;
      if (processed % 5 === 0) {
        process.stdout.write(`  Mapped ${processed}/${teksStandards.length}...\n`);
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ✗ Error mapping ${teks.code}: ${err.message}`);
      results.push({
        teksId: teks.id,
        teksCode: teks.code,
        teksDesc: teks.description,
        nyCode: null,
        nyId: null,
        alignmentType: "none",
        alignmentWeight: 0.0,
        alignmentScore: 0.0,
        reasoning: `Error: ${err.message}`,
      });
    }
  }

  console.log(`\nMapping complete. Generating report...\n`);

  // Group by alignment type
  const byType = { exact: [], partial: [], approximate: [], none: [] };
  for (const r of results) {
    (byType[r.alignmentType] || byType.none).push(r);
  }

  // Generate CROSSWALK_CONFIDENCE_REPORT.md
  let report = `# TEKS → NY_NGLS Crosswalk Confidence Report

Generated: ${new Date().toISOString()}
Source framework: TEKS (Texas Essential Knowledge and Skills) — Algebra I, Grade 9
Target framework: NY_NGLS (New York Next Generation Learning Standards) — Algebra I, Grade 9

## Summary

| Alignment Type | Count | Weight | Auto-commit? |
|---|---|---|---|
| Exact | ${byType.exact.length} | 1.00 | ✓ Yes |
| Partial | ${byType.partial.length} | 0.75 | ✓ Yes |
| Approximate | ${byType.approximate.length} | 0.50 | ⚠ Founder review required |
| None | ${byType.none.length} | 0.00 | ⚠ Founder review required |
| **Total** | **${results.length}** | — | — |

Exact and partial mappings transfer automatically. A partial mapping at 0.75 weight means a student who scored 80 on a TEKS standard gets 60 transferred to the nearest NY equivalent (80 × 0.75 = 60). An approximate mapping at 0.50 is more speculative — review before committing.

---

## ✓ Exact Mappings (auto-commit, weight = 1.00)

| TEKS Code | TEKS Description | NY Code | Reasoning |
|---|---|---|---|
${byType.exact.map((r) => `| ${r.teksCode} | ${r.teksDesc.substring(0, 60)}... | ${r.nyCode || "—"} | ${r.reasoning} |`).join("\n")}

---

## ✓ Partial Mappings (auto-commit, weight = 0.75)

| TEKS Code | TEKS Description | NY Code | Score | Reasoning |
|---|---|---|---|---|
${byType.partial.map((r) => `| ${r.teksCode} | ${r.teksDesc.substring(0, 60)}... | ${r.nyCode || "—"} | ${r.alignmentScore?.toFixed(2)} | ${r.reasoning} |`).join("\n")}

---

## ⚠ Approximate Mappings (FOUNDER REVIEW REQUIRED before commit, weight = 0.50)

These mappings are speculative. A student's mastery score will be multiplied by 0.50 when transferred. Review each one before approving.

| TEKS Code | TEKS Description | NY Code | Score | Reasoning |
|---|---|---|---|---|
${byType.approximate.map((r) => `| ${r.teksCode} | ${r.teksDesc.substring(0, 60)}... | ${r.nyCode || "—"} | ${r.alignmentScore?.toFixed(2)} | ${r.reasoning} |`).join("\n")}

---

## ✗ No Mapping (FOUNDER REVIEW REQUIRED — these standards will not transfer)

| TEKS Code | TEKS Description | Reasoning |
|---|---|---|
${byType.none.map((r) => `| ${r.teksCode} | ${r.teksDesc.substring(0, 60)}... | ${r.reasoning} |`).join("\n")}

---

## Next Steps

1. Review the Approximate and None sections above
2. Reply "approve all" to commit all mappings, or specify which approximate/none rows to exclude
3. After approval, \`transferStudent()\` will use these weights automatically
`;

  const reportPath = path.join(__dirname, "../docs/CROSSWALK_CONFIDENCE_REPORT.md");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, report);
  console.log(`Report written to docs/CROSSWALK_CONFIDENCE_REPORT.md`);

  // Save results to JSON for the commit step
  const jsonPath = path.join(__dirname, "../docs/crosswalk-results.json");
  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Raw results saved to docs/crosswalk-results.json`);

  // Auto-insert exact + partial mappings
  console.log("\nAuto-inserting exact + partial mappings...");
  const autoCommit = results.filter((r) => ["exact", "partial"].includes(r.alignmentType) && r.nyId);

  if (autoCommit.length > 0) {
    const insertDb = await mysql.createConnection(DATABASE_URL);
    let inserted = 0;
    for (const r of autoCommit) {
      try {
        await insertDb.execute(
          `INSERT INTO standardCrosswalk
            (sourceStandardId, targetStandardId, alignmentType, alignmentWeight, alignmentScore, notes, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE alignmentType=VALUES(alignmentType), alignmentWeight=VALUES(alignmentWeight)`,
          [r.teksId, r.nyId, r.alignmentType, r.alignmentWeight, r.alignmentScore, r.reasoning]
        );
        inserted++;
      } catch (err) {
        console.error(`  INSERT error for ${r.teksCode}: ${err.message}`);
      }
    }
    await insertDb.end();
    console.log(`✓ Auto-inserted ${inserted} exact/partial mappings`);
  }

  console.log("\n=== Summary ===");
  console.log(`Exact: ${byType.exact.length} (auto-committed)`);
  console.log(`Partial: ${byType.partial.length} (auto-committed)`);
  console.log(`Approximate: ${byType.approximate.length} (awaiting founder review)`);
  console.log(`None: ${byType.none.length} (awaiting founder review)`);
  console.log("\nReview docs/CROSSWALK_CONFIDENCE_REPORT.md and approve before committing approximate/none mappings.");
}

main().catch(console.error);
