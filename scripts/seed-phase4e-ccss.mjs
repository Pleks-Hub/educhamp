/**
 * Phase 4E — Seed CCSS Algebra I standards into framework id=3
 * Also updates framework name to "Common Core State Standards (CCSS / CA_CCSS)"
 *
 * Standard codes follow the CCSS High School Algebra domain structure:
 *   HSA = High School Algebra
 *   HSN = High School Number & Quantity
 *   HSF = High School Functions
 *   HSS = High School Statistics & Probability
 *   HSG = High School Geometry
 */

import * as dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Step 1: Update framework name
await conn.execute(
  `UPDATE standardFrameworks SET name = 'Common Core State Standards (CCSS / CA_CCSS)' WHERE id = 3`
);
console.log('✅ Framework name updated to "Common Core State Standards (CCSS / CA_CCSS)"');

// Step 2: Define CCSS Algebra I standards
// These are the standard CCSS High School Algebra I codes used in CA and all CCSS-adopting states
const standards = [
  // Number & Quantity — Real Number System
  { code: 'HSN-RN.A.1', title: 'Rational Exponents', description: 'Explain how the definition of the meaning of rational exponents follows from extending the properties of integer exponents.', strand: 'Number & Quantity' },
  { code: 'HSN-RN.A.2', title: 'Rewrite Expressions with Radicals and Rational Exponents', description: 'Rewrite expressions involving radicals and rational exponents using the properties of exponents.', strand: 'Number & Quantity' },

  // Algebra — Seeing Structure in Expressions
  { code: 'HSA-SSE.A.1', title: 'Interpret Parts of an Expression', description: 'Interpret parts of an expression, such as terms, factors, and coefficients.', strand: 'Algebra' },
  { code: 'HSA-SSE.A.2', title: 'Use Structure to Rewrite Expressions', description: 'Use the structure of an expression to identify ways to rewrite it.', strand: 'Algebra' },
  { code: 'HSA-SSE.B.3', title: 'Choose and Produce Equivalent Forms', description: 'Choose and produce an equivalent form of an expression to reveal and explain properties of the quantity represented.', strand: 'Algebra' },

  // Algebra — Arithmetic with Polynomials and Rational Expressions
  { code: 'HSA-APR.A.1', title: 'Add, Subtract, and Multiply Polynomials', description: 'Understand that polynomials form a system analogous to the integers; add, subtract, and multiply polynomials.', strand: 'Algebra' },
  { code: 'HSA-APR.B.3', title: 'Identify Zeros of Polynomials', description: 'Identify zeros of polynomials when suitable factorizations are available, and use the zeros to construct a rough graph.', strand: 'Algebra' },

  // Algebra — Creating Equations
  { code: 'HSA-CED.A.1', title: 'Create Equations and Inequalities in One Variable', description: 'Create equations and inequalities in one variable and use them to solve problems.', strand: 'Algebra' },
  { code: 'HSA-CED.A.2', title: 'Create Equations in Two or More Variables', description: 'Create equations in two or more variables to represent relationships between quantities; graph equations on coordinate axes.', strand: 'Algebra' },
  { code: 'HSA-CED.A.3', title: 'Represent Constraints with Equations or Inequalities', description: 'Represent constraints by equations or inequalities, and by systems of equations and/or inequalities.', strand: 'Algebra' },
  { code: 'HSA-CED.A.4', title: 'Rearrange Formulas to Highlight a Quantity', description: 'Rearrange formulas to highlight a quantity of interest, using the same reasoning as in solving equations.', strand: 'Algebra' },

  // Algebra — Reasoning with Equations and Inequalities
  { code: 'HSA-REI.A.1', title: 'Explain Each Step in Solving an Equation', description: 'Explain each step in solving a simple equation as following from the equality of numbers asserted at the previous step.', strand: 'Algebra' },
  { code: 'HSA-REI.B.3', title: 'Solve Linear Equations and Inequalities in One Variable', description: 'Solve linear equations and inequalities in one variable, including equations with coefficients represented by letters.', strand: 'Algebra' },
  { code: 'HSA-REI.B.4', title: 'Solve Quadratic Equations', description: 'Solve quadratic equations in one variable by inspection, taking square roots, completing the square, the quadratic formula, and factoring.', strand: 'Algebra' },
  { code: 'HSA-REI.C.5', title: 'Systems — Elimination Method', description: 'Prove that, given a system of two equations in two variables, replacing one equation by the sum of that equation and a multiple of the other produces a system with the same solutions.', strand: 'Algebra' },
  { code: 'HSA-REI.C.6', title: 'Solve Systems of Linear Equations', description: 'Solve systems of linear equations exactly and approximately (e.g., with graphs), focusing on pairs of linear equations in two variables.', strand: 'Algebra' },
  { code: 'HSA-REI.D.10', title: 'Graph of an Equation', description: 'Understand that the graph of an equation in two variables is the set of all its solutions plotted in the coordinate plane.', strand: 'Algebra' },
  { code: 'HSA-REI.D.11', title: 'Solutions of Systems as Intersections', description: 'Explain why the x-coordinates of the points where the graphs of y=f(x) and y=g(x) intersect are the solutions of f(x)=g(x).', strand: 'Algebra' },
  { code: 'HSA-REI.D.12', title: 'Graph Solutions to Linear Inequalities', description: 'Graph the solutions to a linear inequality in two variables as a half-plane, and graph the solution set of a system of linear inequalities.', strand: 'Algebra' },

  // Functions — Interpreting Functions
  { code: 'HSF-IF.A.1', title: 'Understand Function Notation', description: 'Understand that a function from one set to another assigns to each element of the domain exactly one element of the range.', strand: 'Functions' },
  { code: 'HSF-IF.A.2', title: 'Use Function Notation', description: 'Use function notation, evaluate functions for inputs in their domains, and interpret statements that use function notation.', strand: 'Functions' },
  { code: 'HSF-IF.B.4', title: 'Interpret Key Features of Graphs and Tables', description: 'For a function that models a relationship between two quantities, interpret key features of graphs and tables.', strand: 'Functions' },
  { code: 'HSF-IF.B.6', title: 'Calculate and Interpret Rate of Change', description: 'Calculate and interpret the average rate of change of a function over a specified interval.', strand: 'Functions' },
  { code: 'HSF-IF.C.7', title: 'Graph Functions', description: 'Graph functions expressed symbolically and show key features of the graph, by hand in simple cases and using technology for more complicated cases.', strand: 'Functions' },

  // Functions — Building Functions
  { code: 'HSF-BF.A.1', title: 'Write a Function that Describes a Relationship', description: 'Write a function that describes a relationship between two quantities.', strand: 'Functions' },
  { code: 'HSF-BF.B.3', title: 'Identify the Effect on the Graph of Replacing f(x)', description: 'Identify the effect on the graph of replacing f(x) by f(x)+k, k·f(x), f(kx), and f(x+k).', strand: 'Functions' },

  // Functions — Linear, Quadratic, and Exponential Models
  { code: 'HSF-LE.A.1', title: 'Distinguish Between Linear and Exponential Functions', description: 'Distinguish between situations that can be modeled with linear functions and with exponential functions.', strand: 'Functions' },
  { code: 'HSF-LE.A.2', title: 'Construct Linear and Exponential Functions', description: 'Construct linear and exponential functions, including arithmetic and geometric sequences, given a graph, a description, or two input-output pairs.', strand: 'Functions' },
  { code: 'HSF-LE.B.5', title: 'Interpret Parameters in a Linear or Exponential Function', description: 'Interpret the parameters in a linear or exponential function in terms of a context.', strand: 'Functions' },

  // Geometry — Expressing Geometric Properties with Equations
  { code: 'HSG-GPE.B.5', title: 'Prove the Slope Criteria for Parallel and Perpendicular Lines', description: 'Prove the slope criteria for parallel and perpendicular lines and use them to solve geometric problems.', strand: 'Geometry' },

  // Statistics & Probability — Interpreting Categorical and Quantitative Data
  { code: 'HSS-ID.B.6', title: 'Represent Data on Two Quantitative Variables', description: 'Represent data on two quantitative variables on a scatter plot, and describe how the variables are related.', strand: 'Statistics & Probability' },
  { code: 'HSS-ID.C.7', title: 'Interpret the Slope and Intercept', description: 'Interpret the slope (rate of change) and the intercept (constant term) of a linear model in the context of the data.', strand: 'Statistics & Probability' },
  { code: 'HSS-ID.C.8', title: 'Compute and Interpret Correlation Coefficient', description: 'Compute (using technology) and interpret the correlation coefficient of a linear fit.', strand: 'Statistics & Probability' },
  { code: 'HSS-ID.C.9', title: 'Distinguish Correlation from Causation', description: 'Distinguish between correlation and causation.', strand: 'Statistics & Probability' },
];

// Step 3: Insert standards (skip if already exists)
let inserted = 0;
let skipped = 0;
const FRAMEWORK_ID = 3;

for (const s of standards) {
  const [existing] = await conn.execute(
    'SELECT id FROM standards WHERE code = ? AND frameworkId = ?',
    [s.code, FRAMEWORK_ID]
  );
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`  ↳ SKIP ${s.code} (already exists)`);
    skipped++;
    continue;
  }
  await conn.execute(
    `INSERT INTO standards (frameworkId, code, description, strand, gradeLevel, subject, isActive)
     VALUES (?, ?, ?, ?, 'HS', 'Mathematics', 1)`,
    [FRAMEWORK_ID, s.code, `${s.title}: ${s.description}`, s.strand]
  );
  console.log(`  ✅ INSERT ${s.code} — ${s.title}`);
  inserted++;
}

console.log(`\n=== Phase 4E Standards Seeder Complete ===`);
console.log(`Inserted: ${inserted}`);
console.log(`Skipped (already existed): ${skipped}`);
console.log(`Total CCSS Algebra I standards in DB: ${inserted + skipped}`);

// Step 4: Verify final state
const [finalCount] = await conn.execute(
  'SELECT COUNT(*) as cnt FROM standards WHERE frameworkId = ?',
  [FRAMEWORK_ID]
);
console.log(`Framework id=3 total standards: ${finalCount[0].cnt}`);

await conn.end();
