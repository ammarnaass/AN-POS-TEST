/**
 * SQLite Schema Initialization — AN POS Mobile
 * Creates all required tables if they don't exist.
 * Mirrors the Electron/Drizzle schema for full parity.
 */

export const CREATE_TABLES_SQL: string[] = [
  // ── Users ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    pin TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'seller',
    status TEXT NOT NULL DEFAULT 'active',
    permissions TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Roles ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Settings ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Categories ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    parent_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Products ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    barcode TEXT,
    sku TEXT,
    category TEXT,
    category_id TEXT,
    retail_price REAL NOT NULL DEFAULT 0,
    wholesale_price REAL NOT NULL DEFAULT 0,
    purchase_price REAL NOT NULL DEFAULT 0,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'قطعة',
    min_quantity REAL NOT NULL DEFAULT 0,
    low_stock_threshold REAL NOT NULL DEFAULT 5,
    tax_rate REAL NOT NULL DEFAULT 0.19,
    status TEXT NOT NULL DEFAULT 'active',
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Product Barcodes ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS product_barcodes (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    barcode TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,

  // ── Customers ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    credit_limit REAL NOT NULL DEFAULT 0,
    balance REAL NOT NULL DEFAULT 0,
    customer_type TEXT NOT NULL DEFAULT 'retail',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Suppliers ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    balance REAL NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Sales ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY NOT NULL,
    number TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'facture',
    type TEXT NOT NULL DEFAULT 'sale',
    customer_id TEXT,
    customer_name TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'amount',
    tva_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    amount_paid REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'paid',
    sold_by TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Sale Items ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    promo_name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  )`,

  // ── Purchases ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY NOT NULL,
    number TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    supplier_id TEXT,
    supplier_name TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    amount_paid REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'paid',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Cash Sessions ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    opened_by TEXT NOT NULL,
    opening_balance REAL NOT NULL DEFAULT 0,
    closing_balance REAL,
    actual_balance REAL,
    total_sales REAL NOT NULL DEFAULT 0,
    total_expenses REAL NOT NULL DEFAULT 0,
    deposits TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Expenses ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Payments ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    party_id TEXT NOT NULL,
    party_type TEXT NOT NULL DEFAULT 'customer',
    party_name TEXT,
    amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    notes TEXT,
    reference_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Promotions ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'product',
    discount_type TEXT NOT NULL DEFAULT 'percent',
    discount_value REAL NOT NULL DEFAULT 0,
    product_id TEXT,
    category_id TEXT,
    min_quantity REAL,
    max_quantity REAL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Packs ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS packs (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    items TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Print Templates ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS print_templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'invoice',
    template TEXT NOT NULL DEFAULT '',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Printers ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'usb',
    address TEXT,
    port INTEGER,
    paper_width INTEGER NOT NULL DEFAULT 80,
    is_default INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Suspended Orders ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS suspended_orders (
    id TEXT PRIMARY KEY NOT NULL,
    items TEXT NOT NULL DEFAULT '[]',
    customer_id TEXT,
    customer_name TEXT,
    discount_type TEXT NOT NULL DEFAULT 'amount',
    discount_value REAL NOT NULL DEFAULT 0,
    note TEXT,
    suspended_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Warehouses ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    is_main INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Stock Movements ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    product_id TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 0,
    reason TEXT,
    reference_id TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Connected Devices ──────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS connected_devices (
    id TEXT PRIMARY KEY NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'mobile',
    session_token TEXT,
    last_seen TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Network Settings ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS network_settings (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Audit Logs ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT NOT NULL
  )`,

  // ── Capital Entries ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS capital_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'injection',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Print History ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS print_history (
    id TEXT PRIMARY KEY NOT NULL,
    reference_id TEXT NOT NULL,
    reference_type TEXT NOT NULL DEFAULT 'sale',
    printer_id TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    printed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

export const CREATE_INDEXES_SQL: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id)`,
  `CREATE INDEX IF NOT EXISTS idx_promotions_product ON promotions(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status)`,
];
