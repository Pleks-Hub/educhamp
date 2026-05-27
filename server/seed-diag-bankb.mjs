/**
 * seed-diag-bankb.mjs
 * Adds Bank B diagnostic questions (27 per course) to all courses,
 * expanding each bank from 30 → 57 questions.
 * Bank B: 3 new prerequisite questions + 2 new questions per unit (units 1-12).
 * For AP/SAT courses that have no prerequisite group, all 27 are unit questions.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function getCourseId(courseCode) {
  const [rows] = await conn.execute('SELECT id FROM courses WHERE courseCode = ?', [courseCode]);
  return rows[0]?.id ?? null;
}

async function insertDiagQ(courseId, questionId, questionText, choices, correctAnswer, mapsToUnit, difficulty, explanation, sortOrder) {
  // Skip if already exists
  const [existing] = await conn.execute('SELECT id FROM diagnosticQuestions WHERE questionId = ?', [questionId]);
  if (existing.length > 0) return;
  await conn.execute(
    `INSERT INTO diagnosticQuestions (questionId, questionText, questionType, choices, correctAnswer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder, courseId)
     VALUES (?, ?, 'multiple_choice', ?, ?, ?, '[]', ?, ?, ?, ?)`,
    [questionId, questionText, JSON.stringify(choices), correctAnswer, mapsToUnit, difficulty, explanation, sortOrder, courseId]
  );
}

function mc(label, text) { return { label, text }; }

// ─── GRADE 3 MATH (GR3MATH) ──────────────────────────────────────────────────
async function expandGr3Math() {
  const id = await getCourseId('GR3MATH');
  if (!id) return;
  const qs = [
    // prerequisite bank B
    ['GR3MATH-D-B001','What is 5 + 8?',[mc('A','11'),mc('B','12'),mc('C','13'),mc('D','14')],'C','prerequisite','easy','5 + 8 = 13.',31],
    ['GR3MATH-D-B002','What is 15 - 7?',[mc('A','6'),mc('B','7'),mc('C','8'),mc('D','9')],'C','prerequisite','easy','15 - 7 = 8.',32],
    ['GR3MATH-D-B003','Which number is even?',[mc('A','3'),mc('B','7'),mc('C','12'),mc('D','15')],'C','prerequisite','easy','12 is even because it ends in 2.',33],
    // unit 1 bank B
    ['GR3MATH-D-B004','What is the value of the digit 4 in 342?',[mc('A','4'),mc('B','40'),mc('C','400'),mc('D','4000')],'B','1','medium','In 342, the 4 is in the tens place, so its value is 40.',34],
    ['GR3MATH-D-B005','Which number is between 250 and 260?',[mc('A','249'),mc('B','255'),mc('C','261'),mc('D','270')],'B','1','easy','255 is between 250 and 260.',35],
    // unit 2 bank B
    ['GR3MATH-D-B006','What is 347 + 215?',[mc('A','552'),mc('B','562'),mc('C','572'),mc('D','582')],'B','2','medium','347 + 215 = 562.',36],
    ['GR3MATH-D-B007','What is 500 - 138?',[mc('A','362'),mc('B','372'),mc('C','382'),mc('D','392')],'A','2','medium','500 - 138 = 362.',37],
    // unit 3 bank B
    ['GR3MATH-D-B008','What is 6 × 7?',[mc('A','36'),mc('B','42'),mc('C','48'),mc('D','54')],'B','3','easy','6 × 7 = 42.',38],
    ['GR3MATH-D-B009','Which multiplication fact equals 24?',[mc('A','3×9'),mc('B','4×6'),mc('C','5×5'),mc('D','6×3')],'B','3','easy','4 × 6 = 24.',39],
    // unit 4 bank B
    ['GR3MATH-D-B010','What is 56 ÷ 8?',[mc('A','6'),mc('B','7'),mc('C','8'),mc('D','9')],'B','4','easy','56 ÷ 8 = 7.',40],
    ['GR3MATH-D-B011','If 5 × 9 = 45, what is 45 ÷ 5?',[mc('A','5'),mc('B','7'),mc('C','9'),mc('D','11')],'C','4','easy','Division undoes multiplication: 45 ÷ 5 = 9.',41],
    // unit 5 bank B
    ['GR3MATH-D-B012','What fraction of the shape is shaded if 3 out of 4 parts are shaded?',[mc('A','1/4'),mc('B','2/4'),mc('C','3/4'),mc('D','4/4')],'C','5','easy','3 out of 4 parts = 3/4.',42],
    ['GR3MATH-D-B013','Which fraction is equivalent to 1/2?',[mc('A','2/6'),mc('B','3/6'),mc('C','4/6'),mc('D','5/6')],'B','5','medium','3/6 = 1/2 because both numerator and denominator are halved.',43],
    // unit 6 bank B
    ['GR3MATH-D-B014','How many centimetres are in 1 metre?',[mc('A','10'),mc('B','100'),mc('C','1000'),mc('D','10000')],'B','6','easy','1 metre = 100 centimetres.',44],
    ['GR3MATH-D-B015','A pencil is 18 cm long. A crayon is 12 cm long. How much longer is the pencil?',[mc('A','4 cm'),mc('B','5 cm'),mc('C','6 cm'),mc('D','7 cm')],'C','6','easy','18 - 12 = 6 cm.',45],
    // unit 7 bank B
    ['GR3MATH-D-B016','What is the area of a rectangle 5 cm long and 3 cm wide?',[mc('A','8 cm²'),mc('B','15 cm²'),mc('C','16 cm²'),mc('D','20 cm²')],'B','7','easy','Area = length × width = 5 × 3 = 15 cm².',46],
    ['GR3MATH-D-B017','What is the perimeter of a square with side 4 cm?',[mc('A','8 cm'),mc('B','12 cm'),mc('C','16 cm'),mc('D','20 cm')],'C','7','easy','Perimeter = 4 × 4 = 16 cm.',47],
    // unit 8 bank B
    ['GR3MATH-D-B018','A clock shows 3:45. What time will it be in 30 minutes?',[mc('A','3:15'),mc('B','4:00'),mc('C','4:15'),mc('D','4:30')],'C','8','easy','3:45 + 30 min = 4:15.',48],
    ['GR3MATH-D-B019','How many minutes are in 2 hours?',[mc('A','60'),mc('B','100'),mc('C','120'),mc('D','180')],'C','8','easy','2 × 60 = 120 minutes.',49],
    // unit 9 bank B
    ['GR3MATH-D-B020','A bag has 3 red, 2 blue, and 5 green marbles. What is the probability of picking green?',[mc('A','1/10'),mc('B','3/10'),mc('C','5/10'),mc('D','7/10')],'C','9','medium','5 green out of 10 total = 5/10.',50],
    ['GR3MATH-D-B021','A spinner has 4 equal sections: red, blue, green, yellow. What is the probability of red?',[mc('A','1/4'),mc('B','1/3'),mc('C','1/2'),mc('D','3/4')],'A','9','easy','1 out of 4 equal sections = 1/4.',51],
    // unit 10 bank B
    ['GR3MATH-D-B022','A bar graph shows 8 students like pizza and 5 like tacos. How many more like pizza?',[mc('A','2'),mc('B','3'),mc('C','4'),mc('D','5')],'B','10','easy','8 - 5 = 3 more students.',52],
    ['GR3MATH-D-B023','A pictograph shows each symbol = 2 students. If there are 4 symbols, how many students?',[mc('A','4'),mc('B','6'),mc('C','8'),mc('D','10')],'C','10','easy','4 × 2 = 8 students.',53],
    // unit 11 bank B
    ['GR3MATH-D-B024','Which shape has exactly 4 equal sides?',[mc('A','Rectangle'),mc('B','Square'),mc('C','Triangle'),mc('D','Pentagon')],'B','11','easy','A square has 4 equal sides.',54],
    ['GR3MATH-D-B025','How many faces does a cube have?',[mc('A','4'),mc('B','5'),mc('C','6'),mc('D','8')],'C','11','easy','A cube has 6 faces.',55],
    // unit 12 bank B
    ['GR3MATH-D-B026','What is the next number in the pattern: 2, 4, 6, 8, __?',[mc('A','9'),mc('B','10'),mc('C','11'),mc('D','12')],'B','12','easy','The pattern adds 2 each time: 8 + 2 = 10.',56],
    ['GR3MATH-D-B027','A rule says "add 5." If the input is 7, what is the output?',[mc('A','2'),mc('B','10'),mc('C','12'),mc('D','35')],'C','12','easy','7 + 5 = 12.',57],
  ];
  for (const [qId, qText, choices, ans, unit, diff, expl, sort] of qs) {
    await insertDiagQ(id, qId, qText, choices, ans, unit, diff, expl, sort);
  }
  console.log('GR3MATH Bank B done');
}

// ─── GRADE 3 ELA (GR3ELA) ────────────────────────────────────────────────────
async function expandGr3ELA() {
  const id = await getCourseId('GR3ELA');
  if (!id) return;
  const qs = [
    ['GR3ELA-D-B001','Which sentence uses a noun correctly?',[mc('A','Run fast the dog.'),mc('B','The dog runs fast.'),mc('C','Fast dog the runs.'),mc('D','Dog the fast runs.')],'B','prerequisite','easy','A noun is a person, place, or thing. "The dog" is the subject noun.',31],
    ['GR3ELA-D-B002','What is a synonym for "happy"?',[mc('A','Sad'),mc('B','Angry'),mc('C','Joyful'),mc('D','Tired')],'C','prerequisite','easy','Joyful means the same as happy.',32],
    ['GR3ELA-D-B003','Which word is a verb?',[mc('A','Book'),mc('B','Jump'),mc('C','Blue'),mc('D','Slowly')],'B','prerequisite','easy','A verb is an action word. "Jump" is an action.',33],
    ['GR3ELA-D-B004','What does a reader do to find the main idea?',[mc('A','Read only the first sentence'),mc('B','Look at the pictures'),mc('C','Identify what the whole passage is mostly about'),mc('D','Count the paragraphs')],'C','1','medium','The main idea is what the whole passage is mostly about.',34],
    ['GR3ELA-D-B005','A supporting detail ___.',[mc('A','Introduces a new topic'),mc('B','Gives information to support the main idea'),mc('C','Ends the story'),mc('D','Describes the setting')],'B','1','easy','Supporting details give information that supports the main idea.',35],
    ['GR3ELA-D-B006','In a story, the setting is ___.',[mc('A','The problem the character faces'),mc('B','The lesson learned'),mc('C','Where and when the story takes place'),mc('D','The main character\'s name')],'C','2','easy','The setting tells where and when a story takes place.',36],
    ['GR3ELA-D-B007','What is the climax of a story?',[mc('A','The beginning'),mc('B','The most exciting or important moment'),mc('C','The ending'),mc('D','The setting')],'B','2','medium','The climax is the turning point or most exciting moment.',37],
    ['GR3ELA-D-B008','Which sentence is a compound sentence?',[mc('A','The cat sat.'),mc('B','The cat sat, and the dog slept.'),mc('C','Running fast.'),mc('D','A big red ball.')],'B','3','medium','A compound sentence joins two independent clauses with a conjunction.',38],
    ['GR3ELA-D-B009','What punctuation ends a question?',[mc('A','.'),mc('B','!'),mc('C','?'),mc('D',',')],'C','3','easy','Questions end with a question mark.',39],
    ['GR3ELA-D-B010','What does the prefix "un-" mean?',[mc('A','Again'),mc('B','Before'),mc('C','Not or opposite of'),mc('D','After')],'C','4','easy','"Un-" means not or the opposite, as in unhappy = not happy.',40],
    ['GR3ELA-D-B011','The root word in "rewrite" is ___.',[mc('A','re'),mc('B','write'),mc('C','ite'),mc('D','rew')],'B','4','easy','The root word is "write"; "re-" is the prefix.',41],
    ['GR3ELA-D-B012','A narrative essay tells ___.',[mc('A','How to do something'),mc('B','A personal story or experience'),mc('C','Facts about a topic'),mc('D','Two sides of an argument')],'B','5','easy','A narrative essay tells a personal story.',42],
    ['GR3ELA-D-B013','Which is a strong opening sentence for a story?',[mc('A','This is my story.'),mc('B','I am going to tell you about my dog.'),mc('C','One stormy night, a mysterious package appeared on our doorstep.'),mc('D','My name is Sam.')],'C','5','medium','A strong opening grabs the reader\'s attention with vivid detail.',43],
    ['GR3ELA-D-B014','A poem with lines that rhyme at the end is called ___.',[mc('A','Free verse'),mc('B','Haiku'),mc('C','Rhyming poem'),mc('D','Limerick')],'C','6','easy','A rhyming poem has end rhymes.',44],
    ['GR3ELA-D-B015','In poetry, repetition is used to ___.',[mc('A','Confuse the reader'),mc('B','Add emphasis and rhythm'),mc('C','Shorten the poem'),mc('D','Remove rhyme')],'B','6','medium','Repetition adds emphasis and creates rhythm in poetry.',45],
    ['GR3ELA-D-B016','Informational text is different from fiction because it ___.',[mc('A','Uses made-up characters'),mc('B','Presents facts about real topics'),mc('C','Always has a moral'),mc('D','Is written in verse')],'B','7','easy','Informational text presents facts about real topics.',46],
    ['GR3ELA-D-B017','A text feature that helps readers find topics quickly is ___.',[mc('A','A glossary'),mc('B','A table of contents'),mc('C','An index'),mc('D','All of the above')],'D','7','medium','All three features help readers navigate informational text.',47],
    ['GR3ELA-D-B018','What does "context clues" mean?',[mc('A','Looking up a word in the dictionary'),mc('B','Using surrounding words to figure out meaning'),mc('C','Asking a teacher'),mc('D','Skipping the unknown word')],'B','8','medium','Context clues are words around an unknown word that help you figure out its meaning.',48],
    ['GR3ELA-D-B019','Which word is an antonym of "loud"?',[mc('A','Noisy'),mc('B','Quiet'),mc('C','Shout'),mc('D','Boom')],'B','8','easy','Antonyms are opposites. Quiet is the opposite of loud.',49],
    ['GR3ELA-D-B020','Which sentence is written in the past tense?',[mc('A','She runs to school.'),mc('B','She will run to school.'),mc('C','She ran to school.'),mc('D','She is running to school.')],'C','9','easy','Past tense verbs describe actions that already happened. "Ran" is past tense.',50],
    ['GR3ELA-D-B021','Which sentence has correct subject-verb agreement?',[mc('A','The dogs barks.'),mc('B','The dog bark.'),mc('C','The dogs bark.'),mc('D','The dog are barking.')],'C','9','medium','Plural subject "dogs" takes plural verb "bark".',51],
    ['GR3ELA-D-B022','A research report should include ___.',[mc('A','Only opinions'),mc('B','Facts from reliable sources'),mc('C','Made-up information'),mc('D','Only pictures')],'B','10','easy','A research report uses facts from reliable sources.',52],
    ['GR3ELA-D-B023','Which is a reliable source for a research report?',[mc('A','A friend\'s opinion'),mc('B','An encyclopedia'),mc('C','A cartoon'),mc('D','A rumour')],'B','10','medium','Encyclopedias are reliable, fact-checked sources.',53],
    ['GR3ELA-D-B024','Which word correctly completes: "She ___ to the store yesterday."?',[mc('A','go'),mc('B','goes'),mc('C','went'),mc('D','going')],'C','11','easy','"Went" is the past tense of "go".',54],
    ['GR3ELA-D-B025','Which sentence uses a comma correctly?',[mc('A','I like apples oranges and bananas.'),mc('B','I like apples, oranges, and bananas.'),mc('C','I like, apples oranges and bananas.'),mc('D','I, like apples oranges and bananas.')],'B','11','easy','Commas separate items in a list.',55],
    ['GR3ELA-D-B026','A book review should include ___.',[mc('A','The author\'s address'),mc('B','A summary and the reviewer\'s opinion'),mc('C','Only the title'),mc('D','The price of the book')],'B','12','easy','A book review includes a summary and the reviewer\'s opinion.',56],
    ['GR3ELA-D-B027','Which is an example of figurative language?',[mc('A','The cat is black.'),mc('B','She ran quickly.'),mc('C','His heart was a drum beating fast.'),mc('D','The book is on the table.')],'C','12','medium','A metaphor compares two things without using "like" or "as".',57],
  ];
  for (const [qId, qText, choices, ans, unit, diff, expl, sort] of qs) {
    await insertDiagQ(id, qId, qText, choices, ans, unit, diff, expl, sort);
  }
  console.log('GR3ELA Bank B done');
}

// ─── GRADE 3 SCIENCE (GR3SCI) ────────────────────────────────────────────────
async function expandGr3Sci() {
  const id = await getCourseId('GR3SCI');
  if (!id) return;
  const qs = [
    ['GR3SCI-D-B001','What do plants need to make food?',[mc('A','Sunlight, water, and carbon dioxide'),mc('B','Sunlight, oxygen, and soil'),mc('C','Water, oxygen, and sugar'),mc('D','Soil, air, and sugar')],'A','prerequisite','easy','Plants use sunlight, water, and CO₂ for photosynthesis.',31],
    ['GR3SCI-D-B002','What is the state of water at 0°C?',[mc('A','Gas'),mc('B','Liquid'),mc('C','Solid'),mc('D','Plasma')],'C','prerequisite','easy','Water freezes at 0°C and becomes a solid (ice).',32],
    ['GR3SCI-D-B003','Which animal is a mammal?',[mc('A','Frog'),mc('B','Eagle'),mc('C','Dog'),mc('D','Salmon')],'C','prerequisite','easy','Dogs are mammals — warm-blooded and nurse young with milk.',33],
    ['GR3SCI-D-B004','What is matter?',[mc('A','Anything that has mass and takes up space'),mc('B','Only solids'),mc('C','Only things you can see'),mc('D','Energy')],'A','1','easy','Matter is anything that has mass and takes up space.',34],
    ['GR3SCI-D-B005','Which is a physical property of matter?',[mc('A','Colour'),mc('B','Ability to burn'),mc('C','Ability to rust'),mc('D','Ability to react with acid')],'A','1','easy','Colour is a physical property — it can be observed without changing the substance.',35],
    ['GR3SCI-D-B006','Which is an example of a physical change?',[mc('A','Burning wood'),mc('B','Rusting iron'),mc('C','Cutting paper'),mc('D','Cooking an egg')],'C','2','easy','Cutting paper changes its shape but not its chemical composition.',36],
    ['GR3SCI-D-B007','Which is a chemical change?',[mc('A','Melting ice'),mc('B','Bending a wire'),mc('C','Burning a candle'),mc('D','Dissolving salt in water')],'C','2','medium','Burning is a chemical change — new substances (ash, CO₂) are formed.',37],
    ['GR3SCI-D-B008','What do all living things need to survive?',[mc('A','Sunlight only'),mc('B','Water, food, and air'),mc('C','Soil and water only'),mc('D','Sugar and oxygen only')],'B','3','easy','All living things need water, food (energy), and air.',38],
    ['GR3SCI-D-B009','What is a food chain?',[mc('A','A chain used to lock a bike'),mc('B','The order in which organisms eat each other'),mc('C','A list of foods'),mc('D','A type of plant')],'B','3','easy','A food chain shows the order in which energy passes from one organism to another.',39],
    ['GR3SCI-D-B010','Which part of a plant makes food?',[mc('A','Root'),mc('B','Stem'),mc('C','Leaf'),mc('D','Flower')],'C','4','easy','Leaves contain chlorophyll and carry out photosynthesis.',40],
    ['GR3SCI-D-B011','What is the purpose of a flower?',[mc('A','To absorb water'),mc('B','To make food'),mc('C','To attract pollinators for reproduction'),mc('D','To anchor the plant')],'C','4','easy','Flowers attract pollinators to help the plant reproduce.',41],
    ['GR3SCI-D-B012','Which animal goes through complete metamorphosis?',[mc('A','Grasshopper'),mc('B','Butterfly'),mc('C','Spider'),mc('D','Earthworm')],'B','5','easy','Butterflies go through egg → larva → pupa → adult (complete metamorphosis).',42],
    ['GR3SCI-D-B013','What is an adaptation?',[mc('A','A change in the weather'),mc('B','A feature that helps an organism survive in its environment'),mc('C','A type of food'),mc('D','A migration pattern')],'B','5','easy','Adaptations are features that help organisms survive.',43],
    ['GR3SCI-D-B014','What causes day and night on Earth?',[mc('A','The Moon blocking the Sun'),mc('B','Earth rotating on its axis'),mc('C','Earth revolving around the Sun'),mc('D','Clouds covering the Sun')],'B','6','easy','Earth\'s rotation on its axis causes day and night.',44],
    ['GR3SCI-D-B015','How long does it take Earth to complete one orbit around the Sun?',[mc('A','1 day'),mc('B','1 month'),mc('C','1 year'),mc('D','10 years')],'C','6','easy','Earth orbits the Sun once every year (about 365 days).',45],
    ['GR3SCI-D-B016','What type of rock is formed from cooled magma?',[mc('A','Sedimentary'),mc('B','Metamorphic'),mc('C','Igneous'),mc('D','Limestone')],'C','7','easy','Igneous rock forms when magma cools and solidifies.',46],
    ['GR3SCI-D-B017','What causes erosion?',[mc('A','Sunlight'),mc('B','Wind and water wearing away rock and soil'),mc('C','Plants growing'),mc('D','Animals digging')],'B','7','easy','Wind and water erode rock and soil over time.',47],
    ['GR3SCI-D-B018','Which form of energy does the Sun provide?',[mc('A','Electrical'),mc('B','Chemical'),mc('C','Radiant (light and heat)'),mc('D','Nuclear')],'C','8','easy','The Sun provides radiant energy — light and heat.',48],
    ['GR3SCI-D-B019','What is a conductor?',[mc('A','A material that blocks electricity'),mc('B','A material that allows electricity to flow through it'),mc('C','A type of magnet'),mc('D','A source of heat')],'B','8','easy','Conductors allow electricity to flow; metals are good conductors.',49],
    ['GR3SCI-D-B020','What is the water cycle?',[mc('A','The path water takes from clouds to oceans'),mc('B','The continuous movement of water through evaporation, condensation, and precipitation'),mc('C','The way water is cleaned'),mc('D','The flow of rivers')],'B','9','medium','The water cycle involves evaporation, condensation, and precipitation.',50],
    ['GR3SCI-D-B021','What causes rain?',[mc('A','Water evaporates from the ground'),mc('B','Water vapour condenses into droplets that fall from clouds'),mc('C','Wind blows water from the ocean'),mc('D','The Sun melts ice')],'B','9','easy','Rain forms when water vapour condenses and falls as precipitation.',51],
    ['GR3SCI-D-B022','Which natural resource is renewable?',[mc('A','Coal'),mc('B','Oil'),mc('C','Natural gas'),mc('D','Solar energy')],'D','10','easy','Solar energy is renewable — it is continuously available from the Sun.',52],
    ['GR3SCI-D-B023','What is one way to conserve water?',[mc('A','Leave taps running'),mc('B','Take shorter showers'),mc('C','Water the garden during the hottest part of the day'),mc('D','Use a hose to wash the driveway')],'B','10','easy','Taking shorter showers reduces water use.',53],
    ['GR3SCI-D-B024','What is a hypothesis?',[mc('A','A proven fact'),mc('B','A testable prediction or explanation'),mc('C','A conclusion'),mc('D','A type of data')],'B','11','easy','A hypothesis is a testable prediction made before an experiment.',54],
    ['GR3SCI-D-B025','What does a control variable do in an experiment?',[mc('A','It changes during the experiment'),mc('B','It is the thing being measured'),mc('C','It stays the same to ensure a fair test'),mc('D','It is the conclusion')],'C','11','medium','Control variables stay the same to ensure only one factor changes.',55],
    ['GR3SCI-D-B026','What tool measures temperature?',[mc('A','Ruler'),mc('B','Scale'),mc('C','Thermometer'),mc('D','Beaker')],'C','12','easy','A thermometer measures temperature.',56],
    ['GR3SCI-D-B027','What does a bar graph show?',[mc('A','How data changes over time'),mc('B','Comparisons between different categories'),mc('C','The relationship between two variables'),mc('D','Percentages of a whole')],'B','12','easy','Bar graphs compare quantities across different categories.',57],
  ];
  for (const [qId, qText, choices, ans, unit, diff, expl, sort] of qs) {
    await insertDiagQ(id, qId, qText, choices, ans, unit, diff, expl, sort);
  }
  console.log('GR3SCI Bank B done');
}

// ─── GRADE 3 SOCIAL STUDIES (GR3SS) ──────────────────────────────────────────
async function expandGr3SS() {
  const id = await getCourseId('GR3SS');
  if (!id) return;
  const qs = [
    ['GR3SS-D-B001','What is a community?',[mc('A','A large country'),mc('B','A group of people who live and work in the same area'),mc('C','A type of government'),mc('D','A school district')],'B','prerequisite','easy','A community is a group of people who live and work in the same area.',31],
    ['GR3SS-D-B002','What is a map legend?',[mc('A','A story about a map'),mc('B','A key that explains the symbols on a map'),mc('C','The title of a map'),mc('D','A compass rose')],'B','prerequisite','easy','A map legend (key) explains what the symbols on a map mean.',32],
    ['GR3SS-D-B003','What is a citizen?',[mc('A','A person who lives in another country'),mc('B','A legal member of a country or community'),mc('C','A government leader'),mc('D','A type of currency')],'B','prerequisite','easy','A citizen is a legal member of a country or community.',33],
    ['GR3SS-D-B004','What are the three levels of government in the United States?',[mc('A','City, state, and national'),mc('B','President, Congress, and courts'),mc('C','Police, fire, and schools'),mc('D','Mayor, governor, and senator')],'A','1','easy','The three levels are local (city/county), state, and national (federal).',34],
    ['GR3SS-D-B005','What is the role of a mayor?',[mc('A','To make national laws'),mc('B','To lead a city or town government'),mc('C','To command the military'),mc('D','To collect federal taxes')],'B','1','easy','A mayor is the leader of a city or town government.',35],
    ['GR3SS-D-B006','What is a cardinal direction?',[mc('A','A type of bird'),mc('B','North, South, East, or West'),mc('C','A map scale'),mc('D','A type of map projection')],'B','2','easy','Cardinal directions are North, South, East, and West.',36],
    ['GR3SS-D-B007','What does a compass rose show?',[mc('A','The size of a country'),mc('B','Directions on a map'),mc('C','The population of a city'),mc('D','The elevation of land')],'B','2','easy','A compass rose shows directions (N, S, E, W) on a map.',37],
    ['GR3SS-D-B008','What is culture?',[mc('A','A type of food'),mc('B','The beliefs, customs, and way of life of a group of people'),mc('C','A government system'),mc('D','A geographic feature')],'B','3','easy','Culture includes the beliefs, customs, and way of life shared by a group.',38],
    ['GR3SS-D-B009','What is a tradition?',[mc('A','A new invention'),mc('B','A custom or practice passed down through generations'),mc('C','A type of government'),mc('D','A geographic term')],'B','3','easy','Traditions are customs passed down through generations.',39],
    ['GR3SS-D-B010','What is the difference between needs and wants?',[mc('A','Needs are things we want; wants are things we need'),mc('B','Needs are things required to survive; wants are things we desire but don\'t need'),mc('C','Needs cost more than wants'),mc('D','There is no difference')],'B','4','easy','Needs are required for survival; wants are desired but not essential.',40],
    ['GR3SS-D-B011','What is a producer?',[mc('A','Someone who buys goods'),mc('B','Someone who makes or grows goods'),mc('C','A government official'),mc('D','A type of currency')],'B','4','easy','A producer makes or grows goods and services.',41],
    ['GR3SS-D-B012','What is a primary source?',[mc('A','A textbook about history'),mc('B','A document or artifact created at the time of an event'),mc('C','A summary written later'),mc('D','A map of a country')],'B','5','medium','Primary sources are original documents or artifacts from the time period.',42],
    ['GR3SS-D-B013','What is a secondary source?',[mc('A','An original diary entry'),mc('B','A photograph taken during an event'),mc('C','A book written later about a historical event'),mc('D','A letter written by a historical figure')],'C','5','medium','Secondary sources are created after the event, summarising or analysing primary sources.',43],
    ['GR3SS-D-B014','What is a physical feature of a place?',[mc('A','A building'),mc('B','A road'),mc('C','A mountain or river'),mc('D','A city')],'C','6','easy','Physical features are natural landforms like mountains and rivers.',44],
    ['GR3SS-D-B015','What is a human-made feature?',[mc('A','A lake'),mc('B','A forest'),mc('C','A bridge'),mc('D','A volcano')],'C','6','easy','Human-made features are things built by people, like bridges and roads.',45],
    ['GR3SS-D-B016','What does it mean to be a responsible citizen?',[mc('A','Paying taxes only'),mc('B','Following laws, voting, and helping the community'),mc('C','Doing whatever you want'),mc('D','Only obeying rules you agree with')],'B','7','easy','Responsible citizens follow laws, vote, and contribute to their community.',46],
    ['GR3SS-D-B017','What is a right?',[mc('A','Something you must do'),mc('B','A freedom or privilege guaranteed to citizens'),mc('C','A type of tax'),mc('D','A government rule')],'B','7','easy','Rights are freedoms or privileges guaranteed to citizens.',47],
    ['GR3SS-D-B018','What is migration?',[mc('A','Growing crops'),mc('B','Moving from one place to another'),mc('C','Building a community'),mc('D','Trading goods')],'B','8','easy','Migration is the movement of people from one place to another.',48],
    ['GR3SS-D-B019','Why did many people migrate to Texas in the 1800s?',[mc('A','To escape cold weather'),mc('B','For land, opportunity, and a fresh start'),mc('C','Because they were forced to'),mc('D','To attend school')],'B','8','medium','Many settlers came to Texas for land and economic opportunity.',49],
    ['GR3SS-D-B020','What is trade?',[mc('A','A type of government'),mc('B','The exchange of goods and services'),mc('C','A geographic feature'),mc('D','A cultural tradition')],'B','9','easy','Trade is the exchange of goods and services between people or countries.',50],
    ['GR3SS-D-B021','What is interdependence?',[mc('A','Being completely independent'),mc('B','Relying on others for goods and services'),mc('C','A type of government'),mc('D','A cultural practice')],'B','9','easy','Interdependence means relying on others for goods and services.',51],
    ['GR3SS-D-B022','What is a timeline?',[mc('A','A type of map'),mc('B','A visual display of events in chronological order'),mc('C','A list of important people'),mc('D','A graph of data')],'B','10','easy','A timeline shows events in the order they happened.',52],
    ['GR3SS-D-B023','What does "chronological order" mean?',[mc('A','Alphabetical order'),mc('B','Order from most to least important'),mc('C','Order from earliest to latest in time'),mc('D','Random order')],'C','10','easy','Chronological order means arranged from earliest to latest.',53],
    ['GR3SS-D-B024','What is a symbol on a map?',[mc('A','A word that describes a place'),mc('B','A picture or mark that represents something on a map'),mc('C','A type of scale'),mc('D','A compass direction')],'B','11','easy','Map symbols are pictures or marks that represent real features.',54],
    ['GR3SS-D-B025','What does a map scale tell you?',[mc('A','The direction of north'),mc('B','The meaning of symbols'),mc('C','The relationship between distance on the map and real distance'),mc('D','The population of a place')],'C','11','easy','A map scale shows how distances on the map relate to real-world distances.',55],
    ['GR3SS-D-B026','What is a biography?',[mc('A','A story about a fictional character'),mc('B','A true story about a real person\'s life'),mc('C','A type of map'),mc('D','A government document')],'B','12','easy','A biography is a true account of a real person\'s life.',56],
    ['GR3SS-D-B027','What is a community helper?',[mc('A','A person who lives in a community'),mc('B','A person whose job helps the community (e.g., firefighter, doctor)'),mc('C','A government official'),mc('D','A business owner')],'B','12','easy','Community helpers have jobs that serve and support the community.',57],
  ];
  for (const [qId, qText, choices, ans, unit, diff, expl, sort] of qs) {
    await insertDiagQ(id, qId, qText, choices, ans, unit, diff, expl, sort);
  }
  console.log('GR3SS Bank B done');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting Bank B expansion for Grade 3 courses...');
  await expandGr3Math();
  await expandGr3ELA();
  await expandGr3Sci();
  await expandGr3SS();
  console.log('Grade 3 Bank B complete.');
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
