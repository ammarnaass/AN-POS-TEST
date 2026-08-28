/**
 * Sale & POS Validator
 * Ensures cart items, payment constraints, and customer balances are valid before checkout.
 */
import type { CartItem, Customer } from '../types';

export interface SaleValidationInput {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  selectedCustomer: Partial<Customer> | null;
  allowNegativeStock?: boolean;
}

export interface SaleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export function validateSale(input: SaleValidationInput): SaleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Cart validation
  if (!input.cart || input.cart.length === 0) {
    errors.push('السلة فارغة. يرجى إضافة منتج واحد على الأقل.');
    return { isValid: false, errors };
  }

  for (const item of input.cart) {
    if (item.qty <= 0) {
      errors.push(`الكمية للمنتج "${item.name}" غير صالحة.`);
    }
    if (item.unitPrice < 0) {
      errors.push(`سعر المنتج "${item.name}" لا يمكن أن يكون سالباً.`);
    }
  }

  // 2. Discount validation
  if (input.discount < 0) {
    errors.push('قيمة الخصم لا يمكن أن تكون سالبة.');
  } else if (input.discount > input.subtotal && input.subtotal > 0) {
    errors.push('قيمة الخصم لا يمكن أن تتجاوز إجمالي المنتجات.');
  }

  // 3. Payment & Credit limits
  if (input.paymentMethod === 'credit') {
    if (!input.selectedCustomer?.id) {
      errors.push('يجب اختيار زبون مسجل لتسجيل فاتورة بالآجل (كريدي).');
    } else {
      const creditLimit = Number(input.selectedCustomer.creditLimit ?? (input.selectedCustomer as any).credit_limit ?? 0);
      const currentBalance = Number(input.selectedCustomer.balance ?? 0);
      const remainingAmount = Math.max(0, input.total - (input.amountPaid || 0));
      const projectedBalance = currentBalance + remainingAmount;

      if (creditLimit > 0 && projectedBalance > creditLimit) {
        warnings.push(
          `تنبيه: سيتجاوز رصيد دين الزبون (${projectedBalance.toLocaleString('ar-DZ')} دج) سقف الائتمان المسموح (${creditLimit.toLocaleString('ar-DZ')} دج).`
        );
      }
    }
  }

  // 4. Paid amount
  if (input.paymentMethod === 'cash' && input.amountPaid < input.total) {
    warnings.push('المبلغ المدفوع أقل من إجمالي الفاتورة، سيتم تسجيل المتبقي كدين.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
