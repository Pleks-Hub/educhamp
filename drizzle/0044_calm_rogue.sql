CREATE TABLE `courseCertificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`certificateToken` varchar(64) NOT NULL,
	`averageMastery` float NOT NULL,
	`masterySnapshot` json NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courseCertificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `courseCertificates_certificateToken_unique` UNIQUE(`certificateToken`),
	CONSTRAINT `cert_user_course_unique` UNIQUE(`userId`,`courseId`)
);
--> statement-breakpoint
CREATE INDEX `cert_token_idx` ON `courseCertificates` (`certificateToken`);--> statement-breakpoint
CREATE INDEX `cert_user_idx` ON `courseCertificates` (`userId`);