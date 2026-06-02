CREATE TABLE `billingDelegations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`parentEmail` varchar(320) NOT NULL,
	`parentName` varchar(256),
	`parentUserId` int,
	`token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`rejectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billingDelegations_id` PRIMARY KEY(`id`),
	CONSTRAINT `billingDelegations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cardOnFile` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripePaymentMethodId` varchar(128);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cardLast4` varchar(4);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cardBrand` varchar(32);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cardExpMonth` int;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cardExpYear` int;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `suspendedBy` int;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `suspendReason` text;--> statement-breakpoint
CREATE INDEX `billingDelegations_studentId_idx` ON `billingDelegations` (`studentId`);--> statement-breakpoint
CREATE INDEX `billingDelegations_parentEmail_idx` ON `billingDelegations` (`parentEmail`);--> statement-breakpoint
CREATE INDEX `billingDelegations_token_idx` ON `billingDelegations` (`token`);