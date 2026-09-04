// Tab Component: UsersRolesTab (Refactored from SettingsPage.tsx)
import React from 'react';
import {
  Settings, Users, Plus, Edit2, Trash2, Shield, Key, ScrollText,
  KeyRound, Lock, CheckCircle2, ShieldCheck, AlertCircle, Sparkles, UserCheck
} from 'lucide-react';
import { PERMISSION_LABELS } from '../constants/permissionGroups';

interface UsersRolesTabProps {
  [key: string]: any;
}

export default function UsersRolesTab({
  ACTION_LABELS,
  SYSTEM_ROLE_INFO,
  actActionFilter,
  actUserFilter,
  currentUser,
  deleteUserMutation,
  filteredActivities,
  filteredUsers,
  getRoleUsers,
  handleSaveSettings,
  openAddRole,
  openEditRole,
  removeRole,
  roles,
  setActActionFilter,
  setActUserFilter,
  setEditingUser,
  setNewPassword,
  setShowResetPassword,
  setShowUserForm,
  settings,
  setUserForm,
  setUserSearch,
  setUserStatusFilter,
  setUserSubTab,
  setViewingRoleDetails,
  toggleStatusMutation,
  uniqueActions,
  userName,
  userSearch,
  userStatusFilter,
  userSubTab,
  users
}: UsersRolesTabProps) {
  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
            {/* رأس القسم */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-cairo text-on-surface">إدارة المستخدمين والأمان</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      {users.length} مستخدم
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    إدارة حسابات الفريق، الصلاحيات، سجل التدقيق والنشاطات
                  </p>
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setUserForm({ name: '', pin: '', role: 'seller', roleId: '', email: '', phone: '' });
                    setEditingUser(null);
                    setShowUserForm(true);
                  }}
                  className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مستخدم جديد</span>
                </button>
              )}
            </div>

            {/* شريط التبويبات الفرعية */}
            <div className="flex gap-2 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15">
              {([
                { id: 'users', label: 'المستخدمون', Icon: Users, count: users.length },
                { id: 'activities', label: 'سجل النشاطات', Icon: ScrollText, count: filteredActivities.length },
                { id: 'roles', label: 'الأدوار والصلاحيات', Icon: Shield, count: roles.length },
                { id: 'security', label: 'سياسات التسجيل والأمان', Icon: KeyRound, count: undefined },
              ] as const).map(({ id, label, Icon, count }) => {
                const active = userSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUserSubTab(id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    {count !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          active ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* === تبويب 1: المستخدمون === */}
            {userSubTab === 'users' && (
              <div className="space-y-4">
                {/* شريط البحث والفلترة */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="بحث بالاسم أو اسم المستخدم..."
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <Users className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-3" />
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="active">نشط فقط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>

                {/* شبكة بطاقات المستخدمين */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {filteredUsers.map((user: any) => {
                    const roleStyles: Record<string, { label: string; badge: string; avatar: string }> = {
                      admin: { label: 'مدير النظام', badge: 'bg-red-500/10 text-red-500 border-red-500/20', avatar: 'bg-red-500/10 text-red-600 border-red-500/30' },
                      cashier: { label: 'كاشير', badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20', avatar: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
                      seller: { label: 'بائع', badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20', avatar: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
                      accountant: { label: 'محاسب', badge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', avatar: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30' },
                      sales_manager: { label: 'مدير مبيعات', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', avatar: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
                      inventory_manager: { label: 'مدير مخزون', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', avatar: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
                    };

                    const style = roleStyles[user.role] || { label: user.role, badge: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/20', avatar: 'bg-primary/10 text-primary border-primary/20' };
                    const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
                    const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

                    return (
                      <div
                        key={user.id}
                        className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-primary/30 transition-all shadow-xs group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            {/* الصورة الرمزية */}
                            <div className="relative">
                              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-lg border shadow-inner ${style.avatar}`}>
                                {initial}
                              </div>
                              <div
                                className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-surface-container ${
                                  user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                                title={user.status === 'active' ? 'نشط' : 'غير نشط'}
                              />
                            </div>

                            {/* اسم ومعرف المستخدم */}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold font-cairo text-on-surface">{user.name}</h3>
                                {user.id === currentUser?.id && (
                                  <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-primary/15 text-primary">
                                    أنت
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-on-surface-variant font-medium">@{user.username}</p>
                            </div>
                          </div>

                          {/* شارة الدور والحالة */}
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${style.badge}`}>
                              {style.label}
                            </span>
                            {user.status === 'active' ? (
                              <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                نشط
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-on-surface-variant">غير نشط</span>
                            )}
                          </div>
                        </div>

                        {/* معلومات إضافية (البريد، الهاتف، آخر دخول) */}
                        <div className="pt-3 border-t border-outline-variant/15 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
                          <div className="flex items-center gap-3 flex-wrap">
                            {user.phone && <span>📞 {user.phone}</span>}
                            {user.email && <span dir="ltr">✉️ {user.email}</span>}
                            {user.lastLogin && (
                              <span className="flex items-center gap-1 text-[11px]">
                                🕒 آخر دخول: {new Date(user.lastLogin).toLocaleDateString('ar-DZ')}
                              </span>
                            )}
                            {isLocked && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-500">
                                🔒 الحساب مقفل
                              </span>
                            )}
                          </div>
                        </div>

                        {/* شريط الإجراءات */}
                        {currentUser?.role === 'admin' && (
                          <div className="pt-2 border-t border-outline-variant/10 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowResetPassword(user.id);
                                setNewPassword('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-amber-500/10 text-amber-600 text-xs font-bold transition-all flex items-center gap-1"
                              title="إعادة تعيين كلمة المرور"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>كلمة السر</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(user);
                                setUserForm({
                                  name: user.name,
                                  pin: user.pin,
                                  role: user.role,
                                  roleId: user.roleId || '',
                                  email: user.email || '',
                                  phone: user.phone || '',
                                });
                                setShowUserForm(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary/10 text-primary text-xs font-bold transition-all flex items-center gap-1"
                              title="تعديل بيانات المستخدم"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleStatusMutation.mutate({ id: user.id, current: user.status })}
                              disabled={user.id === currentUser?.id}
                              className={`p-1.5 rounded-xl transition-all ${
                                user.status === 'active'
                                  ? 'hover:bg-amber-500/10 text-amber-500'
                                  : 'hover:bg-emerald-500/10 text-emerald-500'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                              title={user.id === currentUser?.id ? 'لا يمكن تعطيل المستخدم الحالي' : user.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                            >
                              <Settings className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف المستخدم "${user.name}"؟`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={user.id === currentUser?.id}
                              className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title={user.id === currentUser?.id ? 'لا يمكن حذف المستخدم الحالي' : 'حذف المستخدم'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-on-surface-variant">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-bold">لا يوجد مستخدمون يطابقون معايير البحث</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === تبويب 2: سجل النشاطات === */}
            {userSubTab === 'activities' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <select
                      value={actUserFilter}
                      onChange={(e) => setActUserFilter(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">جميع المستخدمين</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={actActionFilter}
                      onChange={(e) => setActActionFilter(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">جميع العمليات</option>
                      {uniqueActions.map((a: any) => (
                        <option key={a} value={a}>
                          {ACTION_LABELS[a] || a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs text-on-surface-variant font-bold">
                    {filteredActivities.length} حركة مسجلة
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant/20">
                      <tr>
                        <th className="px-4 py-3">الوقت والتاريخ</th>
                        <th className="px-4 py-3">المستخدم</th>
                        <th className="px-4 py-3">نوع العملية</th>
                        <th className="px-4 py-3">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15">
                      {filteredActivities.map((a: any) => (
                        <tr key={a.id} className="hover:bg-surface-container-highest/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-on-surface-variant whitespace-nowrap">
                            {new Date(a.performedAt).toLocaleString('ar-DZ')}
                          </td>
                          <td className="px-4 py-3 font-bold text-on-surface">{userName(a.userId)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                a.action === 'login'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : a.action === 'logout'
                                  ? 'bg-yellow-500/10 text-yellow-600'
                                  : a.action === 'delete'
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-blue-500/10 text-blue-600'
                              }`}
                            >
                              {ACTION_LABELS[a.action] || a.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant leading-relaxed">
                            {a.details ?? a.entity ?? '-'}
                          </td>
                        </tr>
                      ))}
                      {filteredActivities.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">
                            لا توجد سجلات نشاط مسجلة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* === تبويب 3: الأدوار والصلاحيات === */}
            {userSubTab === 'roles' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-container rounded-2xl border border-outline-variant/15">
                  <div>
                    <h3 className="text-sm font-bold font-cairo text-on-surface">الأدوار والصلاحيات المعتمدة في النظام</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      تحديد صلاحيات الوصول الدقيقة لكل مستخدم لحماية البيانات والعمليات المالية
                    </p>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={openAddRole}
                      className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة دور مخصص</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role: any) => {
                    const info = SYSTEM_ROLE_INFO[role.name] || {
                      title: role.name,
                      subtitle: role.description || 'دور مخصص للمستخدمين',
                      icon: Shield,
                      color: 'bg-primary/10 text-primary',
                      badge: 'bg-primary/10 text-primary border-primary/20',
                      border: 'hover:border-primary/40',
                    };
                    const RoleIcon = info.icon;
                    const assignedUsers = getRoleUsers(role);
                    const count = assignedUsers.length;
                    const hasAll = role.permissions['*'] === true;
                    const activePermsCount = hasAll ? 'الكل' : Object.values(role.permissions).filter(Boolean).length;

                    return (
                      <div
                        key={role.id}
                        className={`p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 transition-all shadow-xs group ${info.border}`}
                      >
                        <div className="space-y-3">
                          {/* الترويسة مع الأيقونة وشارة النظام */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner ${info.color} border-outline-variant/20`}>
                                <RoleIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-base font-bold font-cairo text-on-surface flex items-center gap-1.5">
                                  {info.title}
                                </h4>
                                <p className="text-xs font-mono text-on-surface-variant font-medium">@{role.name}</p>
                              </div>
                            </div>

                            {role.isSystem ? (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
                                <span>🔒</span>
                                <span>دور نظامي</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {currentUser?.role === 'admin' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openEditRole(role)}
                                      className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-all"
                                      title="تعديل الدور"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeRole(role)}
                                      className="p-1.5 rounded-xl hover:bg-red-500/10 text-on-surface-variant hover:text-red-500 transition-all"
                                      title="حذف الدور"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* الوصف */}
                          <p className="text-xs text-on-surface-variant leading-relaxed min-h-[32px]">
                            {role.description || info.subtitle}
                          </p>

                          {/* شريط المستخدمين المرتبطين */}
                          <div className="p-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-on-surface">
                                {count} مستخدم مرتبط
                              </span>
                              {count > 0 && (
                                <div className="flex -space-x-1.5 rtl:space-x-reverse">
                                  {assignedUsers.slice(0, 3).map((u: any) => (
                                    <div
                                      key={u.id}
                                      title={u.name}
                                      className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold text-[9px] flex items-center justify-center border border-surface-container shadow-xs"
                                    >
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                                  {count > 3 && (
                                    <div className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface-variant font-bold text-[9px] flex items-center justify-center border border-surface-container">
                                      +{count - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <span className="text-[11px] font-bold text-on-surface-variant font-mono">
                              {activePermsCount} صلاحية
                            </span>
                          </div>
                        </div>

                        {/* الصلاحيات والميزات الممنوحة */}
                        <div className="space-y-2.5 pt-2 border-t border-outline-variant/15">
                          <div className="flex flex-wrap gap-1">
                            {hasAll ? (
                              <span className="w-full py-1 px-2.5 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-center">
                                ⚡ صلاحيات المدير الكاملة (جميع العمليات)
                              </span>
                            ) : (
                              Object.entries(role.permissions)
                                .filter(([, v]) => v)
                                .slice(0, 4)
                                .map(([k]) => (
                                  <span
                                    key={k}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-surface-container-low border border-outline-variant/15 text-on-surface-variant"
                                  >
                                    {PERMISSION_LABELS[k] || k}
                                  </span>
                                ))
                            )}
                            {!hasAll && Object.values(role.permissions).filter(Boolean).length > 4 && (
                              <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-primary bg-primary/10">
                                +{Object.values(role.permissions).filter(Boolean).length - 4} أخرى
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setViewingRoleDetails(role)}
                            className="w-full py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-outline-variant/15 hover:border-primary/30"
                          >
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            <span>استعراض الصلاحيات الكاملة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* === تبويب 4: سياسات التسجيل والأمان === */}
            {userSubTab === 'security' && (
              <div className="space-y-6 animate-fadeIn">
                {/* بطاقة 1: سياسة التسجيل الذاتي */}
                <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-cairo font-bold text-sm text-on-surface">السماح بالتسجيل الذاتي للمستخدمين</h3>
                        <p className="text-xs text-on-surface-variant font-tajawal mt-0.5 max-w-xl">
                          التحكم في إمكانية إنشاء حسابات جديدة مباشرة من شاشة تسجيل الدخول. عند التعطيل، يختفي خيار "إنشاء حساب جديد" ولا يمكن إضافة المستخدمين إلا بواسطة المدير.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveSettings?.({ allowSelfRegistration: !settings?.allowSelfRegistration })}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings?.allowSelfRegistration ? 'bg-primary' : 'bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          settings?.allowSelfRegistration ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 font-tajawal ${
                    settings?.allowSelfRegistration
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {settings?.allowSelfRegistration ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>التسجيل الذاتي متاح حالياً: يمكن لأي شخص إنشاء حساب من شاشة الدخول.</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>وضع الأمان المشدد نشط: التسجيل محصور بمدير النظام فقط لمنع أي وصول غير مصرح.</span>
                      </>
                    )}
                  </div>
                </div>

                {/* بطاقة 2: الدور الافتراضي للمستخدمين الجدد */}
                <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0 border border-secondary/20">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-cairo font-bold text-sm text-on-surface">الدور الافتراضي للتسجيل</h3>
                      <p className="text-xs text-on-surface-variant font-tajawal mt-0.5">
                        الدور والصلاحيات التي تُمنح تلقائياً لأي مستخدم جديد يتم إنشاؤه عبر التسجيل الذاتي أو بدون تحديد دور خاص.
                      </p>

                      <div className="mt-3 max-w-sm">
                        <select
                          value={settings?.defaultRole || 'seller'}
                          onChange={(e) => handleSaveSettings?.({ defaultRole: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                        >
                          <option value="seller">🔵 بائع (Seller) — نقطة البيع الأساسية فقط</option>
                          <option value="cashier">🟣 كاشير (Cashier) — البيع وإدارة صندوق الكاش</option>
                          <option value="accountant">🔷 محاسب (Accountant) — فواتير ومصاريف وتقارير</option>
                          <option value="sales_manager">🟢 مدير مبيعات (Sales Manager) — مبيعات وزبائن</option>
                          <option value="inventory_manager">🟡 مدير مخزون (Inventory Manager) — منتجات ومخزون</option>
                          {roles?.filter((r: any) => !['seller', 'cashier', 'accountant', 'sales_manager', 'inventory_manager', 'admin'].includes(r.name)).map((r: any) => (
                            <option key={r.id} value={r.name}>
                              ⚙️ دور مخصص: {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* بطاقة 3: معايير قوة كلمة المرور */}
                <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-cairo font-bold text-sm text-on-surface">سياسة تعقيد كلمات المرور</h3>
                      <p className="text-xs text-on-surface-variant font-tajawal mt-0.5">
                        القواعد الإلزامية المطبقة عند إنشاء الحسابات أو إعادة تعيين كلمة المرور
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/15 flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-bold text-on-surface block">8 أحرف على الأقل</span>
                        <span className="text-[11px] text-on-surface-variant">طول كلمة المرور الأدنى</span>
                      </div>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/15 flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-bold text-on-surface block">أحرف وأرقام معاً</span>
                        <span className="text-[11px] text-on-surface-variant">مزيج الحروف والخانة الرقمية</span>
                      </div>
                    </div>
                    <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/15 flex items-center gap-2 text-xs">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="font-bold text-on-surface block">شريط تقييم ديناميكي</span>
                        <span className="text-[11px] text-on-surface-variant">فحص فوري حي للقوة أثناء الكتابة</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* بطاقة 4: بنية التشفير وحماية البيانات */}
                <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-cairo font-bold text-sm text-on-surface">تشفير كلمات المرور وعزل العمليات</h3>
                        <p className="text-xs text-on-surface-variant font-tajawal mt-0.5">
                          خوارزمية Scrypt القياسية في Node.js Main Process
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      نشط ومشفّر
                    </span>
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/15 space-y-1.5 text-xs font-tajawal text-on-surface-variant">
                    <div className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                      <span>خوارزمية اشتقاق المفاتيح (KDF):</span>
                      <span className="font-mono font-bold text-on-surface">scrypt (N=16384, r=8, p=1, keyLen=32)</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                      <span>الملح العشوائي (Salt):</span>
                      <span className="font-mono font-bold text-on-surface">128-bit Cryptographic Salt (Hex)</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                      <span>عزل الواجهة (Renderer Isolation):</span>
                      <span className="font-bold text-emerald-500">مطبّق — لا يتم تسريب أي كلمات مرور أو هاشات للواجهة</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>الترحيل التلقائي (Auto-Migration):</span>
                      <span className="font-bold text-primary">تشفير فوري لأي حساب قديم عند أول تسجيل دخول ناجح</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
}
