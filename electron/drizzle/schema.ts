// Drizzle ORM schema — AN-POS
// كل الجداول الـ33 مترجمة من:
//   - src/infrastructure/database/dexie/db.ts (interfaces/objects)
//   - server/src/shared/schema.ts (CREATE TABLE DDL)
// محرك SQLite عبر node:sqlite + drizzle-orm/sqlite-proxy

import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============ الإعدادات ============

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  shopName: text('shop_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  phone2: text('phone2').default(''),
  email: text('email').default(''),
  address: text('address').default(''),
  city: text('city').default(''),
  logo: text('logo').default(''),
  tvaRate: real('tva_rate').notNull().default(0),
  printWidthMm: integer('print_width_mm').notNull().default(80),
  syncMode: text('sync_mode').notNull().default('single'),
  currencies: text('currencies').notNull().default('[]'),
  baseCurrency: text('base_currency').notNull().default('دج'),
  invoicePrefix: text('invoice_prefix').notNull().default('INV-'),
  invoiceStartNumber: integer('invoice_start_number').notNull().default(1),
  receiptFooter: text('receipt_footer').notNull().default(''),
  zakatEnabled: integer('zakat_enabled').notNull().default(0),
  nisabThreshold: real('nisab_threshold').notNull().default(0),
  shopLogo: text('shop_logo').default(''),
  language: text('language').default('ar'),
  printLanguage: text('print_language').default('ar'),
  shopDescription: text('shop_description').default(''),
  shopAddress: text('shop_address').default(''),
  shopPhone2: text('shop_phone2').default(''),
  shopEmail: text('shop_email').default(''),
  commercialRegister: text('commercial_register').default(''),
  companyRC: text('company_rc').default(''),
  taxNumber: text('tax_number').default(''),
  companyNif: text('company_nif').default(''),
  taxArticle: text('tax_article').default(''),
  companyArt: text('company_art').default(''),
  companyAI: text('company_ai').default(''),
  taxId: text('tax_id').default(''),
  quickSale: integer('quick_sale').default(0),
  accountingOnly: integer('accounting_only').default(0),
  allowNegativeStock: integer('allow_negative_stock').default(0),
  confirmNoStock: integer('confirm_no_stock').default(0),
  averagePricing: integer('average_pricing').default(0),
  invoiceTemplate: text('invoice_template').default('basic'),
  expenseCategories: text('expense_categories').default('[]'),
  dateFormat: text('date_format').notNull().default('DD/MM/YYYY'),
  timeFormat: text('time_format').notNull().default('24h'),
  timezone: text('timezone').notNull().default('Africa/Algiers'),
  decimalSeparator: text('decimal_separator').notNull().default(','),
  thousandsSeparator: text('thousands_separator').notNull().default('.'),
  textDirection: text('text_direction').notNull().default('rtl'),
  operatingMode: text('operating_mode').notNull().default('online'),
  autoSync: integer('auto_sync').notNull().default(1),
  cacheDays: integer('cache_days').notNull().default(7),
  connectionAlert: integer('connection_alert').notNull().default(1),
  connectionCheckInterval: integer('connection_check_interval').notNull().default(5),
});

// ============ المستخدمون والصلاحيات ============

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    name: text('name').notNull(),
    pin: text('pin').notNull(),
    email: text('email').default(''),
    phone: text('phone').default(''),
    avatar: text('avatar').default(''),
    role: text('role').notNull().default('seller'),
    roleId: text('role_id').default(''),
    status: text('status').notNull().default('active'),
    lastLogin: text('last_login').default(''),
    loginAttempts: integer('login_attempts').notNull().default(0),
    lockedUntil: text('locked_until').default(''),
    passwordChangedAt: text('password_changed_at').default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    usernameIdx: uniqueIndex('idx_users_username').on(t.username),
    roleIdx: index('idx_users_role').on(t.role),
    statusIdx: index('idx_users_status').on(t.status),
  })
);

export const roles = sqliteTable(
  'roles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description').default(''),
    permissions: text('permissions').notNull().default('{}'),
    isSystem: integer('is_system').notNull().default(0),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    nameIdx: uniqueIndex('idx_roles_name').on(t.name),
  })
);

export const userActivities = sqliteTable(
  'user_activities',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(),
    entity: text('entity').default(''),
    entityType: text('entity_type').default(''),
    entityId: text('entity_id').default(''),
    details: text('details').default(''),
    oldValue: text('old_value').default(''),
    newValue: text('new_value').default(''),
    ipAddress: text('ip_address').default(''),
    deviceInfo: text('device_info').default(''),
    performedAt: text('performed_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    userIdx: index('idx_user_activities_user').on(t.userId),
    actionIdx: index('idx_user_activities_action').on(t.action),
    dateIdx: index('idx_user_activities_date').on(t.performedAt),
  })
);

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
});

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').default(''),
    userId: text('user_id').notNull(),
    details: text('details').default(''),
    timestamp: text('timestamp').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    actionIdx: index('idx_audit_logs_action').on(t.action),
    userIdx: index('idx_audit_logs_user').on(t.userId),
  })
);

// ============ المخزون ============

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    barcode: text('barcode').notNull().default(''),
    sku: text('sku').notNull().default(''),
    category: text('category').notNull().default(''),
    categoryId: text('category_id'),
    type: text('type').notNull().default(''),
    unit: text('unit').notNull().default('قطعة'),
    costPrice: real('cost_price').notNull().default(0),
    averagePrice: real('average_price').notNull().default(0),
    wholesalePrice: real('wholesale_price').notNull().default(0),
    retailPrice: real('retail_price').notNull().default(0),
    salePrice1: real('sale_price1').notNull().default(0),
    salePrice2: real('sale_price2').notNull().default(0),
    salePrice3: real('sale_price3').notNull().default(0),
    invoicePrice: real('invoice_price').notNull().default(0),
    profitMargin: real('profit_margin').notNull().default(0),
    tax: real('tax').notNull().default(0),
    discount: real('discount').notNull().default(0),
    wholesaleMinQty: integer('wholesale_min_qty').notNull().default(0),
    quantity: real('quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(0),
    reorderPoint: integer('reorder_point').notNull().default(0),
    maxStock: integer('max_stock').notNull().default(0),
    stockable: integer('stockable').notNull().default(1),
    weight: real('weight').notNull().default(0),
    packageSize: text('package_size').notNull().default(''),
    location: text('location').notNull().default(''),
    image: text('image').notNull().default(''),
    variant: text('variant').notNull().default(''),
    expiryDate: text('expiry_date').notNull().default(''),
    batchNumber: text('batch_number').notNull().default(''),
    highlighted: integer('highlighted').notNull().default(0),
    status: text('status').notNull().default('active'),
    allowNegativeStock: integer('allow_negative_stock').notNull().default(0),
    warehouseId: text('warehouse_id').notNull().default(''),
    pricingByZone: integer('pricing_by_zone').notNull().default(0),
    loyaltyCard: integer('loyalty_card').notNull().default(0),
    askPrice: integer('ask_price').notNull().default(0),
    askQuantity: integer('ask_quantity').notNull().default(0),
    pointPrice: integer('point_price').notNull().default(0),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
    createdBy: text('created_by').notNull().default(''),
  },
  (t) => ({
    nameIdx: index('idx_products_name').on(t.name),
    barcodeIdx: index('idx_products_barcode').on(t.barcode),
    categoryIdx: index('idx_products_category').on(t.category),
    categoryIdIdx: index('idx_products_category_id').on(t.categoryId),
    skuIdx: index('idx_products_sku').on(t.sku),
  })
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    parentId: text('parent_id'),
    description: text('description').notNull().default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    nameIdx: uniqueIndex('idx_categories_name').on(t.name),
  })
);

export const productBarcodes = sqliteTable(
  'product_barcodes',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    barcode: text('barcode').notNull().unique(),
    type: text('type').notNull().default('primary'),
    variantLabel: text('variant_label').default(''),
    batchNumber: text('batch_number').default(''),
    expiryDate: text('expiry_date').default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    barcodeIdx: uniqueIndex('idx_product_barcodes_barcode').on(t.barcode),
    productIdx: index('idx_product_barcodes_product').on(t.productId),
  })
);

export const barcodePrints = sqliteTable(
  'barcode_prints',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    barcode: text('barcode').notNull(),
    labelSize: text('label_size').notNull(),
    copies: integer('copies').notNull().default(1),
    barcodeType: text('barcode_type').notNull().default('ean13'),
    showCompany: integer('show_company').notNull().default(0),
    showProduct: integer('show_product').notNull().default(1),
    showSku: integer('show_sku').notNull().default(0),
    showPrice: integer('show_price').notNull().default(1),
    showBarcode: integer('show_barcode').notNull().default(1),
    enlargePrice: integer('enlarge_price').notNull().default(0),
    printOptions: text('print_options').notNull().default('{}'),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    productIdx: index('idx_barcode_prints_product').on(t.productId),
    createdIdx: index('idx_barcode_prints_created').on(t.createdAt),
  })
);

export const warehouses = sqliteTable(
  'warehouses',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    location: text('location').default(''),
    type: text('type').notNull().default('main'),
    capacity: integer('capacity'),
    temperature: real('temperature'),
    humidity: real('humidity'),
    isActive: integer('is_active').notNull().default(1),
    parentId: text('parent_id'),
    createdBy: text('created_by').default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    typeIdx: index('idx_warehouses_type').on(t.type),
    activeIdx: index('idx_warehouses_active').on(t.isActive),
  })
);

export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    type: text('type').notNull(),
    qty: real('qty').notNull().default(0),
    reference: text('reference').default(''),
    reason: text('reason').default(''),
    createdBy: text('created_by').notNull().default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    date: text('date').default(''),
    updatedAt: text('updated_at').default(''),
  },
  (t) => ({
    productIdx: index('idx_stock_movements_product').on(t.productId),
    typeIdx: index('idx_stock_movements_type').on(t.type),
    createdIdx: index('idx_stock_movements_created').on(t.createdAt),
  })
);

export const stockMovementsV2 = sqliteTable(
  'stock_movements_v2',
  {
    id: text('id').primaryKey(),
    movementNumber: text('movement_number').notNull(),
    date: text('date').notNull(),
    type: text('type').notNull(),
    warehouseId: text('warehouse_id').notNull(),
    itemId: text('item_id').notNull(),
    quantity: real('quantity').notNull().default(0),
    unitPrice: real('unit_price').notNull().default(0),
    totalAmount: real('total_amount').notNull().default(0),
    reference: text('reference').default(''),
    description: text('description').default(''),
    isReviewed: integer('is_reviewed').notNull().default(0),
    reviewedBy: text('reviewed_by').default(''),
    reviewedAt: text('reviewed_at').default(''),
    createdBy: text('created_by').default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    numberIdx: index('idx_smv2_number').on(t.movementNumber),
    warehouseIdx: index('idx_smv2_warehouse').on(t.warehouseId),
    itemIdx: index('idx_smv2_item').on(t.itemId),
    typeIdx: index('idx_smv2_type').on(t.type),
    dateIdx: index('idx_smv2_date').on(t.date),
    reviewedIdx: index('idx_smv2_reviewed').on(t.isReviewed),
  })
);

export const stockMovementLines = sqliteTable(
  'stock_movement_lines',
  {
    id: text('id').primaryKey(),
    movementId: text('movement_id').notNull(),
    itemId: text('item_id').notNull(),
    quantity: real('quantity').notNull().default(0),
    unitPrice: real('unit_price').notNull().default(0),
    totalAmount: real('total_amount').notNull().default(0),
    lineNumber: integer('line_number').notNull().default(0),
  },
  (t) => ({
    movementIdx: index('idx_sml_movement').on(t.movementId),
    itemIdx: index('idx_sml_item').on(t.itemId),
  })
);

export const inventoryCounts = sqliteTable(
  'inventory_counts',
  {
    id: text('id').primaryKey(),
    countNumber: text('count_number').notNull(),
    date: text('date').notNull(),
    warehouseId: text('warehouse_id').notNull(),
    status: text('status').notNull().default('pending'),
    isClosed: integer('is_closed').notNull().default(0),
    closedBy: text('closed_by').default(''),
    closedAt: text('closed_at').default(''),
    createdBy: text('created_by').default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    numberIdx: index('idx_ic_number').on(t.countNumber),
    warehouseIdx: index('idx_ic_warehouse').on(t.warehouseId),
    statusIdx: index('idx_ic_status').on(t.status),
  })
);

export const inventoryCountLines = sqliteTable(
  'inventory_count_lines',
  {
    id: text('id').primaryKey(),
    countId: text('count_id').notNull(),
    itemId: text('item_id').notNull(),
    expectedQty: real('expected_qty').notNull().default(0),
    actualQty: real('actual_qty').notNull().default(0),
    variance: real('variance').notNull().default(0),
    lineNumber: integer('line_number').notNull().default(0),
  },
  (t) => ({
    countIdx: index('idx_icl_count').on(t.countId),
    itemIdx: index('idx_icl_item').on(t.itemId),
  })
);

// ============ المبيعات ============

export const sales = sqliteTable(
  'sales',
  {
    id: text('id').primaryKey(),
    number: text('number').notNull(),
    date: text('date').notNull(),
    docType: text('doc_type').notNull().default('facture'),
    type: text('type').notNull().default('sale'),
    items: text('items').notNull().default('[]'),
    subtotal: real('subtotal').notNull().default(0),
    discount: real('discount').notNull().default(0),
    discountType: text('discount_type').notNull().default('percent'),
    tvaAmount: real('tva_amount').notNull().default(0),
    total: real('total').notNull().default(0),
    paymentMethod: text('payment_method').notNull().default('cash'),
    customerId: text('customer_id').notNull().default(''),
    customerName: text('customer_name').default(''),
    amountPaid: real('amount_paid').notNull().default(0),
    status: text('status').notNull().default('paid'),
    soldBy: text('sold_by').notNull().default(''),
    cashSessionId: text('cash_session_id').notNull().default(''),
    sessionId: text('session_id').default(''),
    note: text('note').default(''),
    lastPrintedAt: text('last_printed_at').default(''),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (t) => ({
    dateIdx: index('idx_sales_date').on(t.date),
    customerIdx: index('idx_sales_customer').on(t.customerId),
    numberIdx: index('idx_sales_number').on(t.number),
    statusIdx: index('idx_sales_status').on(t.status),
    typeIdx: index('idx_sales_type').on(t.type),
    docTypeIdx: index('idx_sales_doc_type').on(t.docType),
  })
);

export const saleItems = sqliteTable(
  'sale_items',
  {
    id: text('id').primaryKey(),
    saleId: text('sale_id').notNull(),
    productId: text('product_id').notNull(),
    name: text('name').notNull(),
    qty: real('qty').notNull().default(0),
    unitPrice: real('unit_price').notNull().default(0),
    lineTotal: real('line_total').notNull().default(0),
    batchNumber: text('batch_number').default(''),
  },
  (t) => ({
    saleIdx: index('idx_sale_items_sale').on(t.saleId),
    productIdx: index('idx_sale_items_product').on(t.productId),
  })
);

export const suspendedOrders = sqliteTable(
  'suspended_orders',
  {
    id: text('id').primaryKey(),
    items: text('items').notNull().default('[]'),
    customerId: text('customer_id').notNull().default(''),
    discount: real('discount').notNull().default(0),
    discountType: text('discount_type').notNull().default('percent'),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    note: text('note').notNull().default(''),
    createdBy: text('created_by').default(''),
  },
  (t) => ({
    createdIdx: index('idx_suspended_orders_created').on(t.createdAt),
  })
);

export const packs = sqliteTable(
  'packs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    barcode: text('barcode').notNull().default(''),
    items: text('items').notNull().default('[]'),
    packPrice: real('pack_price').notNull().default(0),
    status: text('status').notNull().default('active'),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    barcodeIdx: index('idx_packs_barcode').on(t.barcode),
    statusIdx: index('idx_packs_status').on(t.status),
  })
);

export const promotions = sqliteTable(
  'promotions',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    name: text('name').default(''),
    type: text('type').default('percentage'),
    value: real('value').notNull().default(0),
    productIds: text('product_ids').default('[]'),
    discountType: text('discount_type').notNull().default('percent'),
    discountValue: real('discount_value').notNull().default(0),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    active: integer('active').notNull().default(1),
    status: text('status').default('active'),
    maxQuantity: integer('max_quantity').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (t) => ({
    productIdx: index('idx_promotions_product').on(t.productId),
    activeIdx: index('idx_promotions_active').on(t.active),
  })
);

// ============ العملاء ============

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  creditLimit: real('credit_limit').notNull().default(0),
  balance: real('balance').notNull().default(0),
  createdAt: text('created_at').default(sql`datetime('now')`),
  updatedAt: text('updated_at').default(sql`datetime('now')`),
});

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    partyType: text('party_type').notNull().default('customer'),
    partyId: text('party_id').notNull(),
    customerId: text('customer_id').default(''),
    amount: real('amount').notNull().default(0),
    type: text('type').default('debit'),
    method: text('method').default('cash'),
    note: text('note').default(''),
    createdBy: text('created_by').default(''),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (t) => ({
    customerIdx: index('idx_payments_customer').on(t.customerId),
    partyIdx: index('idx_payments_party').on(t.partyId, t.partyType),
    dateIdx: index('idx_payments_date').on(t.date),
  })
);

// ============ الموردون ============

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  balance: real('balance').notNull().default(0),
  createdAt: text('created_at').default(sql`datetime('now')`),
  updatedAt: text('updated_at').default(sql`datetime('now')`),
});

export const supplierEntries = sqliteTable(
  'supplier_entries',
  {
    id: text('id').primaryKey(),
    supplierId: text('supplier_id').notNull(),
    date: text('date').notNull(),
    type: text('type').notNull(),
    amount: real('amount').notNull().default(0),
    items: text('items').notNull().default('[]'),
    invoiceNumber: text('invoice_number').notNull().default(''),
    paidAmount: real('paid_amount').notNull().default(0),
    remainingBalance: real('remaining_balance').notNull().default(0),
  },
  (t) => ({
    supplierIdx: index('idx_supplier_entries_supplier').on(t.supplierId),
  })
);

export const purchases = sqliteTable(
  'purchases',
  {
    id: text('id').primaryKey(),
    number: text('number').notNull(),
    date: text('date').notNull(),
    supplierId: text('supplier_id').notNull(),
    subtotal: real('subtotal').notNull().default(0),
    tvaAmount: real('tva_amount').notNull().default(0),
    total: real('total').notNull().default(0),
    status: text('status').notNull().default('draft'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (t) => ({
    numberIdx: index('idx_purchases_number').on(t.number),
    supplierIdx: index('idx_purchases_supplier').on(t.supplierId),
    dateIdx: index('idx_purchases_date').on(t.date),
    statusIdx: index('idx_purchases_status').on(t.status),
  })
);

export const purchaseItems = sqliteTable(
  'purchase_items',
  {
    id: text('id').primaryKey(),
    purchaseId: text('purchase_id').notNull(),
    productId: text('product_id').notNull(),
    name: text('name').notNull(),
    qty: real('qty').notNull().default(0),
    unitPrice: real('unit_price').notNull().default(0),
    lineTotal: real('line_total').notNull().default(0),
  },
  (t) => ({
    purchaseIdx: index('idx_purchase_items_purchase').on(t.purchaseId),
    productIdx: index('idx_purchase_items_product').on(t.productId),
  })
);

// ============ المالية ============

export const expenses = sqliteTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    label: text('label').notNull(),
    category: text('category').notNull().default(''),
    amount: real('amount').notNull().default(0),
    note: text('note').default(''),
    createdBy: text('created_by').default(''),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (t) => ({
    dateIdx: index('idx_expenses_date').on(t.date),
    categoryIdx: index('idx_expenses_category').on(t.category),
  })
);

export const cashSessions = sqliteTable(
  'cash_sessions',
  {
    id: text('id').primaryKey(),
    number: text('number').default(''),
    sessionNumber: integer('session_number').notNull(),
    openedBy: text('opened_by').notNull(),
    openedAt: text('opened_at').notNull(),
    closedAt: text('closed_at').notNull().default(''),
    openingBalance: real('opening_balance').notNull().default(0),
    closingBalance: real('closing_balance').default(0),
    expectedBalance: real('expected_balance').default(0),
    actualBalance: real('actual_balance').default(0),
    difference: real('difference').default(0),
    deposits: text('deposits').notNull().default('[]'),
    totalSales: real('total_sales').notNull().default(0),
    totalReturns: real('total_returns').notNull().default(0),
    status: text('status').notNull().default('open'),
    note: text('note').default(''),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (t) => ({
    statusIdx: index('idx_cash_sessions_status').on(t.status),
    openedIdx: index('idx_cash_sessions_opened').on(t.openedAt),
  })
);

export const capitalEntries = sqliteTable(
  'capital_entries',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    type: text('type').notNull(),
    amount: real('amount').notNull().default(0),
    note: text('note').notNull().default(''),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (t) => ({
    typeIdx: index('idx_capital_entries_type').on(t.type),
    dateIdx: index('idx_capital_entries_date').on(t.date),
  })
);

// ============ الطباعة ============

export const printTemplates = sqliteTable(
  'print_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description').notNull().default(''),
    paperSize: text('paper_size').notNull().default('80mm'),
    orientation: text('orientation').notNull().default('portrait'),
    widthMm: real('width_mm').notNull().default(80),
    heightMm: real('height_mm'),
    supportedDocuments: text('supported_documents').notNull().default('[]'),
    visibility: text('visibility').notNull().default('{}'),
    layout: text('layout').notNull().default('{}'),
    styles: text('styles').notNull().default('{}'),
    qr: text('qr').default('{}'),
    barcode: text('barcode').default('{}'),
    isDefault: integer('is_default').notNull().default(0),
    isSystem: integer('is_system').notNull().default(0),
    createdBy: text('created_by').notNull().default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    defaultIdx: index('idx_print_templates_default').on(t.isDefault),
    systemIdx: index('idx_print_templates_system').on(t.isSystem),
  })
);

export const printHistory = sqliteTable(
  'print_history',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id').notNull(),
    invoiceType: text('invoice_type').notNull(),
    docTypeKey: text('doc_type_key').notNull(),
    templateId: text('template_id').notNull(),
    printedBy: text('printed_by').notNull(),
    printedAt: text('printed_at').notNull().default(sql`datetime('now')`),
    copies: integer('copies').notNull().default(1),
    printerName: text('printer_name').notNull().default(''),
    isReprint: integer('is_reprint').notNull().default(0),
    payload: text('payload').default(''),
  },
  (t) => ({
    invoiceIdx: index('idx_print_history_invoice').on(t.invoiceId),
    templateIdx: index('idx_print_history_template').on(t.templateId),
    printedByIdx: index('idx_print_history_printed_by').on(t.printedBy),
  })
);

export const templateAssignments = sqliteTable(
  'template_assignments',
  {
    docType: text('doc_type').primaryKey(),
    templateId: text('template_id').notNull(),
  }
);

export const printers = sqliteTable(
  'printers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull().default('system'),
    connection: text('connection').notNull().default('browser'),
    address: text('address').default(''),
    port: integer('port'),
    paperSize: text('paper_size').notNull().default('80mm'),
    driver: text('driver').notNull().default('browser'),
    dpi: integer('dpi'),
    speed: integer('speed'),
    status: text('status').notNull().default('unknown'),
    lastSeenAt: text('last_seen_at'),
    isDefault: integer('is_default').notNull().default(0),
    isActive: integer('is_active').notNull().default(1),
    vendor: text('vendor').default(''),
    model: text('model').default(''),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    defaultIdx: index('idx_printers_default').on(t.isDefault),
    activeIdx: index('idx_printers_active').on(t.isActive),
  })
);

export const printerTemplateMappings = sqliteTable(
  'printer_template_mappings',
  {
    id: text('id').primaryKey(),
    printerId: text('printer_id').notNull(),
    docType: text('doc_type').notNull(),
    templateId: text('template_id').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    printerDocIdx: uniqueIndex('idx_ptm_printer_doctype').on(t.printerId, t.docType),
    printerIdx: index('idx_ptm_printer').on(t.printerId),
    docTypeIdx: index('idx_ptm_doctype').on(t.docType),
  })
);

export const printJobs = sqliteTable(
  'print_jobs',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id').notNull(),
    templateId: text('template_id').notNull(),
    printerId: text('printer_id').notNull(),
    status: text('status').notNull().default('pending'),
    copies: integer('copies').notNull().default(1),
    payload: text('payload').notNull().default('{}'),
    errorMessage: text('error_message').default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    processedAt: text('processed_at'),
  },
  (t) => ({
    invoiceIdx: index('idx_print_jobs_invoice').on(t.invoiceId),
    statusIdx: index('idx_print_jobs_status').on(t.status),
    createdIdx: index('idx_print_jobs_created').on(t.createdAt),
    templateIdx: index('idx_print_jobs_template').on(t.templateId),
  })
);

export const printFailureCounter = sqliteTable(
  'print_failure_counter',
  {
    id: text('id').primaryKey(),
    printerId: text('printer_id'),
    templateId: text('template_id'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    lastFailureAt: text('last_failure_at').notNull().default(sql`datetime('now')`),
    lastError: text('last_error').default(''),
    notified: integer('notified').notNull().default(0),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    printerIdx: index('idx_pfc_printer').on(t.printerId),
    templateIdx: index('idx_pfc_template').on(t.templateId),
  })
);

// ============ الشبكة والأجهزة ============

export const networkSettings = sqliteTable('network_settings', {
  id: text('id').primaryKey(),
  lanEnabled: integer('lan_enabled').notNull().default(0),
  serverIp: text('server_ip').notNull().default(''),
  serverPort: integer('server_port').notNull().default(3000),
  protocol: text('protocol').notNull().default('http'),
  sslCertPath: text('ssl_cert_path').default(''),
  sslKeyPath: text('ssl_key_path').default(''),
  connectionKey: text('connection_key').default(''),
  autoReconnect: integer('auto_reconnect').notNull().default(1),
  reconnectInterval: integer('reconnect_interval').notNull().default(5),
  cloudEnabled: integer('cloud_enabled').notNull().default(0),
  apiUrl: text('api_url').default(''),
  apiKey: text('api_key').default(''),
  webhookUrl: text('webhook_url').default(''),
  webhookSecret: text('webhook_secret').default(''),
  corsOrigins: text('cors_origins').default(''),
  syncAuto: integer('sync_auto').notNull().default(1),
  syncInterval: integer('sync_interval').notNull().default(5),
  syncType: text('sync_type').notNull().default('incremental'),
  syncTime: text('sync_time').notNull().default('night'),
  alertOnSyncFail: integer('alert_on_sync_fail').notNull().default(1),
  syncFailCount: integer('sync_fail_count').notNull().default(0),
  oauthEnabled: integer('oauth_enabled').notNull().default(0),
  jwtEnabled: integer('jwt_enabled').notNull().default(0),
  apiRateLimit: integer('api_rate_limit').notNull().default(100),
  ipWhitelist: text('ip_whitelist').notNull().default('[]'),
  forceHttps: integer('force_https').notNull().default(1),
  printerConnection: text('printer_connection').notNull().default('usb'),
  printerDriver: text('printer_driver').notNull().default('esc_pos'),
  printerDpi: integer('printer_dpi').notNull().default(203),
  printerSpeed: integer('printer_speed').notNull().default(150),
  printerPaperSize: integer('printer_paper_size').notNull().default(80),
  printerHost: text('printer_host').default(''),
  printerPort: integer('printer_port'),
  printerTestedAt: text('printer_tested_at').default(''),
  barcodeType: text('barcode_type').notNull().default('code128'),
  scannerType: text('scanner_type').notNull().default('handheld'),
  scannerInterface: text('scanner_interface').notNull().default('usb'),
  scannerSpeed: integer('scanner_speed').notNull().default(100),
  scannerDpi: integer('scanner_dpi').notNull().default(200),
  scannerTestedAt: text('scanner_tested_at').default(''),
  scannerBeepEnabled: integer('scanner_beep_enabled').notNull().default(1),
  scannerTerminator: text('scanner_terminator').notNull().default('Enter'),
  scannerMinLength: integer('scanner_min_length').notNull().default(6),
  scannerAllowManualTypes: integer('scanner_allow_manual_types').notNull().default(1),
  lastConnectedAt: text('last_connected_at').default(''),
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
});

export const connectedDevices = sqliteTable(
  'connected_devices',
  {
    id: text('id').primaryKey(),
    deviceName: text('device_name').notNull(),
    deviceType: text('device_type').notNull(),
    connectionType: text('connection_type').notNull(),
    ipAddress: text('ip_address').default(''),
    macAddress: text('mac_address').default(''),
    port: integer('port'),
    status: text('status').notNull().default('offline'),
    lastSeen: text('last_seen').default(''),
    vendor: text('vendor').default(''),
    model: text('model').default(''),
    createdAt: text('created_at').notNull().default(sql`datetime('now')`),
    updatedAt: text('updated_at').notNull().default(sql`datetime('now')`),
  },
  (t) => ({
    typeIdx: index('idx_connected_devices_type').on(t.deviceType),
    statusIdx: index('idx_connected_devices_status').on(t.status),
  })
);

// ============ تصدير المخطط الكامل ============

export const schema = {
  settings,
  users,
  roles,
  userActivities,
  refreshTokens,
  auditLogs,
  products,
  categories,
  productBarcodes,
  barcodePrints,
  warehouses,
  stockMovements,
  stockMovementsV2,
  stockMovementLines,
  inventoryCounts,
  inventoryCountLines,
  sales,
  saleItems,
  suspendedOrders,
  packs,
  promotions,
  customers,
  payments,
  suppliers,
  supplierEntries,
  purchases,
  purchaseItems,
  expenses,
  cashSessions,
  capitalEntries,
  printTemplates,
  printHistory,
  templateAssignments,
  printers,
  printerTemplateMappings,
  printJobs,
  printFailureCounter,
  networkSettings,
  connectedDevices,
};
