CREATE TABLE `focusSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`durationMinutes` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`xpAwarded` int NOT NULL DEFAULT 0,
	`interrupted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focusSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `focusSessions_userId_idx` ON `focusSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `focusSessions_completedAt_idx` ON `focusSessions` (`completedAt`);