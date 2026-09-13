import React, { useState } from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { Barcode, Edit2, Trash2, Copy, Check, Sparkles, Box, ShoppingBag, Gift, Layers } from 'lucide-react';
import { formatPackMoney, calculatePackStockReadiness } from '../services/packCalculations';

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

  // ثيم البطاقة حسب نوع الباقة
  const getThemeConfig = () => {
    if (pack.packType === 'bundle') {
      return {
        badge: '🎁 باقة وحزمة مجمعة',
        badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
        cardBorder: 'hover:border-purple-500/40',
        icon: Gift,
        gradient: 'from-purple-500/10 to-transparent',
      };
    }
    if (pack.packType === 'half_wholesale') {
      return {
        badge: '🛍️ نصف جملة',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        cardBorder: 'hover:border-amber-500/40',
        icon: ShoppingBag,
        gradient: 'from-amber-500/10 to-transparent',
      };
    }
    return {
      badge: '📦 طرد كرتونة جملة',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
      cardBorder: 'hover:border-blue-500/40',
      icon: Box,
      gradient: 'from-blue-500/10 to-transparent',
    };
  };

  const theme = getThemeConfig();

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
        <div className="mb-3">
          {readiness.availablePacks > 5 ? (
            <div className="flex items-center justify-between text-[11px] font-bold px-2.5 py-1 rounded-lg bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                جاهز للتجميع من المخزون
              </span>
              <span>{readiness.availablePacks} عبوة متوفرة</span>
            </div>
          ) : readiness.availablePacks > 0 ? (
            <div className="flex items-center justify-between text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <span>⚠️ رصيد التجميع منخفض</span>
              <span>{readiness.availablePacks} عبوة فقط</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 truncate">
              <span>❌ غير جاهز (نفد مخزون مكون)</span>
              {readiness.bottleneckProductName && (
                <span className="text-[10px] truncate max-w-[120px]">
                  ({readiness.bottleneckProductName})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Included Items Summary */}
        <div className="bg-surface-container-low/50 rounded-xl p-3 border border-outline-variant/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-on-surface-variant">
              محتويات الباقة ({items.length} صنف):
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">
              التكلفة: {formatPackMoney(totalCost)} {currencySymbol}
            </span>
          </div>

          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
            {items.map((it: any, idx: number) => {
              const prod = products.find((p) => p.id === it.productId);
              const prodName = it.name || prod?.name || 'منتج غير معروف';
              const stock = prod?.quantity ?? 0;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs text-on-surface bg-surface-container-lowest/80 px-2 py-1.5 rounded-lg border border-outline-variant/10"
                >
                  <div className="truncate flex-1 pl-2">
                    <span className="font-medium block truncate">{prodName}</span>
                    <span className="text-[10px] text-on-surface-variant">
                      مخزون الصنف: {stock}
                    </span>
                  </div>
                  <span className="font-bold shrink-0 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[11px] font-sans">
                    × {it.qty}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / Price, Margins & Actions */}
      <div className="mt-4 pt-3.5 border-t border-outline-variant/20">
        <div className="flex items-end justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-on-surface-variant">سعر بيع الباقة:</span>
              {savings > 0 && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.2 rounded">
                  توفير {formatPackMoney(savings)} {currencySymbol}
                </span>
              )}
            </div>
            <span className="text-xl font-black text-primary font-cairo block mt-0.5">
              {formatPackMoney(price)} {currencySymbol}
            </span>
          </div>

          <div className="text-left">
            <span className="text-[10px] text-on-surface-variant block">هامش الربح:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                margin >= 20
                  ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                  : margin > 0
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
              }`}
            >
              {margin.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/10">
          <button
            onClick={() => onEdit(pack)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-outline-variant/40 text-on-surface hover:bg-surface-container-high hover:text-primary transition-all text-xs font-bold cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>تعديل الباقة</span>
          </button>
          <button
            onClick={() => onDelete(pack.id, pack.name)}
            className="p-2 rounded-xl border border-outline-variant/40 text-error hover:bg-error/10 hover:border-error/30 transition-all cursor-pointer"
            title="حذف الباقة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
