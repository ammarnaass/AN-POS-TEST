// Seed البيانات الافتراضية — يُنفذ في Electron main process
// ينقل منطق seed من src/infrastructure/database/dexie/seed.ts + server/src/shared/seed.ts
// يستخدم node:sqlite مباشرة (getSqlite)

import { randomUUID } from 'node:crypto';
import { getSqlite } from './database';
import { hashPassword, verifyPassword, isHashed } from './handlers/password-hash';

const DEFAULT_USERS = [
  { username: 'developer', name: 'مطور النظام', pin: 'dev1234', role: 'developer' },
  { username: 'admin@dante.com', name: 'مدير النظام', pin: 'admin1234', role: 'admin' },
  { username: 'seller', name: 'البائع', pin: 'seller1234', role: 'seller' },
  { username: 'cashier', name: 'الكاشير', pin: 'cashier1234', role: 'cashier' },
];

const DEFAULT_ROLES = [
  { id: 'role-developer', name: 'developer', description: 'مطور النظام', permissions: '{"*":true,"all":true}' },
  { id: 'role-admin', name: 'admin', description: 'مدير النظام', permissions: '{"all":true}' },
  { id: 'role-accountant', name: 'accountant', description: 'محاسب', permissions: '{"sales":true,"expenses":true,"reports":true}' },
  { id: 'role-sales-manager', name: 'sales_manager', description: 'مدير المبيعات', permissions: '{"sales":true,"customers":true}' },
  { id: 'role-inventory-manager', name: 'inventory_manager', description: 'مدير المخزون', permissions: '{"products":true,"inventory":true}' },
  { id: 'role-cashier', name: 'cashier', description: 'كاشير', permissions: '{"pos":true,"cash":true}' },
  { id: 'role-seller', name: 'seller', description: 'بائع', permissions: '{"pos":true}' },
];

const DEFAULT_PRODUCTS = [
  { name: 'حليب نيدو', barcode: '6291100162110', category: 'حليب ومشتقات', unit: 'علبة', costPrice: 45, wholesalePrice: 48, retailPrice: 55, quantity: 100, lowStockThreshold: 10 },
  { name: 'سكر 1 كغ', barcode: '6222004123456', category: 'مواد غذائية', unit: 'كيس', costPrice: 38, wholesalePrice: 40, retailPrice: 45, quantity: 200, lowStockThreshold: 20 },
  { name: 'زيت هالي 1ل', barcode: '6223001234567', category: 'زيوت', unit: 'قنينة', costPrice: 95, wholesalePrice: 100, retailPrice: 115, quantity: 50, lowStockThreshold: 10 },
  { name: 'أرز بسمتي 1كغ', barcode: '6224001234568', category: 'مواد غذائية', unit: 'كيس', costPrice: 65, wholesalePrice: 70, retailPrice: 80, quantity: 75, lowStockThreshold: 15 },
  { name: 'جبنة مثلثات', barcode: '6225001234569', category: 'حليب ومشتقات', unit: 'علبة', costPrice: 28, wholesalePrice: 30, retailPrice: 38, quantity: 120, lowStockThreshold: 20 },
  { name: 'شاي أخضر', barcode: '6226001234560', category: 'مشروبات', unit: 'علبة', costPrice: 42, wholesalePrice: 45, retailPrice: 55, quantity: 0, lowStockThreshold: 10 },
  { name: 'مياه معدنية 1.5ل', barcode: '6227001234561', category: 'مشروبات', unit: 'قنينة', costPrice: 12, wholesalePrice: 14, retailPrice: 18, quantity: 300, lowStockThreshold: 50 },
  { name: 'معجون طماطم', barcode: '6228001234562', category: 'معلبات', unit: 'علبة', costPrice: 22, wholesalePrice: 25, retailPrice: 32, quantity: 60, lowStockThreshold: 10 },
  { name: 'فوط صحية', barcode: '6229001234563', category: 'عناية شخصية', unit: 'علبة', costPrice: 55, wholesalePrice: 60, retailPrice: 75, quantity: 30, lowStockThreshold: 5 },
  { name: 'صابون سائل', barcode: '6230001234564', category: 'منظفات', unit: 'قنينة', costPrice: 35, wholesalePrice: 38, retailPrice: 48, quantity: 40, lowStockThreshold: 8 },
];

const DEFAULT_CUSTOMERS = [
  { name: 'أحمد بن علي', phone: '0555123456', creditLimit: 50000, balance: 15000 },
  { name: 'محمد صالح', phone: '0666123456', creditLimit: 30000, balance: 0 },
  { name: 'فاطمة الزهراء', phone: '0777123456', creditLimit: 20000, balance: 8500 },
];

const DEFAULT_SUPPLIERS = [
  { name: 'شركة النور للتوزيع', phone: '0555987654', balance: 25000 },
  { name: 'مؤسسة البركة', phone: '0666987654', balance: 0 },
];

function queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | null {
  const db = getSqlite();
  const stmt = db.prepare(sql);
  const row = stmt.get(...params) as Record<string, unknown> | null;
  return row ?? null;
}

function execute(sql: string, params: unknown[] = []): void {
  const db = getSqlite();
  const stmt = db.prepare(sql);
  stmt.run(...params);
}

/**
 * Seed — يُنفذ مرة واحدة (يتحقق من الوجود قبل الإدراج)
 */
export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString();

  // ===== 1. الأدوار =====
  for (const role of DEFAULT_ROLES) {
    const existing = queryOne('SELECT id FROM roles WHERE id = ?', [role.id]);
    if (!existing) {
      execute(
        'INSERT INTO roles (id, name, description, permissions, is_system, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [role.id, role.name, role.description, role.permissions, 1, now]
      );
    }
  }

  // ===== 2. المستخدمون =====
  let adminId = '';
  for (const def of DEFAULT_USERS) {
    const existing = queryOne('SELECT * FROM users WHERE username = ?', [def.username]);
    if (existing) {
      // إذا كانت كلمة المرور غير مشفرة، نقوم بترحيلها إلى هاش مشفر فوراً
      if (!isHashed(existing.pin as string)) {
        const plainPin = (existing.pin as string) || def.pin;
        execute(
          'UPDATE users SET pin = ?, updated_at = ? WHERE id = ?',
          [hashPassword(plainPin), now, existing.id as string]
        );
      }
      if (existing.role !== def.role) {
        execute(
          'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
          [def.role, now, existing.id as string]
        );
      }
      if (def.username === 'admin@dante.com') adminId = existing.id as string;
    } else {
      const id = randomUUID();
      execute(
        'INSERT INTO users (id, username, name, pin, role, status, login_attempts, locked_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, def.username, def.name, hashPassword(def.pin), def.role, 'active', 0, '', now, now]
      );
      if (def.username === 'admin@dante.com') adminId = id;
    }
  }
  if (!adminId) adminId = randomUUID();

  // ===== 3. الإعدادات (مرة واحدة فقط) =====
  const settingsCount = queryOne('SELECT COUNT(*) as count FROM settings');
  if (settingsCount && Number(settingsCount.count) === 0) {
    execute(
      `INSERT INTO settings (id, shop_name, phone, tva_rate, print_width_mm, sync_mode, currencies, base_currency,
        invoice_prefix, invoice_start_number, receipt_footer, zakat_enabled, nisab_threshold)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['default', 'متجري', '0555555555', 0, 80, 'single',
        JSON.stringify([{ code: 'DZD', symbol: 'دج', rateToBase: 1 }]),
        'دج', 'INV-', 1, 'شكراً لتسوقكم معنا', 0, 100000]
    );

    // ===== 4. الفئات الافتراضية =====
    const DEFAULT_CATEGORIES_INIT = [
      { id: 'cat-food', name: 'مواد غذائية', description: 'البقوليات والسلع التموينية الأساسية', icon: 'ShoppingBag', color: '#10B981' },
      { id: 'cat-dairy', name: 'حليب ومشتقات', description: 'الألبان والأجبان ومشتقات الحليب', icon: 'Milk', color: '#3B82F6' },
      { id: 'cat-oils', name: 'زيوت', description: 'زيوت الطبخ وزيت الزيتون والسمن', icon: 'Droplets', color: '#F59E0B' },
      { id: 'cat-drinks', name: 'مشروبات', description: 'المشروبات والعصائر والمياه المعدنية', icon: 'Coffee', color: '#06B6D4' },
      { id: 'cat-cleaning', name: 'منظفات', description: 'منظفات ومساحيق ومطهرات', icon: 'Sparkles', color: '#8B5CF6' },
      { id: 'cat-sweets', name: 'حلويات ومقرمشات', description: 'الشوكولاطة والبسكويت والمكسرات', icon: 'Cookie', color: '#EC4899' },
    ];

    for (const cat of DEFAULT_CATEGORIES_INIT) {
      const existing = queryOne('SELECT id FROM categories WHERE name = ?', [cat.name]);
      if (!existing) {
        execute(
          'INSERT INTO categories (id, name, description, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [cat.id, cat.name, cat.description, cat.icon, cat.color, now, now]
        );
      }
    }

    // ===== 5. المنتجات =====
    for (const p of DEFAULT_PRODUCTS) {
      const id = randomUUID();
      const matchedCat = queryOne('SELECT id FROM categories WHERE name = ?', [p.category]);
      const categoryId = (matchedCat?.id as string) || null;
      execute(
        `INSERT INTO products (id, name, barcode, category, category_id, unit, cost_price, wholesale_price, retail_price,
          quantity, low_stock_threshold, wholesale_min_qty, status, stockable, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, p.name, p.barcode, p.category, categoryId, p.unit, p.costPrice, p.wholesalePrice, p.retailPrice,
          p.quantity, p.lowStockThreshold, 5, 'active', 1, now, now, adminId]
      );
    }

    // ===== 6. العملاء =====
    for (const c of DEFAULT_CUSTOMERS) {
      const id = randomUUID();
      execute(
        'INSERT INTO customers (id, name, phone, credit_limit, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, c.name, c.phone, c.creditLimit, c.balance, now, now]
      );
    }

    // ===== 7. الموردون =====
    for (const s of DEFAULT_SUPPLIERS) {
      const id = randomUUID();
      execute(
        'INSERT INTO suppliers (id, name, phone, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, s.name, s.phone, s.balance, now, now]
      );
    }
  }

  // ===== 7. طابعة المتصفح الافتراضية =====
  const browserPrinter = queryOne("SELECT id FROM printers WHERE id = 'browser-printer'");
  if (!browserPrinter) {
    execute(
      `INSERT INTO printers (id, name, type, connection, paper_size, driver, status, is_default, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['browser-printer', 'طابعة المتصفح الافتراضية', 'system', 'browser', '80mm', 'browser', 'connected', 1, 1, now, now]
    );
  }

  // ===== 8. إعدادات الشبكة الافتراضية =====
  const netSettings = queryOne("SELECT id FROM network_settings WHERE id = 'default'");
  if (!netSettings) {
    execute(
      `INSERT INTO network_settings (id, lan_enabled, server_ip, server_port, protocol, auto_reconnect, reconnect_interval,
        cloud_enabled, sync_auto, sync_interval, sync_type, sync_time, alert_on_sync_fail, sync_fail_count,
        oauth_enabled, jwt_enabled, api_rate_limit, ip_whitelist, force_https,
        printer_connection, printer_driver, printer_dpi, printer_speed, printer_paper_size,
        barcode_type, scanner_type, scanner_interface, scanner_speed, scanner_dpi,
        scanner_beep_enabled, scanner_terminator, scanner_min_length, scanner_allow_manual_types,
        created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['default', 0, '', 3000, 'http', 1, 5,
        0, 1, 5, 'incremental', 'night', 1, 0,
        0, 0, 100, '[]', 1,
        'usb', 'esc_pos', 203, 150, 80,
        'code128', 'handheld', 'usb', 100, 200,
        1, 'Enter', 6, 1, now, now]
    );
  }

  // ===== 9. القوالب الافتراضية للطباعة (POS-PRINT-001) =====
  // يُحاكي ALL_DEFAULT_TEMPLATES في src/services/print/defaultTemplates.ts
  // المعرفات ثابتة لضمان التوافق مع التعيينات الافتراضية والمسارات الأخرى.
  const DEFAULT_TEMPLATES_SEED: Array<{
    id: string;
    name: string;
    description: string;
    paper_size: string;
    orientation: string;
    width_mm: number;
    height_mm: number | null;
    supported_documents: string[];
    visibility: Record<string, unknown>;
    layout: Record<string, unknown>;
    styles: Record<string, unknown>;
    qr: Record<string, unknown>;
    barcode: Record<string, unknown>;
    is_default: boolean;
    is_system: boolean;
  }> = [
    {
      id: 'default-thermal-80',
      name: 'إيصال حراري 80mm',
      description: 'قالب افتراضي للإيصالات الحرارية — مناسب للسوبرماركت والصيدليات',
      paper_size: '80mm',
      orientation: 'portrait',
      width_mm: 80,
      height_mm: null,
      supported_documents: ['thermal-receipt', 'return-invoice'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true, customerName: true,
        customerPhone: false, customerAddress: false, barcode: true,
        unitPrice: true, discount: false, tva: false, sellerName: false,
        cashierName: true, paymentMethod: true, qr: false, signature: false, stamp: false,
      },
      layout: {
        header: [
          { id: 'h-logo', type: 'image', src: '', width: 60, height: 60, align: 'center' },
          { id: 'h-name', type: 'text', text: '{{shopLegal.name}}', align: 'center', size: 'lg', weight: 700, colorVar: 'primary' },
          { id: 'h-info', type: 'text', text: ['{{shopLegal.phone}}', '{{shopLegal.address}}'], align: 'center', size: 'sm', colorVar: 'footer' },
          { id: 'h-sep', type: 'separator', style: 'dashed' },
        ],
        body: [
          { id: 'b-number', type: 'row', align: 'space-between', children: [{ id: 'b-num-label', type: 'text', text: 'رقم الفاتورة', size: 'sm', align: 'right' }, { id: 'b-num-val', type: 'text', text: '{{invoice.number}}', size: 'sm', align: 'left', weight: 600 }] },
          { id: 'b-date', type: 'row', align: 'space-between', children: [{ id: 'b-date-label', type: 'text', text: 'التاريخ', size: 'sm', align: 'right' }, { id: 'b-date-val', type: 'text', text: '{{invoice.date}}', size: 'sm', align: 'left' }] },
          { id: 'b-customer', type: 'row', align: 'space-between', children: [{ id: 'b-cust-label', type: 'text', text: 'الزبون', size: 'sm', align: 'right' }, { id: 'b-cust-val', type: 'text', text: '{{invoice.customerName}}', size: 'sm', align: 'left' }] },
          { id: 'b-cashier', type: 'row', align: 'space-between', children: [{ id: 'b-cash-label', type: 'text', text: 'الكاشير', size: 'sm', align: 'right' }, { id: 'b-cash-val', type: 'text', text: '{{user.name}}', size: 'sm', align: 'left' }] },
          { id: 'b-sep-table', type: 'separator', style: 'solid' },
          { id: 'b-table', type: 'table', columns: [
            { key: 'name', label: 'المنتج', align: 'right' },
            { key: 'qty', label: 'الكمية', align: 'center', format: 'number' },
            { key: 'unitPrice', label: 'السعر', align: 'left', format: 'currency' },
            { key: 'lineTotal', label: 'الإجمالي', align: 'left', format: 'currency' },
          ], source: 'items', showTotal: true, showDiscount: true, showTva: false },
        ],
        footer: [
          { id: 'f-sep', type: 'separator', style: 'dashed' },
          { id: 'f-total', type: 'row', align: 'space-between', children: [{ id: 'f-total-label', type: 'text', text: 'الإجمالي', size: 'lg', weight: 700, colorVar: 'primary' }, { id: 'f-total-val', type: 'text', text: '{{invoice.total}}', size: 'xl', weight: 700, colorVar: 'primary' }] },
          { id: 'f-payment', type: 'row', align: 'space-between', children: [{ id: 'f-pay-label', type: 'text', text: 'طريقة الدفع', size: 'sm' }, { id: 'f-pay-val', type: 'text', text: '{{invoice.paymentMethod}}', size: 'sm' }] },
          { id: 'f-barcode', type: 'barcode', source: 'invoiceNumber', width: 180, height: 50 },
          { id: 'f-footer', type: 'text', text: '{{shopLegal.footer}}', align: 'center', size: 'sm', colorVar: 'footer' },
        ],
      },
      styles: {
        primaryColor: '#0891b2', headerColor: '#0e7490', footerColor: '#64748b',
        tableColor: '#e2e8f0', logoColor: '#0891b2',
        font: { family: 'Cairo', size: 12, weight: 400 },
      },
      qr: { enabled: false, payload: 'invoiceNumber' },
      barcode: { enabled: true, source: 'invoiceNumber' },
      is_default: true,
      is_system: true,
    },
    {
      id: 'default-invoice-a4',
      name: 'فاتورة A4',
      description: 'قالب افتراضي لفواتير A4 — مناسب للجملة والخدمات',
      paper_size: 'A4',
      orientation: 'portrait',
      width_mm: 210,
      height_mm: 297,
      supported_documents: ['sale-invoice', 'proforma', 'devis', 'purchase-invoice'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true, customerName: true,
        customerPhone: true, customerAddress: true, barcode: false,
        unitPrice: true, discount: true, tva: true, sellerName: true,
        cashierName: true, paymentMethod: true, qr: true, signature: true, stamp: true,
      },
      layout: {
        header: [
          { id: 'h-logo', type: 'image', src: '', width: 80, height: 80, align: 'right' },
          { id: 'h-info-col', type: 'column', gap: 4, children: [
            { id: 'h-name', type: 'text', text: '{{shopLegal.name}}', size: 'xl', weight: 700, colorVar: 'header', align: 'right' },
            { id: 'h-address', type: 'text', text: '{{shopLegal.address}}', size: 'sm', colorVar: 'footer', align: 'right' },
            { id: 'h-phone', type: 'text', text: '{{shopLegal.phone}}', size: 'sm', colorVar: 'footer', align: 'right' },
            { id: 'h-tax', type: 'text', text: ['RC: {{shopLegal.commercialRegister}}', 'NIF: {{shopLegal.nif}}', 'AI: {{shopLegal.ai}}'], size: 'sm', colorVar: 'footer', align: 'right' },
          ] },
          { id: 'h-sep', type: 'separator', style: 'solid' },
        ],
        body: [
          { id: 'b-meta-row', type: 'row', align: 'space-between', gap: 20, children: [
            { id: 'b-meta-col1', type: 'column', gap: 4, children: [
              { id: 'b-inv-num', type: 'text', text: 'رقم الفاتورة: {{invoice.number}}', size: 'md', weight: 600 },
              { id: 'b-inv-date', type: 'text', text: 'التاريخ: {{invoice.date}}', size: 'sm', colorVar: 'footer' },
              { id: 'b-seller', type: 'text', text: 'البائع: {{user.name}}', size: 'sm', colorVar: 'footer' },
            ] },
            { id: 'b-meta-col2', type: 'column', gap: 4, children: [
              { id: 'b-cust-name', type: 'text', text: 'الزبون: {{invoice.customerName}}', size: 'md', weight: 600 },
              { id: 'b-cust-phone', type: 'text', text: 'الهاتف: {{invoice.customerPhone}}', size: 'sm', colorVar: 'footer' },
              { id: 'b-cust-addr', type: 'text', text: 'العنوان: {{invoice.customerAddress}}', size: 'sm', colorVar: 'footer' },
            ] },
          ] },
          { id: 'b-table', type: 'table', columns: [
            { key: 'name', label: 'المنتج', align: 'right' },
            { key: 'qty', label: 'الكمية', align: 'center', format: 'number' },
            { key: 'unitPrice', label: 'سعر الوحدة', align: 'left', format: 'currency' },
            { key: 'discount', label: 'الخصم', align: 'left', format: 'currency' },
            { key: 'lineTotal', label: 'الإجمالي', align: 'left', format: 'currency' },
          ], source: 'items', showSubtotal: true, showDiscount: true, showTva: true, showTotal: true },
        ],
        footer: [
          { id: 'f-sep', type: 'separator', style: 'dashed' },
          { id: 'f-qr-row', type: 'row', align: 'space-between', children: [
            { id: 'f-sign-stamp', type: 'column', gap: 4, children: [
              { id: 'f-sign-label', type: 'text', text: 'توقيع البائع:', size: 'sm' },
              { id: 'f-sign-box', type: 'separator', style: 'dashed' },
              { id: 'f-stamp-box', type: 'separator', style: 'dashed' },
            ] },
            { id: 'f-totals', type: 'column', gap: 4, children: [
              { id: 'f-tot-subtotal', type: 'row', align: 'space-between', children: [{ id: 's1', type: 'text', text: 'المجموع الفرعي:', size: 'sm' }, { id: 's2', type: 'text', text: '{{invoice.subtotal}}', size: 'sm', weight: 600 }] },
              { id: 'f-tot-discount', type: 'row', align: 'space-between', children: [{ id: 'd1', type: 'text', text: 'الخصم:', size: 'sm' }, { id: 'd2', type: 'text', text: '{{invoice.discount}}', size: 'sm' }] },
              { id: 'f-tot-tva', type: 'row', align: 'space-between', children: [{ id: 't1', type: 'text', text: 'TVA:', size: 'sm' }, { id: 't2', type: 'text', text: '{{invoice.tvaAmount}}', size: 'sm' }] },
              { id: 'f-tot-total', type: 'row', align: 'space-between', children: [{ id: 'tt1', type: 'text', text: 'الإجمالي:', size: 'lg', weight: 700, colorVar: 'primary' }, { id: 'tt2', type: 'text', text: '{{invoice.total}}', size: 'lg', weight: 700, colorVar: 'primary' }] },
            ] },
            { id: 'f-qr', type: 'qr', payload: 'invoiceNumber:date:total', size: 90 },
          ] },
          { id: 'f-payment', type: 'row', align: 'space-between', children: [{ id: 'f-pay-method', type: 'text', text: 'طريقة الدفع: {{invoice.paymentMethod}}', size: 'sm' }, { id: 'f-cashier', type: 'text', text: 'الكاشير: {{user.name}}', size: 'sm' }] },
          { id: 'f-footer', type: 'text', text: '{{shopLegal.footer}}', align: 'center', size: 'sm', colorVar: 'footer' },
        ],
      },
      styles: {
        primaryColor: '#0e7490', headerColor: '#164e63', footerColor: '#475569',
        tableColor: '#cbd5e1', logoColor: '#0e7490',
        font: { family: 'Cairo', size: 13, weight: 400 },
      },
      qr: { enabled: true, payload: 'invoiceNumber:date:total' },
      barcode: { enabled: false, source: 'invoiceNumber' },
      is_default: false,
      is_system: true,
    },
    {
      id: 'default-invoice-a5',
      name: 'فاتورة A5',
      description: 'قالب افتراضي لفواتير A5 — مناسب للتوصيل',
      paper_size: 'A5',
      orientation: 'portrait',
      width_mm: 148,
      height_mm: 210,
      supported_documents: ['bl', 'customer-statement', 'supplier-statement'],
      visibility: {
        logo: true, shopName: true, invoiceNumber: true, customerName: true,
        customerPhone: true, customerAddress: false, barcode: false,
        unitPrice: false, discount: false, tva: false, sellerName: true,
        cashierName: true, paymentMethod: true, qr: false, signature: false, stamp: false,
      },
      layout: {
        header: [
          { id: 'h-logo', type: 'image', src: '', width: 50, height: 50, align: 'center' },
          { id: 'h-name', type: 'text', text: '{{shopLegal.name}}', align: 'center', size: 'lg', weight: 700, colorVar: 'primary' },
          { id: 'h-contact', type: 'text', text: '{{shopLegal.phone}}', align: 'center', size: 'sm', colorVar: 'footer' },
          { id: 'h-sep', type: 'separator', style: 'dashed' },
          { id: 'h-inv-info', type: 'row', align: 'space-between', children: [{ id: 'h-inv-num', type: 'text', text: 'فاتورة #{{invoice.number}}', size: 'md', weight: 600 }, { id: 'h-inv-date', type: 'text', text: '{{invoice.date}}', size: 'sm' }] },
          { id: 'h-customer', type: 'row', align: 'space-between', children: [{ id: 'h-cust-name', type: 'text', text: 'الزبون: {{invoice.customerName}}', size: 'sm' }, { id: 'h-cust-phone', type: 'text', text: 'الهاتف: {{invoice.customerPhone}}', size: 'sm' }] },
        ],
        body: [
          { id: 'b-table', type: 'table', columns: [
            { key: 'name', label: 'المنتج', align: 'right' },
            { key: 'qty', label: 'الكمية', align: 'center', format: 'number' },
            { key: 'lineTotal', label: 'الإجمالي', align: 'left', format: 'currency' },
          ], source: 'items', showTotal: true, showTva: false },
        ],
        footer: [
          { id: 'f-sep', type: 'separator', style: 'solid' },
          { id: 'f-total-row', type: 'row', align: 'space-between', children: [{ id: 'f-total-label', type: 'text', text: 'الإجمالي', size: 'lg', weight: 700, colorVar: 'primary' }, { id: 'f-total-val', type: 'text', text: '{{invoice.total}}', size: 'lg', weight: 700, colorVar: 'primary' }] },
          { id: 'f-payment', type: 'row', align: 'space-between', children: [{ id: 'f-pay', type: 'text', text: 'الدفع: {{invoice.paymentMethod}}', size: 'sm' }, { id: 'f-cashier', type: 'text', text: '{{user.name}}', size: 'sm', colorVar: 'footer' }] },
          { id: 'f-footer', type: 'text', text: '{{shopLegal.footer}}', align: 'center', size: 'sm', colorVar: 'footer' },
        ],
      },
      styles: {
        primaryColor: '#0891b2', headerColor: '#0e7490', footerColor: '#64748b',
        tableColor: '#e2e8f0', logoColor: '#0891b2',
        font: { family: 'Cairo', size: 12, weight: 400 },
      },
      qr: { enabled: false, payload: 'invoiceNumber' },
      barcode: { enabled: false, source: 'invoiceNumber' },
      is_default: false,
      is_system: true,
    },
  ];

  const DEFAULT_ASSIGNMENTS_SEED: Array<{ doc_type: string; template_id: string }> = [
    { doc_type: 'thermal-receipt', template_id: 'default-thermal-80' },
    { doc_type: 'return-invoice', template_id: 'default-thermal-80' },
    { doc_type: 'sale-invoice', template_id: 'default-invoice-a4' },
    { doc_type: 'proforma', template_id: 'default-invoice-a4' },
    { doc_type: 'devis', template_id: 'default-invoice-a4' },
    { doc_type: 'purchase-invoice', template_id: 'default-invoice-a4' },
    { doc_type: 'bl', template_id: 'default-invoice-a5' },
    { doc_type: 'customer-statement', template_id: 'default-invoice-a5' },
    { doc_type: 'supplier-statement', template_id: 'default-invoice-a5' },
  ];

  for (const tpl of DEFAULT_TEMPLATES_SEED) {
    const existingTpl = queryOne('SELECT id FROM print_templates WHERE id = ?', [tpl.id]);
    if (!existingTpl) {
      execute(
        `INSERT INTO print_templates (id, name, description, paper_size, orientation, width_mm, height_mm,
          supported_documents, visibility, layout, styles, qr, barcode, is_default, is_system,
          created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tpl.id, tpl.name, tpl.description, tpl.paper_size, tpl.orientation, tpl.width_mm, tpl.height_mm,
          JSON.stringify(tpl.supported_documents), JSON.stringify(tpl.visibility),
          JSON.stringify(tpl.layout), JSON.stringify(tpl.styles),
          JSON.stringify(tpl.qr), JSON.stringify(tpl.barcode),
          tpl.is_default ? 1 : 0, tpl.is_system ? 1 : 0, 'system', now, now,
        ]
      );
    }
  }

  for (const a of DEFAULT_ASSIGNMENTS_SEED) {
    const existingA = queryOne('SELECT doc_type FROM template_assignments WHERE doc_type = ?', [a.doc_type]);
    if (!existingA) {
      execute(
        'INSERT INTO template_assignments (doc_type, template_id) VALUES (?, ?)',
        [a.doc_type, a.template_id]
      );
    }
  }

  console.log('[seed] اكتمل seed بنجاح');
}
