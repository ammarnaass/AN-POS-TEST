import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import type { Promotion, Product } from '@/types';
import {
  Plus, Trash2, X, Tag, Power, ShoppingCart, Calendar,
  TrendingUp, Sparkles, Search, Printer, Download,
  Edit2, Clock, AlertTriangle, CheckCircle2,
  Percent, ArrowRight, LayoutGrid, List, ShieldAlert,
  ChevronRight, RefreshCw, Zap, Store
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PromotionsPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: promotions = [], isLoading: isLoadingPromos } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const entities = await db.promotions.toArray();
      return entities.map((e: any) => ({
        id: e.id,
        name: e.name || '',
        productId: e.productId || (Array.isArray(e.productIds) ? e.productIds[0] : '') || '',
        productIds: e.productIds || (e.productId ? [e.productId] : []),
        discountType: (e.discountType === 'amount' || e.type === 'fixed') ? ('amount' as const) : ('percent' as const),
        discountValue: Number(e.discountValue ?? e.value ?? 0),
        startDate: e.startDate || new Date().toISOString().split('T')[0],
        endDate: e.endDate || new Date().toISOString().split('T')[0],
        active: e.active === true || e.status === 'active' || e.active === 1,
        maxQuantity: Number(e.maxQuantity || 0),
        createdAt: e.createdAt || new Date().toISOString(),
      })) as (Promotion & { name?: string; createdAt?: string });
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const all = await db.settings.toArray();
      return all[0] ?? null;
    },
  });

  const currencySymbol = settings?.baseCurrency || 'دج';
  const shopName = settings?.shopName || 'المتجر';

  // Money Formatter
  const formatMoney = (val: number | undefined | null) => {
    return Number(val || 0).toLocaleString('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // UI State
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expiring' | 'scheduled' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<any | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formProductSearch, setFormProductSearch] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<'percent' | 'amount'>('percent');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [formMaxQuantity, setFormMaxQuantity] = useState<number>(0);

  // Selected product object in form
  const selectedFormProduct = useMemo(() => {
    return products.find((p) => p.id === formProductId) || null;
  }, [products, formProductId]);

  // Live Price Simulator Calculations
  const simulation = useMemo(() => {
    if (!selectedFormProduct) return null;
    const retail = Number(selectedFormProduct.retailPrice) || 0;
    const cost = Number(selectedFormProduct.costPrice) || 0;

    let discountAmount = 0;
    let promoPrice = retail;

    if (formDiscountType === 'percent') {
      discountAmount = (retail * (formDiscountValue || 0)) / 100;
      promoPrice = Math.max(0, retail - discountAmount);
    } else {
      discountAmount = formDiscountValue || 0;
      promoPrice = Math.max(0, retail - discountAmount);
    }

    const margin = promoPrice - cost;
    const marginPercent = cost > 0 ? (margin / cost) * 100 : 0;
    const isBelowCost = promoPrice < cost;

    return {
      retail,
      cost,
      discountAmount,
      promoPrice,
      margin,
      marginPercent,
      isBelowCost,
    };
  }, [selectedFormProduct, formDiscountType, formDiscountValue]);

  // Filtered Products for Autocomplete in Form
  const filteredProductsForSelect = useMemo(() => {
    if (!formProductSearch.trim()) return [];
    const q = formProductSearch.toLowerCase().trim();
    return products
      .filter((p) => p.status === 'active' && (p.name.toLowerCase().includes(q) || p.barcode.includes(q)))
      .slice(0, 8);
  }, [products, formProductSearch]);

  // Promotions Status Helper
  const getPromoStatus = (promo: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(promo.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(promo.endDate);
    end.setHours(23, 59, 59, 999);

    if (!promo.active) return 'inactive';
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';

    // Check if expiring in <= 3 days
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'expiring';

    return 'active';
  };

  // High-Level Marketing Metrics
  const stats = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let scheduled = 0;
    let expired = 0;

    promotions.forEach((p) => {
      const status = getPromoStatus(p);
      if (status === 'active') active++;
      else if (status === 'expiring') {
        active++;
        expiring++;
      } else if (status === 'scheduled') scheduled++;
      else expired++;
    });

    return { active, expiring, scheduled, expired, total: promotions.length };
  }, [promotions]);

  // Filtered Promotions List
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      const status = getPromoStatus(p);

      if (activeFilter === 'active' && status !== 'active' && status !== 'expiring') return false;
      if (activeFilter === 'expiring' && status !== 'expiring') return false;
      if (activeFilter === 'scheduled' && status !== 'scheduled') return false;
      if (activeFilter === 'expired' && status !== 'expired' && status !== 'inactive') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prod = products.find((pr) => pr.id === p.productId);
        const nameMatches = (p.name || '').toLowerCase().includes(q);
        const prodMatches = prod?.name.toLowerCase().includes(q) || prod?.barcode.includes(q);
        return nameMatches || prodMatches;
      }

      return true;
    });
  }, [promotions, products, activeFilter, searchQuery]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      productId: string;
      discountType: 'percent' | 'amount';
      discountValue: number;
      startDate: string;
      endDate: string;
      active: boolean;
      maxQuantity: number;
    }) => {
      const id = payload.id || generateId();
      const entity = {
        id,
        productId: payload.productId,
        productIds: [payload.productId],
        name: payload.name.trim() || 'عرض ترويجي',
        type: payload.discountType === 'percent' ? 'percentage' : 'fixed',
        value: payload.discountValue,
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        startDate: payload.startDate,
        endDate: payload.endDate,
        active: payload.active ? 1 : 0,
        status: payload.active ? 'active' : 'inactive',
        maxQuantity: payload.maxQuantity,
        createdAt: new Date().toISOString(),
      };

      if (payload.id) {
        await db.promotions.update(payload.id, entity as any);
      } else {
        await db.promotions.add(entity as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.promotions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setPromoToDelete(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (promo: any) => {
      const newActive = !promo.active;
      await db.promotions.update(promo.id, {
        active: newActive ? 1 : 0,
        status: newActive ? 'active' : 'inactive',
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] }),
  });

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingPromo(null);
    setFormName('عرض خاص');
    setFormProductId('');
    setFormProductSearch('');
    setFormDiscountType('percent');
    setFormDiscountValue(15);
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormMaxQuantity(0);
    setShowForm(true);
  };

  const handleOpenEdit = (promo: any) => {
    setEditingPromo(promo);
    setFormName(promo.name || 'عرض خاص');
    setFormProductId(promo.productId || '');
    const prod = products.find((p) => p.id === promo.productId);
    setFormProductSearch(prod ? `${prod.name} (${prod.barcode})` : '');
    setFormDiscountType(promo.discountType || 'percent');
    setFormDiscountValue(promo.discountValue || 0);
    setFormStartDate(promo.startDate || new Date().toISOString().split('T')[0]);
    setFormEndDate(promo.endDate || new Date().toISOString().split('T')[0]);
    setFormMaxQuantity(promo.maxQuantity || 0);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPromo(null);
    setFormProductSearch('');
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId || formDiscountValue <= 0) return;

    saveMutation.mutate({
      id: editingPromo ? editingPromo.id : undefined,
      name: formName.trim() || 'عرض ترويجي',
      productId: formProductId,
      discountType: formDiscountType,
      discountValue: formDiscountValue,
      startDate: formStartDate,
      endDate: formEndDate,
      active: true,
      maxQuantity: formMaxQuantity,
    });
  };

  // Quick Preset Helper for Duration
  const setQuickDuration = (days: number) => {
    const start = new Date();
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setFormStartDate(start.toISOString().split('T')[0]);
    setFormEndDate(end.toISOString().split('T')[0]);
  };

  // Print Shelf Talker Promo Tag (Single or All)
  const handlePrintShelfTalker = (targetPromo?: any) => {
    const listToPrint = targetPromo
      ? [targetPromo]
      : filteredPromotions.filter((p) => getPromoStatus(p) === 'active' || getPromoStatus(p) === 'expiring');

    if (listToPrint.length === 0) return;

    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بطاقات التخفيض للرفوف - ${shopName}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: 'Cairo', system-ui, sans-serif; padding: 6px; color: #0f172a; margin: 0; }
          .tag-card {
            border: 2px dashed #0046a8;
            border-radius: 12px;
            padding: 12px;
            text-align: center;
            margin-bottom: 14px;
            background: #fff;
            page-break-inside: avoid;
          }
          .store-header { font-size: 11px; color: #64748b; font-weight: bold; }
          .campaign-badge {
            display: inline-block;
            background: #0046a8;
            color: #fff;
            font-weight: 900;
            font-size: 13px;
            padding: 3px 12px;
            border-radius: 20px;
            margin: 6px 0;
            text-transform: uppercase;
          }
          .product-name { font-size: 15px; font-weight: 900; margin: 4px 0; color: #0f172a; }
          .barcode-text { font-family: monospace; font-size: 11px; color: #64748b; }
          .price-box {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin: 10px 0;
          }
          .old-price {
            font-size: 14px;
            color: #94a3b8;
            text-decoration: line-through;
            font-family: monospace;
          }
          .new-price {
            font-size: 24px;
            font-weight: 900;
            color: #0046a8;
            font-family: monospace;
          }
          .discount-badge {
            background: #eff6ff;
            color: #0046a8;
            border: 1px solid #93c5fd;
            padding: 2px 8px;
            border-radius: 6px;
            font-weight: 900;
            font-size: 12px;
          }
          .validity { font-size: 10px; color: #64748b; margin-top: 6px; }
        </style>
      </head>
      <body>
        ${listToPrint.map((promo) => {
          const prod = products.find((p) => p.id === promo.productId);
          if (!prod) return '';
          const retail = prod.retailPrice || 0;
          const discountVal = promo.discountType === 'percent'
            ? `${promo.discountValue}%-`
            : `${promo.discountValue} ${currencySymbol}-`;
          const finalPrice = promo.discountType === 'percent'
            ? retail * (1 - promo.discountValue / 100)
            : Math.max(0, retail - promo.discountValue);

          return `
            <div class="tag-card">
              <div class="store-header">${shopName}</div>
              <div class="campaign-badge">${promo.name || 'عرض ترويجي'}</div>
              <div class="product-name">${prod.name}</div>
              <div class="barcode-text">رمز: ${prod.barcode}</div>
              <div class="price-box">
                <div class="old-price">${retail.toLocaleString('fr-DZ')} ${currencySymbol}</div>
                <div class="new-price">${finalPrice.toLocaleString('fr-DZ')} ${currencySymbol}</div>
              </div>
              <div><span class="discount-badge">وفر ${discountVal}</span></div>
              <div class="validity">العرض صالح لغاية: ${new Date(promo.endDate).toLocaleDateString('ar-DZ')}</div>
            </div>
          `;
        }).join('')}
        <script>
          window.onload = () => { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredPromotions.map((p, idx) => {
      const prod = products.find((pr) => pr.id === p.productId);
      const retail = prod?.retailPrice || 0;
      const finalPrice = p.discountType === 'percent'
        ? retail * (1 - p.discountValue / 100)
        : Math.max(0, retail - p.discountValue);

      return {
        '#': idx + 1,
        'اسم العرض': p.name || 'عرض ترويجي',
        'المنتج': prod?.name || 'غير معروف',
        'الباركود': prod?.barcode || '',
        'السعر الأصلي': retail,
        'نوع الخصم': p.discountType === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت',
        'قيمة الخصم': p.discountValue,
        'سعر البيع بالعرض': finalPrice,
        'تاريخ البدء': p.startDate,
        'تاريخ الانتهاء': p.endDate,
        'الحالة': getPromoStatus(p),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'العروض الترويجية');
    XLSX.writeFile(wb, `عروض_ترويجية_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & BRANDING (USING APP DESIGN TOKENS)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low/95 p-5 rounded-2xl border border-outline-variant/20 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-on-surface font-cairo flex items-center gap-2.5">
                <span>إدارة العروض والخصومات الترويجية</span>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-black">
                  {stats.active} نشط
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                تخطيط الحملات التسويقية، تخفيضات الأسعار الزمنية، وتحفيز مبيعات نقطة البيع
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          {/* Print Shelf Talkers */}
          <button
            onClick={() => handlePrintShelfTalker()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="طباعة بطاقات الأسعار للرفوف لجميع العروض النشطة"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>طباعة بطاقات الرفوف</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="تصدير قائمة العروض إلى Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {/* New Promotion Button */}
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>عرض جديد</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PROMOTIONAL PERFORMANCE METRIC CARDS                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Offers */}
        <div
          onClick={() => setActiveFilter('active')}
          className={`bg-surface-container-low/95 border p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group ${
            activeFilter === 'active' ? 'border-primary ring-2 ring-primary/20' : 'border-primary/20 hover:border-primary/40'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">العروض النشطة حالياً</span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-primary tracking-tight">
            {stats.active} <span className="text-xs font-cairo font-bold">عروض فعالة</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-emerald-600 font-bold">تطبق آلياً عند المسح في الكاشير</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-primary" />
        </div>

        {/* Metric 2: Expiring Soon */}
        <div
          onClick={() => setActiveFilter('expiring')}
          className={`bg-surface-container-low/95 border p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group ${
            activeFilter === 'expiring' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500/20 hover:border-amber-500/40'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">تنتهي قريباً (خلال 3 أيام)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-amber-600 tracking-tight">
            {stats.expiring} <span className="text-xs font-cairo font-bold">عروض توشك على الانتهاء</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span>تنبيه لمتابعة المخزون أو التمديد</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>

        {/* Metric 3: Scheduled / Upcoming */}
        <div
          onClick={() => setActiveFilter('scheduled')}
          className={`bg-surface-container-low/95 border p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group ${
            activeFilter === 'scheduled' ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-sky-500/20 hover:border-sky-500/40'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">عروض مجدولة قادمة</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-sky-600 tracking-tight">
            {stats.scheduled} <span className="text-xs font-cairo font-bold">حملات مستقبلية</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span>ستنطلق تلقائياً بحلول تواريخها</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-sky-500" />
        </div>

        {/* Metric 4: Expired / Total */}
        <div
          onClick={() => setActiveFilter('expired')}
          className={`bg-surface-container-low/95 border p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group ${
            activeFilter === 'expired' ? 'border-outline-variant ring-2 ring-outline-variant/20' : 'border-outline-variant/20 hover:border-outline-variant/40'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">عروض سابقة ومنتهية</span>
            <div className="w-9 h-9 rounded-xl bg-surface-container text-on-surface flex items-center justify-center group-hover:scale-110 transition-transform">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-on-surface tracking-tight">
            {stats.expired} <span className="text-xs font-cairo font-bold">منتهية / متوقفة</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span>إجمالي السجلات: {stats.total}</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-surface-variant" />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. TOOLBAR & FILTER CONTROLS                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-low/95 p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar shrink-0">
          {[
            { key: 'all', label: 'جميع العروض', count: stats.total },
            { key: 'active', label: 'نشطة الآن', count: stats.active },
            { key: 'expiring', label: 'تنتهي قريباً', count: stats.expiring },
            { key: 'scheduled', label: 'مجدولة', count: stats.scheduled },
            { key: 'expired', label: 'منتهية', count: stats.expired },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === tab.key
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[11px] opacity-80">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج، الباركود أو العرض..."
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-container p-1 rounded-xl border border-outline-variant/20 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-primary text-on-primary shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض الشبكة"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-primary text-on-primary shadow-2xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض الجدول"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. PROMOTIONS DISPLAY (GRID OR TABLE)                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isLoadingPromos ? (
        <div className="bg-surface-container-low/95 p-16 rounded-2xl border border-outline-variant/20 text-center text-on-surface-variant">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
          <p className="font-bold text-xs">جاري تحميل العروض الترويجية...</p>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="bg-surface-container-low/95 p-16 rounded-2xl border-2 border-dashed border-outline-variant/30 text-center text-on-surface-variant">
          <Tag className="w-12 h-12 opacity-25 mx-auto mb-3 text-primary" />
          <h4 className="text-base font-bold text-on-surface">لا توجد عروض ترويجية مطابقة</h4>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            قم بإنشاء عرض ترويجي جديد لتنشيط حركة المبيعات وجذب الزبائن، أو قم بتغيير فلاتر البحث أعلاه.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-black text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول عرض الآن</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map((promo) => {
            const product = products.find((p) => p.id === promo.productId);
            const status = getPromoStatus(promo);
            const isActive = status === 'active' || status === 'expiring';

            const retail = product?.retailPrice || 0;
            const discountAmount = promo.discountType === 'percent'
              ? (retail * promo.discountValue) / 100
              : promo.discountValue;
            const finalPrice = Math.max(0, retail - discountAmount);

            const now = new Date();
            const end = new Date(promo.endDate);
            const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={promo.id}
                className={`bg-surface-container-low/95 rounded-2xl border transition-all shadow-2xs hover:shadow-md overflow-hidden flex flex-col justify-between ${
                  status === 'expiring'
                    ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                    : isActive
                    ? 'border-primary/30'
                    : 'border-outline-variant/20 opacity-80'
                }`}
              >
                {/* Card Top Strip */}
                <div className={`h-1.5 w-full ${
                  status === 'expiring' ? 'bg-amber-500' : isActive ? 'bg-primary' : 'bg-outline-variant/40'
                }`} />

                <div className="p-5 space-y-4">
                  {/* Header Row: Badge & Controls */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-2xs ${
                        promo.discountType === 'percent' ? 'bg-primary text-on-primary' : 'bg-emerald-600 text-white'
                      }`}>
                        {promo.discountType === 'percent' ? `-${promo.discountValue}%` : `-${promo.discountValue} دج`}
                      </span>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-700'
                          : status === 'expiring'
                          ? 'bg-amber-500/15 text-amber-800 animate-pulse'
                          : status === 'scheduled'
                          ? 'bg-sky-500/15 text-sky-700'
                          : 'bg-gray-500/15 text-gray-600'
                      }`}>
                        {status === 'active'
                          ? 'نشط الآن'
                          : status === 'expiring'
                          ? `ينتهي قريباً (باقي ${daysLeft} يوم)`
                          : status === 'scheduled'
                          ? 'مجدول'
                          : 'منتهي'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Toggle On/Off */}
                      <button
                        onClick={() => toggleMutation.mutate(promo)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          promo.active
                            ? 'text-emerald-600 hover:bg-emerald-500/10'
                            : 'text-on-surface-variant hover:bg-surface-container'
                        }`}
                        title={promo.active ? 'إيقاف مؤقت' : 'تفعيل العرض'}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      {/* Print Label */}
                      <button
                        onClick={() => handlePrintShelfTalker(promo)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                        title="طباعة بطاقة الرف الترويجية"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(promo)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                        title="تعديل العرض"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setPromoToDelete(promo)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="حذف العرض"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">
                      {promo.name || 'عرض ترويجي'}
                    </span>
                    <h3 className="text-sm font-black text-on-surface font-cairo line-clamp-1">
                      {product?.name || 'منتج غير معروف'}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant mt-0.5">
                      <span>الباركود: {product?.barcode || '—'}</span>
                      <span>•</span>
                      <span>المخزون: {product?.quantity ?? 0}</span>
                    </div>
                  </div>

                  {/* Price Comparison Box */}
                  <div className="bg-surface-container p-3.5 rounded-xl border border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-on-surface-variant font-bold block">السعر الأصلي:</span>
                      <span className="font-mono text-xs text-on-surface-variant line-through">
                        {formatMoney(retail)} {currencySymbol}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-primary font-black block">سعر البيع بالعرض:</span>
                      <span className="font-mono text-lg font-black text-primary">
                        {formatMoney(finalPrice)} <span className="text-xs font-cairo">{currencySymbol}</span>
                      </span>
                    </div>
                  </div>

                  {/* Dates & Validity Info */}
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-bold pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{new Date(promo.startDate).toLocaleDateString('ar-DZ')}</span>
                      <span>←</span>
                      <span>{new Date(promo.endDate).toLocaleDateString('ar-DZ')}</span>
                    </div>

                    {promo.maxQuantity > 0 && (
                      <span className="font-mono text-[10px] bg-surface-container px-2 py-0.5 rounded">
                        أقصى كمية: {promo.maxQuantity}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">اسم العرض</th>
                  <th className="py-3 px-4">المنتج المستهدف</th>
                  <th className="py-3 px-4 text-center">الباركود</th>
                  <th className="py-3 px-4 text-center">السعر الأصلي</th>
                  <th className="py-3 px-4 text-center">التخفيض</th>
                  <th className="py-3 px-4 text-center">سعر العرض</th>
                  <th className="py-3 px-4 text-center">فترة العرض</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {filteredPromotions.map((promo) => {
                  const product = products.find((p) => p.id === promo.productId);
                  const status = getPromoStatus(promo);
                  const retail = product?.retailPrice || 0;
                  const discountAmount = promo.discountType === 'percent'
                    ? (retail * promo.discountValue) / 100
                    : promo.discountValue;
                  const finalPrice = Math.max(0, retail - discountAmount);

                  return (
                    <tr key={promo.id} className="hover:bg-surface-container/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-on-surface">{promo.name || 'عرض خاص'}</td>
                      <td className="py-3 px-4 font-bold text-on-surface">{product?.name || 'منتج غير معروف'}</td>
                      <td className="py-3 px-4 text-center font-mono text-on-surface-variant">{product?.barcode || '—'}</td>
                      <td className="py-3 px-4 text-center font-mono line-through text-on-surface-variant">
                        {formatMoney(retail)} {currencySymbol}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {promo.discountType === 'percent' ? `-%${promo.discountValue}` : `-${promo.discountValue} دج`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-primary text-sm">
                        {formatMoney(finalPrice)} {currencySymbol}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-on-surface-variant">
                        {new Date(promo.startDate).toLocaleDateString('ar-DZ')} إلى {new Date(promo.endDate).toLocaleDateString('ar-DZ')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-700'
                            : status === 'expiring'
                            ? 'bg-amber-500/15 text-amber-800 animate-pulse'
                            : status === 'scheduled'
                            ? 'bg-sky-500/15 text-sky-700'
                            : 'bg-gray-500/15 text-gray-600'
                        }`}>
                          {status === 'active' ? 'نشط' : status === 'expiring' ? 'ينتهي قريباً' : status === 'scheduled' ? 'مجدول' : 'منتهي'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleMutation.mutate(promo)}
                            className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                            title={promo.active ? 'إيقاف' : 'تفعيل'}
                          >
                            <Power className={`w-3.5 h-3.5 ${promo.active ? 'text-emerald-600' : ''}`} />
                          </button>
                          <button
                            onClick={() => handlePrintShelfTalker(promo)}
                            className="p-1 rounded-lg hover:bg-surface-container text-primary transition-colors cursor-pointer"
                            title="طباعة بطاقة الرف"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(promo)}
                            className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPromoToDelete(promo)}
                            className="p-1 rounded-lg hover:bg-red-500/10 text-on-surface-variant hover:text-red-600 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: CREATE / EDIT PROMOTION                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitForm}
            className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface font-cairo">
                    {editingPromo ? 'تعديل العرض الترويجي' : 'إعداد عرض ترويجي وتخفيض جديد'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">حدد السلعة، نسبة التخفيض، وفترة سريان العرض</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">عنوان الحملة أو العرض:</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: تخفيضات الصيف، عرض خاص، تصفية..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Product Autocomplete Search */}
            <div className="relative">
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">اختر المنتج المستهدف بالعرض *</label>
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={formProductSearch}
                  onChange={(e) => {
                    setFormProductSearch(e.target.value);
                    if (formProductId) setFormProductId('');
                  }}
                  placeholder="ابحث بالاسم أو الباركود..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {!formProductId && formProductSearch.trim() && filteredProductsForSelect.length > 0 && (
                <div className="absolute top-full mt-1.5 w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredProductsForSelect.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setFormProductId(p.id);
                        setFormProductSearch(`${p.name} (${p.barcode})`);
                      }}
                      className="w-full px-4 py-2 text-right hover:bg-primary/10 flex items-center justify-between transition-colors border-b border-outline-variant/15 last:border-0 cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface">{p.name}</p>
                        <p className="text-[10px] font-mono text-on-surface-variant">{p.barcode}</p>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-xs font-black text-primary">{formatMoney(p.retailPrice)} {currencySymbol}</span>
                        <span className="text-[10px] text-on-surface-variant block">مخزون: {p.quantity}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Type and Value */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface-variant">نوع وقيمة التخفيض:</label>
                <div className="flex items-center bg-surface-container p-0.5 rounded-lg border border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setFormDiscountType('percent')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      formDiscountType === 'percent' ? 'bg-primary text-on-primary shadow-2xs' : 'text-on-surface-variant'
                    }`}
                  >
                    نسبة مئوية (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDiscountType('amount')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      formDiscountType === 'amount' ? 'bg-primary text-on-primary shadow-2xs' : 'text-on-surface-variant'
                    }`}
                  >
                    مبلغ ثابت (دج)
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {formDiscountType === 'percent' ? (
                  [5, 10, 15, 20, 30, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormDiscountValue(val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        formDiscountValue === val
                          ? 'bg-primary text-on-primary border-primary shadow-2xs'
                          : 'bg-surface-container text-on-surface border-outline-variant/20 hover:bg-surface-container-high'
                      }`}
                    >
                      {val}%
                    </button>
                  ))
                ) : (
                  [50, 100, 200, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormDiscountValue(val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        formDiscountValue === val
                          ? 'bg-primary text-on-primary border-primary shadow-2xs'
                          : 'bg-surface-container text-on-surface border-outline-variant/20 hover:bg-surface-container-high'
                      }`}
                    >
                      {val} دج
                    </button>
                  ))
                )}
              </div>

              {/* Number Input */}
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step={formDiscountType === 'percent' ? '1' : '10'}
                  value={formDiscountValue || ''}
                  onChange={(e) => setFormDiscountValue(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-sm font-mono font-black text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                  {formDiscountType === 'percent' ? '%' : currencySymbol}
                </span>
              </div>
            </div>

            {/* LIVE SIMULATOR BOX */}
            {simulation && (
              <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-bold">السعر الأصلي:</span>
                  <span className="font-mono font-bold line-through text-on-surface-variant">
                    {formatMoney(simulation.retail)} {currencySymbol}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-bold">قيمة التخفيض:</span>
                  <span className="font-mono font-bold text-primary">
                    -{formatMoney(simulation.discountAmount)} {currencySymbol}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                  <span className="text-xs font-black text-on-surface">سعر البيع بالعرض للمستهلك:</span>
                  <span className="font-mono text-xl font-black text-primary">
                    {formatMoney(simulation.promoPrice)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </span>
                </div>

                {/* Profit Warning / Info */}
                {simulation.isBelowCost ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>تنبيه: سعر العرض أقل من سعر التكلفة ({formatMoney(simulation.cost)} {currencySymbol})!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 font-bold">
                    <span>هامش الربح بعد الخصم:</span>
                    <span className="font-mono">{formatMoney(simulation.margin)} {currencySymbol} ({simulation.marginPercent.toFixed(1)}%)</span>
                  </div>
                )}
              </div>
            )}

            {/* Duration Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface-variant">فترة سريان العرض:</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDuration(1)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 cursor-pointer"
                  >
                    يوم
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDuration(3)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 cursor-pointer"
                  >
                    3 أيام
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDuration(7)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 cursor-pointer"
                  >
                    أسبوع
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDuration(30)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 cursor-pointer"
                  >
                    شهر
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block mb-1">تاريخ البدء:</span>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block mb-1">تاريخ الانتهاء:</span>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Max Quantity */}
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">
                الحد الأقصى للكمية المشمولة بالعرض (0 = بدون حد):
              </label>
              <input
                type="number"
                min="0"
                value={formMaxQuantity || ''}
                onChange={(e) => setFormMaxQuantity(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!formProductId || formDiscountValue <= 0 || saveMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                {saveMutation.isPending ? 'جاري الحفظ...' : editingPromo ? 'حفظ التعديلات' : 'إطلاق العرض الآن'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: DELETE CONFIRMATION                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {promoToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">تأكيد حذف العرض الترويجي</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                هل أنت متأكد من حذف العرض <strong className="text-on-surface">"{promoToDelete.name || 'العرض'}"</strong>؟
              </p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                سيعود سعر بيع المنتج إلى سعره العادي فوراً في نقطة البيع.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setPromoToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteMutation.mutate(promoToDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
