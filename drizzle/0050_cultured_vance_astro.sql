CREATE TABLE `learningPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) DEFAULT 'My Learning Plan',
	`hoursPerWeek` int NOT NULL DEFAULT 5,
	`preferredDays` json NOT NULL,
	`schedule` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learningPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learningStreaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityDate` varchar(10) NOT NULL,
	`activitiesCount` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learningStreaks_id` PRIMARY KEY(`id`),
	CONSTRAINT `streak_user_date_unique` UNIQUE(`userId`,`activityDate`)
);
--> statement-breakpoint
CREATE TABLE `streakStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastActivityDate` varchar(10),
	`streakFreezes` int NOT NULL DEFAULT 1,
	`totalActiveDays` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `streakStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `streakStats_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `questionFlags` MODIFY COLUMN `reason` enum('incorrect_answer','unclear_question','wrong_difficulty','out_of_scope','duplicate','no_answer_input','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(256);--> statement-breakpoint
CREATE INDEX `plan_user_idx` ON `learningPlans` (`userId`);--> statement-breakpoint
CREATE INDEX `plan_active_idx` ON `learningPlans` (`userId`,`isActive`);--> statement-breakpoint
CREATE INDEX `streak_user_idx` ON `learningStreaks` (`userId`);