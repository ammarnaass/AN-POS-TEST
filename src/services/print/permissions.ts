// Print Permissions — POS-PRINT-001 Sprint C
// BR-PRINT-006: المدير فقط يمكنه إنشاء/تعديل/حذف/تعيين القوالب
import { useAuthStore } from '@/store/authStore';

export type PrintAction =
  | 'create_template'
  | 'edit_template'
  | 'delete_template'
  | 'set_default_template'
  | 'assign_template'
  | 'print'
  | 'reprint'
  | 'view_history'
  | 'view_templates'
  // POS-PRINT-001 / FR-013: إدارة الطابعات (اكتشاف/إضافة/تعديل/حذف/اختبار/حالة)
  | 'manage_printers'
  | 'view_printers';

const PERMISSIONS: Record<PrintAction, Array<'admin' | 'cashier' | 'seller' | 'accountant' | 'sales_manager' | 'inventory_manager'>> = {
  create_template: ['admin'],
  edit_template: ['admin'],
  delete_template: ['admin'],
  set_default_template: ['admin'],
  assign_template: ['admin'],
  print: ['admin', 'cashier', 'seller', 'sales_manager'],
  reprint: ['admin', 'cashier', 'sales_manager'],
  view_history: ['admin', 'cashier', 'sales_manager'],
  view_templates: ['admin', 'cashier', 'seller', 'sales_manager'],
  // FR-013: الإعداد التقني للطابعات للمدير ومدير المخزون (الأدوات التقنية)
  manage_printers: ['admin', 'inventory_manager'],
  view_printers: ['admin', 'cashier', 'seller', 'sales_manager', 'inventory_manager'],
};

export function canPerform(action: PrintAction, role: 'admin' | 'cashier' | 'seller' | 'accountant' | 'sales_manager' | 'inventory_manager' | undefined | null): boolean {
  if (!role) return false;
  return PERMISSIONS[action].includes(role);
}

export function useCanPerform(action: PrintAction): boolean {
  const user = useAuthStore((s) => s.user);
  return canPerform(action, user?.role);
}

export function useCanEditTemplates(): boolean {
  return useCanPerform('edit_template');
}

export function useCanDeleteTemplates(): boolean {
  return useCanPerform('delete_template');
}

export function useCanSetDefaultTemplate(): boolean {
  return useCanPerform('set_default_template');
}

export function useCanAssignTemplate(): boolean {
  return useCanPerform('assign_template');
}

// POS-PRINT-001 / FR-013: صلاحيات إدارة الطابعات
export function useCanManagePrinters(): boolean {
  return useCanPerform('manage_printers');
}

export function useCanViewPrinters(): boolean {
  return useCanPerform('view_printers');
}
