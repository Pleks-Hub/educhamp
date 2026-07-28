CREATE TABLE `loginAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`ipAddress` varchar(45),
	`success` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loginAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `loginAttempts_email_idx` ON `loginAttempts` (`email`);--> statement-breakpoint
CREATE INDEX `loginAttempts_createdAt_idx` ON `loginAttempts` (`createdAt`);