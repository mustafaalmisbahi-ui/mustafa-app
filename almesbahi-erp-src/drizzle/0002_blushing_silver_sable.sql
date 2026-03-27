ALTER TABLE `invoices` ADD `currency` varchar(5) DEFAULT 'YER' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `currency` varchar(5) DEFAULT 'YER' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `currency` varchar(5) DEFAULT 'YER' NOT NULL;