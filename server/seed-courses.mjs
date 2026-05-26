/**
 * seed-courses.mjs
 * Seeds all new Katy ISD courses: English I, Biology I, AP Human Geography,
 * Spanish 2, and 3rd Grade (Math, ELA, Science, Social Studies).
 *
 * Run: node server/seed-courses.mjs
 */

import mysql from "mysql2/promise";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL not set");

// Parse DATABASE_URL which may contain ?ssl={"rejectUnauthorized":true}
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

// ─── Helper ───────────────────────────────────────────────────────────────────
async function insertCourse(code, title, subject, grade, description, teks, sortOrder) {
  const [rows] = await db.execute(
    `INSERT INTO courses (courseCode, title, subject, gradeLevel, description, teksCode, isActive, isDefault, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, true, false, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description)`,
    [code, title, subject, grade, description, teks, sortOrder]
  );
  const [existing] = await db.execute(`SELECT id FROM courses WHERE courseCode=?`, [code]);
  return existing[0].id;
}

async function insertUnit(courseId, unitNumber, title, overview, teks, sortOrder) {
  const [rows] = await db.execute(
    `INSERT INTO units (courseId, unitNumber, title, overview, teksAlignment, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title=VALUES(title)`,
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
// COURSE 2: 9th Grade English I
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding English I...");
const eng1Id = await insertCourse(
  "ENG1", "English I", "english", "9",
  "Katy ISD 9th Grade English I — reading, writing, grammar, and literary analysis aligned to TEKS.",
  "TEKS 110.39", 2
);

const eng1Units = [
  [1, "Reading Foundations & Comprehension", "Literal and inferential comprehension strategies, main idea, supporting details, and text structure.", "TEKS 110.39(b)(6)", 10],
  [2, "Literary Analysis: Fiction & Poetry", "Analyzing plot, characterization, theme, point of view, figurative language, and poetic devices.", "TEKS 110.39(b)(7)", 20],
  [3, "Informational & Expository Texts", "Evaluating author's purpose, text features, central idea, and synthesizing multiple sources.", "TEKS 110.39(b)(8)", 30],
  [4, "Vocabulary & Academic Language", "Context clues, word relationships, Greek/Latin roots, connotation vs denotation.", "TEKS 110.39(b)(3)", 40],
  [5, "Grammar & Conventions", "Parts of speech, sentence structure, punctuation, capitalization, and subject-verb agreement.", "TEKS 110.39(b)(11)", 50],
  [6, "Narrative Writing", "Personal narratives, story elements, descriptive language, dialogue, and revision strategies.", "TEKS 110.39(b)(10)", 60],
  [7, "Expository & Argumentative Writing", "Thesis statements, evidence, logical reasoning, counterarguments, and MLA citations.", "TEKS 110.39(b)(10)", 70],
  [8, "Research & Synthesis", "Research process, evaluating sources, note-taking, paraphrasing, and avoiding plagiarism.", "TEKS 110.39(b)(9)", 80],
];

for (const [num, title, overview, teks, sort] of eng1Units) {
  const uid = await insertUnit(eng1Id, num, title, overview, teks, sort);
  const prefix = `ENG1-U${num}`;
  // Skills
  const skillSets = {
    1: [["S1","Identify main idea and supporting details"],["S2","Make inferences from text evidence"],["S3","Analyze text structure (cause/effect, compare/contrast, problem/solution)"]],
    2: [["S1","Analyze plot structure (exposition, rising action, climax, resolution)"],["S2","Identify characterization techniques"],["S3","Interpret theme and author's message"],["S4","Analyze figurative language and poetic devices"]],
    3: [["S1","Identify author's purpose and perspective"],["S2","Evaluate text features and organizational patterns"],["S3","Synthesize information from multiple sources"]],
    4: [["S1","Use context clues to determine word meaning"],["S2","Analyze Greek and Latin roots, prefixes, and suffixes"],["S3","Distinguish connotation from denotation"]],
    5: [["S1","Identify and use parts of speech correctly"],["S2","Construct varied sentence structures"],["S3","Apply punctuation and capitalization rules"]],
    6: [["S1","Write a personal narrative with a clear sequence of events"],["S2","Use descriptive language and sensory details"],["S3","Incorporate dialogue effectively"]],
    7: [["S1","Develop a clear thesis statement"],["S2","Support claims with relevant evidence and reasoning"],["S3","Address counterarguments"]],
    8: [["S1","Formulate research questions and locate credible sources"],["S2","Paraphrase and cite sources in MLA format"],["S3","Synthesize research into a coherent argument"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(eng1Id, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  // Quiz questions (3 per unit)
  const quizSets = {
    1: [
      ["What is the MAIN purpose of supporting details in a paragraph?","multiple_choice",[{label:"A",text:"To introduce a new topic"},{label:"B",text:"To provide evidence for the main idea"},{label:"C",text:"To summarize the entire passage"},{label:"D",text:"To entertain the reader"}],"B","Supporting details provide evidence, examples, or explanations that back up the main idea.",`${prefix}-S1`,"easy"],
      ["A student reads: 'The gym was silent except for the squeak of sneakers.' What can be INFERRED?","multiple_choice",[{label:"A",text:"The gym is empty"},{label:"B",text:"A basketball game is being played"},{label:"C",text:"The gym is being cleaned"},{label:"D",text:"Students are studying"}],"B","The squeak of sneakers on a gym floor suggests athletic activity, most likely a basketball game.",`${prefix}-S2`,"medium"],
      ["Which text structure presents events in the order they occurred?","multiple_choice",[{label:"A",text:"Compare/Contrast"},{label:"B",text:"Cause/Effect"},{label:"C",text:"Chronological/Sequence"},{label:"D",text:"Problem/Solution"}],"C","Chronological structure presents events in time order.",`${prefix}-S3`,"easy"],
    ],
    2: [
      ["The part of a story that introduces characters and setting is called the:","multiple_choice",[{label:"A",text:"Climax"},{label:"B",text:"Resolution"},{label:"C",text:"Exposition"},{label:"D",text:"Rising action"}],"C","The exposition introduces the characters, setting, and initial situation.",`${prefix}-S1`,"easy"],
      ["'The wind howled like a hungry wolf.' This is an example of:","multiple_choice",[{label:"A",text:"Metaphor"},{label:"B",text:"Simile"},{label:"C",text:"Personification"},{label:"D",text:"Alliteration"}],"B","A simile makes a comparison using 'like' or 'as'.",`${prefix}-S4`,"easy"],
      ["A character who changes significantly throughout a story is called:","multiple_choice",[{label:"A",text:"A static character"},{label:"B",text:"An antagonist"},{label:"C",text:"A dynamic character"},{label:"D",text:"A foil"}],"C","A dynamic character undergoes significant internal change.",`${prefix}-S2`,"medium"],
    ],
    3: [
      ["An author who writes to convince the reader of a position has what purpose?","multiple_choice",[{label:"A",text:"To inform"},{label:"B",text:"To entertain"},{label:"C",text:"To persuade"},{label:"D",text:"To describe"}],"C","Persuasive writing aims to convince the reader to adopt a viewpoint.",`${prefix}-S1`,"easy"],
      ["Which text feature helps readers navigate a non-fiction book?","multiple_choice",[{label:"A",text:"Dialogue"},{label:"B",text:"Table of contents"},{label:"C",text:"Flashback"},{label:"D",text:"Foreshadowing"}],"B","A table of contents is a navigational text feature in non-fiction.",`${prefix}-S2`,"easy"],
      ["When combining information from two sources, a student is:","multiple_choice",[{label:"A",text:"Plagiarizing"},{label:"B",text:"Paraphrasing"},{label:"C",text:"Synthesizing"},{label:"D",text:"Summarizing"}],"C","Synthesis combines information from multiple sources into a new understanding.",`${prefix}-S3`,"medium"],
    ],
    4: [
      ["The word 'benevolent' contains the Latin root 'bene' meaning:","multiple_choice",[{label:"A",text:"Bad"},{label:"B",text:"Good/well"},{label:"C",text:"Many"},{label:"D",text:"Time"}],"B","'Bene' is a Latin root meaning good or well.",`${prefix}-S2`,"medium"],
      ["In the sentence 'She was a snake in the grass,' 'snake' has a _____ connotation.","multiple_choice",[{label:"A",text:"Positive"},{label:"B",text:"Neutral"},{label:"C",text:"Negative"},{label:"D",text:"Literal"}],"C","'Snake' carries a negative connotation of deceit or danger.",`${prefix}-S3`,"medium"],
      ["Which context clue strategy uses surrounding words to infer meaning?","multiple_choice",[{label:"A",text:"Root analysis"},{label:"B",text:"Definition clue"},{label:"C",text:"Example clue"},{label:"D",text:"All of the above"}],"D","All three strategies can be used as context clues.",`${prefix}-S1`,"easy"],
    ],
    5: [
      ["Which sentence contains a subject-verb agreement error?","multiple_choice",[{label:"A",text:"The dogs bark loudly."},{label:"B",text:"She runs every morning."},{label:"C",text:"The team are playing well."},{label:"D",text:"He reads every night."}],"C","'Team' is a collective noun treated as singular in American English; should be 'is playing'.",`${prefix}-S3`,"medium"],
      ["A sentence that contains two independent clauses joined by a coordinating conjunction is a:","multiple_choice",[{label:"A",text:"Simple sentence"},{label:"B",text:"Compound sentence"},{label:"C",text:"Complex sentence"},{label:"D",text:"Fragment"}],"B","A compound sentence joins two independent clauses with a coordinating conjunction.",`${prefix}-S2`,"medium"],
      ["Which word is an adverb in: 'She quickly finished her homework'?","multiple_choice",[{label:"A",text:"She"},{label:"B",text:"quickly"},{label:"C",text:"finished"},{label:"D",text:"homework"}],"B","'Quickly' modifies the verb 'finished' and is therefore an adverb.",`${prefix}-S1`,"easy"],
    ],
    6: [
      ["The opening of a narrative that grabs the reader's attention is called a:","multiple_choice",[{label:"A",text:"Thesis"},{label:"B",text:"Hook"},{label:"C",text:"Transition"},{label:"D",text:"Resolution"}],"B","A hook is an engaging opening that draws the reader in.",`${prefix}-S1`,"easy"],
      ["Sensory details appeal to the reader's:","multiple_choice",[{label:"A",text:"Logic"},{label:"B",text:"Five senses"},{label:"C",text:"Prior knowledge"},{label:"D",text:"Emotions only"}],"B","Sensory details describe sights, sounds, smells, tastes, and textures.",`${prefix}-S2`,"easy"],
      ["Dialogue in a narrative should be punctuated with:","multiple_choice",[{label:"A",text:"Parentheses"},{label:"B",text:"Quotation marks"},{label:"C",text:"Italics"},{label:"D",text:"Brackets"}],"B","Dialogue is enclosed in quotation marks.",`${prefix}-S3`,"easy"],
    ],
    7: [
      ["A thesis statement should:","multiple_choice",[{label:"A",text:"State a fact"},{label:"B",text:"Ask a question"},{label:"C",text:"Present a debatable claim"},{label:"D",text:"Summarize the essay"}],"C","A thesis presents a debatable claim that the essay will support.",`${prefix}-S1`,"medium"],
      ["Addressing the opposing viewpoint in an argument is called:","multiple_choice",[{label:"A",text:"Concession"},{label:"B",text:"Counterargument"},{label:"C",text:"Rebuttal"},{label:"D",text:"Both B and C"}],"D","Acknowledging and refuting opposing views involves both counterargument and rebuttal.",`${prefix}-S3`,"medium"],
      ["Which type of evidence is MOST credible in an academic argument?","multiple_choice",[{label:"A",text:"Personal opinion"},{label:"B",text:"Peer-reviewed research"},{label:"C",text:"Social media posts"},{label:"D",text:"Anecdotes"}],"B","Peer-reviewed research is the most credible form of academic evidence.",`${prefix}-S2`,"medium"],
    ],
    8: [
      ["Which source is MOST reliable for a research paper?","multiple_choice",[{label:"A",text:"Wikipedia"},{label:"B",text:"A personal blog"},{label:"C",text:"A government .gov website"},{label:"D",text:"A social media post"}],"C","Government websites (.gov) are authoritative and reliable sources.",`${prefix}-S1`,"easy"],
      ["Presenting someone else's ideas as your own without citation is called:","multiple_choice",[{label:"A",text:"Paraphrasing"},{label:"B",text:"Summarizing"},{label:"C",text:"Plagiarism"},{label:"D",text:"Synthesizing"}],"C","Plagiarism is using someone else's work without proper attribution.",`${prefix}-S2`,"easy"],
      ["In MLA format, the list of sources at the end of a paper is called:","multiple_choice",[{label:"A",text:"Bibliography"},{label:"B",text:"Works Cited"},{label:"C",text:"References"},{label:"D",text:"Footnotes"}],"B","MLA format uses 'Works Cited' for the source list.",`${prefix}-S3`,"medium"],
    ],
  };
  for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of (quizSets[num] || []).entries()) {
    await insertQuizQ(eng1Id, uid, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
  }
}

// Diagnostic questions for English I
const eng1Diag = [
  ["ENG1-D01","What is the MAIN idea of a paragraph?","multiple_choice",[{label:"A",text:"The first sentence"},{label:"B",text:"The central point the paragraph is making"},{label:"C",text:"The longest sentence"},{label:"D",text:"The concluding sentence"}],"B","1",["ENG1-U1-S1"],"easy","The main idea is the central point, not necessarily the first or last sentence.",10],
  ["ENG1-D02","'Life is a rollercoaster.' This is an example of:","multiple_choice",[{label:"A",text:"Simile"},{label:"B",text:"Metaphor"},{label:"C",text:"Personification"},{label:"D",text:"Hyperbole"}],"B","2",["ENG1-U2-S4"],"easy","A metaphor makes a direct comparison without using 'like' or 'as'.",20],
  ["ENG1-D03","The prefix 'un-' in 'unhappy' means:","multiple_choice",[{label:"A",text:"Very"},{label:"B",text:"Again"},{label:"C",text:"Not"},{label:"D",text:"Before"}],"C","4",["ENG1-U4-S2"],"easy","The prefix 'un-' means not or the opposite of.",30],
  ["ENG1-D04","Which sentence is punctuated correctly?","multiple_choice",[{label:"A",text:"She said, I am ready."},{label:"B",text:'She said, "I am ready."'},{label:"C",text:"She said \"I am ready\"."},{label:"D",text:"She said: I am ready."}],"B","5",["ENG1-U5-S3"],"medium","Dialogue requires quotation marks around the spoken words.",40],
  ["ENG1-D05","A strong argumentative essay MUST include:","multiple_choice",[{label:"A",text:"A thesis, evidence, and counterargument"},{label:"B",text:"A hook, plot, and resolution"},{label:"C",text:"Characters, setting, and conflict"},{label:"D",text:"A bibliography and abstract"}],"A","7",["ENG1-U7-S1"],"medium","Argumentative essays require a thesis, supporting evidence, and acknowledgment of counterarguments.",50],
  ["ENG1-D06","Which text structure would BEST explain why a hurricane formed?","multiple_choice",[{label:"A",text:"Compare/Contrast"},{label:"B",text:"Chronological"},{label:"C",text:"Cause/Effect"},{label:"D",text:"Problem/Solution"}],"C","1",["ENG1-U1-S3"],"medium","Cause/effect structure explains why something happened.",60],
  ["ENG1-D07","An author writing to share information without bias has the purpose to:","multiple_choice",[{label:"A",text:"Persuade"},{label:"B",text:"Entertain"},{label:"C",text:"Inform"},{label:"D",text:"Describe"}],"C","3",["ENG1-U3-S1"],"easy","Informational writing aims to educate the reader objectively.",70],
  ["ENG1-D08","Which is an example of a compound sentence?","multiple_choice",[{label:"A",text:"She ran."},{label:"B",text:"She ran, and he walked."},{label:"C",text:"Because she ran, he walked."},{label:"D",text:"Running quickly, she arrived."}],"B","5",["ENG1-U5-S2"],"medium","A compound sentence joins two independent clauses with a coordinating conjunction.",80],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of eng1Diag) {
  await insertDiagQ(eng1Id, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 3: 9th Grade Biology I
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding Biology I...");
const bio1Id = await insertCourse(
  "BIO1", "Biology I", "science", "9",
  "Katy ISD 9th Grade Biology I — cell biology, genetics, evolution, ecology, and life processes aligned to TEKS.",
  "TEKS 112.34", 3
);

const bio1Units = [
  [1, "Cell Structure & Function", "Prokaryotic vs eukaryotic cells, organelles and their functions, cell membrane, and cell theory.", "TEKS 112.34(b)(4)", 10],
  [2, "Cell Processes", "Photosynthesis, cellular respiration, cell division (mitosis and meiosis), and the cell cycle.", "TEKS 112.34(b)(5)", 20],
  [3, "Genetics & Heredity", "DNA structure, protein synthesis, Mendelian genetics, Punnett squares, and mutations.", "TEKS 112.34(b)(6)", 30],
  [4, "Evolution & Natural Selection", "Darwin's theory, evidence for evolution, natural selection, adaptation, and speciation.", "TEKS 112.34(b)(7)", 40],
  [5, "Ecology & Ecosystems", "Biotic/abiotic factors, food webs, energy flow, ecological relationships, and biomes.", "TEKS 112.34(b)(12)", 50],
  [6, "Classification of Living Things", "Taxonomy, domains and kingdoms, dichotomous keys, and characteristics of major groups.", "TEKS 112.34(b)(8)", 60],
  [7, "Human Body Systems", "Structure and function of major body systems: digestive, circulatory, respiratory, nervous, immune.", "TEKS 112.34(b)(10)", 70],
  [8, "Scientific Investigations & Lab Skills", "Scientific method, experimental design, data analysis, microscopy, and lab safety.", "TEKS 112.34(b)(2)", 80],
];

for (const [num, title, overview, teks, sort] of bio1Units) {
  const uid = await insertUnit(bio1Id, num, title, overview, teks, sort);
  const prefix = `BIO1-U${num}`;
  const skillSets = {
    1: [["S1","Distinguish prokaryotic from eukaryotic cells"],["S2","Identify organelles and their functions"],["S3","Explain the cell membrane's role in homeostasis"]],
    2: [["S1","Describe photosynthesis and cellular respiration"],["S2","Explain the stages of mitosis"],["S3","Compare mitosis and meiosis"]],
    3: [["S1","Describe DNA structure and replication"],["S2","Explain protein synthesis (transcription and translation)"],["S3","Apply Punnett squares to predict inheritance patterns"]],
    4: [["S1","Explain Darwin's theory of natural selection"],["S2","Identify evidence for evolution"],["S3","Describe how adaptations arise over generations"]],
    5: [["S1","Distinguish biotic from abiotic factors"],["S2","Analyze food webs and energy pyramids"],["S3","Describe ecological relationships (predation, mutualism, parasitism)"]],
    6: [["S1","Explain the Linnaean classification system"],["S2","Use a dichotomous key to identify organisms"],["S3","Describe characteristics of the six kingdoms"]],
    7: [["S1","Describe the structure and function of the digestive system"],["S2","Explain how the circulatory and respiratory systems work together"],["S3","Describe the role of the nervous and immune systems"]],
    8: [["S1","Design a controlled experiment with variables and hypothesis"],["S2","Analyze and interpret data from graphs and tables"],["S3","Apply proper lab safety procedures"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(bio1Id, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  const quizSets = {
    1: [
      ["Which organelle is known as the 'powerhouse of the cell'?","multiple_choice",[{label:"A",text:"Nucleus"},{label:"B",text:"Ribosome"},{label:"C",text:"Mitochondria"},{label:"D",text:"Golgi apparatus"}],"C","The mitochondria produces ATP through cellular respiration.",`${prefix}-S2`,"easy"],
      ["What distinguishes prokaryotic cells from eukaryotic cells?","multiple_choice",[{label:"A",text:"Prokaryotes have a nucleus"},{label:"B",text:"Prokaryotes lack a membrane-bound nucleus"},{label:"C",text:"Eukaryotes lack organelles"},{label:"D",text:"Prokaryotes are always larger"}],"B","Prokaryotes lack a membrane-bound nucleus; their DNA floats freely in the cytoplasm.",`${prefix}-S1`,"medium"],
      ["The cell membrane is described as 'selectively permeable' because:","multiple_choice",[{label:"A",text:"It allows all substances to pass freely"},{label:"B",text:"It blocks all substances"},{label:"C",text:"It allows some substances to pass while blocking others"},{label:"D",text:"It only allows water to pass"}],"C","Selective permeability means the membrane controls what enters and exits.",`${prefix}-S3`,"medium"],
    ],
    2: [
      ["During photosynthesis, plants convert light energy into:","multiple_choice",[{label:"A",text:"ATP and water"},{label:"B",text:"Glucose and oxygen"},{label:"C",text:"Carbon dioxide and water"},{label:"D",text:"Nitrogen and oxygen"}],"B","Photosynthesis converts CO₂ and water into glucose and oxygen using light energy.",`${prefix}-S1`,"easy"],
      ["Which phase of mitosis involves chromosomes lining up at the cell's equator?","multiple_choice",[{label:"A",text:"Prophase"},{label:"B",text:"Anaphase"},{label:"C",text:"Metaphase"},{label:"D",text:"Telophase"}],"C","During metaphase, chromosomes align along the metaphase plate.",`${prefix}-S2`,"medium"],
      ["Meiosis differs from mitosis in that meiosis:","multiple_choice",[{label:"A",text:"Produces 2 identical daughter cells"},{label:"B",text:"Produces 4 genetically unique haploid cells"},{label:"C",text:"Only occurs in somatic cells"},{label:"D",text:"Does not involve DNA replication"}],"B","Meiosis produces 4 haploid cells with genetic variation through crossing over.",`${prefix}-S3`,"medium"],
    ],
    3: [
      ["DNA is made up of nucleotides. Which base pairs with Adenine in DNA?","multiple_choice",[{label:"A",text:"Guanine"},{label:"B",text:"Cytosine"},{label:"C",text:"Thymine"},{label:"D",text:"Uracil"}],"C","In DNA, Adenine pairs with Thymine; Guanine pairs with Cytosine.",`${prefix}-S1`,"easy"],
      ["A Punnett square cross of Tt × Tt produces offspring in what ratio for the dominant phenotype?","multiple_choice",[{label:"A",text:"1:1"},{label:"B",text:"1:2:1"},{label:"C",text:"3:1"},{label:"D",text:"All dominant"}],"C","A Tt × Tt cross produces 3 dominant phenotype : 1 recessive phenotype.",`${prefix}-S3`,"medium"],
      ["The process of making an mRNA copy from a DNA template is called:","multiple_choice",[{label:"A",text:"Translation"},{label:"B",text:"Replication"},{label:"C",text:"Transcription"},{label:"D",text:"Mutation"}],"C","Transcription is the process of copying DNA into mRNA.",`${prefix}-S2`,"medium"],
    ],
    4: [
      ["Natural selection acts on which of the following?","multiple_choice",[{label:"A",text:"Genotype only"},{label:"B",text:"Phenotype"},{label:"C",text:"Mutations directly"},{label:"D",text:"Learned behaviors"}],"B","Natural selection acts on phenotype (observable traits), not genotype directly.",`${prefix}-S1`,"medium"],
      ["Which is NOT considered evidence for evolution?","multiple_choice",[{label:"A",text:"Fossil record"},{label:"B",text:"Homologous structures"},{label:"C",text:"DNA similarities"},{label:"D",text:"Identical environments"}],"D","Identical environments are not evidence for evolution; fossil records, homologous structures, and DNA similarities are.",`${prefix}-S2`,"medium"],
      ["An organism's inherited trait that increases its survival in its environment is called a(n):","multiple_choice",[{label:"A",text:"Mutation"},{label:"B",text:"Adaptation"},{label:"C",text:"Variation"},{label:"D",text:"Selection pressure"}],"B","An adaptation is a heritable trait that improves survival and reproduction.",`${prefix}-S3`,"easy"],
    ],
    5: [
      ["In a food web, organisms that make their own food are called:","multiple_choice",[{label:"A",text:"Consumers"},{label:"B",text:"Decomposers"},{label:"C",text:"Producers"},{label:"D",text:"Omnivores"}],"C","Producers (autotrophs) make their own food through photosynthesis.",`${prefix}-S2`,"easy"],
      ["A relationship where both organisms benefit is called:","multiple_choice",[{label:"A",text:"Parasitism"},{label:"B",text:"Commensalism"},{label:"C",text:"Mutualism"},{label:"D",text:"Predation"}],"C","Mutualism is a symbiotic relationship where both organisms benefit.",`${prefix}-S3`,"easy"],
      ["Which factor is ABIOTIC in an ecosystem?","multiple_choice",[{label:"A",text:"Trees"},{label:"B",text:"Bacteria"},{label:"C",text:"Temperature"},{label:"D",text:"Insects"}],"C","Temperature is an abiotic (non-living) factor in an ecosystem.",`${prefix}-S1`,"easy"],
    ],
    6: [
      ["The correct order of taxonomic classification from broadest to most specific is:","multiple_choice",[{label:"A",text:"Kingdom, Phylum, Class, Order, Family, Genus, Species"},{label:"B",text:"Species, Genus, Family, Order, Class, Phylum, Kingdom"},{label:"C",text:"Domain, Kingdom, Order, Class, Phylum, Family, Genus"},{label:"D",text:"Phylum, Kingdom, Class, Order, Family, Species, Genus"}],"A","The mnemonic 'King Philip Came Over For Good Soup' helps remember the order.",`${prefix}-S1`,"medium"],
      ["A dichotomous key uses _____ to identify organisms.","multiple_choice",[{label:"A",text:"Color charts"},{label:"B",text:"Paired contrasting statements"},{label:"C",text:"DNA sequences only"},{label:"D",text:"Geographic location"}],"B","A dichotomous key uses pairs of contrasting characteristics to identify organisms.",`${prefix}-S2`,"easy"],
      ["Which domain includes bacteria?","multiple_choice",[{label:"A",text:"Eukarya"},{label:"B",text:"Archaea"},{label:"C",text:"Bacteria"},{label:"D",text:"Protista"}],"C","Bacteria belong to the domain Bacteria.",`${prefix}-S3`,"easy"],
    ],
    7: [
      ["The primary function of the circulatory system is to:","multiple_choice",[{label:"A",text:"Filter waste from blood"},{label:"B",text:"Transport oxygen and nutrients to cells"},{label:"C",text:"Produce hormones"},{label:"D",text:"Digest food"}],"B","The circulatory system transports oxygen, nutrients, and waste products throughout the body.",`${prefix}-S2`,"easy"],
      ["Where does gas exchange occur in the respiratory system?","multiple_choice",[{label:"A",text:"Trachea"},{label:"B",text:"Bronchi"},{label:"C",text:"Alveoli"},{label:"D",text:"Diaphragm"}],"C","Gas exchange (O₂ in, CO₂ out) occurs in the alveoli of the lungs.",`${prefix}-S2`,"medium"],
      ["The nervous system's basic functional unit is the:","multiple_choice",[{label:"A",text:"Synapse"},{label:"B",text:"Neuron"},{label:"C",text:"Axon"},{label:"D",text:"Dendrite"}],"B","The neuron is the basic structural and functional unit of the nervous system.",`${prefix}-S3`,"easy"],
    ],
    8: [
      ["In an experiment, the variable that the scientist deliberately changes is the:","multiple_choice",[{label:"A",text:"Dependent variable"},{label:"B",text:"Control variable"},{label:"C",text:"Independent variable"},{label:"D",text:"Constant"}],"C","The independent variable is deliberately manipulated by the scientist.",`${prefix}-S1`,"easy"],
      ["A bar graph is MOST appropriate for displaying:","multiple_choice",[{label:"A",text:"Continuous change over time"},{label:"B",text:"Proportions of a whole"},{label:"C",text:"Comparing discrete categories"},{label:"D",text:"Correlation between two variables"}],"C","Bar graphs are best for comparing discrete categories.",`${prefix}-S2`,"medium"],
      ["Before handling chemicals in the lab, a student should FIRST:","multiple_choice",[{label:"A",text:"Begin the experiment"},{label:"B",text:"Read the safety data sheet (SDS)"},{label:"C",text:"Ask a classmate"},{label:"D",text:"Smell the chemical to identify it"}],"B","Reading the SDS before handling chemicals is a fundamental lab safety procedure.",`${prefix}-S3`,"easy"],
    ],
  };
  for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of (quizSets[num] || []).entries()) {
    await insertQuizQ(bio1Id, uid, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
  }
}

// Diagnostic for Biology I
const bio1Diag = [
  ["BIO1-D01","Which organelle contains the cell's genetic material?","multiple_choice",[{label:"A",text:"Mitochondria"},{label:"B",text:"Nucleus"},{label:"C",text:"Ribosome"},{label:"D",text:"Vacuole"}],"B","1",["BIO1-U1-S2"],"easy","The nucleus contains the cell's DNA.",10],
  ["BIO1-D02","Photosynthesis occurs in which organelle?","multiple_choice",[{label:"A",text:"Mitochondria"},{label:"B",text:"Ribosome"},{label:"C",text:"Chloroplast"},{label:"D",text:"Nucleus"}],"C","2",["BIO1-U2-S1"],"easy","Chloroplasts are the site of photosynthesis in plant cells.",20],
  ["BIO1-D03","Which base is found in RNA but NOT DNA?","multiple_choice",[{label:"A",text:"Adenine"},{label:"B",text:"Guanine"},{label:"C",text:"Thymine"},{label:"D",text:"Uracil"}],"D","3",["BIO1-U3-S2"],"medium","RNA contains Uracil instead of Thymine.",30],
  ["BIO1-D04","Which is the best example of natural selection?","multiple_choice",[{label:"A",text:"A farmer breeds faster horses"},{label:"B",text:"Bacteria develop antibiotic resistance"},{label:"C",text:"A dog learns to sit on command"},{label:"D",text:"A plant grows toward light"}],"B","4",["BIO1-U4-S1"],"medium","Antibiotic resistance is a classic example of natural selection in action.",40],
  ["BIO1-D05","An organism that eats both plants and animals is called a(n):","multiple_choice",[{label:"A",text:"Herbivore"},{label:"B",text:"Carnivore"},{label:"C",text:"Omnivore"},{label:"D",text:"Decomposer"}],"C","5",["BIO1-U5-S2"],"easy","Omnivores consume both plant and animal matter.",50],
  ["BIO1-D06","The scientific name of an organism consists of its:","multiple_choice",[{label:"A",text:"Kingdom and Phylum"},{label:"B",text:"Family and Order"},{label:"C",text:"Genus and Species"},{label:"D",text:"Domain and Kingdom"}],"C","6",["BIO1-U6-S1"],"easy","Binomial nomenclature uses Genus and Species.",60],
  ["BIO1-D07","The heart is part of which body system?","multiple_choice",[{label:"A",text:"Respiratory"},{label:"B",text:"Digestive"},{label:"C",text:"Nervous"},{label:"D",text:"Circulatory"}],"D","7",["BIO1-U7-S2"],"easy","The heart is the central organ of the circulatory system.",70],
  ["BIO1-D08","A hypothesis must be:","multiple_choice",[{label:"A",text:"Proven true"},{label:"B",text:"Testable and falsifiable"},{label:"C",text:"Based on prior experiments"},{label:"D",text:"Supported by multiple scientists"}],"B","8",["BIO1-U8-S1"],"medium","A valid hypothesis must be testable and falsifiable.",80],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of bio1Diag) {
  await insertDiagQ(bio1Id, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 4: AP Human Geography
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding AP Human Geography...");
const aphgId = await insertCourse(
  "APHG", "AP Human Geography", "social_studies", "9",
  "Katy ISD AP Human Geography — spatial patterns of human activity, cultural landscapes, political geography, and economic development.",
  "TEKS 113.44", 4
);

const aphgUnits = [
  [1, "Thinking Geographically", "Geographic concepts, maps, spatial analysis, geographic tools, and the five themes of geography.", "TEKS 113.44(c)(1)", 10],
  [2, "Population & Migration", "Population distribution, demographic transition model, migration theories, and push/pull factors.", "TEKS 113.44(c)(2)", 20],
  [3, "Cultural Patterns & Processes", "Culture, language diffusion, religion, ethnicity, and cultural landscapes.", "TEKS 113.44(c)(3)", 30],
  [4, "Political Organization of Space", "State, nation, nationalism, boundaries, geopolitics, and supranational organizations.", "TEKS 113.44(c)(4)", 40],
  [5, "Agriculture & Rural Land Use", "Agricultural origins, types of agriculture, land use models, and food security.", "TEKS 113.44(c)(5)", 50],
  [6, "Industrialization & Economic Development", "Industrial Revolution, development models, globalization, and economic sectors.", "TEKS 113.44(c)(6)", 60],
  [7, "Cities & Urban Land Use", "Urban models, urbanization, suburbanization, urban planning, and challenges.", "TEKS 113.44(c)(7)", 70],
];

for (const [num, title, overview, teks, sort] of aphgUnits) {
  const uid = await insertUnit(aphgId, num, title, overview, teks, sort);
  const prefix = `APHG-U${num}`;
  const skillSets = {
    1: [["S1","Apply the five themes of geography"],["S2","Interpret maps, graphs, and spatial data"],["S3","Explain the concept of scale and spatial perspective"]],
    2: [["S1","Analyze population distribution and density patterns"],["S2","Apply the demographic transition model"],["S3","Explain migration push/pull factors and types"]],
    3: [["S1","Define culture and identify cultural traits"],["S2","Explain cultural diffusion and acculturation"],["S3","Analyze the role of language and religion in cultural identity"]],
    4: [["S1","Distinguish state, nation, and nation-state"],["S2","Analyze types of political boundaries"],["S3","Evaluate the role of supranational organizations"]],
    5: [["S1","Explain the origins and spread of agriculture"],["S2","Compare subsistence and commercial agriculture"],["S3","Apply von Thünen's land use model"]],
    6: [["S1","Describe the Industrial Revolution and its geographic impacts"],["S2","Apply Rostow's stages of economic growth"],["S3","Analyze globalization and its effects on development"]],
    7: [["S1","Apply urban land use models (Burgess, Hoyt, Harris-Ullman)"],["S2","Explain urbanization and suburbanization trends"],["S3","Analyze urban challenges: sprawl, housing, transportation"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(aphgId, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  const quizSets = {
    1: [
      ["Which of the five themes of geography refers to how places are connected?","multiple_choice",[{label:"A",text:"Location"},{label:"B",text:"Place"},{label:"C",text:"Movement"},{label:"D",text:"Region"}],"C","Movement describes how people, goods, and ideas travel between places.",`${prefix}-S1`,"easy"],
      ["A map that shows population density uses which type of data representation?","multiple_choice",[{label:"A",text:"Topographic"},{label:"B",text:"Choropleth"},{label:"C",text:"Isoline"},{label:"D",text:"Dot distribution"}],"B","Choropleth maps use shading to represent data values across areas.",`${prefix}-S2`,"medium"],
      ["The concept of 'scale' in geography refers to:","multiple_choice",[{label:"A",text:"The weight of a map"},{label:"B",text:"The level of analysis from local to global"},{label:"C",text:"The accuracy of GPS data"},{label:"D",text:"The size of a country"}],"B","Scale in geography refers to the level of analysis (local, regional, national, global).",`${prefix}-S3`,"medium"],
    ],
    2: [
      ["Stage 2 of the Demographic Transition Model is characterized by:","multiple_choice",[{label:"A",text:"High birth rate and high death rate"},{label:"B",text:"High birth rate and declining death rate"},{label:"C",text:"Low birth rate and low death rate"},{label:"D",text:"Declining birth rate and low death rate"}],"B","Stage 2 features high birth rates and declining death rates, causing rapid population growth.",`${prefix}-S2`,"medium"],
      ["A family fleeing political persecution is an example of a _____ factor.","multiple_choice",[{label:"A",text:"Pull"},{label:"B",text:"Economic push"},{label:"C",text:"Political push"},{label:"D",text:"Environmental pull"}],"C","Political persecution is a push factor that forces people to leave their home country.",`${prefix}-S3`,"easy"],
      ["The world's most densely populated regions include:","multiple_choice",[{label:"A",text:"Sahara Desert and Amazon Rainforest"},{label:"B",text:"East Asia, South Asia, and Western Europe"},{label:"C",text:"Central Australia and Northern Canada"},{label:"D",text:"Arctic regions and Siberia"}],"B","East Asia, South Asia, and Western Europe are the world's most densely populated regions.",`${prefix}-S1`,"easy"],
    ],
    3: [
      ["The spread of cultural traits through direct contact is called:","multiple_choice",[{label:"A",text:"Relocation diffusion"},{label:"B",text:"Contagious diffusion"},{label:"C",text:"Hierarchical diffusion"},{label:"D",text:"Stimulus diffusion"}],"B","Contagious diffusion spreads cultural traits through direct person-to-person contact.",`${prefix}-S2`,"medium"],
      ["Which language family has the most native speakers worldwide?","multiple_choice",[{label:"A",text:"Afro-Asiatic"},{label:"B",text:"Dravidian"},{label:"C",text:"Indo-European"},{label:"D",text:"Sino-Tibetan"}],"C","The Indo-European language family has the most native speakers globally.",`${prefix}-S3`,"medium"],
      ["A cultural landscape is best defined as:","multiple_choice",[{label:"A",text:"A natural environment untouched by humans"},{label:"B",text:"The visible imprint of human activity on the land"},{label:"C",text:"A map of cultural regions"},{label:"D",text:"The climate of a cultural region"}],"B","A cultural landscape is the visible result of human modification of the natural environment.",`${prefix}-S1`,"easy"],
    ],
    4: [
      ["A nation-state is a country where:","multiple_choice",[{label:"A",text:"Multiple nations share a single state"},{label:"B",text:"The political boundaries match the cultural/ethnic boundaries"},{label:"C",text:"There is no central government"},{label:"D",text:"The state controls all cultural expression"}],"B","A nation-state exists where political and cultural/ethnic boundaries coincide.",`${prefix}-S1`,"medium"],
      ["The European Union is an example of a:","multiple_choice",[{label:"A",text:"Nation-state"},{label:"B",text:"Unitary state"},{label:"C",text:"Supranational organization"},{label:"D",text:"Federal state"}],"C","The EU is a supranational organization where member states cede some sovereignty.",`${prefix}-S3`,"easy"],
      ["A geometric boundary is one that:","multiple_choice",[{label:"A",text:"Follows a river"},{label:"B",text:"Follows a mountain range"},{label:"C",text:"Follows lines of latitude or longitude"},{label:"D",text:"Follows cultural divisions"}],"C","Geometric boundaries follow mathematical lines such as parallels or meridians.",`${prefix}-S2`,"easy"],
    ],
    5: [
      ["The Fertile Crescent is significant because it is:","multiple_choice",[{label:"A",text:"The world's largest desert"},{label:"B",text:"One of the earliest hearths of agriculture"},{label:"C",text:"The origin of the Industrial Revolution"},{label:"D",text:"The center of the Roman Empire"}],"B","The Fertile Crescent in Southwest Asia is one of the earliest agricultural hearths.",`${prefix}-S1`,"easy"],
      ["Von Thünen's model predicts that land use near a city center will be used for:","multiple_choice",[{label:"A",text:"Extensive grain farming"},{label:"B",text:"Ranching"},{label:"C",text:"Intensive market gardening"},{label:"D",text:"Forestry"}],"C","Von Thünen's model places intensive, perishable crops closest to the market.",`${prefix}-S3`,"medium"],
      ["Subsistence agriculture differs from commercial agriculture in that subsistence farming:","multiple_choice",[{label:"A",text:"Uses advanced technology"},{label:"B",text:"Produces food primarily for the farmer's own consumption"},{label:"C",text:"Focuses on cash crops for export"},{label:"D",text:"Requires large capital investment"}],"B","Subsistence agriculture produces food primarily for the farmer's family, not for sale.",`${prefix}-S2`,"easy"],
    ],
    6: [
      ["Rostow's Stage 3 (Take-off) is characterized by:","multiple_choice",[{label:"A",text:"Traditional subsistence economy"},{label:"B",text:"Rapid industrialization and economic growth"},{label:"C",text:"Mass consumption and high living standards"},{label:"D",text:"Preconditions for growth being established"}],"B","Stage 3 (Take-off) features rapid industrialization and sustained economic growth.",`${prefix}-S2`,"medium"],
      ["The primary sector of the economy involves:","multiple_choice",[{label:"A",text:"Manufacturing goods"},{label:"B",text:"Providing services"},{label:"C",text:"Extracting natural resources"},{label:"D",text:"Information technology"}],"C","The primary sector extracts raw materials (farming, mining, fishing).",`${prefix}-S1`,"easy"],
      ["A multinational corporation (MNC) is one that:","multiple_choice",[{label:"A",text:"Operates only in one country"},{label:"B",text:"Is owned by a government"},{label:"C",text:"Operates production facilities in multiple countries"},{label:"D",text:"Produces only agricultural goods"}],"C","MNCs operate across national borders, often locating production where costs are lowest.",`${prefix}-S3`,"medium"],
    ],
    7: [
      ["The CBD (Central Business District) is located at the center of which urban model?","multiple_choice",[{label:"A",text:"Sector model"},{label:"B",text:"Multiple nuclei model"},{label:"C",text:"Concentric zone model"},{label:"D",text:"All of the above"}],"C","The concentric zone model (Burgess) places the CBD at the center.",`${prefix}-S1`,"medium"],
      ["Urban sprawl refers to:","multiple_choice",[{label:"A",text:"High-density urban development"},{label:"B",text:"The uncontrolled expansion of urban areas into surrounding rural land"},{label:"C",text:"The revitalization of inner-city neighborhoods"},{label:"D",text:"The decline of suburban areas"}],"B","Urban sprawl is the low-density expansion of cities into surrounding rural areas.",`${prefix}-S3`,"easy"],
      ["Gentrification typically results in:","multiple_choice",[{label:"A",text:"Declining property values"},{label:"B",text:"Displacement of lower-income residents"},{label:"C",text:"Increased crime rates"},{label:"D",text:"Population decline"}],"B","Gentrification often displaces lower-income residents as property values rise.",`${prefix}-S2`,"medium"],
    ],
  };
  for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of (quizSets[num] || []).entries()) {
    await insertQuizQ(aphgId, uid, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
  }
}

// Diagnostic for AP Human Geography
const aphgDiag = [
  ["APHG-D01","Which theme of geography describes the physical and human characteristics of a place?","multiple_choice",[{label:"A",text:"Location"},{label:"B",text:"Place"},{label:"C",text:"Movement"},{label:"D",text:"Human-Environment Interaction"}],"B","1",["APHG-U1-S1"],"easy","The theme of 'Place' describes the physical and human characteristics that make a location unique.",10],
  ["APHG-D02","A country with a high birth rate and high death rate is in which DTM stage?","multiple_choice",[{label:"A",text:"Stage 1"},{label:"B",text:"Stage 2"},{label:"C",text:"Stage 3"},{label:"D",text:"Stage 4"}],"A","2",["APHG-U2-S2"],"medium","Stage 1 of the DTM is characterized by both high birth and high death rates.",20],
  ["APHG-D03","The spread of McDonald's restaurants worldwide is an example of:","multiple_choice",[{label:"A",text:"Relocation diffusion"},{label:"B",text:"Stimulus diffusion"},{label:"C",text:"Hierarchical diffusion"},{label:"D",text:"Reverse diffusion"}],"C","3",["APHG-U3-S2"],"medium","McDonald's spread from major cities downward through the urban hierarchy — hierarchical diffusion.",30],
  ["APHG-D04","Which of the following is a stateless nation?","multiple_choice",[{label:"A",text:"France"},{label:"B",text:"The Kurds"},{label:"C",text:"Brazil"},{label:"D",text:"Japan"}],"B","4",["APHG-U4-S1"],"medium","The Kurds are a nation (cultural group) without their own sovereign state.",40],
  ["APHG-D05","Shifting cultivation is a type of:","multiple_choice",[{label:"A",text:"Commercial agriculture"},{label:"B",text:"Subsistence agriculture"},{label:"C",text:"Plantation agriculture"},{label:"D",text:"Intensive agriculture"}],"B","5",["APHG-U5-S2"],"easy","Shifting cultivation (slash-and-burn) is a subsistence farming practice.",50],
  ["APHG-D06","Which country is considered a 'newly industrialized country' (NIC)?","multiple_choice",[{label:"A",text:"United States"},{label:"B",text:"Chad"},{label:"C",text:"South Korea"},{label:"D",text:"Switzerland"}],"C","6",["APHG-U6-S1"],"medium","South Korea is a classic example of a newly industrialized country.",60],
  ["APHG-D07","The process by which rural residents move to cities is called:","multiple_choice",[{label:"A",text:"Suburbanization"},{label:"B",text:"Urbanization"},{label:"C",text:"Gentrification"},{label:"D",text:"Counter-urbanization"}],"B","7",["APHG-U7-S2"],"easy","Urbanization is the movement of people from rural to urban areas.",70],
  ["APHG-D08","A lingua franca is a language:","multiple_choice",[{label:"A",text:"Spoken only in France"},{label:"B",text:"Used for communication between groups with different native languages"},{label:"C",text:"That is extinct"},{label:"D",text:"Spoken by a single ethnic group"}],"B","3",["APHG-U3-S3"],"easy","A lingua franca is a common language used for communication across language barriers.",80],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of aphgDiag) {
  await insertDiagQ(aphgId, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 5: Spanish 2
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding Spanish 2...");
const sp2Id = await insertCourse(
  "SPA2", "Spanish 2", "language", "9",
  "Katy ISD Spanish 2 — intermediate Spanish grammar, vocabulary, reading, writing, and cultural competency.",
  "TEKS 114.24", 5
);

const sp2Units = [
  [1, "Reflexive Verbs & Daily Routines", "Reflexive verbs, daily routine vocabulary, and describing habitual actions.", "TEKS 114.24(c)(1)", 10],
  [2, "Preterite Tense", "Regular and irregular preterite conjugations, narrating past events, and time expressions.", "TEKS 114.24(c)(2)", 20],
  [3, "Imperfect Tense", "Imperfect conjugations, describing past states, habitual past actions, and contrasting preterite vs imperfect.", "TEKS 114.24(c)(3)", 30],
  [4, "Direct & Indirect Object Pronouns", "Identifying and placing direct and indirect object pronouns, double object pronouns.", "TEKS 114.24(c)(4)", 40],
  [5, "Subjunctive Mood", "Present subjunctive formation, uses with expressions of doubt, desire, and emotion.", "TEKS 114.24(c)(5)", 50],
  [6, "Future & Conditional Tenses", "Regular and irregular future and conditional conjugations, hypothetical statements.", "TEKS 114.24(c)(6)", 60],
  [7, "Reading & Cultural Competency", "Reading authentic texts, cultural practices of Spanish-speaking countries, and literary analysis.", "TEKS 114.24(c)(7)", 70],
];

for (const [num, title, overview, teks, sort] of sp2Units) {
  const uid = await insertUnit(sp2Id, num, title, overview, teks, sort);
  const prefix = `SPA2-U${num}`;
  const skillSets = {
    1: [["S1","Conjugate reflexive verbs in present tense"],["S2","Describe daily routines using reflexive verbs"],["S3","Use reflexive pronouns correctly"]],
    2: [["S1","Conjugate regular -ar, -er, -ir verbs in preterite"],["S2","Conjugate irregular preterite verbs (ir, ser, hacer, tener)"],["S3","Use preterite to narrate completed past events"]],
    3: [["S1","Conjugate verbs in the imperfect tense"],["S2","Use imperfect for habitual past actions and descriptions"],["S3","Distinguish preterite from imperfect in context"]],
    4: [["S1","Identify direct and indirect object pronouns"],["S2","Place object pronouns correctly in sentences"],["S3","Use double object pronouns (le/les → se)"]],
    5: [["S1","Form the present subjunctive"],["S2","Use subjunctive with expressions of desire (querer que, esperar que)"],["S3","Use subjunctive with expressions of doubt and emotion"]],
    6: [["S1","Conjugate regular and irregular verbs in the future tense"],["S2","Conjugate regular and irregular verbs in the conditional"],["S3","Form hypothetical sentences with si-clauses"]],
    7: [["S1","Read and comprehend intermediate Spanish texts"],["S2","Identify cultural practices of Spanish-speaking countries"],["S3","Write a structured paragraph in Spanish"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(sp2Id, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  const quizSets = {
    1: [
      ["Which sentence correctly uses a reflexive verb?","multiple_choice",[{label:"A",text:"Yo lavo el carro."},{label:"B",text:"Yo me lavo las manos."},{label:"C",text:"Yo lavo me las manos."},{label:"D",text:"Me yo lavo las manos."}],"B","'Me lavo las manos' correctly places the reflexive pronoun before the conjugated verb.",`${prefix}-S1`,"easy"],
      ["'Ella se peina' means:","multiple_choice",[{label:"A",text:"She combs someone else's hair."},{label:"B",text:"She combs her own hair."},{label:"C",text:"She is being combed."},{label:"D",text:"She wants to comb her hair."}],"B","The reflexive construction 'se peina' means she combs her own hair.",`${prefix}-S2`,"easy"],
      ["Which is the correct reflexive pronoun for 'nosotros'?","multiple_choice",[{label:"A",text:"se"},{label:"B",text:"te"},{label:"C",text:"nos"},{label:"D",text:"os"}],"C","The reflexive pronoun for nosotros is 'nos'.",`${prefix}-S3`,"easy"],
    ],
    2: [
      ["What is the preterite form of 'hablar' for 'ellos'?","multiple_choice",[{label:"A",text:"hablaron"},{label:"B",text:"hablaban"},{label:"C",text:"hablarán"},{label:"D",text:"hablen"}],"A","The preterite of hablar for ellos is 'hablaron'.",`${prefix}-S1`,"easy"],
      ["'Fui' is the preterite form of which verb?","multiple_choice",[{label:"A",text:"Hacer"},{label:"B",text:"Tener"},{label:"C",text:"Ir/Ser"},{label:"D",text:"Estar"}],"C","'Fui' is the yo form of both 'ir' and 'ser' in the preterite.",`${prefix}-S2`,"medium"],
      ["Which time expression signals the preterite tense?","multiple_choice",[{label:"A",text:"Siempre"},{label:"B",text:"Todos los días"},{label:"C",text:"Ayer"},{label:"D",text:"Generalmente"}],"C","'Ayer' (yesterday) signals a completed past action, requiring the preterite.",`${prefix}-S3`,"easy"],
    ],
    3: [
      ["What is the imperfect form of 'comer' for 'yo'?","multiple_choice",[{label:"A",text:"comí"},{label:"B",text:"comía"},{label:"C",text:"comeré"},{label:"D",text:"como"}],"B","The imperfect of comer for yo is 'comía'.",`${prefix}-S1`,"easy"],
      ["'Cuando era niño, jugaba al fútbol.' This sentence uses the imperfect to express:","multiple_choice",[{label:"A",text:"A completed action"},{label:"B",text:"A habitual past action"},{label:"C",text:"A future action"},{label:"D",text:"A command"}],"B","The imperfect 'jugaba' expresses a habitual past action.",`${prefix}-S2`,"medium"],
      ["In 'Ayer comí pizza mientras veía la tele,' which verb is in the preterite?","multiple_choice",[{label:"A",text:"veía"},{label:"B",text:"comí"},{label:"C",text:"Both"},{label:"D",text:"Neither"}],"B","'Comí' is preterite (completed action); 'veía' is imperfect (background action).",`${prefix}-S3`,"medium"],
    ],
    4: [
      ["In 'Lo veo,' what does 'lo' replace?","multiple_choice",[{label:"A",text:"An indirect object"},{label:"B",text:"A masculine direct object"},{label:"C",text:"A reflexive pronoun"},{label:"D",text:"A subject pronoun"}],"B","'Lo' is a masculine singular direct object pronoun.",`${prefix}-S1`,"easy"],
      ["'Le doy el libro a María.' When replacing both objects with pronouns, the sentence becomes:","multiple_choice",[{label:"A",text:"Le lo doy."},{label:"B",text:"Lo le doy."},{label:"C",text:"Se lo doy."},{label:"D",text:"Lo se doy."}],"C","When both le/les and lo/la appear together, le/les changes to 'se': 'Se lo doy.'",`${prefix}-S3`,"hard"],
      ["Where is the object pronoun placed with an infinitive?","multiple_choice",[{label:"A",text:"Before the conjugated verb only"},{label:"B",text:"After the infinitive only"},{label:"C",text:"Either before the conjugated verb or attached to the infinitive"},{label:"D",text:"After the subject"}],"C","Object pronouns can precede the conjugated verb or attach to the infinitive.",`${prefix}-S2`,"medium"],
    ],
    5: [
      ["What triggers the use of the subjunctive?","multiple_choice",[{label:"A",text:"Statements of fact"},{label:"B",text:"Expressions of desire, doubt, or emotion with 'que'"},{label:"C",text:"Questions"},{label:"D",text:"Commands only"}],"B","The subjunctive is triggered by expressions of desire, doubt, or emotion followed by 'que'.",`${prefix}-S2`,"medium"],
      ["'Espero que tú _____ (venir) mañana.' The correct form is:","multiple_choice",[{label:"A",text:"vienes"},{label:"B",text:"vendrás"},{label:"C",text:"vengas"},{label:"D",text:"viniste"}],"C","After 'espero que,' the subjunctive 'vengas' is required.",`${prefix}-S1`,"medium"],
      ["Which sentence does NOT require the subjunctive?","multiple_choice",[{label:"A",text:"Quiero que ella venga."},{label:"B",text:"Es importante que estudies."},{label:"C",text:"Sé que ella viene."},{label:"D",text:"Dudo que él tenga razón."}],"C","'Sé que ella viene' expresses certainty, so the indicative is used.",`${prefix}-S3`,"hard"],
    ],
    6: [
      ["What is the future tense ending for 'yo' with regular verbs?","multiple_choice",[{label:"A",text:"-é"},{label:"B",text:"-ía"},{label:"C",text:"-aré"},{label:"D",text:"-aba"}],"A","The future tense yo ending for all verbs is -é (hablaré, comeré, viviré).",`${prefix}-S1`,"easy"],
      ["'Si tuviera dinero, _____ un coche.' The correct form is:","multiple_choice",[{label:"A",text:"compraré"},{label:"B",text:"compraría"},{label:"C",text:"compre"},{label:"D",text:"compré"}],"B","In a hypothetical si-clause, the conditional 'compraría' is used in the result clause.",`${prefix}-S3`,"hard"],
      ["The irregular future stem of 'tener' is:","multiple_choice",[{label:"A",text:"tener-"},{label:"B",text:"tendr-"},{label:"C",text:"teng-"},{label:"D",text:"tuv-"}],"B","The irregular future stem of tener is 'tendr-' (tendré, tendrás...).",`${prefix}-S2`,"medium"],
    ],
    7: [
      ["'El Día de los Muertos' is a cultural celebration from:","multiple_choice",[{label:"A",text:"Spain"},{label:"B",text:"Mexico"},{label:"C",text:"Argentina"},{label:"D",text:"Cuba"}],"B","El Día de los Muertos is a traditional Mexican celebration honoring deceased loved ones.",`${prefix}-S2`,"easy"],
      ["In a formal letter in Spanish, the greeting would be:","multiple_choice",[{label:"A",text:"¡Hola!"},{label:"B",text:"¿Qué tal?"},{label:"C",text:"Estimado/a señor/a:"},{label:"D",text:"¡Buenas!"}],"C","'Estimado/a señor/a:' is the formal salutation in Spanish correspondence.",`${prefix}-S3`,"medium"],
      ["Which Spanish-speaking country has the largest population?","multiple_choice",[{label:"A",text:"Spain"},{label:"B",text:"Argentina"},{label:"C",text:"Colombia"},{label:"D",text:"Mexico"}],"D","Mexico has the largest Spanish-speaking population in the world.",`${prefix}-S2`,"easy"],
    ],
  };
  for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of (quizSets[num] || []).entries()) {
    await insertQuizQ(sp2Id, uid, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
  }
}

// Diagnostic for Spanish 2
const sp2Diag = [
  ["SPA2-D01","'Me llamo Juan.' The reflexive pronoun 'me' indicates:","multiple_choice",[{label:"A",text:"Direct object"},{label:"B",text:"The action is done to oneself"},{label:"C",text:"Indirect object"},{label:"D",text:"Possession"}],"B","1",["SPA2-U1-S3"],"easy","Reflexive pronouns indicate the action is performed on oneself.",10],
  ["SPA2-D02","'Ayer nosotros _____ (comer) pizza.' The correct preterite form is:","multiple_choice",[{label:"A",text:"comemos"},{label:"B",text:"comíamos"},{label:"C",text:"comimos"},{label:"D",text:"comeremos"}],"C","2",["SPA2-U2-S1"],"easy","The preterite of comer for nosotros is 'comimos'.",20],
  ["SPA2-D03","Which sentence uses the imperfect correctly?","multiple_choice",[{label:"A",text:"Ayer fui al mercado."},{label:"B",text:"De niño, siempre jugaba en el parque."},{label:"C",text:"El año pasado viajé a México."},{label:"D",text:"Ella llegó tarde ayer."}],"B","3",["SPA2-U3-S2"],"medium","'Siempre jugaba' expresses a habitual past action — correct use of imperfect.",30],
  ["SPA2-D04","'Te lo digo.' What does 'lo' refer to?","multiple_choice",[{label:"A",text:"Indirect object"},{label:"B",text:"Direct object (masculine)"},{label:"C",text:"Reflexive pronoun"},{label:"D",text:"Subject"}],"B","4",["SPA2-U4-S1"],"medium","'Lo' is the masculine direct object pronoun.",40],
  ["SPA2-D05","'Quiero que tú _____ (hablar) más despacio.' The correct form is:","multiple_choice",[{label:"A",text:"hablas"},{label:"B",text:"hablarás"},{label:"C",text:"hables"},{label:"D",text:"hablaste"}],"C","5",["SPA2-U5-S1"],"medium","After 'quiero que,' the present subjunctive 'hables' is required.",50],
  ["SPA2-D06","'Mañana _____ (llover).' The correct future form is:","multiple_choice",[{label:"A",text:"llueve"},{label:"B",text:"llovía"},{label:"C",text:"lloverá"},{label:"D",text:"llovió"}],"C","6",["SPA2-U6-S1"],"easy","The future tense 'lloverá' expresses what will happen tomorrow.",60],
  ["SPA2-D07","Which country is the largest Spanish-speaking nation by area?","multiple_choice",[{label:"A",text:"Mexico"},{label:"B",text:"Argentina"},{label:"C",text:"Spain"},{label:"D",text:"Colombia"}],"B","7",["SPA2-U7-S2"],"easy","Argentina is the largest Spanish-speaking country by area.",70],
  ["SPA2-D08","'Hacía frío cuando salí.' Which verb is in the imperfect?","multiple_choice",[{label:"A",text:"salí"},{label:"B",text:"Hacía"},{label:"C",text:"Both"},{label:"D",text:"Neither"}],"B","3",["SPA2-U3-S3"],"medium","'Hacía' is imperfect (background condition); 'salí' is preterite (completed action).",80],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of sp2Diag) {
  await insertDiagQ(sp2Id, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 6: 3rd Grade Math
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding 3rd Grade Math...");
const gr3MathId = await insertCourse(
  "GR3MATH", "3rd Grade Math", "math", "3",
  "Katy ISD 3rd Grade Mathematics — multiplication, division, fractions, geometry, and data aligned to TEKS.",
  "TEKS 111.5", 6
);

const gr3MathUnits = [
  [1, "Place Value & Number Sense", "Reading, writing, and comparing numbers to 100,000; rounding to nearest 10 and 100.", "TEKS 111.5(b)(2)", 10],
  [2, "Addition & Subtraction", "Adding and subtracting up to 1,000 with regrouping; estimating sums and differences.", "TEKS 111.5(b)(3)", 20],
  [3, "Multiplication Concepts", "Understanding multiplication as repeated addition; arrays; multiplication facts 0–10.", "TEKS 111.5(b)(4)", 30],
  [4, "Division Concepts", "Understanding division as sharing equally and repeated subtraction; division facts; relationship to multiplication.", "TEKS 111.5(b)(4)", 40],
  [5, "Fractions", "Identifying fractions as parts of a whole and parts of a set; comparing and ordering fractions.", "TEKS 111.5(b)(3)", 50],
  [6, "Geometry", "Identifying 2D and 3D shapes; area and perimeter of rectangles; lines, angles, and symmetry.", "TEKS 111.5(b)(6)", 60],
  [7, "Measurement & Data", "Measuring length, capacity, and mass; telling time; reading graphs and data tables.", "TEKS 111.5(b)(7)", 70],
];

for (const [num, title, overview, teks, sort] of gr3MathUnits) {
  const uid = await insertUnit(gr3MathId, num, title, overview, teks, sort);
  const prefix = `GR3M-U${num}`;
  const skillSets = {
    1: [["S1","Read and write numbers to 100,000"],["S2","Compare and order numbers using < > ="],["S3","Round numbers to the nearest 10 and 100"]],
    2: [["S1","Add multi-digit numbers with regrouping"],["S2","Subtract multi-digit numbers with regrouping"],["S3","Estimate sums and differences"]],
    3: [["S1","Understand multiplication as repeated addition"],["S2","Use arrays to model multiplication"],["S3","Recall multiplication facts 0–10"]],
    4: [["S1","Understand division as equal sharing"],["S2","Recall division facts related to multiplication"],["S3","Solve division word problems"]],
    5: [["S1","Identify fractions as parts of a whole"],["S2","Compare fractions with the same denominator"],["S3","Place fractions on a number line"]],
    6: [["S1","Identify and classify 2D and 3D shapes"],["S2","Calculate area and perimeter of rectangles"],["S3","Identify lines of symmetry"]],
    7: [["S1","Measure length to the nearest half inch and centimeter"],["S2","Tell time to the minute and calculate elapsed time"],["S3","Read and interpret bar graphs and pictographs"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(gr3MathId, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  const quizSets = {
    1: [
      ["What is the value of the digit 4 in the number 34,521?","multiple_choice",[{label:"A",text:"4"},{label:"B",text:"400"},{label:"C",text:"4,000"},{label:"D",text:"40,000"}],"C","The digit 4 is in the thousands place, so its value is 4,000.",`${prefix}-S1`,"easy"],
      ["Which symbol makes this true? 5,432 ___ 5,342","multiple_choice",[{label:"A",text:"<"},{label:"B",text:">"},{label:"C",text:"="},{label:"D",text:"≠"}],"B","5,432 is greater than 5,342 because the hundreds digit (4 > 3).",`${prefix}-S2`,"easy"],
      ["Round 4,678 to the nearest hundred.","multiple_choice",[{label:"A",text:"4,600"},{label:"B",text:"4,700"},{label:"C",text:"5,000"},{label:"D",text:"4,680"}],"B","4,678 rounded to the nearest hundred is 4,700 (78 > 50).",`${prefix}-S3`,"easy"],
    ],
    2: [
      ["What is 456 + 378?","multiple_choice",[{label:"A",text:"724"},{label:"B",text:"834"},{label:"C",text:"814"},{label:"D",text:"834"}],"B","456 + 378 = 834.",`${prefix}-S1`,"easy"],
      ["What is 700 − 263?","multiple_choice",[{label:"A",text:"437"},{label:"B",text:"447"},{label:"C",text:"463"},{label:"D",text:"537"}],"A","700 − 263 = 437.",`${prefix}-S2`,"medium"],
      ["Estimate: 389 + 412 ≈","multiple_choice",[{label:"A",text:"700"},{label:"B",text:"800"},{label:"C",text:"900"},{label:"D",text:"750"}],"B","389 ≈ 400 and 412 ≈ 400, so the estimate is 800.",`${prefix}-S3`,"easy"],
    ],
    3: [
      ["Which multiplication fact matches the array of 3 rows × 4 columns?","multiple_choice",[{label:"A",text:"3 + 4 = 7"},{label:"B",text:"3 × 4 = 12"},{label:"C",text:"4 × 4 = 16"},{label:"D",text:"3 × 3 = 9"}],"B","3 rows × 4 columns = 3 × 4 = 12.",`${prefix}-S2`,"easy"],
      ["What is 7 × 8?","multiple_choice",[{label:"A",text:"54"},{label:"B",text:"56"},{label:"C",text:"48"},{label:"D",text:"63"}],"B","7 × 8 = 56.",`${prefix}-S3`,"easy"],
      ["5 × 6 can also be written as:","multiple_choice",[{label:"A",text:"5 + 6"},{label:"B",text:"5 + 5 + 5 + 5 + 5 + 5"},{label:"C",text:"6 + 6 + 6 + 6 + 6"},{label:"D",text:"Both B and C"}],"D","5 × 6 means 5 groups of 6 or 6 groups of 5.",`${prefix}-S1`,"medium"],
    ],
    4: [
      ["24 ÷ 6 = ?","multiple_choice",[{label:"A",text:"3"},{label:"B",text:"4"},{label:"C",text:"5"},{label:"D",text:"6"}],"B","24 ÷ 6 = 4.",`${prefix}-S2`,"easy"],
      ["If 5 × 9 = 45, then 45 ÷ 9 = ?","multiple_choice",[{label:"A",text:"4"},{label:"B",text:"5"},{label:"C",text:"6"},{label:"D",text:"9"}],"B","Division is the inverse of multiplication: 45 ÷ 9 = 5.",`${prefix}-S2`,"easy"],
      ["A teacher has 32 crayons to share equally among 8 students. How many does each student get?","multiple_choice",[{label:"A",text:"3"},{label:"B",text:"4"},{label:"C",text:"5"},{label:"D",text:"6"}],"B","32 ÷ 8 = 4 crayons per student.",`${prefix}-S3`,"easy"],
    ],
    5: [
      ["Which fraction represents 3 out of 4 equal parts?","multiple_choice",[{label:"A",text:"4/3"},{label:"B",text:"1/4"},{label:"C",text:"3/4"},{label:"D",text:"3/3"}],"C","3 out of 4 equal parts is written as 3/4.",`${prefix}-S1`,"easy"],
      ["Which fraction is GREATER: 3/8 or 5/8?","multiple_choice",[{label:"A",text:"3/8"},{label:"B",text:"5/8"},{label:"C",text:"They are equal"},{label:"D",text:"Cannot compare"}],"B","With the same denominator, 5/8 > 3/8.",`${prefix}-S2`,"easy"],
      ["On a number line from 0 to 1, where would 1/2 be placed?","multiple_choice",[{label:"A",text:"At 0"},{label:"B",text:"At 1"},{label:"C",text:"Exactly in the middle"},{label:"D",text:"At 1/4"}],"C","1/2 is exactly halfway between 0 and 1.",`${prefix}-S3`,"easy"],
    ],
    6: [
      ["A rectangle has a length of 8 cm and a width of 5 cm. What is its area?","multiple_choice",[{label:"A",text:"13 sq cm"},{label:"B",text:"26 sq cm"},{label:"C",text:"40 sq cm"},{label:"D",text:"80 sq cm"}],"C","Area = length × width = 8 × 5 = 40 sq cm.",`${prefix}-S2`,"easy"],
      ["What is the perimeter of a square with sides of 6 inches?","multiple_choice",[{label:"A",text:"12 inches"},{label:"B",text:"24 inches"},{label:"C",text:"36 inches"},{label:"D",text:"6 inches"}],"B","Perimeter of a square = 4 × side = 4 × 6 = 24 inches.",`${prefix}-S2`,"easy"],
      ["How many lines of symmetry does a rectangle have?","multiple_choice",[{label:"A",text:"1"},{label:"B",text:"2"},{label:"C",text:"4"},{label:"D",text:"0"}],"B","A rectangle has 2 lines of symmetry (horizontal and vertical).",`${prefix}-S3`,"medium"],
    ],
    7: [
      ["A clock shows 3:47. What time will it be in 25 minutes?","multiple_choice",[{label:"A",text:"4:02"},{label:"B",text:"4:12"},{label:"C",text:"3:72"},{label:"D",text:"4:22"}],"B","3:47 + 25 minutes = 4:12.",`${prefix}-S2`,"medium"],
      ["A bar graph shows: Red=12, Blue=8, Green=15. Which color has the most?","multiple_choice",[{label:"A",text:"Red"},{label:"B",text:"Blue"},{label:"C",text:"Green"},{label:"D",text:"All equal"}],"C","Green has 15, which is the highest value.",`${prefix}-S3`,"easy"],
      ["Which unit would you use to measure the length of a pencil?","multiple_choice",[{label:"A",text:"Miles"},{label:"B",text:"Inches"},{label:"C",text:"Pounds"},{label:"D",text:"Gallons"}],"B","Inches are an appropriate unit for measuring the length of a pencil.",`${prefix}-S1`,"easy"],
    ],
  };
  for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of (quizSets[num] || []).entries()) {
    await insertQuizQ(gr3MathId, uid, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
  }
}

// Diagnostic for 3rd Grade Math
const gr3MathDiag = [
  ["GR3M-D01","What is the value of the digit 7 in 17,345?","multiple_choice",[{label:"A",text:"7"},{label:"B",text:"70"},{label:"C",text:"700"},{label:"D",text:"7,000"}],"D","1",["GR3M-U1-S1"],"easy","The digit 7 is in the thousands place, so its value is 7,000.",10],
  ["GR3M-D02","What is 523 + 149?","multiple_choice",[{label:"A",text:"662"},{label:"B",text:"672"},{label:"C",text:"682"},{label:"D",text:"772"}],"B","2",["GR3M-U2-S1"],"easy","523 + 149 = 672.",20],
  ["GR3M-D03","What is 6 × 7?","multiple_choice",[{label:"A",text:"36"},{label:"B",text:"42"},{label:"C",text:"48"},{label:"D",text:"54"}],"B","3",["GR3M-U3-S3"],"easy","6 × 7 = 42.",30],
  ["GR3M-D04","36 ÷ 4 = ?","multiple_choice",[{label:"A",text:"7"},{label:"B",text:"8"},{label:"C",text:"9"},{label:"D",text:"6"}],"C","4",["GR3M-U4-S2"],"easy","36 ÷ 4 = 9.",40],
  ["GR3M-D05","Which fraction is equivalent to 1/2?","multiple_choice",[{label:"A",text:"2/6"},{label:"B",text:"3/6"},{label:"C",text:"4/6"},{label:"D",text:"1/4"}],"B","5",["GR3M-U5-S1"],"medium","3/6 = 1/2 (both numerator and denominator divided by 3).",50],
  ["GR3M-D06","A rectangle has length 9 and width 4. What is its area?","multiple_choice",[{label:"A",text:"13"},{label:"B",text:"26"},{label:"C",text:"36"},{label:"D",text:"40"}],"C","6",["GR3M-U6-S2"],"easy","Area = 9 × 4 = 36 square units.",60],
  ["GR3M-D07","A clock shows 2:15. What time will it be in 30 minutes?","multiple_choice",[{label:"A",text:"2:30"},{label:"B",text:"2:45"},{label:"C",text:"3:00"},{label:"D",text:"3:15"}],"B","7",["GR3M-U7-S2"],"easy","2:15 + 30 minutes = 2:45.",70],
  ["GR3M-D08","Round 3,456 to the nearest thousand.","multiple_choice",[{label:"A",text:"3,000"},{label:"B",text:"3,400"},{label:"C",text:"3,500"},{label:"D",text:"4,000"}],"A","1",["GR3M-U1-S3"],"medium","3,456 rounded to the nearest thousand is 3,000 (456 < 500).",80],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of gr3MathDiag) {
  await insertDiagQ(gr3MathId, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 7: 3rd Grade ELA (English Language Arts)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding 3rd Grade ELA...");
const gr3ElaId = await insertCourse(
  "GR3ELA", "3rd Grade ELA", "english", "3",
  "Katy ISD 3rd Grade English Language Arts — reading comprehension, phonics, vocabulary, writing, and grammar.",
  "TEKS 110.5", 7
);

const gr3ElaUnits = [
  [1, "Phonics & Word Study", "Decoding multisyllabic words, prefixes, suffixes, and root words.", "TEKS 110.5(b)(2)", 10],
  [2, "Reading Comprehension: Fiction", "Story elements, character traits, plot, theme, and making inferences.", "TEKS 110.5(b)(6)", 20],
  [3, "Reading Comprehension: Non-Fiction", "Main idea, key details, text features, and comparing texts.", "TEKS 110.5(b)(8)", 30],
  [4, "Vocabulary Development", "Context clues, synonyms, antonyms, homophones, and figurative language.", "TEKS 110.5(b)(3)", 40],
  [5, "Grammar & Mechanics", "Nouns, verbs, adjectives, adverbs, pronouns, punctuation, and capitalization.", "TEKS 110.5(b)(11)", 50],
  [6, "Writing: Narrative", "Personal narratives, story structure, descriptive details, and revision.", "TEKS 110.5(b)(10)", 60],
  [7, "Writing: Informational & Opinion", "Informational paragraphs, opinion writing with reasons, and research skills.", "TEKS 110.5(b)(10)", 70],
];

for (const [num, title, overview, teks, sort] of gr3ElaUnits) {
  const uid = await insertUnit(gr3ElaId, num, title, overview, teks, sort);
  const prefix = `GR3E-U${num}`;
  const skillSets = {
    1: [["S1","Decode multisyllabic words using syllable patterns"],["S2","Identify and use common prefixes and suffixes"],["S3","Use root words to determine word meaning"]],
    2: [["S1","Identify story elements: character, setting, plot"],["S2","Describe character traits using text evidence"],["S3","Identify theme and lesson of a story"]],
    3: [["S1","Identify main idea and key details"],["S2","Use text features to locate information"],["S3","Compare information from two texts on the same topic"]],
    4: [["S1","Use context clues to determine word meaning"],["S2","Identify synonyms and antonyms"],["S3","Recognize and interpret figurative language (simile, metaphor)"]],
    5: [["S1","Identify nouns, verbs, adjectives, and adverbs"],["S2","Use correct punctuation (periods, question marks, commas)"],["S3","Apply capitalization rules"]],
    6: [["S1","Write a personal narrative with a beginning, middle, and end"],["S2","Use descriptive details and sensory language"],["S3","Revise writing for clarity and word choice"]],
    7: [["S1","Write an informational paragraph with a topic sentence and details"],["S2","Write an opinion paragraph with a claim and reasons"],["S3","Use simple research skills to gather information"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(gr3ElaId, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  const quizSets = {
    1: [
      ["The prefix 'un-' in 'unhappy' means:","multiple_choice",[{label:"A",text:"Very"},{label:"B",text:"Not"},{label:"C",text:"Again"},{label:"D",text:"Before"}],"B","The prefix 'un-' means not.",`${prefix}-S2`,"easy"],
      ["How many syllables are in the word 'butterfly'?","multiple_choice",[{label:"A",text:"2"},{label:"B",text:"3"},{label:"C",text:"4"},{label:"D",text:"1"}],"B","But-ter-fly has 3 syllables.",`${prefix}-S1`,"easy"],
      ["The root word 'port' means to carry. What does 'transport' mean?","multiple_choice",[{label:"A",text:"To carry across"},{label:"B",text:"To carry back"},{label:"C",text:"To carry down"},{label:"D",text:"To carry up"}],"A","Trans- means across, so transport means to carry across.",`${prefix}-S3`,"medium"],
    ],
    2: [
      ["The SETTING of a story is:","multiple_choice",[{label:"A",text:"The main character"},{label:"B",text:"The problem in the story"},{label:"C",text:"When and where the story takes place"},{label:"D",text:"The lesson of the story"}],"C","The setting is the time and place of the story.",`${prefix}-S1`,"easy"],
      ["A character who is kind, helpful, and brave shows what kind of character traits?","multiple_choice",[{label:"A",text:"Negative traits"},{label:"B",text:"Positive traits"},{label:"C",text:"Neutral traits"},{label:"D",text:"Physical traits"}],"B","Kind, helpful, and brave are positive character traits.",`${prefix}-S2`,"easy"],
      ["The THEME of a story is:","multiple_choice",[{label:"A",text:"The title"},{label:"B",text:"The main character's name"},{label:"C",text:"The lesson or message the story teaches"},{label:"D",text:"The setting"}],"C","The theme is the central message or lesson of the story.",`${prefix}-S3`,"medium"],
    ],
    3: [
      ["The MAIN IDEA of a paragraph is:","multiple_choice",[{label:"A",text:"The first sentence"},{label:"B",text:"The most important point the paragraph makes"},{label:"C",text:"The longest sentence"},{label:"D",text:"A detail from the paragraph"}],"B","The main idea is the most important point, not necessarily the first sentence.",`${prefix}-S1`,"easy"],
      ["A heading in a non-fiction text helps the reader:","multiple_choice",[{label:"A",text:"Understand the characters"},{label:"B",text:"Know what a section is about"},{label:"C",text:"Find rhyming words"},{label:"D",text:"Identify the theme"}],"B","Headings are text features that tell readers what a section covers.",`${prefix}-S2`,"easy"],
      ["When you compare two texts on the same topic, you look for:","multiple_choice",[{label:"A",text:"Only differences"},{label:"B",text:"Only similarities"},{label:"C",text:"Both similarities and differences"},{label:"D",text:"The longer text"}],"C","Comparing texts involves identifying both similarities and differences.",`${prefix}-S3`,"medium"],
    ],
    4: [
      ["'The puppy was as fluffy as a cloud.' This is an example of:","multiple_choice",[{label:"A",text:"Metaphor"},{label:"B",text:"Simile"},{label:"C",text:"Personification"},{label:"D",text:"Alliteration"}],"B","A simile compares using 'like' or 'as'.",`${prefix}-S3`,"easy"],
      ["What is a synonym for 'happy'?","multiple_choice",[{label:"A",text:"Sad"},{label:"B",text:"Angry"},{label:"C",text:"Joyful"},{label:"D",text:"Tired"}],"C","Joyful is a synonym for happy (same meaning).",`${prefix}-S2`,"easy"],
      ["Using the sentence 'The enormous elephant stomped through the jungle,' what does 'enormous' mean?","multiple_choice",[{label:"A",text:"Small"},{label:"B",text:"Very large"},{label:"C",text:"Fast"},{label:"D",text:"Colorful"}],"B","Context clues (elephant stomping) suggest enormous means very large.",`${prefix}-S1`,"easy"],
    ],
    5: [
      ["Which word is a VERB in: 'The dog runs fast.'","multiple_choice",[{label:"A",text:"The"},{label:"B",text:"dog"},{label:"C",text:"runs"},{label:"D",text:"fast"}],"C","'Runs' is the action word (verb) in the sentence.",`${prefix}-S1`,"easy"],
      ["Which sentence uses correct punctuation?","multiple_choice",[{label:"A",text:"Where are you going"},{label:"B",text:"Where are you going?"},{label:"C",text:"Where are you going!"},{label:"D",text:"Where, are you going?"}],"B","A question ends with a question mark.",`${prefix}-S2`,"easy"],
      ["Which word should be capitalized in: 'my teacher is ms. johnson.'","multiple_choice",[{label:"A",text:"teacher"},{label:"B",text:"my"},{label:"C",text:"Ms. Johnson"},{label:"D",text:"is"}],"C","Names and titles (Ms. Johnson) must be capitalized.",`${prefix}-S3`,"easy"],
    ],
    6: [
      ["A personal narrative is a story about:","multiple_choice",[{label:"A",text:"A fictional character"},{label:"B",text:"A real event from the writer's own life"},{label:"C",text:"A famous person"},{label:"D",text:"An animal"}],"B","A personal narrative is a true story from the writer's own experience.",`${prefix}-S1`,"easy"],
      ["Sensory details in writing appeal to the reader's:","multiple_choice",[{label:"A",text:"Logic"},{label:"B",text:"Five senses"},{label:"C",text:"Prior knowledge"},{label:"D",text:"Imagination only"}],"B","Sensory details describe what you see, hear, smell, taste, and touch.",`${prefix}-S2`,"easy"],
      ["When you REVISE your writing, you:","multiple_choice",[{label:"A",text:"Check spelling only"},{label:"B",text:"Improve word choice, clarity, and organization"},{label:"C",text:"Add punctuation"},{label:"D",text:"Copy it neatly"}],"B","Revision focuses on improving content, clarity, and word choice.",`${prefix}-S3`,"medium"],
    ],
    7: [
      ["An opinion paragraph should include:","multiple_choice",[{label:"A",text:"Only facts"},{label:"B",text:"A claim and reasons to support it"},{label:"C",text:"A story with characters"},{label:"D",text:"A list of definitions"}],"B","An opinion paragraph states a claim and provides supporting reasons.",`${prefix}-S2`,"easy"],
      ["A topic sentence in an informational paragraph:","multiple_choice",[{label:"A",text:"Ends the paragraph"},{label:"B",text:"Tells the main idea of the paragraph"},{label:"C",text:"Provides a detail"},{label:"D",text:"Asks a question"}],"B","The topic sentence introduces the main idea of the paragraph.",`${prefix}-S1`,"easy"],
      ["When doing research, which source is MOST reliable?","multiple_choice",[{label:"A",text:"A friend's opinion"},{label:"B",text:"An encyclopedia or textbook"},{label:"C",text:"A random website"},{label:"D",text:"A cartoon"}],"B","Encyclopedias and textbooks are reliable, fact-checked sources.",`${prefix}-S3`,"easy"],
    ],
  };
  for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of (quizSets[num] || []).entries()) {
    await insertQuizQ(gr3ElaId, uid, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
  }
}

// Diagnostic for 3rd Grade ELA
const gr3ElaDiag = [
  ["GR3E-D01","How many syllables are in 'elephant'?","multiple_choice",[{label:"A",text:"2"},{label:"B",text:"3"},{label:"C",text:"4"},{label:"D",text:"1"}],"B","1",["GR3E-U1-S1"],"easy","El-e-phant has 3 syllables.",10],
  ["GR3E-D02","The SETTING of a story is:","multiple_choice",[{label:"A",text:"The main character"},{label:"B",text:"The problem"},{label:"C",text:"When and where the story takes place"},{label:"D",text:"The lesson"}],"C","2",["GR3E-U2-S1"],"easy","The setting is the time and place of the story.",20],
  ["GR3E-D03","What text feature helps you find a specific topic in a non-fiction book?","multiple_choice",[{label:"A",text:"Dialogue"},{label:"B",text:"Index"},{label:"C",text:"Simile"},{label:"D",text:"Plot"}],"B","3",["GR3E-U3-S2"],"easy","An index helps locate specific topics in a non-fiction book.",30],
  ["GR3E-D04","'The stars danced in the sky.' This is an example of:","multiple_choice",[{label:"A",text:"Simile"},{label:"B",text:"Metaphor"},{label:"C",text:"Personification"},{label:"D",text:"Alliteration"}],"C","4",["GR3E-U4-S3"],"medium","Personification gives human qualities (dancing) to non-human things (stars).",40],
  ["GR3E-D05","Which sentence uses correct end punctuation?","multiple_choice",[{label:"A",text:"What time is it"},{label:"B",text:"What time is it?"},{label:"C",text:"What time is it!"},{label:"D",text:"What time is it,"}],"B","5",["GR3E-U5-S2"],"easy","A question ends with a question mark.",50],
  ["GR3E-D06","A personal narrative is written in:","multiple_choice",[{label:"A",text:"Third person (he/she)"},{label:"B",text:"First person (I/me)"},{label:"C",text:"Second person (you)"},{label:"D",text:"No particular person"}],"B","6",["GR3E-U6-S1"],"easy","Personal narratives are written in first person (I/me/my).",60],
  ["GR3E-D07","An opinion is different from a fact because an opinion:","multiple_choice",[{label:"A",text:"Can be proven true"},{label:"B",text:"Is always wrong"},{label:"C",text:"Expresses a belief or feeling"},{label:"D",text:"Uses numbers"}],"C","7",["GR3E-U7-S2"],"easy","An opinion expresses a belief or feeling that cannot be proven.",70],
  ["GR3E-D08","What does the suffix '-ful' mean in 'colorful'?","multiple_choice",[{label:"A",text:"Without"},{label:"B",text:"Full of"},{label:"C",text:"Again"},{label:"D",text:"Not"}],"B","1",["GR3E-U1-S2"],"easy","The suffix '-ful' means full of.",80],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of gr3ElaDiag) {
  await insertDiagQ(gr3ElaId, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 8: 3rd Grade Science
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding 3rd Grade Science...");
const gr3SciId = await insertCourse(
  "GR3SCI", "3rd Grade Science", "science", "3",
  "Katy ISD 3rd Grade Science — matter, energy, life science, earth science, and scientific investigation.",
  "TEKS 112.14", 8
);

const gr3SciUnits = [
  [1, "Matter & Its Properties", "States of matter, physical properties, mixtures, and changes in matter.", "TEKS 112.14(b)(5)", 10],
  [2, "Energy: Heat, Light & Sound", "Forms of energy, heat transfer, light reflection/refraction, and sound vibration.", "TEKS 112.14(b)(6)", 20],
  [3, "Force & Motion", "Forces, gravity, friction, pushes and pulls, and simple machines.", "TEKS 112.14(b)(7)", 30],
  [4, "Life Science: Plants", "Plant parts and functions, photosynthesis, plant life cycles, and adaptations.", "TEKS 112.14(b)(9)", 40],
  [5, "Life Science: Animals", "Animal characteristics, life cycles, food chains, and adaptations.", "TEKS 112.14(b)(10)", 50],
  [6, "Earth Science: Weather & Climate", "Weather patterns, water cycle, seasons, and climate vs weather.", "TEKS 112.14(b)(8)", 60],
  [7, "Scientific Investigation", "Scientific method, tools, measurement, recording data, and drawing conclusions.", "TEKS 112.14(b)(2)", 70],
];

for (const [num, title, overview, teks, sort] of gr3SciUnits) {
  const uid = await insertUnit(gr3SciId, num, title, overview, teks, sort);
  const prefix = `GR3S-U${num}`;
  const skillSets = {
    1: [["S1","Identify the three states of matter"],["S2","Describe physical properties of matter"],["S3","Distinguish physical changes from chemical changes"]],
    2: [["S1","Identify forms of energy: heat, light, sound"],["S2","Explain how heat transfers between objects"],["S3","Describe how light reflects and refracts"]],
    3: [["S1","Describe how forces affect motion"],["S2","Explain the effects of gravity and friction"],["S3","Identify simple machines and their uses"]],
    4: [["S1","Identify plant parts and their functions"],["S2","Explain the process of photosynthesis simply"],["S3","Describe plant life cycles and adaptations"]],
    5: [["S1","Classify animals by characteristics"],["S2","Describe animal life cycles"],["S3","Explain food chains and energy flow"]],
    6: [["S1","Describe the water cycle stages"],["S2","Identify weather patterns and instruments"],["S3","Distinguish weather from climate"]],
    7: [["S1","Follow the steps of the scientific method"],["S2","Use science tools correctly (ruler, thermometer, balance)"],["S3","Record and interpret data from an experiment"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(gr3SciId, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  const quizSets = {
    1: [
      ["Which state of matter has a definite shape and volume?","multiple_choice",[{label:"A",text:"Gas"},{label:"B",text:"Liquid"},{label:"C",text:"Solid"},{label:"D",text:"Plasma"}],"C","Solids have both a definite shape and definite volume.",`${prefix}-S1`,"easy"],
      ["When ice melts into water, this is a:","multiple_choice",[{label:"A",text:"Chemical change"},{label:"B",text:"Physical change"},{label:"C",text:"New substance forming"},{label:"D",text:"Reaction"}],"B","Melting is a physical change — the substance (water) remains the same.",`${prefix}-S3`,"easy"],
      ["Which property describes how heavy an object is?","multiple_choice",[{label:"A",text:"Volume"},{label:"B",text:"Color"},{label:"C",text:"Mass"},{label:"D",text:"Texture"}],"C","Mass describes how much matter is in an object (how heavy it is).",`${prefix}-S2`,"easy"],
    ],
    2: [
      ["Sound is produced by:","multiple_choice",[{label:"A",text:"Light waves"},{label:"B",text:"Vibrations"},{label:"C",text:"Gravity"},{label:"D",text:"Heat"}],"B","Sound is produced by vibrations that travel through a medium.",`${prefix}-S1`,"easy"],
      ["When light bounces off a mirror, this is called:","multiple_choice",[{label:"A",text:"Refraction"},{label:"B",text:"Absorption"},{label:"C",text:"Reflection"},{label:"D",text:"Diffraction"}],"C","Reflection is when light bounces off a surface.",`${prefix}-S3`,"easy"],
      ["Heat naturally flows from:","multiple_choice",[{label:"A",text:"Cold to hot"},{label:"B",text:"Hot to cold"},{label:"C",text:"Equally in all directions"},{label:"D",text:"It does not flow"}],"B","Heat always flows from warmer objects to cooler objects.",`${prefix}-S2`,"medium"],
    ],
    3: [
      ["A push or pull on an object is called a:","multiple_choice",[{label:"A",text:"Motion"},{label:"B",text:"Force"},{label:"C",text:"Speed"},{label:"D",text:"Gravity"}],"B","A force is a push or pull that can change an object's motion.",`${prefix}-S1`,"easy"],
      ["Which force pulls objects toward the center of the Earth?","multiple_choice",[{label:"A",text:"Friction"},{label:"B",text:"Magnetism"},{label:"C",text:"Gravity"},{label:"D",text:"Tension"}],"C","Gravity is the force that pulls objects toward Earth's center.",`${prefix}-S2`,"easy"],
      ["A ramp is an example of which simple machine?","multiple_choice",[{label:"A",text:"Lever"},{label:"B",text:"Pulley"},{label:"C",text:"Inclined plane"},{label:"D",text:"Wheel and axle"}],"C","A ramp is an inclined plane — a simple machine that reduces the force needed to move objects.",`${prefix}-S3`,"easy"],
    ],
    4: [
      ["Which part of a plant makes food using sunlight?","multiple_choice",[{label:"A",text:"Roots"},{label:"B",text:"Stem"},{label:"C",text:"Leaves"},{label:"D",text:"Flowers"}],"C","Leaves contain chlorophyll and perform photosynthesis.",`${prefix}-S1`,"easy"],
      ["Plants need _____ to make their own food.","multiple_choice",[{label:"A",text:"Sunlight, water, and carbon dioxide"},{label:"B",text:"Sunlight, soil, and oxygen"},{label:"C",text:"Water, oxygen, and sugar"},{label:"D",text:"Soil, nitrogen, and light"}],"A","Photosynthesis requires sunlight, water, and carbon dioxide.",`${prefix}-S2`,"easy"],
      ["A cactus stores water in its thick stem. This is an example of:","multiple_choice",[{label:"A",text:"A life cycle"},{label:"B",text:"An adaptation"},{label:"C",text:"Photosynthesis"},{label:"D",text:"Reproduction"}],"B","Storing water in the stem is an adaptation to survive in dry environments.",`${prefix}-S3`,"easy"],
    ],
    5: [
      ["Which animal is a mammal?","multiple_choice",[{label:"A",text:"Frog"},{label:"B",text:"Eagle"},{label:"C",text:"Dolphin"},{label:"D",text:"Lizard"}],"C","Dolphins are mammals — they breathe air, are warm-blooded, and nurse young with milk.",`${prefix}-S1`,"easy"],
      ["In a food chain: grass → rabbit → fox. The rabbit is a:","multiple_choice",[{label:"A",text:"Producer"},{label:"B",text:"Primary consumer"},{label:"C",text:"Secondary consumer"},{label:"D",text:"Decomposer"}],"B","The rabbit eats the producer (grass), making it a primary consumer.",`${prefix}-S3`,"easy"],
      ["A butterfly goes through complete metamorphosis. What is the correct order?","multiple_choice",[{label:"A",text:"Egg → Adult → Larva → Pupa"},{label:"B",text:"Egg → Larva → Pupa → Adult"},{label:"C",text:"Larva → Egg → Pupa → Adult"},{label:"D",text:"Pupa → Egg → Larva → Adult"}],"B","Complete metamorphosis: egg → larva (caterpillar) → pupa (chrysalis) → adult.",`${prefix}-S2`,"medium"],
    ],
    6: [
      ["Which stage of the water cycle involves water turning into vapor?","multiple_choice",[{label:"A",text:"Condensation"},{label:"B",text:"Precipitation"},{label:"C",text:"Evaporation"},{label:"D",text:"Collection"}],"C","Evaporation is when liquid water turns into water vapor.",`${prefix}-S1`,"easy"],
      ["A thermometer measures:","multiple_choice",[{label:"A",text:"Wind speed"},{label:"B",text:"Air pressure"},{label:"C",text:"Temperature"},{label:"D",text:"Humidity"}],"C","A thermometer measures temperature.",`${prefix}-S2`,"easy"],
      ["Climate is different from weather because climate describes:","multiple_choice",[{label:"A",text:"Today's conditions"},{label:"B",text:"Average weather patterns over a long time"},{label:"C",text:"Tomorrow's forecast"},{label:"D",text:"A single storm"}],"B","Climate describes long-term average weather patterns; weather is day-to-day.",`${prefix}-S3`,"medium"],
    ],
    7: [
      ["The FIRST step of the scientific method is to:","multiple_choice",[{label:"A",text:"Conduct an experiment"},{label:"B",text:"Ask a question"},{label:"C",text:"Draw a conclusion"},{label:"D",text:"Collect data"}],"B","The scientific method begins with asking a question.",`${prefix}-S1`,"easy"],
      ["Which tool would you use to measure the mass of a rock?","multiple_choice",[{label:"A",text:"Ruler"},{label:"B",text:"Thermometer"},{label:"C",text:"Balance scale"},{label:"D",text:"Graduated cylinder"}],"C","A balance scale measures mass.",`${prefix}-S2`,"easy"],
      ["After collecting data, a scientist should:","multiple_choice",[{label:"A",text:"Start a new experiment immediately"},{label:"B",text:"Analyze the data and draw conclusions"},{label:"C",text:"Share results without analysis"},{label:"D",text:"Discard the data"}],"B","Data must be analyzed and interpreted before drawing conclusions.",`${prefix}-S3`,"easy"],
    ],
  };
  for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of (quizSets[num] || []).entries()) {
    await insertQuizQ(gr3SciId, uid, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
  }
}

// Diagnostic for 3rd Grade Science
const gr3SciDiag = [
  ["GR3S-D01","Which state of matter takes the shape of its container?","multiple_choice",[{label:"A",text:"Solid"},{label:"B",text:"Liquid"},{label:"C",text:"Gas"},{label:"D",text:"Both B and C"}],"D","1",["GR3S-U1-S1"],"medium","Both liquids and gases take the shape of their container.",10],
  ["GR3S-D02","Sound travels as:","multiple_choice",[{label:"A",text:"Light waves"},{label:"B",text:"Vibrations through a medium"},{label:"C",text:"Electrical signals"},{label:"D",text:"Magnetic waves"}],"B","2",["GR3S-U2-S1"],"easy","Sound travels as vibrations through a medium (air, water, solid).",20],
  ["GR3S-D03","Friction is a force that:","multiple_choice",[{label:"A",text:"Speeds objects up"},{label:"B",text:"Slows objects down"},{label:"C",text:"Has no effect on motion"},{label:"D",text:"Only affects liquids"}],"B","3",["GR3S-U3-S2"],"easy","Friction opposes motion and slows objects down.",30],
  ["GR3S-D04","Which plant part absorbs water from the soil?","multiple_choice",[{label:"A",text:"Leaves"},{label:"B",text:"Stem"},{label:"C",text:"Roots"},{label:"D",text:"Flowers"}],"C","4",["GR3S-U4-S1"],"easy","Roots absorb water and nutrients from the soil.",40],
  ["GR3S-D05","In a food chain, the sun's energy first goes to:","multiple_choice",[{label:"A",text:"Animals"},{label:"B",text:"Decomposers"},{label:"C",text:"Producers (plants)"},{label:"D",text:"Consumers"}],"C","5",["GR3S-U5-S3"],"easy","Plants (producers) capture the sun's energy through photosynthesis.",50],
  ["GR3S-D06","When water vapor cools and forms clouds, this is called:","multiple_choice",[{label:"A",text:"Evaporation"},{label:"B",text:"Precipitation"},{label:"C",text:"Condensation"},{label:"D",text:"Runoff"}],"C","6",["GR3S-U6-S1"],"easy","Condensation is when water vapor cools and forms liquid droplets.",60],
  ["GR3S-D07","A scientist makes a prediction before an experiment. This is called a:","multiple_choice",[{label:"A",text:"Conclusion"},{label:"B",text:"Hypothesis"},{label:"C",text:"Theory"},{label:"D",text:"Data"}],"B","7",["GR3S-U7-S1"],"easy","A hypothesis is a testable prediction made before an experiment.",70],
  ["GR3S-D08","Which change is a CHEMICAL change?","multiple_choice",[{label:"A",text:"Cutting paper"},{label:"B",text:"Melting ice"},{label:"C",text:"Burning wood"},{label:"D",text:"Bending a wire"}],"C","1",["GR3S-U1-S3"],"medium","Burning wood is a chemical change — a new substance (ash, smoke) is formed.",80],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of gr3SciDiag) {
  await insertDiagQ(gr3SciId, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE 9: 3rd Grade Social Studies
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Seeding 3rd Grade Social Studies...");
const gr3SsId = await insertCourse(
  "GR3SS", "3rd Grade Social Studies", "social_studies", "3",
  "Katy ISD 3rd Grade Social Studies — communities, geography, economics, civics, and Texas history.",
  "TEKS 113.14", 9
);

const gr3SsUnits = [
  [1, "Communities & Culture", "Types of communities (urban, suburban, rural), cultural traditions, and community helpers.", "TEKS 113.14(b)(1)", 10],
  [2, "Geography & Maps", "Cardinal and intermediate directions, map keys, landforms, and regions of Texas.", "TEKS 113.14(b)(4)", 20],
  [3, "Texas History & Government", "Texas symbols, famous Texans, state government, and the Texas flag.", "TEKS 113.14(b)(2)", 30],
  [4, "Economics: Goods & Services", "Producers and consumers, goods vs services, supply and demand, and earning/spending.", "TEKS 113.14(b)(5)", 40],
  [5, "Citizenship & Civics", "Rights and responsibilities, rules and laws, voting, and community leaders.", "TEKS 113.14(b)(3)", 50],
  [6, "American History & Symbols", "American symbols, national holidays, famous Americans, and the Constitution.", "TEKS 113.14(b)(2)", 60],
];

for (const [num, title, overview, teks, sort] of gr3SsUnits) {
  const uid = await insertUnit(gr3SsId, num, title, overview, teks, sort);
  const prefix = `GR3SS-U${num}`;
  const skillSets = {
    1: [["S1","Distinguish urban, suburban, and rural communities"],["S2","Describe cultural traditions and celebrations"],["S3","Identify community helpers and their roles"]],
    2: [["S1","Use cardinal and intermediate directions on a map"],["S2","Read and interpret a map key/legend"],["S3","Identify major landforms and regions of Texas"]],
    3: [["S1","Identify Texas state symbols (flag, flower, bird, tree)"],["S2","Describe the roles of state government branches"],["S3","Name famous Texans and their contributions"]],
    4: [["S1","Distinguish goods from services"],["S2","Explain the roles of producers and consumers"],["S3","Describe basic concepts of supply, demand, and trade"]],
    5: [["S1","Describe rights and responsibilities of citizens"],["S2","Explain the importance of rules and laws"],["S3","Describe the voting process and civic participation"]],
    6: [["S1","Identify American symbols and their meanings"],["S2","Describe the significance of national holidays"],["S3","Name famous Americans and their contributions"]],
  };
  for (const [i, [sid, sname]] of (skillSets[num] || []).entries()) {
    await insertSkill(gr3SsId, `${prefix}-${sid}`, sname, uid, num, (i+1)*10);
  }
  const quizSets = {
    1: [
      ["A community with many tall buildings, busy streets, and lots of people is called:","multiple_choice",[{label:"A",text:"Rural"},{label:"B",text:"Suburban"},{label:"C",text:"Urban"},{label:"D",text:"Agricultural"}],"C","Urban communities have high population density and many buildings.",`${prefix}-S1`,"easy"],
      ["A firefighter is an example of a:","multiple_choice",[{label:"A",text:"Producer of goods"},{label:"B",text:"Community helper"},{label:"C",text:"Government official"},{label:"D",text:"Consumer"}],"B","Firefighters are community helpers who provide safety services.",`${prefix}-S3`,"easy"],
      ["Celebrating Thanksgiving is an example of a:","multiple_choice",[{label:"A",text:"Law"},{label:"B",text:"Rule"},{label:"C",text:"Cultural tradition"},{label:"D",text:"Government policy"}],"C","Thanksgiving is a cultural tradition passed down through generations.",`${prefix}-S2`,"easy"],
    ],
    2: [
      ["On a compass rose, which direction is opposite of North?","multiple_choice",[{label:"A",text:"East"},{label:"B",text:"West"},{label:"C",text:"South"},{label:"D",text:"Northeast"}],"C","South is directly opposite North on a compass rose.",`${prefix}-S1`,"easy"],
      ["A map key (legend) shows:","multiple_choice",[{label:"A",text:"The scale of the map"},{label:"B",text:"The meaning of symbols used on the map"},{label:"C",text:"The direction of North"},{label:"D",text:"The age of the map"}],"B","A map key explains what the symbols and colors on the map represent.",`${prefix}-S2`,"easy"],
      ["Texas is divided into how many major natural regions?","multiple_choice",[{label:"A",text:"3"},{label:"B",text:"4"},{label:"C",text:"5"},{label:"D",text:"7"}],"B","Texas has 4 major natural regions: Gulf Coastal Plains, Interior Lowlands, Great Plains, and Basin and Range.",`${prefix}-S3`,"medium"],
    ],
    3: [
      ["What is the state flower of Texas?","multiple_choice",[{label:"A",text:"Rose"},{label:"B",text:"Sunflower"},{label:"C",text:"Bluebonnet"},{label:"D",text:"Daisy"}],"C","The bluebonnet is the official state flower of Texas.",`${prefix}-S1`,"easy"],
      ["The Texas state government has three branches. Which branch makes the laws?","multiple_choice",[{label:"A",text:"Executive"},{label:"B",text:"Judicial"},{label:"C",text:"Legislative"},{label:"D",text:"Administrative"}],"C","The legislative branch (Texas Legislature) makes the laws.",`${prefix}-S2`,"medium"],
      ["Sam Houston is famous for:","multiple_choice",[{label
:"A",text:"Being the first president of the U.S."},{label:"B",text:"Signing the Declaration of Independence"},{label:"C",text:"Leading Texas to independence and serving as its president"},{label:"D",text:"Founding the city of Houston"}],"C","Sam Houston led Texas to independence from Mexico and served as president of the Republic of Texas.",`${prefix}-S3`,"medium"],
    ],
    4: [
      ["A baker who makes bread is an example of a:","multiple_choice",[{label:"A",text:"Consumer"},{label:"B",text:"Community helper"},{label:"C",text:"Producer"},{label:"D",text:"Trader"}],"C","A producer creates goods or services for others to use.",`${prefix}-S2`,"easy"],
      ["Which is an example of a SERVICE (not a good)?","multiple_choice",[{label:"A",text:"A book"},{label:"B",text:"A haircut"},{label:"C",text:"A sandwich"},{label:"D",text:"A toy"}],"B","A haircut is a service — work done for someone — not a physical good.",`${prefix}-S1`,"easy"],
      ["When there are many buyers for a product but little supply, the price usually:","multiple_choice",[{label:"A",text:"Goes down"},{label:"B",text:"Stays the same"},{label:"C",text:"Goes up"},{label:"D",text:"Disappears"}],"C","High demand with low supply causes prices to rise.",`${prefix}-S3`,"medium"],
    ],
    5: [
      ["Which is a RESPONSIBILITY of a good citizen?","multiple_choice",[{label:"A",text:"Ignoring laws you disagree with"},{label:"B",text:"Voting in elections"},{label:"C",text:"Littering in public parks"},{label:"D",text:"Keeping all resources for yourself"}],"B","Voting is a civic responsibility that helps choose community leaders.",`${prefix}-S3`,"easy"],
      ["Rules and laws are important because they:","multiple_choice",[{label:"A",text:"Make life boring"},{label:"B",text:"Help keep people safe and treat everyone fairly"},{label:"C",text:"Only apply to adults"},{label:"D",text:"Are made by students"}],"B","Rules and laws protect people and ensure fair treatment.",`${prefix}-S2`,"easy"],
      ["A RIGHT that American citizens have is:","multiple_choice",[{label:"A",text:"Freedom of speech"},{label:"B",text:"Breaking any law they choose"},{label:"C",text:"Taking others' property"},{label:"D",text:"Skipping school forever"}],"A","Freedom of speech is a constitutional right of American citizens.",`${prefix}-S1`,"medium"],
    ],
    6: [
      ["The bald eagle is a symbol of the United States because it represents:","multiple_choice",[{label:"A",text:"Speed and agility"},{label:"B",text:"Freedom and strength"},{label:"C",text:"Wisdom and age"},{label:"D",text:"Friendship and peace"}],"B","The bald eagle symbolises freedom and strength as the national bird.",`${prefix}-S1`,"easy"],
      ["Independence Day (July 4th) celebrates:","multiple_choice",[{label:"A",text:"The end of the Civil War"},{label:"B",text:"The signing of the Declaration of Independence"},{label:"C",text:"The founding of Texas"},{label:"D",text:"The first Thanksgiving"}],"B","July 4th marks the adoption of the Declaration of Independence in 1776.",`${prefix}-S2`,"easy"],
      ["Martin Luther King Jr. is famous for:","multiple_choice",[{label:"A",text:"Inventing the telephone"},{label:"B",text:"Leading the civil rights movement for equality"},{label:"C",text:"Being the first president"},{label:"D",text:"Exploring the American West"}],"B","Dr. King led the civil rights movement advocating for racial equality and justice.",`${prefix}-S3`,"medium"],
    ],
  };
  for (const [num2, qs] of Object.entries(quizSets)) {
    const [uid2Rows] = await db.execute(`SELECT id FROM units WHERE courseId=? AND unitNumber=?`, [gr3SsId, parseInt(num2)]);
    if (!uid2Rows[0]) continue;
    for (const [i, [text, type, choices, answer, explanation, skillTag, difficulty]] of qs.entries()) {
      await insertQuizQ(gr3SsId, uid2Rows[0].id, text, type, choices, answer, explanation, skillTag, difficulty, (i+1)*10);
    }
  }
}

// Diagnostic questions for 3rd Grade Social Studies
const gr3SsDiag = [
  ["GR3SS-D01","Which type of community has the most people and tallest buildings?","multiple_choice",[{label:"A",text:"Rural"},{label:"B",text:"Suburban"},{label:"C",text:"Urban"},{label:"D",text:"Agricultural"}],"C","1",["GR3SS-U1-S1"],"easy","Urban communities are densely populated with tall buildings.",10],
  ["GR3SS-D02","What does a map key (legend) show?","multiple_choice",[{label:"A",text:"The map's age"},{label:"B",text:"The meaning of map symbols"},{label:"C",text:"The map's scale"},{label:"D",text:"The map's author"}],"B","2",["GR3SS-U2-S2"],"easy","A map key explains the symbols used on the map.",20],
  ["GR3SS-D03","The state flower of Texas is the:","multiple_choice",[{label:"A",text:"Rose"},{label:"B",text:"Daisy"},{label:"C",text:"Bluebonnet"},{label:"D",text:"Sunflower"}],"C","3",["GR3SS-U3-S1"],"easy","The bluebonnet is the official state flower of Texas.",30],
  ["GR3SS-D04","A person who buys goods or services is called a:","multiple_choice",[{label:"A",text:"Producer"},{label:"B",text:"Consumer"},{label:"C",text:"Trader"},{label:"D",text:"Manufacturer"}],"B","4",["GR3SS-U4-S2"],"easy","A consumer buys and uses goods or services.",40],
  ["GR3SS-D05","Which is a responsibility of a citizen?","multiple_choice",[{label:"A",text:"Breaking rules"},{label:"B",text:"Voting"},{label:"C",text:"Littering"},{label:"D",text:"Ignoring laws"}],"B","5",["GR3SS-U5-S3"],"easy","Voting is a civic responsibility.",50],
  ["GR3SS-D06","Independence Day celebrates the signing of the:","multiple_choice",[{label:"A",text:"Constitution"},{label:"B",text:"Bill of Rights"},{label:"C",text:"Declaration of Independence"},{label:"D",text:"Emancipation Proclamation"}],"C","6",["GR3SS-U6-S2"],"medium","July 4th marks the Declaration of Independence in 1776.",60],
];
for (const [qid, text, type, choices, answer, unit, skills, diff, expl, sort] of gr3SsDiag) {
  await insertDiagQ(gr3SsId, qid, text, type, choices, answer, unit, skills, diff, expl, sort);
}

// ─── Mark Algebra I as the default course ─────────────────────────────────────
await db.execute(`UPDATE courses SET isDefault=true WHERE courseCode='ALG1'`);

console.log("\n✅ All courses seeded successfully!");
console.log("Courses: ALG1, ENG1, BIO1, APHG, SPA2, GR3MATH, GR3ELA, GR3SCI, GR3SS");
await db.end();
