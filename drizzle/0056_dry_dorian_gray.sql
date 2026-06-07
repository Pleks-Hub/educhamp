ALTER TABLE `parentTaskCompletions` ADD `proofImageUrl` text;--> statement-breakpoint
ALTER TABLE `parentTasks` ADD `requiresProof` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `parentTasks` ADD `encouragementNote` text;