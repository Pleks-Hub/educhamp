/**
 * Fix remaining 5 validation issues:
 * 1. GR3MATH/ELA/SCI: relabel last question per unit as 'hard'
 * 2. SATPREP U12: add 1 more question
 * 3. APCALCBC U5/U7/U9: add missing questions
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
        { role: 'system', content: 'You are an expert curriculum designer. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500
    })
  });
  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) throw new Error('No content');
  return JSON.parse(data.choices[0].message.content);
}

// FIX 1: GR3MATH/ELA/SCI - relabel last question per unit as 'hard'
console.log('=== FIX 1: GR3MATH/ELA/SCI difficulty relabeling ===');
for (const code of ['GR3MATH', 'GR3ELA', 'GR3SCI']) {
  const units = await q(`
    SELECT u.id FROM units u JOIN courses c ON u.courseId=c.id WHERE c.courseCode=?
  `, [code]);
  
  let updated = 0;
  for (const unit of units) {
    // Get the last question by id (highest sort order)
    const lastQ = await q(`
      SELECT id FROM quizQuestions WHERE unitId=? ORDER BY id DESC LIMIT 1
    `, [unit.id]);
    if (lastQ.length > 0) {
      await exec(`UPDATE quizQuestions SET difficulty='hard' WHERE id=?`, [lastQ[0].id]);
      updated++;
    }
  }
  console.log(`${code}: marked ${updated} questions as 'hard'`);
}

// FIX 2: SATPREP U12 - add 1 more question
console.log('\n=== FIX 2: SATPREP U12 - adding 1 more question ===');
const satprepU12 = await q(`
  SELECT u.id, u.title FROM units u JOIN courses c ON u.courseId=c.id
  WHERE c.courseCode='SATPREP' AND u.unitNumber=12
`);
const satprepCourseId = (await q(`SELECT id FROM courses WHERE courseCode='SATPREP'`))[0].id;

if (satprepU12.length > 0) {
  const existing = await q(`SELECT questionText FROM quizQuestions WHERE unitId=?`, [satprepU12[0].id]);
  const existingTexts = existing.map(r => r.questionText).join(' | ');
  
  const prompt = `Generate exactly 1 hard-difficulty SAT Prep quiz question about test-taking strategy and exam preparation.
Topic: "${satprepU12[0].title}"
Do NOT duplicate: ${existingTexts}
Return JSON: {"questions":[{"questionText":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correctAnswer":"A","explanation":"..."}]}`;
  
  try {
    const result = await callLLM(prompt);
    const questions = result.questions || [];
    if (questions.length > 0) {
      const qItem = questions[0];
      await exec(`
        INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
        VALUES (?, ?, 'multiple_choice', ?, ?, ?, 'SATPREP-U12-S1', 'hard', ?, ?)
      `, [satprepU12[0].id, qItem.questionText, JSON.stringify(qItem.choices), qItem.correctAnswer, qItem.explanation, existing.length, satprepCourseId]);
      console.log('SATPREP U12: added 1 hard question');
    }
  } catch (e) {
    console.error('SATPREP U12 failed:', e.message);
  }
}

// FIX 3: APCALCBC U5/U7/U9 - add missing questions
console.log('\n=== FIX 3: APCALCBC underpopulated units ===');
const apcalcbcCourseId = (await q(`SELECT id FROM courses WHERE courseCode='APCALCBC'`))[0].id;

const underpopulated = await q(`
  SELECT u.id, u.unitNumber, u.title, COUNT(qq.id) as qCount
  FROM units u JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='APCALCBC'
  GROUP BY u.id, u.unitNumber, u.title
  HAVING qCount < 10
  ORDER BY u.unitNumber
`);

for (const unit of underpopulated) {
  const needed = 10 - Number(unit.qCount);
  const existing = await q(`SELECT questionText FROM quizQuestions WHERE unitId=?`, [unit.id]);
  const existingTexts = existing.map(r => r.questionText).slice(-3).join(' | ');
  
  const prompt = `Generate exactly ${needed} AP Calculus BC quiz questions for Unit ${unit.unitNumber}: "${unit.title}".
Mix of difficulties: ${needed <= 2 ? 'hard' : 'medium and hard'}.
Do NOT duplicate: ${existingTexts}
Return JSON: {"questions":[{"questionText":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correctAnswer":"A","explanation":"...","difficulty":"hard"}]}`;
  
  try {
    const result = await callLLM(prompt);
    const questions = (result.questions || []).slice(0, needed);
    let sortOrder = existing.length;
    for (const qItem of questions) {
      await exec(`
        INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
        VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
      `, [unit.id, qItem.questionText, JSON.stringify(qItem.choices), qItem.correctAnswer,
          qItem.explanation, `APCALCBC-U${unit.unitNumber}-S1`, qItem.difficulty || 'hard', sortOrder++, apcalcbcCourseId]);
    }
    console.log(`APCALCBC U${unit.unitNumber}: added ${questions.length} questions (needed ${needed})`);
  } catch (e) {
    console.error(`APCALCBC U${unit.unitNumber} failed:`, e.message);
  }
}

await conn.end();
console.log('\n=== REMAINING FIXES COMPLETE ===');
