CREATE TABLE `listenStreaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` varchar(10) NOT NULL,
	`secondsListened` int NOT NULL DEFAULT 0,
	`goalSeconds` int NOT NULL DEFAULT 1800,
	`goalMet` boolean NOT NULL DEFAULT false,
	`streakCount` int NOT NULL DEFAULT 0,
	`freezesAvailable` int NOT NULL DEFAULT 0,
	`freezeUsed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listenStreaks_id` PRIMARY KEY(`id`),
	CONSTRAINT `listenStreaks_user_week_unique` UNIQUE(`userId`,`weekStart`)
);
--> statement-breakpoint
CREATE INDEX `listenStreaks_user_idx` ON `listenStreaks` (`userId`);