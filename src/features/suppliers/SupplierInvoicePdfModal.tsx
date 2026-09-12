import React, { useState, useRef, useMemo } from 'react';
import type { Product, Supplier, Category } from '@/types';
import {
  parsePdfSupplierInvoice,
  parseTextSupplierInvoice,
  type MatchedInvoiceItem,
  type ParsedSupplierInvoice,
} from '@/services/pdf/supplierInvoicePdfParser';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { syncProductCreate, syncProductUpdate } from '@/lib/products-sync';
import { useNotificationStore } from '@/store/notificationStore';
import { useQueryClient } from '@tanstack/react-query';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  Trash2,
  Plus,
  SlidersHorizontal,
  DollarSign,
  AlertCircle,
  Truck,
  Layers,
  ArrowRight,
  ClipboardPaste,
} from 'lucide-react';

interface SupplierInvoicePdfModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  categories?: Category[];
  preselectedSupplierId?: string;
  onSuccess?: () => void;
}

export default function SupplierInvoicePdfModal({
  open,
  onClose,
  products,
  suppliers,
  categories = [],
  preselectedSupplierId,
  onSuccess,
}: SupplierInvoicePdfModalProps) {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  // Mode: 'upload' | 'review' | 'paste'
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed invoice state
  const [invoiceMetadata, setInvoiceMetadata] = useState<ParsedSupplierInvoice | null>(null);
  const [items, setItems] = useState<MatchedInvoiceItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(preselectedSupplierId || '');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [defaultMargin, setDefaultMargin] = useState<number>(25);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  // الحسابات المالية
  const invoiceTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
  }, [items]);

  const newProductsCount = useMemo(() => {
    return items.filter((it) => it.isNewProduct).length;
  }, [items]);

  const existingProductsCount = useMemo(() => {
    return items.filter((it) => !it.isNewProduct).length;
  }, [items]);

  // معالجة ملف الـ PDF
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('يرجى اختيار ملف بصيغة PDF صالحة');
      return;
    }

    setErrorMsg(null);
    setIsParsing(true);

    try {
      const result = await parsePdfSupplierInvoice(
        file,
        products,
        suppliers,
        defaultMargin
      );

      if (!result.invoice.items || result.invoice.items.length === 0) {
        setErrorMsg('لم يتم العثور على جداول أو أسطر سلع واضحة في ملف الـ PDF. يمكنك استخدام تبويب لصق النص.');
        setIsParsing(false);
        return;
      }

      setInvoiceMetadata(result.invoice);
      setItems(result.matchedItems);
      setInvoiceNumber(result.invoice.invoiceNumber || '');
      setInvoiceDate(result.invoice.invoiceDate || new Date().toISOString().slice(0, 10));

      if (preselectedSupplierId) {
        setSelectedSupplierId(preselectedSupplierId);
      } else if (result.matchedSupplierId) {
        setSelectedSupplierId(result.matchedSupplierId);
      } else if (result.invoice.supplierName) {
        setNewSupplierName(result.invoice.supplierName);
      }
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      setErrorMsg(err?.message || 'فشل في قراءة ملف الـ PDF. تأكد من أن الملف غير محمي بكلمة مرور.');
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  // معالجة النص الملصوق يدوياً
  const handlePasteParse = () => {
    if (!pasteText.trim()) {
      setErrorMsg('يرجى لصق نص الفاتورة أولاً');
      return;
    }

    setErrorMsg(null);
    setIsParsing(true);

    try {
      const result = parseTextSupplierInvoice(
        pasteText,
        products,
        suppliers,
        defaultMargin
      );

      if (!result.invoice.items || result.invoice.items.length === 0) {
        setErrorMsg('لم يتم التعرف على بنود في النص الملصوق. تأكد من أن الأسطر تحتوي على اسم الصنف والكمية والسعر.');
        setIsParsing(false);
        return;
      }

      setInvoiceMetadata(result.invoice);
      setItems(result.matchedItems);
      setInvoiceNumber(result.invoice.invoiceNumber || '');
      setInvoiceDate(result.invoice.invoiceDate || new Date().toISOString().slice(0, 10));

      if (preselectedSupplierId) {
        setSelectedSupplierId(preselectedSupplierId);
      } else if (result.matchedSupplierId) {
        setSelectedSupplierId(result.matchedSupplierId);
      }
    } catch (err: any) {
      console.error('Text parsing error:', err);
      setErrorMsg(err?.message || 'فشل في تحليل النص');
    } finally {
      setIsParsing(false);
    }
  };

  // تعديل سطر في جدول المراجعة
  const updateItem = (id: string, field: keyof MatchedInvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;

        const updated = { ...it, [field]: value };

        // إعادة حساب الإجمالي عند تعديل الكمية أو سعر الشراء
        if (field === 'qty' || field === 'unitPrice') {
          const q = field === 'qty' ? Number(value) : it.qty;
          const p = field === 'unitPrice' ? Number(value) : it.unitPrice;
          updated.lineTotal = Number((q * p).toFixed(2));

          // إذا كان منتجاً جديداً ولم يُعدل سعر البيع يدوياً، نحدث سعر البيع المقترح
          if (it.isNewProduct && field === 'unitPrice') {
            updated.retailPrice = Math.round(p * (1 + defaultMargin / 100));
          }
        }

        return updated;
      })
    );
  };

  // ربط سطر بمنتج موجود من المخزون
  const linkItemToProduct = (itemId: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;

        if (prod) {
          return {
            ...it,
            matchedProductId: prod.id,
            matchedProduct: prod,
            matchType: 'exact_name',
            isNewProduct: false,
            barcode: prod.barcode || it.barcode,
            currentStockQuantity: Number(prod.quantity) || 0,
            newStockQuantity: (Number(prod.quantity) || 0) + it.qty,
            retailPrice: Number(prod.retailPrice) || it.retailPrice,
            category: typeof prod.category === 'object' && prod.category !== null ? (prod.category as any).name : String(prod.category || 'عام'),
            unit: prod.unit || 'قطعة',
          };
        } else {
          // فك الربط وتحويله لمنتج جديد
          return {
            ...it,
            matchedProductId: undefined,
            matchedProduct: undefined,
            matchType: 'new',
            isNewProduct: true,
            currentStockQuantity: 0,
            newStockQuantity: it.qty,
            retailPrice: Math.round(it.unitPrice * (1 + defaultMargin / 100)),
          };
        }
      })
    );
  };

  // إضافة سطر جديد يدوياً
  const addNewItemRow = () => {
    const newItem: MatchedInvoiceItem = {
      id: generateId(),
      name: '',
      barcode: '',
      qty: 1,
      unitPrice: 0,
      lineTotal: 0,
      retailPrice: 0,
      isNewProduct: true,
      matchType: 'new',
      confidence: 0,
      currentStockQuantity: 0,
      newStockQuantity: 1,
      category: 'عام',
      unit: 'قطعة',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // حذف سطر
  const removeItemRow = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // إعادة تطبيق هامش الربح الافتراضي على جميع المنتجات الجديدة
  const applyDefaultMarginToNew = (newMargin: number) => {
    setDefaultMargin(newMargin);
    setItems((prev) =>
      prev.map((it) => {
        if (!it.isNewProduct) return it;
        return {
          ...it,
          retailPrice: Math.round(it.unitPrice * (1 + newMargin / 100)),
        };
      })
    );
  };

  // الاعتماد النهائي وإدخال البضاعة للمخزن
  const handleConfirmInvoice = async () => {
    if (items.length === 0) {
      setErrorMsg('لا توجد بنود في الفاتورة للاعتماد');
      return;
    }

    // التحقق من تعبئة أسماء المنتجات
    const invalidItem = items.find((it) => !it.name.trim());
    if (invalidItem) {
      setErrorMsg('يرجى تحديد اسم لجميع بنود الفاتورة قبل التأكيد');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();
      let targetSupplierId = selectedSupplierId;

      // 1. إنشاء مورد جديد إذا كُتب اسمه ولم يُختر مورد
      if (!targetSupplierId && newSupplierName.trim()) {
        const newSuppId = generateId();
        await db.suppliers.add({
          id: newSuppId,
          name: newSupplierName.trim(),
          phone: '',
          balance: 0,
          createdAt: now,
          updatedAt: now,
        });
        targetSupplierId = newSuppId;
      }

      const purchaseId = generateId();
      const finalInvoiceNumber =
        invoiceNumber.trim() || `INV-${now.slice(0, 10)}-${Math.floor(Math.random() * 900 + 100)}`;

      // 2. معالجة البنود وتحديث/إضافة المنتجات
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of items) {
        let productId = item.matchedProductId;

        if (item.isNewProduct || !productId) {
          // إضافة منتج جديد تماماً في المخزون
          productId = generateId();
          const newProduct: Product = {
            id: productId,
            name: item.name.trim(),
            barcode: item.barcode?.trim() || String(Math.floor(Math.random() * 900000000000 + 100000000000)),
            sku: item.code || '',
            category: item.category || 'عام',
            unit: item.unit || 'قطعة',
            costPrice: Number(item.unitPrice) || 0,
            wholesalePrice: Number(item.unitPrice) || 0,
            retailPrice: Number(item.retailPrice) || 0,
            quantity: Number(item.qty) || 0,
            lowStockThreshold: 5,
            wholesaleMinQty: 1,
            status: 'active',
            createdAt: now,
            updatedAt: now,
          };

          await db.products.add(newProduct as any);
          await syncProductCreate(newProduct);
          createdCount++;
        } else {
          // تحديث رصيد وسعر تكلفة المنتج الموجود
          const existing = await db.products.get(productId);
          if (existing) {
            const changes = {
              quantity: (Number(existing.quantity) || 0) + Number(item.qty),
              costPrice: Number(item.unitPrice) || existing.costPrice,
              retailPrice: Number(item.retailPrice) > 0 ? Number(item.retailPrice) : existing.retailPrice,
              updatedAt: now,
            };
            await db.products.update(productId, changes);
            await syncProductUpdate(productId, changes);
            updatedCount++;
          }
        }

        // تسجيل بند الفاتورة
        await db.purchase_items.add({
          id: generateId(),
          purchaseId,
          productId,
          name: item.name.trim(),
          qty: Number(item.qty) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          lineTotal: Number(item.lineTotal) || 0,
        });

        // تسجيل حركة المخزون
        await db.stock_movements.add({
          id: generateId(),
          productId,
          type: 'purchase',
          qty: Number(item.qty) || 0,
          createdBy: 'system',
          createdAt: now,
        });
      }

      // 3. تسجيل فاتورة الشراء والتوريد الرسمية
      const remainingBalance = Math.max(0, invoiceTotal - paidAmount);

      await db.purchases.add({
        id: purchaseId,
        number: finalInvoiceNumber,
        date: invoiceDate || now,
        supplierId: targetSupplierId || 'unassigned',
        subtotal: invoiceTotal,
        tvaAmount: 0,
        total: invoiceTotal,
        status: 'confirmed',
        paidAmount: Number(paidAmount) || 0,
        remainingBalance,
        createdAt: now,
        updatedAt: now,
      } as any);

      // 4. تحديث مستحقات المورد وسجل القيود
      if (targetSupplierId && targetSupplierId !== 'unassigned') {
        const supp = await db.suppliers.get(targetSupplierId);
        if (supp) {
          await db.suppliers.update(targetSupplierId, {
            balance: (Number(supp.balance) || 0) + remainingBalance,
            updatedAt: now,
          });

          await db.supplier_entries.add({
            id: generateId(),
            supplierId: targetSupplierId,
            date: invoiceDate || now,
            type: 'purchase',
            amount: invoiceTotal,
            items: items.map((it) => ({
              productId: it.matchedProductId || '',
              name: it.name,
              qty: it.qty,
              unitPrice: it.unitPrice,
              lineTotal: it.lineTotal,
            })),
            invoiceNumber: finalInvoiceNumber,
            paidAmount: Number(paidAmount) || 0,
            remainingBalance,
          });
        }
      }

      // 5. تحديث كافة الاستعلامات
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['purchases'] });
      await queryClient.invalidateQueries({ queryKey: ['purchaseItems'] });
      await queryClient.invalidateQueries({ queryKey: ['supplierEntries'] });

      addNotification({
        title: 'تم إدخال فاتورة التوريد بنجاح',
        message: `تم تحديث مخزون ${updatedCount} منتج، وإضافة ${createdCount} منتج جديد إلى النظام بنجاح!`,
        type: 'success',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to confirm purchase invoice:', err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء اعتماد الفاتورة وتحديث المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-surface border border-outline-variant/30 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-cairo text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                استيراد فاتورة مورد وإدخال البضاعة للمخزن (PDF)
              </h2>
              <p className="text-xs text-on-surface-variant">
                قراءة الفاتورة آلياً، مطابقة السلع وتحديث كميات وأسعار المخزون
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* المرحلة 1: رفع الملف أو اللصق (إذا لم يتم استخراج بنود بعد) */}
          {items.length === 0 ? (
            <div className="space-y-4">
              {/* تبويبات الاختيار */}
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('upload'); setErrorMsg(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع ملف فاتورة PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('paste'); setErrorMsg(null); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>لصق نص الفاتورة يدوياً</span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-10 rounded-3xl border-2 border-dashed border-outline-variant/40 hover:border-primary/60 bg-surface-container/30 hover:bg-surface-container/60 transition-all text-center cursor-pointer group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 flex items-center justify-center mx-auto mb-4 transition-transform shadow-inner">
                    {isParsing ? (
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    ) : (
                      <FileText className="w-8 h-8" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-on-surface mb-1">
                    {isParsing ? 'جاري قراءة واستخراج بنود الفاتورة...' : 'انقر لاختيار ملف فاتورة المورد (PDF)'}
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    يدعم فواتير الشراء والتوريد (Factures / Bons de livraison). يقوم النظام بقراءة أسطر السلع والكميات والأسعار وتنسيقها تلقائياً.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-on-surface-variant">
                    انسخ نص الفاتورة أو جدول السلع والصقه هنا، وسيقوم النظام بتفكيك الأسطر واستخراج المنتجات:
                  </p>
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="مثال:&#10;EAU MINERALE 1.5L 24 35.00 840.00&#10;HUILE DE TABLE 5L 10 650.00 6500.00"
                    className="w-full p-4 rounded-2xl bg-surface-container border border-outline-variant/30 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={handlePasteParse}
                    disabled={isParsing || !pasteText.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isParsing ? 'جاري التحليل...' : 'تحليل واستخراج بنود الفاتورة'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* المرحلة 2: مراجعة وتعديل بنود الفاتورة */
            <div className="space-y-5">
              {/* ترويسة بيانات الفاتورة والمورد */}
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/25 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* اختيار المورد */}
                <div>
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    <span>المورد:</span>
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-surface border border-outline-variant/30 text-xs font-bold text-on-surface"
                  >
                    <option value="">-- اختر مورد من القائمة --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {!selectedSupplierId && (
                    <input
                      type="text"
                      placeholder="أو اكتب اسم المورد لإنشائه..."
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="w-full mt-2 py-1.5 px-3 rounded-xl bg-surface border border-outline-variant/30 text-xs text-on-surface"
                    />
                  )}
                </div>

                {/* رقم الفاتورة */}
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">رقم الفاتورة / الوصل:</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="رقم الفاتورة..."
                    className="w-full py-2 px-3 rounded-xl bg-surface border border-outline-variant/30 text-xs font-mono font-bold text-on-surface"
                  />
                </div>

                {/* تاريخ الفاتورة */}
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1.5">تاريخ الفاتورة:</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-surface border border-outline-variant/30 text-xs font-mono font-bold text-on-surface"
                  />
                </div>

                {/* هامش الربح المقترح للمنتجات الجديدة */}
                <div>
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                    <span>هامش البيع المقترح:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={defaultMargin}
                      onChange={(e) => applyDefaultMarginToNew(Number(e.target.value) || 0)}
                      className="w-20 py-2 px-2 text-center rounded-xl bg-surface border border-outline-variant/30 text-xs font-bold font-mono"
                    />
                    <span className="text-xs text-on-surface-variant">% للسلع الجديدة</span>
                  </div>
                </div>
              </div>

              {/* شريط الإحصائيات السريعة */}
              <div className="flex items-center justify-between text-xs font-medium px-2 text-on-surface-variant flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>منتجات موجودة بالمخزون: <strong>{existingProductsCount}</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span>منتجات جديدة ستضاف: <strong>{newProductsCount}</strong></span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addNewItemRow}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant/30 hover:bg-surface-container-highest text-xs text-on-surface transition-all cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>إضافة صنف يدوياً</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setItems([]); setInvoiceMetadata(null); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    <span>إعادة رفع ملف آخر</span>
                  </button>
                </div>
              </div>

              {/* جدول السلع التفاعلي */}
              <div className="border border-outline-variant/20 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto custom-scrollbar max-h-80">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead className="bg-surface-container-high/60 sticky top-0 border-b border-outline-variant/20 text-on-surface-variant font-bold z-10">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">#</th>
                        <th className="py-3 px-3">اسم المنتج / السلعة</th>
                        <th className="py-3 px-3 w-32">الباركود</th>
                        <th className="py-3 px-3 w-40">المطابقة في المتجر</th>
                        <th className="py-3 px-2 w-20 text-center">الكمية</th>
                        <th className="py-3 px-2 w-24 text-center">سعر الشراء (دج)</th>
                        <th className="py-3 px-2 w-24 text-center">سعر البيع (دج)</th>
                        <th className="py-3 px-3 w-28 text-left">الإجمالي (دج)</th>
                        <th className="py-3 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {items.map((it, idx) => (
                        <tr
                          key={it.id}
                          className={`hover:bg-surface-container/40 transition-colors ${
                            it.isNewProduct ? 'bg-primary/5' : ''
                          }`}
                        >
                          {/* الرقم التسلسلي */}
                          <td className="py-2.5 px-3 text-center text-[11px] text-on-surface-variant font-mono">
                            {idx + 1}
                          </td>

                          {/* اسم المنتج */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.name}
                              onChange={(e) => updateItem(it.id, 'name', e.target.value)}
                              className="w-full py-1.5 px-2.5 rounded-lg bg-surface border border-outline-variant/25 text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary"
                            />
                          </td>

                          {/* الباركود */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={it.barcode || ''}
                              onChange={(e) => updateItem(it.id, 'barcode', e.target.value)}
                              placeholder="باركود..."
                              className="w-full py-1.5 px-2 rounded-lg bg-surface border border-outline-variant/25 text-xs font-mono text-on-surface"
                            />
                          </td>

                          {/* المطابقة في المخزون */}
                          <td className="py-2 px-3">
                            <div className="space-y-1">
                              <select
                                value={it.matchedProductId || ''}
                                onChange={(e) => linkItemToProduct(it.id, e.target.value)}
                                className="w-full py-1.5 px-2 rounded-lg bg-surface border border-outline-variant/30 text-[11px] font-medium text-on-surface truncate"
                              >
                                <option value="">🆕 إنشاء كمنتج جديد</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    🟢 {p.name} (رصيد: {p.quantity})
                                  </option>
                                ))}
                              </select>

                              {!it.isNewProduct ? (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                                  المخزون: {it.currentStockQuantity} + {it.qty} = <strong>{it.newStockQuantity}</strong>
                                </span>
                              ) : (
                                <span className="text-[10px] text-primary block font-medium">
                                  سيتم إضافته كمنتج جديد
                                </span>
                              )}
                            </div>
                          </td>

                          {/* الكمية */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={it.qty}
                              onChange={(e) => updateItem(it.id, 'qty', Number(e.target.value) || 0)}
                              className="w-16 py-1.5 px-1 text-center font-mono font-bold rounded-lg bg-surface border border-outline-variant/25 text-xs"
                            />
                          </td>

                          {/* سعر الشراء (التكلفة) */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={it.unitPrice}
                              onChange={(e) => updateItem(it.id, 'unitPrice', Number(e.target.value) || 0)}
                              className="w-20 py-1.5 px-1 text-center font-mono font-bold rounded-lg bg-surface border border-outline-variant/25 text-xs text-primary"
                            />
                          </td>

                          {/* سعر البيع */}
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={it.retailPrice}
                              onChange={(e) => updateItem(it.id, 'retailPrice', Number(e.target.value) || 0)}
                              className="w-20 py-1.5 px-1 text-center font-mono font-bold rounded-lg bg-surface border border-outline-variant/25 text-xs text-emerald-600 dark:text-emerald-400"
                            />
                          </td>

                          {/* الإجمالي */}
                          <td className="py-2 px-3 text-left font-mono font-bold text-xs text-on-surface">
                            {it.lineTotal.toLocaleString('ar-DZ')} دج
                          </td>

                          {/* حذف السطر */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(it.id)}
                              className="p-1 rounded-lg text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="حذف هذا السطر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* أسفل الفاتورة: الدفع والمحاسبة */}
              <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-on-surface-variant">إجمالي الفاتورة:</span>
                  <span className="text-xl font-black font-mono text-primary">
                    {invoiceTotal.toLocaleString('ar-DZ')}{' '}
                    <span className="text-xs font-cairo font-bold">دج</span>
                  </span>
                  <span className="text-xs text-on-surface-variant mr-3">
                    ({items.length} بند / {items.reduce((s, it) => s + it.qty, 0)} قطعة)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">
                    المبلغ المدفوع فوراً:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={invoiceTotal}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-32 py-2 px-3 rounded-xl bg-surface border border-outline-variant/30 text-xs font-mono font-bold text-left"
                  />
                  <div className="text-xs font-bold text-on-surface-variant whitespace-nowrap">
                    المتبقي ديناً:{' '}
                    <span
                      className={`font-mono ${
                        invoiceTotal - paidAmount > 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {Math.max(0, invoiceTotal - paidAmount).toLocaleString('ar-DZ')} دج
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-surface-container-high/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-outline-variant/30 rounded-xl text-on-surface-variant hover:bg-surface-container text-xs font-semibold transition-all cursor-pointer"
          >
            إلغاء
          </button>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmInvoice}
              disabled={isSubmitting || items.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-md hover:shadow-primary/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري تحديث المخزون وإدخال البضاعة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الفاتورة وإدخال البضاعة للمخزن</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
