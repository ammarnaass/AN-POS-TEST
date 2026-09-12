import React from 'react';
import {
  Home,
  Check,
  X,
  Trash2,
  Receipt,
  Plus,
  RotateCcw,
  User,
  UserCheck,
  Settings,
  Eye,
  Scale,
  Calculator,
  Percent,
  Sun,
  Moon,
  Maximize,
  Minimize,
  Layers,
} from 'lucide-react';
import type { CartItem } from '@/types';

export interface TerminalPOSTopBarProps {
  onNavigateBack: () => void;
  onSettleSale: () => void;
  cart: CartItem[];
  isSalePending: boolean;
  onClearCart: () => void;
  selectedCartRowId: string | null;
  setSelectedCartRowId: (id: string | null) => void;
  onRemoveFromCart: (productId: string) => void;
  onOpenReturns: () => void;
  returnMode: boolean;
  onNewOrder?: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  onSelectCustomer: () => void;
  selectedCustomerName: string;
  onOpenCustomize: () => void;
  isPriceCheckerMode: boolean;
  onTogglePriceChecker: () => void;
  onOpenFreeProduct: () => void;
  onOpenKeypad?: () => void;
  onOpenDiscount: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  wholesaleMode: boolean;
  toggleWholesaleMode: () => void;
  priceTier: '1' | '2' | '3' | '4';
  onSelectPriceTier: (tier: '1' | '2' | '3' | '4') => void;
}

export const TerminalPOSTopBar: React.FC<TerminalPOSTopBarProps> = ({
  onNavigateBack,
  onSettleSale,
  cart,
  isSalePending,
  onClearCart,
  selectedCartRowId,
  setSelectedCartRowId,
  onRemoveFromCart,
  onOpenReturns,
  returnMode,
  onNewOrder,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onSelectCustomer,
  selectedCustomerName,
  onOpenCustomize,
  isPriceCheckerMode,
  onTogglePriceChecker,
  onOpenFreeProduct,
  onOpenKeypad,
  onOpenDiscount,
  theme,
  toggleTheme,
  isFullscreen,
  onToggleFullscreen,
  wholesaleMode,
  toggleWholesaleMode,
  priceTier,
  onSelectPriceTier,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1.5 shadow-2xs shrink-0 flex-wrap lg:flex-nowrap">
      {/* Right Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onNavigateBack}
          className="bg-blue-700 hover:bg-blue-800 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          title="الرجوع إلى الصفحة الرئيسية (Esc)"
          aria-label="الصفحة الرئيسية"
        >
          <Home className="w-3.5 h-3.5" />
          <span>الصفحة الرئيسية (Esc)</span>
        </button>

        <button
          type="button"
          onClick={onSettleSale}
          disabled={cart.length === 0 || isSalePending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          title="تأكيد وتسوية عملية البيع (F1)"
          aria-label="تأكيد وتسوية عملية البيع"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>تأكيد بيع (F1)</span>
        </button>

        <button
          type="button"
          onClick={onClearCart}
          disabled={cart.length === 0}
          className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 active:scale-95"
          title="إلغاء الفاتورة الحالية وتفريغ السلة (F8)"
          aria-label="إلغاء الوصل وتفريغ السلة"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>إلغاء الوصل (F8)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (selectedCartRowId) {
              onRemoveFromCart(selectedCartRowId);
              setSelectedCartRowId(null);
            } else if (cart.length > 0) {
              onRemoveFromCart(cart[cart.length - 1].productId);
            }
          }}
          disabled={cart.length === 0}
          className="bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 active:scale-95"
          title="حذف السلعة المحددة أو الأخيرة من السلة (Ctrl+D)"
          aria-label="حذف سلعة من السلة"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>حذف سلعة (Ctrl+D)</span>
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0 hidden sm:block" />

        <button
          type="button"
          onClick={onOpenReturns}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95 ${
            returnMode
              ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400/40 animate-pulse'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          }`}
          title={returnMode ? 'وضع إرجاع البضائع مفعّل' : 'سجل المبيعات وحركات الصندوق (Caisse)'}
          aria-label="سجل المبيعات والصندوق"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{returnMode ? 'إرجاع (مفعّل)' : 'الصندوق (Caisse)'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNewOrder) onNewOrder();
            else if (cart.length > 0) onClearCart();
          }}
          className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
          title="فتح سلة بيع جديدة فارغة (F9)"
          aria-label="فتح سلة جديدة"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>سلة جديدة (F9)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (cart.length > 0) onSuspendSale();
            else onOpenSuspended();
          }}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
          title="تعليق السلة الحالية أو استرجاع الفواتير المعلقة (F12)"
          aria-label="تعليق السلة الحالية"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>تعليق (F12)</span>
          {suspendedCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mr-0.5">
              {suspendedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onSelectCustomer}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
          title="اختيار أو تغيير الزبون (F6)"
          aria-label="اختيار الزبون"
        >
          <User className="w-3 h-3 text-slate-500" />
          <span className="truncate max-w-[100px] inline-block">
            {selectedCustomerName ? selectedCustomerName : 'زبون (F6)'}
          </span>
        </button>

        <button
          type="button"
          onClick={onSelectCustomer}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
          title="برنامج الولاء والزبائن الأوفياء (F2)"
          aria-label="برنامج الولاء والزبون الوفي"
        >
          <UserCheck className="w-3 h-3 text-blue-500" />
          <span>زبون وفي (F2)</span>
        </button>

        <button
          type="button"
          onClick={onOpenCustomize}
          className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 active:scale-95"
          title="إعدادات تخصيص العرض ودقة الشاشة (F10)"
          aria-label="إعدادات وتخصيص العرض"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>خدمات (F10)</span>
        </button>
      </div>

      {/* Left Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={onTogglePriceChecker}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
            isPriceCheckerMode
              ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400/50 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
          }`}
          title="تفعيل وضع استعلام سعر ومخزون السلع عبر الباركود"
          aria-label="عارض الأسعار"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>عارض الأسعار</span>
        </button>

        <button
          type="button"
          onClick={onOpenFreeProduct}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          title="إضافة صنف حر أو سلعة يدوية السعر (F4)"
          aria-label="صنف حر"
        >
          <Scale className="w-3.5 h-3.5" />
          <span>صنف حر (F4)</span>
        </button>

        <button
          type="button"
          onClick={onOpenKeypad}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          title="فتح الآلة الحاسبة ولوحة الأرقام اللمسية"
          aria-label="آلة حاسبة"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>الحسبة</span>
        </button>

        <button
          type="button"
          onClick={onOpenDiscount}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          title="تطبيق تخفيض أو تسوية على الفاتورة"
          aria-label="تخفيض الفاتورة"
        >
          <Percent className="w-3.5 h-3.5" />
          <span>خصم</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
          aria-label="تبديل مظهر الواجهة"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          aria-label="ملء الشاشة"
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        {/* Wholesale Switch & Tiers */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={toggleWholesaleMode}
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              wholesaleMode
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="تبديل وضع بيع الجملة"
          >
            <Layers className="w-3 h-3" />
            <span>الجملة</span>
          </button>
          <div className="flex items-center gap-0.5">
            {(['1', '2', '3', '4'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => onSelectPriceTier(tier)}
                className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition-colors ${
                  priceTier === tier
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={`فئة السعر س${tier}`}
              >
                س{tier}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
