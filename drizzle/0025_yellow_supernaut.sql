CREATE TABLE `courseRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`courseId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`rejectedBy` int,
	`approvedAt` timestamp,
	`rejectedAt` timestamp,
	`rejectionReason` text,
	`approvalToken` varchar(128),
	`tokenAction` enum('approve','reject'),
	`tokenExpiresAt` timestamp,
	`tokenUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courseRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `courseRequests_approvalToken_unique` UNIQUE(`approvalToken`)
);
--> statement-breakpoint
CREATE INDEX `courseRequests_studentId_status_idx` ON `courseRequests` (`studentId`,`status`);--> statement-breakpoint
CREATE INDEX `courseRequests_approvalToken_idx` ON `courseRequests` (`approvalToken`);--> statement-breakpoint
CREATE INDEX `courseRequests_courseId_idx` ON `courseRequests` (`courseId`);