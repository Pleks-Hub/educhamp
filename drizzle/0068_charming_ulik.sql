CREATE TABLE `deprecatedVoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voiceUri` varchar(256) NOT NULL,
	`reason` text,
	`deprecatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deprecatedVoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listenModeGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`weeklyTarget` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listenModeGoals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `deprecatedVoices_voiceUri_idx` ON `deprecatedVoices` (`voiceUri`);--> statement-breakpoint
CREATE INDEX `listenModeGoals_parentId_idx` ON `listenModeGoals` (`parentId`);--> statement-breakpoint
CREATE INDEX `listenModeGoals_childId_idx` ON `listenModeGoals` (`childId`);--> statement-breakpoint
CREATE INDEX `listenModeGoals_childId_unique` ON `listenModeGoals` (`childId`);