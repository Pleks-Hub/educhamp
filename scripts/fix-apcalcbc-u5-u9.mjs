/**
 * Fix APCALCBC U5 and U9 - add missing questions with smaller prompts
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
        { role: 'system', content: 'Return only valid compact JSON, no markdown, no newlines in strings.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 800
    })
  });
  const data = await res.json();
  if (!data.choices?.[0]?.message?.content) throw new Error('No content');
  return JSON.parse(data.choices[0].message.content);
}

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

console.log('Underpopulated units:', underpopulated.map(r => `U${r.unitNumber}(${r.qCount})`).join(', '));

for (const unit of underpopulated) {
  const needed = 10 - Number(unit.qCount);
  let added = 0;
  
  for (let i = 0; i < needed; i++) {
    const prompt = `Generate 1 AP Calculus BC multiple choice question for Unit ${unit.unitNumber}: "${unit.title}". Hard difficulty.
JSON: {"q":"question text","a":"A","b":"B","c":"C","d":"D","ans":"A","exp":"brief explanation"}`;
    
    try {
      const result = await callLLM(prompt);
      const choices = [
        { label: 'A', text: result.a },
        { label: 'B', text: result.b },
        { label: 'C', text: result.c },
        { label: 'D', text: result.d }
      ];
      const existing = await q(`SELECT COUNT(*) as cnt FROM quizQuestions WHERE unitId=?`, [unit.id]);
      await exec(`
        INSERT INTO quizQuestions (unitId, questionText, questionType, choices, correctAnswer, explanation, skillTag, difficulty, sortOrder, courseId)
        VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, 'hard', ?, ?)
      `, [unit.id, result.q, JSON.stringify(choices), result.ans, result.exp || '',
          `APCALCBC-U${unit.unitNumber}-S1`, Number(existing[0].cnt), apcalcbcCourseId]);
      added++;
    } catch (e) {
      console.error(`U${unit.unitNumber} question ${i+1} failed:`, e.message);
    }
  }
  console.log(`APCALCBC U${unit.unitNumber}: added ${added}/${needed} questions`);
}

await conn.end();
console.log('Done.');
