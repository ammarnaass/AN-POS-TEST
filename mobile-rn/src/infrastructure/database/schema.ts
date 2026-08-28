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
    barcode TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    category_id TEXT,
    unit TEXT NOT NULL DEFAULT 'قطعة',
    cost_price REAL NOT NULL DEFAULT 0,
    purchase_price REAL NOT NULL DEFAULT 0,
    average_price REAL NOT NULL DEFAULT 0,
    retail_price REAL NOT NULL DEFAULT 0,
    wholesale_price REAL NOT NULL DEFAULT 0,
    wholesale_min_qty REAL NOT NULL DEFAULT 0,
    quantity REAL NOT NULL DEFAULT 0,
    min_quantity REAL NOT NULL DEFAULT 0,
    low_stock_threshold REAL NOT NULL DEFAULT 5,
    allow_negative_stock INTEGER NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0,
    warehouse_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    image TEXT,
    image_url TEXT,
    expiry_date TEXT,
    batch_number TEXT,
    quick_sale INTEGER NOT NULL DEFAULT 1,
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
    customer_id TEXT DEFAULT '',
    customer_name TEXT DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]',
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'amount',
    tva_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    amount_paid REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'paid',
    sold_by TEXT NOT NULL DEFAULT '',
    cash_session_id TEXT NOT NULL DEFAULT '',
    note TEXT DEFAULT '',
    last_printed_at TEXT DEFAULT '',
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
    batch_number TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
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
    tva_amount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    amount_paid REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Purchase Items ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY NOT NULL,
    purchase_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    batch_number TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
  )`,

  // ── Cash Sessions ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS cash_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    number TEXT DEFAULT '',
    session_number INTEGER NOT NULL DEFAULT 1,
    opened_by TEXT NOT NULL,
    opening_balance REAL NOT NULL DEFAULT 0,
    closing_balance REAL DEFAULT 0,
    expected_balance REAL DEFAULT 0,
    actual_balance REAL DEFAULT 0,
    difference REAL DEFAULT 0,
    total_sales REAL NOT NULL DEFAULT 0,
    total_expenses REAL NOT NULL DEFAULT 0,
    total_returns REAL NOT NULL DEFAULT 0,
    deposits TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TEXT NOT NULL,
    closed_at TEXT DEFAULT '',
    note TEXT DEFAULT '',
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
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'invoice',
    paper_size TEXT NOT NULL DEFAULT '80mm',
    orientation TEXT NOT NULL DEFAULT 'portrait',
    width_mm INTEGER NOT NULL DEFAULT 80,
    supported_documents TEXT NOT NULL DEFAULT '[]',
    visibility TEXT NOT NULL DEFAULT '{}',
    layout TEXT NOT NULL DEFAULT '{}',
    styles TEXT NOT NULL DEFAULT '{}',
    qr TEXT NOT NULL DEFAULT '{}',
    barcode TEXT NOT NULL DEFAULT '{}',
    template TEXT NOT NULL DEFAULT '',
    is_default INTEGER NOT NULL DEFAULT 0,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Printers ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS printers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'thermal',
    connection TEXT NOT NULL DEFAULT 'usb',
    address TEXT,
    port INTEGER,
    paper_size TEXT NOT NULL DEFAULT '80mm',
    paper_width INTEGER NOT NULL DEFAULT 80,
    driver TEXT NOT NULL DEFAULT 'esc_pos',
    dpi INTEGER NOT NULL DEFAULT 203,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Printer Template Mappings ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS printer_template_mappings (
    id TEXT PRIMARY KEY NOT NULL,
    printer_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    template_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES print_templates(id) ON DELETE CASCADE
  )`,

  // ── Template Assignments ───────────────────────────────────
  `CREATE TABLE IF NOT EXISTS template_assignments (
    id TEXT PRIMARY KEY NOT NULL,
    doc_type TEXT NOT NULL UNIQUE,
    template_id TEXT NOT NULL,
    printer_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Print Jobs ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY NOT NULL,
    invoice_id TEXT NOT NULL,
    template_id TEXT,
    printer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    copies INTEGER NOT NULL DEFAULT 1,
    payload TEXT NOT NULL DEFAULT '{}',
    error_message TEXT,
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
    location TEXT,
    address TEXT,
    type TEXT NOT NULL DEFAULT 'main',
    capacity REAL DEFAULT 0,
    temperature REAL DEFAULT 0,
    humidity REAL DEFAULT 0,
    is_main INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    parent_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Stock Movements (v1 — legacy) ──────────────────────────
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

  // ── Stock Movements V2 (advanced two-phase) ────────────────
  `CREATE TABLE IF NOT EXISTS stock_movements_v2 (
    id TEXT PRIMARY KEY NOT NULL,
    movement_number TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    warehouse_id TEXT NOT NULL DEFAULT '',
    destination_warehouse_id TEXT DEFAULT '',
    item_id TEXT NOT NULL DEFAULT '',
    quantity REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    reference TEXT DEFAULT '',
    is_reviewed INTEGER NOT NULL DEFAULT 0,
    reviewed_by TEXT DEFAULT '',
    reviewed_at TEXT DEFAULT '',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Stock Movement Lines ───────────────────────────────────
  `CREATE TABLE IF NOT EXISTS stock_movement_lines (
    id TEXT PRIMARY KEY NOT NULL,
    movement_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    batch_number TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (movement_id) REFERENCES stock_movements_v2(id) ON DELETE CASCADE
  )`,

  // ── Inventory Counts ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS inventory_counts (
    id TEXT PRIMARY KEY NOT NULL,
    count_number TEXT NOT NULL,
    date TEXT NOT NULL,
    warehouse_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    is_closed INTEGER NOT NULL DEFAULT 0,
    closed_by TEXT DEFAULT '',
    closed_at TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // ── Inventory Count Lines ──────────────────────────────────
  `CREATE TABLE IF NOT EXISTS inventory_count_lines (
    id TEXT PRIMARY KEY NOT NULL,
    count_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL DEFAULT '',
    expected_qty REAL NOT NULL DEFAULT 0,
    actual_qty REAL NOT NULL DEFAULT 0,
    variance REAL NOT NULL DEFAULT 0,
    line_number INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (count_id) REFERENCES inventory_counts(id) ON DELETE CASCADE
  )`,

  // ── Supplier Entries (Ledger) ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS supplier_entries (
    id TEXT PRIMARY KEY NOT NULL,
    supplier_id TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'invoice',
    amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    remaining_balance REAL NOT NULL DEFAULT 0,
    invoice_number TEXT DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  )`,

  // ── Barcode Prints (Label History) ────────────────────────
  `CREATE TABLE IF NOT EXISTS barcode_prints (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    barcode TEXT NOT NULL DEFAULT '',
    label_size TEXT NOT NULL DEFAULT '50x30',
    copies INTEGER NOT NULL DEFAULT 1,
    barcode_type TEXT NOT NULL DEFAULT 'CODE128',
    show_price INTEGER NOT NULL DEFAULT 1,
    show_product INTEGER NOT NULL DEFAULT 1,
    show_company INTEGER NOT NULL DEFAULT 0,
    print_options TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
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
    invoice_id TEXT NOT NULL,
    invoice_type TEXT NOT NULL DEFAULT 'sale',
    doc_type_key TEXT NOT NULL DEFAULT 'facture',
    template_id TEXT DEFAULT '',
    printed_by TEXT NOT NULL DEFAULT '',
    printed_at TEXT NOT NULL,
    copies INTEGER NOT NULL DEFAULT 1,
    printer_name TEXT DEFAULT '',
    is_reprint INTEGER NOT NULL DEFAULT 0,
    payload TEXT NOT NULL DEFAULT '{}',
    reference_id TEXT,
    reference_type TEXT DEFAULT 'sale',
    printer_id TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TEXT NOT NULL
  )`,

  // ── User Activities ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS user_activities (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL DEFAULT '',
    entity_id TEXT DEFAULT '',
    details TEXT DEFAULT '',
    performed_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
];

export const CREATE_INDEXES_SQL: string[] = [
  // Products
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
  `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
  `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`,
  // Sales
  `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(number)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_doc_type ON sales(doc_type)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_session ON sales(cash_session_id)`,
  // Sale Items
  `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id)`,
  // Payments
  `CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date)`,
  // Promotions
  `CREATE INDEX IF NOT EXISTS idx_promotions_product ON promotions(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active)`,
  // Stock
  `CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_v2_warehouse ON stock_movements_v2(warehouse_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_v2_item ON stock_movements_v2(item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_lines_movement ON stock_movement_lines(movement_id)`,
  // Inventory Counts
  `CREATE INDEX IF NOT EXISTS idx_inv_counts_status ON inventory_counts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_count_lines_count ON inventory_count_lines(count_id)`,
  // Suppliers
  `CREATE INDEX IF NOT EXISTS idx_supplier_entries_supplier ON supplier_entries(supplier_id)`,
  // Cash Sessions
  `CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status)`,
  // Print Jobs & Templates
  `CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_print_jobs_invoice ON print_jobs(invoice_id)`,
  `CREATE INDEX IF NOT EXISTS idx_template_assignments_doctype ON template_assignments(doc_type)`,
  `CREATE INDEX IF NOT EXISTS idx_print_templates_default ON print_templates(is_default)`,
  `CREATE INDEX IF NOT EXISTS idx_print_history_invoice ON print_history(invoice_id)`,
  `CREATE INDEX IF NOT EXISTS idx_print_history_doctype ON print_history(doc_type_key)`,
  // Users
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
  `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
];
