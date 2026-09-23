import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  UserCheck,
  UserPlus,
  ChevronDown,
  X,
  BookOpen,
  Wallet,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import type { POSCustomerButtonProps } from '../types';
import { usePOSCustomerButton } from '../hooks/usePOSCustomerButton';
import { formatNumber } from '../../utils/format';

/**
 * POSCustomerButton
 * المكون المرئي الموحد لزر الزبون في نقطة البيع بجميع الأنماط (Polymorphic Component).
 * يدعم إبراز رصيد الديون، وتنبيه تجاوز سقف الائتمان، والإلغاء السريع بنقرة واحدة، وقائمة الإجراءات المتقدمة.
 */
export const POSCustomerButton: React.FC<POSCustomerButtonProps> = ({
  variant = 'cart_header',
  className = '',
  customer: propCustomer,
  customers: propCustomers,
  selectedCustomerName,
  onSelectCustomer,
  onOpenCustomerLedger,
  onOpenSettlement,
  onOpenAddDebt,
  onOpenQuickNewCustomer,
  showShortcut = true,
  showBalance = true,
  compactText = false,
  currency = 'دج',
}) => {
  const {
    customer,
    displayName,
    isCashCustomer,
    balance,
    isLimitExceeded,
    hasDebt,
    hasAdvance,
    handleSelectCustomer,
    handleClearCustomer,
    handleOpenLedger,
    handleOpenSettlement,
    handleOpenAddDebt,
    handleOpenQuickNewCustomer,
  } = usePOSCustomerButton({
    customer: propCustomer,
    customers: propCustomers,
    fallbackCustomerName: selectedCustomerName,
    onSelectCustomerModal: onSelectCustomer,
    onOpenCustomerLedgerModal: onOpenCustomerLedger,
    onOpenSettlementModal: onOpenSettlement,
    onOpenAddDebtModal: onOpenAddDebt,
    onOpenQuickNewCustomerModal: onOpenQuickNewCustomer,
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة المنسدلة عند النقر في أي مكان خارج المكون
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

  // قائمة الإجراءات المنسدلة المشتركة
  const renderDropdownMenu = () => {
    if (!showDropdown) return null;

    return (
      <div
        className="absolute top-full right-0 mt-1 w-56 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl p-1 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        data-purpose="customer-actions-dropdown"
      >
        <button
          type="button"
          onClick={() => {
            setShowDropdown(false);
            handleSelectCustomer();
          }}
          className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary" />
            <span>{isCashCustomer ? 'اختيار زبون مسجل' : 'تغيير الزبون'}</span>
          </span>
          <kbd className="font-mono text-[9px] text-on-surface-variant font-bold">F2</kbd>
        </button>

        {onOpenQuickNewCustomer && (
          <button
            type="button"
            onClick={() => {
              setShowDropdown(false);
              handleOpenQuickNewCustomer();
            }}
            className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400 font-bold"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة زبون جديد سريع (+)</span>
          </button>
        )}

        {!isCashCustomer && (
          <>
            {onOpenCustomerLedger && (
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  handleOpenLedger();
                }}
                className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer border-t border-outline-variant/15 mt-1 pt-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>دفتر الحساب والفواتير</span>
              </button>
            )}

            {onOpenSettlement && (
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  handleOpenSettlement();
                }}
                className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>تسديد دفعة نقدية</span>
              </button>
            )}

            {onOpenAddDebt && (
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  handleOpenAddDebt();
                }}
                className="w-full px-3 py-2 rounded-xl text-right hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer text-rose-600 dark:text-rose-400"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>قيد دين مباشر</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                setShowDropdown(false);
                handleClearCustomer(e);
              }}
              className="w-full px-3 py-2 rounded-xl text-right text-rose-600 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer font-bold border-t border-outline-variant/15 mt-1 pt-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>إلغاء التعيين (زبون نقدي)</span>
            </button>
          </>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: TERMINAL (شريط التيرمينال فائق الكثافة)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'terminal') {
    return (
      <div className="relative inline-flex items-center" ref={dropdownRef}>
        <button
          type="button"
          onClick={handleSelectCustomer}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowDropdown((prev) => !prev);
          }}
          className={`h-9.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5 ${
            !isCashCustomer
              ? isLimitExceeded
                ? 'bg-red-50 dark:bg-red-950/60 border-red-400 dark:border-red-700 text-red-900 dark:text-red-200 ring-1 ring-red-500/40 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-2xs ring-1 ring-amber-400/30'
              : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          } ${className}`}
          title={
            !isCashCustomer
              ? `الزبون: ${displayName} ${hasDebt ? `(دين: ${formatNumber(balance)} ${currency})` : ''} (كليك يمين للخيارات)`
              : 'اختيار وتحديد الزبون (F2)'
          }
          aria-label="اختيار الزبون"
        >
          {!isCashCustomer ? (
            <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          ) : (
            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          )}

          <span className="max-w-[120px] truncate">
            {displayName}
          </span>

          {!isCashCustomer && showBalance && hasDebt && (
            <span
              className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold ${
                isLimitExceeded ? 'bg-red-600 text-white' : 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
              }`}
            >
              {formatNumber(balance)}
            </span>
          )}

          {showShortcut && (
            <kbd className="font-mono text-[9px] text-slate-400 bg-black/5 dark:bg-white/10 px-1 py-0.2 rounded font-bold">
              F2
            </kbd>
          )}
        </button>

        {!isCashCustomer && (
          <button
            type="button"
            onClick={handleClearCustomer}
            className="p-1 mr-0.5 rounded hover:bg-rose-500/20 text-rose-500 transition-colors cursor-pointer"
            title="إلغاء تعيين الزبون والعودة إلى زبون نقدي"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {renderDropdownMenu()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: KEYPAD TILE (بلاطة شبكة لوحة الأرقام اللمسية في ديزاين 7)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'keypad_tile') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={handleSelectCustomer}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowDropdown((prev) => !prev);
          }}
          title={
            !isCashCustomer
              ? `الزبون المحدد: ${displayName} (انقر للتغيير أو كليك يمين للخيارات)`
              : 'اختيار الزبون وتعيينه'
          }
          className={`d7-glossy-action-tile min-h-[44px] w-full rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all relative ${
            !isCashCustomer ? 'bg-amber-100/60 dark:bg-amber-950/40 border-amber-400' : ''
          } ${className}`}
          type="button"
        >
          <div className="relative">
            <svg
              className={`w-4 h-4 drop-shadow-xs ${!isCashCustomer ? 'text-amber-700' : 'text-amber-600'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3z"></path>
            </svg>
            {!isCashCustomer && (
              <span
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                  isLimitExceeded ? 'bg-red-600 animate-ping' : hasDebt ? 'bg-red-500' : 'bg-emerald-500'
                }`}
              />
            )}
          </div>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5 max-w-full truncate px-0.5">
            {isCashCustomer ? 'الزبون' : compactText ? displayName.split(' ')[0] : displayName}
          </span>
        </button>

        {renderDropdownMenu()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: COMPACT (للأشرطة الضيقة والمصغرة)
  // ──────────────────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div className="relative inline-flex items-center" ref={dropdownRef}>
        <button
          type="button"
          onClick={handleSelectCustomer}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowDropdown((prev) => !prev);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
            !isCashCustomer
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200'
              : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/30'
          } ${className}`}
          title="اختيار الزبون"
        >
          <User className="w-3.5 h-3.5 text-amber-600" />
          <span className="truncate max-w-[100px]">{displayName}</span>
        </button>

        {!isCashCustomer && (
          <button
            type="button"
            onClick={handleClearCustomer}
            className="p-1 rounded-md text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
            title="إلغاء التعيين"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {renderDropdownMenu()}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIANT: CART HEADER (الافتراضي لهيدر السلة في معظم الواجهات)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <div
        className={`inline-flex items-center rounded-xl border transition-all text-xs overflow-hidden ${
          !isCashCustomer
            ? isLimitExceeded
              ? 'bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200 shadow-2xs'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-2xs'
            : 'bg-slate-200/70 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border-slate-300/60 dark:border-slate-700'
        } ${className}`}
      >
        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={handleSelectCustomer}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowDropdown((prev) => !prev);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 font-bold cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          title={
            !isCashCustomer
              ? `الزبون المحدد: ${displayName} ${hasDebt ? `(دين: ${formatNumber(balance)} ${currency})` : ''} (انقر للتغيير أو كليك يمين للخيارات)`
              : 'اختيار زبون مسجل (F2)'
          }
        >
          {!isCashCustomer ? (
            <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          )}

          <span className="truncate max-w-[130px] font-cairo">
            {displayName}
          </span>

          {/* Debt / Advance Pill */}
          {!isCashCustomer && showBalance && (
            <>
              {hasDebt ? (
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-mono text-[10px] font-black border ${
                    isLimitExceeded
                      ? 'bg-red-600 text-white border-red-700 animate-pulse'
                      : 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                  }`}
                  title={`الدين المستحق: ${formatNumber(balance)} ${currency}`}
                >
                  {isLimitExceeded && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
                  <span>{formatNumber(balance)}</span>
                </span>
              ) : hasAdvance ? (
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/30">
                  +{formatNumber(Math.abs(balance))}
                </span>
              ) : null}
            </>
          )}

          {showShortcut && isCashCustomer && (
            <span className="hidden sm:inline text-[9px] font-mono opacity-60">F2</span>
          )}
        </button>

        {/* Quick Clear Button (X) when customer is selected */}
        {!isCashCustomer && (
          <button
            type="button"
            onClick={handleClearCustomer}
            className="p-1 px-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-500/20 transition-colors cursor-pointer border-r border-outline-variant/20"
            title="إلغاء تعيين الزبون والعودة إلى زبون نقدي"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown Chevron Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown((prev) => !prev);
          }}
          className="p-1 text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="خيارات وإجراءات الزبون"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {renderDropdownMenu()}
    </div>
  );
};

export default POSCustomerButton;
