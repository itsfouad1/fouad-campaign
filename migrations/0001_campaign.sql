CREATE TABLE `donations` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`invoice_id` text,
	`checkout_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `donations_invoice_id_unique` ON `donations` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `updates` (
	`id` text PRIMARY KEY NOT NULL,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`body_ar` text NOT NULL,
	`body_en` text NOT NULL,
	`created_at` text NOT NULL
);
