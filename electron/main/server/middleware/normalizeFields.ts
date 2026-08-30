// Middleware لتطبيع الحقول بين snake_case و camelCase
// يضمن وصول الحقول بالصيغتين دون فقدان أي حقل حساس (العميل، الجلسة، طريقة الدفع، المبالغ...)

const FIELD_MAP: Record<string, string> = {
  doc_type: 'docType',
  docType: 'doc_type',
  customer_id: 'customerId',
  customerId: 'customer_id',
  customer_name: 'customerName',
  customerName: 'customer_name',
  payment_method: 'paymentMethod',
  paymentMethod: 'payment_method',
  amount_paid: 'amountPaid',
  amountPaid: 'amount_paid',
  sold_by: 'soldBy',
  soldBy: 'sold_by',
  cash_session_id: 'cashSessionId',
  cashSessionId: 'cash_session_id',
  session_id: 'cashSessionId',
  sessionId: 'cash_session_id',
  tva_amount: 'tvaAmount',
  tvaAmount: 'tva_amount',
  discount_type: 'discountType',
  discountType: 'discount_type',
  unit_price: 'unitPrice',
  unitPrice: 'unit_price',
  line_total: 'lineTotal',
  lineTotal: 'line_total',
  product_id: 'productId',
  productId: 'product_id',
  product_name: 'productName',
  productName: 'product_name',
  cost_price: 'costPrice',
  costPrice: 'cost_price',
  purchase_price: 'purchasePrice',
  purchasePrice: 'purchase_price',
  average_price: 'averagePrice',
  averagePrice: 'average_price',
  retail_price: 'retailPrice',
  retailPrice: 'retail_price',
  wholesale_price: 'wholesalePrice',
  wholesalePrice: 'wholesale_price',
  wholesale_min_qty: 'wholesaleMinQty',
  wholesaleMinQty: 'wholesale_min_qty',
  low_stock_threshold: 'lowStockThreshold',
  lowStockThreshold: 'low_stock_threshold',
  min_quantity: 'minQuantity',
  minQuantity: 'min_quantity',
  batch_number: 'batchNumber',
  batchNumber: 'batch_number',
  expiry_date: 'expiryDate',
  expiryDate: 'expiry_date',
  warehouse_id: 'warehouseId',
  warehouseId: 'warehouse_id',
  category_id: 'categoryId',
  categoryId: 'category_id',
  allow_negative_stock: 'allowNegativeStock',
  allowNegativeStock: 'allow_negative_stock',
  quick_sale: 'quickSale',
  quickSale: 'quick_sale',
  image_url: 'imageUrl',
  imageUrl: 'image_url',
  party_id: 'partyId',
  partyId: 'party_id',
  party_type: 'partyType',
  partyType: 'party_type',
  party_name: 'partyName',
  partyName: 'party_name',
  reference_id: 'referenceId',
  referenceId: 'reference_id',
  paid_amount: 'paidAmount',
  paidAmount: 'paid_amount',
  remaining_balance: 'remainingBalance',
  remainingBalance: 'remaining_balance',
  invoice_number: 'invoiceNumber',
  invoiceNumber: 'invoice_number',
  actual_balance: 'actualBalance',
  actualBalance: 'actual_balance',
  expected_balance: 'expectedBalance',
  expectedBalance: 'expected_balance',
  opening_balance: 'openingBalance',
  openingBalance: 'opening_balance',
  closing_balance: 'closingBalance',
  closingBalance: 'closing_balance',
  total_sales: 'totalSales',
  totalSales: 'total_sales',
  total_expenses: 'totalExpenses',
  totalExpenses: 'total_expenses',
  total_returns: 'totalReturns',
  totalReturns: 'total_returns',
  opened_by: 'openedBy',
  openedBy: 'opened_by',
  opened_at: 'openedAt',
  openedAt: 'opened_at',
  closed_at: 'closedAt',
  closedAt: 'closed_at',
  last_printed_at: 'lastPrintedAt',
  lastPrintedAt: 'last_printed_at',
};

/**
 * تطبيع كائن واحد بحيث يوفر القيم بالصيغتين (camelCase و snake_case)
 */
export function normalizeBody<T = Record<string, unknown>>(raw: T): T {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;

  const normalized: Record<string, unknown> = { ...(raw as Record<string, unknown>) };

  for (const [sourceKey, targetKey] of Object.entries(FIELD_MAP)) {
    if (normalized[sourceKey] !== undefined && normalized[targetKey] === undefined) {
      normalized[targetKey] = normalized[sourceKey];
    }
  }

  // معالجة بنود الفاتورة إن وُجدت كمصفوفة
  if (Array.isArray(normalized.items)) {
    normalized.items = normalized.items.map((item) => {
      if (item && typeof item === 'object') {
        return normalizeBody(item as Record<string, unknown>);
      }
      return item;
    });
  }

  return normalized as unknown as T;
}
