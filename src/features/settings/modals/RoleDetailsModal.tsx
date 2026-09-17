import React from 'react';
import { Shield, Users, X } from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../constants/permissionGroups';
import type { RoleEntity } from '@/infrastructure/database/dexie/db';
import type { User } from '@/types';

interface RoleDetailsModalProps {
  role: RoleEntity | null;
  onClose: () => void;
  getRoleUsers: (role: RoleEntity) => User[];
  systemRoleInfo: Record<string, { title: string; subtitle: string; icon: any; color: string; badge: string; border: string }>;
}

export default function RoleDetailsModal({
  role,
  onClose,
  getRoleUsers,
  systemRoleInfo,
}: RoleDetailsModalProps) {
  if (!role) return null;

  const roleUsers = getRoleUsers(role);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-8 w-full max-w-3xl shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الترويسة */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cairo text-lg font-bold text-on-surface">
                  {systemRoleInfo[role.name]?.title || role.name}
                </h3>
                <span className="text-xs font-mono text-on-surface-variant font-medium">
                  @{role.name}
                </span>
                {role.isSystem ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    دور نظامي أساسي
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    دور مخصص
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {role.description || systemRoleInfo[role.name]?.subtitle}
              </p>
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

        {/* المستخدمون المرتبطون بهذا الدور */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>المستخدمون المرتبطون بهذا الدور ({roleUsers.length})</span>
            </h4>
          </div>

          {roleUsers.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {roleUsers.map((u) => (
                <div
                  key={u.id}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-2 text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-on-surface">{u.name}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono">@{u.username}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant py-1">لا يوجد مستخدمون مرتبطون بهذا الدور حالياً.</p>
          )}
        </div>

        {/* مصفوفة الصلاحيات المفصلة */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-on-surface">مصفوفة الصلاحيات الممنوحة:</h4>

          {role.permissions['*'] ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <span className="text-sm font-bold text-emerald-600 block">
                ⚡ صلاحيات المدير الكاملة (Super Admin Access)
              </span>
              <p className="text-xs text-on-surface-variant">
                هذا الدور يمتلك حق الوصول الكامل دون أي قيود إلى كافة العمليات التجارية والمالية وإعدادات النظام.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PERMISSION_GROUPS.map((group) => {
                const activeInGroup = group.permissions.filter((p) => role.permissions[p] === true);
                return (
                  <div
                    key={group.label}
                    className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-outline-variant/10">
                      <span className="text-xs font-bold text-primary">{group.label}</span>
                      <span className="text-[10px] font-bold text-on-surface-variant font-mono">
                        {activeInGroup.length}/{group.permissions.length}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {group.permissions.map((p) => {
                        const isGranted = role.permissions[p] === true;
                        return (
                          <div
                            key={p}
                            className={`flex items-center justify-between text-[11px] py-1 px-2 rounded-lg ${
                              isGranted
                                ? 'bg-emerald-500/10 text-emerald-600 font-bold'
                                : 'text-on-surface-variant/40 line-through'
                            }`}
                          >
                            <span>{PERMISSION_LABELS[p] || p}</span>
                            <span>{isGranted ? '✓' : '—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-outline-variant/15">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
