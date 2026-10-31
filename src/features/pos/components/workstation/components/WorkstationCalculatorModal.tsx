import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Calculator,
  X,
  Delete,
  Check,
  Hash,
  DollarSign,
  Percent,
  Tag,
} from 'lucide-react';
import type { CartItem } from '@/types';

export interface WorkstationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: CartItem | null;
  initialMode?: 'qty' | 'price' | 'paid' | 'discount' | 'calc';
  onUpdatePrice?: (productId: string, newPrice: number) => void;
  onUpdateQty?: (productId: string, newQty: number) => void;
  onUpdatePaid?: (newPaid: number) => void;
  onOpenDiscount?: () => void;
  totalAmount?: number;
  currency?: string;
}

export const WorkstationCalculatorModal: React.FC<WorkstationCalculatorModalProps> = ({
  isOpen,
  onClose,
  item,
  initialMode = 'price',
  onUpdatePrice,
  onUpdateQty,
  onUpdatePaid,
  onOpenDiscount,
  totalAmount = 0,
  currency = 'د.ج',
}) => {
  // Map 'calc' to 'price' or 'paid'
  const normalizedInitialTarget =
    initialMode === 'calc'
      ? 'price'
      : (initialMode as 'qty' | 'price' | 'paid' | 'discount');

  const [target, setTarget] = useState<'qty' | 'price' | 'paid' | 'discount'>(
    normalizedInitialTarget
  );
  const [inputVal, setInputVal] = useState<string>('0');
  const [isFirstInput, setIsFirstInput] = useState<boolean>(true);

  // Sync initial value whenever modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      const mode =
        initialMode === 'calc'
          ? 'price'
          : (initialMode as 'qty' | 'price' | 'paid' | 'discount');
      setTarget(mode);
      setIsFirstInput(true);

      if (mode === 'qty') {
        const q = item ? (item.qty ?? (item as any).quantity ?? 1) : 1;
        setInputVal(String(Math.round(q)));
      } else if (mode === 'price') {
        const p = item ? (item.unitPrice ?? (item as any).price ?? 0) : 0;
        setInputVal(String(p));
      } else if (mode === 'paid') {
        setInputVal(String(totalAmount || '0'));
      } else if (mode === 'discount') {
        setInputVal('0');
      }
    }
  }, [isOpen, initialMode, item, totalAmount]);

  // Handle Target Switching (Tabs from Design 3)
  const handleTargetChange = useCallback(
    (newTarget: 'qty' | 'price' | 'paid' | 'discount') => {
      setTarget(newTarget);
      setIsFirstInput(true);

      if (newTarget === 'qty') {
        const q = item ? (item.qty ?? (item as any).quantity ?? 1) : 1;
        setInputVal(String(Math.round(q)));
      } else if (newTarget === 'price') {
        const p = item ? (item.unitPrice ?? (item as any).price ?? 0) : 0;
        setInputVal(String(p));
      } else if (newTarget === 'paid') {
        setInputVal(String(totalAmount || '0'));
      } else if (newTarget === 'discount') {
        setInputVal('0');
      }
    },
    [item, totalAmount]
  );

  // Apply Changes
  const handleApply = useCallback(() => {
    const rawVal = parseFloat(inputVal) || 0;

    if (target === 'qty' && item && onUpdateQty) {
      const finalQty = Math.max(1, Math.round(rawVal));
      onUpdateQty(item.productId, finalQty);
    } else if (target === 'price' && item && onUpdatePrice) {
      if (rawVal >= 0) {
        onUpdatePrice(item.productId, rawVal);
      }
    } else if (target === 'paid' && onUpdatePaid) {
      onUpdatePaid(rawVal);
    } else if (target === 'discount' && onOpenDiscount) {
      onOpenDiscount();
    }

    onClose();
  }, [target, item, inputVal, onUpdateQty, onUpdatePrice, onUpdatePaid, onOpenDiscount, onClose]);

  // Keypad Click Handler
  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === 'clear') {
        setInputVal('0');
        setIsFirstInput(false);
      } else if (key === 'backspace') {
        setInputVal((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
        setIsFirstInput(false);
      } else if (key === '.') {
        if (target === 'qty') return; // منع الفاصلة في وضع الكمية
        setInputVal((prev) => {
          if (isFirstInput) {
            setIsFirstInput(false);
            return '0.';
          }
          if (prev.includes('.')) return prev;
          return prev + '.';
        });
      } else if (key === '00') {
        setInputVal((prev) => {
          if (isFirstInput || prev === '0') {
            setIsFirstInput(false);
            return '0';
          }
          return prev + '00';
        });
      } else {
        // Digits 0-9
        setInputVal((prev) => {
          if (isFirstInput || prev === '0') {
            setIsFirstInput(false);
            return key;
          }
          return prev + key;
        });
      }
    },
    [target, isFirstInput]
  );

  // Quick Preset Add / Increment
  const handleQuickAdd = useCallback((amount: number) => {
    setInputVal((prev) => {
      const current = parseFloat(prev) || 0;
      const next = current + amount;
      return String(target === 'qty' ? Math.round(next) : next);
    });
    setIsFirstInput(false);
  }, [target]);

  // Keyboard Event Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        if (target === 'qty') return;
        handleKeyPress('.');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('backspace');
      } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleKeyPress('clear');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setTarget((prev) =>
          prev === 'qty'
            ? 'price'
            : prev === 'price'
            ? 'paid'
            : prev === 'paid'
            ? 'discount'
            : 'qty'
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleApply, handleKeyPress, target]);

  if (!isOpen) return null;

  // Metadata per target matching Design 3 TouchKeypadModal with adaptive light/dark mode styling
  const targetTitles: Record<
    string,
    { label: string; icon: React.ReactNode; color: string }
  > = {
    qty: {
      label: 'تعديل الكمية',
      icon: <Hash className="w-4 h-4" />,
      color:
        'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/25',
    },
    price: {
      label: 'تعديل السعر',
      icon: <Tag className="w-4 h-4" />,
      color:
        'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/25',
    },
    paid: {
      label: 'المبلغ المستلم',
      icon: <DollarSign className="w-4 h-4" />,
      color:
        'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/25',
    },
    discount: {
      label: 'تخفيض القيمة',
      icon: <Percent className="w-4 h-4" />,
      color:
        'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/25',
    },
  };

  const currentMeta = targetTitles[target] || targetTitles.price;
  const targetItemName = item?.name;

  const modalContent = (
    <div
      className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="glass-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-700/80 w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col text-slate-800 dark:text-slate-100"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Adaptive Light/Dark Layout) */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs border border-blue-100 dark:border-blue-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>لوحة الأرقام اللمسية</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${currentMeta.color}`}
                >
                  {currentMeta.label}
                </span>
              </h3>
              {targetItemName && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-0.5">
                  الصنف:{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {targetItemName}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Selector Tabs (4 Tabs from Design 3 - Adaptive Theme) */}
        <div className="p-2 bg-slate-100/70 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-4 gap-1.5 text-xs font-bold">
          {(['qty', 'price', 'paid', 'discount'] as const).map((tKey) => {
            const isSelected = target === tKey;
            const meta = targetTitles[tKey];
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => handleTargetChange(tKey)}
                className={`py-2 px-1 rounded-xl text-center flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {meta.icon}
                <span className="text-[11px]">
                  {meta.label.replace('تعديل ', '')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Large Digital Display Output (Bright in Light, Neon LCD in Dark) */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80">
          <div className="bg-white dark:bg-black/95 rounded-2xl border-2 border-slate-200/90 dark:border-slate-700/80 p-3.5 shadow-sm dark:shadow-inner text-left flex items-center justify-between">
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 block">
                القيمة المدخلة:
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {target === 'qty' ? 'قطع' : `${currency} (DZD)`}
              </span>
            </div>
            <span
              className="font-mono text-3xl sm:text-4xl font-black text-slate-900 dark:text-emerald-400 tracking-wider truncate max-w-full dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
              data-testid="calculator-display-value"
            >
              {inputVal || '0'}
            </span>
          </div>

          {/* Quick Increment Preset Chips */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {target === 'qty' ? (
              <>
                {[1, 2, 5, 10, 20].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      setInputVal(String(inc));
                      setIsFirstInput(false);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer text-center shadow-2xs"
                  >
                    {inc}
                  </button>
                ))}
              </>
            ) : target === 'paid' ? (
              <>
                {totalAmount && totalAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputVal(String(totalAmount));
                      setIsFirstInput(false);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold text-emerald-800 dark:text-emerald-400 transition-all active:scale-95 cursor-pointer text-center shadow-2xs"
                  >
                    المبلغ التام ({totalAmount})
                  </button>
                )}
                {[200, 500, 1000, 2000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      setInputVal(String(inc));
                      setIsFirstInput(false);
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer text-center shadow-2xs"
                  >
                    {inc} دج
                  </button>
                ))}
              </>
            ) : target === 'price' ? (
              <>
                {[50, 100, 200, 500, 1000].map((add) => (
                  <button
                    key={add}
                    type="button"
                    onClick={() => handleQuickAdd(add)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 border border-amber-200 dark:border-slate-700 text-xs font-mono font-bold text-amber-800 dark:text-amber-400 transition-all active:scale-95 cursor-pointer text-center shadow-2xs"
                  >
                    +{add}
                  </button>
                ))}
              </>
            ) : target === 'discount' ? (
              <>
                {[5, 10, 15, 20, 50].map((disc) => (
                  <button
                    key={disc}
                    type="button"
                    onClick={() => {
                      setInputVal(String(disc));
                      setIsFirstInput(false);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-slate-700 border border-purple-200 dark:border-slate-700 text-xs font-mono font-bold text-purple-800 dark:text-purple-400 transition-all active:scale-95 cursor-pointer text-center shadow-2xs"
                  >
                    {disc}%
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </div>

        {/* 4x4 Large Touch Keypad Grid (Adaptive Light/Dark Theme) */}
        <div className="p-4 pt-3 bg-white dark:bg-slate-900 grid grid-cols-4 gap-2">
          {/* Row 1 */}
          {['7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-blue-600 active:text-white text-xl font-mono font-black text-slate-800 dark:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKeyPress('backspace')}
            className="h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 active:bg-red-600 active:text-white text-red-600 dark:text-red-500 border border-red-200/90 dark:border-red-500/25 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="تراجع (Backspace)"
          >
            <Delete className="w-6 h-6" />
          </button>

          {/* Row 2 */}
          {['4', '5', '6'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-blue-600 active:text-white text-xl font-mono font-black text-slate-800 dark:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKeyPress('clear')}
            className="h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 active:bg-amber-600 active:text-white text-amber-700 dark:text-amber-400 font-bold border border-amber-200/90 dark:border-amber-500/25 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center text-base"
            title="مسح كامل (C)"
          >
            C
          </button>

          {/* Row 3 */}
          {['1', '2', '3'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-blue-600 active:text-white text-xl font-mono font-black text-slate-800 dark:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKeyPress('00')}
            className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-lg font-mono font-black text-slate-800 dark:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            00
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-blue-600 active:text-white text-xl font-mono font-black text-slate-800 dark:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            disabled={target === 'qty'}
            onClick={() => handleKeyPress('.')}
            className={`h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xl font-mono font-black text-slate-800 dark:text-white border border-slate-200/90 dark:border-slate-700 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
              target === 'qty' ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title={target === 'qty' ? 'الكمية لا تحتوي على فاصلة' : undefined}
          >
            .
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="col-span-2 h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 dark:shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
            data-testid="calculator-apply-btn"
          >
            <Check className="w-5 h-5" />
            <span>تأكيد (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default WorkstationCalculatorModal;
