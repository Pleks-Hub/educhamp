/**
 * Seed script: Diagnostic Question Bank B
 * Adds 2 additional questions per unit (DIAG-031 to DIAG-060) and 3 more prerequisite questions
 * (DIAG-061 to DIAG-063) so the diagnostic can vary on retests.
 *
 * Run with: node server/seed-diagnostic-bank-b.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

// Parse mysql://user:pass@host:port/db?ssl=...
const match = DB_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, password, host, port, database] = match;

const bankB = [
  // ─── Prerequisite (Bank B) ────────────────────────────────────────────────
  { questionId: "DIAG-061", questionText: "Simplify: 3(2x - 4) + 5x", questionType: "multiple_choice", choices: [{ label: "A", text: "11x - 12" }, { label: "B", text: "11x - 4" }, { label: "C", text: "6x - 12" }, { label: "D", text: "11x + 12" }], correctAnswer: "A", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "3(2x-4)+5x = 6x-12+5x = 11x-12.", sortOrder: 61 },
  { questionId: "DIAG-062", questionText: "What is the value of 2^4 - 3 × 2?", questionType: "multiple_choice", choices: [{ label: "A", text: "10" }, { label: "B", text: "26" }, { label: "C", text: "8" }, { label: "D", text: "22" }], correctAnswer: "A", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "2^4 = 16. 3×2 = 6. 16-6 = 10.", sortOrder: 62 },
  { questionId: "DIAG-063", questionText: "Evaluate: |−7| + |3|", questionType: "multiple_choice", choices: [{ label: "A", text: "10" }, { label: "B", text: "4" }, { label: "C", text: "-4" }, { label: "D", text: "-10" }], correctAnswer: "A", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "|−7| = 7, |3| = 3. Sum = 10.", sortOrder: 63 },

  // ─── Unit 1: Foundations of Algebra (Bank B) ─────────────────────────────
  { questionId: "DIAG-031", questionText: "Which property is illustrated by: 5 + (3 + 2) = (5 + 3) + 2?", questionType: "multiple_choice", choices: [{ label: "A", text: "Associative Property of Addition" }, { label: "B", text: "Commutative Property" }, { label: "C", text: "Distributive Property" }, { label: "D", text: "Identity Property" }], correctAnswer: "A", mapsToUnit: "1", mapsToSkills: ["ALG1-U1-S1"], difficulty: "easy", explanation: "Regrouping addends without changing order is the Associative Property.", sortOrder: 31 },
  { questionId: "DIAG-032", questionText: "If p = 4 and q = −3, evaluate 2p − q².", questionType: "multiple_choice", choices: [{ label: "A", text: "-1" }, { label: "B", text: "17" }, { label: "C", text: "1" }, { label: "D", text: "-17" }], correctAnswer: "A", mapsToUnit: "1", mapsToSkills: ["ALG1-U1-S3"], difficulty: "medium", explanation: "2(4) − (−3)² = 8 − 9 = −1.", sortOrder: 32 },

  // ─── Unit 2: Linear Equations (Bank B) ───────────────────────────────────
  { questionId: "DIAG-033", questionText: "Solve for x: 3x + 7 = 22", questionType: "multiple_choice", choices: [{ label: "A", text: "5" }, { label: "B", text: "9" }, { label: "C", text: "3" }, { label: "D", text: "15" }], correctAnswer: "A", mapsToUnit: "2", mapsToSkills: ["ALG1-U2-S1"], difficulty: "easy", explanation: "3x = 15, x = 5.", sortOrder: 33 },
  { questionId: "DIAG-034", questionText: "Solve: 4(x − 2) = 2x + 6", questionType: "multiple_choice", choices: [{ label: "A", text: "7" }, { label: "B", text: "5" }, { label: "C", text: "3" }, { label: "D", text: "1" }], correctAnswer: "A", mapsToUnit: "2", mapsToSkills: ["ALG1-U2-S2"], difficulty: "medium", explanation: "4x − 8 = 2x + 6 → 2x = 14 → x = 7.", sortOrder: 34 },

  // ─── Unit 3: Inequalities (Bank B) ────────────────────────────────────────
  { questionId: "DIAG-035", questionText: "Which graph represents x ≥ −2?", questionType: "multiple_choice", choices: [{ label: "A", text: "Closed circle at −2, shaded right" }, { label: "B", text: "Open circle at −2, shaded right" }, { label: "C", text: "Closed circle at −2, shaded left" }, { label: "D", text: "Open circle at 2, shaded left" }], correctAnswer: "A", mapsToUnit: "3", mapsToSkills: ["ALG1-U3-S1"], difficulty: "easy", explanation: "≥ means closed circle; right means greater than.", sortOrder: 35 },
  { questionId: "DIAG-036", questionText: "Solve and graph: −3x + 6 > 0", questionType: "multiple_choice", choices: [{ label: "A", text: "x < 2" }, { label: "B", text: "x > 2" }, { label: "C", text: "x < −2" }, { label: "D", text: "x > −2" }], correctAnswer: "A", mapsToUnit: "3", mapsToSkills: ["ALG1-U3-S2"], difficulty: "medium", explanation: "−3x > −6 → x < 2 (flip inequality when dividing by negative).", sortOrder: 36 },

  // ─── Unit 4: Functions (Bank B) ───────────────────────────────────────────
  { questionId: "DIAG-037", questionText: "Which set of ordered pairs represents a function?", questionType: "multiple_choice", choices: [{ label: "A", text: "{(1,2),(2,3),(3,4)}" }, { label: "B", text: "{(1,2),(1,3),(2,4)}" }, { label: "C", text: "{(2,1),(2,2),(2,3)}" }, { label: "D", text: "{(0,0),(0,1),(1,0)}" }], correctAnswer: "A", mapsToUnit: "4", mapsToSkills: ["ALG1-U4-S1"], difficulty: "easy", explanation: "Each x maps to exactly one y only in option A.", sortOrder: 37 },
  { questionId: "DIAG-038", questionText: "If f(x) = 3x² − 2, find f(−2).", questionType: "multiple_choice", choices: [{ label: "A", text: "10" }, { label: "B", text: "-14" }, { label: "C", text: "14" }, { label: "D", text: "-10" }], correctAnswer: "A", mapsToUnit: "4", mapsToSkills: ["ALG1-U4-S2"], difficulty: "medium", explanation: "f(−2) = 3(4) − 2 = 12 − 2 = 10.", sortOrder: 38 },

  // ─── Unit 5: Linear Functions (Bank B) ────────────────────────────────────
  { questionId: "DIAG-039", questionText: "What is the y-intercept of y = −4x + 9?", questionType: "multiple_choice", choices: [{ label: "A", text: "9" }, { label: "B", text: "-4" }, { label: "C", text: "4" }, { label: "D", text: "-9" }], correctAnswer: "A", mapsToUnit: "5", mapsToSkills: ["ALG1-U5-S1"], difficulty: "easy", explanation: "The y-intercept is the constant term: 9.", sortOrder: 39 },
  { questionId: "DIAG-040", questionText: "A line passes through (0, 3) and (4, 11). What is the equation?", questionType: "multiple_choice", choices: [{ label: "A", text: "y = 2x + 3" }, { label: "B", text: "y = 3x + 2" }, { label: "C", text: "y = 2x − 3" }, { label: "D", text: "y = 4x + 3" }], correctAnswer: "A", mapsToUnit: "5", mapsToSkills: ["ALG1-U5-S3"], difficulty: "medium", explanation: "Slope = (11−3)/(4−0) = 2. y-intercept = 3. Equation: y = 2x + 3.", sortOrder: 40 },

  // ─── Unit 6: Systems of Equations (Bank B) ────────────────────────────────
  { questionId: "DIAG-041", questionText: "Solve the system: x + y = 10, x − y = 4", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 7, y = 3" }, { label: "B", text: "x = 3, y = 7" }, { label: "C", text: "x = 6, y = 4" }, { label: "D", text: "x = 5, y = 5" }], correctAnswer: "A", mapsToUnit: "6", mapsToSkills: ["ALG1-U6-S1"], difficulty: "easy", explanation: "Add equations: 2x = 14 → x = 7. Then y = 3.", sortOrder: 41 },
  { questionId: "DIAG-042", questionText: "Which system has no solution?", questionType: "multiple_choice", choices: [{ label: "A", text: "y = 2x + 1 and y = 2x − 3" }, { label: "B", text: "y = 2x + 1 and y = 3x + 1" }, { label: "C", text: "y = x and y = −x" }, { label: "D", text: "y = 4 and x = 4" }], correctAnswer: "A", mapsToUnit: "6", mapsToSkills: ["ALG1-U6-S4"], difficulty: "medium", explanation: "Parallel lines (same slope, different y-intercepts) never intersect → no solution.", sortOrder: 42 },

  // ─── Unit 7: Exponents & Exponential Functions (Bank B) ───────────────────
  { questionId: "DIAG-043", questionText: "Simplify: (2x³)²", questionType: "multiple_choice", choices: [{ label: "A", text: "4x⁶" }, { label: "B", text: "2x⁶" }, { label: "C", text: "4x⁵" }, { label: "D", text: "2x⁵" }], correctAnswer: "A", mapsToUnit: "7", mapsToSkills: ["ALG1-U7-S1"], difficulty: "easy", explanation: "(2)² = 4, (x³)² = x⁶. Result: 4x⁶.", sortOrder: 43 },
  { questionId: "DIAG-044", questionText: "A bank account starts at $200 and grows 5% per year. What is the value after 3 years?", questionType: "multiple_choice", choices: [{ label: "A", text: "$231.53" }, { label: "B", text: "$230.00" }, { label: "C", text: "$260.00" }, { label: "D", text: "$215.00" }], correctAnswer: "A", mapsToUnit: "7", mapsToSkills: ["ALG1-U7-S6"], difficulty: "medium", explanation: "200 × 1.05³ = 200 × 1.157625 ≈ $231.53.", sortOrder: 44 },

  // ─── Unit 8: Polynomials (Bank B) ─────────────────────────────────────────
  { questionId: "DIAG-045", questionText: "Subtract: (5x² − 3x + 2) − (2x² + x − 4)", questionType: "multiple_choice", choices: [{ label: "A", text: "3x² − 4x + 6" }, { label: "B", text: "3x² − 2x − 2" }, { label: "C", text: "3x² + 4x + 6" }, { label: "D", text: "7x² − 4x − 2" }], correctAnswer: "A", mapsToUnit: "8", mapsToSkills: ["ALG1-U8-S2"], difficulty: "easy", explanation: "5x²−2x²=3x², −3x−x=−4x, 2−(−4)=6. Result: 3x²−4x+6.", sortOrder: 45 },
  { questionId: "DIAG-046", questionText: "Expand: (2x − 3)²", questionType: "multiple_choice", choices: [{ label: "A", text: "4x² − 12x + 9" }, { label: "B", text: "4x² + 9" }, { label: "C", text: "4x² − 6x + 9" }, { label: "D", text: "2x² − 12x + 9" }], correctAnswer: "A", mapsToUnit: "8", mapsToSkills: ["ALG1-U8-S4"], difficulty: "medium", explanation: "(2x)² − 2(2x)(3) + 3² = 4x² − 12x + 9.", sortOrder: 46 },

  // ─── Unit 9: Factoring (Bank B) ───────────────────────────────────────────
  { questionId: "DIAG-047", questionText: "Factor completely: 3x² − 12", questionType: "multiple_choice", choices: [{ label: "A", text: "3(x − 2)(x + 2)" }, { label: "B", text: "3(x² − 4)" }, { label: "C", text: "(3x − 6)(x + 2)" }, { label: "D", text: "3(x − 4)(x + 1)" }], correctAnswer: "A", mapsToUnit: "9", mapsToSkills: ["ALG1-U9-S1"], difficulty: "easy", explanation: "GCF = 3: 3(x²−4) = 3(x−2)(x+2) (difference of squares).", sortOrder: 47 },
  { questionId: "DIAG-048", questionText: "Factor: x² − 7x + 12", questionType: "multiple_choice", choices: [{ label: "A", text: "(x − 3)(x − 4)" }, { label: "B", text: "(x + 3)(x + 4)" }, { label: "C", text: "(x − 6)(x − 2)" }, { label: "D", text: "(x − 12)(x + 1)" }], correctAnswer: "A", mapsToUnit: "9", mapsToSkills: ["ALG1-U9-S2"], difficulty: "medium", explanation: "Find two numbers multiplying to 12 and adding to −7: −3 and −4.", sortOrder: 48 },

  // ─── Unit 10: Quadratic Functions (Bank B) ────────────────────────────────
  { questionId: "DIAG-049", questionText: "What is the axis of symmetry for y = 2x² − 8x + 5?", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 2" }, { label: "B", text: "x = 4" }, { label: "C", text: "x = −2" }, { label: "D", text: "x = 8" }], correctAnswer: "A", mapsToUnit: "10", mapsToSkills: ["ALG1-U10-S1"], difficulty: "easy", explanation: "x = −b/(2a) = 8/(2×2) = 2.", sortOrder: 49 },
  { questionId: "DIAG-050", questionText: "Use the quadratic formula to solve: x² + 4x − 5 = 0", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 1 or x = −5" }, { label: "B", text: "x = −1 or x = 5" }, { label: "C", text: "x = 2 or x = −5" }, { label: "D", text: "x = 1 or x = 5" }], correctAnswer: "A", mapsToUnit: "10", mapsToSkills: ["ALG1-U10-S4"], difficulty: "medium", explanation: "x = (−4 ± √(16+20))/2 = (−4 ± 6)/2. x = 1 or x = −5.", sortOrder: 50 },

  // ─── Unit 11: Statistics & Data (Bank B) ──────────────────────────────────
  { questionId: "DIAG-051", questionText: "A data set has values: 4, 8, 6, 5, 3, 2, 8, 9, 2, 5. What is the median?", questionType: "multiple_choice", choices: [{ label: "A", text: "5" }, { label: "B", text: "5.2" }, { label: "C", text: "6" }, { label: "D", text: "4.5" }], correctAnswer: "A", mapsToUnit: "11", mapsToSkills: ["ALG1-U11-S1"], difficulty: "easy", explanation: "Sorted: 2,2,3,4,5,5,6,8,8,9. Median = (5+5)/2 = 5.", sortOrder: 51 },
  { questionId: "DIAG-052", questionText: "A line of best fit has equation y = 3x + 2. What does the slope represent?", questionType: "multiple_choice", choices: [{ label: "A", text: "For each unit increase in x, y increases by 3" }, { label: "B", text: "The starting value is 3" }, { label: "C", text: "y decreases by 3 for each unit increase in x" }, { label: "D", text: "The correlation is 3" }], correctAnswer: "A", mapsToUnit: "11", mapsToSkills: ["ALG1-U11-S4"], difficulty: "medium", explanation: "Slope = 3 means y increases by 3 for every 1-unit increase in x.", sortOrder: 52 },

  // ─── Unit 12: Applications (Bank B) ───────────────────────────────────────
  { questionId: "DIAG-053", questionText: "A car travels at 60 mph. How long does it take to travel 210 miles?", questionType: "multiple_choice", choices: [{ label: "A", text: "3.5 hours" }, { label: "B", text: "3 hours" }, { label: "C", text: "4 hours" }, { label: "D", text: "2.5 hours" }], correctAnswer: "A", mapsToUnit: "12", mapsToSkills: ["ALG1-U2-S4"], difficulty: "easy", explanation: "t = d/r = 210/60 = 3.5 hours.", sortOrder: 53 },
  { questionId: "DIAG-054", questionText: "A garden is rectangular with perimeter 56 m. If the length is 4 m more than the width, what is the width?", questionType: "multiple_choice", choices: [{ label: "A", text: "12 m" }, { label: "B", text: "16 m" }, { label: "C", text: "8 m" }, { label: "D", text: "14 m" }], correctAnswer: "A", mapsToUnit: "12", mapsToSkills: ["ALG1-U2-S2"], difficulty: "medium", explanation: "2(w + w+4) = 56 → 4w + 8 = 56 → w = 12.", sortOrder: 54 },
];

async function main() {
  const conn = await createConnection({ host, port: parseInt(port), user, password, database, ssl: { rejectUnauthorized: true } });
  let inserted = 0, skipped = 0;
  for (const q of bankB) {
    try {
      await conn.execute(
        `INSERT IGNORE INTO diagnosticQuestions
          (questionId, questionText, questionType, choices, correctAnswer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.questionId, q.questionText, q.questionType, JSON.stringify(q.choices), q.correctAnswer, q.mapsToUnit, JSON.stringify(q.mapsToSkills), q.difficulty, q.explanation, q.sortOrder]
      );
      inserted++;
    } catch (e) {
      console.warn(`Skipped ${q.questionId}:`, e.message);
      skipped++;
    }
  }
  await conn.end();
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
