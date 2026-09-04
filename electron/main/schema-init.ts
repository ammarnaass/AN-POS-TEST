// إنشاء كل الجداول الـ38 (CREATE TABLE IF NOT EXISTS)
// يُنفذ مرة واحدة عند أول تشغيل. يعتمد على node:sqlite exec.

import { execSql } from './database';

/**
 * جميع عبارات CREATE TABLE IF NOT EXISTS مترجمة من schema.ts
 * تُنفذ كدفعة واحدة عبر exec()
 */
const DDL = `
-- الإعدادات
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  shop_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone2 TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  tva_rate REAL NOT NULL DEFAULT 0,
  print_width_mm INTEGER NOT NULL DEFAULT 80,
  sync_mode TEXT NOT NULL DEFAULT 'single',
  currencies TEXT NOT NULL DEFAULT '[]',
  base_currency TEXT NOT NULL DEFAULT 'دج',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  invoice_start_number INTEGER NOT NULL DEFAULT 1,
  receipt_footer TEXT NOT NULL DEFAULT '',
  zakat_enabled INTEGER NOT NULL DEFAULT 0,
  nisab_threshold REAL NOT NULL DEFAULT 0,
  shop_logo TEXT DEFAULT '',
  language TEXT DEFAULT 'ar',
  print_language TEXT DEFAULT 'ar',
  shop_description TEXT DEFAULT '',
  shop_address TEXT DEFAULT '',
  shop_phone2 TEXT DEFAULT '',
  shop_email TEXT DEFAULT '',
  commercial_register TEXT DEFAULT '',
  company_rc TEXT DEFAULT '',
  tax_number TEXT DEFAULT '',
  company_nif TEXT DEFAULT '',
  tax_article TEXT DEFAULT '',
  company_art TEXT DEFAULT '',
  company_ai TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  quick_sale INTEGER DEFAULT 0,
  accounting_only INTEGER DEFAULT 0,
  allow_negative_stock INTEGER DEFAULT 0,
  confirm_no_stock INTEGER DEFAULT 0,
  average_pricing INTEGER DEFAULT 0,
  invoice_template TEXT DEFAULT 'basic',
  expense_categories TEXT DEFAULT '[]',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format TEXT NOT NULL DEFAULT '24h',
  timezone TEXT NOT NULL DEFAULT 'Africa/Algiers',
  decimal_separator TEXT NOT NULL DEFAULT ',',
  thousands_separator TEXT NOT NULL DEFAULT '.',
  text_direction TEXT NOT NULL DEFAULT 'rtl',
  operating_mode TEXT NOT NULL DEFAULT 'online',
  auto_sync INTEGER NOT NULL DEFAULT 1,
  cache_days INTEGER NOT NULL DEFAULT 7,
  connection_alert INTEGER NOT NULL DEFAULT 1,
  connection_check_interval INTEGER NOT NULL DEFAULT 5
);

-- المستخدمون
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'seller',
  role_id TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  last_login TEXT DEFAULT '',
  login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT DEFAULT '',
  password_changed_at TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- الأدوار
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  permissions TEXT NOT NULL DEFAULT '{}',
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- نشاطات المستخدمين
CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT DEFAULT '',
  entity_type TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  details TEXT DEFAULT '',
  old_value TEXT DEFAULT '',
  new_value TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  device_info TEXT DEFAULT '',
  performed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_action ON user_activities(action);
CREATE INDEX IF NOT EXISTS idx_user_activities_date ON user_activities(performed_at);

-- refresh tokens (للتوافق مع البيانات المهاجرة)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- سجلات التدقيق
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  user_id TEXT NOT NULL,
  details TEXT DEFAULT '',
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- المنتجات
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL DEFAULT '',
  sku TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  category_id TEXT,
  type TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'قطعة',
  cost_price REAL NOT NULL DEFAULT 0,
  average_price REAL NOT NULL DEFAULT 0,
  wholesale_price REAL NOT NULL DEFAULT 0,
  retail_price REAL NOT NULL DEFAULT 0,
  sale_price1 REAL NOT NULL DEFAULT 0,
  sale_price2 REAL NOT NULL DEFAULT 0,
  sale_price3 REAL NOT NULL DEFAULT 0,
  invoice_price REAL NOT NULL DEFAULT 0,
  profit_margin REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  wholesale_min_qty INTEGER NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  max_stock INTEGER NOT NULL DEFAULT 0,
  stockable INTEGER NOT NULL DEFAULT 1,
  weight REAL NOT NULL DEFAULT 0,
  package_size TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  variant TEXT NOT NULL DEFAULT '',
  expiry_date TEXT NOT NULL DEFAULT '',
  batch_number TEXT NOT NULL DEFAULT '',
  highlighted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  allow_negative_stock INTEGER NOT NULL DEFAULT 0,
  warehouse_id TEXT NOT NULL DEFAULT '',
  pricing_by_zone INTEGER NOT NULL DEFAULT 0,
  loyalty_card INTEGER NOT NULL DEFAULT 0,
  ask_price INTEGER NOT NULL DEFAULT 0,
  ask_quantity INTEGER NOT NULL DEFAULT 0,
  point_price INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- الفئات
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  parent_id TEXT DEFAULT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- باركودات المنتجات المرتبطة
CREATE TABLE IF NOT EXISTS product_barcodes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'primary',
  variant_label TEXT DEFAULT '',
  batch_number TEXT DEFAULT '',
  expiry_date TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_product ON product_barcodes(product_id);

-- سجل طباعة الباركود
CREATE TABLE IF NOT EXISTS barcode_prints (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  barcode TEXT NOT NULL,
  label_size TEXT NOT NULL,
  copies INTEGER NOT NULL DEFAULT 1,
  barcode_type TEXT NOT NULL DEFAULT 'ean13',
  show_company INTEGER NOT NULL DEFAULT 0,
  show_product INTEGER NOT NULL DEFAULT 1,
  show_sku INTEGER NOT NULL DEFAULT 0,
  show_price INTEGER NOT NULL DEFAULT 1,
  show_barcode INTEGER NOT NULL DEFAULT 1,
  enlarge_price INTEGER NOT NULL DEFAULT 0,
  print_options TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_barcode_prints_product ON barcode_prints(product_id);
CREATE INDEX IF NOT EXISTS idx_barcode_prints_created ON barcode_prints(created_at);

-- المستودعات
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'main',
  capacity INTEGER,
  temperature REAL,
  humidity REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  parent_id TEXT,
  created_by TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(type);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);

-- حركات المخزون (V1)
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  reference TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  date TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- حركات المخزون (V2)
CREATE TABLE IF NOT EXISTS stock_movements_v2 (
  id TEXT PRIMARY KEY,
  movement_number TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  reference TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_reviewed INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT DEFAULT '',
  reviewed_at TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_smv2_number ON stock_movements_v2(movement_number);
CREATE INDEX IF NOT EXISTS idx_smv2_warehouse ON stock_movements_v2(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_smv2_item ON stock_movements_v2(item_id);
CREATE INDEX IF NOT EXISTS idx_smv2_type ON stock_movements_v2(type);
CREATE INDEX IF NOT EXISTS idx_smv2_date ON stock_movements_v2(date);
CREATE INDEX IF NOT EXISTS idx_smv2_reviewed ON stock_movements_v2(is_reviewed);

-- بنود حركة المخزون
CREATE TABLE IF NOT EXISTS stock_movement_lines (
  id TEXT PRIMARY KEY,
  movement_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  line_number INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sml_movement ON stock_movement_lines(movement_id);
CREATE INDEX IF NOT EXISTS idx_sml_item ON stock_movement_lines(item_id);

-- جرد المخزون
CREATE TABLE IF NOT EXISTS inventory_counts (
  id TEXT PRIMARY KEY,
  count_number TEXT NOT NULL,
  date TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  is_closed INTEGER NOT NULL DEFAULT 0,
  closed_by TEXT DEFAULT '',
  closed_at TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ic_number ON inventory_counts(count_number);
CREATE INDEX IF NOT EXISTS idx_ic_warehouse ON inventory_counts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_ic_status ON inventory_counts(status);

-- بنود الجرد
CREATE TABLE IF NOT EXISTS inventory_count_lines (
  id TEXT PRIMARY KEY,
  count_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  expected_qty REAL NOT NULL DEFAULT 0,
  actual_qty REAL NOT NULL DEFAULT 0,
  variance REAL NOT NULL DEFAULT 0,
  line_number INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_icl_count ON inventory_count_lines(count_id);
CREATE INDEX IF NOT EXISTS idx_icl_item ON inventory_count_lines(item_id);

-- المبيعات
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  date TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'facture',
  type TEXT NOT NULL DEFAULT 'sale',
  items TEXT NOT NULL DEFAULT '[]',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  tva_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  customer_id TEXT NOT NULL DEFAULT '',
  customer_name TEXT DEFAULT '',
  amount_paid REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  sold_by TEXT NOT NULL DEFAULT '',
  cash_session_id TEXT NOT NULL DEFAULT '',
  session_id TEXT DEFAULT '',
  note TEXT DEFAULT '',
  last_printed_at TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(number);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type);
CREATE INDEX IF NOT EXISTS idx_sales_doc_type ON sales(doc_type);

-- بنود البيع
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  batch_number TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- الطلبات المعلقة
CREATE TABLE IF NOT EXISTS suspended_orders (
  id TEXT PRIMARY KEY,
  items TEXT NOT NULL DEFAULT '[]',
  customer_id TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_suspended_orders_created ON suspended_orders(created_at);

-- الباقات
CREATE TABLE IF NOT EXISTS packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '[]',
  pack_price REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_packs_barcode ON packs(barcode);
CREATE INDEX IF NOT EXISTS idx_packs_status ON packs(status);

-- العروض الترويجية
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT DEFAULT '',
  type TEXT DEFAULT 'percentage',
  value REAL NOT NULL DEFAULT 0,
  product_ids TEXT DEFAULT '[]',
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value REAL NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'active',
  max_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_promotions_product ON promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active);

-- العملاء
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  credit_limit REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- المدفوعات
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  party_type TEXT NOT NULL DEFAULT 'customer',
  party_id TEXT NOT NULL,
  customer_id TEXT DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  type TEXT DEFAULT 'debit',
  method TEXT DEFAULT 'cash',
  note TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id, party_type);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);

-- الموردون
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  balance REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- قيود الموردين
CREATE TABLE IF NOT EXISTS supplier_entries (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  items TEXT NOT NULL DEFAULT '[]',
  invoice_number TEXT NOT NULL DEFAULT '',
  paid_amount REAL NOT NULL DEFAULT 0,
  remaining_balance REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_supplier_entries_supplier ON supplier_entries(supplier_id);

-- المشتريات
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  date TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tva_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchases_number ON purchases(number);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- بنود الشراء
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- المصاريف
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- جلسات الصندوق
CREATE TABLE IF NOT EXISTS cash_sessions (
  id TEXT PRIMARY KEY,
  number TEXT DEFAULT '',
  session_number INTEGER NOT NULL,
  opened_by TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT NOT NULL DEFAULT '',
  opening_balance REAL NOT NULL DEFAULT 0,
  closing_balance REAL,
  expected_balance REAL,
  actual_balance REAL,
  difference REAL,
  deposits TEXT NOT NULL DEFAULT '[]',
  total_sales REAL NOT NULL DEFAULT 0,
  total_returns REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened ON cash_sessions(opened_at);

-- رأس المال
CREATE TABLE IF NOT EXISTS capital_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_capital_entries_type ON capital_entries(type);
CREATE INDEX IF NOT EXISTS idx_capital_entries_date ON capital_entries(date);

-- قوالب الطباعة
CREATE TABLE IF NOT EXISTS print_templates (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  paper_size TEXT NOT NULL DEFAULT '80mm',
  orientation TEXT NOT NULL DEFAULT 'portrait',
  width_mm REAL NOT NULL DEFAULT 80,
  height_mm REAL,
  supported_documents TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT '{}',
  layout TEXT NOT NULL DEFAULT '{}',
  styles TEXT NOT NULL DEFAULT '{}',
  qr TEXT DEFAULT '{}',
  barcode TEXT DEFAULT '{}',
  is_default INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_print_templates_default ON print_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_print_templates_system ON print_templates(is_system);

-- سجل الطباعة
CREATE TABLE IF NOT EXISTS print_history (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  invoice_type TEXT NOT NULL,
  doc_type_key TEXT NOT NULL,
  template_id TEXT NOT NULL,
  printed_by TEXT NOT NULL,
  printed_at TEXT NOT NULL DEFAULT (datetime('now')),
  copies INTEGER NOT NULL DEFAULT 1,
  printer_name TEXT NOT NULL DEFAULT '',
  is_reprint INTEGER NOT NULL DEFAULT 0,
  payload TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_print_history_invoice ON print_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_print_history_template ON print_history(template_id);
CREATE INDEX IF NOT EXISTS idx_print_history_printed_by ON print_history(printed_by);

-- تعيينات القوالب
CREATE TABLE IF NOT EXISTS template_assignments (
  doc_type TEXT PRIMARY KEY,
  template_id TEXT NOT NULL
);

-- الطابعات
CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  connection TEXT NOT NULL DEFAULT 'browser',
  address TEXT DEFAULT '',
  port INTEGER,
  paper_size TEXT NOT NULL DEFAULT '80mm',
  driver TEXT NOT NULL DEFAULT 'browser',
  dpi INTEGER,
  speed INTEGER,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_seen_at TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  vendor TEXT DEFAULT '',
  model TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_printers_default ON printers(is_default);
CREATE INDEX IF NOT EXISTS idx_printers_active ON printers(is_active);

-- ربط الطابعات بالقوالب
CREATE TABLE IF NOT EXISTS printer_template_mappings (
  id TEXT PRIMARY KEY,
  printer_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  template_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(printer_id, doc_type),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ptm_printer ON printer_template_mappings(printer_id);
CREATE INDEX IF NOT EXISTS idx_ptm_doctype ON printer_template_mappings(doc_type);

-- طابور الطباعة
CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  printer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  copies INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL DEFAULT '{}',
  error_message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_print_jobs_invoice ON print_jobs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_template ON print_jobs(template_id);

-- عداد فشل الطباعة
CREATE TABLE IF NOT EXISTS print_failure_counter (
  id TEXT PRIMARY KEY,
  printer_id TEXT,
  template_id TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_failure_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error TEXT DEFAULT '',
  notified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pfc_printer ON print_failure_counter(printer_id);
CREATE INDEX IF NOT EXISTS idx_pfc_template ON print_failure_counter(template_id);

-- إعدادات الشبكة
CREATE TABLE IF NOT EXISTS network_settings (
  id TEXT PRIMARY KEY,
  lan_enabled INTEGER NOT NULL DEFAULT 0,
  server_ip TEXT NOT NULL DEFAULT '',
  server_port INTEGER NOT NULL DEFAULT 3000,
  protocol TEXT NOT NULL DEFAULT 'http',
  ssl_cert_path TEXT DEFAULT '',
  ssl_key_path TEXT DEFAULT '',
  connection_key TEXT DEFAULT '',
  auto_reconnect INTEGER NOT NULL DEFAULT 1,
  reconnect_interval INTEGER NOT NULL DEFAULT 5,
  cloud_enabled INTEGER NOT NULL DEFAULT 0,
  api_url TEXT DEFAULT '',
  api_key TEXT DEFAULT '',
  webhook_url TEXT DEFAULT '',
  webhook_secret TEXT DEFAULT '',
  cors_origins TEXT DEFAULT '',
  sync_auto INTEGER NOT NULL DEFAULT 1,
  sync_interval INTEGER NOT NULL DEFAULT 5,
  sync_type TEXT NOT NULL DEFAULT 'incremental',
  sync_time TEXT NOT NULL DEFAULT 'night',
  alert_on_sync_fail INTEGER NOT NULL DEFAULT 1,
  sync_fail_count INTEGER NOT NULL DEFAULT 0,
  oauth_enabled INTEGER NOT NULL DEFAULT 0,
  jwt_enabled INTEGER NOT NULL DEFAULT 0,
  api_rate_limit INTEGER NOT NULL DEFAULT 100,
  ip_whitelist TEXT NOT NULL DEFAULT '[]',
  force_https INTEGER NOT NULL DEFAULT 1,
  printer_connection TEXT NOT NULL DEFAULT 'usb',
  printer_driver TEXT NOT NULL DEFAULT 'esc_pos',
  printer_dpi INTEGER NOT NULL DEFAULT 203,
  printer_speed INTEGER NOT NULL DEFAULT 150,
  printer_paper_size INTEGER NOT NULL DEFAULT 80,
  printer_host TEXT DEFAULT '',
  printer_port INTEGER,
  printer_tested_at TEXT DEFAULT '',
  barcode_type TEXT NOT NULL DEFAULT 'code128',
  scanner_type TEXT NOT NULL DEFAULT 'handheld',
  scanner_interface TEXT NOT NULL DEFAULT 'usb',
  scanner_speed INTEGER NOT NULL DEFAULT 100,
  scanner_dpi INTEGER NOT NULL DEFAULT 200,
  scanner_tested_at TEXT DEFAULT '',
  scanner_beep_enabled INTEGER NOT NULL DEFAULT 1,
  scanner_terminator TEXT NOT NULL DEFAULT 'Enter',
  scanner_min_length INTEGER NOT NULL DEFAULT 6,
  scanner_allow_manual_types INTEGER NOT NULL DEFAULT 1,
  last_connected_at TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- الأجهزة المتصلة
CREATE TABLE IF NOT EXISTS connected_devices (
  id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  connection_type TEXT NOT NULL,
  ip_address TEXT DEFAULT '',
  mac_address TEXT DEFAULT '',
  port INTEGER,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen TEXT DEFAULT '',
  vendor TEXT DEFAULT '',
  model TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- جلسات الأجهزة المقترنة
CREATE TABLE IF NOT EXISTS device_sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT UNIQUE NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT DEFAULT '',
  user_id TEXT DEFAULT NULL,
  paired_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_device_sessions_token ON device_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);

-- جدول تتبع السجلات المحذوفة للمزامنة (Tombstones)
CREATE TABLE IF NOT EXISTS sync_tombstones (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tombstones_lookup ON sync_tombstones(table_name, deleted_at);
`;

/**
 * تهيئة المخطط — إنشاء كل الجداول والفهارس
 * يُستدعى مرة واحدة بعد initDatabase()
 */
export function initSchema(): void {
  execSql(DDL);
  // ترقيات آمنة للجداول الموجودة مسبقاً
  try { execSql("ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE categories ADD COLUMN color TEXT NOT NULL DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE products ADD COLUMN category_id TEXT DEFAULT NULL;"); } catch { /* موجود */ }

  // PRD §5.1: أعمدة المزامنة للجداول القابلة للمزامنة
  const syncTables = [
    'products', 'categories', 'product_barcodes', 'promotions', 'packs',
    'sales', 'sale_items', 'customers', 'payments', 'suppliers',
    'purchases', 'purchase_items', 'warehouses', 'stock_movements_v2'
  ];

  for (const tbl of syncTables) {
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN device_id TEXT DEFAULT '';`); } catch { /* موجود */ }
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));`); } catch { /* موجود */ }
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN sync_version INTEGER DEFAULT 1;`); } catch { /* موجود */ }
    try { execSql(`ALTER TABLE ${tbl} ADD COLUMN deleted_at TEXT DEFAULT NULL;`); } catch { /* موجود */ }
  }

  try {
    execSql(`CREATE TABLE IF NOT EXISTS device_sessions (
      id TEXT PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      device_id TEXT NOT NULL,
      device_name TEXT DEFAULT '',
      user_id TEXT DEFAULT NULL,
      paired_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`);
    execSql("CREATE INDEX IF NOT EXISTS idx_device_sessions_token ON device_sessions(session_token);");
    execSql("CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);");
  } catch { /* موجود */ }

  try { execSql("ALTER TABLE suspended_orders ADD COLUMN customer_name TEXT DEFAULT '';"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suspended_orders ADD COLUMN subtotal REAL DEFAULT 0;"); } catch { /* موجود */ }
  try { execSql("ALTER TABLE suspended_orders ADD COLUMN total REAL DEFAULT 0;"); } catch { /* موجود */ }
}
