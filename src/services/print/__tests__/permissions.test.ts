// permissions اختبارات — POS-PRINT-001 Sprint C
// BR-PRINT-006: مصفوفة الصلاحيات
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { canPerform, type PrintAction } from '@/services/print/permissions';

// mock authStore قبل الاستيراد
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'u1', username: 'admin', name: 'مدير', role: 'admin' } })),
}));

describe('POS-PRINT-001 Sprint C: Permissions — BR-PRINT-006', () => {
  describe('canPerform (admin)', () => {
    it('يسمح للمدير بكل الإجراءات الإدارية', () => {
      const adminActions: PrintAction[] = [
        'create_template', 'edit_template', 'delete_template',
        'set_default_template', 'assign_template',
      ];
      for (const action of adminActions) {
        expect(canPerform(action, 'admin')).toBe(true);
      }
    });

    it('يسمح للمدير بالطباعة وإعادة الطباعة ومعاينة السجل', () => {
      expect(canPerform('print', 'admin')).toBe(true);
      expect(canPerform('reprint', 'admin')).toBe(true);
      expect(canPerform('view_history', 'admin')).toBe(true);
      expect(canPerform('view_templates', 'admin')).toBe(true);
    });
  });

  describe('canPerform (cashier)', () => {
    it('يرفض من الكاشير إنشاء/تعديل/حذف/تعيين القوالب', () => {
      expect(canPerform('create_template', 'cashier')).toBe(false);
      expect(canPerform('edit_template', 'cashier')).toBe(false);
      expect(canPerform('delete_template', 'cashier')).toBe(false);
      expect(canPerform('set_default_template', 'cashier')).toBe(false);
      expect(canPerform('assign_template', 'cashier')).toBe(false);
    });

    it('يسمح للكاشير بالطباعة وإعادة الطباعة ومعاينة السجل والقوالب', () => {
      expect(canPerform('print', 'cashier')).toBe(true);
      expect(canPerform('reprint', 'cashier')).toBe(true);
      expect(canPerform('view_history', 'cashier')).toBe(true);
      expect(canPerform('view_templates', 'cashier')).toBe(true);
    });
  });

  describe('canPerform (seller)', () => {
    it('يرفض من البائع كل الإجراءات الإدارية', () => {
      expect(canPerform('create_template', 'seller')).toBe(false);
      expect(canPerform('edit_template', 'seller')).toBe(false);
      expect(canPerform('delete_template', 'seller')).toBe(false);
      expect(canPerform('set_default_template', 'seller')).toBe(false);
      expect(canPerform('assign_template', 'seller')).toBe(false);
    });

    it('يسمح للبائع بالطباعة فقط (لا إعادة طباعة ولا معاينة السجل)', () => {
      expect(canPerform('print', 'seller')).toBe(true);
      expect(canPerform('reprint', 'seller')).toBe(false);
      expect(canPerform('view_history', 'seller')).toBe(false);
      expect(canPerform('view_templates', 'seller')).toBe(true);
    });
  });

  describe('canPerform (undefined/null)', () => {
    it('يرفض كل الإجراءات عند غياب role', () => {
      expect(canPerform('print', undefined)).toBe(false);
      expect(canPerform('view_templates', null)).toBe(false);
      expect(canPerform('print', null)).toBe(false);
    });
  });

  describe('BR-PRINT-006: حماية الخدمات', () => {
    it('مصفوفة الصلاحيات تطابق جدول البراند PRD', () => {
      // الجدول: مدير ✓✓✓✓✓✓✓✓ | كاشير ❌❌❌❌❌✓✓✓✓ | بائع ❌❌❌❌❌✓❌❌✓
      const matrix: Record<PrintAction, { admin: boolean; cashier: boolean; seller: boolean }> = {
        create_template: { admin: true, cashier: false, seller: false },
        edit_template: { admin: true, cashier: false, seller: false },
        delete_template: { admin: true, cashier: false, seller: false },
        set_default_template: { admin: true, cashier: false, seller: false },
        assign_template: { admin: true, cashier: false, seller: false },
        print: { admin: true, cashier: true, seller: true },
        reprint: { admin: true, cashier: true, seller: false },
        view_history: { admin: true, cashier: true, seller: false },
        view_templates: { admin: true, cashier: true, seller: true },
      };
      for (const [action, expected] of Object.entries(matrix)) {
        expect(canPerform(action as PrintAction, 'admin')).toBe(expected.admin);
        expect(canPerform(action as PrintAction, 'cashier')).toBe(expected.cashier);
        expect(canPerform(action as PrintAction, 'seller')).toBe(expected.seller);
      }
    });
  });
});
