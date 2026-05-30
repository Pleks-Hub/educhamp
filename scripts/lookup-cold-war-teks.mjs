import * as dotenv from "dotenv";
import mysql from "mysql2/promise";
dotenv.config();

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_KEY}` },
  body: JSON.stringify({
    messages: [
      {
        role: "system",
        content:
          "You are an expert in Texas Essential Knowledge and Skills (TEKS) curriculum standards. " +
          "Provide precise, authoritative TEKS standard codes from the official TEA documents.",
      },
      {
        role: "user",
        content:
          "In Texas TEKS for United States History Studies Since 1877 (§113.41), " +
          "what is the correct standard code for the Cold War era — covering the arms race, " +
          "McCarthyism, the Space Race, containment policy, and the Korean War? " +
          "USH.8(A) is already used for World War II (reasons for U.S. involvement, Pearl Harbor). " +
          "I need the DISTINCT standard code for the Cold War period that is different from USH.8(A). " +
          "USH.8(B) is the likely candidate — please confirm or provide the correct code.",
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "teks_cold_war",
        strict: true,
        schema: {
          type: "object",
          properties: {
            standardCode: { type: "string" },
            standardTitle: { type: "string" },
            teksSection: { type: "string" },
            reasoning: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["standardCode", "standardTitle", "teksSection", "reasoning", "confidence"],
          additionalProperties: false,
        },
      },
    },
  }),
});

const data = await res.json();
const result = JSON.parse(data.choices[0].message.content);
console.log("Cold War TEKS lookup result:");
console.log(JSON.stringify(result, null, 2));

// Apply the fix
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const newAlignment = `${result.standardCode} — ${result.standardTitle}`;
const [update] = await conn.execute(
  "UPDATE units SET teksAlignment = ? WHERE id = 210019",
  [newAlignment]
);
console.log(`\nDB update: ${update.affectedRows === 1 ? "✓" : "✗"} USH Unit 7 (Cold War Era) → ${result.standardCode}`);

// Verify
const [rows] = await conn.execute(
  "SELECT unitNumber, title, teksAlignment FROM units WHERE courseId = 210002 ORDER BY unitNumber"
);
console.log("\nUSH units — final verification:");
for (const r of rows) {
  const code = r.teksAlignment?.split(" — ")[0] ?? "NULL";
  console.log(`  Unit ${String(r.unitNumber).padStart(2)}: ${r.title.padEnd(45)} → ${code}`);
}

await conn.end();
