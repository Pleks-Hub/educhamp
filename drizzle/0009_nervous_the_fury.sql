ALTER TABLE `diagnosticQuestions` MODIFY COLUMN `questionId` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `diagnosticAttempts` ADD `courseId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `diagnosticQuestions` ADD `courseId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `colorPalette` varchar(32) DEFAULT 'indigo';--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `displayName` varchar(128);