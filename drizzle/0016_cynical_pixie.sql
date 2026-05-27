CREATE TABLE `emailLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toEmail` varchar(320) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`templateName` varchar(128) NOT NULL,
	`status` enum('sent','failed','skipped') NOT NULL,
	`messageId` varchar(256),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailLogs_id` PRIMARY KEY(`id`)
);
