CREATE TABLE `adminAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64),
	`targetId` int,
	`details` json,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseCode` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`subject` varchar(64) NOT NULL,
	`gradeLevel` varchar(16) NOT NULL,
	`description` text,
	`teksCode` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`isDefault` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_courseCode_unique` UNIQUE(`courseCode`)
);
--> statement-breakpoint
CREATE TABLE `platformSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`label` varchar(256),
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platformSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `platformSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `userCourseEnrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`isCurrent` boolean NOT NULL DEFAULT false,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userCourseEnrollments_id` PRIMARY KEY(`id`)
);
