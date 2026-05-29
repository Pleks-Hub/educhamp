CREATE TABLE `badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` varchar(512) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'achievement',
	`iconEmoji` varchar(8) NOT NULL DEFAULT '🏅',
	`xpReward` int NOT NULL DEFAULT 50,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`),
	CONSTRAINT `badges_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `houses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`color` varchar(32) NOT NULL DEFAULT '#4f46e5',
	`mascotEmoji` varchar(8) NOT NULL DEFAULT '🦅',
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `houses_id` PRIMARY KEY(`id`),
	CONSTRAINT `houses_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `quests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`title` varchar(128) NOT NULL,
	`description` varchar(512) NOT NULL,
	`questType` enum('daily','weekly','monthly') NOT NULL DEFAULT 'daily',
	`xpReward` int NOT NULL DEFAULT 100,
	`badgeId` int,
	`requirementType` varchar(64) NOT NULL,
	`requirementValue` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `quests_id` PRIMARY KEY(`id`),
	CONSTRAINT `quests_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `rewardRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rewardId` int NOT NULL,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	`xpSpent` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	CONSTRAINT `rewardRedemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rewardsMarketplace` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentUserId` int NOT NULL,
	`childUserId` int NOT NULL,
	`rewardTitle` varchar(256) NOT NULL,
	`xpCost` int NOT NULL,
	`category` varchar(64) DEFAULT 'custom',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rewardsMarketplace_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasonalChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(64) NOT NULL,
	`title` varchar(128) NOT NULL,
	`description` text,
	`theme` varchar(64),
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`badgeId` int,
	`xpBonus` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seasonalChallenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasonalChallenges_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastActivityDate` varchar(16),
	`streakFreezeCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `streaks_id` PRIMARY KEY(`id`),
	CONSTRAINT `streaks_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `studentLevels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`totalXp` int NOT NULL DEFAULT 0,
	`currentLevel` int NOT NULL DEFAULT 1,
	`currentLevelName` varchar(64) NOT NULL DEFAULT 'Rookie Learner',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `studentLevels_id` PRIMARY KEY(`id`),
	CONSTRAINT `studentLevels_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `userAvatars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`avatarStyle` varchar(64) NOT NULL DEFAULT 'default',
	`accessories` text,
	`backgroundColor` varchar(32) NOT NULL DEFAULT '#4f46e5',
	`petName` varchar(64),
	`unlockedItems` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userAvatars_id` PRIMARY KEY(`id`),
	CONSTRAINT `userAvatars_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `userBadges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badgeId` int NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	`seenAt` timestamp,
	CONSTRAINT `userBadges_id` PRIMARY KEY(`id`),
	CONSTRAINT `userBadges_userId_badgeId_idx` UNIQUE(`userId`,`badgeId`)
);
--> statement-breakpoint
CREATE TABLE `userHouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`houseId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`pointsContributed` int NOT NULL DEFAULT 0,
	CONSTRAINT `userHouses_id` PRIMARY KEY(`id`),
	CONSTRAINT `userHouses_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `userQuests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questId` int NOT NULL,
	`assignedDate` varchar(16) NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`xpAwarded` boolean NOT NULL DEFAULT false,
	CONSTRAINT `userQuests_id` PRIMARY KEY(`id`),
	CONSTRAINT `userQuests_userId_questId_date_idx` UNIQUE(`userId`,`questId`,`assignedDate`)
);
--> statement-breakpoint
CREATE TABLE `userSeasonalProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challengeId` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	CONSTRAINT `userSeasonalProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSeasonal_userId_challengeId_idx` UNIQUE(`userId`,`challengeId`)
);
--> statement-breakpoint
CREATE TABLE `xpLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`source` varchar(64) NOT NULL,
	`sourceId` varchar(64),
	`description` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `xpLedger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `rewardRedemptions_userId_idx` ON `rewardRedemptions` (`userId`);--> statement-breakpoint
CREATE INDEX `rewardsMarket_parentUserId_idx` ON `rewardsMarketplace` (`parentUserId`);--> statement-breakpoint
CREATE INDEX `rewardsMarket_childUserId_idx` ON `rewardsMarketplace` (`childUserId`);--> statement-breakpoint
CREATE INDEX `userBadges_userId_idx` ON `userBadges` (`userId`);--> statement-breakpoint
CREATE INDEX `userHouses_houseId_idx` ON `userHouses` (`houseId`);--> statement-breakpoint
CREATE INDEX `userQuests_userId_idx` ON `userQuests` (`userId`);--> statement-breakpoint
CREATE INDEX `userQuests_userId_date_idx` ON `userQuests` (`userId`,`assignedDate`);--> statement-breakpoint
CREATE INDEX `xpLedger_userId_idx` ON `xpLedger` (`userId`);--> statement-breakpoint
CREATE INDEX `xpLedger_userId_source_idx` ON `xpLedger` (`userId`,`source`);--> statement-breakpoint
CREATE INDEX `xpLedger_createdAt_idx` ON `xpLedger` (`createdAt`);