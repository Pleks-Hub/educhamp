import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Step 1: Get lesson count per unit for all active courses
const [unitRows] = await conn.execute(`
  SELECT 
    c.courseCode,
    c.title AS courseTitle,
    u.id AS unitId,
    u.title AS unitTitle,
    u.unitNumber,
    COUNT(l.id) AS lessonCount
  FROM courses c
  JOIN units u ON u.courseId = c.id
  LEFT JOIN lessons l ON l.unitId = u.id
  WHERE c.isActive = 1
  GROUP BY c.id, c.courseCode, c.title, u.id, u.title, u.unitNumber
  ORDER BY c.courseCode, u.unitNumber
`);

// Step 2: Get max lesson count per course (to detect "partially expanded" vs "not started")
const [maxRows] = await conn.execute(`
  SELECT c.courseCode, MAX(lc.cnt) AS maxLessons
  FROM courses c
  JOIN units u ON u.courseId = c.id
  LEFT JOIN (SELECT unitId, COUNT(*) AS cnt FROM lessons GROUP BY unitId) lc ON lc.unitId = u.id
  WHERE c.isActive = 1
  GROUP BY c.courseCode
`);

await conn.end();

const maxByCode = {};
for (const r of maxRows) maxByCode[r.courseCode] = Number(r.maxLessons || 0);

// Group units by course
const byCourse = {};
for (const r of unitRows) {
  const code = r.courseCode;
  if (!byCourse[code]) byCourse[code] = { title: r.courseTitle, units: [] };
  byCourse[code].units.push({
    id: r.unitId,
    num: r.unitNumber,
    title: r.unitTitle,
    lessons: Number(r.lessonCount),
  });
}

// Categorise courses
const partial = [];   // has some units at 7+ but also units below 9
const notStarted = []; // all units at 3 or below

for (const [code, data] of Object.entries(byCourse)) {
  const max = maxByCode[code] || 0;
  const underCount = data.units.filter(u => u.lessons < 9).length;
  if (underCount === 0) continue; // fully expanded, skip

  if (max >= 7) {
    partial.push({ code, ...data });
  } else {
    notStarted.push({ code, ...data });
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`PARTIALLY EXPANDED COURSES (${partial.length}) — some units below 9 lessons`);
console.log('='.repeat(70));

for (const course of partial) {
  const underUnits = course.units.filter(u => u.lessons < 9);
  const okUnits = course.units.filter(u => u.lessons >= 9);
  console.log(`\n📚 ${course.code} — ${course.title}`);
  console.log(`   ✅ ${okUnits.length} units at 9+ lessons | ⚠️  ${underUnits.length} units need more`);
  for (const u of underUnits) {
    const gap = 9 - u.lessons;
    console.log(`   U${u.num}: "${u.title}" → ${u.lessons} lessons (needs +${gap} more)`);
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`NOT YET STARTED COURSES (${notStarted.length}) — all units still at baseline`);
console.log('='.repeat(70));
for (const course of notStarted) {
  const avg = (course.units.reduce((s, u) => s + u.lessons, 0) / course.units.length).toFixed(1);
  console.log(`  ⏳ ${course.code}: ${avg} avg (${course.units.length} units)`);
}

console.log(`\nSUMMARY:`);
console.log(`  Partially expanded: ${partial.length} courses`);
console.log(`  Not yet started:    ${notStarted.length} courses`);
console.log(`  Total needing work: ${partial.length + notStarted.length} courses`);
