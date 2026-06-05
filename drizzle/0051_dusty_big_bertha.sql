CREATE TABLE `billingExemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('perpetual','time_limited') NOT NULL,
	`reason` text NOT NULL,
	`grantedBy` int NOT NULL,
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`endDate` timestamp,
	`enforcementDate` timestamp,
	`notifyDate` timestamp,
	`status` enum('active','expired','revoked','enforcing') NOT NULL DEFAULT 'active',
	`revokedAt` timestamp,
	`revokedBy` int,
	`revokeReason` text,
	`notificationSent` boolean NOT NULL DEFAULT false,
	`enforcementNotificationSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billingExemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `billingExemptions_userId_idx` ON `billingExemptions` (`userId`);--> statement-breakpoint
CREATE INDEX `billingExemptions_status_idx` ON `billingExemptions` (`status`);--> statement-breakpoint
CREATE INDEX `billingExemptions_endDate_idx` ON `billingExemptions` (`endDate`);--> statement-breakpoint
CREATE INDEX `billingExemptions_grantedBy_idx` ON `billingExemptions` (`grantedBy`);