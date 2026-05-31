CREATE TABLE `emailLogsArchive` (
	`id` int NOT NULL,
	`toEmail` varchar(512) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`templateName` varchar(128) NOT NULL,
	`status` enum('sent','failed','skipped','delivered','bounced','complained') NOT NULL,
	`messageId` varchar(256),
	`referenceId` varchar(256),
	`errorMessage` text,
	`deliveryStatus` enum('sent','delivered','opened','bounced','complained','failed'),
	`deliveryUpdatedAt` timestamp,
	`provider` varchar(50) DEFAULT 'resend',
	`recipientId` int,
	`createdAt` timestamp NOT NULL,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailLogsArchive_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('resend','smtp','sendgrid') NOT NULL,
	`fromAddress` varchar(256) NOT NULL,
	`fromName` varchar(100) NOT NULL,
	`replyTo` varchar(256),
	`apiKey` varchar(1024) NOT NULL,
	`smtpHost` varchar(256),
	`smtpPort` int,
	`smtpSecure` boolean,
	`smtpUsername` varchar(256),
	`webhookSecret` varchar(512),
	`isActive` boolean NOT NULL DEFAULT false,
	`lastTestedAt` timestamp,
	`lastTestStatus` enum('ok','failed'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL DEFAULT 1,
	CONSTRAINT `emailSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `emailLogsArchive_createdAt_idx` ON `emailLogsArchive` (`createdAt`);--> statement-breakpoint
CREATE INDEX `emailLogsArchive_status_idx` ON `emailLogsArchive` (`status`);--> statement-breakpoint
CREATE INDEX `emailLogsArchive_toEmail_idx` ON `emailLogsArchive` (`toEmail`);--> statement-breakpoint
CREATE INDEX `emailSettings_isActive_idx` ON `emailSettings` (`isActive`);--> statement-breakpoint
CREATE INDEX `emailSettings_provider_idx` ON `emailSettings` (`provider`);