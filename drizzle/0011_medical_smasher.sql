CREATE TABLE `newsletterCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`bodyHtml` text NOT NULL,
	`bodyText` text,
	`segment` enum('all','students','parents','landing_page') NOT NULL DEFAULT 'all',
	`status` enum('draft','scheduled','sent','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`recipientCount` int DEFAULT 0,
	`openCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`aiGenerated` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletterCampaigns_id` PRIMARY KEY(`id`)
);
