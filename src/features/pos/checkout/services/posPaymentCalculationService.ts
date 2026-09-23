import type { PaymentMethod, PaymentCalculationResult } from '../types';

/**
 * خدمة الحسابات المالية للدفع والصرف (الفكة)
 * دوال نقية خالية من الآثار الجانبية وقابلة للاختبار المعزول 100%
 */

/**
 * حساب المبلغ الفائض الواجب إرجاعه للزبون كصرف (فكة)
 */
export function calculateChange(total: number, paidAmount: number): number {
  if (typeof paidAmount !== 'number' || isNaN(paidAmount) || paidAmount <= total) {
    return 0;
  }
  return Math.max(0, paidAmount - total);
}

/**
 * حساب المبلغ المتبقي غير المسدد إذا كان المدفوع أقل من الإجمالي
 */
export function calculateRemainingDeficit(total: number, paidAmount: number): number {
  if (typeof paidAmount !== 'number' || isNaN(paidAmount) || paidAmount <= 0) {
    return Math.max(0, total);
  }
  return Math.max(0, total - paidAmount);
}

/**
 * التحقق مما إذا كان المبلغ المدفوع يغطي إجمالي الفاتورة على الأقل
 */
export function isCashAmountSufficient(total: number, paidAmount: number): boolean {
  return typeof paidAmount === 'number' && !isNaN(paidAmount) && paidAmount >= total;
}

/**
 * تحديد المبلغ المدفوع فعلياً حسب وسيلة الدفع وقيمة الإجمالي
 * - في الدفع النقدي: إذا تم إدخال مبلغ أكبر من 0 يؤخذ، وإلا يؤخذ الإجمالي افتراضياً
 * - في الدفع بالدين: إذا كان المدفوع مساوياً للإجمالي (القيمة الافتراضية للكاش) أو غير محدد، يصفّر (0) ليكون ديناً كاملاً
 * - في البطاقة والتحويل: يؤخذ المبلغ المدفوع أو الإجمالي افتراضياً
 */
export function calculateEffectivePaid(
  paymentMethod: PaymentMethod | string,
  rawPaid: number | undefined,
  total: number
): number {
  if (paymentMethod === 'cash') {
    return typeof rawPaid === 'number' && rawPaid > 0 ? rawPaid : total;
  }

  if (paymentMethod === 'credit') {
    // إذا كان بيعاً بالآجل (دين)، لا يجوز اعتبار المبلغ مساوياً للإجمالي الناتج عن افتراضيات الكاش
    return typeof rawPaid === 'number' && rawPaid > 0 && rawPaid < total ? rawPaid : 0;
  }

  // بطاقة بنكية أو تحويل
  return typeof rawPaid === 'number' && rawPaid >= 0 ? rawPaid : total;
}

/**
 * تحديد حالة الفاتورة (مدفوعة، جزئية، غير مدفوعة)
 */
export function resolvePaymentStatus(
  paymentMethod: PaymentMethod | string,
  effectivePaid: number,
  total: number
): 'paid' | 'partial' | 'unpaid' {
  if (paymentMethod === 'credit') {
    if (effectivePaid <= 0) return 'unpaid';
    if (effectivePaid < total) return 'partial';
    return 'paid';
  }

  if (effectivePaid >= total) return 'paid';
  if (effectivePaid > 0) return 'partial';
  return 'unpaid';
}

/**
 * إجراء الحسابات الشاملة للعملية في خطوة واحدة
 */
export function calculatePaymentBreakdown(
  paymentMethod: PaymentMethod | string,
  rawPaid: number | undefined,
  total: number
): PaymentCalculationResult {
  const effectivePaidAmount = calculateEffectivePaid(paymentMethod, rawPaid, total);
  const changeAmount = calculateChange(total, effectivePaidAmount);
  const unpaidAmount =
    paymentMethod === 'credit'
      ? Math.max(0, total - effectivePaidAmount)
      : Math.max(0, total - effectivePaidAmount);
  const paymentStatus = resolvePaymentStatus(paymentMethod, effectivePaidAmount, total);

  return {
    effectivePaidAmount,
    changeAmount,
    unpaidAmount,
    paymentStatus,
  };
}

export interface CashPresetOption {
  label: string;
  val: number;
  shortcut: string;
}

/**
 * توليد خيارات المبالغ السريعة للكاش مع اختصارات لوحة المفاتيح
 */
export function getCashPresets(total: number): CashPresetOption[] {
  const safeTotal = Math.max(0, total || 0);
  return [
    { label: 'المبلغ بالضبط', val: safeTotal, shortcut: 'F5' },
    { label: '+500 دج', val: safeTotal + 500, shortcut: 'F6' },
    { label: '+1,000 دج', val: safeTotal + 1000, shortcut: 'F7' },
    { label: '+2,000 دج', val: safeTotal + 2000, shortcut: 'F8' },
  ];
}
