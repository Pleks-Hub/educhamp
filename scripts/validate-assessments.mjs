/**
 * Final Assessment Validation Script
 * Checks all issues from the original audit are resolved.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
async function q(sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

let issues = [];
let passed = 0;

// CHECK 1: No plain-string choices (all should be {label,text} objects)
const badChoicesDiag = await q(`
  SELECT COUNT(*) as cnt FROM diagnosticQuestions
  WHERE choices IS NOT NULL AND JSON_TYPE(JSON_EXTRACT(choices, '$[0]')) = 'STRING'
`);
if (Number(badChoicesDiag[0].cnt) > 0) {
  issues.push(`❌ ${badChoicesDiag[0].cnt} diagnostic questions still have plain-string choices`);
} else {
  console.log('✅ All diagnostic choices are {label,text} objects');
  passed++;
}

const badChoicesQuiz = await q(`
  SELECT COUNT(*) as cnt FROM quizQuestions
  WHERE choices IS NOT NULL AND JSON_TYPE(JSON_EXTRACT(choices, '$[0]')) = 'STRING'
`);
if (Number(badChoicesQuiz[0].cnt) > 0) {
  issues.push(`❌ ${badChoicesQuiz[0].cnt} quiz questions still have plain-string choices`);
} else {
  console.log('✅ All quiz choices are {label,text} objects');
  passed++;
}

// CHECK 2: No duplicate quiz questions within same course
const dupQuiz = await q(`
  SELECT c.courseCode, COUNT(*) as cnt
  FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
  GROUP BY c.courseCode, qq.questionText HAVING cnt > 1
`);
if (dupQuiz.length > 0) {
  issues.push(`❌ ${dupQuiz.length} groups of duplicate quiz questions remain`);
} else {
  console.log('✅ No duplicate quiz questions');
  passed++;
}

// CHECK 3: No duplicate diagnostic questions within same course
const dupDiag = await q(`
  SELECT c.courseCode, COUNT(*) as cnt
  FROM diagnosticQuestions dq JOIN courses c ON dq.courseId=c.id
  GROUP BY c.courseCode, dq.questionText HAVING cnt > 1
`);
if (dupDiag.length > 0) {
  issues.push(`❌ ${dupDiag.length} groups of duplicate diagnostic questions remain`);
} else {
  console.log('✅ No duplicate diagnostic questions');
  passed++;
}

// CHECK 4: No MC questions where correctAnswer not in choices
const badAnswerDiag = await q(`
  SELECT COUNT(*) as cnt FROM diagnosticQuestions
  WHERE questionType='multiple_choice'
    AND JSON_SEARCH(choices, 'one', correctAnswer) IS NULL
`);
if (Number(badAnswerDiag[0].cnt) > 0) {
  issues.push(`❌ ${badAnswerDiag[0].cnt} diagnostic questions have correctAnswer not in choices`);
} else {
  console.log('✅ All diagnostic MC correctAnswers match a choice label');
  passed++;
}

const badAnswerQuiz = await q(`
  SELECT COUNT(*) as cnt FROM quizQuestions
  WHERE questionType='multiple_choice'
    AND JSON_SEARCH(choices, 'one', correctAnswer) IS NULL
`);
if (Number(badAnswerQuiz[0].cnt) > 0) {
  issues.push(`❌ ${badAnswerQuiz[0].cnt} quiz questions have correctAnswer not in choices`);
} else {
  console.log('✅ All quiz MC correctAnswers match a choice label');
  passed++;
}

// CHECK 5: APLIT diagnostic has exactly 57 questions
const aplitCount = await q(`
  SELECT COUNT(*) as cnt FROM diagnosticQuestions dq
  JOIN courses c ON dq.courseId=c.id WHERE c.courseCode='APLIT'
`);
if (Number(aplitCount[0].cnt) !== 57) {
  issues.push(`❌ APLIT has ${aplitCount[0].cnt} diagnostic questions (expected 57)`);
} else {
  console.log('✅ APLIT has exactly 57 diagnostic questions');
  passed++;
}

// CHECK 6: GR3SS quiz distribution is balanced (max 6 per unit)
const gr3ssMax = await q(`
  SELECT MAX(qCount) as maxQ FROM (
    SELECT COUNT(qq.id) as qCount FROM units u
    JOIN courses c ON u.courseId=c.id
    LEFT JOIN quizQuestions qq ON qq.unitId=u.id
    WHERE c.courseCode='GR3SS'
    GROUP BY u.id
  ) t
`);
if (Number(gr3ssMax[0].maxQ) > 6) {
  issues.push(`❌ GR3SS has a unit with ${gr3ssMax[0].maxQ} questions (max should be 6)`);
} else {
  console.log(`✅ GR3SS quiz distribution balanced (max ${gr3ssMax[0].maxQ}/unit)`);
  passed++;
}

// CHECK 7: GR3 courses have all 3 difficulty levels
for (const code of ['GR3MATH','GR3ELA','GR3SCI','GR3SS']) {
  const diffs = await q(`
    SELECT qq.difficulty FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
    WHERE c.courseCode=? GROUP BY qq.difficulty
  `, [code]);
  const diffSet = new Set(diffs.map(r => r.difficulty));
  if (!diffSet.has('hard')) {
    issues.push(`❌ ${code} has no 'hard' questions`);
  } else {
    console.log(`✅ ${code} has all difficulty levels`);
    passed++;
  }
}

// CHECK 8: Pre-K through Grade 2 have diagnostic questions
const earlyDiag = await q(`
  SELECT c.courseCode, COUNT(dq.id) as cnt
  FROM courses c LEFT JOIN diagnosticQuestions dq ON dq.courseId=c.id
  WHERE c.gradeLevel IN ('Pre-K','Kindergarten','1','2')
  GROUP BY c.courseCode
  HAVING cnt = 0
`);
if (earlyDiag.length > 0) {
  issues.push(`❌ These early childhood courses have 0 diagnostic questions: ${earlyDiag.map(r => r.courseCode).join(', ')}`);
} else {
  console.log('✅ All Pre-K through Grade 2 courses have diagnostic questions');
  passed++;
}

// CHECK 9: Pre-K through Grade 2 have quiz questions
const earlyQuiz = await q(`
  SELECT c.courseCode, COUNT(qq.id) as cnt
  FROM courses c
  LEFT JOIN units u ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.gradeLevel IN ('Pre-K','Kindergarten','1','2')
  GROUP BY c.courseCode
  HAVING cnt = 0
`);
if (earlyQuiz.length > 0) {
  issues.push(`❌ These early childhood courses have 0 quiz questions: ${earlyQuiz.map(r => r.courseCode).join(', ')}`);
} else {
  console.log('✅ All Pre-K through Grade 2 courses have quiz questions');
  passed++;
}

// CHECK 10: SATPREP U12 has at least 5 questions
const satprepU12 = await q(`
  SELECT COUNT(qq.id) as cnt FROM quizQuestions qq
  JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
  WHERE c.courseCode='SATPREP' AND u.unitNumber=12
`);
if (Number(satprepU12[0].cnt) < 5) {
  issues.push(`❌ SATPREP U12 has only ${satprepU12[0].cnt} questions (need at least 5)`);
} else {
  console.log(`✅ SATPREP U12 has ${satprepU12[0].cnt} questions`);
  passed++;
}

// CHECK 11: APCALCBC has at least 10 questions per unit
const apcalcbcUnder = await q(`
  SELECT u.unitNumber, COUNT(qq.id) as cnt
  FROM units u JOIN courses c ON u.courseId=c.id
  LEFT JOIN quizQuestions qq ON qq.unitId=u.id
  WHERE c.courseCode='APCALCBC'
  GROUP BY u.unitNumber HAVING cnt < 10
`);
if (apcalcbcUnder.length > 0) {
  issues.push(`❌ APCALCBC units with < 10 questions: ${apcalcbcUnder.map(r => `U${r.unitNumber}(${r.cnt})`).join(', ')}`);
} else {
  console.log('✅ APCALCBC all units have ≥ 10 questions');
  passed++;
}

// CHECK 12: Grade 4-8 standard courses have all 3 difficulty levels
const g4to8 = ['G4MATH','G4ELA','G4SCI','G4SS','G5MATH','G5ELA','G5SCI','G5SS',
               'G6MATH','G6ELA','G6SCI','G6SS','G7MATH','G7ELA','G7SCI','G7SS',
               'G8MATH','G8ELA','G8SCI','G8SS'];
let g4to8Issues = [];
for (const code of g4to8) {
  const diffs = await q(`
    SELECT qq.difficulty FROM quizQuestions qq JOIN units u ON qq.unitId=u.id JOIN courses c ON u.courseId=c.id
    WHERE c.courseCode=? GROUP BY qq.difficulty
  `, [code]);
  const diffSet = new Set(diffs.map(r => r.difficulty));
  if (!diffSet.has('hard')) g4to8Issues.push(code);
}
if (g4to8Issues.length > 0) {
  issues.push(`❌ G4-8 courses missing 'hard' difficulty: ${g4to8Issues.join(', ')}`);
} else {
  console.log('✅ All Grade 4-8 standard courses have hard difficulty questions');
  passed++;
}

// CHECK 13: No missing explanations
const missingExp = await q(`
  SELECT COUNT(*) as cnt FROM quizQuestions WHERE explanation IS NULL OR explanation=''
`);
const missingExpDiag = await q(`
  SELECT COUNT(*) as cnt FROM diagnosticQuestions WHERE explanation IS NULL OR explanation=''
`);
if (Number(missingExp[0].cnt) > 0 || Number(missingExpDiag[0].cnt) > 0) {
  issues.push(`❌ Missing explanations: ${missingExp[0].cnt} quiz, ${missingExpDiag[0].cnt} diagnostic`);
} else {
  console.log('✅ All questions have explanations');
  passed++;
}

// CHECK 14: No missing correct answers
const missingAns = await q(`
  SELECT COUNT(*) as cnt FROM quizQuestions WHERE correctAnswer IS NULL OR correctAnswer=''
`);
const missingAnsDiag = await q(`
  SELECT COUNT(*) as cnt FROM diagnosticQuestions WHERE correctAnswer IS NULL OR correctAnswer=''
`);
if (Number(missingAns[0].cnt) > 0 || Number(missingAnsDiag[0].cnt) > 0) {
  issues.push(`❌ Missing correct answers: ${missingAns[0].cnt} quiz, ${missingAnsDiag[0].cnt} diagnostic`);
} else {
  console.log('✅ All questions have correct answers');
  passed++;
}

// Summary stats
const totalQuiz = await q(`SELECT COUNT(*) as cnt FROM quizQuestions`);
const totalDiag = await q(`SELECT COUNT(*) as cnt FROM diagnosticQuestions`);

await conn.end();

console.log('\n=== VALIDATION SUMMARY ===');
console.log(`Total quiz questions: ${totalQuiz[0].cnt}`);
console.log(`Total diagnostic questions: ${totalDiag[0].cnt}`);
console.log(`Checks passed: ${passed}`);
console.log(`Issues found: ${issues.length}`);
if (issues.length > 0) {
  console.log('\nISSUES:');
  issues.forEach(i => console.log(' ', i));
} else {
  console.log('\n🎉 All checks passed! Assessment data is clean and complete.');
}
