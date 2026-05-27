/**
 * seed-katy-kap-sci-ss.mjs
 * Seeds KAP Science and KAP Social Studies variants for Grades 6, 7, and 8.
 * These are advanced (KAP) pathways with enriched content, deeper analysis,
 * and more rigorous assessments aligned to Katy ISD KAP standards.
 * Excludes PE, Music, and Band.
 */
import mysql from "mysql2/promise";
const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function insertCourse(code, title, subject, grade, description, teks, sortOrder) {
  await db.execute(
    `INSERT INTO courses (courseCode, title, subject, gradeLevel, description, teksCode, isActive, isDefault, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, true, false, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description)`,
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
async function insertDiagQ(courseId, questionId, text, choices, answer, mapsToUnit, difficulty, explanation, sortOrder) {
  await db.execute(
    `INSERT INTO diagnosticQuestions (courseId, questionId, questionText, questionType, choices, correctAnswer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder)
     VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, '[]', ?, ?, ?)
     ON DUPLICATE KEY UPDATE questionText=VALUES(questionText)`,
    [courseId, questionId, text, JSON.stringify(choices), answer, mapsToUnit, difficulty, explanation, sortOrder]
  );
}
function mc(a, b, c, d) { return [{ label: "A", text: a }, { label: "B", text: b }, { label: "C", text: c }, { label: "D", text: d }]; }

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 6 — KAP SCIENCE
// ═══════════════════════════════════════════════════════════════════════════════
async function seedG6KAPSci() {
  console.log("Seeding Grade 6 KAP Science...");
  const cid = await insertCourse("G6KAPSCI", "Grade 6 KAP Science", "science", "6",
    "Katy ISD Grade 6 KAP Science is an advanced pathway that deepens understanding of matter, energy, Earth systems, and life science through inquiry-based investigations, data analysis, and scientific reasoning. Students engage with complex phenomena and apply STEM thinking to real-world problems.",
    "TEKS 6 Science KAP", 361);

  const units = [
    [1, "Scientific Investigation & STEM Thinking", "Advanced scientific methods, experimental design, data analysis, and STEM applications.", "TEKS 6.1-6.3"],
    [2, "Properties of Matter & Atomic Structure", "Atomic theory, periodic table trends, physical and chemical properties, and changes in matter.", "TEKS 6.5"],
    [3, "Energy Transformations", "Forms of energy, conservation of energy, heat transfer, and energy in Earth systems.", "TEKS 6.9"],
    [4, "Earth's Layers & Plate Tectonics", "Earth's structure, plate boundaries, earthquakes, volcanoes, and rock cycle.", "TEKS 6.10"],
    [5, "Weathering, Erosion & Soil Science", "Mechanical and chemical weathering, erosion, deposition, and soil formation.", "TEKS 6.11"],
    [6, "Ecosystems & Biodiversity", "Ecosystem dynamics, food webs, energy flow, biomes, and biodiversity conservation.", "TEKS 6.12"],
    [7, "Cells & Life Processes", "Cell theory, organelles, cell processes, and the connection between structure and function.", "TEKS 6.12"],
    [8, "Space Science & Earth in the Universe", "Solar system, moon phases, tides, seasons, and Earth's place in the universe.", "TEKS 6.11"],
  ];

  for (const [num, title, overview, teks] of units) {
    const uid = await insertUnit(cid, num, title, overview, teks, num);
    const skillBase = (num - 1) * 3 + 1;
    const skills = [
      [`G6KAPSCI-U${num}-S1`, `${title} — Core Concepts`],
      [`G6KAPSCI-U${num}-S2`, `${title} — Analysis & Application`],
      [`G6KAPSCI-U${num}-S3`, `${title} — Inquiry & Investigation`],
    ];
    for (let i = 0; i < skills.length; i++) {
      await insertSkill(cid, skills[i][0], skills[i][1], uid, num, skillBase + i);
    }
    // 5 quiz questions per unit
    const qData = getG6KAPSciQuiz(num);
    for (let i = 0; i < qData.length; i++) {
      await insertQuizQ(cid, uid, qData[i][0], qData[i][1], qData[i][2], qData[i][3], skills[i % 3][0], i < 2 ? 'medium' : 'hard', i + 1);
    }
  }
  // 30 diagnostic questions
  const diagQs = getG6KAPSciDiag();
  for (const q of diagQs) await insertDiagQ(cid, ...q);
  console.log("Grade 6 KAP Science done.");
}

function getG6KAPSciQuiz(unit) {
  const banks = {
    1: [
      ["What is a controlled variable in an experiment?", mc("A variable that changes", "A variable that is kept constant to ensure a fair test", "The measured outcome", "The independent variable"), "B", "A controlled variable is kept constant to ensure only one variable changes."],
      ["What does a hypothesis do?", mc("Summarises results", "States a testable prediction based on prior knowledge", "Describes the procedure", "Lists materials"), "B", "A hypothesis is a testable prediction based on prior knowledge."],
      ["Which graph type best shows change over time?", mc("Bar graph", "Pie chart", "Line graph", "Scatter plot"), "C", "Line graphs show how a variable changes over time."],
      ["What is the purpose of a control group?", mc("To test the independent variable", "To provide a baseline for comparison", "To measure the dependent variable", "To list the materials"), "B", "A control group provides a baseline for comparison."],
      ["What does 'reproducible results' mean in science?", mc("Results that are always perfect", "Results that can be consistently repeated by others", "Results that are published", "Results that agree with the hypothesis"), "B", "Reproducible results can be consistently repeated by independent researchers."],
    ],
    2: [
      ["What is the difference between a physical and chemical change?", mc("Physical changes alter composition; chemical changes do not", "Chemical changes alter composition; physical changes do not", "They are the same", "Physical changes are permanent"), "B", "Chemical changes alter the chemical composition; physical changes do not."],
      ["What is the periodic table organised by?", mc("Alphabetical order", "Atomic number (number of protons)", "Atomic mass", "Reactivity"), "B", "The periodic table is organised by increasing atomic number."],
      ["What are the three subatomic particles?", mc("Protons, neutrons, electrons", "Protons, neutrons, photons", "Electrons, neutrons, quarks", "Protons, electrons, ions"), "A", "Atoms consist of protons, neutrons, and electrons."],
      ["What is a compound?", mc("A pure element", "A substance made of two or more elements chemically combined", "A mixture", "A type of atom"), "B", "A compound is two or more elements chemically bonded together."],
      ["What happens to atoms in a chemical reaction?", mc("They are created", "They are destroyed", "They are rearranged to form new substances", "They change into different elements"), "C", "In chemical reactions, atoms are rearranged — not created or destroyed."],
    ],
    3: [
      ["What is the law of conservation of energy?", mc("Energy is created in reactions", "Energy cannot be created or destroyed, only transformed", "Energy is destroyed in reactions", "Energy always increases"), "B", "Energy cannot be created or destroyed — it is transformed from one form to another."],
      ["What type of heat transfer occurs through direct contact?", mc("Convection", "Radiation", "Conduction", "Insulation"), "C", "Conduction transfers heat through direct contact between materials."],
      ["What is kinetic energy?", mc("Stored energy", "Energy of motion", "Chemical energy", "Nuclear energy"), "B", "Kinetic energy is the energy an object has due to its motion."],
      ["What is potential energy?", mc("Energy of motion", "Stored energy based on position or condition", "Thermal energy", "Electrical energy"), "B", "Potential energy is stored energy due to position or condition."],
      ["How does a solar panel transform energy?", mc("Chemical to electrical", "Light (solar) to electrical", "Thermal to mechanical", "Nuclear to thermal"), "B", "Solar panels convert light energy into electrical energy."],
    ],
    4: [
      ["What are the three types of plate boundaries?", mc("Convergent, divergent, transform", "Subduction, collision, spreading", "Continental, oceanic, mixed", "Active, passive, neutral"), "A", "The three plate boundary types are convergent, divergent, and transform."],
      ["What causes earthquakes?", mc("Volcanic eruptions", "The movement and collision of tectonic plates", "Ocean currents", "Atmospheric pressure"), "B", "Earthquakes are caused by the movement and collision of tectonic plates."],
      ["What is the Richter scale?", mc("A scale for measuring volcanic eruptions", "A scale for measuring earthquake magnitude", "A scale for measuring ocean depth", "A scale for measuring wind speed"), "B", "The Richter scale measures the magnitude (energy) of earthquakes."],
      ["What is a divergent boundary?", mc("Where plates collide", "Where plates move apart", "Where plates slide past each other", "Where subduction occurs"), "B", "At divergent boundaries, tectonic plates move apart."],
      ["What is the rock cycle?", mc("The process of rock formation only", "The continuous process by which rocks are formed, changed, and reformed", "The classification of rocks", "The erosion of rocks"), "B", "The rock cycle describes the continuous transformation of rocks between types."],
    ],
    5: [
      ["What is the difference between mechanical and chemical weathering?", mc("Mechanical changes composition; chemical does not", "Chemical changes composition; mechanical breaks rock into smaller pieces without changing composition", "They are the same", "Mechanical is faster"), "B", "Chemical weathering changes rock composition; mechanical weathering breaks rock physically."],
      ["What is erosion?", mc("The breaking down of rock", "The movement of weathered material by wind, water, or ice", "The deposition of sediment", "The formation of soil"), "B", "Erosion is the movement of weathered material by agents like wind, water, or ice."],
      ["What is deposition?", mc("The breaking down of rock", "The movement of sediment", "The settling of transported material in a new location", "The formation of soil"), "C", "Deposition occurs when transported material settles in a new location."],
      ["What is humus in soil?", mc("A type of mineral", "Decomposed organic matter that enriches soil", "A type of clay", "A layer of rock"), "B", "Humus is decomposed organic matter that adds nutrients to soil."],
      ["What is a delta?", mc("A type of mountain", "A landform created by sediment deposited where a river meets a body of water", "A type of canyon", "A type of valley"), "B", "A delta forms where a river deposits sediment as it enters a larger body of water."],
    ],
    6: [
      ["What is the difference between a food chain and a food web?", mc("They are the same", "A food chain is linear; a food web shows multiple interconnected feeding relationships", "A food web is linear; a food chain is complex", "A food chain includes decomposers; a food web does not"), "B", "A food chain is linear; a food web shows complex, interconnected feeding relationships."],
      ["What is a keystone species?", mc("The most numerous species", "A species that has a disproportionately large effect on its ecosystem", "The largest predator", "A species at the base of the food chain"), "B", "A keystone species has a disproportionately large impact on its ecosystem."],
      ["What is biodiversity and why is it important?", mc("The number of individuals in a species; important for population size", "The variety of species in an ecosystem; important for ecosystem stability", "The number of ecosystems; important for climate", "The genetic similarity; important for reproduction"), "B", "Biodiversity is the variety of species; it is crucial for ecosystem stability and resilience."],
      ["What is an invasive species?", mc("A native species", "A non-native species that disrupts the ecosystem", "An endangered species", "A keystone species"), "B", "An invasive species is non-native and disrupts the native ecosystem."],
      ["What is carrying capacity?", mc("The maximum speed of an organism", "The maximum population size an environment can sustain", "The minimum population size", "The energy available in an ecosystem"), "B", "Carrying capacity is the maximum population size an environment can sustainably support."],
    ],
    7: [
      ["What is the cell theory?", mc("Cells are made of atoms", "All living things are made of cells, cells are the basic unit of life, and all cells come from existing cells", "Cells have a nucleus", "Cells produce energy"), "B", "Cell theory: all living things are made of cells; cells are the basic unit; all cells come from existing cells."],
      ["What is the function of the cell membrane?", mc("To produce energy", "To control what enters and exits the cell", "To store DNA", "To synthesise proteins"), "B", "The cell membrane controls what enters and exits the cell (selective permeability)."],
      ["What is the difference between a plant and animal cell?", mc("Animal cells have a cell wall; plant cells do not", "Plant cells have a cell wall and chloroplasts; animal cells do not", "They are identical", "Plant cells have a nucleus; animal cells do not"), "B", "Plant cells have a cell wall and chloroplasts; animal cells lack these structures."],
      ["What is diffusion?", mc("Active transport across a membrane", "The movement of molecules from high to low concentration", "The movement of water across a membrane", "Cell division"), "B", "Diffusion is the movement of molecules from high to low concentration."],
      ["What is the role of the nucleus?", mc("Energy production", "Protein synthesis", "Control centre — stores DNA and directs cell activities", "Waste removal"), "C", "The nucleus is the control centre of the cell, storing DNA and directing cell activities."],
    ],
    8: [
      ["What causes the seasons on Earth?", mc("Earth's distance from the Sun", "Earth's axial tilt as it orbits the Sun", "The Moon's gravity", "Solar flares"), "B", "Seasons are caused by Earth's axial tilt (23.5°) as it orbits the Sun."],
      ["What causes the phases of the Moon?", mc("Earth's shadow on the Moon", "The Moon's rotation", "The changing angle of sunlight on the Moon as it orbits Earth", "The Moon's distance from Earth"), "C", "Moon phases result from the changing angle of sunlight on the Moon as it orbits Earth."],
      ["What is a solar eclipse?", mc("The Moon passes through Earth's shadow", "The Moon passes between Earth and the Sun, blocking sunlight", "Earth passes between the Moon and Sun", "The Sun is blocked by clouds"), "B", "A solar eclipse occurs when the Moon passes between Earth and the Sun."],
      ["What is the difference between rotation and revolution?", mc("Rotation is orbiting; revolution is spinning", "Rotation is spinning on an axis; revolution is orbiting another body", "They are the same", "Rotation causes seasons; revolution causes day/night"), "B", "Rotation = spinning on an axis; revolution = orbiting another body."],
      ["What is a light-year?", mc("The time it takes light to travel to the Sun", "The distance light travels in one year (~9.46 × 10¹² km)", "The brightness of a star", "The age of a star"), "B", "A light-year is the distance light travels in one year (~9.46 × 10¹² km)."],
    ],
  };
  return banks[unit] || [];
}

function getG6KAPSciDiag() {
  return [
    ["G6KAPSCI-D001", "What is the independent variable in an experiment?", mc("The variable that is measured", "The variable that is deliberately changed", "The variable that is kept constant", "The control group"), "B", "prerequisite", "easy", "The independent variable is deliberately changed by the experimenter.", 1],
    ["G6KAPSCI-D002", "What is the dependent variable?", mc("The variable that is changed", "The variable that is measured as a result of the independent variable", "The control variable", "The hypothesis"), "B", "prerequisite", "easy", "The dependent variable is measured to see the effect of the independent variable.", 2],
    ["G6KAPSCI-D003", "What does 'matter' refer to in science?", mc("Energy", "Anything that has mass and takes up space", "Only solids", "Living things only"), "B", "prerequisite", "easy", "Matter is anything that has mass and occupies space.", 3],
    ["G6KAPSCI-D004", "What is an atom?", mc("The smallest unit of a compound", "The smallest unit of an element that retains its chemical properties", "A type of molecule", "A subatomic particle"), "B", "2", "easy", "An atom is the smallest unit of an element that retains its chemical properties.", 4],
    ["G6KAPSCI-D005", "What is an element?", mc("A mixture of substances", "A pure substance made of only one type of atom", "A compound", "A molecule"), "B", "2", "easy", "An element is a pure substance made of only one type of atom.", 5],
    ["G6KAPSCI-D006", "What is kinetic energy?", mc("Stored energy", "Energy of motion", "Chemical energy", "Nuclear energy"), "B", "3", "easy", "Kinetic energy is the energy of motion.", 6],
    ["G6KAPSCI-D007", "What is conduction?", mc("Heat transfer through fluid movement", "Heat transfer through direct contact", "Heat transfer through electromagnetic waves", "Heat transfer through convection"), "B", "3", "easy", "Conduction transfers heat through direct contact.", 7],
    ["G6KAPSCI-D008", "What are tectonic plates?", mc("Layers of the atmosphere", "Large sections of Earth's crust and upper mantle that move", "Ocean floor features", "Types of rocks"), "B", "4", "easy", "Tectonic plates are large sections of Earth's lithosphere that move.", 8],
    ["G6KAPSCI-D009", "What is a volcano?", mc("A type of earthquake", "An opening in Earth's crust through which magma, gases, and ash erupt", "A type of mountain formed by erosion", "A type of plate boundary"), "B", "4", "easy", "A volcano is an opening in Earth's crust through which magma erupts.", 9],
    ["G6KAPSCI-D010", "What is weathering?", mc("The movement of rock", "The breaking down of rock by physical or chemical processes", "The deposition of sediment", "The formation of mountains"), "B", "5", "easy", "Weathering is the breaking down of rock by physical or chemical processes.", 10],
    ["G6KAPSCI-D011", "What is a producer in an ecosystem?", mc("An organism that eats other organisms", "An organism that makes its own food through photosynthesis", "A decomposer", "A consumer"), "B", "6", "easy", "Producers (plants) make their own food through photosynthesis.", 11],
    ["G6KAPSCI-D012", "What is a consumer?", mc("An organism that makes its own food", "An organism that obtains energy by eating other organisms", "A decomposer", "A producer"), "B", "6", "easy", "Consumers obtain energy by eating other organisms.", 12],
    ["G6KAPSCI-D013", "What is the function of the mitochondria?", mc("Protein synthesis", "Energy production (ATP)", "DNA storage", "Cell division"), "B", "7", "easy", "Mitochondria produce ATP through cellular respiration.", 13],
    ["G6KAPSCI-D014", "What is photosynthesis?", mc("The process of cellular respiration", "The process by which plants convert sunlight, CO₂, and water into glucose and oxygen", "The process of cell division", "The process of protein synthesis"), "B", "7", "easy", "Photosynthesis converts sunlight, CO₂, and water into glucose and oxygen.", 14],
    ["G6KAPSCI-D015", "What causes day and night?", mc("Earth's revolution around the Sun", "Earth's rotation on its axis", "The Moon's orbit", "The Sun's movement"), "B", "8", "easy", "Day and night are caused by Earth's rotation on its axis.", 15],
    ["G6KAPSCI-D016", "What is the difference between a physical and chemical change?", mc("Physical changes alter composition; chemical changes do not", "Chemical changes alter composition; physical changes do not", "They are the same", "Physical changes are permanent"), "B", "2", "medium", "Chemical changes alter chemical composition; physical changes do not.", 16],
    ["G6KAPSCI-D017", "What is the law of conservation of mass?", mc("Mass is created in reactions", "The total mass of reactants equals the total mass of products", "Mass is destroyed in reactions", "Mass increases in exothermic reactions"), "B", "2", "medium", "Conservation of mass: total mass of reactants = total mass of products.", 17],
    ["G6KAPSCI-D018", "What is the law of conservation of energy?", mc("Energy is created in reactions", "Energy cannot be created or destroyed, only transformed", "Energy is destroyed in reactions", "Energy always increases"), "B", "3", "medium", "Energy cannot be created or destroyed — only transformed.", 18],
    ["G6KAPSCI-D019", "What is a convergent plate boundary?", mc("Where plates move apart", "Where plates collide", "Where plates slide past each other", "Where subduction does not occur"), "B", "4", "medium", "At convergent boundaries, tectonic plates collide.", 19],
    ["G6KAPSCI-D020", "What is a transform plate boundary?", mc("Where plates collide", "Where plates move apart", "Where plates slide horizontally past each other", "Where subduction occurs"), "C", "4", "medium", "At transform boundaries, plates slide horizontally past each other.", 20],
    ["G6KAPSCI-D021", "What is the difference between weathering and erosion?", mc("Weathering moves material; erosion breaks it down", "Weathering breaks down rock; erosion moves the material", "They are the same", "Erosion is faster than weathering"), "B", "5", "medium", "Weathering breaks down rock; erosion moves the weathered material.", 21],
    ["G6KAPSCI-D022", "What is a food web?", mc("A single food chain", "A network of interconnected food chains in an ecosystem", "A list of producers", "A type of symbiosis"), "B", "6", "medium", "A food web shows complex, interconnected feeding relationships.", 22],
    ["G6KAPSCI-D023", "What is the difference between a plant and animal cell?", mc("Animal cells have a cell wall; plant cells do not", "Plant cells have a cell wall and chloroplasts; animal cells do not", "They are identical", "Plant cells have a nucleus; animal cells do not"), "B", "7", "medium", "Plant cells have a cell wall and chloroplasts; animal cells lack these.", 23],
    ["G6KAPSCI-D024", "What causes the seasons?", mc("Earth's distance from the Sun", "Earth's axial tilt as it orbits the Sun", "The Moon's gravity", "Solar flares"), "B", "8", "medium", "Seasons are caused by Earth's 23.5° axial tilt as it orbits the Sun.", 24],
    ["G6KAPSCI-D025", "What is a lunar eclipse?", mc("The Moon passes between Earth and the Sun", "Earth passes between the Sun and Moon, casting a shadow on the Moon", "The Sun is blocked by clouds", "The Moon disappears"), "B", "8", "medium", "A lunar eclipse occurs when Earth's shadow falls on the Moon.", 25],
    ["G6KAPSCI-D026", "What is the difference between a mixture and a compound?", mc("They are the same", "A mixture is physically combined; a compound is chemically bonded", "A compound is physically combined; a mixture is chemically bonded", "Mixtures are always liquids"), "B", "2", "hard", "Mixtures are physically combined; compounds are chemically bonded.", 26],
    ["G6KAPSCI-D027", "What is the role of decomposers in an ecosystem?", mc("They produce food", "They break down dead organic matter and recycle nutrients", "They consume producers", "They are primary consumers"), "B", "6", "medium", "Decomposers break down dead organic matter and recycle nutrients.", 27],
    ["G6KAPSCI-D028", "What is osmosis?", mc("Movement of solutes across a membrane", "Movement of water across a semi-permeable membrane from high to low concentration", "Active transport", "Cell division"), "B", "7", "hard", "Osmosis is the diffusion of water across a semi-permeable membrane.", 28],
    ["G6KAPSCI-D029", "What is the Milky Way?", mc("A type of star", "The galaxy that contains our solar system", "A constellation", "A type of nebula"), "B", "8", "easy", "The Milky Way is the galaxy that contains our solar system.", 29],
    ["G6KAPSCI-D030", "What is the difference between rotation and revolution?", mc("Rotation is orbiting; revolution is spinning", "Rotation is spinning on an axis; revolution is orbiting another body", "They are the same", "Rotation causes seasons"), "B", "8", "medium", "Rotation = spinning on an axis; revolution = orbiting another body.", 30],
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 6 — KAP SOCIAL STUDIES
// ═══════════════════════════════════════════════════════════════════════════════
async function seedG6KAPSS() {
  console.log("Seeding Grade 6 KAP Social Studies...");
  const cid = await insertCourse("G6KAPSS", "Grade 6 KAP Social Studies", "social_studies", "6",
    "Katy ISD Grade 6 KAP Social Studies is an advanced pathway exploring world cultures, geography, economics, and government through primary sources, critical analysis, and comparative studies. Students develop historical thinking skills and global awareness.",
    "TEKS 6 Social Studies KAP", 362);

  const units = [
    [1, "Geographic Tools & World Regions", "Advanced use of maps, GIS, and geographic analysis of world regions.", "TEKS 6.1-6.3"],
    [2, "Ancient Civilisations & Cultural Foundations", "Deep analysis of Mesopotamia, Egypt, Greece, Rome, and their lasting legacies.", "TEKS 6.4-6.5"],
    [3, "World Religions & Cultural Diffusion", "Comparative study of major world religions, their origins, spread, and cultural impact.", "TEKS 6.6"],
    [4, "Economic Systems & Global Trade", "Types of economic systems, supply and demand, global trade networks, and economic development.", "TEKS 6.7-6.8"],
    [5, "Government Systems & Political Philosophy", "Types of government, democracy, citizenship, and political philosophy.", "TEKS 6.9-6.10"],
    [6, "Human Rights & Global Issues", "Universal human rights, global challenges, and international organisations.", "TEKS 6.11"],
    [7, "Primary Sources & Historical Analysis", "Analysing primary and secondary sources, evaluating bias, and constructing historical arguments.", "TEKS 6.12"],
    [8, "Research, Writing & Social Studies Skills", "Research methods, argumentative writing, and presentation of social studies findings.", "TEKS 6.13"],
  ];

  for (const [num, title, overview, teks] of units) {
    const uid = await insertUnit(cid, num, title, overview, teks, num);
    const skillBase = (num - 1) * 3 + 1;
    const skills = [
      [`G6KAPSS-U${num}-S1`, `${title} — Core Concepts`],
      [`G6KAPSS-U${num}-S2`, `${title} — Analysis & Interpretation`],
      [`G6KAPSS-U${num}-S3`, `${title} — Application & Evaluation`],
    ];
    for (let i = 0; i < skills.length; i++) {
      await insertSkill(cid, skills[i][0], skills[i][1], uid, num, skillBase + i);
    }
    const qData = getG6KAPSSQuiz(num);
    for (let i = 0; i < qData.length; i++) {
      await insertQuizQ(cid, uid, qData[i][0], qData[i][1], qData[i][2], qData[i][3], skills[i % 3][0], i < 2 ? 'medium' : 'hard', i + 1);
    }
  }
  const diagQs = getG6KAPSSDiag();
  for (const q of diagQs) await insertDiagQ(cid, ...q);
  console.log("Grade 6 KAP Social Studies done.");
}

function getG6KAPSSQuiz(unit) {
  const banks = {
    1: [
      ["What is the difference between absolute and relative location?", mc("Absolute uses landmarks; relative uses coordinates", "Absolute uses coordinates; relative uses nearby features", "They are the same", "Absolute is approximate"), "B", "Absolute location uses coordinates (latitude/longitude); relative uses nearby features."],
      ["What is GIS?", mc("A type of map", "Geographic Information System — technology for capturing and analysing geographic data", "A type of compass", "A satellite"), "B", "GIS (Geographic Information System) captures, stores, and analyses geographic data."],
      ["What are the five themes of geography?", mc("Location, place, region, movement, human-environment interaction", "Latitude, longitude, climate, culture, economy", "Physical, political, economic, social, cultural", "North, south, east, west, centre"), "A", "The five themes of geography are location, place, region, movement, and human-environment interaction."],
      ["What is a thematic map?", mc("A map showing roads", "A map showing a specific theme such as population density or climate", "A political map", "A physical map"), "B", "Thematic maps show specific data themes like population, climate, or resources."],
      ["What is the difference between a physical and political map?", mc("Physical shows borders; political shows landforms", "Physical shows landforms; political shows borders and countries", "They are the same", "Physical maps are older"), "B", "Physical maps show landforms; political maps show borders and countries."],
    ],
    2: [
      ["What was the significance of the Fertile Crescent?", mc("It was the first democracy", "It was the cradle of early civilisations due to its fertile land between rivers", "It was the location of the first empire", "It was a trade route"), "B", "The Fertile Crescent's fertile land between the Tigris and Euphrates supported early civilisations."],
      ["What was the Code of Hammurabi?", mc("A religious text", "One of the earliest written law codes from ancient Babylon", "A type of currency", "A military strategy"), "B", "The Code of Hammurabi was one of the earliest written legal codes, from ancient Babylon."],
      ["What was the significance of the Nile River to ancient Egypt?", mc("It provided a trade route to Europe", "It provided fertile soil, water, and transportation for Egyptian civilisation", "It was a military barrier", "It was a source of gold"), "B", "The Nile provided fertile soil (from annual floods), water, and transportation for Egypt."],
      ["What was the Athenian democracy?", mc("A monarchy", "An early form of direct democracy where citizens voted on laws", "A republic", "An oligarchy"), "B", "Athenian democracy was an early direct democracy where male citizens voted on laws."],
      ["What was the Roman Republic?", mc("A monarchy", "A government where citizens elected representatives to make laws", "A democracy", "A theocracy"), "B", "The Roman Republic was a government where elected representatives (Senate) made laws."],
    ],
    3: [
      ["What are the Five Pillars of Islam?", mc("Prayer, fasting, pilgrimage, charity, faith", "Faith, prayer, charity, fasting, pilgrimage (Shahada, Salat, Zakat, Sawm, Hajj)", "Prayer, baptism, communion, confession, confirmation", "Meditation, karma, dharma, nirvana, reincarnation"), "B", "The Five Pillars: Shahada (faith), Salat (prayer), Zakat (charity), Sawm (fasting), Hajj (pilgrimage)."],
      ["What is the Eightfold Path in Buddhism?", mc("Eight rules for warfare", "The Buddhist path to end suffering and achieve enlightenment", "Eight gods in Hinduism", "Eight commandments"), "B", "The Eightfold Path is the Buddhist guide to ending suffering and achieving enlightenment."],
      ["What is cultural diffusion?", mc("The loss of culture", "The spread of cultural elements from one place to another", "Cultural isolation", "Cultural assimilation"), "B", "Cultural diffusion is the spread of cultural elements across space through contact."],
      ["What is monotheism?", mc("Belief in many gods", "Belief in one god", "Belief in no gods", "Belief in nature spirits"), "B", "Monotheism is the belief in one god (e.g., Judaism, Christianity, Islam)."],
      ["What is polytheism?", mc("Belief in one god", "Belief in many gods", "Belief in no gods", "Belief in ancestors"), "B", "Polytheism is the belief in many gods (e.g., ancient Greek, Roman, and Hindu religions)."],
    ],
    4: [
      ["What is a market economy?", mc("An economy controlled by the government", "An economy where supply and demand determine prices and production", "A mixed economy", "A command economy"), "B", "In a market economy, supply and demand determine prices and production decisions."],
      ["What is a command economy?", mc("An economy controlled by supply and demand", "An economy where the government controls production and prices", "A market economy", "A mixed economy"), "B", "In a command economy, the government controls production, prices, and distribution."],
      ["What is the Silk Road?", mc("A modern highway", "An ancient trade network connecting China to the Mediterranean", "A type of fabric", "A trade agreement"), "B", "The Silk Road was an ancient trade network connecting China to the Mediterranean."],
      ["What is supply and demand?", mc("A type of government", "The economic relationship between the availability of goods (supply) and consumer desire (demand)", "A trade agreement", "A type of currency"), "B", "Supply and demand describes the relationship between goods available and consumer desire."],
      ["What is GDP?", mc("Government Debt Product", "Gross Domestic Product — the total value of goods and services produced in a country", "Global Development Plan", "General Distribution Policy"), "B", "GDP (Gross Domestic Product) measures the total value of goods and services produced in a country."],
    ],
    5: [
      ["What is democracy?", mc("Rule by one person", "A system of government where citizens have a say in decision-making", "Rule by a small group", "Rule by religious leaders"), "B", "Democracy is a system where citizens participate in decision-making."],
      ["What is an oligarchy?", mc("Rule by one person", "Rule by a small group of people", "Rule by the people", "Rule by religious leaders"), "B", "An oligarchy is a system where a small group holds power."],
      ["What is the difference between a direct and representative democracy?", mc("Direct democracy uses representatives; representative democracy involves direct voting", "Direct democracy involves citizens voting directly; representative democracy uses elected officials", "They are the same", "Direct democracy only exists in ancient Greece"), "B", "Direct democracy = citizens vote directly; representative democracy = elected officials vote."],
      ["What is the rule of law?", mc("The idea that leaders are above the law", "The principle that all people and institutions are accountable to the law", "A type of government", "A legal code"), "B", "The rule of law means all people and institutions are accountable to the law."],
      ["What is a constitution?", mc("A type of election", "A document that establishes the fundamental laws and principles of a government", "A type of tax", "A military code"), "B", "A constitution establishes the fundamental laws and principles of a government."],
    ],
    6: [
      ["What is the Universal Declaration of Human Rights?", mc("A US law", "A 1948 UN document declaring fundamental rights for all people", "A trade agreement", "A military treaty"), "B", "The UDHR (1948) declares fundamental rights for all people regardless of nationality."],
      ["What is the United Nations?", mc("A type of government", "An international organisation promoting peace, security, and cooperation", "A trade organisation", "A military alliance"), "B", "The UN is an international organisation promoting peace, security, and global cooperation."],
      ["What is a refugee?", mc("An immigrant", "A person forced to flee their country due to war, persecution, or disaster", "A tourist", "An expatriate"), "B", "A refugee is forced to flee their country due to war, persecution, or disaster.", ],
      ["What is climate change?", mc("A natural weather event", "Long-term shifts in global temperatures and weather patterns, largely driven by human activity", "A seasonal change", "A type of pollution"), "B", "Climate change refers to long-term shifts in global temperatures, largely driven by human activity."],
      ["What is sustainable development?", mc("Economic growth at any cost", "Development that meets present needs without compromising future generations' ability to meet their needs", "Only environmental protection", "Only economic development"), "B", "Sustainable development meets present needs without compromising future generations."],
    ],
    7: [
      ["What is a primary source?", mc("A textbook", "An original document or artefact from the time period being studied", "A secondary analysis", "A documentary"), "B", "A primary source is an original document or artefact from the time period studied."],
      ["What is a secondary source?", mc("An original document", "An analysis or interpretation of primary sources", "A photograph", "A diary"), "B", "A secondary source analyses or interprets primary sources."],
      ["What is historical bias?", mc("Accurate historical reporting", "A prejudice or slant in historical accounts that affects objectivity", "A type of primary source", "A historical fact"), "B", "Historical bias is a prejudice or slant in accounts that affects objectivity."],
      ["What is corroboration in historical research?", mc("Using one source only", "Comparing multiple sources to verify information", "Ignoring conflicting sources", "Using only secondary sources"), "B", "Corroboration involves comparing multiple sources to verify historical information."],
      ["What is historical context?", mc("The current interpretation of events", "The circumstances and conditions surrounding a historical event", "A type of bias", "A secondary source"), "B", "Historical context is the circumstances and conditions surrounding a historical event."],
    ],
    8: [
      ["What is a thesis statement in a social studies essay?", mc("A summary of the essay", "The central argument or claim of the essay", "A supporting detail", "A quotation"), "B", "A thesis statement presents the central argument or claim of the essay."],
      ["What is evidence-based writing?", mc("Writing based on personal opinion", "Writing that supports claims with specific evidence from sources", "Creative writing", "Descriptive writing"), "B", "Evidence-based writing supports claims with specific evidence from credible sources."],
      ["What is the purpose of a bibliography?", mc("To summarise the essay", "To list all sources used in the research", "To provide additional information", "To introduce the topic"), "B", "A bibliography lists all sources used in the research."],
      ["What is a counterargument?", mc("An argument that supports the claim", "An opposing argument that the writer acknowledges and refutes", "A piece of evidence", "The conclusion"), "B", "A counterargument is an opposing view that the writer acknowledges and addresses."],
      ["What is the difference between fact and opinion?", mc("Facts are personal beliefs; opinions are verifiable", "Facts are verifiable; opinions are personal beliefs or judgements", "They are the same", "Opinions are always wrong"), "B", "Facts are verifiable; opinions are personal beliefs or judgements."],
    ],
  };
  return banks[unit] || [];
}

function getG6KAPSSDiag() {
  return [
    ["G6KAPSS-D001", "What is geography?", mc("The study of history", "The study of Earth's physical features, people, and environments", "The study of government", "The study of economics"), "B", "prerequisite", "easy", "Geography studies Earth's physical features, people, and environments.", 1],
    ["G6KAPSS-D002", "What is a civilisation?", mc("A type of government", "A complex society with cities, government, writing, and specialised workers", "A type of religion", "A geographic region"), "B", "prerequisite", "easy", "A civilisation is a complex society with cities, government, writing, and specialised workers.", 2],
    ["G6KAPSS-D003", "What is culture?", mc("A type of government", "The shared beliefs, values, customs, and practices of a group of people", "A geographic feature", "An economic system"), "B", "prerequisite", "easy", "Culture is the shared beliefs, values, customs, and practices of a group.", 3],
    ["G6KAPSS-D004", "What is latitude?", mc("Distance east or west of the Prime Meridian", "Distance north or south of the Equator", "A type of map", "A geographic feature"), "B", "1", "easy", "Latitude measures distance north or south of the Equator.", 4],
    ["G6KAPSS-D005", "What is longitude?", mc("Distance north or south of the Equator", "Distance east or west of the Prime Meridian", "A type of map", "A geographic feature"), "B", "1", "easy", "Longitude measures distance east or west of the Prime Meridian.", 5],
    ["G6KAPSS-D006", "What was Mesopotamia?", mc("An ancient Chinese civilisation", "One of the earliest civilisations, located between the Tigris and Euphrates rivers", "An ancient Indian civilisation", "An ancient Egyptian civilisation"), "B", "2", "easy", "Mesopotamia was one of the earliest civilisations, between the Tigris and Euphrates.", 6],
    ["G6KAPSS-D007", "What was the significance of the Nile River?", mc("It provided a trade route to Europe", "It provided fertile soil, water, and transportation for Egyptian civilisation", "It was a military barrier", "It was a source of gold"), "B", "2", "easy", "The Nile provided fertile soil, water, and transportation for ancient Egypt.", 7],
    ["G6KAPSS-D008", "What are the major world religions?", mc("Christianity, Islam, Judaism, Hinduism, Buddhism", "Christianity, Islam, Judaism, Hinduism, Confucianism", "Christianity, Islam, Judaism, Buddhism, Taoism", "Christianity, Islam, Hinduism, Buddhism, Sikhism"), "A", "3", "easy", "The five major world religions are Christianity, Islam, Judaism, Hinduism, and Buddhism.", 8],
    ["G6KAPSS-D009", "What is monotheism?", mc("Belief in many gods", "Belief in one god", "Belief in no gods", "Belief in nature spirits"), "B", "3", "easy", "Monotheism is the belief in one god.", 9],
    ["G6KAPSS-D010", "What is a market economy?", mc("An economy controlled by the government", "An economy where supply and demand determine prices", "A mixed economy", "A command economy"), "B", "4", "easy", "In a market economy, supply and demand determine prices and production.", 10],
    ["G6KAPSS-D011", "What is democracy?", mc("Rule by one person", "A system of government where citizens have a say in decision-making", "Rule by a small group", "Rule by religious leaders"), "B", "5", "easy", "Democracy is a system where citizens participate in decision-making.", 11],
    ["G6KAPSS-D012", "What is the United Nations?", mc("A type of government", "An international organisation promoting peace and cooperation", "A trade organisation", "A military alliance"), "B", "6", "easy", "The UN promotes international peace, security, and cooperation.", 12],
    ["G6KAPSS-D013", "What is a primary source?", mc("A textbook", "An original document from the time period studied", "A secondary analysis", "A documentary"), "B", "7", "easy", "A primary source is an original document from the time period studied.", 13],
    ["G6KAPSS-D014", "What is a thesis statement?", mc("A summary", "The central argument of an essay", "A supporting detail", "A quotation"), "B", "8", "easy", "A thesis statement presents the central argument of an essay.", 14],
    ["G6KAPSS-D015", "What is the Silk Road?", mc("A modern highway", "An ancient trade network connecting China to the Mediterranean", "A type of fabric", "A trade agreement"), "B", "4", "easy", "The Silk Road was an ancient trade network connecting China to the Mediterranean.", 15],
    ["G6KAPSS-D016", "What is cultural diffusion?", mc("The loss of culture", "The spread of cultural elements from one place to another", "Cultural isolation", "Cultural assimilation"), "B", "3", "medium", "Cultural diffusion is the spread of cultural elements across space.", 16],
    ["G6KAPSS-D017", "What is the Code of Hammurabi?", mc("A religious text", "One of the earliest written law codes from ancient Babylon", "A type of currency", "A military strategy"), "B", "2", "medium", "The Code of Hammurabi was one of the earliest written legal codes.", 17],
    ["G6KAPSS-D018", "What is GDP?", mc("Government Debt Product", "Gross Domestic Product — the total value of goods and services produced in a country", "Global Development Plan", "General Distribution Policy"), "B", "4", "medium", "GDP measures the total value of goods and services produced in a country.", 18],
    ["G6KAPSS-D019", "What is the rule of law?", mc("Leaders are above the law", "All people and institutions are accountable to the law", "A type of government", "A legal code"), "B", "5", "medium", "The rule of law means all people and institutions are accountable to the law.", 19],
    ["G6KAPSS-D020", "What is the Universal Declaration of Human Rights?", mc("A US law", "A 1948 UN document declaring fundamental rights for all people", "A trade agreement", "A military treaty"), "B", "6", "medium", "The UDHR (1948) declares fundamental rights for all people.", 20],
    ["G6KAPSS-D021", "What is the difference between a direct and representative democracy?", mc("Direct uses representatives; representative involves direct voting", "Direct involves citizens voting directly; representative uses elected officials", "They are the same", "Direct democracy only exists in ancient Greece"), "B", "5", "medium", "Direct democracy = citizens vote directly; representative = elected officials vote.", 21],
    ["G6KAPSS-D022", "What is historical bias?", mc("Accurate historical reporting", "A prejudice or slant in historical accounts", "A type of primary source", "A historical fact"), "B", "7", "medium", "Historical bias is a prejudice or slant that affects the objectivity of accounts.", 22],
    ["G6KAPSS-D023", "What is sustainable development?", mc("Economic growth at any cost", "Development meeting present needs without compromising future generations", "Only environmental protection", "Only economic development"), "B", "6", "medium", "Sustainable development meets present needs without compromising future generations.", 23],
    ["G6KAPSS-D024", "What is a command economy?", mc("An economy controlled by supply and demand", "An economy where the government controls production and prices", "A market economy", "A mixed economy"), "B", "4", "medium", "In a command economy, the government controls production, prices, and distribution.", 24],
    ["G6KAPSS-D025", "What is a refugee?", mc("An immigrant", "A person forced to flee their country due to war or persecution", "A tourist", "An expatriate"), "B", "6", "easy", "A refugee is forced to flee their country due to war, persecution, or disaster.", 25],
    ["G6KAPSS-D026", "What was Athenian democracy?", mc("A monarchy", "An early direct democracy where male citizens voted on laws", "A republic", "An oligarchy"), "B", "2", "medium", "Athenian democracy was an early direct democracy where male citizens voted.", 26],
    ["G6KAPSS-D027", "What is corroboration in historical research?", mc("Using one source only", "Comparing multiple sources to verify information", "Ignoring conflicting sources", "Using only secondary sources"), "B", "7", "hard", "Corroboration involves comparing multiple sources to verify historical information.", 27],
    ["G6KAPSS-D028", "What is an oligarchy?", mc("Rule by one person", "Rule by a small group", "Rule by the people", "Rule by religious leaders"), "B", "5", "medium", "An oligarchy is a system where a small group holds power.", 28],
    ["G6KAPSS-D029", "What is the difference between a physical and political map?", mc("Physical shows borders; political shows landforms", "Physical shows landforms; political shows borders and countries", "They are the same", "Physical maps are older"), "B", "1", "easy", "Physical maps show landforms; political maps show borders and countries.", 29],
    ["G6KAPSS-D030", "What is the Five Themes of Geography?", mc("Latitude, longitude, climate, culture, economy", "Location, place, region, movement, human-environment interaction", "Physical, political, economic, social, cultural", "North, south, east, west, centre"), "B", "1", "medium", "The five themes: location, place, region, movement, human-environment interaction.", 30],
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 7 — KAP SCIENCE & SOCIAL STUDIES
// ═══════════════════════════════════════════════════════════════════════════════
async function seedG7KAPSci() {
  console.log("Seeding Grade 7 KAP Science...");
  const cid = await insertCourse("G7KAPSCI", "Grade 7 KAP Science", "science", "7",
    "Katy ISD Grade 7 KAP Science is an advanced pathway covering life science, cells, genetics, evolution, ecosystems, and Earth science through inquiry-based investigations and scientific reasoning. Students engage with complex biological phenomena and apply STEM thinking.",
    "TEKS 7 Science KAP", 371);

  const units = [
    [1, "Scientific Methods & Advanced Inquiry", "Experimental design, data analysis, scientific reasoning, and STEM applications.", "TEKS 7.1-7.3"],
    [2, "Cell Biology & Biochemistry", "Cell structure, organelles, biochemistry, cell processes, and molecular biology.", "TEKS 7.12"],
    [3, "Genetics & Heredity", "DNA structure, Mendelian genetics, Punnett squares, mutations, and biotechnology.", "TEKS 7.14"],
    [4, "Evolution & Natural Selection", "Darwin's theory, natural selection, adaptation, speciation, and fossil evidence.", "TEKS 7.13"],
    [5, "Human Body Systems", "Integumentary, skeletal, muscular, nervous, endocrine, and immune systems.", "TEKS 7.12"],
    [6, "Ecosystems & Environmental Science", "Ecosystem dynamics, energy flow, biogeochemical cycles, and environmental issues.", "TEKS 7.11"],
    [7, "Earth's History & Geological Time", "Geological time scale, fossil record, plate tectonics, and Earth's history.", "TEKS 7.10"],
    [8, "Chemistry of Life & Matter", "Organic molecules, chemical reactions in living systems, and matter cycles.", "TEKS 7.6"],
  ];

  for (const [num, title, overview, teks] of units) {
    const uid = await insertUnit(cid, num, title, overview, teks, num);
    const skillBase = (num - 1) * 3 + 1;
    const skills = [
      [`G7KAPSCI-U${num}-S1`, `${title} — Core Concepts`],
      [`G7KAPSCI-U${num}-S2`, `${title} — Analysis & Application`],
      [`G7KAPSCI-U${num}-S3`, `${title} — Inquiry & Investigation`],
    ];
    for (let i = 0; i < skills.length; i++) {
      await insertSkill(cid, skills[i][0], skills[i][1], uid, num, skillBase + i);
    }
    const qData = getG7KAPSciQuiz(num);
    for (let i = 0; i < qData.length; i++) {
      await insertQuizQ(cid, uid, qData[i][0], qData[i][1], qData[i][2], qData[i][3], skills[i % 3][0], i < 2 ? 'medium' : 'hard', i + 1);
    }
  }
  // Copy G6KAPSCI diagnostic questions with code substitution
  const [rows] = await db.execute('SELECT * FROM diagnosticQuestions WHERE courseId=(SELECT id FROM courses WHERE courseCode="G6KAPSCI") ORDER BY sortOrder');
  for (const row of rows) {
    const newQId = row.questionId.replace('G6KAPSCI', 'G7KAPSCI');
    const choices = typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices;
    await insertDiagQ(cid, newQId, row.questionText, choices, row.correctAnswer, row.mapsToUnit, row.difficulty, row.explanation, row.sortOrder);
  }
  console.log("Grade 7 KAP Science done.");
}

function getG7KAPSciQuiz(unit) {
  const banks = {
    1: [
      ["What is the difference between a hypothesis and a theory?", mc("They are the same", "A hypothesis is a testable prediction; a theory is a well-tested explanation supported by evidence", "A theory is a guess; a hypothesis is proven", "A hypothesis is broader than a theory"), "B", "A hypothesis is a testable prediction; a theory is a well-tested explanation."],
      ["What is peer review in science?", mc("A student reviewing another student's work", "The process by which scientists evaluate each other's research before publication", "A type of experiment", "A type of data analysis"), "B", "Peer review is the evaluation of scientific research by other experts before publication."],
      ["What is the difference between qualitative and quantitative data?", mc("Qualitative is numerical; quantitative is descriptive", "Qualitative is descriptive; quantitative is numerical", "They are the same", "Qualitative is more accurate"), "B", "Qualitative data is descriptive; quantitative data is numerical."],
      ["What is a control variable?", mc("The variable that is measured", "The variable that is deliberately changed", "A variable kept constant to ensure a fair test", "The experimental group"), "C", "A control variable is kept constant to ensure only one variable changes."],
      ["What is the purpose of replication in science?", mc("To make experiments faster", "To verify results by repeating the experiment", "To reduce costs", "To increase sample size"), "B", "Replication verifies results by repeating experiments independently."],
    ],
    2: [
      ["What is the function of the endoplasmic reticulum?", mc("Energy production", "Protein and lipid synthesis and transport within the cell", "DNA storage", "Cell division"), "B", "The ER synthesises and transports proteins (rough ER) and lipids (smooth ER)."],
      ["What is the Golgi apparatus?", mc("The powerhouse of the cell", "The cell's 'post office' — packages and ships proteins", "The site of photosynthesis", "The site of DNA replication"), "B", "The Golgi apparatus packages and ships proteins to their destinations."],
      ["What is active transport?", mc("Movement from high to low concentration without energy", "Movement from low to high concentration requiring energy (ATP)", "Osmosis", "Diffusion"), "B", "Active transport moves molecules against the concentration gradient, requiring ATP."],
      ["What is the difference between aerobic and anaerobic respiration?", mc("Aerobic requires no oxygen; anaerobic requires oxygen", "Aerobic requires oxygen and produces more ATP; anaerobic does not require oxygen", "They produce the same amount of ATP", "Anaerobic is more efficient"), "B", "Aerobic respiration requires oxygen and produces more ATP than anaerobic."],
      ["What is the cell cycle?", mc("The process of photosynthesis", "The series of events in a cell's growth and division", "The process of protein synthesis", "The process of DNA replication only"), "B", "The cell cycle includes cell growth, DNA replication, and cell division."],
    ],
    3: [
      ["What is DNA?", mc("A type of protein", "The molecule that carries genetic information", "A type of carbohydrate", "A cell membrane component"), "B", "DNA (deoxyribonucleic acid) carries the genetic information of an organism."],
      ["What is the difference between dominant and recessive alleles?", mc("Dominant is expressed only with two copies; recessive is always expressed", "Dominant is expressed with one copy; recessive requires two copies", "They are the same", "Dominant alleles are always beneficial"), "B", "Dominant alleles are expressed with one copy; recessive requires two copies."],
      ["What is a Punnett square?", mc("A type of DNA diagram", "A tool for predicting the probability of offspring traits", "A type of cell diagram", "A genetic mutation"), "B", "A Punnett square predicts the probability of offspring inheriting traits."],
      ["What is a mutation?", mc("A change in behaviour", "A change in the DNA sequence", "A type of cell division", "A protein synthesis error"), "B", "A mutation is a change in the DNA sequence."],
      ["What is the difference between genotype and phenotype?", mc("Genotype is the physical trait; phenotype is the genetic makeup", "Genotype is the genetic makeup; phenotype is the observable physical trait", "They are the same", "Genotype is always dominant"), "B", "Genotype = genetic makeup; phenotype = observable physical trait."],
    ],
    4: [
      ["What is natural selection?", mc("Humans selecting which animals to breed", "The process by which organisms with favourable traits survive and reproduce", "Random genetic mutation", "The extinction of species"), "B", "Natural selection favours organisms with traits suited to their environment."],
      ["What is adaptation?", mc("A change in behaviour", "A trait that increases an organism's fitness in its environment", "A type of mutation", "A type of natural selection"), "B", "An adaptation is a trait that increases an organism's fitness in its environment."],
      ["What is speciation?", mc("The extinction of a species", "The process by which new species form", "A type of mutation", "Natural selection"), "B", "Speciation is the process by which new species form from existing ones."],
      ["What is the fossil record?", mc("A list of extinct species", "The collection of fossils that provides evidence of past life and evolution", "A type of rock", "A type of DNA"), "B", "The fossil record is the collection of fossils providing evidence of past life."],
      ["What is homologous structure?", mc("Structures with different functions and origins", "Structures with similar anatomy indicating common ancestry", "Structures that look the same but have different functions", "Structures unique to one species"), "B", "Homologous structures share similar anatomy, indicating common ancestry."],
    ],
    5: [
      ["What is the function of the nervous system?", mc("To transport oxygen", "To coordinate body responses by transmitting signals", "To digest food", "To produce hormones"), "B", "The nervous system transmits signals to coordinate body responses."],
      ["What is homeostasis?", mc("Cell division", "The maintenance of a stable internal environment", "The process of evolution", "The immune response"), "B", "Homeostasis is the maintenance of a stable internal environment.", ],
      ["What is the function of the endocrine system?", mc("To transmit nerve signals", "To regulate body functions through hormones", "To digest food", "To transport oxygen"), "B", "The endocrine system regulates body functions through hormone secretion."],
      ["What is the immune system?", mc("The system that transports blood", "The body's defence system against pathogens", "The digestive system", "The respiratory system"), "B", "The immune system defends the body against pathogens and disease."],
      ["What is the difference between the central and peripheral nervous system?", mc("They are the same", "CNS = brain and spinal cord; PNS = nerves outside the CNS", "PNS = brain and spinal cord; CNS = nerves outside", "CNS controls voluntary movement only"), "B", "CNS = brain and spinal cord; PNS = all nerves outside the CNS."],
    ],
    6: [
      ["What is the carbon cycle?", mc("The process of photosynthesis only", "The continuous movement of carbon through the atmosphere, biosphere, hydrosphere, and lithosphere", "The process of respiration only", "The movement of carbon in the ocean"), "B", "The carbon cycle describes carbon's continuous movement through Earth's systems."],
      ["What is the nitrogen cycle?", mc("The process of photosynthesis", "The continuous movement of nitrogen through the atmosphere, soil, and living organisms", "The process of respiration", "The movement of nitrogen in the ocean"), "B", "The nitrogen cycle describes nitrogen's movement through atmosphere, soil, and organisms."],
      ["What is a trophic level?", mc("A type of ecosystem", "A position in a food chain or food web", "A type of organism", "A type of energy"), "B", "A trophic level is a position in the food chain (producer, primary consumer, etc.)."],
      ["What is biomagnification?", mc("The growth of organisms", "The increasing concentration of toxins at higher trophic levels", "The magnification of cells", "The growth of populations"), "B", "Biomagnification is the increasing concentration of toxins at higher trophic levels."],
      ["What is the water cycle?", mc("The process of photosynthesis", "The continuous movement of water through evaporation, condensation, and precipitation", "The process of osmosis", "The movement of water in cells"), "B", "The water cycle describes water's continuous movement through evaporation, condensation, and precipitation."],
    ],
    7: [
      ["What is the geological time scale?", mc("A type of map", "A system for dividing Earth's history into eons, eras, periods, and epochs", "A type of fossil", "A type of rock layer"), "B", "The geological time scale divides Earth's 4.6 billion year history into eons, eras, and periods."],
      ["What is relative dating?", mc("Using radioactive decay to find exact age", "Determining the age of rocks or fossils relative to other layers", "A type of fossil analysis", "A type of carbon dating"), "B", "Relative dating determines age by comparing rock layers (stratigraphy)."],
      ["What is radioactive dating?", mc("Relative dating", "Using the decay of radioactive isotopes to determine the absolute age of materials", "A type of fossil analysis", "A type of rock classification"), "B", "Radioactive (radiometric) dating uses isotope decay rates to find absolute age."],
      ["What is the law of superposition?", mc("Older rock layers are on top", "In undisturbed rock layers, older layers are at the bottom and newer layers are on top", "All rock layers are the same age", "Rock layers form horizontally"), "B", "Law of superposition: in undisturbed strata, older layers are at the bottom."],
      ["What is an index fossil?", mc("Any fossil", "A fossil of a species that lived for a short time over a wide area, used to date rock layers", "A fossil of a large organism", "A fossil found in one location"), "B", "Index fossils are from species that lived briefly over wide areas, used to date rock layers."],
    ],
    8: [
      ["What are the four organic macromolecules?", mc("Carbohydrates, lipids, proteins, nucleic acids", "Carbohydrates, lipids, proteins, vitamins", "Carbohydrates, lipids, minerals, nucleic acids", "Proteins, nucleic acids, vitamins, minerals"), "A", "The four organic macromolecules are carbohydrates, lipids, proteins, and nucleic acids."],
      ["What is the role of enzymes?", mc("To store energy", "To speed up chemical reactions in the body", "To carry oxygen", "To build cell membranes"), "B", "Enzymes are biological catalysts that speed up chemical reactions."],
      ["What is ATP?", mc("A type of DNA", "The energy currency of the cell", "A structural protein", "A type of lipid"), "B", "ATP (adenosine triphosphate) is the primary energy currency of cells."],
      ["What is the difference between an acid and a base?", mc("Acids have a high pH; bases have a low pH", "Acids have a low pH (donate H⁺); bases have a high pH (accept H⁺)", "They are the same", "Acids are always harmful"), "B", "Acids donate H⁺ (low pH); bases accept H⁺ (high pH)."],
      ["What is pH?", mc("A measure of temperature", "A measure of the acidity or alkalinity of a solution (0-14 scale)", "A measure of concentration", "A measure of density"), "B", "pH measures acidity/alkalinity on a 0–14 scale (7 = neutral)."],
    ],
  };
  return banks[unit] || [];
}

async function seedG7KAPSS() {
  console.log("Seeding Grade 7 KAP Social Studies (Texas History)...");
  const cid = await insertCourse("G7KAPSS", "Grade 7 KAP Social Studies — Texas History", "social_studies", "7",
    "Katy ISD Grade 7 KAP Social Studies is an advanced pathway exploring Texas history from pre-Columbian times through the present. Students engage in primary source analysis, historical argumentation, geographic reasoning, and civic understanding at an advanced level.",
    "TEKS 7 Social Studies KAP", 372);

  const units = [
    [1, "Pre-Columbian Texas & Native Peoples", "Advanced study of Native American cultures in Texas, their societies, and interactions with the environment.", "TEKS 7.1"],
    [2, "European Exploration & Colonisation", "Spanish and French exploration, colonisation, missions, and the impact on Native peoples.", "TEKS 7.2"],
    [3, "Mexican Texas & the Road to Revolution", "Mexican independence, Anglo-American colonisation, tensions, and the Texas Revolution.", "TEKS 7.3"],
    [4, "The Republic of Texas", "The Texas Revolution, the Republic of Texas, annexation, and the Mexican-American War.", "TEKS 7.4"],
    [5, "Texas in the Civil War & Reconstruction", "Texas's role in the Civil War, Reconstruction, and the challenges of rebuilding.", "TEKS 7.5"],
    [6, "Texas in the Industrial Age", "Cattle drives, railroads, the oil boom, and economic transformation of Texas.", "TEKS 7.6"],
    [7, "20th Century Texas", "Texas in WWI, WWII, the Great Depression, civil rights, and modern economic growth.", "TEKS 7.7"],
    [8, "Texas Government, Geography & Economy", "Texas government structure, geographic regions, economic sectors, and civic participation.", "TEKS 7.8-7.10"],
  ];

  for (const [num, title, overview, teks] of units) {
    const uid = await insertUnit(cid, num, title, overview, teks, num);
    const skillBase = (num - 1) * 3 + 1;
    const skills = [
      [`G7KAPSS-U${num}-S1`, `${title} — Core Concepts`],
      [`G7KAPSS-U${num}-S2`, `${title} — Analysis & Interpretation`],
      [`G7KAPSS-U${num}-S3`, `${title} — Application & Evaluation`],
    ];
    for (let i = 0; i < skills.length; i++) {
      await insertSkill(cid, skills[i][0], skills[i][1], uid, num, skillBase + i);
    }
    const qData = getG7KAPSSQuiz(num);
    for (let i = 0; i < qData.length; i++) {
      await insertQuizQ(cid, uid, qData[i][0], qData[i][1], qData[i][2], qData[i][3], skills[i % 3][0], i < 2 ? 'medium' : 'hard', i + 1);
    }
  }
  // Copy G6KAPSS diagnostic with code substitution
  const [rows] = await db.execute('SELECT * FROM diagnosticQuestions WHERE courseId=(SELECT id FROM courses WHERE courseCode="G6KAPSS") ORDER BY sortOrder');
  for (const row of rows) {
    const newQId = row.questionId.replace('G6KAPSS', 'G7KAPSS');
    const choices = typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices;
    await insertDiagQ(cid, newQId, row.questionText, choices, row.correctAnswer, row.mapsToUnit, row.difficulty, row.explanation, row.sortOrder);
  }
  console.log("Grade 7 KAP Social Studies done.");
}

function getG7KAPSSQuiz(unit) {
  const banks = {
    1: [
      ["What were the major Native American groups in Texas?", mc("Cherokee, Sioux, Navajo, Apache", "Caddo, Comanche, Apache, Karankawa, Coahuiltecan", "Aztec, Maya, Inca, Olmec", "Iroquois, Algonquin, Huron, Mohawk"), "B", "Major Texas Native groups included Caddo, Comanche, Apache, Karankawa, and Coahuiltecan."],
      ["What was the Caddo Confederacy?", mc("A military alliance", "A group of related Native American tribes in East Texas known for agriculture and trade", "A Spanish mission", "A French trading post"), "B", "The Caddo were agricultural, trade-oriented Native Americans in East Texas."],
      ["How did the Comanche adapt to life on the Great Plains?", mc("By farming", "By becoming skilled horse riders and bison hunters", "By building permanent cities", "By trading with Europeans"), "B", "The Comanche became skilled equestrian hunters of bison on the Great Plains."],
      ["What was the significance of bison to Plains Native Americans?", mc("A source of trade only", "A source of food, clothing, shelter, and tools", "A religious symbol only", "A source of transportation only"), "B", "Bison provided food, clothing, shelter, and tools for Plains Native Americans."],
      ["What is the significance of the Caddo word 'Tejas'?", mc("It means 'land'", "It means 'friends' or 'allies' and is the origin of the name 'Texas'", "It means 'warriors'", "It means 'river'"), "B", "The Caddo word 'Tejas' means 'friends/allies' and is the origin of the name 'Texas.'"],
    ],
    2: [
      ["What was the purpose of Spanish missions in Texas?", mc("To find gold", "To convert Native Americans to Christianity and extend Spanish control", "To establish trade routes", "To build military forts"), "B", "Spanish missions aimed to convert Native Americans and extend Spanish colonial control."],
      ["Who was the first European to explore Texas?", mc("Christopher Columbus", "Álvar Núñez Cabeza de Vaca", "Hernán Cortés", "Francisco Vásquez de Coronado"), "B", "Cabeza de Vaca was among the first Europeans to explore Texas (1528–1536)."],
      ["Why did France establish settlements in Texas?", mc("To convert Native Americans", "To challenge Spanish control and establish trade", "To find gold", "To build missions"), "B", "France established Texas settlements to challenge Spanish control and expand trade."],
      ["What was the impact of European colonisation on Native Texans?", mc("It improved their lives", "It led to population decline through disease, displacement, and conflict", "It had no impact", "It strengthened their cultures"), "B", "European colonisation led to massive population decline through disease, displacement, and conflict."],
      ["What was the significance of the mission system?", mc("It was purely religious", "It was a system of religious, social, and economic control that transformed Native Texan life", "It was purely economic", "It was purely military"), "B", "The mission system was a complex instrument of religious, social, and economic control."],
    ],
    3: [
      ["What was the Empresario system?", mc("A Spanish mission system", "A system where land grants were given to agents (empresarios) to bring settlers to Texas", "A Mexican tax system", "A military system"), "B", "The Empresario system gave land grants to agents to recruit settlers to Texas."],
      ["Who was Stephen F. Austin?", mc("A Mexican general", "The 'Father of Texas' who led Anglo-American colonisation", "A Spanish explorer", "A Texas president"), "B", "Stephen F. Austin was the 'Father of Texas,' leading Anglo-American colonisation."],
      ["What were the main causes of the Texas Revolution?", mc("Religious differences only", "Political, cultural, and economic tensions between Anglo settlers and the Mexican government", "Economic differences only", "Military conflicts only"), "B", "The Texas Revolution resulted from political, cultural, and economic tensions with Mexico."],
      ["What was the Constitution of 1824?", mc("The Texas Constitution", "The Mexican constitution that guaranteed rights to settlers, later abolished by Santa Anna", "The US Constitution", "The Spanish colonial law"), "B", "The Mexican Constitution of 1824 guaranteed rights to settlers; its abolition angered Texans."],
      ["Who was Santa Anna?", mc("A Texas hero", "The Mexican president and general who centralised power, triggering the Texas Revolution", "A Spanish explorer", "A US general"), "B", "Santa Anna centralised power in Mexico, abolishing the Constitution of 1824 and triggering the Texas Revolution."],
    ],
    4: [
      ["What happened at the Battle of the Alamo?", mc("Texas won a decisive victory", "A small Texas force was defeated by Santa Anna's army after a 13-day siege", "Mexico surrendered", "The US intervened"), "B", "At the Alamo, a small Texas force was defeated by Santa Anna after a 13-day siege."],
      ["What was the significance of 'Remember the Alamo'?", mc("It was a battle cry that motivated Texans to fight for independence", "It was a peace treaty", "It was a law", "It was a song"), "B", "'Remember the Alamo' was a rallying cry that motivated Texans at San Jacinto."],
      ["What happened at the Battle of San Jacinto?", mc("Texas was defeated", "Sam Houston's Texas army defeated Santa Anna, securing Texas independence", "Mexico won", "The US won"), "B", "At San Jacinto, Sam Houston defeated Santa Anna, securing Texas independence (1836)."],
      ["What was the Republic of Texas?", mc("A Mexican state", "An independent nation from 1836 to 1845", "A US territory", "A Spanish colony"), "B", "Texas was an independent republic from 1836 until annexation by the US in 1845."],
      ["Why was Texas annexation controversial?", mc("It was too expensive", "It threatened to expand slavery and risked war with Mexico", "It was too far from the US", "Texas did not want to join"), "B", "Annexation was controversial because it threatened to expand slavery and risked war with Mexico."],
    ],
    5: [
      ["What was Texas's role in the Civil War?", mc("Texas fought for the Union", "Texas seceded from the Union and joined the Confederacy", "Texas remained neutral", "Texas was not involved"), "B", "Texas seceded from the Union in 1861 and joined the Confederacy."],
      ["What was Juneteenth?", mc("Texas Independence Day", "June 19, 1865, when enslaved people in Texas learned of their freedom", "The end of the Civil War", "A Confederate holiday"), "B", "Juneteenth (June 19, 1865) marks when enslaved Texans learned of their emancipation."],
      ["What was Reconstruction in Texas?", mc("Rebuilding after a natural disaster", "The period of rebuilding and reintegrating Texas into the Union after the Civil War", "A military campaign", "An economic programme"), "B", "Reconstruction was the period of rebuilding and reintegrating Texas after the Civil War."],
      ["What were the Black Codes?", mc("Laws protecting African Americans", "Laws restricting the rights and freedoms of formerly enslaved people after the Civil War", "A type of currency", "A military code"), "B", "Black Codes restricted the rights and freedoms of formerly enslaved people after the Civil War."],
      ["What was the Freedmen's Bureau?", mc("A Confederate agency", "A federal agency helping formerly enslaved people transition to freedom", "A state agency", "A private organisation"), "B", "The Freedmen's Bureau helped formerly enslaved people transition to freedom after the Civil War."],
    ],
    6: [
      ["What was the significance of the cattle drives?", mc("They were purely local", "They moved Texas longhorns to northern markets, driving economic growth", "They were for military purposes", "They were for personal use"), "B", "Cattle drives moved Texas longhorns to northern markets, driving significant economic growth."],
      ["What was the Chisholm Trail?", mc("A railway line", "A major cattle drive route from Texas to Kansas", "A military road", "A trade route to Mexico"), "B", "The Chisholm Trail was a major cattle drive route from Texas to Kansas railheads."],
      ["How did railroads transform Texas?", mc("They had no impact", "They connected Texas to national markets, enabling economic growth and settlement", "They only helped the military", "They only transported cattle"), "B", "Railroads connected Texas to national markets, enabling economic growth and settlement."],
      ["What was Spindletop?", mc("A type of cattle", "The 1901 oil discovery near Beaumont that launched the Texas oil industry", "A type of railroad", "A type of cattle trail"), "B", "Spindletop (1901) was the oil discovery near Beaumont that launched the Texas oil industry."],
      ["What was the impact of the oil boom on Texas?", mc("It had no impact", "It transformed Texas into an industrial and economic powerhouse", "It only benefited a few people", "It caused environmental damage only"), "B", "The oil boom transformed Texas into an industrial and economic powerhouse."],
    ],
    7: [
      ["How did WWI affect Texas?", mc("Texas was not involved", "Texas contributed troops, military bases, and agricultural production", "Texas opposed the war", "Texas was invaded"), "B", "Texas contributed troops, military bases, and agricultural production to WWI."],
      ["What was the Great Depression's impact on Texas?", mc("Texas was unaffected", "Texas suffered economic hardship, drought (Dust Bowl), and mass migration", "Texas prospered during the Depression", "Texas had no drought"), "B", "Texas suffered economic hardship, drought (Dust Bowl), and mass migration during the Depression."],
      ["What was the Dust Bowl?", mc("A type of storm", "A severe drought and dust storm period in the 1930s that devastated Plains agriculture", "A type of economic policy", "A military event"), "B", "The Dust Bowl was a severe drought and dust storm period in the 1930s devastating Plains agriculture."],
      ["What was the Civil Rights Movement in Texas?", mc("Texas had no civil rights movement", "A movement to end racial segregation and discrimination in Texas", "A movement for women's rights only", "A movement for economic rights only"), "B", "The Civil Rights Movement in Texas fought to end racial segregation and discrimination."],
      ["What is the significance of the Texas oil industry today?", mc("It is no longer important", "Texas is one of the world's largest oil producers, driving the state and national economy", "It only provides jobs", "It only benefits Houston"), "B", "Texas is one of the world's largest oil producers, driving the state and national economy."],
    ],
    8: [
      ["What are the three branches of Texas government?", mc("President, Congress, Courts", "Executive, Legislative, Judicial", "Governor, Senate, House", "Federal, State, Local"), "B", "Texas government has three branches: Executive (Governor), Legislative (Legislature), and Judicial (Courts)."],
      ["What is the Texas Legislature?", mc("The Governor's office", "The bicameral lawmaking body consisting of the Senate and House of Representatives", "The Texas Supreme Court", "The Texas Cabinet"), "B", "The Texas Legislature is bicameral: the Senate (31 members) and House of Representatives (150 members)."],
      ["What are the major geographic regions of Texas?", mc("Mountains, plains, coast, desert", "Piney Woods, Gulf Coast Plains, Interior Lowlands, Great Plains, Basin and Range", "North, South, East, West, Central", "Forest, desert, coast, plains"), "B", "Texas has five major regions: Piney Woods, Gulf Coast Plains, Interior Lowlands, Great Plains, and Basin and Range."],
      ["What are the major economic sectors of Texas?", mc("Only oil and agriculture", "Energy, agriculture, technology, healthcare, and manufacturing", "Only technology and energy", "Only agriculture and manufacturing"), "B", "Texas's major economic sectors include energy, agriculture, technology, healthcare, and manufacturing."],
      ["What is civic participation?", mc("Paying taxes only", "Active involvement in community and government, including voting, volunteering, and advocacy", "Voting only", "Military service only"), "B", "Civic participation includes voting, volunteering, advocacy, and active community involvement."],
    ],
  };
  return banks[unit] || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE 8 — KAP SCIENCE & SOCIAL STUDIES
// ═══════════════════════════════════════════════════════════════════════════════
async function seedG8KAPSci() {
  console.log("Seeding Grade 8 KAP Science...");
  const cid = await insertCourse("G8KAPSCI", "Grade 8 KAP Science", "science", "8",
    "Katy ISD Grade 8 KAP Science is an advanced pathway integrating physical science, chemistry, physics, and Earth science. Students engage in complex investigations, mathematical reasoning, and STEM applications to prepare for high school science.",
    "TEKS 8 Science KAP", 381);

  const units = [
    [1, "Scientific Reasoning & STEM Applications", "Advanced experimental design, data analysis, mathematical modelling, and STEM careers.", "TEKS 8.1-8.3"],
    [2, "Matter, Atomic Theory & Chemical Bonding", "Atomic structure, periodic table, chemical bonding, and molecular geometry.", "TEKS 8.5"],
    [3, "Chemical Reactions & Stoichiometry", "Types of reactions, balancing equations, conservation of mass, and reaction rates.", "TEKS 8.5"],
    [4, "Motion, Forces & Newton's Laws", "Kinematics, Newton's three laws, friction, gravity, and circular motion.", "TEKS 8.6"],
    [5, "Energy, Work & Power", "Forms of energy, work, power, simple machines, and energy transformations.", "TEKS 8.6"],
    [6, "Waves, Sound & Light", "Wave properties, electromagnetic spectrum, sound, light, and optics.", "TEKS 8.7"],
    [7, "Electricity & Magnetism", "Electric charge, circuits, Ohm's Law, magnetism, and electromagnetic induction.", "TEKS 8.8"],
    [8, "Earth Systems & Climate Science", "Earth's systems, climate change, human impact, and sustainability.", "TEKS 8.9-8.11"],
  ];

  for (const [num, title, overview, teks] of units) {
    const uid = await insertUnit(cid, num, title, overview, teks, num);
    const skillBase = (num - 1) * 3 + 1;
    const skills = [
      [`G8KAPSCI-U${num}-S1`, `${title} — Core Concepts`],
      [`G8KAPSCI-U${num}-S2`, `${title} — Analysis & Application`],
      [`G8KAPSCI-U${num}-S3`, `${title} — Inquiry & Problem Solving`],
    ];
    for (let i = 0; i < skills.length; i++) {
      await insertSkill(cid, skills[i][0], skills[i][1], uid, num, skillBase + i);
    }
    const qData = getG8KAPSciQuiz(num);
    for (let i = 0; i < qData.length; i++) {
      await insertQuizQ(cid, uid, qData[i][0], qData[i][1], qData[i][2], qData[i][3], skills[i % 3][0], i < 2 ? 'medium' : 'hard', i + 1);
    }
  }
  // Copy G6KAPSCI diagnostic with code substitution
  const [rows] = await db.execute('SELECT * FROM diagnosticQuestions WHERE courseId=(SELECT id FROM courses WHERE courseCode="G6KAPSCI") ORDER BY sortOrder');
  for (const row of rows) {
    const newQId = row.questionId.replace('G6KAPSCI', 'G8KAPSCI');
    const choices = typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices;
    await insertDiagQ(cid, newQId, row.questionText, choices, row.correctAnswer, row.mapsToUnit, row.difficulty, row.explanation, row.sortOrder);
  }
  console.log("Grade 8 KAP Science done.");
}

function getG8KAPSciQuiz(unit) {
  const banks = {
    1: [
      ["What is the difference between accuracy and precision?", mc("They are the same", "Accuracy is how close to the true value; precision is how consistent the measurements are", "Precision is how close to the true value; accuracy is how consistent", "Accuracy is more important than precision"), "B", "Accuracy = closeness to true value; precision = consistency of measurements."],
      ["What is a mathematical model in science?", mc("A physical replica", "A mathematical representation of a real-world system", "A type of experiment", "A type of data"), "B", "A mathematical model uses equations to represent and predict real-world systems."],
      ["What is the difference between a law and a theory in science?", mc("A law is more important than a theory", "A law describes what happens; a theory explains why it happens", "A theory is proven; a law is not", "They are the same"), "B", "Scientific laws describe what happens; theories explain why it happens."],
      ["What is dimensional analysis?", mc("Measuring dimensions", "A method of converting units using conversion factors", "A type of graph", "A type of experiment"), "B", "Dimensional analysis converts units using conversion factors."],
      ["What is the significance of significant figures?", mc("They show the precision of a measurement", "They show the accuracy of a measurement", "They are just decorative", "They show the units"), "A", "Significant figures indicate the precision of a measurement."],
    ],
    2: [
      ["What is the difference between ionic and covalent bonding?", mc("They are the same", "Ionic involves electron transfer between metals and non-metals; covalent involves electron sharing between non-metals", "Covalent involves electron transfer; ionic involves sharing", "Ionic is stronger than covalent"), "B", "Ionic = electron transfer (metal + non-metal); covalent = electron sharing (non-metals)."],
      ["What is electronegativity?", mc("The energy to remove an electron", "The ability of an atom to attract electrons in a bond", "The charge of an ion", "The number of protons"), "B", "Electronegativity measures an atom's ability to attract bonding electrons."],
      ["What is the periodic table organised by?", mc("Alphabetical order", "Atomic number (number of protons)", "Atomic mass", "Reactivity"), "B", "The periodic table is organised by increasing atomic number."],
      ["What is a polar molecule?", mc("A molecule with no charge", "A molecule with an uneven distribution of charge due to electronegativity differences", "A molecule with ionic bonds", "A molecule with only one element"), "B", "A polar molecule has an uneven charge distribution due to electronegativity differences."],
      ["What is the difference between an atom and an ion?", mc("They are the same", "An ion has a different number of electrons than protons, giving it a charge", "An atom has a charge; an ion does not", "An ion is larger than an atom"), "B", "An ion has gained or lost electrons, giving it a positive or negative charge."],
    ],
    3: [
      ["What is the law of conservation of mass?", mc("Mass is created in reactions", "The total mass of reactants equals the total mass of products", "Mass is destroyed in reactions", "Mass increases in exothermic reactions"), "B", "Conservation of mass: total mass of reactants = total mass of products."],
      ["What is a synthesis reaction?", mc("A + B → AB", "AB → A + B", "A + BC → AC + B", "AB + CD → AD + CB"), "A", "A synthesis reaction combines two or more substances to form one product: A + B → AB."],
      ["What is a decomposition reaction?", mc("A + B → AB", "AB → A + B", "A + BC → AC + B", "AB + CD → AD + CB"), "B", "A decomposition reaction breaks one substance into two or more: AB → A + B."],
      ["What is an exothermic reaction?", mc("A reaction that absorbs heat", "A reaction that releases heat", "A reaction with no heat change", "A reaction that requires light"), "B", "An exothermic reaction releases heat energy to the surroundings."],
      ["What is a catalyst?", mc("A substance consumed in a reaction", "A substance that speeds up a reaction without being consumed", "A type of reactant", "A type of product"), "B", "A catalyst speeds up a reaction without being consumed."],
    ],
    4: [
      ["What is Newton's First Law?", mc("F = ma", "An object in motion stays in motion unless acted on by an unbalanced force", "For every action there is an equal and opposite reaction", "The acceleration of an object is proportional to the net force"), "B", "Newton's First Law (inertia): an object continues its state of motion unless acted on by a net force."],
      ["What is Newton's Second Law?", mc("An object in motion stays in motion", "F = ma (force equals mass times acceleration)", "For every action there is an equal and opposite reaction", "Objects attract each other with gravitational force"), "B", "Newton's Second Law: F = ma."],
      ["What is Newton's Third Law?", mc("F = ma", "An object in motion stays in motion", "For every action there is an equal and opposite reaction", "Gravity acts on all objects"), "C", "Newton's Third Law: for every action, there is an equal and opposite reaction."],
      ["What is the difference between speed and velocity?", mc("They are the same", "Speed is the magnitude of motion; velocity includes direction", "Velocity is the magnitude; speed includes direction", "Speed is always greater than velocity"), "B", "Speed is the magnitude of motion; velocity includes both magnitude and direction."],
      ["What is acceleration?", mc("The rate of change of position", "The rate of change of velocity", "The rate of change of force", "The rate of change of mass"), "B", "Acceleration is the rate of change of velocity."],
    ],
    5: [
      ["What is the difference between kinetic and potential energy?", mc("They are the same", "Kinetic is energy of motion; potential is stored energy", "Potential is energy of motion; kinetic is stored energy", "Kinetic energy is always greater"), "B", "Kinetic energy is energy of motion; potential energy is stored energy."],
      ["What is the law of conservation of energy?", mc("Energy is created in reactions", "Energy cannot be created or destroyed, only transformed", "Energy is destroyed in reactions", "Energy always increases"), "B", "Energy cannot be created or destroyed — only transformed from one form to another."],
      ["What is work in physics?", mc("Any effort", "Force applied over a distance (W = Fd)", "Energy stored in an object", "The rate of energy transfer"), "B", "Work = force × distance (W = Fd), measured in joules."],
      ["What is power?", mc("Force × distance", "The rate at which work is done (P = W/t)", "Energy stored", "Force × time"), "B", "Power is the rate of doing work: P = W/t, measured in watts."],
      ["What is a simple machine?", mc("A complex device", "A device that makes work easier by changing the direction or magnitude of force", "A type of engine", "A type of motor"), "B", "Simple machines (lever, pulley, inclined plane, etc.) make work easier by changing force or direction."],
    ],
    6: [
      ["What is a wave?", mc("A particle", "A disturbance that transfers energy through matter or space", "A type of force", "A type of particle"), "B", "A wave is a disturbance that transfers energy through matter or space."],
      ["What is the difference between transverse and longitudinal waves?", mc("They are the same", "Transverse waves vibrate perpendicular to direction; longitudinal waves vibrate parallel", "Longitudinal waves vibrate perpendicular; transverse waves vibrate parallel", "Transverse waves are faster"), "B", "Transverse: vibration perpendicular to direction; longitudinal: vibration parallel to direction."],
      ["What is the electromagnetic spectrum?", mc("A type of wave", "The range of all electromagnetic radiation, from radio waves to gamma rays", "A type of light", "A type of sound"), "B", "The electromagnetic spectrum ranges from radio waves (low energy) to gamma rays (high energy)."],
      ["What is the speed of light?", mc("3 × 10⁶ m/s", "3 × 10⁸ m/s", "3 × 10¹⁰ m/s", "3 × 10⁴ m/s"), "B", "The speed of light in a vacuum is approximately 3 × 10⁸ m/s."],
      ["What is refraction?", mc("The bouncing of light off a surface", "The bending of light as it passes from one medium to another", "The absorption of light", "The scattering of light"), "B", "Refraction is the bending of light as it passes from one medium to another."],
    ],
    7: [
      ["What is Ohm's Law?", mc("V = IR (voltage = current × resistance)", "V = I/R", "I = VR", "R = VI"), "A", "Ohm's Law: V = IR (voltage = current × resistance)."],
      ["What is the difference between series and parallel circuits?", mc("They are the same", "Series: one path for current; parallel: multiple paths for current", "Parallel: one path; series: multiple paths", "Series circuits are more efficient"), "B", "Series: one current path; parallel: multiple current paths."],
      ["What is a magnet?", mc("A type of electric charge", "An object that produces a magnetic field and attracts ferromagnetic materials", "A type of conductor", "A type of insulator"), "B", "A magnet produces a magnetic field and attracts ferromagnetic materials."],
      ["What is electromagnetic induction?", mc("The creation of a magnetic field by a current", "The generation of an electric current by a changing magnetic field", "The attraction between magnets", "The repulsion between magnets"), "B", "Electromagnetic induction generates electric current from a changing magnetic field."],
      ["What is the difference between a conductor and an insulator?", mc("They are the same", "A conductor allows electricity to flow; an insulator does not", "An insulator allows electricity to flow; a conductor does not", "Conductors are always metals"), "B", "Conductors allow electricity to flow; insulators resist the flow of electricity."],
    ],
    8: [
      ["What is the greenhouse effect?", mc("Growing plants in a greenhouse", "The trapping of heat in Earth's atmosphere by greenhouse gases", "The cooling of Earth's surface", "The ozone layer"), "B", "The greenhouse effect traps heat in Earth's atmosphere, warming the planet."],
      ["What are the main greenhouse gases?", mc("Oxygen, nitrogen, argon", "Carbon dioxide, methane, water vapour, nitrous oxide", "Oxygen, carbon dioxide, nitrogen", "Methane, oxygen, argon"), "B", "Main greenhouse gases: CO₂, methane, water vapour, and nitrous oxide."],
      ["What is the difference between weather and climate?", mc("Weather is long-term; climate is short-term", "Weather is short-term conditions; climate is long-term patterns", "They are the same", "Climate is measured daily"), "B", "Weather = short-term conditions; climate = long-term patterns.", ],
      ["What is the water cycle?", mc("The process of photosynthesis", "The continuous movement of water through evaporation, condensation, and precipitation", "The process of osmosis", "The movement of water in cells"), "B", "The water cycle describes water's continuous movement through evaporation, condensation, and precipitation."],
      ["What is biodiversity and why is it important?", mc("The number of individuals in a species", "The variety of species in an ecosystem; important for ecosystem stability and resilience", "The number of ecosystems", "The genetic similarity"), "B", "Biodiversity is the variety of species; it is crucial for ecosystem stability and resilience."],
    ],
  };
  return banks[unit] || [];
}

async function seedG8KAPSS() {
  console.log("Seeding Grade 8 KAP Social Studies (US History)...");
  const cid = await insertCourse("G8KAPSS", "Grade 8 KAP Social Studies — U.S. History", "social_studies", "8",
    "Katy ISD Grade 8 KAP Social Studies is an advanced pathway exploring U.S. history from the colonial period through Reconstruction. Students engage in primary source analysis, historical argumentation, constitutional reasoning, and civic understanding at an advanced level.",
    "TEKS 8 Social Studies KAP", 382);

  const units = [
    [1, "Colonial America & the Road to Revolution", "Advanced study of colonial society, Enlightenment ideas, and the causes of the American Revolution.", "TEKS 8.1"],
    [2, "The American Revolution & Founding Documents", "The Revolution, Declaration of Independence, Articles of Confederation, and Constitutional Convention.", "TEKS 8.2"],
    [3, "The Constitution & Bill of Rights", "Constitutional principles, separation of powers, checks and balances, federalism, and the Bill of Rights.", "TEKS 8.3"],
    [4, "The Early Republic & Westward Expansion", "The early republic, Manifest Destiny, westward expansion, and its impact on Native Americans.", "TEKS 8.4"],
    [5, "Jacksonian Democracy & Reform Movements", "Jacksonian democracy, the Second Great Awakening, abolitionism, and women's rights.", "TEKS 8.5"],
    [6, "Sectionalism & the Road to Civil War", "Sectionalism, slavery debates, Compromise of 1850, Kansas-Nebraska Act, and secession.", "TEKS 8.6"],
    [7, "The Civil War", "Causes, major battles, military strategies, key figures, and the Emancipation Proclamation.", "TEKS 8.7"],
    [8, "Reconstruction & Its Legacy", "Reconstruction plans, constitutional amendments, Freedmen's Bureau, and the end of Reconstruction.", "TEKS 8.8"],
  ];

  for (const [num, title, overview, teks] of units) {
    const uid = await insertUnit(cid, num, title, overview, teks, num);
    const skillBase = (num - 1) * 3 + 1;
    const skills = [
      [`G8KAPSS-U${num}-S1`, `${title} — Core Concepts`],
      [`G8KAPSS-U${num}-S2`, `${title} — Analysis & Interpretation`],
      [`G8KAPSS-U${num}-S3`, `${title} — Application & Evaluation`],
    ];
    for (let i = 0; i < skills.length; i++) {
      await insertSkill(cid, skills[i][0], skills[i][1], uid, num, skillBase + i);
    }
    const qData = getG8KAPSSQuiz(num);
    for (let i = 0; i < qData.length; i++) {
      await insertQuizQ(cid, uid, qData[i][0], qData[i][1], qData[i][2], qData[i][3], skills[i % 3][0], i < 2 ? 'medium' : 'hard', i + 1);
    }
  }
  // Copy G6KAPSS diagnostic with code substitution
  const [rows] = await db.execute('SELECT * FROM diagnosticQuestions WHERE courseId=(SELECT id FROM courses WHERE courseCode="G6KAPSS") ORDER BY sortOrder');
  for (const row of rows) {
    const newQId = row.questionId.replace('G6KAPSS', 'G8KAPSS');
    const choices = typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices;
    await insertDiagQ(cid, newQId, row.questionText, choices, row.correctAnswer, row.mapsToUnit, row.difficulty, row.explanation, row.sortOrder);
  }
  console.log("Grade 8 KAP Social Studies done.");
}

function getG8KAPSSQuiz(unit) {
  const banks = {
    1: [
      ["What were the main reasons colonists came to America?", mc("Only religious freedom", "Religious freedom, economic opportunity, and political freedom", "Only economic opportunity", "Only political freedom"), "B", "Colonists came for religious freedom, economic opportunity, and political freedom."],
      ["What was the Enlightenment?", mc("A religious movement", "An intellectual movement emphasising reason, individual rights, and scientific thinking", "A political revolution", "An economic movement"), "B", "The Enlightenment emphasised reason, individual rights, and scientific thinking."],
      ["What was the significance of the Magna Carta?", mc("It established the US Constitution", "It was an early document limiting royal power and establishing rights", "It was a trade agreement", "It was a religious document"), "B", "The Magna Carta (1215) limited royal power and established early rights."],
      ["What was the Proclamation of 1763?", mc("A declaration of independence", "A British law prohibiting colonists from settling west of the Appalachian Mountains", "A tax law", "A trade agreement"), "B", "The Proclamation of 1763 prohibited colonists from settling west of the Appalachians."],
      ["What was the significance of the Boston Tea Party?", mc("A tea trade agreement", "A colonial protest against British taxation without representation", "A British military action", "A trade boycott"), "B", "The Boston Tea Party was a colonial protest against British taxation without representation."],
    ],
    2: [
      ["What are the main ideas in the Declaration of Independence?", mc("Economic rights only", "Natural rights, government by consent, and the right to revolution", "Military strategy", "Religious freedom only"), "B", "The Declaration asserts natural rights, government by consent, and the right to revolution."],
      ["Who wrote the Declaration of Independence?", mc("George Washington", "Thomas Jefferson", "Benjamin Franklin", "John Adams"), "B", "Thomas Jefferson was the primary author of the Declaration of Independence."],
      ["What were the weaknesses of the Articles of Confederation?", mc("It was too strong", "No power to tax, no national army, no executive, required unanimous consent for amendments", "It was too similar to the Constitution", "It had too many branches"), "B", "The Articles had no taxing power, no national army, no executive, and required unanimity for amendments."],
      ["What was the Constitutional Convention?", mc("A meeting to declare independence", "A 1787 meeting in Philadelphia to create a new constitution", "A meeting to ratify the Bill of Rights", "A meeting to elect the first president"), "B", "The Constitutional Convention (1787) created the US Constitution in Philadelphia."],
      ["What was the Great Compromise?", mc("A compromise on slavery", "A compromise creating a bicameral legislature with equal Senate representation and proportional House representation", "A compromise on taxation", "A compromise on the presidency"), "B", "The Great Compromise created the bicameral legislature: equal Senate + proportional House."],
    ],
    3: [
      ["What is the separation of powers?", mc("The division of power between states and the federal government", "The division of government into three branches: legislative, executive, and judicial", "The division of power between the president and Congress", "The division of power between the military and government"), "B", "Separation of powers divides government into legislative, executive, and judicial branches."],
      ["What is checks and balances?", mc("A financial system", "A system where each branch of government limits the power of the others", "A type of election", "A type of law"), "B", "Checks and balances ensure each branch can limit the power of the others."],
      ["What is federalism?", mc("A type of government", "The division of power between the national and state governments", "A type of election", "A type of law"), "B", "Federalism divides power between the national and state governments."],
      ["What is the Bill of Rights?", mc("The Declaration of Independence", "The first ten amendments to the Constitution, protecting individual rights", "The Constitution itself", "A type of law"), "B", "The Bill of Rights is the first ten amendments protecting individual rights."],
      ["What does the First Amendment protect?", mc("The right to bear arms", "Freedom of religion, speech, press, assembly, and petition", "The right to a fair trial", "The right to vote"), "B", "The First Amendment protects freedom of religion, speech, press, assembly, and petition."],
    ],
    4: [
      ["What was Manifest Destiny?", mc("A type of government", "The belief that the US was destined to expand across North America", "A military strategy", "A type of treaty"), "B", "Manifest Destiny was the belief that the US was destined to expand across North America."],
      ["What was the Louisiana Purchase?", mc("A war with France", "The 1803 purchase of land from France that doubled the size of the US", "A trade agreement", "A type of treaty"), "B", "The Louisiana Purchase (1803) doubled the size of the US by purchasing land from France."],
      ["What was the Trail of Tears?", mc("A trade route", "The forced relocation of Native Americans from the Southeast to Indian Territory", "A military campaign", "A type of treaty"), "B", "The Trail of Tears was the forced relocation of Native Americans to Indian Territory."],
      ["What was the significance of the Lewis and Clark Expedition?", mc("To find gold", "To explore the Louisiana Purchase territory and find a route to the Pacific", "To establish trade with Native Americans", "To map the Mississippi River"), "B", "Lewis and Clark explored the Louisiana Purchase and sought a route to the Pacific."],
      ["What was the Missouri Compromise?", mc("A compromise on taxation", "A compromise admitting Missouri as a slave state and Maine as a free state, drawing a line at 36°30'", "A compromise on the presidency", "A compromise on trade"), "B", "The Missouri Compromise (1820) balanced slave and free states and drew the 36°30' line."],
    ],
    5: [
      ["What was Jacksonian Democracy?", mc("A type of government", "A political movement expanding voting rights to white men and emphasising the 'common man'", "A military strategy", "A type of economy"), "B", "Jacksonian Democracy expanded voting rights to white men and championed the 'common man.'"],
      ["What was the Second Great Awakening?", mc("A political movement", "A religious revival movement that inspired social reform", "An economic movement", "A military movement"), "B", "The Second Great Awakening was a religious revival that inspired social reform movements."],
      ["What was the abolitionist movement?", mc("A movement to expand slavery", "A movement to end slavery", "A movement for women's rights only", "A movement for economic rights"), "B", "The abolitionist movement sought to end slavery in the United States."],
      ["Who was Frederick Douglass?", mc("A US president", "A formerly enslaved person who became a leading abolitionist and orator", "A Confederate general", "A Union general"), "B", "Frederick Douglass was a formerly enslaved person who became a leading abolitionist."],
      ["What was the Seneca Falls Convention?", mc("A political convention", "The 1848 convention that launched the women's rights movement in the US", "A military convention", "An economic convention"), "B", "The Seneca Falls Convention (1848) launched the women's rights movement in the US."],
    ],
    6: [
      ["What is sectionalism?", mc("National unity", "Excessive loyalty to the interests of one's region over the nation", "A type of government", "A type of economy"), "B", "Sectionalism is excessive loyalty to regional interests over national interests."],
      ["What was the Compromise of 1850?", mc("A compromise ending the Civil War", "A series of laws admitting California as free, establishing popular sovereignty in new territories, and strengthening the Fugitive Slave Act", "A compromise on taxation", "A compromise on trade"), "B", "The Compromise of 1850 admitted California as free and strengthened the Fugitive Slave Act."],
      ["What was the Kansas-Nebraska Act?", mc("A law admitting Kansas and Nebraska as states", "A law allowing popular sovereignty to decide slavery in Kansas and Nebraska, repealing the Missouri Compromise", "A trade agreement", "A military law"), "B", "The Kansas-Nebraska Act (1854) allowed popular sovereignty on slavery, repealing the Missouri Compromise."],
      ["What was 'Bleeding Kansas'?", mc("A natural disaster", "A period of violent conflict in Kansas between pro-slavery and anti-slavery settlers", "A military battle", "A type of law"), "B", "'Bleeding Kansas' was violent conflict between pro-slavery and anti-slavery settlers in Kansas."],
      ["What was the significance of the Dred Scott decision?", mc("It freed enslaved people", "It ruled that enslaved people were property, not citizens, and that Congress could not ban slavery in territories", "It ended slavery", "It established voting rights"), "B", "Dred Scott ruled enslaved people were property, not citizens, and Congress couldn't ban slavery in territories."],
    ],
    7: [
      ["What were the main causes of the Civil War?", mc("Only slavery", "Slavery, sectionalism, states' rights, and economic differences", "Only economic differences", "Only political differences"), "B", "The Civil War resulted from slavery, sectionalism, states' rights, and economic differences."],
      ["What was the Emancipation Proclamation?", mc("A law ending slavery", "Lincoln's 1863 executive order declaring enslaved people in Confederate states free", "A constitutional amendment", "A peace treaty"), "B", "The Emancipation Proclamation (1863) declared enslaved people in Confederate states free."],
      ["What was the significance of the Battle of Gettysburg?", mc("A Confederate victory", "A Union victory that turned the tide of the war and ended Confederate invasion of the North", "A draw", "A naval battle"), "B", "Gettysburg (1863) was a Union victory that ended Confederate invasion of the North."],
      ["Who was Abraham Lincoln?", mc("A Confederate president", "The 16th US President who led the Union through the Civil War and issued the Emancipation Proclamation", "A Union general", "A Confederate general"), "B", "Lincoln was the 16th President who led the Union and issued the Emancipation Proclamation."],
      ["What was the significance of the Gettysburg Address?", mc("A military order", "Lincoln's speech redefining the Civil War as a fight for equality and democracy", "A peace treaty", "A constitutional amendment"), "B", "The Gettysburg Address redefined the Civil War as a fight for equality and democratic ideals."],
    ],
    8: [
      ["What were the three Reconstruction Amendments?", mc("1st, 2nd, 3rd", "13th (abolishing slavery), 14th (citizenship), 15th (voting rights)", "14th, 15th, 16th", "10th, 11th, 12th"), "B", "The Reconstruction Amendments: 13th (abolish slavery), 14th (citizenship), 15th (voting rights)."],
      ["What was the Freedmen's Bureau?", mc("A Confederate agency", "A federal agency helping formerly enslaved people transition to freedom", "A state agency", "A private organisation"), "B", "The Freedmen's Bureau helped formerly enslaved people transition to freedom."],
      ["What were the Black Codes?", mc("Laws protecting African Americans", "Laws restricting the rights of formerly enslaved people after the Civil War", "A type of currency", "A military code"), "B", "Black Codes restricted the rights and freedoms of formerly enslaved people after the Civil War."],
      ["What was the significance of the 14th Amendment?", mc("It abolished slavery", "It granted citizenship to all persons born in the US and guaranteed equal protection", "It gave voting rights to African Americans", "It established Reconstruction"), "B", "The 14th Amendment granted citizenship and equal protection to all persons born in the US."],
      ["What ended Reconstruction?", mc("The Civil War", "The Compromise of 1877, which withdrew federal troops from the South", "The 15th Amendment", "The Freedmen's Bureau"), "B", "The Compromise of 1877 withdrew federal troops from the South, ending Reconstruction."],
    ],
  };
  return banks[unit] || [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANK B EXPANSION FOR NEW KAP COURSES (57 questions each)
// ═══════════════════════════════════════════════════════════════════════════════
async function expandNewKAPBankB() {
  // Copy Bank B from G6KAPSCI to G7KAPSCI and G8KAPSCI
  const courses = [
    ['G6KAPSCI', 'G7KAPSCI'],
    ['G6KAPSCI', 'G8KAPSCI'],
    ['G6KAPSS', 'G7KAPSS'],
    ['G6KAPSS', 'G8KAPSS'],
  ];
  for (const [fromCode, toCode] of courses) {
    const [[fromRow]] = await db.execute('SELECT id FROM courses WHERE courseCode=?', [fromCode]);
    const [[toRow]] = await db.execute('SELECT id FROM courses WHERE courseCode=?', [toCode]);
    if (!fromRow || !toRow) { console.log(`SKIP ${fromCode} → ${toCode}`); continue; }
    const [rows] = await db.execute(
      'SELECT * FROM diagnosticQuestions WHERE courseId=? AND sortOrder>=31 ORDER BY sortOrder',
      [fromRow.id]
    );
    for (const row of rows) {
      const newQId = row.questionId.replace(new RegExp(fromCode, 'g'), toCode);
      const choices = typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices;
      await db.execute(
        `INSERT INTO diagnosticQuestions (questionId,questionText,questionType,choices,correctAnswer,mapsToUnit,mapsToSkills,difficulty,explanation,sortOrder,courseId)
         VALUES (?,?,'multiple_choice',?,?,?,'[]',?,?,?,?)
         ON DUPLICATE KEY UPDATE questionText=VALUES(questionText)`,
        [newQId, row.questionText, JSON.stringify(choices), row.correctAnswer, row.mapsToUnit, row.difficulty, row.explanation, row.sortOrder, toRow.id]
      );
    }
    console.log(`${toCode} Bank B done (copied from ${fromCode})`);
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting KAP Science & Social Studies seeding for Grades 6-8...');
  await seedG6KAPSci();
  await seedG6KAPSS();
  await seedG7KAPSci();
  await seedG7KAPSS();
  await seedG8KAPSci();
  await seedG8KAPSS();
  await expandNewKAPBankB();
  console.log('All KAP Science & Social Studies courses seeded!');
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
