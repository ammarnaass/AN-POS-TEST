// ProductFormPage — PRD: شاشة إدارة المنتج (5 أقسام)
import { useState, useEffect } from 'react';
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
import {
  Save, LogOut, Tag as TagIcon, Printer, RefreshCw, Tag, Plus,
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
  lowStockThreshold: 0,
  reorderPoint: 0,
  maxStock: 0,
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

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Partial<Product>>(emptyProduct);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !id) return;
    let active = true;
    (async () => {
      try {
        const product = await db.products.get(id);
        if (active) setForm({ ...emptyProduct, ...(product as Partial<Product> ?? {}) });
      } catch (err) {
        if (active) setFormError(err instanceof Error ? err.message : 'فشل تحميل المنتج');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, isEdit]);

  const setField = (updater: (p: Partial<Product>) => Partial<Product>) => {
    setForm((prev) => ({ ...prev, ...updater(prev) }));
  };

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
      // إعادة توجيه بعد الحفظ: تعديل يبقى، إنشاء يذهب لصفحة التعديل
      if (isEdit) {
        navigate(-1);
      } else {
        navigate(`/products/${(saved as Product).id}/edit`, { replace: true });
      }
    },
    onError: (err: Error) => setFormError(err.message),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name?.trim()) {
      setFormError('اسم المنتج مطلوب');
      return;
    }
    saveMutation.mutate(form);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto" dir="rtl">
      {/* Toolbar — PRD section 5 buttons */}
      <div className="sticky top-0 z-10 bg-surface-container rounded-lg px-4 py-3 flex flex-wrap items-center gap-2 shadow-sm">
        <h2 className="font-cairo text-headline-md font-bold text-on-surface ml-auto">
          {isEdit ? 'تعديل منتج' : 'منتج جديد'}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/products/new')}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
        >
          <Plus className="w-4 h-4" /> جديد
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> حفظ
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
        >
          <LogOut className="w-4 h-4" /> خروج
        </button>
        <button
          type="button"
          onClick={() => setForm((p) => ({ ...p }))}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
        >
          <RefreshCw className="w-4 h-4" /> تحديث الأسعار
        </button>
        <button
          type="button"
          onClick={() => navigate('/promotions')}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
        >
          <Tag className="w-4 h-4" /> قائمة الكوبونات
        </button>
        <button
          type="button"
          onClick={() => navigate('/categories')}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
        >
          <TagIcon className="w-4 h-4" /> قائمة العائلات
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-sm hover:bg-surface-container-highest"
        >
          <Printer className="w-4 h-4" /> طباعة السعر
        </button>
      </div>

      {formError && (
        <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface rounded-lg border border-outline-variant/20 p-5">
          <ProductInfoSection form={form} setForm={setField} />
        </div>

        <div className="bg-surface rounded-lg border border-outline-variant/20 p-5">
          <PricingSection form={form} setForm={setField} />
        </div>

        <div className="bg-surface rounded-lg border border-outline-variant/20 p-5">
          <StockSection form={form} setForm={setField} />
        </div>

        <div className="bg-surface rounded-lg border border-outline-variant/20 p-5">
          <SaleSettingsSection form={form} setForm={setField} />
        </div>

        <div className="bg-surface rounded-lg border border-outline-variant/20 p-5">
          <BarcodeSection form={form} setForm={setField} />
        </div>

        <div className="flex justify-end gap-2 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-surface-container-high text-on-surface rounded-lg text-label-md hover:bg-surface-container-highest"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isEdit ? 'تحديث' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  );
}
