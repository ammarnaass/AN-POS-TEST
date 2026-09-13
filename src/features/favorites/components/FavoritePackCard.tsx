import React from 'react';
import { Box, Edit2, Trash2 } from 'lucide-react';
import { formatMoney } from '@/features/pos/utils/format';
import type { FavoriteItem, FavoriteCategory } from '../types';

interface FavoritePackCardProps {
  item: FavoriteItem;
  parentCat?: FavoriteCategory;
  onOpenEditPack: (item: FavoriteItem) => void;
  onRemoveItem: (id: string) => void;
}

export const FavoritePackCard: React.FC<FavoritePackCardProps> = ({
  item,
  parentCat,
  onOpenEditPack,
  onRemoveItem,
}) => {
  return (
    <div className="bg-surface-container dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-700/60 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm hover:border-primary/40 transition group">
      <div className="space-y-2">
        {/* Type & Category badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
              <Box className="w-3 h-3" />
              <span>
                عبوة / كرتونة (×{item.packQty || 1} {item.packUnit || 'قطعة'})
              </span>
            </span>
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

      {/* Footer: Price, Edit & Delete */}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 dark:border-slate-700/60">
        <div className="text-right">
          <span className="text-sm font-black font-mono text-primary dark:text-blue-400">
            {formatMoney(item.price)}
          </span>
          <span className="text-[10px] text-on-surface-variant dark:text-slate-400 mr-1">د.ج</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenEditPack(item)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
            title="تعديل بيانات وسعر العبوة"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onRemoveItem(item.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
            title="حذف من هذا التصنيف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
