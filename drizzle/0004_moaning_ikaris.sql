CREATE TABLE `parentGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`goalText` text NOT NULL,
	`targetDate` timestamp,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parentGoals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parentNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`noteText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parentNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResetTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `twoFactorAuth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secret` varchar(256) NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`backupCodes` json,
	`enabledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `twoFactorAuth_id` PRIMARY KEY(`id`),
	CONSTRAINT `twoFactorAuth_userId_unique` UNIQUE(`userId`)
);
