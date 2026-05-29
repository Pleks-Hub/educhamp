-- ============================================================
-- EduChamp: Pre-K through Grade 2 Course Seed
-- Adds courses, units, and skills for Pre-K, Kindergarten,
-- Grade 1, and Grade 2 following the same data model as
-- existing Grades 3–9 content.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- COURSES
-- ─────────────────────────────────────────────────────────────

INSERT INTO courses (id, courseCode, title, subject, gradeLevel, description, teksAligned, isDefault, isActive, createdAt, updatedAt) VALUES

-- Pre-K
(10001, 'PREK-MATH', 'Pre-K Mathematics', 'Mathematics', 'Pre-K',
 'Foundational math concepts for Pre-K learners: counting, shapes, patterns, and early number sense through play-based activities.',
 1, 1, 1, NOW(), NOW()),
(10002, 'PREK-ELA', 'Pre-K Language Arts', 'ELA', 'Pre-K',
 'Early literacy foundations: letter recognition, phonological awareness, print concepts, and oral language development.',
 1, 0, 1, NOW(), NOW()),
(10003, 'PREK-SCI', 'Pre-K Science', 'Science', 'Pre-K',
 'Exploring the natural world through observation, curiosity, and hands-on discovery appropriate for Pre-K learners.',
 1, 0, 1, NOW(), NOW()),
(10004, 'PREK-SS', 'Pre-K Social Studies', 'Social Studies', 'Pre-K',
 'Learning about self, family, community, and the world around us through stories and activities.',
 1, 0, 1, NOW(), NOW()),

-- Kindergarten
(10101, 'K-MATH', 'Kindergarten Mathematics', 'Mathematics', 'Kindergarten',
 'Kindergarten math: counting to 100, addition and subtraction foundations, shapes, measurement, and data.',
 1, 1, 1, NOW(), NOW()),
(10102, 'K-ELA', 'Kindergarten Language Arts', 'ELA', 'Kindergarten',
 'Kindergarten literacy: phonics, sight words, reading foundational skills, writing, and speaking and listening.',
 1, 0, 1, NOW(), NOW()),
(10103, 'K-SCI', 'Kindergarten Science', 'Science', 'Kindergarten',
 'Kindergarten science: living and non-living things, weather, seasons, and basic earth science concepts.',
 1, 0, 1, NOW(), NOW()),
(10104, 'K-SS', 'Kindergarten Social Studies', 'Social Studies', 'Kindergarten',
 'Kindergarten social studies: community helpers, maps, national symbols, and basic citizenship.',
 1, 0, 1, NOW(), NOW()),

-- Grade 1
(10201, 'G1-MATH', 'Grade 1 Mathematics', 'Mathematics', '1',
 'Grade 1 math: place value, addition and subtraction within 20, measurement, geometry, and data.',
 1, 1, 1, NOW(), NOW()),
(10202, 'G1-ELA', 'Grade 1 Language Arts', 'ELA', '1',
 'Grade 1 literacy: phonics and word recognition, fluency, reading comprehension, writing, and language conventions.',
 1, 0, 1, NOW(), NOW()),
(10203, 'G1-SCI', 'Grade 1 Science', 'Science', '1',
 'Grade 1 science: properties of matter, plants and animals, earth materials, and sky and weather.',
 1, 0, 1, NOW(), NOW()),
(10204, 'G1-SS', 'Grade 1 Social Studies', 'Social Studies', '1',
 'Grade 1 social studies: family history, community, maps and globes, and basic economics.',
 1, 0, 1, NOW(), NOW()),

-- Grade 2
(10301, 'G2-MATH', 'Grade 2 Mathematics', 'Mathematics', '2',
 'Grade 2 math: place value to 1,000, addition and subtraction within 100, multiplication foundations, measurement, and geometry.',
 1, 1, 1, NOW(), NOW()),
(10302, 'G2-ELA', 'Grade 2 Language Arts', 'ELA', '2',
 'Grade 2 literacy: phonics, fluency, reading comprehension strategies, writing process, and grammar.',
 1, 0, 1, NOW(), NOW()),
(10303, 'G2-SCI', 'Grade 2 Science', 'Science', '2',
 'Grade 2 science: life cycles, habitats, properties of matter, and earth''s changing surface.',
 1, 0, 1, NOW(), NOW()),
(10304, 'G2-SS', 'Grade 2 Social Studies', 'Social Studies', '2',
 'Grade 2 social studies: government, economics, geography, and Texas and U.S. history basics.',
 1, 0, 1, NOW(), NOW())

ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Pre-K Mathematics
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10001, 1, 'Counting and Cardinality', 'Count objects to 10, one-to-one correspondence, and number names.', 'PREK-MATH-U1', 3, NOW(), NOW()),
(10001, 2, 'Shapes and Spatial Sense', 'Identify and sort 2D and 3D shapes; describe position using above, below, beside.', 'PREK-MATH-U2', 2, NOW(), NOW()),
(10001, 3, 'Patterns and Sorting', 'Create, copy, and extend simple AB patterns; sort objects by color, size, and shape.', 'PREK-MATH-U3', 2, NOW(), NOW()),
(10001, 4, 'Comparing and Measuring', 'Compare groups using more, fewer, same; compare lengths and sizes.', 'PREK-MATH-U4', 2, NOW(), NOW()),
(10001, 5, 'Numbers 1–20', 'Count forward to 20; recognize written numerals 1–10; connect quantities to numerals.', 'PREK-MATH-U5', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Pre-K ELA
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10002, 1, 'Print Awareness', 'Understand that print carries meaning; identify parts of a book; track print left to right.', 'PREK-ELA-U1', 2, NOW(), NOW()),
(10002, 2, 'Phonological Awareness', 'Recognize rhyming words; clap syllables; identify beginning sounds.', 'PREK-ELA-U2', 3, NOW(), NOW()),
(10002, 3, 'Letter Recognition', 'Identify and name all uppercase and lowercase letters of the alphabet.', 'PREK-ELA-U3', 4, NOW(), NOW()),
(10002, 4, 'Vocabulary and Oral Language', 'Build vocabulary through read-alouds; retell stories; describe pictures and events.', 'PREK-ELA-U4', 3, NOW(), NOW()),
(10002, 5, 'Early Writing', 'Write first name; draw pictures to represent ideas; form some letters.', 'PREK-ELA-U5', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Pre-K Science
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10003, 1, 'My Five Senses', 'Use sight, hearing, smell, taste, and touch to explore and describe the world.', 'PREK-SCI-U1', 2, NOW(), NOW()),
(10003, 2, 'Living and Non-Living Things', 'Distinguish between living and non-living things; observe plants and animals.', 'PREK-SCI-U2', 2, NOW(), NOW()),
(10003, 3, 'Weather and Seasons', 'Observe and describe daily weather; identify the four seasons and their characteristics.', 'PREK-SCI-U3', 2, NOW(), NOW()),
(10003, 4, 'Earth Materials', 'Explore soil, rocks, water, and air; understand basic properties.', 'PREK-SCI-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Pre-K Social Studies
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10004, 1, 'All About Me', 'Explore personal identity, family, and cultural traditions.', 'PREK-SS-U1', 2, NOW(), NOW()),
(10004, 2, 'My Family and Community', 'Understand family roles, community helpers, and rules.', 'PREK-SS-U2', 2, NOW(), NOW()),
(10004, 3, 'My World', 'Basic geography: home, school, neighborhood; land and water.', 'PREK-SS-U3', 2, NOW(), NOW()),
(10004, 4, 'Celebrations and Traditions', 'Learn about holidays, cultural celebrations, and national symbols.', 'PREK-SS-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Kindergarten Mathematics
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10101, 1, 'Counting to 100', 'Count by 1s and 10s to 100; count forward from any number; write numbers 0–20.', 'K-MATH-U1', 3, NOW(), NOW()),
(10101, 2, 'Addition Foundations', 'Understand addition as putting together; solve addition word problems within 10.', 'K-MATH-U2', 3, NOW(), NOW()),
(10101, 3, 'Subtraction Foundations', 'Understand subtraction as taking apart; solve subtraction word problems within 10.', 'K-MATH-U3', 3, NOW(), NOW()),
(10101, 4, 'Shapes and Geometry', 'Identify and describe 2D and 3D shapes; compose simple shapes.', 'K-MATH-U4', 2, NOW(), NOW()),
(10101, 5, 'Measurement and Data', 'Compare lengths, weights, and capacities; classify and count objects.', 'K-MATH-U5', 2, NOW(), NOW()),
(10101, 6, 'Numbers 11–20 (Teen Numbers)', 'Understand teen numbers as ten ones and some more; compose and decompose numbers.', 'K-MATH-U6', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Kindergarten ELA
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10102, 1, 'Phonics: Short Vowels', 'Decode CVC words with short a, e, i, o, u; blend and segment phonemes.', 'K-ELA-U1', 3, NOW(), NOW()),
(10102, 2, 'Sight Words (Dolch Pre-K & K)', 'Read and write the first 52 Dolch sight words automatically.', 'K-ELA-U2', 4, NOW(), NOW()),
(10102, 3, 'Reading Comprehension Foundations', 'Identify story elements (character, setting, events); ask and answer questions about texts.', 'K-ELA-U3', 3, NOW(), NOW()),
(10102, 4, 'Writing Sentences', 'Write simple sentences with a capital letter and ending punctuation; use spacing.', 'K-ELA-U4', 3, NOW(), NOW()),
(10102, 5, 'Phonics: Consonant Blends', 'Decode words with initial and final consonant blends (bl, cr, st, nd, etc.).', 'K-ELA-U5', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Kindergarten Science
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10103, 1, 'Living Things', 'Identify characteristics of living things; compare plants and animals.', 'K-SCI-U1', 2, NOW(), NOW()),
(10103, 2, 'Weather and Sky', 'Observe and record daily weather; identify sun, moon, and stars.', 'K-SCI-U2', 2, NOW(), NOW()),
(10103, 3, 'Properties of Objects', 'Describe objects by color, shape, size, texture, and weight.', 'K-SCI-U3', 2, NOW(), NOW()),
(10103, 4, 'Earth''s Resources', 'Identify natural resources (water, soil, air, sunlight) and their importance.', 'K-SCI-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Kindergarten Social Studies
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10104, 1, 'Community Helpers', 'Identify community helpers and their roles; understand how people depend on each other.', 'K-SS-U1', 2, NOW(), NOW()),
(10104, 2, 'Maps and Globes', 'Distinguish between maps and globes; identify land and water on a map.', 'K-SS-U2', 2, NOW(), NOW()),
(10104, 3, 'National Symbols', 'Identify U.S. flag, Pledge of Allegiance, national anthem, and other symbols.', 'K-SS-U3', 2, NOW(), NOW()),
(10104, 4, 'Needs and Wants', 'Distinguish between needs and wants; understand basic economic concepts.', 'K-SS-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 1 Mathematics
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10201, 1, 'Place Value (Tens and Ones)', 'Understand two-digit numbers as tens and ones; compare two-digit numbers.', 'G1-MATH-U1', 3, NOW(), NOW()),
(10201, 2, 'Addition within 20', 'Add within 20 using strategies; understand properties of addition; solve word problems.', 'G1-MATH-U2', 3, NOW(), NOW()),
(10201, 3, 'Subtraction within 20', 'Subtract within 20 using strategies; relate addition and subtraction; solve word problems.', 'G1-MATH-U3', 3, NOW(), NOW()),
(10201, 4, 'Measurement and Time', 'Measure lengths using non-standard units; tell time to the hour and half-hour.', 'G1-MATH-U4', 2, NOW(), NOW()),
(10201, 5, 'Geometry', 'Identify and describe 2D and 3D shapes; partition shapes into equal shares.', 'G1-MATH-U5', 2, NOW(), NOW()),
(10201, 6, 'Data and Graphs', 'Organize, represent, and interpret data using tally charts and bar graphs.', 'G1-MATH-U6', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 1 ELA
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10202, 1, 'Phonics: Long Vowels and Vowel Teams', 'Decode words with long vowel patterns (CVCe, ai, ay, ee, ea, oa, etc.).', 'G1-ELA-U1', 3, NOW(), NOW()),
(10202, 2, 'Sight Words (Dolch Grade 1)', 'Read and write all 41 Dolch Grade 1 sight words automatically.', 'G1-ELA-U2', 3, NOW(), NOW()),
(10202, 3, 'Reading Comprehension: Fiction', 'Identify story structure; describe characters, settings, and major events.', 'G1-ELA-U3', 3, NOW(), NOW()),
(10202, 4, 'Reading Comprehension: Nonfiction', 'Identify main topic and key details; use text features (headings, photos, captions).', 'G1-ELA-U4', 3, NOW(), NOW()),
(10202, 5, 'Writing: Narratives and Opinions', 'Write narrative and opinion pieces with a clear topic, details, and a closing.', 'G1-ELA-U5', 3, NOW(), NOW()),
(10202, 6, 'Grammar and Conventions', 'Use nouns, verbs, adjectives, pronouns; write complete sentences; use punctuation.', 'G1-ELA-U6', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 1 Science
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10203, 1, 'Properties of Matter', 'Describe matter by its properties; compare solids, liquids, and gases.', 'G1-SCI-U1', 2, NOW(), NOW()),
(10203, 2, 'Plants and Their Needs', 'Identify plant parts and their functions; understand what plants need to grow.', 'G1-SCI-U2', 2, NOW(), NOW()),
(10203, 3, 'Animals and Their Needs', 'Classify animals; describe animal characteristics, habitats, and basic needs.', 'G1-SCI-U3', 2, NOW(), NOW()),
(10203, 4, 'Earth Materials and Sky', 'Identify rocks, soil, and water; observe the sun, moon, and stars.', 'G1-SCI-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 1 Social Studies
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10204, 1, 'Family History and Traditions', 'Explore family history, cultural traditions, and how families change over time.', 'G1-SS-U1', 2, NOW(), NOW()),
(10204, 2, 'Community and Government', 'Understand rules and laws; identify leaders and their roles in the community.', 'G1-SS-U2', 2, NOW(), NOW()),
(10204, 3, 'Maps and Geography', 'Read simple maps; identify continents, oceans, and cardinal directions.', 'G1-SS-U3', 2, NOW(), NOW()),
(10204, 4, 'Economics: Goods and Services', 'Distinguish goods and services; understand producers and consumers.', 'G1-SS-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 2 Mathematics
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10301, 1, 'Place Value to 1,000', 'Understand hundreds, tens, and ones; read, write, and compare three-digit numbers.', 'G2-MATH-U1', 3, NOW(), NOW()),
(10301, 2, 'Addition within 100', 'Add two-digit numbers with and without regrouping; solve multi-step word problems.', 'G2-MATH-U2', 3, NOW(), NOW()),
(10301, 3, 'Subtraction within 100', 'Subtract two-digit numbers with and without regrouping; relate addition and subtraction.', 'G2-MATH-U3', 3, NOW(), NOW()),
(10301, 4, 'Multiplication Foundations', 'Understand equal groups and arrays as foundations for multiplication.', 'G2-MATH-U4', 2, NOW(), NOW()),
(10301, 5, 'Measurement: Length and Time', 'Measure lengths in inches and centimeters; tell time to the nearest 5 minutes.', 'G2-MATH-U5', 2, NOW(), NOW()),
(10301, 6, 'Geometry and Fractions', 'Identify polygons and 3D shapes; partition shapes into halves, thirds, and fourths.', 'G2-MATH-U6', 2, NOW(), NOW()),
(10301, 7, 'Money and Data', 'Count coins and bills; read and create bar graphs and line plots.', 'G2-MATH-U7', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 2 ELA
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10302, 1, 'Phonics: Digraphs and Diphthongs', 'Decode words with digraphs (ch, sh, th, wh) and diphthongs (oi, ou, ow, oy).', 'G2-ELA-U1', 3, NOW(), NOW()),
(10302, 2, 'Fluency and Sight Words', 'Read grade-level text with accuracy and appropriate rate; master Dolch Grade 2 words.', 'G2-ELA-U2', 3, NOW(), NOW()),
(10302, 3, 'Reading Comprehension: Fiction', 'Analyze story structure; describe how characters respond to challenges; compare stories.', 'G2-ELA-U3', 3, NOW(), NOW()),
(10302, 4, 'Reading Comprehension: Nonfiction', 'Identify main idea and supporting details; explain how reasons support an author''s points.', 'G2-ELA-U4', 3, NOW(), NOW()),
(10302, 5, 'Writing: Informational and Narrative', 'Write informational and narrative pieces with introduction, details, and conclusion.', 'G2-ELA-U5', 3, NOW(), NOW()),
(10302, 6, 'Grammar: Parts of Speech', 'Use collective nouns, irregular plurals, reflexive pronouns, adjectives, and adverbs.', 'G2-ELA-U6', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 2 Science
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10303, 1, 'Life Cycles', 'Describe life cycles of plants, insects, frogs, and birds; compare life cycles.', 'G2-SCI-U1', 2, NOW(), NOW()),
(10303, 2, 'Habitats and Ecosystems', 'Identify habitats (forest, desert, ocean, wetland); describe how animals adapt.', 'G2-SCI-U2', 2, NOW(), NOW()),
(10303, 3, 'Properties and Changes of Matter', 'Observe and describe properties of matter; identify physical and chemical changes.', 'G2-SCI-U3', 2, NOW(), NOW()),
(10303, 4, 'Earth''s Changing Surface', 'Identify landforms; understand how wind, water, and ice shape the earth.', 'G2-SCI-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- UNITS — Grade 2 Social Studies
-- ─────────────────────────────────────────────────────────────
INSERT INTO units (courseId, unitNumber, title, description, teksCode, estimatedWeeks, createdAt, updatedAt) VALUES
(10304, 1, 'Government and Citizenship', 'Understand local, state, and national government; rights and responsibilities of citizens.', 'G2-SS-U1', 2, NOW(), NOW()),
(10304, 2, 'Economics: Supply and Demand', 'Understand supply, demand, scarcity, and economic decision-making.', 'G2-SS-U2', 2, NOW(), NOW()),
(10304, 3, 'Geography of Texas and the U.S.', 'Identify Texas regions, major rivers, and geographic features of the United States.', 'G2-SS-U3', 2, NOW(), NOW()),
(10304, 4, 'History: American Heroes and Holidays', 'Learn about historical figures, national holidays, and significant events in U.S. history.', 'G2-SS-U4', 2, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- SKILLS — Sample skills for each unit (3 skills per unit)
-- Using the pattern: {GRADE_CODE}-U{N}-S{N}
-- ─────────────────────────────────────────────────────────────

-- Pre-K Math skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-MATH-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Core Concept'), CONCAT('Foundational understanding of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10001
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-MATH-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Application'), CONCAT('Apply ', u.title, ' concepts in simple activities'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10001
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-MATH-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Exploration'), CONCAT('Explore and extend ', u.title, ' through play'), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10001
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Pre-K ELA skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-ELA-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Core Concept'), CONCAT('Foundational understanding of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10002
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-ELA-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Practice'), CONCAT('Practice ', u.title, ' skills through activities'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10002
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-ELA-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Application'), CONCAT('Apply ', u.title, ' in reading and writing'), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10002
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Pre-K Science skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-SCI-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Observation'), CONCAT('Observe and describe ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10003
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-SCI-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Exploration'), CONCAT('Explore ', u.title, ' through hands-on activities'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10003
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Pre-K Social Studies skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-SS-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Understanding'), CONCAT('Understand basic concepts of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10004
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('PREK-SS-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Connection'), CONCAT('Connect ', u.title, ' to personal experience'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10004
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Kindergarten Math skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-MATH-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Core Concept'), CONCAT('Master the core concept of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10101
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-MATH-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Problem Solving'), CONCAT('Solve problems involving ', u.title), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10101
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-MATH-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Word Problems'), CONCAT('Apply ', u.title, ' to real-world word problems'), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10101
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Kindergarten ELA skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-ELA-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Recognition'), CONCAT('Recognize and identify ', u.title, ' patterns'), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10102
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-ELA-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Application'), CONCAT('Apply ', u.title, ' in reading and writing'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10102
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-ELA-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Fluency'), CONCAT('Build fluency with ', u.title), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10102
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Kindergarten Science skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-SCI-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Observation'), CONCAT('Observe and describe ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10103
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-SCI-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Inquiry'), CONCAT('Ask questions and investigate ', u.title), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10103
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Kindergarten Social Studies skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-SS-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Understanding'), CONCAT('Understand key concepts of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10104
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('K-SS-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Application'), CONCAT('Apply knowledge of ', u.title, ' to everyday life'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10104
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 1 Math skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-MATH-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Core Concept'), CONCAT('Master the core concept of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10201
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-MATH-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Problem Solving'), CONCAT('Solve problems involving ', u.title), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10201
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-MATH-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Word Problems'), CONCAT('Apply ', u.title, ' to real-world word problems'), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10201
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 1 ELA skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-ELA-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Recognition'), CONCAT('Recognize and identify ', u.title, ' patterns'), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10202
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-ELA-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Application'), CONCAT('Apply ', u.title, ' in reading and writing'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10202
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-ELA-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Fluency'), CONCAT('Build fluency with ', u.title), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10202
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 1 Science skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-SCI-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Core Concept'), CONCAT('Understand core concepts of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10203
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-SCI-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Investigation'), CONCAT('Investigate and explain ', u.title), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10203
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 1 Social Studies skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-SS-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Understanding'), CONCAT('Understand key concepts of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10204
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G1-SS-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Application'), CONCAT('Apply knowledge of ', u.title, ' to everyday life'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10204
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 2 Math skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-MATH-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Core Concept'), CONCAT('Master the core concept of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10301
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-MATH-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Problem Solving'), CONCAT('Solve problems involving ', u.title), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10301
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-MATH-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Word Problems'), CONCAT('Apply ', u.title, ' to real-world word problems'), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10301
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 2 ELA skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-ELA-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Recognition'), CONCAT('Recognize and identify ', u.title, ' patterns'), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10302
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-ELA-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Application'), CONCAT('Apply ', u.title, ' in reading and writing'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10302
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-ELA-U', u.unitNumber, '-S3'), CONCAT(u.title, ': Fluency'), CONCAT('Build fluency with ', u.title), 3, NOW(), NOW()
FROM units u WHERE u.courseId = 10302
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 2 Science skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-SCI-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Core Concept'), CONCAT('Understand core concepts of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10303
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-SCI-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Investigation'), CONCAT('Investigate and explain ', u.title), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10303
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- Grade 2 Social Studies skills
INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-SS-U', u.unitNumber, '-S1'), CONCAT(u.title, ': Understanding'), CONCAT('Understand key concepts of ', u.title), 1, NOW(), NOW()
FROM units u WHERE u.courseId = 10304
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

INSERT INTO skills (unitId, skillId, title, description, orderIndex, createdAt, updatedAt)
SELECT u.id, CONCAT('G2-SS-U', u.unitNumber, '-S2'), CONCAT(u.title, ': Application'), CONCAT('Apply knowledge of ', u.title, ' to everyday life'), 2, NOW(), NOW()
FROM units u WHERE u.courseId = 10304
ON DUPLICATE KEY UPDATE title=VALUES(title), updatedAt=NOW();

-- ─────────────────────────────────────────────────────────────
-- VERIFY
-- ─────────────────────────────────────────────────────────────
SELECT gradeLevel, COUNT(DISTINCT c.id) as courses, COUNT(DISTINCT u.id) as units, COUNT(DISTINCT s.id) as skills
FROM courses c
LEFT JOIN units u ON u.courseId = c.id
LEFT JOIN skills s ON s.unitId = u.id
WHERE c.gradeLevel IN ('Pre-K', 'Kindergarten', '1', '2')
GROUP BY c.gradeLevel
ORDER BY FIELD(c.gradeLevel, 'Pre-K', 'Kindergarten', '1', '2');
