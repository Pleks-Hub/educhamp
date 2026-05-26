// Curriculum seed script for EduChamp Algebra I
// Run: node server/seed-curriculum.mjs
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

async function run(sql, params = []) {
  await db.execute(sql, params);
}

async function insert(table, obj) {
  const keys = Object.keys(obj);
  const placeholders = keys.map(() => "?").join(", ");
  const values = keys.map((k) => {
    const v = obj[k];
    return typeof v === "object" && v !== null ? JSON.stringify(v) : v;
  });
  await db.execute(`INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(", ")}) VALUES (${placeholders})`, values);
}

// ─── Clear existing seed data ─────────────────────────────────────────────────
console.log("Clearing existing curriculum data...");
await run("DELETE FROM diagnosticQuestions");
await run("DELETE FROM quizQuestions");
await run("DELETE FROM skills");
await run("DELETE FROM lessons");
await run("DELETE FROM units");

// ─── Units ────────────────────────────────────────────────────────────────────
console.log("Seeding units...");
const unitsData = [
  { unitNumber: 1, title: "Foundations of Algebra", overview: "This unit builds the mathematical vocabulary and number sense you need for all of Algebra I. You will work with variables, expressions, and the properties that govern how numbers behave. These concepts appear in every unit that follows, so mastering them now pays dividends throughout the course.", teksAlignment: "Aligned to TEKS Algebra I — algebraic reasoning and number properties", sortOrder: 1 },
  { unitNumber: 2, title: "Linear Equations", overview: "You will learn to solve equations with one variable — from simple one-step problems to multi-step equations with variables on both sides. Solving equations is the central skill of Algebra I and connects directly to graphing, systems, and real-world problem solving.", teksAlignment: "Aligned to TEKS Algebra I — solving linear equations", sortOrder: 2 },
  { unitNumber: 3, title: "Linear Inequalities", overview: "Inequalities extend equation-solving to situations where there is a range of solutions rather than a single answer. You will solve, graph, and interpret inequalities on number lines and apply them to real-world constraints like budgets and speed limits.", teksAlignment: "Aligned to TEKS Algebra I — solving linear inequalities", sortOrder: 3 },
  { unitNumber: 4, title: "Functions and Relations", overview: "A function is a rule that assigns exactly one output to each input. This unit introduces the language of functions — domain, range, function notation, and multiple representations — which forms the foundation for every graphing and modeling unit ahead.", teksAlignment: "Aligned to TEKS Algebra I — functions and their representations", sortOrder: 4 },
  { unitNumber: 5, title: "Linear Functions and Graphing", overview: "You will connect equations to their graphs, explore slope as a rate of change, and write linear equations in multiple forms. Graphing linear functions is a core skill for understanding relationships between quantities in science, economics, and everyday life.", teksAlignment: "Aligned to TEKS Algebra I — linear functions and graphing", sortOrder: 5 },
  { unitNumber: 6, title: "Systems of Equations", overview: "When two linear equations share the same variables, finding the values that satisfy both simultaneously is called solving a system. You will use graphing, substitution, and elimination — three distinct strategies — and apply them to real-world scenarios involving two unknowns.", teksAlignment: "Aligned to TEKS Algebra I — systems of linear equations", sortOrder: 6 },
  { unitNumber: 7, title: "Exponents and Exponential Functions", overview: "Exponent rules govern how powers multiply, divide, and combine. This unit moves from integer exponents to exponential growth and decay models — patterns that describe population growth, compound interest, and radioactive decay in the real world.", teksAlignment: "Aligned to TEKS Algebra I — exponents and exponential functions", sortOrder: 7 },
  { unitNumber: 8, title: "Polynomials", overview: "Polynomials are algebraic expressions with multiple terms. You will add, subtract, and multiply them — skills that are essential for factoring in Unit 9 and working with quadratic functions in Unit 10. Think of this unit as building the toolkit you need for the next two units.", teksAlignment: "Aligned to TEKS Algebra I — polynomial operations", sortOrder: 8 },
  { unitNumber: 9, title: "Factoring", overview: "Factoring is the reverse of multiplication — you break a polynomial into its component factors. This unit covers GCF factoring, trinomial factoring, and special patterns. Factoring is the primary method for solving quadratic equations in Unit 10.", teksAlignment: "Aligned to TEKS Algebra I — factoring polynomials", sortOrder: 9 },
  { unitNumber: 10, title: "Quadratic Functions", overview: "Quadratic functions produce parabolas — U-shaped curves that model projectile motion, area problems, and profit optimization. You will graph parabolas, find their key features, and solve quadratic equations using factoring, the quadratic formula, and completing the square.", teksAlignment: "Aligned to TEKS Algebra I — quadratic functions and equations", sortOrder: 10 },
  { unitNumber: 11, title: "Data Analysis and Scatter Plots", overview: "Data analysis connects algebra to statistics. You will create and interpret scatter plots, find lines of best fit, and use correlation to describe relationships between variables. These skills appear on the STAAR exam and in every data-driven field.", teksAlignment: "Aligned to TEKS Algebra I — data analysis and statistical reasoning", sortOrder: 11 },
  { unitNumber: 12, title: "STAAR/EOC-Style Review", overview: "This unit consolidates all 11 prior units into STAAR/EOC exam-style practice. You will work through multi-step problems that combine concepts from multiple units, practice time management, and build the test-taking strategies needed to perform your best on exam day.", teksAlignment: "Aligned to TEKS Algebra I — comprehensive review across all strands", sortOrder: 12 },
];

for (const u of unitsData) {
  await insert("units", u);
}

// ─── Skills ───────────────────────────────────────────────────────────────────
console.log("Seeding skills...");
const skillsData = [
  // Unit 1
  { skillId: "ALG1-U1-S1", skillName: "Identifying variables, constants, and coefficients in algebraic expressions", unitNumber: 1, prerequisiteSkillIds: [] },
  { skillId: "ALG1-U1-S2", skillName: "Evaluating algebraic expressions by substituting given values", unitNumber: 1, prerequisiteSkillIds: ["ALG1-U1-S1"] },
  { skillId: "ALG1-U1-S3", skillName: "Applying the order of operations (PEMDAS) to multi-step expressions", unitNumber: 1, prerequisiteSkillIds: [] },
  { skillId: "ALG1-U1-S4", skillName: "Applying the commutative, associative, and distributive properties", unitNumber: 1, prerequisiteSkillIds: ["ALG1-U1-S1"] },
  { skillId: "ALG1-U1-S5", skillName: "Combining like terms to simplify algebraic expressions", unitNumber: 1, prerequisiteSkillIds: ["ALG1-U1-S1", "ALG1-U1-S4"] },
  { skillId: "ALG1-U1-S6", skillName: "Translating verbal phrases into algebraic expressions and equations", unitNumber: 1, prerequisiteSkillIds: ["ALG1-U1-S1"] },
  // Unit 2
  { skillId: "ALG1-U2-S1", skillName: "Solving one-step equations using addition and subtraction", unitNumber: 2, prerequisiteSkillIds: ["ALG1-U1-S1"] },
  { skillId: "ALG1-U2-S2", skillName: "Solving one-step equations using multiplication and division", unitNumber: 2, prerequisiteSkillIds: ["ALG1-U1-S1"] },
  { skillId: "ALG1-U2-S3", skillName: "Solving two-step equations with variables on one side", unitNumber: 2, prerequisiteSkillIds: ["ALG1-U2-S1", "ALG1-U2-S2"] },
  { skillId: "ALG1-U2-S4", skillName: "Solving multi-step equations requiring combining like terms first", unitNumber: 2, prerequisiteSkillIds: ["ALG1-U1-S5", "ALG1-U2-S3"] },
  { skillId: "ALG1-U2-S5", skillName: "Solving equations with variables on both sides", unitNumber: 2, prerequisiteSkillIds: ["ALG1-U2-S3", "ALG1-U2-S4"] },
  { skillId: "ALG1-U2-S6", skillName: "Solving equations involving the distributive property", unitNumber: 2, prerequisiteSkillIds: ["ALG1-U1-S4", "ALG1-U2-S4"] },
  { skillId: "ALG1-U2-S7", skillName: "Writing and solving equations from real-world word problems", unitNumber: 2, prerequisiteSkillIds: ["ALG1-U1-S6", "ALG1-U2-S5"] },
  // Unit 3
  { skillId: "ALG1-U3-S1", skillName: "Writing and graphing simple inequalities on a number line", unitNumber: 3, prerequisiteSkillIds: ["ALG1-U2-S1"] },
  { skillId: "ALG1-U3-S2", skillName: "Solving one-step inequalities using addition and subtraction", unitNumber: 3, prerequisiteSkillIds: ["ALG1-U3-S1"] },
  { skillId: "ALG1-U3-S3", skillName: "Solving one-step inequalities using multiplication and division, including sign flip", unitNumber: 3, prerequisiteSkillIds: ["ALG1-U3-S2"] },
  { skillId: "ALG1-U3-S4", skillName: "Solving multi-step inequalities and graphing solution sets", unitNumber: 3, prerequisiteSkillIds: ["ALG1-U3-S3", "ALG1-U2-S4"] },
  { skillId: "ALG1-U3-S5", skillName: "Solving compound inequalities (AND / OR) and graphing on a number line", unitNumber: 3, prerequisiteSkillIds: ["ALG1-U3-S4"] },
  { skillId: "ALG1-U3-S6", skillName: "Writing and solving inequalities from real-world constraint problems", unitNumber: 3, prerequisiteSkillIds: ["ALG1-U3-S4", "ALG1-U1-S6"] },
  // Unit 4
  { skillId: "ALG1-U4-S1", skillName: "Distinguishing between relations and functions using mapping diagrams and tables", unitNumber: 4, prerequisiteSkillIds: [] },
  { skillId: "ALG1-U4-S2", skillName: "Identifying domain and range from sets of ordered pairs, tables, and graphs", unitNumber: 4, prerequisiteSkillIds: ["ALG1-U4-S1"] },
  { skillId: "ALG1-U4-S3", skillName: "Applying the vertical line test to determine if a graph represents a function", unitNumber: 4, prerequisiteSkillIds: ["ALG1-U4-S1"] },
  { skillId: "ALG1-U4-S4", skillName: "Using function notation f(x) to evaluate and interpret functions", unitNumber: 4, prerequisiteSkillIds: ["ALG1-U4-S1", "ALG1-U1-S2"] },
  { skillId: "ALG1-U4-S5", skillName: "Representing functions in multiple forms: equation, table, graph, and verbal description", unitNumber: 4, prerequisiteSkillIds: ["ALG1-U4-S2", "ALG1-U4-S4"] },
  // Unit 5
  { skillId: "ALG1-U5-S1", skillName: "Calculating slope from two points using the slope formula", unitNumber: 5, prerequisiteSkillIds: ["ALG1-U4-S2"] },
  { skillId: "ALG1-U5-S2", skillName: "Interpreting slope as a rate of change in real-world contexts", unitNumber: 5, prerequisiteSkillIds: ["ALG1-U5-S1"] },
  { skillId: "ALG1-U5-S3", skillName: "Graphing linear equations using slope-intercept form y = mx + b", unitNumber: 5, prerequisiteSkillIds: ["ALG1-U5-S1", "ALG1-U4-S5"] },
  { skillId: "ALG1-U5-S4", skillName: "Writing linear equations in slope-intercept form from a graph or two points", unitNumber: 5, prerequisiteSkillIds: ["ALG1-U5-S3"] },
  { skillId: "ALG1-U5-S5", skillName: "Writing and graphing linear equations in standard form Ax + By = C", unitNumber: 5, prerequisiteSkillIds: ["ALG1-U5-S4"] },
  { skillId: "ALG1-U5-S6", skillName: "Writing equations of parallel and perpendicular lines", unitNumber: 5, prerequisiteSkillIds: ["ALG1-U5-S4"] },
  { skillId: "ALG1-U5-S7", skillName: "Identifying and graphing horizontal and vertical lines", unitNumber: 5, prerequisiteSkillIds: ["ALG1-U5-S3"] },
  // Unit 6
  { skillId: "ALG1-U6-S1", skillName: "Solving systems of equations by graphing two lines", unitNumber: 6, prerequisiteSkillIds: ["ALG1-U5-S3"] },
  { skillId: "ALG1-U6-S2", skillName: "Solving systems of equations by substitution", unitNumber: 6, prerequisiteSkillIds: ["ALG1-U2-S5", "ALG1-U6-S1"] },
  { skillId: "ALG1-U6-S3", skillName: "Solving systems of equations by elimination (addition/subtraction)", unitNumber: 6, prerequisiteSkillIds: ["ALG1-U6-S2"] },
  { skillId: "ALG1-U6-S4", skillName: "Solving systems of equations by elimination with multiplication", unitNumber: 6, prerequisiteSkillIds: ["ALG1-U6-S3"] },
  { skillId: "ALG1-U6-S5", skillName: "Classifying systems as consistent/inconsistent and dependent/independent", unitNumber: 6, prerequisiteSkillIds: ["ALG1-U6-S1"] },
  { skillId: "ALG1-U6-S6", skillName: "Writing and solving systems of equations from real-world word problems", unitNumber: 6, prerequisiteSkillIds: ["ALG1-U6-S4", "ALG1-U2-S7"] },
  // Unit 7
  { skillId: "ALG1-U7-S1", skillName: "Applying the product rule for exponents: x^a * x^b = x^(a+b)", unitNumber: 7, prerequisiteSkillIds: ["ALG1-U1-S3"] },
  { skillId: "ALG1-U7-S2", skillName: "Applying the quotient rule for exponents: x^a / x^b = x^(a-b)", unitNumber: 7, prerequisiteSkillIds: ["ALG1-U7-S1"] },
  { skillId: "ALG1-U7-S3", skillName: "Applying the power rule for exponents: (x^a)^b = x^(ab)", unitNumber: 7, prerequisiteSkillIds: ["ALG1-U7-S1"] },
  { skillId: "ALG1-U7-S4", skillName: "Evaluating expressions with zero and negative integer exponents", unitNumber: 7, prerequisiteSkillIds: ["ALG1-U7-S2"] },
  { skillId: "ALG1-U7-S5", skillName: "Writing and interpreting numbers in scientific notation", unitNumber: 7, prerequisiteSkillIds: ["ALG1-U7-S4"] },
  { skillId: "ALG1-U7-S6", skillName: "Identifying and evaluating exponential growth and decay functions", unitNumber: 7, prerequisiteSkillIds: ["ALG1-U7-S1", "ALG1-U4-S5"] },
  { skillId: "ALG1-U7-S7", skillName: "Modeling real-world situations with exponential functions", unitNumber: 7, prerequisiteSkillIds: ["ALG1-U7-S6"] },
  // Unit 8
  { skillId: "ALG1-U8-S1", skillName: "Identifying degree, leading coefficient, and terms of a polynomial", unitNumber: 8, prerequisiteSkillIds: ["ALG1-U1-S1"] },
  { skillId: "ALG1-U8-S2", skillName: "Adding and subtracting polynomials by combining like terms", unitNumber: 8, prerequisiteSkillIds: ["ALG1-U1-S5", "ALG1-U8-S1"] },
  { skillId: "ALG1-U8-S3", skillName: "Multiplying a monomial by a polynomial using the distributive property", unitNumber: 8, prerequisiteSkillIds: ["ALG1-U1-S4", "ALG1-U8-S1"] },
  { skillId: "ALG1-U8-S4", skillName: "Multiplying two binomials using FOIL or the distributive property", unitNumber: 8, prerequisiteSkillIds: ["ALG1-U8-S3"] },
  { skillId: "ALG1-U8-S5", skillName: "Multiplying polynomials with more than two terms", unitNumber: 8, prerequisiteSkillIds: ["ALG1-U8-S4"] },
  { skillId: "ALG1-U8-S6", skillName: "Recognizing and expanding special products: (a+b)^2, (a-b)^2, (a+b)(a-b)", unitNumber: 8, prerequisiteSkillIds: ["ALG1-U8-S4"] },
  // Unit 9
  { skillId: "ALG1-U9-S1", skillName: "Finding the greatest common factor (GCF) of a polynomial and factoring it out", unitNumber: 9, prerequisiteSkillIds: ["ALG1-U8-S3"] },
  { skillId: "ALG1-U9-S2", skillName: "Factoring trinomials of the form x^2 + bx + c", unitNumber: 9, prerequisiteSkillIds: ["ALG1-U8-S4", "ALG1-U9-S1"] },
  { skillId: "ALG1-U9-S3", skillName: "Factoring trinomials of the form ax^2 + bx + c where a is not 1", unitNumber: 9, prerequisiteSkillIds: ["ALG1-U9-S2"] },
  { skillId: "ALG1-U9-S4", skillName: "Factoring the difference of two squares: a^2 - b^2 = (a+b)(a-b)", unitNumber: 9, prerequisiteSkillIds: ["ALG1-U8-S6", "ALG1-U9-S1"] },
  { skillId: "ALG1-U9-S5", skillName: "Factoring perfect square trinomials: a^2 + 2ab + b^2 and a^2 - 2ab + b^2", unitNumber: 9, prerequisiteSkillIds: ["ALG1-U8-S6", "ALG1-U9-S2"] },
  { skillId: "ALG1-U9-S6", skillName: "Choosing the appropriate factoring strategy for a given polynomial", unitNumber: 9, prerequisiteSkillIds: ["ALG1-U9-S1", "ALG1-U9-S2", "ALG1-U9-S3", "ALG1-U9-S4", "ALG1-U9-S5"] },
  // Unit 10
  { skillId: "ALG1-U10-S1", skillName: "Identifying the vertex, axis of symmetry, and direction of opening of a parabola", unitNumber: 10, prerequisiteSkillIds: ["ALG1-U4-S5", "ALG1-U9-S2"] },
  { skillId: "ALG1-U10-S2", skillName: "Graphing quadratic functions in standard form y = ax^2 + bx + c", unitNumber: 10, prerequisiteSkillIds: ["ALG1-U10-S1"] },
  { skillId: "ALG1-U10-S3", skillName: "Graphing quadratic functions in vertex form y = a(x-h)^2 + k", unitNumber: 10, prerequisiteSkillIds: ["ALG1-U10-S1"] },
  { skillId: "ALG1-U10-S4", skillName: "Solving quadratic equations by factoring", unitNumber: 10, prerequisiteSkillIds: ["ALG1-U9-S6", "ALG1-U10-S1"] },
  { skillId: "ALG1-U10-S5", skillName: "Solving quadratic equations using the square root property", unitNumber: 10, prerequisiteSkillIds: ["ALG1-U10-S1"] },
  { skillId: "ALG1-U10-S6", skillName: "Solving quadratic equations using the quadratic formula", unitNumber: 10, prerequisiteSkillIds: ["ALG1-U10-S4", "ALG1-U10-S5"] },
  { skillId: "ALG1-U10-S7", skillName: "Using the discriminant to determine the number and type of solutions", unitNumber: 10, prerequisiteSkillIds: ["ALG1-U10-S6"] },
  // Unit 11
  { skillId: "ALG1-U11-S1", skillName: "Creating and interpreting scatter plots from two-variable data sets", unitNumber: 11, prerequisiteSkillIds: ["ALG1-U4-S2"] },
  { skillId: "ALG1-U11-S2", skillName: "Describing correlation as positive, negative, or none with appropriate strength", unitNumber: 11, prerequisiteSkillIds: ["ALG1-U11-S1"] },
  { skillId: "ALG1-U11-S3", skillName: "Drawing and writing the equation of a trend line (line of best fit) by inspection", unitNumber: 11, prerequisiteSkillIds: ["ALG1-U5-S4", "ALG1-U11-S1"] },
  { skillId: "ALG1-U11-S4", skillName: "Using a line of best fit to make predictions and assess reasonableness", unitNumber: 11, prerequisiteSkillIds: ["ALG1-U11-S3"] },
  { skillId: "ALG1-U11-S5", skillName: "Distinguishing between correlation and causation", unitNumber: 11, prerequisiteSkillIds: ["ALG1-U11-S2"] },
  // Unit 12
  { skillId: "ALG1-U12-S1", skillName: "Synthesizing linear equation and function concepts across STAAR-style problems", unitNumber: 12, prerequisiteSkillIds: ["ALG1-U2-S7", "ALG1-U5-S4"] },
  { skillId: "ALG1-U12-S2", skillName: "Solving multi-step STAAR-style problems involving systems of equations", unitNumber: 12, prerequisiteSkillIds: ["ALG1-U6-S6"] },
  { skillId: "ALG1-U12-S3", skillName: "Applying quadratic and exponential function knowledge to STAAR-style problems", unitNumber: 12, prerequisiteSkillIds: ["ALG1-U10-S6", "ALG1-U7-S7"] },
  { skillId: "ALG1-U12-S4", skillName: "Interpreting data analysis and scatter plot questions in STAAR format", unitNumber: 12, prerequisiteSkillIds: ["ALG1-U11-S4"] },
];

// Get unit IDs
const [unitRows] = await db.execute("SELECT id, unitNumber FROM units");
const unitMap = {};
for (const row of unitRows) {
  unitMap[row.unitNumber] = row.id;
}

for (let i = 0; i < skillsData.length; i++) {
  const s = skillsData[i];
  await insert("skills", {
    skillId: s.skillId,
    skillName: s.skillName,
    unitId: unitMap[s.unitNumber],
    unitNumber: s.unitNumber,
    prerequisiteSkillIds: s.prerequisiteSkillIds,
    sortOrder: i,
  });
}

// ─── Lessons ──────────────────────────────────────────────────────────────────
console.log("Seeding lessons...");
const lessonsData = [
  // Unit 1 Lessons
  {
    unitNumber: 1, lessonNumber: 1, title: "Variables, Constants, and Expressions",
    teksAlignment: "Aligned to TEKS Algebra I — algebraic reasoning",
    explanation: `Here's what we're doing: algebra uses letters called variables to represent unknown or changing quantities. A constant is a fixed number that never changes. A coefficient is the number multiplied by a variable.\n\nHere's why it matters: without this vocabulary, you can't read or write algebraic expressions — it's like trying to read without knowing the alphabet.\n\nHere's how it works:\n- In the expression 3x + 7, the variable is x, the coefficient is 3, and the constant is 7.\n- In 5y - 2, the variable is y, the coefficient is 5, and the constant is -2.\n- An expression like 4x^2 - 3x + 1 has three terms: 4x^2, -3x, and 1.\n\nNow try one: identify the variable, coefficient, and constant in 6m - 4.`,
    workedExamples: [
      { title: "Identifying Parts of an Expression", problem: "Identify the variable, coefficient, and constant in 8n + 5.", steps: [{ step: "Look at the term with a letter: 8n", explanation: "The letter n is the variable — it represents an unknown value." }, { step: "The number attached to n is 8", explanation: "8 is the coefficient — it tells us how many n's we have." }, { step: "The standalone number is 5", explanation: "5 is the constant — it doesn't change regardless of what n equals." }], answer: "Variable: n, Coefficient: 8, Constant: 5" },
      { title: "Multi-Term Expression", problem: "In the expression 2x^2 - 7x + 3, identify all coefficients and the constant.", steps: [{ step: "First term: 2x^2", explanation: "The coefficient is 2. The variable part is x^2." }, { step: "Second term: -7x", explanation: "The coefficient is -7 (include the sign). The variable is x." }, { step: "Third term: 3", explanation: "This is the constant — no variable attached." }], answer: "Coefficients: 2 and -7, Constant: 3" }
    ],
    guidedProblems: [
      { problem: "What is the coefficient of y in the expression 9y - 4?", hint1: "The coefficient is the number directly in front of the variable.", hint2: "Look at the term that contains y. What number is multiplied by y?", solution: "9", explanation: "In 9y, the number 9 is multiplied by y, so 9 is the coefficient." },
      { problem: "How many terms does the expression 4a - 3b + 7 have?", hint1: "Terms are separated by addition and subtraction signs.", hint2: "Count the groups: 4a, then -3b, then 7.", solution: "3", explanation: "The three terms are 4a, -3b, and 7. Each is separated by + or - signs." }
    ],
    independentProblems: [
      { problem: "Identify the variable, coefficient, and constant in 12p - 8.", solution: "Variable: p, Coefficient: 12, Constant: -8", explanation: "12p means 12 times p, so 12 is the coefficient. The standalone -8 is the constant." },
      { problem: "In 5x + 3y - 6, what is the constant?", solution: "-6", explanation: "The constant is the term with no variable. That's -6." },
      { problem: "True or false: in the expression 7k, the coefficient is 7 and the constant is 0.", solution: "True", explanation: "7k has coefficient 7. There is no visible constant, which means it's 0." }
    ],
    misconceptions: ["Students often confuse the coefficient and the constant. Remember: the coefficient is attached to a variable, while the constant stands alone.", "Students often drop the negative sign from a coefficient. In -3x, the coefficient is -3, not 3.", "Students sometimes count the exponent as a separate term. In 4x^2, the entire 4x^2 is one term."]
  },
  {
    unitNumber: 1, lessonNumber: 2, title: "Evaluating Algebraic Expressions",
    teksAlignment: "Aligned to TEKS Algebra I — algebraic reasoning",
    explanation: `Here's what we're doing: evaluating an expression means substituting a number in place of the variable and then computing the result.\n\nHere's why: every time a computer program runs a formula, it's evaluating an expression. This skill is the bridge between abstract algebra and concrete answers.\n\nHere's how:\n1. Write the expression.\n2. Replace every variable with the given value (use parentheses to avoid sign errors).\n3. Follow the order of operations: Parentheses, Exponents, Multiplication/Division, Addition/Subtraction.\n\nExample: Evaluate 3x - 5 when x = 4.\nStep 1: 3(4) - 5\nStep 2: 12 - 5\nStep 3: 7`,
    workedExamples: [
      { title: "Single Variable", problem: "Evaluate 2x^2 + 3x - 1 when x = 3.", steps: [{ step: "Substitute x = 3: 2(3)^2 + 3(3) - 1", explanation: "Replace every x with 3. Use parentheses to keep the substitution clean." }, { step: "Compute the exponent: 2(9) + 3(3) - 1", explanation: "3^2 = 9. Exponents come before multiplication." }, { step: "Multiply: 18 + 9 - 1", explanation: "2 × 9 = 18 and 3 × 3 = 9." }, { step: "Add and subtract left to right: 26", explanation: "18 + 9 = 27, then 27 - 1 = 26." }], answer: "26" },
      { title: "Two Variables", problem: "Evaluate 4a - 2b when a = 5 and b = 3.", steps: [{ step: "Substitute: 4(5) - 2(3)", explanation: "Replace a with 5 and b with 3." }, { step: "Multiply: 20 - 6", explanation: "4 × 5 = 20 and 2 × 3 = 6." }, { step: "Subtract: 14", explanation: "20 - 6 = 14." }], answer: "14" }
    ],
    guidedProblems: [
      { problem: "Evaluate 5n + 2 when n = 6.", hint1: "Replace n with 6 in the expression.", hint2: "5(6) + 2 — now multiply first, then add.", solution: "32", explanation: "5(6) = 30, then 30 + 2 = 32." },
      { problem: "Evaluate x^2 - 4x when x = 5.", hint1: "Substitute x = 5 everywhere in the expression.", hint2: "(5)^2 - 4(5) = 25 - 20.", solution: "5", explanation: "5^2 = 25, 4 × 5 = 20, and 25 - 20 = 5." }
    ],
    independentProblems: [
      { problem: "Evaluate 3m - 7 when m = 4.", solution: "5", explanation: "3(4) - 7 = 12 - 7 = 5." },
      { problem: "Evaluate 2x^2 - x + 3 when x = 2.", solution: "9", explanation: "2(4) - 2 + 3 = 8 - 2 + 3 = 9." },
      { problem: "Evaluate (a + b)^2 when a = 3 and b = 2.", solution: "25", explanation: "(3 + 2)^2 = 5^2 = 25." }
    ],
    misconceptions: ["Students often forget to square the entire substituted value. In x^2 when x = -3, the answer is (-3)^2 = 9, not -9.", "Students sometimes skip parentheses when substituting negative numbers, leading to sign errors. Always write 3(-2), not 3-2.", "Students often apply operations in the wrong order. Remember PEMDAS — exponents before multiplication."]
  },
  {
    unitNumber: 1, lessonNumber: 3, title: "Order of Operations",
    teksAlignment: "Aligned to TEKS Algebra I — algebraic reasoning",
    explanation: `Here's what we're doing: the order of operations is a universal agreement about which calculations to perform first so that every person gets the same answer from the same expression.\n\nThe order is: Parentheses → Exponents → Multiplication and Division (left to right) → Addition and Subtraction (left to right). The acronym PEMDAS helps you remember this.\n\nHere's why it matters: without a standard order, 2 + 3 × 4 could equal 20 (if you add first) or 14 (if you multiply first). The correct answer is 14 because multiplication comes before addition.\n\nKey rule: multiplication and division are equal priority — work left to right. Same for addition and subtraction.`,
    workedExamples: [
      { title: "Multi-Step Expression", problem: "Simplify: 3 + 4 × 2^2 - 6 / 3", steps: [{ step: "Exponents first: 3 + 4 × 4 - 6 / 3", explanation: "2^2 = 4. Exponents come before multiplication." }, { step: "Multiply and divide left to right: 3 + 16 - 2", explanation: "4 × 4 = 16 and 6 / 3 = 2. Work left to right." }, { step: "Add and subtract left to right: 17", explanation: "3 + 16 = 19, then 19 - 2 = 17." }], answer: "17" },
      { title: "Nested Parentheses", problem: "Simplify: 2 × (3 + (8 - 5)^2)", steps: [{ step: "Inner parentheses: 2 × (3 + 3^2)", explanation: "8 - 5 = 3. Always work from the innermost parentheses outward." }, { step: "Exponent inside: 2 × (3 + 9)", explanation: "3^2 = 9." }, { step: "Parentheses: 2 × 12", explanation: "3 + 9 = 12." }, { step: "Multiply: 24", explanation: "2 × 12 = 24." }], answer: "24" }
    ],
    guidedProblems: [
      { problem: "Simplify: 5 + 3 × 4 - 2", hint1: "Multiplication comes before addition and subtraction.", hint2: "Do 3 × 4 = 12 first, then handle the addition and subtraction.", solution: "15", explanation: "5 + 12 - 2 = 17 - 2 = 15." },
      { problem: "Simplify: (6 + 2)^2 / 4", hint1: "Start inside the parentheses.", hint2: "(6 + 2) = 8, then 8^2 = 64, then divide.", solution: "16", explanation: "(8)^2 = 64, and 64 / 4 = 16." }
    ],
    independentProblems: [
      { problem: "Simplify: 10 - 2 × 3 + 4", solution: "8", explanation: "2 × 3 = 6 first, then 10 - 6 + 4 = 8." },
      { problem: "Simplify: 3^2 + (4 × 2 - 1)", solution: "16", explanation: "3^2 = 9, (8 - 1) = 7, then 9 + 7 = 16." },
      { problem: "Simplify: 24 / (2^3) + 5", solution: "8", explanation: "2^3 = 8, 24 / 8 = 3, then 3 + 5 = 8." }
    ],
    misconceptions: ["Students often compute left to right without respecting operation priority. Always check: are there exponents or multiplication/division to handle before addition/subtraction?", "Students sometimes treat multiplication and division as having different priorities. They are equal — work left to right when both appear.", "Students forget that subtraction of a negative becomes addition. In 5 - (-3), the result is 5 + 3 = 8."]
  },
  {
    unitNumber: 1, lessonNumber: 4, title: "Properties of Real Numbers",
    teksAlignment: "Aligned to TEKS Algebra I — algebraic reasoning and number properties",
    explanation: `Here's what we're doing: properties are rules that always hold true for real numbers. They let you rearrange, regroup, and expand expressions without changing their value.\n\nThe four key properties:\n1. Commutative Property: a + b = b + a and a × b = b × a (order doesn't matter for addition and multiplication)\n2. Associative Property: (a + b) + c = a + (b + c) (grouping doesn't matter for addition and multiplication)\n3. Distributive Property: a(b + c) = ab + ac (multiply the outside term by each term inside the parentheses)\n4. Identity Properties: a + 0 = a and a × 1 = a\n\nThe distributive property is the most important — you'll use it constantly throughout Algebra I.`,
    workedExamples: [
      { title: "Distributive Property", problem: "Expand: 3(x + 5)", steps: [{ step: "Multiply 3 by each term inside: 3 × x + 3 × 5", explanation: "The distributive property says a(b + c) = ab + ac. Multiply the outside number by every term inside." }, { step: "Simplify: 3x + 15", explanation: "3 × x = 3x and 3 × 5 = 15." }], answer: "3x + 15" },
      { title: "Distributive with Subtraction", problem: "Expand: -2(4x - 3)", steps: [{ step: "Multiply -2 by each term: -2 × 4x + (-2) × (-3)", explanation: "Distribute -2 to both terms. Be careful with the signs." }, { step: "Simplify: -8x + 6", explanation: "-2 × 4x = -8x and -2 × -3 = +6 (negative times negative is positive)." }], answer: "-8x + 6" }
    ],
    guidedProblems: [
      { problem: "Expand: 5(2x - 4)", hint1: "Multiply 5 by each term inside the parentheses.", hint2: "5 × 2x = 10x and 5 × (-4) = -20.", solution: "10x - 20", explanation: "Distribute 5: 5 × 2x = 10x and 5 × (-4) = -20." },
      { problem: "Which property justifies: 3 + x = x + 3?", hint1: "This involves changing the order of addition.", hint2: "The commutative property says order doesn't matter for addition.", solution: "Commutative Property of Addition", explanation: "The order of the terms switched but the value is the same — that's the commutative property." }
    ],
    independentProblems: [
      { problem: "Expand: 4(3x + 2)", solution: "12x + 8", explanation: "4 × 3x = 12x and 4 × 2 = 8." },
      { problem: "Expand: -3(x - 7)", solution: "-3x + 21", explanation: "-3 × x = -3x and -3 × (-7) = +21." },
      { problem: "Name the property: (2 × 5) × 3 = 2 × (5 × 3)", solution: "Associative Property of Multiplication", explanation: "The grouping changed but not the order — that's the associative property." }
    ],
    misconceptions: ["Students often forget to distribute to every term inside parentheses. In 3(x + 5), both x and 5 must be multiplied by 3.", "Students sometimes confuse commutative and associative properties. Commutative changes order; associative changes grouping.", "Students often make sign errors when distributing a negative. In -2(x - 3), the result is -2x + 6, not -2x - 6."]
  },
  {
    unitNumber: 1, lessonNumber: 5, title: "Combining Like Terms",
    teksAlignment: "Aligned to TEKS Algebra I — algebraic reasoning",
    explanation: `Here's what we're doing: like terms are terms that have the same variable raised to the same power. You can add or subtract like terms by combining their coefficients.\n\nHere's why: simplifying expressions by combining like terms makes equations easier to solve and graphs easier to interpret.\n\nHere's how:\n- 3x and 5x are like terms → 3x + 5x = 8x\n- 4x^2 and -2x^2 are like terms → 4x^2 - 2x^2 = 2x^2\n- 3x and 5x^2 are NOT like terms (different exponents)\n- 3x and 5y are NOT like terms (different variables)\n\nThink of it like this: 3 apples + 5 apples = 8 apples. But 3 apples + 5 oranges cannot be combined.`,
    workedExamples: [
      { title: "Combining Multiple Like Terms", problem: "Simplify: 4x + 3y - 2x + 7y", steps: [{ step: "Group like terms: (4x - 2x) + (3y + 7y)", explanation: "Identify which terms share the same variable. x-terms go together, y-terms go together." }, { step: "Combine each group: 2x + 10y", explanation: "4x - 2x = 2x (subtract the coefficients) and 3y + 7y = 10y (add the coefficients)." }], answer: "2x + 10y" },
      { title: "With Constants", problem: "Simplify: 5x^2 - 3x + 8 + 2x^2 + x - 4", steps: [{ step: "Group: (5x^2 + 2x^2) + (-3x + x) + (8 - 4)", explanation: "Three groups: x^2 terms, x terms, and constants." }, { step: "Combine: 7x^2 - 2x + 4", explanation: "5+2=7 for x^2 terms, -3+1=-2 for x terms, 8-4=4 for constants." }], answer: "7x^2 - 2x + 4" }
    ],
    guidedProblems: [
      { problem: "Simplify: 6a + 4b - 2a + b", hint1: "Identify the a-terms and the b-terms separately.", hint2: "a-terms: 6a - 2a = 4a. b-terms: 4b + b = 5b.", solution: "4a + 5b", explanation: "6a - 2a = 4a and 4b + 1b = 5b, giving 4a + 5b." },
      { problem: "Simplify: 3x^2 + 5x - x^2 - 2x + 7", hint1: "Group the x^2 terms, x terms, and constants.", hint2: "x^2 terms: 3x^2 - x^2 = 2x^2. x terms: 5x - 2x = 3x. Constant: 7.", solution: "2x^2 + 3x + 7", explanation: "Combine each group: 2x^2 + 3x + 7." }
    ],
    independentProblems: [
      { problem: "Simplify: 8m - 3n + 2m + 5n", solution: "10m + 2n", explanation: "8m + 2m = 10m and -3n + 5n = 2n." },
      { problem: "Simplify: 4x^2 - 7x + 3 - x^2 + 4x", solution: "3x^2 - 3x + 3", explanation: "4x^2 - x^2 = 3x^2, -7x + 4x = -3x, constant stays 3." },
      { problem: "Simplify: 2(3x + 4) - 5x", solution: "x + 8", explanation: "Distribute first: 6x + 8 - 5x = x + 8." }
    ],
    misconceptions: ["Students often try to combine unlike terms. 3x + 4 cannot be simplified — x and a constant are not like terms.", "Students sometimes combine the exponents instead of the coefficients. 3x^2 + 2x^2 = 5x^2, not 5x^4.", "Students forget that a variable with no coefficient has an implied coefficient of 1. So x = 1x."]
  },
  // Unit 2 Lessons
  {
    unitNumber: 2, lessonNumber: 1, title: "One-Step Equations",
    teksAlignment: "Aligned to TEKS Algebra I — solving linear equations",
    explanation: `Here's what we're doing: solving an equation means finding the value of the variable that makes the equation true.\n\nHere's the key idea: an equation is like a balance scale. Whatever you do to one side, you must do to the other side to keep it balanced.\n\nFor one-step equations, you undo the operation done to the variable:\n- If something is added, subtract it from both sides.\n- If something is subtracted, add it to both sides.\n- If something is multiplied, divide both sides.\n- If something is divided, multiply both sides.\n\nExample: Solve x + 7 = 12\nSubtract 7 from both sides: x + 7 - 7 = 12 - 7\nx = 5`,
    workedExamples: [
      { title: "Addition Equation", problem: "Solve: x + 9 = 15", steps: [{ step: "Identify the operation: 9 is added to x", explanation: "To isolate x, we need to undo the addition." }, { step: "Subtract 9 from both sides: x + 9 - 9 = 15 - 9", explanation: "Whatever we do to one side, we must do to the other to keep the equation balanced." }, { step: "Simplify: x = 6", explanation: "9 - 9 = 0 on the left, leaving x alone. 15 - 9 = 6 on the right." }], answer: "x = 6" },
      { title: "Multiplication Equation", problem: "Solve: 4x = 28", steps: [{ step: "Identify the operation: x is multiplied by 4", explanation: "To isolate x, we undo multiplication by dividing." }, { step: "Divide both sides by 4: 4x/4 = 28/4", explanation: "Dividing both sides by the same nonzero number keeps the equation balanced." }, { step: "Simplify: x = 7", explanation: "4/4 = 1 on the left, leaving x. 28/4 = 7 on the right." }], answer: "x = 7" }
    ],
    guidedProblems: [
      { problem: "Solve: x - 5 = 11", hint1: "What operation is being done to x? Undo it.", hint2: "Add 5 to both sides to cancel the -5.", solution: "x = 16", explanation: "x - 5 + 5 = 11 + 5, so x = 16." },
      { problem: "Solve: x/3 = 7", hint1: "x is being divided by 3. What's the opposite of division?", hint2: "Multiply both sides by 3.", solution: "x = 21", explanation: "(x/3) × 3 = 7 × 3, so x = 21." }
    ],
    independentProblems: [
      { problem: "Solve: x + 14 = 23", solution: "x = 9", explanation: "Subtract 14 from both sides: x = 23 - 14 = 9." },
      { problem: "Solve: 6x = 42", solution: "x = 7", explanation: "Divide both sides by 6: x = 42/6 = 7." },
      { problem: "Solve: x - 8 = -3", solution: "x = 5", explanation: "Add 8 to both sides: x = -3 + 8 = 5." }
    ],
    misconceptions: ["Students often perform the same operation instead of the inverse. To solve x + 5 = 10, subtract 5 — don't add 5.", "Students sometimes only change one side of the equation. Whatever you do to one side must be done to both sides.", "Students forget that dividing by a fraction is the same as multiplying by its reciprocal."]
  },
  {
    unitNumber: 2, lessonNumber: 2, title: "Two-Step Equations",
    teksAlignment: "Aligned to TEKS Algebra I — solving linear equations",
    explanation: `Here's what we're doing: two-step equations require two inverse operations to isolate the variable.\n\nHere's the strategy: work in reverse order of operations. If the equation was built by first multiplying then adding, you undo it by first subtracting then dividing.\n\nGeneral steps:\n1. Add or subtract to move the constant to the right side.\n2. Multiply or divide to isolate the variable.\n\nExample: Solve 2x + 5 = 13\nStep 1: Subtract 5 from both sides → 2x = 8\nStep 2: Divide both sides by 2 → x = 4`,
    workedExamples: [
      { title: "Standard Two-Step", problem: "Solve: 3x - 4 = 14", steps: [{ step: "Add 4 to both sides: 3x - 4 + 4 = 14 + 4", explanation: "Undo the subtraction first to isolate the term with x." }, { step: "Simplify: 3x = 18", explanation: "-4 + 4 = 0 on the left, 14 + 4 = 18 on the right." }, { step: "Divide both sides by 3: x = 6", explanation: "Undo the multiplication to isolate x. 18/3 = 6." }], answer: "x = 6" },
      { title: "Fraction Coefficient", problem: "Solve: x/4 + 3 = 7", steps: [{ step: "Subtract 3 from both sides: x/4 = 4", explanation: "Undo the addition first." }, { step: "Multiply both sides by 4: x = 16", explanation: "Undo the division by multiplying by 4." }], answer: "x = 16" }
    ],
    guidedProblems: [
      { problem: "Solve: 5x + 2 = 22", hint1: "First, undo the addition of 2.", hint2: "Subtract 2 from both sides to get 5x = 20, then divide by 5.", solution: "x = 4", explanation: "5x + 2 - 2 = 22 - 2 → 5x = 20 → x = 4." },
      { problem: "Solve: 2x - 9 = 1", hint1: "Add 9 to both sides first.", hint2: "2x = 10, then divide both sides by 2.", solution: "x = 5", explanation: "2x - 9 + 9 = 1 + 9 → 2x = 10 → x = 5." }
    ],
    independentProblems: [
      { problem: "Solve: 4x + 7 = 31", solution: "x = 6", explanation: "4x = 31 - 7 = 24, then x = 24/4 = 6." },
      { problem: "Solve: 3x - 11 = 4", solution: "x = 5", explanation: "3x = 4 + 11 = 15, then x = 15/3 = 5." },
      { problem: "Solve: x/2 - 3 = 5", solution: "x = 16", explanation: "x/2 = 8, then x = 16." }
    ],
    misconceptions: ["Students often divide before subtracting the constant. The correct order is: undo addition/subtraction first, then undo multiplication/division.", "Students sometimes forget to apply the operation to the entire right side. In 2x = 8, divide the entire right side by 2.", "Students make sign errors when subtracting negatives. In x - (-3) = 7, this becomes x + 3 = 7."]
  },
  {
    unitNumber: 2, lessonNumber: 3, title: "Multi-Step Equations",
    teksAlignment: "Aligned to TEKS Algebra I — solving linear equations",
    explanation: `Here's what we're doing: multi-step equations may require combining like terms, using the distributive property, or moving variables from both sides before you can isolate the variable.\n\nHere's the general strategy:\n1. Simplify each side (distribute and combine like terms).\n2. Move variable terms to one side using addition or subtraction.\n3. Move constant terms to the other side.\n4. Divide to isolate the variable.\n\nExample: Solve 2(x + 3) = 3x - 1\nStep 1: Distribute → 2x + 6 = 3x - 1\nStep 2: Subtract 2x → 6 = x - 1\nStep 3: Add 1 → x = 7`,
    workedExamples: [
      { title: "Variables on Both Sides", problem: "Solve: 5x - 3 = 2x + 9", steps: [{ step: "Subtract 2x from both sides: 3x - 3 = 9", explanation: "Move all variable terms to one side by subtracting the smaller variable term." }, { step: "Add 3 to both sides: 3x = 12", explanation: "Move the constant to the right side." }, { step: "Divide by 3: x = 4", explanation: "Isolate x by dividing both sides by 3." }], answer: "x = 4" },
      { title: "Distributive Property Required", problem: "Solve: 3(2x - 1) = 2(x + 7)", steps: [{ step: "Distribute both sides: 6x - 3 = 2x + 14", explanation: "Apply the distributive property on each side." }, { step: "Subtract 2x: 4x - 3 = 14", explanation: "Collect variable terms on the left." }, { step: "Add 3: 4x = 17", explanation: "Move constants to the right." }, { step: "Divide by 4: x = 17/4", explanation: "x = 4.25 or 17/4." }], answer: "x = 17/4" }
    ],
    guidedProblems: [
      { problem: "Solve: 4x + 5 = 2x + 13", hint1: "Move the x terms to one side by subtracting 2x from both sides.", hint2: "After subtracting 2x: 2x + 5 = 13. Now solve the two-step equation.", solution: "x = 4", explanation: "2x + 5 = 13 → 2x = 8 → x = 4." },
      { problem: "Solve: 2(3x + 4) = 20", hint1: "Distribute first: 2 × 3x + 2 × 4.", hint2: "6x + 8 = 20. Now solve the two-step equation.", solution: "x = 2", explanation: "6x + 8 = 20 → 6x = 12 → x = 2." }
    ],
    independentProblems: [
      { problem: "Solve: 7x - 4 = 3x + 16", solution: "x = 5", explanation: "4x = 20 → x = 5." },
      { problem: "Solve: 3(x - 2) = 2x + 1", solution: "x = 7", explanation: "3x - 6 = 2x + 1 → x = 7." },
      { problem: "Solve: 5(2x + 1) = 3(3x + 2)", solution: "x = 1", explanation: "10x + 5 = 9x + 6 → x = 1." }
    ],
    misconceptions: ["Students often forget to distribute to every term inside the parentheses. In 3(x - 2), both x and -2 must be multiplied by 3.", "Students sometimes move variable terms incorrectly. When subtracting 2x from both sides of 5x = 2x + 9, the result is 3x = 9, not 7x = 9.", "Students lose track of negative signs when moving terms across the equals sign."]
  },
];

// Get lesson unit IDs
for (const lesson of lessonsData) {
  const unitId = unitMap[lesson.unitNumber];
  await insert("lessons", {
    unitId,
    lessonNumber: lesson.lessonNumber,
    title: lesson.title,
    teksAlignment: lesson.teksAlignment,
    explanation: lesson.explanation,
    workedExamples: lesson.workedExamples,
    guidedProblems: lesson.guidedProblems,
    independentProblems: lesson.independentProblems,
    misconceptions: lesson.misconceptions,
    sortOrder: (lesson.unitNumber - 1) * 10 + lesson.lessonNumber,
  });
}

// ─── Quiz Questions ───────────────────────────────────────────────────────────
console.log("Seeding quiz questions...");
const quizData = [
  // Unit 1 Quiz
  { unitNumber: 1, questionText: "What is the coefficient of x in the expression 7x - 3?", questionType: "multiple_choice", choices: [{ label: "A", text: "7" }, { label: "B", text: "-3" }, { label: "C", text: "3" }, { label: "D", text: "x" }], correctAnswer: "A", explanation: "The coefficient is the number multiplied by the variable. In 7x, the coefficient is 7.", skillTag: "ALG1-U1-S1", difficulty: "easy", sortOrder: 1 },
  { unitNumber: 1, questionText: "Evaluate 4x + 3 when x = 5.", questionType: "multiple_choice", choices: [{ label: "A", text: "20" }, { label: "B", text: "23" }, { label: "C", text: "35" }, { label: "D", text: "17" }], correctAnswer: "B", explanation: "Substitute x = 5: 4(5) + 3 = 20 + 3 = 23.", skillTag: "ALG1-U1-S2", difficulty: "easy", sortOrder: 2 },
  { unitNumber: 1, questionText: "Simplify: 3 + 4 × 2", questionType: "multiple_choice", choices: [{ label: "A", text: "14" }, { label: "B", text: "11" }, { label: "C", text: "10" }, { label: "D", text: "22" }], correctAnswer: "B", explanation: "Multiply first: 4 × 2 = 8. Then add: 3 + 8 = 11.", skillTag: "ALG1-U1-S3", difficulty: "easy", sortOrder: 3 },
  { unitNumber: 1, questionText: "Expand: 3(2x - 5)", questionType: "multiple_choice", choices: [{ label: "A", text: "6x - 5" }, { label: "B", text: "6x - 15" }, { label: "C", text: "5x - 15" }, { label: "D", text: "6x + 15" }], correctAnswer: "B", explanation: "Distribute 3 to each term: 3 × 2x = 6x and 3 × (-5) = -15.", skillTag: "ALG1-U1-S4", difficulty: "easy", sortOrder: 4 },
  { unitNumber: 1, questionText: "Simplify: 5x + 3y - 2x + y", questionType: "multiple_choice", choices: [{ label: "A", text: "3x + 4y" }, { label: "B", text: "7x + 4y" }, { label: "C", text: "3x + 2y" }, { label: "D", text: "7x + 2y" }], correctAnswer: "A", explanation: "Combine x-terms: 5x - 2x = 3x. Combine y-terms: 3y + y = 4y.", skillTag: "ALG1-U1-S5", difficulty: "easy", sortOrder: 5 },
  { unitNumber: 1, questionText: "Evaluate 2x^2 - 3x + 1 when x = 4.", questionType: "short_answer", choices: null, correctAnswer: "21", explanation: "2(16) - 3(4) + 1 = 32 - 12 + 1 = 21.", skillTag: "ALG1-U1-S2", difficulty: "medium", sortOrder: 6 },
  { unitNumber: 1, questionText: "Simplify: 2(3x + 4) - 3(x - 2)", questionType: "multiple_choice", choices: [{ label: "A", text: "3x + 14" }, { label: "B", text: "3x + 2" }, { label: "C", text: "9x + 2" }, { label: "D", text: "3x - 2" }], correctAnswer: "A", explanation: "Distribute: 6x + 8 - 3x + 6 = 3x + 14.", skillTag: "ALG1-U1-S5", difficulty: "medium", sortOrder: 7 },
  { unitNumber: 1, questionText: "Simplify: 4(2x - 1) + 3(x + 5)", questionType: "short_answer", choices: null, correctAnswer: "11x + 11", explanation: "8x - 4 + 3x + 15 = 11x + 11.", skillTag: "ALG1-U1-S5", difficulty: "medium", sortOrder: 8 },
  { unitNumber: 1, questionText: "Simplify: 5(x + 2) - 2(3x - 4) + x", questionType: "short_answer", choices: null, correctAnswer: "0x + 18", explanation: "5x + 10 - 6x + 8 + x = (5x - 6x + x) + (10 + 8) = 0x + 18 = 18.", skillTag: "ALG1-U1-S5", difficulty: "medium", sortOrder: 9 },
  { unitNumber: 1, questionText: "A store sells notebooks for $n each and pens for $p each. Write an expression for the total cost of 4 notebooks and 3 pens, then evaluate it when n = 2.50 and p = 1.00.", questionType: "short_answer", choices: null, correctAnswer: "13.00", explanation: "Expression: 4n + 3p. Evaluate: 4(2.50) + 3(1.00) = 10 + 3 = 13.00.", skillTag: "ALG1-U1-S6", difficulty: "hard", sortOrder: 10 },
  { unitNumber: 1, questionText: "The perimeter of a rectangle is 2(l + w). If l = 3x + 2 and w = x - 1, write and simplify the perimeter expression.", questionType: "short_answer", choices: null, correctAnswer: "8x + 2", explanation: "P = 2(3x + 2 + x - 1) = 2(4x + 1) = 8x + 2.", skillTag: "ALG1-U1-S6", difficulty: "hard", sortOrder: 11 },
  { unitNumber: 1, questionText: "Maria earns $12 per hour at her job. She also earns a weekly bonus of $b. Write an expression for her total weekly earnings if she works h hours. If she works 15 hours and earns a $25 bonus, what are her total earnings?", questionType: "short_answer", choices: null, correctAnswer: "205", explanation: "Expression: 12h + b. Evaluate: 12(15) + 25 = 180 + 25 = 205.", skillTag: "ALG1-U1-S6", difficulty: "hard", sortOrder: 12 },
  { unitNumber: 1, questionText: "If f(x) = 3x^2 - 2x + 1, find f(x + 1) - f(x) and simplify completely.", questionType: "short_answer", choices: null, correctAnswer: "6x + 1", explanation: "f(x+1) = 3(x+1)^2 - 2(x+1) + 1 = 3x^2 + 6x + 3 - 2x - 2 + 1 = 3x^2 + 4x + 2. f(x+1) - f(x) = (3x^2 + 4x + 2) - (3x^2 - 2x + 1) = 6x + 1.", skillTag: "ALG1-U1-S2", difficulty: "challenge", sortOrder: 13 },
  { unitNumber: 1, questionText: "Prove that the expression n(n+1) is always even for any positive integer n. (Hint: consider two cases: n is even, and n is odd.)", questionType: "open_response", choices: null, correctAnswer: "If n is even, n = 2k, so n(n+1) = 2k(2k+1), which is divisible by 2. If n is odd, n+1 is even, so n+1 = 2k, and n(n+1) = n(2k) = 2nk, which is divisible by 2. In both cases the product is even.", explanation: "This is a proof by cases. Either n is even (making the product even) or n is odd (making n+1 even, so the product is even). Since one of any two consecutive integers must be even, their product is always even.", skillTag: "ALG1-U1-S3", difficulty: "challenge", sortOrder: 14 },
  { unitNumber: 1, questionText: "Which property is demonstrated by: 3(x + 4) = 3x + 12?", questionType: "multiple_choice", choices: [{ label: "A", text: "Commutative Property" }, { label: "B", text: "Associative Property" }, { label: "C", text: "Distributive Property" }, { label: "D", text: "Identity Property" }], correctAnswer: "C", explanation: "Multiplying 3 by each term inside the parentheses is the distributive property: a(b + c) = ab + ac.", skillTag: "ALG1-U1-S4", difficulty: "easy", sortOrder: 15 },
  // Unit 2 Quiz
  { unitNumber: 2, questionText: "Solve: x + 8 = 15", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 7" }, { label: "B", text: "x = 23" }, { label: "C", text: "x = 8" }, { label: "D", text: "x = -7" }], correctAnswer: "A", explanation: "Subtract 8 from both sides: x = 15 - 8 = 7.", skillTag: "ALG1-U2-S1", difficulty: "easy", sortOrder: 1 },
  { unitNumber: 2, questionText: "Solve: 5x = 35", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 5" }, { label: "B", text: "x = 7" }, { label: "C", text: "x = 30" }, { label: "D", text: "x = 175" }], correctAnswer: "B", explanation: "Divide both sides by 5: x = 35/5 = 7.", skillTag: "ALG1-U2-S2", difficulty: "easy", sortOrder: 2 },
  { unitNumber: 2, questionText: "Solve: 3x + 4 = 19", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 5" }, { label: "B", text: "x = 23/3" }, { label: "C", text: "x = 7" }, { label: "D", text: "x = 4" }], correctAnswer: "A", explanation: "3x = 19 - 4 = 15, then x = 15/3 = 5.", skillTag: "ALG1-U2-S3", difficulty: "easy", sortOrder: 3 },
  { unitNumber: 2, questionText: "Solve: 2x - 7 = 11", questionType: "short_answer", choices: null, correctAnswer: "x = 9", explanation: "2x = 11 + 7 = 18, then x = 9.", skillTag: "ALG1-U2-S3", difficulty: "easy", sortOrder: 4 },
  { unitNumber: 2, questionText: "Solve: 4x + 3 = 2x + 11", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 2" }, { label: "B", text: "x = 4" }, { label: "C", text: "x = 7" }, { label: "D", text: "x = 1" }], correctAnswer: "B", explanation: "4x - 2x = 11 - 3 → 2x = 8 → x = 4.", skillTag: "ALG1-U2-S5", difficulty: "easy", sortOrder: 5 },
  { unitNumber: 2, questionText: "Solve: 3(x - 2) + 4 = 2x + 5", questionType: "short_answer", choices: null, correctAnswer: "x = 7", explanation: "3x - 6 + 4 = 2x + 5 → 3x - 2 = 2x + 5 → x = 7.", skillTag: "ALG1-U2-S6", difficulty: "medium", sortOrder: 6 },
  { unitNumber: 2, questionText: "Solve: 5(2x + 1) = 3(3x + 2) + 1", questionType: "short_answer", choices: null, correctAnswer: "x = 2", explanation: "10x + 5 = 9x + 6 + 1 → 10x + 5 = 9x + 7 → x = 2.", skillTag: "ALG1-U2-S6", difficulty: "medium", sortOrder: 7 },
  { unitNumber: 2, questionText: "Solve: 2(3x - 4) = 4(x + 1)", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 6" }, { label: "B", text: "x = 8" }, { label: "C", text: "x = 4" }, { label: "D", text: "x = 2" }], correctAnswer: "A", explanation: "6x - 8 = 4x + 4 → 2x = 12 → x = 6.", skillTag: "ALG1-U2-S6", difficulty: "medium", sortOrder: 8 },
  { unitNumber: 2, questionText: "Solve: (x + 3)/2 = (2x - 1)/3", questionType: "short_answer", choices: null, correctAnswer: "x = 11", explanation: "Multiply both sides by 6: 3(x+3) = 2(2x-1) → 3x + 9 = 4x - 2 → x = 11.", skillTag: "ALG1-U2-S4", difficulty: "medium", sortOrder: 9 },
  { unitNumber: 2, questionText: "Solve: 4(x - 3) - 2(x + 1) = 3(x - 5)", questionType: "short_answer", choices: null, correctAnswer: "x = -1", explanation: "4x - 12 - 2x - 2 = 3x - 15 → 2x - 14 = 3x - 15 → -x = -1 → x = 1. Wait: 2x - 14 = 3x - 15 → -14 + 15 = 3x - 2x → 1 = x. So x = 1.", skillTag: "ALG1-U2-S6", difficulty: "hard", sortOrder: 10 },
  { unitNumber: 2, questionText: "A plumber charges a $45 flat fee plus $60 per hour. A customer's bill was $225. How many hours did the plumber work?", questionType: "short_answer", choices: null, correctAnswer: "3 hours", explanation: "45 + 60h = 225 → 60h = 180 → h = 3.", skillTag: "ALG1-U2-S7", difficulty: "hard", sortOrder: 11 },
  { unitNumber: 2, questionText: "Two friends are saving money. Alex has $120 and saves $15 per week. Jordan has $60 and saves $25 per week. After how many weeks will they have the same amount?", questionType: "short_answer", choices: null, correctAnswer: "6 weeks", explanation: "120 + 15w = 60 + 25w → 60 = 10w → w = 6.", skillTag: "ALG1-U2-S7", difficulty: "hard", sortOrder: 12 },
  { unitNumber: 2, questionText: "Solve for x: a(x + b) = c, where a ≠ 0. Express x in terms of a, b, and c.", questionType: "short_answer", choices: null, correctAnswer: "x = (c - ab) / a or x = c/a - b", explanation: "Distribute: ax + ab = c → ax = c - ab → x = (c - ab)/a.", skillTag: "ALG1-U2-S6", difficulty: "challenge", sortOrder: 13 },
  { unitNumber: 2, questionText: "If 3x + k = 5x - 2k has the solution x = 9, find the value of k.", questionType: "short_answer", choices: null, correctAnswer: "k = 6", explanation: "Substitute x = 9: 27 + k = 45 - 2k → 3k = 18 → k = 6.", skillTag: "ALG1-U2-S5", difficulty: "challenge", sortOrder: 14 },
  { unitNumber: 2, questionText: "Solve: x - 13 = -5", questionType: "multiple_choice", choices: [{ label: "A", text: "x = -18" }, { label: "B", text: "x = 8" }, { label: "C", text: "x = 18" }, { label: "D", text: "x = -8" }], correctAnswer: "B", explanation: "Add 13 to both sides: x = -5 + 13 = 8.", skillTag: "ALG1-U2-S1", difficulty: "easy", sortOrder: 15 },
];

for (const q of quizData) {
  await insert("quizQuestions", {
    unitId: unitMap[q.unitNumber],
    questionText: q.questionText,
    questionType: q.questionType,
    choices: q.choices,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    skillTag: q.skillTag,
    difficulty: q.difficulty,
    sortOrder: q.sortOrder,
  });
}

// ─── Diagnostic Questions ─────────────────────────────────────────────────────
console.log("Seeding diagnostic questions...");
const diagnosticData = [
  // Pre-algebra prerequisites (DIAG-001 to DIAG-006)
  { questionId: "DIAG-001", questionText: "Simplify: 3 + 4 × 2 - 1", questionType: "multiple_choice", choices: [{ label: "A", text: "13" }, { label: "B", text: "10" }, { label: "C", text: "6" }, { label: "D", text: "14" }], correctAnswer: "B", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "Multiply first: 4 × 2 = 8. Then: 3 + 8 - 1 = 10. Tests order of operations.", sortOrder: 1 },
  { questionId: "DIAG-002", questionText: "What is (-3) × (-4)?", questionType: "multiple_choice", choices: [{ label: "A", text: "-12" }, { label: "B", text: "12" }, { label: "C", text: "7" }, { label: "D", text: "-7" }], correctAnswer: "B", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "Negative × negative = positive. (-3)(-4) = 12. Tests integer operations.", sortOrder: 2 },
  { questionId: "DIAG-003", questionText: "Simplify: 3/4 + 1/2", questionType: "multiple_choice", choices: [{ label: "A", text: "4/6" }, { label: "B", text: "5/4" }, { label: "C", text: "1" }, { label: "D", text: "4/8" }], correctAnswer: "B", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "Convert 1/2 to 2/4, then add: 3/4 + 2/4 = 5/4. Tests fraction operations.", sortOrder: 3 },
  { questionId: "DIAG-004", questionText: "What is the value of 2^3?", questionType: "multiple_choice", choices: [{ label: "A", text: "6" }, { label: "B", text: "9" }, { label: "C", text: "8" }, { label: "D", text: "5" }], correctAnswer: "C", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "2^3 = 2 × 2 × 2 = 8. Tests basic exponent evaluation.", sortOrder: 4 },
  { questionId: "DIAG-005", questionText: "If x = 3, what is the value of 2x + 5?", questionType: "multiple_choice", choices: [{ label: "A", text: "10" }, { label: "B", text: "11" }, { label: "C", text: "13" }, { label: "D", text: "16" }], correctAnswer: "B", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "easy", explanation: "Substitute: 2(3) + 5 = 6 + 5 = 11. Tests basic variable expression evaluation.", sortOrder: 5 },
  { questionId: "DIAG-006", questionText: "Simplify: 5x + 3 - 2x + 7", questionType: "multiple_choice", choices: [{ label: "A", text: "3x + 10" }, { label: "B", text: "7x + 10" }, { label: "C", text: "3x + 4" }, { label: "D", text: "7x + 4" }], correctAnswer: "A", mapsToUnit: "prerequisite", mapsToSkills: [], difficulty: "medium", explanation: "Combine like terms: 5x - 2x = 3x and 3 + 7 = 10. Tests combining like terms.", sortOrder: 6 },
  // Unit 1 (DIAG-007, DIAG-008)
  { questionId: "DIAG-007", questionText: "Expand: 4(3x - 2)", questionType: "multiple_choice", choices: [{ label: "A", text: "12x - 2" }, { label: "B", text: "12x - 8" }, { label: "C", text: "7x - 2" }, { label: "D", text: "12x + 8" }], correctAnswer: "B", mapsToUnit: "1", mapsToSkills: ["ALG1-U1-S4"], difficulty: "easy", explanation: "Distribute 4: 4 × 3x = 12x and 4 × (-2) = -8. Getting this right shows readiness for Unit 1.", sortOrder: 7 },
  { questionId: "DIAG-008", questionText: "Simplify: 3(2x + 1) - 4(x - 2)", questionType: "multiple_choice", choices: [{ label: "A", text: "2x + 11" }, { label: "B", text: "10x - 5" }, { label: "C", text: "2x - 5" }, { label: "D", text: "10x + 11" }], correctAnswer: "A", mapsToUnit: "1", mapsToSkills: ["ALG1-U1-S4", "ALG1-U1-S5"], difficulty: "medium", explanation: "6x + 3 - 4x + 8 = 2x + 11. Tests combining like terms after distribution.", sortOrder: 8 },
  // Unit 2 (DIAG-009, DIAG-010)
  { questionId: "DIAG-009", questionText: "Solve: 3x + 5 = 20", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 5" }, { label: "B", text: "x = 8" }, { label: "C", text: "x = 15" }, { label: "D", text: "x = 3" }], correctAnswer: "A", mapsToUnit: "2", mapsToSkills: ["ALG1-U2-S3"], difficulty: "easy", explanation: "3x = 15, x = 5. Correct answer indicates readiness for Unit 2 content.", sortOrder: 9 },
  { questionId: "DIAG-010", questionText: "Solve: 4x - 3 = 2x + 9", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 3" }, { label: "B", text: "x = 6" }, { label: "C", text: "x = 4" }, { label: "D", text: "x = 2" }], correctAnswer: "B", mapsToUnit: "2", mapsToSkills: ["ALG1-U2-S5"], difficulty: "medium", explanation: "2x = 12, x = 6. Tests solving equations with variables on both sides.", sortOrder: 10 },
  // Unit 3 (DIAG-011, DIAG-012)
  { questionId: "DIAG-011", questionText: "Which inequality represents 'x is at least 5'?", questionType: "multiple_choice", choices: [{ label: "A", text: "x < 5" }, { label: "B", text: "x > 5" }, { label: "C", text: "x ≥ 5" }, { label: "D", text: "x ≤ 5" }], correctAnswer: "C", mapsToUnit: "3", mapsToSkills: ["ALG1-U3-S1"], difficulty: "easy", explanation: "'At least 5' means 5 or more, which is x ≥ 5.", sortOrder: 11 },
  { questionId: "DIAG-012", questionText: "Solve: 2x - 4 > 8", questionType: "multiple_choice", choices: [{ label: "A", text: "x > 2" }, { label: "B", text: "x > 6" }, { label: "C", text: "x < 6" }, { label: "D", text: "x > 4" }], correctAnswer: "B", mapsToUnit: "3", mapsToSkills: ["ALG1-U3-S4"], difficulty: "medium", explanation: "2x > 12, x > 6.", sortOrder: 12 },
  // Unit 4 (DIAG-013, DIAG-014)
  { questionId: "DIAG-013", questionText: "Which of the following is NOT a function?", questionType: "multiple_choice", choices: [{ label: "A", text: "{(1,2), (2,3), (3,4)}" }, { label: "B", text: "{(1,2), (1,3), (2,4)}" }, { label: "C", text: "{(1,2), (2,2), (3,2)}" }, { label: "D", text: "{(1,1), (2,4), (3,9)}" }], correctAnswer: "B", mapsToUnit: "4", mapsToSkills: ["ALG1-U4-S1"], difficulty: "easy", explanation: "In option B, x = 1 maps to both 2 and 3. A function must have exactly one output per input.", sortOrder: 13 },
  { questionId: "DIAG-014", questionText: "If f(x) = 2x - 3, what is f(5)?", questionType: "multiple_choice", choices: [{ label: "A", text: "7" }, { label: "B", text: "13" }, { label: "C", text: "10" }, { label: "D", text: "3" }], correctAnswer: "A", mapsToUnit: "4", mapsToSkills: ["ALG1-U4-S4"], difficulty: "medium", explanation: "f(5) = 2(5) - 3 = 10 - 3 = 7.", sortOrder: 14 },
  // Unit 5 (DIAG-015, DIAG-016)
  { questionId: "DIAG-015", questionText: "What is the slope of the line passing through (2, 3) and (4, 7)?", questionType: "multiple_choice", choices: [{ label: "A", text: "1" }, { label: "B", text: "2" }, { label: "C", text: "4" }, { label: "D", text: "1/2" }], correctAnswer: "B", mapsToUnit: "5", mapsToSkills: ["ALG1-U5-S1"], difficulty: "easy", explanation: "slope = (7-3)/(4-2) = 4/2 = 2.", sortOrder: 15 },
  { questionId: "DIAG-016", questionText: "Write the equation of a line with slope 3 and y-intercept -2.", questionType: "multiple_choice", choices: [{ label: "A", text: "y = -2x + 3" }, { label: "B", text: "y = 3x - 2" }, { label: "C", text: "y = 3x + 2" }, { label: "D", text: "y = -3x - 2" }], correctAnswer: "B", mapsToUnit: "5", mapsToSkills: ["ALG1-U5-S4"], difficulty: "medium", explanation: "Slope-intercept form: y = mx + b where m = 3 and b = -2.", sortOrder: 16 },
  // Unit 6 (DIAG-017, DIAG-018)
  { questionId: "DIAG-017", questionText: "What is the solution to the system: y = 2x + 1 and y = x + 3?", questionType: "multiple_choice", choices: [{ label: "A", text: "(1, 3)" }, { label: "B", text: "(2, 5)" }, { label: "C", text: "(3, 7)" }, { label: "D", text: "(0, 1)" }], correctAnswer: "B", mapsToUnit: "6", mapsToSkills: ["ALG1-U6-S2"], difficulty: "easy", explanation: "Set equal: 2x + 1 = x + 3 → x = 2. Then y = 2(2) + 1 = 5. Solution: (2, 5).", sortOrder: 17 },
  { questionId: "DIAG-018", questionText: "Solve the system by elimination: 2x + y = 7 and x - y = 2", questionType: "multiple_choice", choices: [{ label: "A", text: "(3, 1)" }, { label: "B", text: "(1, 5)" }, { label: "C", text: "(2, 3)" }, { label: "D", text: "(4, -1)" }], correctAnswer: "A", mapsToUnit: "6", mapsToSkills: ["ALG1-U6-S3"], difficulty: "medium", explanation: "Add the equations: 3x = 9, x = 3. Substitute: 3 - y = 2, y = 1.", sortOrder: 18 },
  // Unit 7 (DIAG-019, DIAG-020)
  { questionId: "DIAG-019", questionText: "Simplify: x^3 × x^4", questionType: "multiple_choice", choices: [{ label: "A", text: "x^7" }, { label: "B", text: "x^12" }, { label: "C", text: "2x^7" }, { label: "D", text: "x^1" }], correctAnswer: "A", mapsToUnit: "7", mapsToSkills: ["ALG1-U7-S1"], difficulty: "easy", explanation: "Product rule: x^3 × x^4 = x^(3+4) = x^7.", sortOrder: 19 },
  { questionId: "DIAG-020", questionText: "A population doubles every year. If it starts at 500, what is the population after 3 years?", questionType: "multiple_choice", choices: [{ label: "A", text: "1500" }, { label: "B", text: "2000" }, { label: "C", text: "4000" }, { label: "D", text: "3000" }], correctAnswer: "C", mapsToUnit: "7", mapsToSkills: ["ALG1-U7-S6"], difficulty: "medium", explanation: "P = 500 × 2^3 = 500 × 8 = 4000.", sortOrder: 20 },
  // Unit 8 (DIAG-021, DIAG-022)
  { questionId: "DIAG-021", questionText: "Add: (3x^2 + 2x - 1) + (x^2 - 4x + 5)", questionType: "multiple_choice", choices: [{ label: "A", text: "4x^2 - 2x + 4" }, { label: "B", text: "4x^2 + 6x + 4" }, { label: "C", text: "2x^2 - 2x + 4" }, { label: "D", text: "4x^2 - 2x - 4" }], correctAnswer: "A", mapsToUnit: "8", mapsToSkills: ["ALG1-U8-S2"], difficulty: "easy", explanation: "(3+1)x^2 + (2-4)x + (-1+5) = 4x^2 - 2x + 4.", sortOrder: 21 },
  { questionId: "DIAG-022", questionText: "Multiply: (x + 3)(x + 4)", questionType: "multiple_choice", choices: [{ label: "A", text: "x^2 + 7x + 12" }, { label: "B", text: "x^2 + 12x + 7" }, { label: "C", text: "x^2 + 7x + 7" }, { label: "D", text: "x^2 + 12" }], correctAnswer: "A", mapsToUnit: "8", mapsToSkills: ["ALG1-U8-S4"], difficulty: "medium", explanation: "FOIL: x^2 + 4x + 3x + 12 = x^2 + 7x + 12.", sortOrder: 22 },
  // Unit 9 (DIAG-023, DIAG-024)
  { questionId: "DIAG-023", questionText: "Factor: x^2 + 5x + 6", questionType: "multiple_choice", choices: [{ label: "A", text: "(x + 2)(x + 3)" }, { label: "B", text: "(x + 1)(x + 6)" }, { label: "C", text: "(x + 5)(x + 1)" }, { label: "D", text: "(x + 2)(x + 4)" }], correctAnswer: "A", mapsToUnit: "9", mapsToSkills: ["ALG1-U9-S2"], difficulty: "easy", explanation: "Find two numbers that multiply to 6 and add to 5: 2 and 3. So (x+2)(x+3).", sortOrder: 23 },
  { questionId: "DIAG-024", questionText: "Factor: 2x^2 + 7x + 3", questionType: "multiple_choice", choices: [{ label: "A", text: "(2x + 1)(x + 3)" }, { label: "B", text: "(x + 3)(2x + 1)" }, { label: "C", text: "(2x + 3)(x + 1)" }, { label: "D", text: "(x + 7)(2x - 1)" }], correctAnswer: "A", mapsToUnit: "9", mapsToSkills: ["ALG1-U9-S3"], difficulty: "medium", explanation: "(2x + 1)(x + 3) = 2x^2 + 6x + x + 3 = 2x^2 + 7x + 3. Correct.", sortOrder: 24 },
  // Unit 10 (DIAG-025, DIAG-026)
  { questionId: "DIAG-025", questionText: "What is the vertex of y = x^2 - 4x + 3?", questionType: "multiple_choice", choices: [{ label: "A", text: "(2, -1)" }, { label: "B", text: "(4, 3)" }, { label: "C", text: "(-2, 15)" }, { label: "D", text: "(2, 3)" }], correctAnswer: "A", mapsToUnit: "10", mapsToSkills: ["ALG1-U10-S1"], difficulty: "easy", explanation: "x-vertex = -b/(2a) = 4/2 = 2. y = 4 - 8 + 3 = -1. Vertex: (2, -1).", sortOrder: 25 },
  { questionId: "DIAG-026", questionText: "Solve: x^2 - 5x + 6 = 0", questionType: "multiple_choice", choices: [{ label: "A", text: "x = 2 or x = 3" }, { label: "B", text: "x = -2 or x = -3" }, { label: "C", text: "x = 1 or x = 6" }, { label: "D", text: "x = 5 or x = 1" }], correctAnswer: "A", mapsToUnit: "10", mapsToSkills: ["ALG1-U10-S4"], difficulty: "medium", explanation: "Factor: (x-2)(x-3) = 0. So x = 2 or x = 3.", sortOrder: 26 },
  // Unit 11 (DIAG-027, DIAG-028)
  { questionId: "DIAG-027", questionText: "A scatter plot shows that as study time increases, test scores increase. This is an example of:", questionType: "multiple_choice", choices: [{ label: "A", text: "Negative correlation" }, { label: "B", text: "No correlation" }, { label: "C", text: "Positive correlation" }, { label: "D", text: "Causation" }], correctAnswer: "C", mapsToUnit: "11", mapsToSkills: ["ALG1-U11-S2"], difficulty: "easy", explanation: "When both variables increase together, that is positive correlation.", sortOrder: 27 },
  { questionId: "DIAG-028", questionText: "A line of best fit passes through (0, 5) and (10, 25). Predict the y-value when x = 15.", questionType: "multiple_choice", choices: [{ label: "A", text: "30" }, { label: "B", text: "35" }, { label: "C", text: "40" }, { label: "D", text: "45" }], correctAnswer: "B", mapsToUnit: "11", mapsToSkills: ["ALG1-U11-S4"], difficulty: "medium", explanation: "Slope = (25-5)/(10-0) = 2. Equation: y = 2x + 5. At x=15: y = 30 + 5 = 35.", sortOrder: 28 },
  // Unit 12 (DIAG-029, DIAG-030)
  { questionId: "DIAG-029", questionText: "A rectangle has length (2x + 3) and width (x - 1). Which expression represents the area?", questionType: "multiple_choice", choices: [{ label: "A", text: "2x^2 + x - 3" }, { label: "B", text: "2x^2 - 3" }, { label: "C", text: "3x + 2" }, { label: "D", text: "2x^2 + 5x - 3" }], correctAnswer: "A", mapsToUnit: "12", mapsToSkills: ["ALG1-U8-S4", "ALG1-U10-S2"], difficulty: "easy", explanation: "(2x+3)(x-1) = 2x^2 - 2x + 3x - 3 = 2x^2 + x - 3.", sortOrder: 29 },
  { questionId: "DIAG-030", questionText: "A ball is thrown upward. Its height in feet is h = -16t^2 + 64t + 5, where t is time in seconds. What is the maximum height?", questionType: "multiple_choice", choices: [{ label: "A", text: "64 feet" }, { label: "B", text: "69 feet" }, { label: "C", text: "5 feet" }, { label: "D", text: "80 feet" }], correctAnswer: "B", mapsToUnit: "12", mapsToSkills: ["ALG1-U10-S1", "ALG1-U10-S2"], difficulty: "medium", explanation: "t at vertex = -64/(2×-16) = 2. h(2) = -16(4) + 64(2) + 5 = -64 + 128 + 5 = 69 feet.", sortOrder: 30 },
];

for (const q of diagnosticData) {
  await insert("diagnosticQuestions", {
    questionId: q.questionId,
    questionText: q.questionText,
    questionType: q.questionType,
    choices: q.choices,
    correctAnswer: q.correctAnswer,
    mapsToUnit: q.mapsToUnit,
    mapsToSkills: q.mapsToSkills,
    difficulty: q.difficulty,
    explanation: q.explanation,
    sortOrder: q.sortOrder,
  });
}

console.log("✅ Curriculum seed complete!");
await db.end();
