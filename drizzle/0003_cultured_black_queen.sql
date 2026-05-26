CREATE TABLE `coParentAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`coParentUserId` int NOT NULL,
	`invitedByParentId` int NOT NULL,
	`invitationId` int NOT NULL,
	`relationship` varchar(64) DEFAULT 'guardian',
	`isActive` boolean NOT NULL DEFAULT true,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `coParentAccess_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coParentInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`invitedByParentId` int NOT NULL,
	`inviteeEmail` varchar(320) NOT NULL,
	`inviteeName` varchar(256),
	`relationship` varchar(64) DEFAULT 'guardian',
	`token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coParentInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `coParentInvitations_token_unique` UNIQUE(`token`)
);
