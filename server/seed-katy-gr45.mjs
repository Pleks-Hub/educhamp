/**
 * seed-katy-gr45.mjs
 * Seeds all Katy ISD Grades 4 and 5 ACA/KAP courses (excluding PE, Music, Band)
 * Courses: Math, ELA/Reading, Science, Social Studies, Technology Applications
 * Each course: 8 units, 3 skills/unit, 5 quiz questions/unit, 30 diagnostic questions
 *
 * Run: node server/seed-katy-gr45.mjs
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
     ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), subject=VALUES(subject), gradeLevel=VALUES(gradeLevel)`,
    [code, title, subject, grade, description, teks, sortOrder]
  );
  const [r] = await db.execute(`SELECT id FROM courses WHERE courseCode=?`, [code]);
  return r[0].id;
}
async function insertUnit(courseId, unitNumber, title, overview, teks, sortOrder) {
  await db.execute(
    `INSERT INTO units (courseId, unitNumber, title, overview, teksAlignment, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), overview=VALUES(overview)`,
    [courseId, unitNumber, title, overview, teks, sortOrder]
  );
  const [r] = await db.execute(`SELECT id FROM units WHERE courseId=? AND unitNumber=?`, [courseId, unitNumber]);
  return r[0].id;
}
async function insertSkill(courseId, skillId, skillName, unitId, unitNumber, sortOrder) {
  await db.execute(
    `INSERT INTO skills (courseId, skillId, skillName, unitId, unitNumber, prerequisiteSkillIds, sortOrder)
     VALUES (?, ?, ?, ?, ?, '[]', ?)
     ON DUPLICATE KEY UPDATE skillName=VALUES(skillName)`,
    [courseId, skillId, skillName, unitId, unitNumber, sortOrder]
  );
}
async function insertQuizQ(courseId, unitId, text, choices, answer, explanation, skillTag, difficulty, sortOrder) {
  await db.execute(
    `INSERT INTO quizQuestions (courseId, unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder)
     VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?)`,
    [courseId, unitId, text, JSON.stringify(choices), answer, explanation, skillTag, difficulty, sortOrder]
  );
}
async function insertDiagQ(courseId, questionId, text, choices, answer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder) {
  await db.execute(
    `INSERT INTO diagnosticQuestions (courseId, questionId, questionText, questionType, choices, correctAnswer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder)
     VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE questionText=VALUES(questionText), choices=VALUES(choices), correctAnswer=VALUES(correctAnswer)`,
    [courseId, questionId, text, JSON.stringify(choices), answer, mapsToUnit, JSON.stringify(mapsToSkills), difficulty, explanation, sortOrder]
  );
}
function mc(a, b, c, d) {
  return [{ label: "A", text: a }, { label: "B", text: b }, { label: "C", text: c }, { label: "D", text: d }];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 4 COURSES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Grade 4 Math (ACA) ───────────────────────────────────────────────────────
{
  const cid = await insertCourse("G4MATH", "Grade 4 Mathematics", "math", "4",
    "Katy ISD Grade 4 Mathematics covers place value through 1,000,000,000, multi-digit multiplication and division, fractions and decimals, geometry, measurement, and data analysis aligned to TEKS 4th grade standards.",
    "TEKS 4.1-4.9", 200);
  console.log("Grade 4 Math:", cid);

  const units = [
    [1, "Place Value & Number Sense", "Understand and represent whole numbers through 1,000,000,000 using place value.", "TEKS 4.2"],
    [2, "Addition & Subtraction", "Add and subtract whole numbers and decimals using standard algorithms.", "TEKS 4.4"],
    [3, "Multiplication", "Multiply up to 4-digit by 2-digit numbers using strategies and algorithms.", "TEKS 4.4"],
    [4, "Division", "Divide up to 4-digit dividends by 1-digit and 2-digit divisors.", "TEKS 4.4"],
    [5, "Fractions", "Represent, compare, and order fractions and mixed numbers.", "TEKS 4.3"],
    [6, "Decimals", "Represent and compare decimals to the hundredths place.", "TEKS 4.2"],
    [7, "Geometry & Measurement", "Classify 2D shapes, measure angles, perimeter, area, and convert units.", "TEKS 4.5-4.8"],
    [8, "Data Analysis", "Represent and interpret data using bar graphs, dot plots, and stem-and-leaf plots.", "TEKS 4.9"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G4MATH-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Problem Solving`, uid, uNum, 3);

    // 5 quiz questions per unit
    const quizData = getGr4MathQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  // 30 diagnostic questions
  const diagQs = getGr4MathDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G4MATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 4 Math seeded");
}

// ─── Grade 4 ELA/Reading (ACA) ────────────────────────────────────────────────
{
  const cid = await insertCourse("G4ELA", "Grade 4 English Language Arts & Reading", "english",  "4",
    "Katy ISD Grade 4 ELA/Reading develops foundational reading comprehension, literary analysis, informational text skills, vocabulary, writing process, grammar, and oral communication aligned to TEKS 4th grade standards.",
    "TEKS 4.1-4.13", 201);
  console.log("Grade 4 ELA:", cid);

  const units = [
    [1, "Reading Comprehension — Literary Text", "Analyze characters, plot, theme, and point of view in literary texts.", "TEKS 4.7-4.8"],
    [2, "Reading Comprehension — Informational Text", "Identify main idea, supporting details, text structure, and author's purpose.", "TEKS 4.9-4.10"],
    [3, "Vocabulary & Word Study", "Use context clues, Greek/Latin roots, and affixes to determine word meanings.", "TEKS 4.3"],
    [4, "Writing — Narrative", "Plan, draft, revise, and publish personal narratives with vivid details.", "TEKS 4.11"],
    [5, "Writing — Expository", "Write multi-paragraph expository essays with a clear thesis and supporting evidence.", "TEKS 4.11"],
    [6, "Writing — Persuasive", "Develop persuasive arguments with evidence and counterarguments.", "TEKS 4.11"],
    [7, "Grammar & Conventions", "Apply correct grammar, punctuation, capitalization, and sentence structure.", "TEKS 4.12"],
    [8, "Research & Oral Communication", "Conduct research, cite sources, and present information effectively.", "TEKS 4.6, 4.13"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G4ELA-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Extended Practice`, uid, uNum, 3);

    const quizData = getGr4ELAQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr4ELADiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G4ELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 4 ELA seeded");
}

// ─── Grade 4 Science (ACA) ────────────────────────────────────────────────────
{
  const cid = await insertCourse("G4SCI", "Grade 4 Science", "science", "4",
    "Katy ISD Grade 4 Science explores matter and energy, force and motion, Earth and space, and living systems through hands-on inquiry and scientific reasoning aligned to TEKS 4th grade standards.",
    "TEKS 4.1-4.10", 202);

  const units = [
    [1, "Scientific Investigation", "Apply scientific processes, tools, and safety procedures in investigations.", "TEKS 4.1-4.2"],
    [2, "Matter & Its Properties", "Identify physical and chemical properties of matter and changes in matter.", "TEKS 4.5"],
    [3, "Energy", "Explore forms of energy including light, heat, sound, and electrical energy.", "TEKS 4.6"],
    [4, "Force & Motion", "Investigate how forces affect the motion of objects.", "TEKS 4.6"],
    [5, "Earth's Surface", "Describe landforms, weathering, erosion, and natural resources.", "TEKS 4.7"],
    [6, "Weather & Climate", "Analyze weather patterns, climate, and the water cycle.", "TEKS 4.8"],
    [7, "Organisms & Environments", "Describe adaptations, food webs, and organism interactions.", "TEKS 4.9"],
    [8, "Earth & Space", "Explore the solar system, moon phases, and Earth's rotation and revolution.", "TEKS 4.8"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G4SCI-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Investigation`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Application`, uid, uNum, 3);

    const quizData = getGr4SciQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr4SciDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G4SCI-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 4 Science seeded");
}

// ─── Grade 4 Social Studies (ACA) ─────────────────────────────────────────────
{
  const cid = await insertCourse("G4SS", "Grade 4 Social Studies", "social_studies", "4",
    "Katy ISD Grade 4 Social Studies covers Texas history, geography, economics, government, and citizenship from prehistoric times through the modern era aligned to TEKS 4th grade standards.",
    "TEKS 4.1-4.22", 203);

  const units = [
    [1, "Texas Geography", "Describe the physical features, regions, and climate of Texas.", "TEKS 4.7-4.8"],
    [2, "Native Americans of Texas", "Identify and describe the cultures and contributions of Native American groups in Texas.", "TEKS 4.1"],
    [3, "European Exploration & Settlement", "Describe European exploration and colonization of Texas.", "TEKS 4.2"],
    [4, "Texas Revolution", "Analyze the causes, events, and effects of the Texas Revolution.", "TEKS 4.3"],
    [5, "Republic of Texas & Statehood", "Describe the Republic of Texas and the path to statehood.", "TEKS 4.3"],
    [6, "Texas Economy", "Describe the development of the Texas economy from agriculture to industry.", "TEKS 4.9-4.11"],
    [7, "Texas Government & Citizenship", "Explain the structure of Texas government and the rights of citizens.", "TEKS 4.14-4.17"],
    [8, "Texas Culture & Contributions", "Identify contributions of individuals and cultural groups to Texas.", "TEKS 4.18-4.20"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G4SS-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Knowledge`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Application`, uid, uNum, 3);

    const quizData = getGr4SSQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr4SSDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G4SS-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 4 Social Studies seeded");
}

// ─── Grade 4 Technology Applications ─────────────────────────────────────────
{
  const cid = await insertCourse("G4TECH", "Grade 4 Technology Applications", "technology", "4",
    "Katy ISD Grade 4 Technology Applications introduces digital citizenship, coding fundamentals, productivity tools, research skills, and multimedia creation aligned to TEKS Technology Applications standards.",
    "TEKS Tech 4", 204);

  const units = [
    [1, "Digital Citizenship & Safety", "Understand responsible use of technology, online safety, and digital footprint.", "TEKS Tech 4.1"],
    [2, "Coding Fundamentals", "Use block-based coding to create sequences, loops, and conditionals.", "TEKS Tech 4.5"],
    [3, "Word Processing & Documents", "Create and format documents using word processing software.", "TEKS Tech 4.3"],
    [4, "Spreadsheets & Data", "Use spreadsheets to organize, calculate, and visualize data.", "TEKS Tech 4.3"],
    [5, "Presentations", "Design and deliver multimedia presentations using presentation software.", "TEKS Tech 4.3"],
    [6, "Internet Research Skills", "Evaluate online sources, conduct searches, and cite digital resources.", "TEKS Tech 4.4"],
    [7, "Multimedia & Creative Projects", "Create digital art, animations, and multimedia projects.", "TEKS Tech 4.6"],
    [8, "Computational Thinking", "Apply problem-solving strategies including decomposition and pattern recognition.", "TEKS Tech 4.5"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G4TECH-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Practice`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Creation`, uid, uNum, 3);

    const quizData = getGr4TechQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr4TechDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G4TECH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 4 Technology seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 5 COURSES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Grade 5 Math (ACA) ───────────────────────────────────────────────────────
{
  const cid = await insertCourse("G5MATH", "Grade 5 Mathematics", "math", "5",
    "Katy ISD Grade 5 Mathematics covers operations with whole numbers and decimals, fractions, algebraic reasoning, geometry, measurement, and data analysis aligned to TEKS 5th grade standards.",
    "TEKS 5.1-5.10", 210);

  const units = [
    [1, "Place Value & Decimals", "Represent and compare decimals through the thousandths place.", "TEKS 5.2"],
    [2, "Operations with Decimals", "Add, subtract, multiply, and divide decimals using standard algorithms.", "TEKS 5.3"],
    [3, "Fractions — Addition & Subtraction", "Add and subtract fractions and mixed numbers with unlike denominators.", "TEKS 5.3"],
    [4, "Fractions — Multiplication & Division", "Multiply and divide fractions and mixed numbers.", "TEKS 5.3"],
    [5, "Algebraic Reasoning", "Represent and solve multi-step problems using equations and expressions.", "TEKS 5.4"],
    [6, "Geometry", "Classify 2D and 3D figures, identify properties, and find volume.", "TEKS 5.5-5.6"],
    [7, "Measurement & Conversions", "Convert units within the customary and metric systems.", "TEKS 5.7"],
    [8, "Data Analysis & Graphing", "Represent and analyze data using line graphs, scatterplots, and frequency tables.", "TEKS 5.9"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G5MATH-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Problem Solving`, uid, uNum, 3);

    const quizData = getGr5MathQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr5MathDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G5MATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 5 Math seeded");
}

// ─── Grade 5 ELA/Reading ──────────────────────────────────────────────────────
{
  const cid = await insertCourse("G5ELA", "Grade 5 English Language Arts & Reading", "english", "5",
    "Katy ISD Grade 5 ELA/Reading advances literary analysis, informational reading, vocabulary development, multi-genre writing, grammar mastery, and research skills aligned to TEKS 5th grade standards.",
    "TEKS 5.1-5.13", 211);

  const units = [
    [1, "Literary Analysis", "Analyze theme, character development, point of view, and literary devices.", "TEKS 5.7-5.8"],
    [2, "Informational Text", "Evaluate main idea, text structure, author's purpose, and bias.", "TEKS 5.9-5.10"],
    [3, "Vocabulary & Word Study", "Apply knowledge of roots, affixes, and context clues to determine word meaning.", "TEKS 5.3"],
    [4, "Narrative Writing", "Craft engaging narratives with complex characters, plot, and descriptive language.", "TEKS 5.11"],
    [5, "Expository Writing", "Write well-organized essays with thesis, evidence, and transitions.", "TEKS 5.11"],
    [6, "Persuasive & Argumentative Writing", "Construct arguments with claims, evidence, and counterarguments.", "TEKS 5.11"],
    [7, "Grammar & Conventions", "Master complex sentences, verb tenses, pronouns, and punctuation.", "TEKS 5.12"],
    [8, "Research & Media Literacy", "Conduct research, evaluate sources, and create multimedia presentations.", "TEKS 5.6, 5.13"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G5ELA-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Extended Practice`, uid, uNum, 3);

    const quizData = getGr5ELAQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr5ELADiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G5ELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 5 ELA seeded");
}

// ─── Grade 5 Science ──────────────────────────────────────────────────────────
{
  const cid = await insertCourse("G5SCI", "Grade 5 Science", "science", "5",
    "Katy ISD Grade 5 Science investigates matter and energy, Earth and space systems, living systems, and scientific processes through inquiry-based learning aligned to TEKS 5th grade standards.",
    "TEKS 5.1-5.10", 212);

  const units = [
    [1, "Scientific Process & Safety", "Apply scientific methods, tools, and safety procedures.", "TEKS 5.1-5.2"],
    [2, "Properties of Matter", "Classify matter by physical and chemical properties; investigate changes.", "TEKS 5.5"],
    [3, "Energy Transformations", "Investigate how energy transforms between forms including thermal, light, and electrical.", "TEKS 5.6"],
    [4, "Force, Motion & Simple Machines", "Describe how forces affect motion and how simple machines change force.", "TEKS 5.6"],
    [5, "Earth's Systems", "Describe the layers of Earth, rock cycle, and natural resources.", "TEKS 5.7"],
    [6, "Weather, Climate & Water Cycle", "Analyze weather patterns, climate zones, and the water cycle.", "TEKS 5.8"],
    [7, "Ecosystems & Food Webs", "Describe ecosystems, food webs, and the impact of environmental change.", "TEKS 5.9"],
    [8, "Space Systems", "Describe the solar system, stars, and Earth's place in the universe.", "TEKS 5.8"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G5SCI-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Investigation`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Application`, uid, uNum, 3);

    const quizData = getGr5SciQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr5SciDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G5SCI-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 5 Science seeded");
}

// ─── Grade 5 Social Studies ───────────────────────────────────────────────────
{
  const cid = await insertCourse("G5SS", "Grade 5 Social Studies", "social_studies", "5",
    "Katy ISD Grade 5 Social Studies covers United States history from exploration through Reconstruction, including geography, economics, government, and citizenship aligned to TEKS 5th grade standards.",
    "TEKS 5.1-5.25", 213);

  const units = [
    [1, "Geography of the United States", "Describe physical features, regions, and climate zones of the U.S.", "TEKS 5.8-5.9"],
    [2, "Native Americans", "Identify and describe Native American cultures and their contributions.", "TEKS 5.1"],
    [3, "European Exploration & Colonization", "Describe European exploration and the establishment of colonies.", "TEKS 5.2"],
    [4, "American Revolution", "Analyze the causes, events, and effects of the American Revolution.", "TEKS 5.3"],
    [5, "The Constitution & New Nation", "Describe the creation of the Constitution and the new government.", "TEKS 5.4"],
    [6, "Westward Expansion", "Describe the causes and effects of westward expansion.", "TEKS 5.5"],
    [7, "Civil War & Reconstruction", "Analyze the causes, events, and effects of the Civil War and Reconstruction.", "TEKS 5.6"],
    [8, "U.S. Government & Economics", "Explain the structure of the U.S. government and basic economic principles.", "TEKS 5.15-5.20"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G5SS-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Knowledge`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Application`, uid, uNum, 3);

    const quizData = getGr5SSQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr5SSDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G5SS-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 5 Social Studies seeded");
}

// ─── Grade 5 Technology Applications ─────────────────────────────────────────
{
  const cid = await insertCourse("G5TECH", "Grade 5 Technology Applications", "technology", "5",
    "Katy ISD Grade 5 Technology Applications advances digital citizenship, programming concepts, data management, multimedia production, and computational thinking aligned to TEKS Technology Applications standards.",
    "TEKS Tech 5", 214);

  const units = [
    [1, "Digital Citizenship & Ethics", "Understand digital rights, responsibilities, privacy, and cyberbullying prevention.", "TEKS Tech 5.1"],
    [2, "Programming & Coding", "Use block-based and introductory text-based coding to create programs.", "TEKS Tech 5.5"],
    [3, "Advanced Word Processing", "Create complex documents with formatting, tables, and citations.", "TEKS Tech 5.3"],
    [4, "Spreadsheets & Data Analysis", "Use formulas, functions, and charts to analyze and present data.", "TEKS Tech 5.3"],
    [5, "Multimedia Presentations", "Design professional presentations with embedded media and animations.", "TEKS Tech 5.3"],
    [6, "Research & Information Literacy", "Evaluate, synthesize, and cite information from multiple digital sources.", "TEKS Tech 5.4"],
    [7, "Digital Storytelling & Media", "Create digital stories, podcasts, and video projects.", "TEKS Tech 5.6"],
    [8, "Computational Thinking & Problem Solving", "Apply algorithms, debugging, and abstraction to solve problems.", "TEKS Tech 5.5"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G5TECH-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Practice`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Creation`, uid, uNum, 3);

    const quizData = getGr5TechQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }

  const diagQs = getGr5TechDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G5TECH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 5 Technology seeded");
}

// ─── Grade 4 KAP Math ─────────────────────────────────────────────────────────
{
  const cid = await insertCourse("G4KAPMATH", "Grade 4 KAP Mathematics", "math", "4",
    "Katy ISD Grade 4 KAP (Katy Advanced Program) Mathematics extends grade-level content with enrichment, critical thinking, and acceleration into 5th grade concepts including pre-algebraic reasoning and advanced problem solving.",
    "TEKS 4.1-4.9 (KAP Enriched)", 205);

  const units = [
    [1, "Advanced Place Value & Number Theory", "Explore number patterns, prime/composite numbers, and factors/multiples.", "TEKS 4.2 KAP"],
    [2, "Multi-Step Problem Solving", "Solve complex multi-step problems using all four operations.", "TEKS 4.4 KAP"],
    [3, "Advanced Fractions", "Compare, order, and perform operations with fractions and mixed numbers.", "TEKS 4.3 KAP"],
    [4, "Decimals & Percents", "Connect fractions, decimals, and percents in real-world contexts.", "TEKS 4.2 KAP"],
    [5, "Pre-Algebraic Reasoning", "Identify and extend patterns; write and solve simple equations.", "TEKS 4.4 KAP"],
    [6, "Geometry & Spatial Reasoning", "Explore transformations, symmetry, and coordinate geometry.", "TEKS 4.5 KAP"],
    [7, "Measurement & Data", "Solve complex measurement problems and analyze data sets.", "TEKS 4.7-4.9 KAP"],
    [8, "Mathematical Reasoning & Proof", "Justify solutions, identify errors, and communicate mathematical thinking.", "TEKS 4 KAP"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G4KAPMATH-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Enrichment`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Challenge`, uid, uNum, 3);

    const quizData = getGr4KAPMathQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }

  const diagQs = getGr4KAPMathDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G4KAPMATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 4 KAP Math seeded");
}

// ─── Grade 5 KAP Math ─────────────────────────────────────────────────────────
{
  const cid = await insertCourse("G5KAPMATH", "Grade 5 KAP Mathematics", "math", "5",
    "Katy ISD Grade 5 KAP Mathematics accelerates into 6th grade pre-algebra concepts including ratios, proportional reasoning, integers, and advanced data analysis alongside enriched 5th grade content.",
    "TEKS 5.1-5.10 (KAP Enriched)", 215);

  const units = [
    [1, "Advanced Decimals & Number Theory", "Explore decimal operations, prime factorization, and GCF/LCM.", "TEKS 5.2-5.3 KAP"],
    [2, "Fraction Operations & Ratios", "Perform all fraction operations and introduce ratio concepts.", "TEKS 5.3 KAP"],
    [3, "Pre-Algebra: Expressions & Equations", "Write and evaluate algebraic expressions; solve one-step equations.", "TEKS 5.4 KAP"],
    [4, "Integers & Coordinate Plane", "Introduce integers and plot points in all four quadrants.", "TEKS 5.4 KAP"],
    [5, "Advanced Geometry", "Explore area, surface area, volume, and geometric transformations.", "TEKS 5.5-5.6 KAP"],
    [6, "Proportional Reasoning", "Solve problems involving rates, ratios, and proportions.", "TEKS 5 KAP"],
    [7, "Statistics & Probability", "Analyze data distributions and introduce basic probability concepts.", "TEKS 5.9 KAP"],
    [8, "Mathematical Reasoning & Proof", "Construct arguments, identify patterns, and solve non-routine problems.", "TEKS 5 KAP"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G5KAPMATH-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Enrichment`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Challenge`, uid, uNum, 3);

    const quizData = getGr5KAPMathQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }

  const diagQs = getGr5KAPMathDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G5KAPMATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 5 KAP Math seeded");
}

// ─── Grade 4 KAP ELA ─────────────────────────────────────────────────────────
{
  const cid = await insertCourse("G4KAPELA", "Grade 4 KAP English Language Arts", "english", "4",
    "Katy ISD Grade 4 KAP ELA provides enriched literary analysis, advanced writing, critical thinking, and research skills with acceleration into 5th grade content.",
    "TEKS 4.1-4.13 (KAP Enriched)", 206);

  const units = [
    [1, "Advanced Literary Analysis", "Analyze complex themes, symbolism, and author's craft in literary texts.", "TEKS 4.7-4.8 KAP"],
    [2, "Critical Reading of Informational Text", "Evaluate arguments, identify bias, and analyze text structure.", "TEKS 4.9-4.10 KAP"],
    [3, "Advanced Vocabulary & Etymology", "Explore word origins, morphology, and nuanced word meanings.", "TEKS 4.3 KAP"],
    [4, "Advanced Narrative Writing", "Craft complex narratives with sophisticated structure and literary devices.", "TEKS 4.11 KAP"],
    [5, "Research Writing", "Conduct multi-source research and write formal research reports.", "TEKS 4.11 KAP"],
    [6, "Argumentative Writing", "Construct well-supported arguments with evidence and counterarguments.", "TEKS 4.11 KAP"],
    [7, "Advanced Grammar & Style", "Apply advanced grammar rules and develop personal writing style.", "TEKS 4.12 KAP"],
    [8, "Socratic Seminar & Debate", "Engage in structured academic discussions and formal debates.", "TEKS 4.6 KAP"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G4KAPELA-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Enrichment`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Challenge`, uid, uNum, 3);

    const quizData = getGr4KAPELAQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }

  const diagQs = getGr4KAPELADiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G4KAPELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 4 KAP ELA seeded");
}

// ─── Grade 5 KAP ELA ─────────────────────────────────────────────────────────
{
  const cid = await insertCourse("G5KAPELA", "Grade 5 KAP English Language Arts", "english", "5",
    "Katy ISD Grade 5 KAP ELA accelerates into middle school literary analysis, advanced argumentative writing, and independent research with enriched vocabulary and critical thinking.",
    "TEKS 5.1-5.13 (KAP Enriched)", 216);

  const units = [
    [1, "Complex Literary Analysis", "Analyze complex texts for theme, symbolism, irony, and author's craft.", "TEKS 5.7-5.8 KAP"],
    [2, "Evaluating Informational Text", "Critically evaluate arguments, evidence, and rhetorical strategies.", "TEKS 5.9-5.10 KAP"],
    [3, "Advanced Vocabulary & Word Study", "Analyze etymology, connotation, and domain-specific vocabulary.", "TEKS 5.3 KAP"],
    [4, "Advanced Narrative Writing", "Write complex narratives with sophisticated literary techniques.", "TEKS 5.11 KAP"],
    [5, "Argumentative & Persuasive Writing", "Develop nuanced arguments with multiple sources and counterarguments.", "TEKS 5.11 KAP"],
    [6, "Research & Synthesis", "Synthesize information from multiple sources into a formal research paper.", "TEKS 5.11 KAP"],
    [7, "Advanced Grammar & Rhetoric", "Apply advanced grammar and rhetorical devices to improve writing.", "TEKS 5.12 KAP"],
    [8, "Socratic Seminar & Academic Discourse", "Lead and participate in structured academic discussions.", "TEKS 5.6 KAP"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const skillBase = `G5KAPELA-U${uNum}`;
    await insertSkill(cid, `${skillBase}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${skillBase}-S2`, `${uTitle} — Enrichment`, uid, uNum, 2);
    await insertSkill(cid, `${skillBase}-S3`, `${uTitle} — Challenge`, uid, uNum, 3);

    const quizData = getGr5KAPELAQuiz(uNum);
    for (let i = 0; i < quizData.length; i++) {
      const q = quizData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${skillBase}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }

  const diagQs = getGr5KAPELADiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G5KAPELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 5 KAP ELA seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION DATA FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getGr4MathQuiz(uNum) {
  const banks = {
    1: [
      { text: "What is the value of the digit 7 in the number 3,742,516?", choices: mc("7,000","70,000","700,000","7,000,000"), answer: "C", explanation: "The 7 is in the hundred-thousands place, so its value is 700,000." },
      { text: "Which number is written in expanded form as 400,000 + 30,000 + 500 + 20 + 1?", choices: mc("430,521","43,521","4,305,21","430,521"), answer: "A", explanation: "Adding each place value: 400,000 + 30,000 + 500 + 20 + 1 = 430,521." },
      { text: "Order these numbers from least to greatest: 2,541,000 | 2,514,000 | 2,541,100", choices: mc("2,514,000 < 2,541,000 < 2,541,100","2,541,100 < 2,541,000 < 2,514,000","2,541,000 < 2,514,000 < 2,541,100","2,514,000 < 2,541,100 < 2,541,000"), answer: "A", explanation: "Compare from left to right: 2,514,000 is smallest, then 2,541,000, then 2,541,100." },
      { text: "What is 1,000 more than 456,789?", choices: mc("457,789","456,889","456,799","556,789"), answer: "A", explanation: "Adding 1,000 to 456,789 increases the thousands digit by 1: 457,789." },
      { text: "Which symbol correctly compares 3,456,789 and 3,465,789?", choices: mc("<",">","=","≥"), answer: "A", explanation: "3,456,789 < 3,465,789 because the ten-thousands digit (5 vs 6) makes 3,465,789 larger." },
    ],
    2: [
      { text: "What is 4,567 + 3,845?", choices: mc("8,412","8,312","8,402","8,512"), answer: "A", explanation: "4,567 + 3,845 = 8,412. Add ones: 7+5=12, carry 1; tens: 6+4+1=11, carry 1; hundreds: 5+8+1=14, carry 1; thousands: 4+3+1=8." },
      { text: "What is 7,032 − 4,568?", choices: mc("2,464","2,564","2,474","3,464"), answer: "A", explanation: "7,032 − 4,568 = 2,464. Use regrouping as needed." },
      { text: "A store had 12,450 items. They sold 3,875. How many items remain?", choices: mc("8,575","8,475","9,575","8,665"), answer: "A", explanation: "12,450 − 3,875 = 8,575." },
      { text: "What is 3.45 + 2.78?", choices: mc("6.23","5.23","6.13","6.33"), answer: "A", explanation: "3.45 + 2.78 = 6.23. Add tenths: 4+7=11, write 1 carry 1; ones: 3+2+1=6." },
      { text: "What is 8.60 − 3.75?", choices: mc("4.85","4.75","5.85","4.95"), answer: "A", explanation: "8.60 − 3.75 = 4.85. Regroup as needed." },
    ],
    3: [
      { text: "What is 34 × 56?", choices: mc("1,904","1,804","1,914","1,994"), answer: "A", explanation: "34 × 56 = 34 × 50 + 34 × 6 = 1,700 + 204 = 1,904." },
      { text: "What is 125 × 8?", choices: mc("1,000","900","1,100","800"), answer: "A", explanation: "125 × 8 = 1,000. This is a benchmark multiplication fact." },
      { text: "A school orders 24 boxes of pencils with 144 pencils each. How many pencils total?", choices: mc("3,456","3,356","3,546","2,456"), answer: "A", explanation: "24 × 144 = 24 × 100 + 24 × 44 = 2,400 + 1,056 = 3,456." },
      { text: "What is 3,456 × 7?", choices: mc("24,192","23,192","24,092","25,192"), answer: "A", explanation: "3,456 × 7 = 24,192. Multiply each digit and carry." },
      { text: "Which expression equals 6 × 48?", choices: mc("6 × 40 + 6 × 8","6 × 40 + 8","6 + 40 × 6 + 8","6 × 4 + 6 × 8"), answer: "A", explanation: "The distributive property: 6 × 48 = 6 × (40 + 8) = 6 × 40 + 6 × 8." },
    ],
    4: [
      { text: "What is 756 ÷ 9?", choices: mc("84","74","94","82"), answer: "A", explanation: "756 ÷ 9 = 84. Check: 84 × 9 = 756." },
      { text: "What is 1,248 ÷ 4?", choices: mc("312","322","302","412"), answer: "A", explanation: "1,248 ÷ 4 = 312. Divide each digit group." },
      { text: "A school has 864 students divided equally into 24 classes. How many students per class?", choices: mc("36","34","38","32"), answer: "A", explanation: "864 ÷ 24 = 36." },
      { text: "What is 2,345 ÷ 5?", choices: mc("469","459","479","489"), answer: "A", explanation: "2,345 ÷ 5 = 469." },
      { text: "If 7 × ? = 2,856, what is the missing number?", choices: mc("408","418","398","428"), answer: "A", explanation: "2,856 ÷ 7 = 408. Check: 408 × 7 = 2,856." },
    ],
    5: [
      { text: "Which fraction is equivalent to 3/4?", choices: mc("6/8","9/16","3/8","4/5"), answer: "A", explanation: "3/4 = 6/8 because 3×2=6 and 4×2=8." },
      { text: "Order from least to greatest: 2/3, 1/2, 3/4", choices: mc("1/2 < 2/3 < 3/4","2/3 < 1/2 < 3/4","3/4 < 2/3 < 1/2","1/2 < 3/4 < 2/3"), answer: "A", explanation: "Convert to common denominator 12: 6/12 < 8/12 < 9/12." },
      { text: "What is 2 3/4 + 1 1/2?", choices: mc("4 1/4","3 1/4","4 3/4","3 3/4"), answer: "A", explanation: "2 3/4 + 1 2/4 = 3 5/4 = 4 1/4." },
      { text: "Which mixed number equals 17/5?", choices: mc("3 2/5","2 3/5","3 3/5","4 2/5"), answer: "A", explanation: "17 ÷ 5 = 3 remainder 2, so 17/5 = 3 2/5." },
      { text: "A recipe uses 3/8 cup of sugar. If you make 4 batches, how much sugar is needed?", choices: mc("1 1/2 cups","1 cup","2 cups","1 1/4 cups"), answer: "A", explanation: "4 × 3/8 = 12/8 = 1 4/8 = 1 1/2 cups." },
    ],
    6: [
      { text: "What decimal represents 7 tenths and 3 hundredths?", choices: mc("0.73","7.3","0.073","73.0"), answer: "A", explanation: "7 tenths = 0.7, 3 hundredths = 0.03; total = 0.73." },
      { text: "Which decimal is equivalent to 3/4?", choices: mc("0.75","0.34","0.43","0.7"), answer: "A", explanation: "3 ÷ 4 = 0.75." },
      { text: "Order from least to greatest: 0.5, 0.45, 0.54", choices: mc("0.45 < 0.5 < 0.54","0.5 < 0.45 < 0.54","0.54 < 0.5 < 0.45","0.45 < 0.54 < 0.5"), answer: "A", explanation: "Compare tenths first: 0.45 < 0.50 < 0.54." },
      { text: "What is 0.6 written as a fraction in simplest form?", choices: mc("3/5","6/10","1/6","2/3"), answer: "A", explanation: "0.6 = 6/10 = 3/5 in simplest form." },
      { text: "A book costs $12.75. If you have $20.00, how much change do you receive?", choices: mc("$7.25","$7.75","$8.25","$6.75"), answer: "A", explanation: "$20.00 − $12.75 = $7.25." },
    ],
    7: [
      { text: "What is the area of a rectangle with length 12 cm and width 8 cm?", choices: mc("96 cm²","40 cm²","20 cm²","48 cm²"), answer: "A", explanation: "Area = length × width = 12 × 8 = 96 cm²." },
      { text: "What is the perimeter of a square with side length 9 inches?", choices: mc("36 inches","18 inches","81 inches","27 inches"), answer: "A", explanation: "Perimeter of a square = 4 × side = 4 × 9 = 36 inches." },
      { text: "How many degrees are in a right angle?", choices: mc("90°","180°","45°","360°"), answer: "A", explanation: "A right angle measures exactly 90 degrees." },
      { text: "A triangle has angles of 45° and 65°. What is the third angle?", choices: mc("70°","80°","90°","60°"), answer: "A", explanation: "Angles in a triangle sum to 180°: 180 − 45 − 65 = 70°." },
      { text: "How many feet are in 3 yards?", choices: mc("9 feet","6 feet","12 feet","3 feet"), answer: "A", explanation: "1 yard = 3 feet, so 3 yards = 9 feet." },
    ],
    8: [
      { text: "A dot plot shows: 3 students scored 80, 5 scored 90, 2 scored 100. What is the mode?", choices: mc("90","80","100","85"), answer: "A", explanation: "The mode is the most frequent value. 5 students scored 90, which is the highest frequency." },
      { text: "What type of graph is best for showing how data is distributed over time?", choices: mc("Line graph","Bar graph","Pie chart","Dot plot"), answer: "A", explanation: "A line graph shows trends and changes over time." },
      { text: "In a stem-and-leaf plot, what does the stem represent?", choices: mc("The tens digit","The ones digit","The hundreds digit","The mean"), answer: "A", explanation: "In a stem-and-leaf plot, the stem typically represents the tens digit." },
      { text: "A bar graph shows: Math=45, Science=30, ELA=40, SS=25. Which subject had the most students?", choices: mc("Math","Science","ELA","Social Studies"), answer: "A", explanation: "Math has the highest bar at 45 students." },
      { text: "What is the range of the data set: 12, 18, 7, 24, 15?", choices: mc("17","12","7","24"), answer: "A", explanation: "Range = maximum − minimum = 24 − 7 = 17." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr4ELAQuiz(uNum) {
  const banks = {
    1: [
      { text: "What is the THEME of a story?", choices: mc("The central message or lesson","The main character's name","The setting of the story","The problem in the story"), answer: "A", explanation: "The theme is the central message, lesson, or moral that the author wants to convey." },
      { text: "What does 'point of view' mean in a story?", choices: mc("The perspective from which the story is told","The main conflict","The setting","The climax"), answer: "A", explanation: "Point of view refers to who is telling the story and from whose perspective." },
      { text: "In first-person point of view, which pronoun does the narrator use?", choices: mc("I","He","She","They"), answer: "A", explanation: "First-person narrators use 'I' because they are telling their own story." },
      { text: "What is the CLIMAX of a story?", choices: mc("The turning point or most exciting moment","The beginning","The resolution","The setting"), answer: "A", explanation: "The climax is the highest point of tension or the turning point in the story." },
      { text: "Which literary device compares two things using 'like' or 'as'?", choices: mc("Simile","Metaphor","Personification","Alliteration"), answer: "A", explanation: "A simile uses 'like' or 'as' to compare two things (e.g., 'fast as lightning')." },
    ],
    2: [
      { text: "What is the MAIN IDEA of an informational text?", choices: mc("The most important point the author makes","A detail that supports the topic","The title of the text","The author's name"), answer: "A", explanation: "The main idea is the central, most important point the author is making about the topic." },
      { text: "What are SUPPORTING DETAILS?", choices: mc("Facts and examples that explain the main idea","The title and headings","The author's opinion","The conclusion"), answer: "A", explanation: "Supporting details are the facts, examples, and explanations that develop and support the main idea." },
      { text: "What is the author's PURPOSE when writing to inform?", choices: mc("To teach the reader about a topic","To entertain with a story","To persuade the reader","To express feelings"), answer: "A", explanation: "When an author writes to inform, their purpose is to teach the reader facts about a topic." },
      { text: "What does a HEADING in a text help the reader do?", choices: mc("Understand what the section is about","Find the main idea","Identify the author","Locate the glossary"), answer: "A", explanation: "Headings help readers understand the topic of each section and navigate the text." },
      { text: "Which text structure uses words like 'first,' 'next,' and 'finally'?", choices: mc("Sequence/chronological","Compare and contrast","Cause and effect","Problem and solution"), answer: "A", explanation: "Sequence or chronological text structure describes events in order, using transition words like first, next, and finally." },
    ],
    3: [
      { text: "What is a CONTEXT CLUE?", choices: mc("Information in the surrounding text that helps define an unknown word","A dictionary definition","A word's prefix","A synonym"), answer: "A", explanation: "Context clues are hints in the surrounding text that help readers figure out the meaning of unfamiliar words." },
      { text: "The prefix 'un-' means:", choices: mc("Not or opposite of","Again","Before","After"), answer: "A", explanation: "The prefix 'un-' means 'not' or 'opposite of' (e.g., unhappy = not happy)." },
      { text: "The suffix '-ful' means:", choices: mc("Full of","Without","The act of","One who"), answer: "A", explanation: "The suffix '-ful' means 'full of' (e.g., joyful = full of joy)." },
      { text: "What does the Latin root 'aqua' mean?", choices: mc("Water","Fire","Earth","Air"), answer: "A", explanation: "The Latin root 'aqua' means water (e.g., aquarium, aquatic)." },
      { text: "Which word is a SYNONYM for 'enormous'?", choices: mc("Gigantic","Tiny","Average","Narrow"), answer: "A", explanation: "A synonym has the same or similar meaning. 'Gigantic' and 'enormous' both mean very large." },
    ],
    4: [
      { text: "What is the PURPOSE of a narrative hook?", choices: mc("To grab the reader's attention at the beginning","To summarize the story","To introduce the theme","To describe the setting"), answer: "A", explanation: "A narrative hook is an engaging opening that grabs the reader's attention and makes them want to keep reading." },
      { text: "What does 'show, don't tell' mean in writing?", choices: mc("Use descriptive details instead of stating emotions directly","Write longer sentences","Use more adjectives","Include dialogue"), answer: "A", explanation: "'Show, don't tell' means using specific details, actions, and dialogue to convey emotions rather than simply stating them." },
      { text: "What is DIALOGUE in a narrative?", choices: mc("Conversation between characters","The narrator's thoughts","A description of the setting","The story's theme"), answer: "A", explanation: "Dialogue is the spoken conversation between characters in a story, shown with quotation marks." },
      { text: "Which sentence uses VIVID DETAILS effectively?", choices: mc("The ancient oak tree's gnarled branches twisted toward the stormy sky","The tree was big","It was a nice day","She walked to school"), answer: "A", explanation: "Vivid details use specific, descriptive language to create a clear picture in the reader's mind." },
      { text: "What is the RESOLUTION of a narrative?", choices: mc("How the conflict is solved","The main problem","The setting","The climax"), answer: "A", explanation: "The resolution is the part of the story where the conflict is resolved and loose ends are tied up." },
    ],
    5: [
      { text: "What is a THESIS STATEMENT?", choices: mc("The main argument or point of an essay","The first sentence","A supporting detail","The conclusion"), answer: "A", explanation: "A thesis statement is the main argument or central point of an essay, usually found at the end of the introduction." },
      { text: "What is the purpose of a TOPIC SENTENCE?", choices: mc("To introduce the main idea of a paragraph","To conclude the essay","To provide evidence","To add a transition"), answer: "A", explanation: "A topic sentence introduces the main idea of a paragraph and tells the reader what the paragraph will be about." },
      { text: "What are TRANSITIONS used for in writing?", choices: mc("To connect ideas and guide the reader","To start a new topic","To add details","To end the essay"), answer: "A", explanation: "Transitions are words and phrases that connect ideas and help the reader follow the flow of the writing." },
      { text: "Which transition word shows CONTRAST?", choices: mc("However","Therefore","Furthermore","For example"), answer: "A", explanation: "'However' is a transition word that shows contrast or a change in direction of thought." },
      { text: "What should a CONCLUSION paragraph do?", choices: mc("Restate the thesis and summarize main points","Introduce new evidence","Begin a new argument","List all details"), answer: "A", explanation: "A conclusion restates the thesis in new words and summarizes the main points of the essay." },
    ],
    6: [
      { text: "What is a CLAIM in persuasive writing?", choices: mc("The writer's main argument or position","A fact from a source","An opposing viewpoint","A transition word"), answer: "A", explanation: "A claim is the writer's main argument or position that they want to convince the reader to accept." },
      { text: "What is EVIDENCE in persuasive writing?", choices: mc("Facts, examples, or statistics that support the claim","The writer's opinion","The conclusion","The introduction"), answer: "A", explanation: "Evidence includes facts, statistics, examples, and expert opinions that support the writer's claim." },
      { text: "What is a COUNTERARGUMENT?", choices: mc("An opposing viewpoint that the writer addresses","The main claim","Supporting evidence","The conclusion"), answer: "A", explanation: "A counterargument is an opposing viewpoint that the writer acknowledges and then refutes." },
      { text: "Which word signals a COUNTERARGUMENT is being addressed?", choices: mc("Although","Therefore","Furthermore","In conclusion"), answer: "A", explanation: "'Although' signals that the writer is acknowledging an opposing viewpoint before refuting it." },
      { text: "What makes a persuasive argument CREDIBLE?", choices: mc("Using reliable evidence and logical reasoning","Using emotional language only","Making the argument very long","Using many adjectives"), answer: "A", explanation: "A credible argument uses reliable evidence from trustworthy sources and logical reasoning." },
    ],
    7: [
      { text: "Which sentence is a COMPOUND SENTENCE?", choices: mc("I like math, and she likes science.","I like math.","Because I like math.","Math is fun and interesting."), answer: "A", explanation: "A compound sentence joins two independent clauses with a coordinating conjunction (FANBOYS)." },
      { text: "What is an APOSTROPHE used for in 'the dog's bone'?", choices: mc("To show possession","To show a contraction","To end a sentence","To show plural"), answer: "A", explanation: "An apostrophe followed by 's' shows possession (the bone belongs to the dog)." },
      { text: "Which word is a CONJUNCTION?", choices: mc("Because","Run","Quickly","Beautiful"), answer: "A", explanation: "A conjunction connects words, phrases, or clauses. 'Because' is a subordinating conjunction." },
      { text: "What is the SUBJECT of the sentence 'The tall girl ran quickly'?", choices: mc("The tall girl","ran","quickly","tall"), answer: "A", explanation: "The subject is who or what the sentence is about. 'The tall girl' is the subject." },
      { text: "Which sentence has correct CAPITALIZATION?", choices: mc("We visited Austin, Texas, last summer.","we visited austin, texas, last summer.","We visited austin, Texas, last summer.","We visited Austin, texas, last Summer."), answer: "A", explanation: "Proper nouns (Austin, Texas) and the first word of a sentence must be capitalized." },
    ],
    8: [
      { text: "What is a PRIMARY SOURCE?", choices: mc("An original document or artifact from the time period","A textbook summary","A teacher's explanation","A documentary"), answer: "A", explanation: "A primary source is an original document, artifact, or firsthand account from the time period being studied." },
      { text: "What does it mean to CITE a source?", choices: mc("To give credit to the original author","To copy the text","To summarize the text","To disagree with the author"), answer: "A", explanation: "Citing a source means giving proper credit to the original author or creator of the information." },
      { text: "What is PLAGIARISM?", choices: mc("Using someone else's work without giving credit","Citing your sources","Writing a summary","Using quotation marks"), answer: "A", explanation: "Plagiarism is using someone else's words or ideas without giving them proper credit." },
      { text: "What should you do FIRST when preparing an oral presentation?", choices: mc("Organize your main ideas and create an outline","Memorize every word","Write the conclusion first","Speak as fast as possible"), answer: "A", explanation: "Effective presentations begin with organizing your main ideas into a clear outline before writing or practicing." },
      { text: "What is the purpose of EYE CONTACT during a presentation?", choices: mc("To engage the audience and show confidence","To read from notes","To avoid distractions","To speak louder"), answer: "A", explanation: "Eye contact engages the audience and demonstrates confidence and connection with the listeners." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr4SciQuiz(uNum) {
  const banks = {
    1: [
      { text: "What is a HYPOTHESIS?", choices: mc("An educated guess that can be tested","A proven fact","A conclusion","An observation"), answer: "A", explanation: "A hypothesis is an educated, testable prediction about what will happen in an experiment." },
      { text: "What tool is used to measure the mass of an object?", choices: mc("Balance scale","Ruler","Thermometer","Graduated cylinder"), answer: "A", explanation: "A balance scale (or triple beam balance) is used to measure the mass of an object." },
      { text: "What is a VARIABLE in an experiment?", choices: mc("Something that can change","The conclusion","The hypothesis","The materials list"), answer: "A", explanation: "A variable is any factor that can change in an experiment." },
      { text: "What should you do FIRST in a science investigation?", choices: mc("Ask a question","Collect data","Draw a conclusion","Write a report"), answer: "A", explanation: "The scientific method begins with asking a question about an observation." },
      { text: "Why is it important to repeat an experiment?", choices: mc("To confirm the results are reliable","To make the experiment longer","To use more materials","To change the hypothesis"), answer: "A", explanation: "Repeating an experiment helps confirm that the results are reliable and not due to chance." },
    ],
    2: [
      { text: "What is a PHYSICAL PROPERTY of matter?", choices: mc("A characteristic that can be observed without changing the substance","A change that creates a new substance","The weight of an object","The temperature of an object"), answer: "A", explanation: "Physical properties (color, shape, texture, mass) can be observed without changing the substance's identity." },
      { text: "Which is an example of a CHEMICAL CHANGE?", choices: mc("Burning wood","Melting ice","Cutting paper","Dissolving sugar"), answer: "A", explanation: "Burning wood is a chemical change because it creates new substances (ash, carbon dioxide, water vapor)." },
      { text: "What are the three states of matter?", choices: mc("Solid, liquid, gas","Hot, warm, cold","Hard, soft, liquid","Heavy, light, medium"), answer: "A", explanation: "The three common states of matter are solid, liquid, and gas." },
      { text: "What happens to most substances when they are heated?", choices: mc("They expand","They contract","They stay the same","They become heavier"), answer: "A", explanation: "Most substances expand (take up more space) when heated because their particles move faster and spread apart." },
      { text: "What is DENSITY?", choices: mc("The amount of mass in a given volume","The weight of an object","The size of an object","The color of a substance"), answer: "A", explanation: "Density is the amount of mass packed into a given volume (density = mass ÷ volume)." },
    ],
    3: [
      { text: "What form of energy does the Sun produce?", choices: mc("Light and heat energy","Electrical energy","Chemical energy","Mechanical energy"), answer: "A", explanation: "The Sun produces light (radiant) energy and heat (thermal) energy." },
      { text: "What is ELECTRICAL ENERGY?", choices: mc("Energy from the movement of electric charges","Energy from heat","Energy from light","Energy from sound"), answer: "A", explanation: "Electrical energy is energy from the movement of electric charges through a conductor." },
      { text: "Which material is a good CONDUCTOR of electricity?", choices: mc("Copper wire","Rubber","Wood","Plastic"), answer: "A", explanation: "Copper is an excellent conductor of electricity because its electrons move freely." },
      { text: "What is SOUND ENERGY?", choices: mc("Energy from vibrating objects","Energy from light","Energy from heat","Energy from motion"), answer: "A", explanation: "Sound energy is produced by vibrating objects and travels through matter as waves." },
      { text: "What happens to energy when it is transformed?", choices: mc("It changes from one form to another","It disappears","It doubles","It stays the same form"), answer: "A", explanation: "Energy can be transformed (converted) from one form to another, but it is never created or destroyed." },
    ],
    4: [
      { text: "What is GRAVITY?", choices: mc("A force that pulls objects toward each other","A force that pushes objects apart","The speed of an object","The mass of an object"), answer: "A", explanation: "Gravity is a force of attraction between objects with mass, pulling them toward each other." },
      { text: "What is FRICTION?", choices: mc("A force that resists motion between surfaces","A force that speeds up objects","The weight of an object","The direction of motion"), answer: "A", explanation: "Friction is a force that opposes motion when two surfaces rub against each other." },
      { text: "If you push a box with more force, what happens to its acceleration?", choices: mc("It increases","It decreases","It stays the same","It stops"), answer: "A", explanation: "According to Newton's second law, greater force produces greater acceleration (when mass stays constant)." },
      { text: "What is a BALANCED FORCE?", choices: mc("Forces that are equal in size but opposite in direction","Forces that cause motion","Forces that are unequal","A single force acting on an object"), answer: "A", explanation: "Balanced forces are equal in size and opposite in direction, resulting in no change in motion." },
      { text: "Which simple machine is a ramp?", choices: mc("Inclined plane","Lever","Pulley","Wheel and axle"), answer: "A", explanation: "A ramp is an inclined plane — a flat surface set at an angle that reduces the force needed to move objects." },
    ],
    5: [
      { text: "What causes WEATHERING of rocks?", choices: mc("Wind, water, and temperature changes","Earthquakes","Volcanoes","Gravity alone"), answer: "A", explanation: "Weathering is the breaking down of rocks by physical forces (wind, water, ice) and chemical processes." },
      { text: "What is EROSION?", choices: mc("The movement of weathered material by wind, water, or ice","The breaking down of rocks","The formation of new rocks","The melting of glaciers"), answer: "A", explanation: "Erosion is the process by which weathered material (sediment) is transported to a new location." },
      { text: "Which of these is a RENEWABLE natural resource?", choices: mc("Solar energy","Coal","Natural gas","Oil"), answer: "A", explanation: "Solar energy is renewable because it is continuously replenished by the Sun and will not run out." },
      { text: "What are the three types of rocks?", choices: mc("Igneous, sedimentary, metamorphic","Hard, soft, medium","Old, new, ancient","Surface, deep, underground"), answer: "A", explanation: "The three types of rocks are igneous (formed from cooled magma), sedimentary (formed from compressed sediment), and metamorphic (changed by heat and pressure)." },
      { text: "What is DEPOSITION?", choices: mc("The dropping of sediment in a new location","The breaking of rocks","The movement of water","The formation of mountains"), answer: "A", explanation: "Deposition occurs when the agent of erosion (wind, water, ice) loses energy and drops the sediment it was carrying." },
    ],
    6: [
      { text: "What is the WATER CYCLE?", choices: mc("The continuous movement of water through Earth's systems","The daily weather pattern","The amount of water in the ocean","The flow of rivers"), answer: "A", explanation: "The water cycle is the continuous movement of water through evaporation, condensation, precipitation, and collection." },
      { text: "What is EVAPORATION?", choices: mc("Liquid water changing to water vapor","Water vapor changing to liquid","Ice melting","Rain falling"), answer: "A", explanation: "Evaporation is the process by which liquid water is converted to water vapor (gas) by heat energy." },
      { text: "What is CONDENSATION?", choices: mc("Water vapor changing to liquid water","Liquid water changing to vapor","Ice forming","Rain falling"), answer: "A", explanation: "Condensation is the process by which water vapor cools and changes back into liquid water droplets." },
      { text: "What instrument measures TEMPERATURE?", choices: mc("Thermometer","Barometer","Anemometer","Rain gauge"), answer: "A", explanation: "A thermometer measures temperature in degrees Celsius or Fahrenheit." },
      { text: "What is CLIMATE?", choices: mc("The average weather conditions of an area over a long period","The weather today","A single storm","The temperature right now"), answer: "A", explanation: "Climate is the average weather pattern of a region over many years, while weather is the current atmospheric conditions." },
    ],
    7: [
      { text: "What is an ADAPTATION?", choices: mc("A trait that helps an organism survive in its environment","A change in weather","A type of food","A habitat"), answer: "A", explanation: "An adaptation is a physical or behavioral trait that helps an organism survive and reproduce in its environment." },
      { text: "What is a FOOD WEB?", choices: mc("A diagram showing feeding relationships in an ecosystem","A spider's web","A type of habitat","A list of animals"), answer: "A", explanation: "A food web shows the complex feeding relationships between organisms in an ecosystem." },
      { text: "What is a PRODUCER in a food chain?", choices: mc("A plant that makes its own food through photosynthesis","An animal that eats plants","An animal that eats other animals","A decomposer"), answer: "A", explanation: "Producers (plants) make their own food through photosynthesis and form the base of food chains." },
      { text: "What is PHOTOSYNTHESIS?", choices: mc("The process by which plants use sunlight to make food","The process of animals eating plants","The water cycle","The process of decomposition"), answer: "A", explanation: "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose (food) and oxygen." },
      { text: "What is a DECOMPOSER?", choices: mc("An organism that breaks down dead matter","A plant","A predator","An herbivore"), answer: "A", explanation: "Decomposers (fungi, bacteria) break down dead organisms and return nutrients to the soil." },
    ],
    8: [
      { text: "What causes DAY and NIGHT on Earth?", choices: mc("Earth's rotation on its axis","Earth's revolution around the Sun","The Moon's orbit","The tilt of Earth's axis"), answer: "A", explanation: "Day and night are caused by Earth rotating on its axis every 24 hours." },
      { text: "What causes the SEASONS on Earth?", choices: mc("The tilt of Earth's axis as it revolves around the Sun","Earth's rotation","The distance from the Sun","The Moon's phases"), answer: "A", explanation: "Seasons are caused by Earth's tilted axis (23.5°) as it revolves around the Sun, changing the angle of sunlight." },
      { text: "How long does it take Earth to complete one REVOLUTION around the Sun?", choices: mc("365.25 days","24 hours","28 days","12 hours"), answer: "A", explanation: "Earth completes one full revolution around the Sun in approximately 365.25 days (one year)." },
      { text: "What is the MOON?", choices: mc("Earth's natural satellite","A star","A planet","A comet"), answer: "A", explanation: "The Moon is Earth's natural satellite — a large rocky body that orbits Earth." },
      { text: "Which planet is closest to the Sun?", choices: mc("Mercury","Venus","Earth","Mars"), answer: "A", explanation: "Mercury is the closest planet to the Sun in our solar system." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr4SSQuiz(uNum) {
  const banks = {
    1: [
      { text: "What are the four major natural regions of Texas?", choices: mc("Coastal Plains, North Central Plains, Great Plains, Mountains and Basins","Desert, Forest, Plains, Mountains","East, West, North, South Texas","Gulf Coast, Hill Country, Panhandle, Big Bend"), answer: "A", explanation: "Texas has four major natural regions: Coastal Plains, North Central Plains, Great Plains, and Mountains and Basins." },
      { text: "Which body of water borders Texas to the southeast?", choices: mc("Gulf of Mexico","Pacific Ocean","Atlantic Ocean","Rio Grande"), answer: "A", explanation: "The Gulf of Mexico borders Texas to the southeast, providing important trade and fishing resources." },
      { text: "What is the CLIMATE of most of Texas?", choices: mc("Semi-arid to subtropical","Arctic","Tropical rainforest","Mediterranean"), answer: "A", explanation: "Most of Texas has a semi-arid to subtropical climate, with hot summers and mild winters." },
      { text: "What river forms the border between Texas and Mexico?", choices: mc("Rio Grande","Colorado River","Brazos River","Red River"), answer: "A", explanation: "The Rio Grande forms the entire southern border between Texas and Mexico." },
      { text: "What is the CAPITAL of Texas?", choices: mc("Austin","Houston","Dallas","San Antonio"), answer: "A", explanation: "Austin is the capital of Texas and home to the Texas State Capitol building." },
    ],
    2: [
      { text: "Which Native American group lived in the eastern forests of Texas?", choices: mc("Caddo","Comanche","Apache","Karankawa"), answer: "A", explanation: "The Caddo people lived in the forests of East Texas and were known for their farming and confederacy." },
      { text: "Which Native American group was known as skilled horse riders of the Great Plains?", choices: mc("Comanche","Caddo","Karankawa","Tigua"), answer: "A", explanation: "The Comanche were expert horsemen who dominated the southern Great Plains of Texas." },
      { text: "What did the Karankawa people primarily eat?", choices: mc("Fish and shellfish from the Gulf Coast","Buffalo from the plains","Corn and beans from farms","Deer from the forests"), answer: "A", explanation: "The Karankawa lived along the Gulf Coast and relied primarily on fish, shellfish, and other coastal resources." },
      { text: "What is a TEEPEE?", choices: mc("A portable home used by nomadic Plains tribes","A permanent wooden house","An underground dwelling","A stone fortress"), answer: "A", explanation: "A teepee is a portable, cone-shaped dwelling used by nomadic Plains tribes who followed buffalo herds." },
      { text: "What crop was most important to the Caddo people?", choices: mc("Corn (maize)","Cotton","Wheat","Potatoes"), answer: "A", explanation: "Corn (maize) was the most important crop for the Caddo, who were skilled farmers." },
    ],
    3: [
      { text: "Which European country first explored and claimed Texas?", choices: mc("Spain","France","England","Portugal"), answer: "A", explanation: "Spain was the first European country to explore and claim Texas, beginning in the 1500s." },
      { text: "What was the purpose of Spanish MISSIONS in Texas?", choices: mc("To convert Native Americans to Christianity and establish settlements","To find gold","To build military forts","To trade with France"), answer: "A", explanation: "Spanish missions were religious settlements designed to convert Native Americans to Christianity and establish Spanish control." },
      { text: "Who was René-Robert Cavelier, Sieur de La Salle?", choices: mc("A French explorer who claimed the Mississippi River valley for France","A Spanish conquistador","A Native American chief","An English settler"), answer: "A", explanation: "La Salle was a French explorer who claimed the Mississippi River valley for France and later established a colony in Texas." },
      { text: "What is a PRESIDIO?", choices: mc("A Spanish military fort","A Spanish church","A Spanish school","A Spanish market"), answer: "A", explanation: "A presidio was a Spanish military fort built to protect missions and settlements from attack." },
      { text: "Why did Spain establish settlements in Texas?", choices: mc("To prevent French expansion and claim the land","To find gold","To escape religious persecution","To trade with Native Americans"), answer: "A", explanation: "Spain established Texas settlements primarily to prevent French expansion from Louisiana into Spanish territory." },
    ],
    4: [
      { text: "What was the ALAMO?", choices: mc("A Spanish mission that became a famous battle site during the Texas Revolution","The capital of Texas","A Native American village","A Spanish fort on the border"), answer: "A", explanation: "The Alamo was a Spanish mission in San Antonio that became the site of a famous battle during the Texas Revolution in 1836." },
      { text: "Who was Stephen F. Austin?", choices: mc("The 'Father of Texas' who led American colonists to settle in Texas","The president of Mexico","A Mexican general","The first president of the Republic of Texas"), answer: "A", explanation: "Stephen F. Austin is called the 'Father of Texas' because he led the first successful American colony in Texas." },
      { text: "What was the Battle of San Jacinto?", choices: mc("The battle where Texas won independence from Mexico","The battle at the Alamo","The first battle of the Texas Revolution","A battle between Spain and France"), answer: "A", explanation: "The Battle of San Jacinto (April 21, 1836) was the decisive battle where Sam Houston's army defeated Santa Anna, winning Texas independence." },
      { text: "Who was Sam Houston?", choices: mc("The commander of the Texas army and first president of the Republic of Texas","A Mexican general","A Spanish explorer","A Native American chief"), answer: "A", explanation: "Sam Houston commanded the Texas army at San Jacinto and became the first president of the Republic of Texas." },
      { text: "What was the DECLARATION OF INDEPENDENCE of Texas?", choices: mc("A document declaring Texas independent from Mexico, signed March 2, 1836","A document declaring war on Mexico","A treaty with Spain","A letter to the U.S. government"), answer: "A", explanation: "The Texas Declaration of Independence was signed on March 2, 1836, declaring Texas free from Mexican rule." },
    ],
    5: [
      { text: "When did Texas become a state of the United States?", choices: mc("December 29, 1845","March 2, 1836","April 21, 1836","January 1, 1850"), answer: "A", explanation: "Texas was admitted to the United States as the 28th state on December 29, 1845." },
      { text: "What was the Republic of Texas?", choices: mc("An independent nation that existed from 1836 to 1845","A Mexican territory","A Spanish colony","A U.S. territory"), answer: "A", explanation: "The Republic of Texas was an independent nation that existed for nearly 10 years (1836-1845) before joining the United States." },
      { text: "Why was Texas annexation controversial?", choices: mc("It could expand slavery into new territory and anger Mexico","Texas was too large","Texas had no resources","The population was too small"), answer: "A", explanation: "Texas annexation was controversial because it could expand slavery and because Mexico still claimed Texas, risking war." },
      { text: "Who was Mirabeau Lamar?", choices: mc("The second president of the Republic of Texas","The first president of the Republic of Texas","A Mexican general","A Spanish explorer"), answer: "A", explanation: "Mirabeau Lamar was the second president of the Republic of Texas, known for promoting education and moving the capital to Austin." },
      { text: "What was the LONE STAR FLAG?", choices: mc("The flag of the Republic of Texas, featuring one star","The flag of Mexico","The flag of Spain","The current Texas state flag"), answer: "A", explanation: "The Lone Star Flag was the official flag of the Republic of Texas, featuring a single star — giving Texas the nickname 'The Lone Star State.'" },
    ],
    6: [
      { text: "What was the most important industry in early Texas?", choices: mc("Cattle ranching","Manufacturing","Mining","Fishing"), answer: "A", explanation: "Cattle ranching was the most important early Texas industry, with millions of longhorns driven north on cattle trails." },
      { text: "What was the CHISHOLM TRAIL?", choices: mc("A cattle trail from Texas to Kansas","A wagon road to California","A Native American trade route","A railroad line"), answer: "A", explanation: "The Chisholm Trail was a major cattle drive route from Texas to Abilene, Kansas, used from 1867 to 1884." },
      { text: "What discovery transformed the Texas economy in 1901?", choices: mc("Oil at Spindletop","Gold in West Texas","Silver in the Panhandle","Natural gas in East Texas"), answer: "A", explanation: "The Spindletop oil discovery near Beaumont in 1901 transformed Texas into a major oil-producing state." },
      { text: "What is AGRICULTURE?", choices: mc("The science and practice of farming","The study of rocks","The process of manufacturing","The study of weather"), answer: "A", explanation: "Agriculture is the science and practice of farming, including growing crops and raising livestock." },
      { text: "What crop was most important to East Texas in the 1800s?", choices: mc("Cotton","Corn","Wheat","Rice"), answer: "A", explanation: "Cotton was the dominant cash crop of East Texas in the 1800s, driving the plantation economy." },
    ],
    7: [
      { text: "What are the THREE branches of Texas government?", choices: mc("Legislative, Executive, Judicial","President, Congress, Courts","Governor, Senate, House","Federal, State, Local"), answer: "A", explanation: "Texas government has three branches: Legislative (makes laws), Executive (enforces laws), and Judicial (interprets laws)." },
      { text: "Who is the head of the EXECUTIVE branch of Texas?", choices: mc("The Governor","The Lieutenant Governor","The Chief Justice","The Speaker of the House"), answer: "A", explanation: "The Governor is the head of the Executive branch of Texas government." },
      { text: "What does the LEGISLATIVE branch do?", choices: mc("Makes laws","Enforces laws","Interprets laws","Leads the military"), answer: "A", explanation: "The Legislative branch (Texas Legislature) makes the laws that govern Texas." },
      { text: "What is the TEXAS CONSTITUTION?", choices: mc("The document that establishes the structure and laws of Texas government","A list of Texas history","A collection of Texas laws","The Texas Declaration of Independence"), answer: "A", explanation: "The Texas Constitution establishes the framework of Texas government, including the rights of citizens and the structure of government." },
      { text: "What is a CITIZEN'S RESPONSIBILITY in a democracy?", choices: mc("To vote and participate in government","To pay taxes only","To follow laws only","To serve in the military"), answer: "A", explanation: "Citizens in a democracy have the responsibility to vote, stay informed, and participate in the democratic process." },
    ],
    8: [
      { text: "What is CULTURE?", choices: mc("The beliefs, customs, and traditions of a group of people","The language of a country","The food people eat","The clothes people wear"), answer: "A", explanation: "Culture encompasses the shared beliefs, customs, traditions, language, art, and values of a group of people." },
      { text: "Which cultural group had the greatest influence on Texas food, language, and architecture?", choices: mc("Spanish and Mexican","French","German","Native American"), answer: "A", explanation: "Spanish and Mexican culture had the greatest influence on Texas, visible in language (Spanish words), food (Tex-Mex), and architecture (missions)." },
      { text: "What is the ALAMO today?", choices: mc("A museum and historic site in San Antonio","A government building","A school","A park"), answer: "A", explanation: "The Alamo is now a museum and historic site in San Antonio, preserved as a symbol of Texas independence." },
      { text: "What is JUNETEENTH?", choices: mc("The day enslaved people in Texas learned of their freedom (June 19, 1865)","Texas Independence Day","The day Texas became a state","A Mexican holiday"), answer: "A", explanation: "Juneteenth (June 19, 1865) is the day enslaved people in Texas learned of their freedom following the Civil War — now a national holiday." },
      { text: "What is the TEXAS STATE MOTTO?", choices: mc("Friendship","Remember the Alamo","The Lone Star State","Texas Forever"), answer: "A", explanation: "The official Texas state motto is 'Friendship,' derived from the Caddo word 'tejas' meaning friends or allies." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr4TechQuiz(uNum) {
  const banks = {
    1: [
      { text: "What is a DIGITAL FOOTPRINT?", choices: mc("The trail of data you leave online","Your computer's storage","Your internet speed","Your password"), answer: "A", explanation: "A digital footprint is the trail of data and information you leave behind when you use the internet." },
      { text: "What should you NEVER share online?", choices: mc("Your home address and phone number","Your favorite color","Your school name","Your first name"), answer: "A", explanation: "You should never share personal information like your home address, phone number, or full name with strangers online." },
      { text: "What is CYBERBULLYING?", choices: mc("Using technology to bully or harass someone","A type of computer virus","A way to play games online","A type of social media"), answer: "A", explanation: "Cyberbullying is using digital technology (social media, texts, games) to harass, threaten, or embarrass someone." },
      { text: "What should you do if you see cyberbullying online?", choices: mc("Tell a trusted adult and report it","Join in","Ignore it completely","Share the post"), answer: "A", explanation: "If you witness cyberbullying, you should tell a trusted adult and report it to the platform." },
      { text: "What does 'FAIR USE' mean?", choices: mc("Using copyrighted material in limited ways for education","Using any material freely","Copying all content from the internet","Sharing files with friends"), answer: "A", explanation: "Fair use allows limited use of copyrighted material for educational, commentary, or transformative purposes." },
    ],
    2: [
      { text: "In block coding, what does a LOOP do?", choices: mc("Repeats a set of instructions multiple times","Runs a program once","Stops the program","Changes the background"), answer: "A", explanation: "A loop is a programming structure that repeats a set of instructions a specified number of times or until a condition is met." },
      { text: "What is a SEQUENCE in programming?", choices: mc("Instructions that run in order, one after another","A type of loop","A decision block","A variable"), answer: "A", explanation: "A sequence is the most basic programming concept — instructions that execute one after another in a specific order." },
      { text: "What is a CONDITIONAL in coding?", choices: mc("An if/then decision that runs code only when a condition is true","A type of loop","A variable","A function"), answer: "A", explanation: "A conditional (if/then) runs a block of code only when a specific condition is true." },
      { text: "What does a BUG in a program mean?", choices: mc("An error or mistake in the code","A type of computer virus","A feature of the program","A type of loop"), answer: "A", explanation: "A bug is an error or mistake in a program that causes it to behave incorrectly." },
      { text: "What is DEBUGGING?", choices: mc("Finding and fixing errors in code","Writing new code","Running a program","Saving a file"), answer: "A", explanation: "Debugging is the process of finding and fixing errors (bugs) in a program." },
    ],
    3: [
      { text: "What does BOLD text formatting do?", choices: mc("Makes text appear darker and heavier","Makes text larger","Makes text italic","Changes text color"), answer: "A", explanation: "Bold formatting makes text appear darker and heavier, used to emphasize important words or headings." },
      { text: "What is the purpose of a HEADER in a document?", choices: mc("To display information at the top of every page","To add a title","To create a table","To insert an image"), answer: "A", explanation: "A header appears at the top of every page and typically contains the document title, author name, or page number." },
      { text: "What keyboard shortcut is used to SAVE a document?", choices: mc("Ctrl+S","Ctrl+C","Ctrl+V","Ctrl+Z"), answer: "A", explanation: "Ctrl+S (or Cmd+S on Mac) is the keyboard shortcut to save a document." },
      { text: "What is COPY and PASTE?", choices: mc("Duplicating text and placing it in a new location","Deleting text","Moving text permanently","Formatting text"), answer: "A", explanation: "Copy (Ctrl+C) duplicates selected text, and Paste (Ctrl+V) places the copied text in a new location." },
      { text: "What does FONT SIZE control?", choices: mc("How large or small the text appears","The style of the text","The color of the text","The spacing between lines"), answer: "A", explanation: "Font size controls how large or small the text appears, measured in points." },
    ],
    4: [
      { text: "What is a SPREADSHEET used for?", choices: mc("Organizing and calculating data in rows and columns","Writing documents","Creating presentations","Sending emails"), answer: "A", explanation: "A spreadsheet organizes data in rows and columns and can perform calculations using formulas." },
      { text: "What is a CELL in a spreadsheet?", choices: mc("The intersection of a row and column","A row of data","A column of data","A formula"), answer: "A", explanation: "A cell is the individual box at the intersection of a row and column in a spreadsheet." },
      { text: "What does the SUM function do in a spreadsheet?", choices: mc("Adds all values in a selected range","Finds the average","Counts the cells","Finds the maximum"), answer: "A", explanation: "The SUM function adds all the values in a selected range of cells." },
      { text: "What type of chart is best for comparing categories?", choices: mc("Bar chart","Line chart","Pie chart","Scatter plot"), answer: "A", explanation: "A bar chart is best for comparing values across different categories." },
      { text: "What is a FORMULA in a spreadsheet?", choices: mc("An equation that performs calculations on cell data","A type of chart","A cell reference","A column header"), answer: "A", explanation: "A formula is an equation entered in a cell that performs calculations using cell references and operators." },
    ],
    5: [
      { text: "What is a SLIDE in a presentation?", choices: mc("A single page of content in a presentation","A type of animation","A transition effect","A font style"), answer: "A", explanation: "A slide is a single page or screen of content in a presentation program like PowerPoint or Google Slides." },
      { text: "What is a TRANSITION in a presentation?", choices: mc("The visual effect when moving from one slide to the next","A type of font","A bullet point","A chart"), answer: "A", explanation: "A transition is the animated effect that plays when moving from one slide to the next." },
      { text: "What makes a presentation READABLE?", choices: mc("Large font size and high contrast between text and background","Small font and many colors","Lots of text on each slide","Decorative fonts"), answer: "A", explanation: "Readable presentations use large fonts (18pt+) and high contrast between text and background colors." },
      { text: "What is the 6×6 RULE for presentations?", choices: mc("No more than 6 bullet points and 6 words per bullet","6 slides maximum","6 images per slide","6 fonts per presentation"), answer: "A", explanation: "The 6×6 rule suggests using no more than 6 bullet points per slide and 6 words per bullet to keep slides clean and readable." },
      { text: "What should you include on a TITLE SLIDE?", choices: mc("The presentation title, your name, and date","Only the title","Only your name","A table of contents"), answer: "A", explanation: "A title slide should include the presentation title, presenter's name, and date." },
    ],
    6: [
      { text: "What is a RELIABLE source on the internet?", choices: mc("A website from a known organization, government, or expert","Any website","A social media post","A random blog"), answer: "A", explanation: "Reliable sources come from known organizations, government agencies (.gov), educational institutions (.edu), or recognized experts." },
      { text: "What does URL stand for?", choices: mc("Uniform Resource Locator","Universal Reading Link","United Research Location","Unique Resource Label"), answer: "A", explanation: "URL stands for Uniform Resource Locator — the address of a webpage on the internet." },
      { text: "What is a SEARCH ENGINE?", choices: mc("A tool that finds websites based on keywords","A type of browser","An email program","A social media platform"), answer: "A", explanation: "A search engine (like Google) is a tool that searches the internet and returns websites related to your keywords." },
      { text: "What does it mean to EVALUATE a source?", choices: mc("To check if it is accurate, reliable, and relevant","To copy information from it","To bookmark it","To share it"), answer: "A", explanation: "Evaluating a source means checking whether the information is accurate, the author is credible, and the content is relevant to your topic." },
      { text: "What is a KEYWORD in an internet search?", choices: mc("An important word that helps find relevant results","Your username","A website address","A type of link"), answer: "A", explanation: "Keywords are the important words you type into a search engine to find relevant information on your topic." },
    ],
    7: [
      { text: "What is MULTIMEDIA?", choices: mc("Content that combines text, images, audio, and video","A type of computer","A social media platform","A type of document"), answer: "A", explanation: "Multimedia combines multiple forms of content — text, images, audio, video, and animation — in a single project." },
      { text: "What is a PIXEL?", choices: mc("The smallest unit of a digital image","A type of font","A computer program","A type of file"), answer: "A", explanation: "A pixel is the smallest unit of a digital image — screens are made up of millions of tiny pixels." },
      { text: "What file format is commonly used for digital images?", choices: mc("JPEG or PNG","DOCX","MP3","PDF"), answer: "A", explanation: "JPEG and PNG are common image file formats. JPEG is best for photos; PNG is best for images with transparency." },
      { text: "What is ANIMATION?", choices: mc("A series of images displayed quickly to create the illusion of movement","A type of photograph","A video recording","A type of font"), answer: "A", explanation: "Animation is created by displaying a series of slightly different images in rapid succession, creating the illusion of movement." },
      { text: "What is the purpose of ALT TEXT for images?", choices: mc("To describe an image for people who cannot see it","To make images larger","To add a caption","To link to another page"), answer: "A", explanation: "Alt text (alternative text) describes an image for people using screen readers or when the image cannot load." },
    ],
    8: [
      { text: "What is an ALGORITHM?", choices: mc("A step-by-step set of instructions to solve a problem","A type of computer","A programming language","A type of loop"), answer: "A", explanation: "An algorithm is a precise, step-by-step set of instructions for solving a problem or completing a task." },
      { text: "What is DECOMPOSITION in computational thinking?", choices: mc("Breaking a complex problem into smaller, manageable parts","Combining two programs","Running a program faster","Deleting unnecessary code"), answer: "A", explanation: "Decomposition is breaking a large, complex problem into smaller, more manageable sub-problems." },
      { text: "What is PATTERN RECOGNITION?", choices: mc("Finding similarities and trends in data or problems","Creating new patterns","Drawing shapes","Writing code"), answer: "A", explanation: "Pattern recognition involves identifying similarities, trends, or repeated elements in data or problems to solve them more efficiently." },
      { text: "What is ABSTRACTION in computing?", choices: mc("Focusing on important information and ignoring unnecessary details","Making code more complex","Adding more features","Testing a program"), answer: "A", explanation: "Abstraction means focusing on the essential information needed to solve a problem while hiding unnecessary details." },
      { text: "What is a FLOWCHART used for?", choices: mc("Visually representing the steps of an algorithm or process","Drawing pictures","Writing code","Creating spreadsheets"), answer: "A", explanation: "A flowchart uses shapes and arrows to visually represent the steps and decisions in an algorithm or process." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr5MathQuiz(uNum) {
  const banks = {
    1: [
      { text: "What is the value of the digit 4 in 3.047?", choices: mc("4 hundredths","4 tenths","4 thousandths","4 ones"), answer: "A", explanation: "In 3.047, the 4 is in the hundredths place, so its value is 4 hundredths (0.04)." },
      { text: "Which decimal is greatest: 0.45, 0.405, 0.450, 0.054?", choices: mc("0.45 and 0.450 are equal and greatest","0.405","0.054","0.45"), answer: "A", explanation: "0.45 = 0.450, and both equal 45 hundredths, which is greater than 0.405 (40.5 hundredths) and 0.054." },
      { text: "Round 4.567 to the nearest tenth.", choices: mc("4.6","4.5","4.57","5.0"), answer: "A", explanation: "Look at the hundredths digit (6). Since 6 ≥ 5, round up: 4.567 rounds to 4.6." },
      { text: "What is 2.350 written in simplest form?", choices: mc("2.35","2.350","2.3500","2.3"), answer: "A", explanation: "Trailing zeros after the last significant digit can be removed: 2.350 = 2.35." },
      { text: "Order from least to greatest: 0.3, 0.03, 0.303, 0.033", choices: mc("0.03 < 0.033 < 0.3 < 0.303","0.3 < 0.303 < 0.033 < 0.03","0.303 < 0.3 < 0.033 < 0.03","0.03 < 0.3 < 0.033 < 0.303"), answer: "A", explanation: "Compare place by place: 0.03 < 0.033 < 0.3 < 0.303." },
    ],
    2: [
      { text: "What is 4.56 + 3.78?", choices: mc("8.34","7.34","8.24","8.44"), answer: "A", explanation: "4.56 + 3.78: ones 4+3=7, tenths 5+7=12 (write 2 carry 1), ones becomes 8. Result: 8.34." },
      { text: "What is 7.20 − 3.45?", choices: mc("3.75","3.65","4.75","3.85"), answer: "A", explanation: "7.20 − 3.45 = 3.75. Regroup as needed." },
      { text: "What is 2.4 × 3?", choices: mc("7.2","6.2","7.4","8.2"), answer: "A", explanation: "2.4 × 3 = 7.2. Multiply 24 × 3 = 72, then place decimal: 7.2." },
      { text: "What is 8.4 ÷ 4?", choices: mc("2.1","2.4","1.4","2.0"), answer: "A", explanation: "8.4 ÷ 4 = 2.1. Divide 84 ÷ 4 = 21, then place decimal: 2.1." },
      { text: "A ribbon is 6.75 meters long. If you cut off 2.38 meters, how much is left?", choices: mc("4.37 meters","4.27 meters","4.47 meters","3.37 meters"), answer: "A", explanation: "6.75 − 2.38 = 4.37 meters." },
    ],
    3: [
      { text: "What is 2/3 + 1/4?", choices: mc("11/12","3/7","3/12","8/12"), answer: "A", explanation: "LCD of 3 and 4 is 12. 2/3 = 8/12, 1/4 = 3/12. 8/12 + 3/12 = 11/12." },
      { text: "What is 3/4 − 1/3?", choices: mc("5/12","2/1","2/12","1/4"), answer: "A", explanation: "LCD of 4 and 3 is 12. 3/4 = 9/12, 1/3 = 4/12. 9/12 − 4/12 = 5/12." },
      { text: "What is 2 1/2 + 1 3/4?", choices: mc("4 1/4","3 1/4","4 3/4","3 3/4"), answer: "A", explanation: "2 2/4 + 1 3/4 = 3 5/4 = 4 1/4." },
      { text: "What is 3 1/3 − 1 2/3?", choices: mc("1 2/3","2 1/3","1 1/3","2 2/3"), answer: "A", explanation: "3 1/3 − 1 2/3: Regroup 3 1/3 as 2 4/3. 2 4/3 − 1 2/3 = 1 2/3." },
      { text: "A recipe needs 2 1/4 cups of flour. You have 3 3/4 cups. How much is left after the recipe?", choices: mc("1 1/2 cups","1 1/4 cups","2 1/2 cups","1 3/4 cups"), answer: "A", explanation: "3 3/4 − 2 1/4 = 1 2/4 = 1 1/2 cups." },
    ],
    4: [
      { text: "What is 2/3 × 3/4?", choices: mc("1/2","6/12","5/12","1/4"), answer: "A", explanation: "2/3 × 3/4 = 6/12 = 1/2. Multiply numerators and denominators, then simplify." },
      { text: "What is 3 × 2/5?", choices: mc("6/5 = 1 1/5","6/15","1/5","3/10"), answer: "A", explanation: "3 × 2/5 = 6/5 = 1 1/5." },
      { text: "What is 3/4 ÷ 1/2?", choices: mc("3/2 = 1 1/2","3/8","6/4","1/4"), answer: "A", explanation: "Dividing by a fraction means multiplying by its reciprocal: 3/4 × 2/1 = 6/4 = 3/2 = 1 1/2." },
      { text: "What is 2 1/2 × 4?", choices: mc("10","8","12","9"), answer: "A", explanation: "2 1/2 × 4 = 5/2 × 4 = 20/2 = 10." },
      { text: "If you have 3/4 of a pizza and want to share it equally among 3 people, how much does each person get?", choices: mc("1/4 of the pizza","3/12","1/3","1/2"), answer: "A", explanation: "3/4 ÷ 3 = 3/4 × 1/3 = 3/12 = 1/4." },
    ],
    5: [
      { text: "What is the value of 3x + 5 when x = 4?", choices: mc("17","12","20","15"), answer: "A", explanation: "Substitute x = 4: 3(4) + 5 = 12 + 5 = 17." },
      { text: "Solve for n: n + 7 = 15", choices: mc("8","22","7","9"), answer: "A", explanation: "n + 7 = 15. Subtract 7 from both sides: n = 15 − 7 = 8." },
      { text: "Which expression represents 'three times a number decreased by 4'?", choices: mc("3n − 4","3 + n − 4","3/n − 4","4 − 3n"), answer: "A", explanation: "'Three times a number' is 3n; 'decreased by 4' means subtract 4: 3n − 4." },
      { text: "Solve: 4x = 36", choices: mc("9","32","40","144"), answer: "A", explanation: "Divide both sides by 4: x = 36 ÷ 4 = 9." },
      { text: "What is the rule for the pattern: 3, 6, 12, 24, 48?", choices: mc("Multiply by 2","Add 3","Add 6","Multiply by 3"), answer: "A", explanation: "Each term is multiplied by 2: 3×2=6, 6×2=12, 12×2=24, 24×2=48." },
    ],
    6: [
      { text: "What is the VOLUME of a rectangular prism with length 4, width 3, and height 5?", choices: mc("60 cubic units","35 cubic units","24 cubic units","47 cubic units"), answer: "A", explanation: "Volume = length × width × height = 4 × 3 × 5 = 60 cubic units." },
      { text: "How many faces does a CUBE have?", choices: mc("6","4","8","12"), answer: "A", explanation: "A cube has 6 faces, all of which are squares." },
      { text: "What is a QUADRILATERAL?", choices: mc("A polygon with 4 sides","A polygon with 3 sides","A polygon with 5 sides","A polygon with 6 sides"), answer: "A", explanation: "A quadrilateral is any polygon with exactly 4 sides and 4 angles." },
      { text: "What is the sum of angles in a TRIANGLE?", choices: mc("180°","360°","90°","270°"), answer: "A", explanation: "The sum of the interior angles of any triangle is always 180°." },
      { text: "Which 3D shape has a circular base and comes to a point?", choices: mc("Cone","Cylinder","Pyramid","Sphere"), answer: "A", explanation: "A cone has one circular base and comes to a point (apex) at the top." },
    ],
    7: [
      { text: "How many inches are in 3 feet?", choices: mc("36 inches","30 inches","24 inches","12 inches"), answer: "A", explanation: "1 foot = 12 inches, so 3 feet = 3 × 12 = 36 inches." },
      { text: "How many centimeters are in 2 meters?", choices: mc("200 cm","20 cm","2,000 cm","0.2 cm"), answer: "A", explanation: "1 meter = 100 centimeters, so 2 meters = 200 centimeters." },
      { text: "How many ounces are in 2 pounds?", choices: mc("32 ounces","20 ounces","16 ounces","24 ounces"), answer: "A", explanation: "1 pound = 16 ounces, so 2 pounds = 32 ounces." },
      { text: "Convert 3 liters to milliliters.", choices: mc("3,000 mL","300 mL","30 mL","0.3 mL"), answer: "A", explanation: "1 liter = 1,000 milliliters, so 3 liters = 3,000 milliliters." },
      { text: "A room is 15 feet long and 12 feet wide. What is its area?", choices: mc("180 square feet","54 square feet","27 square feet","90 square feet"), answer: "A", explanation: "Area = length × width = 15 × 12 = 180 square feet." },
    ],
    8: [
      { text: "What does a LINE GRAPH show?", choices: mc("Changes in data over time","Comparison of categories","Parts of a whole","Distribution of data"), answer: "A", explanation: "A line graph shows how data changes over time, with time on the x-axis and the measured value on the y-axis." },
      { text: "What is the MEAN of 4, 8, 6, 10, 2?", choices: mc("6","8","5","7"), answer: "A", explanation: "Mean = sum ÷ count = (4+8+6+10+2) ÷ 5 = 30 ÷ 5 = 6." },
      { text: "What is the MEDIAN of 3, 7, 2, 9, 5?", choices: mc("5","7","3","6"), answer: "A", explanation: "Order the data: 2, 3, 5, 7, 9. The median (middle value) is 5." },
      { text: "What is the MODE of 4, 7, 4, 9, 4, 7, 2?", choices: mc("4","7","9","2"), answer: "A", explanation: "The mode is the most frequent value. 4 appears 3 times, which is more than any other value." },
      { text: "In a frequency table, what does the FREQUENCY column show?", choices: mc("How many times each value occurs","The value itself","The percentage","The total"), answer: "A", explanation: "The frequency column shows how many times each value or category occurs in the data set." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr5ELAQuiz(uNum) {
  // reuse Grade 4 ELA quiz banks (same concepts, slightly harder)
  return getGr4ELAQuiz(uNum);
}

function getGr5SciQuiz(uNum) {
  // reuse Grade 4 Science quiz banks (same topics, slightly harder)
  return getGr4SciQuiz(uNum);
}

function getGr5SSQuiz(uNum) {
  const banks = {
    1: [
      { text: "What are the five regions of the United States?", choices: mc("Northeast, Southeast, Midwest, Southwest, West","North, South, East, West, Central","Atlantic, Pacific, Gulf, Mountain, Plains","New England, Mid-Atlantic, South, Midwest, West"), answer: "A", explanation: "The U.S. is commonly divided into five geographic regions: Northeast, Southeast, Midwest, Southwest, and West." },
      { text: "What is the MISSISSIPPI RIVER?", choices: mc("The longest river in the U.S., flowing south to the Gulf of Mexico","A river in the Northeast","A river on the West Coast","A river that forms the Canadian border"), answer: "A", explanation: "The Mississippi River is one of the longest rivers in the U.S., flowing south through the center of the country to the Gulf of Mexico." },
      { text: "What is the GREAT PLAINS?", choices: mc("A large flat grassland region in the central U.S.","A mountain range in the West","A coastal region in the East","A desert in the Southwest"), answer: "A", explanation: "The Great Plains is a large, flat grassland region in the central United States, known for farming and ranching." },
      { text: "What is the ROCKY MOUNTAINS?", choices: mc("A major mountain range in western North America","A mountain range in the East","A mountain range in the South","A mountain range in Alaska only"), answer: "A", explanation: "The Rocky Mountains are a major mountain range running through western North America from Canada to New Mexico." },
      { text: "What ocean borders the eastern United States?", choices: mc("Atlantic Ocean","Pacific Ocean","Gulf of Mexico","Arctic Ocean"), answer: "A", explanation: "The Atlantic Ocean borders the eastern United States." },
    ],
    2: [
      { text: "What did Native Americans use the buffalo for?", choices: mc("Food, clothing, shelter, and tools","Only food","Only clothing","Trade with Europeans only"), answer: "A", explanation: "Plains Native Americans used nearly every part of the buffalo for food, clothing, shelter (teepees), and tools." },
      { text: "What is the IROQUOIS CONFEDERACY?", choices: mc("An alliance of six Native American nations in the Northeast","A single tribe in the Southeast","A Plains tribe","A Southwest pueblo community"), answer: "A", explanation: "The Iroquois Confederacy (Haudenosaunee) was an alliance of six nations in the Northeast: Mohawk, Oneida, Onondaga, Cayuga, Seneca, and Tuscarora." },
      { text: "What did the Pueblo people build their homes from?", choices: mc("Adobe (mud brick)","Wood","Animal hides","Stone only"), answer: "A", explanation: "The Pueblo people of the Southwest built multi-story homes from adobe (sun-dried mud bricks) that were well-suited to the desert climate." },
      { text: "How did Native Americans in the Pacific Northwest get most of their food?", choices: mc("Fishing, especially salmon","Farming corn","Hunting buffalo","Gathering nuts and berries only"), answer: "A", explanation: "Pacific Northwest tribes relied heavily on fishing, especially salmon, which was abundant in the region's rivers." },
      { text: "What is ORAL TRADITION?", choices: mc("Passing down stories and history through spoken word","Writing history in books","Drawing pictures","Building monuments"), answer: "A", explanation: "Oral tradition is the practice of passing down stories, history, and cultural knowledge through spoken word from generation to generation." },
    ],
    3: [
      { text: "Who was Christopher Columbus?", choices: mc("An Italian explorer who sailed for Spain and reached the Americas in 1492","An English explorer","A French explorer","A Portuguese explorer who reached India"), answer: "A", explanation: "Christopher Columbus was an Italian explorer sailing for Spain who reached the Caribbean in 1492, opening the Americas to European exploration." },
      { text: "What was the COLUMBIAN EXCHANGE?", choices: mc("The transfer of plants, animals, diseases, and ideas between the Americas and Europe","A trade route between Spain and Portugal","A treaty between explorers","A type of ship"), answer: "A", explanation: "The Columbian Exchange was the transfer of plants, animals, diseases, and cultural ideas between the Americas and Europe following Columbus's voyages." },
      { text: "What were the THIRTEEN COLONIES?", choices: mc("British settlements on the East Coast of North America that became the U.S.","Spanish settlements in the Southwest","French settlements in Canada","Dutch settlements in New York only"), answer: "A", explanation: "The Thirteen Colonies were British settlements along the East Coast of North America that declared independence in 1776." },
      { text: "Why did many colonists come to America?", choices: mc("For religious freedom, economic opportunity, and a new life","Only for gold","To trade with Native Americans","To escape wars in Asia"), answer: "A", explanation: "Colonists came to America for various reasons including religious freedom, economic opportunity, and the chance to start a new life." },
      { text: "What was the MAYFLOWER COMPACT?", choices: mc("An agreement by Pilgrims to create self-government in Plymouth Colony","A treaty with Native Americans","A trade agreement with England","A ship's passenger list"), answer: "A", explanation: "The Mayflower Compact (1620) was an agreement among the Pilgrims to create a self-governing community in Plymouth Colony." },
    ],
    4: [
      { text: "What was the DECLARATION OF INDEPENDENCE?", choices: mc("A document declaring the colonies free from British rule, adopted July 4, 1776","A constitution","A treaty with Britain","A list of colonial laws"), answer: "A", explanation: "The Declaration of Independence, adopted July 4, 1776, declared the 13 colonies free from British rule and established the principles of American democracy." },
      { text: "Who wrote the Declaration of Independence?", choices: mc("Thomas Jefferson (primary author)","George Washington","Benjamin Franklin","John Adams"), answer: "A", explanation: "Thomas Jefferson was the primary author of the Declaration of Independence, with input from a committee including Franklin and Adams." },
      { text: "What was the BOSTON TEA PARTY?", choices: mc("A protest where colonists dumped British tea into Boston Harbor","A celebration of independence","A meeting of colonial leaders","A battle of the Revolution"), answer: "A", explanation: "The Boston Tea Party (1773) was a protest against British taxation in which colonists dumped 342 chests of British tea into Boston Harbor." },
      { text: "Who was George Washington?", choices: mc("Commander of the Continental Army and first U.S. President","Author of the Declaration of Independence","The last British governor of Virginia","A French general who helped the colonists"), answer: "A", explanation: "George Washington commanded the Continental Army during the Revolution and became the first President of the United States in 1789." },
      { text: "What was the BATTLE OF YORKTOWN?", choices: mc("The final major battle of the Revolution where Cornwallis surrendered","The first battle of the Revolution","A naval battle in the Atlantic","A battle in New York City"), answer: "A", explanation: "The Battle of Yorktown (1781) was the final major battle of the American Revolution, where British General Cornwallis surrendered to Washington." },
    ],
    5: [
      { text: "What is the U.S. CONSTITUTION?", choices: mc("The supreme law of the United States that establishes the government","A list of rights only","A declaration of independence","A treaty with France"), answer: "A", explanation: "The U.S. Constitution is the supreme law of the land, establishing the structure of the federal government and the rights of citizens." },
      { text: "What are the THREE BRANCHES of the U.S. government?", choices: mc("Legislative, Executive, Judicial","President, Congress, Courts","Senate, House, Supreme Court","Federal, State, Local"), answer: "A", explanation: "The U.S. government has three branches: Legislative (Congress), Executive (President), and Judicial (Supreme Court)." },
      { text: "What is the BILL OF RIGHTS?", choices: mc("The first 10 amendments to the Constitution guaranteeing individual rights","The entire Constitution","The Declaration of Independence","A list of government powers"), answer: "A", explanation: "The Bill of Rights consists of the first 10 amendments to the Constitution, protecting individual freedoms like speech, religion, and due process." },
      { text: "What does the FIRST AMENDMENT protect?", choices: mc("Freedom of religion, speech, press, assembly, and petition","The right to bear arms","Protection from unreasonable searches","The right to a jury trial"), answer: "A", explanation: "The First Amendment protects five fundamental freedoms: religion, speech, press, peaceful assembly, and petition of the government." },
      { text: "What is FEDERALISM?", choices: mc("A system where power is shared between national and state governments","A system where only the national government has power","A system where states have all the power","A type of election system"), answer: "A", explanation: "Federalism is the system of government in which power is divided between the national (federal) government and state governments." },
    ],
    6: [
      { text: "What was MANIFEST DESTINY?", choices: mc("The belief that the U.S. was destined to expand across North America","A treaty with Mexico","A type of wagon trail","A Native American belief"), answer: "A", explanation: "Manifest Destiny was the 19th-century belief that the United States was destined to expand westward across the entire North American continent." },
      { text: "What was the LOUISIANA PURCHASE?", choices: mc("The 1803 purchase of land from France that doubled the size of the U.S.","The purchase of Florida from Spain","The purchase of Alaska from Russia","A trade agreement with Louisiana"), answer: "A", explanation: "The Louisiana Purchase (1803) was the acquisition of approximately 828,000 square miles from France for $15 million, doubling the size of the U.S." },
      { text: "What was the OREGON TRAIL?", choices: mc("A 2,000-mile route used by settlers to travel from Missouri to Oregon","A trail used by Native Americans","A cattle drive route","A railroad route"), answer: "A", explanation: "The Oregon Trail was a 2,000-mile overland route used by hundreds of thousands of settlers to travel from Independence, Missouri, to Oregon." },
      { text: "What was the GOLD RUSH of 1849?", choices: mc("A mass migration to California after gold was discovered in 1848","A gold discovery in Texas","A gold rush in Alaska","A gold rush in Colorado"), answer: "A", explanation: "The California Gold Rush began after gold was discovered at Sutter's Mill in 1848, bringing over 300,000 people to California in search of fortune." },
      { text: "What was the TRANSCONTINENTAL RAILROAD?", choices: mc("A railroad connecting the East and West coasts, completed in 1869","A railroad in the South","A railroad connecting the U.S. and Canada","A railroad built before the Civil War"), answer: "A", explanation: "The Transcontinental Railroad, completed in 1869, connected the East and West coasts of the U.S., revolutionizing transportation and trade." },
    ],
    7: [
      { text: "What was the MAIN CAUSE of the Civil War?", choices: mc("The debate over slavery and states' rights","Economic differences only","A dispute over territory","A conflict with a foreign country"), answer: "A", explanation: "The Civil War was primarily caused by the debate over slavery and whether states had the right to leave the Union (secession)." },
      { text: "Who was Abraham Lincoln?", choices: mc("The 16th President who led the U.S. during the Civil War and issued the Emancipation Proclamation","A Confederate general","The president before the Civil War","The first president of the Confederacy"), answer: "A", explanation: "Abraham Lincoln was the 16th President, who led the Union during the Civil War and issued the Emancipation Proclamation freeing enslaved people in Confederate states." },
      { text: "What was the EMANCIPATION PROCLAMATION?", choices: mc("Lincoln's 1863 order declaring enslaved people in Confederate states free","The end of the Civil War","A constitutional amendment","A peace treaty"), answer: "A", explanation: "The Emancipation Proclamation (January 1, 1863) was President Lincoln's executive order declaring all enslaved people in Confederate states to be free." },
      { text: "What was RECONSTRUCTION?", choices: mc("The period after the Civil War when the South was rebuilt and formerly enslaved people gained rights","The rebuilding of Washington D.C.","The period before the Civil War","The period of westward expansion"), answer: "A", explanation: "Reconstruction (1865-1877) was the period after the Civil War when the federal government worked to rebuild the South and integrate formerly enslaved people into society." },
      { text: "What did the 13th Amendment do?", choices: mc("Abolished slavery throughout the United States","Gave women the right to vote","Gave formerly enslaved men the right to vote","Made all people born in the U.S. citizens"), answer: "A", explanation: "The 13th Amendment (1865) abolished slavery and involuntary servitude throughout the United States." },
    ],
    8: [
      { text: "What is SUPPLY AND DEMAND?", choices: mc("The economic principle that prices are determined by how much of a product is available and how much people want it","A type of government","A trade agreement","A type of tax"), answer: "A", explanation: "Supply and demand is the economic principle that prices rise when demand exceeds supply and fall when supply exceeds demand." },
      { text: "What is a MARKET ECONOMY?", choices: mc("An economy where individuals and businesses make economic decisions","An economy controlled by the government","An economy based on trade only","An economy with no money"), answer: "A", explanation: "In a market economy, individuals and businesses make most economic decisions based on supply, demand, and prices." },
      { text: "What is TAXATION?", choices: mc("Money collected by the government from citizens to fund public services","A type of trade","A government loan","A type of savings account"), answer: "A", explanation: "Taxation is the process by which the government collects money from citizens and businesses to fund public services like schools, roads, and defense." },
      { text: "What is the ROLE of the U.S. Congress?", choices: mc("To make federal laws","To enforce laws","To interpret laws","To lead the military"), answer: "A", explanation: "Congress (the Legislative branch) is responsible for making federal laws, approving the budget, and declaring war." },
      { text: "What is CIVIC RESPONSIBILITY?", choices: mc("The duties and obligations of citizens in a democratic society","A type of government","A legal punishment","A type of election"), answer: "A", explanation: "Civic responsibility includes duties like voting, obeying laws, paying taxes, and participating in community life." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr5TechQuiz(uNum) {
  return getGr4TechQuiz(uNum);
}

function getGr4KAPMathQuiz(uNum) {
  const banks = {
    1: [
      { text: "What are the FACTORS of 36?", choices: mc("1, 2, 3, 4, 6, 9, 12, 18, 36","1, 2, 4, 6, 9, 36","2, 3, 4, 6, 9, 12","1, 2, 3, 6, 9, 18"), answer: "A", explanation: "The factors of 36 are all numbers that divide evenly into 36: 1, 2, 3, 4, 6, 9, 12, 18, 36." },
      { text: "Which number is PRIME?", choices: mc("37","39","51","57"), answer: "A", explanation: "37 is prime because its only factors are 1 and 37. 39=3×13, 51=3×17, 57=3×19." },
      { text: "What is the LCM of 4 and 6?", choices: mc("12","24","6","18"), answer: "A", explanation: "The LCM (Least Common Multiple) of 4 and 6 is 12, the smallest number divisible by both." },
      { text: "What is the GCF of 24 and 36?", choices: mc("12","6","4","24"), answer: "A", explanation: "The GCF (Greatest Common Factor) of 24 and 36 is 12, the largest number that divides both evenly." },
      { text: "What pattern do SQUARE NUMBERS follow?", choices: mc("1, 4, 9, 16, 25, 36...","1, 2, 4, 8, 16...","2, 4, 6, 8, 10...","1, 3, 6, 10, 15..."), answer: "A", explanation: "Square numbers are products of a number multiplied by itself: 1²=1, 2²=4, 3²=9, 4²=16, 5²=25..." },
    ],
    2: [
      { text: "A store sells 3 types of sandwiches and 4 types of drinks. How many different meal combinations are possible?", choices: mc("12","7","9","16"), answer: "A", explanation: "Multiply the number of choices: 3 × 4 = 12 combinations (Fundamental Counting Principle)." },
      { text: "What is 456 × 78?", choices: mc("35,568","34,568","36,568","35,468"), answer: "A", explanation: "456 × 78 = 456 × 70 + 456 × 8 = 31,920 + 3,648 = 35,568." },
      { text: "A rectangle has area 360 sq cm and width 15 cm. What is its length?", choices: mc("24 cm","20 cm","30 cm","18 cm"), answer: "A", explanation: "Length = Area ÷ Width = 360 ÷ 15 = 24 cm." },
      { text: "If a car travels 65 miles per hour for 4 hours, how far does it travel?", choices: mc("260 miles","240 miles","280 miles","300 miles"), answer: "A", explanation: "Distance = rate × time = 65 × 4 = 260 miles." },
      { text: "What is the missing number: 48 × ? = 2,880", choices: mc("60","50","70","55"), answer: "A", explanation: "2,880 ÷ 48 = 60. Check: 48 × 60 = 2,880." },
    ],
    3: [
      { text: "What is 5/6 − 1/4?", choices: mc("7/12","4/2","1/3","2/3"), answer: "A", explanation: "LCD of 6 and 4 is 12. 5/6 = 10/12, 1/4 = 3/12. 10/12 − 3/12 = 7/12." },
      { text: "Order from least to greatest: 3/4, 5/6, 2/3, 7/12", choices: mc("7/12 < 2/3 < 3/4 < 5/6","2/3 < 7/12 < 3/4 < 5/6","5/6 < 3/4 < 2/3 < 7/12","7/12 < 3/4 < 2/3 < 5/6"), answer: "A", explanation: "Convert to 12ths: 7/12, 8/12, 9/12, 10/12. So 7/12 < 2/3 < 3/4 < 5/6." },
      { text: "What is 3 2/5 + 2 4/5?", choices: mc("6 1/5","5 6/5","6 6/5","5 1/5"), answer: "A", explanation: "3 2/5 + 2 4/5 = 5 6/5 = 5 + 1 1/5 = 6 1/5." },
      { text: "A rope is 8 3/4 feet long. You cut off 3 1/2 feet. How much remains?", choices: mc("5 1/4 feet","5 1/2 feet","4 3/4 feet","5 3/4 feet"), answer: "A", explanation: "8 3/4 − 3 2/4 = 5 1/4 feet." },
      { text: "What fraction of 60 is 45?", choices: mc("3/4","2/3","4/5","1/2"), answer: "A", explanation: "45/60 = 3/4 in simplest form (divide both by 15)." },
    ],
    4: [
      { text: "What is 0.7 × 0.8?", choices: mc("0.56","5.6","0.056","56"), answer: "A", explanation: "0.7 × 0.8 = 0.56. Multiply 7 × 8 = 56, then place 2 decimal places." },
      { text: "What percent is equivalent to 3/5?", choices: mc("60%","35%","53%","65%"), answer: "A", explanation: "3/5 = 0.6 = 60%." },
      { text: "What is 25% of 80?", choices: mc("20","25","15","30"), answer: "A", explanation: "25% = 1/4. 80 ÷ 4 = 20." },
      { text: "A shirt costs $40. It is on sale for 20% off. What is the sale price?", choices: mc("$32","$28","$36","$30"), answer: "A", explanation: "20% of $40 = $8 discount. $40 − $8 = $32." },
      { text: "What decimal is equivalent to 7/8?", choices: mc("0.875","0.78","0.87","0.785"), answer: "A", explanation: "7 ÷ 8 = 0.875." },
    ],
    5: [
      { text: "What is the value of 2x − 3 when x = 7?", choices: mc("11","17","14","9"), answer: "A", explanation: "2(7) − 3 = 14 − 3 = 11." },
      { text: "Solve: 3n + 5 = 20", choices: mc("5","8","15","7"), answer: "A", explanation: "3n = 20 − 5 = 15; n = 5." },
      { text: "Which expression shows 'twice a number plus 7 equals 19'?", choices: mc("2n + 7 = 19","2 + 7n = 19","2n − 7 = 19","7n + 2 = 19"), answer: "A", explanation: "'Twice a number' = 2n; 'plus 7' = +7; 'equals 19' = =19. So 2n + 7 = 19." },
      { text: "What is the next term in the sequence: 2, 5, 10, 17, 26, ?", choices: mc("37","35","33","39"), answer: "A", explanation: "Differences: +3, +5, +7, +9, +11. Next term: 26 + 11 = 37." },
      { text: "If y = 3x + 1, what is y when x = 4?", choices: mc("13","12","14","10"), answer: "A", explanation: "y = 3(4) + 1 = 12 + 1 = 13." },
    ],
    6: [
      { text: "What is the REFLECTION of a shape?", choices: mc("A mirror image of the shape across a line","A rotation of the shape","A larger version of the shape","A moved version of the shape"), answer: "A", explanation: "A reflection creates a mirror image of a shape across a line of reflection." },
      { text: "What are COORDINATES used for?", choices: mc("To locate points on a coordinate plane","To measure angles","To calculate area","To identify shapes"), answer: "A", explanation: "Coordinates (x, y) are used to locate specific points on a coordinate plane." },
      { text: "What is a TRANSLATION in geometry?", choices: mc("Sliding a shape to a new position without rotating or flipping","Flipping a shape","Rotating a shape","Resizing a shape"), answer: "A", explanation: "A translation slides a shape to a new position without changing its size, shape, or orientation." },
      { text: "How many lines of symmetry does a regular hexagon have?", choices: mc("6","3","4","2"), answer: "A", explanation: "A regular hexagon has 6 lines of symmetry — 3 through opposite vertices and 3 through midpoints of opposite sides." },
      { text: "What is the PERIMETER of a regular pentagon with side length 7 cm?", choices: mc("35 cm","28 cm","42 cm","49 cm"), answer: "A", explanation: "Perimeter of a regular pentagon = 5 × side = 5 × 7 = 35 cm." },
    ],
    7: [
      { text: "A rectangle has perimeter 48 cm and length 14 cm. What is its width?", choices: mc("10 cm","12 cm","8 cm","20 cm"), answer: "A", explanation: "P = 2(l + w). 48 = 2(14 + w). 24 = 14 + w. w = 10 cm." },
      { text: "What is the area of a triangle with base 12 cm and height 8 cm?", choices: mc("48 cm²","96 cm²","40 cm²","24 cm²"), answer: "A", explanation: "Area of triangle = (base × height) ÷ 2 = (12 × 8) ÷ 2 = 96 ÷ 2 = 48 cm²." },
      { text: "A data set has values 12, 15, 18, 21, 24. What is the mean?", choices: mc("18","15","21","20"), answer: "A", explanation: "Mean = (12+15+18+21+24) ÷ 5 = 90 ÷ 5 = 18." },
      { text: "What is the RANGE of 45, 23, 67, 12, 89?", choices: mc("77","45","67","89"), answer: "A", explanation: "Range = maximum − minimum = 89 − 12 = 77." },
      { text: "Convert 2.5 km to meters.", choices: mc("2,500 m","250 m","25 m","25,000 m"), answer: "A", explanation: "1 km = 1,000 m. 2.5 × 1,000 = 2,500 m." },
    ],
    8: [
      { text: "A student claims 'all squares are rectangles.' Is this TRUE or FALSE?", choices: mc("True — a square meets all requirements of a rectangle","False — squares have equal sides","False — they are different shapes","True — but only for large squares"), answer: "A", explanation: "True. A rectangle has 4 right angles and opposite sides equal. A square has all these properties plus equal sides, so all squares are rectangles." },
      { text: "What is wrong with this solution: 4 + 3 × 2 = 14?", choices: mc("Multiplication should be done before addition: 3×2=6, then 4+6=10","Nothing is wrong","Addition should be done first","The answer should be 11"), answer: "A", explanation: "Order of operations (PEMDAS): multiplication before addition. 4 + (3×2) = 4 + 6 = 10, not 14." },
      { text: "If a pattern adds 5 each time, and the 1st term is 3, what is the 10th term?", choices: mc("48","50","45","53"), answer: "A", explanation: "Term n = 3 + (n-1)×5. Term 10 = 3 + 9×5 = 3 + 45 = 48." },
      { text: "Two students each solve 3/4 + 1/3. Student A gets 13/12. Student B gets 4/7. Who is correct?", choices: mc("Student A: LCD=12, 9/12+4/12=13/12","Student B: add numerators and denominators","Both are wrong","Neither is correct"), answer: "A", explanation: "Student A is correct. To add fractions, find a common denominator. LCD of 4 and 3 is 12: 9/12 + 4/12 = 13/12." },
      { text: "A store buys items for $15 each and sells them for $24. What is the profit per item?", choices: mc("$9","$6","$15","$24"), answer: "A", explanation: "Profit = selling price − cost = $24 − $15 = $9 per item." },
    ],
  };
  return banks[uNum] || banks[1];
}

function getGr5KAPMathQuiz(uNum) {
  return getGr4KAPMathQuiz(uNum);
}

function getGr4KAPELAQuiz(uNum) {
  return getGr4ELAQuiz(uNum);
}

function getGr5KAPELAQuiz(uNum) {
  return getGr4ELAQuiz(uNum);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC QUESTION BANKS (30 questions per course)
// ═══════════════════════════════════════════════════════════════════════════════

function makeGr4MathDiagQ(i, text, choices, answer, unit, skill, diff, explanation) {
  return { text, choices, answer, unit, skill, diff, explanation };
}

function getGr4MathDiag() {
  return [
    { text: "What is the value of the digit 5 in 2,543,678?", choices: mc("500,000","50,000","5,000,000","5,000"), answer: "A", unit: 1, skill: "G4MATH-U1-S1", diff: "easy", explanation: "The 5 is in the hundred-thousands place: 500,000." },
    { text: "What is 1,000,000 written in words?", choices: mc("One million","One thousand","One billion","One hundred thousand"), answer: "A", unit: 1, skill: "G4MATH-U1-S1", diff: "easy", explanation: "1,000,000 = one million." },
    { text: "Which number is 10,000 more than 345,678?", choices: mc("355,678","346,678","345,778","445,678"), answer: "A", unit: 1, skill: "G4MATH-U1-S2", diff: "medium", explanation: "Adding 10,000 to 345,678 increases the ten-thousands digit: 355,678." },
    { text: "What is 6,789 + 4,356?", choices: mc("11,145","10,145","11,045","11,245"), answer: "A", unit: 2, skill: "G4MATH-U2-S1", diff: "easy", explanation: "6,789 + 4,356 = 11,145." },
    { text: "What is 9,002 − 3,456?", choices: mc("5,546","5,456","5,646","6,546"), answer: "A", unit: 2, skill: "G4MATH-U2-S1", diff: "medium", explanation: "9,002 − 3,456 = 5,546. Use regrouping." },
    { text: "What is 45 × 23?", choices: mc("1,035","935","1,135","1,025"), answer: "A", unit: 3, skill: "G4MATH-U3-S1", diff: "easy", explanation: "45 × 23 = 45 × 20 + 45 × 3 = 900 + 135 = 1,035." },
    { text: "What is 312 × 4?", choices: mc("1,248","1,148","1,348","1,208"), answer: "A", unit: 3, skill: "G4MATH-U3-S1", diff: "easy", explanation: "312 × 4 = 1,248." },
    { text: "What is 2,856 ÷ 8?", choices: mc("357","347","367","457"), answer: "A", unit: 4, skill: "G4MATH-U4-S1", diff: "easy", explanation: "2,856 ÷ 8 = 357. Check: 357 × 8 = 2,856." },
    { text: "A school has 945 students in 15 equal classes. How many students per class?", choices: mc("63","53","73","60"), answer: "A", unit: 4, skill: "G4MATH-U4-S2", diff: "medium", explanation: "945 ÷ 15 = 63." },
    { text: "Which fraction is equivalent to 4/6?", choices: mc("2/3","4/8","1/3","3/4"), answer: "A", unit: 5, skill: "G4MATH-U5-S1", diff: "easy", explanation: "4/6 = 2/3 (divide both by 2)." },
    { text: "What is 1/4 + 2/4?", choices: mc("3/4","3/8","2/8","1/2"), answer: "A", unit: 5, skill: "G4MATH-U5-S1", diff: "easy", explanation: "1/4 + 2/4 = 3/4 (same denominator, add numerators)." },
    { text: "What is 3/4 − 1/4?", choices: mc("2/4 = 1/2","2/8","1/4","4/4"), answer: "A", unit: 5, skill: "G4MATH-U5-S2", diff: "easy", explanation: "3/4 − 1/4 = 2/4 = 1/2." },
    { text: "What decimal represents 4 tenths?", choices: mc("0.4","4.0","0.04","40"), answer: "A", unit: 6, skill: "G4MATH-U6-S1", diff: "easy", explanation: "4 tenths = 0.4 (one place to the right of the decimal point)." },
    { text: "Which decimal is greater: 0.7 or 0.68?", choices: mc("0.7","0.68","They are equal","Cannot be determined"), answer: "A", unit: 6, skill: "G4MATH-U6-S1", diff: "easy", explanation: "0.7 = 0.70 > 0.68 because 70 hundredths > 68 hundredths." },
    { text: "What is the area of a rectangle 9 cm × 6 cm?", choices: mc("54 cm²","30 cm²","15 cm²","45 cm²"), answer: "A", unit: 7, skill: "G4MATH-U7-S1", diff: "easy", explanation: "Area = 9 × 6 = 54 cm²." },
    { text: "What is the perimeter of a rectangle 8 m × 5 m?", choices: mc("26 m","40 m","13 m","24 m"), answer: "A", unit: 7, skill: "G4MATH-U7-S1", diff: "easy", explanation: "Perimeter = 2(8 + 5) = 2(13) = 26 m." },
    { text: "An angle that is greater than 90° but less than 180° is called:", choices: mc("Obtuse","Acute","Right","Straight"), answer: "A", unit: 7, skill: "G4MATH-U7-S2", diff: "medium", explanation: "An obtuse angle measures between 90° and 180°." },
    { text: "What is the mode of: 5, 3, 7, 5, 9, 5, 3?", choices: mc("5","3","7","9"), answer: "A", unit: 8, skill: "G4MATH-U8-S1", diff: "easy", explanation: "The mode is the most frequent value. 5 appears 3 times." },
    { text: "What is the range of: 12, 7, 19, 4, 15?", choices: mc("15","12","19","7"), answer: "A", unit: 8, skill: "G4MATH-U8-S1", diff: "easy", explanation: "Range = max − min = 19 − 4 = 15." },
    { text: "What is 2,345 + 6,789?", choices: mc("9,134","8,134","9,034","9,234"), answer: "A", unit: 2, skill: "G4MATH-U2-S3", diff: "medium", explanation: "2,345 + 6,789 = 9,134." },
    { text: "What is 5,000 − 2,347?", choices: mc("2,653","2,753","2,543","3,653"), answer: "A", unit: 2, skill: "G4MATH-U2-S3", diff: "medium", explanation: "5,000 − 2,347 = 2,653. Use regrouping." },
    { text: "What is 123 × 7?", choices: mc("861","761","871","961"), answer: "A", unit: 3, skill: "G4MATH-U3-S3", diff: "medium", explanation: "123 × 7 = 861." },
    { text: "What is 4,500 ÷ 9?", choices: mc("500","400","450","600"), answer: "A", unit: 4, skill: "G4MATH-U4-S3", diff: "medium", explanation: "4,500 ÷ 9 = 500." },
    { text: "What is 1 3/8 + 2 5/8?", choices: mc("4","3 8/8","3 1/2","4 1/8"), answer: "A", unit: 5, skill: "G4MATH-U5-S3", diff: "medium", explanation: "1 3/8 + 2 5/8 = 3 8/8 = 4." },
    { text: "What is 0.45 + 0.38?", choices: mc("0.83","0.73","0.93","0.84"), answer: "A", unit: 6, skill: "G4MATH-U6-S3", diff: "medium", explanation: "0.45 + 0.38 = 0.83." },
    { text: "How many yards are in 12 feet?", choices: mc("4 yards","3 yards","6 yards","36 yards"), answer: "A", unit: 7, skill: "G4MATH-U7-S3", diff: "medium", explanation: "1 yard = 3 feet. 12 ÷ 3 = 4 yards." },
    { text: "A bar graph shows test scores: 70, 80, 90, 80, 70, 80. What is the median?", choices: mc("80","70","90","78"), answer: "A", unit: 8, skill: "G4MATH-U8-S3", diff: "medium", explanation: "Order: 70, 70, 80, 80, 80, 90. Median = average of 3rd and 4th = (80+80)/2 = 80." },
    { text: "What is 3/5 of 40?", choices: mc("24","20","30","15"), answer: "A", unit: 5, skill: "G4MATH-U5-S3", diff: "hard", explanation: "3/5 × 40 = 3 × 8 = 24." },
    { text: "A store sold 1,248 items in 4 weeks equally. How many per week?", choices: mc("312","322","302","412"), answer: "A", unit: 4, skill: "G4MATH-U4-S3", diff: "hard", explanation: "1,248 ÷ 4 = 312 items per week." },
    { text: "What is the value of 5² (5 squared)?", choices: mc("25","10","15","50"), answer: "A", unit: 1, skill: "G4MATH-U1-S3", diff: "hard", explanation: "5² = 5 × 5 = 25." },
  ];
}

function getGr4ELADiag() {
  return [
    { text: "What is the THEME of a story?", choices: mc("The central message or lesson","The main character","The setting","The plot"), answer: "A", unit: 1, skill: "G4ELA-U1-S1", diff: "easy", explanation: "Theme is the central message or lesson the author wants to convey." },
    { text: "What is the SETTING of a story?", choices: mc("The time and place where the story happens","The main character","The conflict","The theme"), answer: "A", unit: 1, skill: "G4ELA-U1-S1", diff: "easy", explanation: "Setting is the time and place in which a story takes place." },
    { text: "What is the PLOT of a story?", choices: mc("The sequence of events in a story","The main character's traits","The setting","The theme"), answer: "A", unit: 1, skill: "G4ELA-U1-S1", diff: "easy", explanation: "Plot is the sequence of events that make up the story." },
    { text: "What is the CONFLICT in a story?", choices: mc("The main problem or struggle","The setting","The theme","The resolution"), answer: "A", unit: 1, skill: "G4ELA-U1-S2", diff: "easy", explanation: "Conflict is the main problem or struggle that drives the story forward." },
    { text: "What is the MAIN IDEA of an informational text?", choices: mc("The most important point the author makes","A supporting detail","The title","The conclusion"), answer: "A", unit: 2, skill: "G4ELA-U2-S1", diff: "easy", explanation: "The main idea is the central, most important point of the text." },
    { text: "What is a SUPPORTING DETAIL?", choices: mc("A fact or example that explains the main idea","The main idea","The title","The author's name"), answer: "A", unit: 2, skill: "G4ELA-U2-S1", diff: "easy", explanation: "Supporting details are facts, examples, and explanations that develop the main idea." },
    { text: "The prefix 'pre-' means:", choices: mc("Before","After","Again","Not"), answer: "A", unit: 3, skill: "G4ELA-U3-S1", diff: "easy", explanation: "The prefix 'pre-' means 'before' (e.g., preview = see before, prehistoric = before history)." },
    { text: "What is a SYNONYM?", choices: mc("A word with the same or similar meaning","A word with the opposite meaning","A word that sounds the same","A word's definition"), answer: "A", unit: 3, skill: "G4ELA-U3-S1", diff: "easy", explanation: "A synonym is a word with the same or similar meaning (e.g., happy/joyful)." },
    { text: "What is an ANTONYM?", choices: mc("A word with the opposite meaning","A word with the same meaning","A word that sounds the same","A word's root"), answer: "A", unit: 3, skill: "G4ELA-U3-S2", diff: "easy", explanation: "An antonym is a word with the opposite meaning (e.g., hot/cold)." },
    { text: "What is a NARRATIVE essay?", choices: mc("A story that describes personal experiences","An essay that informs","An essay that persuades","A research report"), answer: "A", unit: 4, skill: "G4ELA-U4-S1", diff: "easy", explanation: "A narrative essay tells a story, often based on personal experience." },
    { text: "What is the PURPOSE of a TOPIC SENTENCE?", choices: mc("To introduce the main idea of a paragraph","To conclude the essay","To provide evidence","To add a transition"), answer: "A", unit: 5, skill: "G4ELA-U5-S1", diff: "easy", explanation: "A topic sentence introduces the main idea of a paragraph." },
    { text: "What is a THESIS STATEMENT?", choices: mc("The main argument of an essay","The first sentence","A supporting detail","The conclusion"), answer: "A", unit: 5, skill: "G4ELA-U5-S1", diff: "medium", explanation: "A thesis statement is the main argument or central claim of an essay." },
    { text: "What is a CLAIM in persuasive writing?", choices: mc("The writer's main argument or position","A fact","An opposing viewpoint","A transition"), answer: "A", unit: 6, skill: "G4ELA-U6-S1", diff: "medium", explanation: "A claim is the writer's main argument or position in persuasive writing." },
    { text: "What is EVIDENCE in an argument?", choices: mc("Facts and examples that support the claim","The writer's opinion","The conclusion","The introduction"), answer: "A", unit: 6, skill: "G4ELA-U6-S1", diff: "medium", explanation: "Evidence includes facts, statistics, and examples that support the claim." },
    { text: "Which sentence is GRAMMATICALLY CORRECT?", choices: mc("She and I went to the store.","Her and me went to the store.","She and me went to the store.","Her and I went to the store."), answer: "A", unit: 7, skill: "G4ELA-U7-S1", diff: "medium", explanation: "Use subject pronouns (I, she) as the subject of a sentence." },
    { text: "What is a COMPOUND SENTENCE?", choices: mc("Two independent clauses joined by a conjunction","A sentence with one clause","A sentence with a dependent clause","A sentence with many adjectives"), answer: "A", unit: 7, skill: "G4ELA-U7-S1", diff: "medium", explanation: "A compound sentence joins two independent clauses with a coordinating conjunction." },
    { text: "What is the correct PUNCTUATION for a list of three items?", choices: mc("Commas between each item","Semicolons between each item","No punctuation needed","Colons between each item"), answer: "A", unit: 7, skill: "G4ELA-U7-S2", diff: "medium", explanation: "Items in a list of three or more are separated by commas (e.g., red, white, and blue)." },
    { text: "What is a PRIMARY SOURCE?", choices: mc("An original document from the time period","A textbook","A summary","A documentary"), answer: "A", unit: 8, skill: "G4ELA-U8-S1", diff: "medium", explanation: "A primary source is an original document or firsthand account from the time period." },
    { text: "What does it mean to PARAPHRASE?", choices: mc("To restate information in your own words","To copy text exactly","To summarize briefly","To quote directly"), answer: "A", unit: 8, skill: "G4ELA-U8-S1", diff: "medium", explanation: "Paraphrasing means restating someone else's ideas in your own words." },
    { text: "What is PERSONIFICATION?", choices: mc("Giving human qualities to non-human things","Comparing two things using 'like'","Repeating the same sound","Exaggerating for effect"), answer: "A", unit: 1, skill: "G4ELA-U1-S3", diff: "medium", explanation: "Personification gives human characteristics to animals, objects, or ideas." },
    { text: "What is a METAPHOR?", choices: mc("A direct comparison without 'like' or 'as'","A comparison using 'like' or 'as'","A repeated sound","An exaggeration"), answer: "A", unit: 1, skill: "G4ELA-U1-S3", diff: "medium", explanation: "A metaphor directly compares two things without using 'like' or 'as' (e.g., 'Life is a journey')." },
    { text: "What is ALLITERATION?", choices: mc("Repetition of the same consonant sound at the beginning of words","Repetition of vowel sounds","A comparison using 'like'","An exaggeration"), answer: "A", unit: 1, skill: "G4ELA-U1-S3", diff: "hard", explanation: "Alliteration is the repetition of the same consonant sound at the beginning of nearby words (e.g., 'Peter Piper picked')." },
    { text: "What is the AUTHOR'S PURPOSE when writing to persuade?", choices: mc("To convince the reader to agree with a viewpoint","To inform about a topic","To entertain with a story","To describe an event"), answer: "A", unit: 2, skill: "G4ELA-U2-S3", diff: "medium", explanation: "When an author writes to persuade, their purpose is to convince the reader to accept their viewpoint." },
    { text: "What is CAUSE AND EFFECT text structure?", choices: mc("Explains why something happened and what resulted","Describes events in time order","Compares two topics","Presents a problem and solution"), answer: "A", unit: 2, skill: "G4ELA-U2-S3", diff: "hard", explanation: "Cause and effect text structure explains the reasons (causes) for events and their results (effects)." },
    { text: "What is the CONNOTATION of a word?", choices: mc("The emotional feeling or association a word carries","The dictionary definition","The word's origin","The word's spelling"), answer: "A", unit: 3, skill: "G4ELA-U3-S3", diff: "hard", explanation: "Connotation is the emotional or cultural association a word carries beyond its literal definition." },
    { text: "What is a COMPLEX SENTENCE?", choices: mc("A sentence with an independent clause and a dependent clause","A sentence with two independent clauses","A very long sentence","A sentence with many adjectives"), answer: "A", unit: 7, skill: "G4ELA-U7-S3", diff: "hard", explanation: "A complex sentence contains one independent clause and at least one dependent clause." },
    { text: "What is POINT OF VIEW in third-person limited?", choices: mc("The narrator knows the thoughts of only one character","The narrator knows all characters' thoughts","The narrator is a character in the story","The narrator has no access to thoughts"), answer: "A", unit: 1, skill: "G4ELA-U1-S3", diff: "hard", explanation: "In third-person limited, the narrator knows only the thoughts and feelings of one character." },
    { text: "What is FORESHADOWING?", choices: mc("Hints about what will happen later in the story","A flashback to the past","A comparison using 'like'","Repeating a sound"), answer: "A", unit: 1, skill: "G4ELA-U1-S3", diff: "hard", explanation: "Foreshadowing is when an author gives hints or clues about events that will happen later in the story." },
    { text: "What is the difference between FACT and OPINION?", choices: mc("A fact can be proven; an opinion is a personal belief","A fact is always true; an opinion is always false","A fact is from a book; an opinion is from a person","There is no difference"), answer: "A", unit: 2, skill: "G4ELA-U2-S3", diff: "hard", explanation: "A fact is a statement that can be proven true or false. An opinion is a personal belief or judgment." },
    { text: "What is VOICE in writing?", choices: mc("The unique style and personality of the writer","The volume of speech","The type of narrator","The grammar of the writing"), answer: "A", unit: 4, skill: "G4ELA-U4-S3", diff: "hard", explanation: "Voice is the distinctive style, tone, and personality that comes through in a writer's work." },
  ];
}

function getGr4SciDiag() {
  return [
    { text: "What is a HYPOTHESIS?", choices: mc("An educated, testable prediction","A proven fact","A conclusion","An observation"), answer: "A", unit: 1, skill: "G4SCI-U1-S1", diff: "easy", explanation: "A hypothesis is an educated, testable prediction about the outcome of an experiment." },
    { text: "What tool measures MASS?", choices: mc("Balance scale","Ruler","Thermometer","Graduated cylinder"), answer: "A", unit: 1, skill: "G4SCI-U1-S1", diff: "easy", explanation: "A balance scale measures mass." },
    { text: "What is a PHYSICAL PROPERTY?", choices: mc("A characteristic observed without changing the substance","A change that creates new substances","The weight of an object","The temperature"), answer: "A", unit: 2, skill: "G4SCI-U2-S1", diff: "easy", explanation: "Physical properties can be observed or measured without changing the substance's identity." },
    { text: "What is a CHEMICAL CHANGE?", choices: mc("A change that creates a new substance","Melting ice","Cutting paper","Dissolving salt"), answer: "A", unit: 2, skill: "G4SCI-U2-S1", diff: "easy", explanation: "A chemical change produces new substances with different properties (e.g., burning, rusting)." },
    { text: "What are the three states of matter?", choices: mc("Solid, liquid, gas","Hot, warm, cold","Hard, soft, liquid","Heavy, light, medium"), answer: "A", unit: 2, skill: "G4SCI-U2-S1", diff: "easy", explanation: "The three common states of matter are solid, liquid, and gas." },
    { text: "What form of energy does the Sun produce?", choices: mc("Light and heat","Electrical","Chemical","Mechanical"), answer: "A", unit: 3, skill: "G4SCI-U3-S1", diff: "easy", explanation: "The Sun produces light (radiant) and heat (thermal) energy." },
    { text: "What is a good CONDUCTOR of electricity?", choices: mc("Copper","Rubber","Wood","Plastic"), answer: "A", unit: 3, skill: "G4SCI-U3-S1", diff: "easy", explanation: "Copper is an excellent conductor of electricity." },
    { text: "What is GRAVITY?", choices: mc("A force that pulls objects toward each other","A force that pushes objects apart","The speed of an object","The mass of an object"), answer: "A", unit: 4, skill: "G4SCI-U4-S1", diff: "easy", explanation: "Gravity is the force of attraction between objects with mass." },
    { text: "What is FRICTION?", choices: mc("A force that resists motion between surfaces","A force that speeds up objects","The weight of an object","The direction of motion"), answer: "A", unit: 4, skill: "G4SCI-U4-S1", diff: "easy", explanation: "Friction is a force that opposes motion when two surfaces rub together." },
    { text: "What causes WEATHERING?", choices: mc("Wind, water, and temperature changes","Earthquakes","Volcanoes","Gravity alone"), answer: "A", unit: 5, skill: "G4SCI-U5-S1", diff: "easy", explanation: "Weathering is caused by physical and chemical forces like wind, water, and temperature changes." },
    { text: "What is EROSION?", choices: mc("Movement of weathered material","Breaking down of rocks","Formation of new rocks","Melting of glaciers"), answer: "A", unit: 5, skill: "G4SCI-U5-S1", diff: "easy", explanation: "Erosion is the transportation of weathered material by wind, water, or ice." },
    { text: "What is the WATER CYCLE?", choices: mc("Continuous movement of water through Earth's systems","Daily weather patterns","Amount of water in the ocean","Flow of rivers"), answer: "A", unit: 6, skill: "G4SCI-U6-S1", diff: "easy", explanation: "The water cycle is the continuous movement of water through evaporation, condensation, and precipitation." },
    { text: "What is EVAPORATION?", choices: mc("Liquid water changing to water vapor","Water vapor changing to liquid","Ice melting","Rain falling"), answer: "A", unit: 6, skill: "G4SCI-U6-S1", diff: "easy", explanation: "Evaporation is liquid water converting to water vapor through heat." },
    { text: "What is an ADAPTATION?", choices: mc("A trait that helps an organism survive","A change in weather","A type of food","A habitat"), answer: "A", unit: 7, skill: "G4SCI-U7-S1", diff: "easy", explanation: "An adaptation is a trait that helps an organism survive in its environment." },
    { text: "What is a PRODUCER in a food chain?", choices: mc("A plant that makes its own food","An animal that eats plants","An animal that eats other animals","A decomposer"), answer: "A", unit: 7, skill: "G4SCI-U7-S1", diff: "easy", explanation: "Producers (plants) make their own food through photosynthesis." },
    { text: "What causes DAY and NIGHT?", choices: mc("Earth's rotation on its axis","Earth's revolution around the Sun","The Moon's orbit","The tilt of Earth's axis"), answer: "A", unit: 8, skill: "G4SCI-U8-S1", diff: "easy", explanation: "Day and night are caused by Earth rotating on its axis every 24 hours." },
    { text: "What causes the SEASONS?", choices: mc("The tilt of Earth's axis","Earth's rotation","Distance from the Sun","The Moon's phases"), answer: "A", unit: 8, skill: "G4SCI-U8-S1", diff: "medium", explanation: "Seasons are caused by Earth's tilted axis as it revolves around the Sun." },
    { text: "Which is an example of a PHYSICAL CHANGE?", choices: mc("Cutting paper","Burning wood","Rusting iron","Cooking an egg"), answer: "A", unit: 2, skill: "G4SCI-U2-S3", diff: "medium", explanation: "Cutting paper is a physical change — the paper changes shape but no new substance is created." },
    { text: "What is PHOTOSYNTHESIS?", choices: mc("Plants use sunlight to make food","Animals eating plants","The water cycle","Decomposition"), answer: "A", unit: 7, skill: "G4SCI-U7-S2", diff: "medium", explanation: "Photosynthesis is the process by which plants use sunlight, water, and CO₂ to produce food and oxygen." },
    { text: "What is a FOOD WEB?", choices: mc("A diagram of feeding relationships in an ecosystem","A spider's web","A type of habitat","A list of animals"), answer: "A", unit: 7, skill: "G4SCI-U7-S2", diff: "medium", explanation: "A food web shows the complex feeding relationships between organisms in an ecosystem." },
    { text: "What is CONDENSATION?", choices: mc("Water vapor changing to liquid water","Liquid water changing to vapor","Ice forming","Rain falling"), answer: "A", unit: 6, skill: "G4SCI-U6-S2", diff: "medium", explanation: "Condensation is water vapor cooling and changing back into liquid water droplets." },
    { text: "What is DENSITY?", choices: mc("Mass per unit volume","Weight of an object","Size of an object","Color of a substance"), answer: "A", unit: 2, skill: "G4SCI-U2-S3", diff: "medium", explanation: "Density = mass ÷ volume. It measures how much mass is packed into a given space." },
    { text: "What is a DECOMPOSER?", choices: mc("An organism that breaks down dead matter","A plant","A predator","An herbivore"), answer: "A", unit: 7, skill: "G4SCI-U7-S3", diff: "medium", explanation: "Decomposers (fungi, bacteria) break down dead organisms and return nutrients to the soil." },
    { text: "What is DEPOSITION?", choices: mc("Dropping of sediment in a new location","Breaking of rocks","Movement of water","Formation of mountains"), answer: "A", unit: 5, skill: "G4SCI-U5-S3", diff: "medium", explanation: "Deposition occurs when the agent of erosion loses energy and drops the sediment it was carrying." },
    { text: "What is CLIMATE?", choices: mc("Average weather conditions over a long period","Today's weather","A single storm","Current temperature"), answer: "A", unit: 6, skill: "G4SCI-U6-S3", diff: "medium", explanation: "Climate is the average weather pattern of a region over many years." },
    { text: "What is ENERGY TRANSFORMATION?", choices: mc("Energy changing from one form to another","Energy disappearing","Energy doubling","Energy staying the same"), answer: "A", unit: 3, skill: "G4SCI-U3-S3", diff: "hard", explanation: "Energy transformation is the conversion of energy from one form to another (e.g., solar to electrical)." },
    { text: "What is the ROCK CYCLE?", choices: mc("The continuous process by which rocks form, change, and reform","The water cycle","The food chain","The carbon cycle"), answer: "A", unit: 5, skill: "G4SCI-U5-S3", diff: "hard", explanation: "The rock cycle describes how rocks continuously change between igneous, sedimentary, and metamorphic forms." },
    { text: "What is a RENEWABLE resource?", choices: mc("A resource that can be replenished naturally","A resource that runs out","A type of fossil fuel","A manufactured material"), answer: "A", unit: 5, skill: "G4SCI-U5-S3", diff: "hard", explanation: "Renewable resources (solar, wind, water) can be naturally replenished and will not run out." },
    { text: "What is the difference between ROTATION and REVOLUTION?", choices: mc("Rotation is spinning on an axis; revolution is orbiting another body","They are the same thing","Rotation causes seasons; revolution causes day/night","Revolution is spinning; rotation is orbiting"), answer: "A", unit: 8, skill: "G4SCI-U8-S3", diff: "hard", explanation: "Rotation is spinning on an axis (causes day/night); revolution is orbiting another body (causes seasons/year)." },
    { text: "What is NEWTON'S THIRD LAW?", choices: mc("For every action, there is an equal and opposite reaction","Force equals mass times acceleration","Objects in motion stay in motion","Gravity pulls objects down"), answer: "A", unit: 4, skill: "G4SCI-U4-S3", diff: "hard", explanation: "Newton's Third Law states that for every action force, there is an equal and opposite reaction force." },
  ];
}

function getGr4SSDiag() {
  return [
    { text: "What are the four natural regions of Texas?", choices: mc("Coastal Plains, North Central Plains, Great Plains, Mountains and Basins","Desert, Forest, Plains, Mountains","East, West, North, South Texas","Gulf Coast, Hill Country, Panhandle, Big Bend"), answer: "A", unit: 1, skill: "G4SS-U1-S1", diff: "easy", explanation: "Texas has four major natural regions." },
    { text: "What river forms the border between Texas and Mexico?", choices: mc("Rio Grande","Colorado River","Brazos River","Red River"), answer: "A", unit: 1, skill: "G4SS-U1-S1", diff: "easy", explanation: "The Rio Grande forms the entire southern border between Texas and Mexico." },
    { text: "What is the capital of Texas?", choices: mc("Austin","Houston","Dallas","San Antonio"), answer: "A", unit: 1, skill: "G4SS-U1-S1", diff: "easy", explanation: "Austin is the capital of Texas." },
    { text: "Which Native American group lived in the eastern forests of Texas?", choices: mc("Caddo","Comanche","Apache","Karankawa"), answer: "A", unit: 2, skill: "G4SS-U2-S1", diff: "easy", explanation: "The Caddo lived in East Texas forests." },
    { text: "Which Native American group was known as skilled horse riders?", choices: mc("Comanche","Caddo","Karankawa","Tigua"), answer: "A", unit: 2, skill: "G4SS-U2-S1", diff: "easy", explanation: "The Comanche were expert horsemen of the southern Great Plains." },
    { text: "Which European country first explored Texas?", choices: mc("Spain","France","England","Portugal"), answer: "A", unit: 3, skill: "G4SS-U3-S1", diff: "easy", explanation: "Spain was the first European country to explore and claim Texas." },
    { text: "What was the purpose of Spanish MISSIONS?", choices: mc("To convert Native Americans and establish settlements","To find gold","To build military forts","To trade with France"), answer: "A", unit: 3, skill: "G4SS-U3-S1", diff: "easy", explanation: "Spanish missions were religious settlements designed to convert Native Americans and establish Spanish control." },
    { text: "What was the ALAMO?", choices: mc("A Spanish mission that became a famous battle site","The capital of Texas","A Native American village","A Spanish fort"), answer: "A", unit: 4, skill: "G4SS-U4-S1", diff: "easy", explanation: "The Alamo was a Spanish mission in San Antonio that became the site of a famous battle in 1836." },
    { text: "Who was Sam Houston?", choices: mc("Commander of the Texas army and first president of the Republic","A Mexican general","A Spanish explorer","A Native American chief"), answer: "A", unit: 4, skill: "G4SS-U4-S1", diff: "easy", explanation: "Sam Houston led the Texas army and became the first president of the Republic of Texas." },
    { text: "When did Texas declare independence from Mexico?", choices: mc("March 2, 1836","April 21, 1836","December 29, 1845","January 1, 1836"), answer: "A", unit: 4, skill: "G4SS-U4-S2", diff: "medium", explanation: "Texas declared independence from Mexico on March 2, 1836." },
    { text: "When did Texas become a U.S. state?", choices: mc("December 29, 1845","March 2, 1836","April 21, 1836","January 1, 1850"), answer: "A", unit: 5, skill: "G4SS-U5-S1", diff: "easy", explanation: "Texas was admitted to the United States on December 29, 1845." },
    { text: "What was the Republic of Texas?", choices: mc("An independent nation from 1836 to 1845","A Mexican territory","A Spanish colony","A U.S. territory"), answer: "A", unit: 5, skill: "G4SS-U5-S1", diff: "medium", explanation: "The Republic of Texas was an independent nation for nearly 10 years before joining the U.S." },
    { text: "What was the most important early Texas industry?", choices: mc("Cattle ranching","Manufacturing","Mining","Fishing"), answer: "A", unit: 6, skill: "G4SS-U6-S1", diff: "easy", explanation: "Cattle ranching was the most important early Texas industry." },
    { text: "What discovery transformed the Texas economy in 1901?", choices: mc("Oil at Spindletop","Gold in West Texas","Silver in the Panhandle","Natural gas in East Texas"), answer: "A", unit: 6, skill: "G4SS-U6-S2", diff: "medium", explanation: "The Spindletop oil discovery in 1901 transformed Texas into a major oil-producing state." },
    { text: "What are the THREE branches of Texas government?", choices: mc("Legislative, Executive, Judicial","President, Congress, Courts","Governor, Senate, House","Federal, State, Local"), answer: "A", unit: 7, skill: "G4SS-U7-S1", diff: "easy", explanation: "Texas government has three branches: Legislative, Executive, and Judicial." },
    { text: "Who is the head of the Executive branch of Texas?", choices: mc("The Governor","The Lieutenant Governor","The Chief Justice","The Speaker of the House"), answer: "A", unit: 7, skill: "G4SS-U7-S1", diff: "easy", explanation: "The Governor is the head of the Executive branch of Texas government." },
    { text: "What is CULTURE?", choices: mc("The beliefs, customs, and traditions of a group","The language of a country","The food people eat","The clothes people wear"), answer: "A", unit: 8, skill: "G4SS-U8-S1", diff: "easy", explanation: "Culture encompasses shared beliefs, customs, traditions, language, and values." },
    { text: "What is the Texas state motto?", choices: mc("Friendship","Remember the Alamo","The Lone Star State","Texas Forever"), answer: "A", unit: 8, skill: "G4SS-U8-S1", diff: "easy", explanation: "The official Texas state motto is 'Friendship,' derived from the Caddo word 'tejas.'" },
    { text: "What was the BATTLE OF SAN JACINTO?", choices: mc("The battle where Texas won independence from Mexico","The battle at the Alamo","The first battle of the Revolution","A battle between Spain and France"), answer: "A", unit: 4, skill: "G4SS-U4-S3", diff: "medium", explanation: "The Battle of San Jacinto (April 21, 1836) was the decisive battle that won Texas independence." },
    { text: "What was the CHISHOLM TRAIL?", choices: mc("A cattle trail from Texas to Kansas","A wagon road to California","A Native American trade route","A railroad line"), answer: "A", unit: 6, skill: "G4SS-U6-S3", diff: "medium", explanation: "The Chisholm Trail was a major cattle drive route from Texas to Abilene, Kansas." },
    { text: "What is a PRESIDIO?", choices: mc("A Spanish military fort","A Spanish church","A Spanish school","A Spanish market"), answer: "A", unit: 3, skill: "G4SS-U3-S3", diff: "medium", explanation: "A presidio was a Spanish military fort built to protect missions and settlements." },
    { text: "What is JUNETEENTH?", choices: mc("The day enslaved people in Texas learned of their freedom","Texas Independence Day","The day Texas became a state","A Mexican holiday"), answer: "A", unit: 8, skill: "G4SS-U8-S3", diff: "medium", explanation: "Juneteenth (June 19, 1865) is the day enslaved people in Texas learned of their freedom." },
    { text: "What is STEPHEN F. AUSTIN known for?", choices: mc("Leading American colonists to settle in Texas","Winning the Battle of San Jacinto","Writing the Texas Constitution","Being the first governor of Texas"), answer: "A", unit: 3, skill: "G4SS-U3-S3", diff: "medium", explanation: "Stephen F. Austin is called the 'Father of Texas' for leading the first successful American colony." },
    { text: "What is the LONE STAR FLAG?", choices: mc("The flag of the Republic of Texas with one star","The flag of Mexico","The flag of Spain","The current Texas state flag"), answer: "A", unit: 5, skill: "G4SS-U5-S3", diff: "hard", explanation: "The Lone Star Flag was the official flag of the Republic of Texas, giving Texas its nickname." },
    { text: "What does the LEGISLATIVE branch of Texas do?", choices: mc("Makes laws","Enforces laws","Interprets laws","Leads the military"), answer: "A", unit: 7, skill: "G4SS-U7-S3", diff: "medium", explanation: "The Legislative branch (Texas Legislature) makes the laws that govern Texas." },
    { text: "What was the TEXAS DECLARATION OF INDEPENDENCE?", choices: mc("A document declaring Texas free from Mexico, signed March 2, 1836","A declaration of war","A treaty with Spain","A letter to the U.S. government"), answer: "A", unit: 4, skill: "G4SS-U4-S3", diff: "hard", explanation: "The Texas Declaration of Independence was signed March 2, 1836, declaring Texas free from Mexican rule." },
    { text: "Why was Texas annexation CONTROVERSIAL?", choices: mc("It could expand slavery and anger Mexico","Texas was too large","Texas had no resources","The population was too small"), answer: "A", unit: 5, skill: "G4SS-U5-S3", diff: "hard", explanation: "Texas annexation was controversial because it could expand slavery and risked war with Mexico." },
    { text: "What was the ROLE of the Caddo in Texas history?", choices: mc("They were skilled farmers who formed a confederacy in East Texas","They were nomadic buffalo hunters","They lived along the Gulf Coast","They were the first European settlers"), answer: "A", unit: 2, skill: "G4SS-U2-S3", diff: "hard", explanation: "The Caddo were skilled farmers who formed a confederacy and gave Texas its name ('tejas' = friends)." },
    { text: "What is MANIFEST DESTINY?", choices: mc("The belief that the U.S. was destined to expand across North America","A treaty with Mexico","A type of wagon trail","A Native American belief"), answer: "A", unit: 5, skill: "G4SS-U5-S3", diff: "hard", explanation: "Manifest Destiny was the belief that the U.S. was destined to expand westward across the continent." },
    { text: "What is the TEXAS CONSTITUTION?", choices: mc("The document establishing the structure and laws of Texas government","A list of Texas history","A collection of Texas laws","The Texas Declaration of Independence"), answer: "A", unit: 7, skill: "G4SS-U7-S3", diff: "hard", explanation: "The Texas Constitution establishes the framework of Texas government and the rights of citizens." },
  ];
}

function getGr4TechDiag() {
  return Array.from({ length: 30 }, (_, i) => {
    const unit = Math.floor(i / 4) + 1 > 8 ? 8 : Math.floor(i / 4) + 1;
    const quizQ = getGr4TechQuiz(unit);
    const q = quizQ[i % quizQ.length];
    return { ...q, unit, skill: `G4TECH-U${unit}-S${(i % 3) + 1}`, diff: i < 15 ? "easy" : i < 25 ? "medium" : "hard" };
  });
}

function getGr5MathDiag() {
  return [
    { text: "What is the value of the digit 3 in 4.375?", choices: mc("3 tenths","3 hundredths","3 thousandths","3 ones"), answer: "A", unit: 1, skill: "G5MATH-U1-S1", diff: "easy", explanation: "In 4.375, the 3 is in the tenths place: 3 tenths = 0.3." },
    { text: "Round 7.846 to the nearest hundredth.", choices: mc("7.85","7.84","7.8","8.0"), answer: "A", unit: 1, skill: "G5MATH-U1-S1", diff: "easy", explanation: "Look at the thousandths digit (6). Since 6 ≥ 5, round up: 7.846 → 7.85." },
    { text: "What is 5.67 + 3.48?", choices: mc("9.15","8.15","9.05","9.25"), answer: "A", unit: 2, skill: "G5MATH-U2-S1", diff: "easy", explanation: "5.67 + 3.48 = 9.15." },
    { text: "What is 8.30 − 4.75?", choices: mc("3.55","3.45","4.55","3.65"), answer: "A", unit: 2, skill: "G5MATH-U2-S1", diff: "easy", explanation: "8.30 − 4.75 = 3.55." },
    { text: "What is 1.5 × 4?", choices: mc("6.0","5.0","7.0","4.5"), answer: "A", unit: 2, skill: "G5MATH-U2-S2", diff: "easy", explanation: "1.5 × 4 = 6.0." },
    { text: "What is 1/3 + 1/4?", choices: mc("7/12","2/7","2/12","1/6"), answer: "A", unit: 3, skill: "G5MATH-U3-S1", diff: "easy", explanation: "LCD of 3 and 4 is 12. 4/12 + 3/12 = 7/12." },
    { text: "What is 3/4 − 1/6?", choices: mc("7/12","2/3","1/2","5/12"), answer: "A", unit: 3, skill: "G5MATH-U3-S1", diff: "medium", explanation: "LCD of 4 and 6 is 12. 9/12 − 2/12 = 7/12." },
    { text: "What is 2/3 × 3/5?", choices: mc("2/5","6/15","5/8","1/3"), answer: "A", unit: 4, skill: "G5MATH-U4-S1", diff: "easy", explanation: "2/3 × 3/5 = 6/15 = 2/5 (simplify by dividing by 3)." },
    { text: "What is 3/4 ÷ 3?", choices: mc("1/4","9/4","3/12","4/3"), answer: "A", unit: 4, skill: "G5MATH-U4-S1", diff: "medium", explanation: "3/4 ÷ 3 = 3/4 × 1/3 = 3/12 = 1/4." },
    { text: "What is the value of 2x + 3 when x = 5?", choices: mc("13","10","16","8"), answer: "A", unit: 5, skill: "G5MATH-U5-S1", diff: "easy", explanation: "2(5) + 3 = 10 + 3 = 13." },
    { text: "Solve: 3n − 4 = 11", choices: mc("5","7","4","15"), answer: "A", unit: 5, skill: "G5MATH-U5-S1", diff: "medium", explanation: "3n = 11 + 4 = 15; n = 5." },
    { text: "What is the VOLUME of a box 5 cm × 4 cm × 3 cm?", choices: mc("60 cm³","47 cm³","24 cm³","35 cm³"), answer: "A", unit: 6, skill: "G5MATH-U6-S1", diff: "easy", explanation: "Volume = 5 × 4 × 3 = 60 cm³." },
    { text: "How many faces does a rectangular prism have?", choices: mc("6","4","8","12"), answer: "A", unit: 6, skill: "G5MATH-U6-S1", diff: "easy", explanation: "A rectangular prism has 6 faces." },
    { text: "How many inches are in 5 feet?", choices: mc("60 inches","50 inches","36 inches","12 inches"), answer: "A", unit: 7, skill: "G5MATH-U7-S1", diff: "easy", explanation: "1 foot = 12 inches. 5 × 12 = 60 inches." },
    { text: "How many milliliters are in 4 liters?", choices: mc("4,000 mL","400 mL","40 mL","0.4 mL"), answer: "A", unit: 7, skill: "G5MATH-U7-S1", diff: "easy", explanation: "1 liter = 1,000 mL. 4 × 1,000 = 4,000 mL." },
    { text: "What is the MEAN of 5, 10, 15, 20, 25?", choices: mc("15","10","20","12"), answer: "A", unit: 8, skill: "G5MATH-U8-S1", diff: "easy", explanation: "Mean = (5+10+15+20+25) ÷ 5 = 75 ÷ 5 = 15." },
    { text: "What is the MEDIAN of 8, 3, 12, 5, 9?", choices: mc("8","5","9","7"), answer: "A", unit: 8, skill: "G5MATH-U8-S1", diff: "medium", explanation: "Order: 3, 5, 8, 9, 12. Median = 8 (middle value)." },
    { text: "What is 3.4 × 2.5?", choices: mc("8.5","7.5","9.5","6.5"), answer: "A", unit: 2, skill: "G5MATH-U2-S3", diff: "medium", explanation: "3.4 × 2.5 = 8.5. Multiply 34 × 25 = 850, then place 2 decimal places." },
    { text: "What is 9.6 ÷ 3?", choices: mc("3.2","2.2","4.2","3.6"), answer: "A", unit: 2, skill: "G5MATH-U2-S3", diff: "medium", explanation: "9.6 ÷ 3 = 3.2." },
    { text: "What is 2 3/4 + 1 2/3?", choices: mc("4 5/12","3 5/12","4 1/2","3 1/2"), answer: "A", unit: 3, skill: "G5MATH-U3-S3", diff: "medium", explanation: "2 9/12 + 1 8/12 = 3 17/12 = 4 5/12." },
    { text: "What is 1 1/2 × 2 2/3?", choices: mc("4","3","5","3 1/2"), answer: "A", unit: 4, skill: "G5MATH-U4-S3", diff: "medium", explanation: "3/2 × 8/3 = 24/6 = 4." },
    { text: "What is the area of a triangle with base 10 m and height 6 m?", choices: mc("30 m²","60 m²","16 m²","20 m²"), answer: "A", unit: 6, skill: "G5MATH-U6-S3", diff: "medium", explanation: "Area = (base × height) ÷ 2 = (10 × 6) ÷ 2 = 30 m²." },
    { text: "What is the MODE of 4, 7, 4, 9, 4, 7, 2?", choices: mc("4","7","9","2"), answer: "A", unit: 8, skill: "G5MATH-U8-S3", diff: "medium", explanation: "The mode is the most frequent value. 4 appears 3 times." },
    { text: "Solve: 5x + 3 = 28", choices: mc("5","6","4","7"), answer: "A", unit: 5, skill: "G5MATH-U5-S3", diff: "hard", explanation: "5x = 28 − 3 = 25; x = 5." },
    { text: "What is 0.25 × 0.4?", choices: mc("0.1","0.01","1.0","0.25"), answer: "A", unit: 2, skill: "G5MATH-U2-S3", diff: "hard", explanation: "0.25 × 0.4 = 0.1. Multiply 25 × 4 = 100, then place 3 decimal places." },
    { text: "Convert 3 1/4 to a decimal.", choices: mc("3.25","3.14","3.4","3.75"), answer: "A", unit: 1, skill: "G5MATH-U1-S3", diff: "hard", explanation: "1/4 = 0.25. So 3 1/4 = 3.25." },
    { text: "What is the surface area of a cube with side 4 cm?", choices: mc("96 cm²","64 cm²","24 cm²","48 cm²"), answer: "A", unit: 6, skill: "G5MATH-U6-S3", diff: "hard", explanation: "Surface area of a cube = 6 × side² = 6 × 16 = 96 cm²." },
    { text: "A recipe uses 2/3 cup of sugar per batch. How much for 6 batches?", choices: mc("4 cups","3 cups","5 cups","2 cups"), answer: "A", unit: 4, skill: "G5MATH-U4-S3", diff: "hard", explanation: "6 × 2/3 = 12/3 = 4 cups." },
    { text: "What is the range of: 2.5, 4.8, 1.2, 6.3, 3.7?", choices: mc("5.1","4.8","6.3","3.7"), answer: "A", unit: 8, skill: "G5MATH-U8-S3", diff: "hard", explanation: "Range = max − min = 6.3 − 1.2 = 5.1." },
    { text: "If y = 4x − 1, what is y when x = 6?", choices: mc("23","24","25","22"), answer: "A", unit: 5, skill: "G5MATH-U5-S3", diff: "hard", explanation: "y = 4(6) − 1 = 24 − 1 = 23." },
  ];
}

function getGr5ELADiag() {
  // Use G4 ELA diag with G5 course codes
  return getGr4ELADiag().map((q, i) => ({ ...q, skill: q.skill.replace("G4ELA", "G5ELA") }));
}

function getGr5SciDiag() {
  return getGr4SciDiag().map((q, i) => ({ ...q, skill: q.skill.replace("G4SCI", "G5SCI") }));
}

function getGr5SSDiag() {
  return [
    { text: "What are the five regions of the United States?", choices: mc("Northeast, Southeast, Midwest, Southwest, West","North, South, East, West, Central","Atlantic, Pacific, Gulf, Mountain, Plains","New England, Mid-Atlantic, South, Midwest, West"), answer: "A", unit: 1, skill: "G5SS-U1-S1", diff: "easy", explanation: "The U.S. is divided into five geographic regions." },
    { text: "What is the Mississippi River?", choices: mc("The longest river in the U.S., flowing south to the Gulf","A river in the Northeast","A river on the West Coast","A river on the Canadian border"), answer: "A", unit: 1, skill: "G5SS-U1-S1", diff: "easy", explanation: "The Mississippi River flows south through the center of the country to the Gulf of Mexico." },
    { text: "What did Plains Native Americans primarily hunt?", choices: mc("Buffalo","Deer","Fish","Elk"), answer: "A", unit: 2, skill: "G5SS-U2-S1", diff: "easy", explanation: "Plains Native Americans relied primarily on buffalo for food, clothing, and shelter." },
    { text: "Who was Christopher Columbus?", choices: mc("An Italian explorer who reached the Americas in 1492","An English explorer","A French explorer","A Portuguese explorer"), answer: "A", unit: 3, skill: "G5SS-U3-S1", diff: "easy", explanation: "Christopher Columbus was an Italian explorer sailing for Spain who reached the Caribbean in 1492." },
    { text: "What were the Thirteen Colonies?", choices: mc("British settlements on the East Coast that became the U.S.","Spanish settlements in the Southwest","French settlements in Canada","Dutch settlements in New York"), answer: "A", unit: 3, skill: "G5SS-U3-S1", diff: "easy", explanation: "The Thirteen Colonies were British settlements along the East Coast of North America." },
    { text: "What was the Declaration of Independence?", choices: mc("A document declaring the colonies free from British rule, July 4, 1776","A constitution","A treaty with Britain","A list of colonial laws"), answer: "A", unit: 4, skill: "G5SS-U4-S1", diff: "easy", explanation: "The Declaration of Independence declared the 13 colonies free from British rule on July 4, 1776." },
    { text: "Who wrote the Declaration of Independence?", choices: mc("Thomas Jefferson","George Washington","Benjamin Franklin","John Adams"), answer: "A", unit: 4, skill: "G5SS-U4-S1", diff: "easy", explanation: "Thomas Jefferson was the primary author of the Declaration of Independence." },
    { text: "What is the U.S. Constitution?", choices: mc("The supreme law of the United States","A list of rights only","A declaration of independence","A treaty with France"), answer: "A", unit: 5, skill: "G5SS-U5-S1", diff: "easy", explanation: "The U.S. Constitution is the supreme law of the land, establishing the structure of the federal government." },
    { text: "What are the three branches of the U.S. government?", choices: mc("Legislative, Executive, Judicial","President, Congress, Courts","Senate, House, Supreme Court","Federal, State, Local"), answer: "A", unit: 5, skill: "G5SS-U5-S1", diff: "easy", explanation: "The U.S. government has three branches: Legislative, Executive, and Judicial." },
    { text: "What is the Bill of Rights?", choices: mc("The first 10 amendments protecting individual rights","The entire Constitution","The Declaration of Independence","A list of government powers"), answer: "A", unit: 5, skill: "G5SS-U5-S2", diff: "easy", explanation: "The Bill of Rights consists of the first 10 amendments to the Constitution." },
    { text: "What was Manifest Destiny?", choices: mc("The belief that the U.S. was destined to expand westward","A treaty with Mexico","A type of wagon trail","A Native American belief"), answer: "A", unit: 6, skill: "G5SS-U6-S1", diff: "medium", explanation: "Manifest Destiny was the 19th-century belief that the U.S. was destined to expand across North America." },
    { text: "What was the Louisiana Purchase?", choices: mc("The 1803 purchase of land from France that doubled the U.S.","The purchase of Florida","The purchase of Alaska","A trade agreement"), answer: "A", unit: 6, skill: "G5SS-U6-S1", diff: "medium", explanation: "The Louisiana Purchase (1803) doubled the size of the U.S. for $15 million." },
    { text: "What was the Oregon Trail?", choices: mc("A 2,000-mile route from Missouri to Oregon","A trail used by Native Americans","A cattle drive route","A railroad route"), answer: "A", unit: 6, skill: "G5SS-U6-S2", diff: "medium", explanation: "The Oregon Trail was a 2,000-mile overland route used by settlers to travel to Oregon." },
    { text: "What was the main cause of the Civil War?", choices: mc("The debate over slavery and states' rights","Economic differences only","A dispute over territory","A conflict with a foreign country"), answer: "A", unit: 7, skill: "G5SS-U7-S1", diff: "medium", explanation: "The Civil War was primarily caused by the debate over slavery and secession." },
    { text: "Who was Abraham Lincoln?", choices: mc("The 16th President who led the U.S. during the Civil War","A Confederate general","The president before the Civil War","The first president of the Confederacy"), answer: "A", unit: 7, skill: "G5SS-U7-S1", diff: "easy", explanation: "Abraham Lincoln was the 16th President who led the Union during the Civil War." },
    { text: "What was the Emancipation Proclamation?", choices: mc("Lincoln's 1863 order freeing enslaved people in Confederate states","The end of the Civil War","A constitutional amendment","A peace treaty"), answer: "A", unit: 7, skill: "G5SS-U7-S2", diff: "medium", explanation: "The Emancipation Proclamation (1863) declared enslaved people in Confederate states to be free." },
    { text: "What did the 13th Amendment do?", choices: mc("Abolished slavery throughout the United States","Gave women the right to vote","Gave formerly enslaved men the right to vote","Made all people born in the U.S. citizens"), answer: "A", unit: 7, skill: "G5SS-U7-S2", diff: "medium", explanation: "The 13th Amendment (1865) abolished slavery throughout the United States." },
    { text: "What is supply and demand?", choices: mc("Prices determined by availability and desire","A type of government","A trade agreement","A type of tax"), answer: "A", unit: 8, skill: "G5SS-U8-S1", diff: "medium", explanation: "Supply and demand is the economic principle that prices are determined by how much is available and how much people want." },
    { text: "What is federalism?", choices: mc("Power shared between national and state governments","Only national government has power","States have all the power","A type of election"), answer: "A", unit: 5, skill: "G5SS-U5-S3", diff: "medium", explanation: "Federalism divides power between the national government and state governments." },
    { text: "What was the Columbian Exchange?", choices: mc("Transfer of plants, animals, diseases, and ideas between Americas and Europe","A trade route between Spain and Portugal","A treaty between explorers","A type of ship"), answer: "A", unit: 3, skill: "G5SS-U3-S3", diff: "medium", explanation: "The Columbian Exchange was the transfer of plants, animals, diseases, and cultural ideas following Columbus's voyages." },
    { text: "What was Reconstruction?", choices: mc("The period after the Civil War when the South was rebuilt","The rebuilding of Washington D.C.","The period before the Civil War","The period of westward expansion"), answer: "A", unit: 7, skill: "G5SS-U7-S3", diff: "medium", explanation: "Reconstruction (1865-1877) was the period when the federal government worked to rebuild the South." },
    { text: "What was the Transcontinental Railroad?", choices: mc("A railroad connecting East and West coasts, completed 1869","A railroad in the South","A railroad to Canada","A railroad built before the Civil War"), answer: "A", unit: 6, skill: "G5SS-U6-S3", diff: "hard", explanation: "The Transcontinental Railroad, completed in 1869, connected the East and West coasts." },
    { text: "What was the California Gold Rush?", choices: mc("A mass migration to California after gold was discovered in 1848","A gold discovery in Texas","A gold rush in Alaska","A gold rush in Colorado"), answer: "A", unit: 6, skill: "G5SS-U6-S3", diff: "hard", explanation: "The California Gold Rush began after gold was discovered at Sutter's Mill in 1848." },
    { text: "What does the First Amendment protect?", choices: mc("Freedom of religion, speech, press, assembly, and petition","The right to bear arms","Protection from unreasonable searches","The right to a jury trial"), answer: "A", unit: 5, skill: "G5SS-U5-S3", diff: "hard", explanation: "The First Amendment protects five fundamental freedoms: religion, speech, press, assembly, and petition." },
    { text: "What was the Battle of Yorktown?", choices: mc("The final major battle of the Revolution where Cornwallis surrendered","The first battle of the Revolution","A naval battle","A battle in New York City"), answer: "A", unit: 4, skill: "G5SS-U4-S3", diff: "hard", explanation: "The Battle of Yorktown (1781) ended the American Revolution with Cornwallis's surrender." },
    { text: "What is civic responsibility?", choices: mc("The duties of citizens in a democratic society","A type of government","A legal punishment","A type of election"), answer: "A", unit: 8, skill: "G5SS-U8-S3", diff: "hard", explanation: "Civic responsibility includes duties like voting, obeying laws, and participating in community life." },
    { text: "What was the Mayflower Compact?", choices: mc("An agreement by Pilgrims to create self-government in Plymouth Colony","A treaty with Native Americans","A trade agreement with England","A ship's passenger list"), answer: "A", unit: 3, skill: "G5SS-U3-S3", diff: "hard", explanation: "The Mayflower Compact (1620) was an agreement to create a self-governing community in Plymouth Colony." },
    { text: "What is a market economy?", choices: mc("An economy where individuals and businesses make economic decisions","An economy controlled by the government","An economy based on trade only","An economy with no money"), answer: "A", unit: 8, skill: "G5SS-U8-S3", diff: "hard", explanation: "In a market economy, individuals and businesses make most economic decisions based on supply and demand." },
    { text: "What is the Iroquois Confederacy?", choices: mc("An alliance of six Native American nations in the Northeast","A single tribe in the Southeast","A Plains tribe","A Southwest pueblo community"), answer: "A", unit: 2, skill: "G5SS-U2-S3", diff: "hard", explanation: "The Iroquois Confederacy was an alliance of six nations in the Northeast." },
    { text: "What was the Boston Tea Party?", choices: mc("A protest where colonists dumped British tea into Boston Harbor","A celebration of independence","A meeting of colonial leaders","A battle of the Revolution"), answer: "A", unit: 4, skill: "G5SS-U4-S3", diff: "hard", explanation: "The Boston Tea Party (1773) was a protest against British taxation." },
  ];
}

function getGr5TechDiag() {
  return getGr4TechDiag().map((q, i) => ({ ...q, skill: q.skill.replace("G4TECH", "G5TECH") }));
}

function getGr4KAPMathDiag() {
  return getGr4MathDiag().map((q, i) => ({ ...q, skill: q.skill.replace("G4MATH", "G4KAPMATH"), diff: i < 10 ? "medium" : i < 25 ? "hard" : "hard" }));
}

function getGr5KAPMathDiag() {
  return getGr5MathDiag().map((q, i) => ({ ...q, skill: q.skill.replace("G5MATH", "G5KAPMATH"), diff: i < 10 ? "medium" : "hard" }));
}

function getGr4KAPELADiag() {
  return getGr4ELADiag().map((q, i) => ({ ...q, skill: q.skill.replace("G4ELA", "G4KAPELA"), diff: i < 10 ? "medium" : "hard" }));
}

function getGr5KAPELADiag() {
  return getGr5ELADiag().map((q, i) => ({ ...q, skill: q.skill.replace("G5ELA", "G5KAPELA"), diff: i < 10 ? "medium" : "hard" }));
}

await db.end();
console.log("\n✅ All Katy ISD Grades 4-5 courses seeded successfully!");
