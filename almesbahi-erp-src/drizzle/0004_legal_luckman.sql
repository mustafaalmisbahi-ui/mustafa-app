CREATE TABLE `exchangeRates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromCurrency` varchar(5) NOT NULL DEFAULT 'YER',
	`toCurrency` varchar(5) NOT NULL,
	`rate` decimal(12,4) NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exchangeRates_id` PRIMARY KEY(`id`)
);
