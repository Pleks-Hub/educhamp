CREATE TABLE `inactivityNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`notificationType` enum('7day','14day','30day','manual') NOT NULL,
	`recipientType` enum('student','parent') NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`inactiveDays` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inactivityNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `status` enum('active','suspended','deactivated','pending_verification','archived','deleted') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `lastActiveAt` timestamp;--> statement-breakpoint
CREATE INDEX `inactivityNotif_studentId_type_idx` ON `inactivityNotifications` (`studentId`,`notificationType`);