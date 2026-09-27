PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`date` text DEFAULT (datetime('now')) NOT NULL,
	`doc_type` text DEFAULT 'facture' NOT NULL,
	`type` text DEFAULT 'sale' NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`discount_type` text DEFAULT 'percent' NOT NULL,
	`tva_amount` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`customer_id` text DEFAULT '' NOT NULL,
	`customer_name` text DEFAULT '',
	`amount_paid` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`sold_by` text DEFAULT '' NOT NULL,
	`cash_session_id` text DEFAULT '' NOT NULL,
	`session_id` text DEFAULT '',
	`note` text DEFAULT '',
	`last_printed_at` text DEFAULT '',
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
INSERT INTO `__new_sales`("id", "number", "date", "doc_type", "type", "items", "subtotal", "discount", "discount_type", "tva_amount", "total", "payment_method", "customer_id", "customer_name", "amount_paid", "status", "sold_by", "cash_session_id", "session_id", "note", "last_printed_at", "created_at", "updated_at") SELECT "id", "number", "date", "doc_type", "type", "items", "subtotal", "discount", "discount_type", "tva_amount", "total", "payment_method", "customer_id", "customer_name", "amount_paid", "status", "sold_by", "cash_session_id", "session_id", "note", "last_printed_at", "created_at", "updated_at" FROM `sales`;--> statement-breakpoint
DROP TABLE `sales`;--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_sales_date` ON `sales` (`date`);--> statement-breakpoint
CREATE INDEX `idx_sales_customer` ON `sales` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_number` ON `sales` (`number`);--> statement-breakpoint
CREATE INDEX `idx_sales_status` ON `sales` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sales_type` ON `sales` (`type`);--> statement-breakpoint
CREATE INDEX `idx_sales_doc_type` ON `sales` (`doc_type`);--> statement-breakpoint
ALTER TABLE `customers` ADD `address` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `customers` ADD `customer_type` text DEFAULT 'retail';--> statement-breakpoint
ALTER TABLE `customers` ADD `email` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `customers` ADD `notes` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `customers` ADD `rc` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `customers` ADD `nif` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `customers` ADD `nis` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `suppliers` ADD `address` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `suppliers` ADD `email` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `suppliers` ADD `notes` text DEFAULT '';