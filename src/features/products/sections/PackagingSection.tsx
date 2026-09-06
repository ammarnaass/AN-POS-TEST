// PackagingSection — قسم "عبوات الجملة" بشاشة المنتج
// يسمح بإضافة/تعديل/حذف عبوات جملة مرتبطة بمنتج واحد
// يظهر فقط في وضع التعديل (form.id موجود)

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { generateEAN13, generateCode128 } from '@/services/barcode';
import { generateId } from '@/utils';
import {
  Plus, Trash2, Edit2, Save, X,
  Package, RefreshCw, Barcode, AlertTriangle,
} from 'lucide-react';

interface Props {
  form: Partial<Product>;
}

interface PackFormState {
  id?: string;
  name: string;
  barcode: string;
  qty: number;
  packPrice: number;
}

const emptyPackForm: PackFormState = {
  name: '',
  barcode: '',
  qty: 1,
  packPrice: 0,
};

/** حساب هامش الربح: (سعر العبوة − كمية × تكلفة الوحدة) / سعر العبوة × 100 */
function computeMargin(packPrice: number, qty: number, costPrice: number): number {
  if (packPrice <= 0 || qty <= 0) return 0;
  const cost = qty * costPrice;
  return ((packPrice - cost) / packPrice) * 100;
}

export default function PackagingSection({ form }: Props) {
  const productId = form.id;
  const costPrice = form.costPrice ?? 0;
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [packForm, setPackForm] = useState<PackFormState>(emptyPackForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // ===== جلب عبوات هذا المنتج =====
  const { data: packs = [], isLoading } = useQuery<PackEntity[]>({
    queryKey: ['packs', productId],
    enabled: Boolean(productId),
    queryFn: async () => {
      if (!productId) return [];
      // items مخزنة JSON — نجلب الكل ونُفلتر بـ productId
      const all = (await db.packs.toArray()) as PackEntity[];
      return all.filter((p) => {
        const items = Array.isArray(p.items)
          ? p.items
          : (() => { try { return JSON.parse(p.items as unknown as string) ?? []; } catch { return []; } })();
        return items.some((it: { productId: string }) => it.productId === productId);
      });
    },
  });

  // ===== فحص تفرد الباركود =====
  const checkBarcodeUnique = useCallback(async (barcode: string, excludePackId?: string): Promise<boolean> => {
    if (!barcode.trim()) return true;
    // فحص في products
    const matchProd = await db.products.where('barcode').equals(barcode).first() as Product | undefined;
    if (matchProd && matchProd.id !== productId) return false;
    // فحص في packs
    const matchPack = await db.packs.where('barcode').equals(barcode).first() as PackEntity | undefined;
    if (matchPack && matchPack.id !== excludePackId) return false;
    return true;
  }, [productId]);

  // ===== Mutation: إنشاء عبوة =====
  const createMutation = useMutation({
    mutationFn: async (data: PackFormState) => {
      const unique = await checkBarcodeUnique(data.barcode);
      if (!unique) throw new Error('هذا الباركود مستخدم مسبقًا في منتج أو عبوة أخرى');
      const now = new Date().toISOString();
      const newPack = {
        id: generateId(),
        name: data.name.trim(),
        barcode: data.barcode.trim(),
        packPrice: data.packPrice,
        items: [{ productId: productId!, qty: data.qty }],
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      };
      await db.packs.add(newPack);
      return newPack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs', productId] });
      queryClient.invalidateQueries({ queryKey: ['packs'] });
      setPackForm(emptyPackForm);
      setShowForm(false);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  // ===== Mutation: تعديل عبوة =====
  const updateMutation = useMutation({
    mutationFn: async (data: PackFormState & { id: string }) => {
      const unique = await checkBarcodeUnique(data.barcode, data.id);
      if (!unique) throw new Error('هذا الباركود مستخدم مسبقًا في منتج أو عبوة أخرى');
      const patch = {
        name: data.name.trim(),
        barcode: data.barcode.trim(),
        packPrice: data.packPrice,
        items: [{ productId: productId!, qty: data.qty }],
        updatedAt: new Date().toISOString(),
      };
      await db.packs.update(data.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs', productId] });
      queryClient.invalidateQueries({ queryKey: ['packs'] });
      setPackForm(emptyPackForm);
      setEditingId(null);
      setShowForm(false);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  // ===== Mutation: حذف عبوة =====
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.packs.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs', productId] });
      queryClient.invalidateQueries({ queryKey: ['packs'] });
    },
  });

  // ===== مساعدات الباركود =====
  const handleGenEAN13 = () =>
    setPackForm((p) => ({ ...p, barcode: generateEAN13() }));

  const handleGenCode128 = () =>
    setPackForm((p) => ({ ...p, barcode: generateCode128('PK') }));

  // ===== فتح نموذج التعديل =====
  const openEdit = (pack: PackEntity) => {
    const items = Array.isArray(pack.items)
      ? pack.items
      : (() => { try { return JSON.parse(pack.items as unknown as string) ?? []; } catch { return []; } })();
    const item = items.find((it: { productId: string }) => it.productId === productId);
    setPackForm({
      id: pack.id,
      name: pack.name,
      barcode: pack.barcode,
      qty: item?.qty ?? 1,
      packPrice: pack.packPrice,
    });
    setEditingId(pack.id);
    setShowForm(true);
    setFormError('');
  };

  const openAdd = () => {
    setPackForm(emptyPackForm);
    setEditingId(null);
    setShowForm(true);
    setFormError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setPackForm(emptyPackForm);
    setFormError('');
  };

  const handleSave = () => {
    if (!packForm.name.trim()) { setFormError('اسم العبوة مطلوب'); return; }
    if (packForm.qty < 1) { setFormError('الكمية يجب أن تكون 1 أو أكثر'); return; }
    if (packForm.packPrice <= 0) { setFormError('سعر البيع يجب أن يكون أكبر من 0'); return; }
    setFormError('');
    if (editingId) {
      updateMutation.mutate({ ...packForm, id: editingId });
    } else {
      createMutation.mutate(packForm);
    }
  };

  const margin = computeMargin(packForm.packPrice, packForm.qty, costPrice);

  if (!productId) {
    return (
      <div className="space-y-4" dir="rtl">
        <h3 className="font-cairo text-headline-sm font-bold text-on-surface border-r-4 border-primary pr-3">
          عبوات الجملة
        </h3>
        <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          احفظ المنتج أولًا لتتمكن من إضافة عبوات الجملة
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* العنوان + زر إضافة */}
      <div className="flex items-center justify-between">
        <h3 className="font-cairo text-headline-sm font-bold text-on-surface border-r-4 border-primary pr-3">
          عبوات الجملة
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-sm hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            إضافة عبوة
          </button>
        )}
      </div>

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-cairo text-title-sm font-semibold text-on-surface">
              {editingId ? 'تعديل عبوة' : 'عبوة جملة جديدة'}
            </p>
            <button type="button" onClick={closeForm} className="p-1 rounded text-on-surface-variant hover:text-error">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* اسم العبوة */}
            <div className="md:col-span-2">
              <label className="block text-label-sm text-on-surface mb-1.5">اسم العبوة *</label>
              <input
                type="text"
                value={packForm.name}
                onChange={(e) => setPackForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="مثال: كرتونة 12"
                className="w-full h-10 px-3 bg-surface-container rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
              />
            </div>

            {/* الباركود */}
            <div className="md:col-span-2">
              <label className="block text-label-sm text-on-surface mb-1.5">باركود العبوة</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={packForm.barcode}
                  onChange={(e) => setPackForm((p) => ({ ...p, barcode: e.target.value }))}
                  placeholder="يدوي أو وِّلد تلقائيًا"
                  className="flex-1 h-10 px-3 bg-surface-container rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 font-mono"
                />
                <button
                  type="button"
                  onClick={handleGenEAN13}
                  title="توليد EAN-13"
                  className="px-3 h-10 bg-primary-container/20 text-primary rounded-lg hover:bg-primary-container/30 flex items-center gap-1 text-label-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> EAN-13
                </button>
                <button
                  type="button"
                  onClick={handleGenCode128}
                  title="توليد CODE128"
                  className="px-3 h-10 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest flex items-center gap-1 text-label-xs"
                >
                  <Barcode className="w-3.5 h-3.5" /> 128
                </button>
              </div>
            </div>

            {/* الكمية بالعبوة */}
            <div>
              <label className="block text-label-sm text-on-surface mb-1.5">الكمية بالعبوة *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={packForm.qty}
                onChange={(e) => setPackForm((p) => ({ ...p, qty: Math.max(1, Number(e.target.value) || 1) }))}
                className="w-full h-10 px-3 bg-surface-container rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
              />
              {costPrice > 0 && (
                <p className="text-body-xs text-on-surface-variant mt-1">
                  تكلفة العبوة: <span className="font-mono font-semibold">{(packForm.qty * costPrice).toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* سعر البيع */}
            <div>
              <label className="block text-label-sm text-on-surface mb-1.5">سعر بيع العبوة *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={packForm.packPrice}
                onChange={(e) => setPackForm((p) => ({ ...p, packPrice: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3 bg-surface-container rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
              />
            </div>

            {/* هامش الربح — محسوب تلقائياً */}
            {costPrice > 0 && packForm.packPrice > 0 && (
              <div className="md:col-span-2 flex items-center gap-3 px-3 py-2 bg-primary-container/10 rounded-lg">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-body-sm text-on-surface">
                  هامش الربح:
                  <span className={`font-mono font-bold mr-1 ${margin >= 0 ? 'text-tertiary' : 'text-error'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </span>
                <span className="text-body-xs text-on-surface-variant mr-auto">
                  وفر للمشتري {((packForm.qty * (form.retailPrice ?? form.salePrice1 ?? 0)) - packForm.packPrice).toFixed(2)} مقارنة بالتجزئة
                </span>
              </div>
            )}
          </div>

          {/* رسالة الخطأ */}
          {formError && (
            <p className="text-sm text-error flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {formError}
            </p>
          )}

          {/* أزرار الحفظ/الإلغاء */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-lg text-label-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </div>
      )}

      {/* قائمة العبوات */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-on-surface-variant text-body-sm">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          جاري التحميل...
        </div>
      ) : packs.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant py-3 text-center border border-dashed border-outline-variant/40 rounded-lg">
          لا توجد عبوات جملة لهذا المنتج بعد
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-surface-container text-on-surface-variant text-label-sm">
              <tr>
                <th className="px-4 py-2.5 text-right">الاسم</th>
                <th className="px-4 py-2.5 text-right font-mono">الباركود</th>
                <th className="px-4 py-2.5 text-center">الكمية</th>
                <th className="px-4 py-2.5 text-left">سعر البيع</th>
                <th className="px-4 py-2.5 text-center">الهامش</th>
                <th className="px-4 py-2.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => {
                const items = Array.isArray(pack.items)
                  ? pack.items
                  : (() => { try { return JSON.parse(pack.items as unknown as string) ?? []; } catch { return []; } })();
                const item = items.find((it: { productId: string }) => it.productId === productId);
                const qty = item?.qty ?? 1;
                const m = computeMargin(pack.packPrice, qty, costPrice);
                return (
                  <tr key={pack.id} className="border-t border-outline-variant/10 hover:bg-surface-container/40">
                    <td className="px-4 py-3 font-semibold text-on-surface">{pack.name}</td>
                    <td className="px-4 py-3 font-mono text-on-surface-variant text-xs">{pack.barcode || '—'}</td>
                    <td className="px-4 py-3 text-center text-on-surface">{qty}</td>
                    <td className="px-4 py-3 text-left font-mono font-bold text-on-surface">
                      {pack.packPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m >= 0 ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'}`}>
                        {m.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(pack)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`حذف عبوة "${pack.name}"؟`)) deleteMutation.mutate(pack.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-error hover:bg-error/10 rounded disabled:opacity-40"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
