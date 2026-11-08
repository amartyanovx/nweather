CREATE TABLE `cities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_en` text NOT NULL,
	`country` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`timezone` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cities_slug_unique` ON `cities` (`slug`);