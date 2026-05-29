/**
 * Generate Missing Quiz Questions
 * Uses the built-in LLM to generate educationally sound questions for:
 * 1. APCALCBC units 4-12 (need 5 more each = 45 questions)
 * 2. SATPREP U12 (need 9 more questions)
 * 3. GR3SS units 1-6 (need 3 more each for a total of 6/unit)
 * 4. GR3MATH/ELA/SCI units (need to add medium/hard questions)
 */
import mysql from 'mysql2/promise';
// Using native fetch (Node 22)

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

async function callLLM(systemPrompt, userPrompt) {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FORGE_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })
  });
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateQuestions(courseCode, unitNumber, unitTitle, count, difficulty, existingTexts = []) {
  const systemPrompt = `You are an expert curriculum designer creating high-quality multiple choice quiz questions for a ${courseCode} course, Unit ${unitNumber}: ${unitTitle}. 
Generate exactly ${count} questions at ${difficulty} difficulty level.
Each question must:
- Be clearly worded and unambiguous
- Have exactly 4 answer choices labeled A, B, C, D
- Have exactly one correct answer
- Include a clear explanation of why the answer is correct
- Be appropriate for the course level and unit topic
- NOT duplicate any of these existing questions: ${existingTexts.slice(0,5).join(' | ')}

Return JSON: { "questions": [ { "questionText": "...", "choices": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}], "correctAnswer": "A", "explanation": "..." } ] }`;

  const userPrompt = `Generate ${count} ${difficulty}-difficulty multiple choice questions for ${courseCode} Unit ${unitNumber}: ${unitTitle}`;
  
  try {
    const result = await callLLM(systemPrompt, userPrompt);
    return result.questions || [];
  } catch (e) {
    console.error(`Failed to generate questions for ${courseCode} U${unitNumber}:`, e.message);
    return [];
  }
}

let totalAdded = 0;

// ─── APCALCBC: Add 5 more questions to units 4-12 ─────────────────────────────
console.log('\n=== Generating APCALCBC missing questions ===');

const apcalcbcUnits = await q(`
  SELECT u.id, u.unitNumber, u.title, COUNT(qq.id) as qCount
  FROM units u JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='APCALCBC'
  GROUP BY u.id, u.unitNumber, u.title
  HAVING qCount < 10
  ORDER BY u.unitNumber
`);

console.log(`APCALCBC units needing questions: ${apcalcbcUnits.map(r => `U${r.unitNumber}(${r.qCount})`).join(', ')}`);

const apcalcbcCourseId = (await q(`SELECT id FROM courses WHERE courseCode='APCALCBC'`))[0].id;

for (const unit of apcalcbcUnits) {
  const needed = 10 - Number(unit.qCount);
  const existing = await q(`SELECT questionText FROM quizQuestions WHERE unitId=?`, [unit.id]);
  const existingTexts = existing.map(r => r.questionText);
  
  // Determine difficulty distribution for the new questions
  const currentDist = await q(`
    SELECT difficulty, COUNT(*) as cnt FROM quizQuestions WHERE unitId=? GROUP BY difficulty
  `, [unit.id]);
  
  const difficulties = [];
  for (let i = 0; i < needed; i++) {
    if (i < Math.ceil(needed * 0.4)) difficulties.push('easy');
    else if (i < Math.ceil(needed * 0.7)) difficulties.push('medium');
    else difficulties.push('hard');
  }
  
  // Generate in batches by difficulty
  const diffGroups = {};
  difficulties.forEach(d => { diffGroups[d] = (diffGroups[d] || 0) + 1; });
  
  let sortOrder = existing.length;
  for (const [diff, cnt] of Object.entries(diffGroups)) {
    const questions = await generateQuestions('AP Calculus BC', unit.unitNumber, unit.title, cnt, diff, existingTexts);
    
    for (const q_item of questions) {
      await exec(`
        INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
        VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
      `, [unit.id, q_item.questionText, JSON.stringify(q_item.choices), q_item.correctAnswer,
          q_item.explanation, `APCALCBC-U${unit.unitNumber}-S1`, diff, sortOrder++, apcalcbcCourseId]);
      totalAdded++;
      existingTexts.push(q_item.questionText);
    }
  }
  console.log(`APCALCBC U${unit.unitNumber}: added ${needed} questions`);
}

// ─── SATPREP U12: Add 9 more questions ────────────────────────────────────────
console.log('\n=== Generating SATPREP U12 missing questions ===');

const satprepU12Unit = await q(`
  SELECT u.id, u.title FROM units u JOIN courses c ON u.courseId=c.id
  WHERE c.courseCode='SATPREP' AND u.unitNumber=12
`);

if (satprepU12Unit.length > 0) {
  const satprepCourseId = (await q(`SELECT id FROM courses WHERE courseCode='SATPREP'`))[0].id;
  const existing = await q(`SELECT questionText FROM quizQuestions WHERE unitId=?`, [satprepU12Unit[0].id]);
  const existingTexts = existing.map(r => r.questionText);
  
  // Generate 9 more questions (3 easy, 3 medium, 3 hard)
  for (const [diff, cnt] of [['easy', 3], ['medium', 3], ['hard', 3]]) {
    const questions = await generateQuestions('SAT Prep', 12, satprepU12Unit[0].title, cnt, diff, existingTexts);
    let sortOrder = existing.length;
    for (const q_item of questions) {
      await exec(`
        INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
        VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
      `, [satprepU12Unit[0].id, q_item.questionText, JSON.stringify(q_item.choices), q_item.correctAnswer,
          q_item.explanation, 'SATPREP-U12-S1', diff, sortOrder++, satprepCourseId]);
      totalAdded++;
      existingTexts.push(q_item.questionText);
    }
  }
  console.log(`SATPREP U12: added 9 questions`);
}

// ─── GR3SS: Add 3 more questions per unit ─────────────────────────────────────
console.log('\n=== Generating GR3SS additional questions ===');

const gr3ssUnits = await q(`
  SELECT u.id, u.unitNumber, u.title, COUNT(qq.id) as qCount
  FROM units u JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='GR3SS'
  GROUP BY u.id, u.unitNumber, u.title
  HAVING qCount < 6
  ORDER BY u.unitNumber
`);

const gr3ssCourseId = (await q(`SELECT id FROM courses WHERE courseCode='GR3SS'`))[0].id;

for (const unit of gr3ssUnits) {
  const needed = 6 - Number(unit.qCount);
  const existing = await q(`SELECT questionText FROM quizQuestions WHERE unitId=?`, [unit.id]);
  const existingTexts = existing.map(r => r.questionText);
  
  // For 3rd grade, use easy/medium
  const questions = await generateQuestions('3rd Grade Social Studies', unit.unitNumber, unit.title, needed, needed > 1 ? 'medium' : 'hard', existingTexts);
  let sortOrder = existing.length;
  for (const q_item of questions) {
    const diff = sortOrder < 3 ? 'easy' : sortOrder < 5 ? 'medium' : 'hard';
    await exec(`
      INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
      VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
    `, [unit.id, q_item.questionText, JSON.stringify(q_item.choices), q_item.correctAnswer,
        q_item.explanation, `GR3SS-U${unit.unitNumber}-S1`, diff, sortOrder++, gr3ssCourseId]);
    totalAdded++;
    existingTexts.push(q_item.questionText);
  }
  console.log(`GR3SS U${unit.unitNumber}: added ${needed} questions`);
}

// ─── G8SS: Add 5 more questions per unit ──────────────────────────────────────
console.log('\n=== Generating G8SS additional questions ===');

const g8ssUnits = await q(`
  SELECT u.id, u.unitNumber, u.title, COUNT(qq.id) as qCount
  FROM units u JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='G8SS'
  GROUP BY u.id, u.unitNumber, u.title
  ORDER BY u.unitNumber
`);

console.log('G8SS per unit:', g8ssUnits.map(r => `U${r.unitNumber}:${r.qCount}`).join(' '));

const g8ssCourseId = (await q(`SELECT id FROM courses WHERE courseCode='G8SS'`))[0].id;

for (const unit of g8ssUnits) {
  if (Number(unit.qCount) >= 10) continue;
  const needed = 10 - Number(unit.qCount);
  const existing = await q(`SELECT questionText FROM quizQuestions WHERE unitId=?`, [unit.id]);
  const existingTexts = existing.map(r => r.questionText);
  
  const questions = await generateQuestions('Grade 8 U.S. History', unit.unitNumber, unit.title, needed, 'medium', existingTexts);
  let sortOrder = existing.length;
  for (const q_item of questions) {
    const diff = sortOrder < 2 ? 'easy' : sortOrder < 4 ? 'medium' : 'hard';
    await exec(`
      INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
      VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, ?, ?, ?)
    `, [unit.id, q_item.questionText, JSON.stringify(q_item.choices), q_item.correctAnswer,
        q_item.explanation, `G8SS-U${unit.unitNumber}-S1`, diff, sortOrder++, g8ssCourseId]);
    totalAdded++;
  }
  console.log(`G8SS U${unit.unitNumber}: added ${needed} questions`);
}

await conn.end();

console.log(`\n=== GENERATION COMPLETE ===`);
console.log(`Total questions added: ${totalAdded}`);
