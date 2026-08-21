// Products API client — maps camelCase (frontend) ↔ snake_case (backend not yet converted)
// The backend's createCrudRouter for products reads body keys as-is, so we send snake_case.
import { apiFetch, qs } from './client';
import type { Product } from '@/types';

// Body shape sent to backend (snake_case + 0/1 for booleans)
interface ProductWriteBody {
  name: string;
  barcode: string;
  sku?: string;
  category?: string;
  category_id?: string | null;
  type?: string;
  unit: string;
  cost_price: number;
  average_price?: number;
  wholesale_price: number;
  retail_price: number;
  sale_price1?: number;
  sale_price2?: number;
  sale_price3?: number;
  invoice_price?: number;
  profit_margin?: number;
  tax?: number;
  discount?: number;
  wholesale_min_qty?: number;
  quantity: number;
  low_stock_threshold?: number;
  reorder_point?: number;
  max_stock?: number;
  stockable?: number;
  weight?: number;
  package_size?: string;
  location?: string;
  image?: string;
  variant?: string;
  expiry_date?: string;
  batch_number?: string;
  highlighted?: number;
  status?: string;
  allow_negative_stock?: number;
  warehouse_id?: string;
  pricing_by_zone?: number;
  loyalty_card?: number;
  ask_price?: number;
  ask_quantity?: number;
  point_price?: number;
  created_by?: string;
}

/** Convert a Product (camelCase) to a write body (snake_case + 0/1 booleans) */
export function toWriteBody(p: Partial<Product>): ProductWriteBody {
  const body: ProductWriteBody = {
    name: p.name ?? '',
    barcode: p.barcode ?? '',
    sku: p.sku ?? '',
    category: p.category ?? '',
    category_id: p.categoryId ?? null,
    type: p.type ?? '',
    unit: p.unit ?? 'قطعة',
    cost_price: p.costPrice ?? 0,
    average_price: p.averagePrice ?? 0,
    wholesale_price: p.wholesalePrice ?? 0,
    retail_price: p.retailPrice ?? 0,
    sale_price1: p.salePrice1 ?? 0,
    sale_price2: p.salePrice2 ?? 0,
    sale_price3: p.salePrice3 ?? 0,
    invoice_price: p.invoicePrice ?? 0,
    profit_margin: p.profitMargin ?? 0,
    tax: p.tax ?? 0,
    discount: p.discount ?? 0,
    wholesale_min_qty: p.wholesaleMinQty ?? 0,
    quantity: p.quantity ?? 0,
    low_stock_threshold: p.lowStockThreshold ?? 0,
    reorder_point: p.reorderPoint ?? 0,
    max_stock: p.maxStock ?? 0,
    stockable: p.stockable ? 1 : 0,
    weight: p.weight ?? 0,
    package_size: p.packageSize ?? '',
    location: p.location ?? '',
    image: p.image ?? '',
    variant: p.variant ?? '',
    expiry_date: p.expiryDate ?? '',
    batch_number: p.batchNumber ?? '',
    highlighted: p.highlighted ? 1 : 0,
    status: p.status ?? 'active',
    allow_negative_stock: p.allowNegativeStock ? 1 : 0,
    warehouse_id: p.warehouseId ?? '',
    pricing_by_zone: p.pricingByZone ? 1 : 0,
    loyalty_card: p.loyaltyCard ? 1 : 0,
    ask_price: p.askPrice ? 1 : 0,
    ask_quantity: p.askQuantity ? 1 : 0,
    point_price: p.pointPrice ? 1 : 0,
    created_by: p.createdBy ?? '',
  };
  return body;
}

export const productsApi = {
  list: (opts: { search?: string } = {}) =>
    apiFetch<{ data: Product[] }>(`/products${qs({ search: opts.search })}`).then((r) => r.data),

  get: (id: string) =>
    apiFetch<{ data: Product }>(`/products/${id}`).then((r) => r.data),

  create: (product: Partial<Product>) =>
    apiFetch<{ data: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(toWriteBody(product)),
    }).then((r) => r.data),

  update: (id: string, product: Partial<Product>) =>
    apiFetch<{ data: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toWriteBody(product)),
    }).then((r) => r.data),

  remove: (id: string) =>
    apiFetch<{ data: null }>(`/products/${id}`, { method: 'DELETE' }),
};
