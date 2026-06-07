CREATE TABLE `familyActivityFeed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`studentId` int NOT NULL,
	`studentName` varchar(255),
	`eventType` varchar(50) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`metadata` json,
	`xpEarned` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `familyActivityFeed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `familyActivityFeed_parentId_idx` ON `familyActivityFeed` (`parentId`);--> statement-breakpoint
CREATE INDEX `familyActivityFeed_studentId_idx` ON `familyActivityFeed` (`studentId`);--> statement-breakpoint
CREATE INDEX `familyActivityFeed_createdAt_idx` ON `familyActivityFeed` (`createdAt`);