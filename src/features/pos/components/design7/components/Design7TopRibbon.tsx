import React from 'react';
import { Bell } from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';
import { useDesign7Clock } from '../hooks/useDesign7Clock';

interface Design7TopRibbonProps {
  onNavigateBack: () => void;
  onOpenSalesHistory?: () => void;
  onOpenReturns?: () => void;
  onSaveAsOrder?: () => void;
  onOpenSuspended: () => void;
  suspendedCount: number;
  autoPrintReceipt: boolean;
  onToggleAutoPrint: () => void;
  onSettleSale: () => void;
  onOpenDiscount: () => void;
  onOpenCustomize: () => void;
  onNewOrder?: () => void;
  onClearCart: () => void;
  invoiceNumber?: string | number;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  priceTier?: '1' | '2' | '3' | '4';
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
}

export const Design7TopRibbon: React.FC<Design7TopRibbonProps> = ({
  onNavigateBack,
  onOpenSalesHistory,
  onOpenReturns,
  onSaveAsOrder,
  onOpenSuspended,
  suspendedCount,
  autoPrintReceipt,
  onToggleAutoPrint,
  onSettleSale,
  onOpenDiscount,
  onOpenCustomize,
  onNewOrder,
  onClearCart,
  invoiceNumber = 1,
  onToggleFullscreen,
  isFullscreen = false,
  priceTier = '1',
  onSelectPriceTier,
}) => {
  const { timeStr, dateStr } = useDesign7Clock();
  const unreadCount = useNotificationStore((s) => s.getUnreadCount());

  return (
    <header className="bg-gradient-to-b from-[#e3e8ee] to-[#cad3de] px-1.5 sm:px-2 py-1 border-b border-[#9ba8b7] flex items-center justify-between gap-1 shadow-sm shrink-0 select-none overflow-hidden">
      {/* Primary Toolbar Actions (Right in RTL) */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto custom-scrollbar-none shrink-0 py-0.5 max-w-full">
        {/* الرئيسية / خروج للوحة التحكم */}
        <button
          onClick={onNavigateBack}
          title="الرجوع إلى لوحة التحكم الرئيسية (Esc)"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 group cursor-pointer active:scale-95 transition-all shrink-0"
          type="button"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L11 13.17V7h2v6.17l2.59-2.58L17 12l-5 5z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">الرئيسية</span>
        </button>

        {/* سجل المبيعات والمرتجع */}
        <button
          onClick={() => {
            if (onOpenSalesHistory) onOpenSalesHistory();
            else if (onOpenReturns) onOpenReturns();
          }}
          title="سجل الفواتير والمبيعات والمرتجع (F2)"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0"
          type="button"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-1.1 0-2 .9-2 2v1.1C6.6 6.6 4 9.5 4 13c0 4.4 3.6 8 8 8s8-3.6 8-8c0-3.5-2.6-6.4-6-6.9V5c0-1.1-.9-2-2-2zm0 5c2.8 0 5 2.2 5 5 0 .7-.2 1.4-.5 2l-3.8-3.8c.2-.4.3-.8.3-1.2 0-1.1-.9-2-2-2s-2 .9-2 2c0 .4.1.8.3 1.2L5.5 15c-.3-.6-.5-1.3-.5-2 0-2.8 2.2-5 5-5z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight truncate">سجل المبيعات</span>
        </button>

        {/* حفظ كطلبيّة زبون */}
        <button
          onClick={() => {
            if (onSaveAsOrder) onSaveAsOrder();
          }}
          title="حفظ السلة الحالية كطلبيّة بيع للزبون (F4)"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0"
          type="button"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight whitespace-nowrap">حفظ كطلبيّة</span>
        </button>

        {/* الفواتير المعلقة (المسودات) */}
        <button
          onClick={onOpenSuspended}
          title="قائمة الفواتير المعلقة والمسودات المحفوظة (F8)"
          className="d7-glossy-top-btn relative flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0"
          type="button"
        >
          {suspendedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
              {suspendedCount}
            </span>
          )}
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight text-center">
            المعلقة
          </span>
        </button>

        {/* الطباعة التلقائية */}
        <button
          onClick={onToggleAutoPrint}
          title={autoPrintReceipt ? 'الطباعة التلقائية: مفعّلة (F7)' : 'الطباعة التلقائية: معطلة (F7)'}
          className={`d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0 ${
            autoPrintReceipt ? 'ring-2 ring-cyan-500 bg-cyan-50/30' : ''
          }`}
          type="button"
        >
          <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${autoPrintReceipt ? 'text-cyan-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"></path>
          </svg>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${autoPrintReceipt ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span className={`text-[9px] sm:text-[10px] font-bold leading-tight ${autoPrintReceipt ? 'text-cyan-800' : 'text-slate-600'}`}>
              {autoPrintReceipt ? 'طباعة: تعمل' : 'طباعة: إيقاف'}
            </span>
          </div>
        </button>

        {/* دفع فوري نقداً */}
        <button
          onClick={onSettleSale}
          title="دفع فوري نقداً وإنهاء السلة"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0"
          type="button"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-4 11H9v-5h6v5zm-5.5-2.5l-2-2 1.4-1.4 0.6.6 2.6-2.6 1.4 1.4-4 4zM16 5v3H8V5h8z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">دفع فوري</span>
        </button>

        {/* تأكيد وتسوية الفاتورة (F1) */}
        <button
          onClick={onSettleSale}
          title="تأكيد وتسوية الفاتورة وطباعة الوصل (F1)"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all bg-sky-50/20 shrink-0"
          type="button"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-sky-700 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight truncate">تسوية (F1)</span>
        </button>

        {/* تخفيض الفاتورة (F6) */}
        <button
          onClick={onOpenDiscount}
          title="تطبيق خصم أو تخفيض على الفاتورة (F6)"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0"
          type="button"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-700 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight">الخصم (F6)</span>
        </button>

        {/* تفريغ السلة */}
        <button
          onClick={() => {
            if (onClearCart) onClearCart();
            else if (onNewOrder) onNewOrder();
          }}
          title="إلغاء وتفريغ السلة الحالية بالكامل"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-14 sm:w-16 md:w-20 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all hover:border-red-400 shrink-0"
          type="button"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.21 9l-4.38-6.56c-.19-.28-.51-.42-.83-.42-.32 0-.64.14-.83.43L6.79 9H2c-.55 0-1 .45-1 1 0 .09.01.18.05.27l2.54 9.27c.23.84 1 1.46 1.92 1.46h13.48c.92 0 1.69-.62 1.93-1.46l2.54-9.27L23 10c0-.55-.45-1-1-1h-4.79zM9 9l3-4.5L15 9H9zm3 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>
          </svg>
          <span className="text-[10px] sm:text-[11px] font-bold text-rose-700 leading-tight">إلغاء السلة</span>
        </button>

        {/* فئات الأسعار الأربعة: س1 تجزئة، س2 نصف جملة، س3 جملة، س4 خاص */}
        <div
          className="flex items-center bg-white/80 border border-[#9eb0c2] rounded p-0.5 gap-0.5 h-10 sm:h-11 md:h-12 shrink-0 shadow-2xs"
          data-purpose="price-tier-selector"
        >
          {(
            [
              { id: '1', name: 'س1', label: 'تجزئة', shortcut: 'Alt+1', sub: 'فاتورة بيع عادية' },
              { id: '2', name: 'س2', label: 'نصف جملة', shortcut: 'Alt+2', sub: 'فاتورة بيع عادية' },
              { id: '3', name: 'س3', label: 'جملة', shortcut: 'Alt+3', sub: 'فاتورة جملة مخصصة', isWholesale: true },
              { id: '4', name: 'س4', label: 'خاص', shortcut: 'Alt+4', sub: 'فاتورة بيع عادية' },
            ] as const
          ).map((t) => {
            const isActive = (priceTier || '1') === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectPriceTier?.(t.id)}
                className={`h-full px-1.5 sm:px-2 rounded flex flex-col items-center justify-center transition-all cursor-pointer select-none text-center ${
                  isActive
                    ? t.isWholesale
                      ? 'bg-gradient-to-b from-purple-700 to-indigo-800 text-white shadow font-extrabold border border-purple-400/60'
                      : 'bg-gradient-to-b from-teal-600 to-emerald-700 text-white shadow font-bold border border-emerald-400/50'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
                title={`${t.name} (${t.label}) - ${t.sub} (${t.shortcut})`}
              >
                <div className="flex items-center gap-0.5 text-[10px] sm:text-[11px] leading-tight font-black">
                  <span>{t.name}</span>
                  <span className="text-[9px] sm:text-[10px] opacity-90">({t.label})</span>
                </div>
                <span
                  className={`text-[8px] font-mono leading-tight px-1 rounded mt-0.5 ${
                    isActive ? 'bg-black/30 text-white' : 'text-slate-500 bg-slate-200/80'
                  }`}
                >
                  {t.shortcut}
                </span>
              </button>
            );
          })}
        </div>

        {/* ملء الشاشة / تكبير كامل (F11) */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'الخروج من ملء الشاشة (F11)' : 'تكبير الشاشة بالكامل (F11)'}
            className="d7-glossy-top-btn flex flex-col items-center justify-center w-12 sm:w-14 md:w-16 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all shrink-0"
            type="button"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z" />
              ) : (
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              )}
            </svg>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">
              {isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            </span>
          </button>
        )}

        {/* تخصيص الواجهة ودقة الشاشة (F12) */}
        <button
          onClick={onOpenCustomize}
          title="تخصيص الواجهة ودقة العرض ومقياس التكبير (F12)"
          className="d7-glossy-top-btn flex flex-col items-center justify-center w-12 sm:w-14 md:w-16 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all bg-purple-50/20 shrink-0"
          type="button"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.58 10.56 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"></path>
          </svg>
          <span className="text-[9px] sm:text-[10px] font-bold text-purple-900 leading-tight">تخصيص F12</span>
        </button>
      </div>

      {/* Document Information & Notifications Block (Left in RTL) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* زر الإشعارات والتنبيهات المنسدلة */}
        <NotificationDropdown hideBadge>
          <button
            type="button"
            title="الإشعارات والتنبيهات التشغيلية"
            className="d7-glossy-top-btn relative flex flex-col items-center justify-center w-12 sm:w-14 md:w-16 h-10 sm:h-11 md:h-12 rounded px-1 cursor-pointer active:scale-95 transition-all bg-amber-50/20 hover:border-amber-400 shrink-0"
          >
            <div className="relative flex items-center justify-center">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 drop-shadow-xs" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] flex items-center justify-center bg-rose-600 text-white text-[9px] font-black rounded-full px-1 shadow-xs animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">
              الإشعارات
            </span>
          </button>
        </NotificationDropdown>

        {/* Document Information Block (Left in RTL) */}
        <div
          className="hidden sm:flex items-stretch border border-[#b2bfcc] bg-gradient-to-b from-[#ffffff] to-[#e6ecf2] rounded divide-x divide-x-reverse divide-[#c0ccd9] text-[10px] sm:text-[11px] shadow-inner shrink-0"
          data-purpose="document-metadata"
        >
          <div className="px-1.5 sm:px-2 py-0.5 text-center min-w-[44px] sm:min-w-[50px]">
            <div className="font-bold text-slate-700">رقم السند</div>
            <div className="text-blue-700 font-extrabold text-xs sm:text-sm leading-tight">{invoiceNumber}</div>
          </div>
          <div className="px-1.5 sm:px-2 py-0.5 text-center min-w-[60px] sm:min-w-[70px]">
            <div className="font-bold text-slate-700">تاريخ السند</div>
            <div className="text-rose-600 font-bold leading-tight">{dateStr}</div>
          </div>
          <div className="px-1.5 sm:px-2 py-0.5 text-center min-w-[55px] sm:min-w-[65px]">
            <div className="font-bold text-slate-700">ساعة السند</div>
            <div className="text-amber-700 font-bold leading-tight font-mono">{timeStr}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
