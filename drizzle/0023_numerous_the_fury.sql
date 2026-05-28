CREATE TABLE `suppressionAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suppressionId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`action` enum('suppressed','unsuppressed','updated') NOT NULL,
	`reason` enum('bounced','complained','manual'),
	`adminId` int,
	`adminName` varchar(256),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `suppressionAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `suppressionAuditLog_suppressionId_idx` ON `suppressionAuditLog` (`suppressionId`);--> statement-breakpoint
CREATE INDEX `suppressionAuditLog_email_idx` ON `suppressionAuditLog` (`email`);--> statement-breakpoint
CREATE INDEX `suppressionAuditLog_adminId_idx` ON `suppressionAuditLog` (`adminId`);