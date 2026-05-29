/**
 * Quick Assessment Audit — targeted queries only, no large data pulls
 */
import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
async function q(sql) {
  const [rows] = await conn.query(sql);
  return rows;
}

const out = {};

// 1. Quiz questions per unit for ALL courses
out.quizPerUnit = await q(`
  SELECT c.courseCode, u.unitNumber, COUNT(qq.id) as qCount,
         SUM(CASE WHEN qq.difficulty='easy' THEN 1 ELSE 0 END) easy,
         SUM(CASE WHEN qq.difficulty='medium' THEN 1 ELSE 0 END) medium,
         SUM(CASE WHEN qq.difficulty='hard' THEN 1 ELSE 0 END) hard,
         SUM(CASE WHEN qq.difficulty='challenge' THEN 1 ELSE 0 END) challenge
  FROM courses c JOIN units u ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  GROUP BY c.courseCode, u.unitNumber ORDER BY c.courseCode, u.unitNumber
`);

// 2. Diagnostic questions per course
out.diagPerCourse = await q(`
  SELECT c.courseCode, COUNT(dq.id) as total,
         SUM(CASE WHEN dq.difficulty='easy' THEN 1 ELSE 0 END) easy,
         SUM(CASE WHEN dq.difficulty='medium' THEN 1 ELSE 0 END) medium,
         SUM(CASE WHEN dq.difficulty='hard' THEN 1 ELSE 0 END) hard
  FROM courses c LEFT JOIN diagnosticQuestions dq ON dq.courseId=c.id
  GROUP BY c.courseCode ORDER BY c.courseCode
`);

// 3. Duplicate quiz questions (same text, same course)
out.dupQuiz = await q(`
  SELECT c.courseCode, qq.questionText, COUNT(*) cnt
  FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
  GROUP BY c.courseCode, qq.questionText HAVING cnt > 1
  ORDER BY c.courseCode, cnt DESC LIMIT 100
`);

// 4. Duplicate diagnostic questions
out.dupDiag = await q(`
  SELECT c.courseCode, dq.questionText, COUNT(*) cnt
  FROM diagnosticQuestions dq JOIN courses c ON dq.courseId=c.id
  GROUP BY c.courseCode, dq.questionText HAVING cnt > 1
  ORDER BY c.courseCode, cnt DESC LIMIT 100
`);

// 5. MC diagnostic where correctAnswer not in choices
out.diagBadAnswer = await q(`
  SELECT c.courseCode, dq.id, dq.questionText, dq.choices, dq.correctAnswer
  FROM diagnosticQuestions dq JOIN courses c ON dq.courseId=c.id
  WHERE dq.questionType='multiple_choice'
    AND JSON_SEARCH(dq.choices, 'one', dq.correctAnswer) IS NULL
  LIMIT 50
`);

// 6. MC quiz where correctAnswer not in choices
out.quizBadAnswer = await q(`
  SELECT c.courseCode, qq.id, qq.questionText, qq.choices, qq.correctAnswer
  FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
  WHERE qq.questionType='multiple_choice'
    AND JSON_SEARCH(qq.choices, 'one', qq.correctAnswer) IS NULL
  LIMIT 50
`);

// 7. Sample ALG1 quiz questions (unit 1, all difficulties)
out.alg1QuizSample = await q(`
  SELECT u.unitNumber, qq.difficulty, qq.questionText, qq.choices, qq.correctAnswer, qq.explanation, qq.skillTag
  FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
  WHERE c.courseCode='ALG1' AND u.unitNumber=1
  ORDER BY qq.difficulty, qq.id
`);

// 8. Sample ALG1 diagnostic (first 20)
out.alg1DiagSample = await q(`
  SELECT dq.mapsToUnit, dq.difficulty, dq.questionText, dq.choices, dq.correctAnswer, dq.explanation
  FROM diagnosticQuestions dq JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='ALG1'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id LIMIT 20
`);

// 9. Sample ENG1 diagnostic (first 20)
out.eng1DiagSample = await q(`
  SELECT dq.mapsToUnit, dq.difficulty, dq.questionText, dq.choices, dq.correctAnswer, dq.explanation
  FROM diagnosticQuestions dq JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='ENG1'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id LIMIT 20
`);

// 10. Sample BIO1 diagnostic (first 20)
out.bio1DiagSample = await q(`
  SELECT dq.mapsToUnit, dq.difficulty, dq.questionText, dq.choices, dq.correctAnswer, dq.explanation
  FROM diagnosticQuestions dq JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='BIO1'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id LIMIT 20
`);

// 11. Sample GR3MATH diagnostic (first 20)
out.gr3mathDiagSample = await q(`
  SELECT dq.mapsToUnit, dq.difficulty, dq.questionText, dq.choices, dq.correctAnswer, dq.explanation
  FROM diagnosticQuestions dq JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='GR3MATH'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id LIMIT 20
`);

// 12. Units for core courses
out.coreUnits = await q(`
  SELECT c.courseCode, u.unitNumber, u.title
  FROM courses c JOIN units u ON u.courseId=c.id
  WHERE c.courseCode IN ('ALG1','ENG1','BIO1','APHG','SPA2','GR3MATH','GR3ELA','GR3SCI','GR3SS',
                         'APCHEM','APSTAT','APCALCBC','APLIT','APBIZ','SATPREP')
  ORDER BY c.courseCode, u.unitNumber
`);

// 13. Pre-K through Grade 2 units
out.earlyUnits = await q(`
  SELECT c.courseCode, c.gradeLevel, u.unitNumber, u.title
  FROM courses c LEFT JOIN units u ON u.courseId=c.id
  WHERE c.gradeLevel IN ('Pre-K','Kindergarten','1','2')
  ORDER BY c.gradeLevel, c.courseCode, u.unitNumber
`);

await conn.end();

fs.writeFileSync('/tmp/quick-audit.json', JSON.stringify(out, null, 2));

console.log('=== AUDIT RESULTS ===');
console.log('Duplicate quiz questions:', out.dupQuiz.length, '(capped at 100)');
console.log('Duplicate diagnostic questions:', out.dupDiag.length, '(capped at 100)');
console.log('MC diagnostic bad answer:', out.diagBadAnswer.length);
console.log('MC quiz bad answer:', out.quizBadAnswer.length);

console.log('\n=== QUIZ QUESTIONS PER UNIT (anomalies) ===');
out.quizPerUnit.filter(r => Number(r.qCount) !== 15 && Number(r.qCount) !== 10 && Number(r.qCount) !== 0).forEach(r => {
  console.log(`  ${r.courseCode} U${r.unitNumber}: ${r.qCount} questions (easy:${r.easy} med:${r.medium} hard:${r.hard} chal:${r.challenge})`);
});

console.log('\n=== DIAGNOSTIC QUESTIONS (anomalies - not 57) ===');
out.diagPerCourse.filter(r => Number(r.total) !== 57 && Number(r.total) !== 0).forEach(r => {
  console.log(`  ${r.courseCode}: ${r.total} (easy:${r.easy} med:${r.medium} hard:${r.hard})`);
});

console.log('\n=== COURSES WITH 0 DIAGNOSTIC QUESTIONS ===');
out.diagPerCourse.filter(r => Number(r.total) === 0).forEach(r => console.log('  ' + r.courseCode));

console.log('\n=== DUPLICATE QUIZ QUESTIONS (sample) ===');
out.dupQuiz.slice(0, 10).forEach(r => console.log(`  [${r.courseCode}] "${r.questionText.substring(0,60)}" x${r.cnt}`));

console.log('\n=== DUPLICATE DIAGNOSTIC QUESTIONS (sample) ===');
out.dupDiag.slice(0, 10).forEach(r => console.log(`  [${r.courseCode}] "${r.questionText.substring(0,60)}" x${r.cnt}`));

console.log('\n=== MC DIAGNOSTIC BAD ANSWERS (sample) ===');
out.diagBadAnswer.slice(0, 5).forEach(r => {
  console.log(`  [${r.courseCode}] id=${r.id} answer="${r.correctAnswer}" choices=${JSON.stringify(r.choices)}`);
});
