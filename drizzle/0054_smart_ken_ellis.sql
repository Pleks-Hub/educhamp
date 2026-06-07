CREATE TABLE `parentTaskCompletions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`studentId` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`note` text,
	`parentConfirmed` boolean,
	`parentConfirmedAt` timestamp,
	`parentNote` text,
	CONSTRAINT `parentTaskCompletions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parentTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`studentId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`taskType` enum('one_off','recurring','time_bound') NOT NULL DEFAULT 'one_off',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp,
	`startDate` timestamp,
	`recurrenceRule` varchar(64),
	`recurrenceDays` json,
	`recurrenceEndDate` timestamp,
	`category` varchar(64),
	`rewardXp` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parentTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `parentTaskCompletions_taskId_idx` ON `parentTaskCompletions` (`taskId`);--> statement-breakpoint
CREATE INDEX `parentTaskCompletions_studentId_idx` ON `parentTaskCompletions` (`studentId`);--> statement-breakpoint
CREATE INDEX `parentTasks_parentId_idx` ON `parentTasks` (`parentId`);--> statement-breakpoint
CREATE INDEX `parentTasks_studentId_idx` ON `parentTasks` (`studentId`);--> statement-breakpoint
CREATE INDEX `parentTasks_status_idx` ON `parentTasks` (`status`);--> statement-breakpoint
CREATE INDEX `parentTasks_dueDate_idx` ON `parentTasks` (`dueDate`);