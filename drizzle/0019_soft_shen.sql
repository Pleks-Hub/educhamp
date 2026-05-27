CREATE TABLE `demoRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(256) NOT NULL,
	`schoolName` varchar(256) NOT NULL,
	`roleTitle` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`numStudents` varchar(64),
	`gradeLevels` text,
	`subjects` text,
	`challenges` text,
	`interestType` enum('demo','pilot','district_license','campus_license','partnership','curriculum_licensing','other') NOT NULL DEFAULT 'demo',
	`preferredTime` varchar(128),
	`notes` text,
	`status` enum('new','contacted','demo_scheduled','proposal_sent','closed_won','closed_lost','on_hold') NOT NULL DEFAULT 'new',
	`assignedTo` varchar(256),
	`adminNotes` text,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demoRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `demoRequests_email_idx` ON `demoRequests` (`email`);--> statement-breakpoint
CREATE INDEX `demoRequests_status_idx` ON `demoRequests` (`status`);--> statement-breakpoint
CREATE INDEX `demoRequests_createdAt_idx` ON `demoRequests` (`createdAt`);