ALTER TABLE `userProfiles` ADD `emailDigestEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `emailAchievementsEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `emailRemindersEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `billingEscalatedAt` timestamp;