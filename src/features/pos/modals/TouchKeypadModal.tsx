import React, { useEffect } from 'react';
import { Calculator, X, Delete, Check, Hash, DollarSign, Percent, Tag } from 'lucide-react';

export interface TouchKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputVal: string;
  target: 'qty' | 'price' | 'paid' | 'discount';
  onTargetChange: (target: 'qty' | 'price' | 'paid' | 'discount') => void;
  onKeyPress: (val: string) => void;
  targetItemName?: string;
  totalAmount?: number;
  onApplyExactTotal?: () => void;
  onQuickIncrement?: (amount: number) => void;
}

export const TouchKeypadModal: React.FC<TouchKeypadModalProps> = ({
  isOpen,
  onClose,
  inputVal,
  target,
  onTargetChange,
  onKeyPress,
  targetItemName,
  totalAmount,
  onApplyExactTotal,
  onQuickIncrement,
}) => {
  // Listen for Escape and Enter keys
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onClose();
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        onKeyPress(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        onKeyPress('.');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onKeyPress('backspace');
      } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onKeyPress('clear');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onKeyPress]);

  if (!isOpen) return null;

  const targetTitles: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    qty: { label: 'تعديل الكمية', icon: <Hash className="w-4 h-4" />, color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' },
    price: { label: 'تعديل السعر', icon: <Tag className="w-4 h-4" />, color: 'text-blue-500 bg-blue-500/10 border-blue-500/25' },
    paid: { label: 'المبلغ المستلم', icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' },
    discount: { label: 'تخفيض القيمة', icon: <Percent className="w-4 h-4" />, color: 'text-purple-500 bg-purple-500/10 border-purple-500/25' },
  };

  const currentMeta = targetTitles[target] || targetTitles.paid;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div 
        className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/30 w-full max-w-sm sm:max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface flex items-center gap-1.5">
                <span>لوحة الأرقام اللمسية</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${currentMeta.color}`}>
                  {currentMeta.label}
                </span>
              </h3>
              {targetItemName && (
                <p className="text-[11px] text-on-surface-variant/80 truncate max-w-[200px] mt-0.5">
                  الصنف: <span className="font-bold text-on-surface">{targetItemName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Selector Tabs */}
        <div className="p-2 bg-surface-container-lowest/60 border-b border-outline-variant/10 grid grid-cols-4 gap-1.5 text-xs font-bold">
          {(['qty', 'price', 'paid', 'discount'] as const).map((tKey) => {
            const isSelected = target === tKey;
            const meta = targetTitles[tKey];
            return (
              <button
                key={tKey}
                onClick={() => onTargetChange(tKey)}
                className={`py-2 px-1 rounded-xl text-center flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-on-primary shadow-xs font-black'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {meta.icon}
                <span className="text-[11px]">{meta.label.replace('تعديل ', '')}</span>
              </button>
            );
          })}
        </div>

        {/* Large Digital Display Output */}
        <div className="p-4 bg-surface-container-lowest">
          <div className="bg-black/95 rounded-2xl border-2 border-slate-700/80 p-3.5 shadow-inner text-left flex items-center justify-between">
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">القيمة المدخلة:</span>
              <span className="text-[10px] font-bold text-emerald-400">
                {target === 'qty' ? 'قطع' : 'دج (DZD)'}
              </span>
            </div>
            <span className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 tracking-wider">
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
                    onClick={() => {
                      if (onQuickIncrement) onQuickIncrement(inc);
                      else onKeyPress(String((Number(inputVal) || 0) + inc));
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-mono font-bold text-on-surface transition-all active:scale-95 cursor-pointer text-center"
                  >
                    +{inc}
                  </button>
                ))}
              </>
            ) : target === 'paid' ? (
              <>
                {totalAmount && totalAmount > 0 && onApplyExactTotal && (
                  <button
                    onClick={onApplyExactTotal}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 cursor-pointer text-center"
                  >
                    المبلغ التام ({totalAmount})
                  </button>
                )}
                {[200, 500, 1000, 2000].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => {
                      onKeyPress(String(inc));
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-mono font-bold text-on-surface transition-all active:scale-95 cursor-pointer text-center"
                  >
                    {inc} دج
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </div>

        {/* 4x4 Large Touch Keypad Grid */}
        <div className="p-4 pt-1 bg-surface-container-low grid grid-cols-4 gap-2">
          {/* Row 1 */}
          {['7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => onKeyPress(num)}
              className="h-14 rounded-2xl bg-surface-container hover:bg-surface-container-high active:bg-primary active:text-on-primary text-xl font-mono font-black text-on-surface border border-outline-variant/20 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onKeyPress('backspace')}
            className="h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500 active:text-white text-red-500 border border-red-500/25 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="تراجع (Backspace)"
          >
            <Delete className="w-6 h-6" />
          </button>

          {/* Row 2 */}
          {['4', '5', '6'].map((num) => (
            <button
              key={num}
              onClick={() => onKeyPress(num)}
              className="h-14 rounded-2xl bg-surface-container hover:bg-surface-container-high active:bg-primary active:text-on-primary text-xl font-mono font-black text-on-surface border border-outline-variant/20 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onKeyPress('clear')}
            className="h-14 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500 active:text-white text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center text-base"
            title="مسح كامل (C)"
          >
            C
          </button>

          {/* Row 3 */}
          {['1', '2', '3'].map((num) => (
            <button
              key={num}
              onClick={() => onKeyPress(num)}
              className="h-14 rounded-2xl bg-surface-container hover:bg-surface-container-high active:bg-primary active:text-on-primary text-xl font-mono font-black text-on-surface border border-outline-variant/20 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onKeyPress('00')}
            className="h-14 rounded-2xl bg-surface-container hover:bg-surface-container-high text-lg font-mono font-black text-on-surface border border-outline-variant/20 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            00
          </button>

          {/* Row 4 */}
          <button
            onClick={() => onKeyPress('0')}
            className="h-14 rounded-2xl bg-surface-container hover:bg-surface-container-high active:bg-primary active:text-on-primary text-xl font-mono font-black text-on-surface border border-outline-variant/20 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={() => onKeyPress('.')}
            className="h-14 rounded-2xl bg-surface-container hover:bg-surface-container-high text-xl font-mono font-black text-on-surface border border-outline-variant/20 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            .
          </button>
          <button
            onClick={onClose}
            className="col-span-2 h-14 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>تأكيد (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default TouchKeypadModal;
