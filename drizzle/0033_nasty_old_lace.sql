CREATE INDEX `parentChildren_parentId_idx` ON `parentChildren` (`parentId`);--> statement-breakpoint
CREATE INDEX `parentChildren_childId_idx` ON `parentChildren` (`childId`);--> statement-breakpoint
CREATE INDEX `tutorSessions_userId_idx` ON `tutorSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `tutorSessions_userId_updatedAt_idx` ON `tutorSessions` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_last_active_idx` ON `users` (`lastActiveAt`);