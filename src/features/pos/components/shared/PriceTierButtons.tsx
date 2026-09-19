import React from 'react';
import { Layers, Tag } from 'lucide-react';

export type PriceTier = '1' | '2' | '3' | '4';

export interface PriceTierInfo {
  id: PriceTier;
  shortLabel: string;
  name: string;
  badge: string;
  shortcut: string;
  isWholesale?: boolean;
}

export const PRICE_TIERS_CONFIG: PriceTierInfo[] = [
  { id: '1', shortLabel: 'س1', name: 'تجزئة', badge: 'P1', shortcut: 'Alt+1' },
  { id: '2', shortLabel: 'س2', name: 'نصف جملة', badge: 'P2', shortcut: 'Alt+2' },
  { id: '3', shortLabel: 'س3', name: 'جملة', badge: 'P3', shortcut: 'Alt+3', isWholesale: true },
  { id: '4', shortLabel: 'س4', name: 'خاص', badge: 'P4', shortcut: 'Alt+4' },
];

export interface PriceTierButtonsProps {
  activeTier: PriceTier;
  onSelectTier: (tier: PriceTier) => void;
  /** أسعار كل مستوى للمنتج/السطر الحالي عند استخدام نمط السلة (row) */
  tierPrices?: {
    p1?: number;
    p2?: number;
    p3?: number;
    p4?: number;
  };
  /** نمط العرض للزر */
  variant?: 'compact' | 'topbar' | 'row' | 'ribbon' | 'cycle';
  formatMoney?: (val?: number | null) => string;
  className?: string;
  disabled?: boolean;
  showShortcuts?: boolean;
}

const defaultFormatMoney = (val?: number | null) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PriceTierButtons: React.FC<PriceTierButtonsProps> = ({
  activeTier,
  onSelectTier,
  tierPrices,
  variant = 'compact',
  formatMoney = defaultFormatMoney,
  className = '',
  disabled = false,
  showShortcuts = true,
}) => {
  // 1. نمط السطور داخل السلة (Cart Table Row Variant)
  if (variant === 'row') {
    return (
      <div className={`inline-flex items-center gap-1 flex-wrap ${className}`} role="group" aria-label="مستويات الأسعار للصنف">
        {PRICE_TIERS_CONFIG.map((tier) => {
          const price = tierPrices?.[`p${tier.id}` as keyof typeof tierPrices];
          if (price === undefined || price === null || price <= 0) return null;
          const isSelected = activeTier === tier.id;

          const colorClasses = {
            '1': isSelected
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-300',
            '2': isSelected
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-700 dark:text-slate-300',
            '3': isSelected
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-slate-300',
            '4': isSelected
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-slate-700 dark:text-slate-300',
          }[tier.id];

          return (
            <button
              key={tier.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTier(tier.id)}
              aria-pressed={isSelected}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition cursor-pointer active:scale-95 disabled:opacity-40 ${colorClasses}`}
              title={`${tier.shortLabel} (${tier.name}): ${formatMoney(price)}`}
            >
              <span>{tier.shortLabel}:</span>
              <span className="mr-0.5">{formatMoney(price)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. نمط شريط التصميم 7 المريح (Ribbon Variant for Design 7)
  if (variant === 'ribbon') {
    return (
      <div
        className={`flex items-center bg-white/80 border border-[#9eb0c2] rounded p-0.5 gap-0.5 h-10 sm:h-11 md:h-12 shrink-0 shadow-2xs ${className}`}
        role="group"
        aria-label="مستويات الأسعار"
      >
        {PRICE_TIERS_CONFIG.map((t) => {
          const isActive = activeTier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTier(t.id)}
              aria-pressed={isActive}
              className={`h-full px-1.5 sm:px-2 rounded flex flex-col items-center justify-center transition-all cursor-pointer select-none text-center active:scale-95 disabled:opacity-40 ${
                isActive
                  ? t.isWholesale
                    ? 'bg-gradient-to-b from-purple-700 to-indigo-800 text-white shadow font-extrabold border border-purple-400/60'
                    : 'bg-gradient-to-b from-teal-600 to-emerald-700 text-white shadow font-bold border border-emerald-400/50'
                  : 'hover:bg-slate-100 text-slate-700 font-semibold'
              }`}
              title={`${t.shortLabel} (${t.name}) - ${t.isWholesale ? 'فاتورة جملة مخصصة' : 'فاتورة بيع عادية'} (${t.shortcut})`}
            >
              <div className="flex items-center gap-0.5 text-[10px] sm:text-[11px] leading-tight font-black">
                <span>{t.shortLabel}</span>
                <span className="text-[9px] sm:text-[10px] opacity-90">({t.name})</span>
              </div>
              {showShortcuts && (
                <span
                  className={`text-[8px] font-mono leading-tight px-1 rounded mt-0.5 ${
                    isActive ? 'bg-black/30 text-white' : 'text-slate-500 bg-slate-200/80'
                  }`}
                >
                  {t.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // 3. نمط الشريط العلوي الممتد (Topbar Variant for POSTopBar)
  if (variant === 'topbar') {
    const colorMap = {
      '1': {
        active: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30',
        idle: 'bg-surface-container/70 hover:bg-emerald-500/10 text-on-surface-variant hover:text-emerald-700 dark:hover:text-emerald-300 border-outline-variant/30 hover:border-emerald-500/50',
      },
      '2': {
        active: 'bg-gradient-to-r from-sky-500 to-cyan-600 text-white border-sky-400 shadow-md ring-2 ring-sky-400/30',
        idle: 'bg-surface-container/70 hover:bg-sky-500/10 text-on-surface-variant hover:text-sky-700 dark:hover:text-sky-300 border-outline-variant/30 hover:border-sky-500/50',
      },
      '3': {
        active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md ring-2 ring-blue-500/30',
        idle: 'bg-surface-container/70 hover:bg-blue-500/10 text-on-surface-variant hover:text-blue-700 dark:hover:text-blue-300 border-outline-variant/30 hover:border-blue-500/50',
      },
      '4': {
        active: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-500 shadow-md ring-2 ring-violet-500/30',
        idle: 'bg-surface-container/70 hover:bg-violet-500/10 text-on-surface-variant hover:text-violet-700 dark:hover:text-violet-300 border-outline-variant/30 hover:border-violet-500/50',
      },
    };

    return (
      <div className={`flex items-center gap-1 shrink-0 ${className}`} role="group" aria-label="مستويات الأسعار">
        {PRICE_TIERS_CONFIG.map(({ id, name, badge }) => {
          const isActive = activeTier === id;
          const colors = colorMap[id];
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTier(id)}
              aria-pressed={isActive}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0 disabled:opacity-40 ${
                isActive ? colors.active : colors.idle
              }`}
              title={`تطبيق سعر ${name} على السلة (${id})`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="font-cairo font-extrabold hidden lg:inline">{name}</span>
              <span className={`px-1 py-0.5 rounded text-[9px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                {badge}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // 4. نمط التبديل الدائري الفردي (Cycle Variant for compact headers / Design 6)
  if (variant === 'cycle') {
    const current = PRICE_TIERS_CONFIG.find((t) => t.id === activeTier) || PRICE_TIERS_CONFIG[0];
    const handleNext = () => {
      const idx = PRICE_TIERS_CONFIG.findIndex((t) => t.id === activeTier);
      const nextIdx = (idx + 1) % PRICE_TIERS_CONFIG.length;
      onSelectTier(PRICE_TIERS_CONFIG[nextIdx].id);
    };

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handleNext}
        className={`${
          activeTier === '3'
            ? 'bg-gradient-to-b from-purple-600 to-indigo-700 border-purple-400/60 ring-1 ring-purple-300/50'
            : 'bg-[#0f766e] hover:bg-[#115e59] border-teal-400/30'
        } active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border ${className}`}
        title="تبديل فئات الأسعار (تجزئة / نصف جملة / جملة / خاص)"
      >
        <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
          <Tag className="w-3 h-3" />
          <span>{current.shortLabel} ({current.name})</span>
        </div>
        <span className="text-[9px] font-mono text-teal-200 mt-0.5 font-bold">
          {current.shortcut}
        </span>
      </button>
    );
  }

  // 5. النمط المضغوط الافتراضي (Compact Pill Variant for Classic POS etc.)
  const colorMap = {
    '1': {
      active: 'bg-blue-600 text-white shadow-xs',
      dotActive: 'bg-white',
      dotIdle: 'bg-blue-500',
    },
    '2': {
      active: 'bg-emerald-600 text-white shadow-xs',
      dotActive: 'bg-white',
      dotIdle: 'bg-emerald-500',
    },
    '3': {
      active: 'bg-purple-600 text-white shadow-xs',
      dotActive: 'bg-white',
      dotIdle: 'bg-purple-500',
    },
    '4': {
      active: 'bg-amber-600 text-white shadow-xs',
      dotActive: 'bg-white',
      dotIdle: 'bg-amber-500',
    },
  };

  return (
    <div
      className={`flex items-center bg-surface-container border border-outline-variant/20 rounded-xl p-0.5 gap-0.5 shrink-0 text-xs font-bold h-10 ${className}`}
      role="group"
      aria-label="مستويات الأسعار"
    >
      {PRICE_TIERS_CONFIG.map((tier) => {
        const isActive = activeTier === tier.id;
        const color = colorMap[tier.id];
        return (
          <button
            key={tier.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectTier(tier.id)}
            aria-pressed={isActive}
            className={`h-8.5 px-2 rounded-lg flex items-center gap-1 transition cursor-pointer text-xs font-bold active:scale-95 disabled:opacity-40 ${
              isActive
                ? color.active
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
            title={`سعر ${tier.name} ${tier.shortLabel} (${tier.shortcut})`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? color.dotActive : color.dotIdle}`} />
            <span>{tier.shortLabel} {tier.id === '1' || tier.id === '3' ? `(${tier.name})` : ''}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PriceTierButtons;
