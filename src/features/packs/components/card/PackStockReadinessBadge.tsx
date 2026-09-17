// src/features/packs/components/card/PackStockReadinessBadge.tsx
// مؤشر تتبع جاهزية تجميع الباقة من المخزون وتحديد الصنف الحرج (AN POS)

import React from 'react';
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Product } from '@/types';

interface PackStockReadinessBadgeProps {
  readiness: {
    availablePacks: number;
    bottleneckProduct: Product | null;
    isReady: boolean;
  };
}

export const PackStockReadinessBadge: React.FC<PackStockReadinessBadgeProps> = ({
  readiness,
}) => {
  const { availablePacks, bottleneckProduct } = readiness;

  return (
    <div className="mb-3">
      {availablePacks > 5 ? (
        <div className="py-1.5 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>جاهز للتجميع:</span>
          </div>
          <span>متوفر {availablePacks} باقة فوراً من المخزون</span>
        </div>
      ) : availablePacks > 0 ? (
        <div className="py-1.5 px-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>مخزون محدود:</span>
          </div>
          <span>
            متوفر {availablePacks} باقة فقط
            {bottleneckProduct && (
              <span className="opacity-80 text-[10px] mr-1">
                ({bottleneckProduct.name})
              </span>
            )}
          </span>
        </div>
      ) : (
        <div className="py-1.5 px-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>غير متوفر:</span>
          </div>
          <span>
            نفاد مخزون الأصناف المكونة
            {bottleneckProduct && (
              <span className="opacity-80 text-[10px] mr-1">
                ({bottleneckProduct.name})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};
