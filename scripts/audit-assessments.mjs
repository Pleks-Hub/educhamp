/**
 * Assessment Audit Script — corrected column names
 * diagnosticQuestions: choices (not options), mapsToUnit (not unitNumber)
 * quizQuestions: choices (not options), unitId FK
 */
import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
async function q(sql) {
  const [rows] = await conn.query(sql);
  return rows;
}

const report = {};

// 1. Course inventory
report.courses = await q(`SELECT id, courseCode, title, subject, gradeLevel, isActive FROM courses ORDER BY id`);

// 2. Units per course
report.unitCounts = await q(`
  SELECT c.courseCode, c.title, COUNT(u.id) as unitCount
  FROM courses c LEFT JOIN units u ON u.courseId=c.id
  GROUP BY c.id, c.courseCode, c.title ORDER BY c.id
`);

// 3. Quiz questions per unit for core courses
report.quizQuestionsPerUnit = await q(`
  SELECT c.courseCode, u.unitNumber, u.title as unitTitle, COUNT(qq.id) as qCount,
         SUM(CASE WHEN qq.difficulty='easy' THEN 1 ELSE 0 END) as easy,
         SUM(CASE WHEN qq.difficulty='medium' THEN 1 ELSE 0 END) as medium,
         SUM(CASE WHEN qq.difficulty='hard' THEN 1 ELSE 0 END) as hard,
         SUM(CASE WHEN qq.difficulty='challenge' THEN 1 ELSE 0 END) as challenge
  FROM courses c
  JOIN units u ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode IN ('ALG1','ENG1','BIO1','APHG','SPA2','GR3MATH','GR3ELA','GR3SCI','GR3SS')
  GROUP BY c.courseCode, u.unitNumber, u.title
  ORDER BY c.courseCode, u.unitNumber
`);

// 4. Diagnostic questions per course by difficulty
report.diagByDifficulty = await q(`
  SELECT c.courseCode, dq.difficulty, COUNT(dq.id) as count
  FROM courses c
  JOIN diagnosticQuestions dq ON dq.courseId=c.id
  GROUP BY c.courseCode, dq.difficulty
  ORDER BY c.courseCode, dq.difficulty
`);

// 5. Full ALG1 diagnostic questions
report.alg1Diagnostic = await q(`
  SELECT dq.id, dq.mapsToUnit, dq.questionText, dq.questionType,
         dq.choices, dq.correctAnswer, dq.explanation, dq.difficulty
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='ALG1'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id
`);

// 6. Full ENG1 diagnostic questions
report.eng1Diagnostic = await q(`
  SELECT dq.id, dq.mapsToUnit, dq.questionText, dq.questionType,
         dq.choices, dq.correctAnswer, dq.explanation, dq.difficulty
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='ENG1'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id
`);

// 7. Full BIO1 diagnostic questions
report.bio1Diagnostic = await q(`
  SELECT dq.id, dq.mapsToUnit, dq.questionText, dq.questionType,
         dq.choices, dq.correctAnswer, dq.explanation, dq.difficulty
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='BIO1'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id
`);

// 8. Full GR3MATH diagnostic
report.gr3mathDiagnostic = await q(`
  SELECT dq.id, dq.mapsToUnit, dq.questionText, dq.questionType,
         dq.choices, dq.correctAnswer, dq.explanation, dq.difficulty
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='GR3MATH'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id
`);

// 9. ALG1 quiz questions - all units
report.alg1Quiz = await q(`
  SELECT u.unitNumber, u.title as unitTitle, qq.id, qq.questionText, qq.questionType,
         qq.choices, qq.correctAnswer, qq.explanation, qq.difficulty, qq.skillTag
  FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id
  JOIN courses c ON u.courseId=c.id
  WHERE c.courseCode='ALG1'
  ORDER BY u.unitNumber, qq.difficulty, qq.id
`);

// 10. Missing explanations
report.missingExplanations = await q(`
  SELECT c.courseCode, 'quiz' as qtype, COUNT(*) as cnt
  FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id
  JOIN courses c ON u.courseId=c.id
  WHERE (qq.explanation IS NULL OR qq.explanation='')
  GROUP BY c.courseCode
  UNION ALL
  SELECT c.courseCode, 'diagnostic' as qtype, COUNT(*) as cnt
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE (dq.explanation IS NULL OR dq.explanation='')
  GROUP BY c.courseCode
  ORDER BY courseCode, qtype
`);

// 11. Missing correct answers
report.missingAnswers = await q(`
  SELECT c.courseCode, 'quiz' as qtype, COUNT(*) as cnt
  FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id
  JOIN courses c ON u.courseId=c.id
  WHERE (qq.correctAnswer IS NULL OR qq.correctAnswer='')
  GROUP BY c.courseCode
  UNION ALL
  SELECT c.courseCode, 'diagnostic' as qtype, COUNT(*) as cnt
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE (dq.correctAnswer IS NULL OR dq.correctAnswer='')
  GROUP BY c.courseCode
  ORDER BY courseCode, qtype
`);

// 12. Duplicate quiz questions within same course
report.duplicateQuiz = await q(`
  SELECT c.courseCode, qq.questionText, COUNT(*) as cnt
  FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id
  JOIN courses c ON u.courseId=c.id
  GROUP BY c.courseCode, qq.questionText
  HAVING cnt > 1
  ORDER BY c.courseCode, cnt DESC
  LIMIT 100
`);

// 13. Duplicate diagnostic questions within same course
report.duplicateDiag = await q(`
  SELECT c.courseCode, dq.questionText, COUNT(*) as cnt
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  GROUP BY c.courseCode, dq.questionText
  HAVING cnt > 1
  ORDER BY c.courseCode, cnt DESC
  LIMIT 100
`);

// 14. Check correctAnswer in choices for MC quiz questions (sample)
report.mcAnswerCheck = await q(`
  SELECT c.courseCode, qq.id, qq.questionText, qq.choices, qq.correctAnswer
  FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id
  JOIN courses c ON u.courseId=c.id
  WHERE qq.questionType='multiple_choice'
  AND JSON_SEARCH(qq.choices, 'one', qq.correctAnswer) IS NULL
  LIMIT 50
`);

// 15. Check correctAnswer in choices for MC diagnostic questions
report.mcDiagAnswerCheck = await q(`
  SELECT c.courseCode, dq.id, dq.questionText, dq.choices, dq.correctAnswer
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE dq.questionType='multiple_choice'
  AND JSON_SEARCH(dq.choices, 'one', dq.correctAnswer) IS NULL
  LIMIT 50
`);

// 16. AP course quiz questions per unit
report.apQuizPerUnit = await q(`
  SELECT c.courseCode, u.unitNumber, u.title as unitTitle, COUNT(qq.id) as qCount
  FROM courses c
  JOIN units u ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode IN ('APCHEM','APSTAT','APCALCBC','APLIT','APBIZ','SATPREP')
  GROUP BY c.courseCode, u.unitNumber, u.title
  ORDER BY c.courseCode, u.unitNumber
`);

// 17. Grade 4-8 quiz questions per unit (sample)
report.g4to8QuizPerUnit = await q(`
  SELECT c.courseCode, u.unitNumber, COUNT(qq.id) as qCount
  FROM courses c
  JOIN units u ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.gradeLevel IN ('4','5','6','7','8')
  GROUP BY c.courseCode, u.unitNumber
  ORDER BY c.courseCode, u.unitNumber
`);

// 18. Pre-K through Grade 2 units and lessons
report.earlyChildhoodStructure = await q(`
  SELECT c.courseCode, c.gradeLevel, u.unitNumber, u.title as unitTitle,
         COUNT(l.id) as lessonCount
  FROM courses c
  LEFT JOIN units u ON u.courseId=c.id
  LEFT JOIN lessons l ON l.unitId=u.id
  WHERE c.gradeLevel IN ('Pre-K','Kindergarten','1','2')
  GROUP BY c.courseCode, c.gradeLevel, u.unitNumber, u.title
  ORDER BY c.gradeLevel, c.courseCode, u.unitNumber
`);

// 19. Full APHG diagnostic
report.aphgDiagnostic = await q(`
  SELECT dq.id, dq.mapsToUnit, dq.questionText, dq.questionType,
         dq.choices, dq.correctAnswer, dq.explanation, dq.difficulty
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='APHG'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id
`);

// 20. Full SPA2 diagnostic
report.spa2Diagnostic = await q(`
  SELECT dq.id, dq.mapsToUnit, dq.questionText, dq.questionType,
         dq.choices, dq.correctAnswer, dq.explanation, dq.difficulty
  FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id
  WHERE c.courseCode='SPA2'
  ORDER BY dq.mapsToUnit, dq.difficulty, dq.id
`);

await conn.end();

fs.writeFileSync('/tmp/audit-report.json', JSON.stringify(report, null, 2));
console.log('=== AUDIT SUMMARY ===');
console.log('Total courses:', report.courses.length);
console.log('Courses with 0 quiz questions:', report.unitCounts.filter(r => Number(r.unitCount) === 0).map(r => r.courseCode).join(', '));
console.log('Missing explanations (quiz total):', report.missingExplanations.filter(r => r.qtype === 'quiz').reduce((a,b) => a + Number(b.cnt), 0));
console.log('Missing explanations (diagnostic total):', report.missingExplanations.filter(r => r.qtype === 'diagnostic').reduce((a,b) => a + Number(b.cnt), 0));
console.log('Missing correct answers (quiz):', report.missingAnswers.filter(r => r.qtype === 'quiz').reduce((a,b) => a + Number(b.cnt), 0));
console.log('Missing correct answers (diagnostic):', report.missingAnswers.filter(r => r.qtype === 'diagnostic').reduce((a,b) => a + Number(b.cnt), 0));
console.log('Duplicate quiz questions:', report.duplicateQuiz.length);
console.log('Duplicate diagnostic questions:', report.duplicateDiag.length);
console.log('MC answer not in choices (quiz):', report.mcAnswerCheck.length);
console.log('MC answer not in choices (diagnostic):', report.mcDiagAnswerCheck.length);
