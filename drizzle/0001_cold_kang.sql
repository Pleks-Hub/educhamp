CREATE TABLE `diagnosticAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`answers` json NOT NULL,
	`unitResults` json NOT NULL,
	`prerequisiteScore` int NOT NULL,
	`overallScore` int NOT NULL,
	`placementRecommendation` text,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnosticAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnosticQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` varchar(16) NOT NULL,
	`questionText` text NOT NULL,
	`questionType` enum('multiple_choice','short_answer') NOT NULL,
	`choices` json,
	`correctAnswer` varchar(512) NOT NULL,
	`mapsToUnit` varchar(64) NOT NULL,
	`mapsToSkills` json NOT NULL,
	`difficulty` enum('easy','medium') NOT NULL,
	`explanation` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `diagnosticQuestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `diagnosticQuestions_questionId_unique` UNIQUE(`questionId`)
);
--> statement-breakpoint
CREATE TABLE `lessonProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lessonId` int NOT NULL,
	`unitId` int NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`guidedCompleted` boolean NOT NULL DEFAULT false,
	`independentCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessonProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitId` int NOT NULL,
	`lessonNumber` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`teksAlignment` text,
	`explanation` text NOT NULL,
	`workedExamples` json NOT NULL,
	`guidedProblems` json NOT NULL,
	`independentProblems` json NOT NULL,
	`misconceptions` json NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`unitId` int NOT NULL,
	`unitNumber` int NOT NULL,
	`answers` json NOT NULL,
	`score` int NOT NULL,
	`totalQuestions` int NOT NULL,
	`correctCount` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitId` int NOT NULL,
	`questionText` text NOT NULL,
	`questionType` enum('multiple_choice','short_answer','open_response') NOT NULL,
	`choices` json,
	`correctAnswer` varchar(512) NOT NULL,
	`explanation` text NOT NULL,
	`skillTag` varchar(32) NOT NULL,
	`difficulty` enum('easy','medium','hard','challenge') NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `quizQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skillId` varchar(32) NOT NULL,
	`skillName` varchar(256) NOT NULL,
	`unitId` int NOT NULL,
	`unitNumber` int NOT NULL,
	`prerequisiteSkillIds` json NOT NULL DEFAULT ('[]'),
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `skills_skillId_unique` UNIQUE(`skillId`)
);
--> statement-breakpoint
CREATE TABLE `tutorSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`unitId` int,
	`lessonId` int,
	`mode` enum('teach','practice','quiz','exam_review','remediation','parent_summary') NOT NULL DEFAULT 'teach',
	`messages` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutorSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unitProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`unitId` int NOT NULL,
	`unitNumber` int NOT NULL,
	`status` enum('locked','in_progress','quiz_unlocked','completed') NOT NULL DEFAULT 'locked',
	`lessonsCompleted` int NOT NULL DEFAULT 0,
	`totalLessons` int NOT NULL DEFAULT 0,
	`quizScore` int,
	`quizAttempts` int NOT NULL DEFAULT 0,
	`lastActivityAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unitProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitNumber` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`overview` text NOT NULL,
	`teksAlignment` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `units_id` PRIMARY KEY(`id`),
	CONSTRAINT `units_unitNumber_unique` UNIQUE(`unitNumber`)
);
--> statement-breakpoint
CREATE TABLE `userMastery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skillId` varchar(32) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastAttemptAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userMastery_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `grade` varchar(16) DEFAULT '9';--> statement-breakpoint
ALTER TABLE `users` ADD `school` varchar(256);