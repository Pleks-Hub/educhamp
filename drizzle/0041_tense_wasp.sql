CREATE TABLE `userSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionToken` varchar(128) NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`deviceType` enum('desktop','mobile','tablet','unknown') DEFAULT 'unknown',
	`browser` varchar(64),
	`browserVersion` varchar(32),
	`os` varchar(64),
	`city` varchar(128),
	`region` varchar(128),
	`country` varchar(64),
	`countryCode` varchar(4),
	`loginAt` timestamp NOT NULL DEFAULT (now()),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`loggedOutAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `userSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('student','parent','admin','teacher') NOT NULL DEFAULT 'student';--> statement-breakpoint
ALTER TABLE `parentChildren` ADD `relationshipType` enum('parent','co-parent','guardian','emergency-contact') DEFAULT 'parent' NOT NULL;--> statement-breakpoint
ALTER TABLE `parentChildren` ADD `addedByAdminId` int;--> statement-breakpoint
ALTER TABLE `parentChildren` ADD `addedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `quizQuestions` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `quizQuestions` ADD `flaggedByAdminId` int;--> statement-breakpoint
ALTER TABLE `quizQuestions` ADD `flaggedByAdminAt` timestamp;--> statement-breakpoint
ALTER TABLE `quizQuestions` ADD `flagNote` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `lastLoginAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `invitedByAdminId` int;--> statement-breakpoint
CREATE INDEX `userSessions_userId_idx` ON `userSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `userSessions_token_idx` ON `userSessions` (`sessionToken`);--> statement-breakpoint
CREATE INDEX `userSessions_isActive_idx` ON `userSessions` (`isActive`);--> statement-breakpoint
CREATE INDEX `userSessions_loginAt_idx` ON `userSessions` (`loginAt`);