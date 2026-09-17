import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type RoleEntity } from '@/infrastructure/database/dexie/db';
import { useAuthStore } from '@/store/authStore';
import { generateId } from '@/utils';
import { validatePasswordStrength } from '@/utils/passwordStrength';
import { roleRepo } from '../infrastructure/repositories/roleRepo';
import type { User } from '@/types';
import {
  Shield, ShoppingCart, Zap, BarChart3, Package, CircleDollarSign,
} from 'lucide-react';

export const ACTION_LABELS: Record<string, string> = {
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  account_locked: 'قفل الحساب',
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  print_invoice: 'طباعة فاتورة',
  reprint_invoice: 'إعادة طباعة',
};

export const SYSTEM_ROLE_INFO: Record<string, { title: string; subtitle: string; icon: any; color: string; badge: string; border: string }> = {
  admin: {
    title: 'مدير النظام',
    subtitle: 'تحكم كامل وشامل بجميع أجزاء ووظائف النظام',
    icon: Shield,
    color: 'bg-red-500/10 text-red-500',
    badge: 'bg-red-500/10 text-red-500 border-red-500/20',
    border: 'hover:border-red-500/40',
  },
  cashier: {
    title: 'كاشير',
    subtitle: 'إجراء المبيعات السريعة، طباعة الإيصالات، وإدارة الصندوق',
    icon: ShoppingCart,
    color: 'bg-purple-500/10 text-purple-600',
    badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    border: 'hover:border-purple-500/40',
  },
  seller: {
    title: 'بائع',
    subtitle: 'عمليات البيع المباشر وتصفح كتالوج الأصناف',
    icon: Zap,
    color: 'bg-blue-500/10 text-blue-600',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    border: 'hover:border-blue-500/40',
  },
  sales_manager: {
    title: 'مدير المبيعات',
    subtitle: 'إدارة عمليات البيع، الفواتير، ودليل العملاء',
    icon: BarChart3,
    color: 'bg-emerald-500/10 text-emerald-600',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    border: 'hover:border-emerald-500/40',
  },
  inventory_manager: {
    title: 'مدير المخزون',
    subtitle: 'إدارة المنتجات، حركات المخزون، ودليل الموردين',
    icon: Package,
    color: 'bg-amber-500/10 text-amber-600',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    border: 'hover:border-amber-500/40',
  },
  accountant: {
    title: 'محاسب',
    subtitle: 'إدارة المصاريف، الفواتير، والتقارير المالية',
    icon: CircleDollarSign,
    color: 'bg-cyan-500/10 text-cyan-600',
    badge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    border: 'hover:border-cyan-500/40',
  },
};

export function useUsersAndRoles() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const api = (window as any).electronAPI;
      if (api?.db?.list) {
        try {
          const sqliteUsers = await api.db.list('users');
          if (Array.isArray(sqliteUsers) && sqliteUsers.length > 0) {
            for (const u of sqliteUsers) {
              await db.users.put({
                id: u.id,
                username: u.username,
                name: u.name,
                pin: u.pin,
                role: u.role,
                roleId: u.role_id || '',
                email: u.email || '',
                phone: u.phone || '',
                avatar: u.avatar || '',
                status: u.status || 'active',
                loginAttempts: u.login_attempts || 0,
                lockedUntil: u.locked_until || '',
                passwordChangedAt: u.password_changed_at || '',
                lastLogin: u.last_login || '',
                createdAt: u.created_at || new Date().toISOString(),
                updatedAt: u.updated_at || new Date().toISOString(),
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('Failed to fetch users from SQLite:', e);
        }
      }
      return db.users.toArray();
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['user_activities'],
    queryFn: () => db.user_activities.toArray(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleRepo.all(),
  });

  const addUserMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const newId = generateId();
      const now = new Date().toISOString();
      const api = (window as any).electronAPI;

      if (api?.auth?.register) {
        try {
          await api.auth.register({
            username: (data.username as string) || (data.name as string),
            name: data.name as string,
            pin: data.pin as string,
            role: (data.role as string) || 'seller',
            roleId: (data.roleId as string) || '',
            email: (data.email as string) || '',
            phone: (data.phone as string) || '',
            callerRole: 'admin',
          });
        } catch (e) {
          console.error('Failed to create user via auth API in SQLite:', e);
        }
      } else if (api?.db?.create) {
        try {
          await api.db.create('users', {
            id: newId,
            username: (data.username as string) || (data.name as string),
            name: data.name as string,
            pin: data.pin as string,
            role: (data.role as string) || 'seller',
            role_id: (data.roleId as string) || '',
            email: (data.email as string) || '',
            phone: (data.phone as string) || '',
            status: 'active',
            login_attempts: 0,
            created_at: now,
            updated_at: now,
          });
        } catch (e) {
          console.error('Failed to create user in SQLite:', e);
        }
      }

      await db.users.add({
        id: newId,
        username: (data.username as string) || (data.name as string),
        name: data.name as string,
        pin: '',
        role: (data.role as any) || 'seller',
        roleId: (data.roleId as string) || '',
        email: (data.email as string) || '',
        phone: (data.phone as string) || '',
        status: 'active',
        loginAttempts: 0,
        createdAt: now,
        updatedAt: now,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const updateUserMutation = useMutation({
    mutationFn: async (user: User) => {
      const { id, ...data } = user;
      const now = new Date().toISOString();
      const api = (window as any).electronAPI;

      if (api?.db?.update) {
        try {
          await api.db.update('users', id, {
            name: data.name,
            username: data.username,
            role: data.role,
            role_id: data.roleId || '',
            email: data.email || '',
            phone: data.phone || '',
            status: data.status,
            updated_at: now,
          });
        } catch (e) {
          console.error('Failed to update user in SQLite:', e);
        }
      }

      await db.users.update(id, { ...data, updatedAt: now });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const user = await db.users.get(id);
      if (user?.role === 'developer') {
        throw new Error('لا يمكن حذف حساب مطور النظام');
      }
      if (user?.role === 'admin') {
        const adminCount = await db.users.where('role').equals('admin').count();
        if (adminCount <= 1) {
          throw new Error('لا يمكن حذف المدير الوحيد في النظام');
        }
      }
      if (id === currentUser?.id) {
        throw new Error('لا يمكن تعطيل المستخدم الحالي');
      }
      const now = new Date().toISOString();
      const api = (window as any).electronAPI;
      if (api?.db?.update) {
        try {
          await api.db.update('users', id, { status: 'inactive', updated_at: now });
        } catch (e) {
          console.error('Failed to update user status in SQLite:', e);
        }
      }
      await db.users.update(id, { status: 'inactive', updatedAt: now });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: string }) => {
      const user = await db.users.get(id);
      if (user?.role === 'developer') {
        throw new Error('لا يمكن تعطيل حساب مطور النظام');
      }
      if (user?.role === 'admin' && current === 'active') {
        const adminCount = await db.users.where('role').equals('admin').count();
        if (adminCount <= 1) {
          throw new Error('لا يمكن تعطيل المدير الوحيد');
        }
      }
      if (id === currentUser?.id && current === 'active') {
        throw new Error('لا يمكن تعطيل المستخدم الحالي');
      }
      const newStatus = current === 'active' ? 'inactive' : 'active';
      const now = new Date().toISOString();
      const api = (window as any).electronAPI;
      if (api?.db?.update) {
        try {
          await api.db.update('users', id, { status: newStatus, updated_at: now });
        } catch (e) {
          console.error('Failed to update user status in SQLite:', e);
        }
      }
      await db.users.update(id, { status: newStatus, updatedAt: now });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  // State
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    pin: '',
    role: 'seller' as 'admin' | 'cashier' | 'seller' | 'accountant' | 'sales_manager' | 'inventory_manager',
    roleId: '',
    email: '',
    phone: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSubTab, setUserSubTab] = useState<'users' | 'activities' | 'roles' | 'security'>('users');
  const [actUserFilter, setActUserFilter] = useState('');
  const [actActionFilter, setActActionFilter] = useState('');
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleEntity | null>(null);
  const [viewingRoleDetails, setViewingRoleDetails] = useState<RoleEntity | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: {} as Record<string, boolean> });
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const handleAddUser = async () => {
    if (!userForm.name) {
      alert('يرجى إدخال اسم المستخدم');
      return;
    }

    if (!editingUser) {
      if (!userForm.pin) {
        alert('يرجى إدخال كلمة المرور');
        return;
      }
      const strength = validatePasswordStrength(userForm.pin);
      if (!strength.valid) {
        alert(strength.errors[0] || 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن أرقاماً وأحرفاً');
        return;
      }
      addUserMutation.mutate({ ...userForm, username: userForm.name, status: 'active' });
    } else {
      if (userForm.pin) {
        const strength = validatePasswordStrength(userForm.pin);
        if (!strength.valid) {
          alert(strength.errors[0] || 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن أرقاماً وأحرفاً');
          return;
        }
        const api = (window as any).electronAPI;
        if (api?.auth?.resetPassword) {
          try {
            await api.auth.resetPassword(editingUser.id, userForm.pin);
          } catch (e) {
            console.error('Failed to reset password in SQLite:', e);
          }
        }
      }
      updateUserMutation.mutate({
        ...editingUser,
        name: userForm.name,
        role: userForm.role,
        roleId: userForm.roleId,
        email: userForm.email,
        phone: userForm.phone,
      });
    }

    setUserForm({ name: '', pin: '', role: 'seller', roleId: '', email: '', phone: '' });
    setEditingUser(null);
    setShowUserForm(false);
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword) {
      alert('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      alert(strength.errors[0] || 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن أرقاماً وأحرفاً');
      return;
    }

    const api = (window as any).electronAPI;
    if (api?.auth?.resetPassword) {
      try {
        await api.auth.resetPassword(userId, newPassword);
      } catch (e) {
        console.error('Failed to reset password in SQLite:', e);
      }
    }

    await db.users.update(userId, {
      pin: '',
      passwordChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setShowResetPassword(null);
    setNewPassword('');
    alert('تم تغيير كلمة المرور بنجاح');
  };

  const filteredUsers = users.filter(u => {
    if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  const filteredActivities = activities
    .filter(a => !actUserFilter || a.userId === actUserFilter)
    .filter(a => !actActionFilter || a.action === actActionFilter)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

  const uniqueActions = [...new Set(activities.map(a => a.action))];
  const userName = (id: string) => users.find(u => u.id === id)?.name ?? id;

  const getRoleUsers = (role: RoleEntity) => {
    return users.filter(u => {
      if (u.roleId === role.id) return true;
      if (role.isSystem && (u.role === role.name || u.role === role.id)) return true;
      if (u.role === role.name) return true;
      return false;
    });
  };

  const getUserCount = (role: RoleEntity) => getRoleUsers(role).length;

  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', permissions: {} });
    setShowRoleForm(true);
  };

  const openEditRole = (role: RoleEntity) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description ?? '', permissions: { ...role.permissions } });
    setShowRoleForm(true);
  };

  const togglePermission = (key: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const submitRole = async () => {
    if (!roleForm.name.trim()) return;
    try {
      if (editingRole) {
        await roleRepo.update(editingRole.id, { name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions });
      } else {
        await roleRepo.create({ name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions });
      }
      setShowRoleForm(false);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const removeRole = async (role: RoleEntity) => {
    if (!confirm(`حذف الدور "${role.name}"؟`)) return;
    try {
      await roleRepo.remove(role.id);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return {
    users,
    activities,
    roles,
    currentUser,
    addUserMutation,
    updateUserMutation,
    deleteUserMutation,
    toggleStatusMutation,
    handleAddUser,
    handleResetPassword,
    showUserForm,
    setShowUserForm,
    editingUser,
    setEditingUser,
    userForm,
    setUserForm,
    userSearch,
    setUserSearch,
    userStatusFilter,
    setUserStatusFilter,
    userSubTab,
    setUserSubTab,
    actUserFilter,
    setActUserFilter,
    actActionFilter,
    setActActionFilter,
    showRoleForm,
    setShowRoleForm,
    editingRole,
    setEditingRole,
    viewingRoleDetails,
    setViewingRoleDetails,
    roleForm,
    setRoleForm,
    showResetPassword,
    setShowResetPassword,
    newPassword,
    setNewPassword,
    filteredUsers,
    filteredActivities,
    uniqueActions,
    userName,
    getRoleUsers,
    getUserCount,
    openAddRole,
    openEditRole,
    togglePermission,
    submitRole,
    removeRole,
  };
}
