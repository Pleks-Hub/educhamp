CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(64) NOT NULL,
	`visitorEmail` varchar(256),
	`visitorName` varchar(256),
	`visitorPhone` varchar(32),
	`source` varchar(64) DEFAULT 'landing_page',
	`status` enum('active','converted','archived') NOT NULL DEFAULT 'active',
	`messageCount` int NOT NULL DEFAULT 0,
	`lastMessageAt` timestamp,
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chatSessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
