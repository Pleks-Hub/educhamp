/**
 * Seed 20 additional quiz questions for Algebra I Units 1 and 2
 * Brings each unit from 10 → 30 questions for variety on retakes.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── Helpers ──────────────────────────────────────────────────────────────────

const mc = (unitNumber, questionText, a, b, c, d, correctLabel, explanation, skillTag, difficulty = "easy") => ({
  unitNumber, questionText,
  questionType: "multiple_choice",
  choices: [{ label: "A", text: a }, { label: "B", text: b }, { label: "C", text: c }, { label: "D", text: d }],
  correctAnswer: correctLabel,
  explanation, skillTag, difficulty,
});

const sa = (unitNumber, questionText, correctAnswer, explanation, skillTag, difficulty = "medium") => ({
  unitNumber, questionText, questionType: "short_answer",
  choices: null, correctAnswer, explanation, skillTag, difficulty,
});

// ── Unit 1 Extra Questions (20) ───────────────────────────────────────────────

const unit1Extra = [
  mc(1, "Which of the following is a variable?", "7", "x", "3.14", "100", "B",
    "A variable is a letter that represents an unknown value.", "ALG1-U1-S1"),
  mc(1, "What is the coefficient of y in the expression 9y − 4?", "−4", "4", "9", "y", "C",
    "The coefficient is the number multiplied by the variable.", "ALG1-U1-S1"),
  mc(1, "Evaluate 3a + 2b when a = 4 and b = 5.", "22", "17", "26", "19", "A",
    "3(4) + 2(5) = 12 + 10 = 22.", "ALG1-U1-S2"),
  mc(1, "Evaluate 5x² when x = 3.", "30", "45", "90", "15", "B",
    "5(3²) = 5(9) = 45.", "ALG1-U1-S2"),
  mc(1, "Simplify: 18 ÷ 3 + 4 × 2", "20", "14", "12", "16", "B",
    "Division and multiplication first: 6 + 8 = 14.", "ALG1-U1-S3"),
  mc(1, "Simplify: 2 + 3² × 4 − 1", "37", "44", "35", "40", "A",
    "Exponent first: 9; then 2 + 36 − 1 = 37.", "ALG1-U1-S3", "medium"),
  mc(1, "Which property is shown? 5(x + 3) = 5x + 15",
    "Commutative", "Associative", "Distributive", "Identity", "C",
    "Multiplying across the parentheses is the distributive property.", "ALG1-U1-S4"),
  mc(1, "Which property is shown? (a + b) + c = a + (b + c)",
    "Commutative", "Associative", "Distributive", "Zero", "B",
    "Regrouping addends is the associative property.", "ALG1-U1-S4"),
  mc(1, "Simplify: 4x + 7 + 2x − 3", "6x + 4", "6x + 10", "2x + 4", "6x − 4", "A",
    "Combine like terms: 4x + 2x = 6x and 7 − 3 = 4.", "ALG1-U1-S5"),
  mc(1, "Simplify: 9m − 3n + 2m + 5n", "11m + 2n", "7m + 2n", "11m − 8n", "7m − 8n", "A",
    "9m + 2m = 11m and −3n + 5n = 2n.", "ALG1-U1-S5"),
  mc(1, "Which expression represents 'six less than twice a number n'?",
    "6 − 2n", "2n − 6", "2(n − 6)", "6n − 2", "B",
    "'Twice a number' is 2n; 'six less than' subtracts 6 from it.", "ALG1-U1-S6"),
  mc(1, "Which expression represents 'the product of 4 and a number, increased by 7'?",
    "4 + 7n", "4n + 7", "7n + 4", "4(n + 7)", "B",
    "Product of 4 and n is 4n; increased by 7 gives 4n + 7.", "ALG1-U1-S6"),
  sa(1, "Evaluate 2x³ − x when x = 2.", "14",
    "2(8) − 2 = 16 − 2 = 14.", "ALG1-U1-S2"),
  sa(1, "Simplify: 3(2a − 5) + 4a", "10a − 15",
    "Distribute: 6a − 15 + 4a = 10a − 15.", "ALG1-U1-S4"),
  sa(1, "Write an expression for 'three times the sum of a number and eight'.", "3(n + 8)",
    "Sum of n and 8 is (n + 8); three times that is 3(n + 8).", "ALG1-U1-S6"),
  mc(1, "What is the constant in the expression 7x² − 3x + 11?", "7", "3", "11", "x", "C",
    "A constant has no variable attached to it.", "ALG1-U1-S1"),
  mc(1, "Simplify: −2(3x − 4)", "−6x − 8", "−6x + 8", "6x − 8", "−6x + 4", "B",
    "−2 × 3x = −6x and −2 × −4 = +8.", "ALG1-U1-S4"),
  mc(1, "Which shows the commutative property of multiplication?",
    "a(bc) = (ab)c", "a × b = b × a", "a(b + c) = ab + ac", "a × 1 = a", "B",
    "Changing the order of factors is the commutative property.", "ALG1-U1-S4"),
  mc(1, "Evaluate |−8| + |3|.", "5", "−5", "11", "−11", "C",
    "Absolute values: 8 + 3 = 11.", "ALG1-U1-S2"),
  sa(1, "How many terms are in: 4x² − 7xy + 2x − 9?", "4",
    "Each part separated by + or − is a term: 4x², −7xy, 2x, −9.", "ALG1-U1-S1", "easy"),
];

// ── Unit 2 Extra Questions (20) ───────────────────────────────────────────────

const unit2Extra = [
  mc(2, "Solve: x + 14 = 31", "x = 17", "x = 45", "x = 15", "x = 47", "A",
    "Subtract 14 from both sides: x = 31 − 14 = 17.", "ALG1-U2-S1"),
  mc(2, "Solve: 3x = 54", "x = 18", "x = 51", "x = 57", "x = 162", "A",
    "Divide both sides by 3: x = 54 ÷ 3 = 18.", "ALG1-U2-S1"),
  mc(2, "Solve: x/7 = 9", "x = 2", "x = 16", "x = 63", "x = 1.3", "C",
    "Multiply both sides by 7: x = 63.", "ALG1-U2-S1"),
  mc(2, "Solve: 4x − 3 = 17", "x = 3.5", "x = 5", "x = 7", "x = 4", "B",
    "Add 3: 4x = 20; divide by 4: x = 5.", "ALG1-U2-S2"),
  mc(2, "Solve: 2(x + 5) = 24", "x = 7", "x = 14", "x = 17", "x = 9.5", "A",
    "Distribute: 2x + 10 = 24; 2x = 14; x = 7.", "ALG1-U2-S2"),
  mc(2, "Solve: 5x + 3 = 3x + 11", "x = 4", "x = 7", "x = 2", "x = 1", "A",
    "5x − 3x = 11 − 3 → 2x = 8 → x = 4.", "ALG1-U2-S3"),
  mc(2, "Solve: 7x − 2 = 4x + 10", "x = 4", "x = 3", "x = 6", "x = 2", "A",
    "3x = 12 → x = 4.", "ALG1-U2-S3"),
  mc(2, "Which value of x satisfies 3(x − 2) = 2x + 1?", "x = 5", "x = 7", "x = 3", "x = 9", "B",
    "3x − 6 = 2x + 1 → x = 7.", "ALG1-U2-S3", "medium"),
  mc(2, "Solve for y: 2y/3 = 8", "y = 4", "y = 12", "y = 24", "y = 16", "B",
    "Multiply both sides by 3: 2y = 24; divide by 2: y = 12.", "ALG1-U2-S2"),
  mc(2, "A number increased by 12 equals 29. What is the number?", "17", "41", "12", "29", "A",
    "n + 12 = 29 → n = 17.", "ALG1-U2-S4"),
  mc(2, "Twice a number decreased by 5 equals 19. Find the number.", "7", "12", "8", "14", "B",
    "2n − 5 = 19 → 2n = 24 → n = 12.", "ALG1-U2-S4"),
  mc(2, "Solve: −3x + 9 = 0", "x = −3", "x = 3", "x = 9", "x = −9", "B",
    "−3x = −9 → x = 3.", "ALG1-U2-S2"),
  mc(2, "Solve: x/4 + 2 = 7", "x = 20", "x = 36", "x = 9", "x = 5", "A",
    "x/4 = 5 → x = 20.", "ALG1-U2-S2"),
  mc(2, "Solve: 6 − 2x = 14", "x = −4", "x = 4", "x = 10", "x = −10", "A",
    "−2x = 8 → x = −4.", "ALG1-U2-S2"),
  mc(2, "Which equation has no solution?",
    "2x + 3 = 2x + 3", "2x + 3 = 2x + 5", "x = x", "3 = 3", "B",
    "2x + 3 = 2x + 5 simplifies to 3 = 5 — false, so no solution.", "ALG1-U2-S5", "medium"),
  mc(2, "Which equation has infinitely many solutions?",
    "x + 1 = x + 2", "2x = 2x", "x = 0", "3x = 9", "B",
    "2x = 2x is always true for any x — infinitely many solutions.", "ALG1-U2-S5", "medium"),
  sa(2, "Solve: 5(2x − 1) = 3(x + 8)", "x = 29/7",
    "10x − 5 = 3x + 24 → 7x = 29 → x = 29/7.", "ALG1-U2-S3", "hard"),
  sa(2, "A rectangle has perimeter 48 cm. Its length is 3 times its width. Find the width.", "6",
    "2(l + w) = 48; l = 3w → 2(4w) = 48 → 8w = 48 → w = 6.", "ALG1-U2-S4", "medium"),
  mc(2, "Solve: 0.5x + 1.5 = 4", "x = 5", "x = 2.5", "x = 11", "x = 3", "A",
    "0.5x = 2.5 → x = 5.", "ALG1-U2-S2"),
  mc(2, "Solve: (x + 3)/2 = 7", "x = 11", "x = 17", "x = 8", "x = 4", "A",
    "x + 3 = 14 → x = 11.", "ALG1-U2-S2"),
];

// ── Insert ────────────────────────────────────────────────────────────────────

async function getUnitId(unitNumber) {
  const [rows] = await conn.execute(
    `SELECT u.id FROM units u
     JOIN courses c ON u.courseId = c.id
     WHERE c.courseCode = 'ALG1' AND u.unitNumber = ?`,
    [unitNumber]
  );
  if (!rows.length) throw new Error(`Unit ${unitNumber} not found for ALG1`);
  return rows[0].id;
}

async function getNextSortOrder(unitId) {
  const [rows] = await conn.execute(
    `SELECT COALESCE(MAX(sortOrder), 0) + 1 AS next FROM quizQuestions WHERE unitId = ?`,
    [unitId]
  );
  return rows[0].next;
}

const unit1Id = await getUnitId(1);
const unit2Id = await getUnitId(2);

let inserted = 0;
for (const q of [...unit1Extra, ...unit2Extra]) {
  const unitId = q.unitNumber === 1 ? unit1Id : unit2Id;
  const sortOrder = await getNextSortOrder(unitId);
  await conn.execute(
    `INSERT INTO quizQuestions
       (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      unitId,
      q.questionText,
      q.questionType,
      q.choices ? JSON.stringify(q.choices) : null,
      q.correctAnswer,
      q.explanation,
      q.skillTag,
      q.difficulty,
      sortOrder,
    ]
  );
  inserted++;
}

console.log(`✅  Inserted ${inserted} extra questions for Algebra I Units 1 & 2`);
await conn.end();
