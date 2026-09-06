import { PERMISSIONS } from '@/utils/permissions';

// ===== مجموعات وترجمات الصلاحيات الشاملة =====
export const PERMISSION_GROUPS = [
  {
    label: 'نقطة البيع',
    permissions: [PERMISSIONS.POS_COMPLETE_SALE, PERMISSIONS.POS_CANCEL_SALE, PERMISSIONS.POS_VIEW_SALES],
  },
  {
    label: 'الفواتير',
    permissions: [PERMISSIONS.INVOICE_CREATE, PERMISSIONS.INVOICE_EDIT, PERMISSIONS.INVOICE_DELETE, PERMISSIONS.INVOICE_PRINT, PERMISSIONS.INVOICE_REPRINT],
  },
  {
    label: 'الطباعة والقوالب',
    permissions: [PERMISSIONS.PRINT_TEMPLATE_CREATE, PERMISSIONS.PRINT_TEMPLATE_EDIT, PERMISSIONS.PRINT_TEMPLATE_DELETE, PERMISSIONS.PRINT_TEMPLATE_ASSIGN, PERMISSIONS.PRINT_MANAGE_PRINTERS, PERMISSIONS.PRINT_VIEW_HISTORY],
  },
  {
    label: 'المنتجات',
    permissions: [PERMISSIONS.PRODUCT_ADD, PERMISSIONS.PRODUCT_EDIT, PERMISSIONS.PRODUCT_DELETE, PERMISSIONS.PRODUCT_VIEW],
  },
  {
    label: 'العملاء',
    permissions: [PERMISSIONS.CUSTOMER_ADD, PERMISSIONS.CUSTOMER_EDIT, PERMISSIONS.CUSTOMER_DELETE, PERMISSIONS.CUSTOMER_VIEW],
  },
  {
    label: 'الموردين',
    permissions: [PERMISSIONS.SUPPLIER_ADD, PERMISSIONS.SUPPLIER_EDIT, PERMISSIONS.SUPPLIER_DELETE, PERMISSIONS.SUPPLIER_VIEW],
  },
  {
    label: 'المخزون',
    permissions: [PERMISSIONS.INVENTORY_ADD, PERMISSIONS.INVENTORY_EDIT, PERMISSIONS.INVENTORY_DELETE, PERMISSIONS.INVENTORY_VIEW],
  },
  {
    label: 'الصندوق والمالية',
    permissions: [PERMISSIONS.CASH_OPEN_SESSION, PERMISSIONS.CASH_CLOSE_SESSION, PERMISSIONS.CASH_VIEW_PROFIT, PERMISSIONS.CASH_REGISTER_PAYMENT],
  },
  {
    label: 'المحاسبة والقيود',
    permissions: [PERMISSIONS.ACCOUNTING_MANAGE_ENTRIES, PERMISSIONS.ACCOUNTING_REVIEW_ENTRIES, PERMISSIONS.ACCOUNTING_VIEW_ENTRIES],
  },
  {
    label: 'التقارير',
    permissions: [PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT, PERMISSIONS.REPORT_PRINT],
  },
  {
    label: 'الإعدادات',
    permissions: [PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SETTINGS_VIEW],
  },
  {
    label: 'المستخدمون',
    permissions: [PERMISSIONS.USER_ADD, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE, PERMISSIONS.USER_VIEW, PERMISSIONS.USER_ASSIGN_PERMISSIONS],
  },
];

export const PERMISSION_LABELS: Record<string, string> = {
  // نقطة البيع
  [PERMISSIONS.POS_COMPLETE_SALE]: 'إتمام البيع',
  [PERMISSIONS.POS_CANCEL_SALE]: 'إلغاء البيع',
  [PERMISSIONS.POS_VIEW_SALES]: 'عرض المبيعات',

  // الفواتير
  [PERMISSIONS.INVOICE_CREATE]: 'إنشاء فاتورة',
  [PERMISSIONS.INVOICE_EDIT]: 'تعديل فاتورة',
  [PERMISSIONS.INVOICE_DELETE]: 'حذف فاتورة',
  [PERMISSIONS.INVOICE_PRINT]: 'طباعة فاتورة',
  [PERMISSIONS.INVOICE_REPRINT]: 'إعادة طباعة فاتورة',

  // الطباعة والقوالب
  [PERMISSIONS.PRINT_TEMPLATE_CREATE]: 'إنشاء قالب طباعة',
  [PERMISSIONS.PRINT_TEMPLATE_EDIT]: 'تعديل قالب طباعة',
  [PERMISSIONS.PRINT_TEMPLATE_DELETE]: 'حذف قالب طباعة',
  [PERMISSIONS.PRINT_TEMPLATE_ASSIGN]: 'تعيين قالب افتراضي',
  [PERMISSIONS.PRINT_MANAGE_PRINTERS]: 'إدارة الطابعات',
  [PERMISSIONS.PRINT_VIEW_HISTORY]: 'عرض سجل الطباعة',

  // المنتجات
  [PERMISSIONS.PRODUCT_ADD]: 'إضافة منتج',
  [PERMISSIONS.PRODUCT_EDIT]: 'تعديل منتج',
  [PERMISSIONS.PRODUCT_DELETE]: 'حذف منتج',
  [PERMISSIONS.PRODUCT_VIEW]: 'عرض المنتجات',

  // العملاء
  [PERMISSIONS.CUSTOMER_ADD]: 'إضافة عميل',
  [PERMISSIONS.CUSTOMER_EDIT]: 'تعديل عميل',
  [PERMISSIONS.CUSTOMER_DELETE]: 'حذف عميل',
  [PERMISSIONS.CUSTOMER_VIEW]: 'عرض العملاء',

  // الموردين
  [PERMISSIONS.SUPPLIER_ADD]: 'إضافة مورد',
  [PERMISSIONS.SUPPLIER_EDIT]: 'تعديل مورد',
  [PERMISSIONS.SUPPLIER_DELETE]: 'حذف مورد',
  [PERMISSIONS.SUPPLIER_VIEW]: 'عرض الموردين',

  // المخزون
  [PERMISSIONS.INVENTORY_ADD]: 'إضافة حركة مخزون',
  [PERMISSIONS.INVENTORY_EDIT]: 'تعديل حركة مخزون',
  [PERMISSIONS.INVENTORY_DELETE]: 'حذف حركة مخزون',
  [PERMISSIONS.INVENTORY_VIEW]: 'عرض المخزون',

  // الصندوق والمالية
  [PERMISSIONS.CASH_OPEN_SESSION]: 'فتح جلسة صندوق',
  [PERMISSIONS.CASH_CLOSE_SESSION]: 'إغلاق جلسة صندوق',
  [PERMISSIONS.CASH_VIEW_PROFIT]: 'عرض الأرباح والمالية',
  [PERMISSIONS.CASH_REGISTER_PAYMENT]: 'تسجيل مقبوضات العملاء',

  // المحاسبة والقيود
  [PERMISSIONS.ACCOUNTING_MANAGE_ENTRIES]: 'إدارة القيود المحاسبية',
  [PERMISSIONS.ACCOUNTING_REVIEW_ENTRIES]: 'مراجعة القيود',
  [PERMISSIONS.ACCOUNTING_VIEW_ENTRIES]: 'عرض القيود المحاسبية',

  // التقارير
  [PERMISSIONS.REPORT_VIEW]: 'عرض التقارير',
  [PERMISSIONS.REPORT_EXPORT]: 'تصدير التقارير',
  [PERMISSIONS.REPORT_PRINT]: 'طباعة التقارير',

  // الإعدادات
  [PERMISSIONS.SETTINGS_EDIT]: 'تعديل الإعدادات',
  [PERMISSIONS.SETTINGS_VIEW]: 'عرض الإعدادات',

  // المستخدمون
  [PERMISSIONS.USER_ADD]: 'إضافة مستخدم',
  [PERMISSIONS.USER_EDIT]: 'تعديل مستخدم',
  [PERMISSIONS.USER_DELETE]: 'حذف مستخدم',
  [PERMISSIONS.USER_VIEW]: 'عرض المستخدمين',
  [PERMISSIONS.USER_ASSIGN_PERMISSIONS]: 'تعيين صلاحيات',
};
