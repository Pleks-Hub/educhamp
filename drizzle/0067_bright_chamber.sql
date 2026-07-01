CREATE TABLE `ttsVoiceRatings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`voiceUri` varchar(256) NOT NULL,
	`rating` varchar(16) NOT NULL,
	`sessionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ttsVoiceRatings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ttsVoiceRatings_userId_idx` ON `ttsVoiceRatings` (`userId`);--> statement-breakpoint
CREATE INDEX `ttsVoiceRatings_voiceUri_idx` ON `ttsVoiceRatings` (`voiceUri`);--> statement-breakpoint
CREATE INDEX `ttsVoiceRatings_rating_idx` ON `ttsVoiceRatings` (`rating`);