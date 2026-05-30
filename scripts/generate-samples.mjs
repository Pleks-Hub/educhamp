/**
 * Sprint A Step A3 — Generate 5 sample items per category (25 total)
 * Usage: node scripts/generate-samples.mjs
 *
 * Generates samples only — does NOT insert into the database.
 * Output is written to docs/SAMPLE_QUESTIONS.md for founder review.
 */
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

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
        json_schema: {
          name: "question_set",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    questionText: { type: "string" },
                    questionType: { type: "string" },
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
                    difficulty: { type: "string" },
                    skillTag: { type: "string" },
                    standardNote: { type: "string" },
                  },
                  required: [
                    "questionText",
                    "questionType",
                    "choices",
                    "correctAnswer",
                    "explanation",
                    "difficulty",
                    "skillTag",
                    "standardNote",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM call failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  return JSON.parse(content);
}

// ── Category specs ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    name: "STAAR EOC (Biology I)",
    course: "Biology I",
    unit: "Cell Structure & Function",
    gradeLevel: "9",
    subject: "science",
    courseCode: "BIO1",
    unitId: 30010,
    systemPrompt: `You are an expert Texas high school science teacher and STAAR exam question writer.
Write questions a Texas 9th-grade Biology student would encounter on the STAAR EOC assessment.
Each question must be self-contained, require no external materials, and cite the TEKS standard in the explanation.
Use multiple_choice format only for Biology.
Return exactly 5 questions with this difficulty distribution: 1 easy, 2 medium, 1 hard, 1 medium (alternative style: scenario-based).`,
    userPrompt: `Generate 5 STAAR Biology EOC questions about "Cell Structure & Function" (Unit 1).
Topics to cover: cell membrane, organelles (mitochondria, nucleus, ribosomes), prokaryotic vs eukaryotic cells, cell theory.
Difficulties: question 1 = easy, questions 2-3 = medium, question 4 = hard, question 5 = medium (scenario-based).
For skillTag use format: BIO1-U1-S[1-5].
For standardNote cite the TEKS standard (e.g., "TEKS Biology §112.34(b)(4)(A)").
For choices, always provide exactly 4 options labeled A, B, C, D.
correctAnswer should be the label only (e.g., "B").`,
  },
  {
    name: "AP Chemistry",
    course: "AP Chemistry",
    unit: "Atomic Structure & Properties",
    gradeLevel: "AP",
    subject: "Science",
    courseCode: "APCHEM",
    unitId: 60001,
    systemPrompt: `You are an expert AP Chemistry teacher and College Board exam question writer.
Write AP Chemistry exam-style questions matching the cognitive demand and format of actual AP exam questions.
Include both multiple_choice and free_response formats.
Return exactly 5 questions with this distribution: 1 easy MC, 2 medium MC, 1 hard MC, 1 free_response.`,
    userPrompt: `Generate 5 AP Chemistry questions about "Atomic Structure & Properties" (Unit 1).
Topics: electron configuration, periodic trends, atomic radius, ionization energy, electronegativity, quantum numbers.
Difficulties: question 1 = easy, questions 2-3 = medium, question 4 = hard, question 5 = medium (free_response).
For skillTag use format: APCHEM-U1-S[1-5].
For standardNote cite the AP Chemistry learning objective (e.g., "AP Chem LO 1.A.1").
For multiple_choice: provide exactly 4 options labeled A, B, C, D. correctAnswer = label.
For free_response: choices = [] (empty array), correctAnswer = the full model answer text.`,
  },
  {
    name: "SAT Prep",
    course: "SAT Prep: Score 1500+",
    unit: "SAT Overview & Score Strategy",
    gradeLevel: "AP",
    subject: "Test Preparation",
    courseCode: "SATPREP",
    unitId: 60074,
    systemPrompt: `You are an expert SAT prep tutor and College Board question writer.
Write SAT-style questions that are self-contained, match the difficulty and format of actual SAT questions.
Include both multiple_choice and short_answer (grid-in for math) formats.
Return exactly 5 questions with this distribution: 1 easy MC, 2 medium MC, 1 hard MC, 1 short_answer (grid-in).`,
    userPrompt: `Generate 5 SAT questions covering SAT strategy and mixed content (reading comprehension, math, grammar).
Mix of question types: 3 math (algebra/data analysis), 1 reading/grammar, 1 math grid-in.
Difficulties: question 1 = easy, questions 2-3 = medium, question 4 = hard, question 5 = medium (short_answer grid-in).
For skillTag use format: SATPREP-U1-S[1-5].
For standardNote cite the SAT domain (e.g., "SAT Math: Heart of Algebra").
For multiple_choice: provide exactly 4 options labeled A, B, C, D. correctAnswer = label.
For short_answer: choices = [] (empty array), correctAnswer = the numeric answer as a string.`,
  },
  {
    name: "K-12 Regular (Grade 6 Mathematics)",
    course: "Grade 6 Mathematics",
    unit: "Ratios and Rates",
    gradeLevel: "6",
    subject: "math",
    courseCode: "G6MATH",
    unitId: 120001,
    systemPrompt: `You are an expert Texas 6th-grade math teacher and TEKS-aligned question writer.
Write grade-appropriate questions for a 6th-grade student studying mathematics in Texas.
Align each question to the TEKS standard. Questions must be self-contained and include a clear explanation a student can learn from.
Return exactly 5 questions with this distribution: 1 easy, 2 medium, 1 hard, 1 short_answer.`,
    userPrompt: `Generate 5 Grade 6 Math questions about "Ratios and Rates" (Unit 1).
Topics: ratio notation (a:b, a/b, a to b), unit rates, equivalent ratios, ratio tables, real-world ratio problems.
Difficulties: question 1 = easy, questions 2-3 = medium, question 4 = hard, question 5 = medium (short_answer).
For skillTag use format: G6MATH-U1-S[1-5].
For standardNote cite the TEKS (e.g., "TEKS 6.4(B): apply qualitative and quantitative reasoning to solve prediction and comparison of real-world problems involving ratios and rates").
For multiple_choice: provide exactly 4 options labeled A, B, C, D. correctAnswer = label.
For short_answer: choices = [] (empty array), correctAnswer = the numeric or text answer.`,
  },
  {
    name: "Early Childhood (Grade 1 Mathematics)",
    course: "Grade 1 Mathematics",
    unit: "Place Value: Tens and Ones",
    gradeLevel: "1",
    subject: "Mathematics",
    courseCode: "G1-MATH",
    unitId: 180038,
    systemPrompt: `You are an expert 1st-grade teacher and early childhood assessment specialist.
Write simple, age-appropriate questions for a 1st-grade student.
Use short sentences and simple vocabulary. Each question must have exactly 3 answer choices (A, B, C).
Include a brief, encouraging explanation.
Return exactly 5 multiple_choice questions only (no constructed_response or free_response).`,
    userPrompt: `Generate 5 Grade 1 Math questions about "Place Value: Tens and Ones" (Unit 1).
Topics: identifying tens and ones in a two-digit number, comparing numbers, counting by tens, number bonds to 20.
Difficulties: question 1 = easy, questions 2-3 = medium, question 4 = hard, question 5 = medium.
For skillTag use format: G1MATH-U1-S[1-5].
For standardNote cite the TEKS (e.g., "TEKS 1.2(B): use concrete and pictorial models to compose and decompose numbers up to 120").
IMPORTANT: provide exactly 3 options labeled A, B, C (NOT 4). correctAnswer = label.
Keep question text under 20 words. Keep explanation encouraging and under 30 words.`,
  },
];

// ── Generate samples ───────────────────────────────────────────────────────────

const allSamples = [];

for (const cat of CATEGORIES) {
  console.log(`\nGenerating samples for: ${cat.name}...`);
  try {
    const result = await callLLM(cat.systemPrompt, cat.userPrompt);
    const questions = result.questions || [];
    allSamples.push({ category: cat, questions });
    console.log(`  ✓ Got ${questions.length} questions`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    allSamples.push({ category: cat, questions: [], error: err.message });
  }
  // Small delay between categories
  await new Promise(r => setTimeout(r, 1000));
}

// ── Format output as Markdown ──────────────────────────────────────────────────

let md = `# Sprint A Step A3 — Sample Questions for Founder Review\n\n`;
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `**Instructions:** Review each category below. Reply with approval or any corrections before bulk generation runs for that category.\n\n`;
md += `---\n\n`;

for (const { category, questions, error } of allSamples) {
  md += `## Category: ${category.name}\n\n`;
  md += `**Course:** ${category.course} | **Unit:** ${category.unit} | **Grade:** ${category.gradeLevel}\n\n`;

  if (error) {
    md += `> ⚠ Generation failed: ${error}\n\n`;
    continue;
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    md += `### Sample ${i + 1} — Difficulty: ${q.difficulty.toUpperCase()}\n\n`;
    md += `**Type:** \`${q.questionType}\` | **Skill:** \`${q.skillTag}\` | **Standard:** ${q.standardNote}\n\n`;
    md += `**Question:** ${q.questionText}\n\n`;

    if (q.choices && q.choices.length > 0) {
      md += `**Options:**\n`;
      for (const c of q.choices) {
        const marker = c.label === q.correctAnswer ? " ✓" : "";
        md += `- **${c.label}.** ${c.text}${marker}\n`;
      }
      md += `\n`;
    }

    md += `**Correct Answer:** ${q.correctAnswer}\n\n`;
    md += `**Explanation:** ${q.explanation}\n\n`;
    md += `---\n\n`;
  }
}

// ── Write to docs/ ─────────────────────────────────────────────────────────────

const docsDir = path.join(__dirname, "../docs");
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
const outPath = path.join(docsDir, "SAMPLE_QUESTIONS.md");
fs.writeFileSync(outPath, md, "utf-8");

console.log(`\n✓ Sample questions written to docs/SAMPLE_QUESTIONS.md`);
console.log(`  Total categories: ${allSamples.length}`);
console.log(`  Total questions: ${allSamples.reduce((s, c) => s + (c.questions?.length || 0), 0)}`);
