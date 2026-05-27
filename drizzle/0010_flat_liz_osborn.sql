CREATE TABLE `newsletterSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(256),
	`source` varchar(64) NOT NULL DEFAULT 'landing_page',
	`subscribedAt` timestamp NOT NULL DEFAULT (now()),
	`unsubscribedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `newsletterSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletterSubscriptions_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `parentInviteTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`parentId` int,
	`token` varchar(128) NOT NULL,
	`parentName` varchar(256),
	`parentEmail` varchar(320),
	`parentPhone` varchar(32),
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `parentInviteTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `parentInviteTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `preferredName` varchar(64);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `aiWelcomeMessage` text;