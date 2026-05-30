CREATE TABLE `assessmentTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stateId` int,
	`courseId` int NOT NULL,
	`assessmentRegime` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`itemCount` int NOT NULL DEFAULT 54,
	`timeLimitMinutes` int,
	`difficultyDistribution` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessmentTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(8) NOT NULL,
	`name` varchar(128) NOT NULL,
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `districts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stateId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`shortName` varchar(64),
	`ncescode` varchar(16),
	`defaultFrameworkId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `districts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollmentContexts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`courseId` int NOT NULL,
	`districtId` int,
	`stateId` int,
	`frameworkId` int NOT NULL,
	`trackId` int,
	`pacingGuideId` int,
	`academicYear` varchar(16) NOT NULL DEFAULT '2025-26',
	`gradeLevel` varchar(8),
	`hasIep` boolean NOT NULL DEFAULT false,
	`isEl` boolean NOT NULL DEFAULT false,
	`isGt` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`previousContextId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollmentContexts_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollment_ctx_student_course_year_unique` UNIQUE(`studentId`,`courseId`,`academicYear`)
);
--> statement-breakpoint
CREATE TABLE `learningObjectives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`standardId` int NOT NULL,
	`description` text NOT NULL,
	`masteryThreshold` int NOT NULL DEFAULT 75,
	`bloomsLevel` enum('remember','understand','apply','analyze','evaluate','create'),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learningObjectives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `masteryRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`objectiveId` int,
	`standardId` int,
	`frameworkId` int NOT NULL,
	`enrollmentContextId` int NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`isMastered` boolean NOT NULL DEFAULT false,
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastAssessedAt` timestamp DEFAULT (now()),
	`sourceType` enum('quiz','diagnostic','manual','backfill') NOT NULL DEFAULT 'backfill',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `masteryRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `mastery_student_obj_unique` UNIQUE(`studentId`,`objectiveId`,`enrollmentContextId`)
);
--> statement-breakpoint
CREATE TABLE `objectivePrerequisites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`objectiveId` int NOT NULL,
	`prerequisiteObjectiveId` int NOT NULL,
	CONSTRAINT `objectivePrerequisites_id` PRIMARY KEY(`id`),
	CONSTRAINT `obj_prereq_unique` UNIQUE(`objectiveId`,`prerequisiteObjectiveId`)
);
--> statement-breakpoint
CREATE TABLE `pacingGuides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`districtId` int NOT NULL,
	`courseId` int NOT NULL,
	`trackId` int,
	`academicYear` varchar(16) NOT NULL,
	`name` varchar(256) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pacingGuides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pacingWindows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pacingGuideId` int NOT NULL,
	`unitId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`weekNumber` int,
	`notes` text,
	CONSTRAINT `pacingWindows_id` PRIMARY KEY(`id`),
	CONSTRAINT `pacing_windows_guide_unit_unique` UNIQUE(`pacingGuideId`,`unitId`)
);
--> statement-breakpoint
CREATE TABLE `parentalConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`parentEmail` varchar(320) NOT NULL,
	`parentName` varchar(256),
	`token` varchar(64) NOT NULL,
	`status` enum('pending','approved','denied','expired') NOT NULL DEFAULT 'pending',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`ipAddress` varchar(64),
	CONSTRAINT `parentalConsents_id` PRIMARY KEY(`id`),
	CONSTRAINT `parentalConsents_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `resourceAdoptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`districtId` int NOT NULL,
	`courseId` int NOT NULL,
	`resourceName` varchar(256) NOT NULL,
	`publisher` varchar(256),
	`edition` varchar(64),
	`adoptionYear` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resourceAdoptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`districtId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`ncescode` varchar(16),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `schools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standardCrosswalk` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceStandardId` int NOT NULL,
	`targetStandardId` int NOT NULL,
	`alignmentType` enum('exact','partial','related') NOT NULL DEFAULT 'partial',
	`alignmentScore` float,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `standardCrosswalk_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `standardFrameworks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(256) NOT NULL,
	`stateCode` varchar(8),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `standardFrameworks_id` PRIMARY KEY(`id`),
	CONSTRAINT `standardFrameworks_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `standards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`frameworkId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`gradeLevel` varchar(16),
	`subject` varchar(64),
	`strand` varchar(128),
	`isCanonical` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `standards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countryId` int NOT NULL,
	`code` varchar(8) NOT NULL,
	`name` varchar(128) NOT NULL,
	`defaultFrameworkId` int,
	`assessmentRegime` varchar(64),
	CONSTRAINT `states_id` PRIMARY KEY(`id`),
	CONSTRAINT `states_country_code_unique` UNIQUE(`countryId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`districtId` int NOT NULL,
	`courseId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`localLabel` varchar(128) NOT NULL,
	`trackType` enum('advanced','regular','remedial','honors','ap') NOT NULL DEFAULT 'regular',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unitStandards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`unitId` int NOT NULL,
	`standardId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	CONSTRAINT `unitStandards_id` PRIMARY KEY(`id`),
	CONSTRAINT `unit_standards_unique` UNIQUE(`unitId`,`standardId`)
);
--> statement-breakpoint
CREATE INDEX `assessment_templates_state_regime_course_idx` ON `assessmentTemplates` (`stateId`,`assessmentRegime`,`courseId`);--> statement-breakpoint
CREATE INDEX `districts_state_idx` ON `districts` (`stateId`);--> statement-breakpoint
CREATE INDEX `enrollment_ctx_student_active_idx` ON `enrollmentContexts` (`studentId`,`isActive`);--> statement-breakpoint
CREATE INDEX `objectives_standard_idx` ON `learningObjectives` (`standardId`);--> statement-breakpoint
CREATE INDEX `mastery_student_std_idx` ON `masteryRecords` (`studentId`,`standardId`);--> statement-breakpoint
CREATE INDEX `mastery_student_obj_idx` ON `masteryRecords` (`studentId`,`objectiveId`);--> statement-breakpoint
CREATE INDEX `pacing_district_course_year_idx` ON `pacingGuides` (`districtId`,`courseId`,`academicYear`);--> statement-breakpoint
CREATE INDEX `pacing_windows_guide_date_idx` ON `pacingWindows` (`pacingGuideId`,`endDate`);--> statement-breakpoint
CREATE INDEX `parental_consents_student_idx` ON `parentalConsents` (`studentId`);--> statement-breakpoint
CREATE INDEX `parental_consents_token_idx` ON `parentalConsents` (`token`);--> statement-breakpoint
CREATE INDEX `parental_consents_status_idx` ON `parentalConsents` (`status`);--> statement-breakpoint
CREATE INDEX `resource_adoptions_district_course_idx` ON `resourceAdoptions` (`districtId`,`courseId`);--> statement-breakpoint
CREATE INDEX `schools_district_idx` ON `schools` (`districtId`);--> statement-breakpoint
CREATE INDEX `crosswalk_source_idx` ON `standardCrosswalk` (`sourceStandardId`);--> statement-breakpoint
CREATE INDEX `crosswalk_target_idx` ON `standardCrosswalk` (`targetStandardId`);--> statement-breakpoint
CREATE INDEX `standards_framework_code_idx` ON `standards` (`frameworkId`,`code`);--> statement-breakpoint
CREATE INDEX `standards_framework_grade_idx` ON `standards` (`frameworkId`,`gradeLevel`);--> statement-breakpoint
CREATE INDEX `tracks_district_course_idx` ON `tracks` (`districtId`,`courseId`);--> statement-breakpoint
CREATE INDEX `unit_standards_unit_idx` ON `unitStandards` (`unitId`);--> statement-breakpoint
CREATE INDEX `unit_standards_standard_idx` ON `unitStandards` (`standardId`);