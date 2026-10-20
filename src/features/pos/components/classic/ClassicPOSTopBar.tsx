import React from 'react';
import {
  Bell,
  Receipt,
  Trash2,
  PauseCircle,
  History,
  Printer,
  User,
  UserPlus,
  Package,
  Layers,
  X,
  Tag,
  FolderOpen,
  Calculator,
  FileText,
  Truck,
  Sun,
  Moon,
  LogOut,
  Sliders,
  Banknote,
  Ban,
  ChevronDown,
} from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';
import { useThemeStore } from '@/store/themeStore';

interface ClassicPOSTopBarProps {
  onNavigateBack?: () => void;
  onOpenCustomize?: () => void;
  onSettleSale: () => void;
  isSalePending: boolean;
  cartLength: number;
  onClearCart: () => void;
  onDeleteSelectedOrLast: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  onSelectCustomer: () => void;
  selectedCustomerName: string;
  onOpenDiscount: () => void;
  discountAmount: number;
  autoPrintReceipt: boolean;
  onToggleAutoPrint: () => void;
  onOpenReturns: () => void;
  onOpenSalesHistory?: () => void;
  onOpenKeypad?: () => void;
  onSaveAsProforma?: () => void;
  onSaveAsOrder?: () => void;
  totalAmount: number;
  totalItemsCount: number;
  totalUnitsCount: number;
  currency?: string;
  formatMoney: (amount?: number) => string;
  priceTier?: '1' | '2' | '3' | '4';
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
  enabledPriceTiers?: Array<'1' | '2' | '3' | '4'>;
}

export const ClassicPOSTopBar: React.FC<ClassicPOSTopBarProps> = React.memo(({
  onNavigateBack,
  onOpenCustomize,
  onSettleSale,
  isSalePending,
  cartLength,
  onClearCart,
  onDeleteSelectedOrLast,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onSelectCustomer,
  selectedCustomerName,
  onOpenDiscount,
  discountAmount,
  autoPrintReceipt,
  onToggleAutoPrint,
  onOpenReturns: _onOpenReturns,
  onOpenSalesHistory,
  onOpenKeypad,
  onSaveAsProforma,
  onSaveAsOrder,
  totalAmount,
  totalItemsCount,
  totalUnitsCount,
  currency = 'دج',
  formatMoney,
  priceTier = '1',
  onSelectPriceTier,
  enabledPriceTiers = ['1', '2', '3', '4'],
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <div className="flex flex-col shrink-0 select-none">
      {/* BEGIN: MainDisplayDashboard - لوحة الإجمالي الرقمي وزر التأكيد السريع */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 shrink-0 shadow-xs">
        <div className="flex items-stretch gap-3">
          {/* Big Sale Confirmation Button (F1) */}
          <button
            type="button"
            onClick={onSettleSale}
            disabled={cartLength === 0 || isSalePending}
            id="btn-confirm-sale"
            className="w-[15%] min-w-[200px] bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white rounded-xl p-3 flex flex-col justify-between shadow-lg shadow-emerald-500/20 transition-all border border-emerald-400/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            title="تأكيد البيع وتسوية الفاتورة (F1)"
          >
            <div className="flex items-center justify-between w-full">
              <span className="bg-emerald-950/40 text-emerald-200 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider border border-emerald-400/30">
                F1
              </span>
              <Banknote className="w-6 h-6 text-emerald-200/90" />
            </div>
            <div className="text-right">
              <div className="text-xs text-emerald-100 font-medium">تسجيل الدفع السريع</div>
              <div className="text-2xl font-black tracking-tight leading-tight mt-0.5">تأكيد بيع</div>
            </div>
          </button>

          {/* Digital Total LED POS Board */}
          <div className="w-[85%] flex-1 bg-slate-950 rounded-xl p-3 border-2 border-slate-800 flex items-center justify-between shadow-inner relative overflow-hidden">
            {/* Subtle LED background grid effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Right in RTL: Status & Currency */}
            <div className="flex items-center gap-3 z-10">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-emerald-500/40 px-2.5 py-1 rounded-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                <span className="font-mono text-emerald-400 text-xs font-bold tracking-wider">LED POS ON</span>
              </div>
              <div className="text-right pr-2">
                <span className="text-slate-400 text-xs font-semibold block">الإجمالي الكلي المستحق</span>
                <span className="text-emerald-500/80 text-xs font-mono">العملة: الدينار الجزائري ({currency})</span>
              </div>
            </div>

            {/* Center: Big LED Price Amount */}
            <div className="flex items-baseline gap-2 z-10" dir="ltr">
              <span
                className="font-mono text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_14px_rgba(34,197,94,0.45)]"
                id="pos-main-total"
              >
                {formatMoney(totalAmount)}
              </span>
              <span className="text-emerald-500 font-bold text-xl">{currency}</span>
            </div>

            {/* Left in RTL: Customer & Item Info Badges */}
            <div className="flex items-center gap-2 z-10">
              {/* Item Count Tag */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-right flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block leading-none">إجمالي السلع</span>
                  <span className="font-mono text-emerald-400 text-sm sm:text-base font-bold leading-none" id="badge-items-count">
                    {totalItemsCount} سلع ({totalUnitsCount} قطع)
                  </span>
                </div>
              </div>

              {/* Customer Dropdown/Quick Select (F6) */}
              <button
                type="button"
                onClick={onSelectCustomer}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 text-right flex items-center gap-2.5 transition cursor-pointer"
                title="تحديد أو تغيير الزبون (F6)"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">الزبون [F6]</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-white font-bold text-xs truncate max-w-[110px]" id="current-customer">
                    {selectedCustomerName || 'زبون عام'}
                  </span>
                </div>
              </button>

              {/* Discount Tag (if any) */}
              {discountAmount > 0 && (
                <div className="bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-right flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <span className="text-emerald-500/90 text-[11px]">تخفيض:</span>
                  <span className="font-mono text-emerald-300">-{formatMoney(discountAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* END: MainDisplayDashboard */}

      {/* BEGIN: ActionRibbon - شريط الوظائف والاختصارات بألوان باستيل راقية */}
      <nav
        aria-label="شريط العمليات السريعة"
        className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 shadow-xs"
      >
        {/* زر تبديل الخزينة/الزبون F6 */}
        <button
          type="button"
          onClick={onSelectCustomer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800/60 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 cursor-pointer"
          title="تحديد أو تغيير الزبون (F6)"
        >
          <UserPlus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>زبون</span>
          <kbd className="bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-100 px-1 rounded text-[10px] font-mono">F6</kbd>
        </button>

        {/* تعليق الفاتورة F2 */}
        <button
          type="button"
          onClick={onSuspendSale}
          disabled={cartLength === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 disabled:opacity-40 cursor-pointer"
          title="تعليق البيع / سلة جديدة (F2)"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>تعليق</span>
          <kbd className="bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-1 rounded text-[10px] font-mono">F2</kbd>
        </button>

        {/* مسودات الفواتير F3 */}
        <button
          type="button"
          onClick={onOpenSuspended}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 relative cursor-pointer"
          title="قائمة الفواتير المعلقة والمسودات (F3)"
        >
          <FolderOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>مسودات</span>
          <kbd className="bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 px-1 rounded text-[10px] font-mono">F3</kbd>
          {suspendedCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>

        {/* حذف سلعة Ctrl+D */}
        <button
          type="button"
          onClick={onDeleteSelectedOrLast}
          disabled={cartLength === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 disabled:opacity-40 cursor-pointer"
          title="حذف السلعة المحددة (Ctrl+D / Delete)"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>حذف سلعة</span>
          <kbd className="bg-rose-200/80 dark:bg-rose-900 text-rose-900 dark:text-rose-100 px-1 rounded text-[10px] font-mono">Ctrl+D</kbd>
        </button>

        {/* إلغاء الوصل F4 */}
        <button
          type="button"
          onClick={onClearCart}
          disabled={cartLength === 0}
          id="btn-cancel-bill"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 disabled:opacity-40 cursor-pointer"
          title="إلغاء الفاتورة الحالية بالكامل (F4)"
        >
          <Ban className="w-3.5 h-3.5 text-red-500" />
          <span>إلغاء الوصل</span>
          <kbd className="bg-red-200/80 dark:bg-red-900 text-red-800 dark:text-red-100 px-1 rounded text-[10px] font-mono">F4</kbd>
        </button>

        {/* تخصيص F10 */}
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 cursor-pointer"
            title="تخصيص الواجهة ودقة العرض ومقياس التكبير (F10)"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>تخصيص</span>
            <kbd className="bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-100 px-1 rounded text-[10px] font-mono">F10</kbd>
          </button>
        )}

        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* طباعة F5 */}
        <button
          type="button"
          onClick={onToggleAutoPrint}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition active:scale-95 cursor-pointer ${
            autoPrintReceipt
              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
          }`}
          title="الطباعة التلقائية (F5)"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span>طباعة</span>
          <kbd className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1 rounded text-[10px] font-mono">F5</kbd>
        </button>

        {/* سجل الفواتير F9 / Alt+S */}
        {onOpenSalesHistory && (
          <button
            type="button"
            onClick={onOpenSalesHistory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 cursor-pointer"
            title="سجل المبيعات (Alt+S)"
          >
            <History className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>سجل</span>
            <kbd className="bg-sky-200/80 dark:bg-sky-900 text-sky-900 dark:text-sky-100 px-1 rounded text-[10px] font-mono">F9</kbd>
          </button>
        )}

        {/* فئات الأسعار السريعة (س1، س2، س3، س4) */}
        {enabledPriceTiers && enabledPriceTiers.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            {enabledPriceTiers.includes('1') && (
              <button
                type="button"
                onClick={() => onSelectPriceTier?.('1')}
                className={`px-2 py-1 rounded-md text-xs font-bold font-mono transition cursor-pointer ${
                  priceTier === '1'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="سعر التجزئة س1 (Alt+1)"
              >
                س1
              </button>
            )}
            {enabledPriceTiers.includes('2') && (
              <button
                type="button"
                onClick={() => onSelectPriceTier?.('2')}
                className={`px-2 py-1 rounded-md text-xs font-bold font-mono transition cursor-pointer ${
                  priceTier === '2'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="سعر نصف الجملة س2 (Alt+2)"
              >
                س2
              </button>
            )}
            {enabledPriceTiers.includes('3') && (
              <button
                type="button"
                onClick={() => onSelectPriceTier?.('3')}
                className={`px-2 py-1 rounded-md text-xs font-bold font-mono transition cursor-pointer ${
                  priceTier === '3'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="سعر الجملة س3 (Alt+3)"
              >
                س3
              </button>
            )}
            {enabledPriceTiers.includes('4') && (
              <button
                type="button"
                onClick={() => onSelectPriceTier?.('4')}
                className={`px-2 py-1 rounded-md text-xs font-bold font-mono transition cursor-pointer ${
                  priceTier === '4'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="سعر خاص س4 (Alt+4)"
              >
                س4
              </button>
            )}
          </div>
        )}

        {/* تخفيض */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-200 text-xs font-semibold whitespace-nowrap transition active:scale-95 cursor-pointer"
          title="إضافة تخفيض أو زيادة على الفاتورة"
        >
          <Tag className="w-3.5 h-3.5 text-orange-500" />
          <span>تخفيض</span>
        </button>

        {/* مبدئية */}
        {onSaveAsProforma && (
          <button
            type="button"
            onClick={onSaveAsProforma}
            disabled={cartLength === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap transition disabled:opacity-40 cursor-pointer"
            title="حفظ الفاتورة كمسودة مبدئية (Proforma)"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>مبدئية</span>
          </button>
        )}

        {/* طلبية */}
        {onSaveAsOrder && (
          <button
            type="button"
            onClick={onSaveAsOrder}
            disabled={cartLength === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap transition disabled:opacity-40 cursor-pointer"
            title="حفظ كطلبية بيع (Order)"
          >
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span>طلبية</span>
          </button>
        )}

        {/* حاسبة */}
        {onOpenKeypad && (
          <button
            type="button"
            onClick={onOpenKeypad}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
            title="الآلة الحاسبة ولوحة الأرقام السريعة"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>حاسبة</span>
          </button>
        )}

        {/* الوضع الليلي / النهاري */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-200 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
          title="تبديل الوضع الليلي / النهاري"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          <span>{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>
        </button>

        {/* إشعارات */}
        <div className="relative">
          <NotificationDropdown>
            <button
              type="button"
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-pink-200 dark:border-pink-800/60 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 text-pink-700 dark:text-pink-200 text-xs font-semibold whitespace-nowrap transition cursor-pointer"
              title="الإشعارات والتنبيهات"
            >
              <Bell className="w-3.5 h-3.5 text-pink-500" />
              <span>إشعارات</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </NotificationDropdown>
        </div>

        <div className="mr-auto" />

        {/* زر خروج ESC */}
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 bg-red-500 hover:bg-red-600 text-white text-xs font-bold whitespace-nowrap transition active:scale-95 shadow-sm cursor-pointer"
            title="الخروج إلى لوحة التحكم الرئيسية (Esc)"
          >
            <LogOut className="w-3.5 h-3.5 rotate-180" />
            <span>خروج</span>
            <kbd className="bg-red-700 text-white px-1.5 rounded text-[10px] font-mono">Esc</kbd>
          </button>
        )}
      </nav>
      {/* END: ActionRibbon */}
    </div>
  );
});

export default ClassicPOSTopBar;
