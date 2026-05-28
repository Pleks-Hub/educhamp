CREATE TABLE `emailSuppression` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`reason` enum('bounced','complained','manual') NOT NULL,
	`resendEventId` varchar(256),
	`suppressedAt` timestamp NOT NULL DEFAULT (now()),
	`unsuppressedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	CONSTRAINT `emailSuppression_id` PRIMARY KEY(`id`),
	CONSTRAINT `emailSuppression_email_unique` UNIQUE(`email`),
	CONSTRAINT `emailSuppression_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `emailSuppression_isActive_idx` ON `emailSuppression` (`isActive`);