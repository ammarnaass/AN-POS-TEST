import React from 'react';
import { Shield, X } from 'lucide-react';
import { PasswordStrengthBar } from '@/utils/passwordStrength';
import type { User } from '@/types';
import type { RoleEntity } from '@/infrastructure/database/dexie/db';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  editingUser: User | null;
  userForm: {
    name: string;
    pin: string;
    role: 'admin' | 'cashier' | 'seller' | 'accountant' | 'sales_manager' | 'inventory_manager';
    roleId: string;
    email: string;
    phone: string;
  };
  setUserForm: React.Dispatch<React.SetStateAction<{
    name: string;
    pin: string;
    role: 'admin' | 'cashier' | 'seller' | 'accountant' | 'sales_manager' | 'inventory_manager';
    roleId: string;
    email: string;
    phone: string;
  }>>;
  roles: RoleEntity[];
}

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingUser,
  userForm,
  setUserForm,
  roles,
}: UserFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cairo text-base font-bold text-on-surface">
                {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {editingUser ? 'تحديث الصلاحيات وكلمة المرور' : 'إنشاء حساب جديد للموظف'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">الاسم الكامل</label>
            <input
              type="text"
              placeholder="مثال: أحمد عمار"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">البريد الإلكتروني</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">رقم الهاتف</label>
              <input
                type="tel"
                placeholder="05XX XX XX XX"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">
              {editingUser ? 'كلمة المرور الجديدة (اترك فارغاً للاحتفاظ بالقديمة)' : 'كلمة المرور (8 أحرف على الأقل)'}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={userForm.pin}
              onChange={(e) => setUserForm({ ...userForm, pin: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
            />
            {userForm.pin && (
              <PasswordStrengthBar password={userForm.pin} showDetails={true} />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">الدور الأساسي</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as typeof userForm.role })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="admin">🔴 مدير النظام (Admin)</option>
              <option value="cashier">🟣 كاشير (Cashier)</option>
              <option value="seller">🔵 بائع (Seller)</option>
              <option value="accountant">🔷 محاسب (Accountant)</option>
              <option value="sales_manager">🟢 مدير مبيعات (Sales Manager)</option>
              <option value="inventory_manager">🟡 مدير مخزون (Inventory Manager)</option>
            </select>
          </div>

          {roles.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">الدور المخصص (اختياري)</label>
              <select
                value={userForm.roleId}
                onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              >
                <option value="">بدون دور مخصص (استخدام صلاحيات الدور الأساسي)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-outline-variant/20 rounded-xl text-on-surface-variant text-xs font-bold hover:bg-surface-container transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
          >
            {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
          </button>
        </div>
      </div>
    </div>
  );
}
