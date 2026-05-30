/**
 * Phase 4A — Generate 20 sample questions for founder review
 * 10 ENG2: 5 eoc_review + 5 unit_quiz
 * 10 USH:  5 eoc_review + 5 unit_quiz
 *
 * ENG2 format: 70% multiple_choice, 30% constructed_response; 60% passage-based
 * USH format:  85% multiple_choice, 15% constructed_response; some MC with primary source excerpts
 *
 * Output: docs/PHASE4A_SAMPLES.md for founder review
 */
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

// Load unit data from previous step
const unitsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../docs/phase4a-units.json"), "utf-8")
);
const eng2Units = unitsData.filter(u => u.courseCode === "ENG2");
const ushUnits = unitsData.filter(u => u.courseCode === "USH");

// ── Sample question schema ────────────────────────────────────────────────────

const SAMPLE_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          unitNumber: { type: "number" },
          unitTitle: { type: "string" },
          standardCode: { type: "string" },
          assessmentType: { type: "string" },
          questionType: { type: "string" },
          difficulty: { type: "string" },
          questionText: { type: "string" },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                text: { type: "string" },
              },
              required: ["label", "text"],
              additionalProperties: false,
            },
          },
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
          isPassageBased: { type: "boolean" },
        },
        required: ["unitNumber", "unitTitle", "standardCode", "assessmentType", "questionType", "difficulty", "questionText", "choices", "correctAnswer", "explanation", "isPassageBased"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

async function callLLM(systemPrompt, userPrompt) {
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
        json_schema: { name: "sample_questions", strict: true, schema: SAMPLE_SCHEMA },
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content).questions;
}

// ── Generate ENG2 samples ─────────────────────────────────────────────────────

console.log("Generating ENG2 sample questions...");

// Pick representative units: Unit 1 (literary), Unit 6 (writing), Unit 8 (conventions) for unit_quiz
// Units 1, 3, 5 for eoc_review (spread across strands)
const eng2EocUnits = [eng2Units[0], eng2Units[2], eng2Units[4]]; // Units 1, 3, 5
const eng2QuizUnits = [eng2Units[1], eng2Units[7]]; // Units 2, 8

const eng2SystemPrompt = `You are a Texas high school English teacher and STAAR ENG2 exam question writer for Grade 10.
Write high-quality STAAR English II questions. 

CRITICAL RULES:
1. For passage-based questions: embed a SHORT AI-generated original excerpt (3-6 sentences) at the start of questionText, then ask the question. The excerpt must be original — never reproduce copyrighted text.
2. For constructed_response: write a clear essay/short-answer prompt. Leave choices as an empty array [].
3. For multiple_choice: provide exactly 4 choices labeled A, B, C, D. correctAnswer = the label (A/B/C/D).
4. For constructed_response: correctAnswer = a brief model answer (1-2 sentences).
5. All questions must be grade-appropriate for Grade 10 and aligned to TEKS ELAR standards.
Return valid JSON only.`;

const eng2EocPrompt = `Generate 5 STAAR ENG2 EOC review questions spanning different strands.
Mix: 3 multiple_choice (passage-based) + 2 constructed_response (standalone).
Difficulties: 2 medium, 2 hard, 1 challenge.

Units to cover:
- Unit 1 (Reading Literary Texts, ELAR.10.5(A)): 1 passage-based MC question about literary analysis
- Unit 3 (Reading Persuasive Texts, ELAR.10.5(F)): 1 passage-based MC question about rhetoric/persuasion
- Unit 5 (Vocabulary, ELAR.10.3(A)): 1 standalone MC question about context clues/connotation
- Unit 6 (Writing Process, ELAR.10.5(A)): 1 constructed_response essay prompt
- Unit 8 (Conventions, ELAR.10.11(D)): 1 constructed_response grammar/revision prompt

For each question include: unitNumber, unitTitle, standardCode, assessmentType="eoc_review", questionType, difficulty, questionText (include passage if passage-based), choices, correctAnswer, explanation, isPassageBased.`;

const eng2QuizPrompt = `Generate 5 STAAR ENG2 unit quiz questions.
Mix: 3 multiple_choice + 2 constructed_response.
Difficulties: 2 easy, 2 medium, 1 hard.

Units to cover:
- Unit 2 (Reading Informational Texts, ELAR.10.6(A)): 2 questions (1 passage-based MC about central idea, 1 constructed_response about author's argument)
- Unit 8 (Oral and Written Conventions, ELAR.10.11(D)): 3 questions (2 MC about grammar/punctuation, 1 constructed_response about sentence revision)

For each question include: unitNumber, unitTitle, standardCode, assessmentType="unit_quiz", questionType, difficulty, questionText, choices, correctAnswer, explanation, isPassageBased.`;

const eng2EocQuestions = await callLLM(eng2SystemPrompt, eng2EocPrompt);
console.log(`  ENG2 eoc_review: ${eng2EocQuestions.length} questions generated`);
await new Promise(r => setTimeout(r, 1000));

const eng2QuizQuestions = await callLLM(eng2SystemPrompt, eng2QuizPrompt);
console.log(`  ENG2 unit_quiz: ${eng2QuizQuestions.length} questions generated`);
await new Promise(r => setTimeout(r, 1000));

// ── Generate USH samples ──────────────────────────────────────────────────────

console.log("Generating USH sample questions...");

const ushSystemPrompt = `You are a Texas high school U.S. History teacher and STAAR USH exam question writer for Grade 11.
Write high-quality STAAR U.S. History questions aligned to TEKS US History since 1877.

CRITICAL RULES:
1. For questions with primary source excerpts: embed a SHORT AI-generated original excerpt (3-5 sentences describing a primary source, political cartoon, map, or data) at the start of questionText, then ask the question. Never reproduce copyrighted text — describe or paraphrase.
2. For constructed_response: write a clear document-based or short-answer prompt. Leave choices as an empty array [].
3. For multiple_choice: provide exactly 4 choices labeled A, B, C, D. correctAnswer = the label (A/B/C/D).
4. For constructed_response: correctAnswer = a brief model answer (1-2 sentences).
5. All questions must be grade-appropriate for Grade 11 and aligned to TEKS US History standards.
Return valid JSON only.`;

const ushEocPrompt = `Generate 5 STAAR USH EOC review questions spanning different historical periods.
Mix: 4 multiple_choice (2 with primary source excerpts) + 1 constructed_response.
Difficulties: 1 medium, 3 hard, 1 challenge.

Units to cover:
- Unit 5 (Great Depression and New Deal, USH.6(A)): 1 MC with data excerpt about unemployment rates
- Unit 6 (World War II, USHG.8(A)): 1 MC with primary source excerpt about homefront/war effort
- Unit 8 (Civil Rights Movement, USH.9(C)): 1 MC about Brown v. Board or civil rights legislation
- Unit 10 (Contemporary America, USH.29(A)): 1 MC about Reagan era or Cold War end
- Unit 11 (21st-Century America, USH.29(H)): 1 constructed_response about 9/11 and its consequences

For each question include: unitNumber, unitTitle, standardCode, assessmentType="eoc_review", questionType, difficulty, questionText (include excerpt if applicable), choices, correctAnswer, explanation, isPassageBased.`;

const ushQuizPrompt = `Generate 5 STAAR USH unit quiz questions.
Mix: 4 multiple_choice (1 with primary source excerpt) + 1 constructed_response.
Difficulties: 1 easy, 2 medium, 2 hard.

Units to cover:
- Unit 1 (Reconstruction Era, USH.4(A)): 2 questions (1 MC about 13th-15th Amendments, 1 MC with Reconstruction-era excerpt)
- Unit 3 (Progressive Era, USH.4(B)): 2 questions (1 MC about reform movements, 1 MC about constitutional amendments)
- Unit 7 (Cold War Era, USH.8(A)): 1 constructed_response about containment policy

For each question include: unitNumber, unitTitle, standardCode, assessmentType="unit_quiz", questionType, difficulty, questionText, choices, correctAnswer, explanation, isPassageBased.`;

const ushEocQuestions = await callLLM(ushSystemPrompt, ushEocPrompt);
console.log(`  USH eoc_review: ${ushEocQuestions.length} questions generated`);
await new Promise(r => setTimeout(r, 1000));

const ushQuizQuestions = await callLLM(ushSystemPrompt, ushQuizPrompt);
console.log(`  USH unit_quiz: ${ushQuizQuestions.length} questions generated`);

// ── Write samples report ──────────────────────────────────────────────────────

const allSamples = {
  ENG2: { eoc_review: eng2EocQuestions, unit_quiz: eng2QuizQuestions },
  USH: { eoc_review: ushEocQuestions, unit_quiz: ushQuizQuestions },
};

// Save raw JSON
fs.writeFileSync(
  path.join(__dirname, "../docs/phase4a-samples.json"),
  JSON.stringify(allSamples, null, 2),
  "utf-8"
);

// Build markdown report
function formatQuestion(q, idx) {
  let md = `### Q${idx + 1} — [${q.assessmentType}] Unit ${q.unitNumber}: ${q.unitTitle}\n`;
  md += `**Standard:** \`${q.standardCode}\` | **Difficulty:** ${q.difficulty} | **Type:** ${q.questionType}${q.isPassageBased ? " (passage-based)" : ""}\n\n`;
  md += `**Question:**\n\n${q.questionText}\n\n`;
  if (q.questionType === "multiple_choice" && q.choices.length > 0) {
    for (const c of q.choices) {
      md += `- **${c.label}.** ${c.text}\n`;
    }
    md += `\n**Correct Answer:** ${q.correctAnswer}\n\n`;
  } else {
    md += `**Model Answer:** ${q.correctAnswer}\n\n`;
  }
  md += `**Explanation:** ${q.explanation}\n\n`;
  md += `---\n\n`;
  return md;
}

let report = `# Phase 4A — Sample Questions for Founder Review\n\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `**Instructions:** Review all 20 questions below. Reply with approval to proceed to bulk generation, or flag specific questions for revision.\n\n`;
report += `---\n\n`;

report += `## ENG2 — English II (Grade 10 ELAR)\n\n`;
report += `### EOC Review Questions (5)\n\n`;
eng2EocQuestions.forEach((q, i) => { report += formatQuestion(q, i); });
report += `### Unit Quiz Questions (5)\n\n`;
eng2QuizQuestions.forEach((q, i) => { report += formatQuestion(q, i); });

report += `## USH — U.S. History (Grade 11)\n\n`;
report += `### EOC Review Questions (5)\n\n`;
ushEocQuestions.forEach((q, i) => { report += formatQuestion(q, i); });
report += `### Unit Quiz Questions (5)\n\n`;
ushQuizQuestions.forEach((q, i) => { report += formatQuestion(q, i); });

fs.writeFileSync(
  path.join(__dirname, "../docs/PHASE4A_SAMPLES.md"),
  report,
  "utf-8"
);

console.log(`\n✓ Sample generation complete.`);
console.log(`  ENG2: ${eng2EocQuestions.length} eoc_review + ${eng2QuizQuestions.length} unit_quiz = ${eng2EocQuestions.length + eng2QuizQuestions.length} total`);
console.log(`  USH:  ${ushEocQuestions.length} eoc_review + ${ushQuizQuestions.length} unit_quiz = ${ushEocQuestions.length + ushQuizQuestions.length} total`);
console.log(`  Samples saved to docs/PHASE4A_SAMPLES.md`);
