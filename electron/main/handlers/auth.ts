// منطق المصادقة — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// يحاكي server/src/auth/auth.routes.ts مع دعم التشفير الآمن بـ scrypt.
// يمسي مزامنة مع ipc/auth.ts.

import { randomUUID } from 'node:crypto';
import {
  queryOne,
  execute,
  type Row,
} from './db-utils';
import { hashPassword, verifyPassword, isHashed } from './password-hash';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 دقيقة

function logActivity(userId: string, action: string, entityType?: string, entityId?: string, details?: string): void {
  try {
    execute(
      'INSERT INTO user_activities (id, user_id, action, entity_type, entity_id, details, performed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), userId, action, entityType || '', entityId || '', details || '', new Date().toISOString()]
    );
  } catch (err) {
    console.warn('[auth] Failed to log activity:', err);
  }
}

/**
 * تحويل صف المستخدم إلى كائن الواجهة (camelCase)
 * أمان: لا يتم إرجاع حقل pin أو الهاش المشفر للواجهة أبداً
 */
export function transformUser(user: Row) {
  return {
    id: user.id as string,
    username: user.username as string,
    name: user.name as string,
    email: (user.email as string) || '',
    phone: (user.phone as string) || '',
    avatar: (user.avatar as string) || '',
    role: user.role as string,
    roleId: (user.role_id as string) || '',
    status: user.status as string,
    lastLogin: (user.last_login as string) || '',
    loginAttempts: Number(user.login_attempts) || 0,
    lockedUntil: (user.locked_until as string) || '',
    passwordChangedAt: (user.password_changed_at as string) || '',
    createdAt: (user.created_at as string) || '',
    updatedAt: (user.updated_at as string) || '',
  };
}

/**
 * تسجيل الدخول — يتحقق من اسم المستخدم والرمز السري المشفر أو القديم.
 * يُرجع { user } عند النجاح مع ترحيل تلقائي لكلمات المرور القديمة.
 */
export async function loginUser(
  username: string,
  pin: string
): Promise<{ user?: ReturnType<typeof transformUser>; error?: { status: number; detail: string } }> {
  if (!username || !pin) {
    return { error: { status: 422, detail: 'اسم المستخدم وكلمة المرور مطلوبان' } };
  }

  const cleanUsername = username.trim();
  const isDevLogin = cleanUsername.toLowerCase() === 'dev' || cleanUsername.toLowerCase() === 'developer';
  const lookupUsername = isDevLogin ? 'developer' : cleanUsername;

  const user = queryOne('SELECT * FROM users WHERE username = ?', [lookupUsername]);
  if (!user) {
    return { error: { status: 401, detail: 'اسم المستخدم أو كلمة المرور غير صحيحة' } };
  }

  if (user.status === 'inactive') {
    return { error: { status: 403, detail: 'الحساب معطّل، يرجى مراجعة المسؤول' } };
  }

  // BR-USR-009: فحص القفل
  if (user.locked_until) {
    const lockEnd = new Date(user.locked_until as string);
    if (lockEnd > new Date()) {
      const minutes = Math.ceil((lockEnd.getTime() - Date.now()) / 60000);
      return { error: { status: 423, detail: `الحساب مقفل. حاول مرة أخرى بعد ${minutes} دقيقة` } };
    }
    // فتح القفل بعد انتهاء المدة
    execute('UPDATE users SET locked_until = ?, login_attempts = 0 WHERE id = ?', ['', user.id]);
  }

  // التحقق من كلمة المرور عبر verifyPassword (تدعم الهاش والقديم كنص عادي)
  const isMatch = verifyPassword(pin, user.pin as string);

  if (!isMatch) {
    const attempts = (Number(user.login_attempts) || 0) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
      execute('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockUntil, user.id]);
      logActivity(user.id as string, 'account_locked', 'user', user.id as string, 'قفل الحساب بعد 5 محاولات فاشلة');
      return { error: { status: 423, detail: 'قُفل الحساب بعد 5 محاولات فاشلة. حاول مرة أخرى بعد 15 دقيقة' } };
    }

    execute('UPDATE users SET login_attempts = ? WHERE id = ?', [attempts, user.id]);
    return { error: { status: 401, detail: `كلمة مرور غير صحيحة (${MAX_LOGIN_ATTEMPTS - attempts} محاولات متبقية)` } };
  }

  // نجاح الدخول
  const now = new Date().toISOString();

  // الترحيل التلقائي: إذا كانت كلمة المرور قديمة وغير مشفرة، نقوم بتشفيرها فوراً
  let finalPin = user.pin as string;
  if (!isHashed(user.pin as string)) {
    try {
      finalPin = hashPassword(pin);
      execute('UPDATE users SET pin = ?, password_changed_at = ? WHERE id = ?', [finalPin, now, user.id]);
    } catch (migErr) {
      console.warn('[auth] Auto-migration of legacy password failed:', migErr);
    }
  }

  execute('UPDATE users SET login_attempts = 0, locked_until = ?, last_login = ?, updated_at = ? WHERE id = ?', ['', now, now, user.id]);
  logActivity(user.id as string, 'login', 'user', user.id as string, 'دخول ناجح');

  return { user: transformUser(user) };
}

export interface RegisterUserData {
  username: string;
  name: string;
  pin: string;
  phone?: string;
  email?: string;
  role?: string;
  roleId?: string;
  callerRole?: string;
}

/**
 * تسجيل مستخدم جديد مع تشفير كلمة المرور وتطبيق سياسات التسجيل
 */
export async function registerUser(data: RegisterUserData): Promise<{ user?: object; error?: { status: number; detail: string } }> {
  const { username, name, pin, phone, email, role, roleId, callerRole } = data;
  if (!username || !name || !pin) {
    return { error: { status: 422, detail: 'اسم المستخدم والاسم وكلمة المرور مطلوبة' } };
  }
  if (typeof pin !== 'string' || pin.length < 4) {
    return { error: { status: 422, detail: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' } };
  }

  // منع إنشاء حساب المطور من التسجيل العادي
  const regUser = username.trim().toLowerCase();
  if (regUser === 'developer' || regUser === 'dev' || role === 'developer') {
    return { error: { status: 403, detail: 'لا يمكن استخدام هذا الاسم أو الدور' } };
  }

  // التحقق من إعدادات التسجيل في النظام
  const settingsRow = queryOne('SELECT allow_self_registration, default_role FROM settings WHERE id = ?', ['default']);
  const isSelfRegistrationAllowed = settingsRow ? Number(settingsRow.allow_self_registration) !== 0 : true;
  const configuredDefaultRole = (settingsRow?.default_role as string) || 'seller';

  // إذا لم يكن الطلب قادماً من مسؤول النظام وكان التسجيل الذاتي معطلاً
  if (callerRole !== 'admin' && !isSelfRegistrationAllowed) {
    return {
      error: {
        status: 403,
        detail: 'التسجيل الذاتي مغلق من قِبل إدارة النظام. يُرجى مراجعة مسؤول النظام لإنشاء حساب.',
      },
    };
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    return { error: { status: 409, detail: 'اسم المستخدم موجود مسبقاً' } };
  }

  // تحديد الدور والصلاحيات
  let assignedRole = configuredDefaultRole;
  if (callerRole === 'admin' && role) {
    assignedRole = role;
  }

  // تحديد role_id إن وُجد أو البحث عنه في جدول roles
  let assignedRoleId = roleId || '';
  if (assignedRoleId) {
    const roleRow = queryOne('SELECT id FROM roles WHERE id = ?', [assignedRoleId]);
    if (!roleRow) {
      assignedRoleId = '';
    }
  }
  if (!assignedRoleId) {
    const matchingRole = queryOne('SELECT id FROM roles WHERE name = ?', [assignedRole]);
    if (matchingRole) {
      assignedRoleId = matchingRole.id as string;
    }
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const hashedPin = hashPassword(pin);

  execute(
    'INSERT INTO users (id, username, name, pin, phone, email, role, role_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, username, name, hashedPin, phone || '', email || '', assignedRole, assignedRoleId, 'active', now, now]
  );

  logActivity(id, 'register', 'user', id, `إنشاء حساب جديد (${assignedRole})`);

  return {
    user: {
      id,
      username,
      name,
      phone: phone || '',
      email: email || '',
      role: assignedRole,
      roleId: assignedRoleId,
      status: 'active',
      createdAt: now,
    },
  };
}

/**
 * إعادة تعيين كلمة المرور لمستخدم مع التشفير
 */
export async function resetUserPassword(
  userId: string,
  newPin: string
): Promise<{ success: boolean; error?: { status: number; detail: string } }> {
  if (!userId || !newPin) {
    return { success: false, error: { status: 422, detail: 'معرف المستخدم وكلمة المرور الجديدة مطلوبان' } };
  }
  if (newPin.length < 8) {
    return { success: false, error: { status: 422, detail: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' } };
  }

  const user = queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) {
    return { success: false, error: { status: 404, detail: 'المستخدم غير موجود' } };
  }

  const now = new Date().toISOString();
  const hashed = hashPassword(newPin);

  execute(
    'UPDATE users SET pin = ?, password_changed_at = ?, login_attempts = 0, locked_until = ?, updated_at = ? WHERE id = ?',
    [hashed, now, '', now, userId]
  );

  logActivity(userId, 'password_reset', 'user', userId, 'إعادة تعيين كلمة المرور');
  return { success: true };
}

/**
 * فحص ما إذا كان التسجيل الذاتي مسموحاً في إعدادات النظام
 */
export function checkRegistrationAllowed(): { allowSelfRegistration: boolean; defaultRole: string } {
  try {
    const row = queryOne('SELECT allow_self_registration, default_role FROM settings WHERE id = ?', ['default']);
    return {
      allowSelfRegistration: row ? Number(row.allow_self_registration) !== 0 : true,
      defaultRole: (row?.default_role as string) || 'seller',
    };
  } catch (err) {
    return { allowSelfRegistration: true, defaultRole: 'seller' };
  }
}

/**
 * جلب المستخدم الحالي عبر user_id
 */
export async function getCurrentUser(userId: string): Promise<{ user?: ReturnType<typeof transformUser>; error?: { status: number; detail: string } }> {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) {
    return { error: { status: 404, detail: 'المستخدم غير موجود' } };
  }
  return { user: transformUser(user) };
}

/**
 * تسجيل الخروج
 */
export async function logoutUser(userId: string): Promise<{ success: boolean }> {
  if (userId) {
    logActivity(userId, 'logout', 'user', userId, 'تسجيل خروج');
  }
  return { success: true };
}
