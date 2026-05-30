/**
 * Phase 4A — Seed 12 units each for ENG2 and USH
 *
 * Uses LLM-assisted TEKS code lookup to identify the correct standard code
 * for each unit. Flags uncertain codes for founder review before committing.
 *
 * sourceNote: 'phase4-4a-2026-05' on all inserted rows.
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DB_URL = process.env.DATABASE_URL;

// ── Unit definitions (from Phase 4 spec) ────────────────────────────────────

const ENG2_UNITS = [
  {
    unitNumber: 1,
    title: "Reading Literary Texts",
    focus: "Fiction, literary nonfiction, poetry analysis",
    overview: "Students analyze fiction, literary nonfiction, and poetry to understand how authors use literary elements and techniques to convey meaning. Close reading strategies, textual evidence, and literary analysis form the core of this unit, preparing students for STAAR ENG2 literary reading passages.",
    teksHint: "TEKS English II — literary analysis, fiction, poetry, Grade 10 ELAR",
  },
  {
    unitNumber: 2,
    title: "Reading Informational Texts",
    focus: "Expository and argumentative non-fiction",
    overview: "Students read and analyze expository and argumentative non-fiction texts, identifying central ideas, supporting details, and the author's organizational structure. Students evaluate how authors use evidence and reasoning to build arguments in informational contexts.",
    teksHint: "TEKS English II — informational text, expository, argumentative non-fiction, Grade 10 ELAR",
  },
  {
    unitNumber: 3,
    title: "Reading Persuasive Texts",
    focus: "Rhetoric, author's purpose, persuasive techniques",
    overview: "Students examine rhetorical strategies, author's purpose, and persuasive techniques in speeches, editorials, and essays. Students evaluate the effectiveness of appeals to logos, ethos, and pathos and identify how word choice and structure influence the reader.",
    teksHint: "TEKS English II — persuasive texts, rhetoric, author's purpose, Grade 10 ELAR",
  },
  {
    unitNumber: 4,
    title: "Author's Craft and Style",
    focus: "Diction, syntax, tone, figurative language",
    overview: "Students study how authors make deliberate stylistic choices — including diction, syntax, tone, and figurative language — to achieve specific effects. Students analyze how these craft elements contribute to meaning and mood across literary and informational genres.",
    teksHint: "TEKS English II — author's craft, diction, syntax, tone, figurative language, Grade 10 ELAR",
  },
  {
    unitNumber: 5,
    title: "Vocabulary and Academic Language",
    focus: "Context clues, word relationships, connotation",
    overview: "Students develop strategies for determining word meaning through context clues, word relationships, and understanding connotation versus denotation. Academic vocabulary essential for STAAR ENG2 reading passages is systematically built throughout this unit.",
    teksHint: "TEKS English II — vocabulary, context clues, word relationships, connotation, Grade 10 ELAR",
  },
  {
    unitNumber: 6,
    title: "Writing Process and Composition",
    focus: "Planning, drafting, revising, editing",
    overview: "Students apply the full writing process — planning, drafting, revising, and editing — to produce multi-paragraph compositions. Students learn to develop a clear thesis, organize ideas logically, and use transitions effectively in both expository and argumentative writing.",
    teksHint: "TEKS English II — writing process, composition, expository writing, argumentative writing, Grade 10 ELAR",
  },
  {
    unitNumber: 7,
    title: "Research and Synthesis",
    focus: "Source evaluation, citation, research writing",
    overview: "Students conduct research using multiple sources, evaluate source credibility, and synthesize information into a coherent research product. Students practice proper citation and understand how to integrate evidence from primary and secondary sources without plagiarism.",
    teksHint: "TEKS English II — research, source evaluation, synthesis, citation, Grade 10 ELAR",
  },
  {
    unitNumber: 8,
    title: "Oral and Written Conventions",
    focus: "Grammar, punctuation, sentence structure",
    overview: "Students master grammar, punctuation, and sentence structure conventions required for effective written communication. This unit addresses common errors in subject-verb agreement, pronoun reference, comma usage, and sentence combining — skills tested directly on STAAR ENG2.",
    teksHint: "TEKS English II — grammar, punctuation, sentence structure, written conventions, Grade 10 ELAR",
  },
  {
    unitNumber: 9,
    title: "Poetry and Drama",
    focus: "Form, structure, dramatic elements",
    overview: "Students analyze poetry and drama as distinct literary forms, examining how structure, form, and dramatic elements contribute to meaning. Students study poetic devices, speaker perspective, dramatic irony, and how staging and dialogue function in dramatic texts.",
    teksHint: "TEKS English II — poetry, drama, form, structure, dramatic elements, Grade 10 ELAR",
  },
  {
    unitNumber: 10,
    title: "Cross-Genre Comparison",
    focus: "Comparing texts across genres and purposes",
    overview: "Students compare and contrast texts across genres and purposes, examining how the same theme or topic is treated differently in fiction, non-fiction, poetry, and informational texts. Cross-genre analysis is a key skill for STAAR ENG2 multi-passage questions.",
    teksHint: "TEKS English II — cross-genre comparison, theme, purpose, multiple texts, Grade 10 ELAR",
  },
  {
    unitNumber: 11,
    title: "Media and Visual Literacy",
    focus: "Evaluating multimodal and digital texts",
    overview: "Students evaluate multimodal and digital texts, including images, infographics, videos, and websites. Students analyze how visual and textual elements work together to convey meaning and assess the credibility and purpose of digital media sources.",
    teksHint: "TEKS English II — media literacy, visual literacy, multimodal texts, digital texts, Grade 10 ELAR",
  },
  {
    unitNumber: 12,
    title: "STAAR ENG2 Exam Review",
    focus: "Synthesis across all strands",
    overview: "This unit consolidates all eleven prior units into STAAR ENG2 exam-style practice. Students work through passage-based and standalone questions spanning literary analysis, informational reading, persuasive texts, author's craft, vocabulary, writing conventions, and cross-genre comparison. Timed practice and test-taking strategies are emphasized.",
    teksHint: "TEKS English II — comprehensive review across all strands, STAAR EOC preparation, Grade 10 ELAR",
  },
];

const USH_UNITS = [
  {
    unitNumber: 1,
    title: "Reconstruction Era",
    focus: "1865–1877, 13th–15th Amendments, Freedmen's Bureau",
    overview: "Students examine the political, social, and economic challenges of Reconstruction following the Civil War. The unit covers the 13th, 14th, and 15th Amendments, the Freedmen's Bureau, competing Reconstruction plans, and the eventual end of Reconstruction and its lasting consequences for African Americans.",
    teksHint: "TEKS US History since 1877 — Reconstruction, 13th-15th Amendments, Freedmen's Bureau, Grade 11",
  },
  {
    unitNumber: 2,
    title: "Industrialisation and the Gilded Age",
    focus: "Big business, labour movements, immigration, urbanisation",
    overview: "Students analyze the rapid industrialization of the late 19th century, including the rise of big business, trusts, and monopolies. The unit examines the growth of the labor movement, waves of immigration, urbanization, and the social tensions created by vast economic inequality during the Gilded Age.",
    teksHint: "TEKS US History since 1877 — industrialization, Gilded Age, labor movements, immigration, urbanization, Grade 11",
  },
  {
    unitNumber: 3,
    title: "Progressive Era",
    focus: "Reform movements, muckrakers, constitutional amendments",
    overview: "Students study the Progressive Era reform movements that sought to address the social problems created by industrialization. The unit covers muckraking journalism, the rise of women's suffrage, constitutional amendments (16th–19th), trust-busting, and the expansion of federal regulatory power under Roosevelt, Taft, and Wilson.",
    teksHint: "TEKS US History since 1877 — Progressive Era, reform movements, muckrakers, 16th-19th Amendments, Grade 11",
  },
  {
    unitNumber: 4,
    title: "World War I and the 1920s",
    focus: "US entry, Treaty of Versailles, economic boom, social change",
    overview: "Students examine the causes of World War I, American neutrality and eventual entry, the Treaty of Versailles, and the Senate's rejection of the League of Nations. The unit then explores the 1920s economic boom, the Harlem Renaissance, Prohibition, the rise of mass consumer culture, and the social tensions of the decade.",
    teksHint: "TEKS US History since 1877 — World War I, Treaty of Versailles, 1920s, Harlem Renaissance, Grade 11",
  },
  {
    unitNumber: 5,
    title: "Great Depression and New Deal",
    focus: "Causes, Hoover vs Roosevelt, relief/recovery/reform",
    overview: "Students analyze the causes of the Great Depression, including the stock market crash, banking failures, and global economic factors. The unit compares Hoover's response with FDR's New Deal programs, examining the three Rs — relief, recovery, and reform — and debates about the role of government in the economy.",
    teksHint: "TEKS US History since 1877 — Great Depression, New Deal, Hoover, Roosevelt, Grade 11",
  },
  {
    unitNumber: 6,
    title: "World War II",
    focus: "Causes, US entry, homefront, Holocaust, atomic bomb",
    overview: "Students study the causes of World War II, the attack on Pearl Harbor, and American mobilization. The unit examines the homefront experience including rationing, women in the workforce, and Japanese American internment. Students analyze the Holocaust, key military campaigns, and the decision to use atomic bombs on Japan.",
    teksHint: "TEKS US History since 1877 — World War II, Pearl Harbor, Holocaust, atomic bomb, homefront, Grade 11",
  },
  {
    unitNumber: 7,
    title: "Cold War Era",
    focus: "Containment policy, Korean War, nuclear arms race",
    overview: "Students examine the origins of the Cold War, the Truman Doctrine, Marshall Plan, and containment policy. The unit covers the Korean War, McCarthyism, the nuclear arms race, the Berlin Crisis, and the space race — analyzing how Cold War ideology shaped American foreign and domestic policy throughout the 1950s.",
    teksHint: "TEKS US History since 1877 — Cold War, containment, Korean War, McCarthyism, nuclear arms race, Grade 11",
  },
  {
    unitNumber: 8,
    title: "Civil Rights Movement",
    focus: "Brown v Board, Montgomery, MLK, legislation 1964–65",
    overview: "Students analyze the Civil Rights Movement from Brown v. Board of Education through the landmark legislation of 1964–65. The unit examines key events including the Montgomery Bus Boycott, sit-ins, Freedom Rides, the March on Washington, and the leadership of Martin Luther King Jr., as well as the Civil Rights Act and Voting Rights Act.",
    teksHint: "TEKS US History since 1877 — Civil Rights Movement, Brown v Board, MLK, Civil Rights Act, Voting Rights Act, Grade 11",
  },
  {
    unitNumber: 9,
    title: "Vietnam War and Social Change",
    focus: "Vietnam, Great Society, counterculture, women's movement",
    overview: "Students study American involvement in Vietnam, from early advisory roles through escalation, the Tet Offensive, and eventual withdrawal. The unit connects the Vietnam War to the broader social upheaval of the 1960s–70s, including LBJ's Great Society programs, the counterculture movement, and the women's liberation movement.",
    teksHint: "TEKS US History since 1877 — Vietnam War, Great Society, counterculture, women's movement, Grade 11",
  },
  {
    unitNumber: 10,
    title: "Contemporary America 1980s–2001",
    focus: "Reagan, end of Cold War, Gulf War, technology revolution",
    overview: "Students examine the Reagan Revolution, supply-side economics, and the conservative resurgence of the 1980s. The unit covers the end of the Cold War, the fall of the Berlin Wall, the Gulf War, and the technology revolution of the 1990s that transformed the American economy and daily life.",
    teksHint: "TEKS US History since 1877 — Reagan, end of Cold War, Gulf War, technology revolution, 1980s-2001, Grade 11",
  },
  {
    unitNumber: 11,
    title: "21st-Century America",
    focus: "9/11, wars in Afghanistan/Iraq, economic crises, Obama–Trump era",
    overview: "Students analyze the September 11 attacks and the War on Terror, including the wars in Afghanistan and Iraq and debates over civil liberties and national security. The unit examines the 2008 financial crisis, the Obama presidency, and the political polarization of the Trump era, connecting recent events to long-term historical patterns.",
    teksHint: "TEKS US History since 1877 — 9/11, War on Terror, 2008 financial crisis, Obama, Trump, Grade 11",
  },
  {
    unitNumber: 12,
    title: "STAAR USH Exam Review",
    focus: "Synthesis across all periods and themes",
    overview: "This unit consolidates all eleven thematic units into STAAR USH exam-style practice. Students work through multiple-choice questions and document-based items spanning Reconstruction through 21st-Century America, with emphasis on cause-and-effect relationships, primary source analysis, and chronological reasoning. Timed practice and test-taking strategies are emphasized.",
    teksHint: "TEKS US History since 1877 — comprehensive review across all periods and themes, STAAR EOC preparation, Grade 11",
  },
];

// ── LLM TEKS code lookup ─────────────────────────────────────────────────────

const TEKS_SCHEMA = {
  type: "object",
  properties: {
    teksCode: { type: "string" },
    teksDescription: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    flagForReview: { type: "boolean" },
    reviewNote: { type: "string" },
  },
  required: ["teksCode", "teksDescription", "confidence", "flagForReview", "reviewNote"],
  additionalProperties: false,
};

async function lookupTeksCode(unit, courseCode, gradeLevel, subject) {
  const systemPrompt = `You are a Texas curriculum specialist with expert knowledge of TEKS (Texas Essential Knowledge and Skills) standards. 
Given a unit description, identify the most relevant TEKS standard code for that unit.
For English II (Grade 10 ELAR), use codes like "ELAR.10.X(Y)" or "ELA.10.X(Y)" format.
For U.S. History (Grade 11), use codes like "USHG.X(Y)" or "USH.X(Y)" format.
If you are uncertain, set flagForReview to true and explain in reviewNote.
Return valid JSON only.`;

  const userPrompt = `Course: ${courseCode} — ${subject} (Grade ${gradeLevel})
Unit ${unit.unitNumber}: "${unit.title}"
Focus: ${unit.focus}
TEKS hint: ${unit.teksHint}

Identify the primary TEKS standard code for this unit. 
- teksCode: the standard code (e.g., "ELAR.10.5(A)" or "USHG.29(A)")
- teksDescription: brief description of what the standard covers
- confidence: "high" if certain, "medium" if likely, "low" if uncertain
- flagForReview: true if confidence is low or if multiple standards apply
- reviewNote: explain any uncertainty or list additional applicable standards`;

  try {
    const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FORGE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "teks_lookup", strict: true, schema: TEKS_SCHEMA },
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return JSON.parse(data.choices?.[0]?.message?.content);
  } catch (err) {
    return {
      teksCode: `${courseCode}-U${unit.unitNumber}-UNKNOWN`,
      teksDescription: unit.focus,
      confidence: "low",
      flagForReview: true,
      reviewNote: `LLM lookup failed: ${err.message}`,
    };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const conn = await mysql.createConnection(DB_URL);

// Get course IDs
const [courses] = await conn.execute(
  "SELECT id, courseCode, title, gradeLevel, subject FROM courses WHERE courseCode IN ('ENG2','USH')"
);
const courseMap = {};
for (const c of courses) courseMap[c.courseCode] = c;

if (!courseMap.ENG2 || !courseMap.USH) {
  console.error("ERROR: ENG2 or USH course not found in DB");
  process.exit(1);
}

console.log(`ENG2 courseId: ${courseMap.ENG2.id}`);
console.log(`USH  courseId: ${courseMap.USH.id}`);

const allUnitsToSeed = [
  ...ENG2_UNITS.map(u => ({ ...u, courseCode: "ENG2", courseId: courseMap.ENG2.id, gradeLevel: courseMap.ENG2.gradeLevel, subject: courseMap.ENG2.subject })),
  ...USH_UNITS.map(u => ({ ...u, courseCode: "USH", courseId: courseMap.USH.id, gradeLevel: courseMap.USH.gradeLevel, subject: courseMap.USH.subject })),
];

const results = [];
const flaggedForReview = [];

console.log(`\nSeeding ${allUnitsToSeed.length} units with LLM-assisted TEKS code lookup...\n`);

for (const unit of allUnitsToSeed) {
  process.stdout.write(`  [${unit.courseCode}] Unit ${unit.unitNumber}: "${unit.title}" → `);

  // Check if unit already exists
  const [existing] = await conn.execute(
    "SELECT id FROM units WHERE courseId=? AND unitNumber=?",
    [unit.courseId, unit.unitNumber]
  );

  // LLM TEKS lookup
  const teks = await lookupTeksCode(unit, unit.courseCode, unit.gradeLevel, unit.subject);
  await new Promise(r => setTimeout(r, 300)); // rate limit

  const teksAlignment = `${teks.teksCode} — ${teks.teksDescription}`;

  let unitId;
  if (existing.length > 0) {
    // Update existing
    await conn.execute(
      "UPDATE units SET title=?, overview=?, teksAlignment=?, sortOrder=? WHERE courseId=? AND unitNumber=?",
      [unit.title, unit.overview, teksAlignment, unit.unitNumber, unit.courseId, unit.unitNumber]
    );
    unitId = existing[0].id;
    process.stdout.write(`UPDATED (id=${unitId})`);
  } else {
    // Insert new
    const [result] = await conn.execute(
      `INSERT INTO units (courseId, unitNumber, title, overview, teksAlignment, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [unit.courseId, unit.unitNumber, unit.title, unit.overview, teksAlignment, unit.unitNumber]
    );
    unitId = result.insertId;
    process.stdout.write(`INSERTED (id=${unitId})`);
  }

  if (teks.flagForReview) {
    process.stdout.write(` ⚠ FLAG: ${teks.reviewNote}`);
    flaggedForReview.push({ courseCode: unit.courseCode, unitNumber: unit.unitNumber, title: unit.title, ...teks });
  } else {
    process.stdout.write(` ✓ ${teks.teksCode} [${teks.confidence}]`);
  }
  process.stdout.write("\n");

  results.push({
    courseCode: unit.courseCode,
    unitNumber: unit.unitNumber,
    title: unit.title,
    unitId,
    teksCode: teks.teksCode,
    teksDescription: teks.teksDescription,
    confidence: teks.confidence,
    flagForReview: teks.flagForReview,
    reviewNote: teks.reviewNote,
  });
}

await conn.end();

// ── Write results ─────────────────────────────────────────────────────────────

const docsDir = path.join(__dirname, "../docs");
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

// Save JSON for sample question generation
fs.writeFileSync(
  path.join(docsDir, "phase4a-units.json"),
  JSON.stringify(results, null, 2),
  "utf-8"
);

// Summary report
const eng2Results = results.filter(r => r.courseCode === "ENG2");
const ushResults = results.filter(r => r.courseCode === "USH");
const flagged = results.filter(r => r.flagForReview);

let report = `# Phase 4A — Unit Seeding Report\n\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `## ENG2 — English II (Grade 10 ELAR)\n\n`;
report += `| # | Unit Title | TEKS Code | Confidence | Flag? |\n`;
report += `|---|-----------|-----------|------------|-------|\n`;
for (const r of eng2Results) {
  report += `| ${r.unitNumber} | ${r.title} | \`${r.teksCode}\` | ${r.confidence} | ${r.flagForReview ? "⚠ YES" : "✓"} |\n`;
}
report += `\n## USH — U.S. History (Grade 11)\n\n`;
report += `| # | Unit Title | TEKS Code | Confidence | Flag? |\n`;
report += `|---|-----------|-----------|------------|-------|\n`;
for (const r of ushResults) {
  report += `| ${r.unitNumber} | ${r.title} | \`${r.teksCode}\` | ${r.confidence} | ${r.flagForReview ? "⚠ YES" : "✓"} |\n`;
}
if (flagged.length > 0) {
  report += `\n## Flagged for Founder Review\n\n`;
  for (const r of flagged) {
    report += `**[${r.courseCode}] Unit ${r.unitNumber}: ${r.title}**\n`;
    report += `- Code: \`${r.teksCode}\`\n`;
    report += `- Note: ${r.reviewNote}\n\n`;
  }
} else {
  report += `\n## Flagged for Founder Review\n\nNone — all TEKS codes identified with medium or high confidence.\n`;
}

fs.writeFileSync(path.join(docsDir, "PHASE4A_UNIT_REPORT.md"), report, "utf-8");

console.log(`\n✓ Unit seeding complete.`);
console.log(`  ENG2: ${eng2Results.length} units`);
console.log(`  USH:  ${ushResults.length} units`);
console.log(`  Flagged for review: ${flagged.length}`);
console.log(`  Results saved to docs/phase4a-units.json`);
console.log(`  Report saved to docs/PHASE4A_UNIT_REPORT.md`);
