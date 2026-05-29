/**
 * Generate Diagnostic Questions for Pre-K through Grade 2
 * Uses small 5-question batches to avoid LLM token truncation.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
async function q(sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}
async function exec(sql, params = []) {
  const [result] = await conn.query(sql, params);
  return result;
}

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function callLLM(prompt) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FORGE_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert early childhood curriculum designer. Return only valid JSON with no trailing commas.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) throw new Error('No content in response');
  return JSON.parse(data.choices[0].message.content);
}

async function generate5Questions(gradeLabel, subject, topic, difficulty, courseCode, existingTexts = []) {
  const avoid = existingTexts.slice(-3).join(' | ');
  const prompt = `Generate exactly 5 ${difficulty}-difficulty diagnostic questions for ${gradeLabel} ${subject}, topic: "${topic}".
Age-appropriate for ${gradeLabel} students.
Each question must have 4 choices labeled A-D.
Do NOT duplicate: ${avoid || 'nothing yet'}

Return JSON:
{"questions":[
  {"questionText":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correctAnswer":"A","explanation":"..."}
]}`;

  const result = await callLLM(prompt);
  return (result.questions || []).slice(0, 5);
}

let totalAdded = 0;

const earlyCourses = [
  { code: 'PREK-ELA', gradeLabel: 'Pre-K', subject: 'Language Arts',
    topics: ['Letter recognition A-M', 'Letter recognition N-Z', 'Beginning sounds', 'Rhyming words'] },
  { code: 'PREK-SCI', gradeLabel: 'Pre-K', subject: 'Science',
    topics: ['Living vs non-living things', 'Weather types', 'Plant parts', 'Animal identification'] },
  { code: 'PREK-SS', gradeLabel: 'Pre-K', subject: 'Social Studies',
    topics: ['Family members and roles', 'Community helpers', 'School rules and routines', 'Feelings and emotions'] },
  { code: 'K-MATH', gradeLabel: 'Kindergarten', subject: 'Mathematics',
    topics: ['Counting to 20', 'Number order and comparison', 'Basic shapes', 'Addition within 5', 'Measurement concepts'] },
  { code: 'K-ELA', gradeLabel: 'Kindergarten', subject: 'Language Arts',
    topics: ['Phonics and CVC words', 'Sight words (Dolch)', 'Story comprehension', 'Print concepts', 'Rhyme and alliteration'] },
  { code: 'K-SCI', gradeLabel: 'Kindergarten', subject: 'Science',
    topics: ['Seasons and weather', 'Animal habitats', 'Plant growth stages', 'Five senses'] },
  { code: 'K-SS', gradeLabel: 'Kindergarten', subject: 'Social Studies',
    topics: ['Maps and directions', 'Community helpers and roles', 'American symbols and holidays', 'Needs vs wants'] },
  { code: 'G1-MATH', gradeLabel: 'Grade 1', subject: 'Mathematics',
    topics: ['Addition within 20', 'Subtraction within 20', 'Place value (tens and ones)', 'Telling time to the hour', 'Measurement and data'] },
  { code: 'G1-ELA', gradeLabel: 'Grade 1', subject: 'Language Arts',
    topics: ['Phonics blends and digraphs', 'Reading comprehension', 'Vocabulary in context', 'Main idea and details', 'Sentence structure'] },
  { code: 'G1-SCI', gradeLabel: 'Grade 1', subject: 'Science',
    topics: ['Earth materials (rocks/soil)', 'Light and sound', 'Animal life cycles', 'Weather and seasons'] },
  { code: 'G1-SS', gradeLabel: 'Grade 1', subject: 'Social Studies',
    topics: ['Maps and globes', 'Community history', 'Economic concepts (goods/services)', 'Citizenship and rules'] },
  { code: 'G2-MATH', gradeLabel: 'Grade 2', subject: 'Mathematics',
    topics: ['Addition and subtraction within 100', 'Place value to 1000', 'Measurement in inches and centimeters', 'Geometry and shapes', 'Skip counting and patterns'] },
  { code: 'G2-ELA', gradeLabel: 'Grade 2', subject: 'Language Arts',
    topics: ['Reading fluency and comprehension', 'Text structure (main idea/details)', 'Vocabulary and word meaning', 'Writing (opinion and narrative)', 'Grammar (nouns, verbs, adjectives)'] },
  { code: 'G2-SCI', gradeLabel: 'Grade 2', subject: 'Science',
    topics: ['States of matter (solid/liquid/gas)', 'Ecosystems and food chains', 'Earth changes (erosion/weathering)', 'Engineering design process'] },
  { code: 'G2-SS', gradeLabel: 'Grade 2', subject: 'Social Studies',
    topics: ['Geography of Texas', 'Texas history and culture', 'Government roles (local/state)', 'Cultural traditions and holidays'] },
];

for (const course of earlyCourses) {
  console.log(`\nGenerating diagnostics for ${course.code}...`);
  
  const courseRow = await q(`SELECT id FROM courses WHERE courseCode=?`, [course.code]);
  if (!courseRow.length) { console.log(`  Course ${course.code} not found, skipping`); continue; }
  const courseId = courseRow[0].id;
  
  const existingCount = await q(`SELECT COUNT(*) as cnt FROM diagnosticQuestions WHERE courseId=?`, [courseId]);
  if (Number(existingCount[0].cnt) >= 20) { console.log(`  Already has ${existingCount[0].cnt} questions, skipping`); continue; }
  
  let sortOrder = Number(existingCount[0].cnt);
  const existingTexts = [];
  let courseAdded = 0;
  
  // Generate 5 questions per topic (4 topics × 5 = 20 questions)
  const difficultyMap = ['easy', 'easy', 'medium', 'hard'];
  
  for (let i = 0; i < course.topics.length; i++) {
    const topic = course.topics[i];
    const difficulty = difficultyMap[i] || 'medium';
    
    try {
      const questions = await generate5Questions(course.gradeLabel, course.subject, topic, difficulty, course.code, existingTexts);
      
      for (const qItem of questions) {
        const questionId = `${course.code}-D-${String(sortOrder + 1).padStart(3, '0')}`;
        await exec(`
          INSERT INTO diagnosticQuestions 
          (courseId, questionId, questionText, questionType, choices, correctAnswer, mapsToUnit, mapsToSkills, difficulty, explanation, sortOrder)
          VALUES (?, ?, ?, 'multiple_choice', ?, ?, ?, '[]', ?, ?, ?)
        `, [courseId, questionId, qItem.questionText, JSON.stringify(qItem.choices),
            qItem.correctAnswer, String(i + 1), difficulty, qItem.explanation || '', sortOrder]);
        sortOrder++;
        totalAdded++;
        courseAdded++;
        existingTexts.push(qItem.questionText);
      }
      console.log(`  ${course.code} topic "${topic}": added ${questions.length} ${difficulty} questions`);
    } catch (e) {
      console.error(`  Failed for ${course.code} topic "${topic}":`, e.message);
    }
  }
  
  console.log(`  ${course.code}: total added ${courseAdded} questions`);
}

await conn.end();
console.log(`\n=== EARLY CHILDHOOD DIAGNOSTICS COMPLETE ===`);
console.log(`Total diagnostic questions added: ${totalAdded}`);
