/**
 * Sprint A Step A3 — Retry AP and SAT sample generation with shorter prompts
 * Appends to docs/SAMPLE_QUESTIONS.md
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

const RETRY_CATEGORIES = [
  {
    name: "AP Chemistry",
    course: "AP Chemistry",
    unit: "Atomic Structure & Properties",
    gradeLevel: "AP",
    subject: "Science",
    courseCode: "APCHEM",
    unitId: 60001,
    systemPrompt: `You are an AP Chemistry teacher. Write 5 multiple-choice questions only (no free response). Keep explanations under 60 words each. Return valid JSON.`,
    userPrompt: `Generate 5 AP Chemistry multiple-choice questions about "Atomic Structure & Properties".
Topics: electron configuration, periodic trends, atomic radius, ionization energy, electronegativity.
Difficulties: Q1=easy, Q2=medium, Q3=medium, Q4=hard, Q5=medium.
skillTag format: APCHEM-U1-S[1-5]. standardNote: cite AP Chem learning objective.
4 choices each (A,B,C,D). correctAnswer = label only. explanation max 60 words.`,
  },
  {
    name: "SAT Prep",
    course: "SAT Prep: Score 1500+",
    unit: "SAT Overview & Score Strategy",
    gradeLevel: "AP",
    subject: "Test Preparation",
    courseCode: "SATPREP",
    unitId: 60074,
    systemPrompt: `You are an SAT prep tutor. Write 5 multiple-choice questions only. Keep explanations under 60 words each. Return valid JSON.`,
    userPrompt: `Generate 5 SAT-style multiple-choice questions (mix of math algebra and reading/grammar).
Difficulties: Q1=easy, Q2=medium, Q3=medium, Q4=hard, Q5=medium.
skillTag format: SATPREP-U1-S[1-5]. standardNote: cite SAT domain (e.g. "SAT Math: Heart of Algebra").
4 choices each (A,B,C,D). correctAnswer = label only. explanation max 60 words.`,
  },
];

const allSamples = [];

for (const cat of RETRY_CATEGORIES) {
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
  await new Promise(r => setTimeout(r, 1000));
}

// ── Append to existing SAMPLE_QUESTIONS.md ────────────────────────────────────

const docsDir = path.join(__dirname, "../docs");
const outPath = path.join(docsDir, "SAMPLE_QUESTIONS.md");

let append = `\n---\n\n## Retry Results (AP Chemistry & SAT Prep)\n\n`;

for (const { category, questions, error } of allSamples) {
  append += `## Category: ${category.name}\n\n`;
  append += `**Course:** ${category.course} | **Unit:** ${category.unit} | **Grade:** ${category.gradeLevel}\n\n`;

  if (error) {
    append += `> ⚠ Generation failed: ${error}\n\n`;
    continue;
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    append += `### Sample ${i + 1} — Difficulty: ${q.difficulty.toUpperCase()}\n\n`;
    append += `**Type:** \`${q.questionType}\` | **Skill:** \`${q.skillTag}\` | **Standard:** ${q.standardNote}\n\n`;
    append += `**Question:** ${q.questionText}\n\n`;

    if (q.choices && q.choices.length > 0) {
      append += `**Options:**\n`;
      for (const c of q.choices) {
        const marker = c.label === q.correctAnswer ? " ✓" : "";
        append += `- **${c.label}.** ${c.text}${marker}\n`;
      }
      append += `\n`;
    }

    append += `**Correct Answer:** ${q.correctAnswer}\n\n`;
    append += `**Explanation:** ${q.explanation}\n\n`;
    append += `---\n\n`;
  }
}

fs.appendFileSync(outPath, append, "utf-8");
console.log(`\n✓ Appended to docs/SAMPLE_QUESTIONS.md`);
console.log(`  Total new questions: ${allSamples.reduce((s, c) => s + (c.questions?.length || 0), 0)}`);
