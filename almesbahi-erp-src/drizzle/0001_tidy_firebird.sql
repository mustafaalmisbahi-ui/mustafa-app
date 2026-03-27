CREATE TABLE `activityLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`entity` varchar(50),
	`entityId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`channel` enum('instagram','tiktok','linkedin','whatsapp','email','direct','other') DEFAULT 'instagram',
	`budget` decimal(10,2) DEFAULT '0',
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('planned','active','completed','cancelled') DEFAULT 'planned',
	`leads` int DEFAULT 0,
	`conversions` int DEFAULT 0,
	`revenue` decimal(12,2) DEFAULT '0',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`company` varchar(255),
	`address` text,
	`source` enum('direct','referral','social_media','website','exhibition','other') DEFAULT 'direct',
	`notes` text,
	`rating` int DEFAULT 0,
	`totalOrders` int DEFAULT 0,
	`totalSpent` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employeeTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`orderId` int,
	`taskType` varchar(100) NOT NULL,
	`description` text,
	`quantity` int DEFAULT 0,
	`ratePerUnit` decimal(10,2) DEFAULT '0',
	`totalDue` decimal(10,2) DEFAULT '0',
	`status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employeeTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(50),
	`category` enum('carton','paper','ink','finishing_material','other') DEFAULT 'carton',
	`size` varchar(100),
	`unit` varchar(20) DEFAULT 'piece',
	`currentStock` int DEFAULT 0,
	`minStock` int DEFAULT 10,
	`unitCost` decimal(10,2) DEFAULT '0',
	`totalValue` decimal(12,2) DEFAULT '0',
	`location` varchar(100),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventoryItems_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `inventoryMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`type` enum('inbound','outbound') NOT NULL,
	`quantity` int NOT NULL,
	`reason` varchar(255),
	`orderId` int,
	`performedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(20) NOT NULL,
	`orderId` int,
	`customerId` int NOT NULL,
	`subtotal` decimal(12,2) NOT NULL,
	`taxRate` decimal(5,2) DEFAULT '15.00',
	`taxAmount` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) DEFAULT '0',
	`status` enum('draft','sent','partial','paid','overdue','cancelled') DEFAULT 'draft',
	`dueDate` timestamp,
	`notes` text,
	`items` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `orderStatusHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`fromStatus` varchar(50),
	`toStatus` varchar(50) NOT NULL,
	`changedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderStatusHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`customerId` int NOT NULL,
	`productType` enum('magazine','bag','box','invitation','folder','sticker','brochure','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) DEFAULT '0',
	`totalCost` decimal(12,2) DEFAULT '0',
	`totalPrice` decimal(12,2) DEFAULT '0',
	`profit` decimal(12,2) DEFAULT '0',
	`status` enum('pricing','design','paper_purchase','printing','external_finishing','internal_finishing','quality_check','ready_delivery','delivered','cancelled') NOT NULL DEFAULT 'pricing',
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`assignedTo` int,
	`designerId` int,
	`designApproved` boolean DEFAULT false,
	`designApprovedAt` timestamp,
	`dueDate` timestamp,
	`deliveredAt` timestamp,
	`specs` json,
	`pricingDetails` json,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `performanceEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`evaluatorId` int,
	`period` varchar(20) NOT NULL,
	`qualityScore` int DEFAULT 0,
	`speedScore` int DEFAULT 0,
	`attendanceScore` int DEFAULT 0,
	`teamworkScore` int DEFAULT 0,
	`overallScore` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performanceEvaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricingTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productType` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`paperTypes` json,
	`finishingOptions` json,
	`quantityBreaks` json,
	`defaultMargin` decimal(5,2) DEFAULT '30.00',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricingTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualityInspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`inspectorId` int,
	`result` enum('pass','fail','rework') DEFAULT 'pass',
	`checklistResults` json,
	`defects` text,
	`defectPhotos` json,
	`supplierRating` int,
	`printerRating` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qualityInspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('paper_supplier','printer','finishing_shop','die_maker','other') DEFAULT 'other',
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`rating` int DEFAULT 0,
	`totalOrders` int DEFAULT 0,
	`notes` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('receipt','payment') NOT NULL,
	`voucherNumber` varchar(20) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`invoiceId` int,
	`orderId` int,
	`customerId` int,
	`paymentMethod` enum('cash','bank_transfer','check','other') DEFAULT 'cash',
	`category` varchar(100),
	`description` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_voucherNumber_unique` UNIQUE(`voucherNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','sales','production','designer','technician','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;