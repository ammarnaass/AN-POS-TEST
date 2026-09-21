import React from 'react';

interface Design7ActionKeypadProps {
  onSelectCustomer: () => void;
  onOpenSearch: () => void;
  onItemDetails?: () => void;
  onDeleteSelectedRow?: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  onArrowLeft: () => void;
  onArrowRight: () => void;
  onConfirm: () => void;
  onSettleSale: (paidAmount?: number) => void;
  onOpenKeypad?: () => void;
  onOpenKeyboard?: () => void;
  onOpenSalesHistory?: () => void;
  onSuspendSale?: () => void;
  onOpenFreeProduct?: () => void;
  onEditPrice?: () => void;
  hasSelectedItem?: boolean;
}

export const Design7ActionKeypad: React.FC<Design7ActionKeypadProps> = ({
  onSelectCustomer,
  onOpenSearch,
  onItemDetails,
  onDeleteSelectedRow,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onConfirm,
  onSettleSale,
  onOpenKeypad,
  onOpenKeyboard,
  onOpenSalesHistory,
  onSuspendSale,
  onOpenFreeProduct,
  onEditPrice,
  hasSelectedItem = false,
}) => {
  return (
    <aside
      className="w-40 sm:w-44 bg-[#dbe5ee] p-1 flex flex-col justify-start gap-1 shrink-0 select-none overflow-y-auto min-h-0"
      data-purpose="pos-keypad-matrix"
    >
      <div className="grid grid-cols-3 gap-1">
        {/* ================= Row 1 ================= */}
        {/* Row 1, Col 1: Customer (Right in RTL) */}
        <button
          onClick={onSelectCustomer}
          title="اختيار الزبون وتعيينه (F9)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-amber-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">الزبون</span>
        </button>

        {/* Row 1, Col 2: Search (Center) */}
        <button
          onClick={onOpenSearch}
          title="بحث السلع واستعراض المواد (F10)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-slate-700 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">بحث السلع</span>
        </button>

        {/* Row 1, Col 3: Info / Item Details (Left in RTL) */}
        <button
          onClick={() => {
            if (onItemDetails) onItemDetails();
            else if (onOpenFreeProduct) onOpenFreeProduct();
          }}
          title="تفاصيل الصنف وتعديل الكمية (Info)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <div className="w-4 h-4 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-black flex items-center justify-center text-[10px] italic shadow-xs">
            i
          </div>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">تفاصيل</span>
        </button>

        {/* ================= Row 2 ================= */}
        {/* Row 2, Col 1: Delete Row with Trash Icon (Right in RTL) */}
        <button
          onClick={onDeleteSelectedRow}
          title="حذف الصنف المحدد من السلة (Delete)"
          className={`d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all ${
            hasSelectedItem ? 'hover:border-rose-400 bg-rose-50/60' : 'bg-rose-50/30'
          }`}
          type="button"
        >
          <svg className="w-4 h-4 text-rose-600 drop-shadow-xs" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span className="text-[9px] font-black text-rose-800 leading-tight mt-0.5">حذف السطر</span>
        </button>

        {/* Row 2, Col 2: Arrow Up / Previous (Center) */}
        <button
          onClick={onArrowUp}
          title="السطر السابق (سهم للأعلى ↑)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-sky-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 14l5-5 5 5H7z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">أعلى (↑)</span>
        </button>

        {/* Row 2, Col 3: Free Product / Service (Left in RTL) */}
        <button
          onClick={() => {
            if (onOpenFreeProduct) onOpenFreeProduct();
          }}
          title="صنف حر أو خدمة يدوية بدون باركود (F5)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-emerald-700 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">صنف حر</span>
        </button>

        {/* ================= Row 3 ================= */}
        {/* Row 3, Col 1: Decrease Qty (Right in RTL) */}
        <button
          onClick={onArrowLeft}
          title="إنقاص كمية الصنف النشط (سهم لليسار ← أو -)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-sky-700" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">إنقاص (-)</span>
        </button>

        {/* Row 3, Col 2: Checkmark / Confirm & Pay (Center) */}
        <button
          onClick={onConfirm}
          title="تأكيد السلة والانتقال للدفع (Enter / F1)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100/90 active:scale-95 transition-all ring-1 ring-emerald-500/40"
          type="button"
        >
          <svg
            className="w-4 h-4 text-emerald-600 drop-shadow-sm"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            viewBox="0 0 24 24"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span className="text-[9px] font-black text-emerald-900 leading-tight mt-0.5">تأكيد</span>
        </button>

        {/* Row 3, Col 3: Increase Qty (Left in RTL) */}
        <button
          onClick={onArrowRight}
          title="زيادة كمية الصنف النشط (سهم لليمين → أو +)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-sky-700" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">زيادة (+)</span>
        </button>

        {/* ================= Row 4 ================= */}
        {/* Row 4, Col 1: Printer / Settle (Right in RTL) */}
        <button
          onClick={onSettleSale}
          title="طباعة السند والفاتورة (Print / F1)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-blue-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">تسوية</span>
        </button>

        {/* Row 4, Col 2: Arrow Down / Next (Center) */}
        <button
          onClick={onArrowDown}
          title="السطر التالي (سهم للأسفل ↓)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-sky-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5H7z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">أسفل (↓)</span>
        </button>

        {/* Row 4, Col 3: Edit Price with Tag Icon (Left in RTL) */}
        <button
          onClick={() => {
            if (onEditPrice) onEditPrice();
          }}
          title="تعديل السعر المباشر للصنف (Edit Price)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-teal-700 drop-shadow-xs" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
          <span className="text-[9px] font-black text-teal-950 leading-tight mt-0.5">تعديل السعر</span>
        </button>

        {/* ================= Row 5 ================= */}
        {/* Row 5, Col 1: Suspend Sale / Hold Bill (Right in RTL) */}
        <button
          onClick={() => {
            if (onSuspendSale) onSuspendSale();
          }}
          title="تعليق الفاتورة الحالية كمسودة (F2)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-amber-600 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
          </svg>
          <span className="text-[9px] font-black text-amber-950 leading-tight mt-0.5">تعليق (F2)</span>
        </button>

        {/* Row 5, Col 2: Keypad Matrix / Numpad (Center) */}
        <button
          onClick={() => {
            if (onOpenKeypad) onOpenKeypad();
          }}
          title="لوحة الأرقام اللمسية والآلة الحاسبة (Touch Numpad)"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-blue-700 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 4h16v16H4V4zm2 2v2h2V6H6zm4 0v2h2V6h-2zm4 0v2h2V6h-2zm-8 4v2h2v-2H6zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zm-8 4v2h2v-2H6zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">آلة حاسبة</span>
        </button>

        {/* Row 5, Col 3: Virtual Touch Keyboard (Left in RTL) */}
        <button
          onClick={() => {
            if (onOpenKeyboard) onOpenKeyboard();
          }}
          title="لوحة المفاتيح الافتراضية للشاشات اللمسية"
          className="d7-glossy-action-tile min-h-[44px] rounded flex flex-col items-center justify-center p-0.5 cursor-pointer active:scale-95 transition-all"
          type="button"
        >
          <svg className="w-4 h-4 text-slate-700 drop-shadow-xs" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"></path>
          </svg>
          <span className="text-[9px] font-black text-black leading-tight mt-0.5">كيبورد</span>
        </button>
      </div>
    </aside>
  );
};
