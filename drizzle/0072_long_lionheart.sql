CREATE TABLE `impersonationAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`adminId` int NOT NULL,
	`impersonatedUserId` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`path` varchar(500),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `impersonationAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `impAudit_session_idx` ON `impersonationAuditLog` (`sessionId`);--> statement-breakpoint
CREATE INDEX `impAudit_admin_idx` ON `impersonationAuditLog` (`adminId`);--> statement-breakpoint
CREATE INDEX `impAudit_createdAt_idx` ON `impersonationAuditLog` (`createdAt`);