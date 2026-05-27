CREATE TABLE `couponRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponId` int NOT NULL,
	`userId` int NOT NULL,
	`planName` varchar(128) NOT NULL,
	`billingPeriod` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
	`originalAmountCents` int NOT NULL,
	`discountAmountCents` int NOT NULL,
	`finalAmountCents` int NOT NULL,
	`stripeCheckoutSessionId` varchar(256),
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couponRedemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`discountType` enum('percentage','fixed') NOT NULL,
	`discountValue` float NOT NULL,
	`maxDiscountAmount` float,
	`applicablePlans` json NOT NULL DEFAULT ('[]'),
	`eligibility` enum('all','new_users','parents','students','schools','selected') NOT NULL DEFAULT 'all',
	`selectedUserIds` json,
	`minAmount` float,
	`usageLimit` int,
	`perUserLimit` int NOT NULL DEFAULT 1,
	`usageCount` int NOT NULL DEFAULT 0,
	`duration` enum('once','repeating','forever') NOT NULL DEFAULT 'once',
	`durationMonths` int,
	`startDate` timestamp,
	`expiresAt` timestamp,
	`status` enum('active','paused','expired','archived') NOT NULL DEFAULT 'active',
	`isStackable` boolean NOT NULL DEFAULT false,
	`stripeCouponId` varchar(128),
	`stripePromotionCodeId` varchar(128),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`),
	CONSTRAINT `coupons_code_idx` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `paymentAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`event` varchar(128) NOT NULL,
	`stripeEventId` varchar(256),
	`stripeObjectId` varchar(256),
	`amountCents` int,
	`currency` varchar(8),
	`status` varchar(64),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentAuditLog_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentAuditLog_stripeEventId_unique` UNIQUE(`stripeEventId`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planName` varchar(128) NOT NULL,
	`billingPeriod` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
	`status` enum('trialing','active','past_due','canceled','unpaid','incomplete') NOT NULL DEFAULT 'active',
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`stripeCheckoutSessionId` varchar(256),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`canceledAt` timestamp,
	`trialEnd` timestamp,
	`amountCents` int,
	`currency` varchar(8) NOT NULL DEFAULT 'usd',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `billingPeriod` enum('monthly','annual') DEFAULT 'monthly';--> statement-breakpoint
CREATE INDEX `couponRedemptions_couponId_idx` ON `couponRedemptions` (`couponId`);--> statement-breakpoint
CREATE INDEX `couponRedemptions_userId_idx` ON `couponRedemptions` (`userId`);--> statement-breakpoint
CREATE INDEX `coupons_status_idx` ON `coupons` (`status`);--> statement-breakpoint
CREATE INDEX `paymentAuditLog_userId_idx` ON `paymentAuditLog` (`userId`);--> statement-breakpoint
CREATE INDEX `paymentAuditLog_event_idx` ON `paymentAuditLog` (`event`);--> statement-breakpoint
CREATE INDEX `paymentAuditLog_createdAt_idx` ON `paymentAuditLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `subscriptions_userId_idx` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `subscriptions_stripeSubscriptionId_idx` ON `subscriptions` (`stripeSubscriptionId`);