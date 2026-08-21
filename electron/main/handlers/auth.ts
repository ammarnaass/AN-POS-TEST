// منطق المصادقة — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// يحاكي server/src/auth/auth.routes.ts لكن بدون JWT/refresh tokens.
// يمسي مزامنة مع ipc/auth.ts.

import { randomUUID } from 'node:crypto';
import {
  queryOne,
  execute,
  type Row,
} from './db-utils';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 دقيقة

function logActivity(userId: string, action: string, entityType?: string, entityId?: string, details?: string): void {
  execute(
    'INSERT INTO user_activities (id, user_id, action, entity_type, entity_id, details, performed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), userId, action, entityType || '', entityId || '', details || '', new Date().toISOString()]
  );
}

/**
 * تحويل صف المستخدم إلى كائن الواجهة (camelCase)
 */
export function transformUser(user: Row) {
  return {
    id: user.id as string,
    username: user.username as string,
    name: user.name as string,
    pin: user.pin as string,
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar || '',
    role: user.role as string,
    roleId: user.role_id || '',
    status: user.status as string,
    lastLogin: user.last_login || '',
    loginAttempts: Number(user.login_attempts) || 0,
    lockedUntil: user.locked_until || '',
    passwordChangedAt: user.password_changed_at || '',
    createdAt: user.created_at || '',
    updatedAt: user.updated_at || '',
  };
}

/**
 * تسجيل الدخول — يتحقق من اسم المستخدم والرمز السري.
 * يُرجع { user } عند النجاح أو { error } عند الفشل.
 */
export async function loginUser(
  username: string,
  pin: string
): Promise<{ user?: ReturnType<typeof transformUser>; error?: { status: number; detail: string } }> {
  if (!username || !pin) {
    return { error: { status: 422, detail: 'اسم المستخدم والرمز السري مطلوبان' } };
  }

  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    return { error: { status: 401, detail: 'اسم المستخدم أو الرمز السري غير صحيح' } };
  }

  if (user.status === 'inactive') {
    return { error: { status: 403, detail: 'الحساب معطّل' } };
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

  // التحقق من الرمز السري
  if (user.pin !== pin) {
    const attempts = (Number(user.login_attempts) || 0) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
      execute('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockUntil, user.id]);
      logActivity(user.id as string, 'account_locked', 'user', user.id as string, 'قفل الحساب بعد 5 محاولات فاشلة');
      return { error: { status: 423, detail: 'قُفل الحساب بعد 5 محاولات فاشلة. حاول مرة أخرى بعد 15 دقيقة' } };
    }

    execute('UPDATE users SET login_attempts = ? WHERE id = ?', [attempts, user.id]);
    return { error: { status: 401, detail: `رمز سري غير صحيح (${MAX_LOGIN_ATTEMPTS - attempts} محاولات متبقية)` } };
  }

  // نجاح الدخول
  const now = new Date().toISOString();
  execute('UPDATE users SET login_attempts = 0, locked_until = ?, last_login = ?, updated_at = ? WHERE id = ?', ['', now, now, user.id]);
  logActivity(user.id as string, 'login', 'user', user.id as string, 'دخول ناجح');

  return { user: transformUser(user) };
}

/**
 * تسجيل مستخدم جديد (دور seller افتراضياً)
 */
export async function registerUser(data: {
  username: string;
  name: string;
  pin: string;
  phone?: string;
  email?: string;
}): Promise<{ user?: object; error?: { status: number; detail: string } }> {
  const { username, name, pin, phone, email } = data;
  if (!username || !name || !pin) {
    return { error: { status: 422, detail: 'اسم المستخدم والاسم والرمز السري مطلوبة' } };
  }
  if (typeof pin !== 'string' || pin.length < 4) {
    return { error: { status: 422, detail: 'الرمز السري يجب أن يكون 4 أحرف على الأقل' } };
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    return { error: { status: 409, detail: 'اسم المستخدم موجود مسبقاً' } };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  execute(
    'INSERT INTO users (id, username, name, pin, phone, email, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, username, name, pin, phone || '', email || '', 'seller', 'active', now, now]
  );

  return {
    user: {
      id,
      username,
      name,
      phone: phone || '',
      email: email || '',
      role: 'seller',
      status: 'active',
    },
  };
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
