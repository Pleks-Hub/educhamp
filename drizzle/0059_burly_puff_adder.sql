CREATE TABLE `sharedTaskClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sharedTaskId` int NOT NULL,
	`studentId` int NOT NULL,
	`claimedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`proofImageUrl` text,
	`parentConfirmed` boolean,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharedTaskClaims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(64),
	`rewardXp` int NOT NULL DEFAULT 15,
	`maxClaimants` int NOT NULL DEFAULT 1,
	`dueDate` timestamp,
	`requiresProof` boolean DEFAULT false,
	`status` enum('open','in_progress','completed','expired') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sharedTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklyChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`challengeType` enum('task_count','streak_days','focus_minutes','xp_earned') NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`target` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`bonusXp` int NOT NULL DEFAULT 50,
	`status` enum('active','completed','expired','claimed') NOT NULL DEFAULT 'active',
	`completedAt` timestamp,
	`claimedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weeklyChallenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sharedTaskClaims_sharedTaskId_idx` ON `sharedTaskClaims` (`sharedTaskId`);--> statement-breakpoint
CREATE INDEX `sharedTaskClaims_studentId_idx` ON `sharedTaskClaims` (`studentId`);--> statement-breakpoint
CREATE INDEX `sharedTasks_parentId_idx` ON `sharedTasks` (`parentId`);--> statement-breakpoint
CREATE INDEX `sharedTasks_status_idx` ON `sharedTasks` (`status`);--> statement-breakpoint
CREATE INDEX `weeklyChallenges_studentId_idx` ON `weeklyChallenges` (`studentId`);--> statement-breakpoint
CREATE INDEX `weeklyChallenges_weekStart_idx` ON `weeklyChallenges` (`weekStart`);