import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  X,
  FileSearch,
  ScanBarcode,
  Undo2,
} from 'lucide-react';
import type { POSReturnButtonProps } from '../types';
import { usePOSReturnButton } from '../hooks/usePOSReturnButton';

export const POSReturnButton: React.FC<POSReturnButtonProps> = ({
  variant = 'topbar',
  onOpenReturns,
  className = '',
  showShortcut = true,
  showItemCount = true,
}) => {
  const {
    isReturnActive,
    originalInvoiceNumber,
    returnItemsCount,
    returnLinesCount,
    handlePrimaryClick,
    handleOpenReturnsModal,
    handleExitReturnMode,
    handleToggleManualReturn,
  } = usePOSReturnButton({
    onOpenReturnsModal: onOpenReturns,
    onClearCartOnExit: true,
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: BANNER (شريط عريض يظهر أعلى السلة عند تفعيل الإرجاع)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'banner') {
    if (!isReturnActive) return null;

    return (
      <div
        className={`px-3 py-2 bg-gradient-to-r from-rose-600/20 via-rose-500/15 to-rose-600/20 border-b border-rose-500/30 flex items-center justify-between gap-2 text-xs animate-in slide-in-from-top-1 duration-200 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>وضع مرتجع المبيعات مفعّل</span>
            </span>
            {originalInvoiceNumber ? (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-800 dark:text-rose-200 font-mono text-[11px] font-bold">
                #{originalInvoiceNumber}
              </span>
            ) : (
              <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80">
                (إرجاع حر مباشر بالباركود)
              </span>
            )}
          </div>
          {returnItemsCount > 0 && (
            <span className="hidden sm:inline text-[11px] text-on-surface-variant font-mono">
              • {returnLinesCount} صنف ({returnItemsCount} قطعة)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenReturns && (
            <button
              type="button"
              onClick={handleOpenReturnsModal}
              className="px-2 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="تغيير أو اختيار فاتورة أخرى"
            >
              <FileSearch className="w-3 h-3 text-rose-500" />
              <span>تغيير الفاتورة</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleExitReturnMode(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
            title="إنهاء وضع الإرجاع وتفريغ السلة للعودة إلى وضع البيع الطبيعي"
          >
            <X className="w-3 h-3" />
            <span>إنهاء الإرجاع</span>
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: DESIGN7 TOP RIBBON (شريط ديزاين 7 العلوي الفخم)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'ribbon') {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          onClick={handlePrimaryClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowDropdown((prev) => !prev);
          }}
          title={
            isReturnActive
              ? `وضع الإرجاع مفعّل ${originalInvoiceNumber ? `للفاتورة #${originalInvoiceNumber}` : ''} (انقر للإنهاء أو كليك يمين للخيارات)`
              : 'إرجاع بضاعة وفواتير المرتجعات (F9)'
          }
          className={`d7-glossy-top-btn flex flex-col items-center justify-center w-12 sm:w-14 md:w-16 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0 ${
            isReturnActive
              ? 'bg-rose-600/25 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/40 shadow-rose-500/20'
              : 'bg-purple-50/20 hover:border-purple-400 text-purple-900'
          } ${className}`}
          data-purpose="open-returns-button"
        >
          <div className="relative">
            <RotateCcw
              className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-xs transition-transform ${
                isReturnActive ? 'text-rose-600 dark:text-rose-400 animate-spin-slow' : 'text-purple-700'
              }`}
            />
            {isReturnActive && showItemCount && returnItemsCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[8px] font-black">
                {returnItemsCount}
              </span>
            )}
          </div>
          <span
            className={`text-[9px] sm:text-[10px] font-bold leading-tight ${
              isReturnActive ? 'text-rose-700 dark:text-rose-300' : 'text-purple-900'
            }`}
          >
            {isReturnActive ? 'مرتجع مفعّل' : 'الإرجاع F9'}
          </span>
        </button>

        {/* قائمة الخيارات السريعة */}
        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-1 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                setShowDropdown(false);
                handleOpenReturnsModal();
              }}
              className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileSearch className="w-3.5 h-3.5 text-rose-500" />
                <span>بحث في فواتير المبيعات</span>
              </span>
              <kbd className="font-mono text-[9px] text-on-surface-variant">F9</kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDropdown(false);
                handleToggleManualReturn();
              }}
              className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-amber-500" />
              <span>{isReturnActive ? 'إلغاء وضع الإرجاع' : 'وضع الإرجاع المباشر (بالباركود)'}</span>
            </button>

            {isReturnActive && (
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  handleExitReturnMode(true);
                }}
                className="w-full px-3 py-2 rounded-xl text-right text-rose-600 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer font-bold border-t border-outline-variant/15 mt-1 pt-1.5"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>إنهاء وتفريغ المرتجع</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: TERMINAL (شريط التيرمينال فائق الكثافة)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'terminal') {
    return (
      <div className="relative inline-flex items-center" ref={dropdownRef}>
        <button
          type="button"
          onClick={handlePrimaryClick}
          className={`h-9.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
            isReturnActive
              ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/50 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          } ${className}`}
          title={
            isReturnActive
              ? `وضع الإرجاع مفعّل ${originalInvoiceNumber ? `للفاتورة #${originalInvoiceNumber}` : ''} (انقر للإنهاء)`
              : 'تفعيل وضع مرتجع المبيعات واسترجاع السلع (F9)'
          }
          aria-label="مرتجع مبيعات"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isReturnActive ? 'animate-spin-slow' : 'text-rose-500'}`} />
          <span>
            {isReturnActive
              ? originalInvoiceNumber
                ? `مرتجع #${originalInvoiceNumber}`
                : 'إرجاع (مفعّل)'
              : 'مرتجع مبيعات'}
          </span>
          {isReturnActive && showItemCount && returnItemsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center font-mono mr-0.5">
              {returnItemsCount}
            </span>
          )}
          {showShortcut && !isReturnActive && (
            <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">
              F9
            </kbd>
          )}
        </button>

        {isReturnActive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExitReturnMode(true);
            }}
            className="p-1.5 mr-0.5 rounded-md hover:bg-rose-700 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="إنهاء وضع الإرجاع"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: ACTION BAR (الأزرار الجانبية والسفلية في السلة)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'actionbar') {
    return (
      <button
        type="button"
        onClick={handlePrimaryClick}
        title={
          isReturnActive
            ? 'وضع المرتجع مفعّل حالياً (انقر للإنهاء أو التبديل للبيع)'
            : 'مرتجع مبيعات وبحث الفواتير السابقة (F9)'
        }
        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer border ${
          isReturnActive
            ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-500/40 shadow-rose-600/30 font-black'
            : 'bg-surface-container-low hover:bg-rose-500/10 text-rose-600 border-outline-variant/20 hover:border-rose-500/30'
        } ${className}`}
      >
        <RotateCcw className={`w-3.5 h-3.5 ${isReturnActive ? 'text-white animate-spin-slow' : 'text-rose-500'}`} />
        <span>{isReturnActive ? 'إرجاع (مفعّل)' : 'مرتجع'}</span>
        {showShortcut && (
          <span className="text-[9px] font-mono opacity-70">F9</span>
        )}
      </button>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: COMPACT (شريط البحث والباركود المدمج)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handlePrimaryClick}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border transition cursor-pointer text-xs font-bold ${
          isReturnActive
            ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-500/40 shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
        } ${className}`}
        title="فاتورة إرجاع ومرتجع مبيعات (F9)"
      >
        <RotateCcw className={`w-4 h-4 ${isReturnActive ? 'animate-spin-slow' : 'text-rose-500'}`} />
        <span>{isReturnActive ? 'إرجاع (مفعّل)' : 'إرجاع (F9)'}</span>
      </button>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: TOPBAR (الافتراضي لشريط نقطة البيع القياسي والكلاسيكي)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={handlePrimaryClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowDropdown((prev) => !prev);
        }}
        className={`h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0 cursor-pointer ${
          isReturnActive
            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40 shadow-rose-500/20 ring-2 ring-rose-500/30'
            : 'bg-surface-container/80 hover:bg-surface-container-high text-slate-900 dark:text-white border-outline-variant/25 hover:border-rose-500/40'
        } ${className}`}
        title={
          isReturnActive
            ? `وضع الإرجاع مفعّل ${originalInvoiceNumber ? `للفاتورة #${originalInvoiceNumber}` : ''} (انقر للإنهاء أو كليك يمين للخيارات)`
            : 'وضع الإرجاع ومرتجع المبيعات (F9)'
        }
      >
        <RotateCcw
          className={`w-4 h-4 text-rose-500 ${isReturnActive ? 'animate-spin-slow' : ''}`}
        />
        <span className="font-cairo font-black">
          {isReturnActive
            ? originalInvoiceNumber
              ? `مرتجع #${originalInvoiceNumber}`
              : 'إرجاع (مفعّل)'
            : 'الإرجاع'}
        </span>
        {isReturnActive && showItemCount && returnItemsCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-md bg-rose-600 text-white font-mono text-[9px] font-black">
            {returnItemsCount}
          </span>
        )}
        {showShortcut && !isReturnActive && (
          <span className="hidden sm:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface-variant font-bold shadow-2xs">
            F9
          </span>
        )}
      </button>

      {/* زر الخروج السريع في حالة التفعيل */}
      {isReturnActive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleExitReturnMode(true);
          }}
          className="p-1 -mr-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/20 transition-colors cursor-pointer"
          title="إنهاء وضع الإرجاع"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* قائمة منسدلة بالخيارات السريعة */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-1 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => {
              setShowDropdown(false);
              handleOpenReturnsModal();
            }}
            className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileSearch className="w-3.5 h-3.5 text-rose-500" />
              <span>بحث في فواتير المبيعات</span>
            </span>
            <kbd className="font-mono text-[9px] text-on-surface-variant">F9</kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowDropdown(false);
              handleToggleManualReturn();
            }}
            className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ScanBarcode className="w-3.5 h-3.5 text-amber-500" />
            <span>{isReturnActive ? 'إلغاء وضع الإرجاع' : 'وضع الإرجاع المباشر (بالباركود)'}</span>
          </button>

          {isReturnActive && (
            <button
              type="button"
              onClick={() => {
                setShowDropdown(false);
                handleExitReturnMode(true);
              }}
              className="w-full px-3 py-2 rounded-xl text-right text-rose-600 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer font-bold border-t border-outline-variant/15 mt-1 pt-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>إنهاء وتفريغ المرتجع</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
