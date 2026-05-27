ALTER TABLE `lessonProgress` ADD CONSTRAINT `lessonProgress_userId_lessonId_idx` UNIQUE(`userId`,`lessonId`);--> statement-breakpoint
ALTER TABLE `unitProgress` ADD CONSTRAINT `unitProgress_userId_unitId_idx` UNIQUE(`userId`,`unitId`);--> statement-breakpoint
ALTER TABLE `userCourseEnrollments` ADD CONSTRAINT `userCourseEnrollments_userId_courseId_idx` UNIQUE(`userId`,`courseId`);--> statement-breakpoint
ALTER TABLE `userMastery` ADD CONSTRAINT `userMastery_userId_skillId_idx` UNIQUE(`userId`,`skillId`);--> statement-breakpoint
CREATE INDEX `diagnosticAttempts_userId_idx` ON `diagnosticAttempts` (`userId`);--> statement-breakpoint
CREATE INDEX `diagnosticAttempts_userId_courseId_idx` ON `diagnosticAttempts` (`userId`,`courseId`);--> statement-breakpoint
CREATE INDEX `lessonProgress_userId_idx` ON `lessonProgress` (`userId`);--> statement-breakpoint
CREATE INDEX `quizAttempts_userId_idx` ON `quizAttempts` (`userId`);--> statement-breakpoint
CREATE INDEX `quizAttempts_userId_unitId_idx` ON `quizAttempts` (`userId`,`unitId`);--> statement-breakpoint
CREATE INDEX `unitProgress_userId_idx` ON `unitProgress` (`userId`);--> statement-breakpoint
CREATE INDEX `userCourseEnrollments_userId_idx` ON `userCourseEnrollments` (`userId`);--> statement-breakpoint
CREATE INDEX `userMastery_userId_idx` ON `userMastery` (`userId`);--> statement-breakpoint
CREATE INDEX `userNotifications_userId_idx` ON `userNotifications` (`userId`);--> statement-breakpoint
CREATE INDEX `userNotifications_userId_isRead_idx` ON `userNotifications` (`userId`,`isRead`);