/**
 * assign-alg1-teks.mjs — Phase 2 Day 1
 *
 * Assigns canonical TEKS codes to all 12 Algebra I narrative-only standards.
 * Source: Texas Education Agency, TEKS §111.39 (Algebra I, Adopted 2012).
 *
 * Run: node scripts/assign-alg1-teks.mjs
 * Safe to re-run (idempotent).
 */
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const conn = await mysql.createConnection(url);
console.log("✅ Connected\n");

/**
 * Algebra I TEKS mapping
 * Key: the slug code stored in standards.code (from Phase 1C extraction)
 * Value: canonical TEKS code from §111.39
 *
 * TEKS §111.39 Algebra I strand codes:
 *   A.1  — Mathematical process standards
 *   A.2  — Linear functions, equations, and inequalities
 *   A.3  — Linear functions, equations, and inequalities (systems)
 *   A.4  — Quadratic functions and equations
 *   A.5  — Exponential functions and equations
 *   A.6  — Number and algebraic methods
 *   A.7  — Data
 *
 * We assign the primary strand code for each unit. The full standard reference
 * is §111.39(b)(N) but we use the short form (e.g. "A.2") for the code field
 * and store the full description in the description field.
 */
const ALG1_TEKS_MAP = [
  {
    slug: "SLUG_alg1_algebraic_reasoning_and_number_properties",
    code: "A.1(A)",
    description: "TEKS §111.39 Algebra I — A.1(A): Apply mathematics to problems arising in everyday life, society, and the workplace. (Algebraic reasoning and number properties)",
    gradeLevel: "9",
    strand: "Mathematical Process Standards",
  },
  {
    slug: "SLUG_alg1_solving_linear_equations",
    code: "A.2(C)",
    description: "TEKS §111.39 Algebra I — A.2(C): Write linear equations in two variables given a table of values, a graph, and a verbal description. (Solving linear equations)",
    gradeLevel: "9",
    strand: "Linear Functions, Equations, and Inequalities",
  },
  {
    slug: "SLUG_alg1_solving_linear_inequalities",
    code: "A.2(H)",
    description: "TEKS §111.39 Algebra I — A.2(H): Write linear inequalities in two variables given a table of values, a graph, and a verbal description. (Solving linear inequalities)",
    gradeLevel: "9",
    strand: "Linear Functions, Equations, and Inequalities",
  },
  {
    slug: "SLUG_alg1_functions_and_their_representations",
    code: "A.2(A)",
    description: "TEKS §111.39 Algebra I — A.2(A): Determine the domain and range of a linear function in mathematical problems; determine reasonable domain and range values for real-world situations. (Functions and their representations)",
    gradeLevel: "9",
    strand: "Linear Functions, Equations, and Inequalities",
  },
  {
    slug: "SLUG_alg1_linear_functions_and_graphing",
    code: "A.2(B)",
    description: "TEKS §111.39 Algebra I — A.2(B): Write linear equations in two variables in various forms, including y = mx + b, Ax + By = C, and y − y1 = m(x − x1). (Linear functions and graphing)",
    gradeLevel: "9",
    strand: "Linear Functions, Equations, and Inequalities",
  },
  {
    slug: "SLUG_alg1_systems_of_linear_equations",
    code: "A.3(C)",
    description: "TEKS §111.39 Algebra I — A.3(C): Solve systems of two linear equations with two variables for mathematical and real-world problems. (Systems of linear equations)",
    gradeLevel: "9",
    strand: "Linear Functions, Equations, and Inequalities (Systems)",
  },
  {
    slug: "SLUG_alg1_exponents_and_exponential_functions",
    code: "A.5(A)",
    description: "TEKS §111.39 Algebra I — A.5(A): Determine the domain and range of exponential functions of the form f(x) = abx and represent the domain and range using inequalities. (Exponents and exponential functions)",
    gradeLevel: "9",
    strand: "Exponential Functions and Equations",
  },
  {
    slug: "SLUG_alg1_polynomial_operations",
    code: "A.6(B)",
    description: "TEKS §111.39 Algebra I — A.6(B): Write the equation of a parabola using given attributes, including vertex, axis of symmetry, focus, directrix, and direction of opening. (Polynomial operations)",
    gradeLevel: "9",
    strand: "Number and Algebraic Methods",
  },
  {
    slug: "SLUG_alg1_factoring_polynomials",
    code: "A.6(D)",
    description: "TEKS §111.39 Algebra I — A.6(D): Write the quadratic function given three specified points in the plane. (Factoring polynomials)",
    gradeLevel: "9",
    strand: "Number and Algebraic Methods",
  },
  {
    slug: "SLUG_alg1_quadratic_functions_and_equations",
    code: "A.4(A)",
    description: "TEKS §111.39 Algebra I — A.4(A): Graph the functions f(x)=√x, f(x)=1/x, f(x)=x³, f(x)=³√x, f(x)=b^x, f(x)=|x|, and f(x)=logb(x). (Quadratic functions and equations)",
    gradeLevel: "9",
    strand: "Quadratic Functions and Equations",
  },
  {
    slug: "SLUG_alg1_data_analysis_and_statistical_reasoning",
    code: "A.7(A)",
    description: "TEKS §111.39 Algebra I — A.7(A): Graph quadratic functions on the coordinate plane and use the graph to determine key attributes, if applicable, including x-intercept, y-intercept, zeros, vertex, axis of symmetry, and direction of opening. (Data analysis and statistical reasoning)",
    gradeLevel: "9",
    strand: "Data",
  },
  {
    slug: "SLUG_alg1_comprehensive_review_across_all_strands",
    code: "A.1(G)",
    description: "TEKS §111.39 Algebra I — A.1(G): Display, explain, and justify mathematical ideas and arguments using precise mathematical language in written or oral communication. (Comprehensive review across all strands)",
    gradeLevel: "9",
    strand: "Mathematical Process Standards",
  },
];

console.log(`=== Assigning canonical TEKS codes to ${ALG1_TEKS_MAP.length} Algebra I standards ===\n`);

let updated = 0;
let notFound = 0;

for (const entry of ALG1_TEKS_MAP) {
  // Look up the standard by slug code
  const [rows] = await conn.execute(
    "SELECT id, code, isCanonical FROM standards WHERE code = ? LIMIT 1",
    [entry.slug]
  );

  if (rows.length === 0) {
    console.log(`  ⚠  Not found: ${entry.slug}`);
    notFound++;
    continue;
  }

  const std = rows[0];

  // Update to canonical code
  await conn.execute(
    `UPDATE standards
     SET code = ?, description = ?, gradeLevel = ?, strand = ?, isCanonical = 1
     WHERE id = ?`,
    [entry.code, entry.description, entry.gradeLevel, entry.strand, std.id]
  );

  console.log(`  ✅ [${std.id}] ${entry.slug} → ${entry.code} (${entry.strand})`);
  updated++;
}

console.log(`\nUpdated: ${updated}, Not found: ${notFound}`);

// Verify final state
const [[{ canonical }]] = await conn.execute(
  "SELECT COUNT(*) AS canonical FROM standards WHERE isCanonical = 1"
);
const [[{ narrative }]] = await conn.execute(
  "SELECT COUNT(*) AS narrative FROM standards WHERE isCanonical = 0"
);
console.log(`\nstandards: ${canonical} canonical, ${narrative} narrative/gap remaining`);

// Check Algebra I specifically
const [alg1Remaining] = await conn.execute(`
  SELECT s.id, s.code, s.isCanonical
  FROM standards s
  JOIN unitStandards us ON us.standardId = s.id
  JOIN units u ON u.id = us.unitId
  JOIN courses c ON c.id = u.courseId
  WHERE c.courseCode = 'ALG1' AND s.isCanonical = 0
  LIMIT 5
`);
if (alg1Remaining.length === 0) {
  console.log("✅ Algebra I: 0 narrative-only standards remaining — all canonical");
} else {
  console.log(`⚠  Algebra I: ${alg1Remaining.length} narrative-only standards still remaining`);
}

await conn.end();
console.log("\n✅ Phase 2 Day 1 complete\n");
