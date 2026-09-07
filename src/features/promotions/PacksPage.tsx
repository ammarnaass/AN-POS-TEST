// PacksPage — صفحة إدارة عبوات الجملة والباقات (Desktop)
// منقولة ومطورة عن mobile-rn/src/features/promotions/PacksScreen.tsx
// تدعم الربط المباشر بـ SQLite عبر IPC ومزامنة كاش Dexie.

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import { generateEAN13 } from '@/services/barcode';
import {
  Layers,
  Plus,
  Trash2,
  Package,
  Barcode,
  X,
  Check,
  Search,
  RefreshCw,
  Edit2,
  AlertTriangle,
  Store,
} from 'lucide-react';

interface PackItemSelection {
  productId: string;
  name: string;
  qty: number;
  costPrice?: number;
  retailPrice?: number;
}

export default function PacksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: packs = [], isLoading: isLoadingPacks, refetch: refetchPacks } = useQuery<PackEntity[]>({
    queryKey: ['packs'],
    queryFn: async () => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      let all: any[] = [];
      if (api?.packs?.list) {
        try {
          const res = await api.packs.list();
          if (Array.isArray(res?.data)) all = res.data;
        } catch { /* fallback */ }
      }
      if (all.length === 0) {
        all = (await db.packs.toArray()) as PackEntity[];
      }
      return all;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (api?.products?.list) {
        try {
          const res = await api.products.list();
          if (Array.isArray(res?.data) && res.data.length > 0) {
            return res.data as Product[];
          }
        } catch { /* fallback */ }
      }
      const r = await db.products.toArray();
      return r as unknown as Product[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await db.settings.toArray();
      return all[0] ?? null;
    },
  });

  const currencySymbol = settings?.baseCurrency || 'دج';

  // Money Formatter
  const formatMoney = (val: number | undefined | null) => {
    return Number(val || 0).toLocaleString('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPack, setEditingPack] = useState<PackEntity | null>(null);
  const [packName, setPackName] = useState('');
  const [packBarcode, setPackBarcode] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState<PackItemSelection[]>([]);
  const [packType, setPackType] = useState<'wholesale' | 'bundle' | 'half_wholesale'>('wholesale');
  const [unitName, setUnitName] = useState('كرتونة');
  const [minWholesaleQty, setMinWholesaleQty] = useState('1');
  const [modalError, setModalError] = useState('');

  // Product Picker Sub-Modal / State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // فتح نافذة إنشاء عبوة جديدة
  const handleOpenCreate = () => {
    setEditingPack(null);
    setPackName('');
    setPackBarcode(generateEAN13());
    setPackPrice('');
    setPackType('wholesale');
    setUnitName('كرتونة');
    setMinWholesaleQty('1');
    setSelectedItems([]);
    setModalError('');
    setShowModal(true);
  };

  // فتح نافذة تعديل عبوة
  const handleOpenEdit = (pack: PackEntity) => {
    setEditingPack(pack);
    setPackName(pack.name || '');
    setPackBarcode(pack.barcode || '');
    setPackPrice(String(pack.packPrice ?? pack.pack_price ?? ''));
    setPackType(pack.packType || 'wholesale');
    setUnitName(pack.unitName || 'كرتونة');
    setMinWholesaleQty(String(pack.minWholesaleQty || 1));

    // تفكيك بنود العبوة
    let rawItems: any[] = [];
    if (typeof pack.items === 'string') {
      try {
        rawItems = JSON.parse(pack.items);
      } catch {
        rawItems = [];
      }
    } else if (Array.isArray(pack.items)) {
      rawItems = pack.items;
    }

    const resolvedItems: PackItemSelection[] = rawItems.map((it: any) => {
      const p = products.find((prod) => prod.id === it.productId);
      return {
        productId: it.productId,
        name: it.name || p?.name || 'منتج غير معروف',
        qty: Number(it.qty || 1),
        costPrice: p?.costPrice ?? 0,
        retailPrice: p?.retailPrice ?? 0,
      };
    });

    setSelectedItems(resolvedItems);
    setModalError('');
    setShowModal(true);
  };

  // إضافة منتج للعبوة
  const handleAddProductToPack = (product: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          costPrice: product.costPrice ?? 0,
          retailPrice: product.retailPrice ?? 0,
        },
      ];
    });
    setPickerOpen(false);
    setProductSearch('');
  };

  // تحديث كمية منتج في العبوة
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, qty: newQty } : it))
    );
  };

  // حذف منتج من العبوة
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // حساب تكلفة العبوة وهامش الربح
  const packCalculations = useMemo(() => {
    let totalCost = 0;
    let totalRetail = 0;
    selectedItems.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const cost = it.costPrice ?? prod?.costPrice ?? 0;
      const retail = it.retailPrice ?? prod?.retailPrice ?? 0;
      totalCost += cost * it.qty;
      totalRetail += retail * it.qty;
    });

    const priceNum = parseFloat(packPrice) || 0;
    const margin = priceNum > 0 ? ((priceNum - totalCost) / priceNum) * 100 : 0;
    const savings = totalRetail > priceNum ? totalRetail - priceNum : 0;
    const savingsPercent = totalRetail > 0 && savings > 0 ? (savings / totalRetail) * 100 : 0;

    return { totalCost, totalRetail, margin, savings, savingsPercent };
  }, [selectedItems, packPrice, products]);

  // فحص تفرد الباركود
  const checkBarcodeUnique = useCallback(
    async (code: string, excludeId?: string): Promise<boolean> => {
      if (!code.trim()) return true;
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

      if (api?.products?.getByBarcode) {
        try {
          const res = await api.products.getByBarcode(code);
          if (res?.data) return false;
        } catch { /* fallback */ }
      }
      const matchProd = await db.products.where('barcode').equals(code).first();
      if (matchProd) return false;

      if (api?.packs?.getByBarcode) {
        try {
          const res = await api.packs.getByBarcode(code);
          if (res?.data && res.data.id !== excludeId) return false;
        } catch { /* fallback */ }
      }
      const matchPack = await db.packs.where('barcode').equals(code).first();
      if (matchPack && matchPack.id !== excludeId) return false;

      return true;
    },
    []
  );

  // Mutation: حفظ العبوة (إنشاء أو تعديل)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!packName.trim()) {
        throw new Error('يرجى إدخال اسم العبوة');
      }
      if (selectedItems.length === 0) {
        throw new Error('يجب اختيار منتج واحد على الأقل في العبوة');
      }
      const priceNum = parseFloat(packPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error('يرجى إدخال سعر بيع صحيح للعبوة أكبر من الصفر');
      }

      const cleanBarcode = packBarcode.trim();
      const isUnique = await checkBarcodeUnique(cleanBarcode, editingPack?.id);
      if (!isUnique) {
        throw new Error('هذا الباركود مستخدم مسبقاً لمنتج أو عبوة أخرى');
      }

      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      const now = new Date().toISOString();
      const itemsPayload = selectedItems.map((it) => ({
        productId: it.productId,
        name: it.name,
        qty: it.qty,
      }));
      const totalPieces = selectedItems.reduce((acc, it) => acc + (it.qty || 0), 0);
      const minQtyNum = parseInt(minWholesaleQty, 10) || 1;

      if (editingPack) {
        // تعديل
        const patchData = {
          name: packName.trim(),
          barcode: cleanBarcode,
          packPrice: priceNum,
          pack_price: priceNum,
          packType,
          unitName: unitName.trim() || 'كرتونة',
          piecesCount: totalPieces,
          minWholesaleQty: minQtyNum,
          items: itemsPayload,
          status: editingPack.status || 'active',
          updatedAt: now,
        };

        if (api?.packs?.update) {
          await api.packs.update(editingPack.id, patchData);
        }
        await db.packs.update(editingPack.id, patchData as any);
        return { ...editingPack, ...patchData };
      } else {
        // إنشاء
        const newId = generateId();
        const newPackData = {
          id: newId,
          name: packName.trim(),
          barcode: cleanBarcode,
          packPrice: priceNum,
          pack_price: priceNum,
          packType,
          unitName: unitName.trim() || 'كرتونة',
          piecesCount: totalPieces,
          minWholesaleQty: minQtyNum,
          items: itemsPayload,
          status: 'active' as const,
          createdAt: now,
          updatedAt: now,
        };

        if (api?.packs?.create) {
          await api.packs.create(newPackData);
        }
        await db.packs.add(newPackData as any);
        return newPackData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs'] });
      setShowModal(false);
      setEditingPack(null);
      setModalError('');
    },
    onError: (err: Error) => {
      setModalError(err.message || 'فشل حفظ العبوة');
    },
  });

  // Mutation: حذف عبوة
  const deleteMutation = useMutation({
    mutationFn: async (packId: string) => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (api?.packs?.delete || api?.packs?.remove) {
        const fn = api.packs.delete ?? api.packs.remove;
        await fn(packId);
      }
      await db.packs.delete(packId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs'] });
    },
  });

  // فلترة العبوات
  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.barcode && p.barcode.includes(searchQuery.trim()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.status !== 'inactive') ||
        (statusFilter === 'inactive' && p.status === 'inactive');

      return matchesSearch && matchesStatus;
    });
  }, [packs, searchQuery, statusFilter]);

  // فلترة المنتجات في النافذة المنبثقة لاختيار منتج
  const filteredProductPicker = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 30);
    const q = productSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [products, productSearch]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container rounded-2xl p-5 border border-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shadow-inner">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-on-surface font-cairo flex items-center gap-2">
              عبوات الجملة والباقات
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-sans">
                {packs.length} عبوة
              </span>
            </h1>
            <p className="text-sm text-on-surface-variant font-tajawal mt-0.5">
              إدارة عبوات التجزئة والجملة، وربط عدة منتجات في عبوة واحدة بباركود موحد وسعر خاص
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors font-tajawal text-sm cursor-pointer"
            title="العودة إلى إدارة المخزون والبضائع"
          >
            <Package className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">المخزون والبضائع</span>
          </button>
          <button
            onClick={() => refetchPacks()}
            disabled={isLoadingPacks}
            className="p-2.5 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPacks ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold font-tajawal hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة عبوة جديدة</span>
          </button>
        </div>
      </div>

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-on-surface-variant">إجمالي العبوات المسجلة</span>
            <div className="text-xl font-black text-on-surface font-cairo">{packs.length}</div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-on-surface-variant">العبوات النشطة</span>
            <div className="text-xl font-black text-on-surface font-cairo">
              {packs.filter((p) => p.status !== 'inactive').length}
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-on-surface-variant">إجمالي المنتجات المشمولة</span>
            <div className="text-xl font-black text-on-surface font-cairo">
              {packs.reduce((acc, p) => {
                let items: any[] = [];
                try {
                  items = typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []);
                } catch { items = []; }
                return acc + (Array.isArray(items) ? items.length : 0);
              }, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الباركود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant/40 text-sm focus:outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {st === 'all' ? 'الكل' : st === 'active' ? 'نشطة' : 'معطلة'}
            </button>
          ))}
        </div>
      </div>

      {/* Packs Grid */}
      {isLoadingPacks ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredPacks.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40">
          <Layers className="w-12 h-12 mx-auto text-on-surface-variant/40 mb-3" />
          <h3 className="text-base font-bold text-on-surface font-cairo">لا توجد عبوات مطابقة</h3>
          <p className="text-xs text-on-surface-variant font-tajawal mt-1">
            {searchQuery ? 'جرب البحث بكلمة أو باركود آخر' : 'ابدأ بإنشاء عبوة جملة جديدة لربط منتجاتك معاً'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold font-tajawal inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              إضافة عبوة جديدة
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPacks.map((pack) => {
            let items: any[] = [];
            try {
              items = typeof pack.items === 'string' ? JSON.parse(pack.items) : (pack.items || []);
            } catch {
              items = [];
            }

            const price = Number(pack.packPrice ?? pack.pack_price ?? 0);

            return (
              <div
                key={pack.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-base text-on-surface font-cairo line-clamp-1">
                        {pack.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {pack.packType === 'bundle'
                            ? '🎁 باقة مجمعة'
                            : pack.packType === 'half_wholesale'
                            ? '🛍️ نصف جملة'
                            : '📦 طرد كرتونة جملة'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container px-1.5 py-0.5 rounded">
                          {pack.unitName || 'كرتونة'} ({pack.piecesCount || items.reduce((a: number, b: any) => a + (b.qty || 0), 0)} قطعة)
                        </span>
                      </div>
                      {pack.barcode ? (
                        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono mt-1">
                          <Barcode className="w-3.5 h-3.5" />
                          <span>{pack.barcode}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                          بدون باركود
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        pack.status !== 'inactive'
                          ? 'bg-green-500/15 text-green-700'
                          : 'bg-neutral-500/15 text-neutral-600'
                      }`}
                    >
                      {pack.status !== 'inactive' ? 'نشطة' : 'معطلة'}
                    </span>
                  </div>

                  {/* Included Items Summary */}
                  <div className="mt-3 bg-surface-container-low/60 rounded-lg p-2.5 border border-outline-variant/15">
                    <span className="text-[11px] font-bold text-on-surface-variant block mb-1.5">
                      محتويات العبوة ({items.length} منتج):
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {items.map((it: any, idx: number) => {
                        const prod = products.find((p) => p.id === it.productId);
                        const prodName = it.name || prod?.name || 'منتج غير معروف';
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs text-on-surface"
                          >
                            <span className="truncate flex-1 pl-2">{prodName}</span>
                            <span className="font-bold shrink-0 bg-surface-container px-1.5 py-0.5 rounded text-[11px]">
                              × {it.qty}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer / Price & Actions */}
                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-on-surface-variant block">سعر العبوة:</span>
                    <span className="text-lg font-black text-primary font-cairo">
                      {formatMoney(price)} {currencySymbol}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(pack)}
                      className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors"
                      title="تعديل العبوة"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف العبوة "${pack.name}"؟`)) {
                          deleteMutation.mutate(pack.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-outline-variant text-error hover:bg-error/10 transition-colors"
                      title="حذف العبوة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: إضافة / تعديل عبوة ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-outline-variant/40 animate-in fade-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-on-surface font-cairo">
                  {editingPack ? 'تعديل عبوة جملة' : 'إنشاء عبوة جملة جديدة'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* تصنيف العبوة ونوع التعبئة بالجملة */}
              <div className="space-y-3 bg-surface-container-low/40 p-3.5 rounded-xl border border-outline-variant/25">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-2 font-tajawal">
                    نوع العبوة والغرض التجاري:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPackType('wholesale')}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                        packType === 'wholesale'
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="text-xs font-bold font-cairo">📦 طرد كرتونة جملة</span>
                      <span className="text-[10px] opacity-80 font-tajawal">تعبئة تجارية لصنف واحد (كرتونة/طرد)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPackType('bundle')}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                        packType === 'bundle'
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="text-xs font-bold font-cairo">🎁 باقة مجمعة</span>
                      <span className="text-[10px] opacity-80 font-tajawal">حزمة أصناف متنوعة بسعر مجمع</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPackType('half_wholesale')}
                      className={`p-2.5 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                        packType === 'half_wholesale'
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="text-xs font-bold font-cairo">🛍️ نصف جملة</span>
                      <span className="text-[10px] opacity-80 font-tajawal">كيس أو دزينة مصغرة للتجار الصغار</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-outline-variant/15">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                      وحدة التعبئة (كرتونة، طرد، صندوق...)
                    </label>
                    <input
                      type="text"
                      placeholder="كرتونة"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-xs focus:outline-none focus:border-primary"
                    />
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {['كرتونة', 'طرد', 'صندوق', 'دزينة', 'حزمة', 'كيس'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnitName(u)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            unitName === u ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                      الحد الأدنى لطلب الجملة (عدد العبوات)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={minWholesaleQty}
                      onChange={(e) => setMinWholesaleQty(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-xs focus:outline-none focus:border-primary"
                    />
                    <span className="text-[10px] text-on-surface-variant mt-1 block font-tajawal">
                      الحد الأدنى للعبوات المطلوبة لتطبيق تسعير الجملة
                    </span>
                  </div>
                </div>
              </div>

              {/* الاسم والباركود */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                    اسم العبوة <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: كرتونة عصير 12 قارورة"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/40 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                    الباركود
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="امسح أو ولّد باركود..."
                      value={packBarcode}
                      onChange={(e) => setPackBarcode(e.target.value)}
                      className="flex-1 px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/40 text-sm font-mono focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setPackBarcode(generateEAN13())}
                      className="px-2.5 py-2 rounded-lg bg-surface-container border border-outline-variant text-xs font-bold hover:bg-surface-container-high transition-colors shrink-0"
                      title="توليد باركود EAN-13"
                    >
                      توليد
                    </button>
                  </div>
                </div>
              </div>

              {/* سعر البيع والإحصاء المالي */}
              <div className="bg-surface-container-low/50 p-3.5 rounded-xl border border-outline-variant/30 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                    سعر بيع العبوة ({currencySymbol}) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={packPrice}
                    onChange={(e) => setPackPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant/40 text-lg font-black text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Live Margin Calculation */}
                {parseFloat(packPrice) > 0 && selectedItems.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-outline-variant/20 text-xs">
                    <div>
                      <span className="text-on-surface-variant block text-[10px]">إجمالي التكلفة:</span>
                      <span className="font-bold text-on-surface">
                        {formatMoney(packCalculations.totalCost)} {currencySymbol}
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px]">هامش الربح:</span>
                      <span
                        className={`font-bold ${
                          packCalculations.margin >= 0 ? 'text-green-600' : 'text-error'
                        }`}
                      >
                        {packCalculations.margin.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px]">توفير الزبون:</span>
                      <span className="font-bold text-blue-600">
                        {formatMoney(packCalculations.savings)} {currencySymbol} ({packCalculations.savingsPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* قائمة المنتجات المشمولة */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-on-surface font-tajawal">
                    المنتجات المشمولة بالعبوة ({selectedItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearch('');
                      setPickerOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة منتج للعبوة
                  </button>
                </div>

                {selectedItems.length === 0 ? (
                  <div className="text-center py-8 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/30">
                    <Package className="w-8 h-8 mx-auto text-on-surface-variant/40 mb-1.5" />
                    <p className="text-xs text-on-surface-variant">لم يتم تحديد منتجات بعد</p>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="mt-2 text-xs font-bold text-primary hover:underline"
                    >
                      + اضغط هنا لاختيار المنتجات
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedItems.map((item, idx) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/20 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-on-surface block truncate">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            تكلفة الوحدة: {formatMoney(item.costPrice)} {currencySymbol}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.qty - 1)}
                            className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-xs font-bold bg-surface-container-lowest rounded py-1 border border-outline-variant/30"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, item.qty + 1)}
                            className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-error hover:bg-error/10 rounded transition-colors mr-1"
                            title="حذف من العبوة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 p-4 border-t border-outline-variant/30 bg-surface-container-low/30">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold font-tajawal hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5"
              >
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingPack ? 'حفظ التعديلات' : 'إنشاء العبوة'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUB-MODAL: منتقي المنتجات ================= */}
      {pickerOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="bg-surface-container-lowest rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl border border-outline-variant/40"
            dir="rtl"
          >
            <div className="flex items-center justify-between p-3.5 border-b border-outline-variant/30">
              <h3 className="text-sm font-bold text-on-surface font-cairo">
                اختر منتجاً لإضافته للعبوة
              </h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-outline-variant/20">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الباركود، أو الرمز..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-3 pr-9 py-2 bg-surface-container-low rounded-lg border border-outline-variant/40 text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-72">
              {filteredProductPicker.length === 0 ? (
                <div className="text-center py-8 text-xs text-on-surface-variant">
                  لا توجد منتجات مطابقة
                </div>
              ) : (
                filteredProductPicker.map((prod) => {
                  const isSelected = selectedItems.some((i) => i.productId === prod.id);
                  return (
                    <button
                      key={prod.id}
                      onClick={() => handleAddProductToPack(prod)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-right text-xs transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <span className="font-bold text-on-surface block truncate">
                          {prod.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                          {prod.barcode && <span>باركود: {prod.barcode}</span>}
                          <span>مخزون: {prod.quantity ?? 0}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-left">
                        <span className="font-bold text-primary">
                          {formatMoney(prod.retailPrice)} {currencySymbol}
                        </span>
                        {isSelected && (
                          <span className="block text-[10px] text-primary font-bold">مضاف ✓</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
