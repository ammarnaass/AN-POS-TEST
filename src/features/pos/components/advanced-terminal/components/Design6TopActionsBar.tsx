import React from 'react';
import {
  CheckCircle2,
  Zap,
  Percent,
  Clock,
  Lock,
  Tag,
  Smartphone,
  Home,
  Maximize,
  Minimize,
  Palette,
  ChevronUp,
  XCircle,
  FilePlus2,
  RotateCcw,
} from 'lucide-react';

export interface Design6TopActionsBarProps {
  onNewOrder?: () => void;
  onOpenReturns: () => void;
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
  onOpenProductCatalog?: () => void;
  priceTier: '1' | '2' | '3' | '4';
  onCyclePriceTier: () => void;
  onOpenFlexyModal: () => void;
  stationName?: string;
  isOnline?: boolean;
  onNavigateBack?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenCustomize?: () => void;
  onToggleCollapse?: () => void;
}

export const Design6TopActionsBar: React.FC<Design6TopActionsBarProps> = ({
  onNewOrder,
  onOpenReturns,
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
  onOpenProductCatalog: _onOpenProductCatalog,
  priceTier,
  onCyclePriceTier,
  onOpenFlexyModal,
  stationName = 'S19C150-POS',
  isOnline = true,
  onNavigateBack,
  onToggleFullscreen,
  isFullscreen = false,
  onOpenCustomize,
  onToggleCollapse,
}) => {
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
    <header className="w-full bg-[#070b14] border-b border-slate-800/80 px-2.5 py-1.5 flex items-center justify-between gap-2 select-none overflow-x-auto custom-scrollbar">
      {/* 10 Action Buttons (RTL Order) with Unified Ergonomics */}
      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        {/* 1. تأكيد ودفع F1 - الزر الرئيسي البارز */}
        <button
          type="button"
          onClick={onSettleSale}
          className="bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 active:scale-95 text-white h-[48px] min-w-[84px] px-2.5 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-md cursor-pointer border border-emerald-400/40"
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
          onClick={onOpenReturns}
          className="bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-orange-400/30"
          title="سجل المبيعات وإجراء مرتجع بضاعة (F2)"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <RotateCcw className="w-3 h-3" />
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
          className="bg-gradient-to-b from-[#06b6d4] to-[#0891b2] hover:from-[#22d3ee] hover:to-[#06b6d4] active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-cyan-400/30"
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
          className="bg-[#3b82f6] hover:bg-[#2563eb] active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-blue-400/30"
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
          className="bg-gradient-to-b from-rose-700 to-rose-900 hover:from-rose-600 hover:to-rose-800 active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-rose-500/50"
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
          className="bg-[#9333ea] hover:bg-[#7e22ce] active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-purple-400/30"
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
          className="bg-[#4f46e5] hover:bg-[#4338ca] active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-indigo-400/30"
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

        {/* 8. تعريفات الأسعار */}
        <button
          type="button"
          onClick={onCyclePriceTier}
          className="bg-[#0f766e] hover:bg-[#115e59] active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-teal-400/30"
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

        {/* 9. تعبئة رصيد (فليكسي نت) */}
        <button
          type="button"
          onClick={onOpenFlexyModal}
          className="bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-95 text-white h-[48px] min-w-[80px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-violet-400/30"
          title="خدمات شحن الأرصدة وفليكسي والإنترنت"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <Smartphone className="w-3 h-3" />
            <span>تعبئة رصيد</span>
          </div>
          <span className="text-[9px] text-violet-200 mt-0.5">
            فليكسي نت
          </span>
        </button>

        {/* 10. قفل الصندوق / المحطة */}
        <button
          type="button"
          onClick={onLockTerminal}
          className="bg-[#1e293b] hover:bg-[#0f172a] active:scale-95 text-amber-400 h-[48px] min-w-[76px] px-2 rounded-lg font-bold flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer border border-amber-500/40"
          title="قفل المحطة المؤقت لحماية الجلسة"
        >
          <div className="flex items-center gap-1 text-[11px] font-black tracking-wider leading-tight">
            <Lock className="w-3 h-3" />
            <span className="text-white">قفل المحطة</span>
          </div>
          <span className="text-[9px] font-mono text-amber-400/90 mt-0.5 font-bold">
            LOCK
          </span>
        </button>
      </div>

      {/* Left Navigation & Environment Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* زر الرجوع إلى الصفحة الرئيسية */}
        {onNavigateBack && (
          <button
            type="button"
            onClick={onNavigateBack}
            className="h-[40px] bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white px-3 rounded-lg border border-slate-700/80 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title="الرجوع إلى الصفحة الرئيسية (Esc)"
          >
            <Home className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">الرئيسية</span>
          </button>
        )}

        {/* زر تكبير الواجهة / ملء الشاشة */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="h-[40px] bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white px-3 rounded-lg border border-slate-700/80 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الواجهة وملء الشاشة (F11)'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">تصغير</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 text-cyan-400" />
                <span className="hidden md:inline">تكبير</span>
              </>
            )}
          </button>
        )}

        {/* زر تخصيص التصميم والواجهة */}
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="h-[40px] bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white px-3 rounded-lg border border-slate-700/80 flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title="تخصيص الواجهة واختيار القوالب"
          >
            <Palette className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">تخصيص</span>
          </button>
        )}

        {/* زر طي/إخفاء الشريط العلوي لتكبير مساحة البيع */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="h-[40px] w-[36px] bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-lg border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer"
            title="إخفاء الشريط العلوي لتكبير مساحة الشاشة"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}

        {/* شارة الاتصال */}
        <div className="flex items-center gap-1.5 bg-[#0e1626] border border-slate-700/60 rounded-lg px-2.5 py-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
          <span className="text-emerald-400 font-bold text-[11px] hidden lg:inline">
            {isOnline ? 'متصل (أونلاين)' : 'غير متصل'}
          </span>
        </div>

        {/* شارة المحطة */}
        <div className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2 flex items-center gap-1">
          <span className="text-[10px] text-slate-500 hidden sm:inline">محطة</span>
          <span className="text-slate-300">{stationName}</span>
        </div>
      </div>
    </header>
  );
};
