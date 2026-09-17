import React from 'react';
import { Shield, X } from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../constants/permissionGroups';
import type { RoleEntity } from '@/infrastructure/database/dexie/db';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  editingRole: RoleEntity | null;
  roleForm: {
    name: string;
    description: string;
    permissions: Record<string, boolean>;
  };
  setRoleForm: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    permissions: Record<string, boolean>;
  }>>;
  togglePermission: (key: string) => void;
}

export default function RoleFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingRole,
  roleForm,
  setRoleForm,
  togglePermission,
}: RoleFormModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-8 w-full max-w-2xl shadow-2xl my-8 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cairo text-base font-bold text-on-surface">
                {editingRole ? 'تعديل دور مخصص' : 'إنشاء دور جديد'}
              </h3>
              <p className="text-xs text-on-surface-variant">تخصيص مصفوفة الصلاحيات الممنوحة للمستخدمين</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">اسم الدور</label>
            <input
              type="text"
              placeholder="مثال: مسؤول مبيعات وتوزيع"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">الوصف (اختياري)</label>
            <input
              type="text"
              placeholder="وصف مختصر لمسؤوليات هذا الدور"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl cursor-pointer hover:bg-emerald-500/15 transition-all">
              <input
                type="checkbox"
                checked={roleForm.permissions['*'] === true}
                onChange={() => {
                  const allOn = roleForm.permissions['*'] === true;
                  const newPerms: Record<string, boolean> = allOn ? {} : { '*': true };
                  setRoleForm({ ...roleForm, permissions: newPerms });
                }}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-on-surface">صلاحيات المدير الكاملة (Full Admin Access)</span>
                <p className="text-[11px] text-on-surface-variant">منح الوصول لكافة شاشات ووظائف النظام دون قيود</p>
              </div>
            </label>

            {roleForm.permissions['*'] !== true &&
              PERMISSION_GROUPS.map((group) => (
                <div
                  key={group.label}
                  className="border border-outline-variant/20 bg-surface-container rounded-2xl p-3.5 space-y-2.5"
                >
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {group.label}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.permissions.map((p) => (
                      <label
                        key={p}
                        className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer hover:bg-surface-container-high rounded-xl px-2.5 py-1.5 transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={roleForm.permissions[p] === true}
                          onChange={() => togglePermission(p)}
                          className="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
                        />
                        <span className="font-medium text-on-surface">{PERMISSION_LABELS[p] || p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          <div className="flex gap-3 pt-3">
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
              {editingRole ? 'حفظ التعديلات' : 'إضافة الدور'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
