/**
 * Query Forge LLM for correct TEKS codes:
 * 1. TEKS §110.39 Composition strand — Grade 10 writing process code
 * 2. TEKS US History since 1877 — Vietnam War and social change standard
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/home/ubuntu/educhamp/.env" });

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function queryLLM(prompt) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are an expert in Texas Essential Knowledge and Skills (TEKS) curriculum standards. " +
            "Provide precise, authoritative TEKS standard codes. " +
            "Always cite the exact section number and subsection letter from the official TEA TEKS documents.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "teks_lookup",
          strict: true,
          schema: {
            type: "object",
            properties: {
              standardCode: { type: "string", description: "The exact TEKS standard code, e.g. ELAR.10.11(A)" },
              standardTitle: { type: "string", description: "The full title/description of the standard" },
              teksSection: { type: "string", description: "The TEA TEKS section reference, e.g. §110.39(b)(11)(A)" },
              reasoning: { type: "string", description: "Why this is the correct code for the requested topic" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["standardCode", "standardTitle", "teksSection", "reasoning", "confidence"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

console.log("=== TEKS Code Lookup ===\n");

// Query 1: ENG2 Writing Process
console.log("Query 1: TEKS §110.39 Composition strand — Grade 10 writing process");
const eng2Writing = await queryLLM(
  "In Texas TEKS §110.39 (English Language Arts and Reading, English II, Grade 10), " +
  "what is the correct standard code for the Composition strand covering the writing process — " +
  "specifically planning, drafting, revising, editing, and publishing written work? " +
  "Note: ELAR.10.5(A) is a READING standard for literary text analysis and should NOT be used for a writing/composition unit. " +
  "I need the Composition strand code, which is in a different section of §110.39. " +
  "Please provide the exact code used in the Composition strand (not the Reading strand)."
);
console.log("ENG2 Writing Process result:");
console.log(JSON.stringify(eng2Writing, null, 2));

await new Promise(r => setTimeout(r, 1000));

// Query 2: USH Vietnam War
console.log("\nQuery 2: TEKS US History since 1877 — Vietnam War and social change");
const ushVietnam = await queryLLM(
  "In Texas TEKS for United States History Studies Since 1877 (high school, §113.41), " +
  "what is the correct standard code for the Vietnam War era and social change of the 1960s-1970s? " +
  "Note: USH.9(C) is already used for the Civil Rights Movement unit. " +
  "The Vietnam War and social change (counterculture, women's liberation, anti-war movement) " +
  "should have its own distinct TEKS code. " +
  "Please provide the specific standard that covers Vietnam War, Great Society, or social movements of the late 1960s-1970s " +
  "that is DIFFERENT from USH.9(C)."
);
console.log("USH Vietnam War result:");
console.log(JSON.stringify(ushVietnam, null, 2));

await new Promise(r => setTimeout(r, 1000));

// Query 3: Verify USH Civil Rights correct code
console.log("\nQuery 3: Verify USH.9(C) is correct for Civil Rights Movement");
const ushCivilRights = await queryLLM(
  "In Texas TEKS for United States History Studies Since 1877 (§113.41), " +
  "is USH.9(C) the correct standard code for the Civil Rights Movement of the 1950s-1960s? " +
  "Please confirm or provide the correct code for civil rights legislation, Brown v. Board, " +
  "Martin Luther King Jr., and the Civil Rights Act of 1964."
);
console.log("USH Civil Rights verification:");
console.log(JSON.stringify(ushCivilRights, null, 2));
