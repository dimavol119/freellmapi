CREATE TABLE `google_identities` (
	`google_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_identities_user_id_unique` ON `google_identities` (`user_id`);--> statement-breakpoint
CREATE TABLE `google_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`expires_at` integer NOT NULL,
	`verifier` text NOT NULL,
	`nonce` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
