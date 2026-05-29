/**
 * Generate Quiz Questions for Pre-K through Grade 2
 * These courses have units but 0 quiz questions.
 * Generates 5 questions per unit (2 easy, 2 medium, 1 hard).
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
        { role: 'system', content: 'You are an expert early childhood curriculum designer. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) throw new Error('No content');
  return JSON.parse(data.choices[0].message.content);
}

async function generateUnitQuestions(gradeLabel, courseTitle, unitTitle, unitNumber) {
  const prompt = `Generate exactly 5 quiz questions for ${gradeLabel} ${courseTitle}, Unit ${unitNumber}: "${unitTitle}".
These are end-of-unit assessment questions.
- 2 easy questions (basic recall/recognition)
- 2 medium questions (application/understanding)
- 1 hard question (higher-order thinking)
Each question has 4 choices (A-D) as {"label":"A","text":"..."} objects.
correctAnswer is just the letter "A", "B", "C", or "D".

Return JSON:
{"questions":[
  {"questionText":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correctAnswer":"A","explanation":"...","difficulty":"easy"}
]}`;

  const result = await callLLM(prompt);
  return (result.questions || []).slice(0, 5);
}

let totalAdded = 0;

// Get all Pre-K through Grade 2 courses with their units
const earlyCourseCodes = ['PREK-MATH','PREK-ELA','PREK-SCI','PREK-SS',
                           'K-MATH','K-ELA','K-SCI','K-SS',
                           'G1-MATH','G1-ELA','G1-SCI','G1-SS',
                           'G2-MATH','G2-ELA','G2-SCI','G2-SS'];

for (const code of earlyCourseCodes) {
  const courseRow = await q(`SELECT id, title FROM courses WHERE courseCode=?`, [code]);
  if (!courseRow.length) continue;
  const { id: courseId, title: courseTitle } = courseRow[0];
  
  const units = await q(`
    SELECT u.id, u.unitNumber, u.title, COUNT(qq.id) as qCount
    FROM units u LEFT JOIN quizQuestions qq ON qq.unitId=u.id
    WHERE u.courseId=?
    GROUP BY u.id, u.unitNumber, u.title
    ORDER BY u.unitNumber
  `, [courseId]);
  
  if (!units.length) { console.log(`${code}: no units found`); continue; }
  
  const gradeLabel = code.startsWith('PREK') ? 'Pre-K' : 
                     code.startsWith('K-') ? 'Kindergarten' :
                     code.startsWith('G1-') ? 'Grade 1' : 'Grade 2';
  
  console.log(`\n${code}: ${units.length} units`);
  
  for (const unit of units) {
    if (Number(unit.qCount) >= 5) {
      console.log(`  U${unit.unitNumber} already has ${unit.qCount} questions, skipping`);
      continue;
    }
    
    try {
      const questions = await generateUnitQuestions(gradeLabel, courseTitle, unit.title, unit.unitNumber);
      
      let sortOrder = Number(unit.qCount);
      for (const qItem of questions) {
        const skillTag = `${code}-U${unit.unitNumber}-S1`;
        await exec(`
          INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
          VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
        `, [unit.id, qItem.questionText, JSON.stringify(qItem.choices), qItem.correctAnswer,
            qItem.explanation || '', skillTag, qItem.difficulty || 'easy', sortOrder++, courseId]);
        totalAdded++;
      }
      console.log(`  U${unit.unitNumber} "${unit.title}": added ${questions.length} questions`);
    } catch (e) {
      console.error(`  U${unit.unitNumber} failed:`, e.message);
    }
  }
}

await conn.end();
console.log(`\n=== EARLY CHILDHOOD QUIZ GENERATION COMPLETE ===`);
console.log(`Total quiz questions added: ${totalAdded}`);
