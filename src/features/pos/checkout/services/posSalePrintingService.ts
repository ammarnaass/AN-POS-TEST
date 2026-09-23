import { printDocument } from '@/services/print/printService';
import type { Sale } from '@/types';
import type { SaleSettings } from '../types';

/**
 * تحديد نوع وثيقة الطباعة الأنسب حسب نوع البيع وإعدادات المتجر
 */
export function resolveSaleDocumentType(sale: Sale, settings?: SaleSettings): string {
  if (sale.type === 'return') {
    return 'return-invoice';
  }

  if (sale.docType === 'wholesale') {
    return 'wholesale-invoice';
  }

  if (settings?.invoiceTemplate === 'detailed') {
    return 'sale-invoice';
  }

  return 'thermal-receipt';
}

/**
 * تشغيل الطباعة التلقائية في الخلفية دون تعطيل واجهة المستخدم أو إيقاف التفاعل
 */
export async function handleSaleAutoPrint(
  sale: Sale,
  settings: SaleSettings,
  user?: { id?: string; name?: string } | null
): Promise<void> {
  try {
    const docType = resolveSaleDocumentType(sale, settings);
    await printDocument(sale.id, docType, {
      userId: user?.id || '',
      userName: user?.name || '',
      copies: 1,
    });
  } catch (err) {
    console.warn('[posSalePrintingService] Auto-print failed (silent):', err);
  }
}

/**
 * طباعة وثيقة يدوياً عند ضغط المستخدم على زر الطباعة في نافذة التأكيد
 */
export async function printSaleReceipt(
  saleId: string,
  docType: string,
  user?: { id?: string; name?: string } | null
): Promise<void> {
  try {
    await printDocument(saleId, docType, {
      userId: user?.id || '',
      userName: user?.name || '',
      copies: 1,
    });
  } catch (err) {
    console.warn('[posSalePrintingService] Manual print error:', err);
  }
}
