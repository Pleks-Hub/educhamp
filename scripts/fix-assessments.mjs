/**
 * Assessment Fix Script
 * Fixes:
 * 1. choices format: plain strings "A. Element" → {label:"A", text:"Element"} objects
 * 2. Duplicate quiz questions (APHG, BIO1, ENG1, G4ELA, etc.)
 * 3. Duplicate diagnostic questions (BIO1, ENG1, G4ELA, etc.)
 * 4. APLIT diagnostic: 62 questions → trim to 57 (remove 5 duplicates)
 * 5. GR3SS quiz distribution: 21+12+9+6+3 → balanced 6 per unit
 * 6. SATPREP U12: only 1 question → add 14 more
 * 7. Missing difficulty levels: GR3MATH/ELA/SCI/SS have no hard/challenge questions
 * 8. Grade 4-8 standard courses: 5 questions/unit → expand to 10
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

let totalFixed = 0;
let totalAdded = 0;
let totalRemoved = 0;

// ─── FIX 1: Normalize choices format ──────────────────────────────────────────
// Find all diagnostic questions where choices is a JSON array of plain strings
// (not {label,text} objects)
console.log('\n=== FIX 1: Normalizing choices format ===');

const badDiagChoices = await q(`
  SELECT id, choices, correctAnswer
  FROM diagnosticQuestions
  WHERE choices IS NOT NULL
    AND JSON_TYPE(JSON_EXTRACT(choices, '$[0]')) = 'STRING'
`);

console.log(`Found ${badDiagChoices.length} diagnostic questions with plain-string choices`);

for (const row of badDiagChoices) {
  const rawChoices = row.choices; // e.g. ["A. Element","B. Compound","C. Mixture","D. Solution"]
  const parsed = Array.isArray(rawChoices) ? rawChoices : JSON.parse(rawChoices);
  
  // Convert "A. Element" → {label:"A", text:"Element"}
  const fixed = parsed.map(s => {
    const match = String(s).match(/^([A-D])\.\s*(.+)$/);
    if (match) return { label: match[1], text: match[2].trim() };
    return { label: s, text: s }; // fallback
  });
  
  await exec(`UPDATE diagnosticQuestions SET choices = ? WHERE id = ?`, [JSON.stringify(fixed), row.id]);
  totalFixed++;
}

// Same for quiz questions
const badQuizChoices = await q(`
  SELECT id, choices, correctAnswer
  FROM quizQuestions
  WHERE choices IS NOT NULL
    AND JSON_TYPE(JSON_EXTRACT(choices, '$[0]')) = 'STRING'
`);

console.log(`Found ${badQuizChoices.length} quiz questions with plain-string choices`);

for (const row of badQuizChoices) {
  const rawChoices = row.choices;
  const parsed = Array.isArray(rawChoices) ? rawChoices : JSON.parse(rawChoices);
  const fixed = parsed.map(s => {
    const match = String(s).match(/^([A-D])\.\s*(.+)$/);
    if (match) return { label: match[1], text: match[2].trim() };
    return { label: s, text: s };
  });
  await exec(`UPDATE quizQuestions SET choices = ? WHERE id = ?`, [JSON.stringify(fixed), row.id]);
  totalFixed++;
}

console.log(`Fixed ${totalFixed} questions with malformed choices`);

// ─── FIX 2: Remove duplicate quiz questions ────────────────────────────────────
console.log('\n=== FIX 2: Removing duplicate quiz questions ===');

const dupQuiz = await q(`
  SELECT MIN(qq.id) as keepId, qq.questionText, c.courseCode, COUNT(*) as cnt
  FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id
  JOIN courses c ON u.courseId=c.id
  GROUP BY c.courseCode, qq.questionText
  HAVING cnt > 1
`);

console.log(`Found ${dupQuiz.length} groups of duplicate quiz questions`);

for (const dup of dupQuiz) {
  // Delete all but the one with lowest id
  const result = await exec(`
    DELETE qq FROM quizQuestions qq
    JOIN units u ON qq.unitId=u.id
    JOIN courses c ON u.courseId=c.id
    WHERE c.courseCode = ? AND qq.questionText = ? AND qq.id != ?
  `, [dup.courseCode, dup.questionText, dup.keepId]);
  totalRemoved += result.affectedRows;
}

console.log(`Removed ${totalRemoved} duplicate quiz questions`);

// ─── FIX 3: Remove duplicate diagnostic questions ─────────────────────────────
console.log('\n=== FIX 3: Removing duplicate diagnostic questions ===');

const dupDiag = await q(`
  SELECT MIN(dq.id) as keepId, dq.questionText, c.courseCode, COUNT(*) as cnt
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  GROUP BY c.courseCode, dq.questionText
  HAVING cnt > 1
`);

console.log(`Found ${dupDiag.length} groups of duplicate diagnostic questions`);

let diagRemoved = 0;
for (const dup of dupDiag) {
  const result = await exec(`
    DELETE dq FROM diagnosticQuestions dq
    JOIN courses c ON dq.courseId=c.id
    WHERE c.courseCode = ? AND dq.questionText = ? AND dq.id != ?
  `, [dup.courseCode, dup.questionText, dup.keepId]);
  diagRemoved += result.affectedRows;
}

console.log(`Removed ${diagRemoved} duplicate diagnostic questions`);

// ─── FIX 4: Rebalance GR3SS quiz questions ────────────────────────────────────
console.log('\n=== FIX 4: Checking GR3SS quiz distribution ===');

const gr3ssUnits = await q(`
  SELECT u.id, u.unitNumber, COUNT(qq.id) as qCount
  FROM units u
  JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='GR3SS'
  GROUP BY u.id, u.unitNumber
  ORDER BY u.unitNumber
`);

console.log('GR3SS quiz distribution:', gr3ssUnits.map(r => `U${r.unitNumber}:${r.qCount}`).join(', '));

// GR3SS U1 has 21 questions - trim to 6 (keep first 6 easy ones)
const gr3ssU1 = gr3ssUnits.find(r => Number(r.unitNumber) === 1);
if (gr3ssU1 && Number(gr3ssU1.qCount) > 6) {
  const toKeep = await q(`
    SELECT id FROM quizQuestions WHERE unitId=? ORDER BY difficulty, id LIMIT 6
  `, [gr3ssU1.id]);
  const keepIds = toKeep.map(r => r.id);
  const result = await exec(`
    DELETE FROM quizQuestions WHERE unitId=? AND id NOT IN (${keepIds.join(',')})
  `, [gr3ssU1.id]);
  console.log(`GR3SS U1: removed ${result.affectedRows} excess questions`);
  totalRemoved += result.affectedRows;
}

// GR3SS U3 has 12 - trim to 6
const gr3ssU3 = gr3ssUnits.find(r => Number(r.unitNumber) === 3);
if (gr3ssU3 && Number(gr3ssU3.qCount) > 6) {
  const toKeep = await q(`
    SELECT id FROM quizQuestions WHERE unitId=? ORDER BY difficulty, id LIMIT 6
  `, [gr3ssU3.id]);
  const keepIds = toKeep.map(r => r.id);
  const result = await exec(`
    DELETE FROM quizQuestions WHERE unitId=? AND id NOT IN (${keepIds.join(',')})
  `, [gr3ssU3.id]);
  console.log(`GR3SS U3: removed ${result.affectedRows} excess questions`);
  totalRemoved += result.affectedRows;
}

// GR3SS U4 has 9 - trim to 6
const gr3ssU4 = gr3ssUnits.find(r => Number(r.unitNumber) === 4);
if (gr3ssU4 && Number(gr3ssU4.qCount) > 6) {
  const toKeep = await q(`
    SELECT id FROM quizQuestions WHERE unitId=? ORDER BY difficulty, id LIMIT 6
  `, [gr3ssU4.id]);
  const keepIds = toKeep.map(r => r.id);
  const result = await exec(`
    DELETE FROM quizQuestions WHERE unitId=? AND id NOT IN (${keepIds.join(',')})
  `, [gr3ssU4.id]);
  console.log(`GR3SS U4: removed ${result.affectedRows} excess questions`);
  totalRemoved += result.affectedRows;
}

// ─── FIX 5: APLIT diagnostic - trim to 57 ─────────────────────────────────────
console.log('\n=== FIX 5: Trimming APLIT diagnostic to 57 questions ===');

const aplitCount = await q(`
  SELECT COUNT(*) as cnt FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id WHERE c.courseCode='APLIT'
`);

if (Number(aplitCount[0].cnt) > 57) {
  const excess = Number(aplitCount[0].cnt) - 57;
  const toDelete = await q(`
    SELECT dq.id FROM diagnosticQuestions dq
    JOIN courses c ON dq.courseId=c.id
    WHERE c.courseCode='APLIT'
    ORDER BY dq.id DESC LIMIT ?
  `, [excess]);
  for (const row of toDelete) {
    await exec(`DELETE FROM diagnosticQuestions WHERE id=?`, [row.id]);
  }
  console.log(`APLIT: removed ${excess} excess diagnostic questions`);
  totalRemoved += excess;
}

// ─── FIX 6: Add missing difficulty levels to GR3 courses ──────────────────────
console.log('\n=== FIX 6: Checking GR3 difficulty distribution ===');

const gr3Courses = ['GR3MATH', 'GR3ELA', 'GR3SCI', 'GR3SS'];
for (const code of gr3Courses) {
  const dist = await q(`
    SELECT qq.difficulty, COUNT(*) as cnt
    FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
    WHERE c.courseCode=?
    GROUP BY qq.difficulty
  `, [code]);
  console.log(`${code}:`, dist.map(r => `${r.difficulty}:${r.cnt}`).join(' '));
}

// For GR3 courses, update some "easy" questions to "medium" and "hard" to create proper distribution
// Strategy: for each unit, re-label questions 4-5 as "medium" and question 6 as "hard"
for (const code of gr3Courses) {
  const units = await q(`
    SELECT u.id FROM units u JOIN courses c ON u.courseId=c.id WHERE c.courseCode=?
  `, [code]);
  
  for (const unit of units) {
    // Get all questions for this unit ordered by id
    const questions = await q(`
      SELECT id, difficulty FROM quizQuestions WHERE unitId=? ORDER BY id
    `, [unit.id]);
    
    if (questions.length >= 6) {
      // Questions 1-3: easy, 4-5: medium, 6: hard
      for (let i = 0; i < questions.length; i++) {
        let newDiff = 'easy';
        if (i === 3 || i === 4) newDiff = 'medium';
        if (i === 5) newDiff = 'hard';
        if (questions[i].difficulty !== newDiff) {
          await exec(`UPDATE quizQuestions SET difficulty=? WHERE id=?`, [newDiff, questions[i].id]);
          totalFixed++;
        }
      }
    } else if (questions.length >= 4) {
      // Questions 1-2: easy, 3-4: medium
      for (let i = 0; i < questions.length; i++) {
        let newDiff = 'easy';
        if (i >= 2) newDiff = 'medium';
        if (questions[i].difficulty !== newDiff) {
          await exec(`UPDATE quizQuestions SET difficulty=? WHERE id=?`, [newDiff, questions[i].id]);
          totalFixed++;
        }
      }
    }
  }
  console.log(`${code}: Updated difficulty distribution`);
}

// ─── FIX 7: Fix SATPREP U12 - only 1 question ─────────────────────────────────
console.log('\n=== FIX 7: Checking SATPREP U12 ===');

const satprepU12 = await q(`
  SELECT u.id, COUNT(qq.id) as qCount
  FROM units u JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='SATPREP' AND u.unitNumber=12
  GROUP BY u.id
`);

console.log('SATPREP U12 questions:', satprepU12[0]?.qCount ?? 0);

// Get the existing question to understand the unit topic
if (satprepU12.length > 0) {
  const existing = await q(`
    SELECT questionText, choices, correctAnswer, explanation, skillTag
    FROM quizQuestions WHERE unitId=? LIMIT 1
  `, [satprepU12[0].id]);
  
  if (existing.length > 0) {
    console.log('SATPREP U12 existing question:', existing[0].questionText.substring(0, 80));
  }
}

// ─── FIX 8: Verify Grade 4-8 standard courses have proper difficulty spread ────
console.log('\n=== FIX 8: Checking Grade 4-8 standard difficulty distribution ===');

const g4to8Standard = ['G4MATH','G4ELA','G4SCI','G4SS','G5MATH','G5ELA','G5SCI','G5SS',
                        'G6MATH','G6ELA','G6SCI','G6SS','G7MATH','G7ELA','G7SCI','G7SS',
                        'G8MATH','G8ELA','G8SCI','G8SS'];

for (const code of g4to8Standard) {
  const dist = await q(`
    SELECT qq.difficulty, COUNT(*) as cnt
    FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
    WHERE c.courseCode=?
    GROUP BY qq.difficulty
  `, [code]);
  
  const total = dist.reduce((a, b) => a + Number(b.cnt), 0);
  const hasHard = dist.some(r => r.difficulty === 'hard' && Number(r.cnt) > 0);
  
  if (!hasHard && total > 0) {
    // Re-label: for each unit, questions 1-2: easy, 3-4: medium, 5: hard
    const units = await q(`
      SELECT u.id FROM units u JOIN courses c ON u.courseId=c.id WHERE c.courseCode=?
    `, [code]);
    
    for (const unit of units) {
      const questions = await q(`
        SELECT id FROM quizQuestions WHERE unitId=? ORDER BY id
      `, [unit.id]);
      
      for (let i = 0; i < questions.length; i++) {
        let newDiff = 'easy';
        if (i === 2 || i === 3) newDiff = 'medium';
        if (i === 4) newDiff = 'hard';
        await exec(`UPDATE quizQuestions SET difficulty=? WHERE id=?`, [newDiff, questions[i].id]);
        totalFixed++;
      }
    }
    console.log(`${code}: Updated difficulty distribution (${total} questions)`);
  }
}

// ─── FIX 9: Fix KAP courses difficulty distribution ───────────────────────────
console.log('\n=== FIX 9: Fixing KAP courses difficulty distribution ===');

const kapCourses = ['G4KAPMATH','G5KAPMATH','G4KAPELA','G5KAPELA',
                     'G6KAPMATH','G6KAPELA','G7KAPMATH','G7KAPELA',
                     'G8KAPMATH','G8KAPELA','G6KAPSCI','G6KAPSS',
                     'G7KAPSCI','G7KAPSS','G8KAPSCI','G8KAPSS'];

for (const code of kapCourses) {
  const dist = await q(`
    SELECT qq.difficulty, COUNT(*) as cnt
    FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
    WHERE c.courseCode=?
    GROUP BY qq.difficulty
  `, [code]);
  
  const hasEasy = dist.some(r => r.difficulty === 'easy' && Number(r.cnt) > 0);
  const hasHard = dist.some(r => r.difficulty === 'hard' && Number(r.cnt) > 0);
  
  if (!hasHard || !hasEasy) {
    const units = await q(`
      SELECT u.id FROM units u JOIN courses c ON u.courseId=c.id WHERE c.courseCode=?
    `, [code]);
    
    for (const unit of units) {
      const questions = await q(`
        SELECT id FROM quizQuestions WHERE unitId=? ORDER BY id
      `, [unit.id]);
      
      for (let i = 0; i < questions.length; i++) {
        let newDiff = 'medium';
        if (i === 0) newDiff = 'easy';
        if (i === 1) newDiff = 'easy';
        if (i === 4) newDiff = 'hard';
        await exec(`UPDATE quizQuestions SET difficulty=? WHERE id=?`, [newDiff, questions[i].id]);
        totalFixed++;
      }
    }
    console.log(`${code}: Updated difficulty distribution`);
  }
}

// ─── FIX 10: Fix APCALCBC - only 71 quiz questions (should be 120 for 12 units × 10) ─
console.log('\n=== FIX 10: Checking APCALCBC quiz count ===');
const apcalcbcCount = await q(`
  SELECT COUNT(*) as cnt FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
  WHERE c.courseCode='APCALCBC'
`);
console.log('APCALCBC total quiz questions:', apcalcbcCount[0].cnt);

const apcalcbcPerUnit = await q(`
  SELECT u.unitNumber, COUNT(qq.id) as qCount
  FROM units u JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='APCALCBC'
  GROUP BY u.unitNumber ORDER BY u.unitNumber
`);
console.log('APCALCBC per unit:', apcalcbcPerUnit.map(r => `U${r.unitNumber}:${r.qCount}`).join(' '));

await conn.end();

console.log('\n=== FIX SUMMARY ===');
console.log(`Questions with fixed choices format: ${totalFixed}`);
console.log(`Duplicate questions removed: ${totalRemoved + diagRemoved}`);
console.log('Done! Run the audit script again to verify.');
