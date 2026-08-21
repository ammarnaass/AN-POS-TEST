// CategoriesPage — إدارة عائلات وفئات المنتجات (AN POS)
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, type Category, type CategoryWrite } from '@/services/api/categoriesApi';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Package,
  Layers,
  ShoppingBag,
  Droplets,
  Sparkles,
  Coffee,
  Cookie,
  Box,
  Tag,
  Shirt,
  Apple,
  Pill,
  Utensils,
  LayoutGrid,
  List,
  Check,
  AlertCircle,
  FolderPlus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

// قائمة الأيقونات المتاحة للاختيار
const AVAILABLE_ICONS = [
  { id: 'FolderTree', label: 'مجلد', icon: FolderTree },
  { id: 'ShoppingBag', label: 'تسوق', icon: ShoppingBag },
  { id: 'Apple', label: 'أغذية', icon: Apple },
  { id: 'Milk', label: 'ألبان', icon: Utensils },
  { id: 'Droplets', label: 'زيوت وسوائل', icon: Droplets },
  { id: 'Coffee', label: 'مشروبات', icon: Coffee },
  { id: 'Cookie', label: 'حلويات', icon: Cookie },
  { id: 'Sparkles', label: 'منظفات', icon: Sparkles },
  { id: 'Pill', label: 'صيدلية', icon: Pill },
  { id: 'Shirt', label: 'ملابس', icon: Shirt },
  { id: 'Box', label: 'معلبات', icon: Box },
  { id: 'Tag', label: 'عرض', icon: Tag },
  { id: 'Layers', label: 'متنوع', icon: Layers },
];

// لوحة الألوان المتناسقة
const COLOR_PALETTE = [
  { hex: '#10B981', name: 'زمردي' },
  { hex: '#3B82F6', name: 'أزرق كلاسيكي' },
  { hex: '#6366F1', name: 'نيلي' },
  { hex: '#8B5CF6', name: 'بنفسجي' },
  { hex: '#EC4899', name: 'وردي' },
  { hex: '#F59E0B', name: 'كهرماني' },
  { hex: '#EF4444', name: 'مرجاني' },
  { hex: '#06B6D4', name: 'سماوي' },
  { hex: '#14B8A6', name: 'فيروزي' },
  { hex: '#64748B', name: 'فضي دافئ' },
];

function getCategoryIcon(iconName?: string) {
  const item = AVAILABLE_ICONS.find((i) => i.id === iconName);
  const IconComp = item ? item.icon : FolderTree;
  return IconComp;
}

const emptyForm: CategoryWrite = {
  name: '',
  parentId: null,
  description: '',
  icon: 'ShoppingBag',
  color: '#3B82F6',
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'with-products' | 'empty' | 'root' | 'sub'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryWrite>(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<Category | null>(null);

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body: CategoryWrite) => categoriesApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryWrite }) =>
      categoriesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteConfirmCat(null);
    },
    onError: (err: Error) => {
      alert(err.message);
      setDeleteConfirmCat(null);
    },
  });

  // خريطة أسماء العائلات للأصل
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // إحصائيات علوية
  const stats = useMemo(() => {
    const total = categories.length;
    const withProducts = categories.filter((c) => (c.productCount ?? 0) > 0).length;
    const emptyCount = total - withProducts;
    const totalProducts = categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);
    return { total, withProducts, emptyCount, totalProducts };
  }, [categories]);

  // الفلترة والبحث
  const filtered = useMemo(() => {
    return categories.filter((c) => {
      const matchSearch =
        search.trim() === '' ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (activeFilter === 'with-products') return (c.productCount ?? 0) > 0;
      if (activeFilter === 'empty') return (c.productCount ?? 0) === 0;
      if (activeFilter === 'root') return !c.parentId;
      if (activeFilter === 'sub') return Boolean(c.parentId);

      return true;
    });
  }, [categories, search, activeFilter]);

  const openNew = (parentId?: string) => {
    setEditing(null);
    setForm({
      ...emptyForm,
      parentId: parentId || null,
      color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].hex,
    });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      parentId: cat.parentId ?? null,
      description: cat.description ?? '',
      icon: cat.icon || 'FolderTree',
      color: cat.color || '#3B82F6',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('اسم الفئة مطلوب');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* ── الرأس الرئيسي والعنوان ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <FolderTree className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-on-surface font-cairo tracking-tight">عائلات المنتجات</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-primary/15 text-primary border border-primary/20">
                {stats.total} عائلة
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              تنظيم وتصنيف البضائع والمنتجات، وربطها بالأقسام لسرعة الوصول في الكاشير
            </p>
          </div>
        </div>

        <button
          onClick={() => openNew()}
          className="flex items-center gap-2.5 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/25 cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>إضافة عائلة جديدة</span>
        </button>
      </div>

      {/* ── بطاقات الإحصاءات السريعة (KPIs) ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant">إجمالي العائلات</p>
            <p className="text-2xl font-black text-on-surface mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant">عائلات نشطة</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.withProducts}</p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant">عائلات فارغة</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{stats.emptyCount}</p>
          </div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-outline-variant/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant">إجمالي الأصناف المصنفة</p>
            <p className="text-2xl font-black text-purple-600 mt-0.5">{stats.totalProducts}</p>
          </div>
        </div>
      </div>

      {/* ── شريط الفلاتر والبحث والتحكم ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface p-3 rounded-2xl border border-outline-variant/20">
        {/* حقل البحث */}
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم العائلة أو الوصف..."
            className="w-full h-11 pr-10 pl-9 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 placeholder:text-on-surface-variant/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* أزرار الفلترة السريعة */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            الكل ({categories.length})
          </button>
          <button
            onClick={() => setActiveFilter('with-products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'with-products'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            بها منتجات ({stats.withProducts})
          </button>
          <button
            onClick={() => setActiveFilter('empty')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'empty'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            فارغة ({stats.emptyCount})
          </button>
          <button
            onClick={() => setActiveFilter('root')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'root'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            رئيسية
          </button>
        </div>

        {/* تبديل طريقة العرض */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/20 mr-auto md:mr-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="عرض البطاقات"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === 'table' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="عرض الجدول"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── رسائل الخطأ إن وجدت ────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">فشل في تحميل الفئات: {(error as Error).message}</span>
        </div>
      )}

      {/* ── المحتوى الرئيسي: البطاقات أو الجدول ───────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-40 bg-surface-container-low rounded-2xl animate-pulse border border-outline-variant/10" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-dashed border-outline-variant/40 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 mb-4">
            <Package className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-on-surface font-cairo">لا توجد عائلات مطابقة</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mt-1 mb-6">
            {search ? 'لم نجد أي فئة تطابق عبارة البحث الحالية.' : 'ابدأ بإضافة أول عائلة لتصنيف منتجاتك وتسهيل عمليات البيع.'}
          </p>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة عائلة الآن</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── عرض شبكة البطاقات (Cards Grid) ────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cat) => {
            const IconComp = getCategoryIcon(cat.icon);
            const parentName = cat.parentId ? categoryMap.get(cat.parentId) : null;
            const catColor = cat.color || '#3B82F6';

            return (
              <div
                key={cat.id}
                className="group relative bg-surface hover:bg-surface-container-lowest transition-all duration-200 rounded-2xl p-5 border border-outline-variant/20 hover:border-primary/40 hover:shadow-lg flex flex-col justify-between"
              >
                {/* الرأس مع الأيقونة واللون */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm"
                      style={{
                        backgroundColor: `${catColor}18`,
                        color: catColor,
                        border: `1px solid ${catColor}35`,
                      }}
                    >
                      <IconComp className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="تعديل العائلة"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmCat(cat)}
                        className="p-1.5 rounded-lg hover:bg-error/15 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                        title="حذف العائلة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* اسم العائلة والوصف */}
                  <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors font-cairo">
                    {cat.name}
                  </h3>

                  {parentName && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-md mt-1 border border-outline-variant/15">
                      <span>تابعة لـ:</span>
                      <span className="font-bold text-on-surface">{parentName}</span>
                    </span>
                  )}

                  <p className="text-xs text-on-surface-variant line-clamp-2 mt-2 leading-relaxed min-h-[32px]">
                    {cat.description || 'لا يوجد وصف محدد لهذه العائلة.'}
                  </p>
                </div>

                {/* شريط الإحصائيات السفلي */}
                <div className="mt-4 pt-3 border-t border-outline-variant/15 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-on-surface-variant/70" />
                    <span className="text-xs font-bold text-on-surface">
                      {cat.productCount ?? 0}
                    </span>
                    <span className="text-xs text-on-surface-variant">منتج</span>
                  </div>

                  <button
                    onClick={() => openNew(cat.id)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    title="إضافة عائلة فرعية تتبع هذه العائلة"
                  >
                    <span>+ فرعية</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── عرض الجدول (Table View) ──────────────────────────────── */
        <div className="bg-surface rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/20 text-xs font-bold text-on-surface-variant">
                <th className="px-5 py-4">العائلة</th>
                <th className="px-5 py-4">العائلة الرئيسية</th>
                <th className="px-5 py-4">الوصف</th>
                <th className="px-5 py-4 text-center">عدد المنتجات</th>
                <th className="px-5 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {filtered.map((cat) => {
                const IconComp = getCategoryIcon(cat.icon);
                const parentName = cat.parentId ? categoryMap.get(cat.parentId) : '—';
                const catColor = cat.color || '#3B82F6';

                return (
                  <tr key={cat.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: `${catColor}18`,
                            color: catColor,
                          }}
                        >
                          <IconComp className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-on-surface font-cairo">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant">{parentName}</td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant max-w-xs truncate">
                      {cat.description || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-on-surface">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-surface-container-low text-xs border border-outline-variant/20">
                        {cat.productCount ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmCat(cat)}
                          className="p-1.5 rounded-lg hover:bg-error/15 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ── نافذة إضافة / تعديل عائلة (Modal Form) ───────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg border border-outline-variant/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* رأس المودال */}
            <div className="px-6 py-5 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="font-cairo text-lg font-black text-on-surface">
                  {editing ? 'تعديل بيانات العائلة' : 'إضافة عائلة جديدة'}
                </h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النموذج */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* اسم الفئة */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  اسم العائلة / الفئة <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                  className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 font-semibold"
                  placeholder="مثال: مشروبات، ألبان، معلبات..."
                />
              </div>

              {/* العائلة الرئيسية (للتسلسل الهرمي) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">العائلة الرئيسية (اختياري)</label>
                <select
                  value={form.parentId || ''}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}
                  className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20"
                >
                  <option value="">— عائلة رئيسية مستقلة —</option>
                  {categories
                    .filter((c) => !editing || c.id !== editing.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* لوحة اختيار اللون */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">لون العائلة المميز</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.hex })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        form.color === c.hex
                          ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-sm'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {form.color === c.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* شبكة اختيار الأيقونة */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">أيقونة العائلة</label>
                <div className="grid grid-cols-6 sm:grid-cols-7 gap-2 max-h-36 overflow-y-auto p-1.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
                  {AVAILABLE_ICONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = form.icon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setForm({ ...form, icon: item.id })}
                        className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-on-primary shadow-sm scale-105'
                            : 'bg-surface text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* الوصف */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">الوصف والملاحظات</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 resize-none"
                  placeholder="وصف مختصر لمحتويات هذه العائلة..."
                />
              </div>

              {/* رسالة الخطأ في النموذج */}
              {formError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-2 text-error text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 h-12 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editing ? 'حفظ التعديلات' : 'إضافة العائلة'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 h-12 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── نافذة تأكيد الحذف (Delete Confirmation Dialog) ─────────── */}
      {deleteConfirmCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-surface rounded-3xl shadow-2xl w-full max-w-md p-6 border border-outline-variant/20 text-right animate-in fade-in zoom-in-95 duration-150"
            dir="rtl"
          >
            <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-on-surface font-cairo">
              تأكيد حذف الفئة: "{deleteConfirmCat.name}"
            </h3>

            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
              {(deleteConfirmCat.productCount ?? 0) > 0 ? (
                <span className="text-error font-bold">
                  تحذير: يوجد {deleteConfirmCat.productCount} منتج مرتبط بهذه العائلة. يرجى إعادة تعيين فئات المنتجات أولاً قبل حذفها.
                </span>
              ) : (
                'هل أنت متأكد من رغبتك في حذف هذه العائلة نهائياً؟ لن تتمكن من التراجع عن هذا الإجراء.'
              )}
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteConfirmCat.id)}
                disabled={deleteMutation.isPending || (deleteConfirmCat.productCount ?? 0) > 0}
                className="flex-1 h-11 bg-error text-on-error rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-error/20 disabled:opacity-40 cursor-pointer"
              >
                {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmCat(null)}
                className="px-5 h-11 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-highest transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
