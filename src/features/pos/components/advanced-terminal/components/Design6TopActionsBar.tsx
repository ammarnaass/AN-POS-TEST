import React from 'react';
import {
  Bell,
  CheckCircle2,
  Zap,
  Percent,
  Clock,
  Lock,
  Tag,
  Home,
  LogOut,
  Maximize,
  Minimize,
  Palette,
  ChevronUp,
  XCircle,
  FilePlus2,
  RotateCcw,
  History,
  Sun,
  Moon,
} from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';

export interface Design6TopActionsBarProps {
  onNewOrder?: () => void;
  onOpenReturns: () => void;
  onOpenSalesHistory?: () => void;
  onSettleSale: () => void;
  onQuickSettle: () => void;
  onClearCart?: () => void;
  onOpenDiscount?: () => void;
  isSessionOpen?: boolean;
  onToggleDrawer?: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  onLockTerminal: () => void;
  priceTier: '1' | '2' | '3' | '4';
  onCyclePriceTier: () => void;
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
  onOpenFlexyModal?: () => void;
  stationName?: string;
  isOnline?: boolean;
  onNavigateBack?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenCustomize?: () => void;
  onToggleCollapse?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Design6TopActionsBar: React.FC<Design6TopActionsBarProps> = ({
  onNewOrder,
  onOpenReturns,
  onOpenSalesHistory,
  onSettleSale,
  onQuickSettle,
  onClearCart,
  onOpenDiscount,
  isSessionOpen: _isSessionOpen,
  onToggleDrawer: _onToggleDrawer,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount,
  onLockTerminal,
  priceTier,
  onCyclePriceTier,
  onSelectPriceTier,
  onOpenFlexyModal,
  stationName = 'S19C150-POS',
  isOnline = true,
  onNavigateBack,
  onToggleFullscreen,
  isFullscreen = false,
  onOpenCustomize,
  onToggleCollapse,
  theme = 'dark',
  onToggleTheme,
}) => {
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());

  const getTierLabel = () => {
    switch (priceTier) {
      case '1':
        return { title: 'تعريفة 1', sub: 'تجزئة' };
      case '2':
        return { title: 'تعريفة 2', sub: 'نصف جملة' };
      case '3':
        return { title: 'تعريفة 3', sub: 'جملة' };
      case '4':
        return { title: 'تعريفة 4', sub: 'خاص' };
      default:
        return { title: 'تعريفة 1', sub: 'تجزئة' };
    }
  };

  const tierInfo = getTierLabel();

  return (
    <header className="w-full bg-white dark:bg-[#070b14] border-b border-slate-200 dark:border-slate-800/80 px-2.5 py-1.5 flex items-center justify-between gap-2 select-none overflow-x-auto custom-scrollbar shadow-xs dark:shadow-none transition-colors">
      {/* 10 Action Buttons (RTL Order) with Unified Ergonomics */}
      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        {/* 1. تأكيد ودفع F1 - الزر الرئيسي البارز */}
        <button
          type="button"
          onClick={onSettleSale}
          className="bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 active:scale-95 text-white h-[48px] min-w-[82px] px-2.5 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-md cursor-pointer border border-emerald-400/40"
          title="دفع وإغلاق الوصل (F1)"
        >
          <div className="flex items-center gap-1 text-xs font-black tracking-wide leading-tight">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>تأكيد ودفع</span>
          </div>
          <span className="text-[10px] font-mono font-black bg-black/40 px-2 py-0.5 rounded mt-0.5 text-emerald-200">
            F1
          </span>
        </button>

        {/* 2. سجل المبيعات / مرتجع F2 */}
        <button
          type="button"
          onClick={() => {
            if (onOpenSalesHistory) onOpenSalesHistory();
            else onOpenReturns();
          }}
          className="bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-orange-400/30"
          title="سجل المبيعات وإجراء مرتجع بضاعة (F2 / Alt+S)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <History className="w-3.5 h-3.5" />
            <span>سجل / مرتجع</span>
          </div>
          <span className="text-[9px] font-mono bg-black/30 px-1.5 py-0.2 rounded mt-0.5 opacity-90">
            F2
          </span>
        </button>

        {/* 3. دفع سريع F7 */}
        <button
          type="button"
          onClick={onQuickSettle}
          className="bg-gradient-to-b from-[#06b6d4] to-[#0891b2] hover:from-[#22d3ee] hover:to-[#06b6d4] active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-cyan-400/30"
          title="إغلاق فوري نقداً وطباعة سريعة (F7)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <Zap className="w-3 h-3 fill-white text-white" />
            <span>دفع سريع</span>
          </div>
          <span className="text-[9px] font-mono bg-black/30 px-1.5 py-0.2 rounded mt-0.5 opacity-90">
            F7
          </span>
        </button>

        {/* 4. خصم الفاتورة F6 */}
        <button
          type="button"
          onClick={onOpenDiscount}
          className="bg-[#3b82f6] hover:bg-[#2563eb] active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-blue-400/30"
          title="تطبيق تخفيض أو نسبة خصم على الفاتورة (F6)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <Percent className="w-3 h-3 stroke-[2.5]" />
            <span>خصم الفاتورة</span>
          </div>
          <span className="text-[9px] font-mono bg-black/30 px-1.5 py-0.2 rounded mt-0.5 opacity-90">
            F6
          </span>
        </button>

        {/* 5. إلغاء الوصل F8 (Safety Warning Isolated Red Button) */}
        <button
          type="button"
          onClick={onClearCart}
          className="bg-gradient-to-b from-rose-700 to-rose-900 hover:from-rose-600 hover:to-rose-800 active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-rose-500/50"
          title="إلغاء وتفريغ الوصل بالكامل (F8)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight text-rose-100">
            <XCircle className="w-3 h-3 stroke-[2.5]" />
            <span>إلغاء الوصل</span>
          </div>
          <span className="text-[9px] font-mono bg-black/40 text-rose-300 px-1.5 py-0.2 rounded mt-0.5 font-bold">
            F8
          </span>
        </button>

        {/* 6. وصل جديد F9 */}
        <button
          type="button"
          onClick={onNewOrder}
          className="bg-[#9333ea] hover:bg-[#7e22ce] active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-purple-400/30"
          title="بدء وصل بيع جديد (F9)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <FilePlus2 className="w-3 h-3" />
            <span>وصل جديد</span>
          </div>
          <span className="text-[9px] font-mono bg-black/30 px-1.5 py-0.2 rounded mt-0.5 opacity-90">
            F9
          </span>
        </button>

        {/* 7. في الانتظار F12 */}
        <button
          type="button"
          onClick={suspendedCount > 0 ? onOpenSuspended : onSuspendSale}
          className="bg-[#4f46e5] hover:bg-[#4338ca] active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-indigo-400/30"
          title="تعليق البيع أو استئناف الفواتير المعلقة (F12)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <Clock className="w-3 h-3" />
            <span>في الانتظار</span>
          </div>
          <span className="text-[9px] font-mono text-indigo-200 mt-0.5 font-bold">
            ({suspendedCount}) F12
          </span>
        </button>

        {/* 8. تعريفات الأسعار الرئيسية */}
        <button
          type="button"
          onClick={onCyclePriceTier}
          className={`${
            priceTier === '3'
              ? 'bg-gradient-to-b from-purple-600 to-indigo-700 border-purple-400/60 ring-1 ring-purple-300/50'
              : 'bg-[#0f766e] hover:bg-[#115e59] border-teal-400/30'
          } active:scale-95 text-white h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border`}
          title="تبديل فئات الأسعار (تجزئة / نصف جملة / جملة / خاص)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <Tag className="w-3 h-3" />
            <span>{tierInfo.title}</span>
          </div>
          <span className="text-[9px] text-teal-200 mt-0.5 font-bold">
            {tierInfo.sub}
          </span>
        </button>

        {/* أزرار الوصول المباشر لفئات الأسعار س1-س4 (Alt+1..4) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-300 dark:border-slate-800 gap-1 h-[48px] shrink-0">
          {(
            [
              { id: '1', name: 'س1', sub: 'وصل عادي', shortcut: 'Alt+1' },
              { id: '2', name: 'س2', sub: 'وصل عادي', shortcut: 'Alt+2' },
              { id: '3', name: 'س3', sub: 'فاتورة جملة', shortcut: 'Alt+3' },
              { id: '4', name: 'س4', sub: 'وصل عادي', shortcut: 'Alt+4' },
            ] as const
          ).map((t) => {
            const isActive = priceTier === t.id;
            const isWholesale = t.id === '3';
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => (onSelectPriceTier ? onSelectPriceTier(t.id) : onCyclePriceTier())}
                className={`h-[38px] px-1.5 rounded-lg font-bold flex flex-col items-center justify-center transition-all cursor-pointer select-none text-center ${
                  isActive
                    ? isWholesale
                      ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-xs border border-purple-400/60'
                      : 'bg-[#0f766e] text-white shadow-xs border border-teal-400/40'
                    : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title={`${t.name} (${t.shortcut}) - ${t.sub}`}
              >
                <div className="flex items-center gap-0.5 text-[10px] font-black leading-tight">
                  {isWholesale && <Tag className="w-2.5 h-2.5 text-amber-300" />}
                  <span>{t.name}</span>
                </div>
                <div className="flex items-center gap-0.5 text-[8px] font-mono leading-tight mt-0.5 opacity-90">
                  <span className="bg-black/30 px-1 rounded text-[7px]">
                    {t.shortcut}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 10. قفل الصندوق / المحطة */}
        <button
          type="button"
          onClick={onLockTerminal}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-[#1e293b] dark:hover:bg-[#0f172a] active:scale-95 text-amber-600 dark:text-amber-400 h-[48px] min-w-[82px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-amber-500/40"
          title="قفل المحطة المؤقت لحماية الجلسة"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <Lock className="w-3 h-3" />
            <span className="text-slate-800 dark:text-white">قفل المحطة</span>
          </div>
          <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400/90 mt-0.5 font-bold">
            LOCK
          </span>
        </button>
      </div>

      {/* Left Navigation & Environment Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* زر تبديل المظهر النهاري/الليلي */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="h-[42px] px-2.5 sm:px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 active:scale-95 rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
            aria-label="تبديل المظهر النهاري والليلي"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span className="hidden xl:inline text-amber-400">نهاري</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700 fill-slate-700/20" />
                <span className="hidden xl:inline text-slate-700">ليلي</span>
              </>
            )}
          </button>
        )}

        {/* زر الخروج إلى لوحة التحكم الرئيسية */}
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="h-[42px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:border-rose-500/50 active:scale-95 px-3 rounded-lg flex items-center gap-1.5 transition-all text-xs font-black cursor-pointer shadow-2xs"
            title="الخروج إلى لوحة التحكم الرئيسية (Esc)"
          >
            <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span className="hidden sm:inline">خروج</span>
            <span className="bg-rose-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Esc</span>
          </button>
        )}

        {/* زر تكبير الواجهة / ملء الشاشة */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="h-[42px] bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 active:scale-95 px-3 rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الواجهة وملء الشاشة (F11)'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="hidden md:inline">تصغير</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="hidden md:inline">تكبير</span>
              </>
            )}
          </button>
        )}

        {/* زر الإشعارات والتنبيهات التشغيلية */}
        <NotificationDropdown hideBadge>
          <button
            type="button"
            className="h-[42px] relative bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 active:scale-95 px-3 rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title="الإشعارات والتنبيهات التشغيلية"
          >
            <div className="relative flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] flex items-center justify-center bg-rose-600 text-white text-[9px] font-black rounded-full px-1 shadow-xs animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline">الإشعارات</span>
          </button>
        </NotificationDropdown>

        {/* زر تخصيص التصميم والواجهة */}
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="h-[42px] bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 active:scale-95 px-3 rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title="تخصيص الواجهة واختيار القوالب"
          >
            <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">تخصيص</span>
          </button>
        )}

        {/* زر طي/إخفاء الشريط العلوي لتكبير مساحة البيع */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="h-[42px] w-[38px] bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white active:scale-95 rounded-lg border border-slate-300 dark:border-slate-700/80 flex items-center justify-center transition-all cursor-pointer"
            title="إخفاء الشريط العلوي لتكبير مساحة الشاشة"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}

        {/* شارة الاتصال */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0e1626] border border-slate-200 dark:border-slate-700/60 rounded-lg px-2.5 py-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
          <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] hidden lg:inline">
            {isOnline ? 'متصل (أونلاين)' : 'غير متصل'}
          </span>
        </div>

        {/* شارة المحطة */}
        <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 flex items-center gap-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">محطة</span>
          <span className="text-slate-800 dark:text-slate-300">{stationName}</span>
        </div>
      </div>
    </header>
  );
};
