// src/features/packs/components/PackCard.tsx
// بطاقة عرض الباقة والحزمة التجارية مع مؤشرات الجاهزية والربحية (AN POS)

import React, { useState } from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { Barcode, Edit2, Trash2, Copy, Check } from 'lucide-react';
import { calculatePackStockReadiness } from '../services/packCalculations';
import { getPackThemeConfig } from './card/PackThemeHelper';
import { PackStockReadinessBadge } from './card/PackStockReadinessBadge';
import { PackFinancialSummary } from './card/PackFinancialSummary';

interface PackCardProps {
  pack: PackEntity;
  products: Product[];
  currencySymbol: string;
  onEdit: (pack: PackEntity) => void;
  onDelete: (packId: string, packName: string) => void;
}

export const PackCard: React.FC<PackCardProps> = ({
  pack,
  products,
  currencySymbol,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);

  let items: any[] = [];
  try {
    items = typeof pack.items === 'string' ? JSON.parse(pack.items) : pack.items || [];
  } catch {
    items = [];
  }

  const price = Number(pack.packPrice ?? pack.pack_price ?? 0);
  const piecesCount =
    pack.piecesCount || items.reduce((a: number, b: any) => a + (b.qty || 0), 0);

  // حساب التكلفة وهامش الربح
  let totalCost = 0;
  let totalRetail = 0;
  for (const it of items) {
    const prod = products.find((p) => p.id === it.productId);
    const cost = Number(prod?.costPrice ?? 0);
    const ret = Number(prod?.retailPrice ?? 0);
    totalCost += cost * (Number(it.qty) || 1);
    totalRetail += ret * (Number(it.qty) || 1);
  }

  const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
  const savings = totalRetail > price ? totalRetail - price : 0;

  // حساب جاهزية التجميع من المخزون
  const readiness = calculatePackStockReadiness(items, products);

  const handleCopyBarcode = () => {
    if (!pack.barcode) return;
    navigator.clipboard.writeText(pack.barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const theme = getPackThemeConfig(pack.packType as any);

  return (
    <div
      className={`relative overflow-hidden bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 group ${theme.cardBorder}`}
    >
      {/* Decorative top gradient accent */}
      <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${theme.gradient}`} />

      <div>
        {/* Header: Name, Status & Type Badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-on-surface font-cairo line-clamp-1 group-hover:text-primary transition-colors">
              {pack.name}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${theme.badgeClass} flex items-center gap-1`}
              >
                {theme.badge}
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded-md">
                {pack.unitName || 'كرتونة'} ({piecesCount} قطعة)
              </span>
            </div>
          </div>

          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
              pack.status !== 'inactive'
                ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                : 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            {pack.status !== 'inactive' ? 'نشطة' : 'معطلة'}
          </span>
        </div>

        {/* Barcode & Copy Button */}
        <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface-container-low/70 border border-outline-variant/15 text-xs text-on-surface-variant mb-3">
          <div className="flex items-center gap-1.5 font-mono truncate">
            <Barcode className="w-3.5 h-3.5 text-on-surface-variant/80 shrink-0" />
            <span className="truncate">{pack.barcode || 'بدون باركود'}</span>
          </div>
          {pack.barcode && (
            <button
              onClick={handleCopyBarcode}
              className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer rounded"
              title="نسخ الباركود"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* جاهزية التجميع من المخزون (Stock Readiness Badge) */}
        <PackStockReadinessBadge readiness={readiness} />

        {/* التسعير والملخص المالي */}
        <PackFinancialSummary
          price={price}
          totalCost={totalCost}
          totalRetail={totalRetail}
          margin={margin}
          savings={savings}
          currencySymbol={currencySymbol}
        />

        {/* Included Items Preview */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[11px] font-bold text-on-surface-variant block font-tajawal">
            الأصناف المشمولة ({items.length}):
          </span>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {items.map((it: any, idx: number) => {
              const p = products.find((pr) => pr.id === it.productId);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-surface-container-low text-on-surface-variant font-tajawal"
                >
                  <span className="truncate flex-1 font-medium">{p?.name || 'صنف غير معروف'}</span>
                  <span className="font-bold font-sans text-[11px] shrink-0 mr-2">
                    ×{it.qty} {p?.unit || 'قطعة'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/20">
        <button
          onClick={() => onEdit(pack)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>تعديل</span>
        </button>

        <button
          onClick={() => onDelete(pack.id, pack.name)}
          className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
          title="حذف العبوة"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
