CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text DEFAULT '',
	`user_id` text NOT NULL,
	`details` text DEFAULT '',
	`timestamp` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_user` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE TABLE `barcode_prints` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`barcode` text NOT NULL,
	`label_size` text NOT NULL,
	`copies` integer DEFAULT 1 NOT NULL,
	`barcode_type` text DEFAULT 'ean13' NOT NULL,
	`show_company` integer DEFAULT 0 NOT NULL,
	`show_product` integer DEFAULT 1 NOT NULL,
	`show_sku` integer DEFAULT 0 NOT NULL,
	`show_price` integer DEFAULT 1 NOT NULL,
	`show_barcode` integer DEFAULT 1 NOT NULL,
	`enlarge_price` integer DEFAULT 0 NOT NULL,
	`print_options` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_barcode_prints_product` ON `barcode_prints` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_barcode_prints_created` ON `barcode_prints` (`created_at`);--> statement-breakpoint
CREATE TABLE `capital_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE INDEX `idx_capital_entries_type` ON `capital_entries` (`type`);--> statement-breakpoint
CREATE INDEX `idx_capital_entries_date` ON `capital_entries` (`date`);--> statement-breakpoint
CREATE TABLE `cash_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text DEFAULT '',
	`session_number` integer NOT NULL,
	`opened_by` text NOT NULL,
	`opened_at` text NOT NULL,
	`closed_at` text DEFAULT '' NOT NULL,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`closing_balance` real DEFAULT 0,
	`expected_balance` real DEFAULT 0,
	`actual_balance` real DEFAULT 0,
	`difference` real DEFAULT 0,
	`deposits` text DEFAULT '[]' NOT NULL,
	`total_sales` real DEFAULT 0 NOT NULL,
	`total_returns` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`note` text DEFAULT '',
	`created_at` text DEFAULT datetime('now'),
	`updated_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_status` ON `cash_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_cash_sessions_opened` ON `cash_sessions` (`opened_at`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_categories_name` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `connected_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`device_name` text NOT NULL,
	`device_type` text NOT NULL,
	`connection_type` text NOT NULL,
	`ip_address` text DEFAULT '',
	`mac_address` text DEFAULT '',
	`port` integer,
	`status` text DEFAULT 'offline' NOT NULL,
	`last_seen` text DEFAULT '',
	`vendor` text DEFAULT '',
	`model` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_connected_devices_type` ON `connected_devices` (`device_type`);--> statement-breakpoint
CREATE INDEX `idx_connected_devices_status` ON `connected_devices` (`status`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`credit_limit` real DEFAULT 0 NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT datetime('now'),
	`updated_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE TABLE `device_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_token` text NOT NULL,
	`device_id` text NOT NULL,
	`device_name` text DEFAULT '',
	`user_id` text,
	`paired_at` text DEFAULT datetime('now') NOT NULL,
	`last_seen` text DEFAULT datetime('now') NOT NULL,
	`expires_at` text,
	`created_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_sessions_session_token_unique` ON `device_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_device_sessions_token` ON `device_sessions` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_device_sessions_device` ON `device_sessions` (`device_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`label` text NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '',
	`created_by` text DEFAULT '',
	`created_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE INDEX `idx_expenses_date` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_category` ON `expenses` (`category`);--> statement-breakpoint
CREATE TABLE `inventory_count_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`count_id` text NOT NULL,
	`item_id` text NOT NULL,
	`expected_qty` real DEFAULT 0 NOT NULL,
	`actual_qty` real DEFAULT 0 NOT NULL,
	`variance` real DEFAULT 0 NOT NULL,
	`line_number` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_icl_count` ON `inventory_count_lines` (`count_id`);--> statement-breakpoint
CREATE INDEX `idx_icl_item` ON `inventory_count_lines` (`item_id`);--> statement-breakpoint
CREATE TABLE `inventory_counts` (
	`id` text PRIMARY KEY NOT NULL,
	`count_number` text NOT NULL,
	`date` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_closed` integer DEFAULT 0 NOT NULL,
	`closed_by` text DEFAULT '',
	`closed_at` text DEFAULT '',
	`created_by` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ic_number` ON `inventory_counts` (`count_number`);--> statement-breakpoint
CREATE INDEX `idx_ic_warehouse` ON `inventory_counts` (`warehouse_id`);--> statement-breakpoint
CREATE INDEX `idx_ic_status` ON `inventory_counts` (`status`);--> statement-breakpoint
CREATE TABLE `network_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`lan_enabled` integer DEFAULT 0 NOT NULL,
	`server_ip` text DEFAULT '' NOT NULL,
	`server_port` integer DEFAULT 3000 NOT NULL,
	`protocol` text DEFAULT 'http' NOT NULL,
	`ssl_cert_path` text DEFAULT '',
	`ssl_key_path` text DEFAULT '',
	`connection_key` text DEFAULT '',
	`auto_reconnect` integer DEFAULT 1 NOT NULL,
	`reconnect_interval` integer DEFAULT 5 NOT NULL,
	`cloud_enabled` integer DEFAULT 0 NOT NULL,
	`api_url` text DEFAULT '',
	`api_key` text DEFAULT '',
	`webhook_url` text DEFAULT '',
	`webhook_secret` text DEFAULT '',
	`cors_origins` text DEFAULT '',
	`sync_auto` integer DEFAULT 1 NOT NULL,
	`sync_interval` integer DEFAULT 5 NOT NULL,
	`sync_type` text DEFAULT 'incremental' NOT NULL,
	`sync_time` text DEFAULT 'night' NOT NULL,
	`alert_on_sync_fail` integer DEFAULT 1 NOT NULL,
	`sync_fail_count` integer DEFAULT 0 NOT NULL,
	`oauth_enabled` integer DEFAULT 0 NOT NULL,
	`jwt_enabled` integer DEFAULT 0 NOT NULL,
	`api_rate_limit` integer DEFAULT 100 NOT NULL,
	`ip_whitelist` text DEFAULT '[]' NOT NULL,
	`force_https` integer DEFAULT 1 NOT NULL,
	`printer_connection` text DEFAULT 'usb' NOT NULL,
	`printer_driver` text DEFAULT 'esc_pos' NOT NULL,
	`printer_dpi` integer DEFAULT 203 NOT NULL,
	`printer_speed` integer DEFAULT 150 NOT NULL,
	`printer_paper_size` integer DEFAULT 80 NOT NULL,
	`printer_host` text DEFAULT '',
	`printer_port` integer,
	`printer_tested_at` text DEFAULT '',
	`barcode_type` text DEFAULT 'code128' NOT NULL,
	`scanner_type` text DEFAULT 'handheld' NOT NULL,
	`scanner_interface` text DEFAULT 'usb' NOT NULL,
	`scanner_speed` integer DEFAULT 100 NOT NULL,
	`scanner_dpi` integer DEFAULT 200 NOT NULL,
	`scanner_tested_at` text DEFAULT '',
	`scanner_beep_enabled` integer DEFAULT 1 NOT NULL,
	`scanner_terminator` text DEFAULT 'Enter' NOT NULL,
	`scanner_min_length` integer DEFAULT 6 NOT NULL,
	`scanner_allow_manual_types` integer DEFAULT 1 NOT NULL,
	`last_connected_at` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE TABLE `packs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`barcode` text DEFAULT '' NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`pack_price` real DEFAULT 0 NOT NULL,
	`pack_type` text DEFAULT 'pack' NOT NULL,
	`unit_name` text DEFAULT 'كرتون',
	`pieces_count` integer DEFAULT 1,
	`min_wholesale_qty` integer DEFAULT 1,
	`items` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_packs_barcode` ON `packs` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_packs_status` ON `packs` (`status`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`party_type` text DEFAULT 'customer' NOT NULL,
	`party_id` text NOT NULL,
	`customer_id` text DEFAULT '',
	`amount` real DEFAULT 0 NOT NULL,
	`type` text DEFAULT 'debit',
	`method` text DEFAULT 'cash',
	`note` text DEFAULT '',
	`created_by` text DEFAULT '',
	`created_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE INDEX `idx_payments_customer` ON `payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_party` ON `payments` (`party_id`,`party_type`);--> statement-breakpoint
CREATE INDEX `idx_payments_date` ON `payments` (`date`);--> statement-breakpoint
CREATE TABLE `print_failure_counter` (
	`id` text PRIMARY KEY NOT NULL,
	`printer_id` text,
	`template_id` text,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`last_failure_at` text DEFAULT datetime('now') NOT NULL,
	`last_error` text DEFAULT '',
	`notified` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_pfc_printer` ON `print_failure_counter` (`printer_id`);--> statement-breakpoint
CREATE INDEX `idx_pfc_template` ON `print_failure_counter` (`template_id`);--> statement-breakpoint
CREATE TABLE `print_history` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`invoice_type` text NOT NULL,
	`doc_type_key` text NOT NULL,
	`template_id` text NOT NULL,
	`printed_by` text NOT NULL,
	`printed_at` text DEFAULT datetime('now') NOT NULL,
	`copies` integer DEFAULT 1 NOT NULL,
	`printer_name` text DEFAULT '' NOT NULL,
	`is_reprint` integer DEFAULT 0 NOT NULL,
	`payload` text DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX `idx_print_history_invoice` ON `print_history` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_print_history_template` ON `print_history` (`template_id`);--> statement-breakpoint
CREATE INDEX `idx_print_history_printed_by` ON `print_history` (`printed_by`);--> statement-breakpoint
CREATE TABLE `print_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`template_id` text NOT NULL,
	`printer_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`copies` integer DEFAULT 1 NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`error_message` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_print_jobs_invoice` ON `print_jobs` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_print_jobs_status` ON `print_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_print_jobs_created` ON `print_jobs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_print_jobs_template` ON `print_jobs` (`template_id`);--> statement-breakpoint
CREATE TABLE `print_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`paper_size` text DEFAULT '80mm' NOT NULL,
	`orientation` text DEFAULT 'portrait' NOT NULL,
	`width_mm` real DEFAULT 80 NOT NULL,
	`height_mm` real,
	`supported_documents` text DEFAULT '[]' NOT NULL,
	`visibility` text DEFAULT '{}' NOT NULL,
	`layout` text DEFAULT '{}' NOT NULL,
	`styles` text DEFAULT '{}' NOT NULL,
	`qr` text DEFAULT '{}',
	`barcode` text DEFAULT '{}',
	`is_default` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `print_templates_name_unique` ON `print_templates` (`name`);--> statement-breakpoint
CREATE INDEX `idx_print_templates_default` ON `print_templates` (`is_default`);--> statement-breakpoint
CREATE INDEX `idx_print_templates_system` ON `print_templates` (`is_system`);--> statement-breakpoint
CREATE TABLE `printer_template_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`printer_id` text NOT NULL,
	`doc_type` text NOT NULL,
	`template_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ptm_printer_doctype` ON `printer_template_mappings` (`printer_id`,`doc_type`);--> statement-breakpoint
CREATE INDEX `idx_ptm_printer` ON `printer_template_mappings` (`printer_id`);--> statement-breakpoint
CREATE INDEX `idx_ptm_doctype` ON `printer_template_mappings` (`doc_type`);--> statement-breakpoint
CREATE TABLE `printers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'system' NOT NULL,
	`connection` text DEFAULT 'browser' NOT NULL,
	`address` text DEFAULT '',
	`port` integer,
	`paper_size` text DEFAULT '80mm' NOT NULL,
	`driver` text DEFAULT 'browser' NOT NULL,
	`dpi` integer,
	`speed` integer,
	`status` text DEFAULT 'unknown' NOT NULL,
	`last_seen_at` text,
	`is_default` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`vendor` text DEFAULT '',
	`model` text DEFAULT '',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_printers_default` ON `printers` (`is_default`);--> statement-breakpoint
CREATE INDEX `idx_printers_active` ON `printers` (`is_active`);--> statement-breakpoint
CREATE TABLE `product_barcodes` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`barcode` text NOT NULL,
	`type` text DEFAULT 'primary' NOT NULL,
	`variant_label` text DEFAULT '',
	`batch_number` text DEFAULT '',
	`expiry_date` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_barcodes_barcode_unique` ON `product_barcodes` (`barcode`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_product_barcodes_barcode` ON `product_barcodes` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_product_barcodes_product` ON `product_barcodes` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`barcode` text DEFAULT '' NOT NULL,
	`sku` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`category_id` text,
	`type` text DEFAULT '' NOT NULL,
	`unit` text DEFAULT 'قطعة' NOT NULL,
	`cost_price` real DEFAULT 0 NOT NULL,
	`average_price` real DEFAULT 0 NOT NULL,
	`wholesale_price` real DEFAULT 0 NOT NULL,
	`retail_price` real DEFAULT 0 NOT NULL,
	`sale_price1` real DEFAULT 0 NOT NULL,
	`sale_price2` real DEFAULT 0 NOT NULL,
	`sale_price3` real DEFAULT 0 NOT NULL,
	`invoice_price` real DEFAULT 0 NOT NULL,
	`profit_margin` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`wholesale_min_qty` integer DEFAULT 0 NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 0 NOT NULL,
	`reorder_point` integer DEFAULT 0 NOT NULL,
	`max_stock` integer DEFAULT 0 NOT NULL,
	`stockable` integer DEFAULT 1 NOT NULL,
	`weight` real DEFAULT 0 NOT NULL,
	`package_size` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`variant` text DEFAULT '' NOT NULL,
	`expiry_date` text DEFAULT '' NOT NULL,
	`batch_number` text DEFAULT '' NOT NULL,
	`highlighted` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`allow_negative_stock` integer DEFAULT 0 NOT NULL,
	`warehouse_id` text DEFAULT '' NOT NULL,
	`pricing_by_zone` integer DEFAULT 0 NOT NULL,
	`loyalty_card` integer DEFAULT 0 NOT NULL,
	`ask_price` integer DEFAULT 0 NOT NULL,
	`ask_quantity` integer DEFAULT 0 NOT NULL,
	`point_price` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL,
	`created_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_products_name` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `idx_products_barcode` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_products_category` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `idx_products_category_id` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_products_sku` ON `products` (`sku`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text DEFAULT '',
	`type` text DEFAULT 'percentage',
	`value` real DEFAULT 0 NOT NULL,
	`product_ids` text DEFAULT '[]',
	`discount_type` text DEFAULT 'percent' NOT NULL,
	`discount_value` real DEFAULT 0 NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active',
	`max_quantity` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE INDEX `idx_promotions_product` ON `promotions` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_promotions_active` ON `promotions` (`active`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`qty` real DEFAULT 0 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`line_total` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_items_purchase` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_items_product` ON `purchase_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`date` text NOT NULL,
	`supplier_id` text NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tva_amount` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT datetime('now'),
	`updated_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE INDEX `idx_purchases_number` ON `purchases` (`number`);--> statement-breakpoint
CREATE INDEX `idx_purchases_supplier` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_purchases_date` ON `purchases` (`date`);--> statement-breakpoint
CREATE INDEX `idx_purchases_status` ON `purchases` (`status`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`permissions` text DEFAULT '{}' NOT NULL,
	`is_system` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_roles_name` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`qty` real DEFAULT 0 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`line_total` real DEFAULT 0 NOT NULL,
	`batch_number` text DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX `idx_sale_items_sale` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_items_product` ON `sale_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `sales` (
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
	`created_at` text DEFAULT datetime('now'),
	`updated_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE INDEX `idx_sales_date` ON `sales` (`date`);--> statement-breakpoint
CREATE INDEX `idx_sales_customer` ON `sales` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_number` ON `sales` (`number`);--> statement-breakpoint
CREATE INDEX `idx_sales_status` ON `sales` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sales_type` ON `sales` (`type`);--> statement-breakpoint
CREATE INDEX `idx_sales_doc_type` ON `sales` (`doc_type`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`phone2` text DEFAULT '',
	`email` text DEFAULT '',
	`address` text DEFAULT '',
	`city` text DEFAULT '',
	`logo` text DEFAULT '',
	`tva_rate` real DEFAULT 0 NOT NULL,
	`print_width_mm` integer DEFAULT 80 NOT NULL,
	`sync_mode` text DEFAULT 'single' NOT NULL,
	`currencies` text DEFAULT '[]' NOT NULL,
	`base_currency` text DEFAULT 'دج' NOT NULL,
	`invoice_prefix` text DEFAULT 'INV-' NOT NULL,
	`invoice_start_number` integer DEFAULT 1 NOT NULL,
	`receipt_footer` text DEFAULT '' NOT NULL,
	`zakat_enabled` integer DEFAULT 0 NOT NULL,
	`nisab_threshold` real DEFAULT 0 NOT NULL,
	`shop_logo` text DEFAULT '',
	`language` text DEFAULT 'ar',
	`print_language` text DEFAULT 'ar',
	`shop_description` text DEFAULT '',
	`shop_address` text DEFAULT '',
	`shop_phone2` text DEFAULT '',
	`shop_email` text DEFAULT '',
	`commercial_register` text DEFAULT '',
	`company_rc` text DEFAULT '',
	`tax_number` text DEFAULT '',
	`company_nif` text DEFAULT '',
	`tax_article` text DEFAULT '',
	`company_art` text DEFAULT '',
	`company_ai` text DEFAULT '',
	`tax_id` text DEFAULT '',
	`quick_sale` integer DEFAULT 0,
	`accounting_only` integer DEFAULT 0,
	`allow_negative_stock` integer DEFAULT 0,
	`confirm_no_stock` integer DEFAULT 0,
	`average_pricing` integer DEFAULT 0,
	`invoice_template` text DEFAULT 'basic',
	`expense_categories` text DEFAULT '[]',
	`date_format` text DEFAULT 'DD/MM/YYYY' NOT NULL,
	`time_format` text DEFAULT '24h' NOT NULL,
	`timezone` text DEFAULT 'Africa/Algiers' NOT NULL,
	`decimal_separator` text DEFAULT ',' NOT NULL,
	`thousands_separator` text DEFAULT '.' NOT NULL,
	`text_direction` text DEFAULT 'rtl' NOT NULL,
	`operating_mode` text DEFAULT 'online' NOT NULL,
	`auto_sync` integer DEFAULT 1 NOT NULL,
	`cache_days` integer DEFAULT 7 NOT NULL,
	`connection_alert` integer DEFAULT 1 NOT NULL,
	`connection_check_interval` integer DEFAULT 5 NOT NULL,
	`allow_self_registration` integer DEFAULT 1 NOT NULL,
	`default_role` text DEFAULT 'seller' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movement_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`movement_id` text NOT NULL,
	`item_id` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`line_number` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sml_movement` ON `stock_movement_lines` (`movement_id`);--> statement-breakpoint
CREATE INDEX `idx_sml_item` ON `stock_movement_lines` (`item_id`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`qty` real DEFAULT 0 NOT NULL,
	`reference` text DEFAULT '',
	`reason` text DEFAULT '',
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`date` text DEFAULT '',
	`updated_at` text DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX `idx_stock_movements_product` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_type` ON `stock_movements` (`type`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_created` ON `stock_movements` (`created_at`);--> statement-breakpoint
CREATE TABLE `stock_movements_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`movement_number` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`warehouse_id` text NOT NULL,
	`item_id` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`reference` text DEFAULT '',
	`description` text DEFAULT '',
	`is_reviewed` integer DEFAULT 0 NOT NULL,
	`reviewed_by` text DEFAULT '',
	`reviewed_at` text DEFAULT '',
	`created_by` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_smv2_number` ON `stock_movements_v2` (`movement_number`);--> statement-breakpoint
CREATE INDEX `idx_smv2_warehouse` ON `stock_movements_v2` (`warehouse_id`);--> statement-breakpoint
CREATE INDEX `idx_smv2_item` ON `stock_movements_v2` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_smv2_type` ON `stock_movements_v2` (`type`);--> statement-breakpoint
CREATE INDEX `idx_smv2_date` ON `stock_movements_v2` (`date`);--> statement-breakpoint
CREATE INDEX `idx_smv2_reviewed` ON `stock_movements_v2` (`is_reviewed`);--> statement-breakpoint
CREATE TABLE `supplier_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`invoice_number` text DEFAULT '' NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`remaining_balance` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_supplier_entries_supplier` ON `supplier_entries` (`supplier_id`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT datetime('now'),
	`updated_at` text DEFAULT datetime('now')
);
--> statement-breakpoint
CREATE TABLE `suspended_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`customer_id` text DEFAULT '' NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`discount_type` text DEFAULT 'percent' NOT NULL,
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT ''
);
--> statement-breakpoint
CREATE INDEX `idx_suspended_orders_created` ON `suspended_orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `sync_tombstones` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`deleted_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tombstones_lookup` ON `sync_tombstones` (`table_name`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `template_assignments` (
	`doc_type` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity` text DEFAULT '',
	`entity_type` text DEFAULT '',
	`entity_id` text DEFAULT '',
	`details` text DEFAULT '',
	`old_value` text DEFAULT '',
	`new_value` text DEFAULT '',
	`ip_address` text DEFAULT '',
	`device_info` text DEFAULT '',
	`performed_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_user_activities_user` ON `user_activities` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_activities_action` ON `user_activities` (`action`);--> statement-breakpoint
CREATE INDEX `idx_user_activities_date` ON `user_activities` (`performed_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`pin` text NOT NULL,
	`email` text DEFAULT '',
	`phone` text DEFAULT '',
	`avatar` text DEFAULT '',
	`role` text DEFAULT 'seller' NOT NULL,
	`role_id` text DEFAULT '',
	`status` text DEFAULT 'active' NOT NULL,
	`last_login` text DEFAULT '',
	`login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text DEFAULT '',
	`password_changed_at` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_username` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`location` text DEFAULT '',
	`type` text DEFAULT 'main' NOT NULL,
	`capacity` integer,
	`temperature` real,
	`humidity` real,
	`is_active` integer DEFAULT 1 NOT NULL,
	`parent_id` text,
	`created_by` text DEFAULT '',
	`created_at` text DEFAULT datetime('now') NOT NULL,
	`updated_at` text DEFAULT datetime('now') NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_warehouses_type` ON `warehouses` (`type`);--> statement-breakpoint
CREATE INDEX `idx_warehouses_active` ON `warehouses` (`is_active`);