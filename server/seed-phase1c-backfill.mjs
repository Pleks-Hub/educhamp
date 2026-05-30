/**
 * Phase 1C Backfill Migration Script
 *
 * Step 1: Extract TEKS codes from units.teksAlignment free-text → populate unitStandards
 * Step 2: Backfill masteryRecords from existing userMastery rows (TEKS framework, Katy ISD context)
 * Step 3: Produce docs/BACKFILL_GAPS.md listing all narrative-only (isCanonical=false) mappings
 *
 * Mastery threshold: 75 (matches existing userMastery convention)
 * Safe to re-run: all inserts use ON DUPLICATE KEY UPDATE / INSERT IGNORE
 *
 * Run: node server/seed-phase1c-backfill.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = await mysql.createConnection(process.env.DATABASE_URL);

const MASTERY_THRESHOLD = 75;

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getId(table, whereCol, whereVal) {
  const [rows] = await db.execute(
    `SELECT id FROM \`${table}\` WHERE \`${whereCol}\` = ? LIMIT 1`,
    [whereVal]
  );
  return rows[0]?.id ?? null;
}

async function upsert(table, data, uniqueKeys) {
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols
    .filter((c) => !uniqueKeys.includes(c))
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(", ");
  const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates || "`id` = `id`"}`;
  const [result] = await db.execute(sql, vals);
  return result.insertId || null;
}

// ─── TEKS code extraction ─────────────────────────────────────────────────────
/**
 * Patterns we can extract from teksAlignment strings:
 *   "TEKS 111.5(b)(2)" → raw TEKS code
 *   "A.5(A)" or "A.10(E)" → Algebra I short codes
 *   "A.2(A), A.2(B)" → multiple codes
 *   Narrative only → return null (will be slugged)
 */
function extractTeksCodesFromText(text) {
  if (!text) return { codes: [], isNarrativeOnly: true };

  const codes = new Set();

  // Pattern 1: explicit short codes like A.5(A), A.10(E), A.2(B)
  const shortCodeRegex = /\bA\.\d{1,2}\([A-Za-z]\)/g;
  const shortMatches = text.match(shortCodeRegex) || [];
  shortMatches.forEach((c) => codes.add(c));

  // Pattern 2: TEKS 111.X(b)(Y) style
  const longCodeRegex = /TEKS\s+\d+\.\d+\([a-z]\)\(\d+\)/gi;
  const longMatches = text.match(longCodeRegex) || [];
  longMatches.forEach((c) => codes.add(c.replace(/^TEKS\s+/i, "").trim()));

  // Pattern 3: standalone codes like "111.5(b)(2)"
  const standaloneRegex = /\b\d{3}\.\d+\([a-z]\)\(\d+\)/g;
  const standaloneMatches = text.match(standaloneRegex) || [];
  standaloneMatches.forEach((c) => codes.add(c));

  const codeArray = Array.from(codes);
  const isNarrativeOnly = codeArray.length === 0;
  return { codes: codeArray, isNarrativeOnly };
}

/**
 * Convert a narrative teksAlignment string to a stable slug for isCanonical=false standards.
 * Example: "Aligned to TEKS Algebra I — solving linear equations" → "alg1_solving_linear_equations"
 */
function narrativeToSlug(unitTitle, teksAlignment) {
  const base = (teksAlignment || unitTitle || "unknown")
    .toLowerCase()
    .replace(/aligned to teks\s*/i, "")
    .replace(/algebra\s+i\s*[—–-]\s*/i, "alg1_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return base || "unknown_unit";
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: Extract TEKS codes from units.teksAlignment → populate unitStandards
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n═══ STEP 1: Extract teksAlignment → unitStandards ═══");

const teksFrameworkId = await getId("standardFrameworks", "code", "TEKS");
if (!teksFrameworkId) {
  console.error("TEKS framework not found. Run seed-phase1b.mjs first.");
  process.exit(1);
}

// Fetch all units that have a teksAlignment value
const [units] = await db.execute(
  "SELECT id, title, teksAlignment, courseId FROM units WHERE teksAlignment IS NOT NULL AND teksAlignment != '' ORDER BY id"
);

console.log(`Found ${units.length} units with teksAlignment values.`);

const gaps = []; // units that could not be resolved to canonical TEKS codes
let unitStandardsCreated = 0;
let narrativeStandardsCreated = 0;

for (const unit of units) {
  const { codes, isNarrativeOnly } = extractTeksCodesFromText(unit.teksAlignment);

  if (!isNarrativeOnly && codes.length > 0) {
    // Try to match each code to an existing standards row
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      const standardId = await getId("standards", "code", code);
      if (standardId) {
        await upsert(
          "unitStandards",
          { unitId: unit.id, standardId, isPrimary: i === 0 ? 1 : 0 },
          ["unitId", "standardId"]
        );
        unitStandardsCreated++;
      } else {
        // Code extracted but not in standards table yet — log as gap
        gaps.push({
          unitId: unit.id,
          unitTitle: unit.title,
          teksAlignment: unit.teksAlignment,
          extractedCode: code,
          reason: "code_not_in_standards_table",
        });
      }
    }
  } else {
    // Narrative-only: create a placeholder isCanonical=false standard
    const slug = narrativeToSlug(unit.title, unit.teksAlignment);
    const placeholderCode = `SLUG_${slug}`.slice(0, 64);

    // Check if this placeholder already exists
    let stdId = await getId("standards", "code", placeholderCode);
    if (!stdId) {
      await upsert(
        "standards",
        {
          frameworkId: teksFrameworkId,
          code: placeholderCode,
          description: unit.teksAlignment || unit.title,
          gradeLevel: null,
          subject: "math",
          strand: "Narrative Placeholder",
          isCanonical: false,
          isActive: true,
        },
        ["frameworkId", "code"]
      );
      stdId = await getId("standards", "code", placeholderCode);
      narrativeStandardsCreated++;
    }

    if (stdId) {
      await upsert(
        "unitStandards",
        { unitId: unit.id, standardId: stdId, isPrimary: 1 },
        ["unitId", "standardId"]
      );
      unitStandardsCreated++;
    }

    gaps.push({
      unitId: unit.id,
      unitTitle: unit.title,
      teksAlignment: unit.teksAlignment,
      extractedCode: placeholderCode,
      reason: "narrative_only_needs_manual_teks_code",
    });
  }
}

console.log(`  unitStandards rows created/updated: ${unitStandardsCreated}`);
console.log(`  Narrative placeholder standards created: ${narrativeStandardsCreated}`);
console.log(`  Gaps requiring manual review: ${gaps.length}`);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: Backfill masteryRecords from userMastery
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n═══ STEP 2: Backfill masteryRecords from userMastery ═══");

// We need a synthetic "Katy ISD" enrollmentContext for each student×course pair.
// For existing students without a real enrollmentContext, we create a default one
// pointing to TEKS framework (Katy ISD default).

const katyDistrictId = await getId("districts", "ncescode", "4823550");
const txStateId = await getId("states", "code", "TX");

// Get all userMastery rows joined to skills → units
// userMastery columns: id, userId, skillId, score, attemptCount, lastAttemptAt, updatedAt, courseId
const [masteryRows] = await db.execute(`
  SELECT
    um.userId AS studentId,
    um.skillId,
    um.score,
    um.lastAttemptAt AS lastAssessedAt,
    um.courseId,
    s.unitId
  FROM userMastery um
  JOIN skills s ON s.id = um.skillId
  WHERE um.score IS NOT NULL
  ORDER BY um.userId, um.courseId
`);

console.log(`Found ${masteryRows.length} userMastery rows to backfill.`);

// Build a map of studentId × courseId → enrollmentContextId (create if missing)
const ctxCache = new Map();

async function getOrCreateEnrollmentCtx(studentId, courseId) {
  const key = `${studentId}_${courseId}`;
  if (ctxCache.has(key)) return ctxCache.get(key);

  // Check if one already exists
  const [existing] = await db.execute(
    "SELECT id FROM enrollmentContexts WHERE studentId = ? AND courseId = ? AND academicYear = '2025-26' LIMIT 1",
    [studentId, courseId]
  );
  if (existing[0]) {
    ctxCache.set(key, existing[0].id);
    return existing[0].id;
  }

  // Create a default context
  await db.execute(
    `INSERT INTO enrollmentContexts
      (studentId, courseId, districtId, stateId, frameworkId, academicYear, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, '2025-26', 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE id = id`,
    [studentId, courseId, katyDistrictId, txStateId, teksFrameworkId]
  );
  const [created] = await db.execute(
    "SELECT id FROM enrollmentContexts WHERE studentId = ? AND courseId = ? AND academicYear = '2025-26' LIMIT 1",
    [studentId, courseId]
  );
  const ctxId = created[0]?.id ?? null;
  ctxCache.set(key, ctxId);
  return ctxId;
}

let masteryRecordsCreated = 0;
let masteryRecordsSkipped = 0;

for (const row of masteryRows) {
  const enrollmentContextId = await getOrCreateEnrollmentCtx(row.studentId, row.courseId);
  if (!enrollmentContextId) {
    masteryRecordsSkipped++;
    continue;
  }

  // Find the standardId for this unit (prefer isPrimary=1)
  const [stdRows] = await db.execute(
    "SELECT standardId FROM unitStandards WHERE unitId = ? ORDER BY isPrimary DESC LIMIT 3",
    [row.unitId]
  );

  if (stdRows.length === 0) {
    masteryRecordsSkipped++;
    continue;
  }

  // Create one masteryRecord per standard mapped to this unit
  for (const stdRow of stdRows) {
    const isMastered = row.score >= MASTERY_THRESHOLD ? 1 : 0;
    try {
      await db.execute(
        `INSERT INTO masteryRecords
          (studentId, standardId, frameworkId, enrollmentContextId, score, isMastered,
           attemptCount, lastAssessedAt, sourceType, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'backfill', NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           score = IF(VALUES(score) > score, VALUES(score), score),
           isMastered = IF(VALUES(score) > score, VALUES(isMastered), isMastered),
           updatedAt = NOW()`,
        [
          row.studentId,
          stdRow.standardId,
          teksFrameworkId,
          enrollmentContextId,
          row.score,
          isMastered,
          row.lastAssessedAt,
        ]
      );
      masteryRecordsCreated++;
    } catch (e) {
      // Duplicate key on (studentId, objectiveId, enrollmentContextId) — skip
      masteryRecordsSkipped++;
    }
  }
}

console.log(`  masteryRecords created/updated: ${masteryRecordsCreated}`);
console.log(`  Rows skipped (no unitStandards mapping): ${masteryRecordsSkipped}`);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: Write BACKFILL_GAPS.md
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n═══ STEP 3: Writing docs/BACKFILL_GAPS.md ═══");

const docsDir = path.join(__dirname, "../docs");
fs.mkdirSync(docsDir, { recursive: true });

const gapsByReason = gaps.reduce((acc, g) => {
  acc[g.reason] = acc[g.reason] || [];
  acc[g.reason].push(g);
  return acc;
}, {});

const narrativeGaps = gapsByReason["narrative_only_needs_manual_teks_code"] || [];
const missingStdGaps = gapsByReason["code_not_in_standards_table"] || [];

let md = `# EduChamp Phase 1C Backfill Gaps Report

Generated: ${new Date().toISOString()}

## Summary

| Category | Count |
|---|---|
| Units with extracted canonical TEKS codes | ${unitStandardsCreated - narrativeStandardsCreated} |
| Units with narrative-only teksAlignment (need manual TEKS codes) | ${narrativeGaps.length} |
| Extracted codes not yet in standards table | ${missingStdGaps.length} |
| masteryRecords backfilled | ${masteryRecordsCreated} |
| masteryRecords skipped (no mapping) | ${masteryRecordsSkipped} |

## ⚠️ Phase 2 Day 1 Priority: Algebra I Narrative Gaps

All Algebra I units use narrative-only teksAlignment strings. These have been assigned
\`isCanonical = false\` placeholder standards (prefixed \`SLUG_\`). The "am I at par"
diagnostic **cannot work correctly for Algebra I** until these are replaced with real TEKS codes.

**Action required before Phase 2 lesson content injection:**
For each row below, look up the real TEKS code and run:
\`\`\`sql
UPDATE standards SET code = '<REAL_TEKS_CODE>', isCanonical = true
WHERE code = '<SLUG_CODE>';
\`\`\`

### Narrative-Only Units (${narrativeGaps.length} units)

| Unit ID | Unit Title | teksAlignment Text | Placeholder Code |
|---|---|---|---|
${narrativeGaps
  .map(
    (g) =>
      `| ${g.unitId} | ${g.unitTitle?.replace(/\|/g, "\\|") ?? ""} | ${(g.teksAlignment || "").replace(/\|/g, "\\|").slice(0, 80)} | \`${g.extractedCode}\` |`
  )
  .join("\n")}

## Extracted Codes Not Yet in Standards Table (${missingStdGaps.length} units)

These units had extractable TEKS codes but those codes are not yet seeded in the \`standards\` table.
Add them to \`seed-phase1b.mjs\` and re-run.

| Unit ID | Unit Title | Extracted Code |
|---|---|---|
${missingStdGaps
  .map(
    (g) =>
      `| ${g.unitId} | ${g.unitTitle?.replace(/\|/g, "\\|") ?? ""} | \`${g.extractedCode}\` |`
  )
  .join("\n")}

---
*This file is auto-generated by \`server/seed-phase1c-backfill.mjs\`. Re-run after adding standards to update.*
`;

fs.writeFileSync(path.join(docsDir, "BACKFILL_GAPS.md"), md, "utf8");
console.log(`  Written to docs/BACKFILL_GAPS.md`);

// ─── Done ─────────────────────────────────────────────────────────────────────
await db.end();
console.log("\n✅ Phase 1C backfill complete.");
console.log(`   Mastery threshold used: ${MASTERY_THRESHOLD}`);
console.log(`   unitStandards rows: ${unitStandardsCreated}`);
console.log(`   masteryRecords rows: ${masteryRecordsCreated}`);
console.log(`   Gaps report: docs/BACKFILL_GAPS.md`);
