CREATE TABLE `paperPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paperType` varchar(100) NOT NULL,
	`grammage` varchar(20) NOT NULL,
	`pricePerSheet` decimal(10,2) NOT NULL,
	`currency` varchar(5) NOT NULL DEFAULT 'YER',
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paperPrices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savedQuotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteNumber` varchar(20) NOT NULL,
	`customerName` varchar(255),
	`customerId` int,
	`productType` varchar(50) NOT NULL,
	`currency` varchar(5) NOT NULL DEFAULT 'YER',
	`totalCost` decimal(12,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`unitPrice` decimal(10,2) DEFAULT '0',
	`profitMargin` decimal(5,2) DEFAULT '20',
	`quantity` int NOT NULL,
	`pricingData` json NOT NULL,
	`status` enum('draft','sent','accepted','rejected','converted') DEFAULT 'draft',
	`convertedInvoiceId` int,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `savedQuotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `savedQuotes_quoteNumber_unique` UNIQUE(`quoteNumber`)
);
