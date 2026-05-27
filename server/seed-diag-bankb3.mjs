/**
 * seed-diag-bankb3.mjs
 * Bank B expansion for Grades 6-8 ACA/KAP and AP/SAT/Grade 9 courses.
 * Copies Bank B from Grade 4-5 equivalents for Grades 6-8 with code substitution.
 * For Grade 9 and AP/SAT courses: adds 27 targeted questions.
 */
import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function getCourseId(code) {
  const [r] = await conn.execute('SELECT id FROM courses WHERE courseCode=?', [code]);
  return r[0]?.id ?? null;
}
async function ins(courseId, qId, qText, choices, ans, unit, diff, expl, sort) {
  const [ex] = await conn.execute('SELECT id FROM diagnosticQuestions WHERE questionId=?', [qId]);
  if (ex.length > 0) return;
  await conn.execute(
    `INSERT INTO diagnosticQuestions (questionId,questionText,questionType,choices,correctAnswer,mapsToUnit,mapsToSkills,difficulty,explanation,sortOrder,courseId)
     VALUES (?,?,'multiple_choice',?,?,?,'[]',?,?,?,?)`,
    [qId, qText, JSON.stringify(choices), ans, unit, diff, expl, sort, courseId]
  );
}
const mc = (l, t) => ({ label: l, text: t });

// Copy Bank B from one course to another with code substitution
async function copyBankB(fromCode, toCode) {
  const fromId = await getCourseId(fromCode);
  const toId = await getCourseId(toCode);
  if (!fromId || !toId) { console.log(`SKIP: ${fromCode} → ${toCode}`); return; }
  const [rows] = await conn.execute(
    'SELECT * FROM diagnosticQuestions WHERE courseId=? AND sortOrder>=31 ORDER BY sortOrder',
    [fromId]
  );
  for (const row of rows) {
    const newQId = row.questionId.replace(new RegExp(fromCode, 'g'), toCode);
    const choices = typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices;
    await ins(toId, newQId, row.questionText, choices, row.correctAnswer, row.mapsToUnit, row.difficulty, row.explanation, row.sortOrder);
  }
  console.log(`${toCode} Bank B done (copied from ${fromCode})`);
}

// ─── GRADE 6-8 ACA courses — copy from Grade 4-5 equivalents ─────────────────
async function expandGr68ACA() {
  // Math: G6/G7/G8 get G5MATH Bank B with code substitution
  await copyBankB('G5MATH', 'G6MATH');
  await copyBankB('G5MATH', 'G7MATH');
  await copyBankB('G5MATH', 'G8MATH');
  // ELA
  await copyBankB('G4ELA', 'G6ELA');
  await copyBankB('G4ELA', 'G7ELA');
  await copyBankB('G4ELA', 'G8ELA');
  // Science
  await copyBankB('G4SCI', 'G6SCI');
  await copyBankB('G4SCI', 'G7SCI');
  await copyBankB('G4SCI', 'G8SCI');
  // Social Studies
  await copyBankB('G4SS', 'G6SS');
  await copyBankB('G4SS', 'G7SS');
  await copyBankB('G4SS', 'G8SS');
  // Technology
  await copyBankB('G4TECH', 'G6TECH');
  await copyBankB('G4TECH', 'G7TECH');
  await copyBankB('G4TECH', 'G8TECH');
}

// ─── GRADE 6-8 KAP courses ────────────────────────────────────────────────────
async function expandGr68KAP() {
  await copyBankB('G5MATH', 'G6KAPMATH');
  await copyBankB('G4ELA',  'G6KAPELA');
  await copyBankB('G5MATH', 'G7KAPMATH');
  await copyBankB('G4ELA',  'G7KAPELA');
  await copyBankB('G5MATH', 'G8KAPMATH');
  await copyBankB('G4ELA',  'G8KAPELA');
}

// ─── ALGEBRA I (ALG1) ─────────────────────────────────────────────────────────
async function alg1BankB() {
  const id = await getCourseId('ALG1'); if (!id) return;
  const qs = [
    ['ALG1-D-B001','Simplify: 3x + 5x',[mc('A','8x'),mc('B','8x²'),mc('C','15x'),mc('D','2x')],'A','prerequisite','easy','Combine like terms: 3x + 5x = 8x.',31],
    ['ALG1-D-B002','What is the value of 2³?',[mc('A','6'),mc('B','8'),mc('C','9'),mc('D','16')],'B','prerequisite','easy','2³ = 2 × 2 × 2 = 8.',32],
    ['ALG1-D-B003','Solve: x + 9 = 17',[mc('A','7'),mc('B','8'),mc('C','9'),mc('D','26')],'B','prerequisite','easy','x = 17 − 9 = 8.',33],
    ['ALG1-D-B004','What is the slope of the line y = 3x − 4?',[mc('A','−4'),mc('B','3'),mc('C','4'),mc('D','−3')],'B','1','easy','In y = mx + b, the slope m = 3.',34],
    ['ALG1-D-B005','What is the y-intercept of y = −2x + 7?',[mc('A','−2'),mc('B','2'),mc('C','7'),mc('D','−7')],'C','1','easy','In y = mx + b, the y-intercept b = 7.',35],
    ['ALG1-D-B006','Solve: 4x − 3 = 13',[mc('A','2.5'),mc('B','3'),mc('C','4'),mc('D','5')],'C','2','easy','4x = 16; x = 4.',36],
    ['ALG1-D-B007','Solve: 2(x + 5) = 18',[mc('A','4'),mc('B','5'),mc('C','6'),mc('D','7')],'A','2','medium','2x + 10 = 18; 2x = 8; x = 4.',37],
    ['ALG1-D-B008','What is the solution to the system: y = x + 2 and y = 2x − 1?',[mc('A','(3, 5)'),mc('B','(2, 4)'),mc('C','(1, 3)'),mc('D','(4, 6)')],'A','3','medium','Set x+2 = 2x−1; x = 3; y = 5.',38],
    ['ALG1-D-B009','How many solutions does a system of parallel lines have?',[mc('A','One'),mc('B','Two'),mc('C','Infinitely many'),mc('D','None')],'D','3','medium','Parallel lines never intersect, so no solution.',39],
    ['ALG1-D-B010','Multiply: (x + 3)(x − 2)',[mc('A','x² + x − 6'),mc('B','x² − x − 6'),mc('C','x² + x + 6'),mc('D','x² − 5x − 6')],'A','4','medium','FOIL: x²−2x+3x−6 = x²+x−6.',40],
    ['ALG1-D-B011','Factor: x² − 9',[mc('A','(x−3)(x−3)'),mc('B','(x+3)(x+3)'),mc('C','(x+3)(x−3)'),mc('D','(x−9)(x+1)')],'C','4','medium','Difference of squares: a²−b² = (a+b)(a−b).',41],
    ['ALG1-D-B012','What is the discriminant of x² − 4x + 4 = 0?',[mc('A','0'),mc('B','4'),mc('C','8'),mc('D','16')],'A','5','medium','Discriminant = b²−4ac = 16−16 = 0.',42],
    ['ALG1-D-B013','How many real solutions does x² + 4 = 0 have?',[mc('A','0'),mc('B','1'),mc('C','2'),mc('D','4')],'A','5','medium','x² = −4 has no real solutions (discriminant < 0).',43],
    ['ALG1-D-B014','What is the domain of f(x) = √x?',[mc('A','All real numbers'),mc('B','x ≥ 0'),mc('C','x > 0'),mc('D','x ≤ 0')],'B','6','medium','The square root requires x ≥ 0.',44],
    ['ALG1-D-B015','If f(x) = 2x + 3, what is f(−1)?',[mc('A','1'),mc('B','−1'),mc('C','5'),mc('D','−5')],'A','6','easy','f(−1) = 2(−1) + 3 = 1.',45],
    ['ALG1-D-B016','Simplify: x³ · x⁴',[mc('A','x⁷'),mc('B','x¹²'),mc('C','x'),mc('D','2x⁷')],'A','7','easy','x³ · x⁴ = x^(3+4) = x⁷.',46],
    ['ALG1-D-B017','Simplify: (x²)³',[mc('A','x⁵'),mc('B','x⁶'),mc('C','3x²'),mc('D','x⁸')],'B','7','easy','(x²)³ = x^(2×3) = x⁶.',47],
    ['ALG1-D-B018','What is the solution to |x − 3| = 5?',[mc('A','x = 8 only'),mc('B','x = −2 only'),mc('C','x = 8 or x = −2'),mc('D','No solution')],'C','8','medium','|x−3|=5 → x−3=5 or x−3=−5 → x=8 or x=−2.',48],
    ['ALG1-D-B019','Solve: −2x > 8',[mc('A','x > −4'),mc('B','x < −4'),mc('C','x > 4'),mc('D','x < 4')],'B','8','medium','Divide by −2 and flip the inequality: x < −4.',49],
    ['ALG1-D-B020','What is the arithmetic mean of 5, 10, 15, 20?',[mc('A','10'),mc('B','12.5'),mc('C','15'),mc('D','20')],'B','9','easy','Mean = (5+10+15+20)/4 = 50/4 = 12.5.',50],
    ['ALG1-D-B021','A data set has values 2, 4, 4, 6, 8. What is the mode?',[mc('A','2'),mc('B','4'),mc('C','6'),mc('D','8')],'B','9','easy','The mode is the most frequent value: 4.',51],
    ['ALG1-D-B022','Which equation represents exponential growth?',[mc('A','y = 2x + 1'),mc('B','y = x²'),mc('C','y = 3(2)ˣ'),mc('D','y = −x + 5')],'C','10','medium','Exponential growth: y = a·bˣ where b > 1.',52],
    ['ALG1-D-B023','What is the y-value when x = 0 in y = 5(3)ˣ?',[mc('A','0'),mc('B','3'),mc('C','5'),mc('D','15')],'C','10','easy','y = 5(3)⁰ = 5 × 1 = 5.',53],
    ['ALG1-D-B024','What is the slope of a horizontal line?',[mc('A','Undefined'),mc('B','1'),mc('C','−1'),mc('D','0')],'D','11','easy','Horizontal lines have a slope of 0.',54],
    ['ALG1-D-B025','What is the slope of a vertical line?',[mc('A','0'),mc('B','1'),mc('C','Undefined'),mc('D','−1')],'C','11','easy','Vertical lines have an undefined slope.',55],
    ['ALG1-D-B026','What is the midpoint of (2, 4) and (6, 8)?',[mc('A','(4, 6)'),mc('B','(3, 5)'),mc('C','(8, 12)'),mc('D','(2, 4)')],'A','12','easy','Midpoint = ((2+6)/2, (4+8)/2) = (4, 6).',56],
    ['ALG1-D-B027','What is the distance between (0, 0) and (3, 4)?',[mc('A','5'),mc('B','7'),mc('C','12'),mc('D','25')],'A','12','medium','Distance = √(3²+4²) = √25 = 5.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('ALG1 Bank B done');
}

// ─── ENGLISH I (ENG1) ─────────────────────────────────────────────────────────
async function eng1BankB() {
  const id = await getCourseId('ENG1'); if (!id) return;
  const qs = [
    ['ENG1-D-B001','What is the subject of a sentence?',[mc('A','The action word'),mc('B','Who or what the sentence is about'),mc('C','The describing word'),mc('D','The connecting word')],'B','prerequisite','easy','The subject is who or what the sentence is about.',31],
    ['ENG1-D-B002','What is a thesis statement?',[mc('A','The conclusion of an essay'),mc('B','The central argument or main point of an essay'),mc('C','A supporting detail'),mc('D','A quotation')],'B','prerequisite','easy','A thesis statement presents the central argument of an essay.',32],
    ['ENG1-D-B003','What is tone in literature?',[mc('A','The volume of the writing'),mc('B','The author\'s attitude toward the subject'),mc('C','The setting of the story'),mc('D','The plot summary')],'B','prerequisite','easy','Tone reflects the author\'s attitude toward the subject.',33],
    ['ENG1-D-B004','What is the difference between denotation and connotation?',[mc('A','Denotation is the emotional meaning; connotation is the literal meaning'),mc('B','Denotation is the literal meaning; connotation is the emotional or cultural meaning'),mc('C','They mean the same thing'),mc('D','Denotation applies only to poetry')],'B','1','medium','Denotation = literal meaning; connotation = emotional/cultural associations.',34],
    ['ENG1-D-B005','What is an allusion?',[mc('A','A direct comparison'),mc('B','A reference to a well-known person, event, or work'),mc('C','An exaggeration'),mc('D','A repeated sound')],'B','1','medium','An allusion is an indirect reference to something well-known.',35],
    ['ENG1-D-B006','What is the narrative point of view in first person?',[mc('A','The narrator is outside the story'),mc('B','The narrator is a character using "I"'),mc('C','The narrator knows everything'),mc('D','The narrator addresses the reader as "you"')],'B','2','easy','First person uses "I" and the narrator is a character in the story.',36],
    ['ENG1-D-B007','What is third-person omniscient point of view?',[mc('A','The narrator is a character using "I"'),mc('B','The narrator knows the thoughts and feelings of all characters'),mc('C','The narrator knows only one character\'s thoughts'),mc('D','The narrator addresses the reader')],'B','2','medium','Omniscient narrators know everything about all characters.',37],
    ['ENG1-D-B008','What is a foil character?',[mc('A','A villain'),mc('B','A character who contrasts with another to highlight qualities'),mc('C','A minor character'),mc('D','The protagonist')],'B','3','medium','A foil contrasts with another character to highlight their traits.',38],
    ['ENG1-D-B009','What is the difference between static and dynamic characters?',[mc('A','Static characters change; dynamic characters don\'t'),mc('B','Dynamic characters change; static characters don\'t'),mc('C','Both change throughout the story'),mc('D','Neither changes')],'B','3','medium','Dynamic characters change; static characters remain the same.',39],
    ['ENG1-D-B010','What is a claim in an argumentative essay?',[mc('A','A piece of evidence'),mc('B','The central argument the writer is making'),mc('C','A counterargument'),mc('D','A quotation')],'B','4','easy','A claim is the central argument the writer is making.',40],
    ['ENG1-D-B011','What is a counterargument?',[mc('A','An argument that supports the claim'),mc('B','An opposing argument that the writer addresses'),mc('C','A piece of evidence'),mc('D','The conclusion')],'B','4','medium','A counterargument is an opposing view that the writer acknowledges and refutes.',41],
    ['ENG1-D-B012','What is iambic pentameter?',[mc('A','A type of rhyme scheme'),mc('B','A rhythmic pattern of 10 syllables per line (unstressed/stressed)'),mc('C','A type of stanza'),mc('D','A poetic device using repetition')],'B','5','hard','Iambic pentameter has 5 iambs (unstressed/stressed) per line = 10 syllables.',42],
    ['ENG1-D-B013','What is a sonnet?',[mc('A','A 14-line poem with a specific rhyme scheme'),mc('B','A poem with no set structure'),mc('C','A poem with 3 stanzas'),mc('D','A narrative poem')],'A','5','medium','A sonnet has 14 lines and follows a specific rhyme scheme.',43],
    ['ENG1-D-B014','What is the purpose of a rhetorical question?',[mc('A','To get a factual answer'),mc('B','To make a point or provoke thought without expecting an answer'),mc('C','To confuse the reader'),mc('D','To provide evidence')],'B','6','medium','Rhetorical questions make a point without expecting an answer.',44],
    ['ENG1-D-B015','What is anaphora?',[mc('A','Repetition of a word or phrase at the beginning of successive clauses'),mc('B','A comparison using "like"'),mc('C','An exaggeration'),mc('D','A reference to another work')],'A','6','medium','Anaphora is the repetition of a word/phrase at the start of successive clauses.',45],
    ['ENG1-D-B016','What is the difference between a primary and secondary source?',[mc('A','Primary sources are more reliable'),mc('B','Primary sources are original; secondary sources analyse or interpret primary sources'),mc('C','Secondary sources are always more accurate'),mc('D','There is no difference')],'B','7','medium','Primary = original; secondary = analysis of primary sources.',46],
    ['ENG1-D-B017','What is plagiarism?',[mc('A','Citing sources correctly'),mc('B','Using someone else\'s work without credit'),mc('C','Writing an original essay'),mc('D','Paraphrasing with citation')],'B','7','easy','Plagiarism is using someone else\'s work without giving credit.',47],
    ['ENG1-D-B018','What is a complex sentence?',[mc('A','A sentence with two independent clauses'),mc('B','A sentence with one independent and one dependent clause'),mc('C','A sentence with only one clause'),mc('D','A sentence with three independent clauses')],'B','8','medium','A complex sentence has one independent and one dependent clause.',48],
    ['ENG1-D-B019','What is a semicolon used for?',[mc('A','To end a sentence'),mc('B','To join two related independent clauses'),mc('C','To introduce a list'),mc('D','To show possession')],'B','8','medium','Semicolons join two related independent clauses.',49],
    ['ENG1-D-B020','What is the purpose of a hook in an introduction?',[mc('A','To state the thesis'),mc('B','To grab the reader\'s attention'),mc('C','To provide background information'),mc('D','To list the main points')],'B','9','easy','A hook grabs the reader\'s attention at the start of an essay.',50],
    ['ENG1-D-B021','What is a transition word?',[mc('A','A word that ends a sentence'),mc('B','A word or phrase that connects ideas between sentences or paragraphs'),mc('C','A describing word'),mc('D','A naming word')],'B','9','easy','Transition words connect ideas, like "however," "therefore," "in addition."',51],
    ['ENG1-D-B022','What is the Shakespearean tragic hero?',[mc('A','A hero with no flaws'),mc('B','A noble character with a fatal flaw that leads to their downfall'),mc('C','A villain who becomes good'),mc('D','A comic character')],'B','10','medium','A tragic hero is noble but has a fatal flaw (hamartia) causing their downfall.',52],
    ['ENG1-D-B023','What is dramatic irony?',[mc('A','When the audience knows something a character does not'),mc('B','When a character says the opposite of what they mean'),mc('C','When an unexpected event occurs'),mc('D','When a character is overly dramatic')],'A','10','medium','Dramatic irony occurs when the audience knows more than the characters.',53],
    ['ENG1-D-B024','What is a gerund?',[mc('A','A verb used as a noun, ending in -ing'),mc('B','A type of adjective'),mc('C','A connecting word'),mc('D','A past tense verb')],'A','11','medium','A gerund is a verb form ending in -ing used as a noun, e.g., "Swimming is fun."',54],
    ['ENG1-D-B025','What is an infinitive?',[mc('A','A verb in past tense'),mc('B','The base form of a verb preceded by "to"'),mc('C','A type of adjective'),mc('D','A compound word')],'B','11','medium','An infinitive is "to" + base verb, e.g., "to run," "to write."',55],
    ['ENG1-D-B026','What is the purpose of a works cited page?',[mc('A','To summarise the essay'),mc('B','To list all sources used in the essay'),mc('C','To provide additional information'),mc('D','To introduce the topic')],'B','12','easy','A works cited page lists all sources referenced in the essay.',56],
    ['ENG1-D-B027','What is MLA format?',[mc('A','A type of essay structure'),mc('B','A citation style used in humanities and English'),mc('C','A grammar rule'),mc('D','A type of poem')],'B','12','easy','MLA (Modern Language Association) format is a citation style used in humanities.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('ENG1 Bank B done');
}

// ─── BIOLOGY I (BIO1) ─────────────────────────────────────────────────────────
async function bio1BankB() {
  const id = await getCourseId('BIO1'); if (!id) return;
  const qs = [
    ['BIO1-D-B001','What is the basic unit of life?',[mc('A','Atom'),mc('B','Molecule'),mc('C','Cell'),mc('D','Organ')],'C','prerequisite','easy','The cell is the basic unit of life.',31],
    ['BIO1-D-B002','What is DNA?',[mc('A','A type of protein'),mc('B','The molecule that carries genetic information'),mc('C','A type of carbohydrate'),mc('D','A cell membrane component')],'B','prerequisite','easy','DNA carries the genetic information of an organism.',32],
    ['BIO1-D-B003','What is photosynthesis?',[mc('A','The process of cellular respiration'),mc('B','The process by which plants convert sunlight into food'),mc('C','The process of cell division'),mc('D','The process of protein synthesis')],'B','prerequisite','easy','Photosynthesis converts sunlight, water, and CO₂ into glucose and oxygen.',33],
    ['BIO1-D-B004','What is the function of the mitochondria?',[mc('A','Protein synthesis'),mc('B','Energy production (ATP)'),mc('C','DNA storage'),mc('D','Cell division')],'B','1','easy','Mitochondria produce ATP through cellular respiration.',34],
    ['BIO1-D-B005','What is osmosis?',[mc('A','Movement of solutes across a membrane'),mc('B','Movement of water across a semi-permeable membrane from high to low concentration'),mc('C','Active transport of molecules'),mc('D','Cell division')],'B','1','medium','Osmosis is the diffusion of water across a semi-permeable membrane.',35],
    ['BIO1-D-B006','What is the difference between mitosis and meiosis?',[mc('A','Mitosis produces 4 cells; meiosis produces 2'),mc('B','Mitosis produces 2 identical cells; meiosis produces 4 genetically diverse cells'),mc('C','They are the same process'),mc('D','Meiosis produces identical cells')],'B','2','medium','Mitosis = 2 identical daughter cells; meiosis = 4 genetically diverse cells.',36],
    ['BIO1-D-B007','What is a chromosome?',[mc('A','A type of protein'),mc('B','A structure made of DNA and protein that carries genes'),mc('C','A cell organelle'),mc('D','A type of RNA')],'B','2','easy','Chromosomes are structures of DNA and protein that carry genes.',37],
    ['BIO1-D-B008','What is a dominant allele?',[mc('A','An allele that is only expressed when two copies are present'),mc('B','An allele that is expressed even when only one copy is present'),mc('C','A mutated allele'),mc('D','A recessive allele')],'B','3','easy','A dominant allele is expressed when at least one copy is present.',38],
    ['BIO1-D-B009','What is a Punnett square used for?',[mc('A','To map the human genome'),mc('B','To predict the probability of offspring traits'),mc('C','To show the structure of DNA'),mc('D','To classify organisms')],'B','3','easy','Punnett squares predict the probability of offspring inheriting traits.',39],
    ['BIO1-D-B010','What is natural selection?',[mc('A','Humans selecting which animals to breed'),mc('B','The process by which organisms with favourable traits survive and reproduce'),mc('C','Random genetic mutation'),mc('D','The extinction of species')],'B','4','easy','Natural selection favours organisms with traits suited to their environment.',40],
    ['BIO1-D-B011','What is a mutation?',[mc('A','A change in an organism\'s behaviour'),mc('B','A change in the DNA sequence'),mc('C','A type of cell division'),mc('D','A protein synthesis error')],'B','4','easy','A mutation is a change in the DNA sequence.',41],
    ['BIO1-D-B012','What is the role of enzymes?',[mc('A','To store energy'),mc('B','To speed up chemical reactions in the body'),mc('C','To carry oxygen in the blood'),mc('D','To build cell membranes')],'B','5','easy','Enzymes are biological catalysts that speed up chemical reactions.',42],
    ['BIO1-D-B013','What is ATP?',[mc('A','A type of DNA'),mc('B','The energy currency of the cell'),mc('C','A structural protein'),mc('D','A type of lipid')],'B','5','easy','ATP (adenosine triphosphate) is the primary energy currency of cells.',43],
    ['BIO1-D-B014','What is the function of the nervous system?',[mc('A','To transport oxygen'),mc('B','To coordinate body responses by transmitting signals'),mc('C','To digest food'),mc('D','To produce hormones')],'B','6','easy','The nervous system transmits signals to coordinate body responses.',44],
    ['BIO1-D-B015','What is homeostasis?',[mc('A','The process of cell division'),mc('B','The maintenance of a stable internal environment'),mc('C','The process of evolution'),mc('D','The immune response')],'B','6','easy','Homeostasis is the maintenance of a stable internal environment.',45],
    ['BIO1-D-B016','What is a food web?',[mc('A','A single food chain'),mc('B','A network of interconnected food chains in an ecosystem'),mc('C','A list of producers'),mc('D','A type of symbiosis')],'B','7','easy','A food web shows the complex feeding relationships in an ecosystem.',46],
    ['BIO1-D-B017','What is symbiosis?',[mc('A','Competition between species'),mc('B','A close, long-term relationship between two different species'),mc('C','Predation'),mc('D','Decomposition')],'B','7','easy','Symbiosis is a close, long-term relationship between two species.',47],
    ['BIO1-D-B018','What is the difference between aerobic and anaerobic respiration?',[mc('A','Aerobic requires oxygen; anaerobic does not'),mc('B','Anaerobic requires oxygen; aerobic does not'),mc('C','They are the same'),mc('D','Aerobic produces less ATP')],'A','8','medium','Aerobic respiration requires oxygen; anaerobic does not.',48],
    ['BIO1-D-B019','What is the equation for cellular respiration?',[mc('A','CO₂ + H₂O → C₆H₁₂O₆ + O₂'),mc('B','C₆H₁₂O₆ + O₂ → CO₂ + H₂O + ATP'),mc('C','H₂O + O₂ → CO₂ + ATP'),mc('D','C₆H₁₂O₆ → CO₂ + H₂O')],'B','8','medium','Cellular respiration: glucose + oxygen → CO₂ + water + ATP.',49],
    ['BIO1-D-B020','What is the function of the ribosome?',[mc('A','To produce ATP'),mc('B','To synthesise proteins'),mc('C','To store DNA'),mc('D','To produce lipids')],'B','9','easy','Ribosomes synthesise proteins by translating mRNA.',50],
    ['BIO1-D-B021','What is transcription in molecular biology?',[mc('A','DNA replication'),mc('B','The process of copying DNA into mRNA'),mc('C','The process of making proteins from mRNA'),mc('D','Cell division')],'B','9','medium','Transcription copies DNA into mRNA in the nucleus.',51],
    ['BIO1-D-B022','What is the binomial nomenclature system?',[mc('A','A system for classifying organisms by habitat'),mc('B','A two-part naming system using genus and species'),mc('C','A system for naming elements'),mc('D','A classification by size')],'B','10','easy','Binomial nomenclature uses genus + species names, e.g., Homo sapiens.',52],
    ['BIO1-D-B023','What are the six kingdoms of life?',[mc('A','Animalia, Plantae, Fungi, Protista, Archaea, Bacteria'),mc('B','Animalia, Plantae, Fungi, Virus, Archaea, Bacteria'),mc('C','Animalia, Plantae, Fungi, Protista, Monera, Algae'),mc('D','Animalia, Plantae, Fungi, Protista, Archaea, Algae')],'A','10','medium','The six kingdoms are Animalia, Plantae, Fungi, Protista, Archaea, and Bacteria.',53],
    ['BIO1-D-B024','What is the difference between a prokaryote and a eukaryote?',[mc('A','Prokaryotes have a nucleus; eukaryotes do not'),mc('B','Eukaryotes have a membrane-bound nucleus; prokaryotes do not'),mc('C','They are the same'),mc('D','Prokaryotes are larger')],'B','11','medium','Eukaryotes have a membrane-bound nucleus; prokaryotes lack one.',54],
    ['BIO1-D-B025','What is a virus?',[mc('A','A living cell'),mc('B','A non-living particle that requires a host cell to reproduce'),mc('C','A type of bacterium'),mc('D','A type of fungus')],'B','11','medium','Viruses are non-living particles that replicate inside host cells.',55],
    ['BIO1-D-B026','What is the greenhouse effect?',[mc('A','Growing plants in a greenhouse'),mc('B','The trapping of heat in Earth\'s atmosphere by greenhouse gases'),mc('C','The cooling of Earth\'s surface'),mc('D','The ozone layer')],'B','12','easy','The greenhouse effect traps heat in Earth\'s atmosphere.',56],
    ['BIO1-D-B027','What is biodiversity?',[mc('A','The number of individuals in a species'),mc('B','The variety of life forms in an ecosystem'),mc('C','The study of plants'),mc('D','A type of adaptation')],'B','12','easy','Biodiversity refers to the variety of life forms in an ecosystem.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('BIO1 Bank B done');
}

// ─── AP CHEMISTRY (APCHEM) ────────────────────────────────────────────────────
async function apChemBankB() {
  const id = await getCourseId('APCHEM'); if (!id) return;
  const qs = [
    ['APCHEM-D-B001','What is Avogadro\'s number?',[mc('A','6.022 × 10²³'),mc('B','6.022 × 10²²'),mc('C','3.14 × 10²³'),mc('D','1.602 × 10⁻¹⁹')],'A','1','easy','Avogadro\'s number is 6.022 × 10²³ particles per mole.',31],
    ['APCHEM-D-B002','What is the molar mass of H₂O?',[mc('A','16 g/mol'),mc('B','18 g/mol'),mc('C','20 g/mol'),mc('D','32 g/mol')],'B','1','easy','H₂O: 2(1) + 16 = 18 g/mol.',32],
    ['APCHEM-D-B003','What is the electron configuration of carbon (Z=6)?',[mc('A','1s²2s²2p²'),mc('B','1s²2s²2p⁴'),mc('C','1s²2p⁴'),mc('D','1s²2s⁴')],'A','2','medium','Carbon: 1s²2s²2p².',33],
    ['APCHEM-D-B004','What is electronegativity?',[mc('A','The energy to remove an electron'),mc('B','The ability of an atom to attract electrons in a bond'),mc('C','The charge of an ion'),mc('D','The number of protons')],'B','2','easy','Electronegativity measures an atom\'s ability to attract bonding electrons.',34],
    ['APCHEM-D-B005','What type of bond forms between Na and Cl?',[mc('A','Covalent'),mc('B','Metallic'),mc('C','Ionic'),mc('D','Hydrogen')],'C','3','easy','Na transfers an electron to Cl, forming an ionic bond.',35],
    ['APCHEM-D-B006','What is the shape of a water molecule?',[mc('A','Linear'),mc('B','Tetrahedral'),mc('C','Bent/V-shaped'),mc('D','Trigonal planar')],'C','3','medium','Water has 2 bonding pairs and 2 lone pairs, giving a bent shape.',36],
    ['APCHEM-D-B007','What is the ideal gas law?',[mc('A','PV = nRT'),mc('B','PV = RT'),mc('C','P = nRT/V²'),mc('D','PV² = nRT')],'A','4','easy','The ideal gas law is PV = nRT.',37],
    ['APCHEM-D-B008','At STP, what is the volume of 1 mole of an ideal gas?',[mc('A','11.2 L'),mc('B','22.4 L'),mc('C','44.8 L'),mc('D','1 L')],'B','4','easy','At STP, 1 mole of ideal gas occupies 22.4 L.',38],
    ['APCHEM-D-B009','What does a negative ΔH indicate?',[mc('A','Endothermic reaction'),mc('B','Exothermic reaction'),mc('C','No heat change'),mc('D','Equilibrium')],'B','5','easy','Negative ΔH means heat is released — exothermic.',39],
    ['APCHEM-D-B010','What is Hess\'s Law?',[mc('A','The total enthalpy change is independent of the pathway'),mc('B','Entropy always increases'),mc('C','Energy is conserved in reactions'),mc('D','Equilibrium constant depends on temperature')],'A','5','medium','Hess\'s Law: total ΔH is the same regardless of the reaction pathway.',40],
    ['APCHEM-D-B011','What is Le Chatelier\'s Principle?',[mc('A','A system at equilibrium will shift to counteract a stress'),mc('B','Entropy always increases'),mc('C','The rate of reaction doubles with every 10°C increase'),mc('D','Acids donate protons')],'A','6','medium','Le Chatelier\'s Principle: a system shifts to oppose applied stress.',41],
    ['APCHEM-D-B012','What is Kc?',[mc('A','The rate constant'),mc('B','The equilibrium constant in terms of molar concentrations'),mc('C','The acid dissociation constant'),mc('D','The solubility product')],'B','6','medium','Kc is the equilibrium constant expressed in terms of molar concentrations.',42],
    ['APCHEM-D-B013','What is the pH of a solution with [H⁺] = 1 × 10⁻⁴ M?',[mc('A','4'),mc('B','−4'),mc('C','10'),mc('D','0.0001')],'A','7','easy','pH = −log[H⁺] = −log(10⁻⁴) = 4.',43],
    ['APCHEM-D-B014','What is a buffer solution?',[mc('A','A solution that resists changes in pH'),mc('B','A solution with pH = 7'),mc('C','A strong acid solution'),mc('D','A saturated solution')],'A','7','medium','A buffer resists pH changes when small amounts of acid or base are added.',44],
    ['APCHEM-D-B015','What is oxidation?',[mc('A','Gain of electrons'),mc('B','Loss of electrons'),mc('C','Gain of protons'),mc('D','Loss of protons')],'B','8','easy','Oxidation is the loss of electrons (OIL: Oxidation Is Loss).',45],
    ['APCHEM-D-B016','What is a galvanic cell?',[mc('A','An electrolytic cell'),mc('B','A cell that converts chemical energy to electrical energy spontaneously'),mc('C','A cell that requires electrical energy'),mc('D','A fuel cell')],'B','8','medium','A galvanic (voltaic) cell spontaneously converts chemical energy to electrical energy.',46],
    ['APCHEM-D-B017','What is the rate law for a first-order reaction?',[mc('A','rate = k[A]²'),mc('B','rate = k'),mc('C','rate = k[A]'),mc('D','rate = k[A][B]')],'C','9','medium','First-order rate law: rate = k[A].',47],
    ['APCHEM-D-B018','What is activation energy?',[mc('A','The energy released in a reaction'),mc('B','The minimum energy needed to start a reaction'),mc('C','The enthalpy of the products'),mc('D','The equilibrium constant')],'B','9','easy','Activation energy is the minimum energy required to initiate a reaction.',48],
    ['APCHEM-D-B019','What is a polymer?',[mc('A','A small molecule'),mc('B','A large molecule made of repeating monomer units'),mc('C','A type of ion'),mc('D','A type of acid')],'B','10','easy','Polymers are large molecules made of repeating monomer units.',49],
    ['APCHEM-D-B020','What is a functional group?',[mc('A','A type of polymer'),mc('B','A specific group of atoms that determines the properties of an organic compound'),mc('C','A type of bond'),mc('D','A type of isomer')],'B','10','medium','Functional groups determine the chemical properties of organic compounds.',50],
    ['APCHEM-D-B021','What is nuclear fission?',[mc('A','Combining light nuclei to form a heavier nucleus'),mc('B','Splitting a heavy nucleus into smaller nuclei, releasing energy'),mc('C','Radioactive decay'),mc('D','Electron capture')],'B','11','medium','Nuclear fission splits a heavy nucleus, releasing large amounts of energy.',51],
    ['APCHEM-D-B022','What is radioactive decay?',[mc('A','The splitting of a nucleus'),mc('B','The spontaneous emission of radiation from an unstable nucleus'),mc('C','Nuclear fusion'),mc('D','Electron transfer')],'B','11','easy','Radioactive decay is the spontaneous emission of radiation from unstable nuclei.',52],
    ['APCHEM-D-B023','What does spectroscopy measure?',[mc('A','Mass of molecules'),mc('B','Interaction of matter with electromagnetic radiation'),mc('C','pH of solutions'),mc('D','Reaction rates')],'B','12','medium','Spectroscopy studies how matter interacts with electromagnetic radiation.',53],
    ['APCHEM-D-B024','What is Beer-Lambert Law?',[mc('A','A = εlc (absorbance = molar absorptivity × path length × concentration)'),mc('B','PV = nRT'),mc('C','ΔG = ΔH − TΔS'),mc('D','rate = k[A]')],'A','12','hard','Beer-Lambert Law: A = εlc relates absorbance to concentration.',54],
    ['APCHEM-D-B025','What is entropy?',[mc('A','The heat content of a system'),mc('B','A measure of disorder or randomness in a system'),mc('C','The energy available to do work'),mc('D','The activation energy')],'B','5','medium','Entropy (S) measures the disorder or randomness of a system.',55],
    ['APCHEM-D-B026','What is Gibbs free energy?',[mc('A','ΔG = ΔH − TΔS'),mc('B','ΔG = ΔH + TΔS'),mc('C','ΔG = ΔS − TΔH'),mc('D','ΔG = TΔS − ΔH')],'A','5','hard','Gibbs free energy: ΔG = ΔH − TΔS. Negative ΔG = spontaneous.',56],
    ['APCHEM-D-B027','What is a colligative property?',[mc('A','A property that depends on the identity of the solute'),mc('B','A property that depends only on the number of solute particles, not their identity'),mc('C','A property of pure solvents'),mc('D','A property of gases')],'B','4','medium','Colligative properties depend on the number of solute particles, not their identity.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('APCHEM Bank B done');
}

// ─── AP STATISTICS (APSTAT) ───────────────────────────────────────────────────
async function apStatBankB() {
  const id = await getCourseId('APSTAT'); if (!id) return;
  const qs = [
    ['APSTAT-D-B001','What is a population in statistics?',[mc('A','A sample of data'),mc('B','The entire group being studied'),mc('C','A type of graph'),mc('D','A statistical test')],'B','1','easy','A population is the entire group being studied.',31],
    ['APSTAT-D-B002','What is a sample?',[mc('A','The entire population'),mc('B','A subset of the population'),mc('C','A type of bias'),mc('D','A statistical parameter')],'B','1','easy','A sample is a subset selected from the population.',32],
    ['APSTAT-D-B003','What is the standard deviation?',[mc('A','The average of the data'),mc('B','The middle value of the data'),mc('C','A measure of how spread out data values are from the mean'),mc('D','The most frequent value')],'C','2','medium','Standard deviation measures the spread of data around the mean.',33],
    ['APSTAT-D-B004','What is a z-score?',[mc('A','The mean of a distribution'),mc('B','The number of standard deviations a value is from the mean'),mc('C','The median'),mc('D','The range')],'B','2','medium','A z-score tells how many standard deviations a value is from the mean.',34],
    ['APSTAT-D-B005','What is the empirical rule (68-95-99.7 rule)?',[mc('A','68% of data falls within 1 SD, 95% within 2 SD, 99.7% within 3 SD'),mc('B','68% of data is above the mean'),mc('C','95% of data is below the median'),mc('D','99.7% of data is within 1 SD')],'A','3','medium','The empirical rule: 68/95/99.7% of data within 1/2/3 standard deviations.',35],
    ['APSTAT-D-B006','What is a binomial distribution?',[mc('A','A distribution with two peaks'),mc('B','The distribution of the number of successes in n independent trials with probability p'),mc('C','A continuous distribution'),mc('D','A distribution with no variance')],'B','3','medium','Binomial distribution models successes in n independent trials.',36],
    ['APSTAT-D-B007','What is a confidence interval?',[mc('A','A single estimate of a parameter'),mc('B','A range of values likely to contain the true population parameter'),mc('C','A type of hypothesis test'),mc('D','The p-value')],'B','4','medium','A confidence interval gives a range likely to contain the true parameter.',37],
    ['APSTAT-D-B008','What does a 95% confidence interval mean?',[mc('A','95% of data falls in the interval'),mc('B','We are 95% confident the interval contains the true parameter'),mc('C','The parameter is 95% likely to be the sample mean'),mc('D','5% of samples will be wrong')],'B','4','medium','95% CI means 95% of such intervals would contain the true parameter.',38],
    ['APSTAT-D-B009','What is the null hypothesis?',[mc('A','The hypothesis that there is a significant effect'),mc('B','The hypothesis of no effect or no difference'),mc('C','The alternative hypothesis'),mc('D','The p-value')],'B','5','easy','The null hypothesis (H₀) states there is no effect or difference.',39],
    ['APSTAT-D-B010','What is a p-value?',[mc('A','The probability of the null hypothesis being true'),mc('B','The probability of observing results as extreme as the data, assuming H₀ is true'),mc('C','The significance level'),mc('D','The confidence level')],'B','5','hard','The p-value is the probability of results as extreme as observed, given H₀.',40],
    ['APSTAT-D-B011','What is a Type I error?',[mc('A','Failing to reject a false null hypothesis'),mc('B','Rejecting a true null hypothesis'),mc('C','Accepting the alternative hypothesis when it is false'),mc('D','A calculation error')],'B','6','medium','Type I error: rejecting H₀ when it is actually true (false positive).',41],
    ['APSTAT-D-B012','What is a Type II error?',[mc('A','Rejecting a true null hypothesis'),mc('B','Failing to reject a false null hypothesis'),mc('C','A sampling error'),mc('D','A calculation error')],'B','6','medium','Type II error: failing to reject H₀ when it is actually false (false negative).',42],
    ['APSTAT-D-B013','What is a chi-square test used for?',[mc('A','Comparing means'),mc('B','Testing relationships between categorical variables'),mc('C','Comparing standard deviations'),mc('D','Testing normality')],'B','7','medium','Chi-square tests examine relationships between categorical variables.',43],
    ['APSTAT-D-B014','What is a t-test?',[mc('A','A test for categorical data'),mc('B','A test comparing means when the population standard deviation is unknown'),mc('C','A test for variance'),mc('D','A non-parametric test')],'B','7','medium','A t-test compares means when the population SD is unknown.',44],
    ['APSTAT-D-B015','What is correlation?',[mc('A','A measure of the strength and direction of the linear relationship between two variables'),mc('B','A cause-and-effect relationship'),mc('C','The slope of a regression line'),mc('D','The y-intercept')],'A','8','easy','Correlation measures the strength and direction of a linear relationship.',45],
    ['APSTAT-D-B016','What does r = −1 indicate?',[mc('A','No correlation'),mc('B','Perfect positive linear correlation'),mc('C','Perfect negative linear correlation'),mc('D','Moderate positive correlation')],'C','8','easy','r = −1 indicates a perfect negative linear correlation.',46],
    ['APSTAT-D-B017','What is the least-squares regression line?',[mc('A','The line that maximises the sum of squared residuals'),mc('B','The line that minimises the sum of squared residuals'),mc('C','The line through the mean'),mc('D','The median fit line')],'B','9','medium','The least-squares line minimises the sum of squared residuals.',47],
    ['APSTAT-D-B018','What is a residual?',[mc('A','The predicted value'),mc('B','The difference between the observed and predicted value'),mc('C','The slope of the regression line'),mc('D','The y-intercept')],'B','9','easy','A residual is the observed value minus the predicted value.',48],
    ['APSTAT-D-B019','What is stratified random sampling?',[mc('A','Selecting every nth member'),mc('B','Dividing the population into subgroups and randomly sampling from each'),mc('C','Randomly selecting clusters'),mc('D','Selecting the most convenient members')],'B','10','medium','Stratified sampling divides the population into strata and samples each.',49],
    ['APSTAT-D-B020','What is a lurking variable?',[mc('A','A variable that is directly measured'),mc('B','A variable that affects the relationship between two variables but is not included in the study'),mc('C','The independent variable'),mc('D','A confounding variable that is controlled')],'B','10','medium','A lurking variable affects the relationship but is not included in the analysis.',50],
    ['APSTAT-D-B021','What is the law of large numbers?',[mc('A','As sample size increases, the sample mean approaches the population mean'),mc('B','Larger samples always have smaller standard deviations'),mc('C','All large samples are normally distributed'),mc('D','Probability increases with sample size')],'A','11','medium','The law of large numbers: larger samples give means closer to the population mean.',51],
    ['APSTAT-D-B022','What is the Central Limit Theorem?',[mc('A','All populations are normally distributed'),mc('B','The sampling distribution of the mean approaches normal as sample size increases'),mc('C','The mean equals the median in all distributions'),mc('D','Standard deviation decreases with sample size')],'B','11','hard','CLT: the sampling distribution of the mean becomes approximately normal for large n.',52],
    ['APSTAT-D-B023','What is a two-sample t-test?',[mc('A','A test comparing a sample mean to a known population mean'),mc('B','A test comparing the means of two independent groups'),mc('C','A test for paired data'),mc('D','A chi-square test')],'B','12','medium','A two-sample t-test compares the means of two independent groups.',53],
    ['APSTAT-D-B024','What is ANOVA?',[mc('A','Analysis of Variance — comparing means of three or more groups'),mc('B','A type of regression'),mc('C','A chi-square test'),mc('D','A correlation test')],'A','12','medium','ANOVA (Analysis of Variance) compares means across three or more groups.',54],
    ['APSTAT-D-B025','What is a histogram?',[mc('A','A bar chart for categorical data'),mc('B','A graph showing the distribution of continuous data using bars'),mc('C','A scatter plot'),mc('D','A line graph')],'B','2','easy','A histogram shows the distribution of continuous data.',55],
    ['APSTAT-D-B026','What is a boxplot?',[mc('A','A graph showing the five-number summary'),mc('B','A bar chart'),mc('C','A scatter plot'),mc('D','A histogram')],'A','2','easy','A boxplot displays the five-number summary: min, Q1, median, Q3, max.',56],
    ['APSTAT-D-B027','What is the interquartile range (IQR)?',[mc('A','The range of all data'),mc('B','Q3 − Q1'),mc('C','The standard deviation'),mc('D','The mean minus the median')],'B','2','easy','IQR = Q3 − Q1, measuring the spread of the middle 50% of data.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('APSTAT Bank B done');
}

// ─── AP CALCULUS BC (APCALCBC) ────────────────────────────────────────────────
async function apCalcBankB() {
  const id = await getCourseId('APCALCBC'); if (!id) return;
  const qs = [
    ['APCALC-D-B001','What is the derivative of x³?',[mc('A','x²'),mc('B','3x²'),mc('C','3x'),mc('D','x⁴/4')],'B','1','easy','Power rule: d/dx(xⁿ) = nxⁿ⁻¹; d/dx(x³) = 3x².',31],
    ['APCALC-D-B002','What is the derivative of sin(x)?',[mc('A','−cos(x)'),mc('B','cos(x)'),mc('C','−sin(x)'),mc('D','tan(x)')],'B','1','easy','d/dx(sin x) = cos x.',32],
    ['APCALC-D-B003','What is the limit of (sin x)/x as x → 0?',[mc('A','0'),mc('B','∞'),mc('C','1'),mc('D','Undefined')],'C','2','medium','lim(x→0) sin(x)/x = 1 (standard limit).',33],
    ['APCALC-D-B004','What does L\'Hôpital\'s Rule apply to?',[mc('A','All limits'),mc('B','Indeterminate forms like 0/0 or ∞/∞'),mc('C','Only polynomial limits'),mc('D','Limits at infinity')],'B','2','medium','L\'Hôpital\'s Rule applies to indeterminate forms 0/0 or ∞/∞.',34],
    ['APCALC-D-B005','What is the chain rule?',[mc('A','d/dx[f(g(x))] = f\'(g(x)) · g\'(x)'),mc('B','d/dx[f(x)g(x)] = f\'(x)g(x) + f(x)g\'(x)'),mc('C','d/dx[f(x)/g(x)] = [f\'g − fg\']/g²'),mc('D','d/dx[f(x) + g(x)] = f\'(x) + g\'(x)')],'A','3','medium','Chain rule: d/dx[f(g(x))] = f\'(g(x)) · g\'(x).',35],
    ['APCALC-D-B006','What is the product rule?',[mc('A','d/dx[f(g(x))] = f\'(g(x)) · g\'(x)'),mc('B','d/dx[f(x)g(x)] = f\'(x)g(x) + f(x)g\'(x)'),mc('C','d/dx[f/g] = [f\'g − fg\']/g²'),mc('D','d/dx[f + g] = f\' + g\'')],'B','3','medium','Product rule: d/dx[fg] = f\'g + fg\'.',36],
    ['APCALC-D-B007','What is ∫x² dx?',[mc('A','2x'),mc('B','x³'),mc('C','x³/3 + C'),mc('D','3x²')],'C','4','easy','∫xⁿ dx = xⁿ⁺¹/(n+1) + C; ∫x² dx = x³/3 + C.',37],
    ['APCALC-D-B008','What is ∫cos(x) dx?',[mc('A','sin(x) + C'),mc('B','−sin(x) + C'),mc('C','−cos(x) + C'),mc('D','tan(x) + C')],'A','4','easy','∫cos(x) dx = sin(x) + C.',38],
    ['APCALC-D-B009','What does the Fundamental Theorem of Calculus state?',[mc('A','Differentiation and integration are inverse operations'),mc('B','All continuous functions are integrable'),mc('C','The derivative of a constant is zero'),mc('D','Integration gives the slope of a curve')],'A','5','medium','FTC: differentiation and integration are inverse operations.',39],
    ['APCALC-D-B010','What is the area under a curve from a to b?',[mc('A','f(b) − f(a)'),mc('B','F(b) − F(a) where F is the antiderivative'),mc('C','f\'(b) − f\'(a)'),mc('D','The limit of f(x) as x → a')],'B','5','medium','Area = ∫ₐᵇ f(x) dx = F(b) − F(a).',40],
    ['APCALC-D-B011','What is a Taylor series?',[mc('A','A finite polynomial approximation'),mc('B','An infinite series representation of a function'),mc('C','A type of integral'),mc('D','A limit definition')],'B','6','medium','A Taylor series represents a function as an infinite sum of terms.',41],
    ['APCALC-D-B012','What is the Maclaurin series for eˣ?',[mc('A','1 + x + x²/2! + x³/3! + ...'),mc('B','1 − x + x²/2! − x³/3! + ...'),mc('C','x − x³/3! + x⁵/5! − ...'),mc('D','1 + x²/2! + x⁴/4! + ...')],'A','6','hard','Maclaurin series for eˣ = Σ xⁿ/n! = 1 + x + x²/2! + ...',42],
    ['APCALC-D-B013','What is a parametric equation?',[mc('A','An equation relating x and y directly'),mc('B','Equations expressing x and y as functions of a third variable t'),mc('C','A polar equation'),mc('D','A vector equation')],'B','7','medium','Parametric equations express x and y as functions of parameter t.',43],
    ['APCALC-D-B014','In polar coordinates, what does r represent?',[mc('A','The angle from the positive x-axis'),mc('B','The distance from the origin'),mc('C','The x-coordinate'),mc('D','The y-coordinate')],'B','7','easy','In polar coordinates, r is the distance from the origin.',44],
    ['APCALC-D-B015','What is a differential equation?',[mc('A','An equation involving a function and its derivatives'),mc('B','An equation with two variables'),mc('C','A type of integral'),mc('D','A linear equation')],'A','8','easy','A differential equation involves a function and one or more of its derivatives.',45],
    ['APCALC-D-B016','What is Euler\'s method?',[mc('A','An exact method for solving differential equations'),mc('B','A numerical approximation method for differential equations'),mc('C','A method for finding derivatives'),mc('D','A method for integration')],'B','8','medium','Euler\'s method is a numerical technique for approximating solutions to DEs.',46],
    ['APCALC-D-B017','What is a convergent series?',[mc('A','A series whose partial sums grow without bound'),mc('B','A series whose partial sums approach a finite limit'),mc('C','A series with alternating signs'),mc('D','A geometric series')],'B','9','medium','A convergent series has partial sums that approach a finite limit.',47],
    ['APCALC-D-B018','What is the ratio test used for?',[mc('A','Finding the derivative'),mc('B','Determining convergence or divergence of a series'),mc('C','Integration by parts'),mc('D','Finding limits')],'B','9','medium','The ratio test determines whether a series converges or diverges.',48],
    ['APCALC-D-B019','What is integration by parts?',[mc('A','∫u dv = uv − ∫v du'),mc('B','∫f(g(x))g\'(x) dx'),mc('C','∫f(x)/g(x) dx'),mc('D','∫f(x) + g(x) dx')],'A','10','medium','Integration by parts: ∫u dv = uv − ∫v du.',49],
    ['APCALC-D-B020','What is a partial fraction decomposition used for?',[mc('A','Integrating rational functions'),mc('B','Differentiating composite functions'),mc('C','Finding limits'),mc('D','Solving differential equations')],'A','10','medium','Partial fractions decompose rational functions to simplify integration.',50],
    ['APCALC-D-B021','What is the volume of a solid of revolution using the disk method?',[mc('A','V = π∫[f(x)]² dx'),mc('B','V = 2π∫x·f(x) dx'),mc('C','V = ∫f(x) dx'),mc('D','V = π∫f(x) dx')],'A','11','medium','Disk method: V = π∫[f(x)]² dx.',51],
    ['APCALC-D-B022','What is the shell method for volume?',[mc('A','V = π∫[f(x)]² dx'),mc('B','V = 2π∫x·f(x) dx'),mc('C','V = ∫f(x) dx'),mc('D','V = π∫[f(x) − g(x)]² dx')],'B','11','medium','Shell method: V = 2π∫x·f(x) dx.',52],
    ['APCALC-D-B023','What is arc length?',[mc('A','∫√(1 + [f\'(x)]²) dx'),mc('B','∫f(x) dx'),mc('C','∫[f(x)]² dx'),mc('D','∫f\'(x) dx')],'A','12','hard','Arc length = ∫√(1 + [f\'(x)]²) dx.',53],
    ['APCALC-D-B024','What does it mean for a function to be continuous at a point?',[mc('A','The function is differentiable there'),mc('B','The limit exists, equals the function value, and the function is defined there'),mc('C','The function has no maximum'),mc('D','The derivative is zero')],'B','2','medium','Continuity at x=a: limit exists, f(a) defined, and limit = f(a).',54],
    ['APCALC-D-B025','What is the Mean Value Theorem?',[mc('A','If f is continuous on [a,b] and differentiable on (a,b), then there exists c where f\'(c) = [f(b)−f(a)]/(b−a)'),mc('B','The average value of f equals the integral'),mc('C','A function has a maximum and minimum on a closed interval'),mc('D','The derivative of a constant is zero')],'A','3','hard','MVT: there exists c in (a,b) where f\'(c) equals the average rate of change.',55],
    ['APCALC-D-B026','What is an inflection point?',[mc('A','A point where the function has a maximum'),mc('B','A point where the concavity of the function changes'),mc('C','A point where the derivative is zero'),mc('D','A point where the function is undefined')],'B','3','medium','An inflection point is where the concavity changes (f\'\'(x) changes sign).',56],
    ['APCALC-D-B027','What is the second derivative test?',[mc('A','If f\'(c)=0 and f\'\'(c)>0, then c is a local minimum'),mc('B','If f\'(c)=0 and f\'\'(c)>0, then c is a local maximum'),mc('C','If f\'\'(c)=0, then c is an inflection point'),mc('D','The second derivative gives the slope')],'A','3','medium','Second derivative test: f\'(c)=0 and f\'\'(c)>0 → local minimum.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('APCALCBC Bank B done');
}

// ─── AP LITERATURE (APLIT) ────────────────────────────────────────────────────
async function apLitBankB() {
  const id = await getCourseId('APLIT'); if (!id) return;
  // Copy from ENG1 Bank B with code substitution
  await copyBankB('ENG1', 'APLIT');
  console.log('APLIT Bank B done (copied from ENG1)');
}

// ─── AP HUMAN GEOGRAPHY (APHG) ────────────────────────────────────────────────
async function apHGBankB() {
  const id = await getCourseId('APHG'); if (!id) return;
  await copyBankB('G4SS', 'APHG');
  console.log('APHG Bank B done (copied from G4SS)');
}

// ─── SPANISH 2 (SPA2) ─────────────────────────────────────────────────────────
async function spa2BankB() {
  const id = await getCourseId('SPA2'); if (!id) return;
  const qs = [
    ['SPA2-D-B001','What is the preterite tense used for?',[mc('A','Ongoing past actions'),mc('B','Completed past actions'),mc('C','Future actions'),mc('D','Habitual past actions')],'B','prerequisite','easy','The preterite expresses completed past actions.',31],
    ['SPA2-D-B002','What is the imperfect tense used for?',[mc('A','Completed past actions'),mc('B','Ongoing, habitual, or descriptive past actions'),mc('C','Future actions'),mc('D','Present actions')],'B','prerequisite','easy','The imperfect describes ongoing, habitual, or descriptive past situations.',32],
    ['SPA2-D-B003','What does "hablar" mean?',[mc('A','To eat'),mc('B','To speak'),mc('C','To run'),mc('D','To write')],'B','prerequisite','easy','"Hablar" means "to speak."',33],
    ['SPA2-D-B004','Which is the correct preterite form of "hablar" for "yo"?',[mc('A','hablé'),mc('B','hablaba'),mc('C','hablaré'),mc('D','hablaría')],'A','1','easy','Preterite yo form of hablar = hablé.',34],
    ['SPA2-D-B005','Which is the correct imperfect form of "comer" for "él"?',[mc('A','comió'),mc('B','comía'),mc('C','comerá'),mc('D','comería')],'B','1','easy','Imperfect él form of comer = comía.',35],
    ['SPA2-D-B006','What is the subjunctive mood used for?',[mc('A','Stating facts'),mc('B','Expressing doubt, wishes, emotions, or hypothetical situations'),mc('C','Giving commands'),mc('D','Describing past events')],'B','2','medium','The subjunctive expresses doubt, wishes, emotions, and hypotheticals.',36],
    ['SPA2-D-B007','Which sentence uses the subjunctive correctly?',[mc('A','Espero que ella viene.'),mc('B','Espero que ella venga.'),mc('C','Espero que ella vendrá.'),mc('D','Espero que ella vino.')],'B','2','medium','After "espero que" (I hope that), use the subjunctive: venga.',37],
    ['SPA2-D-B008','What is a reflexive verb?',[mc('A','A verb that describes an action done to someone else'),mc('B','A verb where the subject performs the action on itself'),mc('C','A verb in the passive voice'),mc('D','An irregular verb')],'B','3','easy','Reflexive verbs describe actions the subject performs on itself.',38],
    ['SPA2-D-B009','How do you say "I wake up" in Spanish?',[mc('A','Despierto'),mc('B','Me despierto'),mc('C','Te despiertas'),mc('D','Se despierta')],'B','3','easy','"Me despierto" uses the reflexive pronoun "me" with despertar.',39],
    ['SPA2-D-B010','What is the future tense ending for "yo" with regular verbs?',[mc('A','-é'),mc('B','-ás'),mc('C','-á'),mc('D','-emos')],'A','4','easy','Future tense yo ending = -é (hablaré, comeré, viviré).',40],
    ['SPA2-D-B011','What is the conditional tense used for?',[mc('A','Completed past actions'),mc('B','Hypothetical or polite situations ("would")'),mc('C','Commands'),mc('D','Ongoing present actions')],'B','4','easy','The conditional expresses hypothetical situations or polite requests ("would").',41],
    ['SPA2-D-B012','What is a direct object pronoun?',[mc('A','A pronoun that replaces the subject'),mc('B','A pronoun that replaces the direct object'),mc('C','A reflexive pronoun'),mc('D','An indirect object pronoun')],'B','5','medium','Direct object pronouns replace the direct object (me, te, lo/la, nos, os, los/las).',42],
    ['SPA2-D-B013','Where do direct object pronouns go in a sentence?',[mc('A','After the verb'),mc('B','Before the conjugated verb or attached to the infinitive'),mc('C','At the end of the sentence'),mc('D','Before the subject')],'B','5','medium','DOPs go before the conjugated verb or attached to infinitives/gerunds.',43],
    ['SPA2-D-B014','What is the passive voice in Spanish?',[mc('A','ser + past participle'),mc('B','estar + present participle'),mc('C','tener + infinitive'),mc('D','haber + past participle')],'A','6','medium','Passive voice = ser + past participle (e.g., El libro fue escrito).',44],
    ['SPA2-D-B015','What is the difference between "ser" and "estar"?',[mc('A','Both mean "to be" with no difference'),mc('B','Ser for permanent characteristics; estar for temporary states and location'),mc('C','Ser for location; estar for characteristics'),mc('D','They are interchangeable')],'B','6','medium','Ser = permanent traits; estar = temporary states and location.',45],
    ['SPA2-D-B016','What is a relative clause?',[mc('A','A type of verb tense'),mc('B','A clause that modifies a noun, introduced by "que," "quien," etc.'),mc('C','A conditional sentence'),mc('D','A reflexive construction')],'B','7','medium','Relative clauses modify nouns and are introduced by que, quien, etc.',46],
    ['SPA2-D-B017','What does "cuyo/cuya" mean?',[mc('A','Who'),mc('B','Which'),mc('C','Whose'),mc('D','Where')],'C','7','medium','"Cuyo/cuya" means "whose" and agrees with the noun it modifies.',47],
    ['SPA2-D-B018','What is the present perfect tense?',[mc('A','haber (present) + past participle'),mc('B','ser + past participle'),mc('C','estar + present participle'),mc('D','tener + infinitive')],'A','8','medium','Present perfect = haber (present) + past participle (he hablado).',48],
    ['SPA2-D-B019','What is the past participle of "escribir"?',[mc('A','escribiendo'),mc('B','escrito'),mc('C','escribió'),mc('D','escribirá')],'B','8','easy','The past participle of escribir is escrito (irregular).',49],
    ['SPA2-D-B020','What is a cognate?',[mc('A','A false friend'),mc('B','A word that looks and means the same in two languages'),mc('C','A borrowed word'),mc('D','A slang term')],'B','9','easy','Cognates are words that look similar and share meaning across languages.',50],
    ['SPA2-D-B021','What is a "false cognate" (false friend)?',[mc('A','A word that looks similar but has a different meaning in another language'),mc('B','A word borrowed from another language'),mc('C','A synonym'),mc('D','A cognate')],'A','9','medium','False cognates look similar but have different meanings, e.g., "embarazada" ≠ "embarrassed."',51],
    ['SPA2-D-B022','What is the formal command (usted) for "hablar"?',[mc('A','habla'),mc('B','hable'),mc('C','hablen'),mc('D','hablad')],'B','10','medium','Formal command (usted) of hablar = hable.',52],
    ['SPA2-D-B023','What is the negative tú command for "comer"?',[mc('A','no come'),mc('B','no comes'),mc('C','no comas'),mc('D','no comerás')],'C','10','medium','Negative tú command uses subjunctive: no comas.',53],
    ['SPA2-D-B024','What is the pluperfect tense?',[mc('A','haber (imperfect) + past participle'),mc('B','haber (present) + past participle'),mc('C','ser + past participle'),mc('D','estar + past participle')],'A','11','hard','Pluperfect = haber (imperfect: había) + past participle (había hablado).',54],
    ['SPA2-D-B025','What does "aunque" mean?',[mc('A','Because'),mc('B','Although/even though'),mc('C','Therefore'),mc('D','However')],'B','11','easy','"Aunque" means "although" or "even though."',55],
    ['SPA2-D-B026','What is the difference between "por" and "para"?',[mc('A','Both mean "for" with no difference'),mc('B','Por = cause/exchange/duration; para = purpose/destination/deadline'),mc('C','Para = cause; por = purpose'),mc('D','They are interchangeable')],'B','12','hard','Por expresses cause, exchange, and duration; para expresses purpose, destination, and deadlines.',56],
    ['SPA2-D-B027','What is the present progressive tense?',[mc('A','estar + past participle'),mc('B','estar + present participle (-ando/-iendo)'),mc('C','ser + infinitive'),mc('D','haber + past participle')],'B','12','easy','Present progressive = estar + gerund (estoy hablando = I am speaking).',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('SPA2 Bank B done');
}

// ─── AP BUSINESS (APBIZ) ──────────────────────────────────────────────────────
async function apBizBankB() {
  const id = await getCourseId('APBIZ'); if (!id) return;
  await copyBankB('G4SS', 'APBIZ');
  console.log('APBIZ Bank B done (copied from G4SS)');
}

// ─── SAT PREP (SATPREP) ───────────────────────────────────────────────────────
async function satPrepBankB() {
  const id = await getCourseId('SATPREP'); if (!id) return;
  const qs = [
    ['SATPREP-D-B001','What is the SAT Reading section testing?',[mc('A','Grammar and punctuation'),mc('B','Comprehension, analysis, and reasoning about passages'),mc('C','Mathematical reasoning'),mc('D','Essay writing')],'B','1','easy','SAT Reading tests comprehension, analysis, and reasoning about passages.',31],
    ['SATPREP-D-B002','What is a main idea question on the SAT?',[mc('A','A question about vocabulary'),mc('B','A question asking what the passage is primarily about'),mc('C','A question about grammar'),mc('D','A question about the author\'s background')],'B','1','easy','Main idea questions ask what the passage is primarily about.',32],
    ['SATPREP-D-B003','What is the SAT Writing section testing?',[mc('A','Creative writing'),mc('B','Grammar, punctuation, and effective language use'),mc('C','Mathematical reasoning'),mc('D','Reading comprehension')],'B','2','easy','SAT Writing tests grammar, punctuation, and effective language use.',33],
    ['SATPREP-D-B004','Which sentence is grammatically correct?',[mc('A','Between you and I, this is difficult.'),mc('B','Between you and me, this is difficult.'),mc('C','Between you and myself, this is difficult.'),mc('D','Between I and you, this is difficult.')],'B','2','medium','Use "me" (object pronoun) after a preposition: "between you and me."',34],
    ['SATPREP-D-B005','What is the SAT Math No Calculator section?',[mc('A','A section where calculators are allowed'),mc('B','A section testing arithmetic, algebra, and problem-solving without a calculator'),mc('C','A section on geometry only'),mc('D','A section on statistics only')],'B','3','easy','The No Calculator section tests arithmetic, algebra, and problem-solving skills.',35],
    ['SATPREP-D-B006','What is the slope-intercept form of a line?',[mc('A','ax + by = c'),mc('B','y = mx + b'),mc('C','y − y₁ = m(x − x₁)'),mc('D','y = ax² + bx + c')],'B','3','easy','Slope-intercept form: y = mx + b.',36],
    ['SATPREP-D-B007','What is the quadratic formula?',[mc('A','x = (−b ± √(b²−4ac)) / 2a'),mc('B','x = (b ± √(b²−4ac)) / 2a'),mc('C','x = (−b ± √(b²+4ac)) / 2a'),mc('D','x = (−b ± √(4ac−b²)) / 2a')],'A','4','medium','Quadratic formula: x = (−b ± √(b²−4ac)) / 2a.',37],
    ['SATPREP-D-B008','What is a system of equations?',[mc('A','A single equation with two variables'),mc('B','Two or more equations with the same variables'),mc('C','An equation with no solution'),mc('D','A quadratic equation')],'B','4','easy','A system of equations consists of two or more equations with the same variables.',38],
    ['SATPREP-D-B009','What is evidence-based reading on the SAT?',[mc('A','Answering questions based on your prior knowledge'),mc('B','Supporting answers with specific evidence from the passage'),mc('C','Writing an essay'),mc('D','Memorising vocabulary')],'B','5','easy','Evidence-based reading requires supporting answers with text evidence.',39],
    ['SATPREP-D-B010','What is an inference question?',[mc('A','A question about stated facts'),mc('B','A question asking you to draw a conclusion not directly stated'),mc('C','A vocabulary question'),mc('D','A grammar question')],'B','5','medium','Inference questions ask you to draw conclusions from implied information.',40],
    ['SATPREP-D-B011','What is the purpose of the SAT Essay (optional)?',[mc('A','To test grammar'),mc('B','To analyse how an author builds an argument'),mc('C','To write a creative story'),mc('D','To summarise a passage')],'B','6','easy','The SAT Essay asks students to analyse how an author builds an argument.',41],
    ['SATPREP-D-B012','What is a rhetorical device?',[mc('A','A grammar rule'),mc('B','A technique used to persuade or communicate effectively'),mc('C','A type of punctuation'),mc('D','A vocabulary term')],'B','6','easy','Rhetorical devices are techniques used to persuade or communicate effectively.',42],
    ['SATPREP-D-B013','What is the SAT score range?',[mc('A','200–800'),mc('B','400–1600'),mc('C','0–100'),mc('D','1–36')],'B','7','easy','The SAT is scored on a scale of 400–1600.',43],
    ['SATPREP-D-B014','What is a good SAT score?',[mc('A','Below 1000'),mc('B','1000–1200'),mc('C','1200–1400'),mc('D','1400–1600')],'D','7','easy','Scores of 1400–1600 are considered excellent and competitive for top universities.',44],
    ['SATPREP-D-B015','What is process of elimination on the SAT?',[mc('A','Guessing randomly'),mc('B','Eliminating obviously wrong answers to improve your odds'),mc('C','Skipping difficult questions'),mc('D','Answering questions in reverse order')],'B','8','easy','Process of elimination removes wrong answers to improve the probability of choosing correctly.',45],
    ['SATPREP-D-B016','What is time management on the SAT?',[mc('A','Spending equal time on all questions'),mc('B','Pacing yourself to complete all questions within the allotted time'),mc('C','Skipping all hard questions'),mc('D','Answering only easy questions')],'B','8','easy','Good time management means pacing yourself to complete all questions.',46],
    ['SATPREP-D-B017','What is the SAT Math Calculator section?',[mc('A','A section where no calculator is allowed'),mc('B','A section covering advanced math where a calculator is permitted'),mc('C','A section on reading'),mc('D','A section on writing')],'B','9','easy','The Calculator section covers advanced math and allows calculator use.',47],
    ['SATPREP-D-B018','What is a linear function?',[mc('A','A function with a curved graph'),mc('B','A function with a straight-line graph, y = mx + b'),mc('C','A quadratic function'),mc('D','An exponential function')],'B','9','easy','A linear function has a straight-line graph: y = mx + b.',48],
    ['SATPREP-D-B019','What is the Pythagorean theorem?',[mc('A','a + b = c'),mc('B','a² + b² = c²'),mc('C','a² − b² = c²'),mc('D','a × b = c²')],'B','10','easy','Pythagorean theorem: a² + b² = c² for right triangles.',49],
    ['SATPREP-D-B020','What is the area of a circle?',[mc('A','2πr'),mc('B','πr²'),mc('C','πd'),mc('D','2πr²')],'B','10','easy','Area of a circle = πr².',50],
    ['SATPREP-D-B021','What is a ratio?',[mc('A','The difference between two numbers'),mc('B','A comparison of two quantities by division'),mc('C','The sum of two numbers'),mc('D','A percentage')],'B','11','easy','A ratio compares two quantities by division.',51],
    ['SATPREP-D-B022','What is a proportion?',[mc('A','A ratio greater than 1'),mc('B','An equation stating that two ratios are equal'),mc('C','A type of percentage'),mc('D','A fraction greater than 1')],'B','11','easy','A proportion is an equation stating two ratios are equal.',52],
    ['SATPREP-D-B023','What is a function?',[mc('A','A relation where each input has exactly one output'),mc('B','Any equation with two variables'),mc('C','A type of graph'),mc('D','A linear equation')],'A','12','easy','A function maps each input to exactly one output.',53],
    ['SATPREP-D-B024','What is the domain of a function?',[mc('A','The set of all output values'),mc('B','The set of all valid input values'),mc('C','The slope of the function'),mc('D','The y-intercept')],'B','12','easy','The domain is the set of all valid input (x) values.',54],
    ['SATPREP-D-B025','What is a word problem strategy on the SAT?',[mc('A','Solve immediately without reading'),mc('B','Identify what is given, what is asked, and set up an equation'),mc('C','Guess the answer'),mc('D','Skip word problems')],'B','8','easy','For word problems: identify given info, what\'s asked, then set up an equation.',55],
    ['SATPREP-D-B026','What is the difference between mean and median?',[mc('A','Mean is the middle value; median is the average'),mc('B','Mean is the average; median is the middle value'),mc('C','They are the same'),mc('D','Mean is the most frequent value')],'B','9','easy','Mean = average; median = middle value when data is ordered.',56],
    ['SATPREP-D-B027','What is a percent increase?',[mc('A','(new − old) / old × 100'),mc('B','(old − new) / old × 100'),mc('C','new / old × 100'),mc('D','(new + old) / 2 × 100')],'A','10','medium','Percent increase = (new − old) / old × 100.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('SATPREP Bank B done');
}

// ─── AP HUMAN GEOGRAPHY (APHG) — override with proper questions ───────────────
async function apHGBankBProper() {
  const id = await getCourseId('APHG'); if (!id) return;
  // Check if already has Bank B
  const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM diagnosticQuestions WHERE courseId=? AND sortOrder>=31', [id]);
  if (existing[0].cnt >= 27) { console.log('APHG Bank B already done'); return; }
  const qs = [
    ['APHG-D-B001','What is the difference between absolute and relative location?',[mc('A','Absolute uses coordinates; relative uses landmarks'),mc('B','Relative uses coordinates; absolute uses landmarks'),mc('C','They are the same'),mc('D','Absolute is approximate; relative is exact')],'A','1','easy','Absolute location uses coordinates; relative location uses nearby features.',31],
    ['APHG-D-B002','What is a formal region?',[mc('A','A region defined by a common characteristic'),mc('B','A region defined by a central node'),mc('C','A region based on perception'),mc('D','A political region')],'A','1','easy','Formal regions share a common characteristic (e.g., language, climate).',32],
    ['APHG-D-B003','What is the demographic transition model?',[mc('A','A model of economic development'),mc('B','A model showing population change through stages of birth and death rates'),mc('C','A model of urban growth'),mc('D','A model of migration')],'B','2','medium','The DTM shows how birth and death rates change as countries develop.',33],
    ['APHG-D-B004','What is the total fertility rate?',[mc('A','The number of births per 1,000 people'),mc('B','The average number of children a woman is expected to have'),mc('C','The death rate'),mc('D','The infant mortality rate')],'B','2','easy','TFR is the average number of children a woman is expected to have.',34],
    ['APHG-D-B005','What is cultural diffusion?',[mc('A','The loss of culture'),mc('B','The spread of cultural elements from one place to another'),mc('C','Cultural isolation'),mc('D','Cultural assimilation')],'B','3','easy','Cultural diffusion is the spread of cultural elements across space.',35],
    ['APHG-D-B006','What is acculturation?',[mc('A','The adoption of another culture\'s traits while retaining one\'s own'),mc('B','Complete replacement of one culture by another'),mc('C','Cultural isolation'),mc('D','The spread of culture')],'A','3','medium','Acculturation is adopting traits from another culture while keeping one\'s own.',36],
    ['APHG-D-B007','What is the political concept of sovereignty?',[mc('A','The right of a state to govern itself without external interference'),mc('B','The ability to collect taxes'),mc('C','A type of government'),mc('D','Control of natural resources')],'A','4','easy','Sovereignty is a state\'s right to self-governance without external interference.',37],
    ['APHG-D-B008','What is a nation-state?',[mc('A','A state with multiple nations'),mc('B','A state where the political and national boundaries coincide'),mc('C','A colony'),mc('D','A federal state')],'B','4','medium','A nation-state is where political boundaries align with a single national group.',38],
    ['APHG-D-B009','What is the agricultural revolution?',[mc('A','The shift from hunting/gathering to farming'),mc('B','The Industrial Revolution'),mc('C','The Green Revolution'),mc('D','The shift from farming to industry')],'A','5','easy','The agricultural revolution was the shift from hunting/gathering to settled farming.',39],
    ['APHG-D-B010','What is the Green Revolution?',[mc('A','An environmental movement'),mc('B','The introduction of high-yield crops and modern farming techniques in developing countries'),mc('C','The shift to organic farming'),mc('D','The agricultural revolution')],'B','5','medium','The Green Revolution introduced high-yield crops and modern farming to developing countries.',40],
    ['APHG-D-B011','What is a primate city?',[mc('A','The capital city'),mc('B','A city that is disproportionately large compared to the second-largest city'),mc('C','The oldest city'),mc('D','A city with the highest GDP')],'B','6','medium','A primate city is disproportionately larger than the country\'s second-largest city.',41],
    ['APHG-D-B012','What is the rank-size rule?',[mc('A','Cities are ranked by population, with the nth city being 1/n the size of the largest'),mc('B','Cities are ranked by area'),mc('C','All cities are the same size'),mc('D','The largest city is always the capital')],'A','6','medium','Rank-size rule: the nth city is 1/n the population of the largest city.',42],
    ['APHG-D-B013','What is globalisation?',[mc('A','The spread of one country\'s culture'),mc('B','The increasing interconnection of economies, cultures, and politics worldwide'),mc('C','The isolation of countries'),mc('D','Economic growth')],'B','7','easy','Globalisation is the increasing interconnection of the world\'s economies and cultures.',43],
    ['APHG-D-B014','What is a multinational corporation?',[mc('A','A government agency'),mc('B','A company that operates in multiple countries'),mc('C','A type of trade agreement'),mc('D','A non-profit organisation')],'B','7','easy','A multinational corporation operates in multiple countries.',44],
    ['APHG-D-B015','What is a push factor in migration?',[mc('A','Something that attracts migrants to a destination'),mc('B','Something that drives migrants away from their origin'),mc('C','A migration policy'),mc('D','A type of refugee')],'B','8','easy','Push factors drive people away from their origin (e.g., war, poverty).',45],
    ['APHG-D-B016','What is a pull factor in migration?',[mc('A','Something that drives migrants away from their origin'),mc('B','Something that attracts migrants to a destination'),mc('C','A migration barrier'),mc('D','A type of refugee')],'B','8','easy','Pull factors attract migrants to a destination (e.g., jobs, safety).',46],
    ['APHG-D-B017','What is the core-periphery model?',[mc('A','A model of urban structure'),mc('B','A model showing economic disparities between developed (core) and developing (periphery) regions'),mc('C','A model of cultural diffusion'),mc('D','A model of agricultural zones')],'B','9','medium','The core-periphery model describes economic disparities between developed and developing regions.',47],
    ['APHG-D-B018','What is dependency theory?',[mc('A','The idea that developing countries are dependent on developed countries due to historical exploitation'),mc('B','A model of urban growth'),mc('C','A theory of cultural diffusion'),mc('D','A model of agricultural development')],'A','9','hard','Dependency theory argues developing countries are economically dependent on developed ones.',48],
    ['APHG-D-B019','What is a census?',[mc('A','A tax collection system'),mc('B','An official count of a population with demographic data'),mc('C','A type of map'),mc('D','A migration record')],'B','10','easy','A census is an official count of a population with demographic information.',49],
    ['APHG-D-B020','What is population density?',[mc('A','The total population of a country'),mc('B','The number of people per unit of area'),mc('C','The birth rate'),mc('D','The death rate')],'B','10','easy','Population density = number of people per unit of area.',50],
    ['APHG-D-B021','What is a centripetal force in political geography?',[mc('A','A force that divides a state'),mc('B','A force that unifies a state'),mc('C','A type of government'),mc('D','A type of border')],'B','11','medium','Centripetal forces unify a state (e.g., shared language, nationalism).',51],
    ['APHG-D-B022','What is a centrifugal force?',[mc('A','A force that unifies a state'),mc('B','A force that divides or destabilises a state'),mc('C','A type of government'),mc('D','A type of border')],'B','11','medium','Centrifugal forces divide or destabilise a state (e.g., ethnic conflict).',52],
    ['APHG-D-B023','What is the difference between weather and climate?',[mc('A','Weather is long-term; climate is short-term'),mc('B','Weather is short-term atmospheric conditions; climate is long-term patterns'),mc('C','They are the same'),mc('D','Climate is measured daily; weather is measured annually')],'B','12','easy','Weather = short-term conditions; climate = long-term patterns.',53],
    ['APHG-D-B024','What is a biome?',[mc('A','A type of political region'),mc('B','A large ecological community defined by climate and vegetation'),mc('C','A type of soil'),mc('D','A geographic feature')],'B','12','easy','A biome is a large ecological community defined by its climate and vegetation.',54],
    ['APHG-D-B025','What is urban sprawl?',[mc('A','The growth of cities upward'),mc('B','The uncontrolled expansion of urban areas into surrounding rural land'),mc('C','Urban renewal'),mc('D','Gentrification')],'B','6','medium','Urban sprawl is the uncontrolled spread of cities into surrounding rural areas.',55],
    ['APHG-D-B026','What is gentrification?',[mc('A','Urban decay'),mc('B','The process of renovating urban areas, often displacing lower-income residents'),mc('C','Urban sprawl'),mc('D','Suburbanisation')],'B','6','medium','Gentrification renovates urban areas, often displacing lower-income residents.',56],
    ['APHG-D-B027','What is the Malthusian theory?',[mc('A','Population grows faster than food supply, leading to famine'),mc('B','Technology will always outpace population growth'),mc('C','Population growth is always beneficial'),mc('D','Food supply grows faster than population')],'A','2','hard','Malthus argued population grows geometrically while food supply grows arithmetically.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('APHG Bank B (proper) done');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting Bank B expansion for Grades 6-8 and AP/SAT...');
  await expandGr68ACA();
  await expandGr68KAP();
  await alg1BankB();
  await eng1BankB();
  await bio1BankB();
  await apChemBankB();
  await apStatBankB();
  await apCalcBankB();
  await apLitBankB();
  await apHGBankBProper();
  await spa2BankB();
  await apBizBankB();
  await satPrepBankB();
  console.log('All Bank B expansions complete!');
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
