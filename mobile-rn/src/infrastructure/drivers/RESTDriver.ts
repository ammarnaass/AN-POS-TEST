// ============================================================
// سائق REST API — يربط بالخادم الكهربائي على شبكة LAN
// REST API driver — connects to desktop Electron server over HTTP
// ============================================================

import type { DataDriver, ListOptions, ListResult, DriverConfig } from './DataDriver';
import { DriverError } from './DataDriver';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { normalizeServerUrl } from '@/lib/apiClient';

function normalizeEntity<T = any>(table: string, raw: any): T {
  if (!raw || typeof raw !== 'object') return raw;

  if (table === 'products' || table === 'product') {
    const id = raw.id || raw._id || raw.productId || raw.product_id || '';
    const name = raw.name || raw.productName || raw.product_name || 'منتج';
    const retailPrice = Number(raw.retailPrice ?? raw.retail_price ?? raw.price ?? raw.selling_price ?? raw.sale_price ?? raw.sale_price1 ?? 0);
    const costPrice = Number(raw.costPrice ?? raw.cost_price ?? raw.purchasePrice ?? raw.purchase_price ?? raw.average_price ?? 0);
    const wholesalePrice = Number(raw.wholesalePrice ?? raw.wholesale_price ?? raw.sale_price2 ?? 0);
    const wholesaleMinQty = Number(raw.wholesaleMinQty ?? raw.wholesale_min_qty ?? 0);
    const quantity = Number(raw.quantity ?? raw.qty ?? raw.stock ?? 0);
    const lowStockThreshold = Number(raw.lowStockThreshold ?? raw.low_stock_threshold ?? raw.min_quantity ?? raw.minQuantity ?? 5);
    const barcode = raw.barcode ? String(raw.barcode) : '';
    const sku = raw.sku ? String(raw.sku) : '';
    const category = raw.category || raw.category_name || raw.categoryName || '';
    const categoryId = raw.categoryId || raw.category_id || '';
    const warehouseId = raw.warehouseId || raw.warehouse_id || '';
    const unit = raw.unit || 'قطعة';
    const taxRate = Number(raw.taxRate ?? raw.tax_rate ?? raw.tax ?? 0);
    const image = raw.image || raw.imageUrl || raw.image_url || '';
    const status = raw.status || 'active';
    const quickSale = raw.quickSale !== undefined ? Boolean(raw.quickSale) : raw.quick_sale !== undefined ? Boolean(raw.quick_sale) : true;

    return {
      ...raw,
      id,
      name,
      productName: name,
      product_name: name,
      retailPrice,
      retail_price: retailPrice,
      price: retailPrice,
      costPrice,
      cost_price: costPrice,
      purchasePrice: costPrice,
      purchase_price: costPrice,
      wholesalePrice,
      wholesale_price: wholesalePrice,
      wholesaleMinQty,
      wholesale_min_qty: wholesaleMinQty,
      quantity,
      qty: quantity,
      stock: quantity,
      lowStockThreshold,
      low_stock_threshold: lowStockThreshold,
      minQuantity: lowStockThreshold,
      min_quantity: lowStockThreshold,
      barcode,
      sku,
      category,
      categoryId,
      category_id: categoryId,
      warehouseId,
      warehouse_id: warehouseId,
      unit,
      taxRate,
      tax_rate: taxRate,
      image,
      image_url: image,
      imageUrl: image,
      status,
      quickSale,
      quick_sale: quickSale ? 1 : 0,
    } as unknown as T;
  }

  if (table === 'customers' || table === 'customer') {
    const id = raw.id || raw._id || '';
    const name = raw.name || raw.customerName || raw.customer_name || '';
    const phone = raw.phone || '';
    const balance = Number(raw.balance || 0);
    const creditLimit = Number(raw.creditLimit ?? raw.credit_limit ?? 0);
    return {
      ...raw,
      id,
      name,
      phone,
      balance,
      creditLimit,
      credit_limit: creditLimit,
    } as unknown as T;
  }

  if (table === 'suppliers' || table === 'supplier') {
    const id = raw.id || raw._id || '';
    const name = raw.name || raw.supplierName || raw.supplier_name || '';
    const phone = raw.phone || '';
    const balance = Number(raw.balance || 0);
    return {
      ...raw,
      id,
      name,
      phone,
      balance,
    } as unknown as T;
  }

  return raw;
}

function sanitizePayload(table: string, data: any, isPartial = false): any {
  if (!data || typeof data !== 'object') return data;

  if (table === 'products' || table === 'product') {
    if (isPartial) {
      const sanitized: Record<string, any> = {};
      if (data.id !== undefined) sanitized.id = data.id;
      if (data.name !== undefined || data.productName !== undefined) sanitized.name = data.name || data.productName;
      if (data.barcode !== undefined) sanitized.barcode = String(data.barcode);
      if (data.sku !== undefined) sanitized.sku = String(data.sku);
      if (data.category !== undefined) sanitized.category = data.category;
      if (data.category_id !== undefined || data.categoryId !== undefined) sanitized.category_id = data.category_id ?? data.categoryId;
      if (data.unit !== undefined) sanitized.unit = data.unit;
      if (data.retailPrice !== undefined || data.retail_price !== undefined || data.price !== undefined) {
        sanitized.retail_price = Number(data.retailPrice ?? data.retail_price ?? data.price);
      }
      if (data.costPrice !== undefined || data.cost_price !== undefined || data.purchasePrice !== undefined || data.purchase_price !== undefined) {
        sanitized.cost_price = Number(data.costPrice ?? data.cost_price ?? data.purchasePrice ?? data.purchase_price);
      }
      if (data.wholesalePrice !== undefined || data.wholesale_price !== undefined) {
        sanitized.wholesale_price = Number(data.wholesalePrice ?? data.wholesale_price);
      }
      if (data.wholesaleMinQty !== undefined || data.wholesale_min_qty !== undefined) {
        sanitized.wholesale_min_qty = Number(data.wholesaleMinQty ?? data.wholesale_min_qty);
      }
      if (data.quantity !== undefined || data.qty !== undefined || data.stock !== undefined) {
        sanitized.quantity = Number(data.quantity ?? data.qty ?? data.stock);
      }
      if (data.lowStockThreshold !== undefined || data.low_stock_threshold !== undefined) {
        sanitized.low_stock_threshold = Number(data.lowStockThreshold ?? data.low_stock_threshold);
      }
      if (data.description !== undefined) sanitized.description = data.description;
      if (data.supplier !== undefined) sanitized.supplier = data.supplier;
      if (data.warehouseId !== undefined || data.warehouse_id !== undefined) sanitized.warehouse_id = data.warehouseId || data.warehouse_id;
      if (data.location !== undefined) sanitized.location = data.location;
      if (data.image !== undefined || data.imageUrl !== undefined || data.image_url !== undefined) sanitized.image = data.image || data.imageUrl || data.image_url;
      if (data.status !== undefined) sanitized.status = data.status;
      if (data.taxRate !== undefined || data.tax_rate !== undefined || data.tax !== undefined) {
        sanitized.tax = Number(data.taxRate ?? data.tax_rate ?? data.tax);
      }
      if (data.expiryDate !== undefined || data.expiry_date !== undefined) sanitized.expiry_date = data.expiryDate || data.expiry_date;
      if (data.updated_at !== undefined || data.updatedAt !== undefined) sanitized.updated_at = data.updated_at || data.updatedAt || new Date().toISOString();
      return sanitized;
    }

    return {
      id: data.id || `prd_${Date.now()}`,
      name: data.name || data.productName || 'منتج',
      barcode: data.barcode ? String(data.barcode) : '',
      sku: data.sku ? String(data.sku) : '',
      category: data.category || 'عام',
      category_id: data.categoryId || data.category_id || null,
      type: data.type || 'standard',
      unit: data.unit || 'قطعة',
      cost_price: Number(data.costPrice ?? data.cost_price ?? data.purchasePrice ?? data.purchase_price ?? 0),
      retail_price: Number(data.retailPrice ?? data.retail_price ?? data.price ?? 0),
      wholesale_price: Number(data.wholesalePrice ?? data.wholesale_price ?? 0),
      wholesale_min_qty: Number(data.wholesaleMinQty ?? data.wholesale_min_qty ?? 0),
      quantity: Number(data.quantity ?? data.qty ?? data.stock ?? 0),
      low_stock_threshold: Number(data.lowStockThreshold ?? data.low_stock_threshold ?? 5),
      description: data.description || '',
      supplier: data.supplier || '',
      warehouse_id: data.warehouseId || data.warehouse_id || 'main',
      location: data.location || '',
      image: data.image || data.imageUrl || data.image_url || '',
      status: data.status || 'active',
      tax: Number(data.taxRate ?? data.tax_rate ?? data.tax ?? 0),
      expiry_date: data.expiryDate || data.expiry_date || '',
      created_at: data.created_at || data.createdAt || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString(),
    };
  }

  if (table === 'sales' || table === 'sale') {
    return {
      id: data.id,
      number: data.number,
      date: data.date || new Date().toISOString(),
      doc_type: data.doc_type || data.docType || 'facture',
      type: data.type || 'sale',
      items: typeof data.items === 'string' ? data.items : JSON.stringify(data.items || []),
      subtotal: Number(data.subtotal || 0),
      discount: Number(data.discount || 0),
      discount_type: data.discount_type || data.discountType || 'amount',
      tva_amount: Number(data.tva_amount ?? data.tvaAmount ?? 0),
      total: Number(data.total || 0),
      payment_method: data.payment_method || data.paymentMethod || 'cash',
      customer_id: data.customer_id || data.customerId || null,
      customer_name: data.customer_name || data.customerName || 'زبون عام',
      amount_paid: Number(data.amount_paid ?? data.amountPaid ?? data.total ?? 0),
      status: data.status || 'paid',
      sold_by: data.sold_by || data.soldBy || 'الكاشير',
      cash_session_id: data.cash_session_id || data.cashSessionId || null,
      note: data.note || '',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };
  }

  if (table === 'sale_items' || table === 'sale_item') {
    return {
      id: data.id,
      sale_id: data.sale_id || data.saleId,
      product_id: data.product_id || data.productId,
      name: data.name,
      qty: Number(data.qty || 1),
      unit_price: Number(data.unit_price ?? data.unitPrice ?? 0),
      line_total: Number(data.line_total ?? data.lineTotal ?? 0),
      created_at: data.created_at || new Date().toISOString(),
    };
  }

  if (table === 'stock_movements' || table === 'stock_movement') {
    return {
      id: data.id,
      date: data.date || new Date().toISOString(),
      type: data.type || 'out',
      product_id: data.product_id || data.productId,
      qty: Number(data.qty || 0),
      reason: data.reason || '',
      reference: data.reference || data.reference_id || '',
      created_by: data.created_by || data.createdBy || '',
      created_at: data.created_at || new Date().toISOString(),
    };
  }

  if (table === 'stock_movements_v2') {
    return {
      id: data.id,
      movement_number: data.movement_number || `MOV-${Date.now()}`,
      date: data.date || new Date().toISOString(),
      type: data.type || 'sale',
      warehouse_id: data.warehouse_id || data.warehouseId || 'main',
      item_id: data.item_id || data.itemId || data.product_id || data.productId,
      quantity: Number(data.quantity || data.qty || 0),
      unit_price: Number(data.unit_price ?? data.unitPrice ?? 0),
      total_amount: Number(data.total_amount ?? data.totalAmount ?? 0),
      reference: data.reference || '',
      is_reviewed: 1,
      reviewed_by: data.reviewed_by || data.reviewedBy || '',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };
  }

  if (table === 'customers' || table === 'customer') {
    if (isPartial) {
      const sanitized: Record<string, any> = {};
      if (data.id !== undefined) sanitized.id = data.id;
      if (data.name !== undefined) sanitized.name = data.name;
      if (data.phone !== undefined) sanitized.phone = data.phone;
      if (data.email !== undefined) sanitized.email = data.email;
      if (data.address !== undefined) sanitized.address = data.address;
      if (data.credit_limit !== undefined || data.creditLimit !== undefined) {
        sanitized.credit_limit = Number(data.credit_limit ?? data.creditLimit);
      }
      if (data.balance !== undefined) sanitized.balance = Number(data.balance);
      if (data.updated_at !== undefined || data.updatedAt !== undefined) {
        sanitized.updated_at = data.updated_at || data.updatedAt || new Date().toISOString();
      }
      return sanitized;
    }
    return {
      id: data.id,
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      credit_limit: Number(data.credit_limit ?? data.creditLimit ?? 0),
      balance: Number(data.balance || 0),
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };
  }

  return data;
}

export class RESTDriver implements DataDriver {
  private baseUrl: string;
  private sessionToken: string | null;
  private deviceId: string | null;
  private initialized = false;

  constructor(config: DriverConfig) {
    this.baseUrl = config.baseUrl || '';
    this.sessionToken = config.sessionToken || null;
    this.deviceId = config.deviceId || null;
  }

  setSession(token: string, deviceId: string): void {
    this.sessionToken = token;
    this.deviceId = deviceId;
    this.initialized = true;
  }

  async initialize(): Promise<void> {
    if (!this.baseUrl) {
      throw new DriverError('No server URL configured', 'NO_SERVER_URL');
    }
    this.initialized = true;
  }

  private async buildHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let token = this.sessionToken;
    let deviceId = this.deviceId;

    if (!token || !deviceId) {
      try {
        const [storedToken, storedDeviceId] = await Promise.all([
          AnposSecureStore.get('anpos_session_token'),
          AnposSecureStore.get('anpos_device_id'),
        ]);
        if (storedToken) {
          token = storedToken;
          this.sessionToken = storedToken;
        }
        if (storedDeviceId) {
          deviceId = storedDeviceId;
          this.deviceId = storedDeviceId;
        }
      } catch {}
    }

    if (token) headers['x-session-token'] = token;
    if (deviceId) headers['x-device-id'] = deviceId;
    return headers;
  }

  private async apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      if (!this.baseUrl) {
        const storedUrl = await AnposSecureStore.get('anpos_server_url');
        if (storedUrl) this.baseUrl = normalizeServerUrl(storedUrl);
      } else if (!this.baseUrl.startsWith('http://') && !this.baseUrl.startsWith('https://')) {
        this.baseUrl = normalizeServerUrl(this.baseUrl);
      }

      const cleanBase = (this.baseUrl || '').replace(/\/+$/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const authHeaders = await this.buildHeaders();
      const res = await fetch(`${cleanBase}${cleanPath}`, {
        ...options,
        headers: { ...authHeaders, ...(options.headers as Record<string, string> || {}) },
        credentials: 'omit',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        if (res.status === 401) {
          this.sessionToken = null;
          this.deviceId = null;
        }
        let errMsg = `HTTP Error ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err?.error?.detail || err?.message || err?.error || errMsg;
        } catch {
          // keep default
        }
        throw new DriverError(errMsg, `HTTP_${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (err instanceof DriverError) throw err;
      throw new DriverError(err?.message || 'Network request failed', 'NETWORK_ERROR');
    }
  }

  async list<T = unknown>(table: string, opts: ListOptions = {}): Promise<ListResult<T>> {
    const q = new URLSearchParams();
    if (opts.search) q.set('search', opts.search);
    if (opts.from) q.set('from', opts.from);
    if (opts.to) q.set('to', opts.to);
    if (opts.limit) q.set('limit', String(opts.limit));
    if (opts.offset) q.set('offset', String(opts.offset));

    const qs = q.toString();
    let result: any = null;

    try {
      result = await this.apiCall(`/api/${table}${qs ? `?${qs}` : ''}`);
    } catch (err: any) {
      // Fallback for singular endpoints (e.g. /api/category or /api/product)
      if (err?.message?.includes('404') && table.endsWith('s')) {
        try {
          const singular = table.slice(0, -1);
          result = await this.apiCall(`/api/${singular}${qs ? `?${qs}` : ''}`);
        } catch {
          result = [];
        }
      } else {
        result = [];
      }
    }

    let list: T[] = [];
    let total = 0;

    if (Array.isArray(result)) {
      list = result;
      total = result.length;
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.data)) {
        list = result.data;
        total = result.total ?? result.data.length;
      } else if (Array.isArray(result[table])) {
        list = result[table];
        total = result.total ?? list.length;
      } else if (Array.isArray(result.items)) {
        list = result.items;
        total = result.total ?? list.length;
      } else if (Array.isArray(result.rows)) {
        list = result.rows;
        total = result.total ?? list.length;
      } else if (Array.isArray(result.products)) {
        list = result.products;
        total = result.total ?? list.length;
      } else if (Array.isArray(result.categories)) {
        list = result.categories;
        total = result.total ?? list.length;
      } else if (Array.isArray(result.customers)) {
        list = result.customers;
        total = result.total ?? list.length;
      } else if (Array.isArray(result.sales)) {
        list = result.sales;
        total = result.total ?? list.length;
      } else if (table === 'settings') {
        const rawSettings = (result as any).settings || (result as any).data || result;
        if (rawSettings && typeof rawSettings === 'object') {
          list = [rawSettings as T];
          total = 1;
        }
      }
    }

    // Normalize all rows
    list = list.map((item) => normalizeEntity<T>(table, item));

    // Special Category Normalization & Fallback
    if (table === 'categories') {
      if (list.length === 0) {
        // Fallback: extract distinct category names from products
        try {
          const prodRes: any = await this.apiCall('/api/products?limit=500').catch(() => []);
          const rawProds = Array.isArray(prodRes) ? prodRes : prodRes?.data || prodRes?.products || [];
          const distinctNames = Array.from(
            new Set((rawProds as any[]).map((p) => p.category).filter(Boolean))
          );
          list = distinctNames.map((name, idx) => ({
            id: `cat_${idx}_${name}`,
            name,
            color: '#3b82f6',
            icon: 'Tag',
          })) as any[];
          total = list.length;
        } catch {}
      } else {
        list = list.map((item: any, idx: number) => {
          if (typeof item === 'string') {
            return { id: `cat_${idx}_${item}`, name: item, color: '#3b82f6', icon: 'Tag' } as any;
          }
          return {
            ...item,
            id: item.id || item._id || item.categoryId || `cat_${idx}`,
            name: item.name || item.categoryName || item.category || 'فئة',
            color: item.color || '#3b82f6',
            icon: item.icon || 'Tag',
          };
        });
      }
    }

    return { data: list, total: total || list.length };
  }

  async get<T = unknown>(table: string, id: string): Promise<T | null> {
    try {
      const result: any = await this.apiCall(`/api/${table}/${id}`);
      if (result && typeof result === 'object' && 'data' in result) {
        return normalizeEntity<T>(table, result.data ?? null);
      }
      return normalizeEntity<T>(table, result ?? null);
    } catch {
      return null;
    }
  }

  async create<T = unknown, R = T>(table: string, data: T): Promise<R> {
    const payload = sanitizePayload(table, data);
    const singular = table.endsWith('s') ? table.slice(0, -1) : table;
    const endpoints = [
      `/api/${table}`,
      `/api/${singular}`,
      `/api/inventory/${table}`,
      `/api/inventory/${singular}`,
      `/api/${table}/create`,
      `/api/${singular}/create`,
    ];

    const bodyVariants = [
      payload,
      { [singular]: payload },
      { [table]: payload },
      { data: payload },
    ];

    let lastError: any = null;
    for (const ep of endpoints) {
      for (const bodyData of bodyVariants) {
        try {
          const result: any = await this.apiCall(ep, {
            method: 'POST',
            body: JSON.stringify(bodyData),
          });

          if (result && typeof result === 'object') {
            if ('data' in result && result.data) {
              return normalizeEntity<R>(table, result.data as R);
            }
            if ('product' in result && result.product) {
              return normalizeEntity<R>(table, result.product as R);
            }
            if ('item' in result && result.item) {
              return normalizeEntity<R>(table, result.item as R);
            }
          }
          return normalizeEntity<R>(table, (result || payload) as R);
        } catch (err: any) {
          lastError = err;
          // If 404 (endpoint not found), skip remaining body variants for this endpoint
          if (err?.message?.includes('404') || err?.code === 'HTTP_404') {
            break;
          }
        }
      }
    }
    throw lastError || new DriverError(`Failed to create in ${table}`, 'CREATE_FAILED');
  }

  async update<T = unknown>(table: string, id: string, data: T): Promise<boolean> {
    const payload = sanitizePayload(table, data, true);
    const singular = table.endsWith('s') ? table.slice(0, -1) : table;
    const endpoints = [
      `/api/${table}/${id}`,
      `/api/${singular}/${id}`,
      `/api/inventory/${table}/${id}`,
      `/api/inventory/${singular}/${id}`,
      `/api/${table}/update/${id}`,
      `/api/${table}/${id}/update`,
    ];

    const bodyVariants = [
      payload,
      { [singular]: payload },
      { [table]: payload },
      { data: payload },
    ];

    for (const ep of endpoints) {
      for (const bodyData of bodyVariants) {
        for (const method of ['PUT', 'PATCH', 'POST'] as const) {
          try {
            await this.apiCall(ep, {
              method,
              body: JSON.stringify(bodyData),
            });
            return true;
          } catch {
            // try next method / variant
          }
        }
      }
    }
    return false;
  }

  async remove(table: string, id: string): Promise<boolean> {
    const singular = table.endsWith('s') ? table.slice(0, -1) : table;
    const endpoints = [
      `/api/${table}/${id}`,
      `/api/${singular}/${id}`,
      `/api/inventory/${table}/${id}`,
      `/api/inventory/${singular}/${id}`,
      `/api/${table}/delete/${id}`,
      `/api/${table}/${id}/delete`,
    ];

    let lastErr: any = null;
    for (const ep of endpoints) {
      for (const method of ['DELETE', 'POST'] as const) {
        try {
          await this.apiCall(ep, { method });
          return true;
        } catch (err: any) {
          lastErr = err;
          // If not 404, stop trying
          if (!err?.message?.includes('404')) {
            break;
          }
        }
      }
    }
    throw lastErr || new DriverError(`Failed to delete from ${table}`, 'DELETE_FAILED');
  }

  async batchCreate<T = unknown, R = T>(table: string, records: T[]): Promise<R[]> {
    try {
      const result: any = await this.apiCall(`/api/${table}/batch`, {
        method: 'POST',
        body: JSON.stringify({ items: records }),
      });
      if (result && typeof result === 'object' && Array.isArray(result.data)) {
        return result.data as R[];
      }
    } catch {
      // fallback to sequential create
    }

    const results: R[] = [];
    for (const record of records) {
      const r = await this.create<T, R>(table, record);
      results.push(r);
    }
    return results;
  }

  async batchUpdate<T = unknown>(table: string, records: T[]): Promise<number> {
    let count = 0;
    for (const record of records) {
      const id = (record as Record<string, unknown>).id as string;
      const ok = await this.update(table, id, record);
      if (ok) count++;
    }
    return count;
  }

  async beginTransaction(): Promise<void> {
    // REST has no real transaction — batch is sequential
  }

  async commit(): Promise<void> {
    // no-op
  }

  async rollback(): Promise<void> {
    // no-op
  }

  async close(): Promise<void> {
    this.initialized = false;
  }
}
