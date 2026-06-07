CREATE TABLE `parentTaskTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(64),
	`taskType` enum('one_off','recurring','time_bound') NOT NULL DEFAULT 'one_off',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`rewardXp` int DEFAULT 10,
	`requiresProof` boolean DEFAULT false,
	`recurrenceRule` varchar(64),
	`recurrenceDays` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parentTaskTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `parentTaskTemplates_parentId_idx` ON `parentTaskTemplates` (`parentId`);