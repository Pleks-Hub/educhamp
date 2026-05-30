CREATE TABLE `questionFlags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionType` enum('quiz','diagnostic') NOT NULL,
	`questionId` int NOT NULL,
	`userId` int NOT NULL,
	`reason` enum('incorrect_answer','unclear_question','wrong_difficulty','out_of_scope','duplicate','other') NOT NULL,
	`details` text,
	`status` enum('open','reviewed','resolved','dismissed') NOT NULL DEFAULT 'open',
	`reviewedBy` int,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questionFlags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `courses` ADD `isTimedExam` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `timeLimitMinutes` int;--> statement-breakpoint
CREATE INDEX `questionFlags_question_idx` ON `questionFlags` (`questionType`,`questionId`);--> statement-breakpoint
CREATE INDEX `questionFlags_userId_idx` ON `questionFlags` (`userId`);--> statement-breakpoint
CREATE INDEX `questionFlags_status_idx` ON `questionFlags` (`status`);