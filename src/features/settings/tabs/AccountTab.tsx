// Tab Component: AccountTab (Optimized for UI/UX Pro Max standards & multi-screen responsiveness)
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Shield, ShieldCheck, Lock, Eye, EyeOff, Save,
  CheckCircle2, AlertCircle, Clock, Sparkles, Phone, Mail,
  Sun, Moon, LogOut, Calendar, Laptop, RefreshCw,
  Check, Edit3, X, History, UserCheck, KeyRound
} from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { roleRepo } from '../infrastructure/repositories/roleRepo';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '../constants/permissionGroups';
import { hasPermission } from '@/utils/permissions';
import { validatePasswordStrength, PasswordStrengthBar } from '@/utils/passwordStrength';
import { generateId } from '@/utils';

interface AccountTabProps {
  currentUser?: any;
  [key: string]: any;
}

type SubTab = 'profile' | 'security' | 'permissions' | 'activity' | 'preferences';

export default function AccountTab({ currentUser: propUser }: AccountTabProps) {
  const queryClient = useQueryClient();
  const { user: authUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { addNotification } = useNotificationStore();

  const user = authUser || propUser;
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('profile');

  // تعديل الملف الشخصي
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // تغيير كلمة المرور
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // تأكيد تسجيل الخروج
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // جلب الأدوار
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleRepo.all(),
  });

  // جلب سجل النشاطات
  const { data: allActivities = [], refetch: refetchActivities, isFetching: isFetchingActivities } = useQuery({
    queryKey: ['user_activities'],
    queryFn: () => db.user_activities.toArray(),
  });

  const userActivities = useMemo(() => {
    if (!user) return [];
    const userId = user.id;
    const userName = user.username;
    return allActivities
      .filter((act: any) => act.userId === userId || act.user_id === userId || act.username === userName)
      .sort((a: any, b: any) => {
        const timeA = new Date(a.performedAt || a.performed_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.performedAt || b.performed_at || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 30);
  }, [allActivities, user]);

  const currentRoleEntity = useMemo(() => {
    if (!user) return undefined;
    return roles.find((r) => r.id === user.roleId || r.name === user.role);
  }, [roles, user]);

  React.useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!profileForm.name.trim()) {
      addNotification({ title: 'تنبيه', message: 'يرجى إدخال الاسم الكامل', type: 'warning' });
      return;
    }
    if (!profileForm.username.trim()) {
      addNotification({ title: 'تنبيه', message: 'يرجى إدخال اسم المستخدم', type: 'warning' });
      return;
    }

    setSavingProfile(true);
    try {
      const now = new Date().toISOString();
      const updates = {
        name: profileForm.name.trim(),
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        updatedAt: now,
      };

      const api = (window as any).electronAPI;
      if (api?.db?.update) {
        await api.db.update('users', user.id, {
          name: updates.name,
          username: updates.username,
          email: updates.email,
          phone: updates.phone,
          updated_at: now,
        });
      }

      await db.users.update(user.id, updates);

      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      }));

      queryClient.invalidateQueries({ queryKey: ['users'] });

      await db.user_activities.add({
        id: generateId(),
        userId: user.id,
        action: 'profile_update',
        entity: 'user',
        entityType: 'user',
        details: 'تحديث بيانات الحساب الشخصي',
        performedAt: now,
      });
      queryClient.invalidateQueries({ queryKey: ['user_activities'] });

      addNotification({
        title: 'تم الحفظ',
        message: 'تم تحديث بيانات ملفك الشخصي بنجاح',
        type: 'success',
      });
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      addNotification({
        title: 'خطأ',
        message: err?.message || 'فشل تحديث البيانات الشخصية',
        type: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!newPassword) {
      addNotification({ title: 'تنبيه', message: 'يرجى إدخال كلمة المرور الجديدة', type: 'warning' });
      return;
    }

    if (newPassword !== confirmPassword) {
      addNotification({ title: 'تنبيه', message: 'كلمة المرور وتأكيدها غير متطابقين', type: 'warning' });
      return;
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid && newPassword.length < 6) {
      addNotification({
        title: 'تنبيه أمني',
        message: 'كلمة المرور يجب ألا تقل عن 6 خانات مع أرقام وأحرف',
        type: 'warning',
      });
      return;
    }

    setSavingPassword(true);
    try {
      const now = new Date().toISOString();
      const api = (window as any).electronAPI;

      if (api?.auth?.resetPassword) {
        await api.auth.resetPassword(user.id, newPassword);
      } else if (api?.db?.update) {
        await api.db.update('users', user.id, {
          pin: newPassword,
          password_changed_at: now,
          updated_at: now,
        });
      }

      await db.users.update(user.id, {
        pin: newPassword,
        passwordChangedAt: now,
        updatedAt: now,
      });

      await db.user_activities.add({
        id: generateId(),
        userId: user.id,
        action: 'password_change',
        entity: 'user',
        entityType: 'user',
        details: 'تغيير وتحديث الرمز السري للحساب',
        performedAt: now,
      });
      queryClient.invalidateQueries({ queryKey: ['user_activities'] });

      addNotification({
        title: 'تم التحديث بنجاح',
        message: 'تم تغيير كلمة المرور والرمز السري بنجاح وتشفيرها بأمان',
        type: 'success',
      });

      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      console.error('Failed to change password:', err);
      addNotification({
        title: 'خطأ',
        message: err?.message || 'فشل تغيير كلمة المرور',
        type: 'error',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'developer':
        return {
          title: 'مطور النظام',
          badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
          icon: Sparkles,
          desc: 'تحكم شامل بجميع أدوات وإعدادات النظام',
        };
      case 'admin':
        return {
          title: 'مدير النظام',
          badgeClass: 'bg-primary/10 text-primary border-primary/20',
          icon: ShieldCheck,
          desc: 'إدارة المستخدمين والمالية والتقارير والإعدادات',
        };
      case 'cashier':
        return {
          title: 'كاشير',
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
          icon: UserCheck,
          desc: 'إتمام المبيعات والفواتير والمقبوضات',
        };
      case 'seller':
        return {
          title: 'بائع',
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
          icon: User,
          desc: 'البيع وعرض المنتجات وقائمة الفواتير',
        };
      default:
        return {
          title: role || 'مستخدم',
          badgeClass: 'bg-secondary/10 text-secondary border-secondary/20',
          icon: User,
          desc: 'مستخدم بنظام AN POS',
        };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'غير متوفر';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getActivityLabel = (action: string) => {
    const map: Record<string, { label: string; color: string }> = {
      login: { label: 'تسجيل دخول', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
      logout: { label: 'تسجيل خروج', color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
      profile_update: { label: 'تعديل الملف', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
      password_change: { label: 'تغيير الرمز', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
      sale: { label: 'عملية بيع', color: 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20' },
      create: { label: 'إنشاء عنصر', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
      update: { label: 'تحديث بيانات', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
      delete: { label: 'حذف', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
      print: { label: 'طباعة فاتورة', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    };
    return map[action] || { label: action || 'عملية نظام', color: 'text-primary bg-primary/10 border-primary/20' };
  };

  if (!user) {
    return (
      <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-8 sm:p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold font-cairo text-on-surface mb-1.5">لم يتم تسجيل الدخول</h3>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm mx-auto">
          يرجى تسجيل الدخول إلى النظام للوصول إلى تفاصيل الحساب الشخصي وتعديل إعداداتك.
        </p>
      </div>
    );
  }

  const roleInfo = getRoleInfo(user.role);
  const RoleIcon = roleInfo.icon;
  const userInitial = (user.name || user.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn max-w-full overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. Hero Profile Header Card (مضغوطة وأنيقة ومناسبة لجميع الشاشات) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-low border border-outline-variant/20 p-4 sm:p-5 shadow-sm">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-tertiary/5 rounded-full blur-2xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* الجانب الأيمن: الصورة الرمزية والاسم والرتبة */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Avatar متوازن الحجم */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center font-cairo font-black text-xl sm:text-2xl shadow-md shadow-primary/20 ring-2 ring-surface-container-low">
                {userInitial}
              </div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-lg bg-surface-container-lowest border border-surface-container-low flex items-center justify-center shadow-sm">
                <RoleIcon className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>

            {/* تفاصيل الاسم والمعرف والدور */}
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold font-cairo text-on-surface truncate">
                  {user.name || user.username}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-cairo border flex items-center gap-1 ${roleInfo.badgeClass}`}>
                  <RoleIcon className="w-3 h-3 shrink-0" />
                  <span>{roleInfo.title}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  نشط
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-on-surface-variant font-tajawal">
                <div className="flex items-center gap-1">
                  <span className="text-on-surface-variant/70">المعرف:</span>
                  <span className="font-mono font-bold text-on-surface">@{user.username}</span>
                </div>
                {user.email && (
                  <div className="hidden md:flex items-center gap-1 truncate max-w-[180px]">
                    <Mail className="w-3 h-3 text-on-surface-variant/70 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="hidden sm:flex items-center gap-1">
                    <Phone className="w-3 h-3 text-on-surface-variant/70 shrink-0" />
                    <span dir="ltr">{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* الجانب الأيسر: الإجراءات السريعة (تسجيل الخروج) */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="cursor-pointer px-3.5 py-2 rounded-xl bg-surface-container hover:bg-error-container/20 text-on-surface-variant hover:text-error border border-outline-variant/20 hover:border-error/30 transition-all duration-200 flex items-center gap-1.5 text-xs font-bold font-cairo shadow-sm active:scale-95"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* شريط الإحصائيات السريعة السفلي */}
        <div className="mt-4 pt-3.5 border-t border-outline-variant/15 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container/40">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant/80 font-cairo truncate">تاريخ الإنشاء</p>
              <p className="text-xs font-bold text-on-surface font-tajawal truncate">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container/40">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant/80 font-cairo truncate">آخر دخول</p>
              <p className="text-xs font-bold text-on-surface font-tajawal truncate">{user.lastLogin ? formatDate(user.lastLogin) : 'الآن'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container/40">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Laptop className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant/80 font-cairo truncate">الجلسة</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-tajawal truncate">متصل محلياً</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container/40">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-on-surface-variant/80 font-cairo truncate">الأمان</p>
              <p className="text-xs font-bold text-on-surface font-tajawal truncate">مشفر بأمان</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Navigation Pills (أزرار التنقل بين أقسام الحساب الشخصي - متجاوبة وسلسة) */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {[
          { id: 'profile', label: 'البيانات الشخصية', icon: User },
          { id: 'security', label: 'الأمان وكلمة المرور', icon: Lock },
          { id: 'permissions', label: 'الصلاحيات ومستوى الوصول', icon: ShieldCheck },
          { id: 'activity', label: 'سجل نشاطاتي', icon: History, badge: userActivities.length },
          { id: 'preferences', label: 'تفضيلات المظهر', icon: Sun },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`cursor-pointer px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-cairo transition-all duration-200 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/25 scale-[1.01]'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/15'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. محتوى الأقسام (Tab Content Panels) */}
      {/* ========================================================================= */}

      {/* --- القسم 1: البيانات الشخصية (Profile Tab) --- */}
      {activeSubTab === 'profile' && (
        <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-cairo text-on-surface">بيانات الحساب والملف التعريفي</h2>
                <p className="text-xs text-on-surface-variant">معلومات الموظف المسجلة التي تظهر في الفواتير والتقارير</p>
              </div>
            </div>

            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="cursor-pointer px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all text-xs font-bold font-cairo flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            /* بطاقات عرض البيانات */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/10 space-y-0.5">
                <p className="text-[11px] font-cairo text-on-surface-variant">الاسم الكامل</p>
                <p className="text-sm sm:text-base font-bold text-on-surface font-cairo">{user.name || 'غير محدد'}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/10 space-y-0.5">
                <p className="text-[11px] font-cairo text-on-surface-variant">اسم المستخدم (لتسجيل الدخول)</p>
                <p className="text-sm sm:text-base font-bold font-mono text-primary">@{user.username}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/10 space-y-0.5">
                <p className="text-[11px] font-cairo text-on-surface-variant">رقم الهاتف</p>
                <p className="text-sm sm:text-base font-bold text-on-surface font-tajawal" dir="ltr">
                  {user.phone || 'غير مسجل'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/10 space-y-0.5">
                <p className="text-[11px] font-cairo text-on-surface-variant">البريد الإلكتروني</p>
                <p className="text-sm sm:text-base font-bold text-on-surface font-tajawal truncate">
                  {user.email || 'غير مسجل'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/10 space-y-0.5">
                <p className="text-[11px] font-cairo text-on-surface-variant">الدور الوظيفي</p>
                <p className="text-sm font-bold text-on-surface font-cairo">{roleInfo.title}</p>
                <p className="text-[11px] text-on-surface-variant font-tajawal">{roleInfo.desc}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/10 space-y-0.5">
                <p className="text-[11px] font-cairo text-on-surface-variant">معرّف الحساب (ID)</p>
                <p className="text-xs font-mono text-on-surface-variant break-all select-all">{user.id}</p>
              </div>
            </div>
          ) : (
            /* نموذج التعديل النشط */
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold font-cairo text-on-surface mb-1">
                    الاسم الكامل <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-cairo outline-none transition-all"
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-cairo text-on-surface mb-1">
                    اسم المستخدم <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-mono outline-none transition-all"
                    placeholder="username"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-cairo text-on-surface mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-tajawal outline-none transition-all"
                    placeholder="05XXXXXXXX"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-cairo text-on-surface mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-tajawal outline-none transition-all"
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/15">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={savingProfile}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold font-cairo transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="cursor-pointer px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold font-cairo transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --- القسم 2: الأمان وتغيير كلمة المرور (Security Tab) --- */}
      {activeSubTab === 'security' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 animate-fadeIn">
          {/* الجانب الأيمن: نموذج تحديث كلمة المرور */}
          <div className="xl:col-span-2 bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/15">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-cairo text-on-surface">تغيير الرمز السري وكلمة المرور</h2>
                <p className="text-xs text-on-surface-variant">الرمز السري يُستخدم لتسجيل الدخول إلى نقطة البيع وتأكيد العمليات الحساسة</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {/* كلمة المرور الجديدة */}
              <div>
                <label className="block text-xs font-bold font-cairo text-on-surface mb-1">
                  كلمة المرور / الرمز السري الجديد <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pl-10 rounded-xl bg-surface-container border border-outline-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-mono outline-none transition-all"
                    placeholder="أدخل كلمة المرور الجديدة"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="cursor-pointer absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <PasswordStrengthBar password={newPassword} showDetails={true} />
              </div>

              {/* تأكيد كلمة المرور */}
              <div>
                <label className="block text-xs font-bold font-cairo text-on-surface mb-1">
                  تأكيد كلمة المرور الجديدة <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 pl-10 rounded-xl bg-surface-container border border-outline-variant/25 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface text-sm font-mono outline-none transition-all"
                    placeholder="أعد إدخال كلمة المرور للتأكيد"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="cursor-pointer absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-error font-cairo mt-1">كلمة المرور وتأكيدها غير متطابقين</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
                  className="cursor-pointer w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs sm:text-sm font-bold font-cairo transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري التحديث والتشفير...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>تحديث كلمة المرور وتشفيرها</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* الجانب الأيسر: الإرشادات ومعايير الأمان */}
          <div className="space-y-3">
            <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold font-cairo text-xs sm:text-sm">
                <Shield className="w-4 h-4" />
                <span>إرشادات الأمان والحماية</span>
              </div>
              <ul className="space-y-2.5 text-xs text-on-surface-variant font-tajawal leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>احرص على ألا تقل كلمة المرور عن 8 خانات تتضمن أحرفاً وأرقاماً.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>لا تشارك رمزك السري الشخصي مع زملاء العمل لتفادي التداخل في تقارير المبيعات.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>يتم تشفير الرمز السري محلياً بخوارزميات حماية متطورة.</span>
                </li>
              </ul>
            </div>

            <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-3.5 shadow-sm space-y-1">
              <p className="text-xs font-bold font-cairo text-on-surface">آخر تغيير لكلمة المرور:</p>
              <p className="text-xs text-on-surface-variant font-tajawal">
                {user.passwordChangedAt ? formatDate(user.passwordChangedAt) : 'لم تسجل'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- القسم 3: الصلاحيات ومستوى الوصول (Permissions Tab) --- */}
      {activeSubTab === 'permissions' && (
        <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 sm:p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-cairo text-on-surface">الصلاحيات ومستوى الوصول</h2>
                <p className="text-xs text-on-surface-variant">المهام والعمليات المسموح لحسابك تنفيذها في أقسام المنظومة</p>
              </div>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-cairo border ${roleInfo.badgeClass}`}>
              {roleInfo.title}
            </span>
          </div>

          {(user.role === 'developer' || user.role === 'admin') && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2.5 text-primary text-xs font-bold font-cairo">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>حسابك يمتلك صلاحيات إدارية عليا تمكّنك من الوصول إلى كافة وظائف النظام والإعدادات.</span>
            </div>
          )}

          {/* مصفوفة الصلاحيات مقسمة حسب المجموعات بشكل مرن متجاوب */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {PERMISSION_GROUPS.map((group) => {
              const hasFull = user.role === 'developer' || user.role === 'admin';
              return (
                <div
                  key={group.label}
                  className="bg-surface-container rounded-xl border border-outline-variant/15 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant/10 pb-1.5">
                    <span className="text-xs font-bold font-cairo text-on-surface">{group.label}</span>
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {group.permissions.length} صلاحيات
                    </span>
                  </div>

                  <div className="space-y-1">
                    {group.permissions.map((perm) => {
                      const isAllowed = hasFull || (currentRoleEntity ? hasPermission(currentRoleEntity, perm) : false);
                      const permLabel = PERMISSION_LABELS[perm] || perm;
                      return (
                        <div
                          key={perm}
                          className="flex items-center justify-between text-xs py-0.5 px-2 rounded-lg bg-surface-container-low/60"
                        >
                          <span className="text-on-surface font-tajawal text-[11px] truncate max-w-[160px]">{permLabel}</span>
                          {isAllowed ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              <Check className="w-3 h-3 text-emerald-500" />
                              مسموح
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-on-surface-variant/50 shrink-0">
                              <Lock className="w-2.5 h-2.5" />
                              مقيد
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- القسم 4: سجل نشاطاتي (Activity Log Tab) --- */}
      {activeSubTab === 'activity' && (
        <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 sm:p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-cairo text-on-surface">سجل نشاطات الحساب الشخصي</h2>
                <p className="text-xs text-on-surface-variant">سجل الحركات والعمليات التي أجريتها مؤخراً في النظام</p>
              </div>
            </div>

            <button
              onClick={() => refetchActivities()}
              disabled={isFetchingActivities}
              className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold font-cairo flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingActivities ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>

          {userActivities.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-cairo text-xs sm:text-sm font-bold">لا توجد أنشطة مسجلة لهذا الحساب حتى الآن</p>
              <p className="font-tajawal text-[11px] opacity-70 mt-0.5">
                سيتم تسجيل عمليات الدخول وتعديل الحساب والمبيعات تلقائياً هنا
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-0.5">
              {userActivities.map((activity: any, idx: number) => {
                const actInfo = getActivityLabel(activity.action);
                const actDate = activity.performedAt || activity.performed_at || activity.createdAt;
                return (
                  <div
                    key={activity.id || idx}
                    className="p-2.5 sm:p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold font-cairo border shrink-0 ${actInfo.color}`}>
                        {actInfo.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface font-cairo truncate">
                          {activity.details || activity.action || 'عملية نظام'}
                        </p>
                        {activity.entityType && (
                          <p className="text-[10px] text-on-surface-variant font-tajawal truncate">
                            الكيان: {activity.entityType} {activity.entityId ? `#${activity.entityId}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-tajawal shrink-0 self-end sm:self-center">
                      <Clock className="w-3 h-3 opacity-60" />
                      <span>{formatDate(actDate)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- القسم 5: تفضيلات المظهر والواجهة (Preferences Tab) --- */}
      {activeSubTab === 'preferences' && (
        <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 sm:p-6 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant/15">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-cairo text-on-surface">تفضيلات المظهر ونظام العرض</h2>
              <p className="text-xs text-on-surface-variant">تخصيص نمط الواجهة المريح لعينيك أثناء العمل اليومي</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold font-cairo text-on-surface">نمط المظهر (الثيم):</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {/* بطاقة الوضع الفاتح */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border text-right transition-all flex items-start gap-3 ${
                  theme === 'light'
                    ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-sm'
                    : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/40'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    theme === 'light' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-bold font-cairo text-on-surface">الوضع الفاتح (Light)</p>
                    {theme === 'light' && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-tajawal">
                    ألوان ساطعة ملائمة لبيئات العمل ذات الإضاءة العالية.
                  </p>
                </div>
              </button>

              {/* بطاقة الوضع الداكن */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border text-right transition-all flex items-start gap-3 ${
                  theme === 'dark'
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-sm'
                    : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/40'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    theme === 'dark' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-bold font-cairo text-on-surface">الوضع الداكن (Dark)</p>
                    {theme === 'dark' && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-tajawal">
                    خلفيات داكنة تريح العين وتقلل من الإجهاد البصري.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. نافذة تأكيد تسجيل الخروج (Logout Confirmation Modal) */}
      {/* ========================================================================= */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-5 sm:p-6 w-full max-w-sm sm:max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-2.5 border-b border-outline-variant/15">
              <div className="w-9 h-9 rounded-xl bg-error-container/40 text-error flex items-center justify-center border border-error/20">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-cairo text-sm sm:text-base font-bold text-on-surface">تسجيل الخروج من الحساب</h3>
                <p className="text-xs text-on-surface-variant">إنهاء جلسة العمل الحالية في التطبيق</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-on-surface-variant font-tajawal leading-relaxed">
              هل أنت متأكد من رغبتك في إنهاء الجلسة وتسجيل الخروج؟ سيتعين عليك إدخال الرمز السري مرة أخرى للوصول.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="cursor-pointer px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold font-cairo transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="cursor-pointer px-4 py-2 rounded-xl bg-error hover:bg-error/90 text-on-error text-xs font-bold font-cairo transition-all shadow-sm flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تأكيد الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


