CREATE TABLE `parentPlanSuggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`studentId` int NOT NULL,
	`title` varchar(256) DEFAULT 'Suggested Learning Plan',
	`hoursPerWeek` int NOT NULL DEFAULT 5,
	`preferredDays` json NOT NULL,
	`schedule` json NOT NULL,
	`message` text,
	`status` enum('pending','accepted','modified','declined') NOT NULL DEFAULT 'pending',
	`studentResponse` text,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parentPlanSuggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `planSuggestion_parent_idx` ON `parentPlanSuggestions` (`parentId`);--> statement-breakpoint
CREATE INDEX `planSuggestion_student_idx` ON `parentPlanSuggestions` (`studentId`);--> statement-breakpoint
CREATE INDEX `planSuggestion_status_idx` ON `parentPlanSuggestions` (`status`);