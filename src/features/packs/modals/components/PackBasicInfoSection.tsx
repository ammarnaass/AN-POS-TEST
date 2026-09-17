// src/features/packs/modals/components/PackBasicInfoSection.tsx
// حقول الاسم والباركود الموحد وتوليد باركود EAN-13 للباقة (AN POS)

import React from 'react';
import { Barcode } from 'lucide-react';

interface PackBasicInfoSectionProps {
  packName: string;
  setPackName: (name: string) => void;
  packBarcode: string;
  setPackBarcode: (barcode: string) => void;
  onGenerateBarcode: () => void;
}

export const PackBasicInfoSection: React.FC<PackBasicInfoSectionProps> = ({
  packName,
  setPackName,
  packBarcode,
  setPackBarcode,
  onGenerateBarcode,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      <div>
        <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
          اسم الباقة / الحزمة <span className="text-error">*</span>
        </label>
        <input
          type="text"
          placeholder="مثال: باقة رمضان للتوفير، أو كرتونة زيت 12 حبة"
          value={packName}
          onChange={(e) => setPackName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm focus:outline-none focus:border-primary font-tajawal font-medium"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
          الباركود الموحد للعبوة
        </label>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="امسح أو ولّد باركود..."
              value={packBarcode}
              onChange={(e) => setPackBarcode(e.target.value)}
              className="w-full pl-3 pr-9 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={onGenerateBarcode}
            className="px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/40 text-xs font-bold hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer"
            title="توليد باركود EAN-13 معتمد"
          >
            توليد EAN-13
          </button>
        </div>
      </div>
    </div>
  );
};
