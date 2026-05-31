CREATE TABLE `adminImpersonationSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`impersonatedUserId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`endedAt` timestamp,
	CONSTRAINT `adminImpersonationSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminImpersonationSessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `imp_sessions_admin_idx` ON `adminImpersonationSessions` (`adminId`);--> statement-breakpoint
CREATE INDEX `imp_sessions_token_idx` ON `adminImpersonationSessions` (`token`);--> statement-breakpoint
CREATE INDEX `imp_sessions_expires_idx` ON `adminImpersonationSessions` (`expiresAt`);