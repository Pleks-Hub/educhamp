/**
 * Phase 1B Seed Script — Multi-District Reference Data
 * Seeds: countries, states, standardFrameworks, districts, schools,
 *        tracks, pacingGuides, assessmentTemplates, and a sample set
 *        of TEKS standards for Algebra I (canonical + narrative slugs).
 *
 * Run: node server/seed-phase1b.mjs
 * Safe to re-run: uses INSERT IGNORE / ON DUPLICATE KEY UPDATE throughout.
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Helper ──────────────────────────────────────────────────────────────────
async function upsert(table, data, uniqueKeys) {
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols
    .filter((c) => !uniqueKeys.includes(c))
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(", ");
  const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updates || "`id` = `id`"}`;
  const [result] = await db.execute(sql, vals);
  return result.insertId || null;
}

async function getId(table, whereCol, whereVal) {
  const [rows] = await db.execute(
    `SELECT id FROM \`${table}\` WHERE \`${whereCol}\` = ? LIMIT 1`,
    [whereVal]
  );
  return rows[0]?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. COUNTRIES
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding countries...");
await upsert("countries", { code: "US", name: "United States" }, ["code"]);
const usId = await getId("countries", "code", "US");

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STANDARD FRAMEWORKS
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding standardFrameworks...");
await upsert(
  "standardFrameworks",
  {
    code: "TEKS",
    name: "Texas Essential Knowledge and Skills",
    stateCode: "TX",
    isActive: true,
  },
  ["code"]
);
await upsert(
  "standardFrameworks",
  {
    code: "NY_NGLS",
    name: "New York Next Generation Learning Standards",
    stateCode: "NY",
    isActive: true,
  },
  ["code"]
);
await upsert(
  "standardFrameworks",
  {
    code: "CCSS",
    name: "Common Core State Standards",
    stateCode: null,
    isActive: true,
  },
  ["code"]
);

const teksId = await getId("standardFrameworks", "code", "TEKS");
const nyNglsId = await getId("standardFrameworks", "code", "NY_NGLS");

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STATES
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding states...");
await upsert(
  "states",
  {
    countryId: usId,
    code: "TX",
    name: "Texas",
    defaultFrameworkId: teksId,
    assessmentRegime: "staar_eoc",
  },
  ["countryId", "code"]
);
await upsert(
  "states",
  {
    countryId: usId,
    code: "NY",
    name: "New York",
    defaultFrameworkId: nyNglsId,
    assessmentRegime: "ny_regents",
  },
  ["countryId", "code"]
);

const txId = await getId("states", "code", "TX");
const nyId = await getId("states", "code", "NY");

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DISTRICTS
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding districts...");
await upsert(
  "districts",
  {
    stateId: txId,
    name: "Katy Independent School District",
    shortName: "Katy ISD",
    ncescode: "4823550",
    defaultFrameworkId: teksId,
    isActive: true,
  },
  ["ncescode"]
);
await upsert(
  "districts",
  {
    stateId: txId,
    name: "Houston Independent School District",
    shortName: "HISD",
    ncescode: "4823640",
    defaultFrameworkId: teksId,
    isActive: true,
  },
  ["ncescode"]
);
await upsert(
  "districts",
  {
    stateId: nyId,
    name: "New York City Department of Education",
    shortName: "NYC-DOE",
    ncescode: "3620580",
    defaultFrameworkId: nyNglsId,
    isActive: true,
  },
  ["ncescode"]
);

const katyId = await getId("districts", "ncescode", "4823550");
const hisdId = await getId("districts", "ncescode", "4823640");
const nycId = await getId("districts", "ncescode", "3620580");

// ═══════════════════════════════════════════════════════════════════════════════
// 5. SAMPLE SCHOOLS (one per district)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding sample schools...");
await upsert(
  "schools",
  { districtId: katyId, name: "Seven Lakes High School", ncescode: "482355001438", isActive: true },
  ["ncescode"]
);
await upsert(
  "schools",
  { districtId: hisdId, name: "Bellaire High School", ncescode: "482364001438", isActive: true },
  ["ncescode"]
);
await upsert(
  "schools",
  { districtId: nycId, name: "Stuyvesant High School", ncescode: "362058001438", isActive: true },
  ["ncescode"]
);

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TEKS STANDARDS — Algebra I (canonical sample set)
//    Real TEKS codes from §111.39 (Algebra I, Adopted 2012)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding TEKS Algebra I standards (canonical)...");

const alg1Standards = [
  // Unit 1 — Foundations of Algebra
  { code: "A.2(A)", strand: "Linear Functions", description: "Determine the domain and range of a linear function in mathematical problems; determine reasonable domain and range values for real-world situations, both continuous and discrete; and represent domain and range using inequalities.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.2(B)", strand: "Linear Functions", description: "Write linear equations in two variables in various forms, including y = mx + b, Ax + By = C, and y − y1 = m(x − x1), given information specified in a table, a graph, and a verbal description.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.2(C)", strand: "Linear Functions", description: "Write linear equations in two variables given a table of values, a graph, and a verbal description.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 2 — Linear Equations & Inequalities
  { code: "A.5(A)", strand: "Linear Equations", description: "Solve linear equations in one variable, including those for which the application of the distributive property is necessary and for which variables are included on both sides.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.5(B)", strand: "Linear Equations", description: "Solve linear inequalities in one variable, including those for which the application of the distributive property is necessary and for which variables are included on both sides.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.5(C)", strand: "Linear Equations", description: "Solve systems of two linear equations with two variables for mathematical and real-world problems.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 3 — Functions & Relations
  { code: "A.6(A)", strand: "Quadratic Functions", description: "Determine the domain and range of quadratic functions and represent the domain and range using inequalities.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.6(B)", strand: "Quadratic Functions", description: "Write equations of quadratic functions given the vertex and another point on the graph, write the equation in vertex form f(x) = a(x − h)² + k, and rewrite the equation from vertex form to standard form f(x) = ax² + bx + c.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.6(C)", strand: "Quadratic Functions", description: "Write quadratic equations when given real solutions and graphs of their related equations.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 4 — Exponential Functions
  { code: "A.7(A)", strand: "Exponential Functions", description: "Graph quadratic functions on the coordinate plane and use the graph to identify key attributes, if applicable, including x-intercept, y-intercept, zeros, vertex, axis of symmetry, and whether the parabola opens up or down.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.7(C)", strand: "Exponential Functions", description: "Determine the effects on the graph of the parent function f(x) = x² when f(x) is replaced by af(x), f(x) + d, f(x − c), f(bx) for specific values of a, b, c, and d.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 5 — Polynomials
  { code: "A.10(A)", strand: "Number and Algebraic Methods", description: "Add and subtract polynomials of degree one and degree two.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.10(B)", strand: "Number and Algebraic Methods", description: "Multiply polynomials of degree one and degree two.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.10(C)", strand: "Number and Algebraic Methods", description: "Determine the quotient of a polynomial of degree one and polynomial of degree two when divided by a polynomial of degree one and polynomial of degree two when the degree of the divisor does not exceed the degree of the dividend.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.10(D)", strand: "Number and Algebraic Methods", description: "Rewrite polynomial expressions of degree one and degree two in equivalent forms using the distributive property.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.10(E)", strand: "Number and Algebraic Methods", description: "Factor, if possible, trinomials with real factors in the form ax² + bx + c, including perfect square trinomials of degree two.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.10(F)", strand: "Number and Algebraic Methods", description: "Decide if a binomial can be written as the difference of two squares and, if possible, use the structure of a difference of two squares to rewrite the binomial.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 6 — Solving Quadratics
  { code: "A.8(A)", strand: "Quadratic Functions", description: "Analyze data to select the appropriate model from among linear, quadratic, and exponential models.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.8(B)", strand: "Quadratic Functions", description: "Use regression methods available through technology to write a linear function, a quadratic function, and an exponential function from a given set of data.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 7 — Systems of Equations
  { code: "A.3(C)", strand: "Linear Functions", description: "Graph linear functions on the coordinate plane and identify key features, including x-intercept, y-intercept, zeros, and slope, in mathematical and real-world problems.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.3(F)", strand: "Linear Functions", description: "Graph systems of two linear equations in two variables on the coordinate plane and determine the solutions if they exist.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 8 — Radical & Rational Expressions
  { code: "A.11(A)", strand: "Number and Algebraic Methods", description: "Simplify numerical radical expressions involving square roots.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.11(B)", strand: "Number and Algebraic Methods", description: "Simplify numeric and algebraic expressions using the laws of exponents, including integral and rational exponents.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 9 — Data & Statistics
  { code: "A.4(A)", strand: "Linear Functions", description: "Calculate, using technology, the correlation coefficient between two quantitative variables and interpret this quantity as a measure of the strength of the linear association.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.4(C)", strand: "Linear Functions", description: "Write, with and without technology, linear equations that provide a reasonable fit to data to estimate solutions and make predictions for real-world problems.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 10 — Sequences & Patterns
  { code: "A.12(B)", strand: "Number and Algebraic Methods", description: "Evaluate functions, expressed in function notation, given one or more elements in their domains.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.12(C)", strand: "Number and Algebraic Methods", description: "Identify terms of arithmetic and geometric sequences when the sequences are given in function form using recursive processes.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 11 — Proportional Reasoning
  { code: "A.2(D)", strand: "Linear Functions", description: "Write and solve equations involving direct variation.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.2(E)", strand: "Linear Functions", description: "Write the equation of a line that contains a given point and is parallel to a given line.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.2(F)", strand: "Linear Functions", description: "Write the equation of a line that contains a given point and is perpendicular to a given line.", gradeLevel: "9", subject: "math", isCanonical: true },
  // Unit 12 — STAAR EOC Review
  { code: "A.1(A)", strand: "Mathematical Process Standards", description: "Apply mathematics to problems arising in everyday life, society, and the workplace.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "A.1(B)", strand: "Mathematical Process Standards", description: "Use a problem-solving model that incorporates analyzing given information, formulating a plan or strategy, determining a solution, justifying the solution, and evaluating the problem-solving process and the reasonableness of the solution.", gradeLevel: "9", subject: "math", isCanonical: true },
];

for (const std of alg1Standards) {
  await upsert(
    "standards",
    { frameworkId: teksId, ...std },
    ["frameworkId", "code"]
  );
}

// ─── NY_NGLS Algebra I sample standards ──────────────────────────────────────
console.log("Seeding NY_NGLS Algebra I standards (sample)...");
const nyAlg1Standards = [
  { code: "AI-A.REI.1", strand: "Reasoning with Equations and Inequalities", description: "Explain each step in solving a simple equation as following from the equality of numbers asserted at the previous step, starting from the assumption that the original equation has a solution.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "AI-A.REI.3", strand: "Reasoning with Equations and Inequalities", description: "Solve linear equations and inequalities in one variable, including equations with coefficients represented by letters.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "AI-F.IF.1", strand: "Interpreting Functions", description: "Understand that a function from one set (called the domain) to another set (called the range) assigns to each element of the domain exactly one element of the range.", gradeLevel: "9", subject: "math", isCanonical: true },
  { code: "AI-F.BF.1", strand: "Building Functions", description: "Write a function that describes a relationship between two quantities.", gradeLevel: "9", subject: "math", isCanonical: true },
];
for (const std of nyAlg1Standards) {
  await upsert("standards", { frameworkId: nyNglsId, ...std }, ["frameworkId", "code"]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. STANDARD CROSSWALK — TEKS ↔ NY_NGLS (sample)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding standard crosswalk (TEKS ↔ NY_NGLS sample)...");
const teksA5A = await getId("standards", "code", "A.5(A)");
const nyAiRei3 = await getId("standards", "code", "AI-A.REI.3");
if (teksA5A && nyAiRei3) {
  await upsert(
    "standardCrosswalk",
    { sourceStandardId: teksA5A, targetStandardId: nyAiRei3, alignmentType: "exact", alignmentScore: 0.92, notes: "Both require solving linear equations in one variable with distributive property." },
    ["sourceStandardId", "targetStandardId"]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TRACKS (Katy ISD — Algebra I)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding tracks...");

// Get Algebra I course ID
const [alg1Rows] = await db.execute(
  "SELECT id FROM courses WHERE courseCode = 'ALG1' LIMIT 1"
);
const alg1CourseId = alg1Rows[0]?.id;

if (alg1CourseId) {
  await upsert(
    "tracks",
    { districtId: katyId, courseId: alg1CourseId, code: "KAP", localLabel: "KAP Math (Pre-AP)", trackType: "advanced", isActive: true },
    ["districtId", "courseId", "code"]
  );
  await upsert(
    "tracks",
    { districtId: katyId, courseId: alg1CourseId, code: "ACA", localLabel: "ACA (Academic)", trackType: "regular", isActive: true },
    ["districtId", "courseId", "code"]
  );
  await upsert(
    "tracks",
    { districtId: hisdId, courseId: alg1CourseId, code: "NES", localLabel: "NES (New Education System)", trackType: "regular", isActive: true },
    ["districtId", "courseId", "code"]
  );
  await upsert(
    "tracks",
    { districtId: nycId, courseId: alg1CourseId, code: "REGULAR", localLabel: "Algebra I (Regular)", trackType: "regular", isActive: true },
    ["districtId", "courseId", "code"]
  );
  await upsert(
    "tracks",
    { districtId: nycId, courseId: alg1CourseId, code: "HONORS", localLabel: "Algebra I (Honors)", trackType: "honors", isActive: true },
    ["districtId", "courseId", "code"]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. PACING GUIDES (Katy ISD — Algebra I, 2025-26)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding pacing guides...");

const kapTrackId = await getId("tracks", "code", "KAP");
const acaTrackId = await getId("tracks", "code", "ACA");

if (alg1CourseId) {
  await upsert(
    "pacingGuides",
    { districtId: katyId, courseId: alg1CourseId, trackId: kapTrackId, academicYear: "2025-26", name: "Katy ISD ALG1 KAP Pacing Guide 2025-26", isActive: true },
    ["districtId", "courseId", "academicYear", "trackId"]
  );
  await upsert(
    "pacingGuides",
    { districtId: katyId, courseId: alg1CourseId, trackId: acaTrackId, academicYear: "2025-26", name: "Katy ISD ALG1 ACA Pacing Guide 2025-26", isActive: true },
    ["districtId", "courseId", "academicYear", "trackId"]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ASSESSMENT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding assessment templates...");

if (alg1CourseId) {
  // STAAR EOC Algebra I
  await upsert(
    "assessmentTemplates",
    {
      stateId: txId,
      courseId: alg1CourseId,
      assessmentRegime: "staar_eoc",
      name: "STAAR EOC Algebra I",
      itemCount: 54,
      timeLimitMinutes: 240,
      difficultyDistribution: JSON.stringify({ easy: 0.30, medium: 0.50, hard: 0.20 }),
      isActive: true,
    },
    ["stateId", "courseId", "assessmentRegime"]
  );
  // NY Regents Algebra I
  await upsert(
    "assessmentTemplates",
    {
      stateId: nyId,
      courseId: alg1CourseId,
      assessmentRegime: "ny_regents",
      name: "New York Regents Algebra I",
      itemCount: 37,
      timeLimitMinutes: 180,
      difficultyDistribution: JSON.stringify({ easy: 0.35, medium: 0.45, hard: 0.20 }),
      isActive: true,
    },
    ["stateId", "courseId", "assessmentRegime"]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. RESOURCE ADOPTIONS
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding resource adoptions...");

if (alg1CourseId) {
  await upsert(
    "resourceAdoptions",
    { districtId: katyId, courseId: alg1CourseId, resourceName: "Algebra Nation", publisher: "Study Edge", edition: "2024", adoptionYear: 2024, isActive: true },
    ["districtId", "courseId", "resourceName"]
  );
  await upsert(
    "resourceAdoptions",
    { districtId: hisdId, courseId: alg1CourseId, resourceName: "Big Ideas Math Algebra 1", publisher: "Big Ideas Learning", edition: "2022", adoptionYear: 2022, isActive: true },
    ["districtId", "courseId", "resourceName"]
  );
  await upsert(
    "resourceAdoptions",
    { districtId: nycId, courseId: alg1CourseId, resourceName: "Illustrative Mathematics Algebra 1", publisher: "Kendall Hunt", edition: "2021", adoptionYear: 2021, isActive: true },
    ["districtId", "courseId", "resourceName"]
  );
}

// ─── Done ─────────────────────────────────────────────────────────────────────
await db.end();
console.log("\n✅ Phase 1B seed complete.");
console.log("   Frameworks: TEKS, NY_NGLS, CCSS");
console.log("   Districts: Katy ISD, HISD, NYC-DOE");
console.log("   Standards: 31 TEKS Algebra I (canonical) + 4 NY_NGLS sample");
console.log("   Crosswalk: 1 TEKS ↔ NY_NGLS pair");
console.log("   Tracks: KAP, ACA (Katy), NES (HISD), Regular/Honors (NYC)");
console.log("   Pacing guides: 2 (Katy ISD KAP + ACA, 2025-26)");
console.log("   Assessment templates: STAAR EOC + NY Regents");
console.log("   Resource adoptions: 3 (Algebra Nation, Big Ideas, IM)");
