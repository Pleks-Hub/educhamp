CREATE TABLE `enrolmentInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childEmail` varchar(320) NOT NULL,
	`childName` varchar(256),
	`token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enrolmentInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrolmentInvitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `parentChildren` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int NOT NULL,
	`nickname` varchar(128),
	`relationship` varchar(64) DEFAULT 'parent',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `parentChildren_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `accountType` enum('student','parent','teacher') DEFAULT 'student' NOT NULL;