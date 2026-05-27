/**
 * seed-katy-gr68.mjs
 * Seeds Katy ISD Grades 6–8 courses (ACA + KAP) into EduChamp.
 * Excludes PE, Music, and Band.
 * Grades: 6, 7, 8
 * Subjects: Math, ELA/Reading, Science, Social Studies, Technology Applications
 * Pathways: ACA (standard) and KAP (advanced)
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

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
     VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE questionText=VALUES(questionText)`,
    [courseId, unitId, text, JSON.stringify(choices), answer, explanation, skillTag, difficulty, sortOrder]
  );
}
async function insertDiagQ(courseId, questionId, text, choices, answer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder) {
  await db.execute(
    `INSERT INTO diagnosticQuestions (courseId, questionId, questionText, questionType, choices, correctAnswer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder)
     VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE questionText=VALUES(questionText)`,
    [courseId, questionId, text, JSON.stringify(choices), answer, mapsToUnit, JSON.stringify(mapsToSkills), difficulty, explanation, sortOrder]
  );
}
async function insertLesson(unitId, lessonNumber, title, content, sortOrder) {
  await db.execute(
    `INSERT INTO lessons (unitId, lessonNumber, title, explanation, workedExamples, guidedProblems, independentProblems, misconceptions, sortOrder)
     VALUES (?, ?, ?, ?, '[]', '[]', '[]', '[]', ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), explanation=VALUES(explanation)`,
    [unitId, lessonNumber, title, content, sortOrder]
  );
}
function mc(a, b, c, d) { return [{ label: "A", text: a }, { label: "B", text: b }, { label: "C", text: c }, { label: "D", text: d }]; }

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 6 — ACA COURSES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Grade 6 Mathematics (ACA) ────────────────────────────────────────────────
{
  console.log("Seeding Grade 6 Math...");
  const cid = await insertCourse("G6MATH", "Grade 6 Mathematics", "math", "6",
    "Katy ISD Grade 6 Mathematics covers ratios and proportional relationships, number systems (integers, rational numbers), expressions and equations, geometry (area, surface area, volume), and statistics and probability aligned to TEKS 6th grade standards.",
    "TEKS 6.1-6.13", 300);

  const units = [
    [1, "Ratios and Rates", "Understand and apply ratios, unit rates, and equivalent ratios to solve real-world problems.", "TEKS 6.4-6.5"],
    [2, "Fractions, Decimals, and Percents", "Convert between fractions, decimals, and percents; apply to real-world contexts.", "TEKS 6.4"],
    [3, "Integers and the Number Line", "Understand positive and negative integers, absolute value, and ordering on a number line.", "TEKS 6.2"],
    [4, "Operations with Rational Numbers", "Add, subtract, multiply, and divide positive and negative rational numbers.", "TEKS 6.3"],
    [5, "Expressions and Equations", "Write, evaluate, and simplify algebraic expressions; solve one-step equations and inequalities.", "TEKS 6.7-6.9"],
    [6, "Proportional Relationships", "Identify and represent proportional relationships in tables, graphs, and equations.", "TEKS 6.4-6.6"],
    [7, "Geometry: Area, Surface Area, and Volume", "Calculate area of polygons, surface area and volume of prisms and pyramids.", "TEKS 6.8"],
    [8, "Statistics and Data Analysis", "Represent and analyze data using dot plots, histograms, box plots; calculate mean, median, mode, range, and IQR.", "TEKS 6.12-6.13"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G6MATH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Problem Solving`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nThis unit covers essential Grade 6 Mathematics content aligned to ${uTeks}. Work through each concept carefully.\n\n### Learning Objectives\n- Understand the foundational principles of ${uTitle.toLowerCase()}\n- Apply concepts to grade-level problems\n- Connect to real-world applications`, 1);
    await insertLesson(uid, 2, `${uTitle} — Practice and Application`, `## Practice: ${uTitle}\n\nWork through these Grade 6 level problems. Show all work.\n\n### Problem Types\n1. Computational fluency problems\n2. Word problems in context\n3. Multi-step reasoning\n4. Error analysis`, 2);
    const qData = getGr6MathQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr6MathDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G6MATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 6 Math seeded");
}

// ─── Grade 6 ELA/Reading (ACA) ────────────────────────────────────────────────
{
  console.log("Seeding Grade 6 ELA...");
  const cid = await insertCourse("G6ELA", "Grade 6 English Language Arts & Reading", "english", "6",
    "Katy ISD Grade 6 ELA/Reading develops advanced reading comprehension, literary analysis, informational text skills, research writing, grammar, and oral communication aligned to TEKS 6th grade standards.",
    "TEKS 6.1-6.13", 301);

  const units = [
    [1, "Literary Analysis — Fiction", "Analyze character development, theme, conflict, and point of view in fiction texts.", "TEKS 6.7-6.8"],
    [2, "Literary Analysis — Poetry and Drama", "Identify poetic devices, figurative language, and dramatic structure.", "TEKS 6.7"],
    [3, "Informational Text Analysis", "Evaluate main idea, supporting evidence, text structure, and author's purpose in nonfiction.", "TEKS 6.9-6.10"],
    [4, "Vocabulary and Word Study", "Apply context clues, Greek/Latin roots, affixes, and reference materials to determine word meaning.", "TEKS 6.3"],
    [5, "Writing Process — Narrative", "Plan, draft, revise, and publish narrative writing with developed characters and plot.", "TEKS 6.11"],
    [6, "Writing Process — Expository and Argumentative", "Write clear expository essays and argumentative pieces with evidence and logical reasoning.", "TEKS 6.11"],
    [7, "Research and Inquiry", "Conduct research, evaluate sources, take notes, and synthesize information into a research product.", "TEKS 6.12"],
    [8, "Grammar, Conventions, and Oral Communication", "Apply grammar rules, punctuation, and sentence structure; practice speaking and listening skills.", "TEKS 6.1-6.2, 6.5"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G6ELA-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Extended Practice`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nThis unit covers Grade 6 ELA content aligned to ${uTeks}.\n\n### Learning Objectives\n- Master the core skills of ${uTitle.toLowerCase()}\n- Apply reading and writing strategies\n- Demonstrate understanding through written response`, 1);
    await insertLesson(uid, 2, `${uTitle} — Writing and Analysis`, `## Writing and Analysis: ${uTitle}\n\nApply your understanding through structured writing and text analysis.\n\n### Activities\n1. Close reading with annotation\n2. Constructed response writing\n3. Vocabulary in context\n4. Peer review and revision`, 2);
    const qData = getGr6ELAQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr6ELADiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G6ELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 6 ELA seeded");
}

// ─── Grade 6 Science (ACA) ────────────────────────────────────────────────────
{
  console.log("Seeding Grade 6 Science...");
  const cid = await insertCourse("G6SCI", "Grade 6 Science", "science", "6",
    "Katy ISD Grade 6 Science explores Earth and space science, matter and energy, force and motion, and life science through inquiry-based learning aligned to TEKS 6th grade standards.",
    "TEKS 6.1-6.14", 302);

  const units = [
    [1, "Scientific Investigation and Safety", "Apply scientific methods, lab safety, measurement, and data analysis skills.", "TEKS 6.1-6.4"],
    [2, "Matter and Its Properties", "Classify matter by physical and chemical properties; understand states of matter and phase changes.", "TEKS 6.5"],
    [3, "Energy and Heat", "Investigate forms of energy, heat transfer (conduction, convection, radiation), and energy transformations.", "TEKS 6.9"],
    [4, "Force, Motion, and Newton's Laws", "Describe motion using speed, velocity, and acceleration; apply Newton's three laws.", "TEKS 6.8"],
    [5, "Earth's Structure and Plate Tectonics", "Describe Earth's layers, plate tectonic theory, earthquakes, and volcanoes.", "TEKS 6.10"],
    [6, "Weathering, Erosion, and Soil", "Explain weathering, erosion, deposition processes, and soil formation.", "TEKS 6.10"],
    [7, "Atmosphere and Weather", "Describe atmospheric layers, weather patterns, climate, and the water cycle.", "TEKS 6.11"],
    [8, "Ecosystems and Interdependence", "Analyze food webs, energy flow, biotic/abiotic factors, and ecosystem balance.", "TEKS 6.12-6.13"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G6SCI-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Lab Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Analysis`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}. Explore through hands-on inquiry.\n\n### Learning Objectives\n- Understand ${uTitle.toLowerCase()} principles\n- Apply scientific reasoning\n- Connect to real-world phenomena`, 1);
    await insertLesson(uid, 2, `${uTitle} — Investigation and Analysis`, `## Investigation: ${uTitle}\n\nConduct investigations and analyze data.\n\n### Lab Activities\n1. Observation and measurement\n2. Data collection and graphing\n3. Conclusion writing\n4. Real-world connections`, 2);
    const qData = getGr6SciQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr6SciDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G6SCI-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 6 Science seeded");
}

// ─── Grade 6 Social Studies (ACA) ─────────────────────────────────────────────
{
  console.log("Seeding Grade 6 Social Studies...");
  const cid = await insertCourse("G6SS", "Grade 6 Social Studies", "social_studies", "6",
    "Katy ISD Grade 6 Social Studies explores world cultures, geography, history, government, economics, and citizenship from ancient civilizations through the medieval period aligned to TEKS 6th grade standards.",
    "TEKS 6.1-6.22", 303);

  const units = [
    [1, "Geographic Tools and World Regions", "Use maps, globes, and geographic tools to describe world regions and physical features.", "TEKS 6.3-6.4"],
    [2, "Ancient Mesopotamia and Egypt", "Analyze the rise of early civilizations in Mesopotamia and Egypt, including culture, government, and economy.", "TEKS 6.1"],
    [3, "Ancient Greece", "Examine Greek city-states, democracy, philosophy, art, and contributions to Western civilization.", "TEKS 6.1"],
    [4, "Ancient Rome", "Describe the Roman Republic and Empire, law, engineering, and the spread of Christianity.", "TEKS 6.1"],
    [5, "Ancient China and India", "Compare the development of Chinese and Indian civilizations, including dynasties, religion, and trade.", "TEKS 6.1"],
    [6, "World Religions and Culture", "Analyze the origins, beliefs, and spread of major world religions and their cultural impact.", "TEKS 6.2"],
    [7, "Medieval Europe and the Byzantine Empire", "Describe feudalism, the Catholic Church, Crusades, and Byzantine contributions.", "TEKS 6.1"],
    [8, "Economics, Government, and Citizenship", "Understand economic systems, types of government, and the rights and responsibilities of citizens.", "TEKS 6.9-6.14"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G6SS-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Knowledge`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Application`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand ${uTitle.toLowerCase()}\n- Analyze primary and secondary sources\n- Connect historical events to today`, 1);
    await insertLesson(uid, 2, `${uTitle} — Document Analysis`, `## Document Analysis: ${uTitle}\n\nAnalyze primary sources and historical documents.\n\n### Activities\n1. Source analysis\n2. Map interpretation\n3. Compare and contrast\n4. Short essay response`, 2);
    const qData = getGr6SSQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr6SSDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G6SS-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 6 Social Studies seeded");
}

// ─── Grade 6 Technology Applications (ACA) ────────────────────────────────────
{
  console.log("Seeding Grade 6 Technology...");
  const cid = await insertCourse("G6TECH", "Grade 6 Technology Applications", "technology", "6",
    "Katy ISD Grade 6 Technology Applications develops digital citizenship, computational thinking, coding fundamentals, data management, multimedia design, and cybersecurity awareness aligned to TEKS standards.",
    "TEKS 126.14", 304);

  const units = [
    [1, "Digital Citizenship and Online Safety", "Practice responsible digital behavior, online safety, privacy, and cybersecurity basics.", "TEKS 126.14.b.1"],
    [2, "Computational Thinking and Problem Solving", "Apply decomposition, pattern recognition, abstraction, and algorithms to solve problems.", "TEKS 126.14.b.2"],
    [3, "Introduction to Coding and Programming", "Write basic programs using block-based and text-based coding environments.", "TEKS 126.14.b.3"],
    [4, "Data Management and Spreadsheets", "Organize, analyze, and visualize data using spreadsheet tools.", "TEKS 126.14.b.4"],
    [5, "Multimedia and Digital Communication", "Create digital presentations, videos, and multimedia projects for authentic audiences.", "TEKS 126.14.b.5"],
    [6, "Research, Information Literacy, and AI Basics", "Evaluate digital sources, understand AI concepts, and use technology for research.", "TEKS 126.14.b.6"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G6TECH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Project`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand ${uTitle.toLowerCase()}\n- Apply technology skills\n- Create digital products`, 1);
    await insertLesson(uid, 2, `${uTitle} — Hands-On Project`, `## Project: ${uTitle}\n\nApply your skills through a hands-on digital project.\n\n### Project Steps\n1. Plan and design\n2. Create and build\n3. Test and revise\n4. Present and reflect`, 2);
    const qData = getGr6TechQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr6TechDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G6TECH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 6 Technology seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 7 — ACA COURSES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Grade 7 Mathematics (ACA) ────────────────────────────────────────────────
{
  console.log("Seeding Grade 7 Math...");
  const cid = await insertCourse("G7MATH", "Grade 7 Mathematics", "math", "7",
    "Katy ISD Grade 7 Mathematics covers proportionality, expressions and equations, geometry (scale drawings, circles, composite figures), statistics and probability, and financial literacy aligned to TEKS 7th grade standards.",
    "TEKS 7.1-7.13", 400);

  const units = [
    [1, "Proportionality and Constant of Variation", "Represent proportional relationships using tables, graphs, equations, and verbal descriptions.", "TEKS 7.4"],
    [2, "Rational Number Operations", "Add, subtract, multiply, and divide rational numbers including fractions, decimals, and integers.", "TEKS 7.3"],
    [3, "Expressions and Equations", "Write and solve multi-step equations and inequalities; simplify algebraic expressions.", "TEKS 7.10-7.11"],
    [4, "Percent Applications", "Apply percent concepts to tax, tip, discount, markup, simple interest, and percent change.", "TEKS 7.4"],
    [5, "Geometry: Scale Drawings and Similarity", "Use scale factors to solve problems with similar figures and scale drawings.", "TEKS 7.5"],
    [6, "Geometry: Circles and Composite Figures", "Calculate circumference and area of circles; find area and perimeter of composite figures.", "TEKS 7.8-7.9"],
    [7, "Statistics and Probability", "Compare data sets using measures of center and variability; calculate theoretical and experimental probability.", "TEKS 7.6, 7.12"],
    [8, "Financial Literacy", "Apply math to personal finance: budgeting, income, taxes, credit, savings, and investments.", "TEKS 7.13"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G7MATH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Problem Solving`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand ${uTitle.toLowerCase()}\n- Apply to real-world problems\n- Build algebraic reasoning`, 1);
    await insertLesson(uid, 2, `${uTitle} — Practice Problems`, `## Practice: ${uTitle}\n\nWork through multi-step problems.\n\n### Problem Types\n1. Computational problems\n2. Word problems\n3. Multi-step reasoning\n4. Error analysis`, 2);
    const qData = getGr7MathQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr7MathDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G7MATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 7 Math seeded");
}

// ─── Grade 7 ELA/Reading (ACA) ────────────────────────────────────────────────
{
  console.log("Seeding Grade 7 ELA...");
  const cid = await insertCourse("G7ELA", "Grade 7 English Language Arts & Reading", "english", "7",
    "Katy ISD Grade 7 ELA/Reading develops sophisticated reading comprehension, literary analysis, argumentative writing, research skills, and oral communication aligned to TEKS 7th grade standards.",
    "TEKS 7.1-7.13", 401);

  const units = [
    [1, "Literary Analysis — Novel Study", "Analyze complex characters, multiple themes, symbolism, and author's craft in a novel.", "TEKS 7.7-7.8"],
    [2, "Literary Analysis — Short Stories and Poetry", "Examine narrative techniques, figurative language, tone, and mood in short fiction and poetry.", "TEKS 7.7"],
    [3, "Informational and Argumentative Text", "Evaluate claims, evidence, reasoning, and rhetorical techniques in nonfiction texts.", "TEKS 7.9-7.10"],
    [4, "Vocabulary — Academic and Domain-Specific", "Expand vocabulary using morphology, context, and reference tools; distinguish connotation and denotation.", "TEKS 7.3"],
    [5, "Argumentative Writing", "Write evidence-based argumentative essays with clear claims, counterclaims, and logical reasoning.", "TEKS 7.11"],
    [6, "Expository and Informational Writing", "Compose well-organized expository texts with thesis, supporting details, and transitions.", "TEKS 7.11"],
    [7, "Research Process and Synthesis", "Formulate research questions, evaluate sources, synthesize information, and cite correctly.", "TEKS 7.12"],
    [8, "Grammar, Style, and Oral Communication", "Apply advanced grammar, sentence variety, and style; develop speaking and listening skills.", "TEKS 7.1-7.2, 7.5"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G7ELA-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Writing`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Analyze and interpret texts\n- Apply writing strategies\n- Develop critical thinking`, 1);
    await insertLesson(uid, 2, `${uTitle} — Writing Workshop`, `## Writing Workshop: ${uTitle}\n\nPractice writing and analysis.\n\n### Workshop Activities\n1. Close reading and annotation\n2. Paragraph writing\n3. Peer review\n4. Revision and editing`, 2);
    const qData = getGr7ELAQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr7ELADiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G7ELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 7 ELA seeded");
}

// ─── Grade 7 Science (ACA) ────────────────────────────────────────────────────
{
  console.log("Seeding Grade 7 Science...");
  const cid = await insertCourse("G7SCI", "Grade 7 Science", "science", "7",
    "Katy ISD Grade 7 Science focuses on life science including cell biology, genetics, evolution, ecology, and human body systems through inquiry-based learning aligned to TEKS 7th grade standards.",
    "TEKS 7.1-7.14", 402);

  const units = [
    [1, "Scientific Investigation and Measurement", "Apply scientific methods, metric measurement, data analysis, and lab safety.", "TEKS 7.1-7.4"],
    [2, "Cell Structure and Function", "Identify cell organelles, compare prokaryotic and eukaryotic cells, and explain cell processes.", "TEKS 7.12"],
    [3, "Cell Processes — Photosynthesis and Respiration", "Explain photosynthesis, cellular respiration, and the role of ATP in energy transfer.", "TEKS 7.12"],
    [4, "Genetics and Heredity", "Describe DNA structure, gene expression, Punnett squares, and patterns of inheritance.", "TEKS 7.14"],
    [5, "Evolution and Natural Selection", "Explain Darwin's theory of evolution, natural selection, adaptation, and fossil evidence.", "TEKS 7.11"],
    [6, "Taxonomy and Classification", "Classify organisms using the modern classification system; compare characteristics of major kingdoms.", "TEKS 7.10"],
    [7, "Ecology and Ecosystems", "Analyze food webs, energy pyramids, population dynamics, and human impact on ecosystems.", "TEKS 7.5, 7.13"],
    [8, "Human Body Systems", "Describe the structure and function of major body systems and their interactions.", "TEKS 7.12"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G7SCI-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Lab Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Analysis`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand ${uTitle.toLowerCase()}\n- Apply biological reasoning\n- Connect to real-world science`, 1);
    await insertLesson(uid, 2, `${uTitle} — Investigation`, `## Investigation: ${uTitle}\n\nExplore through lab activities and data analysis.\n\n### Lab Activities\n1. Microscopy and observation\n2. Data collection\n3. Analysis and conclusions\n4. Real-world connections`, 2);
    const qData = getGr7SciQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr7SciDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G7SCI-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 7 Science seeded");
}

// ─── Grade 7 Social Studies (ACA) ─────────────────────────────────────────────
{
  console.log("Seeding Grade 7 Social Studies...");
  const cid = await insertCourse("G7SS", "Grade 7 Social Studies — Texas History", "social_studies", "7",
    "Katy ISD Grade 7 Social Studies covers Texas History from early Native American cultures through modern Texas, including exploration, colonization, revolution, statehood, and the Civil War era aligned to TEKS 7th grade standards.",
    "TEKS 7.1-7.22", 403);

  const units = [
    [1, "Native Americans of Texas", "Describe the cultures, economies, and societies of Native American groups in Texas.", "TEKS 7.1"],
    [2, "European Exploration and Colonization", "Analyze Spanish and French exploration, missions, and colonization of Texas.", "TEKS 7.2"],
    [3, "Mexican Texas and Anglo Settlement", "Describe the transition from Spanish to Mexican rule and Anglo-American colonization.", "TEKS 7.3"],
    [4, "Texas Revolution", "Explain the causes, key events, and outcomes of the Texas Revolution and independence.", "TEKS 7.4"],
    [5, "Republic of Texas", "Analyze the challenges and achievements of the Republic of Texas (1836–1845).", "TEKS 7.5"],
    [6, "Texas Statehood and Antebellum Period", "Describe Texas annexation, the Mexican-American War, and life in antebellum Texas.", "TEKS 7.6"],
    [7, "Civil War and Reconstruction in Texas", "Explain Texas's role in the Civil War, emancipation, and Reconstruction challenges.", "TEKS 7.7"],
    [8, "Texas Geography, Economics, and Government", "Analyze Texas's physical geography, economic regions, and state government structure.", "TEKS 7.8-7.14"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G7SS-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Knowledge`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Application`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand Texas history\n- Analyze primary sources\n- Connect to Texas identity today`, 1);
    await insertLesson(uid, 2, `${uTitle} — Primary Source Analysis`, `## Primary Source Analysis: ${uTitle}\n\nAnalyze documents and artifacts from Texas history.\n\n### Activities\n1. Document analysis\n2. Map interpretation\n3. Timeline construction\n4. Essay response`, 2);
    const qData = getGr7SSQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr7SSDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G7SS-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 7 Social Studies seeded");
}

// ─── Grade 7 Technology Applications (ACA) ────────────────────────────────────
{
  console.log("Seeding Grade 7 Technology...");
  const cid = await insertCourse("G7TECH", "Grade 7 Technology Applications", "technology", "7",
    "Katy ISD Grade 7 Technology Applications advances digital citizenship, programming logic, web design fundamentals, database concepts, digital media production, and cybersecurity aligned to TEKS standards.",
    "TEKS 126.14", 404);

  const units = [
    [1, "Advanced Digital Citizenship", "Apply ethical decision-making, copyright law, digital footprint management, and online privacy.", "TEKS 126.14.b.1"],
    [2, "Programming Logic and Algorithms", "Design algorithms using flowcharts, pseudocode, loops, conditionals, and functions.", "TEKS 126.14.b.2"],
    [3, "Web Design Fundamentals", "Create basic web pages using HTML and CSS; understand web structure and accessibility.", "TEKS 126.14.b.3"],
    [4, "Database Concepts and Spreadsheet Analysis", "Design simple databases; use advanced spreadsheet functions for data analysis.", "TEKS 126.14.b.4"],
    [5, "Digital Media Production", "Plan, create, and edit digital media projects including video, audio, and graphics.", "TEKS 126.14.b.5"],
    [6, "Cybersecurity and Digital Responsibility", "Understand cybersecurity threats, protection strategies, and responsible technology use.", "TEKS 126.14.b.6"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G7TECH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Project`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Apply technology skills\n- Create digital products\n- Solve real-world problems`, 1);
    await insertLesson(uid, 2, `${uTitle} — Project`, `## Project: ${uTitle}\n\nCreate a digital product demonstrating your skills.\n\n### Steps\n1. Plan and design\n2. Build and create\n3. Test and revise\n4. Present`, 2);
    const qData = getGr7TechQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr7TechDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G7TECH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 7 Technology seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 8 — ACA COURSES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Grade 8 Mathematics (ACA) ────────────────────────────────────────────────
{
  console.log("Seeding Grade 8 Math...");
  const cid = await insertCourse("G8MATH", "Grade 8 Mathematics", "math", "8",
    "Katy ISD Grade 8 Mathematics covers proportionality, expressions and equations, two-variable equations, functions, geometry (transformations, Pythagorean theorem), and statistics aligned to TEKS 8th grade standards.",
    "TEKS 8.1-8.12", 500);

  const units = [
    [1, "Number and Operations — Real Numbers", "Classify real numbers; convert between fractions and decimals; approximate irrational numbers.", "TEKS 8.2"],
    [2, "Proportionality and Slope", "Identify slope as a rate of change; represent proportional and non-proportional relationships.", "TEKS 8.4-8.5"],
    [3, "Expressions and Equations", "Simplify expressions with integer exponents; write and solve multi-step linear equations.", "TEKS 8.7-8.8"],
    [4, "Two-Variable Equations and Systems", "Write and solve systems of linear equations using tables, graphs, and algebraic methods.", "TEKS 8.8-8.9"],
    [5, "Functions", "Identify, represent, and analyze linear and non-linear functions using multiple representations.", "TEKS 8.5"],
    [6, "Geometry — Transformations", "Perform and describe translations, reflections, rotations, and dilations on the coordinate plane.", "TEKS 8.10"],
    [7, "Pythagorean Theorem and Volume", "Apply the Pythagorean theorem; calculate volume of cylinders, cones, and spheres.", "TEKS 8.6, 8.7"],
    [8, "Statistics and Scatter Plots", "Construct and interpret scatter plots; identify trends and make predictions using trend lines.", "TEKS 8.11-8.12"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G8MATH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Problem Solving`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand ${uTitle.toLowerCase()}\n- Build pre-algebra foundations\n- Prepare for high school math`, 1);
    await insertLesson(uid, 2, `${uTitle} — Practice`, `## Practice: ${uTitle}\n\nWork through problems that build algebraic reasoning.\n\n### Problem Types\n1. Computational fluency\n2. Graphing and representation\n3. Word problems\n4. Multi-step reasoning`, 2);
    const qData = getGr8MathQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr8MathDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G8MATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 8 Math seeded");
}

// ─── Grade 8 ELA/Reading (ACA) ────────────────────────────────────────────────
{
  console.log("Seeding Grade 8 ELA...");
  const cid = await insertCourse("G8ELA", "Grade 8 English Language Arts & Reading", "english", "8",
    "Katy ISD Grade 8 ELA/Reading develops advanced literary analysis, argumentative and research writing, media literacy, and oral communication skills aligned to TEKS 8th grade standards.",
    "TEKS 8.1-8.13", 501);

  const units = [
    [1, "Literary Analysis — Complex Texts", "Analyze theme, characterization, symbolism, irony, and author's craft in complex literary works.", "TEKS 8.7-8.8"],
    [2, "Literary Analysis — Across Genres", "Compare literary elements across fiction, poetry, drama, and nonfiction texts.", "TEKS 8.7"],
    [3, "Informational and Persuasive Text", "Evaluate arguments, rhetorical appeals (ethos, pathos, logos), and persuasive techniques.", "TEKS 8.9-8.10"],
    [4, "Vocabulary — Advanced Word Study", "Use etymology, morphology, and context to determine meaning of sophisticated vocabulary.", "TEKS 8.3"],
    [5, "Argumentative Writing — Advanced", "Write sophisticated argumentative essays with nuanced claims, strong evidence, and effective rebuttals.", "TEKS 8.11"],
    [6, "Literary and Analytical Writing", "Write literary analysis essays and analytical responses to complex texts.", "TEKS 8.11"],
    [7, "Research and Synthesis", "Conduct independent research, synthesize multiple sources, and produce a formal research paper.", "TEKS 8.12"],
    [8, "Media Literacy and Oral Communication", "Analyze media messages, evaluate bias, and develop advanced speaking and listening skills.", "TEKS 8.1-8.2, 8.5-8.6"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G8ELA-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Skill`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Writing`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Analyze complex texts\n- Write with sophistication\n- Prepare for high school ELA`, 1);
    await insertLesson(uid, 2, `${uTitle} — Writing and Analysis`, `## Writing and Analysis: ${uTitle}\n\nDevelop advanced writing and analytical skills.\n\n### Activities\n1. Close reading\n2. Analytical writing\n3. Peer review\n4. Revision`, 2);
    const qData = getGr8ELAQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr8ELADiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G8ELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 8 ELA seeded");
}

// ─── Grade 8 Science (ACA) ────────────────────────────────────────────────────
{
  console.log("Seeding Grade 8 Science...");
  const cid = await insertCourse("G8SCI", "Grade 8 Science", "science", "8",
    "Katy ISD Grade 8 Science covers physical science including matter, chemical reactions, forces, motion, energy, waves, and space science through inquiry-based learning aligned to TEKS 8th grade standards.",
    "TEKS 8.1-8.14", 502);

  const units = [
    [1, "Scientific Investigation and Reasoning", "Apply scientific methods, experimental design, data analysis, and critical thinking.", "TEKS 8.1-8.4"],
    [2, "Matter — Atoms and the Periodic Table", "Describe atomic structure, elements, compounds, and the organization of the periodic table.", "TEKS 8.5"],
    [3, "Chemical Reactions and Properties", "Identify physical and chemical changes; describe evidence of chemical reactions.", "TEKS 8.5"],
    [4, "Forces and Newton's Laws", "Apply Newton's three laws of motion; analyze balanced and unbalanced forces.", "TEKS 8.6"],
    [5, "Motion and Momentum", "Calculate speed, velocity, acceleration; understand momentum and conservation.", "TEKS 8.6"],
    [6, "Energy — Forms and Transformations", "Identify forms of energy; explain energy transformations and conservation of energy.", "TEKS 8.7"],
    [7, "Waves, Sound, and Light", "Describe wave properties; explain the behavior of sound and light waves.", "TEKS 8.7"],
    [8, "Space Science and the Universe", "Describe the solar system, stars, galaxies, and the history of the universe.", "TEKS 8.8-8.9"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G8SCI-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Lab Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Analysis`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand physical science principles\n- Apply to real-world phenomena\n- Prepare for high school science`, 1);
    await insertLesson(uid, 2, `${uTitle} — Lab and Analysis`, `## Lab: ${uTitle}\n\nInvestigate through hands-on activities.\n\n### Activities\n1. Lab investigation\n2. Data collection\n3. Analysis\n4. Conclusions`, 2);
    const qData = getGr8SciQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr8SciDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G8SCI-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 8 Science seeded");
}

// ─── Grade 8 Social Studies (ACA) ─────────────────────────────────────────────
{
  console.log("Seeding Grade 8 Social Studies...");
  const cid = await insertCourse("G8SS", "Grade 8 Social Studies — U.S. History", "social_studies", "8",
    "Katy ISD Grade 8 Social Studies covers U.S. History from the Age of Exploration through Reconstruction, including colonial America, the American Revolution, the Constitution, westward expansion, and the Civil War aligned to TEKS 8th grade standards.",
    "TEKS 8.1-8.30", 503);

  const units = [
    [1, "Age of Exploration and Colonial America", "Describe European exploration, colonial settlement patterns, and colonial life in North America.", "TEKS 8.1-8.2"],
    [2, "Road to Revolution", "Analyze the causes of the American Revolution including taxation, colonial protests, and key events.", "TEKS 8.3"],
    [3, "American Revolution and Independence", "Describe key battles, leaders, the Declaration of Independence, and the outcome of the Revolution.", "TEKS 8.4"],
    [4, "The Constitution and Bill of Rights", "Explain the creation, structure, and principles of the U.S. Constitution and Bill of Rights.", "TEKS 8.5-8.6"],
    [5, "The Early Republic", "Analyze the challenges of the new nation under Washington, Adams, Jefferson, and Madison.", "TEKS 8.7"],
    [6, "Westward Expansion and Manifest Destiny", "Describe westward expansion, the Louisiana Purchase, trails West, and impact on Native Americans.", "TEKS 8.8-8.9"],
    [7, "Sectionalism and the Road to Civil War", "Explain growing sectional tensions over slavery, states' rights, and the events leading to the Civil War.", "TEKS 8.10"],
    [8, "Civil War and Reconstruction", "Describe the causes, major battles, leaders, and outcomes of the Civil War and Reconstruction.", "TEKS 8.11-8.12"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G8SS-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Knowledge`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Application`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Understand U.S. history\n- Analyze primary sources\n- Connect to American identity today`, 1);
    await insertLesson(uid, 2, `${uTitle} — Document Analysis`, `## Document Analysis: ${uTitle}\n\nAnalyze primary sources and historical documents.\n\n### Activities\n1. Primary source analysis\n2. Map interpretation\n3. Compare perspectives\n4. Essay response`, 2);
    const qData = getGr8SSQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr8SSDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G8SS-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 8 Social Studies seeded");
}

// ─── Grade 8 Technology Applications (ACA) ────────────────────────────────────
{
  console.log("Seeding Grade 8 Technology...");
  const cid = await insertCourse("G8TECH", "Grade 8 Technology Applications", "technology", "8",
    "Katy ISD Grade 8 Technology Applications covers advanced programming, app development concepts, data science fundamentals, network security, digital entrepreneurship, and career readiness aligned to TEKS standards.",
    "TEKS 126.14", 504);

  const units = [
    [1, "Digital Leadership and Ethics", "Apply advanced digital citizenship, intellectual property, and ethical technology use.", "TEKS 126.14.b.1"],
    [2, "Advanced Programming Concepts", "Write programs with functions, arrays, loops, and error handling in a text-based language.", "TEKS 126.14.b.2"],
    [3, "App and Game Design", "Design and prototype a simple app or game using design thinking principles.", "TEKS 126.14.b.3"],
    [4, "Data Science and Visualization", "Collect, analyze, and visualize data; understand basic statistics and data-driven decisions.", "TEKS 126.14.b.4"],
    [5, "Networks and Cybersecurity", "Understand how networks work; identify cybersecurity threats and protection strategies.", "TEKS 126.14.b.5"],
    [6, "Digital Entrepreneurship and Careers", "Explore technology careers; develop a digital product concept using entrepreneurial thinking.", "TEKS 126.14.b.6"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G8TECH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Core Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Project`, uid, uNum, 3);
    await insertLesson(uid, 1, `Introduction to ${uTitle}`, `## ${uTitle}\n\n${uOverview}\n\n### Key Concepts\nAligned to ${uTeks}.\n\n### Learning Objectives\n- Apply technology skills\n- Develop career-ready competencies\n- Create digital products`, 1);
    await insertLesson(uid, 2, `${uTitle} — Capstone Project`, `## Capstone: ${uTitle}\n\nCreate a project that demonstrates mastery.\n\n### Steps\n1. Research and plan\n2. Design and build\n3. Test and iterate\n4. Present and reflect`, 2);
    const qData = getGr8TechQuiz(uNum);
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "easy" : "medium", i + 1);
    }
  }
  const diagQs = getGr8TechDiag();
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G8TECH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 8 Technology seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// KAP ADVANCED VARIANTS — GRADES 6, 7, 8
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Grade 6 KAP Math ─────────────────────────────────────────────────────────
{
  console.log("Seeding Grade 6 KAP Math...");
  const cid = await insertCourse("G6KAPMATH", "Grade 6 KAP Mathematics", "math", "6",
    "Katy ISD Grade 6 KAP Mathematics is an accelerated course covering all Grade 6 standards plus pre-algebra extensions, preparing students for Grade 7 KAP or Algebra I in 7th grade.",
    "TEKS 6.1-6.13 (Advanced)", 350);

  const units = [
    [1, "Ratios, Rates, and Proportional Reasoning", "Apply ratio and rate reasoning to complex multi-step problems; introduce proportional relationships.", "TEKS 6.4-6.5"],
    [2, "Rational Number Operations — Advanced", "Perform all operations with rational numbers including complex fractions and mixed numbers.", "TEKS 6.3"],
    [3, "Algebraic Expressions and Equations", "Write, evaluate, and solve multi-step equations and inequalities; introduce variables.", "TEKS 6.7-6.9"],
    [4, "Proportional Relationships and Graphing", "Represent proportional relationships on coordinate planes; identify slope informally.", "TEKS 6.4-6.6"],
    [5, "Geometry — Area, Surface Area, Volume", "Calculate area, surface area, and volume of complex figures; apply to real-world problems.", "TEKS 6.8"],
    [6, "Statistics — Data Analysis and Probability", "Analyze data distributions; calculate probability; compare data sets using statistical measures.", "TEKS 6.12-6.13"],
    [7, "Introduction to Functions and Patterns", "Identify and extend patterns; introduce function notation and input-output relationships.", "TEKS 6.4"],
    [8, "Financial Literacy and Applications", "Apply math to real-world financial contexts: budgets, interest, taxes, and investments.", "TEKS 6.14"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G6KAPMATH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Advanced Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Extension`, uid, uNum, 3);
    await insertLesson(uid, 1, `KAP: ${uTitle}`, `## KAP ${uTitle}\n\n${uOverview}\n\n### Advanced Learning Objectives\n- Master ${uTitle.toLowerCase()} at an accelerated pace\n- Solve multi-step and non-routine problems\n- Build foundations for Algebra I`, 1);
    await insertLesson(uid, 2, `KAP: ${uTitle} — Challenge Problems`, `## Challenge: ${uTitle}\n\nWork through advanced problems.\n\n### Challenge Types\n1. Multi-step problems\n2. Algebraic extensions\n3. Real-world applications\n4. Enrichment tasks`, 2);
    const qData = getGr6MathQuiz(uNum).map(q => ({ ...q, text: q.text + " (KAP)" }));
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }
  const diagQs = getGr6MathDiag().map((q, i) => ({ ...q, skill: q.skill.replace("G6MATH", "G6KAPMATH"), diff: i < 10 ? "medium" : "hard" }));
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G6KAPMATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 6 KAP Math seeded");
}

// ─── Grade 6 KAP ELA ──────────────────────────────────────────────────────────
{
  console.log("Seeding Grade 6 KAP ELA...");
  const cid = await insertCourse("G6KAPELA", "Grade 6 KAP English Language Arts", "english", "6",
    "Katy ISD Grade 6 KAP ELA is an accelerated course covering advanced literary analysis, sophisticated writing, and research skills, preparing students for Grade 7 KAP ELA.",
    "TEKS 6.1-6.13 (Advanced)", 351);

  const units = [
    [1, "Advanced Literary Analysis — Fiction", "Analyze complex characters, multiple themes, symbolism, and narrative craft in challenging fiction.", "TEKS 6.7-6.8"],
    [2, "Advanced Literary Analysis — Poetry and Drama", "Examine complex poetic forms, extended metaphors, and dramatic structure.", "TEKS 6.7"],
    [3, "Advanced Informational and Argumentative Text", "Evaluate complex arguments, rhetorical strategies, and synthesize multiple sources.", "TEKS 6.9-6.10"],
    [4, "Advanced Vocabulary and Etymology", "Study word origins, morphology, and precise academic language across disciplines.", "TEKS 6.3"],
    [5, "Argumentative Writing — Advanced", "Write sophisticated argumentative essays with nuanced claims and strong evidence.", "TEKS 6.11"],
    [6, "Research Writing and Synthesis", "Conduct independent research and produce a formal research paper with proper citations.", "TEKS 6.12"],
    [7, "Literary Analysis Essay Writing", "Write analytical essays that interpret complex texts with textual evidence.", "TEKS 6.11"],
    [8, "Advanced Grammar and Style", "Apply advanced grammar, sentence variety, and rhetorical style in writing.", "TEKS 6.1-6.2, 6.5"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G6KAPELA-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Advanced Skill`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Writing`, uid, uNum, 3);
    await insertLesson(uid, 1, `KAP: ${uTitle}`, `## KAP ${uTitle}\n\n${uOverview}\n\n### Advanced Learning Objectives\n- Analyze texts with sophistication\n- Write with precision and style\n- Build foundations for advanced ELA`, 1);
    await insertLesson(uid, 2, `KAP: ${uTitle} — Advanced Writing`, `## Advanced Writing: ${uTitle}\n\nDevelop sophisticated writing skills.\n\n### Activities\n1. Complex text analysis\n2. Extended writing\n3. Peer critique\n4. Revision for style`, 2);
    const qData = getGr6ELAQuiz(uNum).map(q => ({ ...q, text: q.text + " (KAP)" }));
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }
  const diagQs = getGr6ELADiag().map((q, i) => ({ ...q, skill: q.skill.replace("G6ELA", "G6KAPELA"), diff: i < 10 ? "medium" : "hard" }));
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G6KAPELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 6 KAP ELA seeded");
}

// ─── Grade 7 KAP Math ─────────────────────────────────────────────────────────
{
  console.log("Seeding Grade 7 KAP Math...");
  const cid = await insertCourse("G7KAPMATH", "Grade 7 KAP Mathematics", "math", "7",
    "Katy ISD Grade 7 KAP Mathematics is an accelerated course covering all Grade 7 standards plus pre-algebra extensions, preparing students for Grade 8 Algebra I.",
    "TEKS 7.1-7.13 (Advanced)", 450);

  const units = [
    [1, "Proportionality — Advanced Applications", "Apply proportional reasoning to complex multi-step problems; introduce linear relationships.", "TEKS 7.4"],
    [2, "Rational Number Operations — Mastery", "Master all operations with rational numbers; apply to algebraic contexts.", "TEKS 7.3"],
    [3, "Multi-Step Equations and Inequalities", "Write and solve complex multi-step equations and compound inequalities.", "TEKS 7.10-7.11"],
    [4, "Percent and Financial Mathematics", "Apply percent reasoning to complex financial contexts including compound interest.", "TEKS 7.4, 7.13"],
    [5, "Geometry — Similarity and Proportions", "Apply similarity, proportions, and scale factors to complex geometric problems.", "TEKS 7.5"],
    [6, "Geometry — Circles and 3D Figures", "Calculate circumference, area, surface area, and volume of complex figures.", "TEKS 7.8-7.9"],
    [7, "Statistics and Probability — Advanced", "Analyze complex data sets; calculate compound probability; design simulations.", "TEKS 7.6, 7.12"],
    [8, "Introduction to Algebra — Functions", "Introduce function concepts, linear equations, and graphing as preparation for Algebra I.", "TEKS 7.4"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G7KAPMATH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Advanced Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Extension`, uid, uNum, 3);
    await insertLesson(uid, 1, `KAP: ${uTitle}`, `## KAP ${uTitle}\n\n${uOverview}\n\n### Advanced Learning Objectives\n- Master ${uTitle.toLowerCase()} at an accelerated pace\n- Solve complex multi-step problems\n- Build Algebra I foundations`, 1);
    await insertLesson(uid, 2, `KAP: ${uTitle} — Challenge`, `## Challenge: ${uTitle}\n\nWork through advanced problems.\n\n### Challenge Types\n1. Multi-step algebraic problems\n2. Real-world applications\n3. Enrichment extensions\n4. Preview of Algebra I`, 2);
    const qData = getGr7MathQuiz(uNum).map(q => ({ ...q, text: q.text + " (KAP)" }));
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }
  const diagQs = getGr7MathDiag().map((q, i) => ({ ...q, skill: q.skill.replace("G7MATH", "G7KAPMATH"), diff: i < 10 ? "medium" : "hard" }));
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G7KAPMATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 7 KAP Math seeded");
}

// ─── Grade 7 KAP ELA ──────────────────────────────────────────────────────────
{
  console.log("Seeding Grade 7 KAP ELA...");
  const cid = await insertCourse("G7KAPELA", "Grade 7 KAP English Language Arts", "english", "7",
    "Katy ISD Grade 7 KAP ELA is an accelerated course developing advanced literary analysis, argumentative writing, and research skills, preparing students for Grade 8 KAP ELA.",
    "TEKS 7.1-7.13 (Advanced)", 451);

  const units = [
    [1, "Advanced Novel Study and Literary Analysis", "Analyze complex novels with sophisticated attention to craft, theme, and cultural context.", "TEKS 7.7-7.8"],
    [2, "Advanced Poetry and Dramatic Analysis", "Examine complex poetic forms and dramatic texts with analytical depth.", "TEKS 7.7"],
    [3, "Rhetoric and Persuasion", "Identify and analyze rhetorical appeals, fallacies, and persuasive strategies in complex texts.", "TEKS 7.9-7.10"],
    [4, "Advanced Vocabulary and Academic Language", "Master academic vocabulary, etymology, and precise language for writing and analysis.", "TEKS 7.3"],
    [5, "Advanced Argumentative Writing", "Write sophisticated, multi-paragraph argumentative essays with nuanced reasoning.", "TEKS 7.11"],
    [6, "Literary Analysis Essay", "Write formal literary analysis essays with textual evidence and analytical commentary.", "TEKS 7.11"],
    [7, "Advanced Research and Synthesis", "Conduct independent research and produce a formal research paper.", "TEKS 7.12"],
    [8, "Advanced Grammar, Style, and Oral Communication", "Apply advanced grammar and rhetorical style; develop sophisticated speaking skills.", "TEKS 7.1-7.2, 7.5"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G7KAPELA-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Advanced Skill`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Writing`, uid, uNum, 3);
    await insertLesson(uid, 1, `KAP: ${uTitle}`, `## KAP ${uTitle}\n\n${uOverview}\n\n### Advanced Learning Objectives\n- Analyze texts with sophistication\n- Write with precision and style\n- Prepare for advanced high school ELA`, 1);
    await insertLesson(uid, 2, `KAP: ${uTitle} — Advanced Writing`, `## Advanced Writing: ${uTitle}\n\nDevelop sophisticated writing skills.\n\n### Activities\n1. Complex text analysis\n2. Extended analytical writing\n3. Peer critique\n4. Revision for style and precision`, 2);
    const qData = getGr7ELAQuiz(uNum).map(q => ({ ...q, text: q.text + " (KAP)" }));
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }
  const diagQs = getGr7ELADiag().map((q, i) => ({ ...q, skill: q.skill.replace("G7ELA", "G7KAPELA"), diff: i < 10 ? "medium" : "hard" }));
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G7KAPELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 7 KAP ELA seeded");
}

// ─── Grade 8 KAP Math (Pre-Algebra / Algebra I Prep) ──────────────────────────
{
  console.log("Seeding Grade 8 KAP Math...");
  const cid = await insertCourse("G8KAPMATH", "Grade 8 KAP Mathematics (Algebra I Prep)", "math", "8",
    "Katy ISD Grade 8 KAP Mathematics is an accelerated course covering all Grade 8 standards plus Algebra I foundations, preparing students to take Algebra I in 8th grade or Geometry in 9th grade.",
    "TEKS 8.1-8.12 (Advanced)", 550);

  const units = [
    [1, "Real Numbers and Number Theory", "Classify and operate with real numbers; apply number theory concepts.", "TEKS 8.2"],
    [2, "Linear Equations and Systems — Advanced", "Solve complex systems of equations using multiple methods; interpret solutions graphically.", "TEKS 8.8-8.9"],
    [3, "Functions and Function Notation", "Understand function notation; analyze linear and non-linear functions.", "TEKS 8.5"],
    [4, "Slope and Linear Relationships", "Apply slope concepts to complex real-world problems; write equations of lines.", "TEKS 8.4-8.5"],
    [5, "Transformations and Congruence", "Perform and describe complex transformations; prove congruence and similarity.", "TEKS 8.10"],
    [6, "Pythagorean Theorem — Advanced Applications", "Apply the Pythagorean theorem to complex 2D and 3D problems.", "TEKS 8.6-8.7"],
    [7, "Statistics — Bivariate Data", "Analyze scatter plots, correlation, causation, and make predictions with trend lines.", "TEKS 8.11-8.12"],
    [8, "Introduction to Algebra I Concepts", "Preview key Algebra I topics: quadratics, polynomials, and exponential functions.", "TEKS 8.1-8.12"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G8KAPMATH-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Advanced Concept`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Application`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Extension`, uid, uNum, 3);
    await insertLesson(uid, 1, `KAP: ${uTitle}`, `## KAP ${uTitle}\n\n${uOverview}\n\n### Advanced Learning Objectives\n- Master ${uTitle.toLowerCase()} at an accelerated pace\n- Solve complex algebraic problems\n- Build strong Algebra I foundations`, 1);
    await insertLesson(uid, 2, `KAP: ${uTitle} — Challenge`, `## Challenge: ${uTitle}\n\nWork through advanced algebraic problems.\n\n### Challenge Types\n1. Complex multi-step problems\n2. Algebraic reasoning\n3. Real-world applications\n4. Algebra I preview`, 2);
    const qData = getGr8MathQuiz(uNum).map(q => ({ ...q, text: q.text + " (KAP)" }));
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }
  const diagQs = getGr8MathDiag().map((q, i) => ({ ...q, skill: q.skill.replace("G8MATH", "G8KAPMATH"), diff: i < 10 ? "medium" : "hard" }));
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G8KAPMATH-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 8 KAP Math seeded");
}

// ─── Grade 8 KAP ELA ──────────────────────────────────────────────────────────
{
  console.log("Seeding Grade 8 KAP ELA...");
  const cid = await insertCourse("G8KAPELA", "Grade 8 KAP English Language Arts", "english", "8",
    "Katy ISD Grade 8 KAP ELA is an accelerated course developing advanced literary analysis, sophisticated argumentative writing, and independent research skills, preparing students for AP Language or advanced high school ELA.",
    "TEKS 8.1-8.13 (Advanced)", 551);

  const units = [
    [1, "Advanced Literary Analysis — Complex Texts", "Analyze complex literary works with attention to craft, ambiguity, and multiple interpretations.", "TEKS 8.7-8.8"],
    [2, "Comparative Literature Analysis", "Compare literary elements, themes, and techniques across multiple complex texts.", "TEKS 8.7"],
    [3, "Advanced Rhetoric and Argumentation", "Analyze sophisticated rhetorical strategies; evaluate complex arguments and counterarguments.", "TEKS 8.9-8.10"],
    [4, "Advanced Vocabulary and Academic Discourse", "Master sophisticated academic vocabulary; apply to writing and analysis.", "TEKS 8.3"],
    [5, "Advanced Argumentative Writing", "Write AP-style argumentative essays with sophisticated reasoning and evidence.", "TEKS 8.11"],
    [6, "Literary Analysis — AP Preparation", "Write formal literary analysis essays that interpret complex texts with sophistication.", "TEKS 8.11"],
    [7, "Independent Research Paper", "Conduct independent research and produce a formal research paper with MLA/APA citations.", "TEKS 8.12"],
    [8, "Media Literacy, Rhetoric, and Advanced Communication", "Analyze media rhetoric; develop advanced public speaking and debate skills.", "TEKS 8.1-8.2, 8.5-8.6"],
  ];

  for (const [uNum, uTitle, uOverview, uTeks] of units) {
    const uid = await insertUnit(cid, uNum, uTitle, uOverview, uTeks, uNum);
    const base = `G8KAPELA-U${uNum}`;
    await insertSkill(cid, `${base}-S1`, `${uTitle} — Advanced Skill`, uid, uNum, 1);
    await insertSkill(cid, `${base}-S2`, `${uTitle} — Analysis`, uid, uNum, 2);
    await insertSkill(cid, `${base}-S3`, `${uTitle} — Writing`, uid, uNum, 3);
    await insertLesson(uid, 1, `KAP: ${uTitle}`, `## KAP ${uTitle}\n\n${uOverview}\n\n### Advanced Learning Objectives\n- Analyze texts with AP-level sophistication\n- Write with precision and rhetorical skill\n- Prepare for AP Language and Composition`, 1);
    await insertLesson(uid, 2, `KAP: ${uTitle} — Advanced Writing`, `## Advanced Writing: ${uTitle}\n\nDevelop AP-level writing skills.\n\n### Activities\n1. Complex text analysis\n2. Extended analytical writing\n3. Peer critique\n4. Revision for sophistication`, 2);
    const qData = getGr8ELAQuiz(uNum).map(q => ({ ...q, text: q.text + " (KAP)" }));
    for (let i = 0; i < qData.length; i++) {
      const q = qData[i];
      await insertQuizQ(cid, uid, q.text, q.choices, q.answer, q.explanation, `${base}-S${(i % 3) + 1}`, i < 2 ? "medium" : "hard", i + 1);
    }
  }
  const diagQs = getGr8ELADiag().map((q, i) => ({ ...q, skill: q.skill.replace("G8ELA", "G8KAPELA"), diff: i < 10 ? "medium" : "hard" }));
  for (let i = 0; i < diagQs.length; i++) {
    const q = diagQs[i];
    await insertDiagQ(cid, `G8KAPELA-D${String(i + 1).padStart(2, "0")}`, q.text, q.choices, q.answer, q.unit, [q.skill], q.diff, q.explanation, i + 1);
  }
  console.log("  Grade 8 KAP ELA seeded");
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ QUESTION DATA FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getGr6MathQuiz(unitNum) {
  const banks = {
    1: [
      { text: "A recipe uses 3 cups of flour for every 2 cups of sugar. What is the ratio of flour to sugar?", choices: mc("3:2","2:3","3:1","1:2"), answer: "A", explanation: "The ratio of flour to sugar is 3 to 2, written as 3:2." },
      { text: "A car travels 150 miles in 3 hours. What is the unit rate in miles per hour?", choices: mc("50 mph","45 mph","60 mph","30 mph"), answer: "A", explanation: "150 ÷ 3 = 50 miles per hour." },
      { text: "Which ratio is equivalent to 4:6?", choices: mc("2:3","3:4","4:5","6:8"), answer: "A", explanation: "4:6 simplifies to 2:3 by dividing both by 2." },
      { text: "A store sells 5 apples for $2.50. What is the cost per apple?", choices: mc("$0.50","$0.40","$0.60","$0.25"), answer: "A", explanation: "$2.50 ÷ 5 = $0.50 per apple." },
      { text: "If the ratio of boys to girls is 3:5 and there are 24 boys, how many girls are there?", choices: mc("40","30","35","45"), answer: "A", explanation: "3/5 = 24/x → x = 40 girls." },
    ],
    2: [
      { text: "What is 3/4 written as a decimal?", choices: mc("0.75","0.34","0.43","0.70"), answer: "A", explanation: "3 ÷ 4 = 0.75" },
      { text: "What is 0.6 written as a percent?", choices: mc("60%","6%","0.6%","600%"), answer: "A", explanation: "0.6 × 100 = 60%" },
      { text: "What is 25% of 80?", choices: mc("20","25","15","30"), answer: "A", explanation: "25% × 80 = 0.25 × 80 = 20" },
      { text: "Which is greatest: 3/5, 0.65, or 62%?", choices: mc("0.65","3/5","62%","They are equal"), answer: "A", explanation: "3/5 = 0.60, 62% = 0.62, 0.65 is greatest." },
      { text: "A shirt costs $40 and is on sale for 30% off. What is the sale price?", choices: mc("$28","$30","$32","$12"), answer: "A", explanation: "30% of $40 = $12 discount. $40 - $12 = $28." },
    ],
    3: [
      { text: "What is the absolute value of -7?", choices: mc("7","-7","0","14"), answer: "A", explanation: "The absolute value of -7 is 7 (distance from zero)." },
      { text: "Which number is farthest from zero on a number line?", choices: mc("-8","5","-3","7"), answer: "A", explanation: "|-8| = 8, which is the greatest distance from zero." },
      { text: "Order from least to greatest: -3, 1, -5, 0", choices: mc("-5,-3,0,1","-3,-5,0,1","0,-3,-5,1","1,0,-3,-5"), answer: "A", explanation: "On a number line: -5 < -3 < 0 < 1." },
      { text: "What is the opposite of -4?", choices: mc("4","-4","1/4","0"), answer: "A", explanation: "The opposite of -4 is 4 (same distance, other side of zero)." },
      { text: "Which integer is between -2 and 2 but not zero?", choices: mc("1","-3","3","0"), answer: "A", explanation: "1 is between -2 and 2 and is not zero." },
    ],
    4: [
      { text: "What is -3 + (-5)?", choices: mc("-8","8","-2","2"), answer: "A", explanation: "Adding two negatives: -3 + (-5) = -8." },
      { text: "What is -6 - (-2)?", choices: mc("-4","-8","4","8"), answer: "A", explanation: "-6 - (-2) = -6 + 2 = -4." },
      { text: "What is (-4) × (-3)?", choices: mc("12","-12","7","-7"), answer: "A", explanation: "Negative × negative = positive: (-4)×(-3) = 12." },
      { text: "What is -15 ÷ 3?", choices: mc("-5","5","-45","45"), answer: "A", explanation: "Negative ÷ positive = negative: -15 ÷ 3 = -5." },
      { text: "What is 1/2 + (-3/4)?", choices: mc("-1/4","1/4","5/4","-5/4"), answer: "A", explanation: "1/2 = 2/4. 2/4 + (-3/4) = -1/4." },
    ],
    5: [
      { text: "Evaluate 3x + 5 when x = 4.", choices: mc("17","12","20","15"), answer: "A", explanation: "3(4) + 5 = 12 + 5 = 17." },
      { text: "Solve: x + 7 = 15", choices: mc("8","22","7","15"), answer: "A", explanation: "x = 15 - 7 = 8." },
      { text: "Solve: 3x = 18", choices: mc("6","15","54","21"), answer: "A", explanation: "x = 18 ÷ 3 = 6." },
      { text: "Which expression represents 'five more than twice a number n'?", choices: mc("2n + 5","5n + 2","2 + 5n","5 + n"), answer: "A", explanation: "Twice a number is 2n; five more than that is 2n + 5." },
      { text: "Solve: x - 4 > 3. What is the solution?", choices: mc("x > 7","x > -1","x < 7","x < -1"), answer: "A", explanation: "x - 4 > 3 → x > 7." },
    ],
    6: [
      { text: "Which table represents a proportional relationship?", choices: mc("x:1,2,3 y:3,6,9","x:1,2,3 y:2,4,7","x:1,2,3 y:1,3,6","x:1,2,3 y:4,5,6"), answer: "A", explanation: "In a proportional relationship, y/x is constant. 3/1=6/2=9/3=3." },
      { text: "The equation y = 4x represents a proportional relationship. What is the constant of proportionality?", choices: mc("4","x","y","0"), answer: "A", explanation: "In y = kx, k is the constant of proportionality. Here k = 4." },
      { text: "A proportional relationship passes through (0,0) and (3,12). What is the unit rate?", choices: mc("4","3","12","36"), answer: "A", explanation: "12 ÷ 3 = 4. The unit rate (constant of proportionality) is 4." },
      { text: "If y is proportional to x and y = 15 when x = 3, what is y when x = 7?", choices: mc("35","21","25","14"), answer: "A", explanation: "k = 15/3 = 5. y = 5(7) = 35." },
      { text: "Which graph represents a proportional relationship?", choices: mc("A straight line through the origin","A straight line not through the origin","A curved line","A horizontal line"), answer: "A", explanation: "Proportional relationships graph as straight lines through the origin." },
    ],
    7: [
      { text: "What is the area of a triangle with base 8 cm and height 5 cm?", choices: mc("20 cm²","40 cm²","13 cm²","80 cm²"), answer: "A", explanation: "Area = (1/2) × base × height = (1/2) × 8 × 5 = 20 cm²." },
      { text: "What is the surface area of a rectangular prism with length 4, width 3, and height 2?", choices: mc("52 sq units","24 sq units","26 sq units","48 sq units"), answer: "A", explanation: "SA = 2(lw + lh + wh) = 2(12 + 8 + 6) = 2(26) = 52." },
      { text: "What is the volume of a rectangular prism with length 5, width 4, and height 3?", choices: mc("60 cubic units","47 cubic units","120 cubic units","30 cubic units"), answer: "A", explanation: "V = l × w × h = 5 × 4 × 3 = 60 cubic units." },
      { text: "What is the area of a parallelogram with base 6 and height 4?", choices: mc("24 sq units","12 sq units","20 sq units","48 sq units"), answer: "A", explanation: "Area = base × height = 6 × 4 = 24 sq units." },
      { text: "A triangular prism has a triangular base with area 10 sq cm and height 7 cm. What is its volume?", choices: mc("70 cm³","35 cm³","17 cm³","140 cm³"), answer: "A", explanation: "V = base area × height = 10 × 7 = 70 cm³." },
    ],
    8: [
      { text: "What is the mean of: 4, 7, 9, 6, 4?", choices: mc("6","7","5","8"), answer: "A", explanation: "(4+7+9+6+4) ÷ 5 = 30 ÷ 5 = 6." },
      { text: "What is the median of: 3, 7, 2, 9, 5?", choices: mc("5","7","3","6"), answer: "A", explanation: "Ordered: 2,3,5,7,9. The middle value is 5." },
      { text: "What is the range of: 12, 5, 18, 9, 3?", choices: mc("15","18","13","10"), answer: "A", explanation: "Range = max - min = 18 - 3 = 15." },
      { text: "Which display is best for showing the distribution of a data set?", choices: mc("Box plot","Bar graph","Pie chart","Line graph"), answer: "A", explanation: "A box plot shows the distribution, median, quartiles, and outliers." },
      { text: "The IQR of a data set is 8. What does this mean?", choices: mc("The middle 50% of data spans 8 units","The data range is 8","The mean is 8","There are 8 data points"), answer: "A", explanation: "IQR = Q3 - Q1, representing the spread of the middle 50% of data." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr6ELAQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is the THEME of a story?", choices: mc("The central message or lesson","The main character","The setting","The plot"), answer: "A", explanation: "Theme is the central message or lesson the author wants to convey." },
      { text: "What is CHARACTERIZATION?", choices: mc("How an author reveals a character's personality","The main conflict","The setting description","The plot summary"), answer: "A", explanation: "Characterization is how an author develops and reveals a character's traits." },
      { text: "What is the POINT OF VIEW in a story where the narrator is a character using 'I'?", choices: mc("First person","Second person","Third person limited","Third person omniscient"), answer: "A", explanation: "First-person point of view uses 'I' and is told from a character's perspective." },
      { text: "What is CONFLICT in a story?", choices: mc("The struggle between opposing forces","The main character","The setting","The resolution"), answer: "A", explanation: "Conflict is the central struggle or problem in a story." },
      { text: "What is the CLIMAX of a story?", choices: mc("The turning point of greatest tension","The beginning","The resolution","The exposition"), answer: "A", explanation: "The climax is the turning point of highest tension in the plot." },
    ],
    2: [
      { text: "What is a SIMILE?", choices: mc("A comparison using 'like' or 'as'","A comparison without 'like' or 'as'","Giving human traits to non-human things","Exaggeration for effect"), answer: "A", explanation: "A simile compares two things using 'like' or 'as' (e.g., 'fast as lightning')." },
      { text: "What is PERSONIFICATION?", choices: mc("Giving human traits to non-human things","A comparison using 'like' or 'as'","Exaggeration for effect","Repeating consonant sounds"), answer: "A", explanation: "Personification gives human qualities to non-human things (e.g., 'the wind whispered')." },
      { text: "What is the RHYME SCHEME of a poem?", choices: mc("The pattern of end rhymes in a poem","The rhythm of syllables","The number of stanzas","The poem's theme"), answer: "A", explanation: "Rhyme scheme is the pattern of end rhymes, labeled with letters (ABAB, etc.)." },
      { text: "What is ALLITERATION?", choices: mc("Repetition of consonant sounds at the start of words","Repetition of vowel sounds","Exaggeration for effect","A comparison using 'like'"), answer: "A", explanation: "Alliteration is the repetition of consonant sounds at the beginning of nearby words." },
      { text: "What is the TONE of a piece of writing?", choices: mc("The author's attitude toward the subject","The main character's feelings","The setting's mood","The story's theme"), answer: "A", explanation: "Tone is the author's attitude or feeling toward the subject matter." },
    ],
    3: [
      { text: "What is the MAIN IDEA of an informational text?", choices: mc("The most important point the author makes","The first sentence","A supporting detail","The title"), answer: "A", explanation: "The main idea is the central, most important point the author is making." },
      { text: "What is TEXT STRUCTURE?", choices: mc("How an author organizes information","The length of the text","The topic of the text","The author's purpose"), answer: "A", explanation: "Text structure is the way an author organizes information (cause/effect, compare/contrast, etc.)." },
      { text: "What is the AUTHOR'S PURPOSE when writing to inform?", choices: mc("To give information or explain","To entertain","To persuade","To describe"), answer: "A", explanation: "When writing to inform, the author's purpose is to give information or explain a topic." },
      { text: "What is a CENTRAL IDEA in nonfiction?", choices: mc("The most important point the text makes","A supporting example","The title","The conclusion"), answer: "A", explanation: "The central idea is the most important point or argument in a nonfiction text." },
      { text: "What does SUMMARIZING mean?", choices: mc("Retelling the most important points briefly","Copying the text word for word","Adding your own opinion","Listing every detail"), answer: "A", explanation: "Summarizing means briefly retelling the most important points in your own words." },
    ],
    4: [
      { text: "What are CONTEXT CLUES?", choices: mc("Words or phrases near an unknown word that help define it","The dictionary definition","The word's prefix","The word's suffix"), answer: "A", explanation: "Context clues are words or phrases near an unknown word that help you figure out its meaning." },
      { text: "What does the prefix 'un-' mean?", choices: mc("Not","Again","Before","After"), answer: "A", explanation: "The prefix 'un-' means 'not' (e.g., unhappy = not happy)." },
      { text: "What does the root word 'port' mean?", choices: mc("To carry","To write","To see","To hear"), answer: "A", explanation: "The root 'port' means 'to carry' (e.g., transport, portable)." },
      { text: "What is a SYNONYM?", choices: mc("A word with a similar meaning","A word with the opposite meaning","A word that sounds the same","A word with multiple meanings"), answer: "A", explanation: "A synonym is a word with a similar meaning (e.g., happy/joyful)." },
      { text: "What is CONNOTATION?", choices: mc("The emotional meaning or feeling associated with a word","The dictionary definition","The word's origin","The word's part of speech"), answer: "A", explanation: "Connotation is the emotional or cultural meaning associated with a word beyond its literal definition." },
    ],
    5: [
      { text: "What is NARRATIVE WRITING?", choices: mc("Writing that tells a story","Writing that explains information","Writing that persuades","Writing that describes only"), answer: "A", explanation: "Narrative writing tells a story with characters, setting, plot, and conflict." },
      { text: "What is the PURPOSE of a HOOK in writing?", choices: mc("To grab the reader's attention","To state the main idea","To conclude the essay","To provide evidence"), answer: "A", explanation: "A hook is an opening sentence or paragraph designed to grab the reader's attention." },
      { text: "What is DIALOGUE in a story?", choices: mc("Conversation between characters","The narrator's thoughts","The story's theme","The setting description"), answer: "A", explanation: "Dialogue is the conversation between characters, shown with quotation marks." },
      { text: "What is PACING in narrative writing?", choices: mc("How fast or slow the story moves","The number of characters","The setting details","The story's theme"), answer: "A", explanation: "Pacing controls how quickly or slowly events unfold in a narrative." },
      { text: "What is the purpose of SENSORY DETAILS in writing?", choices: mc("To help the reader see, hear, feel, taste, and smell the scene","To state the main idea","To provide facts","To give the author's opinion"), answer: "A", explanation: "Sensory details engage the five senses to make writing vivid and immersive." },
    ],
    6: [
      { text: "What is EXPOSITORY WRITING?", choices: mc("Writing that explains or informs","Writing that tells a story","Writing that persuades","Writing that describes feelings"), answer: "A", explanation: "Expository writing explains, informs, or describes a topic clearly and objectively." },
      { text: "What is a THESIS STATEMENT?", choices: mc("The main argument or point of an essay","The first sentence of a paragraph","A supporting detail","The conclusion"), answer: "A", explanation: "A thesis statement is the main argument or central point of an essay." },
      { text: "What is the PURPOSE of a TOPIC SENTENCE?", choices: mc("To state the main idea of a paragraph","To conclude the essay","To provide evidence","To hook the reader"), answer: "A", explanation: "A topic sentence states the main idea of a paragraph." },
      { text: "What is a TRANSITION WORD?", choices: mc("A word that connects ideas between sentences or paragraphs","A word that describes a noun","A word that shows action","A word that modifies a verb"), answer: "A", explanation: "Transition words connect ideas and help writing flow (e.g., however, therefore, in addition)." },
      { text: "What is EVIDENCE in argumentative writing?", choices: mc("Facts, examples, or quotes that support a claim","The writer's opinion","The conclusion","The introduction"), answer: "A", explanation: "Evidence is facts, examples, statistics, or quotes that support a claim." },
    ],
    7: [
      { text: "What is the FIRST STEP in the research process?", choices: mc("Identify a research question","Write the paper","Find sources","Create a bibliography"), answer: "A", explanation: "The first step in research is identifying a clear research question or topic." },
      { text: "What is a PRIMARY SOURCE?", choices: mc("An original document or firsthand account","A summary of another source","A textbook","An encyclopedia"), answer: "A", explanation: "A primary source is an original document or firsthand account (e.g., diary, speech, photograph)." },
      { text: "What is PLAGIARISM?", choices: mc("Using someone else's work without giving credit","Citing your sources","Paraphrasing with credit","Using your own ideas"), answer: "A", explanation: "Plagiarism is presenting someone else's work or ideas as your own without giving credit." },
      { text: "What is a BIBLIOGRAPHY?", choices: mc("A list of sources used in research","The introduction of a paper","A type of evidence","A research question"), answer: "A", explanation: "A bibliography is a list of all sources used in a research project." },
      { text: "What does it mean to PARAPHRASE?", choices: mc("Restate information in your own words","Copy text exactly","Summarize briefly","Quote directly"), answer: "A", explanation: "Paraphrasing means restating information in your own words while keeping the original meaning." },
    ],
    8: [
      { text: "What is a COMPLETE SENTENCE?", choices: mc("A sentence with a subject and predicate","A sentence with only a noun","A sentence with only a verb","A sentence fragment"), answer: "A", explanation: "A complete sentence must have both a subject (who/what) and a predicate (action/state)." },
      { text: "What is a COMPOUND SENTENCE?", choices: mc("Two independent clauses joined by a conjunction","A sentence with one clause","A sentence with a dependent clause","A sentence fragment"), answer: "A", explanation: "A compound sentence joins two independent clauses with a coordinating conjunction (FANBOYS)." },
      { text: "What is the correct punctuation for a list of three items?", choices: mc("Commas between each item","Semicolons between each item","Colons between each item","No punctuation needed"), answer: "A", explanation: "Use commas to separate items in a list of three or more (e.g., red, white, and blue)." },
      { text: "What is ACTIVE VOICE in writing?", choices: mc("The subject performs the action","The subject receives the action","The verb is past tense","The sentence has no subject"), answer: "A", explanation: "In active voice, the subject performs the action (e.g., 'The dog chased the ball')." },
      { text: "What is the purpose of a CONCLUSION paragraph?", choices: mc("To restate the main idea and wrap up the essay","To introduce new evidence","To start a new argument","To hook the reader"), answer: "A", explanation: "A conclusion restates the main idea, summarizes key points, and provides closure." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr6SciQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is a HYPOTHESIS?", choices: mc("A testable prediction","A conclusion","A data table","An observation"), answer: "A", explanation: "A hypothesis is a testable prediction about what will happen in an experiment." },
      { text: "What is the INDEPENDENT VARIABLE in an experiment?", choices: mc("The variable you change","The variable you measure","The variable you keep the same","The control group"), answer: "A", explanation: "The independent variable is the one you intentionally change in an experiment." },
      { text: "What is the SI unit for length?", choices: mc("Meter","Gram","Liter","Kelvin"), answer: "A", explanation: "The meter (m) is the SI unit for length." },
      { text: "What does a CONTROL GROUP do in an experiment?", choices: mc("Provides a baseline for comparison","Changes the independent variable","Measures the dependent variable","Records the data"), answer: "A", explanation: "The control group is the standard for comparison — it does not receive the experimental treatment." },
      { text: "What is SCIENTIFIC INQUIRY?", choices: mc("A process of asking questions and investigating through observation and experimentation","Memorizing facts","Reading textbooks","Writing reports"), answer: "A", explanation: "Scientific inquiry is the process of asking questions and investigating them through observation and experimentation." },
    ],
    2: [
      { text: "What is MATTER?", choices: mc("Anything that has mass and takes up space","Only solids","Only liquids and gases","Energy"), answer: "A", explanation: "Matter is anything that has mass and takes up space." },
      { text: "What is a PHYSICAL PROPERTY?", choices: mc("A characteristic that can be observed without changing the substance","A property that changes the substance","A chemical reaction","An element"), answer: "A", explanation: "Physical properties (color, density, melting point) can be observed without changing the substance's identity." },
      { text: "What happens during a PHASE CHANGE from liquid to gas?", choices: mc("The substance gains energy and particles move faster","The substance loses energy","The substance changes its chemical composition","The substance becomes denser"), answer: "A", explanation: "During evaporation/boiling, the liquid gains energy and particles move fast enough to become gas." },
      { text: "What is the DENSITY of a substance?", choices: mc("Mass per unit volume","Volume per unit mass","Mass times volume","Weight divided by height"), answer: "A", explanation: "Density = mass ÷ volume. It measures how much mass is packed into a given volume." },
      { text: "Which state of matter has a definite shape and volume?", choices: mc("Solid","Liquid","Gas","Plasma"), answer: "A", explanation: "Solids have both definite shape and definite volume." },
    ],
    3: [
      { text: "What is THERMAL ENERGY?", choices: mc("The total kinetic energy of particles in a substance","The temperature of a substance","The energy of light","The energy stored in chemical bonds"), answer: "A", explanation: "Thermal energy is the total kinetic energy of all particles in a substance." },
      { text: "What is CONDUCTION?", choices: mc("Heat transfer through direct contact","Heat transfer through fluid movement","Heat transfer through electromagnetic waves","Heat transfer through a vacuum"), answer: "A", explanation: "Conduction is heat transfer through direct contact between objects." },
      { text: "What is CONVECTION?", choices: mc("Heat transfer through fluid movement","Heat transfer through direct contact","Heat transfer through electromagnetic waves","Heat transfer through solids"), answer: "A", explanation: "Convection is heat transfer through the movement of fluids (liquids and gases)." },
      { text: "What is RADIATION?", choices: mc("Heat transfer through electromagnetic waves","Heat transfer through direct contact","Heat transfer through fluid movement","Heat transfer through conduction"), answer: "A", explanation: "Radiation is heat transfer through electromagnetic waves (like sunlight)." },
      { text: "What is the LAW OF CONSERVATION OF ENERGY?", choices: mc("Energy cannot be created or destroyed, only transformed","Energy can be created from nothing","Energy always decreases","Energy only exists as heat"), answer: "A", explanation: "The law of conservation of energy states that energy cannot be created or destroyed, only changed from one form to another." },
    ],
    4: [
      { text: "What is SPEED?", choices: mc("Distance divided by time","Time divided by distance","Mass times acceleration","Force times distance"), answer: "A", explanation: "Speed = distance ÷ time." },
      { text: "What is NEWTON'S FIRST LAW?", choices: mc("An object at rest stays at rest unless acted on by an unbalanced force","Force equals mass times acceleration","For every action there is an equal and opposite reaction","Objects fall at the same rate"), answer: "A", explanation: "Newton's First Law (inertia): objects resist changes in motion." },
      { text: "What is NEWTON'S SECOND LAW?", choices: mc("Force equals mass times acceleration (F=ma)","Objects at rest stay at rest","For every action there is an equal and opposite reaction","Objects fall at the same rate"), answer: "A", explanation: "Newton's Second Law: F = ma (force = mass × acceleration)." },
      { text: "What is FRICTION?", choices: mc("A force that opposes motion between surfaces","A force that causes acceleration","A force that pulls objects toward Earth","A force that repels magnets"), answer: "A", explanation: "Friction is a force that opposes motion between surfaces in contact." },
      { text: "What is GRAVITY?", choices: mc("A force of attraction between objects with mass","A force that repels objects","A force that causes friction","A force that only acts on large objects"), answer: "A", explanation: "Gravity is the force of attraction between any two objects that have mass." },
    ],
    5: [
      { text: "What are Earth's LAYERS from outermost to innermost?", choices: mc("Crust, mantle, outer core, inner core","Core, mantle, crust, atmosphere","Mantle, crust, core, lithosphere","Crust, core, mantle, lithosphere"), answer: "A", explanation: "Earth's layers from outside to inside: crust, mantle, outer core, inner core." },
      { text: "What is PLATE TECTONICS?", choices: mc("The theory that Earth's crust is divided into moving plates","The study of earthquakes","The formation of mountains","The water cycle"), answer: "A", explanation: "Plate tectonics is the theory that Earth's lithosphere is divided into plates that move." },
      { text: "What causes EARTHQUAKES?", choices: mc("Movement of tectonic plates","Volcanic eruptions only","Ocean currents","Wind erosion"), answer: "A", explanation: "Earthquakes are caused by the sudden movement of tectonic plates along fault lines." },
      { text: "What is a VOLCANO?", choices: mc("An opening in Earth's crust where magma erupts","A type of earthquake","A mountain formed by erosion","A deep ocean trench"), answer: "A", explanation: "A volcano is an opening in Earth's crust through which magma, ash, and gases erupt." },
      { text: "What is the LITHOSPHERE?", choices: mc("Earth's rigid outer layer including the crust and upper mantle","Earth's liquid outer core","Earth's atmosphere","Earth's ocean floor"), answer: "A", explanation: "The lithosphere is Earth's rigid outer layer, consisting of the crust and uppermost mantle." },
    ],
    6: [
      { text: "What is WEATHERING?", choices: mc("The breaking down of rocks by physical or chemical processes","The movement of sediment","The formation of new rocks","The eruption of volcanoes"), answer: "A", explanation: "Weathering is the breaking down of rocks into smaller pieces through physical or chemical processes." },
      { text: "What is EROSION?", choices: mc("The movement of weathered material by water, wind, or ice","The breaking down of rocks","The deposition of sediment","The formation of soil"), answer: "A", explanation: "Erosion is the movement of weathered rock and sediment by agents like water, wind, or glaciers." },
      { text: "What is DEPOSITION?", choices: mc("The dropping of sediment when an agent of erosion slows down","The breaking down of rocks","The movement of sediment","The formation of new rock"), answer: "A", explanation: "Deposition occurs when an erosion agent (water, wind) slows and drops its sediment load." },
      { text: "What is SOIL made of?", choices: mc("Weathered rock, organic matter, water, air","Only sand","Only clay","Only organic matter"), answer: "A", explanation: "Soil is a mixture of weathered rock particles, organic matter (humus), water, and air." },
      { text: "What type of weathering involves ACID dissolving rock?", choices: mc("Chemical weathering","Physical weathering","Biological weathering","Mechanical weathering"), answer: "A", explanation: "Chemical weathering involves chemical reactions (like acid) that change the composition of rock." },
    ],
    7: [
      { text: "What is the ATMOSPHERE?", choices: mc("The layer of gases surrounding Earth","Earth's crust","The ocean","Earth's inner core"), answer: "A", explanation: "The atmosphere is the layer of gases (air) that surrounds Earth." },
      { text: "What causes WIND?", choices: mc("Differences in air pressure","Differences in water temperature","Earth's rotation only","The moon's gravity"), answer: "A", explanation: "Wind is caused by differences in air pressure — air moves from high to low pressure." },
      { text: "What is the WATER CYCLE?", choices: mc("The continuous movement of water through evaporation, condensation, and precipitation","The flow of rivers to the ocean","The freezing and melting of glaciers","The movement of ocean currents"), answer: "A", explanation: "The water cycle is the continuous movement of water through evaporation, condensation, and precipitation." },
      { text: "What is HUMIDITY?", choices: mc("The amount of water vapor in the air","The temperature of the air","The air pressure","The wind speed"), answer: "A", explanation: "Humidity is the amount of water vapor present in the air." },
      { text: "What is CLIMATE?", choices: mc("The average weather conditions of a region over a long period","The weather on a specific day","The temperature today","A single storm"), answer: "A", explanation: "Climate is the long-term average of weather conditions in a region." },
    ],
    8: [
      { text: "What is a FOOD WEB?", choices: mc("A diagram showing feeding relationships among organisms","A single food chain","A list of producers","A diagram of the water cycle"), answer: "A", explanation: "A food web shows the complex feeding relationships among many organisms in an ecosystem." },
      { text: "What is a PRODUCER in an ecosystem?", choices: mc("An organism that makes its own food through photosynthesis","An organism that eats other organisms","An organism that breaks down dead matter","An organism that eats only plants"), answer: "A", explanation: "Producers (plants, algae) make their own food through photosynthesis and are the base of food chains." },
      { text: "What is BIODIVERSITY?", choices: mc("The variety of life in an ecosystem","The number of plants only","The size of an ecosystem","The amount of rainfall"), answer: "A", explanation: "Biodiversity is the variety of different species and life forms in an ecosystem." },
      { text: "What is a BIOTIC factor?", choices: mc("A living component of an ecosystem","A non-living component","The temperature","The soil type"), answer: "A", explanation: "Biotic factors are the living components of an ecosystem (plants, animals, bacteria)." },
      { text: "What is CARRYING CAPACITY?", choices: mc("The maximum population an ecosystem can support","The total number of species","The size of the ecosystem","The amount of food available"), answer: "A", explanation: "Carrying capacity is the maximum population size that an ecosystem can sustainably support." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr6SSQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is ABSOLUTE LOCATION?", choices: mc("An exact location using coordinates (latitude and longitude)","A general description of where something is","The distance between two places","The direction from one place to another"), answer: "A", explanation: "Absolute location is the exact position of a place using latitude and longitude coordinates." },
      { text: "What is RELATIVE LOCATION?", choices: mc("A location described in relation to other places","An exact location using coordinates","The size of a region","The climate of an area"), answer: "A", explanation: "Relative location describes where a place is in relation to other places." },
      { text: "What is a MAP LEGEND (KEY)?", choices: mc("A guide that explains the symbols used on a map","The title of the map","The scale of the map","The compass rose"), answer: "A", explanation: "A map legend or key explains what the symbols, colors, and lines on a map represent." },
      { text: "What are the SEVEN CONTINENTS?", choices: mc("Africa, Antarctica, Asia, Australia, Europe, North America, South America","Africa, Asia, Europe, North America, South America, Pacific, Atlantic","Africa, Asia, Europe, North America, South America, Australia, Arctic","Africa, Asia, Europe, Americas, Australia, Antarctica, Pacific"), answer: "A", explanation: "The seven continents are Africa, Antarctica, Asia, Australia (Oceania), Europe, North America, and South America." },
      { text: "What is a PHYSICAL MAP?", choices: mc("A map that shows natural features like mountains, rivers, and plains","A map that shows political boundaries","A map that shows population","A map that shows roads"), answer: "A", explanation: "A physical map shows natural features of the Earth's surface like mountains, rivers, and plains." },
    ],
    2: [
      { text: "What is MESOPOTAMIA known as?", choices: mc("The Cradle of Civilization","The Land of Pharaohs","The Silk Road","The Fertile Crescent only"), answer: "A", explanation: "Mesopotamia (modern Iraq) is known as the Cradle of Civilization — one of the earliest civilizations developed there." },
      { text: "What was CUNEIFORM?", choices: mc("The writing system of ancient Mesopotamia","The Egyptian writing system","A type of government","A religious ceremony"), answer: "A", explanation: "Cuneiform was the writing system developed by the Sumerians of ancient Mesopotamia." },
      { text: "What was the CODE OF HAMMURABI?", choices: mc("One of the earliest written legal codes","An Egyptian religious text","A Greek philosophical work","A Chinese dynasty"), answer: "A", explanation: "The Code of Hammurabi was one of the earliest written legal codes, created by Babylonian King Hammurabi." },
      { text: "What were the PYRAMIDS of ancient Egypt used for?", choices: mc("As tombs for pharaohs","As temples for worship","As government buildings","As storage facilities"), answer: "A", explanation: "The pyramids of ancient Egypt were built as elaborate tombs for pharaohs and their possessions." },
      { text: "What is HIEROGLYPHICS?", choices: mc("The writing system of ancient Egypt using pictures and symbols","The writing system of Mesopotamia","A type of Egyptian government","A Greek alphabet"), answer: "A", explanation: "Hieroglyphics was the ancient Egyptian writing system using pictorial symbols." },
    ],
    3: [
      { text: "What was the AGORA in ancient Greece?", choices: mc("A public marketplace and gathering place","A type of government","A military unit","A religious temple"), answer: "A", explanation: "The agora was the central public space in ancient Greek city-states, used for markets and civic life." },
      { text: "What is DEMOCRACY?", choices: mc("A system of government where citizens have a say in decision-making","A system ruled by a king","A system ruled by a small group","A system ruled by the military"), answer: "A", explanation: "Democracy is a system of government where citizens participate in decision-making, developed in ancient Athens." },
      { text: "Who was SOCRATES?", choices: mc("A Greek philosopher known for the Socratic method","A Greek general","A Greek king","A Greek playwright"), answer: "A", explanation: "Socrates was an ancient Greek philosopher who developed the Socratic method of questioning." },
      { text: "What were the OLYMPIC GAMES in ancient Greece?", choices: mc("Athletic competitions held to honor Zeus","A type of government","A military training program","A religious ceremony"), answer: "A", explanation: "The ancient Olympic Games were athletic competitions held every four years to honor the god Zeus." },
      { text: "What is a CITY-STATE (POLIS)?", choices: mc("An independent city with its own government and surrounding territory","A type of Greek architecture","A Greek military unit","A Greek writing system"), answer: "A", explanation: "A city-state (polis) was an independent city with its own government, laws, and surrounding territory." },
    ],
    4: [
      { text: "What was the ROMAN REPUBLIC?", choices: mc("A system of government where citizens elected representatives","A monarchy ruled by an emperor","A democracy like ancient Athens","A military dictatorship"), answer: "A", explanation: "The Roman Republic was a system where citizens elected representatives (senators) to govern." },
      { text: "What is the ROMAN SENATE?", choices: mc("The governing body of the Roman Republic","The Roman military","The Roman religious council","The Roman court system"), answer: "A", explanation: "The Roman Senate was the governing body of the Roman Republic, composed of elected representatives." },
      { text: "What language did the Romans speak?", choices: mc("Latin","Greek","Italian","French"), answer: "A", explanation: "The Romans spoke Latin, which became the basis for Romance languages (Spanish, French, Italian, etc.)." },
      { text: "What was the PAX ROMANA?", choices: mc("A period of peace and stability in the Roman Empire","A Roman military campaign","A Roman religious festival","A Roman legal code"), answer: "A", explanation: "The Pax Romana ('Roman Peace') was a 200-year period of relative peace and stability in the Roman Empire." },
      { text: "What religion spread throughout the Roman Empire?", choices: mc("Christianity","Judaism","Islam","Hinduism"), answer: "A", explanation: "Christianity spread throughout the Roman Empire, eventually becoming its official religion." },
    ],
    5: [
      { text: "What was the SILK ROAD?", choices: mc("A network of trade routes connecting China to the Mediterranean","A road made of silk","A Chinese military route","A route used only for silk trade"), answer: "A", explanation: "The Silk Road was a network of trade routes connecting China to Central Asia, the Middle East, and the Mediterranean." },
      { text: "What is CONFUCIANISM?", choices: mc("A philosophy emphasizing respect, family, and social harmony","A Chinese religion with many gods","A Chinese military strategy","A Chinese writing system"), answer: "A", explanation: "Confucianism is a philosophy developed by Confucius emphasizing respect, family relationships, and social harmony." },
      { text: "What is the CASTE SYSTEM?", choices: mc("A social hierarchy in ancient India based on birth","A Chinese government system","An Egyptian religious system","A Greek democratic system"), answer: "A", explanation: "The caste system was a rigid social hierarchy in ancient India that determined one's social position by birth." },
      { text: "What religion originated in ancient India?", choices: mc("Hinduism","Buddhism only","Christianity","Islam"), answer: "A", explanation: "Hinduism is one of the world's oldest religions, originating in ancient India." },
      { text: "What was the GREAT WALL OF CHINA built for?", choices: mc("To protect China from northern invaders","To mark trade routes","To honor Chinese emperors","To control flooding"), answer: "A", explanation: "The Great Wall of China was built to protect China from invasions by northern nomadic groups." },
    ],
    6: [
      { text: "What are the FIVE PILLARS OF ISLAM?", choices: mc("Shahada, Salat, Zakat, Sawm, Hajj","Prayer, Fasting, Charity, Pilgrimage, Faith","Faith, Hope, Charity, Prayer, Fasting","Monotheism, Prayer, Charity, Fasting, Pilgrimage"), answer: "A", explanation: "The Five Pillars of Islam are: Shahada (faith), Salat (prayer), Zakat (charity), Sawm (fasting), and Hajj (pilgrimage)." },
      { text: "What is the HOLY BOOK of Islam?", choices: mc("The Quran","The Bible","The Torah","The Vedas"), answer: "A", explanation: "The Quran is the holy book of Islam, believed to be the word of God as revealed to the Prophet Muhammad." },
      { text: "What is MONOTHEISM?", choices: mc("Belief in one God","Belief in many gods","Belief in no gods","Belief in nature spirits"), answer: "A", explanation: "Monotheism is the belief in one God. Judaism, Christianity, and Islam are monotheistic religions." },
      { text: "Where did BUDDHISM originate?", choices: mc("India","China","Japan","Tibet"), answer: "A", explanation: "Buddhism originated in ancient India, founded by Siddhartha Gautama (the Buddha)." },
      { text: "What is the TORAH?", choices: mc("The holy scriptures of Judaism","The holy book of Christianity","The holy book of Islam","The holy book of Hinduism"), answer: "A", explanation: "The Torah is the central text of Judaism, containing the first five books of the Hebrew Bible." },
    ],
    7: [
      { text: "What is FEUDALISM?", choices: mc("A social and political system based on land ownership and loyalty","A type of democracy","A system of trade","A religious organization"), answer: "A", explanation: "Feudalism was a medieval social system where lords granted land (fiefs) to vassals in exchange for military service and loyalty." },
      { text: "What was the CRUSADES?", choices: mc("Military campaigns by European Christians to reclaim the Holy Land","A type of medieval government","A trade agreement","A religious ceremony"), answer: "A", explanation: "The Crusades were a series of military campaigns launched by European Christians to reclaim Jerusalem and the Holy Land." },
      { text: "What was the MAGNA CARTA?", choices: mc("A document limiting the power of the English king","A French royal decree","A religious document","A trade agreement"), answer: "A", explanation: "The Magna Carta (1215) was a document that limited the power of the English king and established certain rights." },
      { text: "What was the BLACK DEATH?", choices: mc("A devastating plague that killed millions in medieval Europe","A type of medieval warfare","A famine in medieval Europe","A volcanic eruption"), answer: "A", explanation: "The Black Death was a devastating plague (bubonic plague) that killed an estimated 1/3 of Europe's population in the 14th century." },
      { text: "What was the BYZANTINE EMPIRE?", choices: mc("The eastern continuation of the Roman Empire centered in Constantinople","A Greek city-state","A medieval kingdom in France","A North African empire"), answer: "A", explanation: "The Byzantine Empire was the continuation of the Eastern Roman Empire, centered in Constantinople (modern Istanbul)." },
    ],
    8: [
      { text: "What is a MARKET ECONOMY?", choices: mc("An economy where prices are determined by supply and demand","An economy controlled by the government","An economy based on trade only","An economy with no money"), answer: "A", explanation: "In a market economy, prices and production are determined by supply and demand with minimal government control." },
      { text: "What is SUPPLY AND DEMAND?", choices: mc("The relationship between the availability of a product and the desire for it","A type of government","A trade agreement","A tax system"), answer: "A", explanation: "Supply and demand describes how the availability of goods (supply) and consumer desire (demand) determine prices." },
      { text: "What is a DEMOCRACY?", choices: mc("A government where citizens have the power to make decisions","A government ruled by one person","A government ruled by a small group","A government with no laws"), answer: "A", explanation: "Democracy is a system of government where power comes from the citizens, who vote on decisions or elect representatives." },
      { text: "What is CITIZENSHIP?", choices: mc("Membership in a community with rights and responsibilities","Only the right to vote","Only the responsibility to pay taxes","A type of government"), answer: "A", explanation: "Citizenship involves being a member of a community (city, state, nation) with both rights and responsibilities." },
      { text: "What is SCARCITY in economics?", choices: mc("When resources are limited relative to wants and needs","When there is too much of a product","When prices are too high","When there is no trade"), answer: "A", explanation: "Scarcity occurs when resources are limited but wants and needs are unlimited, forcing choices about resource allocation." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr6TechQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is DIGITAL CITIZENSHIP?", choices: mc("Responsible and ethical use of technology","Using technology for fun","Owning a computer","Having internet access"), answer: "A", explanation: "Digital citizenship means using technology responsibly, ethically, and safely." },
      { text: "What is CYBERBULLYING?", choices: mc("Using technology to harass or harm others","A type of computer virus","A social media platform","A type of spam email"), answer: "A", explanation: "Cyberbullying is using digital technology to harass, threaten, or harm others." },
      { text: "What is a STRONG PASSWORD?", choices: mc("A password with letters, numbers, and symbols that is hard to guess","Your name and birthday","A simple word","A short number"), answer: "A", explanation: "A strong password uses a mix of uppercase and lowercase letters, numbers, and symbols and is at least 8 characters long." },
      { text: "What is PHISHING?", choices: mc("A scam where criminals try to steal personal information by pretending to be trustworthy","A type of computer program","A social media post","A search engine"), answer: "A", explanation: "Phishing is a cyberattack where criminals impersonate legitimate organizations to steal personal information." },
      { text: "What is a DIGITAL FOOTPRINT?", choices: mc("The trail of data you leave online","A type of computer file","A social media profile","A website address"), answer: "A", explanation: "A digital footprint is the record of all your online activities — posts, searches, and interactions." },
    ],
    2: [
      { text: "What is an ALGORITHM?", choices: mc("A step-by-step set of instructions to solve a problem","A type of computer hardware","A programming language","A type of data"), answer: "A", explanation: "An algorithm is a step-by-step set of instructions for solving a problem or completing a task." },
      { text: "What is DECOMPOSITION in computational thinking?", choices: mc("Breaking a complex problem into smaller, manageable parts","Adding more steps to a problem","Combining problems together","Ignoring complex parts"), answer: "A", explanation: "Decomposition means breaking a complex problem into smaller, more manageable sub-problems." },
      { text: "What is a FLOWCHART?", choices: mc("A diagram that shows the steps of a process or algorithm","A type of graph","A computer program","A data table"), answer: "A", explanation: "A flowchart is a visual diagram that shows the steps of a process or algorithm using shapes and arrows." },
      { text: "What is PATTERN RECOGNITION in computational thinking?", choices: mc("Finding similarities or patterns in problems to solve them more efficiently","Creating new patterns","Ignoring patterns","Drawing patterns"), answer: "A", explanation: "Pattern recognition means identifying similarities or patterns in problems to apply known solutions." },
      { text: "What is ABSTRACTION in computational thinking?", choices: mc("Focusing on important information and ignoring unnecessary details","Adding more details to a problem","Creating complex solutions","Drawing pictures"), answer: "A", explanation: "Abstraction means focusing on the essential information needed to solve a problem while ignoring irrelevant details." },
    ],
    3: [
      { text: "What does HTML stand for?", choices: mc("HyperText Markup Language","High Tech Modern Language","HyperText Modern Layout","High Transfer Markup Language"), answer: "A", explanation: "HTML stands for HyperText Markup Language — the standard language for creating web pages." },
      { text: "In block-based coding, what is a LOOP?", choices: mc("A block that repeats instructions multiple times","A block that makes a decision","A block that ends the program","A block that starts the program"), answer: "A", explanation: "A loop is a programming construct that repeats a set of instructions a specified number of times or until a condition is met." },
      { text: "What is a CONDITIONAL statement in programming?", choices: mc("An 'if-then' statement that executes code based on a condition","A loop that repeats code","A variable that stores data","A function that performs a task"), answer: "A", explanation: "A conditional statement (if-then) executes code only when a specific condition is true." },
      { text: "What is a VARIABLE in programming?", choices: mc("A named storage location that holds a value","A type of loop","A conditional statement","A function"), answer: "A", explanation: "A variable is a named container that stores a value which can change during program execution." },
      { text: "What is DEBUGGING?", choices: mc("Finding and fixing errors in a program","Writing new code","Running a program","Saving a file"), answer: "A", explanation: "Debugging is the process of finding and fixing errors (bugs) in a computer program." },
    ],
    4: [
      { text: "What is a SPREADSHEET?", choices: mc("A program that organizes data in rows and columns for analysis","A word processing document","A presentation program","A drawing program"), answer: "A", explanation: "A spreadsheet organizes data in rows and columns and allows calculations, analysis, and visualization." },
      { text: "What is a CELL in a spreadsheet?", choices: mc("The intersection of a row and column","A type of formula","A chart type","A data filter"), answer: "A", explanation: "A cell is the individual box at the intersection of a row and column in a spreadsheet." },
      { text: "What does the SUM function do in a spreadsheet?", choices: mc("Adds up a range of numbers","Finds the average","Counts the number of cells","Finds the maximum value"), answer: "A", explanation: "The SUM function adds up all numbers in a specified range of cells." },
      { text: "What is a CHART in a spreadsheet?", choices: mc("A visual representation of data","A type of formula","A data table","A cell reference"), answer: "A", explanation: "A chart is a visual representation of data (bar chart, pie chart, line graph) created from spreadsheet data." },
      { text: "What is DATA in computing?", choices: mc("Information stored and processed by a computer","A type of program","A computer component","A network connection"), answer: "A", explanation: "Data is information that is stored, processed, and used by computers." },
    ],
    5: [
      { text: "What is MULTIMEDIA?", choices: mc("Content that uses multiple forms of media (text, images, audio, video)","Only video content","Only audio content","Only text content"), answer: "A", explanation: "Multimedia combines multiple forms of media including text, images, audio, video, and animation." },
      { text: "What is COPYRIGHT?", choices: mc("Legal protection for original creative works","A type of computer program","A social media policy","A type of license"), answer: "A", explanation: "Copyright is legal protection that gives creators exclusive rights to their original works." },
      { text: "What is FAIR USE?", choices: mc("Limited use of copyrighted material for education, commentary, or criticism","Using any content freely","Copying everything online","Sharing all files"), answer: "A", explanation: "Fair use allows limited use of copyrighted material for purposes like education, commentary, or criticism." },
      { text: "What is a CREATIVE COMMONS license?", choices: mc("A license that allows others to use creative work under specified conditions","Full copyright protection","No copyright protection","A government license"), answer: "A", explanation: "Creative Commons licenses allow creators to specify how others may use their work." },
      { text: "What is RESOLUTION in digital images?", choices: mc("The number of pixels in an image, determining its clarity","The size of the file","The color of the image","The format of the image"), answer: "A", explanation: "Resolution refers to the number of pixels in an image — higher resolution means greater clarity and detail." },
    ],
    6: [
      { text: "What is ARTIFICIAL INTELLIGENCE (AI)?", choices: mc("Computer systems that can perform tasks that normally require human intelligence","A type of robot","A social media platform","A programming language"), answer: "A", explanation: "Artificial intelligence (AI) refers to computer systems designed to perform tasks that typically require human intelligence." },
      { text: "What is a SEARCH ENGINE?", choices: mc("A program that searches the internet and returns relevant results","A type of browser","A social media site","An email program"), answer: "A", explanation: "A search engine (like Google) indexes web content and returns relevant results based on search queries." },
      { text: "What is INFORMATION LITERACY?", choices: mc("The ability to find, evaluate, and use information effectively","The ability to read quickly","The ability to type fast","The ability to code"), answer: "A", explanation: "Information literacy is the ability to identify, locate, evaluate, and effectively use information." },
      { text: "What is a CREDIBLE SOURCE?", choices: mc("A reliable, trustworthy source of information","Any website","A social media post","An anonymous blog"), answer: "A", explanation: "A credible source is reliable, accurate, and trustworthy — often from experts, institutions, or reputable publications." },
      { text: "What is CLOUD COMPUTING?", choices: mc("Storing and accessing data and programs over the internet instead of a local computer","A type of weather forecasting","A physical computer component","A programming language"), answer: "A", explanation: "Cloud computing means storing data and running programs on remote servers accessed via the internet." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr7MathQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is the CONSTANT OF PROPORTIONALITY (k) in y = kx?", choices: mc("The unit rate or ratio y/x","The y-intercept","The slope only","The x-value"), answer: "A", explanation: "In y = kx, k is the constant of proportionality — the unit rate or ratio y/x." },
      { text: "A car travels 240 miles in 4 hours. What is the unit rate?", choices: mc("60 mph","80 mph","40 mph","120 mph"), answer: "A", explanation: "240 ÷ 4 = 60 miles per hour." },
      { text: "Which equation represents a proportional relationship?", choices: mc("y = 5x","y = 5x + 2","y = x²","y = 5"), answer: "A", explanation: "y = 5x is proportional (passes through origin, constant ratio). y = 5x + 2 has a y-intercept of 2, so it's not proportional." },
      { text: "If y is proportional to x and y = 21 when x = 3, what is y when x = 8?", choices: mc("56","24","48","63"), answer: "A", explanation: "k = 21/3 = 7. y = 7(8) = 56." },
      { text: "A map uses a scale of 1 inch = 50 miles. If two cities are 3.5 inches apart on the map, what is the actual distance?", choices: mc("175 miles","150 miles","200 miles","105 miles"), answer: "A", explanation: "3.5 × 50 = 175 miles." },
    ],
    2: [
      { text: "What is -2/3 + 1/2?", choices: mc("-1/6","1/6","-7/6","7/6"), answer: "A", explanation: "LCD = 6. -4/6 + 3/6 = -1/6." },
      { text: "What is (-3/4) × (-2/3)?", choices: mc("1/2","-1/2","3/8","-3/8"), answer: "A", explanation: "(-3/4)×(-2/3) = 6/12 = 1/2. Negative × negative = positive." },
      { text: "What is -5 - (-3)?", choices: mc("-2","-8","2","8"), answer: "A", explanation: "-5 - (-3) = -5 + 3 = -2." },
      { text: "What is 2/3 ÷ (-4)?", choices: mc("-1/6","1/6","-8/3","8/3"), answer: "A", explanation: "2/3 ÷ 4 = 2/12 = 1/6. Positive ÷ negative = negative: -1/6." },
      { text: "Evaluate: -3² + 4 × 2", choices: mc("-1","5","-5","1"), answer: "A", explanation: "-3² = -9 (not (-3)²). 4×2=8. -9+8 = -1." },
    ],
    3: [
      { text: "Solve: 2x + 5 = 17", choices: mc("6","11","6.5","7"), answer: "A", explanation: "2x = 17 - 5 = 12. x = 6." },
      { text: "Solve: 3(x - 2) = 15", choices: mc("7","5","3","9"), answer: "A", explanation: "3x - 6 = 15. 3x = 21. x = 7." },
      { text: "Solve: -4x + 3 = -13", choices: mc("4","-4","2.5","-2.5"), answer: "A", explanation: "-4x = -16. x = 4." },
      { text: "Simplify: 3x + 2y - x + 5y", choices: mc("2x + 7y","4x + 7y","2x + 3y","4x + 3y"), answer: "A", explanation: "Combine like terms: (3x-x) + (2y+5y) = 2x + 7y." },
      { text: "Solve the inequality: 2x - 3 > 7", choices: mc("x > 5","x > 2","x < 5","x < 2"), answer: "A", explanation: "2x > 10. x > 5." },
    ],
    4: [
      { text: "A jacket costs $80. It is on sale for 25% off. What is the sale price?", choices: mc("$60","$55","$65","$20"), answer: "A", explanation: "25% of $80 = $20 discount. $80 - $20 = $60." },
      { text: "What is the total cost of a $45 meal with a 20% tip?", choices: mc("$54","$49","$56","$50"), answer: "A", explanation: "20% of $45 = $9 tip. $45 + $9 = $54." },
      { text: "A store marks up an item 40% from its cost of $25. What is the selling price?", choices: mc("$35","$30","$40","$65"), answer: "A", explanation: "40% of $25 = $10 markup. $25 + $10 = $35." },
      { text: "What is the percent change from 50 to 65?", choices: mc("30%","15%","25%","13%"), answer: "A", explanation: "Change = 15. Percent change = 15/50 × 100 = 30%." },
      { text: "Simple interest formula: I = prt. If p = $500, r = 4%, t = 3 years, what is the interest?", choices: mc("$60","$600","$6","$560"), answer: "A", explanation: "I = 500 × 0.04 × 3 = $60." },
    ],
    5: [
      { text: "Two triangles are SIMILAR. One has sides 3, 4, 5. The other has a shortest side of 9. What is its longest side?", choices: mc("15","12","9","18"), answer: "A", explanation: "Scale factor = 9/3 = 3. Longest side = 5 × 3 = 15." },
      { text: "A scale drawing uses 1 cm = 5 m. A room is 4 cm × 3 cm on the drawing. What are the actual dimensions?", choices: mc("20 m × 15 m","4 m × 3 m","40 m × 30 m","8 m × 6 m"), answer: "A", explanation: "4 × 5 = 20 m; 3 × 5 = 15 m." },
      { text: "What is the scale factor if a 6-inch model represents a 30-foot building?", choices: mc("1:60","1:5","1:30","1:6"), answer: "A", explanation: "Convert: 30 feet = 360 inches. Scale = 6:360 = 1:60." },
      { text: "Two similar rectangles: the first is 4 × 6. The second has a width of 10. What is its length?", choices: mc("15","12","24","8"), answer: "A", explanation: "Scale factor = 10/4 = 2.5. Length = 6 × 2.5 = 15." },
      { text: "If two figures are CONGRUENT, what is true?", choices: mc("They have the same shape and size","They have the same shape but different sizes","They have different shapes but same size","They are mirror images only"), answer: "A", explanation: "Congruent figures have exactly the same shape and size." },
    ],
    6: [
      { text: "What is the CIRCUMFERENCE of a circle with radius 7? (Use π ≈ 3.14)", choices: mc("43.96","21.98","153.86","44"), answer: "A", explanation: "C = 2πr = 2 × 3.14 × 7 = 43.96." },
      { text: "What is the AREA of a circle with diameter 10? (Use π ≈ 3.14)", choices: mc("78.5","31.4","314","15.7"), answer: "A", explanation: "r = 5. A = πr² = 3.14 × 25 = 78.5." },
      { text: "What is the area of a composite figure made of a rectangle (6×4) and a triangle (base 6, height 3)?", choices: mc("33","24","9","42"), answer: "A", explanation: "Rectangle: 6×4=24. Triangle: (1/2)×6×3=9. Total: 24+9=33." },
      { text: "What is the perimeter of a semicircle with diameter 8? (Use π ≈ 3.14)", choices: mc("20.56","25.12","12.56","16"), answer: "A", explanation: "Semicircle perimeter = πr + d = 3.14×4 + 8 = 12.56 + 8 = 20.56." },
      { text: "What is the area of a trapezoid with bases 5 and 9 and height 4?", choices: mc("28","36","14","18"), answer: "A", explanation: "A = (1/2)(b₁+b₂)h = (1/2)(5+9)(4) = (1/2)(14)(4) = 28." },
    ],
    7: [
      { text: "What is the MEAN ABSOLUTE DEVIATION (MAD)?", choices: mc("The average distance of each data point from the mean","The range of the data","The median of the data","The most frequent value"), answer: "A", explanation: "MAD is the average of the absolute deviations from the mean, measuring data spread." },
      { text: "A bag has 3 red, 4 blue, and 5 green marbles. What is the probability of picking a blue marble?", choices: mc("1/3","1/4","5/12","4/5"), answer: "A", explanation: "P(blue) = 4/12 = 1/3." },
      { text: "What is the probability of flipping heads twice in a row?", choices: mc("1/4","1/2","1/8","3/4"), answer: "A", explanation: "P(heads) × P(heads) = 1/2 × 1/2 = 1/4." },
      { text: "A data set has values: 5, 7, 7, 8, 10, 12. What is the IQR?", choices: mc("4","7","5","3"), answer: "A", explanation: "Q1=7, Q3=11... Ordered: 5,7,7,8,10,12. Q1=7, Q3=10. IQR=10-7=3... Actually Q1=(7+7)/2=7, Q3=(10+12)/2=11. IQR=11-7=4." },
      { text: "What does a PROBABILITY of 0 mean?", choices: mc("The event is impossible","The event is certain","The event is likely","The event is unlikely"), answer: "A", explanation: "A probability of 0 means the event cannot happen (impossible)." },
    ],
    8: [
      { text: "What is a BUDGET?", choices: mc("A plan for spending and saving money","A type of bank account","A credit card","A type of loan"), answer: "A", explanation: "A budget is a financial plan that tracks income and expenses to manage money effectively." },
      { text: "What is GROSS INCOME?", choices: mc("Total earnings before taxes and deductions","Earnings after taxes","A type of investment","A bank account balance"), answer: "A", explanation: "Gross income is the total amount earned before taxes and other deductions are taken out." },
      { text: "What is NET INCOME?", choices: mc("Earnings after taxes and deductions","Total earnings before taxes","A type of investment","A bank account"), answer: "A", explanation: "Net income is what you actually take home after taxes and deductions are subtracted from gross income." },
      { text: "What is INTEREST on a savings account?", choices: mc("Money the bank pays you for keeping your money there","A fee you pay the bank","A type of tax","A penalty for spending"), answer: "A", explanation: "Interest on a savings account is money the bank pays you as a percentage of your balance." },
      { text: "What is CREDIT?", choices: mc("Borrowing money with the promise to repay it later","Free money from the bank","A type of savings","A government payment"), answer: "A", explanation: "Credit is the ability to borrow money or access goods/services with the promise to pay later." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr7ELAQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is SYMBOLISM in literature?", choices: mc("When an object, person, or event represents something beyond its literal meaning","A type of figurative language using 'like' or 'as'","The author's attitude toward the subject","The main conflict of the story"), answer: "A", explanation: "Symbolism occurs when something represents a deeper meaning beyond its literal definition." },
      { text: "What is CHARACTER DEVELOPMENT?", choices: mc("How a character changes or grows throughout a story","The physical description of a character","The character's role in the plot","The character's dialogue"), answer: "A", explanation: "Character development refers to how a character changes, grows, or evolves throughout the narrative." },
      { text: "What is THEME vs. TOPIC?", choices: mc("Topic is the subject; theme is the message about that subject","They are the same thing","Topic is the message; theme is the subject","Theme is the plot; topic is the setting"), answer: "A", explanation: "The topic is what the story is about (e.g., friendship); the theme is the message about that topic (e.g., true friendship requires sacrifice)." },
      { text: "What is FORESHADOWING?", choices: mc("Hints or clues about what will happen later in the story","A flashback to earlier events","The climax of the story","The resolution"), answer: "A", explanation: "Foreshadowing is the use of hints or clues early in a story to suggest what will happen later." },
      { text: "What is IRONY?", choices: mc("A contrast between what is expected and what actually happens","A comparison using 'like' or 'as'","Giving human traits to non-human things","Exaggeration for effect"), answer: "A", explanation: "Irony is a contrast between expectation and reality, or between what is said and what is meant." },
    ],
    2: [
      { text: "What is an EXTENDED METAPHOR?", choices: mc("A metaphor that continues throughout a passage or entire work","A very long simile","A metaphor using 'like' or 'as'","A comparison of two unlike things in one sentence"), answer: "A", explanation: "An extended metaphor is a comparison that continues throughout multiple lines, stanzas, or an entire work." },
      { text: "What is MOOD in literature?", choices: mc("The feeling or atmosphere the reader experiences","The author's attitude toward the subject","The main character's emotions","The story's theme"), answer: "A", explanation: "Mood is the emotional atmosphere of a text — how it makes the reader feel." },
      { text: "What is DRAMATIC IRONY?", choices: mc("When the audience knows something the characters don't","When a character says the opposite of what they mean","When the outcome is unexpected","When the setting creates suspense"), answer: "A", explanation: "Dramatic irony occurs when the audience has information that the characters in the story do not." },
      { text: "What is FREE VERSE poetry?", choices: mc("Poetry without a fixed rhyme scheme or meter","Poetry with a strict rhyme scheme","Poetry with exactly 14 lines","Poetry that always rhymes"), answer: "A", explanation: "Free verse poetry does not follow a fixed rhyme scheme or metrical pattern." },
      { text: "What is HYPERBOLE?", choices: mc("Extreme exaggeration for emphasis or effect","A comparison using 'like' or 'as'","Giving human traits to non-human things","Repeating consonant sounds"), answer: "A", explanation: "Hyperbole is extreme exaggeration used for emphasis or humorous effect (e.g., 'I've told you a million times')." },
    ],
    3: [
      { text: "What is ETHOS in persuasion?", choices: mc("An appeal to credibility or authority","An appeal to emotion","An appeal to logic","An appeal to the audience's values"), answer: "A", explanation: "Ethos is a rhetorical appeal based on the credibility, character, or authority of the speaker or writer." },
      { text: "What is PATHOS in persuasion?", choices: mc("An appeal to emotion","An appeal to credibility","An appeal to logic","An appeal to authority"), answer: "A", explanation: "Pathos is a rhetorical appeal to the audience's emotions." },
      { text: "What is LOGOS in persuasion?", choices: mc("An appeal to logic, reason, and evidence","An appeal to emotion","An appeal to credibility","An appeal to authority"), answer: "A", explanation: "Logos is a rhetorical appeal based on logic, reason, facts, and evidence." },
      { text: "What is a COUNTERARGUMENT?", choices: mc("An opposing viewpoint to the main argument","Supporting evidence for the main argument","The conclusion of an argument","The introduction of an argument"), answer: "A", explanation: "A counterargument presents an opposing viewpoint that the writer must acknowledge and refute." },
      { text: "What is BIAS in informational text?", choices: mc("A one-sided or prejudiced perspective that favors one viewpoint","Objective reporting of facts","A type of text structure","A writing technique"), answer: "A", explanation: "Bias is a tendency to favor one perspective over another, often without presenting all sides fairly." },
    ],
    4: [
      { text: "What is DENOTATION?", choices: mc("The literal, dictionary definition of a word","The emotional meaning of a word","The word's origin","The word's part of speech"), answer: "A", explanation: "Denotation is the literal, dictionary definition of a word." },
      { text: "What is CONNOTATION?", choices: mc("The emotional or cultural meaning associated with a word","The literal definition","The word's origin","The word's prefix"), answer: "A", explanation: "Connotation is the emotional or cultural meaning a word carries beyond its literal definition." },
      { text: "What is a MORPHEME?", choices: mc("The smallest unit of meaning in a word","A type of sentence","A paragraph structure","A literary device"), answer: "A", explanation: "A morpheme is the smallest meaningful unit in a language (e.g., 'un-', 'help', '-ful' in 'unhelpful')." },
      { text: "What does the suffix '-ology' mean?", choices: mc("The study of","Without","Full of","Relating to"), answer: "A", explanation: "The suffix '-ology' means 'the study of' (e.g., biology = study of life)." },
      { text: "What is an ANALOGY?", choices: mc("A comparison that shows a relationship between two pairs of words","A type of metaphor","A synonym","A definition"), answer: "A", explanation: "An analogy shows a relationship between two pairs of words (e.g., hot:cold :: day:night)." },
    ],
    5: [
      { text: "What is a CLAIM in argumentative writing?", choices: mc("The writer's main argument or position","A piece of evidence","The conclusion","The introduction"), answer: "A", explanation: "A claim is the writer's main argument or position that they will support with evidence." },
      { text: "What is a REBUTTAL?", choices: mc("A response that addresses and refutes a counterargument","A supporting argument","The conclusion","The introduction"), answer: "A", explanation: "A rebuttal addresses and refutes the counterargument, strengthening the writer's position." },
      { text: "What is the purpose of EVIDENCE in argumentative writing?", choices: mc("To support and prove the claim","To entertain the reader","To introduce the topic","To conclude the essay"), answer: "A", explanation: "Evidence (facts, statistics, examples, quotes) supports and proves the writer's claim." },
      { text: "What is a LOGICAL FALLACY?", choices: mc("An error in reasoning that weakens an argument","A strong piece of evidence","A type of claim","A transition word"), answer: "A", explanation: "A logical fallacy is a flaw in reasoning that makes an argument invalid or misleading." },
      { text: "What is the WARRANT in an argument?", choices: mc("The explanation of how evidence supports the claim","The claim itself","The counterargument","The conclusion"), answer: "A", explanation: "The warrant explains the logical connection between the evidence and the claim." },
    ],
    6: [
      { text: "What is the CONTROLLING IDEA of an expository essay?", choices: mc("The thesis statement that guides the entire essay","The first body paragraph","The conclusion","A supporting detail"), answer: "A", explanation: "The controlling idea (thesis) is the central argument or point that guides the entire essay." },
      { text: "What is COHERENCE in writing?", choices: mc("When ideas flow logically and smoothly from one to the next","Using many vocabulary words","Writing long paragraphs","Using many examples"), answer: "A", explanation: "Coherence means ideas are logically connected and flow smoothly, making the writing easy to follow." },
      { text: "What is ELABORATION in writing?", choices: mc("Developing ideas with details, examples, and explanation","Repeating the main idea","Using transition words","Writing a conclusion"), answer: "A", explanation: "Elaboration means developing ideas fully with specific details, examples, and explanations." },
      { text: "What is the purpose of a BODY PARAGRAPH?", choices: mc("To develop and support the thesis with evidence and analysis","To introduce the topic","To conclude the essay","To hook the reader"), answer: "A", explanation: "Body paragraphs develop and support the thesis statement with evidence, analysis, and elaboration." },
      { text: "What is SENTENCE VARIETY?", choices: mc("Using different sentence types and lengths to improve writing style","Using only simple sentences","Using only complex sentences","Repeating the same sentence structure"), answer: "A", explanation: "Sentence variety means using a mix of simple, compound, and complex sentences of different lengths to improve style." },
    ],
    7: [
      { text: "What is a RESEARCH QUESTION?", choices: mc("A focused question that guides a research project","The title of a research paper","A bibliography entry","A type of evidence"), answer: "A", explanation: "A research question is a focused, specific question that guides the direction of a research project." },
      { text: "What is a SECONDARY SOURCE?", choices: mc("A source that analyzes or interprets primary sources","An original document","A firsthand account","A personal diary"), answer: "A", explanation: "A secondary source analyzes, interprets, or summarizes primary sources (e.g., textbooks, biographies, articles)." },
      { text: "What is MLA FORMAT?", choices: mc("A citation style used in English and humanities research","A type of essay structure","A grammar rule","A research method"), answer: "A", explanation: "MLA (Modern Language Association) format is a citation style commonly used in English and humanities research." },
      { text: "What is SYNTHESIS in research writing?", choices: mc("Combining information from multiple sources to support an argument","Copying information from one source","Summarizing one source","Creating a bibliography"), answer: "A", explanation: "Synthesis means combining information from multiple sources to create a new, unified argument or understanding." },
      { text: "What is an ANNOTATED BIBLIOGRAPHY?", choices: mc("A list of sources with a brief summary and evaluation of each","A list of sources only","A type of essay","A research question"), answer: "A", explanation: "An annotated bibliography lists sources and includes a brief summary and evaluation of each source." },
    ],
    8: [
      { text: "What is a COMPLEX SENTENCE?", choices: mc("A sentence with one independent clause and at least one dependent clause","A sentence with two independent clauses","A sentence with only one clause","A sentence fragment"), answer: "A", explanation: "A complex sentence has one independent clause and at least one dependent clause joined by a subordinating conjunction." },
      { text: "What is PARALLEL STRUCTURE in writing?", choices: mc("Using the same grammatical form for items in a list or series","Using different grammatical forms","Repeating words for emphasis","Using transition words"), answer: "A", explanation: "Parallel structure means using the same grammatical form for items in a list or series (e.g., 'running, jumping, and swimming')." },
      { text: "What is a DANGLING MODIFIER?", choices: mc("A modifier that doesn't clearly refer to the word it modifies","A type of transition word","A sentence fragment","A type of clause"), answer: "A", explanation: "A dangling modifier is a word or phrase that doesn't clearly or logically connect to the word it's meant to modify." },
      { text: "What is DICTION?", choices: mc("Word choice in writing","Sentence structure","Paragraph organization","Punctuation"), answer: "A", explanation: "Diction refers to the author's choice of words, which affects tone, style, and meaning." },
      { text: "What is SYNTAX?", choices: mc("The arrangement of words and phrases to create sentences","Word choice","Punctuation","Paragraph structure"), answer: "A", explanation: "Syntax refers to the rules governing how words are arranged to form grammatically correct sentences." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr7SciQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is a CONTROLLED EXPERIMENT?", choices: mc("An experiment where only one variable is changed at a time","An experiment with no variables","An experiment with many variables changed","An observation without testing"), answer: "A", explanation: "A controlled experiment changes only one variable (independent) while keeping all others constant." },
      { text: "What is the DEPENDENT VARIABLE?", choices: mc("The variable that is measured or observed","The variable that is changed","The variable that stays the same","The control group"), answer: "A", explanation: "The dependent variable is what you measure — it depends on the independent variable." },
      { text: "What does PEER REVIEW mean in science?", choices: mc("Other scientists evaluate and check the research","Students review each other's work","A teacher grades an assignment","Publishing a paper"), answer: "A", explanation: "Peer review is when other scientists evaluate research for accuracy, methodology, and validity before publication." },
      { text: "What is a SCIENTIFIC THEORY?", choices: mc("A well-tested explanation supported by extensive evidence","A guess or hypothesis","An untested idea","A single experiment's result"), answer: "A", explanation: "A scientific theory is a well-substantiated explanation supported by extensive evidence and testing." },
      { text: "What is METRIC SYSTEM?", choices: mc("A measurement system based on powers of 10","A measurement system using inches and pounds","A measurement system for temperature only","A measurement system for volume only"), answer: "A", explanation: "The metric system is a decimal-based measurement system used in science worldwide." },
    ],
    2: [
      { text: "What is a CELL?", choices: mc("The basic unit of life","A type of tissue","A type of organ","A type of organism"), answer: "A", explanation: "The cell is the basic structural and functional unit of all living organisms." },
      { text: "What is the function of the NUCLEUS?", choices: mc("Controls cell activities and contains DNA","Produces energy for the cell","Makes proteins","Controls what enters and exits the cell"), answer: "A", explanation: "The nucleus is the control center of the cell, containing DNA and directing cell activities." },
      { text: "What is the difference between PROKARYOTIC and EUKARYOTIC cells?", choices: mc("Prokaryotes lack a membrane-bound nucleus; eukaryotes have one","Prokaryotes are larger; eukaryotes are smaller","Prokaryotes have more organelles","Eukaryotes lack DNA"), answer: "A", explanation: "Prokaryotic cells (bacteria) lack a membrane-bound nucleus; eukaryotic cells (plants, animals, fungi) have a nucleus." },
      { text: "What is the CELL MEMBRANE?", choices: mc("A selectively permeable barrier that controls what enters and exits the cell","The control center of the cell","The site of protein synthesis","The site of energy production"), answer: "A", explanation: "The cell membrane is a selectively permeable barrier that regulates what enters and exits the cell." },
      { text: "What is the function of MITOCHONDRIA?", choices: mc("Produces energy (ATP) through cellular respiration","Controls cell activities","Makes proteins","Stores genetic information"), answer: "A", explanation: "Mitochondria are the 'powerhouses' of the cell, producing ATP through cellular respiration." },
    ],
    3: [
      { text: "What is PHOTOSYNTHESIS?", choices: mc("The process by which plants use sunlight, water, and CO₂ to make glucose","The process by which cells break down glucose for energy","The process by which cells divide","The process by which organisms reproduce"), answer: "A", explanation: "Photosynthesis: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂." },
      { text: "What is CELLULAR RESPIRATION?", choices: mc("The process by which cells break down glucose to release energy (ATP)","The process by which plants make food","The process of breathing","The process of cell division"), answer: "A", explanation: "Cellular respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP (energy)." },
      { text: "Where does PHOTOSYNTHESIS occur in plant cells?", choices: mc("Chloroplasts","Mitochondria","Nucleus","Ribosomes"), answer: "A", explanation: "Photosynthesis occurs in the chloroplasts, which contain the green pigment chlorophyll." },
      { text: "What gas do plants RELEASE during photosynthesis?", choices: mc("Oxygen","Carbon dioxide","Nitrogen","Hydrogen"), answer: "A", explanation: "Plants release oxygen as a byproduct of photosynthesis." },
      { text: "What is ATP?", choices: mc("The energy currency of the cell","A type of protein","A type of DNA","A cell organelle"), answer: "A", explanation: "ATP (adenosine triphosphate) is the molecule that stores and transfers energy within cells." },
    ],
    4: [
      { text: "What is DNA?", choices: mc("The molecule that carries genetic information","A type of protein","A type of carbohydrate","A cell organelle"), answer: "A", explanation: "DNA (deoxyribonucleic acid) is the molecule that contains the genetic instructions for all living organisms." },
      { text: "What is a GENE?", choices: mc("A segment of DNA that codes for a specific trait","A type of chromosome","A type of protein","A cell organelle"), answer: "A", explanation: "A gene is a specific sequence of DNA that codes for a particular protein or trait." },
      { text: "What is a PUNNETT SQUARE used for?", choices: mc("To predict the probability of offspring traits","To show cell division","To map the human genome","To show evolutionary relationships"), answer: "A", explanation: "A Punnett square is a tool used to predict the probability of offspring inheriting specific traits." },
      { text: "What is a DOMINANT trait?", choices: mc("A trait that is expressed when at least one dominant allele is present","A trait that is only expressed when two recessive alleles are present","The most common trait","The strongest physical trait"), answer: "A", explanation: "A dominant trait is expressed whenever at least one dominant allele (represented by a capital letter) is present." },
      { text: "What is HEREDITY?", choices: mc("The passing of traits from parents to offspring","The study of cells","The process of evolution","The study of ecosystems"), answer: "A", explanation: "Heredity is the passing of genetic traits from parents to their offspring." },
    ],
    5: [
      { text: "What is NATURAL SELECTION?", choices: mc("The process by which organisms with favorable traits survive and reproduce more","The process of random mutation","The process of artificial breeding","The process of genetic engineering"), answer: "A", explanation: "Natural selection is the mechanism of evolution: organisms with traits better suited to their environment survive and reproduce more." },
      { text: "What is ADAPTATION?", choices: mc("A trait that helps an organism survive in its environment","A random genetic change","A type of reproduction","A type of behavior"), answer: "A", explanation: "An adaptation is a heritable trait that increases an organism's fitness (survival and reproduction) in its environment." },
      { text: "What is EVOLUTION?", choices: mc("Change in the genetic makeup of a population over time","Change in an individual organism during its lifetime","The development of a single organism","A type of reproduction"), answer: "A", explanation: "Evolution is the change in the heritable characteristics of a population over successive generations." },
      { text: "What is FOSSIL EVIDENCE used for in evolution?", choices: mc("To show that organisms have changed over time","To show that organisms don't change","To prove genetic mutations","To study living organisms"), answer: "A", explanation: "Fossils provide evidence of organisms that lived in the past and show how species have changed over time." },
      { text: "What is VARIATION in a population?", choices: mc("Differences in traits among individuals of the same species","All individuals having the same traits","A type of mutation","A type of reproduction"), answer: "A", explanation: "Variation refers to the differences in traits among individuals within a population." },
    ],
    6: [
      { text: "What is TAXONOMY?", choices: mc("The science of classifying and naming organisms","The study of ecosystems","The study of genetics","The study of evolution"), answer: "A", explanation: "Taxonomy is the science of classifying and naming organisms based on shared characteristics." },
      { text: "What is the correct order of taxonomic classification from broadest to most specific?", choices: mc("Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species","Kingdom, Domain, Phylum, Class, Order, Family, Genus, Species","Species, Genus, Family, Order, Class, Phylum, Kingdom, Domain","Domain, Phylum, Kingdom, Class, Order, Family, Genus, Species"), answer: "A", explanation: "The taxonomic hierarchy from broadest to most specific: Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species." },
      { text: "What is a DICHOTOMOUS KEY?", choices: mc("A tool used to identify organisms based on a series of yes/no questions","A type of classification system","A type of phylogenetic tree","A list of species"), answer: "A", explanation: "A dichotomous key is a tool that uses a series of paired statements or questions to identify organisms." },
      { text: "What is a VERTEBRATE?", choices: mc("An animal with a backbone","An animal without a backbone","A type of plant","A type of fungus"), answer: "A", explanation: "Vertebrates are animals that have a backbone (vertebral column), including fish, amphibians, reptiles, birds, and mammals." },
      { text: "What kingdom do FUNGI belong to?", choices: mc("Fungi","Plantae","Animalia","Protista"), answer: "A", explanation: "Fungi belong to the Kingdom Fungi, which includes mushrooms, molds, and yeasts." },
    ],
    7: [
      { text: "What is an ECOSYSTEM?", choices: mc("All living and non-living things in an area and their interactions","Only the living things in an area","Only the non-living things in an area","A type of biome"), answer: "A", explanation: "An ecosystem includes all living organisms (biotic) and non-living factors (abiotic) in an area and their interactions." },
      { text: "What is a FOOD CHAIN?", choices: mc("A sequence showing how energy flows from one organism to another","A web of feeding relationships","A list of producers","A type of ecosystem"), answer: "A", explanation: "A food chain is a linear sequence showing how energy is transferred from producers to consumers." },
      { text: "What is a DECOMPOSER?", choices: mc("An organism that breaks down dead organic matter","An organism that makes its own food","An organism that eats only plants","An organism that eats only animals"), answer: "A", explanation: "Decomposers (bacteria, fungi) break down dead organic matter, recycling nutrients back into the ecosystem." },
      { text: "What is POPULATION GROWTH?", choices: mc("An increase in the number of individuals in a population","A decrease in biodiversity","The movement of organisms","The extinction of a species"), answer: "A", explanation: "Population growth is an increase in the number of individuals in a population over time." },
      { text: "What is a LIMITING FACTOR?", choices: mc("An environmental factor that restricts population growth","A factor that increases population growth","A type of adaptation","A type of competition"), answer: "A", explanation: "A limiting factor is an environmental condition (food, water, space, predation) that restricts population growth." },
    ],
    8: [
      { text: "What is the function of the DIGESTIVE SYSTEM?", choices: mc("To break down food and absorb nutrients","To pump blood through the body","To exchange gases","To filter waste from the blood"), answer: "A", explanation: "The digestive system breaks down food into nutrients that can be absorbed and used by the body." },
      { text: "What is the function of the CIRCULATORY SYSTEM?", choices: mc("To transport blood, nutrients, oxygen, and waste throughout the body","To break down food","To exchange gases","To produce hormones"), answer: "A", explanation: "The circulatory system transports blood, nutrients, oxygen, carbon dioxide, and waste throughout the body." },
      { text: "What is the function of the RESPIRATORY SYSTEM?", choices: mc("To exchange oxygen and carbon dioxide between the body and the environment","To pump blood","To digest food","To filter waste"), answer: "A", explanation: "The respiratory system brings oxygen into the body and removes carbon dioxide." },
      { text: "What is the function of the NERVOUS SYSTEM?", choices: mc("To receive, process, and respond to information","To transport blood","To digest food","To produce hormones"), answer: "A", explanation: "The nervous system receives sensory information, processes it, and coordinates responses." },
      { text: "What is HOMEOSTASIS?", choices: mc("The body's ability to maintain a stable internal environment","A type of cell division","A type of reproduction","The process of digestion"), answer: "A", explanation: "Homeostasis is the body's ability to maintain stable internal conditions (temperature, pH, blood sugar) despite external changes." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr7SSQuiz(unitNum) {
  const banks = {
    1: [
      { text: "Which Native American group lived in the Texas Gulf Coast region?", choices: mc("Karankawa","Comanche","Apache","Caddo"), answer: "A", explanation: "The Karankawa were a nomadic group who lived along the Texas Gulf Coast, fishing and hunting." },
      { text: "What were the CADDO known for?", choices: mc("Being skilled farmers and traders in East Texas","Being nomadic buffalo hunters","Living in the Texas desert","Being coastal fishermen"), answer: "A", explanation: "The Caddo were settled farmers and traders in East Texas, known for their confederacy and agricultural practices." },
      { text: "What were TEEPEES used for?", choices: mc("Portable homes for nomadic Plains tribes","Permanent homes for farming tribes","Religious ceremonies","Storage of food"), answer: "A", explanation: "Teepees were portable, cone-shaped homes used by nomadic Plains tribes like the Comanche, who followed buffalo herds." },
      { text: "What was the COMANCHE known for?", choices: mc("Being skilled horsemen and buffalo hunters on the Southern Plains","Being coastal fishermen","Being East Texas farmers","Being desert dwellers"), answer: "A", explanation: "The Comanche were renowned horsemen and buffalo hunters who dominated the Southern Plains of Texas." },
      { text: "What natural resource was most important to Plains Native Americans?", choices: mc("Buffalo","Corn","Fish","Cotton"), answer: "A", explanation: "The buffalo (bison) was the most important resource for Plains tribes — providing food, clothing, shelter, and tools." },
    ],
    2: [
      { text: "Who was the FIRST EUROPEAN to explore Texas?", choices: mc("Álvar Núñez Cabeza de Vaca","Christopher Columbus","Hernán Cortés","Francisco Vásquez de Coronado"), answer: "A", explanation: "Álvar Núñez Cabeza de Vaca was one of the first Europeans to explore Texas after being shipwrecked in 1528." },
      { text: "What was the PURPOSE of Spanish MISSIONS in Texas?", choices: mc("To convert Native Americans to Christianity and expand Spanish territory","To establish trade routes","To find gold","To create military forts"), answer: "A", explanation: "Spanish missions were established to convert Native Americans to Christianity and extend Spanish colonial control." },
      { text: "What was the ALAMO originally?", choices: mc("A Spanish mission (Mission San Antonio de Valero)","A military fort","A trading post","A government building"), answer: "A", explanation: "The Alamo was originally Mission San Antonio de Valero, established in 1718 as a Spanish mission." },
      { text: "Why did FRANCE explore Texas?", choices: mc("To establish a colony and challenge Spanish claims to the region","To find gold","To convert Native Americans","To establish trade with China"), answer: "A", explanation: "France explored Texas to establish a colony (La Salle's Fort St. Louis) and challenge Spain's territorial claims." },
      { text: "What was the CAMINO REAL?", choices: mc("A major road connecting Spanish missions and settlements in Texas","A Spanish military unit","A type of Spanish mission","A Native American trade route"), answer: "A", explanation: "El Camino Real ('The Royal Road') was a major road connecting Spanish missions and settlements across Texas." },
    ],
    3: [
      { text: "What was EMPRESARIO SYSTEM?", choices: mc("A system where land agents recruited settlers to colonize Texas","A type of Spanish government","A military organization","A trading company"), answer: "A", explanation: "The empresario system granted land agents (empresarios) the right to recruit settlers to colonize Texas." },
      { text: "Who was STEPHEN F. AUSTIN?", choices: mc("The 'Father of Texas' who led Anglo-American colonization","The first president of the Republic of Texas","A Texas Revolution general","A Spanish governor"), answer: "A", explanation: "Stephen F. Austin is called the 'Father of Texas' for successfully establishing Anglo-American colonies in Texas." },
      { text: "What year did MEXICO gain independence from Spain?", choices: mc("1821","1836","1845","1810"), answer: "A", explanation: "Mexico gained independence from Spain in 1821, making Texas part of the new Mexican nation." },
      { text: "What was the CONSTITUTION OF 1824?", choices: mc("Mexico's constitution that established a federal republic","The Texas Declaration of Independence","The U.S. Constitution","The Spanish colonial law"), answer: "A", explanation: "Mexico's Constitution of 1824 established a federal republic and initially granted Texas certain rights." },
      { text: "What was COAHUILA Y TEXAS?", choices: mc("The Mexican state that included Texas before independence","A Texas city","A Spanish mission","A Native American territory"), answer: "A", explanation: "Coahuila y Texas was the Mexican state that combined the region of Texas with the state of Coahuila." },
    ],
    4: [
      { text: "What was the BATTLE OF GONZALES?", choices: mc("The first battle of the Texas Revolution, where Texans refused to return a cannon","The final battle of the Texas Revolution","A battle during the Mexican-American War","A battle during the Civil War"), answer: "A", explanation: "The Battle of Gonzales (1835) was the first battle of the Texas Revolution, sparked by Mexico's demand for a cannon." },
      { text: "What happened at the ALAMO in 1836?", choices: mc("A small Texan force was defeated by Santa Anna's army after a 13-day siege","Texas won a major victory","The Texas Declaration of Independence was signed","Sam Houston defeated Santa Anna"), answer: "A", explanation: "At the Alamo, approximately 189 Texan defenders were defeated by Santa Anna's army after a 13-day siege in February-March 1836." },
      { text: "What was the BATTLE OF SAN JACINTO?", choices: mc("The battle where Sam Houston defeated Santa Anna, winning Texas independence","The first battle of the Texas Revolution","A battle during the Mexican-American War","The siege of the Alamo"), answer: "A", explanation: "The Battle of San Jacinto (April 21, 1836) was the decisive battle where Sam Houston's forces defeated Santa Anna, securing Texas independence." },
      { text: "What was the TEXAS DECLARATION OF INDEPENDENCE signed?", choices: mc("March 2, 1836","April 21, 1836","February 23, 1836","March 6, 1836"), answer: "A", explanation: "The Texas Declaration of Independence was signed on March 2, 1836 at Washington-on-the-Brazos." },
      { text: "Who was SANTA ANNA?", choices: mc("The Mexican president and general who led forces against Texas","The first president of the Republic of Texas","A Texas Revolution hero","A Spanish governor"), answer: "A", explanation: "Antonio López de Santa Anna was the Mexican president and military general who led forces against the Texas Revolution." },
    ],
    5: [
      { text: "Who was the FIRST PRESIDENT of the Republic of Texas?", choices: mc("David G. Burnet (provisional), then Sam Houston","Stephen F. Austin","Mirabeau Lamar","Anson Jones"), answer: "A", explanation: "David G. Burnet served as provisional president, then Sam Houston became the first elected president of the Republic of Texas." },
      { text: "What was the REPUBLIC OF TEXAS?", choices: mc("An independent nation from 1836 to 1845","A Mexican state","A U.S. territory","A Spanish colony"), answer: "A", explanation: "The Republic of Texas was an independent nation from 1836 until it was annexed by the United States in 1845." },
      { text: "What was the LONE STAR REPUBLIC?", choices: mc("Another name for the Republic of Texas","A type of Texas government","A Texas city","A Texas military unit"), answer: "A", explanation: "The Republic of Texas was nicknamed the 'Lone Star Republic' after the single star on its flag." },
      { text: "What was a major CHALLENGE of the Republic of Texas?", choices: mc("Financial debt and conflicts with Mexico and Native Americans","Lack of settlers","No government","No military"), answer: "A", explanation: "The Republic of Texas faced severe financial debt, ongoing conflicts with Mexico, and conflicts with Native American groups." },
      { text: "Who was MIRABEAU LAMAR?", choices: mc("A president of the Republic of Texas who promoted education and expansion","The first president of Texas","A Texas Revolution general","A Spanish governor"), answer: "A", explanation: "Mirabeau Lamar was the second elected president of the Republic of Texas, known for promoting public education and westward expansion." },
    ],
    6: [
      { text: "When did TEXAS become a U.S. state?", choices: mc("December 29, 1845","March 2, 1836","April 21, 1836","1848"), answer: "A", explanation: "Texas was officially admitted to the United States as the 28th state on December 29, 1845." },
      { text: "What was the MEXICAN-AMERICAN WAR (1846-1848)?", choices: mc("A war between the U.S. and Mexico partly caused by Texas annexation","A war between Texas and Mexico","A war between Spain and the U.S.","A war between Texas and Native Americans"), answer: "A", explanation: "The Mexican-American War (1846-1848) was fought between the U.S. and Mexico, partly triggered by Texas annexation and border disputes." },
      { text: "What was the TREATY OF GUADALUPE HIDALGO?", choices: mc("The treaty ending the Mexican-American War, giving the U.S. vast territories","The treaty ending the Texas Revolution","The treaty of Texas annexation","A trade agreement"), answer: "A", explanation: "The Treaty of Guadalupe Hidalgo (1848) ended the Mexican-American War and gave the U.S. California, New Mexico, and other territories." },
      { text: "What was ANTEBELLUM TEXAS?", choices: mc("Texas before the Civil War (pre-war period)","Texas after the Civil War","Texas during the Civil War","Texas during the Republic period"), answer: "A", explanation: "Antebellum means 'before the war' — antebellum Texas refers to the period before the Civil War." },
      { text: "What was the COMPROMISE OF 1850?", choices: mc("A series of laws that settled disputes over slavery and Texas's borders","The annexation of Texas","The end of the Mexican-American War","The Texas Constitution"), answer: "A", explanation: "The Compromise of 1850 resolved disputes over slavery in new territories and established Texas's current borders." },
    ],
    7: [
      { text: "What was SECESSION?", choices: mc("The act of formally withdrawing from the United States","Joining the United States","A type of government","A type of election"), answer: "A", explanation: "Secession is the act of formally withdrawing from a political union. Texas seceded from the U.S. in 1861." },
      { text: "When did TEXAS secede from the Union?", choices: mc("1861","1865","1836","1845"), answer: "A", explanation: "Texas voted to secede from the United States in February 1861 and joined the Confederate States of America." },
      { text: "What was JUNETEENTH?", choices: mc("June 19, 1865, when enslaved people in Texas learned of their freedom","The date Texas joined the Confederacy","The date Texas was readmitted to the Union","The date of the Battle of San Jacinto"), answer: "A", explanation: "Juneteenth (June 19, 1865) marks the day enslaved people in Texas learned of their emancipation, more than two months after the Civil War ended." },
      { text: "What was RECONSTRUCTION?", choices: mc("The period after the Civil War when the South was rebuilt and reintegrated into the Union","The period before the Civil War","The Texas Revolution","The Republic of Texas period"), answer: "A", explanation: "Reconstruction (1865-1870 in Texas) was the period after the Civil War when the South was rebuilt and reintegrated into the United States." },
      { text: "What was the 13th AMENDMENT?", choices: mc("The constitutional amendment that abolished slavery","The amendment giving women the right to vote","The amendment establishing citizenship","The amendment giving freed slaves the right to vote"), answer: "A", explanation: "The 13th Amendment (1865) to the U.S. Constitution abolished slavery throughout the United States." },
    ],
    8: [
      { text: "What are the THREE BRANCHES of Texas government?", choices: mc("Legislative, Executive, Judicial","President, Senate, Courts","Governor, Legislature, Police","Federal, State, Local"), answer: "A", explanation: "Texas government has three branches: Legislative (makes laws), Executive (enforces laws), and Judicial (interprets laws)." },
      { text: "What is the TEXAS LEGISLATURE?", choices: mc("The lawmaking branch of Texas government, consisting of the Senate and House of Representatives","The governor's office","The Texas Supreme Court","The Texas Rangers"), answer: "A", explanation: "The Texas Legislature is the lawmaking branch, consisting of the Texas Senate (31 members) and House of Representatives (150 members)." },
      { text: "What are the MAJOR ECONOMIC REGIONS of Texas?", choices: mc("Gulf Coast, Piney Woods, Hill Country, Panhandle Plains, Trans-Pecos, South Texas Plains","North, South, East, West","Urban, Rural, Suburban","Coastal, Inland, Mountain"), answer: "A", explanation: "Texas has several distinct economic regions, each with different industries, resources, and characteristics." },
      { text: "What is the LARGEST INDUSTRY in Texas?", choices: mc("Energy (oil and gas)","Agriculture","Technology","Tourism"), answer: "A", explanation: "The energy industry (oil and natural gas) is Texas's largest industry, making Texas the top energy-producing state in the U.S." },
      { text: "What is the TEXAS CONSTITUTION?", choices: mc("The document that establishes the structure and laws of Texas state government","The U.S. Constitution","The Republic of Texas constitution","The Texas Declaration of Independence"), answer: "A", explanation: "The Texas Constitution (1876) is the document that establishes the framework, structure, and fundamental laws of Texas state government." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr7TechQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is INTELLECTUAL PROPERTY?", choices: mc("Creative works protected by law (copyright, patent, trademark)","Physical property","A type of computer hardware","A social media account"), answer: "A", explanation: "Intellectual property refers to creations of the mind (inventions, art, writing) protected by copyright, patent, or trademark law." },
      { text: "What is a DIGITAL FOOTPRINT?", choices: mc("The permanent record of your online activities","A type of computer file","A social media profile","A website"), answer: "A", explanation: "Your digital footprint is the trail of data you leave online — posts, searches, purchases, and interactions." },
      { text: "What is TWO-FACTOR AUTHENTICATION?", choices: mc("A security method requiring two forms of verification to access an account","A type of password","A type of encryption","A social media setting"), answer: "A", explanation: "Two-factor authentication (2FA) requires two forms of verification (e.g., password + phone code) for added security." },
      { text: "What is SCREEN TIME management?", choices: mc("Intentionally limiting and balancing time spent on digital devices","Using devices all day","A type of app","A parental control"), answer: "A", explanation: "Screen time management involves intentionally balancing and limiting time spent on digital devices for health and wellbeing." },
      { text: "What is SOCIAL ENGINEERING in cybersecurity?", choices: mc("Manipulating people into revealing confidential information","Building social media platforms","A type of programming","A type of network"), answer: "A", explanation: "Social engineering is the manipulation of people into revealing confidential information or taking unsafe actions." },
    ],
    2: [
      { text: "What is a FUNCTION in programming?", choices: mc("A reusable block of code that performs a specific task","A type of variable","A type of loop","A conditional statement"), answer: "A", explanation: "A function is a named, reusable block of code that performs a specific task when called." },
      { text: "What is a LOOP in programming?", choices: mc("A structure that repeats code until a condition is met","A type of variable","A conditional statement","A function"), answer: "A", explanation: "A loop repeats a block of code multiple times — either a set number of times (for loop) or until a condition is met (while loop)." },
      { text: "What is PSEUDOCODE?", choices: mc("An informal, plain-language description of an algorithm","A programming language","A type of code error","A type of flowchart"), answer: "A", explanation: "Pseudocode is an informal description of an algorithm using plain language, not tied to any specific programming language." },
      { text: "What is a BOOLEAN value?", choices: mc("A value that is either true or false","A number","A text string","A list"), answer: "A", explanation: "A Boolean value is either true or false — used in conditional statements and logical operations." },
      { text: "What is SYNTAX ERROR in programming?", choices: mc("An error caused by incorrect code structure or spelling","A logical error","A runtime error","A design error"), answer: "A", explanation: "A syntax error occurs when code violates the rules of the programming language (e.g., missing parenthesis, misspelled keyword)." },
    ],
    3: [
      { text: "What does HTML stand for?", choices: mc("HyperText Markup Language","High Tech Modern Language","HyperText Modern Layout","Hyper Transfer Markup Language"), answer: "A", explanation: "HTML (HyperText Markup Language) is the standard language for creating web pages." },
      { text: "What does CSS stand for?", choices: mc("Cascading Style Sheets","Computer Style System","Creative Style Sheets","Cascading System Styles"), answer: "A", explanation: "CSS (Cascading Style Sheets) controls the visual presentation (colors, fonts, layout) of web pages." },
      { text: "What is a HYPERLINK?", choices: mc("A clickable link that navigates to another web page or resource","A type of image","A type of video","A type of form"), answer: "A", explanation: "A hyperlink is a clickable element that navigates to another page, website, or resource." },
      { text: "What is WEB ACCESSIBILITY?", choices: mc("Designing websites so people with disabilities can use them","Making websites load faster","Making websites look better","Making websites more secure"), answer: "A", explanation: "Web accessibility means designing websites so that people with disabilities (visual, hearing, motor) can access and use them." },
      { text: "What is a RESPONSIVE WEBSITE?", choices: mc("A website that adapts its layout to different screen sizes","A website that loads quickly","A website with many pages","A website with videos"), answer: "A", explanation: "A responsive website automatically adjusts its layout and design to work on different screen sizes (phone, tablet, desktop)." },
    ],
    4: [
      { text: "What is a DATABASE?", choices: mc("An organized collection of structured data","A type of spreadsheet","A type of presentation","A type of word document"), answer: "A", explanation: "A database is an organized collection of structured data that can be easily accessed, managed, and updated." },
      { text: "What is a QUERY in a database?", choices: mc("A request to retrieve specific data from a database","A type of table","A type of form","A type of report"), answer: "A", explanation: "A query is a request to search for and retrieve specific data from a database." },
      { text: "What is the AVERAGE function in a spreadsheet?", choices: mc("Calculates the mean of a range of numbers","Adds up numbers","Finds the maximum value","Counts the number of cells"), answer: "A", explanation: "The AVERAGE function calculates the arithmetic mean (average) of a range of numbers." },
      { text: "What is a PIVOT TABLE?", choices: mc("A tool that summarizes and analyzes large data sets","A type of chart","A type of formula","A type of filter"), answer: "A", explanation: "A pivot table is a powerful tool that summarizes, analyzes, and reorganizes large data sets." },
      { text: "What is DATA VISUALIZATION?", choices: mc("Representing data graphically to make it easier to understand","Storing data in a database","Collecting data","Analyzing data with formulas"), answer: "A", explanation: "Data visualization uses charts, graphs, and maps to represent data visually, making patterns and trends easier to understand." },
    ],
    5: [
      { text: "What is VIDEO EDITING?", choices: mc("The process of manipulating video footage to create a finished product","Recording video","Taking photographs","Creating animations"), answer: "A", explanation: "Video editing involves arranging, cutting, and enhancing video footage to create a polished final product." },
      { text: "What is a STORYBOARD?", choices: mc("A visual plan showing the sequence of scenes in a video or animation","A type of database","A type of spreadsheet","A type of website"), answer: "A", explanation: "A storyboard is a series of sketches or images that plan out the sequence of scenes in a video, animation, or presentation." },
      { text: "What is AUDIO EDITING?", choices: mc("Manipulating sound recordings to improve quality or create effects","Recording audio","Playing audio","Streaming audio"), answer: "A", explanation: "Audio editing involves manipulating sound recordings — cutting, mixing, adding effects, and adjusting levels." },
      { text: "What is a FILE FORMAT?", choices: mc("The specific structure in which data is stored (e.g., MP4, JPEG, PDF)","A type of folder","A type of database","A type of program"), answer: "A", explanation: "A file format is the specific structure and encoding used to store data (e.g., MP4 for video, JPEG for images, PDF for documents)." },
      { text: "What is COMPRESSION in digital media?", choices: mc("Reducing file size by encoding data more efficiently","Increasing file quality","Adding effects to media","Sharing media online"), answer: "A", explanation: "Compression reduces file size by encoding data more efficiently, making files easier to store and share." },
    ],
    6: [
      { text: "What is MALWARE?", choices: mc("Software designed to damage or gain unauthorized access to computer systems","A type of antivirus software","A type of firewall","A type of browser"), answer: "A", explanation: "Malware (malicious software) is designed to damage, disrupt, or gain unauthorized access to computer systems." },
      { text: "What is a FIREWALL?", choices: mc("A security system that monitors and controls network traffic","A type of malware","A type of browser","A type of database"), answer: "A", explanation: "A firewall is a network security system that monitors and controls incoming and outgoing network traffic based on security rules." },
      { text: "What is ENCRYPTION?", choices: mc("Converting data into a coded format to prevent unauthorized access","A type of compression","A type of backup","A type of antivirus"), answer: "A", explanation: "Encryption converts data into a coded format that can only be read by authorized parties with the correct key." },
      { text: "What is a VPN?", choices: mc("A Virtual Private Network that creates a secure, encrypted connection","A type of malware","A type of social media","A type of browser"), answer: "A", explanation: "A VPN (Virtual Private Network) creates a secure, encrypted connection over the internet, protecting privacy." },
      { text: "What is SOCIAL MEDIA LITERACY?", choices: mc("The ability to critically evaluate and responsibly use social media","Using social media every day","Having many followers","Creating viral content"), answer: "A", explanation: "Social media literacy means understanding how social media works, critically evaluating content, and using it responsibly." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr8MathQuiz(unitNum) {
  const banks = {
    1: [
      { text: "Which of the following is IRRATIONAL?", choices: mc("√7","√4","1/3","0.5"), answer: "A", explanation: "√7 ≈ 2.6457... is non-terminating and non-repeating, making it irrational. √4=2 is rational." },
      { text: "What is 2³ × 2⁴?", choices: mc("2⁷","2¹²","4⁷","2"), answer: "A", explanation: "When multiplying powers with the same base, add exponents: 2³ × 2⁴ = 2^(3+4) = 2⁷." },
      { text: "What is (3²)³?", choices: mc("3⁶","3⁵","9³","3⁸"), answer: "A", explanation: "When raising a power to a power, multiply exponents: (3²)³ = 3^(2×3) = 3⁶." },
      { text: "Approximate √50 to the nearest tenth.", choices: mc("7.1","7.0","7.2","6.9"), answer: "A", explanation: "√49=7, √50 is slightly more. √50 ≈ 7.071... ≈ 7.1." },
      { text: "Which is a RATIONAL number?", choices: mc("0.333...","√2","π","√5"), answer: "A", explanation: "0.333... = 1/3, which is rational (can be expressed as a fraction). The others are irrational." },
    ],
    2: [
      { text: "What is the SLOPE of the line through (2,3) and (4,7)?", choices: mc("2","4","1/2","3"), answer: "A", explanation: "Slope = (y₂-y₁)/(x₂-x₁) = (7-3)/(4-2) = 4/2 = 2." },
      { text: "What is the slope of a HORIZONTAL line?", choices: mc("0","1","Undefined","−1"), answer: "A", explanation: "A horizontal line has a slope of 0 (no rise, only run)." },
      { text: "What is the slope of a VERTICAL line?", choices: mc("Undefined","0","1","−1"), answer: "A", explanation: "A vertical line has an undefined slope (no run, only rise — division by zero)." },
      { text: "Which equation has a slope of 3 and y-intercept of −2?", choices: mc("y = 3x − 2","y = −2x + 3","y = 3x + 2","y = −3x − 2"), answer: "A", explanation: "Slope-intercept form: y = mx + b. m=3, b=−2 gives y = 3x − 2." },
      { text: "A proportional relationship has a slope of 4. What is its equation?", choices: mc("y = 4x","y = 4x + 4","y = x + 4","y = 4"), answer: "A", explanation: "Proportional relationships pass through the origin: y = kx. With slope 4: y = 4x." },
    ],
    3: [
      { text: "Solve: 2(x + 3) = 14", choices: mc("4","5","8","7"), answer: "A", explanation: "2x + 6 = 14. 2x = 8. x = 4." },
      { text: "Solve: 3x − 5 = 2x + 7", choices: mc("12","2","6","−2"), answer: "A", explanation: "3x − 2x = 7 + 5. x = 12." },
      { text: "What is 4⁻² equal to?", choices: mc("1/16","−16","−8","1/8"), answer: "A", explanation: "Negative exponent: 4⁻² = 1/4² = 1/16." },
      { text: "Simplify: (2x³)(3x²)", choices: mc("6x⁵","5x⁵","6x⁶","5x⁶"), answer: "A", explanation: "Multiply coefficients and add exponents: 2×3=6, x³×x²=x⁵. Answer: 6x⁵." },
      { text: "Solve: x/4 + 3 = 7", choices: mc("16","4","28","1"), answer: "A", explanation: "x/4 = 4. x = 16." },
    ],
    4: [
      { text: "Solve the system: y = 2x + 1 and y = x + 3", choices: mc("(2, 5)","(1, 3)","(3, 7)","(0, 1)"), answer: "A", explanation: "Set equal: 2x+1 = x+3. x=2. y=2(2)+1=5. Solution: (2,5)." },
      { text: "How many solutions does a system have if the lines are PARALLEL?", choices: mc("No solution","One solution","Infinite solutions","Two solutions"), answer: "A", explanation: "Parallel lines never intersect, so the system has no solution." },
      { text: "How many solutions does a system have if the lines are the SAME line?", choices: mc("Infinite solutions","No solution","One solution","Two solutions"), answer: "A", explanation: "If the equations represent the same line, every point on the line is a solution — infinitely many solutions." },
      { text: "Solve by substitution: y = 3x and 2x + y = 10", choices: mc("(2, 6)","(3, 9)","(1, 3)","(5, 0)"), answer: "A", explanation: "Substitute: 2x + 3x = 10. 5x = 10. x = 2. y = 3(2) = 6. Solution: (2,6)." },
      { text: "Which system has exactly ONE solution?", choices: mc("Two lines with different slopes","Two parallel lines","Two identical lines","A horizontal and vertical line at the same point"), answer: "A", explanation: "Two lines with different slopes will intersect at exactly one point, giving one solution." },
    ],
    5: [
      { text: "What is a FUNCTION?", choices: mc("A relation where each input has exactly one output","A relation where inputs can have multiple outputs","A type of graph","A type of equation"), answer: "A", explanation: "A function is a relation where each input (x-value) has exactly one output (y-value)." },
      { text: "Which represents a function?", choices: mc("{(1,2),(2,3),(3,4)}","{(1,2),(1,3),(2,4)}","{(2,1),(2,2),(2,3)}","A circle on a graph"), answer: "A", explanation: "In a function, each x-value maps to exactly one y-value. {(1,2),(2,3),(3,4)} has no repeated x-values." },
      { text: "What is the VERTICAL LINE TEST?", choices: mc("A test to determine if a graph represents a function","A test to find the slope","A test to find the y-intercept","A test to find the x-intercept"), answer: "A", explanation: "The vertical line test: if any vertical line intersects a graph more than once, it is NOT a function." },
      { text: "What is the DOMAIN of a function?", choices: mc("The set of all possible input (x) values","The set of all possible output (y) values","The slope of the function","The y-intercept"), answer: "A", explanation: "The domain is the set of all possible input values (x-values) for a function." },
      { text: "What is the RANGE of a function?", choices: mc("The set of all possible output (y) values","The set of all possible input (x) values","The slope","The y-intercept"), answer: "A", explanation: "The range is the set of all possible output values (y-values) of a function." },
    ],
    6: [
      { text: "What is a TRANSLATION in geometry?", choices: mc("A slide that moves a figure without changing its size or shape","A flip over a line","A turn around a point","A resize of a figure"), answer: "A", explanation: "A translation slides a figure from one location to another without changing its size, shape, or orientation." },
      { text: "What is a REFLECTION in geometry?", choices: mc("A flip over a line of symmetry","A slide","A turn","A resize"), answer: "A", explanation: "A reflection flips a figure over a line (line of reflection), creating a mirror image." },
      { text: "What is a ROTATION in geometry?", choices: mc("A turn around a fixed point by a given angle","A flip over a line","A slide","A resize"), answer: "A", explanation: "A rotation turns a figure around a fixed point (center of rotation) by a given angle." },
      { text: "What is a DILATION in geometry?", choices: mc("A transformation that resizes a figure by a scale factor","A flip","A slide","A rotation"), answer: "A", explanation: "A dilation resizes a figure by a scale factor, either enlarging or reducing it, centered at a point." },
      { text: "Which transformation changes the SIZE of a figure?", choices: mc("Dilation","Translation","Reflection","Rotation"), answer: "A", explanation: "Only dilation changes the size of a figure. Translations, reflections, and rotations preserve size (isometric transformations)." },
    ],
    7: [
      { text: "What is the PYTHAGOREAN THEOREM?", choices: mc("a² + b² = c² (for right triangles)","a + b = c","a² − b² = c²","a × b = c²"), answer: "A", explanation: "The Pythagorean theorem states that in a right triangle, a² + b² = c², where c is the hypotenuse." },
      { text: "A right triangle has legs of 6 and 8. What is the hypotenuse?", choices: mc("10","14","7","100"), answer: "A", explanation: "6² + 8² = 36 + 64 = 100. √100 = 10." },
      { text: "What is the VOLUME of a cylinder with radius 3 and height 5? (Use π ≈ 3.14)", choices: mc("141.3","47.1","94.2","282.6"), answer: "A", explanation: "V = πr²h = 3.14 × 9 × 5 = 141.3." },
      { text: "What is the VOLUME of a cone with radius 3 and height 6? (Use π ≈ 3.14)", choices: mc("56.52","169.56","18.84","113.04"), answer: "A", explanation: "V = (1/3)πr²h = (1/3)(3.14)(9)(6) = 56.52." },
      { text: "What is the VOLUME of a sphere with radius 4? (Use π ≈ 3.14)", choices: mc("267.95","200.96","50.24","803.84"), answer: "A", explanation: "V = (4/3)πr³ = (4/3)(3.14)(64) = 267.95." },
    ],
    8: [
      { text: "What does a SCATTER PLOT show?", choices: mc("The relationship between two variables","The frequency of data","The distribution of one variable","The average of data"), answer: "A", explanation: "A scatter plot shows the relationship (correlation) between two variables by plotting data points on a coordinate plane." },
      { text: "What is POSITIVE CORRELATION?", choices: mc("As x increases, y increases","As x increases, y decreases","There is no relationship","The data is random"), answer: "A", explanation: "Positive correlation means as one variable increases, the other also increases." },
      { text: "What is a TREND LINE (line of best fit)?", choices: mc("A line that best represents the data in a scatter plot","A line connecting all data points","A horizontal line","A vertical line"), answer: "A", explanation: "A trend line (line of best fit) is drawn through a scatter plot to show the general direction and pattern of the data." },
      { text: "What is NEGATIVE CORRELATION?", choices: mc("As x increases, y decreases","As x increases, y increases","There is no relationship","The data is random"), answer: "A", explanation: "Negative correlation means as one variable increases, the other decreases." },
      { text: "What does NO CORRELATION mean in a scatter plot?", choices: mc("There is no relationship between the two variables","Both variables increase together","Both variables decrease together","The data forms a perfect line"), answer: "A", explanation: "No correlation means there is no apparent relationship between the two variables — the data points appear random." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr8ELAQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is AMBIGUITY in literature?", choices: mc("When a text can be interpreted in more than one way","When a text has only one meaning","When a text is confusing due to poor writing","When a character is underdeveloped"), answer: "A", explanation: "Ambiguity in literature means a text can be interpreted in multiple ways, often intentionally by the author." },
      { text: "What is an UNRELIABLE NARRATOR?", choices: mc("A narrator whose account cannot be fully trusted","A narrator who tells the story in third person","A narrator who knows everything","A narrator who is the main character"), answer: "A", explanation: "An unreliable narrator is one whose credibility is compromised — they may be biased, delusional, or dishonest." },
      { text: "What is SATIRE?", choices: mc("A literary technique using humor, irony, or exaggeration to criticize society","A type of metaphor","A type of plot structure","A type of characterization"), answer: "A", explanation: "Satire uses humor, irony, and exaggeration to criticize or mock social, political, or human folly." },
      { text: "What is STREAM OF CONSCIOUSNESS?", choices: mc("A narrative technique that presents a character's continuous flow of thoughts","A type of plot structure","A type of dialogue","A type of setting description"), answer: "A", explanation: "Stream of consciousness is a narrative technique that presents a character's unfiltered, continuous flow of thoughts and feelings." },
      { text: "What is the AUTHOR'S CRAFT?", choices: mc("The specific techniques and choices an author makes to create meaning","The author's biography","The author's opinion","The author's research"), answer: "A", explanation: "Author's craft refers to the deliberate literary choices (diction, syntax, structure, figurative language) an author makes to create meaning and effect." },
    ],
    2: [
      { text: "What is INTERTEXTUALITY?", choices: mc("When a text references or is influenced by other texts","When two texts have the same theme","When two texts are by the same author","When a text is adapted into a film"), answer: "A", explanation: "Intertextuality is the relationship between texts — when one text references, alludes to, or is influenced by another." },
      { text: "What is an ALLUSION?", choices: mc("An indirect reference to another work, person, or event","A direct quote from another work","A type of metaphor","A type of simile"), answer: "A", explanation: "An allusion is an indirect reference to a well-known person, event, work of literature, or cultural element." },
      { text: "What is JUXTAPOSITION?", choices: mc("Placing two contrasting elements side by side for effect","A type of metaphor","A type of simile","A type of alliteration"), answer: "A", explanation: "Juxtaposition places two contrasting ideas, characters, or images side by side to highlight their differences." },
      { text: "What is MOTIF in literature?", choices: mc("A recurring element (image, symbol, theme) that develops meaning throughout a work","The main theme","The plot structure","The setting"), answer: "A", explanation: "A motif is a recurring element — image, symbol, idea, or phrase — that develops and reinforces the work's themes." },
      { text: "What is NARRATIVE STRUCTURE?", choices: mc("The way a story is organized and told","The characters in a story","The setting of a story","The theme of a story"), answer: "A", explanation: "Narrative structure is the framework of a story — how it is organized, including chronology, point of view, and plot arrangement." },
    ],
    3: [
      { text: "What is RHETORIC?", choices: mc("The art of effective or persuasive communication","A type of literary device","A type of grammar rule","A type of text structure"), answer: "A", explanation: "Rhetoric is the art of using language effectively and persuasively to influence an audience." },
      { text: "What is an APPEAL TO AUTHORITY?", choices: mc("Using an expert's opinion to support an argument","Using emotional language","Using logical reasoning","Using statistics"), answer: "A", explanation: "An appeal to authority uses the opinion or endorsement of an expert or credible source to support an argument." },
      { text: "What is a STRAW MAN FALLACY?", choices: mc("Misrepresenting an opponent's argument to make it easier to attack","Using emotional appeals","Making a hasty generalization","Using circular reasoning"), answer: "A", explanation: "A straw man fallacy involves misrepresenting or oversimplifying an opponent's argument to make it easier to refute." },
      { text: "What is AD HOMINEM?", choices: mc("Attacking the person making an argument rather than the argument itself","Using emotional appeals","Using logical reasoning","Using statistics"), answer: "A", explanation: "Ad hominem is a logical fallacy that attacks the person making an argument rather than addressing the argument itself." },
      { text: "What is ANAPHORA?", choices: mc("The repetition of a phrase at the beginning of successive clauses for emphasis","A type of metaphor","A type of alliteration","A type of rhyme"), answer: "A", explanation: "Anaphora is the repetition of a word or phrase at the beginning of successive clauses (e.g., 'We shall fight... We shall never surrender')." },
    ],
    4: [
      { text: "What is ETYMOLOGY?", choices: mc("The study of word origins and history","The study of grammar","The study of literature","The study of writing styles"), answer: "A", explanation: "Etymology is the study of the origin and historical development of words." },
      { text: "What does the Latin root 'bene' mean?", choices: mc("Good","Bad","Many","One"), answer: "A", explanation: "The Latin root 'bene' means 'good' (e.g., benefit, benevolent, benefactor)." },
      { text: "What is NUANCE in language?", choices: mc("A subtle difference in meaning, tone, or expression","A major difference","A type of metaphor","A type of grammar rule"), answer: "A", explanation: "Nuance refers to subtle distinctions in meaning, tone, or expression that add depth and precision to language." },
      { text: "What is REGISTER in language?", choices: mc("The level of formality in language appropriate to a context","A type of grammar rule","A type of vocabulary","A type of sentence structure"), answer: "A", explanation: "Register is the level of formality in language — formal, informal, academic, or colloquial — chosen based on context and audience." },
      { text: "What is JARGON?", choices: mc("Specialized vocabulary used by a particular group or profession","Informal slang","Figurative language","Academic vocabulary"), answer: "A", explanation: "Jargon is specialized vocabulary used by a particular profession, group, or field (e.g., medical, legal, or technical terms)." },
    ],
    5: [
      { text: "What is a NUANCED ARGUMENT?", choices: mc("An argument that acknowledges complexity and avoids oversimplification","A simple one-sided argument","An emotional argument","An argument with no evidence"), answer: "A", explanation: "A nuanced argument acknowledges complexity, considers multiple perspectives, and avoids oversimplification." },
      { text: "What is CONCESSION in argumentative writing?", choices: mc("Acknowledging the validity of an opposing viewpoint before refuting it","Giving up on an argument","Providing evidence","Writing a conclusion"), answer: "A", explanation: "A concession acknowledges that the opposing viewpoint has some merit before explaining why your argument is still stronger." },
      { text: "What is HEDGING language in academic writing?", choices: mc("Language that expresses uncertainty or qualifies claims (e.g., 'may', 'suggests')","Language that expresses certainty","Language that is emotional","Language that is informal"), answer: "A", explanation: "Hedging language qualifies claims to show appropriate uncertainty (e.g., 'evidence suggests', 'this may indicate')." },
      { text: "What is the TOULMIN MODEL of argument?", choices: mc("A framework with claim, grounds, warrant, backing, qualifier, and rebuttal","A five-paragraph essay structure","A type of rhetorical appeal","A type of logical fallacy"), answer: "A", explanation: "The Toulmin model is a framework for analyzing arguments with six components: claim, grounds, warrant, backing, qualifier, and rebuttal." },
      { text: "What is SYNTHESIS in argumentative writing?", choices: mc("Combining multiple sources and perspectives to build a complex argument","Summarizing one source","Copying evidence","Writing a conclusion"), answer: "A", explanation: "Synthesis in argumentative writing means combining information from multiple sources to build a more complex, nuanced argument." },
    ],
    6: [
      { text: "What is LITERARY ANALYSIS?", choices: mc("A close examination of a text to understand its meaning and techniques","A summary of a text","A personal response to a text","A comparison of two texts"), answer: "A", explanation: "Literary analysis is a close, critical examination of a text to understand its meaning, themes, and literary techniques." },
      { text: "What is TEXTUAL EVIDENCE?", choices: mc("Specific quotes or details from a text that support an analytical claim","The author's biography","A personal opinion","A summary"), answer: "A", explanation: "Textual evidence is specific quotes, details, or examples from a text used to support an analytical claim." },
      { text: "What is COMMENTARY in literary analysis?", choices: mc("The writer's explanation of how evidence supports the claim","A direct quote from the text","A summary of the text","The thesis statement"), answer: "A", explanation: "Commentary is the writer's explanation and analysis of how the textual evidence supports their claim." },
      { text: "What is a LITERARY LENS?", choices: mc("A critical perspective used to analyze a text (e.g., feminist, historical, psychological)","A type of figurative language","A type of plot structure","A type of characterization"), answer: "A", explanation: "A literary lens (or critical theory) is a perspective used to analyze a text, such as feminist, Marxist, historical, or psychological criticism." },
      { text: "What is CLOSE READING?", choices: mc("Careful, detailed analysis of a short passage to understand its meaning and techniques","Reading quickly for main ideas","Skimming a text","Reading for pleasure"), answer: "A", explanation: "Close reading is careful, detailed analysis of a short passage, examining word choice, structure, and literary techniques." },
    ],
    7: [
      { text: "What is a THESIS-DRIVEN research paper?", choices: mc("A paper organized around a central argument supported by research","A paper that summarizes sources","A paper that only presents facts","A paper without a central argument"), answer: "A", explanation: "A thesis-driven research paper is organized around a central argument (thesis) that is supported and developed through research." },
      { text: "What is CITATION?", choices: mc("Giving credit to sources used in research","Copying text from a source","Paraphrasing without credit","Summarizing a source"), answer: "A", explanation: "Citation is the practice of giving proper credit to the sources you used in your research." },
      { text: "What is the difference between MLA and APA citation styles?", choices: mc("MLA is used in humanities; APA is used in social sciences","They are the same","MLA is used in sciences; APA is used in humanities","APA is used in literature; MLA is used in psychology"), answer: "A", explanation: "MLA (Modern Language Association) is used in humanities/literature; APA (American Psychological Association) is used in social sciences." },
      { text: "What is a WORKS CITED page?", choices: mc("A list of all sources cited in an MLA-formatted paper","A list of all sources read","The bibliography in APA format","A list of recommended reading"), answer: "A", explanation: "A Works Cited page (MLA format) lists all sources that were directly cited in the paper." },
      { text: "What is ACADEMIC INTEGRITY?", choices: mc("Honesty and ethical behavior in academic work, including proper citation","Getting good grades","Studying hard","Completing assignments on time"), answer: "A", explanation: "Academic integrity means being honest and ethical in academic work — no plagiarism, cheating, or misrepresentation." },
    ],
    8: [
      { text: "What is MEDIA LITERACY?", choices: mc("The ability to access, analyze, evaluate, and create media","Using social media","Watching television","Reading newspapers"), answer: "A", explanation: "Media literacy is the ability to access, analyze, evaluate, and create media in various forms." },
      { text: "What is PROPAGANDA?", choices: mc("Information used to promote a particular point of view, often biased","Objective news reporting","A type of advertisement","A type of documentary"), answer: "A", explanation: "Propaganda is information, often biased or misleading, used to promote a particular political cause or point of view." },
      { text: "What is CONFIRMATION BIAS?", choices: mc("The tendency to favor information that confirms existing beliefs","Objective analysis of information","A type of logical fallacy","A type of research method"), answer: "A", explanation: "Confirmation bias is the tendency to search for, interpret, and remember information that confirms one's preexisting beliefs." },
      { text: "What is a CREDIBLE NEWS SOURCE?", choices: mc("A source with editorial standards, fact-checking, and transparent sourcing","Any website with news","A social media post","An anonymous blog"), answer: "A", explanation: "A credible news source has editorial standards, employs professional journalists, fact-checks content, and is transparent about sourcing." },
      { text: "What is DEBATE in oral communication?", choices: mc("A formal discussion where two sides argue opposing positions","An informal conversation","A type of presentation","A type of interview"), answer: "A", explanation: "Debate is a formal discussion where participants argue opposing positions on a topic using evidence and reasoning." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr8SciQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is EXPERIMENTAL DESIGN?", choices: mc("Planning a controlled experiment with hypothesis, variables, and procedure","Writing a lab report","Collecting data","Analyzing results"), answer: "A", explanation: "Experimental design is the planning of a controlled experiment, including hypothesis, variables, materials, and procedure." },
      { text: "What is QUALITATIVE DATA?", choices: mc("Descriptive data that cannot be measured numerically","Data expressed in numbers","Data from graphs","Data from calculations"), answer: "A", explanation: "Qualitative data describes characteristics or qualities that cannot be measured numerically (e.g., color, texture, smell)." },
      { text: "What is QUANTITATIVE DATA?", choices: mc("Data expressed in numbers and measurements","Descriptive data","Data from observations","Data from interviews"), answer: "A", explanation: "Quantitative data is expressed in numbers and can be measured (e.g., temperature, mass, volume)." },
      { text: "What is a SCIENTIFIC MODEL?", choices: mc("A representation used to explain or predict phenomena","A hypothesis","A conclusion","A data table"), answer: "A", explanation: "A scientific model is a representation (physical, mathematical, or conceptual) used to explain or predict natural phenomena." },
      { text: "What is REPLICATION in science?", choices: mc("Repeating an experiment to verify results","Copying another scientist's work","A type of data analysis","A type of hypothesis"), answer: "A", explanation: "Replication means repeating an experiment to verify that results are consistent and reliable." },
    ],
    2: [
      { text: "What is an ATOM?", choices: mc("The smallest unit of an element that retains its chemical properties","A type of molecule","A type of compound","A type of mixture"), answer: "A", explanation: "An atom is the smallest unit of an element that retains the chemical properties of that element." },
      { text: "What are PROTONS?", choices: mc("Positively charged particles in the nucleus","Negatively charged particles around the nucleus","Neutral particles in the nucleus","Particles with no charge"), answer: "A", explanation: "Protons are positively charged particles found in the nucleus of an atom." },
      { text: "What is the PERIODIC TABLE?", choices: mc("A chart organizing elements by atomic number and properties","A list of chemical compounds","A chart of chemical reactions","A list of molecules"), answer: "A", explanation: "The periodic table organizes all known elements by atomic number, with elements in the same group sharing similar properties." },
      { text: "What is an ELEMENT?", choices: mc("A pure substance made of only one type of atom","A mixture of atoms","A type of compound","A type of molecule"), answer: "A", explanation: "An element is a pure substance composed of only one type of atom, identified by its atomic number." },
      { text: "What is a COMPOUND?", choices: mc("A substance made of two or more elements chemically combined","A mixture of elements","A pure element","A type of atom"), answer: "A", explanation: "A compound is a substance formed when two or more elements are chemically combined in fixed proportions." },
    ],
    3: [
      { text: "What is a CHEMICAL REACTION?", choices: mc("A process where substances are transformed into new substances","A physical change","A change in state","A change in temperature"), answer: "A", explanation: "A chemical reaction transforms reactants into new products with different chemical properties." },
      { text: "What is a PHYSICAL CHANGE?", choices: mc("A change in form or appearance without changing the substance's identity","A change that creates a new substance","A chemical reaction","A change in atomic structure"), answer: "A", explanation: "A physical change alters the form or appearance of matter without changing its chemical composition." },
      { text: "What is the LAW OF CONSERVATION OF MASS?", choices: mc("Mass is neither created nor destroyed in a chemical reaction","Mass increases in chemical reactions","Mass decreases in chemical reactions","Mass only changes in physical reactions"), answer: "A", explanation: "The law of conservation of mass states that the total mass of reactants equals the total mass of products in a chemical reaction." },
      { text: "What is an EXOTHERMIC reaction?", choices: mc("A reaction that releases energy (heat) to the surroundings","A reaction that absorbs energy","A reaction that produces light only","A reaction that produces gas only"), answer: "A", explanation: "An exothermic reaction releases energy (usually as heat) to the surroundings (e.g., combustion, rusting)." },
      { text: "What is an ENDOTHERMIC reaction?", choices: mc("A reaction that absorbs energy from the surroundings","A reaction that releases energy","A reaction that produces heat","A reaction that produces light"), answer: "A", explanation: "An endothermic reaction absorbs energy from the surroundings, causing the surroundings to feel cooler (e.g., photosynthesis, dissolving ammonium nitrate)." },
    ],
    4: [
      { text: "What is NEWTON'S FIRST LAW (Law of Inertia)?", choices: mc("An object at rest stays at rest; an object in motion stays in motion unless acted on by an unbalanced force","Force equals mass times acceleration","For every action there is an equal and opposite reaction","Objects fall at the same rate"), answer: "A", explanation: "Newton's First Law: objects resist changes in their state of motion (inertia)." },
      { text: "What is NEWTON'S SECOND LAW?", choices: mc("F = ma (Force = mass × acceleration)","Objects at rest stay at rest","For every action there is an equal and opposite reaction","Gravity pulls objects down"), answer: "A", explanation: "Newton's Second Law: F = ma. The acceleration of an object depends on the net force and its mass." },
      { text: "What is NEWTON'S THIRD LAW?", choices: mc("For every action there is an equal and opposite reaction","F = ma","Objects resist changes in motion","Gravity pulls objects down"), answer: "A", explanation: "Newton's Third Law: for every action force, there is an equal and opposite reaction force." },
      { text: "What is NET FORCE?", choices: mc("The overall force on an object after all forces are combined","The largest force acting on an object","The force of gravity","The force of friction"), answer: "A", explanation: "Net force is the vector sum of all forces acting on an object." },
      { text: "What is BALANCED FORCE?", choices: mc("When forces acting on an object cancel out, resulting in no change in motion","When one force is greater than another","When there is no friction","When gravity is the only force"), answer: "A", explanation: "Balanced forces cancel each other out — the net force is zero, so the object doesn't accelerate." },
    ],
    5: [
      { text: "What is VELOCITY?", choices: mc("Speed in a specific direction","Speed without direction","Acceleration over time","Force times mass"), answer: "A", explanation: "Velocity is a vector quantity that includes both speed and direction." },
      { text: "What is ACCELERATION?", choices: mc("The rate of change of velocity","Speed in a direction","Force divided by mass","Distance divided by time"), answer: "A", explanation: "Acceleration is the rate of change of velocity — it occurs when speed, direction, or both change." },
      { text: "What is MOMENTUM?", choices: mc("Mass times velocity (p = mv)","Force times time","Mass times acceleration","Speed times distance"), answer: "A", explanation: "Momentum (p) = mass × velocity. It measures the quantity of motion of an object." },
      { text: "What is the LAW OF CONSERVATION OF MOMENTUM?", choices: mc("The total momentum of a closed system remains constant unless acted on by an external force","Momentum always increases","Momentum always decreases","Momentum equals force"), answer: "A", explanation: "The law of conservation of momentum states that the total momentum of a closed system remains constant." },
      { text: "What is INERTIA?", choices: mc("The tendency of an object to resist changes in its state of motion","The force of gravity","The force of friction","The acceleration of an object"), answer: "A", explanation: "Inertia is the tendency of an object to resist changes in its state of motion — related to mass." },
    ],
    6: [
      { text: "What is KINETIC ENERGY?", choices: mc("The energy of motion","Stored energy","Chemical energy","Nuclear energy"), answer: "A", explanation: "Kinetic energy is the energy an object has due to its motion. KE = (1/2)mv²." },
      { text: "What is POTENTIAL ENERGY?", choices: mc("Stored energy based on position or condition","Energy of motion","Thermal energy","Electrical energy"), answer: "A", explanation: "Potential energy is stored energy — gravitational PE = mgh (mass × gravity × height)." },
      { text: "What is the LAW OF CONSERVATION OF ENERGY?", choices: mc("Energy cannot be created or destroyed, only transformed","Energy always increases","Energy always decreases","Energy only exists as heat"), answer: "A", explanation: "Energy cannot be created or destroyed — it can only be converted from one form to another." },
      { text: "What is MECHANICAL ENERGY?", choices: mc("The sum of kinetic and potential energy","Only kinetic energy","Only potential energy","Thermal energy"), answer: "A", explanation: "Mechanical energy is the total of kinetic energy (motion) and potential energy (position) in a system." },
      { text: "What is POWER in physics?", choices: mc("The rate at which work is done or energy is transferred","Force times distance","Mass times acceleration","Energy divided by mass"), answer: "A", explanation: "Power is the rate of doing work: P = Work/time, measured in watts (W)." },
    ],
    7: [
      { text: "What is a WAVE?", choices: mc("A disturbance that transfers energy through matter or space","A type of particle","A type of force","A type of matter"), answer: "A", explanation: "A wave is a disturbance that transfers energy from one place to another without transferring matter." },
      { text: "What is WAVELENGTH?", choices: mc("The distance between two consecutive crests or troughs","The height of a wave","The number of waves per second","The speed of a wave"), answer: "A", explanation: "Wavelength is the distance between two consecutive crests (or troughs) of a wave." },
      { text: "What is FREQUENCY?", choices: mc("The number of waves that pass a point per second (measured in Hz)","The height of a wave","The distance between waves","The speed of a wave"), answer: "A", explanation: "Frequency is the number of complete waves that pass a point per second, measured in hertz (Hz)." },
      { text: "What is the ELECTROMAGNETIC SPECTRUM?", choices: mc("The range of all types of electromagnetic radiation (radio waves to gamma rays)","Only visible light","Only radio waves","Only X-rays"), answer: "A", explanation: "The electromagnetic spectrum includes all types of electromagnetic radiation: radio, microwave, infrared, visible, ultraviolet, X-ray, and gamma." },
      { text: "What is REFRACTION of light?", choices: mc("The bending of light as it passes from one medium to another","The bouncing of light off a surface","The absorption of light","The scattering of light"), answer: "A", explanation: "Refraction is the bending of light (or other waves) as it passes from one medium to another with a different density." },
    ],
    8: [
      { text: "What is the SOLAR SYSTEM?", choices: mc("The Sun and all objects that orbit it","Only the eight planets","Only the Sun and Earth","The Milky Way galaxy"), answer: "A", explanation: "The solar system consists of the Sun and all objects that orbit it: planets, moons, asteroids, comets, and dwarf planets." },
      { text: "What is a LIGHT YEAR?", choices: mc("The distance light travels in one year (about 9.46 trillion km)","The time it takes light to reach Earth","A unit of time","The speed of light"), answer: "A", explanation: "A light year is the distance light travels in one year — approximately 9.46 trillion kilometers." },
      { text: "What is the BIG BANG THEORY?", choices: mc("The theory that the universe began from an extremely hot, dense point about 13.8 billion years ago","The theory that the universe has always existed","The theory that the Sun created the universe","The theory that Earth is the center of the universe"), answer: "A", explanation: "The Big Bang Theory is the prevailing cosmological model explaining the origin of the universe from an extremely hot, dense state about 13.8 billion years ago." },
      { text: "What is a GALAXY?", choices: mc("A massive system of stars, gas, dust, and dark matter held together by gravity","A single star","A type of planet","A type of moon"), answer: "A", explanation: "A galaxy is a massive system containing billions of stars, along with gas, dust, and dark matter, held together by gravity." },
      { text: "What is the MILKY WAY?", choices: mc("The galaxy that contains our solar system","A type of star","A type of nebula","A type of black hole"), answer: "A", explanation: "The Milky Way is the spiral galaxy that contains our solar system, with an estimated 200-400 billion stars." },
    ],
  };
  return banks[unitNum] || banks[1];
}

function getGr8SSQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What was the COLUMBIAN EXCHANGE?", choices: mc("The transfer of plants, animals, diseases, and ideas between the Americas and Europe/Africa","A type of trade agreement","A colonial government","A type of currency"), answer: "A", explanation: "The Columbian Exchange was the widespread transfer of plants, animals, diseases, and culture between the Americas and the Old World following Columbus's voyages." },
      { text: "What were the THIRTEEN COLONIES?", choices: mc("The British colonies in North America that became the United States","All colonies in the Americas","The Spanish colonies in North America","The French colonies in North America"), answer: "A", explanation: "The Thirteen Colonies were the British colonies along the eastern seaboard of North America that declared independence in 1776." },
      { text: "What was MERCANTILISM?", choices: mc("An economic theory that colonies exist to benefit the mother country","A type of democracy","A type of trade agreement","A type of government"), answer: "A", explanation: "Mercantilism was the economic theory that colonies should provide raw materials to benefit the mother country's wealth." },
      { text: "What was the MAYFLOWER COMPACT?", choices: mc("An agreement by Pilgrim settlers to create a self-governing community","A type of trade agreement","A British law","A type of colonial charter"), answer: "A", explanation: "The Mayflower Compact (1620) was an agreement among Pilgrim settlers to create a self-governing community based on majority rule." },
      { text: "What was the TRIANGULAR TRADE?", choices: mc("Trade between Europe, Africa, and the Americas involving enslaved people, raw materials, and manufactured goods","Trade between three European countries","A type of colonial government","A trade route in Asia"), answer: "A", explanation: "The Triangular Trade was a system of trade between Europe, Africa, and the Americas, central to which was the forced transportation of enslaved Africans." },
    ],
    2: [
      { text: "What was the STAMP ACT (1765)?", choices: mc("A British tax on paper goods in the colonies","A law establishing colonial courts","A law creating colonial assemblies","A trade agreement"), answer: "A", explanation: "The Stamp Act (1765) required colonists to pay a tax on all paper documents, sparking colonial protests." },
      { text: "What was the BOSTON MASSACRE?", choices: mc("A 1770 confrontation where British soldiers killed five colonists","The first battle of the Revolution","The Boston Tea Party","A British tax"), answer: "A", explanation: "The Boston Massacre (1770) was a confrontation in which British soldiers killed five colonists, fueling anti-British sentiment." },
      { text: "What was the BOSTON TEA PARTY?", choices: mc("A 1773 protest where colonists dumped British tea into Boston Harbor","A British tax","A colonial assembly","The first battle of the Revolution"), answer: "A", explanation: "The Boston Tea Party (1773) was a protest by colonists who dumped 342 chests of British tea into Boston Harbor to protest taxation without representation." },
      { text: "What was 'NO TAXATION WITHOUT REPRESENTATION'?", choices: mc("The colonial argument that they should not be taxed by a Parliament in which they had no representatives","A British law","A type of colonial government","A trade agreement"), answer: "A", explanation: "'No taxation without representation' was the colonial argument that Parliament had no right to tax them since colonists had no elected representatives in Parliament." },
    ],
  };
  return banks[unitNum] || [];
}

function getGr8TechQuiz(unitNum) {
  const banks = {
    1: [
      { text: "What is DIGITAL CITIZENSHIP?", choices: mc("Responsible and ethical use of technology and the internet","Using technology for school only","Owning a digital device","Having a social media account"), answer: "A", explanation: "Digital citizenship means using technology responsibly, ethically, and safely." },
      { text: "What is INTELLECTUAL PROPERTY?", choices: mc("Creative works protected by copyright, trademark, or patent law","Physical property owned by a company","A type of computer hardware","A programming language"), answer: "A", explanation: "Intellectual property refers to creations of the mind — inventions, literary works, art — protected by law." },
      { text: "What is a CREATIVE COMMONS LICENSE?", choices: mc("A license allowing creators to share work with specific permissions","A type of copyright violation","A software program","A type of hardware"), answer: "A", explanation: "Creative Commons licenses allow creators to specify how others may use their work." },
      { text: "What is CYBERBULLYING?", choices: mc("Using technology to harass, threaten, or humiliate others","A type of computer virus","A programming error","A type of network"), answer: "A", explanation: "Cyberbullying is the use of digital technology to bully, harass, or intimidate others." },
      { text: "What is a DIGITAL FOOTPRINT?", choices: mc("The trail of data you leave when using the internet","A type of computer file","A programming concept","A type of network connection"), answer: "A", explanation: "A digital footprint is the record of your online activities and data you share on the internet." },
    ],
    2: [
      { text: "What is a FUNCTION in programming?", choices: mc("A reusable block of code that performs a specific task","A type of variable","A loop structure","A data type"), answer: "A", explanation: "A function is a named, reusable block of code designed to perform a specific task." },
      { text: "What is an ARRAY?", choices: mc("A data structure that stores multiple values in a single variable","A type of loop","A function","A conditional statement"), answer: "A", explanation: "An array is a data structure that stores a collection of values, accessible by index." },
      { text: "What is ERROR HANDLING?", choices: mc("Code that manages and responds to runtime errors gracefully","A type of variable","A loop structure","A data type"), answer: "A", explanation: "Error handling is the process of anticipating, detecting, and resolving errors in a program." },
      { text: "What is a PARAMETER?", choices: mc("A variable passed into a function","A type of loop","A data type","A conditional statement"), answer: "A", explanation: "A parameter is a variable in a function definition that receives a value when the function is called." },
      { text: "What is DEBUGGING?", choices: mc("The process of finding and fixing errors in code","Writing new code","Running a program","A type of data structure"), answer: "A", explanation: "Debugging is the systematic process of identifying and removing bugs (errors) from computer code." },
    ],
    3: [
      { text: "What is DESIGN THINKING?", choices: mc("A human-centered problem-solving approach with empathize, define, ideate, prototype, test stages","A type of programming","A software tool","A type of hardware"), answer: "A", explanation: "Design thinking is a human-centered approach to innovation that draws from the designer's toolkit." },
      { text: "What is a PROTOTYPE?", choices: mc("An early model of a product used to test concepts","A finished product","A type of code","A type of database"), answer: "A", explanation: "A prototype is an early sample or model built to test a concept or process." },
      { text: "What is USER EXPERIENCE (UX)?", choices: mc("How a person feels when using a product or service","The visual design of an app","The code behind an app","The hardware running an app"), answer: "A", explanation: "User experience (UX) refers to the overall experience a person has when interacting with a product." },
      { text: "What is an APP?", choices: mc("A software application designed to perform specific tasks","A type of hardware","A type of network","A programming language"), answer: "A", explanation: "An app (application) is a software program designed to perform a specific function for the user." },
      { text: "What is ITERATION in design?", choices: mc("The process of repeatedly testing and improving a design","Creating a final product","Writing code","Testing hardware"), answer: "A", explanation: "Iteration in design means repeatedly testing, evaluating, and refining a design to improve it." },
    ],
    4: [
      { text: "What is DATA SCIENCE?", choices: mc("The field that uses scientific methods to extract knowledge from data","A type of programming language","A type of hardware","A type of network"), answer: "A", explanation: "Data science combines statistics, programming, and domain expertise to extract insights from data." },
      { text: "What is DATA VISUALIZATION?", choices: mc("Representing data graphically to reveal patterns and insights","Storing data in a database","Collecting data from surveys","Writing code to process data"), answer: "A", explanation: "Data visualization is the graphical representation of data to help people understand patterns and trends." },
      { text: "What is a SPREADSHEET?", choices: mc("A digital tool for organizing, analyzing, and calculating data in rows and columns","A type of presentation software","A type of word processor","A type of database"), answer: "A", explanation: "A spreadsheet is a digital tool that organizes data in rows and columns and allows calculations." },
      { text: "What is MEAN in statistics?", choices: mc("The average of a set of numbers","The middle value in a data set","The most frequent value","The difference between highest and lowest values"), answer: "A", explanation: "The mean is the arithmetic average, calculated by adding all values and dividing by the count." },
      { text: "What is a DATASET?", choices: mc("A collection of related data organized for analysis","A type of programming language","A type of hardware","A type of network"), answer: "A", explanation: "A dataset is a structured collection of related data, typically organized in a table format for analysis." },
    ],
    5: [
      { text: "What is a NETWORK?", choices: mc("A system of connected computers and devices that share resources","A type of software","A type of programming language","A type of data structure"), answer: "A", explanation: "A network is a group of interconnected computers and devices that can share data and resources." },
      { text: "What is CYBERSECURITY?", choices: mc("The practice of protecting systems, networks, and data from digital attacks","A type of programming language","A type of hardware","A type of software"), answer: "A", explanation: "Cybersecurity involves protecting computer systems, networks, and data from theft, damage, or unauthorized access." },
      { text: "What is ENCRYPTION?", choices: mc("Converting data into a coded form to prevent unauthorized access","A type of virus","A type of network","A type of software"), answer: "A", explanation: "Encryption converts data into a coded format that can only be read by someone with the decryption key." },
      { text: "What is a FIREWALL?", choices: mc("A security system that monitors and controls network traffic","A type of virus","A type of hardware","A programming language"), answer: "A", explanation: "A firewall is a network security device that monitors and filters incoming and outgoing network traffic." },
      { text: "What is PHISHING?", choices: mc("A cyberattack that tricks users into revealing sensitive information","A type of programming","A type of network","A type of hardware"), answer: "A", explanation: "Phishing is a type of social engineering attack that tricks users into providing sensitive information." },
    ],
    6: [
      { text: "What is ENTREPRENEURSHIP?", choices: mc("The process of starting and running a new business venture","A type of programming","A type of network","A type of hardware"), answer: "A", explanation: "Entrepreneurship is the process of designing, launching, and running a new business or venture." },
      { text: "What is a VALUE PROPOSITION?", choices: mc("The unique benefit a product or service offers to customers","A type of code","A type of network","A type of hardware"), answer: "A", explanation: "A value proposition is a clear statement that explains how a product solves a problem or improves a situation." },
      { text: "What is a CAREER IN TECHNOLOGY?", choices: mc("A professional role that uses technology skills to solve problems and create products","A type of programming language","A type of hardware","A type of network"), answer: "A", explanation: "Technology careers span software development, cybersecurity, data science, UX design, and many other fields." },
      { text: "What is a PITCH?", choices: mc("A short presentation to convince others of the value of an idea or product","A type of code","A type of network","A type of hardware"), answer: "A", explanation: "A pitch is a concise presentation designed to persuade an audience — investors, customers, or partners." },
      { text: "What is DIGITAL MARKETING?", choices: mc("Promoting products or services using digital channels like social media and websites","A type of programming","A type of hardware","A type of network"), answer: "A", explanation: "Digital marketing uses online channels — social media, email, search engines — to promote products and services." },
    ],
  };
  return banks[unitNum] || banks[1];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTIC DATA FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getGr6MathDiag() {
  return [
    { text: "What is 3/4 + 1/2?", choices: mc("5/4","4/6","2/3","1"), answer: "A", unit: 1, skill: "G6MATH-U1-S1", diff: "easy", explanation: "Find a common denominator: 3/4 + 2/4 = 5/4." },
    { text: "What is 2.5 × 4?", choices: mc("10","8","12","6"), answer: "A", unit: 1, skill: "G6MATH-U1-S2", diff: "easy", explanation: "2.5 × 4 = 10." },
    { text: "What is 15% of 80?", choices: mc("12","15","8","20"), answer: "A", unit: 2, skill: "G6MATH-U2-S1", diff: "medium", explanation: "15% of 80 = 0.15 × 80 = 12." },
    { text: "Simplify: 24/36", choices: mc("2/3","3/4","1/2","4/6"), answer: "A", unit: 1, skill: "G6MATH-U1-S1", diff: "easy", explanation: "GCF of 24 and 36 is 12. 24÷12 / 36÷12 = 2/3." },
    { text: "Solve: x + 7 = 15", choices: mc("8","7","22","9"), answer: "A", unit: 3, skill: "G6MATH-U3-S1", diff: "easy", explanation: "x = 15 - 7 = 8." },
    { text: "What is the ratio of 3 to 9 in simplest form?", choices: mc("1:3","3:9","1:6","2:6"), answer: "A", unit: 2, skill: "G6MATH-U2-S2", diff: "easy", explanation: "3:9 simplifies to 1:3 by dividing both by 3." },
    { text: "What is the area of a rectangle with length 8 and width 5?", choices: mc("40","13","26","35"), answer: "A", unit: 5, skill: "G6MATH-U5-S1", diff: "easy", explanation: "Area = length × width = 8 × 5 = 40." },
    { text: "What is the mean of 4, 6, 8, 10?", choices: mc("7","6","8","5"), answer: "A", unit: 6, skill: "G6MATH-U6-S1", diff: "easy", explanation: "Mean = (4+6+8+10)/4 = 28/4 = 7." },
    { text: "Solve: 3x = 21", choices: mc("7","6","8","9"), answer: "A", unit: 3, skill: "G6MATH-U3-S1", diff: "easy", explanation: "x = 21 ÷ 3 = 7." },
    { text: "What is 0.6 as a fraction?", choices: mc("3/5","6/10 unsimplified","2/3","1/6"), answer: "A", unit: 1, skill: "G6MATH-U1-S1", diff: "easy", explanation: "0.6 = 6/10 = 3/5 in simplest form." },
    { text: "What is 40% of 150?", choices: mc("60","40","50","70"), answer: "A", unit: 2, skill: "G6MATH-U2-S1", diff: "medium", explanation: "40% of 150 = 0.40 × 150 = 60." },
    { text: "What is the perimeter of a square with side 7?", choices: mc("28","14","49","21"), answer: "A", unit: 5, skill: "G6MATH-U5-S1", diff: "easy", explanation: "Perimeter = 4 × side = 4 × 7 = 28." },
    { text: "What is the median of 3, 7, 9, 11, 15?", choices: mc("9","7","11","10"), answer: "A", unit: 6, skill: "G6MATH-U6-S1", diff: "medium", explanation: "The median is the middle value: 3, 7, 9, 11, 15 → median = 9." },
    { text: "Evaluate: 2³ + 4", choices: mc("12","10","14","16"), answer: "A", unit: 3, skill: "G6MATH-U3-S2", diff: "medium", explanation: "2³ = 8; 8 + 4 = 12." },
    { text: "What is the volume of a rectangular prism: l=4, w=3, h=5?", choices: mc("60","35","47","20"), answer: "A", unit: 5, skill: "G6MATH-U5-S2", diff: "medium", explanation: "Volume = l × w × h = 4 × 3 × 5 = 60." },
    { text: "What is the unit rate if 12 apples cost $3?", choices: mc("$0.25 per apple","$3 per apple","$1 per apple","$0.50 per apple"), answer: "A", unit: 2, skill: "G6MATH-U2-S2", diff: "medium", explanation: "Unit rate = $3 ÷ 12 = $0.25 per apple." },
    { text: "Solve: x/4 = 9", choices: mc("36","13","2.25","4"), answer: "A", unit: 3, skill: "G6MATH-U3-S1", diff: "medium", explanation: "x = 9 × 4 = 36." },
    { text: "What is the probability of rolling a 3 on a standard die?", choices: mc("1/6","1/3","1/2","3/6"), answer: "A", unit: 6, skill: "G6MATH-U6-S2", diff: "medium", explanation: "There is 1 favorable outcome (rolling 3) out of 6 possible outcomes." },
    { text: "What is the surface area of a cube with side 3?", choices: mc("54","27","18","36"), answer: "A", unit: 5, skill: "G6MATH-U5-S2", diff: "medium", explanation: "Surface area = 6 × side² = 6 × 9 = 54." },
    { text: "Simplify: 4(x + 3) - 2x", choices: mc("2x + 12","6x + 3","2x + 3","4x + 12"), answer: "A", unit: 3, skill: "G6MATH-U3-S3", diff: "medium", explanation: "4x + 12 - 2x = 2x + 12." },
    { text: "What is 7/8 ÷ 1/4?", choices: mc("7/2","7/32","1/2","4/7"), answer: "A", unit: 1, skill: "G6MATH-U1-S3", diff: "medium", explanation: "7/8 ÷ 1/4 = 7/8 × 4/1 = 28/8 = 7/2." },
    { text: "A store marks up an item 25%. Original price is $40. New price?", choices: mc("$50","$45","$55","$48"), answer: "A", unit: 2, skill: "G6MATH-U2-S3", diff: "medium", explanation: "25% of $40 = $10. $40 + $10 = $50." },
    { text: "What is the mode of: 2, 4, 4, 6, 8, 8, 8?", choices: mc("8","4","6","2"), answer: "A", unit: 6, skill: "G6MATH-U6-S2", diff: "easy", explanation: "The mode is the most frequent value: 8 appears 3 times." },
    { text: "Graph: y = x + 2. What is y when x = 5?", choices: mc("7","3","10","2"), answer: "A", unit: 4, skill: "G6MATH-U4-S1", diff: "medium", explanation: "y = 5 + 2 = 7." },
    { text: "What is the GCF of 24 and 36?", choices: mc("12","6","4","8"), answer: "A", unit: 1, skill: "G6MATH-U1-S2", diff: "easy", explanation: "Factors of 24: 1,2,3,4,6,8,12,24. Factors of 36: 1,2,3,4,6,9,12,18,36. GCF = 12." },
    { text: "What is the LCM of 4 and 6?", choices: mc("12","24","8","6"), answer: "A", unit: 1, skill: "G6MATH-U1-S2", diff: "easy", explanation: "Multiples of 4: 4,8,12. Multiples of 6: 6,12. LCM = 12." },
    { text: "Solve: 2x - 5 = 11", choices: mc("8","3","6","16"), answer: "A", unit: 3, skill: "G6MATH-U3-S1", diff: "medium", explanation: "2x = 16; x = 8." },
    { text: "What is 5² - 3²?", choices: mc("16","4","34","8"), answer: "A", unit: 3, skill: "G6MATH-U3-S2", diff: "easy", explanation: "5² = 25; 3² = 9; 25 - 9 = 16." },
    { text: "A bag has 3 red, 2 blue, 5 green marbles. P(blue)?", choices: mc("1/5","1/4","2/5","1/3"), answer: "A", unit: 6, skill: "G6MATH-U6-S2", diff: "medium", explanation: "P(blue) = 2/10 = 1/5." },
    { text: "What is the area of a triangle: base=10, height=6?", choices: mc("30","60","15","20"), answer: "A", unit: 5, skill: "G6MATH-U5-S1", diff: "medium", explanation: "Area = (1/2) × base × height = (1/2) × 10 × 6 = 30." },
  ];
}

function getGr6ELADiag() {
  return [
    { text: "What is the MAIN IDEA of a passage?", choices: mc("The central point the author wants to communicate","The first sentence of a paragraph","A supporting detail","The conclusion"), answer: "A", unit: 1, skill: "G6ELA-U1-S1", diff: "easy", explanation: "The main idea is the central message or point the author is making in a text." },
    { text: "What is a THEME in literature?", choices: mc("The central message or life lesson conveyed by a story","The plot of the story","The setting of the story","The main character"), answer: "A", unit: 2, skill: "G6ELA-U2-S1", diff: "easy", explanation: "Theme is the central message or insight about life that a literary work conveys." },
    { text: "What is FIGURATIVE LANGUAGE?", choices: mc("Language that uses figures of speech to create vivid imagery","Literal, factual language","Technical language","Academic vocabulary"), answer: "A", unit: 3, skill: "G6ELA-U3-S1", diff: "easy", explanation: "Figurative language uses expressions like metaphors, similes, and personification to create meaning beyond literal words." },
    { text: "What is a SIMILE?", choices: mc("A comparison using 'like' or 'as'","A comparison without 'like' or 'as'","Giving human traits to non-human things","An exaggeration"), answer: "A", unit: 3, skill: "G6ELA-U3-S1", diff: "easy", explanation: "A simile compares two things using 'like' or 'as' (e.g., 'as fast as lightning')." },
    { text: "What is a METAPHOR?", choices: mc("A direct comparison without 'like' or 'as'","A comparison using 'like' or 'as'","Giving human traits to non-human things","An exaggeration"), answer: "A", unit: 3, skill: "G6ELA-U3-S1", diff: "easy", explanation: "A metaphor directly states that one thing is another (e.g., 'Life is a journey')." },
    { text: "What is the PURPOSE of a THESIS STATEMENT?", choices: mc("To state the main argument or claim of an essay","To introduce the topic","To provide evidence","To conclude the essay"), answer: "A", unit: 4, skill: "G6ELA-U4-S1", diff: "easy", explanation: "A thesis statement presents the main argument or central claim of an essay." },
    { text: "What is POINT OF VIEW in literature?", choices: mc("The perspective from which a story is told","The theme of a story","The plot of a story","The setting of a story"), answer: "A", unit: 2, skill: "G6ELA-U2-S2", diff: "easy", explanation: "Point of view is the perspective from which a narrative is told (first person, third person, etc.)." },
    { text: "What is CONTEXT CLUES?", choices: mc("Information in the surrounding text that helps determine word meaning","A dictionary definition","A thesaurus entry","A footnote"), answer: "A", unit: 5, skill: "G6ELA-U5-S1", diff: "easy", explanation: "Context clues are words or phrases near an unfamiliar word that help readers determine its meaning." },
    { text: "What is an INFERENCE?", choices: mc("A conclusion drawn from evidence and reasoning","A direct statement from the text","A summary of the text","A quotation from the text"), answer: "A", unit: 1, skill: "G6ELA-U1-S2", diff: "medium", explanation: "An inference is a logical conclusion drawn from evidence in the text combined with prior knowledge." },
    { text: "What is TEXTUAL EVIDENCE?", choices: mc("Specific details or quotes from a text that support a claim","A personal opinion","A summary","A paraphrase"), answer: "A", unit: 1, skill: "G6ELA-U1-S3", diff: "easy", explanation: "Textual evidence is specific information from a text used to support an argument or claim." },
    { text: "What is the EXPOSITION in a story?", choices: mc("The introduction that establishes setting, characters, and conflict","The climax","The resolution","The falling action"), answer: "A", unit: 2, skill: "G6ELA-U2-S1", diff: "medium", explanation: "Exposition is the opening section of a narrative that introduces the setting, characters, and initial conflict." },
    { text: "What is PERSONIFICATION?", choices: mc("Giving human qualities to non-human things","A comparison using 'like' or 'as'","A direct comparison","An exaggeration"), answer: "A", unit: 3, skill: "G6ELA-U3-S2", diff: "easy", explanation: "Personification attributes human characteristics to non-human things (e.g., 'The wind whispered')." },
    { text: "What is the CLIMAX of a story?", choices: mc("The turning point of highest tension in the plot","The introduction","The resolution","The falling action"), answer: "A", unit: 2, skill: "G6ELA-U2-S1", diff: "easy", explanation: "The climax is the moment of greatest tension or conflict in a narrative." },
    { text: "What is SUMMARIZING?", choices: mc("Restating the main ideas of a text in your own words briefly","Copying text word for word","Analyzing a text","Critiquing a text"), answer: "A", unit: 1, skill: "G6ELA-U1-S1", diff: "easy", explanation: "Summarizing means briefly restating the main points of a text in your own words." },
    { text: "What is an ARGUMENTATIVE ESSAY?", choices: mc("An essay that takes a position and supports it with evidence","An essay that tells a story","An essay that describes something","An essay that explains a process"), answer: "A", unit: 4, skill: "G6ELA-U4-S1", diff: "medium", explanation: "An argumentative essay presents a claim and supports it with evidence and reasoning." },
    { text: "What is ALLITERATION?", choices: mc("The repetition of the same initial consonant sound in nearby words","The repetition of vowel sounds","A comparison using 'like' or 'as'","An exaggeration"), answer: "A", unit: 3, skill: "G6ELA-U3-S2", diff: "medium", explanation: "Alliteration is the repetition of the same consonant sound at the beginning of nearby words." },
    { text: "What is a PRIMARY SOURCE?", choices: mc("An original, firsthand account or document","A secondary analysis of events","A textbook","A summary"), answer: "A", unit: 6, skill: "G6ELA-U6-S1", diff: "medium", explanation: "A primary source is an original document or firsthand account created at the time of an event." },
    { text: "What is TONE in writing?", choices: mc("The author's attitude toward the subject or audience","The theme of the text","The plot of the text","The setting of the text"), answer: "A", unit: 7, skill: "G6ELA-U7-S1", diff: "medium", explanation: "Tone is the author's attitude or emotional stance toward the subject, conveyed through word choice and style." },
    { text: "What is MOOD in literature?", choices: mc("The emotional atmosphere created in a text for the reader","The author's attitude","The theme","The plot"), answer: "A", unit: 7, skill: "G6ELA-U7-S1", diff: "medium", explanation: "Mood is the emotional atmosphere or feeling that a literary work creates in the reader." },
    { text: "What is FORESHADOWING?", choices: mc("Hints or clues about what will happen later in a story","A flashback to earlier events","A direct statement of future events","A character's prediction"), answer: "A", unit: 2, skill: "G6ELA-U2-S3", diff: "medium", explanation: "Foreshadowing is a literary device where the author hints at future events in the story." },
    { text: "What is CONNOTATION?", choices: mc("The emotional or cultural associations of a word beyond its literal meaning","The dictionary definition of a word","The origin of a word","The spelling of a word"), answer: "A", unit: 5, skill: "G6ELA-U5-S2", diff: "medium", explanation: "Connotation refers to the implied or emotional meaning associated with a word beyond its literal definition." },
    { text: "What is a COUNTERARGUMENT?", choices: mc("An opposing viewpoint that a writer must address and refute","Supporting evidence","A thesis statement","A conclusion"), answer: "A", unit: 4, skill: "G6ELA-U4-S2", diff: "medium", explanation: "A counterargument is an opposing viewpoint that a writer acknowledges and then refutes to strengthen their argument." },
    { text: "What is HYPERBOLE?", choices: mc("An extreme exaggeration for effect","A comparison using 'like' or 'as'","Giving human traits to non-human things","A repetition of sounds"), answer: "A", unit: 3, skill: "G6ELA-U3-S3", diff: "easy", explanation: "Hyperbole is an extreme exaggeration used for emphasis or effect (e.g., 'I've told you a million times')." },
    { text: "What is PARAPHRASING?", choices: mc("Restating someone else's ideas in your own words","Copying text word for word","Summarizing a long text","Quoting directly"), answer: "A", unit: 1, skill: "G6ELA-U1-S3", diff: "easy", explanation: "Paraphrasing means restating the content of a source in your own words while preserving the meaning." },
    { text: "What is PLOT in a story?", choices: mc("The sequence of events that make up a story","The theme of the story","The setting of the story","The characters in the story"), answer: "A", unit: 2, skill: "G6ELA-U2-S1", diff: "easy", explanation: "Plot is the sequence of events that make up a narrative, including exposition, rising action, climax, and resolution." },
    { text: "What is SETTING in literature?", choices: mc("The time and place where a story takes place","The theme of the story","The plot of the story","The characters in the story"), answer: "A", unit: 2, skill: "G6ELA-U2-S2", diff: "easy", explanation: "Setting is the time and place in which a story's events occur." },
    { text: "What is CHARACTERIZATION?", choices: mc("The methods an author uses to develop and reveal a character's personality","The plot of the story","The theme of the story","The setting of the story"), answer: "A", unit: 2, skill: "G6ELA-U2-S2", diff: "medium", explanation: "Characterization is the process by which an author reveals a character's personality through actions, dialogue, and description." },
    { text: "What is CONFLICT in a story?", choices: mc("The struggle between opposing forces that drives the plot","The theme of the story","The setting of the story","The resolution"), answer: "A", unit: 2, skill: "G6ELA-U2-S1", diff: "easy", explanation: "Conflict is the central struggle or problem in a story that the characters must face and resolve." },
    { text: "What is the RESOLUTION of a story?", choices: mc("The part where the conflict is resolved and the story concludes","The climax","The rising action","The exposition"), answer: "A", unit: 2, skill: "G6ELA-U2-S1", diff: "easy", explanation: "The resolution is the final part of a story where the conflict is resolved and loose ends are tied up." },
    { text: "What is SYMBOLISM in literature?", choices: mc("Using an object, person, or event to represent a larger idea","A type of figurative language","A plot device","A type of conflict"), answer: "A", unit: 3, skill: "G6ELA-U3-S3", diff: "medium", explanation: "Symbolism is the use of symbols — objects, characters, or events — to represent abstract ideas or concepts." },
  ];
}

function getGr6SciDiag() {
  return [
    { text: "What is the SCIENTIFIC METHOD?", choices: mc("A systematic process for investigating questions through observation and experimentation","A type of laboratory equipment","A scientific theory","A type of data"), answer: "A", unit: 1, skill: "G6SCI-U1-S1", diff: "easy", explanation: "The scientific method is a systematic approach to research involving observation, hypothesis, experimentation, and conclusion." },
    { text: "What is a HYPOTHESIS?", choices: mc("A testable prediction or explanation for an observation","A proven fact","A conclusion","A type of data"), answer: "A", unit: 1, skill: "G6SCI-U1-S1", diff: "easy", explanation: "A hypothesis is a testable, falsifiable prediction or explanation that can be tested through experimentation." },
    { text: "What is MATTER?", choices: mc("Anything that has mass and takes up space","Only solid objects","Only liquids and gases","Energy"), answer: "A", unit: 2, skill: "G6SCI-U2-S1", diff: "easy", explanation: "Matter is defined as anything that has mass and occupies space, including solids, liquids, and gases." },
    { text: "What are the THREE STATES OF MATTER?", choices: mc("Solid, liquid, gas","Solid, plasma, liquid","Gas, liquid, energy","Solid, liquid, vapor"), answer: "A", unit: 2, skill: "G6SCI-U2-S1", diff: "easy", explanation: "The three common states of matter are solid (fixed shape/volume), liquid (fixed volume, variable shape), and gas (variable shape/volume)." },
    { text: "What is DENSITY?", choices: mc("Mass per unit volume","Volume per unit mass","Mass times volume","Weight divided by area"), answer: "A", unit: 2, skill: "G6SCI-U2-S2", diff: "easy", explanation: "Density = mass ÷ volume. It describes how much mass is packed into a given volume." },
    { text: "What is CONDUCTION?", choices: mc("Heat transfer through direct contact between materials","Heat transfer through fluid movement","Heat transfer through electromagnetic waves","Heat transfer through radiation"), answer: "A", unit: 3, skill: "G6SCI-U3-S1", diff: "easy", explanation: "Conduction is the transfer of heat through direct contact between particles of matter." },
    { text: "What is CONVECTION?", choices: mc("Heat transfer through the movement of fluids","Heat transfer through direct contact","Heat transfer through electromagnetic waves","Heat transfer through solids"), answer: "A", unit: 3, skill: "G6SCI-U3-S1", diff: "easy", explanation: "Convection is heat transfer through the movement of fluids (liquids or gases) due to temperature differences." },
    { text: "What is NEWTON'S FIRST LAW?", choices: mc("An object at rest stays at rest unless acted upon by an unbalanced force","Force equals mass times acceleration","For every action there is an equal and opposite reaction","Objects fall at the same rate"), answer: "A", unit: 4, skill: "G6SCI-U4-S1", diff: "easy", explanation: "Newton's First Law (Law of Inertia) states that objects maintain their state of motion unless acted upon by an unbalanced force." },
    { text: "What is SPEED?", choices: mc("Distance traveled per unit of time","Rate of change of velocity","Distance times time","Force divided by mass"), answer: "A", unit: 4, skill: "G6SCI-U4-S2", diff: "easy", explanation: "Speed = distance ÷ time. It measures how fast an object moves." },
    { text: "What are the LAYERS OF EARTH?", choices: mc("Crust, mantle, outer core, inner core","Crust, rock, magma, iron","Surface, middle, center, core","Lithosphere, hydrosphere, atmosphere, biosphere"), answer: "A", unit: 5, skill: "G6SCI-U5-S1", diff: "easy", explanation: "Earth's layers from outside to inside are: crust, mantle, outer core (liquid), and inner core (solid)." },
    { text: "What is PLATE TECTONICS?", choices: mc("The theory that Earth's crust is divided into moving plates","The study of earthquakes","The study of volcanoes","The theory of continental drift only"), answer: "A", unit: 5, skill: "G6SCI-U5-S1", diff: "medium", explanation: "Plate tectonics is the scientific theory that Earth's lithosphere is divided into plates that move, causing earthquakes, volcanoes, and mountain formation." },
    { text: "What is WEATHERING?", choices: mc("The breakdown of rocks by physical or chemical processes","The movement of sediment","The deposition of sediment","The formation of soil"), answer: "A", unit: 6, skill: "G6SCI-U6-S1", diff: "easy", explanation: "Weathering is the process by which rocks are broken down into smaller pieces by physical or chemical means." },
    { text: "What is EROSION?", choices: mc("The movement of weathered material by wind, water, or ice","The breakdown of rocks","The deposition of sediment","The formation of soil"), answer: "A", unit: 6, skill: "G6SCI-U6-S1", diff: "easy", explanation: "Erosion is the process by which weathered rock and soil are transported by agents like water, wind, or ice." },
    { text: "What is the WATER CYCLE?", choices: mc("The continuous movement of water through evaporation, condensation, and precipitation","The study of rivers and lakes","The movement of ocean currents","The formation of clouds"), answer: "A", unit: 7, skill: "G6SCI-U7-S1", diff: "easy", explanation: "The water cycle describes the continuous movement of water through evaporation, condensation, precipitation, and collection." },
    { text: "What is a FOOD WEB?", choices: mc("A complex network of feeding relationships in an ecosystem","A simple food chain","A list of producers","A type of habitat"), answer: "A", unit: 8, skill: "G6SCI-U8-S1", diff: "easy", explanation: "A food web is a complex network of interconnected food chains showing feeding relationships in an ecosystem." },
    { text: "What is PHOTOSYNTHESIS?", choices: mc("The process by which plants convert sunlight into food","The process by which animals breathe","The process by which plants absorb water","The process by which bacteria decompose matter"), answer: "A", unit: 8, skill: "G6SCI-U8-S2", diff: "easy", explanation: "Photosynthesis is the process by which plants use sunlight, water, and CO₂ to produce glucose and oxygen." },
    { text: "What is a PRODUCER in an ecosystem?", choices: mc("An organism that makes its own food through photosynthesis","An organism that eats plants","An organism that eats animals","An organism that decomposes matter"), answer: "A", unit: 8, skill: "G6SCI-U8-S1", diff: "easy", explanation: "Producers (plants, algae) are organisms that produce their own food through photosynthesis." },
    { text: "What is RADIATION as heat transfer?", choices: mc("Heat transfer through electromagnetic waves without needing matter","Heat transfer through direct contact","Heat transfer through fluid movement","Heat transfer through conduction"), answer: "A", unit: 3, skill: "G6SCI-U3-S2", diff: "medium", explanation: "Radiation is heat transfer through electromagnetic waves (like infrared radiation) that can travel through a vacuum." },
    { text: "What is ACCELERATION?", choices: mc("The rate of change of velocity","Distance divided by time","Force divided by mass","Speed times time"), answer: "A", unit: 4, skill: "G6SCI-U4-S2", diff: "medium", explanation: "Acceleration is the rate at which an object's velocity changes over time." },
    { text: "What is a CHEMICAL CHANGE?", choices: mc("A change that produces a new substance with different properties","A change in shape or size","A change in state of matter","A change in temperature"), answer: "A", unit: 2, skill: "G6SCI-U2-S3", diff: "medium", explanation: "A chemical change produces one or more new substances with different chemical properties from the original." },
    { text: "What is BIOTIC?", choices: mc("Living components of an ecosystem","Non-living components","Physical factors","Chemical factors"), answer: "A", unit: 8, skill: "G6SCI-U8-S1", diff: "easy", explanation: "Biotic factors are the living components of an ecosystem, including plants, animals, fungi, and bacteria." },
    { text: "What is ABIOTIC?", choices: mc("Non-living components of an ecosystem","Living components","Producers","Consumers"), answer: "A", unit: 8, skill: "G6SCI-U8-S1", diff: "easy", explanation: "Abiotic factors are the non-living components of an ecosystem, such as sunlight, water, temperature, and soil." },
    { text: "What is NEWTON'S SECOND LAW?", choices: mc("Force equals mass times acceleration (F=ma)","Objects at rest stay at rest","For every action there is an equal and opposite reaction","Objects fall at the same rate"), answer: "A", unit: 4, skill: "G6SCI-U4-S1", diff: "medium", explanation: "Newton's Second Law states that Force = mass × acceleration (F=ma)." },
    { text: "What is a PHYSICAL CHANGE?", choices: mc("A change in form or appearance without changing chemical composition","A change that produces a new substance","A change in chemical properties","A change in atomic structure"), answer: "A", unit: 2, skill: "G6SCI-U2-S3", diff: "easy", explanation: "A physical change alters the form or appearance of matter without changing its chemical composition." },
    { text: "What is the ATMOSPHERE?", choices: mc("The layer of gases surrounding Earth","The layer of water on Earth","The solid outer layer of Earth","The molten layer inside Earth"), answer: "A", unit: 7, skill: "G6SCI-U7-S1", diff: "easy", explanation: "The atmosphere is the layer of gases surrounding Earth, composed mainly of nitrogen (78%) and oxygen (21%)." },
    { text: "What is DECOMPOSITION in an ecosystem?", choices: mc("The breakdown of dead organic matter by decomposers","The process of photosynthesis","The movement of energy through a food chain","The process of respiration"), answer: "A", unit: 8, skill: "G6SCI-U8-S2", diff: "medium", explanation: "Decomposition is the process by which decomposers (bacteria, fungi) break down dead organic matter, recycling nutrients." },
    { text: "What is GRAVITY?", choices: mc("The force of attraction between objects with mass","A type of electromagnetic force","A type of chemical force","The force that repels objects"), answer: "A", unit: 4, skill: "G6SCI-U4-S3", diff: "easy", explanation: "Gravity is the attractive force between any two objects with mass, pulling them toward each other." },
    { text: "What is a VOLCANO?", choices: mc("An opening in Earth's crust through which magma, ash, and gases erupt","A type of earthquake","A type of mountain formed by erosion","A type of rock formation"), answer: "A", unit: 5, skill: "G6SCI-U5-S2", diff: "easy", explanation: "A volcano is an opening in Earth's crust through which molten rock (magma), ash, and gases erupt." },
    { text: "What is SOIL FORMATION?", choices: mc("The process by which weathered rock and organic matter combine over time","The process of erosion","The process of deposition","The process of weathering only"), answer: "A", unit: 6, skill: "G6SCI-U6-S2", diff: "medium", explanation: "Soil formation occurs when weathered rock particles mix with organic matter (humus) over long periods of time." },
    { text: "What is ENERGY TRANSFORMATION?", choices: mc("The conversion of energy from one form to another","The creation of new energy","The destruction of energy","The storage of energy"), answer: "A", unit: 3, skill: "G6SCI-U3-S3", diff: "medium", explanation: "Energy transformation is the conversion of energy from one form to another (e.g., chemical to kinetic, solar to electrical)." },
  ];
}

function getGr6SSDiag() {
  return [
    { text: "What is GEOGRAPHY?", choices: mc("The study of Earth's physical features, climate, and human populations","The study of ancient history","The study of government","The study of economics"), answer: "A", unit: 1, skill: "G6SS-U1-S1", diff: "easy", explanation: "Geography is the study of Earth's physical features, environments, and the relationship between humans and their environment." },
    { text: "What is CULTURE?", choices: mc("The beliefs, customs, arts, and way of life shared by a group of people","The government of a country","The economy of a region","The geography of an area"), answer: "A", unit: 2, skill: "G6SS-U2-S1", diff: "easy", explanation: "Culture encompasses the shared beliefs, values, customs, arts, and social institutions of a group of people." },
    { text: "What is a CIVILIZATION?", choices: mc("A complex society with cities, government, writing, and specialized labor","A small farming community","A nomadic group","A type of government"), answer: "A", unit: 3, skill: "G6SS-U3-S1", diff: "easy", explanation: "A civilization is a complex, organized society with advanced cities, government, writing systems, and division of labor." },
    { text: "What is MESOPOTAMIA?", choices: mc("The region between the Tigris and Euphrates rivers, site of early civilization","A region in Egypt","A region in China","A region in India"), answer: "A", unit: 3, skill: "G6SS-U3-S1", diff: "easy", explanation: "Mesopotamia (modern-day Iraq) is the region between the Tigris and Euphrates rivers, home to some of the world's earliest civilizations." },
    { text: "What is a DEMOCRACY?", choices: mc("A system of government where citizens hold political power","A system where one ruler holds all power","A system ruled by religious leaders","A system ruled by military leaders"), answer: "A", unit: 5, skill: "G6SS-U5-S1", diff: "easy", explanation: "Democracy is a system of government in which political power is held by the people, either directly or through elected representatives." },
    { text: "What is ECONOMICS?", choices: mc("The study of how people produce, distribute, and consume goods and services","The study of government","The study of history","The study of geography"), answer: "A", unit: 6, skill: "G6SS-U6-S1", diff: "easy", explanation: "Economics is the study of how individuals, businesses, and societies make decisions about producing and consuming goods and services." },
    { text: "What is SUPPLY AND DEMAND?", choices: mc("The economic principle that prices are determined by the availability of goods and consumer desire","A type of government policy","A type of trade agreement","A type of taxation"), answer: "A", unit: 6, skill: "G6SS-U6-S1", diff: "medium", explanation: "Supply and demand is the economic model explaining how prices are determined by the interaction of product availability and consumer desire." },
    { text: "What is a MAP SCALE?", choices: mc("A ratio that relates distances on a map to actual distances on Earth","A type of map projection","A legend on a map","A compass rose"), answer: "A", unit: 1, skill: "G6SS-U1-S2", diff: "easy", explanation: "A map scale is a ratio or bar that shows the relationship between distances on a map and actual distances on Earth." },
    { text: "What is ANCIENT EGYPT known for?", choices: mc("Pyramids, pharaohs, hieroglyphics, and the Nile River civilization","The Great Wall","The Colosseum","The Acropolis"), answer: "A", unit: 3, skill: "G6SS-U3-S2", diff: "easy", explanation: "Ancient Egypt is known for its pyramids, pharaohs, hieroglyphic writing system, and civilization along the Nile River." },
    { text: "What is ANCIENT GREECE known for?", choices: mc("Democracy, philosophy, the Olympics, and contributions to art and science","Pyramids and pharaohs","The Great Wall","The Roman Empire"), answer: "A", unit: 4, skill: "G6SS-U4-S1", diff: "easy", explanation: "Ancient Greece is known for developing democracy, philosophy (Socrates, Plato, Aristotle), the Olympic Games, and major contributions to art, science, and mathematics." },
    { text: "What is the SILK ROAD?", choices: mc("An ancient trade network connecting China to the Mediterranean world","A road built in China","A type of ancient textile","A type of ancient government"), answer: "A", unit: 7, skill: "G6SS-U7-S1", diff: "medium", explanation: "The Silk Road was an ancient network of trade routes connecting East Asia to the Mediterranean, facilitating the exchange of goods, ideas, and cultures." },
    { text: "What is FEUDALISM?", choices: mc("A medieval social system where land was exchanged for military service and loyalty","A type of democracy","A type of ancient government","A type of economic system"), answer: "A", unit: 8, skill: "G6SS-U8-S1", diff: "medium", explanation: "Feudalism was a hierarchical social and political system in medieval Europe where lords granted land to vassals in exchange for military service." },
    { text: "What is a PRIMARY SOURCE?", choices: mc("An original document or artifact from the time period being studied","A textbook about history","A documentary film","A historian's analysis"), answer: "A", unit: 1, skill: "G6SS-U1-S3", diff: "easy", explanation: "A primary source is an original document, artifact, or account created during the time period being studied." },
    { text: "What is ANCIENT ROME known for?", choices: mc("The Roman Republic/Empire, law, engineering, and Latin language","Pyramids and pharaohs","Democracy and philosophy","The Silk Road"), answer: "A", unit: 4, skill: "G6SS-U4-S2", diff: "easy", explanation: "Ancient Rome is known for the Roman Republic and Empire, Roman law, engineering achievements (aqueducts, roads), and the Latin language." },
    { text: "What is MONOTHEISM?", choices: mc("The belief in one God","The belief in many gods","The belief in no gods","The worship of nature"), answer: "A", unit: 2, skill: "G6SS-U2-S2", diff: "easy", explanation: "Monotheism is the belief in and worship of a single, all-powerful God (e.g., Judaism, Christianity, Islam)." },
    { text: "What is POLYTHEISM?", choices: mc("The belief in many gods","The belief in one God","The belief in no gods","The worship of ancestors"), answer: "A", unit: 2, skill: "G6SS-U2-S2", diff: "easy", explanation: "Polytheism is the belief in and worship of multiple gods (e.g., ancient Greek, Roman, Egyptian religions)." },
    { text: "What is a CITY-STATE?", choices: mc("An independent state consisting of a city and its surrounding territory","A large empire","A type of democracy","A type of feudal system"), answer: "A", unit: 4, skill: "G6SS-U4-S1", diff: "medium", explanation: "A city-state is an independent political unit consisting of a city and the surrounding territory it controls (e.g., Athens, Sparta)." },
    { text: "What is TRADE?", choices: mc("The exchange of goods and services between people or regions","A type of government","A type of military action","A type of cultural practice"), answer: "A", unit: 6, skill: "G6SS-U6-S2", diff: "easy", explanation: "Trade is the voluntary exchange of goods, services, or resources between individuals, groups, or nations." },
    { text: "What is LATITUDE?", choices: mc("Lines that run east-west measuring distance north or south of the equator","Lines that run north-south measuring distance east or west of the prime meridian","A type of map projection","A type of geographic feature"), answer: "A", unit: 1, skill: "G6SS-U1-S1", diff: "easy", explanation: "Latitude lines run east-west and measure the angular distance north or south of the equator (0° to 90°)." },
    { text: "What is LONGITUDE?", choices: mc("Lines that run north-south measuring distance east or west of the prime meridian","Lines that run east-west measuring distance north or south of the equator","A type of map projection","A type of geographic feature"), answer: "A", unit: 1, skill: "G6SS-U1-S1", diff: "easy", explanation: "Longitude lines run north-south and measure the angular distance east or west of the prime meridian (0° to 180°)." },
    { text: "What was the RENAISSANCE?", choices: mc("A period of cultural and intellectual rebirth in Europe (14th-17th centuries)","A type of medieval government","A type of ancient civilization","A type of religious movement"), answer: "A", unit: 8, skill: "G6SS-U8-S2", diff: "medium", explanation: "The Renaissance was a period of cultural, artistic, and intellectual revival in Europe from the 14th to 17th centuries." },
    { text: "What is CITIZENSHIP?", choices: mc("The status of being a member of a country with rights and responsibilities","A type of government","A type of economic system","A type of cultural practice"), answer: "A", unit: 5, skill: "G6SS-U5-S2", diff: "easy", explanation: "Citizenship is the status of being a legal member of a country, with associated rights, privileges, and responsibilities." },
    { text: "What is an EMPIRE?", choices: mc("A large territory under the control of a single ruler or government","A small city-state","A type of democracy","A type of trade network"), answer: "A", unit: 4, skill: "G6SS-U4-S3", diff: "easy", explanation: "An empire is a large political unit or territory under the control of a single supreme authority." },
    { text: "What is MIGRATION?", choices: mc("The movement of people from one place to another","The movement of goods","The movement of ideas","The movement of armies"), answer: "A", unit: 2, skill: "G6SS-U2-S3", diff: "easy", explanation: "Migration is the movement of people from one place to another, often in search of better living conditions." },
    { text: "What is a NATURAL RESOURCE?", choices: mc("Materials found in nature that people use to meet their needs","A type of manufactured good","A type of government policy","A type of trade agreement"), answer: "A", unit: 6, skill: "G6SS-U6-S3", diff: "easy", explanation: "Natural resources are materials found in nature — water, minerals, forests, soil — that humans use to meet their needs." },
    { text: "What is ANCIENT CHINA known for?", choices: mc("The Great Wall, Silk Road, Confucianism, and inventions like paper and gunpowder","Pyramids and pharaohs","Democracy and philosophy","The Roman Empire"), answer: "A", unit: 3, skill: "G6SS-U3-S3", diff: "medium", explanation: "Ancient China is known for the Great Wall, the Silk Road, Confucianism, and inventions including paper, printing, gunpowder, and the compass." },
    { text: "What is GOVERNMENT?", choices: mc("The system by which a community or nation is ruled and organized","A type of economic system","A type of cultural practice","A type of geographic feature"), answer: "A", unit: 5, skill: "G6SS-U5-S1", diff: "easy", explanation: "Government is the system of rules, institutions, and people that organize and manage a community or nation." },
    { text: "What is ABSOLUTE LOCATION?", choices: mc("The exact position of a place using coordinates (latitude and longitude)","A general description of where a place is","A type of map projection","A type of geographic feature"), answer: "A", unit: 1, skill: "G6SS-U1-S2", diff: "medium", explanation: "Absolute location is the precise position of a place on Earth's surface, expressed using latitude and longitude coordinates." },
    { text: "What is RELATIVE LOCATION?", choices: mc("Describing a place's position in relation to other places","The exact coordinates of a place","A type of map projection","A type of geographic feature"), answer: "A", unit: 1, skill: "G6SS-U1-S2", diff: "easy", explanation: "Relative location describes where a place is in relation to other places (e.g., 'north of Houston')." },
    { text: "What is ANCIENT INDIA known for?", choices: mc("The Indus Valley Civilization, Hinduism, Buddhism, and the caste system","Pyramids and pharaohs","Democracy and philosophy","The Roman Empire"), answer: "A", unit: 3, skill: "G6SS-U3-S3", diff: "medium", explanation: "Ancient India is known for the Indus Valley Civilization, the development of Hinduism and Buddhism, the caste system, and contributions to mathematics and science." },
  ];
}

function getGr6TechDiag() {
  return [
    { text: "What is DIGITAL CITIZENSHIP?", choices: mc("Responsible and ethical use of technology","Using technology for school only","Owning a digital device","Having a social media account"), answer: "A", unit: 1, skill: "G6TECH-U1-S1", diff: "easy", explanation: "Digital citizenship means using technology responsibly, ethically, and safely." },
    { text: "What is a COMPUTER PROGRAM?", choices: mc("A set of instructions that tells a computer what to do","A type of hardware","A type of network","A type of database"), answer: "A", unit: 2, skill: "G6TECH-U2-S1", diff: "easy", explanation: "A computer program is a set of instructions written in a programming language that tells a computer how to perform a task." },
    { text: "What is an ALGORITHM?", choices: mc("A step-by-step set of instructions for solving a problem","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 2, skill: "G6TECH-U2-S1", diff: "easy", explanation: "An algorithm is a precise, step-by-step set of instructions for solving a problem or completing a task." },
    { text: "What is a VARIABLE in programming?", choices: mc("A named storage location that holds a value","A type of loop","A type of function","A type of data structure"), answer: "A", unit: 2, skill: "G6TECH-U2-S2", diff: "easy", explanation: "A variable is a named container in a program that stores a value which can change during execution." },
    { text: "What is a LOOP in programming?", choices: mc("A structure that repeats a block of code multiple times","A type of variable","A type of function","A type of data structure"), answer: "A", unit: 2, skill: "G6TECH-U2-S2", diff: "easy", explanation: "A loop is a programming construct that repeats a block of code a specified number of times or until a condition is met." },
    { text: "What is COMPUTATIONAL THINKING?", choices: mc("A problem-solving approach that includes decomposition, pattern recognition, abstraction, and algorithms","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 2, skill: "G6TECH-U2-S1", diff: "medium", explanation: "Computational thinking is a problem-solving approach involving decomposition, pattern recognition, abstraction, and algorithm design." },
    { text: "What is a SPREADSHEET?", choices: mc("A digital tool for organizing and calculating data in rows and columns","A type of presentation software","A type of word processor","A type of database"), answer: "A", unit: 3, skill: "G6TECH-U3-S1", diff: "easy", explanation: "A spreadsheet is a digital tool that organizes data in rows and columns and allows for calculations and data analysis." },
    { text: "What is CYBERSECURITY?", choices: mc("The practice of protecting systems and data from digital attacks","A type of programming language","A type of hardware","A type of software"), answer: "A", unit: 5, skill: "G6TECH-U5-S1", diff: "easy", explanation: "Cybersecurity involves protecting computer systems, networks, and data from unauthorized access or attacks." },
    { text: "What is a STRONG PASSWORD?", choices: mc("A password with a mix of letters, numbers, and symbols that is hard to guess","A simple word","Your name","Your birthdate"), answer: "A", unit: 5, skill: "G6TECH-U5-S1", diff: "easy", explanation: "A strong password is long, complex, and unique — combining uppercase, lowercase, numbers, and special characters." },
    { text: "What is DIGITAL MEDIA?", choices: mc("Content created and distributed in digital formats","Only printed content","Only video content","Only audio content"), answer: "A", unit: 4, skill: "G6TECH-U4-S1", diff: "easy", explanation: "Digital media refers to content — text, images, audio, video — that is created, stored, and distributed in digital formats." },
    { text: "What is a CONDITIONAL STATEMENT in programming?", choices: mc("A statement that executes code only if a certain condition is true","A type of loop","A type of variable","A type of function"), answer: "A", unit: 2, skill: "G6TECH-U2-S3", diff: "medium", explanation: "A conditional statement (if/else) executes different code blocks based on whether a condition is true or false." },
    { text: "What is DECOMPOSITION in computational thinking?", choices: mc("Breaking a complex problem into smaller, manageable parts","Solving a problem all at once","A type of programming language","A type of hardware"), answer: "A", unit: 2, skill: "G6TECH-U2-S1", diff: "medium", explanation: "Decomposition is the process of breaking a complex problem into smaller, more manageable sub-problems." },
    { text: "What is INTERNET SAFETY?", choices: mc("Practices that protect users from online threats and inappropriate content","A type of programming","A type of hardware","A type of network"), answer: "A", unit: 1, skill: "G6TECH-U1-S2", diff: "easy", explanation: "Internet safety involves practices and behaviors that protect users from online dangers, including cyberbullying, phishing, and privacy violations." },
    { text: "What is a PRESENTATION?", choices: mc("A visual display of information using slides to communicate ideas","A type of spreadsheet","A type of word processor","A type of database"), answer: "A", unit: 4, skill: "G6TECH-U4-S1", diff: "easy", explanation: "A presentation is a visual communication tool using slides to organize and display information to an audience." },
    { text: "What is PLAGIARISM?", choices: mc("Using someone else's work or ideas without giving credit","Citing your sources","Paraphrasing with attribution","Writing original content"), answer: "A", unit: 1, skill: "G6TECH-U1-S3", diff: "easy", explanation: "Plagiarism is the act of using someone else's work, ideas, or words without proper attribution." },
    { text: "What is a DATABASE?", choices: mc("An organized collection of structured data","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 3, skill: "G6TECH-U3-S2", diff: "medium", explanation: "A database is an organized collection of structured data stored electronically, designed for efficient retrieval and management." },
    { text: "What is DEBUGGING?", choices: mc("Finding and fixing errors in code","Writing new code","Running a program","A type of data structure"), answer: "A", unit: 2, skill: "G6TECH-U2-S3", diff: "easy", explanation: "Debugging is the process of identifying and removing errors (bugs) from a computer program." },
    { text: "What is a NETWORK?", choices: mc("A system of connected computers that share resources","A type of software","A type of programming language","A type of data structure"), answer: "A", unit: 5, skill: "G6TECH-U5-S2", diff: "easy", explanation: "A network is a group of interconnected computers and devices that can share data and resources." },
    { text: "What is ABSTRACTION in computational thinking?", choices: mc("Focusing on essential information while ignoring irrelevant details","Breaking a problem into parts","Finding patterns","Writing an algorithm"), answer: "A", unit: 2, skill: "G6TECH-U2-S1", diff: "medium", explanation: "Abstraction is the process of focusing on the essential features of a problem while hiding unnecessary complexity." },
    { text: "What is PATTERN RECOGNITION in computational thinking?", choices: mc("Identifying similarities and patterns in problems to find solutions","Breaking a problem into parts","Writing an algorithm","Focusing on essential information"), answer: "A", unit: 2, skill: "G6TECH-U2-S1", diff: "medium", explanation: "Pattern recognition involves identifying similarities, trends, and patterns in problems to develop efficient solutions." },
    { text: "What is a WORD PROCESSOR?", choices: mc("Software used to create, edit, and format text documents","A type of spreadsheet","A type of presentation software","A type of database"), answer: "A", unit: 4, skill: "G6TECH-U4-S2", diff: "easy", explanation: "A word processor is software (like Microsoft Word or Google Docs) used to create, edit, and format text documents." },
    { text: "What is CLOUD COMPUTING?", choices: mc("Storing and accessing data and programs over the internet instead of locally","A type of hardware","A type of programming language","A type of network"), answer: "A", unit: 5, skill: "G6TECH-U5-S3", diff: "medium", explanation: "Cloud computing refers to delivering computing services — storage, software, processing — over the internet." },
    { text: "What is a SEARCH ENGINE?", choices: mc("A tool that searches the internet for information based on keywords","A type of social media","A type of email service","A type of database"), answer: "A", unit: 1, skill: "G6TECH-U1-S1", diff: "easy", explanation: "A search engine (like Google) is a tool that indexes and searches the internet to find relevant information based on user queries." },
    { text: "What is INFORMATION LITERACY?", choices: mc("The ability to find, evaluate, and use information effectively","A type of programming skill","A type of hardware skill","A type of network skill"), answer: "A", unit: 6, skill: "G6TECH-U6-S1", diff: "medium", explanation: "Information literacy is the ability to recognize when information is needed and to locate, evaluate, and use it effectively." },
    { text: "What is a PIXEL?", choices: mc("The smallest unit of a digital image","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 4, skill: "G6TECH-U4-S3", diff: "easy", explanation: "A pixel (picture element) is the smallest unit of a digital image, representing a single point of color." },
    { text: "What is RESOLUTION in digital images?", choices: mc("The number of pixels in an image, determining its clarity and detail","The size of an image file","The color depth of an image","The format of an image"), answer: "A", unit: 4, skill: "G6TECH-U4-S3", diff: "medium", explanation: "Resolution refers to the number of pixels in a digital image — higher resolution means more detail and clarity." },
    { text: "What is BINARY CODE?", choices: mc("A number system using only 0s and 1s that computers use to process data","A type of programming language","A type of encryption","A type of network protocol"), answer: "A", unit: 2, skill: "G6TECH-U2-S2", diff: "medium", explanation: "Binary code is a number system using only 0s and 1s (bits) that represents all data processed by computers." },
    { text: "What is SOCIAL MEDIA?", choices: mc("Online platforms that allow users to create and share content and connect with others","A type of email service","A type of search engine","A type of database"), answer: "A", unit: 1, skill: "G6TECH-U1-S2", diff: "easy", explanation: "Social media are online platforms (like Instagram, TikTok, Twitter) that enable users to create, share, and interact with content." },
    { text: "What is an INPUT DEVICE?", choices: mc("Hardware that sends data into a computer (keyboard, mouse, microphone)","Hardware that displays output","Hardware that stores data","Hardware that processes data"), answer: "A", unit: 3, skill: "G6TECH-U3-S3", diff: "easy", explanation: "An input device is hardware that allows users to enter data into a computer, such as a keyboard, mouse, or microphone." },
    { text: "What is an OUTPUT DEVICE?", choices: mc("Hardware that displays or presents processed data (monitor, printer, speakers)","Hardware that enters data","Hardware that stores data","Hardware that processes data"), answer: "A", unit: 3, skill: "G6TECH-U3-S3", diff: "easy", explanation: "An output device is hardware that presents processed data to the user, such as a monitor, printer, or speakers." },
  ];
}

function getGr7MathDiag() {
  return [
    { text: "What is a RATIONAL NUMBER?", choices: mc("Any number that can be written as a fraction p/q where q≠0","Any positive number","Any whole number","Any decimal number"), answer: "A", unit: 1, skill: "G7MATH-U1-S1", diff: "easy", explanation: "A rational number is any number that can be expressed as a fraction p/q where p and q are integers and q≠0." },
    { text: "What is -3 + (-5)?", choices: mc("-8","8","-2","2"), answer: "A", unit: 1, skill: "G7MATH-U1-S1", diff: "easy", explanation: "When adding two negative numbers, add their absolute values and keep the negative sign: -3 + (-5) = -8." },
    { text: "What is -4 × (-3)?", choices: mc("12","-12","7","-7"), answer: "A", unit: 1, skill: "G7MATH-U1-S2", diff: "easy", explanation: "The product of two negative numbers is positive: -4 × -3 = 12." },
    { text: "Solve: 2x + 3 = 11", choices: mc("4","7","4.5","8"), answer: "A", unit: 3, skill: "G7MATH-U3-S1", diff: "easy", explanation: "2x = 8; x = 4." },
    { text: "What is 30% of 90?", choices: mc("27","30","18","24"), answer: "A", unit: 2, skill: "G7MATH-U2-S1", diff: "easy", explanation: "30% of 90 = 0.30 × 90 = 27." },
    { text: "What is the area of a circle with radius 5? (Use π≈3.14)", choices: mc("78.5","31.4","25","15.7"), answer: "A", unit: 5, skill: "G7MATH-U5-S1", diff: "medium", explanation: "Area = πr² = 3.14 × 25 = 78.5." },
    { text: "What is the circumference of a circle with diameter 10? (Use π≈3.14)", choices: mc("31.4","62.8","15.7","78.5"), answer: "A", unit: 5, skill: "G7MATH-U5-S1", diff: "medium", explanation: "Circumference = πd = 3.14 × 10 = 31.4." },
    { text: "Solve: -2x + 6 = 14", choices: mc("-4","4","10","-10"), answer: "A", unit: 3, skill: "G7MATH-U3-S1", diff: "medium", explanation: "-2x = 8; x = -4." },
    { text: "What is the scale factor if a 4cm model represents 20m?", choices: mc("1:500","1:5","1:50","1:200"), answer: "A", unit: 2, skill: "G7MATH-U2-S2", diff: "medium", explanation: "4cm : 20m = 4cm : 2000cm = 1:500." },
    { text: "What is the probability of flipping heads twice in a row?", choices: mc("1/4","1/2","1/8","3/4"), answer: "A", unit: 6, skill: "G7MATH-U6-S1", diff: "medium", explanation: "P(heads) = 1/2. P(heads twice) = 1/2 × 1/2 = 1/4." },
    { text: "What is the surface area of a rectangular prism: l=5, w=3, h=4?", choices: mc("94","60","47","120"), answer: "A", unit: 5, skill: "G7MATH-U5-S2", diff: "medium", explanation: "SA = 2(lw + lh + wh) = 2(15 + 20 + 12) = 2(47) = 94." },
    { text: "Simplify: 3(2x - 4) + 5x", choices: mc("11x - 12","6x - 12","11x - 4","6x - 4"), answer: "A", unit: 3, skill: "G7MATH-U3-S2", diff: "medium", explanation: "6x - 12 + 5x = 11x - 12." },
    { text: "What is the volume of a cylinder: r=3, h=7? (Use π≈3.14)", choices: mc("197.82","65.94","131.88","94.2"), answer: "A", unit: 5, skill: "G7MATH-U5-S2", diff: "medium", explanation: "V = πr²h = 3.14 × 9 × 7 = 197.82." },
    { text: "What is the mean absolute deviation (MAD) of: 2, 4, 6, 8?", choices: mc("2","4","1","3"), answer: "A", unit: 6, skill: "G7MATH-U6-S2", diff: "medium", explanation: "Mean = 5. Deviations: |2-5|=3, |4-5|=1, |6-5|=1, |8-5|=3. MAD = (3+1+1+3)/4 = 2." },
    { text: "A shirt costs $25. With 8% sales tax, what is the total?", choices: mc("$27","$27.50","$26","$28"), answer: "A", unit: 2, skill: "G7MATH-U2-S1", diff: "medium", explanation: "Tax = 8% of $25 = $2. Total = $25 + $2 = $27." },
    { text: "Solve: x/3 - 2 = 4", choices: mc("18","6","2","12"), answer: "A", unit: 3, skill: "G7MATH-U3-S1", diff: "medium", explanation: "x/3 = 6; x = 18." },
    { text: "What is the interquartile range (IQR) of: 1, 3, 5, 7, 9, 11?", choices: mc("6","4","8","5"), answer: "A", unit: 6, skill: "G7MATH-U6-S2", diff: "medium", explanation: "Q1 = 3, Q3 = 9. IQR = Q3 - Q1 = 6." },
    { text: "What is the angle sum of a triangle?", choices: mc("180°","360°","90°","270°"), answer: "A", unit: 4, skill: "G7MATH-U4-S1", diff: "easy", explanation: "The sum of interior angles of any triangle is always 180°." },
    { text: "Two supplementary angles sum to?", choices: mc("180°","90°","360°","270°"), answer: "A", unit: 4, skill: "G7MATH-U4-S1", diff: "easy", explanation: "Supplementary angles sum to 180°." },
    { text: "What is -15 ÷ 3?", choices: mc("-5","5","-45","45"), answer: "A", unit: 1, skill: "G7MATH-U1-S2", diff: "easy", explanation: "A negative divided by a positive is negative: -15 ÷ 3 = -5." },
    { text: "What is the percent change from 50 to 75?", choices: mc("50%","25%","33%","150%"), answer: "A", unit: 2, skill: "G7MATH-U2-S3", diff: "medium", explanation: "Percent change = (75-50)/50 × 100 = 25/50 × 100 = 50%." },
    { text: "What is the volume of a triangular prism: base area=12, height=5?", choices: mc("60","30","120","24"), answer: "A", unit: 5, skill: "G7MATH-U5-S3", diff: "medium", explanation: "Volume = base area × height = 12 × 5 = 60." },
    { text: "Solve the inequality: 3x > 12", choices: mc("x > 4","x < 4","x > 3","x < 3"), answer: "A", unit: 3, skill: "G7MATH-U3-S3", diff: "medium", explanation: "Divide both sides by 3: x > 4." },
    { text: "What is the probability of NOT rolling a 6 on a standard die?", choices: mc("5/6","1/6","4/6","1/3"), answer: "A", unit: 6, skill: "G7MATH-U6-S1", diff: "easy", explanation: "P(not 6) = 1 - P(6) = 1 - 1/6 = 5/6." },
    { text: "What is 2/3 × 3/4?", choices: mc("1/2","6/12","5/12","1/3"), answer: "A", unit: 1, skill: "G7MATH-U1-S3", diff: "easy", explanation: "2/3 × 3/4 = 6/12 = 1/2." },
    { text: "What is the slope of a line passing through (0,0) and (4,8)?", choices: mc("2","4","1/2","8"), answer: "A", unit: 7, skill: "G7MATH-U7-S1", diff: "medium", explanation: "Slope = rise/run = 8/4 = 2." },
    { text: "What is the y-intercept of y = 3x + 5?", choices: mc("5","3","0","8"), answer: "A", unit: 7, skill: "G7MATH-U7-S1", diff: "easy", explanation: "In y = mx + b, b is the y-intercept. Here b = 5." },
    { text: "What is 4² × 2³?", choices: mc("128","48","64","32"), answer: "A", unit: 1, skill: "G7MATH-U1-S3", diff: "medium", explanation: "4² = 16; 2³ = 8; 16 × 8 = 128." },
    { text: "What is the area of a trapezoid: b1=6, b2=10, h=4?", choices: mc("32","40","24","16"), answer: "A", unit: 5, skill: "G7MATH-U5-S1", diff: "medium", explanation: "Area = (b1+b2)/2 × h = (6+10)/2 × 4 = 8 × 4 = 32." },
    { text: "Solve: |x - 3| = 7", choices: mc("x = 10 or x = -4","x = 10","x = -4","x = 4 or x = -10"), answer: "A", unit: 3, skill: "G7MATH-U3-S3", diff: "medium", explanation: "|x-3| = 7 means x-3 = 7 (x=10) or x-3 = -7 (x=-4)." },
  ];
}

function getGr7ELADiag() {
  return [
    { text: "What is AUTHOR'S PURPOSE?", choices: mc("The reason an author writes a text (to inform, persuade, or entertain)","The theme of the text","The plot of the text","The setting of the text"), answer: "A", unit: 1, skill: "G7ELA-U1-S1", diff: "easy", explanation: "Author's purpose is the reason an author writes a text — to inform (expository), persuade (argumentative), or entertain (narrative)." },
    { text: "What is a CENTRAL IDEA?", choices: mc("The most important point in an informational text","The theme of a story","The plot of a story","The setting of a story"), answer: "A", unit: 1, skill: "G7ELA-U1-S1", diff: "easy", explanation: "The central idea is the main point or key message of an informational text." },
    { text: "What is RHETORICAL APPEAL ETHOS?", choices: mc("An appeal to credibility or authority","An appeal to emotion","An appeal to logic","An appeal to time"), answer: "A", unit: 4, skill: "G7ELA-U4-S1", diff: "medium", explanation: "Ethos is a rhetorical appeal that establishes the speaker's credibility, character, or authority." },
    { text: "What is RHETORICAL APPEAL PATHOS?", choices: mc("An appeal to emotion","An appeal to credibility","An appeal to logic","An appeal to time"), answer: "A", unit: 4, skill: "G7ELA-U4-S1", diff: "medium", explanation: "Pathos is a rhetorical appeal that evokes emotion in the audience to persuade them." },
    { text: "What is RHETORICAL APPEAL LOGOS?", choices: mc("An appeal to logic and reason","An appeal to emotion","An appeal to credibility","An appeal to time"), answer: "A", unit: 4, skill: "G7ELA-U4-S1", diff: "medium", explanation: "Logos is a rhetorical appeal that uses logical reasoning, evidence, and facts to persuade." },
    { text: "What is a COMPLEX SENTENCE?", choices: mc("A sentence with one independent clause and at least one dependent clause","A sentence with two independent clauses","A sentence with only one clause","A sentence with multiple independent clauses"), answer: "A", unit: 5, skill: "G7ELA-U5-S1", diff: "medium", explanation: "A complex sentence contains one independent clause and one or more dependent (subordinate) clauses." },
    { text: "What is IRONY?", choices: mc("A contrast between what is expected and what actually happens","A type of simile","A type of metaphor","A type of alliteration"), answer: "A", unit: 3, skill: "G7ELA-U3-S1", diff: "medium", explanation: "Irony is a literary device where there is a contrast between expectation and reality, or between what is said and what is meant." },
    { text: "What is ALLUSION?", choices: mc("A reference to a well-known person, place, event, or work","A type of simile","A type of metaphor","A type of hyperbole"), answer: "A", unit: 3, skill: "G7ELA-U3-S2", diff: "medium", explanation: "An allusion is an indirect reference to a well-known person, place, event, or literary work." },
    { text: "What is SYNTAX?", choices: mc("The arrangement of words and phrases to create well-formed sentences","The meaning of words","The sound of words","The origin of words"), answer: "A", unit: 5, skill: "G7ELA-U5-S2", diff: "medium", explanation: "Syntax refers to the rules governing the arrangement of words and phrases to create grammatically correct sentences." },
    { text: "What is DICTION?", choices: mc("The choice of words and style of expression used by an author","The structure of sentences","The theme of a text","The plot of a text"), answer: "A", unit: 5, skill: "G7ELA-U5-S1", diff: "medium", explanation: "Diction refers to the author's choice of words and the style in which they are used to convey meaning and tone." },
    { text: "What is a COMPOUND SENTENCE?", choices: mc("A sentence with two or more independent clauses joined by a conjunction","A sentence with one independent and one dependent clause","A sentence with only one clause","A sentence with multiple dependent clauses"), answer: "A", unit: 5, skill: "G7ELA-U5-S1", diff: "easy", explanation: "A compound sentence contains two or more independent clauses joined by a coordinating conjunction (FANBOYS) or semicolon." },
    { text: "What is NARRATIVE PERSPECTIVE?", choices: mc("The point of view from which a story is told","The theme of a story","The plot of a story","The setting of a story"), answer: "A", unit: 2, skill: "G7ELA-U2-S1", diff: "easy", explanation: "Narrative perspective is the point of view from which a story is told — first person, second person, or third person." },
    { text: "What is THIRD PERSON OMNISCIENT?", choices: mc("A narrator who knows the thoughts and feelings of all characters","A narrator who only knows one character's thoughts","A narrator who is a character in the story","A narrator with limited knowledge"), answer: "A", unit: 2, skill: "G7ELA-U2-S1", diff: "medium", explanation: "Third person omniscient is a narrative perspective where the narrator has access to the thoughts and feelings of all characters." },
    { text: "What is a CLAIM in argumentative writing?", choices: mc("The main argument or position the writer is defending","Supporting evidence","A counterargument","A conclusion"), answer: "A", unit: 4, skill: "G7ELA-U4-S2", diff: "easy", explanation: "A claim is the main argument or position that a writer asserts and defends with evidence in an argumentative text." },
    { text: "What is EVIDENCE in argumentative writing?", choices: mc("Facts, data, examples, or quotes that support a claim","The main argument","A counterargument","A conclusion"), answer: "A", unit: 4, skill: "G7ELA-U4-S2", diff: "easy", explanation: "Evidence is the specific information — facts, statistics, examples, expert quotes — used to support a claim." },
    { text: "What is FLASHBACK in literature?", choices: mc("A scene that interrupts the present narrative to show earlier events","A hint about future events","A type of conflict","A type of setting"), answer: "A", unit: 2, skill: "G7ELA-U2-S2", diff: "medium", explanation: "A flashback is a literary device that interrupts the chronological flow of a narrative to show events from the past." },
    { text: "What is SATIRE?", choices: mc("The use of humor, irony, or exaggeration to criticize or mock","A type of metaphor","A type of simile","A type of alliteration"), answer: "A", unit: 3, skill: "G7ELA-U3-S3", diff: "medium", explanation: "Satire is a literary technique that uses humor, irony, or exaggeration to expose and criticize human folly or vice." },
    { text: "What is DENOTATION?", choices: mc("The literal, dictionary definition of a word","The emotional associations of a word","The origin of a word","The spelling of a word"), answer: "A", unit: 6, skill: "G7ELA-U6-S1", diff: "easy", explanation: "Denotation is the literal, explicit meaning of a word as found in a dictionary." },
    { text: "What is a SUBORDINATING CONJUNCTION?", choices: mc("A word that connects a dependent clause to an independent clause (because, although, when)","A word that connects two independent clauses","A type of pronoun","A type of adjective"), answer: "A", unit: 5, skill: "G7ELA-U5-S2", diff: "medium", explanation: "A subordinating conjunction (because, although, when, since) introduces a dependent clause and connects it to an independent clause." },
    { text: "What is BIAS in a text?", choices: mc("A preference or prejudice that influences how information is presented","A type of evidence","A type of argument","A type of literary device"), answer: "A", unit: 7, skill: "G7ELA-U7-S1", diff: "medium", explanation: "Bias is a tendency to favor one perspective over others, which can affect how information is selected and presented." },
    { text: "What is a RESEARCH PAPER?", choices: mc("A formal written work that investigates a topic using multiple sources","A personal narrative","A creative story","A poem"), answer: "A", unit: 8, skill: "G7ELA-U8-S1", diff: "easy", explanation: "A research paper is a formal academic work that investigates a topic using evidence from multiple credible sources." },
    { text: "What is MLA CITATION?", choices: mc("A standardized format for citing sources in humanities writing","A type of research method","A type of literary analysis","A type of essay structure"), answer: "A", unit: 8, skill: "G7ELA-U8-S2", diff: "medium", explanation: "MLA (Modern Language Association) citation is a standardized format for documenting sources in humanities and literary research." },
    { text: "What is PARALLELISM in writing?", choices: mc("Using the same grammatical structure for similar ideas to create balance","A type of metaphor","A type of simile","A type of alliteration"), answer: "A", unit: 5, skill: "G7ELA-U5-S3", diff: "medium", explanation: "Parallelism is the use of the same grammatical structure for similar ideas, creating balance and rhythm in writing." },
    { text: "What is an ANECDOTE?", choices: mc("A short, personal story used to illustrate a point","A type of evidence","A type of argument","A type of literary device"), answer: "A", unit: 4, skill: "G7ELA-U4-S3", diff: "medium", explanation: "An anecdote is a brief, personal story or account used to illustrate a point or make a concept more relatable." },
    { text: "What is VOICE in writing?", choices: mc("The distinctive style and personality of a writer expressed through their writing","The theme of a text","The plot of a text","The setting of a text"), answer: "A", unit: 5, skill: "G7ELA-U5-S1", diff: "medium", explanation: "Voice is the distinctive personality, style, and tone that a writer brings to their work." },
    { text: "What is ONOMATOPOEIA?", choices: mc("Words that imitate the sounds they describe (buzz, crash, sizzle)","A comparison using 'like' or 'as'","A direct comparison","An exaggeration"), answer: "A", unit: 3, skill: "G7ELA-U3-S1", diff: "easy", explanation: "Onomatopoeia is the use of words that phonetically imitate the sounds they describe (e.g., buzz, hiss, crash)." },
    { text: "What is TRANSITION in writing?", choices: mc("Words or phrases that connect ideas and guide readers through a text","A type of evidence","A type of argument","A type of literary device"), answer: "A", unit: 5, skill: "G7ELA-U5-S3", diff: "easy", explanation: "Transitions are words or phrases (however, therefore, in addition) that connect ideas and help readers follow the flow of writing." },
    { text: "What is EXPOSITORY WRITING?", choices: mc("Writing that explains, informs, or describes a topic objectively","Writing that tells a story","Writing that persuades","Writing that expresses personal feelings"), answer: "A", unit: 1, skill: "G7ELA-U1-S2", diff: "easy", explanation: "Expository writing is a type of writing that aims to explain, inform, or describe a topic using facts and evidence." },
    { text: "What is a THEME STATEMENT?", choices: mc("A complete sentence expressing the universal message of a literary work","A one-word topic","A plot summary","A character description"), answer: "A", unit: 2, skill: "G7ELA-U2-S3", diff: "medium", explanation: "A theme statement is a complete sentence that expresses the universal message or insight about life conveyed by a literary work." },
    { text: "What is IMAGERY in literature?", choices: mc("Descriptive language that appeals to the senses to create vivid mental pictures","A type of metaphor","A type of simile","A type of alliteration"), answer: "A", unit: 3, skill: "G7ELA-U3-S2", diff: "easy", explanation: "Imagery is the use of descriptive language that appeals to the five senses to create vivid mental pictures in the reader's mind." },
  ];
}

function getGr7SciDiag() {
  return [
    { text: "What is a CELL?", choices: mc("The basic unit of life","A type of tissue","A type of organ","A type of organism"), answer: "A", unit: 1, skill: "G7SCI-U1-S1", diff: "easy", explanation: "The cell is the basic structural and functional unit of all living organisms." },
    { text: "What is MITOSIS?", choices: mc("Cell division that produces two identical daughter cells","Cell division that produces sex cells","The process of photosynthesis","The process of respiration"), answer: "A", unit: 1, skill: "G7SCI-U1-S2", diff: "medium", explanation: "Mitosis is a type of cell division that results in two daughter cells with the same number of chromosomes as the parent cell." },
    { text: "What is DNA?", choices: mc("The molecule that carries genetic information in living organisms","A type of protein","A type of carbohydrate","A type of lipid"), answer: "A", unit: 2, skill: "G7SCI-U2-S1", diff: "easy", explanation: "DNA (deoxyribonucleic acid) is the molecule that carries the genetic instructions for the development and functioning of all living organisms." },
    { text: "What is NATURAL SELECTION?", choices: mc("The process by which organisms with favorable traits survive and reproduce more successfully","The process of mutation","The process of genetic drift","The process of migration"), answer: "A", unit: 3, skill: "G7SCI-U3-S1", diff: "medium", explanation: "Natural selection is the mechanism of evolution where organisms with traits better suited to their environment survive and reproduce more successfully." },
    { text: "What is PHOTOSYNTHESIS?", choices: mc("The process by which plants use sunlight, water, and CO₂ to make glucose and oxygen","The process by which cells break down glucose for energy","The process of cell division","The process of protein synthesis"), answer: "A", unit: 4, skill: "G7SCI-U4-S1", diff: "easy", explanation: "Photosynthesis: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂." },
    { text: "What is CELLULAR RESPIRATION?", choices: mc("The process by which cells break down glucose to release energy (ATP)","The process of photosynthesis","The process of cell division","The process of protein synthesis"), answer: "A", unit: 4, skill: "G7SCI-U4-S2", diff: "medium", explanation: "Cellular respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP (energy)." },
    { text: "What is an ECOSYSTEM?", choices: mc("All living organisms and non-living factors in a specific area interacting together","Only the living organisms in an area","Only the non-living factors in an area","A type of biome"), answer: "A", unit: 5, skill: "G7SCI-U5-S1", diff: "easy", explanation: "An ecosystem is a community of living organisms (biotic) interacting with non-living factors (abiotic) in a specific area." },
    { text: "What is ADAPTATION?", choices: mc("A trait that helps an organism survive and reproduce in its environment","A type of mutation","A type of natural selection","A type of genetic drift"), answer: "A", unit: 3, skill: "G7SCI-U3-S2", diff: "easy", explanation: "An adaptation is a heritable trait that increases an organism's fitness — its ability to survive and reproduce in its environment." },
    { text: "What is the PERIODIC TABLE?", choices: mc("A chart organizing all known elements by atomic number and properties","A chart of all known compounds","A chart of all known molecules","A chart of all known reactions"), answer: "A", unit: 6, skill: "G7SCI-U6-S1", diff: "easy", explanation: "The periodic table organizes all known chemical elements by increasing atomic number and groups them by similar chemical properties." },
    { text: "What is an ATOM?", choices: mc("The smallest unit of an element that retains the chemical properties of that element","A type of molecule","A type of compound","A type of ion"), answer: "A", unit: 6, skill: "G7SCI-U6-S1", diff: "easy", explanation: "An atom is the smallest unit of a chemical element that retains the properties of that element." },
    { text: "What is a CHROMOSOME?", choices: mc("A structure in the cell nucleus made of DNA and protein that carries genes","A type of cell organelle","A type of protein","A type of lipid"), answer: "A", unit: 2, skill: "G7SCI-U2-S1", diff: "medium", explanation: "A chromosome is a thread-like structure in the cell nucleus composed of DNA and proteins, carrying genetic information." },
    { text: "What is HEREDITY?", choices: mc("The passing of traits from parents to offspring through genes","The process of mutation","The process of natural selection","The process of adaptation"), answer: "A", unit: 2, skill: "G7SCI-U2-S2", diff: "easy", explanation: "Heredity is the transmission of genetic information from parents to their offspring through genes." },
    { text: "What is a FOOD CHAIN?", choices: mc("A linear sequence showing how energy flows from producers to consumers","A complex network of feeding relationships","A list of all organisms in an ecosystem","A type of habitat"), answer: "A", unit: 5, skill: "G7SCI-U5-S2", diff: "easy", explanation: "A food chain is a linear sequence showing the flow of energy from producers through primary, secondary, and tertiary consumers." },
    { text: "What is MUTATION?", choices: mc("A change in the DNA sequence of an organism","A type of natural selection","A type of adaptation","A type of heredity"), answer: "A", unit: 2, skill: "G7SCI-U2-S3", diff: "medium", explanation: "A mutation is a change in the nucleotide sequence of DNA, which can affect the proteins produced and potentially alter traits." },
    { text: "What is a PROTON?", choices: mc("A positively charged particle in the nucleus of an atom","A negatively charged particle","A neutral particle","A type of electron"), answer: "A", unit: 6, skill: "G7SCI-U6-S2", diff: "easy", explanation: "A proton is a positively charged subatomic particle found in the nucleus of an atom." },
    { text: "What is OSMOSIS?", choices: mc("The movement of water across a semi-permeable membrane from high to low concentration","The movement of solutes across a membrane","Active transport of molecules","The process of diffusion of gases"), answer: "A", unit: 1, skill: "G7SCI-U1-S3", diff: "medium", explanation: "Osmosis is the diffusion of water molecules across a semi-permeable membrane from an area of higher water concentration to lower." },
    { text: "What is DIFFUSION?", choices: mc("The movement of particles from an area of high concentration to low concentration","The movement of water across a membrane","Active transport of molecules","The process of osmosis"), answer: "A", unit: 1, skill: "G7SCI-U1-S3", diff: "medium", explanation: "Diffusion is the movement of particles from an area of high concentration to an area of low concentration." },
    { text: "What is a BIOME?", choices: mc("A large geographic area with a specific climate, plants, and animals","A type of ecosystem","A type of habitat","A type of community"), answer: "A", unit: 5, skill: "G7SCI-U5-S3", diff: "easy", explanation: "A biome is a large geographic region characterized by a specific climate and the plants and animals adapted to it." },
    { text: "What is EVOLUTION?", choices: mc("The change in heritable traits of populations over successive generations","A type of mutation","A type of adaptation","A type of heredity"), answer: "A", unit: 3, skill: "G7SCI-U3-S1", diff: "medium", explanation: "Evolution is the change in the heritable characteristics of biological populations over successive generations." },
    { text: "What is a COMPOUND?", choices: mc("A substance made of two or more different elements chemically combined","A mixture of elements","A single element","A type of atom"), answer: "A", unit: 6, skill: "G7SCI-U6-S3", diff: "easy", explanation: "A compound is a pure substance made of two or more different elements chemically bonded in fixed proportions." },
    { text: "What is HOMEOSTASIS?", choices: mc("The ability of an organism to maintain stable internal conditions","A type of mutation","A type of adaptation","A type of evolution"), answer: "A", unit: 4, skill: "G7SCI-U4-S3", diff: "medium", explanation: "Homeostasis is the ability of an organism to maintain a stable internal environment despite changes in external conditions." },
    { text: "What is a DOMINANT TRAIT?", choices: mc("A trait that is expressed when at least one dominant allele is present","A trait that is only expressed when two recessive alleles are present","A trait that is always expressed","A trait that is never expressed"), answer: "A", unit: 2, skill: "G7SCI-U2-S2", diff: "medium", explanation: "A dominant trait is expressed whenever at least one dominant allele (capital letter) is present in the genotype." },
    { text: "What is a RECESSIVE TRAIT?", choices: mc("A trait that is only expressed when two recessive alleles are present","A trait expressed when one dominant allele is present","A trait that is always expressed","A trait that is never expressed"), answer: "A", unit: 2, skill: "G7SCI-U2-S2", diff: "medium", explanation: "A recessive trait is only expressed when an organism has two recessive alleles (homozygous recessive) for that trait." },
    { text: "What is SYMBIOSIS?", choices: mc("A close, long-term interaction between two different species","A type of competition","A type of predation","A type of evolution"), answer: "A", unit: 5, skill: "G7SCI-U5-S2", diff: "medium", explanation: "Symbiosis is a close, long-term biological interaction between two different species, which can be mutualistic, commensalistic, or parasitic." },
    { text: "What is PHOTOSYNTHESIS' main product?", choices: mc("Glucose (sugar)","Oxygen","Water","Carbon dioxide"), answer: "A", unit: 4, skill: "G7SCI-U4-S1", diff: "easy", explanation: "The main product of photosynthesis is glucose (C₆H₁₂O₆), which the plant uses for energy and growth." },
    { text: "What is an ORGANELLE?", choices: mc("A specialized structure within a cell that performs a specific function","A type of cell","A type of tissue","A type of organ"), answer: "A", unit: 1, skill: "G7SCI-U1-S1", diff: "easy", explanation: "An organelle is a specialized structure within a cell that performs a specific function (e.g., mitochondria, nucleus, chloroplast)." },
    { text: "What is the MITOCHONDRIA?", choices: mc("The organelle that produces ATP energy through cellular respiration","The organelle that performs photosynthesis","The organelle that controls cell activities","The organelle that synthesizes proteins"), answer: "A", unit: 1, skill: "G7SCI-U1-S1", diff: "easy", explanation: "The mitochondria is the organelle responsible for cellular respiration, producing ATP (energy) for the cell." },
    { text: "What is CHLOROPHYLL?", choices: mc("The green pigment in plants that absorbs light for photosynthesis","A type of protein","A type of carbohydrate","A type of lipid"), answer: "A", unit: 4, skill: "G7SCI-U4-S1", diff: "easy", explanation: "Chlorophyll is the green pigment found in chloroplasts that absorbs light energy (primarily red and blue wavelengths) for photosynthesis." },
    { text: "What is a NUCLEUS (cell)?", choices: mc("The organelle that contains DNA and controls cell activities","The organelle that produces energy","The organelle that performs photosynthesis","The organelle that synthesizes proteins"), answer: "A", unit: 1, skill: "G7SCI-U1-S1", diff: "easy", explanation: "The nucleus is the membrane-bound organelle that contains the cell's DNA and directs cell activities." },
    { text: "What is EXTINCTION?", choices: mc("The permanent disappearance of a species from Earth","A type of adaptation","A type of evolution","A type of mutation"), answer: "A", unit: 3, skill: "G7SCI-U3-S3", diff: "easy", explanation: "Extinction is the permanent disappearance of a species — when the last individual of that species dies." },
  ];
}

function getGr7SSDiag() {
  return [
    { text: "What was the AMERICAN REVOLUTION?", choices: mc("The war in which the thirteen colonies gained independence from Britain (1775-1783)","The Civil War","The War of 1812","The French Revolution"), answer: "A", unit: 1, skill: "G7SS-U1-S1", diff: "easy", explanation: "The American Revolution (1775-1783) was the war in which the thirteen American colonies fought for and gained independence from Great Britain." },
    { text: "What is the DECLARATION OF INDEPENDENCE?", choices: mc("The 1776 document declaring the colonies' independence from Britain","The U.S. Constitution","The Bill of Rights","The Emancipation Proclamation"), answer: "A", unit: 1, skill: "G7SS-U1-S1", diff: "easy", explanation: "The Declaration of Independence (1776) is the document in which the thirteen colonies declared their independence from Great Britain." },
    { text: "What is the U.S. CONSTITUTION?", choices: mc("The supreme law of the United States establishing the framework of government","The Declaration of Independence","The Bill of Rights","The Articles of Confederation"), answer: "A", unit: 2, skill: "G7SS-U2-S1", diff: "easy", explanation: "The U.S. Constitution is the supreme law of the United States, establishing the structure and powers of the federal government." },
    { text: "What is the BILL OF RIGHTS?", choices: mc("The first ten amendments to the U.S. Constitution protecting individual freedoms","The U.S. Constitution","The Declaration of Independence","The Federalist Papers"), answer: "A", unit: 2, skill: "G7SS-U2-S2", diff: "easy", explanation: "The Bill of Rights consists of the first ten amendments to the U.S. Constitution, protecting fundamental individual rights and liberties." },
    { text: "What is SEPARATION OF POWERS?", choices: mc("The division of government into legislative, executive, and judicial branches","A type of democracy","A type of federalism","A type of amendment"), answer: "A", unit: 2, skill: "G7SS-U2-S1", diff: "easy", explanation: "Separation of powers divides government authority among three branches: legislative (makes laws), executive (enforces laws), and judicial (interprets laws)." },
    { text: "What is CHECKS AND BALANCES?", choices: mc("The system where each branch of government can limit the powers of the other branches","A type of democracy","A type of federalism","A type of amendment"), answer: "A", unit: 2, skill: "G7SS-U2-S1", diff: "medium", explanation: "Checks and balances is the system where each branch of government has powers to limit and oversee the other branches." },
    { text: "What was MANIFEST DESTINY?", choices: mc("The 19th-century belief that the U.S. was destined to expand across North America","The American Revolution","The Civil War","The Louisiana Purchase"), answer: "A", unit: 3, skill: "G7SS-U3-S1", diff: "medium", explanation: "Manifest Destiny was the 19th-century belief that the United States was destined to expand across the entire North American continent." },
    { text: "What was the LOUISIANA PURCHASE (1803)?", choices: mc("The U.S. purchase of land from France that doubled the country's size","The purchase of Alaska","The purchase of Florida","The annexation of Texas"), answer: "A", unit: 3, skill: "G7SS-U3-S1", diff: "medium", explanation: "The Louisiana Purchase (1803) was the acquisition of approximately 828,000 square miles of territory from France, doubling the size of the United States." },
    { text: "What was the CIVIL WAR?", choices: mc("The war between the Union (North) and Confederacy (South) over slavery and states' rights (1861-1865)","The American Revolution","The War of 1812","The Mexican-American War"), answer: "A", unit: 4, skill: "G7SS-U4-S1", diff: "easy", explanation: "The Civil War (1861-1865) was fought between the Union (Northern states) and the Confederacy (Southern states) primarily over slavery and states' rights." },
    { text: "What was the EMANCIPATION PROCLAMATION?", choices: mc("Lincoln's 1863 executive order declaring enslaved people in Confederate states free","The 13th Amendment","The Bill of Rights","The Declaration of Independence"), answer: "A", unit: 4, skill: "G7SS-U4-S2", diff: "medium", explanation: "The Emancipation Proclamation (1863) was President Lincoln's executive order declaring enslaved people in Confederate states to be free." },
    { text: "What is FEDERALISM?", choices: mc("A system of government where power is shared between national and state governments","A type of democracy","A type of separation of powers","A type of checks and balances"), answer: "A", unit: 2, skill: "G7SS-U2-S3", diff: "medium", explanation: "Federalism is a system of government that divides power between a central (national) government and regional (state) governments." },
    { text: "What was RECONSTRUCTION?", choices: mc("The period after the Civil War when the South was rebuilt and formerly enslaved people gained rights","The period before the Civil War","The American Revolution","The Progressive Era"), answer: "A", unit: 4, skill: "G7SS-U4-S3", diff: "medium", explanation: "Reconstruction (1865-1877) was the period after the Civil War when the federal government worked to rebuild the South and integrate formerly enslaved people as citizens." },
    { text: "What is the INDUSTRIAL REVOLUTION?", choices: mc("The shift from agricultural to industrial production using machines and factories","The American Revolution","The Civil War","The Progressive Era"), answer: "A", unit: 5, skill: "G7SS-U5-S1", diff: "easy", explanation: "The Industrial Revolution was the transition from hand production to machine-based manufacturing, beginning in Britain and spreading to the U.S. in the 19th century." },
    { text: "What is IMMIGRATION?", choices: mc("The movement of people into a new country to live permanently","The movement of people within a country","The movement of goods between countries","The movement of ideas between cultures"), answer: "A", unit: 5, skill: "G7SS-U5-S2", diff: "easy", explanation: "Immigration is the process of people moving from their home country to settle permanently in another country." },
    { text: "What was the PROGRESSIVE ERA?", choices: mc("A period of social and political reform in the U.S. (1890s-1920s)","The Civil War era","The Reconstruction era","The Industrial Revolution"), answer: "A", unit: 6, skill: "G7SS-U6-S1", diff: "medium", explanation: "The Progressive Era (1890s-1920s) was a period of widespread social activism and political reform in the United States." },
    { text: "What is SUFFRAGE?", choices: mc("The right to vote","The right to free speech","The right to bear arms","The right to a fair trial"), answer: "A", unit: 6, skill: "G7SS-U6-S2", diff: "easy", explanation: "Suffrage is the right to vote in political elections." },
    { text: "What was the 19th AMENDMENT?", choices: mc("The amendment granting women the right to vote (1920)","The amendment abolishing slavery","The amendment granting citizenship to formerly enslaved people","The amendment granting voting rights to all citizens"), answer: "A", unit: 6, skill: "G7SS-U6-S2", diff: "medium", explanation: "The 19th Amendment (1920) granted women the right to vote in the United States." },
    { text: "What was the 13th AMENDMENT?", choices: mc("The amendment abolishing slavery in the United States (1865)","The amendment granting women the right to vote","The amendment granting citizenship to formerly enslaved people","The Bill of Rights"), answer: "A", unit: 4, skill: "G7SS-U4-S3", diff: "easy", explanation: "The 13th Amendment (1865) abolished slavery and involuntary servitude in the United States." },
    { text: "What is CAPITALISM?", choices: mc("An economic system based on private ownership and free market competition","A system where the government owns all production","A system of equal distribution of wealth","A type of government"), answer: "A", unit: 7, skill: "G7SS-U7-S1", diff: "medium", explanation: "Capitalism is an economic system based on private ownership of the means of production and free market competition." },
    { text: "What was the TRAIL OF TEARS?", choices: mc("The forced relocation of Native American tribes from the Southeast to Oklahoma (1830s)","A battle in the Civil War","A route used during Manifest Destiny","A type of trade route"), answer: "A", unit: 3, skill: "G7SS-U3-S2", diff: "medium", explanation: "The Trail of Tears (1830s) was the forced relocation of Cherokee and other Native American tribes from their homelands in the Southeast to Indian Territory (Oklahoma)." },
    { text: "What was the MEXICAN-AMERICAN WAR?", choices: mc("A war (1846-1848) resulting in the U.S. gaining the Southwest from Mexico","The American Revolution","The Civil War","The War of 1812"), answer: "A", unit: 3, skill: "G7SS-U3-S3", diff: "medium", explanation: "The Mexican-American War (1846-1848) resulted in the U.S. gaining approximately 500,000 square miles of territory from Mexico, including California and the Southwest." },
    { text: "What is POPULAR SOVEREIGNTY?", choices: mc("The principle that government authority derives from the consent of the people","A type of federalism","A type of checks and balances","A type of amendment"), answer: "A", unit: 2, skill: "G7SS-U2-S2", diff: "medium", explanation: "Popular sovereignty is the principle that the authority of government is created and sustained by the consent of its people." },
    { text: "What was the GREAT COMPROMISE?", choices: mc("The agreement creating a bicameral Congress with the Senate and House of Representatives","The Bill of Rights","The Declaration of Independence","The Emancipation Proclamation"), answer: "A", unit: 2, skill: "G7SS-U2-S3", diff: "medium", explanation: "The Great Compromise (1787) created a bicameral legislature with the Senate (equal representation) and House of Representatives (proportional representation)." },
    { text: "What is ABOLITIONISM?", choices: mc("The movement to end slavery","The movement for women's suffrage","The movement for workers' rights","The movement for Native American rights"), answer: "A", unit: 4, skill: "G7SS-U4-S1", diff: "easy", explanation: "Abolitionism was the movement to end slavery, gaining momentum in the United States in the early 19th century." },
    { text: "What was the UNDERGROUND RAILROAD?", choices: mc("A secret network of routes and safe houses helping enslaved people escape to freedom","An actual railroad system","A type of trade route","A type of communication system"), answer: "A", unit: 4, skill: "G7SS-U4-S2", diff: "easy", explanation: "The Underground Railroad was a secret network of routes, safe houses, and people who helped enslaved African Americans escape to free states and Canada." },
    { text: "What is STATES' RIGHTS?", choices: mc("The political principle that states should retain significant power relative to the federal government","A type of federalism","A type of separation of powers","A type of amendment"), answer: "A", unit: 2, skill: "G7SS-U2-S3", diff: "medium", explanation: "States' rights is the political doctrine that states should retain significant powers and autonomy relative to the federal government." },
    { text: "What was the CONSTITUTIONAL CONVENTION (1787)?", choices: mc("The meeting where delegates drafted the U.S. Constitution","The meeting that declared independence","The first meeting of Congress","The meeting that created the Bill of Rights"), answer: "A", unit: 2, skill: "G7SS-U2-S1", diff: "medium", explanation: "The Constitutional Convention (1787) was the meeting in Philadelphia where delegates drafted the United States Constitution." },
    { text: "What is SECTIONALISM?", choices: mc("Loyalty to the interests of one's own region over the nation as a whole","A type of nationalism","A type of federalism","A type of democracy"), answer: "A", unit: 4, skill: "G7SS-U4-S1", diff: "medium", explanation: "Sectionalism is excessive loyalty to the interests of one's own region or section of the country, rather than to the nation as a whole." },
    { text: "What was the MISSOURI COMPROMISE (1820)?", choices: mc("An agreement admitting Missouri as a slave state and Maine as a free state, drawing a line at 36°30'","The Emancipation Proclamation","The Kansas-Nebraska Act","The Compromise of 1850"), answer: "A", unit: 4, skill: "G7SS-U4-S1", diff: "medium", explanation: "The Missouri Compromise (1820) admitted Missouri as a slave state and Maine as a free state, and drew a line at 36°30' dividing future slave and free territories." },
    { text: "What is URBANIZATION?", choices: mc("The process of people moving from rural areas to cities","The process of industrialization","The process of immigration","The process of westward expansion"), answer: "A", unit: 5, skill: "G7SS-U5-S3", diff: "easy", explanation: "Urbanization is the process by which an increasing proportion of a population comes to live in cities and urban areas." },
  ];
}

function getGr7TechDiag() {
  return [
    { text: "What is CODING?", choices: mc("Writing instructions in a programming language to create software","A type of hardware","A type of network","A type of database"), answer: "A", unit: 1, skill: "G7TECH-U1-S1", diff: "easy", explanation: "Coding (programming) is the process of writing instructions in a programming language that a computer can execute." },
    { text: "What is a FUNCTION in programming?", choices: mc("A reusable block of code that performs a specific task","A type of variable","A loop structure","A data type"), answer: "A", unit: 1, skill: "G7TECH-U1-S2", diff: "easy", explanation: "A function is a named, reusable block of code designed to perform a specific task." },
    { text: "What is OBJECT-ORIENTED PROGRAMMING (OOP)?", choices: mc("A programming paradigm that organizes code into objects with properties and methods","A type of procedural programming","A type of functional programming","A type of scripting"), answer: "A", unit: 1, skill: "G7TECH-U1-S3", diff: "medium", explanation: "OOP is a programming paradigm that organizes software design around objects — data structures that combine data (properties) and behavior (methods)." },
    { text: "What is a WEBSITE?", choices: mc("A collection of related web pages accessible via the internet","A type of software application","A type of database","A type of network"), answer: "A", unit: 2, skill: "G7TECH-U2-S1", diff: "easy", explanation: "A website is a collection of related web pages, images, and other digital content accessible via the internet through a web browser." },
    { text: "What is HTML?", choices: mc("The markup language used to structure content on web pages","A type of programming language","A type of database","A type of network protocol"), answer: "A", unit: 2, skill: "G7TECH-U2-S1", diff: "easy", explanation: "HTML (HyperText Markup Language) is the standard markup language used to create and structure content on web pages." },
    { text: "What is CSS?", choices: mc("A style sheet language used to control the visual presentation of web pages","A type of programming language","A type of database","A type of network protocol"), answer: "A", unit: 2, skill: "G7TECH-U2-S2", diff: "easy", explanation: "CSS (Cascading Style Sheets) is a style sheet language used to control the visual appearance of HTML elements on web pages." },
    { text: "What is a DATABASE?", choices: mc("An organized collection of structured data stored electronically","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 3, skill: "G7TECH-U3-S1", diff: "easy", explanation: "A database is an organized collection of structured data stored electronically for efficient retrieval and management." },
    { text: "What is DATA ANALYSIS?", choices: mc("The process of examining data to find patterns, trends, and insights","A type of programming","A type of hardware","A type of network"), answer: "A", unit: 3, skill: "G7TECH-U3-S2", diff: "easy", explanation: "Data analysis is the process of inspecting, cleaning, and modeling data to discover useful information and support decision-making." },
    { text: "What is CYBERSECURITY?", choices: mc("The practice of protecting systems and data from digital attacks","A type of programming language","A type of hardware","A type of software"), answer: "A", unit: 4, skill: "G7TECH-U4-S1", diff: "easy", explanation: "Cybersecurity involves protecting computer systems, networks, and data from unauthorized access or attacks." },
    { text: "What is TWO-FACTOR AUTHENTICATION?", choices: mc("A security process requiring two forms of verification to access an account","A type of password","A type of encryption","A type of firewall"), answer: "A", unit: 4, skill: "G7TECH-U4-S2", diff: "medium", explanation: "Two-factor authentication (2FA) requires users to provide two different types of verification — typically a password and a code sent to their phone." },
    { text: "What is DIGITAL MEDIA LITERACY?", choices: mc("The ability to access, analyze, evaluate, and create media in digital formats","A type of programming skill","A type of hardware skill","A type of network skill"), answer: "A", unit: 5, skill: "G7TECH-U5-S1", diff: "medium", explanation: "Digital media literacy is the ability to critically access, analyze, evaluate, and create media content in various digital formats." },
    { text: "What is MISINFORMATION?", choices: mc("False or inaccurate information spread without intent to deceive","False information spread with intent to deceive","A type of advertising","A type of propaganda"), answer: "A", unit: 5, skill: "G7TECH-U5-S2", diff: "medium", explanation: "Misinformation is false or inaccurate information that is spread, regardless of intent to deceive." },
    { text: "What is DISINFORMATION?", choices: mc("False information deliberately spread to deceive","False information spread without intent to deceive","A type of advertising","A type of news"), answer: "A", unit: 5, skill: "G7TECH-U5-S2", diff: "medium", explanation: "Disinformation is deliberately false information spread with the intent to deceive or manipulate." },
    { text: "What is a PROTOTYPE?", choices: mc("An early model of a product used to test concepts","A finished product","A type of code","A type of database"), answer: "A", unit: 6, skill: "G7TECH-U6-S1", diff: "easy", explanation: "A prototype is an early sample or model built to test a concept or process before the final product is created." },
    { text: "What is ITERATION in design?", choices: mc("The process of repeatedly testing and improving a design","Creating a final product","Writing code","Testing hardware"), answer: "A", unit: 6, skill: "G7TECH-U6-S2", diff: "easy", explanation: "Iteration in design means repeatedly testing, evaluating, and refining a design to improve it based on feedback." },
    { text: "What is ARTIFICIAL INTELLIGENCE (AI)?", choices: mc("Computer systems that perform tasks that typically require human intelligence","A type of robot","A type of programming language","A type of hardware"), answer: "A", unit: 7, skill: "G7TECH-U7-S1", diff: "medium", explanation: "Artificial intelligence (AI) refers to computer systems designed to perform tasks that typically require human intelligence, such as learning, reasoning, and problem-solving." },
    { text: "What is MACHINE LEARNING?", choices: mc("A type of AI where systems learn from data without being explicitly programmed","A type of robot programming","A type of database management","A type of network security"), answer: "A", unit: 7, skill: "G7TECH-U7-S1", diff: "medium", explanation: "Machine learning is a subset of AI where algorithms learn from data to improve their performance without being explicitly programmed for each task." },
    { text: "What is the INTERNET OF THINGS (IoT)?", choices: mc("The network of physical devices connected to the internet that collect and share data","A type of social media","A type of cloud computing","A type of programming language"), answer: "A", unit: 7, skill: "G7TECH-U7-S2", diff: "medium", explanation: "The Internet of Things (IoT) refers to the network of physical devices (smart home devices, wearables, sensors) connected to the internet." },
    { text: "What is ENCRYPTION?", choices: mc("Converting data into a coded form to prevent unauthorized access","A type of virus","A type of network","A type of software"), answer: "A", unit: 4, skill: "G7TECH-U4-S3", diff: "medium", explanation: "Encryption converts data into a coded format that can only be read by someone with the correct decryption key." },
    { text: "What is a VARIABLE in programming?", choices: mc("A named storage location that holds a value","A type of loop","A type of function","A type of data structure"), answer: "A", unit: 1, skill: "G7TECH-U1-S1", diff: "easy", explanation: "A variable is a named container in a program that stores a value which can change during execution." },
    { text: "What is OPEN SOURCE SOFTWARE?", choices: mc("Software with publicly available source code that anyone can modify and distribute","Software that costs money","Software owned by a company","Software that cannot be modified"), answer: "A", unit: 8, skill: "G7TECH-U8-S1", diff: "medium", explanation: "Open source software has its source code publicly available, allowing anyone to view, modify, and distribute it." },
    { text: "What is DIGITAL FOOTPRINT?", choices: mc("The trail of data you leave when using the internet","A type of computer file","A programming concept","A type of network connection"), answer: "A", unit: 5, skill: "G7TECH-U5-S3", diff: "easy", explanation: "A digital footprint is the record of your online activities and data you share on the internet." },
    { text: "What is RESPONSIVE DESIGN?", choices: mc("Web design that adapts to different screen sizes and devices","A type of animation ","A type of programming language","A type of database"), answer: "A", unit: 2, skill: "G7TECH-U2-S3", diff: "medium", explanation: "Responsive design is an approach to web design that makes web pages render well on a variety of devices and screen sizes." },
    { text: "What is VERSION CONTROL?", choices: mc("A system that tracks changes to code over time (e.g., Git)","A type of database","A type of network","A type of programming language"), answer: "A", unit: 1, skill: "G7TECH-U1-S3", diff: "medium", explanation: "Version control is a system (like Git) that records changes to files over time, allowing developers to track history and collaborate." },
    { text: "What is a WIREFRAME?", choices: mc("A basic visual guide showing the structure and layout of a web page or app","A type of code","A type of database","A type of network"), answer: "A", unit: 6, skill: "G7TECH-U6-S1", diff: "medium", explanation: "A wireframe is a low-fidelity visual representation of a web page or app layout, showing structure without detailed design." },
    { text: "What is USER INTERFACE (UI)?", choices: mc("The visual elements through which users interact with a product","The code behind an app","The database of an app","The server of an app"), answer: "A", unit: 6, skill: "G7TECH-U6-S2", diff: "easy", explanation: "User interface (UI) refers to the visual elements — buttons, menus, icons — through which users interact with a digital product." },
    { text: "What is CLOUD STORAGE?", choices: mc("Storing data on remote servers accessible via the internet","Storing data on a local hard drive","Storing data on a USB drive","Storing data on a CD"), answer: "A", unit: 4, skill: "G7TECH-U4-S2", diff: "easy", explanation: "Cloud storage is a service that stores data on remote servers accessible via the internet, rather than on local devices." },
    { text: "What is ACCESSIBILITY in technology?", choices: mc("Designing technology so people with disabilities can use it effectively","A type of security feature","A type of programming technique","A type of network protocol"), answer: "A", unit: 8, skill: "G7TECH-U8-S2", diff: "medium", explanation: "Accessibility in technology means designing products and services so that people with disabilities can use them effectively." },
    { text: "What is AUTOMATION?", choices: mc("Using technology to perform tasks with minimal human intervention","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 7, skill: "G7TECH-U7-S3", diff: "easy", explanation: "Automation is the use of technology to perform tasks automatically with minimal human intervention." },
  ];
}

function getGr8MathDiag() {
  return [
    { text: "What is the PYTHAGOREAN THEOREM?", choices: mc("a² + b² = c², where c is the hypotenuse of a right triangle","a + b = c","a² - b² = c²","a × b = c²"), answer: "A", unit: 4, skill: "G8MATH-U4-S1", diff: "easy", explanation: "The Pythagorean Theorem states that in a right triangle, the square of the hypotenuse equals the sum of the squares of the other two sides: a² + b² = c²." },
    { text: "Solve: 3x - 7 = 2x + 5", choices: mc("12","2","-2","5"), answer: "A", unit: 1, skill: "G8MATH-U1-S1", diff: "easy", explanation: "3x - 2x = 5 + 7; x = 12." },
    { text: "What is the slope-intercept form of a linear equation?", choices: mc("y = mx + b","y = ax² + bx + c","ax + by = c","y - y₁ = m(x - x₁)"), answer: "A", unit: 2, skill: "G8MATH-U2-S1", diff: "easy", explanation: "The slope-intercept form is y = mx + b, where m is the slope and b is the y-intercept." },
    { text: "What is the slope of a line through (2,3) and (6,11)?", choices: mc("2","4","1/2","8"), answer: "A", unit: 2, skill: "G8MATH-U2-S1", diff: "easy", explanation: "Slope = (11-3)/(6-2) = 8/4 = 2." },
    { text: "What is √64?", choices: mc("8","6","7","9"), answer: "A", unit: 3, skill: "G8MATH-U3-S1", diff: "easy", explanation: "√64 = 8 because 8² = 64." },
    { text: "Solve: 2(x + 3) = 4x - 6", choices: mc("6","3","0","12"), answer: "A", unit: 1, skill: "G8MATH-U1-S1", diff: "medium", explanation: "2x + 6 = 4x - 6; 12 = 2x; x = 6." },
    { text: "What is a FUNCTION?", choices: mc("A relation where each input has exactly one output","A relation with multiple outputs for one input","A type of equation","A type of graph"), answer: "A", unit: 5, skill: "G8MATH-U5-S1", diff: "easy", explanation: "A function is a relation where each input (x-value) corresponds to exactly one output (y-value)." },
    { text: "What is the volume of a cone: r=3, h=9? (Use π≈3.14)", choices: mc("84.78","254.34","28.26","113.04"), answer: "A", unit: 6, skill: "G8MATH-U6-S1", diff: "medium", explanation: "V = (1/3)πr²h = (1/3)(3.14)(9)(9) = 84.78." },
    { text: "What is the volume of a sphere: r=4? (Use π≈3.14)", choices: mc("267.95","200.96","150.72","100.48"), answer: "A", unit: 6, skill: "G8MATH-U6-S1", diff: "medium", explanation: "V = (4/3)πr³ = (4/3)(3.14)(64) ≈ 267.95." },
    { text: "Solve the system: x + y = 10, x - y = 4", choices: mc("x=7, y=3","x=3, y=7","x=5, y=5","x=6, y=4"), answer: "A", unit: 1, skill: "G8MATH-U1-S2", diff: "medium", explanation: "Adding: 2x = 14, x = 7. Then y = 10 - 7 = 3." },
    { text: "What is a RATIONAL EXPONENT? (e.g., x^(1/2))", choices: mc("An exponent expressed as a fraction, equivalent to a root (x^(1/2) = √x)","A negative exponent","A whole number exponent","A decimal exponent"), answer: "A", unit: 3, skill: "G8MATH-U3-S2", diff: "medium", explanation: "A rational exponent is a fractional exponent: x^(1/n) = ⁿ√x (the nth root of x)." },
    { text: "What is SCIENTIFIC NOTATION?", choices: mc("A way to express very large or small numbers as a × 10ⁿ where 1 ≤ a < 10","A type of equation","A type of graph","A type of function"), answer: "A", unit: 3, skill: "G8MATH-U3-S1", diff: "easy", explanation: "Scientific notation expresses numbers as a × 10ⁿ where a is between 1 and 10, used for very large or small numbers." },
    { text: "What is the DISTANCE FORMULA?", choices: mc("d = √[(x₂-x₁)² + (y₂-y₁)²]","d = (x₂-x₁) + (y₂-y₁)","d = (x₂+x₁)/(y₂+y₁)","d = √(x² + y²)"), answer: "A", unit: 4, skill: "G8MATH-U4-S2", diff: "medium", explanation: "The distance formula calculates the distance between two points: d = √[(x₂-x₁)² + (y₂-y₁)²]." },
    { text: "What is TRANSFORMATION in geometry?", choices: mc("Moving, flipping, turning, or resizing a figure","A type of equation","A type of function","A type of graph"), answer: "A", unit: 7, skill: "G8MATH-U7-S1", diff: "easy", explanation: "A geometric transformation changes the position, size, or orientation of a figure through translation, reflection, rotation, or dilation." },
    { text: "What is a TRANSLATION?", choices: mc("Sliding a figure to a new position without rotating or flipping it","Flipping a figure over a line","Turning a figure around a point","Resizing a figure"), answer: "A", unit: 7, skill: "G8MATH-U7-S1", diff: "easy", explanation: "A translation slides a figure to a new position in the plane without changing its size, shape, or orientation." },
    { text: "What is CONGRUENCE?", choices: mc("Two figures that have the same shape and size","Two figures with the same shape but different sizes","Two figures with the same size but different shapes","Two figures that are mirror images"), answer: "A", unit: 7, skill: "G8MATH-U7-S2", diff: "easy", explanation: "Congruent figures have exactly the same shape and size — one can be mapped onto the other through rigid transformations." },
    { text: "What is SIMILARITY?", choices: mc("Two figures with the same shape but possibly different sizes","Two figures with the same size but different shapes","Two figures that are congruent","Two figures that are mirror images"), answer: "A", unit: 7, skill: "G8MATH-U7-S2", diff: "easy", explanation: "Similar figures have the same shape but may differ in size — corresponding angles are equal and sides are proportional." },
    { text: "What is the MIDPOINT FORMULA?", choices: mc("M = ((x₁+x₂)/2, (y₁+y₂)/2)","M = ((x₂-x₁)/2, (y₂-y₁)/2)","M = (x₁+x₂, y₁+y₂)","M = (x₁×x₂, y₁×y₂)"), answer: "A", unit: 4, skill: "G8MATH-U4-S2", diff: "medium", explanation: "The midpoint formula finds the point halfway between two points: M = ((x₁+x₂)/2, (y₁+y₂)/2)." },
    { text: "What is a LINEAR EQUATION?", choices: mc("An equation whose graph is a straight line","An equation whose graph is a curve","An equation with an exponent of 2","An equation with absolute value"), answer: "A", unit: 2, skill: "G8MATH-U2-S1", diff: "easy", explanation: "A linear equation produces a straight line when graphed, with variables raised to the first power only." },
    { text: "What is SCATTER PLOT?", choices: mc("A graph showing the relationship between two variables using dots","A type of bar graph","A type of line graph","A type of pie chart"), answer: "A", unit: 8, skill: "G8MATH-U8-S1", diff: "easy", explanation: "A scatter plot displays data points as dots on a coordinate plane to show the relationship between two variables." },
    { text: "What is CORRELATION?", choices: mc("A statistical relationship between two variables","A type of causation","A type of function","A type of equation"), answer: "A", unit: 8, skill: "G8MATH-U8-S1", diff: "medium", explanation: "Correlation is a statistical measure that describes the strength and direction of the relationship between two variables." },
    { text: "What is a REFLECTION?", choices: mc("Flipping a figure over a line of reflection","Sliding a figure to a new position","Turning a figure around a point","Resizing a figure"), answer: "A", unit: 7, skill: "G8MATH-U7-S1", diff: "easy", explanation: "A reflection flips a figure over a line (the line of reflection), creating a mirror image." },
    { text: "What is a ROTATION?", choices: mc("Turning a figure around a fixed point by a given angle","Sliding a figure to a new position","Flipping a figure over a line","Resizing a figure"), answer: "A", unit: 7, skill: "G8MATH-U7-S1", diff: "easy", explanation: "A rotation turns a figure around a fixed point (center of rotation) by a specified angle." },
    { text: "Simplify: (3x²)(4x³)", choices: mc("12x⁵","12x⁶","7x⁵","7x⁶"), answer: "A", unit: 3, skill: "G8MATH-U3-S3", diff: "medium", explanation: "Multiply coefficients: 3×4=12. Add exponents: x²×x³=x⁵. Result: 12x⁵." },
    { text: "What is the x-intercept of y = 2x - 8?", choices: mc("4","8","2","-8"), answer: "A", unit: 2, skill: "G8MATH-U2-S2", diff: "medium", explanation: "Set y=0: 0 = 2x - 8; 2x = 8; x = 4." },
    { text: "What is a DILATION?", choices: mc("Resizing a figure by a scale factor from a center point","Sliding a figure","Flipping a figure","Rotating a figure"), answer: "A", unit: 7, skill: "G8MATH-U7-S3", diff: "medium", explanation: "A dilation resizes a figure by a scale factor from a center point, creating a similar figure that is larger or smaller." },
    { text: "What is an IRRATIONAL NUMBER?", choices: mc("A number that cannot be expressed as a fraction (e.g., π, √2)","Any decimal number","Any negative number","Any fraction"), answer: "A", unit: 3, skill: "G8MATH-U3-S1", diff: "medium", explanation: "An irrational number cannot be expressed as a simple fraction — its decimal representation is non-terminating and non-repeating (e.g., π ≈ 3.14159...)." },
    { text: "Solve: x² = 49", choices: mc("x = ±7","x = 7","x = -7","x = ±49"), answer: "A", unit: 3, skill: "G8MATH-U3-S2", diff: "medium", explanation: "x² = 49 means x = √49 = ±7 (both positive and negative solutions)." },
    { text: "What is the VERTICAL LINE TEST?", choices: mc("A test to determine if a graph represents a function (no vertical line crosses more than once)","A test for slope","A test for intercepts","A test for symmetry"), answer: "A", unit: 5, skill: "G8MATH-U5-S2", diff: "medium", explanation: "The vertical line test determines if a graph represents a function: if any vertical line intersects the graph more than once, it is not a function." },
    { text: "What is the surface area of a sphere: r=5? (Use π≈3.14)", choices: mc("314","78.5","157","628"), answer: "A", unit: 6, skill: "G8MATH-U6-S2", diff: "medium", explanation: "SA = 4πr² = 4 × 3.14 × 25 = 314." },
  ];
}

function getGr8ELADiag() {
  return [
    { text: "What is LITERARY ANALYSIS?", choices: mc("The examination of a literary work's elements, themes, and techniques to understand its meaning","A summary of a text","A personal response to a text","A comparison of two texts"), answer: "A", unit: 1, skill: "G8ELA-U1-S1", diff: "easy", explanation: "Literary analysis is the critical examination of a literary work's elements — plot, character, theme, style — to interpret its meaning." },
    { text: "What is TEXTUAL EVIDENCE?", choices: mc("Specific quotes or details from a text that support an argument","A personal opinion","A summary","A paraphrase"), answer: "A", unit: 1, skill: "G8ELA-U1-S2", diff: "easy", explanation: "Textual evidence is specific information from a text — quotes, details, examples — used to support an argument or claim." },
    { text: "What is ARGUMENTATIVE WRITING?", choices: mc("Writing that presents a claim and supports it with evidence and reasoning","Writing that tells a story","Writing that describes something","Writing that explains a process"), answer: "A", unit: 4, skill: "G8ELA-U4-S1", diff: "easy", explanation: "Argumentative writing presents a clear claim (thesis) and supports it with evidence, reasoning, and counterargument acknowledgment." },
    { text: "What is RHETORIC?", choices: mc("The art of effective communication and persuasion","A type of literary device","A type of essay structure","A type of grammar rule"), answer: "A", unit: 3, skill: "G8ELA-U3-S1", diff: "medium", explanation: "Rhetoric is the art of effective or persuasive communication, using language strategically to influence an audience." },
    { text: "What is an EXTENDED METAPHOR?", choices: mc("A metaphor that is developed over several lines or throughout an entire work","A short comparison","A type of simile","A type of alliteration"), answer: "A", unit: 2, skill: "G8ELA-S2-S1", diff: "medium", explanation: "An extended metaphor is a comparison that is sustained and developed over multiple lines or throughout an entire literary work." },
    { text: "What is COMPLEX CHARACTERIZATION?", choices: mc("Developing characters with multiple, sometimes contradictory traits that evolve over time","Simple character description","A character who never changes","A character with one dominant trait"), answer: "A", unit: 1, skill: "G8ELA-U1-S2", diff: "medium", explanation: "Complex characterization creates multi-dimensional characters with contradictory traits, internal conflicts, and growth over the course of a narrative." },
    { text: "What is NARRATIVE STRUCTURE?", choices: mc("The way a story is organized, including plot sequence, pacing, and narrative techniques","The theme of a story","The setting of a story","The characters in a story"), answer: "A", unit: 1, skill: "G8ELA-U1-S3", diff: "medium", explanation: "Narrative structure refers to how a story is organized — its sequence of events, pacing, use of flashback or foreshadowing, and narrative perspective." },
    { text: "What is SYNTAX in relation to style?", choices: mc("The arrangement of words and sentences that contributes to an author's distinctive style","The meaning of words","The sound of words","The origin of words"), answer: "A", unit: 5, skill: "G8ELA-U5-S1", diff: "medium", explanation: "Syntax — the arrangement of words and sentence structures — is a key element of an author's style, affecting rhythm, emphasis, and tone." },
    { text: "What is a RESEARCH PAPER?", choices: mc("A formal written work that investigates a topic using multiple credible sources","A personal narrative","A creative story","A poem"), answer: "A", unit: 6, skill: "G8ELA-U6-S1", diff: "easy", explanation: "A research paper is a formal academic work that investigates a topic using evidence from multiple credible sources, with proper citations." },
    { text: "What is PLAGIARISM?", choices: mc("Using someone else's work or ideas without giving proper credit","Citing your sources","Paraphrasing with attribution","Writing original content"), answer: "A", unit: 6, skill: "G8ELA-U6-S2", diff: "easy", explanation: "Plagiarism is the act of using someone else's work, ideas, or words without proper attribution." },
    { text: "What is MEDIA LITERACY?", choices: mc("The ability to access, analyze, evaluate, and create media in various forms","A type of programming skill","A type of reading skill","A type of writing skill"), answer: "A", unit: 7, skill: "G8ELA-U7-S1", diff: "medium", explanation: "Media literacy is the ability to access, analyze, evaluate, and create media content in various forms — print, digital, visual, audio." },
    { text: "What is PROPAGANDA?", choices: mc("Information used to promote a particular cause or point of view, often biased","A type of news reporting","A type of literary analysis","A type of academic writing"), answer: "A", unit: 7, skill: "G8ELA-U7-S2", diff: "medium", explanation: "Propaganda is biased or misleading information used to promote a particular political cause or point of view." },
    { text: "What is VOICE in writing?", choices: mc("The distinctive style and personality of a writer expressed through their writing","The theme of a text","The plot of a text","The setting of a text"), answer: "A", unit: 5, skill: "G8ELA-U5-S2", diff: "medium", explanation: "Voice is the distinctive personality, style, and tone that a writer brings to their work, making it recognizable." },
    { text: "What is CLOSE READING?", choices: mc("Careful, detailed analysis of a short passage to understand its meaning and craft","Quickly reading a text for main ideas","Skimming a text for key words","Reading a text for enjoyment"), answer: "A", unit: 1, skill: "G8ELA-U1-S1", diff: "medium", explanation: "Close reading is a careful, detailed analysis of a short passage, examining language, structure, and literary devices to understand meaning." },
    { text: "What is ANNOTATION?", choices: mc("Writing notes and comments in or near a text to aid comprehension and analysis","A type of citation","A type of summary","A type of paraphrase"), answer: "A", unit: 1, skill: "G8ELA-U1-S1", diff: "easy", explanation: "Annotation is the practice of writing notes, questions, and comments in the margins of a text to aid comprehension and analysis." },
    { text: "What is COUNTERCLAIM?", choices: mc("An opposing argument that a writer acknowledges and refutes","The main argument","Supporting evidence","A conclusion"), answer: "A", unit: 4, skill: "G8ELA-U4-S2", diff: "medium", explanation: "A counterclaim is an opposing argument that a writer acknowledges in an argumentative essay and then refutes with evidence." },
    { text: "What is REBUTTAL?", choices: mc("A response that disproves or weakens a counterclaim","The main argument","Supporting evidence","A conclusion"), answer: "A", unit: 4, skill: "G8ELA-U4-S2", diff: "medium", explanation: "A rebuttal is the writer's response to a counterclaim, providing evidence and reasoning to disprove or weaken the opposing argument." },
    { text: "What is PARALLELISM in writing?", choices: mc("Using the same grammatical structure for similar ideas to create balance and rhythm","A type of metaphor","A type of simile","A type of alliteration"), answer: "A", unit: 5, skill: "G8ELA-U5-S3", diff: "medium", explanation: "Parallelism is the use of the same grammatical structure for similar ideas, creating balance, rhythm, and emphasis." },
    { text: "What is AMBIGUITY in literature?", choices: mc("Language or situations that can be interpreted in multiple ways","A clear, single meaning","A type of metaphor","A type of irony"), answer: "A", unit: 2, skill: "G8ELA-U2-S2", diff: "medium", explanation: "Ambiguity in literature refers to language or situations that allow for multiple interpretations, often adding depth and complexity to a text." },
    { text: "What is INTERTEXTUALITY?", choices: mc("The relationship between texts through references, allusions, or shared themes","A type of literary analysis","A type of citation","A type of summary"), answer: "A", unit: 2, skill: "G8ELA-U2-S3", diff: "medium", explanation: "Intertextuality refers to the relationship between texts — how one text references, echoes, or responds to another." },
    { text: "What is DEDUCTIVE REASONING?", choices: mc("Drawing specific conclusions from general principles","Drawing general conclusions from specific examples","A type of logical fallacy","A type of rhetorical appeal"), answer: "A", unit: 3, skill: "G8ELA-U3-S2", diff: "medium", explanation: "Deductive reasoning moves from general principles to specific conclusions (if the premises are true, the conclusion must be true)." },
    { text: "What is INDUCTIVE REASONING?", choices: mc("Drawing general conclusions from specific examples or observations","Drawing specific conclusions from general principles","A type of logical fallacy","A type of rhetorical appeal"), answer: "A", unit: 3, skill: "G8ELA-U3-S2", diff: "medium", explanation: "Inductive reasoning moves from specific observations to general conclusions (conclusions are probable but not guaranteed)." },
    { text: "What is a LOGICAL FALLACY?", choices: mc("An error in reasoning that makes an argument invalid","A type of evidence","A type of claim","A type of rhetorical appeal"), answer: "A", unit: 3, skill: "G8ELA-U3-S3", diff: "medium", explanation: "A logical fallacy is a flaw in reasoning that undermines the logic of an argument (e.g., ad hominem, straw man, false dichotomy)." },
    { text: "What is ACADEMIC VOCABULARY?", choices: mc("Words used across multiple disciplines in academic contexts","Words used only in science","Words used only in math","Words used only in literature"), answer: "A", unit: 8, skill: "G8ELA-U8-S1", diff: "easy", explanation: "Academic vocabulary consists of words that appear across multiple subject areas in academic texts (e.g., analyze, evaluate, synthesize, infer)." },
    { text: "What is SYNTHESIS in writing?", choices: mc("Combining information from multiple sources to create a new, unified understanding","Summarizing one source","Quoting from a source","Paraphrasing a source"), answer: "A", unit: 6, skill: "G8ELA-U6-S3", diff: "medium", explanation: "Synthesis is the process of combining information and ideas from multiple sources to develop a new, integrated understanding." },
    { text: "What is STYLE in literature?", choices: mc("The distinctive way an author uses language, including diction, syntax, and tone","The theme of a text","The plot of a text","The setting of a text"), answer: "A", unit: 5, skill: "G8ELA-U5-S1", diff: "medium", explanation: "Style is the distinctive way an author uses language — their choices of diction, syntax, tone, and literary devices — that makes their writing recognizable." },
    { text: "What is SATIRE?", choices: mc("The use of humor, irony, or exaggeration to criticize human folly or vice","A type of metaphor","A type of simile","A type of alliteration"), answer: "A", unit: 2, skill: "G8ELA-U2-S1", diff: "medium", explanation: "Satire is a literary technique that uses humor, irony, or exaggeration to expose and criticize human folly, vice, or social issues." },
    { text: "What is ALLEGORY?", choices: mc("A narrative where characters and events represent abstract ideas or moral qualities","A type of metaphor","A type of simile","A type of alliteration"), answer: "A", unit: 2, skill: "G8ELA-U2-S1", diff: "medium", explanation: "An allegory is a narrative in which characters, events, and settings represent abstract ideas or moral qualities beyond their literal meaning." },
    { text: "What is CREDIBILITY of a source?", choices: mc("The trustworthiness and reliability of a source based on its accuracy and authority","The popularity of a source","The length of a source","The age of a source"), answer: "A", unit: 6, skill: "G8ELA-U6-S2", diff: "easy", explanation: "Credibility refers to the trustworthiness of a source — its accuracy, authority, objectivity, currency, and purpose." },
    { text: "What is PUBLIC SPEAKING?", choices: mc("The act of delivering a speech or presentation to an audience","A type of writing","A type of reading","A type of listening"), answer: "A", unit: 7, skill: "G8ELA-U7-S3", diff: "easy", explanation: "Public speaking is the practice of delivering a speech or presentation to a live audience, requiring preparation, organization, and delivery skills." },
  ];
}

function getGr8SciDiag() {
  return [
    { text: "What is NEWTON'S THIRD LAW?", choices: mc("For every action, there is an equal and opposite reaction","Force equals mass times acceleration","An object at rest stays at rest","Objects fall at the same rate"), answer: "A", unit: 1, skill: "G8SCI-U1-S1", diff: "easy", explanation: "Newton's Third Law states that for every action force, there is an equal and opposite reaction force." },
    { text: "What is MOMENTUM?", choices: mc("Mass times velocity (p = mv)","Force times time","Mass times acceleration","Velocity divided by time"), answer: "A", unit: 1, skill: "G8SCI-U1-S2", diff: "medium", explanation: "Momentum (p) = mass × velocity. It describes the quantity of motion an object has." },
    { text: "What is KINETIC ENERGY?", choices: mc("Energy of motion (KE = ½mv²)","Stored energy","Energy of position","Chemical energy"), answer: "A", unit: 2, skill: "G8SCI-U2-S1", diff: "easy", explanation: "Kinetic energy is the energy of motion: KE = ½mv², where m is mass and v is velocity." },
    { text: "What is POTENTIAL ENERGY?", choices: mc("Stored energy based on position or condition","Energy of motion","Heat energy","Light energy"), answer: "A", unit: 2, skill: "G8SCI-U2-S1", diff: "easy", explanation: "Potential energy is stored energy — gravitational PE depends on height (PE = mgh), elastic PE depends on compression/extension." },
    { text: "What is the LAW OF CONSERVATION OF ENERGY?", choices: mc("Energy cannot be created or destroyed, only transformed","Energy can be created from nothing","Energy is always lost as heat","Energy increases over time"), answer: "A", unit: 2, skill: "G8SCI-U2-S2", diff: "medium", explanation: "The Law of Conservation of Energy states that energy cannot be created or destroyed — it can only change from one form to another." },
    { text: "What is ELECTROMAGNETIC RADIATION?", choices: mc("Energy that travels as waves through space, including light, radio waves, and X-rays","A type of mechanical wave","A type of sound wave","A type of seismic wave"), answer: "A", unit: 3, skill: "G8SCI-U3-S1", diff: "medium", explanation: "Electromagnetic radiation is energy that travels as transverse waves through space, including the entire electromagnetic spectrum." },
    { text: "What is the ELECTROMAGNETIC SPECTRUM?", choices: mc("The range of all electromagnetic radiation from radio waves to gamma rays","Only visible light","Only radio waves","Only X-rays"), answer: "A", unit: 3, skill: "G8SCI-U3-S1", diff: "medium", explanation: "The electromagnetic spectrum is the complete range of electromagnetic radiation, from radio waves (longest wavelength) to gamma rays (shortest wavelength)." },
    { text: "What is CHEMICAL BONDING?", choices: mc("The attraction between atoms that holds them together in compounds","A type of physical change","A type of nuclear reaction","A type of phase change"), answer: "A", unit: 4, skill: "G8SCI-U4-S1", diff: "medium", explanation: "Chemical bonding is the attractive force between atoms that holds them together to form molecules and compounds." },
    { text: "What is a CHEMICAL REACTION?", choices: mc("A process where reactants are transformed into products with different properties","A physical change","A change in state","A change in temperature"), answer: "A", unit: 4, skill: "G8SCI-U4-S2", diff: "easy", explanation: "A chemical reaction is a process in which substances (reactants) are transformed into new substances (products) with different chemical properties." },
    { text: "What is the PERIODIC TABLE?", choices: mc("A chart organizing all known elements by atomic number and chemical properties","A chart of all known compounds","A chart of all known molecules","A chart of all known reactions"), answer: "A", unit: 4, skill: "G8SCI-U4-S1", diff: "easy", explanation: "The periodic table organizes all known chemical elements by increasing atomic number and groups them by similar chemical properties." },
    { text: "What is NATURAL SELECTION?", choices: mc("The process by which organisms with favorable traits survive and reproduce more successfully","A type of mutation","A type of genetic drift","A type of migration"), answer: "A", unit: 5, skill: "G8SCI-U5-S1", diff: "medium", explanation: "Natural selection is the mechanism of evolution where organisms with traits better suited to their environment survive and reproduce more successfully." },
    { text: "What is EVIDENCE OF EVOLUTION?", choices: mc("Fossils, comparative anatomy, DNA similarities, and embryology","Only fossils","Only DNA evidence","Only comparative anatomy"), answer: "A", unit: 5, skill: "G8SCI-U5-S2", diff: "medium", explanation: "Evidence for evolution includes the fossil record, comparative anatomy (homologous structures), DNA similarities, and embryological development." },
    { text: "What is CLIMATE CHANGE?", choices: mc("Long-term shifts in global temperatures and weather patterns, accelerated by human activities","Short-term weather changes","A type of natural disaster","A type of geological event"), answer: "A", unit: 6, skill: "G8SCI-U6-S1", diff: "easy", explanation: "Climate change refers to long-term shifts in global temperatures and weather patterns, significantly accelerated by human activities since the Industrial Revolution." },
    { text: "What is the GREENHOUSE EFFECT?", choices: mc("The trapping of heat in Earth's atmosphere by greenhouse gases","The cooling of Earth's surface","A type of weather pattern","A type of geological process"), answer: "A", unit: 6, skill: "G8SCI-U6-S1", diff: "easy", explanation: "The greenhouse effect is the process by which greenhouse gases (CO₂, methane, water vapor) trap heat in Earth's atmosphere, warming the planet." },
    { text: "What is PLATE TECTONICS?", choices: mc("The theory that Earth's lithosphere is divided into moving plates","The study of earthquakes only","The study of volcanoes only","The theory of continental drift only"), answer: "A", unit: 7, skill: "G8SCI-U7-S1", diff: "medium", explanation: "Plate tectonics is the scientific theory that Earth's lithosphere is divided into tectonic plates that move, causing earthquakes, volcanoes, and mountain formation." },
    { text: "What is a SEISMIC WAVE?", choices: mc("A wave of energy that travels through Earth during an earthquake","A type of electromagnetic wave","A type of sound wave","A type of ocean wave"), answer: "A", unit: 7, skill: "G8SCI-U7-S2", diff: "medium", explanation: "Seismic waves are waves of energy that travel through Earth's layers, generated by earthquakes or other seismic events." },
    { text: "What is WAVELENGTH?", choices: mc("The distance between two consecutive crests or troughs of a wave","The height of a wave","The speed of a wave","The frequency of a wave"), answer: "A", unit: 3, skill: "G8SCI-U3-S2", diff: "easy", explanation: "Wavelength is the distance between two consecutive identical points on a wave (crest to crest or trough to trough)." },
    { text: "What is FREQUENCY?", choices: mc("The number of wave cycles that pass a point per second (measured in Hz)","The height of a wave","The speed of a wave","The wavelength of a wave"), answer: "A", unit: 3, skill: "G8SCI-U3-S2", diff: "easy", explanation: "Frequency is the number of complete wave cycles that pass a given point per second, measured in hertz (Hz)." },
    { text: "What is WORK in physics?", choices: mc("Force applied over a distance (W = Fd)","Force times time","Mass times velocity","Energy divided by time"), answer: "A", unit: 1, skill: "G8SCI-U1-S3", diff: "medium", explanation: "Work = Force × distance (W = Fd). Work is done when a force causes displacement of an object." },
    { text: "What is POWER in physics?", choices: mc("The rate at which work is done (P = W/t)","Force times distance","Mass times velocity","Energy times time"), answer: "A", unit: 1, skill: "G8SCI-U1-S3", diff: "medium", explanation: "Power is the rate at which work is done or energy is transferred: P = Work/time, measured in watts (W)." },
    { text: "What is a FOSSIL?", choices: mc("The preserved remains or traces of ancient organisms","A type of rock","A type of mineral","A type of sediment"), answer: "A", unit: 5, skill: "G8SCI-U5-S2", diff: "easy", explanation: "A fossil is the preserved remains, impression, or trace of a living organism from a past geological age." },
    { text: "What is BIODIVERSITY?", choices: mc("The variety of life in a particular habitat or on Earth as a whole","The number of species in a habitat","The number of individuals in a population","The variety of ecosystems"), answer: "A", unit: 6, skill: "G8SCI-U6-S2", diff: "easy", explanation: "Biodiversity is the variety of life on Earth or in a particular habitat, including species diversity, genetic diversity, and ecosystem diversity." },
    { text: "What is NUCLEAR ENERGY?", choices: mc("Energy released from the nucleus of an atom through fission or fusion","A type of chemical energy","A type of electromagnetic energy","A type of kinetic energy"), answer: "A", unit: 2, skill: "G8SCI-U2-S3", diff: "medium", explanation: "Nuclear energy is energy released from the nucleus of an atom through nuclear fission (splitting) or fusion (combining)." },
    { text: "What is REFRACTION?", choices: mc("The bending of light as it passes from one medium to another","The reflection of light","The absorption of light","The diffraction of light"), answer: "A", unit: 3, skill: "G8SCI-U3-S3", diff: "medium", explanation: "Refraction is the bending of light (or other waves) as it passes from one medium to another with a different density." },
    { text: "What is REFLECTION of light?", choices: mc("The bouncing of light off a surface","The bending of light","The absorption of light","The scattering of light"), answer: "A", unit: 3, skill: "G8SCI-U3-S3", diff: "easy", explanation: "Reflection is the bouncing of light (or other waves) off a surface, following the law of reflection (angle of incidence = angle of reflection)." },
    { text: "What is an IONIC BOND?", choices: mc("A chemical bond formed by the transfer of electrons between atoms","A bond formed by sharing electrons","A bond formed by metallic attraction","A bond formed by hydrogen"), answer: "A", unit: 4, skill: "G8SCI-U4-S2", diff: "medium", explanation: "An ionic bond forms when one atom transfers electrons to another, creating oppositely charged ions that attract each other." },
    { text: "What is a COVALENT BOND?", choices: mc("A chemical bond formed by the sharing of electrons between atoms","A bond formed by electron transfer","A bond formed by metallic attraction","A bond formed by hydrogen"), answer: "A", unit: 4, skill: "G8SCI-U4-S2", diff: "medium", explanation: "A covalent bond forms when two atoms share electrons, typically between nonmetal atoms." },
    { text: "What is EROSION?", choices: mc("The movement of weathered material by wind, water, or ice","The breakdown of rocks","The deposition of sediment","The formation of soil"), answer: "A", unit: 7, skill: "G8SCI-U7-S3", diff: "easy", explanation: "Erosion is the process by which weathered rock and soil are transported by agents like water, wind, or ice." },
    { text: "What is RENEWABLE ENERGY?", choices: mc("Energy from sources that are naturally replenished (solar, wind, hydro, geothermal)","Energy from fossil fuels","Energy from nuclear fission","Energy from coal"), answer: "A", unit: 6, skill: "G8SCI-U6-S3", diff: "easy", explanation: "Renewable energy comes from naturally replenishing sources — solar, wind, hydroelectric, geothermal, and biomass — that won't run out." },
    { text: "What is HOMEOSTASIS?", choices: mc("The ability of an organism to maintain stable internal conditions","A type of mutation","A type of adaptation","A type of evolution"), answer: "A", unit: 5, skill: "G8SCI-U5-S3", diff: "medium", explanation: "Homeostasis is the ability of an organism or system to maintain a stable internal environment despite external changes." },
  ];
}

function getGr8SSDiag() {
  return [
    { text: "What was the COLUMBIAN EXCHANGE?", choices: mc("The transfer of plants, animals, diseases, and ideas between the Americas and Europe/Africa after 1492","A type of trade agreement","A colonial government","A type of currency"), answer: "A", unit: 1, skill: "G8SS-U1-S1", diff: "easy", explanation: "The Columbian Exchange was the widespread transfer of plants, animals, diseases, and culture between the Americas and the Old World following Columbus's voyages." },
    { text: "What were the THIRTEEN COLONIES?", choices: mc("The British colonies in North America that became the United States","All colonies in the Americas","The Spanish colonies in North America","The French colonies in North America"), answer: "A", unit: 1, skill: "G8SS-U1-S1", diff: "easy", explanation: "The Thirteen Colonies were the British colonies along the eastern seaboard of North America that declared independence in 1776." },
    { text: "What was the DECLARATION OF INDEPENDENCE?", choices: mc("The 1776 document declaring the colonies' independence from Britain","The U.S. Constitution","The Bill of Rights","The Emancipation Proclamation"), answer: "A", unit: 2, skill: "G8SS-U2-S1", diff: "easy", explanation: "The Declaration of Independence (1776) declared the thirteen colonies' independence from Great Britain, articulating natural rights philosophy." },
    { text: "What was the AMERICAN REVOLUTION?", choices: mc("The war in which the thirteen colonies gained independence from Britain (1775-1783)","The Civil War","The War of 1812","The French Revolution"), answer: "A", unit: 2, skill: "G8SS-U2-S1", diff: "easy", explanation: "The American Revolution (1775-1783) was the war in which the thirteen American colonies fought for and gained independence from Great Britain." },
    { text: "What is the U.S. CONSTITUTION?", choices: mc("The supreme law of the United States establishing the framework of government","The Declaration of Independence","The Bill of Rights","The Articles of Confederation"), answer: "A", unit: 3, skill: "G8SS-U3-S1", diff: "easy", explanation: "The U.S. Constitution is the supreme law of the United States, establishing the structure and powers of the federal government." },
    { text: "What is MANIFEST DESTINY?", choices: mc("The 19th-century belief that the U.S. was destined to expand across North America","The American Revolution","The Civil War","The Louisiana Purchase"), answer: "A", unit: 4, skill: "G8SS-U4-S1", diff: "medium", explanation: "Manifest Destiny was the 19th-century belief that the United States was destined to expand across the entire North American continent." },
    { text: "What was the CIVIL WAR?", choices: mc("The war between the Union (North) and Confederacy (South) over slavery and states' rights (1861-1865)","The American Revolution","The War of 1812","The Mexican-American War"), answer: "A", unit: 5, skill: "G8SS-U5-S1", diff: "easy", explanation: "The Civil War (1861-1865) was fought between the Union (Northern states) and the Confederacy (Southern states) primarily over slavery and states' rights." },
    { text: "What was the EMANCIPATION PROCLAMATION?", choices: mc("Lincoln's 1863 executive order declaring enslaved people in Confederate states free","The 13th Amendment","The Bill of Rights","The Declaration of Independence"), answer: "A", unit: 5, skill: "G8SS-U5-S2", diff: "medium", explanation: "The Emancipation Proclamation (1863) was President Lincoln's executive order declaring enslaved people in Confederate states to be free." },
    { text: "What was RECONSTRUCTION?", choices: mc("The period after the Civil War when the South was rebuilt and formerly enslaved people gained rights","The period before the Civil War","The American Revolution","The Progressive Era"), answer: "A", unit: 5, skill: "G8SS-U5-S3", diff: "medium", explanation: "Reconstruction (1865-1877) was the period after the Civil War when the federal government worked to rebuild the South and integrate formerly enslaved people as citizens." },
    { text: "What was the INDUSTRIAL REVOLUTION in America?", choices: mc("The shift from agricultural to industrial production using machines and factories in the 19th century","The American Revolution","The Civil War","The Progressive Era"), answer: "A", unit: 6, skill: "G8SS-U6-S1", diff: "easy", explanation: "The Industrial Revolution in America transformed the economy from agricultural to industrial, with factories, railroads, and urbanization in the 19th century." },
    { text: "What was the PROGRESSIVE ERA?", choices: mc("A period of social and political reform in the U.S. (1890s-1920s)","The Civil War era","The Reconstruction era","The Industrial Revolution"), answer: "A", unit: 7, skill: "G8SS-U7-S1", diff: "medium", explanation: "The Progressive Era (1890s-1920s) was a period of widespread social activism and political reform addressing industrialization's negative effects." },
    { text: "What was WORLD WAR I?", choices: mc("A global conflict (1914-1918) triggered by the assassination of Archduke Franz Ferdinand","A conflict between the U.S. and Mexico","The American Civil War","A conflict in the Pacific"), answer: "A", unit: 8, skill: "G8SS-U8-S1", diff: "easy", explanation: "World War I (1914-1918) was a global conflict triggered by the assassination of Archduke Franz Ferdinand, involving the Allied Powers and Central Powers." },
    { text: "What was the GREAT DEPRESSION?", choices: mc("A severe worldwide economic downturn (1929-1939) following the stock market crash","A period of economic growth","A type of war","A type of political movement"), answer: "A", unit: 8, skill: "G8SS-U8-S2", diff: "medium", explanation: "The Great Depression (1929-1939) was a severe worldwide economic depression triggered by the U.S. stock market crash of 1929." },
    { text: "What was the NEW DEAL?", choices: mc("FDR's programs to provide relief, recovery, and reform during the Great Depression","A type of trade agreement","A type of constitutional amendment","A type of military strategy"), answer: "A", unit: 8, skill: "G8SS-U8-S2", diff: "medium", explanation: "The New Deal was President Franklin D. Roosevelt's series of programs and reforms (1933-1939) designed to provide relief, recovery, and reform during the Great Depression." },
    { text: "What is SEPARATION OF POWERS?", choices: mc("The division of government into legislative, executive, and judicial branches","A type of democracy","A type of federalism","A type of amendment"), answer: "A", unit: 3, skill: "G8SS-U3-S2", diff: "easy", explanation: "Separation of powers divides government authority among three branches: legislative (makes laws), executive (enforces laws), and judicial (interprets laws)." },
    { text: "What was the TRAIL OF TEARS?", choices: mc("The forced relocation of Native American tribes from the Southeast to Oklahoma (1830s)","A battle in the Civil War","A route used during Manifest Destiny","A type of trade route"), answer: "A", unit: 4, skill: "G8SS-U4-S2", diff: "medium", explanation: "The Trail of Tears (1830s) was the forced relocation of Cherokee and other Native American tribes from their homelands to Indian Territory (Oklahoma)." },
    { text: "What was the LOUISIANA PURCHASE?", choices: mc("The U.S. purchase of land from France in 1803 that doubled the country's size","The purchase of Alaska","The purchase of Florida","The annexation of Texas"), answer: "A", unit: 4, skill: "G8SS-U4-S1", diff: "medium", explanation: "The Louisiana Purchase (1803) was the acquisition of approximately 828,000 square miles of territory from France, doubling the size of the United States." },
    { text: "What is the 13th AMENDMENT?", choices: mc("The amendment abolishing slavery in the United States (1865)","The amendment granting women the right to vote","The amendment granting citizenship to formerly enslaved people","The Bill of Rights"), answer: "A", unit: 5, skill: "G8SS-U5-S3", diff: "easy", explanation: "The 13th Amendment (1865) abolished slavery and involuntary servitude in the United States." },
    { text: "What is the 14th AMENDMENT?", choices: mc("The amendment granting citizenship and equal protection to all persons born in the U.S. (1868)","The amendment abolishing slavery","The amendment granting women the right to vote","The Bill of Rights"), answer: "A", unit: 5, skill: "G8SS-U5-S3", diff: "medium", explanation: "The 14th Amendment (1868) granted citizenship to all persons born or naturalized in the U.S. and guaranteed equal protection under the law." },
    { text: "What is the 19th AMENDMENT?", choices: mc("The amendment granting women the right to vote (1920)","The amendment abolishing slavery","The amendment granting citizenship to formerly enslaved people","The Bill of Rights"), answer: "A", unit: 7, skill: "G8SS-U7-S2", diff: "medium", explanation: "The 19th Amendment (1920) granted women the right to vote in the United States." },
    { text: "What was the MEXICAN-AMERICAN WAR?", choices: mc("A war (1846-1848) resulting in the U.S. gaining the Southwest from Mexico","The American Revolution","The Civil War","The War of 1812"), answer: "A", unit: 4, skill: "G8SS-U4-S3", diff: "medium", explanation: "The Mexican-American War (1846-1848) resulted in the U.S. gaining approximately 500,000 square miles of territory from Mexico." },
    { text: "What is CHECKS AND BALANCES?", choices: mc("The system where each branch of government can limit the powers of the other branches","A type of democracy","A type of federalism","A type of amendment"), answer: "A", unit: 3, skill: "G8SS-U3-S2", diff: "medium", explanation: "Checks and balances is the system where each branch of government has powers to limit and oversee the other branches." },
    { text: "What was the BOSTON TEA PARTY?", choices: mc("A 1773 protest where colonists dumped British tea into Boston Harbor to protest taxation","A British tax","A colonial assembly","The first battle of the Revolution"), answer: "A", unit: 2, skill: "G8SS-U2-S2", diff: "easy", explanation: "The Boston Tea Party (1773) was a protest by colonists who dumped 342 chests of British tea into Boston Harbor to protest taxation without representation." },
    { text: "What was the CONSTITUTIONAL CONVENTION (1787)?", choices: mc("The meeting where delegates drafted the U.S. Constitution","The meeting that declared independence","The first meeting of Congress","The meeting that created the Bill of Rights"), answer: "A", unit: 3, skill: "G8SS-U3-S1", diff: "medium", explanation: "The Constitutional Convention (1787) was the meeting in Philadelphia where delegates drafted the United States Constitution." },
    { text: "What is ABOLITIONISM?", choices: mc("The movement to end slavery","The movement for women's suffrage","The movement for workers' rights","The movement for Native American rights"), answer: "A", unit: 5, skill: "G8SS-U5-S1", diff: "easy", explanation: "Abolitionism was the movement to end slavery, gaining momentum in the United States in the early 19th century." },
    { text: "What was the UNDERGROUND RAILROAD?", choices: mc("A secret network of routes and safe houses helping enslaved people escape to freedom","An actual railroad system","A type of trade route","A type of communication system"), answer: "A", unit: 5, skill: "G8SS-U5-S2", diff: "easy", explanation: "The Underground Railroad was a secret network of routes, safe houses, and people who helped enslaved African Americans escape to free states and Canada." },
    { text: "What is POPULAR SOVEREIGNTY?", choices: mc("The principle that government authority derives from the consent of the people","A type of federalism","A type of checks and balances","A type of amendment"), answer: "A", unit: 3, skill: "G8SS-U3-S3", diff: "medium", explanation: "Popular sovereignty is the principle that the authority of government is created and sustained by the consent of its people." },
    { text: "What was the BILL OF RIGHTS?", choices: mc("The first ten amendments to the U.S. Constitution protecting individual freedoms","The U.S. Constitution","The Declaration of Independence","The Federalist Papers"), answer: "A", unit: 3, skill: "G8SS-U3-S2", diff: "easy", explanation: "The Bill of Rights consists of the first ten amendments to the U.S. Constitution, protecting fundamental individual rights and liberties." },
    { text: "What is FEDERALISM?", choices: mc("A system of government where power is shared between national and state governments","A type of democracy","A type of separation of powers","A type of checks and balances"), answer: "A", unit: 3, skill: "G8SS-U3-S3", diff: "medium", explanation: "Federalism is a system of government that divides power between a central (national) government and regional (state) governments." },
    { text: "What was the GREAT COMPROMISE?", choices: mc("The agreement creating a bicameral Congress with the Senate and House of Representatives","The Bill of Rights","The Declaration of Independence","The Emancipation Proclamation"), answer: "A", unit: 3, skill: "G8SS-U3-S1", diff: "medium", explanation: "The Great Compromise (1787) created a bicameral legislature with the Senate (equal representation) and House of Representatives (proportional representation)." },
  ];
}

function getGr8TechDiag() {
  return [
    { text: "What is a FUNCTION in programming?", choices: mc("A reusable block of code that performs a specific task","A type of variable","A loop structure","A data type"), answer: "A", unit: 2, skill: "G8TECH-U2-S1", diff: "easy", explanation: "A function is a named, reusable block of code designed to perform a specific task." },
    { text: "What is an ARRAY?", choices: mc("A data structure that stores multiple values in a single variable","A type of loop","A function","A conditional statement"), answer: "A", unit: 2, skill: "G8TECH-U2-S2", diff: "easy", explanation: "An array is a data structure that stores a collection of values, accessible by index." },
    { text: "What is DESIGN THINKING?", choices: mc("A human-centered problem-solving approach with empathize, define, ideate, prototype, test stages","A type of programming","A software tool","A type of hardware"), answer: "A", unit: 3, skill: "G8TECH-U3-S1", diff: "easy", explanation: "Design thinking is a human-centered approach to innovation that draws from the designer's toolkit." },
    { text: "What is DATA SCIENCE?", choices: mc("The field that uses scientific methods to extract knowledge from data","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 4, skill: "G8TECH-U4-S1", diff: "easy", explanation: "Data science combines statistics, programming, and domain expertise to extract insights from data." },
    { text: "What is CYBERSECURITY?", choices: mc("The practice of protecting systems, networks, and data from digital attacks","A type of programming language","A type of hardware","A type of software"), answer: "A", unit: 5, skill: "G8TECH-U5-S1", diff: "easy", explanation: "Cybersecurity involves protecting computer systems, networks, and data from unauthorized access or attacks." },
    { text: "What is ENCRYPTION?", choices: mc("Converting data into a coded form to prevent unauthorized access","A type of virus","A type of network","A type of software"), answer: "A", unit: 5, skill: "G8TECH-U5-S2", diff: "medium", explanation: "Encryption converts data into a coded format that can only be read by someone with the correct decryption key." },
    { text: "What is ENTREPRENEURSHIP?", choices: mc("The process of starting and running a new business venture","A type of programming","A type of network","A type of hardware"), answer: "A", unit: 6, skill: "G8TECH-U6-S1", diff: "easy", explanation: "Entrepreneurship is the process of designing, launching, and running a new business or venture." },
    { text: "What is DEBUGGING?", choices: mc("The process of finding and fixing errors in code","Writing new code","Running a program","A type of data structure"), answer: "A", unit: 2, skill: "G8TECH-U2-S3", diff: "easy", explanation: "Debugging is the systematic process of identifying and removing bugs (errors) from computer code." },
    { text: "What is USER EXPERIENCE (UX)?", choices: mc("How a person feels when using a product or service","The visual design of an app","The code behind an app","The hardware running an app"), answer: "A", unit: 3, skill: "G8TECH-U3-S2", diff: "easy", explanation: "User experience (UX) refers to the overall experience a person has when interacting with a product." },
    { text: "What is DATA VISUALIZATION?", choices: mc("Representing data graphically to reveal patterns and insights","Storing data in a database","Collecting data from surveys","Writing code to process data"), answer: "A", unit: 4, skill: "G8TECH-U4-S2", diff: "easy", explanation: "Data visualization is the graphical representation of data to help people understand patterns and trends." },
    { text: "What is DIGITAL LEADERSHIP?", choices: mc("Using technology responsibly to positively influence others and create change","A type of programming","A type of hardware","A type of network"), answer: "A", unit: 1, skill: "G8TECH-U1-S1", diff: "easy", explanation: "Digital leadership means using technology skills and platforms to positively influence others, solve problems, and create meaningful change." },
    { text: "What is INTELLECTUAL PROPERTY?", choices: mc("Creative works protected by copyright, trademark, or patent law","Physical property owned by a company","A type of computer hardware","A programming language"), answer: "A", unit: 1, skill: "G8TECH-U1-S2", diff: "easy", explanation: "Intellectual property refers to creations of the mind — inventions, literary works, art — protected by law." },
    { text: "What is a FIREWALL?", choices: mc("A security system that monitors and controls network traffic","A type of virus","A type of hardware","A programming language"), answer: "A", unit: 5, skill: "G8TECH-U5-S3", diff: "medium", explanation: "A firewall is a network security device that monitors and filters incoming and outgoing network traffic." },
    { text: "What is ITERATION in software development?", choices: mc("The process of repeatedly building, testing, and improving software","Creating a final product in one step","Writing code without testing","Testing without building"), answer: "A", unit: 3, skill: "G8TECH-U3-S3", diff: "medium", explanation: "Iteration in software development means repeatedly building, testing, and refining software based on feedback and testing results." },
    { text: "What is a VALUE PROPOSITION?", choices: mc("The unique benefit a product or service offers to customers","A type of code","A type of network","A type of hardware"), answer: "A", unit: 6, skill: "G8TECH-U6-S2", diff: "medium", explanation: "A value proposition is a clear statement that explains how a product solves a problem or improves a situation for customers." },
    { text: "What is MEAN in statistics?", choices: mc("The average of a set of numbers","The middle value in a data set","The most frequent value","The difference between highest and lowest values"), answer: "A", unit: 4, skill: "G8TECH-U4-S3", diff: "easy", explanation: "The mean is the arithmetic average, calculated by adding all values and dividing by the count." },
    { text: "What is PHISHING?", choices: mc("A cyberattack that tricks users into revealing sensitive information","A type of programming","A type of network","A type of hardware"), answer: "A", unit: 5, skill: "G8TECH-U5-S2", diff: "medium", explanation: "Phishing is a type of social engineering attack that tricks users into providing sensitive information through deceptive emails or websites." },
    { text: "What is OPEN SOURCE?", choices: mc("Software with publicly available source code that anyone can modify and distribute","Software that costs money","Software owned by a company","Software that cannot be modified"), answer: "A", unit: 6, skill: "G8TECH-U6-S3", diff: "medium", explanation: "Open source software has its source code publicly available, allowing anyone to view, modify, and distribute it." },
    { text: "What is ARTIFICIAL INTELLIGENCE (AI)?", choices: mc("Computer systems that perform tasks that typically require human intelligence","A type of robot","A type of programming language","A type of hardware"), answer: "A", unit: 6, skill: "G8TECH-U6-S1", diff: "medium", explanation: "Artificial intelligence (AI) refers to computer systems designed to perform tasks that typically require human intelligence." },
    { text: "What is a PROTOTYPE?", choices: mc("An early model of a product used to test concepts","A finished product","A type of code","A type of database"), answer: "A", unit: 3, skill: "G8TECH-U3-S1", diff: "easy", explanation: "A prototype is an early sample or model built to test a concept or process before the final product is created." },
    { text: "What is DIGITAL MARKETING?", choices: mc("Promoting products or services using digital channels like social media and websites","A type of programming","A type of hardware","A type of network"), answer: "A", unit: 6, skill: "G8TECH-U6-S2", diff: "easy", explanation: "Digital marketing uses online channels — social media, email, search engines — to promote products and services." },
    { text: "What is MACHINE LEARNING?", choices: mc("A type of AI where systems learn from data without being explicitly programmed","A type of robot programming","A type of database management","A type of network security"), answer: "A", unit: 6, skill: "G8TECH-U6-S1", diff: "medium", explanation: "Machine learning is a subset of AI where algorithms learn from data to improve their performance without being explicitly programmed." },
    { text: "What is ERROR HANDLING?", choices: mc("Code that manages and responds to runtime errors gracefully","A type of variable","A loop structure","A data type"), answer: "A", unit: 2, skill: "G8TECH-U2-S3", diff: "medium", explanation: "Error handling is the process of anticipating, detecting, and resolving errors in a program to prevent crashes." },
    { text: "What is a PARAMETER?", choices: mc("A variable passed into a function","A type of loop","A data type","A conditional statement"), answer: "A", unit: 2, skill: "G8TECH-U2-S2", diff: "easy", explanation: "A parameter is a variable in a function definition that receives a value when the function is called." },
    { text: "What is NETWORK SECURITY?", choices: mc("Practices and technologies that protect a network from unauthorized access and attacks","A type of programming language","A type of hardware","A type of software"), answer: "A", unit: 5, skill: "G8TECH-U5-S3", diff: "medium", explanation: "Network security encompasses practices, policies, and technologies designed to protect computer networks from unauthorized access, misuse, or attacks." },
    { text: "What is a PITCH DECK?", choices: mc("A presentation used to communicate a business idea to potential investors or stakeholders","A type of code","A type of network","A type of hardware"), answer: "A", unit: 6, skill: "G8TECH-U6-S3", diff: "medium", explanation: "A pitch deck is a brief presentation used to provide an overview of a business plan to potential investors, partners, or customers." },
    { text: "What is DIGITAL ETHICS?", choices: mc("The principles guiding responsible behavior in digital environments","A type of programming","A type of hardware","A type of network"), answer: "A", unit: 1, skill: "G8TECH-U1-S3", diff: "medium", explanation: "Digital ethics refers to the moral principles and standards that guide responsible behavior in digital environments." },
    { text: "What is a DATASET?", choices: mc("A collection of related data organized for analysis","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 4, skill: "G8TECH-U4-S1", diff: "easy", explanation: "A dataset is a structured collection of related data, typically organized in a table format for analysis." },
    { text: "What is SOCIAL ENGINEERING in cybersecurity?", choices: mc("Manipulating people into revealing confidential information or taking harmful actions","A type of programming","A type of hardware","A type of network"), answer: "A", unit: 5, skill: "G8TECH-U5-S1", diff: "medium", explanation: "Social engineering is the psychological manipulation of people into performing actions or divulging confidential information." },
    { text: "What is a CAREER IN TECHNOLOGY?", choices: mc("A professional role that uses technology skills to solve problems and create products","A type of programming language","A type of hardware","A type of network"), answer: "A", unit: 6, skill: "G8TECH-U6-S3", diff: "easy", explanation: "Technology careers span software development, cybersecurity, data science, UX design, AI, and many other fields." },
  ];
}

// ─── Finalize ─────────────────────────────────────────────────────────────────
await db.end();
console.log("\n✅ All Grades 6–8 courses seeded successfully!");
