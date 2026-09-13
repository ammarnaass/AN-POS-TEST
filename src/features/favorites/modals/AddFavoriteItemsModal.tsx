import React, { useState, useMemo } from 'react';
import { Box, X, Search, Plus, Check, Zap } from 'lucide-react';
import { formatMoney } from '@/features/pos/utils/format';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import type { FavoriteCategory } from '../types';

interface AddFavoriteItemsModalProps {
  isOpen: boolean;
  activeCategory?: FavoriteCategory;
  packs: PackEntity[];
  products: Product[];
  onClose: () => void;
  onAddPack: (pack: PackEntity) => void;
  isPackAdded: (packId: string) => boolean;
  onSelectProductForQuickPack: (product: Product) => void;
}

export const AddFavoriteItemsModal: React.FC<AddFavoriteItemsModalProps> = ({
  isOpen,
  activeCategory,
  packs,
  products,
  onClose,
  onAddPack,
  isPackAdded,
  onSelectProductForQuickPack,
}) => {
  const [itemTypeTab, setItemTypeTab] = useState<'packs' | 'products'>('packs');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const filteredPacks = useMemo(() => {
    const q = itemSearchQuery.toLowerCase().trim();
    if (!q) return packs;
    return packs.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [packs, itemSearchQuery]);

  const filteredProducts = useMemo(() => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-tajawal">
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-base font-bold font-cairo text-on-surface dark:text-white flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-600" />
              <span>إضافة أصناف إلى تصنيف: {activeCategory?.name || 'التصنيف المختار'}</span>
            </h3>
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">
              اختر العبوات أو الباقات لتظهر فوراً في الشريط السفلي لكاشير تصميم 5
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
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
                العبوات والباقات بالمخزن ({packs.length})
              </button>
              <button
                type="button"
                onClick={() => setItemTypeTab('products')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  itemTypeTab === 'products'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
                }`}
              >
                تحويل منتج إلى كرتونة ⚡ ({products.length})
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                placeholder="بحث في المخزن..."
                className="w-full pl-3 pr-8 py-1.5 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary font-tajawal"
              />
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
          {itemTypeTab === 'packs' ? (
            filteredPacks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                لم يتم العثور على أي عبوات أو باقات مطابقة
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredPacks.map((pack) => {
                  const isAdded = isPackAdded(pack.id);
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
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {pack.barcode}
                          </span>
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
                        onClick={() => onAddPack(pack)}
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
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              لم يتم العثور على أي منتجات مطابقة
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredProducts.map((prod) => {
                const price = Number(prod.retailPrice || (prod as any).price || 0);

                return (
                  <div
                    key={prod.id}
                    className="p-3 bg-surface-container dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono truncate block">
                        {prod.barcode}
                      </span>
                      <h5 className="text-xs font-bold text-on-surface dark:text-white truncate">
                        {prod.name}
                      </h5>
                      <div className="text-xs font-black font-mono text-slate-700 dark:text-slate-300">
                        سعر الحبة: {formatMoney(price)} د.ج
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectProductForQuickPack(prod)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95 cursor-pointer"
                        title="تحديد عدد القطع وإنشاء كرتونة سريعة للمفضلة"
                      >
                        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>⚡ تحويل إلى كرتونة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="pt-3 border-t border-outline-variant/15 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl shadow-xs cursor-pointer"
          >
            إغلاق والعودة
          </button>
        </div>
      </div>
    </div>
  );
};
