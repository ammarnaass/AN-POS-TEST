// src/features/packs/modals/components/PackTypeSelector.tsx
// محدد نوع الباقة التجارية ووحدة التعبئة والحد الأدنى للطلب (AN POS)

import React from 'react';
import { Gift, Box, ShoppingBag } from 'lucide-react';
import type { PackType } from '../../types';

interface PackTypeSelectorProps {
  packType: PackType;
  setPackType: (type: PackType) => void;
  unitName: string;
  setUnitName: (unit: string) => void;
  minWholesaleQty: string;
  setMinWholesaleQty: (qty: string) => void;
}

const QUICK_UNITS = ['كرتونة', 'باقة', 'طرد', 'صندوق', 'دزينة', 'حزمة', 'كيس'];

export const PackTypeSelector: React.FC<PackTypeSelectorProps> = ({
  packType,
  setPackType,
  unitName,
  setUnitName,
  minWholesaleQty,
  setMinWholesaleQty,
}) => {
  return (
    <div className="space-y-3 bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/25">
      <label className="block text-xs font-bold text-on-surface font-tajawal">
        نوع الباقة والغرض التجاري:
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setPackType('bundle')}
          className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
            packType === 'bundle'
              ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-xs ring-2 ring-purple-500/20'
              : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-xs font-cairo">
            <Gift className="w-4 h-4" />
            <span>باقة وحزمة مجمعة</span>
          </div>
          <span className="text-[10px] opacity-80 font-tajawal">
            حزمة أصناف متنوعة بسعر ترويجي موحد
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPackType('wholesale')}
          className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
            packType === 'wholesale'
              ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-xs ring-2 ring-blue-500/20'
              : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-xs font-cairo">
            <Box className="w-4 h-4" />
            <span>طرد كرتونة جملة</span>
          </div>
          <span className="text-[10px] opacity-80 font-tajawal">
            تعبئة كرتونة/طرد تجاري لصنف واحد
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPackType('half_wholesale')}
          className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
            packType === 'half_wholesale'
              ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs ring-2 ring-amber-500/20'
              : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-xs font-cairo">
            <ShoppingBag className="w-4 h-4" />
            <span>نصف جملة</span>
          </div>
          <span className="text-[10px] opacity-80 font-tajawal">
            دزينة أو حزمة مصغرة لتجار التجزئة
          </span>
        </button>
      </div>

      {/* تفاصيل وحدة التعبئة والحد الأدنى */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-outline-variant/20">
        <div>
          <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
            وحدة التعبئة (كرتونة، باقة، صندوق...)
          </label>
          <input
            type="text"
            placeholder="كرتونة"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
            className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs focus:outline-none focus:border-primary"
          />
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {QUICK_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitName(u)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                  unitName === u
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
            الحد الأدنى لطلب الجملة
          </label>
          <input
            type="number"
            min="1"
            placeholder="1"
            value={minWholesaleQty}
            onChange={(e) => setMinWholesaleQty(e.target.value)}
            className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs focus:outline-none focus:border-primary"
          />
          <span className="text-[10px] text-on-surface-variant mt-1 block font-tajawal">
            الحد الأدنى للعبوات لتطبيق هذا السعر
          </span>
        </div>
      </div>
    </div>
  );
};
