ALTER TABLE `studentInviteTokens` ADD `lastResentAt` timestamp;--> statement-breakpoint
ALTER TABLE `studentInviteTokens` ADD `reminderSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `inviteRemindersEnabled` boolean DEFAULT true NOT NULL;