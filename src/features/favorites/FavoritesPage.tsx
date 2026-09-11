import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { formatMoney } from '@/features/pos/utils/format';
import {
  useFavoritesStore,
  type FavoriteCategory,
} from './store/useFavoritesStore';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';
import {
  Star,
  Plus,
  Trash2,
  Edit2,
  Layers,
  Box,
  Package,
  Coffee,
  Droplets,
  Zap,
  Sparkles,
  ShoppingBag,
  FolderPlus,
  Check,
  X,
  Search,
  Terminal,
  Store,
  Filter,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Star,
  Box,
  Package,
  Layers,
  Coffee,
  Droplets,
  Zap,
  Sparkles,
  ShoppingBag,
};

const COLOR_OPTIONS = [
  { hex: '#2563eb', name: 'أزرق ملكي' },
  { hex: '#059669', name: 'زمردي' },
  { hex: '#d97706', name: 'كهرماني' },
  { hex: '#7c3aed', name: 'بنفسجي' },
  { hex: '#e11d48', name: 'قرمزي' },
  { hex: '#0284c7', name: 'سماوي' },
  { hex: '#4f46e5', name: 'نيلي' },
  { hex: '#475569', name: 'رمادي حجري' },
];

export default function FavoritesPage() {
  const {
    categories,
    items,
    addCategory,
    updateCategory,
    deleteCategory,
    addItemToCategory,
    removeItemFromCategory,
  } = useFavoritesStore();

  const { terminalCategoryMode, setTerminalCategoryMode } = usePOSSessionStore();

  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FavoriteCategory | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [catIconInput, setCatIconInput] = useState('Star');
  const [catColorInput, setCatColorInput] = useState('#2563eb');

  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [itemTypeTab, setItemTypeTab] = useState<'packs' | 'products'>('packs');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Fetch packs from SQLite / Dexie
  const { data: packs = [] } = useQuery<PackEntity[]>({
    queryKey: ['packs'],
    queryFn: async () => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      let all: any[] = [];
      if (api?.packs?.list) {
        try {
          const res = await api.packs.list();
          if (Array.isArray(res?.data)) all = res.data;
        } catch {
          // fallback
        }
      }
      if (all.length === 0) {
        all = (await db.packs.toArray()) as PackEntity[];
      }
      return all;
    },
  });

  // Fetch products
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
        } catch {
          // fallback
        }
      }
      return (await db.products.toArray()) as Product[];
    },
  });

  // Filtered favorite items to display
  const displayedItems = useMemo(() => {
    let result = items;
    if (selectedCatId !== 'ALL') {
      result = result.filter((it) => it.categoryId === selectedCatId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.barcode && it.barcode.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, selectedCatId, searchQuery]);

  // Current active category object
  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCatId);
  }, [categories, selectedCatId]);

  // Handle open category modal (new or edit)
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatNameInput('');
    setCatIconInput('Star');
    setCatColorInput('#2563eb');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: FavoriteCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setCatNameInput(cat.name);
    setCatIconInput(cat.icon || 'Star');
    setCatColorInput(cat.color || '#2563eb');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: catNameInput.trim(),
        icon: catIconInput,
        color: catColorInput,
      });
    } else {
      const newCat = addCategory({
        name: catNameInput.trim(),
        icon: catIconInput,
        color: catColorInput,
      });
      setSelectedCatId(newCat.id);
    }
    setShowCategoryModal(false);
  };

  const handleDeleteCategory = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا التصنيف وجميع العناصر المخصصة له؟')) {
      deleteCategory(catId);
      if (selectedCatId === catId) {
        setSelectedCatId('ALL');
      }
    }
  };

  // Add Item (Pack or Product) to active category
  const handleAddPackToCategory = (pack: PackEntity) => {
    const targetCatId = selectedCatId === 'ALL' ? categories[0]?.id : selectedCatId;
    if (!targetCatId) {
      alert('يرجى إنشاء تصنيف مفضلة أولاً لاحتواء العبوات');
      return;
    }

    const pieces = Number(
      pack.piecesCount || (Array.isArray(pack.items) && pack.items[0]?.qty) || 1
    );

    addItemToCategory({
      categoryId: targetCatId,
      type: 'pack',
      itemId: pack.id,
      name: pack.name,
      barcode: pack.barcode,
      price: pack.packPrice,
      packQty: pieces,
      packUnit: pack.unitName || 'طرد',
      parentProductId:
        Array.isArray(pack.items) && pack.items.length > 0 ? pack.items[0]?.productId : undefined,
    });
  };

  const handleAddProductToCategory = (prod: Product) => {
    const targetCatId = selectedCatId === 'ALL' ? categories[0]?.id : selectedCatId;
    if (!targetCatId) {
      alert('يرجى إنشاء تصنيف مفضلة أولاً');
      return;
    }

    addItemToCategory({
      categoryId: targetCatId,
      type: 'product',
      itemId: prod.id,
      name: prod.name,
      barcode: prod.barcode,
      price: prod.retailPrice || (prod as any).price || 0,
    });
  };

  // Check if an item is already in the selected category
  const isItemInSelectedCategory = (itemId: string) => {
    const targetCatId = selectedCatId === 'ALL' ? categories[0]?.id : selectedCatId;
    if (!targetCatId) return false;
    return items.some((it) => it.categoryId === targetCatId && it.itemId === itemId);
  };

  // Filter available packs/products for modal
  const filteredAvailablePacks = useMemo(() => {
    const q = itemSearchQuery.toLowerCase().trim();
    if (!q) return packs;
    return packs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [packs, itemSearchQuery]);

  const filteredAvailableProducts = useMemo(() => {
    const q = itemSearchQuery.toLowerCase().trim();
    if (!q) return products.slice(0, 50);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [products, itemSearchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* Header Banner */}
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <Star className="w-8 h-8 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-cairo text-on-surface dark:text-white">
                إدارة المفضلة والعبوات السريعة
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                نقطة البيع · تصميم 5
              </span>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant dark:text-slate-400 mt-1 leading-relaxed">
              قم بإنشاء تصنيفات مخصصة وتصنيف العبوات والباقات بداخلها لتظهر مباشرة كأزرار سريعة في كاشير تصميم 5
            </p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status badge & toggle for Design 5 */}
          <div className="flex items-center gap-2 bg-surface-container dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-outline-variant/20 dark:border-slate-700">
            <Terminal className="w-4 h-4 text-emerald-500" />
            <div className="text-right">
              <span className="text-[11px] font-bold text-on-surface dark:text-slate-300 block">
                عرض تصميم 5:
              </span>
              <span className="text-[10px] text-on-surface-variant dark:text-slate-400">
                {terminalCategoryMode === 'favorites' ? '★ مفعل (المفضلة والعبوات)' : '📦 تصنيفات التجزئة'}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setTerminalCategoryMode(
                  terminalCategoryMode === 'favorites' ? 'products' : 'favorites'
                )
              }
              className={`mr-2 px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                terminalCategoryMode === 'favorites'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              {terminalCategoryMode === 'favorites' ? 'المفضلة نشطة' : 'تفعيل المفضلة'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenNewCategory}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-2xl font-bold text-sm shadow-sm transition active:scale-95 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>تصنيف مفضلة جديد +</span>
          </button>
        </div>
      </div>

      {/* Quick Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-on-surface dark:text-white">
              {categories.length}
            </div>
            <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
              تصنيفات المفضلة
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-on-surface dark:text-white">
              {items.filter((i) => i.type === 'pack').length}
            </div>
            <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
              العبوات المصنفة
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-on-surface dark:text-white">
              {items.length}
            </div>
            <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
              إجمالي الأصناف بالمفضلة
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/15 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black font-mono text-on-surface dark:text-white">
              {packs.length}
            </div>
            <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
              إجمالي العبوات بالمخزن
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Categories List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>تصنيفات المفضلة ({categories.length})</span>
              </span>
              <button
                type="button"
                onClick={handleOpenNewCategory}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {/* "ALL" category */}
              <button
                type="button"
                onClick={() => setSelectedCatId('ALL')}
                className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition cursor-pointer ${
                  selectedCatId === 'ALL'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container dark:bg-slate-800/60 hover:bg-surface-container-high dark:hover:bg-slate-800 text-on-surface dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className={`w-4 h-4 ${selectedCatId === 'ALL' ? 'text-white' : 'text-amber-500'}`} />
                  <span className="text-xs font-bold">جميع الأصناف المفضلة</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedCatId === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {items.length}
                </span>
              </button>

              {/* Dynamic categories */}
              {categories.map((cat) => {
                const isSelected = selectedCatId === cat.id;
                const catItemsCount = items.filter((it) => it.categoryId === cat.id).length;
                const IconComponent = (cat.icon && ICON_MAP[cat.icon]) || Star;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatId(cat.id)}
                    className={`group w-full text-right p-3 rounded-2xl flex items-center justify-between transition cursor-pointer border ${
                      isSelected
                        ? 'border-primary bg-primary text-on-primary font-bold shadow-sm'
                        : 'border-transparent bg-surface-container dark:bg-slate-800/60 hover:border-outline-variant/30 hover:bg-surface-container-high dark:hover:bg-slate-800 text-on-surface dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: cat.color || '#2563eb' }}
                      />
                      <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`} />
                      <span className="text-xs font-bold truncate">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {catItemsCount}
                      </span>

                      {/* Action buttons on category item */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditCategory(cat, e)}
                        className={`p-1 rounded-lg opacity-80 hover:opacity-100 transition ${
                          isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                        }`}
                        title="تعديل التصنيف"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCategory(cat.id, e)}
                        className={`p-1 rounded-lg opacity-80 hover:opacity-100 transition ${
                          isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500'
                        }`}
                        title="حذف التصنيف"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Classified Items in Category */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Top Filter & Actions in Items list */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-on-surface dark:text-white">
                  {selectedCatId === 'ALL' ? 'جميع الأصناف المفضلة' : activeCategory?.name || 'التصنيف المحدد'}
                </span>
                <span className="text-xs text-on-surface-variant dark:text-slate-400">
                  ({displayedItems.length} صنف)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 dark:text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المفضلة..."
                    className="w-full pl-3 pr-9 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (categories.length === 0) {
                      alert('يرجى إضافة تصنيف مفضلة أولاً');
                      return;
                    }
                    setShowAddItemsModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة عبوات للمفضلة +</span>
                </button>
              </div>
            </div>

            {/* Grid of Items */}
            {displayedItems.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Box className="w-8 h-8 stroke-1" />
                </div>
                <h3 className="text-sm font-bold text-on-surface dark:text-white">
                  لا توجد عبوات أو منتجات في هذا التصنيف حالياً
                </h3>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 max-w-sm mx-auto">
                  قم بإضافة العبوات والباقات الترويجية لربطها بهذا التصنيف وظهورها الفوري في كاشير تصميم 5
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddItemsModal(true)}
                  className="mt-2 inline-flex items-center gap-2 bg-primary text-on-primary font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة عبوة الآن</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {displayedItems.map((item) => {
                  const parentCat = categories.find((c) => c.id === item.categoryId);

                  return (
                    <div
                      key={item.id}
                      className="bg-surface-container dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-700/60 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm hover:border-primary/40 transition group"
                    >
                      <div className="space-y-2">
                        {/* Type & Category badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {item.type === 'pack' ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                                <Box className="w-3 h-3" />
                                <span>عبوة جملة (×{item.packQty || 1})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-[10px] flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>منتج تجزئة</span>
                              </span>
                            )}
                          </div>

                          {parentCat && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs truncate max-w-[100px]"
                              style={{ backgroundColor: parentCat.color || '#2563eb' }}
                            >
                              {parentCat.name}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-on-surface dark:text-white leading-snug line-clamp-2">
                          {item.name}
                        </h4>

                        {/* Barcode & unit */}
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant dark:text-slate-400 font-mono">
                          {item.barcode && <span>{item.barcode}</span>}
                          {item.packUnit && (
                            <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[9px] font-sans">
                              {item.packUnit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer: Price & Delete */}
                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 dark:border-slate-700/60">
                        <div className="text-right">
                          <span className="text-sm font-black font-mono text-primary dark:text-blue-400">
                            {formatMoney(item.price)}
                          </span>
                          <span className="text-[10px] text-on-surface-variant dark:text-slate-400 mr-1">د.ج</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItemFromCategory(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="حذف من هذا التصنيف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Add/Edit Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800">
              <h3 className="text-base font-bold font-cairo text-on-surface dark:text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                <span>{editingCategory ? 'تعديل تصنيف المفضلة' : 'إنشاء تصنيف مفضلة جديد'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1.5">
                  اسم التصنيف
                </label>
                <input
                  type="text"
                  required
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  placeholder="مثال: عبوات المشروبات، كراتين المنظفات..."
                  className="w-full px-3.5 py-2.5 bg-surface-container dark:bg-slate-800 border border-outline-variant/30 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Icon selection */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1.5">
                  أيقونة التصنيف
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.keys(ICON_MAP).map((iconKey) => {
                    const IconComp = ICON_MAP[iconKey];
                    const isSelected = catIconInput === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setCatIconInput(iconKey)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary shadow-xs'
                            : 'border-outline-variant/20 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color selection */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1.5">
                  لون وسم التصنيف
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCatColorInput(c.hex)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                        catColorInput === c.hex ? 'scale-115 ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {catColorInput === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/15 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl shadow-xs hover:bg-primary/90 transition cursor-pointer"
                >
                  {editingCategory ? 'حفظ التعديلات' : 'إنشاء التصنيف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Items (Packs & Products) to Category */}
      {showAddItemsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold font-cairo text-on-surface dark:text-white flex items-center gap-2">
                  <Box className="w-5 h-5 text-emerald-600" />
                  <span>إضافة أصناف إلى تصنيف: {activeCategory?.name || categories[0]?.name}</span>
                </h3>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                  اختر العبوات أو الباقات لتظهر فوراً في الشريط السفلي لكاشير تصميم 5
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs & Search */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-surface-container dark:bg-slate-800 p-1 rounded-xl border border-outline-variant/20 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setItemTypeTab('packs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      itemTypeTab === 'packs'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
                    }`}
                  >
                    العبوات والباقات ({packs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeTab('products')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      itemTypeTab === 'products'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
                    }`}
                  >
                    منتجات التجزئة ({products.length})
                  </button>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="بحث في المخزن..."
                    className="w-full pl-3 pr-8 py-1.5 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
              {itemTypeTab === 'packs' ? (
                filteredAvailablePacks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    لم يتم العثور على أي عبوات أو باقات مطابقة
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredAvailablePacks.map((pack) => {
                      const isAdded = isItemInSelectedCategory(pack.id);
                      const pieces = Number(
                        pack.piecesCount || (Array.isArray(pack.items) && pack.items[0]?.qty) || 1
                      );

                      return (
                        <div
                          key={pack.id}
                          className="p-3 bg-surface-container dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[9px]">
                                ×{pieces} قطع
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate">{pack.barcode}</span>
                            </div>
                            <h5 className="text-xs font-bold text-on-surface dark:text-white truncate">
                              {pack.name}
                            </h5>
                            <div className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                              {formatMoney(pack.packPrice)} د.ج
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddPackToCategory(pack)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                              isAdded
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>مضاف</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                filteredAvailableProducts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    لم يتم العثور على أي منتجات مطابقة
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredAvailableProducts.map((prod) => {
                      const isAdded = isItemInSelectedCategory(prod.id);
                      const price = prod.retailPrice || (prod as any).price || 0;

                      return (
                        <div
                          key={prod.id}
                          className="p-3 bg-surface-container dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1">
                            <span className="text-[10px] text-slate-400 font-mono truncate block">{prod.barcode}</span>
                            <h5 className="text-xs font-bold text-on-surface dark:text-white truncate">
                              {prod.name}
                            </h5>
                            <div className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
                              {formatMoney(price)} د.ج
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddProductToCategory(prod)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                              isAdded
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs active:scale-95'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>مضاف</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Modal footer */}
            <div className="pt-3 border-t border-outline-variant/15 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAddItemsModal(false)}
                className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl shadow-xs cursor-pointer"
              >
                إغلاق والعودة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
