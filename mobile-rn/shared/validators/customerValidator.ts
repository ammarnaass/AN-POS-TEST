/**
 * Customer & Supplier Validator
 */
import type { Customer, Supplier } from '../types';

export interface EntityValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateCustomer(customer: Partial<Customer>): EntityValidationResult {
  const errors: Record<string, string> = {};

  if (!customer.name?.trim()) {
    errors.name = 'اسم الزبون مطلوب';
  }

  if (customer.phone && customer.phone.length > 0 && customer.phone.length < 8) {
    errors.phone = 'رقم الهاتف قصير جداً';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSupplier(supplier: Partial<Supplier>): EntityValidationResult {
  const errors: Record<string, string> = {};

  if (!supplier.name?.trim()) {
    errors.name = 'اسم المورد مطلوب';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
