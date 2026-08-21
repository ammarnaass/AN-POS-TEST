import type { UserRole } from '@/types';
import type { RoleEntity } from '@/infrastructure/database/dexie/db';

// ===== نظام الصلاحيات التفصيلية (SYS-USR-001) =====

export const PERMISSIONS = {
  // نقطة البيع
  POS_COMPLETE_SALE: 'pos.complete_sale',
  POS_CANCEL_SALE: 'pos.cancel_sale',
  POS_VIEW_SALES: 'pos.view_sales',

  // الفواتير
  INVOICE_CREATE: 'invoice.create',
  INVOICE_EDIT: 'invoice.edit',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_PRINT: 'invoice.print',
  INVOICE_REPRINT: 'invoice.reprint',

  // المنتجات
  PRODUCT_ADD: 'product.add',
  PRODUCT_EDIT: 'product.edit',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_VIEW: 'product.view',

  // العملاء
  CUSTOMER_ADD: 'customer.add',
  CUSTOMER_EDIT: 'customer.edit',
  CUSTOMER_DELETE: 'customer.delete',
  CUSTOMER_VIEW: 'customer.view',

  // الموردين
  SUPPLIER_ADD: 'supplier.add',
  SUPPLIER_EDIT: 'supplier.edit',
  SUPPLIER_DELETE: 'supplier.delete',
  SUPPLIER_VIEW: 'supplier.view',

  // المخزون
  INVENTORY_ADD: 'inventory.add',
  INVENTORY_EDIT: 'inventory.edit',
  INVENTORY_DELETE: 'inventory.delete',
  INVENTORY_VIEW: 'inventory.view',

  // التقارير
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',

  // الإعدادات
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_VIEW: 'settings.view',

  // المستخدمون
  USER_ADD: 'user.add',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  USER_VIEW: 'user.view',
  USER_ASSIGN_PERMISSIONS: 'user.assign_permissions',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// التحقق من صلاحية واحدة
export function hasPermission(role: RoleEntity | undefined, permission: string): boolean {
  if (!role) return false;
  if (role.permissions['*']) return true;
  return role.permissions[permission] === true;
}

// التحقق من عدة صلاحيات (أي واحدة)
export function hasAnyPermission(role: RoleEntity | undefined, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

// التحقق من جميع الصلاحيات
export function hasAllPermissions(role: RoleEntity | undefined, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// ===== الدوال القديمة للتوافق مع الكود الحالي =====

export const canControlCash = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'cashier';

export const canSeeProfit = (role: UserRole | undefined): boolean =>
  role === 'admin';

export const canManageSettings = (role: UserRole | undefined): boolean =>
  role === 'admin';

export const canRegisterCustomerPayment = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'cashier' || role === 'seller';

export const canManageInventory = (role: UserRole | undefined): boolean =>
  role === 'admin';

export const canManageAccounts = (role: UserRole | undefined): boolean =>
  role === 'admin';

export const canManageEntries = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'accountant';

export const canReviewEntries = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'accountant';

export const canPrintReports = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'accountant';

export const canViewEntries = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'accountant' || role === 'cashier';
