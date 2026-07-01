CREATE TABLE `ttsUsageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseSubject` varchar(128) NOT NULL,
	`sessionDurationMs` int NOT NULL DEFAULT 0,
	`sentencesRead` int NOT NULL DEFAULT 0,
	`speed` varchar(16) DEFAULT 'normal',
	`voiceUri` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ttsUsageLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ttsUsageLogs_userId_idx` ON `ttsUsageLogs` (`userId`);--> statement-breakpoint
CREATE INDEX `ttsUsageLogs_courseSubject_idx` ON `ttsUsageLogs` (`courseSubject`);--> statement-breakpoint
CREATE INDEX `ttsUsageLogs_createdAt_idx` ON `ttsUsageLogs` (`createdAt`);