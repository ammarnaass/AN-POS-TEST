import React, { useMemo } from 'react';
import { ShoppingCart, Search, Package, X } from 'lucide-react';
import type { Supplier, SaleItem, Product } from '@/types';
import { formatSupplierMoney } from '../services/supplierStatus';

interface SupplierInvoiceModalProps {
  isOpen: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  products: Product[];
  invoiceItems: SaleItem[];
  setInvoiceItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  paidAmount: number;
  setPaidAmount: (amount: number) => void;
  productSearchQuery: string;
  setProductSearchQuery: (query: string) => void;
  onConfirm: () => void;
  isPending?: boolean;
  currencySymbol?: string;
}

export const SupplierInvoiceModal: React.FC<SupplierInvoiceModalProps> = ({
  isOpen,
  supplier,
  onClose,
  products,
  invoiceItems,
  setInvoiceItems,
  paidAmount,
  setPaidAmount,
  productSearchQuery,
  setProductSearchQuery,
  onConfirm,
  isPending = false,
  currencySymbol = 'دج',
}) => {
  const invoiceTotal = useMemo(
    () => (Array.isArray(invoiceItems) ? invoiceItems : []).reduce((sum, item) => sum + (Number(item?.lineTotal) || 0), 0),
    [invoiceItems]
  );

  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    const q = productSearchQuery.toLowerCase().trim();
    return (products || []).filter(
      (p) => p.status === 'active' && (p.name.toLowerCase().includes(q) || p.barcode.includes(q))
    );
  }, [products, productSearchQuery]);

  if (!isOpen || !supplier) return null;

  const addProductToInvoice = (product: Product) => {
    const existing = invoiceItems.find((item) => item.productId === product.id);
    if (existing) {
      setInvoiceItems(
        invoiceItems.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1, lineTotal: (item.qty + 1) * item.unitPrice }
            : item
        )
      );
    } else {
      setInvoiceItems([
        ...invoiceItems,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPrice: product.costPrice || 0,
          lineTotal: product.costPrice || 0,
        },
      ]);
    }
    setProductSearchQuery('');
  };

  const updateInvoiceItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setInvoiceItems(invoiceItems.filter((item) => item.productId !== productId));
      return;
    }
    setInvoiceItems(
      invoiceItems.map((item) =>
        item.productId === productId
          ? { ...item, qty, lineTotal: qty * item.unitPrice }
          : item
      )
    );
  };

  const updateInvoiceItemPrice = (productId: string, price: number) => {
    setInvoiceItems(
      invoiceItems.map((item) =>
        item.productId === productId
          ? { ...item, unitPrice: price, lineTotal: item.qty * price }
          : item
      )
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl space-y-4 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">تسجيل فاتورة توريد وشراء جديدة</h3>
              <p className="text-xs text-on-surface-variant">
                المورد: <strong className="text-on-surface">{supplier.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Search */}
        <div className="relative shrink-0">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
            placeholder="ابحث عن منتج بالاسم أو الباركود لإضافته للفاتورة..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
          />
          {productSearchQuery && filteredProducts.length > 0 && (
            <div className="absolute top-full mt-1.5 w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto custom-scrollbar">
              {filteredProducts.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProductToInvoice(p)}
                  className="w-full px-4 py-2.5 text-right hover:bg-primary/10 flex items-center justify-between transition-colors border-b border-outline-variant/15 last:border-0 cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-bold text-on-surface">{p.name}</p>
                    <p className="text-[10px] font-mono text-on-surface-variant">الباركود: {p.barcode}</p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-xs font-black text-primary">
                      {formatSupplierMoney(p.costPrice || 0)} {currencySymbol}
                    </span>
                    <span className="text-[10px] text-on-surface-variant block">مخزون: {p.quantity}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-y-auto flex-1 custom-scrollbar border border-outline-variant/20 rounded-2xl">
          {invoiceItems.length === 0 ? (
            <div className="py-14 text-center text-on-surface-variant">
              <Package className="w-10 h-10 opacity-25 mx-auto mb-2 text-primary" />
              <p className="font-bold text-xs text-on-surface">لم يتم اختيار أي منتج بعد</p>
              <p className="text-[11px] mt-0.5">استخدم شريط البحث أعلاه لإضافة المنتجات والكميات</p>
            </div>
          ) : (
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-surface-container sticky top-0 border-b border-outline-variant/25 text-on-surface-variant font-bold">
                <tr>
                  <th className="py-2.5 px-3">المنتج</th>
                  <th className="py-2.5 px-3 text-center w-24">الكمية</th>
                  <th className="py-2.5 px-3 text-center w-28">سعر الشراء</th>
                  <th className="py-2.5 px-3 text-left w-28">الإجمالي</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {invoiceItems.map((item) => (
                  <tr key={item.productId} className="hover:bg-surface-container/50">
                    <td className="py-2 px-3 font-bold text-on-surface">{item.name}</td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateInvoiceItemQty(item.productId, Number(e.target.value) || 0)}
                        className="w-16 px-1.5 py-1 text-center font-mono font-bold rounded-lg bg-surface-container border border-outline-variant/30 text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateInvoiceItemPrice(item.productId, Number(e.target.value) || 0)}
                        className="w-20 px-1.5 py-1 text-center font-mono font-bold rounded-lg bg-surface-container border border-outline-variant/30 text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-left font-mono font-black text-primary">
                      {formatSupplierMoney(item.lineTotal)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => updateInvoiceItemQty(item.productId, 0)}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-on-surface-variant hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals & Payment Section */}
        {invoiceItems.length > 0 && (
          <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface-variant">إجمالي فاتورة التوريد:</span>
              <span className="text-xl font-black font-mono text-primary">
                {formatSupplierMoney(invoiceTotal)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">المبلغ المدفوع فوراً:</label>
              <input
                type="number"
                min="0"
                max={invoiceTotal}
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/30 text-xs font-mono font-bold text-left"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/15">
              <span className="font-bold text-on-surface-variant">المتبقي يضاف لمستحقات المورد:</span>
              <span className={`font-mono font-black ${invoiceTotal - paidAmount > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                {formatSupplierMoney(Math.max(0, invoiceTotal - paidAmount))} {currencySymbol}
              </span>
            </div>

            <button
              onClick={onConfirm}
              disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-40"
            >
              {isPending ? 'جاري التأكيد وتحديث المخزون...' : 'تأكيد الفاتورة وإدخال البضاعة للمخزن'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
