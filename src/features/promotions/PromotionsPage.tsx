import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import type { Promotion } from '@/types';
import { Plus, Trash2, X, Tag, Power, ShoppingCart, Calendar, TimerOff, TrendingUp, Sparkles } from 'lucide-react';

export default function PromotionsPage() {
  const queryClient = useQueryClient();

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const entities = await db.promotions.toArray();
      return entities.map((e) => ({
        id: e.id,
        productId: e.productIds[0] ?? '',
        discountType: e.type === 'percentage' ? 'percent' as const : 'amount' as const,
        discountValue: e.value,
        startDate: e.startDate,
        endDate: e.endDate,
        active: e.status === 'active',
        maxQuantity: (e as any).maxQuantity ?? 0,
      })) as Promotion[];
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

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    productId: '', discountType: 'percent' as 'percent' | 'amount', discountValue: 0,
    startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], maxQuantity: 0,
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Promotion, 'id'>) =>
      db.promotions.add({
        id: generateId(),
        name: '',
        type: data.discountType === 'percent' ? 'percentage' : 'fixed',
        value: data.discountValue,
        productIds: [data.productId],
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.active ? 'active' : 'inactive',
        createdAt: new Date().toISOString(),
        maxQuantity: data.maxQuantity,
      } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.promotions.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const promo = await db.promotions.get(id);
      if (promo) {
        await db.promotions.update(id, {
          status: promo.status === 'active' ? 'inactive' : 'active',
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] }),
  });

  const stats = useMemo(() => {
    const now = new Date();
    const active = promotions.filter(p => p.active && now >= new Date(p.startDate) && now <= new Date(p.endDate));
    const scheduled = promotions.filter(p => p.active && now < new Date(p.startDate));
    const expired = promotions.filter(p => !p.active || now > new Date(p.endDate));
    return { active: active.length, scheduled: scheduled.length, expired: expired.length, total: promotions.length };
  }, [promotions]);

  const handleSubmit = () => {
    if (!formData.productId || formData.discountValue <= 0) return;
    addMutation.mutate({ ...formData, active: true });
    setFormData({ productId: '', discountType: 'percent', discountValue: 0, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], maxQuantity: 0 });
    setShowForm(false);
  };

  const getPromoStatus = (promo: Promotion) => {
    const now = new Date();
    if (!promo.active) return 'expired';
    if (now < new Date(promo.startDate)) return 'scheduled';
    if (now > new Date(promo.endDate)) return 'expired';
    return 'active';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-row-reverse justify-between items-center">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">إدارة العروض الترويجية</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">إعداد خصومات وتخفيضات لفترات محددة لتحفيز المبيعات</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl shadow-md hover:bg-primary-container transition-all active:scale-95 font-label-lg">
          <Plus className="w-5 h-5" /> إضافة عرض جديد
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-primary/10 p-2 rounded-lg text-primary"><Tag className="w-5 h-5" /></div>
            <span className="text-tertiary font-label-md flex items-center gap-1"><TrendingUp className="w-4 h-4" />+12%</span>
          </div>
          <p className="text-on-surface-variant font-label-md">العروض النشطة</p>
          <h3 className="font-numeral-lg text-on-surface mt-1">{stats.active}</h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-tertiary/10 p-2 rounded-lg text-tertiary"><ShoppingCart className="w-5 h-5" /></div>
            <span className="text-tertiary font-label-md flex items-center gap-1"><TrendingUp className="w-4 h-4" />+5%</span>
          </div>
          <p className="text-on-surface-variant font-label-md">مبيعات العروض</p>
          <h3 className="font-numeral-lg text-on-surface mt-1">45,280 دج</h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-secondary/10 p-2 rounded-lg text-secondary"><Calendar className="w-5 h-5" /></div>
            <span className="text-secondary font-label-md">هذا الشهر</span>
          </div>
          <p className="text-on-surface-variant font-label-md">عروض مجدولة</p>
          <h3 className="font-numeral-lg text-on-surface mt-1">{stats.scheduled}</h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-error/10 p-2 rounded-lg text-error"><TimerOff className="w-5 h-5" /></div>
            <span className="text-error font-label-md">منتهية</span>
          </div>
          <p className="text-on-surface-variant font-label-md">عروض منتهية</p>
          <h3 className="font-numeral-lg text-on-surface mt-1">{stats.expired}</h3>
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promo) => {
          const product = products.find((p) => p.id === promo.productId);
          const status = getPromoStatus(promo);
          const now = new Date();
          const end = new Date(promo.endDate);
          const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isActive = status === 'active';

          return (
            <div key={promo.id} className={`bg-surface-container-lowest rounded-xl border ${isActive ? 'border-tertiary/30' : 'border-outline-variant'} shadow-sm overflow-hidden hover:shadow-md transition-all group`}>
              <div className={`h-2 ${isActive ? 'bg-tertiary' : status === 'scheduled' ? 'bg-secondary' : 'bg-outline-variant'}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-fixed rounded-lg flex items-center justify-center text-primary">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleMutation.mutate(promo.id)} className={`p-2 rounded-lg transition-all ${promo.active ? 'text-tertiary hover:bg-tertiary/10' : 'text-on-surface-variant hover:bg-surface-container-high'}`} title={promo.active ? 'إلغاء التفعيل' : 'تفعيل'}>
                      <Power className={`w-4 h-4 ${promo.active ? 'fill-tertiary/20' : ''}`} />
                    </button>
                    <button onClick={() => deleteMutation.mutate(promo.id)} className="p-2 rounded-lg text-error hover:bg-error-container/20 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-label-lg text-on-surface mb-1">{product?.name || 'منتج محذوف'}</p>
                  <p className="text-body-sm text-on-surface-variant">{product?.category || '—'}</p>
                </div>
                <div className="my-4">
                  <p className="font-numeral-lg text-primary">
                    {promo.discountType === 'percent' ? `${promo.discountValue}%` : `${promo.discountValue.toFixed(2)} دج`}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {promo.discountType === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-on-surface-variant">{new Date(promo.startDate).toLocaleDateString('ar-DZ')} - {new Date(promo.endDate).toLocaleDateString('ar-DZ')}</span>
                  {isActive && daysLeft > 0 && <span className="text-tertiary font-label-md">باقي {daysLeft} يوم</span>}
                </div>
                {promo.maxQuantity > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-outline-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '60%' }} />
                    </div>
                    <span className="text-body-sm text-on-surface-variant">{promo.maxQuantity} وحدة</span>
                  </div>
                )}
                <div className="mt-4">
                  <span className={`px-3 py-1.5 rounded-full text-body-sm font-label-md ${
                    status === 'active' ? 'bg-tertiary-container text-on-tertiary-container' :
                    status === 'scheduled' ? 'bg-secondary-container text-on-secondary-container' :
                    'bg-error-container text-on-error-container'
                  }`}>
                    {status === 'active' ? 'نشط' : status === 'scheduled' ? 'مجدول' : 'منتهي'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {promotions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest rounded-xl border-2 border-dashed border-outline-variant">
          <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center text-outline-variant mb-4">
            <Tag className="w-12 h-12" />
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">لا توجد عروض ترويجية</h3>
          <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-xs">أضف عرضاً ترويجياً جديداً لتحفيز المبيعات</p>
          <button onClick={() => setShowForm(true)} className="bg-primary text-on-primary px-8 py-3 rounded-xl shadow-sm font-label-lg hover:bg-primary-container transition-all">إضافة أول عرض</button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Tag className="w-6 h-6" /></div>
                <h3 className="font-headline-md text-on-surface">إضافة عرض جديد</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-low transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <select value={formData.productId} onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                className="w-full px-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                <option value="">اختر منتجاً</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percent' | 'amount' })}
                className="w-full px-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                <option value="percent">نسبة مئوية (%)</option>
                <option value="amount">قيمة ثابتة</option>
              </select>
              <input type="number" placeholder="قيمة التخفيض" value={formData.discountValue || ''} onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) || 0 })}
                className="w-full px-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              <input type="number" placeholder="الحد الأقصى للكمية (0 = بدون حد)" value={formData.maxQuantity || ''} onChange={(e) => setFormData({ ...formData, maxQuantity: Number(e.target.value) || 0 })}
                className="w-full px-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              <div className="flex gap-3">
                <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="flex-1 px-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="flex-1 px-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3.5 border border-outline-variant rounded-xl text-on-surface-variant font-label-lg hover:bg-surface-container-low transition-all">إلغاء</button>
              <button onClick={handleSubmit} className="flex-1 py-3.5 bg-primary text-on-primary rounded-xl font-label-lg shadow-sm hover:bg-primary-container transition-all active:scale-95 flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> إضافة العرض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
