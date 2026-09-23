import { useNotificationStore, type DebtNotificationMetadata } from '@/store/notificationStore';
import type { Sale } from '@/types';

export interface CreditSaleNotificationParams {
  sale: Sale;
  debtAmount: number;
  paidAmount?: number;
  currency?: string;
  customerName?: string;
  customerId?: string;
  newBalance?: number;
  creditLimit?: number;
}

export interface DebtSettlementNotificationParams {
  customerId: string;
  customerName: string;
  settledAmount: number;
  newBalance: number;
  currency?: string;
  paymentMethod?: string;
  receiptNumber?: string;
}

export interface AddDebtNotificationParams {
  customerId: string;
  customerName: string;
  amount: number;
  currency?: string;
  newBalance?: number;
  creditLimit?: number;
  isLimitExceeded?: boolean;
}

const formatCurrency = (val: number, currency: string = 'دج') => {
  return `${val.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

/**
 * خدمة إشعارات نظام الديون المركزية
 * Centralized Service for POS Debt & Credit Notifications
 */
export const posDebtNotificationService = {
  /**
   * إشعار بيع بالآجل بالكامل (قيد كامل الفاتورة كدين على الزبون)
   */
  notifyCreditSale: ({
    sale,
    debtAmount,
    currency = 'دج',
    customerName,
    customerId,
    newBalance,
    creditLimit,
  }: CreditSaleNotificationParams) => {
    const finalCustomerName = customerName || sale.customerName || 'المسجل';
    const invoiceNumber = sale.invoiceNumber || sale.number || sale.id?.slice(0, 8) || '';
    const formattedDebt = formatCurrency(debtAmount, currency);

    const metadata: DebtNotificationMetadata = {
      customerId: customerId || sale.customerId,
      customerName: finalCustomerName,
      debtAmount,
      paidAmount: 0,
      totalAmount: Number(sale.total || debtAmount),
      newBalance,
      creditLimit,
      isCreditLimitExceeded: creditLimit !== undefined && creditLimit > 0 && (newBalance || 0) > creditLimit,
      saleId: sale.id,
      invoiceNumber,
      actionType: 'credit_sale',
    };

    useNotificationStore.getState().addNotification({
      title: 'تم تسجيل بيع بالآجل (دين على الزبون)',
      message: `فاتورة #${invoiceNumber}: تم قيد كامل المبلغ ${formattedDebt} كدين مستحق على حساب الزبون [${finalCustomerName}]`,
      type: 'warning',
      category: 'debt',
      duration: 8000,
      debtMetadata: metadata,
      action: {
        label: 'سجل ديون الزبائن',
        link: customerId || sale.customerId ? `/customers?id=${customerId || sale.customerId}` : '/customers',
      },
    });
  },

  /**
   * إشعار بيع جزئي (جزء مسدد نقداً وجزء متبقي كدين)
   */
  notifyPartialCreditSale: ({
    sale,
    debtAmount,
    paidAmount = 0,
    currency = 'دج',
    customerName,
    customerId,
    newBalance,
    creditLimit,
  }: CreditSaleNotificationParams) => {
    const finalCustomerName = customerName || sale.customerName || 'المسجل';
    const invoiceNumber = sale.invoiceNumber || sale.number || sale.id?.slice(0, 8) || '';
    const formattedPaid = formatCurrency(paidAmount, currency);
    const formattedDebt = formatCurrency(debtAmount, currency);

    const metadata: DebtNotificationMetadata = {
      customerId: customerId || sale.customerId,
      customerName: finalCustomerName,
      debtAmount,
      paidAmount,
      totalAmount: Number(sale.total || 0),
      newBalance,
      creditLimit,
      isCreditLimitExceeded: creditLimit !== undefined && creditLimit > 0 && (newBalance || 0) > creditLimit,
      saleId: sale.id,
      invoiceNumber,
      actionType: 'partial_sale',
    };

    useNotificationStore.getState().addNotification({
      title: 'تم تسجيل بيع جزئي وقيد دين متبقي',
      message: `فاتورة #${invoiceNumber}: تم استلام ${formattedPaid} نقداً وقيد دين متبقي بقيمة ${formattedDebt} على حساب الزبون [${finalCustomerName}]`,
      type: 'warning',
      category: 'debt',
      duration: 8000,
      debtMetadata: metadata,
      action: {
        label: 'سجل ديون الزبائن',
        link: customerId || sale.customerId ? `/customers?id=${customerId || sale.customerId}` : '/customers',
      },
    });
  },

  /**
   * إشعار تسديد دين الزبون (قبض مالي خافض للدين)
   */
  notifyDebtSettlement: ({
    customerId,
    customerName,
    settledAmount,
    newBalance,
    currency = 'دج',
    paymentMethod = 'cash',
    receiptNumber,
  }: DebtSettlementNotificationParams) => {
    const formattedSettled = formatCurrency(settledAmount, currency);
    const formattedBalance = formatCurrency(newBalance, currency);
    const methodLabel = paymentMethod === 'cash' ? 'نقداً' : paymentMethod === 'card' ? 'بطاقة' : 'تحويل';

    const metadata: DebtNotificationMetadata = {
      customerId,
      customerName,
      debtAmount: settledAmount,
      newBalance,
      actionType: 'debt_settlement',
    };

    useNotificationStore.getState().addNotification({
      title: 'تم تسجيل تسديد الدين بنجاح',
      message: `تم تحصيل ${formattedSettled} (${methodLabel}) من الزبون [${customerName}]. الرصيد المتبقي: ${formattedBalance}${receiptNumber ? ` (وصل #${receiptNumber})` : ''}`,
      type: 'success',
      category: 'debt',
      duration: 7000,
      debtMetadata: metadata,
      action: {
        label: 'كشف حساب الزبون',
        link: `/customers?id=${customerId}`,
      },
    });
  },

  /**
   * إشعار إضافة دين يدوي مباشر على حساب الزبون
   */
  notifyAddDebt: ({
    customerId,
    customerName,
    amount,
    currency = 'دج',
    newBalance,
    creditLimit,
    isLimitExceeded,
  }: AddDebtNotificationParams) => {
    const formattedAmount = formatCurrency(amount, currency);
    const balanceNotice = newBalance !== undefined ? ` (الرصيد الكلي: ${formatCurrency(newBalance, currency)})` : '';

    const metadata: DebtNotificationMetadata = {
      customerId,
      customerName,
      debtAmount: amount,
      newBalance,
      creditLimit,
      isCreditLimitExceeded: isLimitExceeded,
      actionType: 'add_debt',
    };

    useNotificationStore.getState().addNotification({
      title: isLimitExceeded ? 'تم قيد دين جديد (تجاوز سقف الائتمان)' : 'تم قيد دين جديد على الزبون بنجاح',
      message: `تم قيد مبلغ ${formattedAmount} كدين على حساب الزبون [${customerName}]${balanceNotice}`,
      type: isLimitExceeded ? 'error' : 'warning',
      category: 'debt',
      duration: 8000,
      debtMetadata: metadata,
      action: {
        label: 'سجل ديون الزبون',
        link: `/customers?id=${customerId}`,
      },
    });
  },
};
