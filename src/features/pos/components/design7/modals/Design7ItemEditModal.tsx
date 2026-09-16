import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Check, DollarSign, Hash, Calculator, Plus, Delete, Tag, Percent } from 'lucide-react';
import type { CartItem } from '@/types';

export interface Design7ItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  mode?: 'qty' | 'price' | 'paid' | 'discount';
  totalAmount?: number;
  paidAmount?: number;
  discountAmount?: number;
  onUpdateQty: (productId: string, newQty: number) => void;
  onUpdatePrice?: (productId: string, newPrice: number) => void;
  onUpdatePaid?: (newPaid: number) => void;
  onUpdateDiscount?: (newDiscount: number) => void;
  formatMoney: (val?: number | null) => string;
  currency?: string;
}

export const Design7ItemEditModal: React.FC<Design7ItemEditModalProps> = ({
  isOpen,
  onClose,
  item,
  mode: initialMode = 'qty',
  totalAmount = 0,
  paidAmount = 0,
  discountAmount = 0,
  onUpdateQty,
  onUpdatePrice,
  onUpdatePaid,
  onUpdateDiscount,
  formatMoney,
  currency = 'DA',
}) => {
  const [activeMode, setActiveMode] = useState<'qty' | 'price' | 'paid' | 'discount'>(
    initialMode || 'qty'
  );
  const [val, setVal] = useState<string>('1');

  // Synchronize mode with initialMode prop when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode || 'qty');
    }
  }, [isOpen, initialMode]);

  // Synchronize initial value based on active mode
  useEffect(() => {
    if (!isOpen) return;

    if (activeMode === 'qty') {
      const q = item ? (item.qty ?? (item as any).quantity ?? 1) : 1;
      setVal(String(q));
    } else if (activeMode === 'price') {
      const p = item ? (item.unitPrice ?? (item as any).price ?? 0) : 0;
      setVal(String(p));
    } else if (activeMode === 'paid') {
      setVal(paidAmount > 0 ? String(paidAmount) : totalAmount > 0 ? String(totalAmount) : '');
    } else if (activeMode === 'discount') {
      setVal(discountAmount > 0 ? String(discountAmount) : '');
    }
  }, [isOpen, activeMode, item, totalAmount, paidAmount, discountAmount]);

  const numVal = useMemo(() => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }, [val]);

  // Live calculation equations
  const liveCalculation = useMemo(() => {
    const currentPrice = item ? (item.unitPrice ?? (item as any).price ?? 0) : 0;
    const currentQty = item ? (item.qty ?? (item as any).quantity ?? 1) : 1;

    if (activeMode === 'qty') {
      const lineTotal = numVal * currentPrice;
      return {
        equation: `${numVal} × ${formatMoney(currentPrice)}`,
        total: formatMoney(lineTotal),
        label: 'إجمالي السطر:',
      };
    } else if (activeMode === 'price') {
      const lineTotal = numVal * currentQty;
      return {
        equation: `${formatMoney(numVal)} × ${currentQty}`,
        total: formatMoney(lineTotal),
        label: 'إجمالي السطر:',
      };
    } else if (activeMode === 'paid') {
      const diff = numVal - totalAmount;
      if (diff >= 0) {
        return {
          equation: `المدفوع: ${formatMoney(numVal)} - الإجمالي: ${formatMoney(totalAmount)}`,
          total: `+${formatMoney(diff)}`,
          label: 'الباقي للزبون (الفكة):',
          isPositive: true,
        };
      } else {
        return {
          equation: `الإجمالي: ${formatMoney(totalAmount)} - المدفوع: ${formatMoney(numVal)}`,
          total: formatMoney(Math.abs(diff)),
          label: 'المتبقي للدفع:',
          isPositive: false,
        };
      }
    } else {
      const netTotal = Math.max(0, totalAmount - numVal);
      return {
        equation: `الإجمالي: ${formatMoney(totalAmount)} - الخصم: ${formatMoney(numVal)}`,
        total: formatMoney(netTotal),
        label: 'الصافي بعد الخصم:',
      };
    }
  }, [item, activeMode, numVal, totalAmount, formatMoney]);

  const handleSubmit = useCallback(() => {
    if (numVal < 0) return;

    if (activeMode === 'qty' && item) {
      if (numVal > 0) onUpdateQty(item.productId, numVal);
    } else if (activeMode === 'price' && item) {
      if (onUpdatePrice && numVal >= 0) onUpdatePrice(item.productId, numVal);
    } else if (activeMode === 'paid') {
      if (onUpdatePaid) onUpdatePaid(numVal);
    } else if (activeMode === 'discount') {
      if (onUpdateDiscount) onUpdateDiscount(numVal);
    }
    onClose();
  }, [activeMode, item, numVal, onUpdateQty, onUpdatePrice, onUpdatePaid, onUpdateDiscount, onClose]);

  const handleNumpadClick = useCallback((key: string) => {
    if (key === 'C') {
      setVal('');
    } else if (key === 'DEL') {
      setVal((prev) => (prev.length > 1 ? prev.slice(0, -1) : ''));
    } else if (key === '.') {
      setVal((prev) => {
        if (prev.includes('.')) return prev;
        return prev ? prev + '.' : '0.';
      });
    } else if (key === '00') {
      setVal((prev) => {
        if (!prev || prev === '0') return '0';
        return prev + '00';
      });
    } else {
      setVal((prev) => {
        if (prev === '0') return key;
        return prev + key;
      });
    }
  }, []);

  // Keyboard shortcut listener for touch calculator
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumpadClick(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleNumpadClick('.');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleNumpadClick('DEL');
      } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleNumpadClick('C');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActiveMode((prev) => {
          if (prev === 'qty') return 'price';
          if (prev === 'price') return 'paid';
          if (prev === 'paid') return 'discount';
          return 'qty';
        });
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen, handleSubmit, handleNumpadClick]);

  const handleQuickAddQty = (add: number) => {
    const current = parseFloat(val) || 0;
    setVal(String(Math.max(1, current + add)));
  };

  const handlePresetVal = (preset: number) => {
    setVal(String(preset));
  };

  if (!isOpen) return null;

  const itemName = item
    ? item.name || (item as any).productName || 'مادة بدون اسم'
    : 'فاتورة المبيعات الحالية';
  const itemBarcode = item?.barcode || 'بدون باركود';
  const currentQty = item ? (item.qty ?? (item as any).quantity ?? 1) : 1;
  const currentUnitPrice = item ? (item.unitPrice ?? (item as any).price ?? 0) : 0;

  const targetTitles = {
    qty: {
      label: 'تعديل كمية الصنف',
      icon: <Hash className="w-4 h-4" />,
      badge: 'd7-pill-gloss-cyan',
      unit: 'قطع',
    },
    price: {
      label: 'تعديل سعر الوحدة',
      icon: <Tag className="w-4 h-4" />,
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      unit: `${currency}`,
    },
    paid: {
      label: 'المبلغ المستلم',
      icon: <DollarSign className="w-4 h-4" />,
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      unit: `${currency}`,
    },
    discount: {
      label: 'تخفيض القيمة',
      icon: <Percent className="w-4 h-4" />,
      badge: 'bg-purple-100 text-purple-900 border-purple-300',
      unit: `${currency}`,
    },
  };

  const currentMeta = targetTitles[activeMode] || targetTitles.qty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 select-none">
      <div
        className="w-full max-w-lg bg-[#e6ecf2] border-2 border-[#54606e] rounded-lg shadow-2xl flex flex-col overflow-hidden text-slate-800"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon (Classic Design 7 Glossy Style) */}
        <div className="px-4 py-2.5 bg-gradient-to-b from-[#e3e8ee] to-[#cad3de] border-b border-[#9ba8b7] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded d7-glossy-action-tile flex items-center justify-center text-sky-700 shadow-xs">
              <Calculator className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span>لوحة الأرقام والآلة الحاسبة اللمسية</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${currentMeta.badge}`}>
                  {currentMeta.label}
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 truncate max-w-[280px]">
                {item ? itemName : `إجمالي الفاتورة: ${formatMoney(totalAmount)}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded d7-glossy-top-btn text-slate-600 hover:text-rose-700 flex items-center justify-center cursor-pointer transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Mode Selector Tabs (Qty, Price, Paid, Discount) */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-[#cfdbe6] border-b border-[#a9b9c9] text-xs font-bold">
          {(['qty', 'price', 'paid', 'discount'] as const).map((tKey) => {
            const isSelected = activeMode === tKey;
            const meta = targetTitles[tKey];
            return (
              <button
                key={tKey}
                type="button"
                aria-label={`تبويب ${tKey === 'qty' ? 'الكمية' : tKey === 'price' ? 'السعر' : tKey === 'paid' ? 'المستلم' : 'الخصم'}`}
                onClick={() => setActiveMode(tKey)}
                className={`py-1.5 px-1 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-700 text-white shadow-xs font-black border border-sky-800'
                    : 'd7-glossy-fav-btn text-slate-700 hover:text-slate-950'
                }`}
              >
                {meta.icon}
                <span className="text-[11px]">
                  {tKey === 'qty' ? 'الكمية' : tKey === 'price' ? 'السعر' : tKey === 'paid' ? 'المستلم' : 'الخصم'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-3.5 flex flex-col gap-2.5">
          {/* Item Info Summary (In qty / price mode) */}
          {item && (activeMode === 'qty' || activeMode === 'price') && (
            <div className="p-2 bg-white/90 border border-[#b4c3d2] rounded-md flex items-center justify-between text-xs shadow-inner">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 text-sm truncate max-w-[240px]">{itemName}</div>
                <div className="text-slate-500 font-mono text-[11px] flex items-center gap-2">
                  <span>الباركود: <b>{itemBarcode}</b></span>
                  {item.unit && <span>الوحدة: <b>{item.unit}</b></span>}
                </div>
              </div>
              <div className="text-left bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                <div className="text-[10px] text-slate-500">
                  {activeMode === 'qty' ? 'السعر الحالي' : 'الكمية الحالية'}
                </div>
                <div className="font-black text-amber-700 font-mono text-sm">
                  {activeMode === 'qty' ? formatMoney(currentUnitPrice) : currentQty}
                </div>
              </div>
            </div>
          )}

          {/* Large Obsidian Digital LED Screen */}
          <div className="bg-[#081426] rounded-lg p-3 text-center border-2 border-[#193b68] shadow-inner relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] mb-1 px-1">
              <span className="text-sky-300 font-bold font-mono">
                {currentMeta.label}:
              </span>
              <span className="bg-sky-900/60 text-sky-200 border border-sky-700/50 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                {currentMeta.unit}
              </span>
            </div>

            {/* Glowing Big Amber/Gold LED Digits */}
            <div
              className="text-[#fbbf24] font-black tracking-wider text-4xl sm:text-5xl drop-shadow-[0_2px_10px_rgba(251,191,36,0.6)] font-mono min-h-[50px] flex items-center justify-center select-all"
              style={{ fontFamily: "'Courier New', monospace, sans-serif" }}
            >
              {val || '0'}
            </div>

            {/* Live Calculation / Status Equation Strip */}
            {liveCalculation && (
              <div className="mt-2 pt-1.5 border-t border-sky-800/80 flex items-center justify-between text-xs px-2 text-sky-200 font-mono">
                <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                  <span className="text-amber-300 font-bold">{liveCalculation.label}</span>
                  <span className="text-sky-200 text-[11px]">المعادلة: {liveCalculation.equation}</span>
                </div>
                <span className={`font-black text-sm ${
                  activeMode === 'paid' && !liveCalculation.isPositive
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  = {liveCalculation.total}
                </span>
              </div>
            )}
          </div>

          {/* Quick Preset Buttons (Mode-Specific) */}
          <div className="space-y-1">
            {activeMode === 'qty' ? (
              <>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>تعيين سريع:</span>
                  <span className="text-[10px] text-slate-500 font-normal">إضافة تراكمية (+)</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 5, 10, 12, 24].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handlePresetVal(q)}
                      className="py-1 rounded font-bold text-xs d7-glossy-fav-btn text-slate-800 hover:bg-sky-100 cursor-pointer text-center font-mono active:scale-95 shadow-2xs"
                      title={`تعيين الكمية ${q}`}
                    >
                      {q === 12 ? '12 دزينة' : q === 24 ? '24 كرتونة' : `${q}`}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-1 pt-0.5">
                  {[1, 2, 5, 10, 12, 24].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleQuickAddQty(inc)}
                      className="py-1 rounded font-bold text-[11px] d7-glossy-action-tile text-blue-900 hover:bg-blue-100 cursor-pointer flex items-center justify-center gap-0.5 active:scale-95 font-mono shadow-2xs"
                      title={`إضافة +${inc}`}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{inc}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : activeMode === 'paid' ? (
              <>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>فئات النقد السريعة:</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  <button
                    type="button"
                    onClick={() => handlePresetVal(totalAmount)}
                    className="col-span-2 py-1 px-1 rounded font-bold text-xs bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 text-emerald-900 cursor-pointer text-center active:scale-95 shadow-2xs truncate"
                    title="سداد المبلغ التام بالكامل"
                  >
                    المبلغ التام ({formatMoney(totalAmount)})
                  </button>
                  {[200, 500, 1000, 2000].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => handlePresetVal(denom)}
                      className="py-1 rounded font-bold text-xs d7-glossy-action-tile text-slate-800 hover:bg-slate-200 cursor-pointer text-center font-mono active:scale-95 shadow-2xs"
                    >
                      {denom}
                    </button>
                  ))}
                </div>
              </>
            ) : activeMode === 'discount' ? (
              <>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>نسب ومبالغ التخفيض:</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[5, 10, 15, 20].map((pct) => {
                    const discountVal = Math.round(((totalAmount || 0) * pct) / 100);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handlePresetVal(discountVal)}
                        className="py-1 rounded font-bold text-xs d7-glossy-fav-btn text-purple-900 hover:bg-purple-100 cursor-pointer text-center font-mono active:scale-95 shadow-2xs"
                        title={`تخفيض ${pct}% (${formatMoney(discountVal)})`}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                  {[50, 100].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handlePresetVal(amount)}
                      className="py-1 rounded font-bold text-xs d7-glossy-action-tile text-slate-800 hover:bg-slate-200 cursor-pointer text-center font-mono active:scale-95 shadow-2xs"
                    >
                      {amount} دج
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {/* 4x4 Large Touch Keypad Grid (Classic Raised Glossy Buttons) */}
          <div className="grid grid-cols-4 gap-1.5 mt-0.5">
            {/* Row 1 */}
            {['7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleNumpadClick(digit)}
                className="h-12 rounded-lg font-black text-xl d7-glossy-action-tile text-slate-800 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs font-mono"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNumpadClick('DEL')}
              className="h-12 rounded-lg font-bold text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              title="حذف آخر خانة (Backspace)"
            >
              <Delete className="w-4 h-4" />
              <span>حذف</span>
            </button>

            {/* Row 2 */}
            {['4', '5', '6'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleNumpadClick(digit)}
                className="h-12 rounded-lg font-black text-xl d7-glossy-action-tile text-slate-800 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs font-mono"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNumpadClick('C')}
              className="h-12 rounded-lg font-black text-sm bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
              title="مسح كامل (Clear)"
            >
              مسح C
            </button>

            {/* Row 3 */}
            {['1', '2', '3'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleNumpadClick(digit)}
                className="h-12 rounded-lg font-black text-xl d7-glossy-action-tile text-slate-800 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs font-mono"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNumpadClick('00')}
              className="h-12 rounded-lg font-black text-base d7-glossy-action-tile text-slate-700 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs font-mono"
            >
              00
            </button>

            {/* Row 4 */}
            <button
              type="button"
              onClick={() => handleNumpadClick('0')}
              className="h-12 rounded-lg font-black text-xl d7-glossy-action-tile text-slate-800 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs font-mono"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleNumpadClick('.')}
              className="h-12 rounded-lg font-black text-2xl d7-glossy-action-tile text-slate-800 flex items-center justify-center cursor-pointer active:scale-95 shadow-xs font-mono"
            >
              .
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="col-span-2 h-12 rounded-lg font-black text-sm bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 active:scale-95 text-white flex items-center justify-center gap-2 cursor-pointer shadow-md border border-emerald-600"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{activeMode === 'qty' ? 'حفظ في السلة (Enter)' : 'تأكيد (Enter)'}</span>
            </button>
          </div>

          {/* Footer Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#b7c6d6]">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded font-bold text-xs d7-glossy-top-btn text-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-9 rounded font-bold text-xs bg-sky-700 hover:bg-sky-800 active:bg-sky-900 text-white shadow flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>حفظ التعديل</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Design7ItemEditModal;
