CREATE TABLE `referralSignups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referralId` int NOT NULL,
	`referrerId` int NOT NULL,
	`newUserId` int NOT NULL,
	`newUserEmail` varchar(320),
	`signedUpAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referralSignups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`clickCount` int NOT NULL DEFAULT 0,
	`signupCount` int NOT NULL DEFAULT 0,
	`targetRole` enum('parent','student','teacher') DEFAULT 'parent',
	`note` varchar(256),
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `studentInviteTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`childId` int,
	`token` varchar(128) NOT NULL,
	`childName` varchar(256),
	`childEmail` varchar(320),
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `studentInviteTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `studentInviteTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dateOfBirth` varchar(16),
	`gender` varchar(64),
	`city` varchar(128),
	`state` varchar(64),
	`country` varchar(64) DEFAULT 'US',
	`schoolDistrict` varchar(256),
	`schoolType` enum('public','private','homeschool','charter','other'),
	`schoolName` varchar(256),
	`gradeLevel` varchar(16),
	`parentSignupReason` text,
	`parentGoalCategory` varchar(64),
	`parentGoalDetail` text,
	`onboardingCompleted` boolean NOT NULL DEFAULT false,
	`onboardingStep` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
