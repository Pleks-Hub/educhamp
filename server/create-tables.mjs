import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS \`units\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`unitNumber\` int NOT NULL,
    \`title\` varchar(256) NOT NULL,
    \`overview\` text NOT NULL,
    \`teksAlignment\` text,
    \`sortOrder\` int NOT NULL DEFAULT 0,
    CONSTRAINT \`units_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`units_unitNumber_unique\` UNIQUE(\`unitNumber\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`skills\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`skillId\` varchar(32) NOT NULL,
    \`skillName\` varchar(256) NOT NULL,
    \`unitId\` int NOT NULL,
    \`unitNumber\` int NOT NULL,
    \`prerequisiteSkillIds\` json NOT NULL,
    \`sortOrder\` int NOT NULL DEFAULT 0,
    CONSTRAINT \`skills_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`skills_skillId_unique\` UNIQUE(\`skillId\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`unitProgress\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`unitId\` int NOT NULL,
    \`unitNumber\` int NOT NULL,
    \`status\` enum('locked','in_progress','quiz_unlocked','completed') NOT NULL DEFAULT 'locked',
    \`lessonsCompleted\` int NOT NULL DEFAULT 0,
    \`totalLessons\` int NOT NULL DEFAULT 0,
    \`quizScore\` int,
    \`quizAttempts\` int NOT NULL DEFAULT 0,
    \`lastActivityAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`unitProgress_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`userMastery\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`skillId\` varchar(32) NOT NULL,
    \`score\` int NOT NULL DEFAULT 0,
    \`attemptCount\` int NOT NULL DEFAULT 0,
    \`lastAttemptAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`userMastery_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`tutorSessions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`unitId\` int,
    \`lessonId\` int,
    \`mode\` enum('teach','practice','quiz','exam_review','remediation','parent_summary') NOT NULL DEFAULT 'teach',
    \`messages\` json NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`tutorSessions_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of tables) {
  try {
    await db.execute(sql);
    const name = sql.match(/`(\w+)`/)?.[1];
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ Error:`, e.message);
  }
}

await db.end();
console.log("Done.");
