/**
 * scripts/resolve-gaps.mjs
 * Phase 3 — Two-pass gap standards resolution
 *
 * Pass 1: Deterministic regex extraction for standards whose slug already
 *         encodes the TEKS section (e.g. SLUG_teks_4_2 → TEKS 4.2).
 * Pass 2: LLM-assisted matching for truly narrative slugs (AP courses,
 *         SAT Prep, Pre-K–G2, Technology Applications).
 *
 * After both passes, updates standards rows:
 *   code = <canonical code>, isCanonical = 1
 * and regenerates docs/BACKFILL_GAPS.md.
 */

import mysql from "mysql2/promise";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
// Node 22 has native fetch built-in

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── DB connection ─────────────────────────────────────────────────────────────
const db = await mysql.createConnection(process.env.DATABASE_URL);

// ── Fetch all gap standards ───────────────────────────────────────────────────
const [gapRows] = await db.execute(
  `SELECT s.id, s.code, s.description, s.gradeLevel,
          sf.code AS frameworkCode,
          GROUP_CONCAT(DISTINCT c.title ORDER BY c.title SEPARATOR ' | ') AS courses
   FROM standards s
   JOIN standardFrameworks sf ON s.frameworkId = sf.id
   LEFT JOIN unitStandards us ON us.standardId = s.id
   LEFT JOIN units u ON u.id = us.unitId
   LEFT JOIN courses c ON c.id = u.courseId
   WHERE s.isCanonical = 0
   GROUP BY s.id, s.code, s.description, s.gradeLevel, sf.code
   ORDER BY s.id`
);

console.log(`\n📋 Found ${gapRows.length} gap standards to resolve.\n`);

// ── Pass 1: Deterministic regex extraction ────────────────────────────────────
// Patterns:
//   SLUG_teks_4_2         → TEKS 4.2
//   SLUG_teks_4_2_kap     → TEKS 4.2 (KAP variant — same code)
//   SLUG_teks_4_2_4_3     → TEKS 4.2-4.3
//   SLUG_teks_6_1_6_2_6_5 → TEKS 6.1-6.2, 6.5
//   SLUG_teks_tech_4_1    → TEKS 126.14(b)(1) (Technology Applications)
//   SLUG_teks_126_14_b_1  → TEKS 126.14(b)(1)

function extractCanonicalCode(slug) {
  if (!slug || !slug.startsWith("SLUG_teks_")) return null;

  const s = slug.replace(/^SLUG_teks_/, "").replace(/_kap$/, "");

  // Technology Applications: 126_14_b_N → 126.14(b)(N)
  const techMatch = s.match(/^(?:tech_)?(\d+)_(\d+)_b_(\d+)$/);
  if (techMatch) {
    return `TEKS ${techMatch[1]}.${techMatch[2]}(b)(${techMatch[3]})`;
  }

  // Technology Applications shorthand: tech_4_1 → TEKS 126.14(b)(1) for grade 4-6
  const techShort = s.match(/^tech_(\d)_(\d+)$/);
  if (techShort) {
    const grade = parseInt(techShort[1]);
    const section = techShort[2];
    // TEKS 126.14 = Grades 4-6 Technology Applications
    return `TEKS 126.14(b)(${section})`;
  }

  // Multi-section with comma: 6_1_6_2_6_5 → TEKS 6.1-6.2, 6.5
  // Detect pattern: alternating grade_section pairs
  const parts = s.split("_").filter(Boolean);

  // Try to parse as a sequence of grade.section pairs
  const pairs = [];
  let i = 0;
  while (i < parts.length) {
    const grade = parts[i];
    const section = parts[i + 1];
    if (grade && section && /^\d+$/.test(grade) && /^\d+$/.test(section)) {
      pairs.push(`${grade}.${section}`);
      i += 2;
    } else {
      break;
    }
  }

  if (pairs.length === 0) return null;

  if (pairs.length === 1) return `TEKS ${pairs[0]}`;

  // Check if all pairs share the same grade prefix
  const grades = pairs.map((p) => p.split(".")[0]);
  const allSameGrade = grades.every((g) => g === grades[0]);

  if (allSameGrade) {
    const sections = pairs.map((p) => p.split(".")[1]);
    // Consecutive sections → range notation
    const nums = sections.map(Number);
    const isConsecutive = nums.every(
      (n, idx) => idx === 0 || n === nums[idx - 1] + 1
    );
    if (isConsecutive && nums.length > 1) {
      return `TEKS ${grades[0]}.${nums[0]}-${grades[0]}.${nums[nums.length - 1]}`;
    }
    // Non-consecutive → comma list
    return `TEKS ${sections.map((sec) => `${grades[0]}.${sec}`).join(", ")}`;
  }

  // Mixed grades → just join with commas
  return `TEKS ${pairs.join(", ")}`;
}

const pass1Updates = [];
const pass2Queue = [];

for (const row of gapRows) {
  const canonical = extractCanonicalCode(row.code);
  if (canonical) {
    pass1Updates.push({ id: row.id, code: canonical, original: row.code });
  } else {
    pass2Queue.push(row);
  }
}

console.log(
  `✅ Pass 1 (deterministic): ${pass1Updates.length} standards resolved`
);
console.log(
  `🤖 Pass 2 (LLM-assisted): ${pass2Queue.length} standards queued\n`
);

// Apply Pass 1 updates
if (pass1Updates.length > 0) {
  for (const update of pass1Updates) {
    await db.execute(
      `UPDATE standards SET code = ?, isCanonical = 1 WHERE id = ?`,
      [update.code, update.id]
    );
  }
  console.log(`  Applied ${pass1Updates.length} Pass 1 updates to DB.\n`);
}

// ── Pass 2: LLM-assisted matching ─────────────────────────────────────────────
// Group by course/subject for context-aware matching
const LLM_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const LLM_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function invokeLLM(messages) {
  const res = await fetch(`${LLM_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "standards_mapping",
          strict: true,
          schema: {
            type: "object",
            properties: {
              mappings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    canonical_code: { type: "string" },
                    confidence: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                    rationale: { type: "string" },
                  },
                  required: ["id", "canonical_code", "confidence", "rationale"],
                  additionalProperties: false,
                },
              },
            },
            required: ["mappings"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// Build subject-grouped batches for the LLM
const subjectGroups = {};
for (const row of pass2Queue) {
  // Derive subject from slug pattern
  let subject = "Unknown";
  const slug = row.code;
  if (slug.includes("ap_calc")) subject = "AP Calculus BC";
  else if (slug.includes("ap_chem")) subject = "AP Chemistry";
  else if (slug.includes("ap_lit")) subject = "AP Literature & Composition";
  else if (slug.includes("ap_stat")) subject = "AP Statistics";
  else if (slug.includes("sat_")) subject = "SAT Prep";
  else if (slug.includes("prek_math")) subject = "Pre-K Mathematics (TEKS 111.2)";
  else if (slug.includes("prek_ela")) subject = "Pre-K Language Arts (TEKS 110.2)";
  else if (slug.includes("prek_sci")) subject = "Pre-K Science (TEKS 112.2)";
  else if (slug.includes("prek_ss")) subject = "Pre-K Social Studies (TEKS 113.2)";
  else if (slug.includes("k_math")) subject = "Kindergarten Mathematics (TEKS 111.3)";
  else if (slug.includes("k_ela")) subject = "Kindergarten Language Arts (TEKS 110.3)";
  else if (slug.includes("k_sci")) subject = "Kindergarten Science (TEKS 112.3)";
  else if (slug.includes("k_ss")) subject = "Kindergarten Social Studies (TEKS 113.3)";
  else if (slug.includes("g1_math")) subject = "Grade 1 Mathematics (TEKS 111.4)";
  else if (slug.includes("g1_ela")) subject = "Grade 1 Language Arts (TEKS 110.4)";
  else if (slug.includes("g1_sci")) subject = "Grade 1 Science (TEKS 112.4)";
  else if (slug.includes("g1_ss")) subject = "Grade 1 Social Studies (TEKS 113.4)";
  else if (slug.includes("g2_math")) subject = "Grade 2 Mathematics (TEKS 111.5)";
  else if (slug.includes("g2_ela")) subject = "Grade 2 Language Arts (TEKS 110.5)";
  else if (slug.includes("g2_sci")) subject = "Grade 2 Science (TEKS 112.5)";
  else if (slug.includes("g2_ss")) subject = "Grade 2 Social Studies (TEKS 113.5)";

  if (!subjectGroups[subject]) subjectGroups[subject] = [];
  subjectGroups[subject].push(row);
}

const pass2Updates = [];
const pass2Failures = [];

for (const [subject, rows] of Object.entries(subjectGroups)) {
  console.log(`  🤖 LLM matching ${rows.length} standards for: ${subject}`);

  const standardsList = rows
    .map(
      (r) =>
        `  - id=${r.id}, slug="${r.code}", description="${r.description}", courses="${r.courses || ""}"`
    )
    .join("\n");

  const prompt = `You are a Texas education standards expert. Map each of the following narrative standard slugs to their canonical TEKS code.

Subject: ${subject}

Standards to map:
${standardsList}

Rules:
- For AP courses: use College Board unit codes (e.g. "AP Calc BC Unit 1" → "AP.CALC.BC.CHA-1", or use the standard AP framework notation like "AP.CALC.BC.1")
- For SAT Prep: use SAT domain codes (e.g. "SAT Math" → "SAT.MATH", "SAT Reading" → "SAT.RW.1")
- For Pre-K through Grade 2 TEKS: use the TEKS chapter notation (e.g. "Pre-K Math Unit 1" → "TEKS 111.2(b)(1)" for counting/number sense)
- For Technology Applications: use TEKS 126.x notation
- Use your knowledge of Texas curriculum scope and sequence to assign the most appropriate standard code
- If genuinely uncertain, use a reasonable approximation with confidence="low"
- Never return an empty canonical_code; always provide a best-effort code

Return a JSON object with a "mappings" array.`;

  try {
    const result = await invokeLLM([
      {
        role: "system",
        content:
          "You are a Texas K-12 curriculum standards expert. Return only valid JSON.",
      },
      { role: "user", content: prompt },
    ]);

    for (const mapping of result.mappings) {
      if (mapping.canonical_code && mapping.canonical_code.trim()) {
        pass2Updates.push({
          id: mapping.id,
          code: mapping.canonical_code.trim(),
          confidence: mapping.confidence,
          rationale: mapping.rationale,
        });
      } else {
        pass2Failures.push({ id: mapping.id, reason: "empty code from LLM" });
      }
    }
  } catch (err) {
    console.error(`  ❌ LLM error for ${subject}: ${err.message}`);
    for (const row of rows) {
      pass2Failures.push({ id: row.id, reason: err.message });
    }
  }
}

// Apply Pass 2 updates
if (pass2Updates.length > 0) {
  for (const update of pass2Updates) {
    await db.execute(
      `UPDATE standards SET code = ?, isCanonical = 1 WHERE id = ?`,
      [update.code, update.id]
    );
  }
  console.log(`\n  Applied ${pass2Updates.length} Pass 2 LLM updates to DB.`);
}

if (pass2Failures.length > 0) {
  console.warn(
    `\n  ⚠️  ${pass2Failures.length} standards could not be resolved:`
  );
  for (const f of pass2Failures) {
    console.warn(`     id=${f.id}: ${f.reason}`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
const totalResolved = pass1Updates.length + pass2Updates.length;
const totalFailed = pass2Failures.length;

console.log(`
╔══════════════════════════════════════════════╗
║  Phase 3 Gap Resolution — Complete           ║
╠══════════════════════════════════════════════╣
║  Total gaps found:    ${String(gapRows.length).padEnd(22)} ║
║  Pass 1 (regex):      ${String(pass1Updates.length).padEnd(22)} ║
║  Pass 2 (LLM):        ${String(pass2Updates.length).padEnd(22)} ║
║  Unresolved:          ${String(totalFailed).padEnd(22)} ║
║  Total resolved:      ${String(totalResolved).padEnd(22)} ║
╚══════════════════════════════════════════════╝
`);

// ── Regenerate BACKFILL_GAPS.md ───────────────────────────────────────────────
const [remainingGaps] = await db.execute(
  `SELECT s.id, s.code, s.description, s.gradeLevel,
          GROUP_CONCAT(DISTINCT c.title ORDER BY c.title SEPARATOR ' | ') AS courses
   FROM standards s
   LEFT JOIN unitStandards us ON us.standardId = s.id
   LEFT JOIN units u ON u.id = us.unitId
   LEFT JOIN courses c ON c.id = u.courseId
   WHERE s.isCanonical = 0
   GROUP BY s.id, s.code, s.description, s.gradeLevel
   ORDER BY courses, s.id`
);

const now = new Date().toISOString().split("T")[0];

let md = `# BACKFILL_GAPS.md — Standards Requiring Manual TEKS Code Assignment\n\n`;
md += `**Generated:** ${now}\n`;
md += `**Total gaps:** ${remainingGaps.length} standards with \`isCanonical = false\`\n\n`;

if (remainingGaps.length === 0) {
  md += `## ✅ All gap standards have been resolved!\n\n`;
  md += `The "am I at par" diagnostic is now fully operational for all courses.\n`;
} else {
  md += `## Remaining Gap Standards\n\n`;
  // Group by courses
  const grouped = {};
  for (const row of remainingGaps) {
    const key = row.courses || "Unknown Course";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }
  for (const [courses, rows] of Object.entries(grouped)) {
    md += `### ${courses}\n\n`;
    md += `| Standard ID | Slug Code | Description | Grade |\n`;
    md += `|---|---|---|---|\n`;
    for (const r of rows) {
      md += `| ${r.id} | \`${r.code}\` | ${r.description || "—"} | ${r.gradeLevel || "—"} |\n`;
    }
    md += `\n`;
  }
}

md += `---\n\n*This file is auto-generated by \`scripts/resolve-gaps.mjs\`. Do not edit manually.*\n`;

const gapsPath = join(ROOT, "docs", "BACKFILL_GAPS.md");
writeFileSync(gapsPath, md, "utf8");
console.log(`📄 Regenerated docs/BACKFILL_GAPS.md (${remainingGaps.length} remaining gaps)\n`);

await db.end();
process.exit(totalFailed > 0 ? 1 : 0);
