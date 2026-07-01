ALTER TABLE `userProfiles` ADD `ttsEnabledDefault` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `ttsSpeed` enum('slow','normal','fast') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `ttsSubjectOverrides` json;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `ttsFirstTimeTooltipShown` boolean DEFAULT false NOT NULL;