CREATE TABLE `taskCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6366f1',
	`icon` varchar(32) NOT NULL DEFAULT 'folder',
	`isDefault` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `taskCategories_parentId_name_idx` UNIQUE(`parentId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `taskCategories_parentId_idx` ON `taskCategories` (`parentId`);