ALTER TABLE `emailLogs` ADD `referenceId` varchar(256);--> statement-breakpoint
ALTER TABLE `emailLogs` ADD `deliveryStatus` enum('sent','delivered','opened','bounced','complained','failed') DEFAULT 'sent';--> statement-breakpoint
ALTER TABLE `emailLogs` ADD `deliveryUpdatedAt` timestamp;