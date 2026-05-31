CREATE INDEX `emailLogs_toEmail_idx` ON `emailLogs` (`toEmail`);--> statement-breakpoint
CREATE INDEX `emailLogs_status_idx` ON `emailLogs` (`status`);--> statement-breakpoint
CREATE INDEX `emailLogs_createdAt_idx` ON `emailLogs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `parentInviteTokens_studentId_status_idx` ON `parentInviteTokens` (`studentId`,`status`);--> statement-breakpoint
CREATE INDEX `parentInviteTokens_parentId_idx` ON `parentInviteTokens` (`parentId`);--> statement-breakpoint
CREATE INDEX `parentInviteTokens_status_expiresAt_idx` ON `parentInviteTokens` (`status`,`expiresAt`);