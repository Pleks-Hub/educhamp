CREATE TABLE `skillReviewSchedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skillId` varchar(32) NOT NULL,
	`courseId` int NOT NULL,
	`easeFactor` decimal(4,2) NOT NULL DEFAULT '2.50',
	`interval` int NOT NULL DEFAULT 1,
	`repetitions` int NOT NULL DEFAULT 0,
	`lastReviewedAt` timestamp,
	`nextReviewAt` timestamp NOT NULL,
	`totalReviews` int NOT NULL DEFAULT 0,
	`correctReviews` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skillReviewSchedule_id` PRIMARY KEY(`id`),
	CONSTRAINT `skillReview_userId_skillId_idx` UNIQUE(`userId`,`skillId`)
);
--> statement-breakpoint
CREATE INDEX `skillReview_userId_idx` ON `skillReviewSchedule` (`userId`);--> statement-breakpoint
CREATE INDEX `skillReview_nextReview_idx` ON `skillReviewSchedule` (`userId`,`nextReviewAt`);--> statement-breakpoint
CREATE INDEX `skillReview_courseId_idx` ON `skillReviewSchedule` (`courseId`);