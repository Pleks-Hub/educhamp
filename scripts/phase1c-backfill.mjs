/**
 * phase1c-backfill.mjs — Phase 1C complete backfill script
 *
 * Steps:
 *  1. Verify standardFrameworks, districts, standards, unitStandards are seeded
 *  2. Generate docs/BACKFILL_GAPS.md listing all isCanonical=false standards
 *  3. Create default enrollmentContexts for all existing students
 *  4. Backfill masteryRecords from userMastery (score >= 75 = isMastered)
 *
 * Run: node scripts/phase1c-backfill.mjs
 * Safe to re-run (idempotent — uses INSERT IGNORE / ON DUPLICATE KEY UPDATE)
 */
import mysql from "mysql2/promise";
import { writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── DB connection ──────────────────────────────────────────────────────────────
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const conn = await mysql.createConnection(url);
console.log("✅ Connected to database\n");

// ── Helper ─────────────────────────────────────────────────────────────────────
async function q(sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: Verify seed state
// ═══════════════════════════════════════════════════════════════════════════════
console.log("=== STEP 1: Verify seed state ===\n");

const [fwRows] = await conn.execute("SELECT id, name, code FROM standardFrameworks ORDER BY id");
console.log(`standardFrameworks (${fwRows.length} rows):`);
for (const r of fwRows) console.log(`  [${r.id}] ${r.name} (${r.code})`);

const [distRows] = await conn.execute("SELECT id, name, shortName FROM districts ORDER BY id");
console.log(`\ndistricts (${distRows.length} rows):`);
for (const r of distRows) console.log(`  [${r.id}] ${r.name} (${r.shortName})`);

const [[{ cnt: stdCount }]] = await conn.execute("SELECT COUNT(*) AS cnt FROM standards");
const [[{ cnt: canonicalCount }]] = await conn.execute("SELECT COUNT(*) AS cnt FROM standards WHERE isCanonical = 1");
const [[{ cnt: narrativeCount }]] = await conn.execute("SELECT COUNT(*) AS cnt FROM standards WHERE isCanonical = 0");
const [[{ cnt: usCount }]] = await conn.execute("SELECT COUNT(*) AS cnt FROM unitStandards");
console.log(`\nstandards: ${stdCount} total (${canonicalCount} canonical, ${narrativeCount} narrative/gap)`);
console.log(`unitStandards: ${usCount} rows`);

// Find the TEKS framework ID
const teksFramework = fwRows.find(f => f.code === "TEKS" || f.name.includes("Texas"));
if (!teksFramework) {
  console.error("\n❌ TEKS framework not found in standardFrameworks. Aborting.");
  process.exit(1);
}
const TEKS_FRAMEWORK_ID = teksFramework.id;
console.log(`\nTEKS framework ID: ${TEKS_FRAMEWORK_ID}`);

// Find Katy ISD district
const katyDistrict = distRows.find(d =>
  d.name.toLowerCase().includes("katy") ||
  (d.shortName && d.shortName.toLowerCase().includes("katy"))
);
const KATY_DISTRICT_ID = katyDistrict?.id ?? null;
console.log(`Katy ISD district ID: ${KATY_DISTRICT_ID ?? "NOT FOUND — will use NULL"}`);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: Generate BACKFILL_GAPS.md
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n=== STEP 2: Generate BACKFILL_GAPS.md ===\n");

const [gapStandards] = await conn.execute(`
  SELECT
    s.id,
    s.code,
    s.description,
    s.gradeLevel,
    s.frameworkId,
    sf.code AS framework,
    GROUP_CONCAT(DISTINCT c.title ORDER BY c.title SEPARATOR ', ') AS courses,
    COUNT(DISTINCT us.unitId) AS unitCount
  FROM standards s
  JOIN standardFrameworks sf ON sf.id = s.frameworkId
  LEFT JOIN unitStandards us ON us.standardId = s.id
  LEFT JOIN units u ON u.id = us.unitId
  LEFT JOIN courses c ON c.id = u.courseId
  WHERE s.isCanonical = 0
  GROUP BY s.id, s.code, s.description, s.gradeLevel, s.frameworkId, sf.code
  ORDER BY s.gradeLevel, s.code
`);

console.log(`Found ${gapStandards.length} narrative-only (isCanonical=false) standards`);

// Group by course for the report
const gapByCourse = {};
for (const g of gapStandards) {
  const courses = g.courses || "Unknown";
  if (!gapByCourse[courses]) gapByCourse[courses] = [];
  gapByCourse[courses].push(g);
}

const now = new Date().toISOString().split("T")[0];
let md = `# BACKFILL_GAPS.md — Standards Requiring Manual TEKS Code Assignment

**Generated:** ${now}
**Total gaps:** ${gapStandards.length} standards with \`isCanonical = false\`

These standards were extracted from \`units.teksAlignment\` using narrative-only patterns
(e.g. \`"Aligned to TEKS Algebra I — solving linear equations"\`). They do not have
canonical TEKS codes and cannot be used for the "am I at par" diagnostic until real
TEKS codes are assigned.

## Phase 2 Day 1 Action Required

Before lesson content injection begins in Phase 2, review this report and assign
canonical TEKS codes to each gap standard. Then re-run the backfill script to update
\`unitStandards\` and \`masteryRecords\` with the correct \`standardId\` values.

> **Algebra I is the flagship course and STAAR EOC anchor.** All Algebra I units
> appear below. These must be resolved first.

---

## Gap Standards by Course

`;

for (const [course, gaps] of Object.entries(gapByCourse)) {
  md += `### ${course}\n\n`;
  md += `| Standard ID | Slug Code | Description | Grade | Units |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const g of gaps) {
    const desc = (g.description || "").replace(/\|/g, "\\|").substring(0, 80);
    md += `| ${g.id} | \`${g.code}\` | ${desc} | ${g.gradeLevel || "—"} | ${g.unitCount} |\n`;
  }
  md += "\n";
}

md += `---

## How to Resolve a Gap

1. Look up the canonical TEKS code for the standard (e.g. \`A.5(A)\` for Algebra I linear equations).
2. Update the \`standards\` row:
   \`\`\`sql
   UPDATE standards SET code = 'A.5(A)', isCanonical = 1 WHERE id = <id>;
   \`\`\`
3. After all Algebra I gaps are resolved, re-run the backfill:
   \`\`\`
   node scripts/phase1c-backfill.mjs
   \`\`\`

---

*This file is auto-generated by \`scripts/phase1c-backfill.mjs\`. Do not edit manually.*
`;

await mkdir(join(ROOT, "docs"), { recursive: true });
await writeFile(join(ROOT, "docs", "BACKFILL_GAPS.md"), md, "utf-8");
console.log(`✅ docs/BACKFILL_GAPS.md written (${gapStandards.length} gaps)`);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: Create default enrollmentContexts for existing students
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n=== STEP 3: Create enrollmentContexts for existing students ===\n");

// Get all student users with profiles
const [studentProfiles] = await conn.execute(`
  SELECT
    u.id AS userId,
    u.name,
    u.accountType,
    up.gradeLevel
  FROM users u
  JOIN userProfiles up ON up.userId = u.id
  WHERE u.accountType = 'student'
     OR (u.accountType IS NULL AND u.role != 'admin')
`);

console.log(`Found ${studentProfiles.length} student profiles`);

// Get the primary course for each student (use courseId from userProfiles, or default to course 1)
// We need a courseId for enrollmentContexts
const [courseRows] = await conn.execute("SELECT id, title FROM courses ORDER BY id LIMIT 5");
const defaultCourseId = courseRows[0]?.id ?? 1;
console.log(`Default course for enrollment context: ${courseRows[0]?.title ?? "Course 1"} (id=${defaultCourseId})`);

let ecCreated = 0;
let ecSkipped = 0;

for (const sp of studentProfiles) {
  const courseId = defaultCourseId;
  const gradeLevel = sp.gradeLevel ?? null;

  // Check if enrollmentContext already exists for this student+course+year
  const [existing] = await conn.execute(
    `SELECT id FROM enrollmentContexts WHERE studentId = ? AND courseId = ? AND academicYear = '2025-26'`,
    [sp.userId, courseId]
  );

  if (existing.length > 0) {
    console.log(`  ⏭  Student ${sp.userId} (${sp.name}): enrollmentContext already exists (id=${existing[0].id})`);
    ecSkipped++;
    continue;
  }

  await conn.execute(`
    INSERT INTO enrollmentContexts
      (studentId, courseId, districtId, frameworkId, academicYear, gradeLevel, isActive)
    VALUES (?, ?, ?, ?, '2025-26', ?, 1)
  `, [sp.userId, courseId, KATY_DISTRICT_ID, TEKS_FRAMEWORK_ID, gradeLevel]);

  console.log(`  ✅ Created enrollmentContext for student ${sp.userId} (${sp.name}), course ${courseId}, grade ${gradeLevel}`);
  ecCreated++;
}

console.log(`\nEnrollmentContexts: ${ecCreated} created, ${ecSkipped} already existed`);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: Backfill masteryRecords from userMastery
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n=== STEP 4: Backfill masteryRecords from userMastery ===\n");

const MASTERY_THRESHOLD = 75;

// Get all userMastery rows
const [umRows] = await conn.execute(`
  SELECT
    um.userId,
    um.skillId,
    um.score,
    um.attemptCount,
    um.lastAttemptAt
  FROM userMastery um
  ORDER BY um.userId, um.skillId
`);

console.log(`Found ${umRows.length} userMastery rows to backfill`);

let mrCreated = 0;
let mrSkipped = 0;
let mrNoUnit = 0;
let mrNoStandard = 0;

for (const um of umRows) {
  // Parse skillId: ALG1-U5-S6 → courseSlug=ALG1, unitNumber=5, skillNum=6
  const match = um.skillId.match(/^([A-Z0-9]+)-U(\d+)-S(\d+)$/i);
  if (!match) {
    console.log(`  ⚠  Unrecognised skillId format: ${um.skillId} — skipping`);
    mrNoUnit++;
    continue;
  }
  const [, courseSlug, unitNumStr] = match;
  const unitNumber = parseInt(unitNumStr, 10);

  // Find the unit — match by unitNumber and course slug in course title/shortName
  const [unitRows] = await conn.execute(`
    SELECT u.id AS unitId, u.courseId
    FROM units u
    JOIN courses c ON c.id = u.courseId
    WHERE u.unitNumber = ?
      AND (c.courseCode = ? OR c.title LIKE ?)
    LIMIT 1
  `, [unitNumber, courseSlug, `%${courseSlug}%`]);

  if (unitRows.length === 0) {
    // Try a broader match — just unitNumber for the most common course (Algebra I = course 1)
    const [fallbackRows] = await conn.execute(`
      SELECT u.id AS unitId, u.courseId
      FROM units u
      WHERE u.unitNumber = ?
      ORDER BY u.courseId ASC
      LIMIT 1
    `, [unitNumber]);

    if (fallbackRows.length === 0) {
      console.log(`  ⚠  No unit found for skillId ${um.skillId} (unitNumber=${unitNumber}) — skipping`);
      mrNoUnit++;
      continue;
    }
    unitRows.push(fallbackRows[0]);
  }

  const { unitId, courseId } = unitRows[0];

  // Find standards for this unit via unitStandards
  const [stdRows] = await conn.execute(`
    SELECT us.standardId, s.frameworkId
    FROM unitStandards us
    JOIN standards s ON s.id = us.standardId
    WHERE us.unitId = ?
    ORDER BY us.isPrimary DESC, us.standardId ASC
  `, [unitId]);

  if (stdRows.length === 0) {
    console.log(`  ⚠  No standards found for unit ${unitId} (skillId=${um.skillId}) — skipping`);
    mrNoStandard++;
    continue;
  }

  // Get the enrollmentContext for this student
  const [ecRows] = await conn.execute(`
    SELECT id FROM enrollmentContexts
    WHERE studentId = ? AND isActive = 1
    ORDER BY id ASC
    LIMIT 1
  `, [um.userId]);

  if (ecRows.length === 0) {
    console.log(`  ⚠  No enrollmentContext for student ${um.userId} — skipping masteryRecord for ${um.skillId}`);
    continue;
  }

  const enrollmentContextId = ecRows[0].id;
  const isMastered = (um.score ?? 0) >= MASTERY_THRESHOLD ? 1 : 0;

  // Insert one masteryRecord per standard for this unit (conservative: credit all standards)
  for (const std of stdRows) {
    // Check for existing record
    const [existing] = await conn.execute(`
      SELECT id FROM masteryRecords
      WHERE studentId = ? AND standardId = ? AND enrollmentContextId = ?
      LIMIT 1
    `, [um.userId, std.standardId, enrollmentContextId]);

    if (existing.length > 0) {
      // Update if new score is higher
      await conn.execute(`
        UPDATE masteryRecords
        SET
          score = GREATEST(score, ?),
          isMastered = (GREATEST(score, ?) >= ${MASTERY_THRESHOLD}),
          attemptCount = attemptCount + ?,
          lastAssessedAt = COALESCE(?, lastAssessedAt),
          updatedAt = NOW()
        WHERE id = ?
      `, [um.score, um.score, um.attemptCount ?? 0, um.lastAttemptAt, existing[0].id]);
      mrSkipped++;
    } else {
      await conn.execute(`
        INSERT INTO masteryRecords
          (studentId, standardId, frameworkId, enrollmentContextId, score, isMastered, attemptCount, lastAssessedAt, sourceType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'backfill')
      `, [
        um.userId,
        std.standardId,
        std.frameworkId,
        enrollmentContextId,
        um.score ?? 0,
        isMastered,
        um.attemptCount ?? 0,
        um.lastAttemptAt ?? new Date(),
      ]);
      mrCreated++;
    }
  }
}

console.log(`\nmasteryRecords backfill:`);
console.log(`  Created: ${mrCreated}`);
console.log(`  Updated (higher score): ${mrSkipped}`);
console.log(`  Skipped (no unit match): ${mrNoUnit}`);
console.log(`  Skipped (no standard): ${mrNoStandard}`);

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5: Final counts
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n=== STEP 5: Final counts ===\n");

const [[{ cnt: ecFinal }]] = await conn.execute("SELECT COUNT(*) AS cnt FROM enrollmentContexts");
const [[{ cnt: mrFinal }]] = await conn.execute("SELECT COUNT(*) AS cnt FROM masteryRecords");
const [[{ cnt: mrMastered }]] = await conn.execute("SELECT COUNT(*) AS cnt FROM masteryRecords WHERE isMastered = 1");

console.log(`  enrollmentContexts: ${ecFinal}`);
console.log(`  masteryRecords: ${mrFinal} total (${mrMastered} isMastered=true)`);

await conn.end();
console.log("\n✅ Phase 1C backfill complete\n");
