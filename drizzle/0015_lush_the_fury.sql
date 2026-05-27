ALTER TABLE `parentInviteTokens` MODIFY COLUMN `status` enum('pending','accepted','expired','revoked','rejected') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `parentInviteTokens` ADD `studentName` varchar(256);--> statement-breakpoint
ALTER TABLE `parentInviteTokens` ADD `studentGrade` varchar(64);--> statement-breakpoint
ALTER TABLE `parentInviteTokens` ADD `courseName` varchar(256);--> statement-breakpoint
ALTER TABLE `parentInviteTokens` ADD `rejectedAt` timestamp;