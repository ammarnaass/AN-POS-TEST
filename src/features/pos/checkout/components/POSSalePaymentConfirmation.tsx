import React, { useState } from 'react';
import {
  PackageCheck,
  ChevronDown,
  ChevronUp,
  User,
  CreditCard,
  ArrowLeftRight,
  Wallet,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { CartItem, Customer } from '@/types';
import type { PaymentMethod } from '../types';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { CashPresetsButtons } from './CashPresetsButtons';
import { PaymentChangeDisplay } from './PaymentChangeDisplay';
import { POSCreditPaymentSection } from '@/features/pos/debt';
import { ALGERIAN_BANKNOTE_DENOMINATIONS } from '../services/posPaymentCalculationService';

export interface POSSalePaymentConfirmationProps {
  total: number;
  cart?: CartItem[];
  formatMoney: (val: number) => string;
  paymentMethod: PaymentMethod;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  paidAmount: number;
  setPaidAmount: (amount: number) => void;
  paidInputRef?: React.RefObject<HTMLInputElement | null>;
  changeDue: number;
  isPaidSufficient: boolean;
  allowCardPayment?: boolean;
  allowTransferPayment?: boolean;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Array<Customer | { id: string; name: string; phone?: string; balance?: number; creditLimit?: number }>;
  onOpenAddCustomer?: () => void;
  transactionReference: string;
  setTransactionReference: (ref: string) => void;
  onConfirm: () => void;
  isPending?: boolean;
  customerSelectRef?: React.RefObject<HTMLSelectElement | null>;
  creditValidation: any;
}

export const POSSalePaymentConfirmation: React.FC<POSSalePaymentConfirmationProps> = ({
  total,
  cart = [],
  formatMoney,
  paymentMethod,
  onSelectPaymentMethod,
  paidAmount,
  setPaidAmount,
  paidInputRef,
  changeDue,
  isPaidSufficient,
  allowCardPayment = false,
  allowTransferPayment = false,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  onOpenAddCustomer,
  transactionReference,
  setTransactionReference,
  onConfirm,
  isPending = false,
  customerSelectRef,
  creditValidation,
}) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

  // إحصائيات السلة والبنود
  const totalPieces = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const totalItemsCount = cart.length;

  const matchedCustomer = customers.find((c) => c.id === selectedCustomer);

  return (
    <div className="space-y-4" data-testid="pos-sale-payment-confirmation">
      {/* 1. الركن الأول: تأكيد العملية وملخص بنود السلة */}
      {cart && cart.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-surface-container overflow-hidden shadow-2xs">
          <div
            onClick={() => setIsItemsExpanded(!isItemsExpanded)}
            className="p-3 bg-primary/5 hover:bg-primary/10 transition-colors border-b border-primary/15 flex items-center justify-between cursor-pointer select-none"
            title="انقر لمعاينة/إخفاء تفاصيل بنود الفاتورة"
          >
            <div className="flex items-center gap-2 text-primary">
              <PackageCheck className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold text-on-surface">
                تأكيد بنود العملية ({totalItemsCount} صنف • {totalPieces} قطعة)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/20 flex items-center gap-1">
                <User className="w-3 h-3 text-primary" />
                <span>{matchedCustomer ? matchedCustomer.name : 'زبون نقدي عام'}</span>
              </span>
              {isItemsExpanded ? (
                <ChevronUp className="w-4 h-4 text-on-surface-variant" />
              ) : (
                <ChevronDown className="w-4 h-4 text-on-surface-variant" />
              )}
            </div>
          </div>

          {/* قائمة معاينة الأصناف القابلة للطي */}
          {isItemsExpanded && (
            <div className="p-3 space-y-2 max-h-44 overflow-y-auto custom-scrollbar bg-surface-container-low/60">
              {cart.map((item, idx) => {
                const qty = Number(item.qty) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                const lineTotal = Number(item.lineTotal ?? qty * unitPrice);

                return (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="p-2 rounded-xl bg-surface-container border border-outline-variant/15 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface truncate">{item.name}</span>
                        {item.barcode && (
                          <span className="text-[10px] font-mono text-on-surface-variant opacity-70">
                            [{item.barcode}]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant flex items-center gap-2 font-mono">
                        <span className="text-primary font-bold">
                          {qty} {item.unit || 'قطعة'}
                        </span>
                        <span>×</span>
                        <span>{formatMoney(unitPrice)} دج</span>
                      </div>
                    </div>
                    <span className="font-bold text-on-surface font-mono shrink-0 text-xs">
                      {formatMoney(lineTotal)} دج
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. الركن الثاني: اختيار وسيلة السداد (F1 - F4) */}
      <PaymentMethodSelector
        paymentMethod={paymentMethod}
        onSelectMethod={onSelectPaymentMethod}
        allowCardPayment={allowCardPayment}
        allowTransferPayment={allowTransferPayment}
      />

      {/* 3. الواجهات المتخصصة لكل وسيلة سداد */}

      {/* أ) الواجهة النقدية: إدخال، فئات أوراق نقدية جزائرية، وأزرار سريعة */}
      {paymentMethod === 'cash' && (
        <div className="space-y-3 p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-on-surface">
              المبلغ المدفوع من الزبون (دج):
            </label>
            <button
              type="button"
              onClick={() => setPaidAmount(total)}
              className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>المبلغ بالضبط ({formatMoney(total)} دج)</span>
            </button>
          </div>

          <div className="relative">
            <input
              ref={paidInputRef as any}
              type="number"
              value={paidAmount || ''}
              onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isPending) onConfirm();
                }
              }}
              placeholder={total.toString()}
              className="w-full h-12 pr-4 pl-12 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xl font-mono font-black text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
            {paidAmount > 0 && (
              <button
                type="button"
                onClick={() => setPaidAmount(0)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs font-bold cursor-pointer p-1"
                title="مسح"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* فئات العملة الورقية الجزائرية بنقرة واحدة */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-on-surface-variant block">
              فئات الأوراق النقدية المسلّمة:
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {ALGERIAN_BANKNOTE_DENOMINATIONS.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setPaidAmount(note)}
                  className={`py-1.5 px-1 rounded-xl border text-xs font-mono font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    paidAmount === note
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container-high border-outline-variant/20 text-on-surface'
                  }`}
                  title={`تحديد الورقة النقدية ${note} دج`}
                >
                  {note} دج
                </button>
              ))}
            </div>
          </div>

          {/* أزرار التسوية التراكمية (F5 - F8) */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-on-surface-variant block">
              إضافة أو تسوية تراكمية:
            </span>
            <CashPresetsButtons total={total} onSelectAmount={setPaidAmount} />
          </div>

          {/* 4. الركن الثالث: حاسبة الفكة الذكية وفئات الصرف المقترحة */}
          <PaymentChangeDisplay
            changeAmount={changeDue}
            isPaidSufficient={isPaidSufficient}
            formatMoney={formatMoney}
            total={total}
            paidAmount={paidAmount}
            onMakeExact={() => setPaidAmount(total)}
          />
        </div>
      )}

      {/* ب) واجهة الدفع بالبطاقة الإلكترونية TPE */}
      {paymentMethod === 'card' && (
        <div className="p-4 rounded-2xl bg-surface-container border border-purple-500/25 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface">الدفع عبر البطاقة الذهبية / CIB</h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                تأكد من تمرير البطاقة في جهاز TPE وتأكيد العملية البنكية قبل النقر على تأكيد.
              </p>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-bold text-on-surface block">
              رقم العملية / المرجع البنكي (Auth Code) - اختياري للتدقيق:
            </label>
            <input
              type="text"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="مثال: TPE-88421 أو رقم الإيصال"
              className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
        </div>
      )}

      {/* ج) واجهة التحويل البنكي أو البريدي */}
      {paymentMethod === 'transfer' && (
        <div className="p-4 rounded-2xl bg-surface-container border border-cyan-500/25 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface">الدفع عبر التحويل البنكي أو البريدي</h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                يرجى التأكد من استلام إشعار التحويل البنكي أو البريدي المطابق لرقم الفاتورة.
              </p>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-bold text-on-surface block">
              رقم الحوالة أو إيصال التحويل (BaridiMob / CCP) - اختياري:
            </label>
            <input
              type="text"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              placeholder="مثال: حوالة بريدية رقم 492019 أو مرجع بريدي موب"
              className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
        </div>
      )}

      {/* د) واجهة الآجل / الدين وقسم الزبائن */}
      {paymentMethod === 'credit' && (
        <div className="space-y-3">
          <div
            className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 dark:border-indigo-500/40 flex items-center gap-3"
            data-purpose="credit-payment-notice-card"
            data-testid="credit-payment-notice-card"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                  إشعار: إتمام المعاملة بالآجل (قيد دين على الحساب)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                  نظام الديون
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                سيتم تسجيل هذه الفاتورة كدين رسمي في سجل الزبون وإرسال إشعار فوري بحركتها المالية.
              </p>
            </div>
          </div>

          <POSCreditPaymentSection
            customerSelectRef={customerSelectRef}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            customers={customers as any}
            onOpenAddCustomer={onOpenAddCustomer || (() => {})}
            saleTotal={total}
            creditValidation={creditValidation}
            paidAmount={paidAmount}
            setPaidAmount={setPaidAmount}
            isReturn={false}
          />
        </div>
      )}
    </div>
  );
};
