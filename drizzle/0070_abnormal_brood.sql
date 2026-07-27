CREATE TABLE `passwordResetAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `passwordResetAttempts_email_idx` ON `passwordResetAttempts` (`email`);--> statement-breakpoint
CREATE INDEX `passwordResetAttempts_createdAt_idx` ON `passwordResetAttempts` (`createdAt`);