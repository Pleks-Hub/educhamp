ALTER TABLE `quizAttempts` ADD `questionTimings` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `quizAttempts` ADD `isPracticeMode` boolean DEFAULT false NOT NULL;