ALTER TABLE `units` DROP INDEX `units_unitNumber_unique`;--> statement-breakpoint
ALTER TABLE `units` ADD `courseId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `units` ADD CONSTRAINT `course_unit_unique` UNIQUE(`courseId`,`unitNumber`);