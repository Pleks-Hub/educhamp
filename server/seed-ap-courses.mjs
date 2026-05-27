/**
 * seed-ap-courses.mjs
 * Seeds 6 new AP / Test-Prep courses:
 *   AP Chemistry, AP Statistics, AP Calculus BC,
 *   AP Literature, AP Business with Personal Finance, SAT Prep
 *
 * Run: node server/seed-ap-courses.mjs
 */
import mysql from "mysql2/promise";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL not set");
const urlWithoutSsl = rawUrl.split("?")[0];
const url = new URL(urlWithoutSsl);
const db = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});
console.log("Connected to database");

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function insertCourse(code, title, subject, grade, description, teks, sortOrder) {
  await db.execute(
    `INSERT INTO courses (courseCode, title, subject, gradeLevel, description, teksCode, isActive, isDefault, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, true, false, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), gradeLevel=VALUES(gradeLevel)`,
    [code, title, subject, grade, description, teks, sortOrder]
  );
  const [existing] = await db.execute(`SELECT id FROM courses WHERE courseCode=?`, [code]);
  return existing[0].id;
}

async function insertUnit(courseId, unitNumber, title, overview, teks, sortOrder) {
  await db.execute(
    `INSERT INTO units (courseId, unitNumber, title, overview, teksAlignment, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), overview=VALUES(overview)`,
    [courseId, unitNumber, title, overview, teks, sortOrder]
  );
  const [existing] = await db.execute(
    `SELECT id FROM units WHERE courseId=? AND unitNumber=?`, [courseId, unitNumber]
  );
  return existing[0].id;
}

async function insertSkill(courseId, skillId, skillName, unitId, unitNumber, sortOrder) {
  await db.execute(
    `INSERT INTO skills (courseId, skillId, skillName, unitId, unitNumber, prerequisiteSkillIds, sortOrder)
     VALUES (?, ?, ?, ?, ?, '[]', ?)
     ON DUPLICATE KEY UPDATE skillName=VALUES(skillName)`,
    [courseId, skillId, skillName, unitId, unitNumber, sortOrder]
  );
}

async function insertLesson(unitId, courseId, lessonNumber, title, content, lessonType, sortOrder) {
  await db.execute(
    `INSERT INTO lessons (unitId, lessonNumber, title, explanation, workedExamples, guidedProblems, independentProblems, misconceptions, sortOrder)
     VALUES (?, ?, ?, ?, '[]', '[]', '[]', '[]', ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), explanation=VALUES(explanation)`,
    [unitId, lessonNumber, title, content, sortOrder]
  );
}

async function insertQuizQ(courseId, unitId, text, type, choices, answer, explanation, skillTag, difficulty, sortOrder) {
  await db.execute(
    `INSERT INTO quizQuestions (courseId, unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [courseId, unitId, text, type, choices ? JSON.stringify(choices) : null, answer, explanation, skillTag, difficulty, sortOrder]
  );
}

async function insertDiagQ(courseId, questionId, text, type, choices, answer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder) {
  await db.execute(
    `INSERT INTO diagnosticQuestions (courseId, questionId, questionText, questionType, choices, correctAnswer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE questionText=VALUES(questionText)`,
    [courseId, questionId, text, type, choices ? JSON.stringify(choices) : null, answer, mapsToUnit, JSON.stringify(mapsToSkills), difficulty, explanation, sortOrder]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AP CHEMISTRY
// ═══════════════════════════════════════════════════════════════════════════════

console.log("Seeding AP Chemistry...");
const APCHEM = await insertCourse(
  "APCHEM", "AP Chemistry", "Science", "AP",
  "College-level chemistry covering atomic structure, bonding, thermodynamics, kinetics, equilibrium, and electrochemistry. Prepares students for the AP Chemistry exam.",
  "TEKS Chemistry §112.35", 200
);

const apchemUnits = [
  [1, "Atomic Structure & Properties", "Moles, mass, atomic structure, electron configuration, and periodic trends.", "§112.35(c)(2)", 1],
  [2, "Molecular & Ionic Compound Structure", "Ionic vs. covalent bonds, Lewis structures, VSEPR, polarity, and intermolecular forces.", "§112.35(c)(3)", 2],
  [3, "Intermolecular Forces & Properties", "Phase diagrams, colligative properties, solubility, and chromatography.", "§112.35(c)(4)", 3],
  [4, "Chemical Reactions", "Types of reactions, net ionic equations, stoichiometry, and limiting reagents.", "§112.35(c)(5)", 4],
  [5, "Kinetics", "Rate laws, reaction mechanisms, activation energy, and catalysis.", "§112.35(c)(6)", 5],
  [6, "Thermodynamics", "Enthalpy, entropy, Gibbs free energy, Hess's Law, and calorimetry.", "§112.35(c)(7)", 6],
  [7, "Equilibrium", "Le Chatelier's principle, Kc, Kp, solubility equilibria, and buffer systems.", "§112.35(c)(8)", 7],
  [8, "Acids & Bases", "Brønsted-Lowry theory, pH, Ka/Kb, titrations, and acid-base indicators.", "§112.35(c)(9)", 8],
  [9, "Electrochemistry", "Galvanic cells, standard reduction potentials, electrolysis, and Nernst equation.", "§112.35(c)(10)", 9],
  [10, "Organic Chemistry Fundamentals", "Functional groups, nomenclature, polymers, and reaction mechanisms.", "§112.35(c)(11)", 10],
  [11, "AP Exam Free-Response Strategies", "Multi-part FRQ practice: data analysis, experimental design, and justification writing.", "AP Chem FRQ", 11],
  [12, "Full AP Practice Exam", "Timed 3.5-hour simulation: 60 MCQ + 7 FRQ with scoring rubrics and feedback.", "AP Chem Exam", 12],
];

for (const [num, title, overview, teks, sort] of apchemUnits) {
  const uid = await insertUnit(APCHEM, num, title, overview, teks, sort);
  await insertSkill(APCHEM, `APCHEM-U${num}-S1`, `${title} — Core Concepts`, uid, num, 1);
  await insertSkill(APCHEM, `APCHEM-U${num}-S2`, `${title} — Problem Solving`, uid, num, 2);
  await insertLesson(uid, APCHEM, 1, `Introduction to ${title}`, `## ${title}\n\n${overview}\n\n### Learning Objectives\n- Understand the foundational principles of ${title.toLowerCase()}\n- Apply concepts to AP-level problems\n- Connect theory to laboratory observations\n\n### Key Concepts\nThis unit covers the essential AP Chemistry content for ${title}. Work through each concept carefully, as AP exam questions require both conceptual understanding and quantitative problem-solving skills.`, "lesson", 1);
  await insertLesson(uid, APCHEM, 2, `${title} — Practice Problems`, `## Practice Problems: ${title}\n\nWork through these AP-style problems. Show all work and include units.\n\n### Problem Set\n1. Quantitative calculation problems\n2. Conceptual explanation questions\n3. Experimental design scenarios\n4. Data analysis and graphing\n\nRemember: AP Chemistry FRQs require complete justifications — always explain *why*, not just *what*.`, "lesson", 2);
  await insertQuizQ(APCHEM, uid, `Which of the following best describes the concept covered in Unit ${num}: ${title}?`, "multiple_choice",
    ["A fundamental principle of atomic theory", "A key concept in chemical bonding", "A thermodynamic relationship", "A kinetic rate expression"],
    "A fundamental principle of atomic theory", `Unit ${num} focuses on ${overview}`, `APCHEM-U${num}-S1`, "medium", 1);
}

for (const [num, title, overview, teks, sort] of apchemUnits) {
  await insertDiagQ(APCHEM, `APCHEM-DIAG-${num}`, `AP Chemistry diagnostic: ${title} — ${overview}`, "multiple_choice",
    ["Correct conceptual answer", "Common misconception A", "Common misconception B", "Partially correct answer"],
    "Correct conceptual answer", num, [`APCHEM-U${num}-S1`], "medium", `Tests knowledge of ${overview}`, num);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AP STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

console.log("Seeding AP Statistics...");
const APSTAT = await insertCourse(
  "APSTAT", "AP Statistics", "Mathematics", "AP",
  "College-level statistics covering exploratory data analysis, probability, statistical inference, and experimental design. Prepares students for the AP Statistics exam.",
  "TEKS Statistics §111.47", 201
);

const apstatUnits = [
  [1, "Exploring One-Variable Data", "Frequency tables, dotplots, histograms, boxplots, measures of center and spread.", "§111.47(c)(1)", 1],
  [2, "Exploring Two-Variable Data", "Scatterplots, correlation, least-squares regression, residuals, and influential points.", "§111.47(c)(2)", 2],
  [3, "Collecting Data", "Sampling methods, experimental design, bias, randomization, and control groups.", "§111.47(c)(3)", 3],
  [4, "Probability & Random Variables", "Sample spaces, conditional probability, independence, discrete and continuous distributions.", "§111.47(c)(4)", 4],
  [5, "Sampling Distributions", "Central Limit Theorem, sampling distribution of x̄ and p̂, standard error.", "§111.47(c)(5)", 5],
  [6, "Inference for Categorical Data: Proportions", "One-sample and two-sample z-tests and confidence intervals for proportions.", "§111.47(c)(6)", 6],
  [7, "Inference for Quantitative Data: Means", "One-sample and two-sample t-tests, paired t-tests, confidence intervals for means.", "§111.47(c)(7)", 7],
  [8, "Inference for Categorical Data: Chi-Square", "Chi-square goodness-of-fit, homogeneity, and independence tests.", "§111.47(c)(8)", 8],
  [9, "Inference for Quantitative Data: Slopes", "Inference for linear regression slope, t-test for slope, confidence intervals.", "§111.47(c)(9)", 9],
  [10, "Normal & Binomial Distributions", "Normal calculations, binomial probability, geometric distribution, and z-scores.", "§111.47(c)(10)", 10],
  [11, "AP Exam Free-Response Strategies", "Investigative task practice, communication of statistical reasoning, and scoring rubrics.", "AP Stat FRQ", 11],
  [12, "Full AP Practice Exam", "Timed 3-hour simulation: 40 MCQ + 6 FRQ including investigative task.", "AP Stat Exam", 12],
];

for (const [num, title, overview, teks, sort] of apstatUnits) {
  const uid = await insertUnit(APSTAT, num, title, overview, teks, sort);
  await insertSkill(APSTAT, `APSTAT-U${num}-S1`, `${title} — Concepts`, uid, num, 1);
  await insertSkill(APSTAT, `APSTAT-U${num}-S2`, `${title} — Calculations & Interpretation`, uid, num, 2);
  await insertLesson(uid, APSTAT, 1, `Introduction to ${title}`, `## ${title}\n\n${overview}\n\n### AP Statistics Key Principles\n- Always describe distributions in context (shape, center, spread, outliers)\n- Interpret results in the context of the problem\n- State assumptions and check conditions before inference\n- Write complete conclusions with direction, parameter, and confidence level\n\n### Core Content\n${overview}`, "lesson", 1);
  await insertLesson(uid, APSTAT, 2, `${title} — AP Practice`, `## AP-Style Practice: ${title}\n\n### Multiple Choice Strategies\n- Eliminate obviously wrong answers\n- Watch for "which of the following is NOT..."\n- Check units and context\n\n### Free Response Tips\n- State hypotheses in words AND symbols\n- Check conditions explicitly\n- Write conclusions in context\n- Include direction of test in conclusion`, "lesson", 2);
  await insertQuizQ(APSTAT, uid, `In the context of ${title}, which statement is most statistically accurate?`, "multiple_choice",
    ["Larger samples always reduce bias", "Random sampling reduces variability", "Correlation implies causation", "A p-value of 0.04 means the null is false"],
    "Random sampling reduces variability", `Unit ${num}: ${overview}`, `APSTAT-U${num}-S1`, "medium", 1);
}

for (const [num, title, overview, teks, sort] of apstatUnits) {
  await insertDiagQ(APSTAT, `APSTAT-DIAG-${num}`, `AP Statistics diagnostic: ${title}`, "multiple_choice",
    ["Statistically correct answer", "Confuses correlation with causation", "Ignores conditions for inference", "Misinterprets p-value"],
    "Statistically correct answer", num, [`APSTAT-U${num}-S1`], "medium", `Tests ${overview}`, num);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AP CALCULUS BC
// ═══════════════════════════════════════════════════════════════════════════════

console.log("Seeding AP Calculus BC...");
const APCALC = await insertCourse(
  "APCALCBC", "AP Calculus BC", "Mathematics", "AP",
  "College-level calculus covering limits, derivatives, integrals, series, parametric/polar equations, and differential equations. Covers all AP Calculus AB topics plus BC extensions.",
  "TEKS Pre-Calculus §111.42 / College Board AP Calculus BC", 202
);

const apcalcUnits = [
  [1, "Limits & Continuity", "Limit definition, limit laws, squeeze theorem, continuity, and IVT.", "AP Calc BC Unit 1", 1],
  [2, "Differentiation: Definition & Fundamental Properties", "Derivative definition, power/product/quotient rules, higher-order derivatives.", "AP Calc BC Unit 2", 2],
  [3, "Differentiation: Composite, Implicit & Inverse Functions", "Chain rule, implicit differentiation, inverse trig derivatives, L'Hôpital's rule.", "AP Calc BC Unit 3", 3],
  [4, "Contextual Applications of Differentiation", "Related rates, linearization, motion problems, and optimization.", "AP Calc BC Unit 4", 4],
  [5, "Analytical Applications of Differentiation", "Mean Value Theorem, increasing/decreasing, concavity, curve sketching.", "AP Calc BC Unit 5", 5],
  [6, "Integration & Accumulation of Change", "Riemann sums, definite integrals, FTC Parts 1 & 2, u-substitution.", "AP Calc BC Unit 6", 6],
  [7, "Differential Equations", "Slope fields, separation of variables, Euler's method, logistic growth.", "AP Calc BC Unit 7", 7],
  [8, "Applications of Integration", "Area between curves, volumes (disk/washer/shell), arc length, accumulation.", "AP Calc BC Unit 8", 8],
  [9, "Parametric Equations, Polar Coordinates & Vector-Valued Functions", "Parametric derivatives, arc length, polar area, vector functions.", "AP Calc BC Unit 9", 9],
  [10, "Infinite Sequences & Series", "Convergence tests, Taylor/Maclaurin series, power series, error bounds.", "AP Calc BC Unit 10", 10],
  [11, "AP Exam Free-Response Strategies", "Multi-part FRQ practice: justification, communication, and scoring rubrics.", "AP Calc BC FRQ", 11],
  [12, "Full AP Practice Exam", "Timed 3.25-hour simulation: 45 MCQ + 6 FRQ (calculator and non-calculator sections).", "AP Calc BC Exam", 12],
];

for (const [num, title, overview, teks, sort] of apcalcUnits) {
  const uid = await insertUnit(APCALC, num, title, overview, teks, sort);
  await insertSkill(APCALC, `APCALC-U${num}-S1`, `${title} — Theory`, uid, num, 1);
  await insertSkill(APCALC, `APCALC-U${num}-S2`, `${title} — Problem Solving`, uid, num, 2);
  await insertLesson(uid, APCALC, 1, `Introduction to ${title}`, `## ${title}\n\n${overview}\n\n### AP Calculus BC Approach\n- Show all work clearly on FRQs — partial credit is awarded\n- Know when to use a calculator (Section IB, IIB) vs. not (Section IA, IIA)\n- Justify answers using proper mathematical language\n- Connect graphical, numerical, analytical, and verbal representations\n\n### Key Formulas & Theorems\n${overview}`, "lesson", 1);
  await insertLesson(uid, APCALC, 2, `${title} — AP Practice Problems`, `## Practice: ${title}\n\n### Non-Calculator Problems\nWork through these analytically, showing all algebraic steps.\n\n### Calculator-Active Problems\nUse your calculator to find numerical answers, but still show setup.\n\n### FRQ Writing Tips\n- State the theorem you are using\n- Include units in all contextual problems\n- Verify answers make sense in context`, "lesson", 2);
  await insertQuizQ(APCALC, uid, `Which technique is most appropriate for solving a problem in Unit ${num}: ${title}?`, "multiple_choice",
    ["Direct substitution and algebraic manipulation", "Integration by parts", "Comparison test for series", "Polar coordinate conversion"],
    "Direct substitution and algebraic manipulation", `Unit ${num}: ${overview}`, `APCALC-U${num}-S1`, "hard", 1);
}

for (const [num, title, overview, teks, sort] of apcalcUnits) {
  await insertDiagQ(APCALC, `APCALC-DIAG-${num}`, `AP Calculus BC diagnostic: ${title}`, "multiple_choice",
    ["Correct mathematical answer", "Forgot chain rule", "Sign error in integration", "Confused convergence test"],
    "Correct mathematical answer", num, [`APCALC-U${num}-S1`], "medium", `Tests ${overview}`, num);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AP LITERATURE
// ═══════════════════════════════════════════════════════════════════════════════

console.log("Seeding AP Literature...");
const APLIT = await insertCourse(
  "APLIT", "AP Literature & Composition", "English Language Arts", "AP",
  "College-level literary analysis covering prose fiction, poetry, drama, and the craft of writing. Develops close reading, argumentation, and essay writing skills for the AP Literature exam.",
  "TEKS English IV §110.39", 203
);

const aplitUnits = [
  [1, "Close Reading & Textual Evidence", "Annotation strategies, identifying literary devices, and quoting effectively.", "§110.39(c)(1)", 1],
  [2, "Character, Conflict & Narrative Structure", "Protagonist/antagonist, internal vs. external conflict, plot arc, and narrative perspective.", "§110.39(c)(2)", 2],
  [3, "Setting, Atmosphere & Symbolism", "How setting creates mood, symbolic objects and actions, and motif tracking.", "§110.39(c)(3)", 3],
  [4, "Point of View & Narrative Voice", "First/third person, unreliable narrator, free indirect discourse, and tone analysis.", "§110.39(c)(4)", 4],
  [5, "Poetry Analysis: Form & Structure", "Meter, rhyme scheme, stanza forms (sonnet, villanelle, ode), and visual form.", "§110.39(c)(5)", 5],
  [6, "Poetry Analysis: Figurative Language & Imagery", "Metaphor, simile, personification, allusion, and sensory imagery.", "§110.39(c)(6)", 6],
  [7, "Drama & Dramatic Conventions", "Stage directions, dramatic irony, soliloquy, aside, and Shakespearean conventions.", "§110.39(c)(7)", 7],
  [8, "Thematic Analysis & Interpretation", "Identifying and developing a complex literary argument about theme.", "§110.39(c)(8)", 8],
  [9, "The Literary Argument Essay (Q3)", "Thesis construction, evidence selection, commentary, and essay structure for the open question.", "AP Lit Q3", 9],
  [10, "Prose Analysis Essay (Q2)", "Analyzing how an author's stylistic choices contribute to meaning in a prose passage.", "AP Lit Q2", 10],
  [11, "Poetry Analysis Essay (Q1)", "Analyzing how poetic elements convey meaning in an unseen poem.", "AP Lit Q1", 11],
  [12, "Full AP Practice Exam", "Timed 3-hour simulation: 55 MCQ + 3 FRQ essays with scoring rubrics.", "AP Lit Exam", 12],
];

for (const [num, title, overview, teks, sort] of aplitUnits) {
  const uid = await insertUnit(APLIT, num, title, overview, teks, sort);
  await insertSkill(APLIT, `APLIT-U${num}-S1`, `${title} — Reading`, uid, num, 1);
  await insertSkill(APLIT, `APLIT-U${num}-S2`, `${title} — Writing`, uid, num, 2);
  await insertLesson(uid, APLIT, 1, `Introduction to ${title}`, `## ${title}\n\n${overview}\n\n### AP Literature Approach\nAP Literature rewards *interpretive sophistication*. You must go beyond identifying devices to explaining their *effect* on meaning, tone, and theme.\n\n### The Three AP Essay Types\n- **Q1 (Poetry Analysis):** Analyze how poetic elements convey meaning\n- **Q2 (Prose Analysis):** Analyze how stylistic choices create meaning\n- **Q3 (Literary Argument):** Argue a thematic interpretation using a work of your choice\n\n### This Unit\n${overview}`, "lesson", 1);
  await insertLesson(uid, APLIT, 2, `${title} — Writing Workshop`, `## Writing Workshop: ${title}\n\n### Thesis Writing\nA strong AP thesis makes a *defensible claim* that requires literary evidence. Avoid plot summary.\n\n**Weak:** "The author uses imagery in this poem."\n**Strong:** "Through the juxtaposition of industrial and natural imagery, the speaker reveals the destructive cost of progress on human connection."\n\n### Evidence & Commentary\n- Quote briefly and precisely\n- Explain HOW the quote supports your claim\n- Connect back to the thesis\n\n### Practice Prompt\nWrite a paragraph analyzing how ${title.toLowerCase()} functions in a text of your choice.`, "lesson", 2);
  await insertQuizQ(APLIT, uid, `In AP Literature analysis, which approach best demonstrates sophisticated understanding of ${title}?`, "multiple_choice",
    ["Identifying the device and explaining its effect on meaning", "Listing all examples of the device in the text", "Summarizing the plot and mentioning the device", "Defining the device in general terms"],
    "Identifying the device and explaining its effect on meaning", `Unit ${num}: ${overview}`, `APLIT-U${num}-S1`, "medium", 1);
}

for (const [num, title, overview, teks, sort] of aplitUnits) {
  await insertDiagQ(APLIT, `APLIT-DIAG-${num}`, `AP Literature diagnostic: ${title}`, "multiple_choice",
    ["Sophisticated interpretive analysis", "Plot summary without analysis", "Device identification without effect", "Off-topic response"],
    "Sophisticated interpretive analysis", num, [`APLIT-U${num}-S1`], "medium", `Tests ${overview}`, num);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AP BUSINESS WITH PERSONAL FINANCE
// ═══════════════════════════════════════════════════════════════════════════════

console.log("Seeding AP Business with Personal Finance...");
const APBIZ = await insertCourse(
  "APBIZ", "AP Business with Personal Finance", "Business", "AP",
  "College-level business course integrating entrepreneurship, economics, marketing, management, and personal finance. Develops financial literacy and business acumen for real-world application.",
  "TEKS Business Management §118.44", 204
);

const apbizUnits = [
  [1, "Personal Finance Foundations", "Budgeting, net worth, income vs. expenses, financial goals, and the time value of money.", "§118.44(c)(1)", 1],
  [2, "Banking, Credit & Debt Management", "Checking/savings accounts, credit scores, interest rates, loans, and debt payoff strategies.", "§118.44(c)(2)", 2],
  [3, "Investing & Wealth Building", "Stocks, bonds, mutual funds, ETFs, compound interest, and retirement accounts (401k, IRA, Roth).", "§118.44(c)(3)", 3],
  [4, "Insurance & Risk Management", "Types of insurance (health, auto, life, renters), deductibles, premiums, and risk assessment.", "§118.44(c)(4)", 4],
  [5, "Taxes & Government Finance", "Federal income tax, W-2/1040, FICA, tax brackets, deductions, and credits.", "§118.44(c)(5)", 5],
  [6, "Entrepreneurship & Business Planning", "Business plan components, market research, value proposition, and startup costs.", "§118.44(c)(6)", 6],
  [7, "Marketing & Consumer Behavior", "The 4 Ps, target market, branding, digital marketing, and consumer psychology.", "§118.44(c)(7)", 7],
  [8, "Business Operations & Management", "Organizational structures, supply chain, operations management, and HR basics.", "§118.44(c)(8)", 8],
  [9, "Accounting & Financial Statements", "Income statement, balance sheet, cash flow statement, and basic ratio analysis.", "§118.44(c)(9)", 9],
  [10, "Economics & Business Cycles", "Supply and demand, market structures, GDP, inflation, and monetary policy.", "§118.44(c)(10)", 10],
  [11, "Business Ethics & Social Responsibility", "Ethical decision-making, CSR, sustainability, and stakeholder theory.", "§118.44(c)(11)", 11],
  [12, "Capstone: Business Plan Presentation", "Comprehensive business plan development and financial projections for a simulated venture.", "§118.44(c)(12)", 12],
];

for (const [num, title, overview, teks, sort] of apbizUnits) {
  const uid = await insertUnit(APBIZ, num, title, overview, teks, sort);
  await insertSkill(APBIZ, `APBIZ-U${num}-S1`, `${title} — Knowledge`, uid, num, 1);
  await insertSkill(APBIZ, `APBIZ-U${num}-S2`, `${title} — Application`, uid, num, 2);
  await insertLesson(uid, APBIZ, 1, `Introduction to ${title}`, `## ${title}\n\n${overview}\n\n### Why This Matters\nUnderstanding ${title.toLowerCase()} is a critical life skill. Whether you're managing your own money or running a business, these concepts directly impact your financial future.\n\n### Real-World Application\nThis unit connects classroom concepts to real decisions you'll face — from choosing a bank account to evaluating a business opportunity.\n\n### Key Vocabulary\n${overview}`, "lesson", 1);
  await insertLesson(uid, APBIZ, 2, `${title} — Case Studies & Practice`, `## Case Studies: ${title}\n\n### Scenario Analysis\nWork through realistic business and personal finance scenarios:\n\n1. **Decision Analysis:** Evaluate the financial impact of different choices\n2. **Calculation Practice:** Apply formulas to real numbers\n3. **Critical Thinking:** Identify risks, benefits, and trade-offs\n4. **Planning Exercise:** Create a personal or business financial plan\n\n### AP Exam Connection\nBusiness exam questions test both knowledge and application. Always explain your reasoning.`, "lesson", 2);
  await insertQuizQ(APBIZ, uid, `Which of the following best demonstrates sound financial decision-making related to ${title}?`, "multiple_choice",
    ["Maximizing long-term value while managing risk", "Choosing the highest short-term return regardless of risk", "Avoiding all debt under any circumstances", "Spending all income to stimulate the economy"],
    "Maximizing long-term value while managing risk", `Unit ${num}: ${overview}`, `APBIZ-U${num}-S1`, "medium", 1);
}

for (const [num, title, overview, teks, sort] of apbizUnits) {
  await insertDiagQ(APBIZ, `APBIZ-DIAG-${num}`, `AP Business diagnostic: ${title}`, "multiple_choice",
    ["Financially sound decision", "Ignores opportunity cost", "Confuses revenue with profit", "Misunderstands compound interest"],
    "Financially sound decision", num, [`APBIZ-U${num}-S1`], "medium", `Tests ${overview}`, num);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SAT PREP
// ═══════════════════════════════════════════════════════════════════════════════

console.log("Seeding SAT Prep...");
const SATPREP = await insertCourse(
  "SATPREP", "SAT Prep: Score 1500+", "Test Preparation", "AP",
  "Comprehensive SAT preparation targeting a score of 1500 or higher. Covers advanced reading, writing, and math strategies with test-taking tricks, time management, and full-length practice exams.",
  "College Board SAT / Katy ISD College Readiness", 205
);

const satprepUnits = [
  [1, "SAT Overview & Score Strategy", "Test structure, scoring, section timing, guessing strategy, and 1500+ score roadmap.", "SAT Overview", 1],
  [2, "Reading: Information & Ideas", "Main idea, supporting details, command of evidence, and data interpretation in passages.", "SAT Reading", 2],
  [3, "Reading: Craft & Structure", "Vocabulary in context, text structure, point of view, and cross-text connections.", "SAT Reading", 3],
  [4, "Writing: Standard English Conventions", "Grammar rules (subject-verb agreement, pronoun reference, modifier placement, punctuation).", "SAT Writing", 4],
  [5, "Writing: Expression of Ideas", "Transitions, precision, concision, style, and rhetorical synthesis.", "SAT Writing", 5],
  [6, "Math: Algebra & Linear Functions", "Linear equations, systems, inequalities, and function notation — the most tested SAT math topic.", "SAT Math", 6],
  [7, "Math: Advanced Algebra & Functions", "Quadratics, polynomials, exponential functions, and radical/rational equations.", "SAT Math", 7],
  [8, "Math: Problem-Solving & Data Analysis", "Ratios, percentages, statistics, probability, and data interpretation.", "SAT Math", 8],
  [9, "Math: Geometry & Trigonometry", "Area, volume, coordinate geometry, circles, and right triangle trigonometry.", "SAT Math", 9],
  [10, "Advanced SAT Tricks & Shortcuts", "Plugging in numbers, back-solving, process of elimination, and time-saving strategies for 1500+ scorers.", "SAT Strategies", 10],
  [11, "Full Practice Test 1 with Analysis", "Timed full-length SAT simulation with detailed answer explanations and score analysis.", "SAT Practice", 11],
  [12, "Full Practice Test 2 & Score Maximization", "Second full-length practice test, targeted review of weak areas, and final exam-day strategies.", "SAT Practice", 12],
];

const satLessonContent = {
  1: `## SAT Overview & Score Strategy\n\n### The Digital SAT Structure\n- **Reading & Writing:** 2 modules × 27 questions = 54 questions, 64 minutes\n- **Math:** 2 modules × 22 questions = 44 questions, 70 minutes\n- **Total:** 98 questions, 2 hours 14 minutes\n- **Score Range:** 400–1600 (800 per section)\n\n### What 1500+ Requires\nTo score 1500+, you need approximately:\n- Reading & Writing: 730+ (miss no more than 3–4 per module)\n- Math: 770+ (miss no more than 2–3 per module)\n\n### The Adaptive Module Strategy\nThe SAT is adaptive — Module 2 difficulty depends on Module 1 performance. **Prioritize accuracy in Module 1** to unlock the harder (higher-ceiling) Module 2.\n\n### Guessing Strategy\nThere is NO penalty for wrong answers. **Always guess** — never leave a question blank. For hard questions, eliminate 1–2 choices first, then guess from the remaining options.`,
  2: `## Reading: Information & Ideas\n\n### The #1 SAT Reading Trick\n**The answer is always in the passage.** SAT reading questions have one objectively correct answer supported by specific text evidence. Never use outside knowledge.\n\n### Main Idea Questions\n- Read the first and last sentences of each paragraph\n- The main idea is usually stated, not implied\n- Eliminate answers that are too broad, too narrow, or contradicted by the text\n\n### Command of Evidence\nThese come in pairs:\n1. First question asks for a claim\n2. Second asks which quote best supports that claim\n**Strategy:** Work backwards — find the best quote first, then match it to the claim.\n\n### Data Interpretation\n- Read the graph/table title and axis labels first\n- Only use information shown in the data — don't extrapolate\n- Watch for "according to the graph" vs. "based on the passage"`,
  3: `## Reading: Craft & Structure\n\n### Vocabulary in Context\n**Trick:** Cover the word and predict a synonym from context. Then find the answer choice closest to your prediction.\n- Never choose the most common definition of a word — SAT tests secondary meanings\n- Example: "Sanction" can mean both approve AND penalize — context determines which\n\n### Text Structure Questions\n- Know the common structures: problem/solution, compare/contrast, cause/effect, chronological, claim/evidence\n- The structure question usually asks about a paragraph's *function* in the passage\n\n### Cross-Text Connections (Paired Passages)\n- Read Passage 1 and answer its questions first\n- Then read Passage 2 and answer its questions\n- Save "both passages" questions for last\n- Focus on: agreement, disagreement, one author's response to the other`,
  4: `## Writing: Standard English Conventions\n\n### The 5 Most Tested Grammar Rules\n\n**1. Subject-Verb Agreement**\nIgnore prepositional phrases between subject and verb.\n*"The box of chocolates [is/are] on the table."* → **is** (subject = box)\n\n**2. Pronoun Reference**\nPronouns must clearly refer to one specific noun.\n*Avoid:* "When Alex met Jordan, he was nervous." (Who is "he"?)\n\n**3. Modifier Placement**\nThe modifier must be next to what it modifies.\n*Wrong:* "Running down the street, the rain soaked me."\n*Right:* "Running down the street, I got soaked by the rain."\n\n**4. Punctuation: The Semicolon Rule**\nA semicolon connects two independent clauses. Both sides must be complete sentences.\n\n**5. Comma Splices**\nTwo independent clauses cannot be joined by only a comma.\n*Wrong:* "I studied hard, I got a 1500."\n*Right:* "I studied hard; I got a 1500." OR "I studied hard, and I got a 1500."`,
  5: `## Writing: Expression of Ideas\n\n### Transitions (Most Common Writing Question Type)\nChoose the transition that matches the *logical relationship* between sentences:\n- **Contrast:** however, nevertheless, on the other hand, yet, although\n- **Addition:** furthermore, moreover, in addition, also\n- **Cause/Effect:** therefore, thus, consequently, as a result\n- **Example:** for instance, for example, specifically\n- **Concession:** admittedly, granted, while it is true that\n\n**Trick:** Read the sentence before AND after the blank. Determine the relationship, then match the transition.\n\n### Concision Questions\nThe SAT rewards brevity. When two answers are grammatically correct, choose the shorter one that preserves meaning.\n- Eliminate redundant phrases: "past history" → "history"\n- Eliminate wordy constructions: "due to the fact that" → "because"\n\n### Rhetorical Synthesis\nThese questions give you notes and ask you to combine them into a sentence. Focus on:\n- What information needs to be included?\n- What is the logical relationship between the pieces of information?`,
  6: `## Math: Algebra & Linear Functions\n\n### Why This Unit Matters\nLinear equations and systems account for approximately **35% of all SAT Math questions**. Master this unit to maximize your score.\n\n### Key Strategies\n\n**Plugging In Numbers**\nWhen a problem has variables in the answer choices, plug in a simple number (try 2, 3, or 10) and find the answer that matches.\n\n**Back-Solving**\nWhen the answer choices are numbers, plug them into the equation and find which one works. Start with B or C (middle values).\n\n**Linear Equation Tricks**\n- "No solution" → parallel lines → same slope, different y-intercept\n- "Infinitely many solutions" → same line → same slope AND same y-intercept\n- Systems of equations: substitution is usually faster than elimination for SAT\n\n### Most Common Mistakes\n- Forgetting to distribute the negative sign\n- Solving for x when the question asks for 2x or x+1\n- Missing "which of the following CANNOT be the value of x"`,
  7: `## Math: Advanced Algebra & Functions\n\n### Quadratics: The SAT's Favorite\n**Three forms to know:**\n- Standard: ax² + bx + c (use quadratic formula or factoring)\n- Vertex: a(x-h)² + k (vertex is at (h,k))\n- Factored: a(x-r)(x-s) (roots are r and s)\n\n**Discriminant Trick:**\n- b²-4ac > 0: two real solutions\n- b²-4ac = 0: one real solution (tangent to x-axis)\n- b²-4ac < 0: no real solutions\n\n### Exponential Functions\n- Growth: y = a(1+r)^t\n- Decay: y = a(1-r)^t\n- SAT often asks about the meaning of constants in context\n\n### Function Notation Tricks\n- f(3) means "substitute x=3"\n- f(x+2) means "substitute x+2 everywhere you see x"\n- "f(g(x))" means apply g first, then f`,
  8: `## Math: Problem-Solving & Data Analysis\n\n### Percentage Tricks\n- "What is 40% of 80?" → 0.40 × 80 = 32\n- "30 is what percent of 120?" → 30/120 = 0.25 = 25%\n- "Percent increase/decrease" → (new-old)/old × 100\n\n### Statistics: What the SAT Tests\n- **Mean:** sum ÷ count (sensitive to outliers)\n- **Median:** middle value (resistant to outliers)\n- **Mode:** most frequent value\n- **Range:** max - min\n- **Standard deviation:** spread around the mean\n\n**Key insight:** When a question asks which measure changes when an outlier is added, the answer is almost always the **mean** (not median or mode).\n\n### Probability\n- P(A) = favorable outcomes ÷ total outcomes\n- P(A and B) = P(A) × P(B) [if independent]\n- P(A or B) = P(A) + P(B) - P(A and B)`,
  9: `## Math: Geometry & Trigonometry\n\n### Essential Formulas (Provided on SAT)\nThe SAT gives you these — know how to USE them:\n- Circle: A = πr², C = 2πr\n- Rectangle: A = lw\n- Triangle: A = ½bh\n- Pythagorean theorem: a² + b² = c²\n- Special triangles: 30-60-90 and 45-45-90\n\n### Coordinate Geometry Tricks\n- Midpoint: ((x₁+x₂)/2, (y₁+y₂)/2)\n- Distance: √((x₂-x₁)² + (y₂-y₁)²)\n- Slope: (y₂-y₁)/(x₂-x₁)\n- Perpendicular slopes are negative reciprocals\n\n### Trigonometry (SOH-CAH-TOA)\n- sin θ = opposite/hypotenuse\n- cos θ = adjacent/hypotenuse\n- tan θ = opposite/adjacent\n\n**SAT Trig Trick:** sin(x) = cos(90°-x). If sin(30°) = 0.5, then cos(60°) = 0.5.`,
  10: `## Advanced SAT Tricks & Shortcuts for 1500+ Scorers\n\n### The 5 Most Powerful SAT Strategies\n\n**1. Plugging In (Math)**\nWhen variables are in answer choices, substitute a simple number. Works 80% of the time on algebra questions.\n\n**2. Back-Solving (Math)**\nWhen answer choices are numbers, test them. Start with B or C. Eliminates the need to set up complex equations.\n\n**3. Process of Elimination (Reading & Writing)**\nFor hard questions, eliminate 2 wrong answers and guess from the remaining 2. Your odds go from 25% to 50%.\n\n**4. The "Specific Evidence" Rule (Reading)**\nIf an answer choice makes a claim that isn't directly supported by a specific quote from the passage, eliminate it. The correct answer is always provable.\n\n**5. The "Shortest Correct Answer" Rule (Writing)**\nFor concision questions, the shortest grammatically correct answer is almost always right.\n\n### Time Management for 1500+\n- **Reading & Writing:** ~1:10 per question. If stuck, mark and move on.\n- **Math (no calc):** ~1:35 per question. Spend more time on hard problems.\n- **Math (calc):** ~1:35 per question. Use calculator strategically, not for every step.\n\n### The 1500+ Mindset\nAt this score level, you can afford to miss 6–8 questions total. Focus on:\n1. Eliminating careless errors (re-read the question)\n2. Mastering the question types you find hardest\n3. Consistent pacing — don't rush or go too slow`,
  11: `## Full Practice Test 1\n\n### Test Instructions\nThis is a full-length timed SAT simulation. Treat it like the real exam:\n\n**Rules:**\n- No phone (except as calculator if permitted)\n- Time yourself strictly\n- No breaks between modules (or take the official 10-minute break between sections)\n\n**Timing:**\n- Reading & Writing Module 1: 32 minutes (27 questions)\n- Reading & Writing Module 2: 32 minutes (27 questions)\n- 10-minute break\n- Math Module 1: 35 minutes (22 questions)\n- Math Module 2: 35 minutes (22 questions)\n\n### After the Test\n1. Score your test using the provided answer key\n2. Review every wrong answer — understand WHY you got it wrong\n3. Categorize errors: careless mistake, concept gap, or time pressure\n4. Focus your next study session on your weakest category`,
  12: `## Full Practice Test 2 & Score Maximization\n\n### Final Exam-Day Strategies\n\n**The Night Before:**\n- Review your most common error types (not new content)\n- Prepare your materials: ID, pencils, approved calculator, snacks\n- Sleep 8+ hours — cognitive performance drops significantly with less sleep\n\n**Morning Of:**\n- Eat a protein-rich breakfast\n- Arrive 30 minutes early\n- Do a 5-minute mental warm-up (solve 3 easy math problems)\n\n**During the Exam:**\n- Read every question twice before answering\n- For Reading: always find the specific line that proves your answer\n- For Math: write out your work — it helps catch errors\n- Never change an answer unless you find a specific reason to\n\n### Score Maximization Checklist\n✓ I know all grammar rules (Unit 4)\n✓ I can identify transition relationships (Unit 5)\n✓ I can plug in numbers and back-solve (Unit 10)\n✓ I know all geometry formulas (Unit 9)\n✓ I have a pacing strategy for each section\n✓ I know my weakest question types and have practiced them`,
};

for (const [num, title, overview, teks, sort] of satprepUnits) {
  const uid = await insertUnit(SATPREP, num, title, overview, teks, sort);
  await insertSkill(SATPREP, `SAT-U${num}-S1`, `${title} — Concepts`, uid, num, 1);
  await insertSkill(SATPREP, `SAT-U${num}-S2`, `${title} — Strategies & Practice`, uid, num, 2);
  const lessonContent = satLessonContent[num] ?? `## ${title}\n\n${overview}\n\nThis unit covers essential SAT preparation content for ${title}.`;
  await insertLesson(uid, SATPREP, 1, title, lessonContent, "lesson", 1);
  await insertLesson(uid, SATPREP, 2, `${title} — Practice Questions`, `## Practice: ${title}\n\nWork through these SAT-style questions. Apply the strategies from the lesson.\n\n### Approach\n1. Read the question carefully — identify what is being asked\n2. Apply the relevant strategy (plug in, back-solve, POE, etc.)\n3. Check your answer against the passage/problem\n4. Time yourself: aim for ~1:10 per Reading/Writing question, ~1:35 per Math question`, "lesson", 2);
}

// SAT-specific quiz questions with realistic distractors
const satQuizData = [
  [1, "Which SAT section is adaptive based on your Module 1 performance?", ["Both Reading/Writing and Math", "Only Reading/Writing", "Only Math", "Neither section is adaptive"], "Both Reading/Writing and Math", "Both sections of the digital SAT are adaptive.", "SAT-U1-S1", "easy"],
  [2, "On SAT Reading, when a question asks for the 'main idea' of a passage, the best strategy is to:", ["Read the first and last sentences of each paragraph", "Summarize the entire passage from memory", "Choose the most interesting answer", "Pick the longest answer choice"], "Read the first and last sentences of each paragraph", "The main idea is usually signaled in topic sentences.", "SAT-U2-S1", "easy"],
  [3, "The word 'sanction' in a passage about international trade most likely means:", ["Depends entirely on the context of the passage", "Always means 'approve'", "Always means 'penalize'", "Always means 'ignore'"], "Depends entirely on the context of the passage", "SAT vocabulary questions test context-dependent meanings.", "SAT-U3-S1", "medium"],
  [4, "Which sentence contains a subject-verb agreement error?", ["The team of players are ready to compete.", "Each of the students has submitted their work.", "Neither the teacher nor the students were prepared.", "The box of chocolates is on the table."], "The team of players are ready to compete.", "The subject is 'team' (singular), so the verb should be 'is'.", "SAT-U4-S1", "medium"],
  [5, "Which transition best connects these sentences: 'The study found significant benefits. ___, the sample size was small.'", ["However", "Therefore", "Furthermore", "For example"], "However", "The second sentence contrasts with the first, requiring a contrast transition.", "SAT-U5-S1", "easy"],
  [6, "A system of equations has no solution when the lines are:", ["Parallel (same slope, different y-intercept)", "Identical (same slope, same y-intercept)", "Perpendicular (negative reciprocal slopes)", "Intersecting at exactly one point"], "Parallel (same slope, different y-intercept)", "Parallel lines never intersect, so the system has no solution.", "SAT-U6-S1", "medium"],
  [7, "The vertex form of a quadratic y = a(x-h)² + k tells you that the vertex is at:", ["(h, k)", "(-h, k)", "(h, -k)", "(-h, -k)"], "(h, k)", "In vertex form, the vertex is directly read as (h, k).", "SAT-U7-S1", "easy"],
  [8, "A data set has values: 2, 4, 4, 6, 8, 100. Which measure of center best represents the typical value?", ["Median", "Mean", "Mode", "Range"], "Median", "The outlier (100) skews the mean; the median is resistant to outliers.", "SAT-U8-S1", "medium"],
  [9, "In a right triangle, if sin(θ) = 3/5, what is cos(θ)?", ["4/5", "3/4", "5/3", "5/4"], "4/5", "Using Pythagorean theorem: if opposite=3, hypotenuse=5, then adjacent=4, so cos=4/5.", "SAT-U9-S1", "medium"],
  [10, "The 'back-solving' strategy is most useful when:", ["Answer choices are specific numbers", "Answer choices contain variables", "The question asks for a percentage", "The question involves a graph"], "Answer choices are specific numbers", "Back-solving means testing answer choices in the problem — works when answers are numbers.", "SAT-U10-S1", "easy"],
  [11, "After taking a practice SAT, the most effective way to improve your score is to:", ["Review every wrong answer and categorize the error type", "Retake the same test immediately", "Only study the topics you already know well", "Focus exclusively on the last 5 questions in each section"], "Review every wrong answer and categorize the error type", "Targeted error analysis is the most efficient path to score improvement.", "SAT-U11-S1", "easy"],
  [12, "On exam day, when should you change an answer on the SAT?", ["Only when you find a specific reason to change it", "Whenever you feel uncertain", "Always go with your first instinct, never change", "Change answers in the last 5 minutes of each section"], "Only when you find a specific reason to change it", "Research shows first instincts are usually correct; only change if you find a concrete error.", "SAT-U12-S1", "medium"],
];

for (let i = 0; i < satprepUnits.length; i++) {
  const [num, title, overview, teks, sort] = satprepUnits[i];
  const [, qtext, choices, answer, explanation, skillTag, difficulty] = satQuizData[i];
  const [rows] = await db.execute(`SELECT id FROM units WHERE courseId=? AND unitNumber=?`, [SATPREP, num]);
  const uid = rows[0].id;
  await insertQuizQ(SATPREP, uid, qtext, "multiple_choice", choices, answer, explanation, skillTag, difficulty, 1);
}

// SAT diagnostic questions
const satDiagData = [
  [1, "What is the score range for each section of the SAT?", ["200–800", "0–100", "400–1600", "1–36"], "200–800", 1, ["SAT-U1-S1"], "easy", "Each SAT section (R&W and Math) is scored 200–800."],
  [2, "In SAT Reading, the answer to every question is:", ["Directly supported by specific text in the passage", "Based on your prior knowledge of the topic", "The most interesting interpretation", "The longest answer choice"], "Directly supported by specific text in the passage", 2, ["SAT-U2-S1"], "easy", "SAT reading answers are always provable from the text."],
  [3, "Which SAT strategy involves substituting a simple number for a variable in the answer choices?", ["Plugging in", "Back-solving", "Process of elimination", "Skipping and returning"], "Plugging in", 10, ["SAT-U10-S1"], "medium", "Plugging in works when variables appear in answer choices."],
  [4, "A comma splice occurs when:", ["Two independent clauses are joined by only a comma", "A comma is used before a coordinating conjunction", "A semicolon is used between two clauses", "A comma follows an introductory phrase"], "Two independent clauses are joined by only a comma", 4, ["SAT-U4-S1"], "medium", "Comma splices are one of the most common SAT grammar errors."],
  [5, "In SAT Math, if a question asks for 3x and you solve for x=4, the answer is:", ["12", "4", "7", "1"], "12", 6, ["SAT-U6-S1"], "easy", "Always re-read the question — it may ask for an expression, not just x."],
];

for (const [num, text, choices, answer, mapsToUnit, mapsToSkills, difficulty, explanation] of satDiagData) {
  await insertDiagQ(SATPREP, `SAT-DIAG-${num}`, text, "multiple_choice", choices, answer, mapsToUnit, mapsToSkills, difficulty, explanation, num);
}

// ─── Done ─────────────────────────────────────────────────────────────────────

await db.end();
console.log("\n✅ All 6 AP/SAT courses seeded successfully!");
console.log("   - AP Chemistry (APCHEM)");
console.log("   - AP Statistics (APSTAT)");
console.log("   - AP Calculus BC (APCALCBC)");
console.log("   - AP Literature & Composition (APLIT)");
console.log("   - AP Business with Personal Finance (APBIZ)");
console.log("   - SAT Prep: Score 1500+ (SATPREP)");
