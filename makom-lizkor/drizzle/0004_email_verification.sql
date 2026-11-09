CREATE TABLE `email_verifications` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD `email_verified_at` integer;--> statement-breakpoint
-- Accounts created before verification existed keep working without a code (0 = not required).
UPDATE `accounts` SET `email_verified_at` = 0;
