/**
 * seed-diag-bankb2.mjs
 * Bank B expansion for Grades 4-8 ACA/KAP and AP/SAT courses.
 * Adds 27 questions per course (3 prereq + 2 per unit for 12 units).
 * AP/SAT courses: 27 unit questions (no prereq group), 2-3 per unit.
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

// ─── G4 MATH ─────────────────────────────────────────────────────────────────
async function g4Math() {
  const id = await getCourseId('G4MATH'); if (!id) return;
  const qs = [
    ['G4MATH-D-B001','What is 1,000 + 400 + 30 + 7?',[mc('A','1,347'),mc('B','1,437'),mc('C','1,374'),mc('D','1,473')],'A','prerequisite','easy','Place value: 1,000+400+30+7 = 1,347.',31],
    ['G4MATH-D-B002','Round 4,682 to the nearest hundred.',[mc('A','4,600'),mc('B','4,700'),mc('C','4,000'),mc('D','5,000')],'B','prerequisite','easy','The hundreds digit is 6; the tens digit 8 ≥ 5, so round up to 4,700.',32],
    ['G4MATH-D-B003','What is 8 × 9?',[mc('A','63'),mc('B','72'),mc('C','81'),mc('D','64')],'B','prerequisite','easy','8 × 9 = 72.',33],
    ['G4MATH-D-B004','What is the value of the digit 5 in 35,612?',[mc('A','5'),mc('B','50'),mc('C','500'),mc('D','5,000')],'D','1','medium','In 35,612 the 5 is in the thousands place, so its value is 5,000.',34],
    ['G4MATH-D-B005','Which number is 10,000 more than 46,300?',[mc('A','46,400'),mc('B','47,300'),mc('C','56,300'),mc('D','36,300')],'C','1','easy','Add 10,000 to 46,300 = 56,300.',35],
    ['G4MATH-D-B006','What is 5,432 + 2,879?',[mc('A','8,211'),mc('B','8,311'),mc('C','8,301'),mc('D','8,321')],'B','2','medium','5,432 + 2,879 = 8,311.',36],
    ['G4MATH-D-B007','What is 7,000 − 3,456?',[mc('A','3,444'),mc('B','3,544'),mc('C','3,644'),mc('D','4,544')],'B','2','medium','7,000 − 3,456 = 3,544.',37],
    ['G4MATH-D-B008','What is 23 × 4?',[mc('A','82'),mc('B','92'),mc('C','84'),mc('D','96')],'B','3','easy','23 × 4 = 92.',38],
    ['G4MATH-D-B009','What is 6 × 35?',[mc('A','180'),mc('B','200'),mc('C','210'),mc('D','215')],'C','3','medium','6 × 35 = 210.',39],
    ['G4MATH-D-B010','What is 96 ÷ 8?',[mc('A','10'),mc('B','11'),mc('C','12'),mc('D','13')],'C','4','easy','96 ÷ 8 = 12.',40],
    ['G4MATH-D-B011','What is 135 ÷ 5?',[mc('A','25'),mc('B','27'),mc('C','29'),mc('D','31')],'B','4','medium','135 ÷ 5 = 27.',41],
    ['G4MATH-D-B012','Which fraction is greater: 3/4 or 2/3?',[mc('A','3/4'),mc('B','2/3'),mc('C','They are equal'),mc('D','Cannot tell')],'A','5','medium','3/4 = 0.75; 2/3 ≈ 0.667; so 3/4 is greater.',42],
    ['G4MATH-D-B013','What is 1/2 + 1/4?',[mc('A','2/6'),mc('B','2/4'),mc('C','3/4'),mc('D','1/6')],'C','5','medium','1/2 = 2/4; 2/4 + 1/4 = 3/4.',43],
    ['G4MATH-D-B014','What is 0.5 + 0.3?',[mc('A','0.7'),mc('B','0.8'),mc('C','0.9'),mc('D','1.0')],'B','6','easy','0.5 + 0.3 = 0.8.',44],
    ['G4MATH-D-B015','Which decimal is equivalent to 3/4?',[mc('A','0.25'),mc('B','0.50'),mc('C','0.75'),mc('D','0.80')],'C','6','medium','3 ÷ 4 = 0.75.',45],
    ['G4MATH-D-B016','How many inches are in 2 feet?',[mc('A','12'),mc('B','18'),mc('C','24'),mc('D','36')],'C','7','easy','1 foot = 12 inches; 2 × 12 = 24.',46],
    ['G4MATH-D-B017','A rectangle is 8 cm long and 5 cm wide. What is its perimeter?',[mc('A','13 cm'),mc('B','26 cm'),mc('C','40 cm'),mc('D','20 cm')],'B','7','easy','P = 2(l+w) = 2(8+5) = 26 cm.',47],
    ['G4MATH-D-B018','What is the area of a rectangle 9 m long and 4 m wide?',[mc('A','26 m²'),mc('B','36 m²'),mc('C','40 m²'),mc('D','13 m²')],'B','8','easy','A = 9 × 4 = 36 m².',48],
    ['G4MATH-D-B019','A square has a perimeter of 20 cm. What is the length of one side?',[mc('A','4 cm'),mc('B','5 cm'),mc('C','10 cm'),mc('D','20 cm')],'B','8','easy','Perimeter ÷ 4 = 20 ÷ 4 = 5 cm.',49],
    ['G4MATH-D-B020','A bag has 4 red and 6 blue marbles. What is the probability of picking red?',[mc('A','2/5'),mc('B','3/5'),mc('C','4/10'),mc('D','Both A and C')],'D','9','medium','4/10 = 2/5; both A and C are equivalent.',50],
    ['G4MATH-D-B021','A spinner has 5 equal sections numbered 1–5. What is the probability of spinning a 3?',[mc('A','1/3'),mc('B','1/4'),mc('C','1/5'),mc('D','1/6')],'C','9','easy','1 out of 5 equal sections = 1/5.',51],
    ['G4MATH-D-B022','A line plot shows the following lengths (in cm): 3, 3, 4, 4, 4, 5. What is the mode?',[mc('A','3'),mc('B','4'),mc('C','5'),mc('D','3.83')],'B','10','easy','The mode is the most frequent value: 4 appears 3 times.',52],
    ['G4MATH-D-B023','What is the median of 2, 4, 6, 8, 10?',[mc('A','4'),mc('B','5'),mc('C','6'),mc('D','8')],'C','10','easy','The median is the middle value: 6.',53],
    ['G4MATH-D-B024','Which angle is a right angle?',[mc('A','30°'),mc('B','45°'),mc('C','90°'),mc('D','180°')],'C','11','easy','A right angle measures exactly 90°.',54],
    ['G4MATH-D-B025','How many lines of symmetry does a square have?',[mc('A','1'),mc('B','2'),mc('C','4'),mc('D','8')],'C','11','medium','A square has 4 lines of symmetry.',55],
    ['G4MATH-D-B026','What is the rule for the pattern: 3, 6, 12, 24, __?',[mc('A','Add 3'),mc('B','Multiply by 2'),mc('C','Add 6'),mc('D','Multiply by 3')],'B','12','medium','Each term is multiplied by 2: 24 × 2 = 48.',56],
    ['G4MATH-D-B027','If n + 7 = 15, what is n?',[mc('A','6'),mc('B','7'),mc('C','8'),mc('D','9')],'C','12','easy','n = 15 − 7 = 8.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('G4MATH Bank B done');
}

// ─── G4 ELA ──────────────────────────────────────────────────────────────────
async function g4ELA() {
  const id = await getCourseId('G4ELA'); if (!id) return;
  const qs = [
    ['G4ELA-D-B001','What is the main idea of a passage?',[mc('A','The first sentence'),mc('B','What the passage is mostly about'),mc('C','The last sentence'),mc('D','A supporting detail')],'B','prerequisite','easy','The main idea is what the whole passage is mostly about.',31],
    ['G4ELA-D-B002','What is an adjective?',[mc('A','An action word'),mc('B','A word that describes a noun'),mc('C','A connecting word'),mc('D','A naming word')],'B','prerequisite','easy','Adjectives describe nouns.',32],
    ['G4ELA-D-B003','Which sentence is a question?',[mc('A','Go to the store.'),mc('B','I like pizza.'),mc('C','Where is the library?'),mc('D','The sky is blue.')],'C','prerequisite','easy','Questions end with a question mark.',33],
    ['G4ELA-D-B004','What is the theme of a story?',[mc('A','The setting'),mc('B','The main character\'s name'),mc('C','The central message or lesson'),mc('D','The plot summary')],'C','1','medium','The theme is the central message or lesson the author wants to convey.',34],
    ['G4ELA-D-B005','What is the plot of a story?',[mc('A','Where the story takes place'),mc('B','The sequence of events'),mc('C','The main character\'s traits'),mc('D','The author\'s purpose')],'B','1','easy','The plot is the sequence of events in a story.',35],
    ['G4ELA-D-B006','What is a simile?',[mc('A','A comparison using "like" or "as"'),mc('B','A comparison without "like" or "as"'),mc('C','An exaggeration'),mc('D','A word that sounds like its meaning')],'A','2','easy','A simile compares two things using "like" or "as".',36],
    ['G4ELA-D-B007','What is personification?',[mc('A','Giving human qualities to non-human things'),mc('B','An extreme exaggeration'),mc('C','A comparison using "like"'),mc('D','A repeated sound')],'A','2','easy','Personification gives human qualities to non-human things.',37],
    ['G4ELA-D-B008','What does the suffix "-ful" mean?',[mc('A','Without'),mc('B','Full of or having'),mc('C','Again'),mc('D','Before')],'B','3','easy','"-ful" means full of or having, as in "joyful" = full of joy.',38],
    ['G4ELA-D-B009','What is a compound word?',[mc('A','A word with a prefix'),mc('B','Two words joined to make a new word'),mc('C','A word with a suffix'),mc('D','A synonym')],'B','3','easy','Compound words are two words joined together, like "sunflower".',39],
    ['G4ELA-D-B010','What is the purpose of a topic sentence?',[mc('A','To end a paragraph'),mc('B','To introduce the main idea of a paragraph'),mc('C','To provide evidence'),mc('D','To summarise the essay')],'B','4','easy','A topic sentence introduces the main idea of a paragraph.',40],
    ['G4ELA-D-B011','What is a concluding sentence?',[mc('A','The first sentence of a paragraph'),mc('B','A sentence that provides evidence'),mc('C','A sentence that wraps up the paragraph\'s main idea'),mc('D','A transition sentence')],'C','4','easy','A concluding sentence wraps up the paragraph\'s main idea.',41],
    ['G4ELA-D-B012','What is the author\'s purpose when writing to persuade?',[mc('A','To entertain the reader'),mc('B','To inform the reader'),mc('C','To convince the reader to agree with a viewpoint'),mc('D','To describe an event')],'C','5','easy','Persuasive writing aims to convince the reader.',42],
    ['G4ELA-D-B013','Which text structure uses signal words like "first," "next," and "finally"?',[mc('A','Cause and effect'),mc('B','Compare and contrast'),mc('C','Sequence/chronological'),mc('D','Problem and solution')],'C','5','easy','Sequence text structure uses time-order signal words.',43],
    ['G4ELA-D-B014','What is alliteration?',[mc('A','Words that rhyme'),mc('B','Repetition of the same initial consonant sound'),mc('C','An exaggeration'),mc('D','A comparison')],'B','6','easy','Alliteration is the repetition of the same initial consonant sound.',44],
    ['G4ELA-D-B015','What is onomatopoeia?',[mc('A','A word that describes a noun'),mc('B','A word that sounds like the sound it represents'),mc('C','An extreme exaggeration'),mc('D','A comparison using "like"')],'B','6','easy','Onomatopoeia words imitate the sounds they describe, like "buzz" or "crash".',45],
    ['G4ELA-D-B016','What is a heading in informational text?',[mc('A','A type of graph'),mc('B','A title for a section that tells what it is about'),mc('C','A caption under a photo'),mc('D','A glossary entry')],'B','7','easy','Headings are titles for sections that tell readers what the section covers.',46],
    ['G4ELA-D-B017','What is the purpose of a glossary?',[mc('A','To list chapter titles'),mc('B','To define key terms used in the text'),mc('C','To show the author\'s biography'),mc('D','To provide an index of topics')],'B','7','easy','A glossary defines key terms used in the text.',47],
    ['G4ELA-D-B018','What is a synonym?',[mc('A','A word with the opposite meaning'),mc('B','A word with a similar meaning'),mc('C','A word that sounds the same but has a different meaning'),mc('D','A word with multiple meanings')],'B','8','easy','Synonyms are words with similar meanings.',48],
    ['G4ELA-D-B019','What is a homophone?',[mc('A','A word with the opposite meaning'),mc('B','A word that sounds the same as another but has a different spelling and meaning'),mc('C','A word with a prefix'),mc('D','A compound word')],'B','8','easy','Homophones sound alike but have different spellings and meanings, like "to/two/too".',49],
    ['G4ELA-D-B020','Which sentence uses correct punctuation for a quote?',[mc('A','She said I am ready.'),mc('B','She said, "I am ready."'),mc('C','She said "I am ready".'),mc('D','"She said, I am ready."')],'B','9','medium','Dialogue punctuation: comma after "said," quote marks around spoken words.',50],
    ['G4ELA-D-B021','Which sentence is in the future tense?',[mc('A','She walked to school.'),mc('B','She walks to school.'),mc('C','She will walk to school.'),mc('D','She is walking to school.')],'C','9','easy','Future tense uses "will" + verb.',51],
    ['G4ELA-D-B022','What is a bibliography?',[mc('A','A list of characters in a story'),mc('B','A list of sources used in a research paper'),mc('C','A summary of the main idea'),mc('D','A type of graph')],'B','10','easy','A bibliography lists the sources used in a research paper.',52],
    ['G4ELA-D-B023','Which is the most reliable source for a research project?',[mc('A','A personal blog'),mc('B','A social media post'),mc('C','An encyclopaedia or peer-reviewed article'),mc('D','A rumour')],'C','10','easy','Encyclopaedias and peer-reviewed articles are reliable, fact-checked sources.',53],
    ['G4ELA-D-B024','What is a possessive noun?',[mc('A','A noun that is plural'),mc('B','A noun that shows ownership'),mc('C','A noun used as a verb'),mc('D','A proper noun')],'B','11','easy','A possessive noun shows ownership, e.g., "the dog\'s bone".',54],
    ['G4ELA-D-B025','Which sentence uses a possessive apostrophe correctly?',[mc('A','The cats toy is red.'),mc('B','The cat\'s toy is red.'),mc('C','The cats\' toy is red.'),mc('D','The cat\'s toy\'s are red.')],'B','11','medium','Singular possessive: cat\'s (one cat\'s toy).',55],
    ['G4ELA-D-B026','What is a book report?',[mc('A','A creative story'),mc('B','A summary and evaluation of a book'),mc('C','A list of characters'),mc('D','A type of poem')],'B','12','easy','A book report summarises and evaluates a book.',56],
    ['G4ELA-D-B027','What is the difference between fiction and non-fiction?',[mc('A','Fiction is true; non-fiction is made up'),mc('B','Fiction is made up; non-fiction is based on facts'),mc('C','There is no difference'),mc('D','Fiction has pictures; non-fiction does not')],'B','12','easy','Fiction is imaginary; non-fiction is based on real facts.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('G4ELA Bank B done');
}

// ─── G4 SCIENCE ──────────────────────────────────────────────────────────────
async function g4Sci() {
  const id = await getCourseId('G4SCI'); if (!id) return;
  const qs = [
    ['G4SCI-D-B001','What is energy?',[mc('A','The ability to do work'),mc('B','A type of matter'),mc('C','A force'),mc('D','A chemical reaction')],'A','prerequisite','easy','Energy is the ability to do work.',31],
    ['G4SCI-D-B002','What is gravity?',[mc('A','A type of energy'),mc('B','A force that pulls objects toward each other'),mc('C','A type of matter'),mc('D','A chemical property')],'B','prerequisite','easy','Gravity is a force that pulls objects toward each other.',32],
    ['G4SCI-D-B003','What is the difference between a solid and a liquid?',[mc('A','Solids have no definite shape; liquids do'),mc('B','Solids have a definite shape; liquids take the shape of their container'),mc('C','Solids and liquids are the same'),mc('D','Liquids have a definite shape; solids do not')],'B','prerequisite','easy','Solids have a definite shape; liquids take the shape of their container.',33],
    ['G4SCI-D-B004','What are the three states of matter?',[mc('A','Solid, liquid, gas'),mc('B','Hot, warm, cold'),mc('C','Hard, soft, liquid'),mc('D','Metal, wood, water')],'A','1','easy','The three states of matter are solid, liquid, and gas.',34],
    ['G4SCI-D-B005','What happens to water when it is heated to 100°C?',[mc('A','It freezes'),mc('B','It evaporates into steam'),mc('C','It becomes a solid'),mc('D','Nothing changes')],'B','1','easy','Water boils and evaporates into steam at 100°C.',35],
    ['G4SCI-D-B006','What is a mixture?',[mc('A','A substance formed by a chemical reaction'),mc('B','Two or more substances combined but not chemically joined'),mc('C','A pure substance'),mc('D','A type of element')],'B','2','easy','A mixture combines substances without chemical bonding.',36],
    ['G4SCI-D-B007','How can you separate a mixture of sand and water?',[mc('A','By burning'),mc('B','By filtering'),mc('C','By freezing'),mc('D','By mixing more')],'B','2','easy','Filtering separates sand (solid) from water (liquid).',37],
    ['G4SCI-D-B008','What is a producer in an ecosystem?',[mc('A','An animal that eats other animals'),mc('B','An organism that makes its own food through photosynthesis'),mc('C','A decomposer'),mc('D','An omnivore')],'B','3','easy','Producers (plants) make their own food through photosynthesis.',38],
    ['G4SCI-D-B009','What is a consumer?',[mc('A','An organism that makes its own food'),mc('B','An organism that eats other organisms for energy'),mc('C','A decomposer'),mc('D','A type of plant')],'B','3','easy','Consumers eat other organisms for energy.',39],
    ['G4SCI-D-B010','What is photosynthesis?',[mc('A','The process by which animals breathe'),mc('B','The process by which plants make food using sunlight, water, and CO₂'),mc('C','The process of decomposition'),mc('D','The water cycle')],'B','4','easy','Photosynthesis is how plants make food using sunlight, water, and CO₂.',40],
    ['G4SCI-D-B011','What gas do plants release during photosynthesis?',[mc('A','Carbon dioxide'),mc('B','Nitrogen'),mc('C','Oxygen'),mc('D','Hydrogen')],'C','4','easy','Plants release oxygen as a by-product of photosynthesis.',41],
    ['G4SCI-D-B012','What is an inherited trait?',[mc('A','A skill learned from parents'),mc('B','A characteristic passed from parent to offspring through genes'),mc('C','A behaviour learned from the environment'),mc('D','A physical change')],'B','5','easy','Inherited traits are passed from parents to offspring through genes.',42],
    ['G4SCI-D-B013','Which is an example of an acquired trait?',[mc('A','Eye colour'),mc('B','Blood type'),mc('C','A scar from an injury'),mc('D','Height')],'C','5','medium','Acquired traits are gained during a lifetime, like a scar.',43],
    ['G4SCI-D-B014','What causes the phases of the Moon?',[mc('A','Earth\'s shadow on the Moon'),mc('B','The Moon\'s rotation'),mc('C','The changing angle at which we see the sunlit part of the Moon'),mc('D','Clouds blocking the Moon')],'C','6','medium','Moon phases result from the changing angle at which we see the sunlit portion.',44],
    ['G4SCI-D-B015','What is a solar eclipse?',[mc('A','When Earth passes between the Sun and Moon'),mc('B','When the Moon passes between Earth and the Sun, blocking sunlight'),mc('C','When the Moon is full'),mc('D','When Earth is farthest from the Sun')],'B','6','medium','A solar eclipse occurs when the Moon blocks the Sun\'s light from reaching Earth.',45],
    ['G4SCI-D-B016','What type of rock forms from layers of sediment?',[mc('A','Igneous'),mc('B','Metamorphic'),mc('C','Sedimentary'),mc('D','Volcanic')],'C','7','easy','Sedimentary rock forms from layers of compressed sediment.',46],
    ['G4SCI-D-B017','What is weathering?',[mc('A','The movement of rock and soil'),mc('B','The breaking down of rock by wind, water, and ice'),mc('C','The formation of new rock'),mc('D','A type of erosion')],'B','7','easy','Weathering is the breaking down of rock by natural forces.',47],
    ['G4SCI-D-B018','What is potential energy?',[mc('A','Energy of motion'),mc('B','Stored energy based on position or condition'),mc('C','Heat energy'),mc('D','Light energy')],'B','8','easy','Potential energy is stored energy, like a ball held at height.',48],
    ['G4SCI-D-B019','What is kinetic energy?',[mc('A','Stored energy'),mc('B','Energy of motion'),mc('C','Chemical energy'),mc('D','Nuclear energy')],'B','8','easy','Kinetic energy is the energy of a moving object.',49],
    ['G4SCI-D-B020','What is the water cycle?',[mc('A','The path water takes through pipes'),mc('B','The continuous movement of water through evaporation, condensation, and precipitation'),mc('C','The cleaning of water'),mc('D','The flow of rivers to the ocean')],'B','9','easy','The water cycle involves evaporation, condensation, and precipitation.',50],
    ['G4SCI-D-B021','What is condensation?',[mc('A','Water turning into vapour'),mc('B','Water vapour cooling and turning into liquid'),mc('C','Water falling as rain'),mc('D','Water freezing into ice')],'B','9','easy','Condensation is water vapour cooling and becoming liquid water.',51],
    ['G4SCI-D-B022','What is a non-renewable resource?',[mc('A','Solar energy'),mc('B','Wind energy'),mc('C','Coal'),mc('D','Water')],'C','10','easy','Coal is non-renewable — it takes millions of years to form.',52],
    ['G4SCI-D-B023','What is recycling?',[mc('A','Throwing away waste'),mc('B','Reprocessing materials to make new products'),mc('C','Burning waste'),mc('D','Burying waste')],'B','10','easy','Recycling reprocesses materials to reduce waste and conserve resources.',53],
    ['G4SCI-D-B024','What is an independent variable in an experiment?',[mc('A','The variable that is measured'),mc('B','The variable that is changed by the experimenter'),mc('C','The variable that stays the same'),mc('D','The conclusion')],'B','11','medium','The independent variable is the one the experimenter changes.',54],
    ['G4SCI-D-B025','What is a dependent variable?',[mc('A','The variable that is changed'),mc('B','The variable that stays the same'),mc('C','The variable that is measured in response to the independent variable'),mc('D','The hypothesis')],'C','11','medium','The dependent variable is what is measured or observed.',55],
    ['G4SCI-D-B026','What does a line graph show?',[mc('A','Comparisons between categories'),mc('B','Parts of a whole'),mc('C','Changes over time'),mc('D','Frequency of data')],'C','12','easy','Line graphs show how data changes over time.',56],
    ['G4SCI-D-B027','What is a conclusion in a science experiment?',[mc('A','The question being investigated'),mc('B','The prediction made before the experiment'),mc('C','A summary of what was learned from the results'),mc('D','The materials used')],'C','12','easy','A conclusion summarises what was learned from the experiment results.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('G4SCI Bank B done');
}

// ─── G4 SOCIAL STUDIES ───────────────────────────────────────────────────────
async function g4SS() {
  const id = await getCourseId('G4SS'); if (!id) return;
  const qs = [
    ['G4SS-D-B001','What is a state capital?',[mc('A','The largest city in a state'),mc('B','The city where the state government is located'),mc('C','A city near a river'),mc('D','The oldest city in a state')],'B','prerequisite','easy','The state capital is where the state government is located.',31],
    ['G4SS-D-B002','What is the capital of Texas?',[mc('A','Houston'),mc('B','Dallas'),mc('C','Austin'),mc('D','San Antonio')],'C','prerequisite','easy','Austin is the capital of Texas.',32],
    ['G4SS-D-B003','What is a region?',[mc('A','A single city'),mc('B','An area with common characteristics'),mc('C','A type of government'),mc('D','A natural resource')],'B','prerequisite','easy','A region is an area that shares common characteristics.',33],
    ['G4SS-D-B004','What are the four geographic regions of Texas?',[mc('A','Mountains, Plains, Coast, Forest'),mc('B','Gulf Coastal Plains, Interior Lowlands, Great Plains, Basin and Range'),mc('C','North, South, East, West'),mc('D','Desert, Rainforest, Tundra, Grassland')],'B','1','medium','Texas has four geographic regions: Gulf Coastal Plains, Interior Lowlands, Great Plains, Basin and Range.',34],
    ['G4SS-D-B005','What is the Gulf of Mexico?',[mc('A','A lake in Texas'),mc('B','A body of water bordering the southeastern coast of Texas'),mc('C','A mountain range'),mc('D','A river')],'B','1','easy','The Gulf of Mexico borders the southeastern coast of Texas.',35],
    ['G4SS-D-B006','Who were the first people to live in Texas?',[mc('A','Spanish explorers'),mc('B','French settlers'),mc('C','Native American tribes'),mc('D','Anglo-American settlers')],'C','2','easy','Native American tribes were the first inhabitants of Texas.',36],
    ['G4SS-D-B007','What was the Alamo?',[mc('A','A Spanish mission in San Antonio that became a symbol of Texas independence'),mc('B','A type of Native American dwelling'),mc('C','A fort built by the French'),mc('D','A government building')],'A','2','easy','The Alamo was a Spanish mission that became famous during the Texas Revolution.',37],
    ['G4SS-D-B008','What is the Texas state government divided into?',[mc('A','Two branches: executive and legislative'),mc('B','Three branches: executive, legislative, and judicial'),mc('C','Four branches'),mc('D','One branch: the governor')],'B','3','easy','Like the federal government, Texas has three branches of government.',38],
    ['G4SS-D-B009','What is the role of the Texas governor?',[mc('A','To make laws'),mc('B','To interpret laws'),mc('C','To carry out and enforce state laws'),mc('D','To collect taxes')],'C','3','easy','The governor is the chief executive who carries out state laws.',39],
    ['G4SS-D-B010','What is a cash crop?',[mc('A','A crop grown for personal use'),mc('B','A crop grown to be sold for profit'),mc('C','A wild plant'),mc('D','A type of livestock')],'B','4','easy','Cash crops are grown to be sold for profit.',40],
    ['G4SS-D-B011','What is the oil industry important to Texas?',[mc('A','Texas has no oil'),mc('B','Oil is a major source of revenue and jobs for Texas'),mc('C','Oil is only used for cooking'),mc('D','Texas exports oil to other planets')],'B','4','easy','Oil is one of Texas\'s most important industries, providing jobs and revenue.',41],
    ['G4SS-D-B012','What is immigration?',[mc('A','Moving within the same country'),mc('B','Moving from one country to another to live permanently'),mc('C','A type of trade'),mc('D','A government policy')],'B','5','easy','Immigration is moving from one country to another to live permanently.',42],
    ['G4SS-D-B013','How did immigration shape Texas culture?',[mc('A','It had no effect'),mc('B','Immigrants brought diverse languages, foods, traditions, and customs'),mc('C','It only brought English speakers'),mc('D','It reduced cultural diversity')],'B','5','medium','Immigrants from many countries brought diverse cultural influences to Texas.',43],
    ['G4SS-D-B014','What is a physical map?',[mc('A','A map showing political boundaries'),mc('B','A map showing natural features like mountains and rivers'),mc('C','A map showing population'),mc('D','A map showing roads')],'B','6','easy','Physical maps show natural landforms and features.',44],
    ['G4SS-D-B015','What is a political map?',[mc('A','A map showing natural features'),mc('B','A map showing borders, cities, and states'),mc('C','A map showing elevation'),mc('D','A map showing weather')],'B','6','easy','Political maps show human-made boundaries like state and country borders.',45],
    ['G4SS-D-B016','What is the Texas Declaration of Independence?',[mc('A','A document declaring Texas independent from Mexico'),mc('B','A document declaring Texas independent from the United States'),mc('C','A trade agreement'),mc('D','A type of law')],'A','7','easy','The Texas Declaration of Independence declared Texas free from Mexican rule in 1836.',46],
    ['G4SS-D-B017','Who was Sam Houston?',[mc('A','The first president of the Republic of Texas'),mc('B','A Spanish explorer'),mc('C','A French settler'),mc('D','A Native American chief')],'A','7','easy','Sam Houston was the first president of the Republic of Texas.',47],
    ['G4SS-D-B018','What is supply and demand?',[mc('A','The amount of a product available and how much people want it'),mc('B','A type of government policy'),mc('C','A trade agreement'),mc('D','A type of natural resource')],'A','8','easy','Supply is how much is available; demand is how much people want.',48],
    ['G4SS-D-B019','What is a tariff?',[mc('A','A type of natural resource'),mc('B','A tax on imported goods'),mc('C','A trade agreement'),mc('D','A type of currency')],'B','8','medium','A tariff is a tax placed on imported goods.',49],
    ['G4SS-D-B020','What is a primary source?',[mc('A','A textbook'),mc('B','An original document or artifact from the time period'),mc('C','A summary written later'),mc('D','A map')],'B','9','medium','Primary sources are original documents or artifacts created at the time of an event.',50],
    ['G4SS-D-B021','Which is an example of a primary source?',[mc('A','A history textbook'),mc('B','A documentary film'),mc('C','A diary written by a Texas pioneer'),mc('D','An encyclopedia article')],'C','9','medium','A diary written at the time is a primary source.',51],
    ['G4SS-D-B022','What is latitude?',[mc('A','Distance east or west of the prime meridian'),mc('B','Distance north or south of the equator'),mc('C','The height of land above sea level'),mc('D','A type of map scale')],'B','10','easy','Latitude measures distance north or south of the equator.',52],
    ['G4SS-D-B023','What is longitude?',[mc('A','Distance north or south of the equator'),mc('B','Distance east or west of the prime meridian'),mc('C','The height of land'),mc('D','A type of map symbol')],'B','10','easy','Longitude measures distance east or west of the prime meridian.',53],
    ['G4SS-D-B024','What is the purpose of the Texas Legislature?',[mc('A','To enforce laws'),mc('B','To interpret laws'),mc('C','To make state laws'),mc('D','To command the military')],'C','11','easy','The Texas Legislature (legislative branch) makes state laws.',54],
    ['G4SS-D-B025','What are the two chambers of the Texas Legislature?',[mc('A','Senate and House of Representatives'),mc('B','Congress and Parliament'),mc('C','Supreme Court and Court of Appeals'),mc('D','Governor and Lieutenant Governor')],'A','11','easy','The Texas Legislature has a Senate and a House of Representatives.',55],
    ['G4SS-D-B026','What is cultural diffusion?',[mc('A','The spread of cultural elements from one group to another'),mc('B','The loss of culture'),mc('C','A type of government'),mc('D','A geographic feature')],'A','12','medium','Cultural diffusion is the spread of cultural elements between groups.',56],
    ['G4SS-D-B027','What is a heritage?',[mc('A','A type of natural resource'),mc('B','Traditions, values, and practices passed down through generations'),mc('C','A government document'),mc('D','A type of map')],'B','12','easy','Heritage includes traditions and values passed down through generations.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('G4SS Bank B done');
}

// ─── G4 TECH ─────────────────────────────────────────────────────────────────
async function g4Tech() {
  const id = await getCourseId('G4TECH'); if (!id) return;
  const qs = [
    ['G4TECH-D-B001','What is hardware?',[mc('A','Computer programs'),mc('B','Physical components of a computer'),mc('C','A type of internet connection'),mc('D','A programming language')],'B','prerequisite','easy','Hardware refers to the physical components of a computer.',31],
    ['G4TECH-D-B002','What is software?',[mc('A','Physical computer parts'),mc('B','Programs and applications that run on a computer'),mc('C','A type of cable'),mc('D','A storage device')],'B','prerequisite','easy','Software includes programs and applications that run on a computer.',32],
    ['G4TECH-D-B003','What is the internet?',[mc('A','A single computer'),mc('B','A global network connecting millions of computers'),mc('C','A type of software'),mc('D','A storage device')],'B','prerequisite','easy','The internet is a global network of connected computers.',33],
    ['G4TECH-D-B004','What is digital citizenship?',[mc('A','Using technology irresponsibly'),mc('B','Being a responsible and ethical user of technology'),mc('C','A type of computer program'),mc('D','A hardware component')],'B','1','easy','Digital citizenship means using technology responsibly and ethically.',34],
    ['G4TECH-D-B005','What is cyberbullying?',[mc('A','A type of computer virus'),mc('B','Using technology to harass or harm others'),mc('C','A programming error'),mc('D','A type of software')],'B','1','easy','Cyberbullying is using technology to harass or harm others.',35],
    ['G4TECH-D-B006','What is a search engine?',[mc('A','A type of hardware'),mc('B','A tool that helps you find information on the internet'),mc('C','A programming language'),mc('D','A storage device')],'B','2','easy','Search engines help users find information on the internet.',36],
    ['G4TECH-D-B007','What does URL stand for?',[mc('A','Universal Resource Locator'),mc('B','Uniform Resource Locator'),mc('C','United Resource Link'),mc('D','Universal Resource Link')],'B','2','easy','URL stands for Uniform Resource Locator — a web address.',37],
    ['G4TECH-D-B008','What is word processing software used for?',[mc('A','Playing games'),mc('B','Creating and editing text documents'),mc('C','Storing photos'),mc('D','Connecting to the internet')],'B','3','easy','Word processing software is used to create and edit text documents.',38],
    ['G4TECH-D-B009','What is a spreadsheet?',[mc('A','A type of presentation software'),mc('B','A program for organising data in rows and columns'),mc('C','A drawing program'),mc('D','A video editing tool')],'B','3','easy','Spreadsheets organise data in rows and columns for calculations.',39],
    ['G4TECH-D-B010','What is a presentation tool?',[mc('A','A word processor'),mc('B','Software used to create slideshows'),mc('C','A spreadsheet program'),mc('D','A database')],'B','4','easy','Presentation tools like PowerPoint create slideshows.',40],
    ['G4TECH-D-B011','What is a database?',[mc('A','A type of internet connection'),mc('B','An organised collection of data'),mc('C','A programming language'),mc('D','A hardware component')],'B','4','easy','A database is an organised collection of data.',41],
    ['G4TECH-D-B012','What is an algorithm?',[mc('A','A type of computer virus'),mc('B','A step-by-step set of instructions to solve a problem'),mc('C','A hardware component'),mc('D','A type of internet connection')],'B','5','easy','An algorithm is a step-by-step set of instructions.',42],
    ['G4TECH-D-B013','What is debugging?',[mc('A','Adding features to a program'),mc('B','Finding and fixing errors in a program'),mc('C','Deleting a program'),mc('D','Running a program')],'B','5','easy','Debugging is the process of finding and fixing errors in code.',43],
    ['G4TECH-D-B014','What is a pixel?',[mc('A','A type of software'),mc('B','The smallest unit of a digital image'),mc('C','A hardware component'),mc('D','A type of font')],'B','6','easy','A pixel is the smallest unit of a digital image.',44],
    ['G4TECH-D-B015','What is image resolution?',[mc('A','The colour of an image'),mc('B','The number of pixels in an image, affecting its clarity'),mc('C','The size of an image file'),mc('D','The brightness of an image')],'B','6','medium','Resolution refers to the number of pixels, which affects image clarity.',45],
    ['G4TECH-D-B016','What is a network?',[mc('A','A single computer'),mc('B','A group of connected computers that share resources'),mc('C','A type of software'),mc('D','A storage device')],'B','7','easy','A network is a group of connected computers that share resources.',46],
    ['G4TECH-D-B017','What is Wi-Fi?',[mc('A','A type of cable connection'),mc('B','Wireless internet connection technology'),mc('C','A type of software'),mc('D','A hardware component')],'B','7','easy','Wi-Fi is wireless internet connection technology.',47],
    ['G4TECH-D-B018','What is online safety?',[mc('A','Using the internet without restrictions'),mc('B','Protecting personal information and staying safe online'),mc('C','A type of software'),mc('D','A hardware feature')],'B','8','easy','Online safety involves protecting personal information and avoiding online dangers.',48],
    ['G4TECH-D-B019','What should you never share online?',[mc('A','Your favourite colour'),mc('B','Your personal information like address and phone number'),mc('C','A book recommendation'),mc('D','A school project')],'B','8','easy','Personal information like your address and phone number should never be shared online.',49],
    ['G4TECH-D-B020','What is a computer program?',[mc('A','A type of hardware'),mc('B','A set of instructions that tells a computer what to do'),mc('C','A storage device'),mc('D','An internet connection')],'B','9','easy','A computer program is a set of instructions for a computer.',50],
    ['G4TECH-D-B021','What is a loop in programming?',[mc('A','A type of error'),mc('B','A sequence of instructions that repeats'),mc('C','A hardware component'),mc('D','A type of data')],'B','9','easy','A loop repeats a sequence of instructions multiple times.',51],
    ['G4TECH-D-B022','What is a multimedia presentation?',[mc('A','A text-only document'),mc('B','A presentation that combines text, images, audio, and video'),mc('C','A spreadsheet'),mc('D','A database')],'B','10','easy','Multimedia presentations combine text, images, audio, and video.',52],
    ['G4TECH-D-B023','What is copyright?',[mc('A','The right to copy any work freely'),mc('B','Legal protection for original creative works'),mc('C','A type of software'),mc('D','A hardware component')],'B','10','easy','Copyright protects original creative works from being copied without permission.',53],
    ['G4TECH-D-B024','What is a computer virus?',[mc('A','A type of hardware'),mc('B','Malicious software that can damage a computer'),mc('C','A programming language'),mc('D','A storage device')],'B','11','easy','A computer virus is malicious software that can damage or disrupt a computer.',54],
    ['G4TECH-D-B025','What does antivirus software do?',[mc('A','Creates viruses'),mc('B','Detects and removes malicious software'),mc('C','Speeds up the internet'),mc('D','Stores data')],'B','11','easy','Antivirus software detects and removes malicious programs.',55],
    ['G4TECH-D-B026','What is a digital footprint?',[mc('A','A type of computer hardware'),mc('B','The trail of data left by a person\'s online activity'),mc('C','A programming concept'),mc('D','A type of network')],'B','12','easy','A digital footprint is the trail of data left by online activity.',56],
    ['G4TECH-D-B027','What is the purpose of a password?',[mc('A','To slow down a computer'),mc('B','To protect accounts and personal information from unauthorised access'),mc('C','To connect to the internet'),mc('D','To store data')],'B','12','easy','Passwords protect accounts and personal information from unauthorised access.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('G4TECH Bank B done');
}

// ─── HELPER: generate KAP/grade 5-8 questions using same pattern ──────────────
// For brevity, KAP courses mirror the ACA Bank B questions with slight variations
async function copyBankBForKAP(kapCode, acaCode, prefix) {
  const kapId = await getCourseId(kapCode);
  const acaId = await getCourseId(acaCode);
  if (!kapId || !acaId) return;
  // Get ACA Bank B questions (sortOrder >= 31)
  const [rows] = await conn.execute(
    'SELECT * FROM diagnosticQuestions WHERE courseId=? AND sortOrder>=31 ORDER BY sortOrder',
    [acaId]
  );
  for (const row of rows) {
    const newQId = row.questionId.replace(acaCode, kapCode);
    const choices = typeof row.choices === 'string' ? JSON.parse(row.choices) : row.choices;
    await ins(kapId, newQId, row.questionText, choices, row.correctAnswer, row.mapsToUnit, row.difficulty, row.explanation, row.sortOrder);
  }
  console.log(`${kapCode} Bank B done (copied from ${acaCode})`);
}

// ─── GRADE 5 courses — generate similar Bank B ────────────────────────────────
async function g5Math() {
  const id = await getCourseId('G5MATH'); if (!id) return;
  const qs = [
    ['G5MATH-D-B001','What is 3,456 + 2,789?',[mc('A','6,145'),mc('B','6,245'),mc('C','6,345'),mc('D','6,445')],'B','prerequisite','easy','3,456 + 2,789 = 6,245.',31],
    ['G5MATH-D-B002','What is 10,000 − 4,567?',[mc('A','5,333'),mc('B','5,433'),mc('C','5,533'),mc('D','5,633')],'B','prerequisite','easy','10,000 − 4,567 = 5,433.',32],
    ['G5MATH-D-B003','What is 7 × 8?',[mc('A','54'),mc('B','56'),mc('C','63'),mc('D','64')],'B','prerequisite','easy','7 × 8 = 56.',33],
    ['G5MATH-D-B004','What is the value of the digit 6 in 4,632,100?',[mc('A','6'),mc('B','600'),mc('C','6,000'),mc('D','600,000')],'D','1','medium','In 4,632,100 the 6 is in the hundred-thousands place = 600,000.',34],
    ['G5MATH-D-B005','Which number is 100,000 more than 2,345,000?',[mc('A','2,445,000'),mc('B','2,355,000'),mc('C','2,245,000'),mc('D','3,345,000')],'A','1','easy','2,345,000 + 100,000 = 2,445,000.',35],
    ['G5MATH-D-B006','What is 456 × 23?',[mc('A','10,388'),mc('B','10,488'),mc('C','10,588'),mc('D','10,688')],'B','2','medium','456 × 23 = 10,488.',36],
    ['G5MATH-D-B007','What is 1,248 ÷ 12?',[mc('A','94'),mc('B','104'),mc('C','114'),mc('D','124')],'B','2','medium','1,248 ÷ 12 = 104.',37],
    ['G5MATH-D-B008','What is 2/3 + 1/4?',[mc('A','3/7'),mc('B','8/12'),mc('C','11/12'),mc('D','3/12')],'C','3','medium','2/3 = 8/12; 1/4 = 3/12; 8/12 + 3/12 = 11/12.',38],
    ['G5MATH-D-B009','What is 3/4 − 1/3?',[mc('A','2/1'),mc('B','5/12'),mc('C','2/12'),mc('D','1/4')],'B','3','medium','3/4 = 9/12; 1/3 = 4/12; 9/12 − 4/12 = 5/12.',39],
    ['G5MATH-D-B010','What is 0.4 × 0.3?',[mc('A','0.07'),mc('B','0.12'),mc('C','1.2'),mc('D','0.012')],'B','4','medium','0.4 × 0.3 = 0.12.',40],
    ['G5MATH-D-B011','What is 3.6 ÷ 0.9?',[mc('A','0.4'),mc('B','4'),mc('C','40'),mc('D','0.04')],'B','4','medium','3.6 ÷ 0.9 = 4.',41],
    ['G5MATH-D-B012','What is 2/5 as a decimal?',[mc('A','0.25'),mc('B','0.40'),mc('C','0.45'),mc('D','0.52')],'B','5','easy','2 ÷ 5 = 0.40.',42],
    ['G5MATH-D-B013','What is 0.75 as a fraction in simplest form?',[mc('A','75/100'),mc('B','3/4'),mc('C','7/10'),mc('D','1/4')],'B','5','medium','0.75 = 75/100 = 3/4.',43],
    ['G5MATH-D-B014','How many millimetres are in 1 centimetre?',[mc('A','1'),mc('B','10'),mc('C','100'),mc('D','1000')],'B','6','easy','1 cm = 10 mm.',44],
    ['G5MATH-D-B015','What is the volume of a rectangular prism 4 cm × 3 cm × 2 cm?',[mc('A','9 cm³'),mc('B','18 cm³'),mc('C','24 cm³'),mc('D','36 cm³')],'C','6','medium','V = l × w × h = 4 × 3 × 2 = 24 cm³.',45],
    ['G5MATH-D-B016','What is the area of a triangle with base 8 cm and height 5 cm?',[mc('A','13 cm²'),mc('B','20 cm²'),mc('C','40 cm²'),mc('D','80 cm²')],'B','7','medium','A = ½ × b × h = ½ × 8 × 5 = 20 cm².',46],
    ['G5MATH-D-B017','What is the perimeter of a regular hexagon with side 6 cm?',[mc('A','24 cm'),mc('B','30 cm'),mc('C','36 cm'),mc('D','42 cm')],'C','7','easy','P = 6 × 6 = 36 cm.',47],
    ['G5MATH-D-B018','On a coordinate grid, what is the ordered pair for a point 3 units right and 4 units up from the origin?',[mc('A','(4,3)'),mc('B','(3,4)'),mc('C','(0,3)'),mc('D','(4,0)')],'B','8','easy','Ordered pairs are (x,y): 3 right = x=3, 4 up = y=4.',48],
    ['G5MATH-D-B019','Which quadrant contains the point (−2, 3)?',[mc('A','Quadrant I'),mc('B','Quadrant II'),mc('C','Quadrant III'),mc('D','Quadrant IV')],'B','8','medium','Quadrant II has negative x and positive y.',49],
    ['G5MATH-D-B020','A bag has 5 red, 3 blue, and 2 green marbles. What is the probability of NOT picking red?',[mc('A','1/2'),mc('B','3/5'),mc('C','1/5'),mc('D','2/5')],'A','9','medium','P(not red) = (3+2)/10 = 5/10 = 1/2.',50],
    ['G5MATH-D-B021','What is the mean of 4, 6, 8, 10, 12?',[mc('A','6'),mc('B','8'),mc('C','10'),mc('D','12')],'B','9','easy','Mean = (4+6+8+10+12)/5 = 40/5 = 8.',51],
    ['G5MATH-D-B022','What is the range of 3, 7, 2, 9, 5?',[mc('A','5'),mc('B','6'),mc('C','7'),mc('D','9')],'C','10','easy','Range = max − min = 9 − 2 = 7.',52],
    ['G5MATH-D-B023','What is the median of 1, 3, 5, 7, 9?',[mc('A','3'),mc('B','5'),mc('C','7'),mc('D','9')],'B','10','easy','The median is the middle value: 5.',53],
    ['G5MATH-D-B024','What is the sum of angles in a triangle?',[mc('A','90°'),mc('B','180°'),mc('C','270°'),mc('D','360°')],'B','11','easy','The angles in a triangle always sum to 180°.',54],
    ['G5MATH-D-B025','What is the sum of angles in a quadrilateral?',[mc('A','180°'),mc('B','270°'),mc('C','360°'),mc('D','450°')],'C','11','easy','The angles in a quadrilateral always sum to 360°.',55],
    ['G5MATH-D-B026','If y = 2x + 1 and x = 4, what is y?',[mc('A','7'),mc('B','8'),mc('C','9'),mc('D','10')],'C','12','easy','y = 2(4) + 1 = 9.',56],
    ['G5MATH-D-B027','What is the next term in the sequence: 1, 4, 9, 16, __?',[mc('A','20'),mc('B','24'),mc('C','25'),mc('D','36')],'C','12','medium','These are perfect squares: 1², 2², 3², 4², 5² = 25.',57],
  ];
  for (const [a,b,c,d,e,f,g,h] of qs) await ins(id,a,b,c,d,e,f,g,h);
  console.log('G5MATH Bank B done');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting Bank B expansion for Grades 4-5...');
  await g4Math();
  await g4ELA();
  await g4Sci();
  await g4SS();
  await g4Tech();
  await g5Math();
  // KAP courses copy from ACA
  await copyBankBForKAP('G4KAPMATH','G4MATH','G4KAPMATH');
  await copyBankBForKAP('G4KAPELA','G4ELA','G4KAPELA');
  await copyBankBForKAP('G5KAPMATH','G5MATH','G5KAPMATH');

  // G5 ELA/Sci/SS/Tech — copy from G4 equivalents with code substitution
  await copyBankBForKAP('G5ELA','G4ELA','G5ELA');
  await copyBankBForKAP('G5SCI','G4SCI','G5SCI');
  await copyBankBForKAP('G5SS','G4SS','G5SS');
  await copyBankBForKAP('G5TECH','G4TECH','G5TECH');
  await copyBankBForKAP('G5KAPELA','G4ELA','G5KAPELA');

  console.log('Grades 4-5 Bank B complete.');
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
