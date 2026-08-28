/**
 * Product Validator & Pricing Calculations
 * Ensures product data integrity across mobile & desktop applications.
 */
import type { Product } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface ProfitCalculation {
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  profitAmount: number;
  profitMarginPercent: number; // هامش الربح %: (profit / retail) * 100
  markupPercent: number;       // نسبة الزيادة %: (profit / cost) * 100
  isLoss: boolean;
}

export function calculateProfitability(cost: number, retail: number, wholesale: number = 0): ProfitCalculation {
  const c = Math.max(0, Number(cost) || 0);
  const r = Math.max(0, Number(retail) || 0);
  const w = Math.max(0, Number(wholesale) || 0);

  const profitAmount = r - c;
  const isLoss = r < c && r > 0;
  const profitMarginPercent = r > 0 ? ((r - c) / r) * 100 : 0;
  const markupPercent = c > 0 ? ((r - c) / c) * 100 : 0;

  return {
    costPrice: c,
    retailPrice: r,
    wholesalePrice: w,
    profitAmount,
    profitMarginPercent: Number(profitMarginPercent.toFixed(2)),
    markupPercent: Number(markupPercent.toFixed(2)),
    isLoss,
  };
}

export function validateProduct(
  product: Partial<Product>,
  existingProducts: Array<Partial<Product>> = []
): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // 1. Name validation
  const name = product.name?.trim();
  if (!name) {
    errors.name = 'اسم المنتج مطلوب';
  } else if (name.length < 2) {
    errors.name = 'اسم المنتج يجب أن يحتوي على حرفين على الأقل';
  }

  // 2. Retail price validation
  const retailPrice = Number(product.retailPrice ?? (product as any).retail_price ?? 0);
  if (isNaN(retailPrice) || retailPrice < 0) {
    errors.retailPrice = 'سعر البيع يجب أن يكون رقماً موجباً';
  }

  // 3. Cost price validation
  const costPrice = Number(product.costPrice ?? (product as any).cost_price ?? (product as any).purchasePrice ?? 0);
  if (isNaN(costPrice) || costPrice < 0) {
    errors.costPrice = 'سعر التكلفة يجب أن يكون رقماً موجباً';
  }

  // 4. Wholesale price validation
  const wholesalePrice = Number(product.wholesalePrice ?? (product as any).wholesale_price ?? 0);
  if (wholesalePrice > 0 && wholesalePrice > retailPrice && retailPrice > 0) {
    warnings.wholesalePrice = 'تنبيه: سعر الجملة أعلى من سعر التجزئة!';
  }

  // 5. Margin warning
  if (costPrice > retailPrice && retailPrice > 0) {
    warnings.pricing = 'تنبيه: سعر البيع أقل من سعر التكلفة (عملية بيع بخسارة)!';
  }

  // 6. Barcode validation & uniqueness
  const barcode = product.barcode?.trim();
  if (barcode) {
    const isDuplicate = existingProducts.some(
      (p) => p.id !== product.id && p.barcode?.trim() === barcode
    );
    if (isDuplicate) {
      errors.barcode = 'الباركود مسجل مسبقاً لمنتج آخر';
    }
  }

  // 7. Quantity validation
  const quantity = Number(product.quantity ?? (product as any).qty ?? 0);
  const allowNegative = Boolean(product.allowNegativeStock ?? (product as any).allow_negative_stock);
  if (quantity < 0 && !allowNegative) {
    warnings.quantity = 'الكمية الحالية سالبة، والمخزون السالب غير مفعل لهذا المنتج';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}
