import mysql from "mysql2/promise";
const db = await mysql.createConnection(process.env.DATABASE_URL);

// Get Unit 12 current state
const [unit12] = await db.execute(`
  SELECT u.id as unitId, u.title, us.standardId, s.code, s.isCanonical
  FROM units u
  JOIN unitStandards us ON us.unitId = u.id
  JOIN standards s ON s.id = us.standardId
  JOIN courses c ON c.id = u.courseId
  WHERE c.courseCode = 'ALG1' AND u.unitNumber = 12
`);
console.log("Unit 12 current mappings:", JSON.stringify(unit12, null, 2));

// Get all ALG1 standard IDs
const [alg1Standards] = await db.execute(`
  SELECT s.id, s.code FROM standards s
  JOIN standardFrameworks sf ON s.frameworkId = sf.id
  WHERE s.code IN ('A.1(A)','A.2(A)','A.2(B)','A.2(C)','A.2(H)','A.3(C)','A.4(B)','A.4(C)','A.5(C)','A.6(A)','A.7(A)','A.7(C)')
  AND sf.code = 'TEKS'
  ORDER BY s.code
`);
console.log("ALG1 standards:", JSON.stringify(alg1Standards, null, 2));

await db.end();
