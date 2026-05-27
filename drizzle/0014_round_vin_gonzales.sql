CREATE TABLE `adminRoleAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `adminRoleAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_role_unique` UNIQUE(`userId`,`roleId`)
);
--> statement-breakpoint
CREATE TABLE `adminRoles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`isSystem` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminRoles_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminRoles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `cmsContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`section` varchar(64) NOT NULL,
	`label` varchar(256) NOT NULL,
	`contentType` enum('text','richtext','image','url','boolean') NOT NULL DEFAULT 'text',
	`publishedValue` text,
	`draftValue` text,
	`isDraft` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cmsContent_id` PRIMARY KEY(`id`),
	CONSTRAINT `cmsContent_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `cmsContentHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentId` int NOT NULL,
	`version` int NOT NULL,
	`value` text,
	`changedBy` int,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	`changeNote` varchar(512),
	CONSTRAINT `cmsContentHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rolePermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleId` int NOT NULL,
	`resource` varchar(64) NOT NULL,
	`action` varchar(32) NOT NULL,
	CONSTRAINT `rolePermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_resource_action_unique` UNIQUE(`roleId`,`resource`,`action`)
);
--> statement-breakpoint
ALTER TABLE `courses` ADD `status` enum('active','archived','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `diagnosticCooldownDays` int DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','suspended','archived','deleted') DEFAULT 'active' NOT NULL;