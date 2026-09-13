import React from 'react';
import { SlidersHorizontal, Plus, Minus } from 'lucide-react';
import type { PrintOptions, LabelSize } from '../types';
import { LABEL_SIZES, BARCODE_FORMATS } from '../constants/labelConfigs';

interface LabelConfiguratorPanelProps {
  opts: PrintOptions;
  labelSize: LabelSize;
  onUpdateOpts: (partial: Partial<PrintOptions>) => void;
}

export const LabelConfiguratorPanel: React.FC<LabelConfiguratorPanelProps> = ({
  opts,
  labelSize,
  onUpdateOpts,
}) => {
  return (
    <div className="lg:col-span-4 bg-surface-container rounded-2xl border border-outline-variant/20 p-4 space-y-4 shadow-sm no-print overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
        <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          تخصيص وإعدادات الملصق
        </span>
        <span className="text-[11px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-lg">
          {labelSize.label} mm
        </span>
      </div>

      {/* 1. 10 Label Sizes Palette */}
      <div>
        <label className="block text-xs font-bold text-on-surface mb-2">
          1. حجم الملصق (10 أحجام جاهزة)
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {LABEL_SIZES.map((ls) => {
            const isSelected = opts.labelSizeId === ls.id;
            return (
              <button
                key={ls.id}
                onClick={() => onUpdateOpts({ labelSizeId: ls.id })}
                className={`py-2 px-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-on-primary border-primary shadow-sm font-bold'
                    : 'bg-surface-container-high/60 border-outline-variant/20 text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{ls.label}</span>
                  <span
                    className={`text-[10px] ${
                      isSelected ? 'text-white/80' : 'text-on-surface-variant'
                    }`}
                  >
                    {ls.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 6 Barcode Formats Palette */}
      <div>
        <label className="block text-xs font-bold text-on-surface mb-2">
          2. نوع وترميز الباركود (6 أنواع)
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {BARCODE_FORMATS.map((fmt) => {
            const isSelected = opts.barcodeFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => onUpdateOpts({ barcodeFormat: fmt.id })}
                className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                    : 'bg-surface-container-high/60 border-outline-variant/20 text-on-surface hover:bg-surface-container-highest'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{fmt.name}</span>
                  {fmt.is2D && (
                    <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 text-[9px] font-bold">
                      2D QR
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{fmt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Barcode Source Mode */}
      <div>
        <label className="block text-xs font-bold text-on-surface mb-1.5">
          3. مصدر وقيمة الباركود
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-high/60 rounded-xl border border-outline-variant/20">
          {[
            { id: 'product', label: 'المسجل' },
            { id: 'random', label: 'عشوائي' },
            { id: 'manual', label: 'يدوي' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => onUpdateOpts({ entryMode: m.id as any })}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                opts.entryMode === m.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {opts.entryMode === 'manual' && (
          <input
            type="text"
            value={opts.manualBarcode}
            onChange={(e) => onUpdateOpts({ manualBarcode: e.target.value })}
            placeholder="أدخل نص الباركود المخصص هنا..."
            className="w-full h-9 mt-2 px-3 bg-surface-container-high rounded-xl text-xs text-on-surface border border-outline-variant/30 font-mono focus:border-primary font-tajawal"
          />
        )}
      </div>

      {/* 4. Copies Stepper */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-bold text-on-surface">4. عدد النسخ لكل منتج</label>
          <div className="flex items-center gap-1">
            {[1, 5, 10, 20].map((preset) => (
              <button
                key={preset}
                onClick={() => onUpdateOpts({ copies: preset })}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  opts.copies === preset
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                ×{preset}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateOpts({ copies: Math.max(1, opts.copies - 1) })}
            className="w-9 h-9 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 bg-surface-container-high/60 border border-outline-variant/20 rounded-xl h-9 flex items-center justify-center font-bold text-sm text-on-surface font-mono">
            {opts.copies} {opts.copies === 1 ? 'نسخة' : 'نسخ'}
          </div>
          <button
            onClick={() => onUpdateOpts({ copies: Math.min(100, opts.copies + 1) })}
            className="w-9 h-9 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5. Label Content Element Toggles */}
      <div className="space-y-2 pt-2 border-t border-outline-variant/15">
        <label className="block text-xs font-bold text-on-surface mb-1">
          5. العناصر الظاهرة في الملصق
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: 'showCompany' as const, label: 'اسم المتجر' },
            { k: 'showProduct' as const, label: 'اسم المنتج' },
            { k: 'showPrice' as const, label: 'عرض السعر' },
            { k: 'enlargePrice' as const, label: 'تكبير السعر' },
            { k: 'showBarcode' as const, label: 'رقم الباركود' },
            { k: 'showSku' as const, label: 'رمز SKU' },
            { k: 'showBorder' as const, label: 'حدود القص' },
          ].map((item) => {
            const active = Boolean((opts as any)[item.k]);
            return (
              <label
                key={item.k}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  active
                    ? 'bg-primary/5 border-primary/40 text-on-surface'
                    : 'bg-surface-container-high/40 border-outline-variant/15 text-on-surface-variant'
                }`}
              >
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => onUpdateOpts({ [item.k]: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
