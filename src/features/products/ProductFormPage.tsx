// ProductFormPage — PRD: شاشة إدارة المنتج الشاملة (UI/UX Pro Max)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { syncProductCreate, syncProductUpdate } from '@/lib/products-sync';
import type { Product } from '@/types';
import ProductInfoSection from './sections/ProductInfoSection';
import PricingSection from './sections/PricingSection';
import StockSection from './sections/StockSection';
import SaleSettingsSection from './sections/SaleSettingsSection';
import BarcodeSection from './sections/BarcodeSection';
import PackagingSection from './sections/PackagingSection';
import {
  Save, Printer, Plus,
  Package, DollarSign, Box, SlidersHorizontal, Barcode as BarcodeIcon,
  Layers, ArrowRight, Eye, AlertTriangle,
  LayoutGrid, List, Check, Camera, Trash2, Upload
} from 'lucide-react';

const emptyProduct: Partial<Product> = {
  name: '',
  barcode: '',
  sku: '',
  category: '',
  categoryId: null,
  type: '',
  unit: 'قطعة',
  costPrice: 0,
  averagePrice: 0,
  wholesalePrice: 0,
  retailPrice: 0,
  salePrice1: 0,
  salePrice2: 0,
  salePrice3: 0,
  invoicePrice: 0,
  profitMargin: 0,
  tax: 0,
  discount: 0,
  wholesaleMinQty: 0,
  quantity: 0,
  lowStockThreshold: 5,
  reorderPoint: 10,
  maxStock: 100,
  stockable: true,
  weight: 0,
  packageSize: '',
  location: '',
  image: '',
  variant: '',
  expiryDate: '',
  batchNumber: '',
  highlighted: false,
  status: 'active',
  allowNegativeStock: false,
  warehouseId: '',
  pricingByZone: false,
  loyaltyCard: false,
  askPrice: false,
  askQuantity: false,
  pointPrice: false,
};

type FormTab = 'info' | 'pricing' | 'stock' | 'sales' | 'barcode' | 'packaging';

const FORM_TABS: { id: FormTab; label: string; icon: any; countBadge?: (p: Partial<Product>) => string | null }[] = [
  { id: 'info', label: 'معلومات المنتج', icon: Package },
  { id: 'pricing', label: 'الأسعار والربحية', icon: DollarSign },
  { id: 'stock', label: 'إدارة المخزون', icon: Box },
  { id: 'sales', label: 'إعدادات البيع', icon: SlidersHorizontal },
  { id: 'barcode', label: 'الباركود والترميز', icon: BarcodeIcon },
  { id: 'packaging', label: 'عبوات الجملة', icon: Layers },
];

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Partial<Product>>(emptyProduct);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState<FormTab>('info');
  const [viewMode, setViewMode] = useState<'tabs' | 'all'>('tabs');
  const [savedToast, setSavedToast] = useState(false);

  // مرجع ومتحكم رفع الصورة المباشر من بطاقة المعاينة
  const previewInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewDragging, setIsPreviewDragging] = useState(false);

  const handleImageFile = useCallback((file: File) => {
    setFormError('');
    if (!file.type.startsWith('image/')) {
      setFormError('الملف المختار ليس صورة صالحة');
      return;
    }
    if (file.size > 2_000_000) {
      setFormError('حجم الصورة كبير جدًا (الحد الأقصى 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    let active = true;
    (async () => {
      try {
        const electron = (window as any).electronAPI;
        let product: any = null;
        if (electron?.products?.get) {
          const res = await electron.products.get(id);
          if (res?.data) product = res.data;
        }
        if (!product) {
          product = await db.products.get(id);
        }
        if (active) setForm({ ...emptyProduct, ...(product as Partial<Product> ?? {}) });
      } catch (err) {
        if (active) setFormError(err instanceof Error ? err.message : 'فشل تحميل بيانات المنتج');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, isEdit]);

  const setField = useCallback((updater: (p: Partial<Product>) => Partial<Product>) => {
    setForm((prev) => ({ ...prev, ...updater(prev) }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const record = { ...(emptyProduct as Omit<Product, 'id'>), ...product };
      if (isEdit && id) {
        await db.products.put({ ...record, id } as Product);
        // Write-Through → SQLite (for mobile sync)
        await syncProductUpdate(id, { ...record, id });
        return { ...record, id };
      }
      const newId = generateId();
      await db.products.add({ ...record, id: newId } as Product);
      // Write-Through → SQLite (for mobile sync)
      await syncProductCreate({ ...record, id: newId });
      return { ...record, id: newId };
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
      if (isEdit) {
        // يبقى في الصفحة للتعديل الإضافي
      } else {
        navigate(`/products/${(saved as Product).id}/edit`, { replace: true });
      }
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError('');
    if (!form.name?.trim()) {
      setFormError('يرجى كتابة اسم المنتج أولاً.');
      setActiveTab('info');
      return;
    }
    saveMutation.mutate(form);
  }, [form, saveMutation]);

  // Keyboard shortcuts (Ctrl+S to save, Esc to exit, Ctrl+N for new)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        navigate(-1);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        navigate('/products/new');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, navigate]);

  // حسابات الربحية للعرض الحي
  const primarySalePrice = form.salePrice1 ?? form.retailPrice ?? 0;
  const cost = form.costPrice ?? 0;
  const marginPercent = cost > 0 ? Math.round(((primarySalePrice - cost) / cost) * 100) : 0;
  const profitPerUnit = primarySalePrice - cost;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3" dir="rtl">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent shadow-md" />
        <span className="text-body-sm text-on-surface-variant font-medium">جارٍ تحميل بيانات الصنف...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12 animate-fade-in" dir="rtl">
      {/* 1. شريط التحكم العلوي المتقدم (Sticky Command Bar) */}
      <div className="sticky top-2 z-30 bg-surface-container/95 backdrop-blur-md rounded-2xl p-3.5 border border-outline-variant/25 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all cursor-pointer"
            title="رجوع للخلف (Esc)"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-cairo text-title-lg font-extrabold text-on-surface">
                {isEdit ? (form.name || 'تعديل الصنف') : 'إضافة صنف جديد'}
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                form.status === 'inactive'
                  ? 'bg-neutral-500/10 text-neutral-500 border border-neutral-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {form.status === 'inactive' ? 'معطّل' : 'نشط'}
              </span>
              {form.sku && (
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant">
                  {form.sku}
                </span>
              )}
            </div>
            <p className="text-body-xs text-on-surface-variant mt-0.5 hidden sm:block">
              <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Ctrl+S</kbd> للحفظ السريع
              {' · '}
              <kbd className="px-1.5 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Esc</kbd> للخروج
            </p>
          </div>
        </div>

        {/* أزرار الإجراءات في الرأس */}
        <div className="flex items-center gap-2">
          {/* زر تبديل وضع العرض */}
          <div className="flex items-center bg-surface-container-high rounded-xl p-1 border border-outline-variant/20">
            <button
              type="button"
              onClick={() => setViewMode('tabs')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'tabs' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض مقسم بتبويبات"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">تبويبات</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="عرض كامل الشاشة ممتداً"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">كامل</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-xl text-label-sm font-semibold hover:bg-surface-container-highest transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">جديد</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-xl text-label-sm font-semibold hover:bg-surface-container-highest transition-all cursor-pointer"
            title="طباعة بطاقة السعر"
          >
            <Printer className="w-4 h-4 text-on-surface-variant" />
            <span className="hidden md:inline">طباعة</span>
          </button>

          {/* زر الحفظ الرئيسي مع توهج */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl text-label-md font-bold shadow-md hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saveMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : savedToast ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{savedToast ? 'تم الحفظ!' : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
          </button>
        </div>
      </div>

      {/* رسالة الخطأ العامة */}
      {formError && (
        <div className="px-4 py-3 bg-error/10 border border-error/25 rounded-2xl text-error text-body-sm font-medium flex items-center gap-2.5 animate-shake">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* 2. الهيكلية المزدوجة (70% النموذج + 30% المعاينة الحية الملتصقة) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* العمود الأيمن: النموذج والتبويبات (8 أعمدة) */}
        <div className="lg:col-span-8 space-y-5">
          {/* شريط التبويبات الفاخر (عند وضع Tabs) */}
          {viewMode === 'tabs' && (
            <div className="flex items-center gap-1.5 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/20 overflow-x-auto custom-scrollbar">
              {FORM_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* محتوى النماذج */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* وضع التبويبات */}
            {viewMode === 'tabs' ? (
              <div className="bg-surface rounded-3xl border border-outline-variant/20 p-6 shadow-sm transition-all">
                {activeTab === 'info' && <ProductInfoSection form={form} setForm={setField} />}
                {activeTab === 'pricing' && <PricingSection form={form} setForm={setField} />}
                {activeTab === 'stock' && <StockSection form={form} setForm={setField} />}
                {activeTab === 'sales' && <SaleSettingsSection form={form} setForm={setField} />}
                {activeTab === 'barcode' && <BarcodeSection form={form} setForm={setField} />}
                {activeTab === 'packaging' && <PackagingSection form={form} />}
              </div>
            ) : (
              /* وضع العرض الكامل لكل الأقسام */
              <div className="space-y-6">
                <div className="bg-surface rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
                  <ProductInfoSection form={form} setForm={setField} />
                </div>
                <div className="bg-surface rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
                  <PricingSection form={form} setForm={setField} />
                </div>
                <div className="bg-surface rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
                  <StockSection form={form} setForm={setField} />
                </div>
                <div className="bg-surface rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
                  <SaleSettingsSection form={form} setForm={setField} />
                </div>
                <div className="bg-surface rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
                  <BarcodeSection form={form} setForm={setField} />
                </div>
                <div className="bg-surface rounded-3xl border border-outline-variant/20 p-6 shadow-sm">
                  <PackagingSection form={form} />
                </div>
              </div>
            )}

            {/* شريط الإجراءات السفلي */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant font-semibold text-body-sm hover:bg-surface-container transition-all cursor-pointer"
              >
                إلغاء وخروج
              </button>

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-7 py-2.5 bg-primary text-on-primary rounded-xl text-body-sm font-bold shadow-md hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saveMutation.isPending && (
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isEdit ? 'حفظ كافة التغييرات' : 'تأكيد إضافة المنتج'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* العمود الأيسر: المعاينة الحية للبطاقة (4 أعمدة - Sticky) */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="bg-surface rounded-3xl border border-outline-variant/20 p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h4 className="font-cairo text-label-lg font-bold text-on-surface">معاينة بطاقة الكاشير (POS)</h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                مباشر
              </span>
            </div>

            {/* البطاقة الفعلية كما تظهر في شاشة البيع (مع إمكانية تعيين الصورة مباشرة) */}
            <div className="bg-surface-container-low border border-outline-variant/25 rounded-2xl p-4 shadow-sm space-y-3">
              {/* صورة المنتج أو الأيقونة البديلة (تفاعلية للنقر أو السحب والإفلات) */}
              <div
                onClick={() => previewInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsPreviewDragging(true);
                }}
                onDragLeave={() => setIsPreviewDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsPreviewDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFile(file);
                }}
                className={`w-full h-44 rounded-xl flex items-center justify-center overflow-hidden relative cursor-pointer group transition-all border-2 border-dashed ${
                  isPreviewDragging
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : form.image
                    ? 'border-transparent bg-surface-container-highest'
                    : 'border-outline-variant/40 hover:border-primary/60 bg-surface-container-highest/60 hover:bg-surface-container-highest'
                }`}
                title={form.image ? 'انقر لتغيير صورة المنتج' : 'انقر أو اسحب صورة لتعيينها'}
              >
                {form.image ? (
                  <>
                    <img
                      src={form.image}
                      alt={form.name || 'Product'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* شريط أدوات التحكم بالصورة عند التمرير */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white p-2">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold transition-all shadow-sm">
                        <Camera className="w-3.5 h-3.5" />
                        تغيير الصورة
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((p) => ({ ...p, image: '' }));
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-[11px] text-white transition-all shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                        إزالة الصورة
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-on-surface-variant/60 group-hover:text-primary transition-colors p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high group-hover:bg-primary/10 flex items-center justify-center mb-2 transition-colors shadow-xs">
                      <Camera className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <span className="text-xs font-bold text-on-surface">انقر لتعيين صورة للمنتج</span>
                    <span className="text-[10px] text-on-surface-variant/70 mt-0.5">
                      أو اسحب وأفلت ملف الصورة هنا
                    </span>
                  </div>
                )}
                {form.category && (
                  <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg pointer-events-none">
                    {form.category}
                  </span>
                )}
              </div>

              {/* مدخل ملف الصورة المخفي للبطاقة */}
              <input
                ref={previewInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                  e.target.value = '';
                }}
              />

              {/* الاسم والرمز */}
              <div>
                <h3 className="font-cairo text-body-md font-bold text-on-surface line-clamp-2 min-h-[1.5rem]">
                  {form.name || 'اسم المنتج سيظهر هنا...'}
                </h3>
                <p className="font-mono text-xs text-on-surface-variant mt-0.5">
                  {form.sku || 'ART00000'}
                </p>
              </div>

              {/* السعر والربح */}
              <div className="pt-2 border-t border-outline-variant/15 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-on-surface-variant font-medium block">سعر البيع</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-title-md font-extrabold text-primary">
                      {primarySalePrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-primary font-bold">دج</span>
                  </div>
                </div>

                {marginPercent !== 0 && (
                  <div className={`px-2 py-1 rounded-xl text-left border ${
                    marginPercent >= 25
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : marginPercent > 0
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-error/10 text-error border-error/20'
                  }`}>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[9px] block font-medium opacity-80">الهامش</span>
                      {profitPerUnit > 0 && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          (+{profitPerUnit.toLocaleString()} دج)
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold">
                      {marginPercent > 0 ? `+${marginPercent}%` : `${marginPercent}%`}
                    </span>
                  </div>
                )}
              </div>

              {/* شريط مصغر للكمية والباركود */}
              <div className="bg-surface-container/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5" />
                  <span>المخزون:</span>
                  <strong className="text-on-surface font-mono">{form.quantity ?? 0} {form.unit || 'قطعة'}</strong>
                </span>

                {form.barcode && (
                  <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded" dir="ltr">
                    {form.barcode}
                  </span>
                )}
              </div>
            </div>

            {/* روابط وإرشادات سريعة */}
            <div className="space-y-2 pt-2 text-body-xs text-on-surface-variant">
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low">
                <span>تحديث أسعار الجملة</span>
                <span className="font-mono font-bold text-on-surface">{(form.salePrice3 || 0).toLocaleString()} دج</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low">
                <span>سعر الفاتورة</span>
                <span className="font-mono font-bold text-on-surface">{(form.invoicePrice || 0).toLocaleString()} دج</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
