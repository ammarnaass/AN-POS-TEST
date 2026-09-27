// معالجات IPC للمصادقة — wrapper رفيع حول handlers/auth.ts
// المنطق الفعلي في ../handlers/auth.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  resetUserPassword,
  checkRegistrationAllowed,
  verifyManagerPin,
  type RegisterUserData,
} from '../handlers/auth';

export function registerAuthIpc(): void {
  // auth:login
  ipcMain.handle('auth:login', async (_evt, username: string, pin: string) => {
    try {
      return await loginUser(username, pin);
    } catch (err: any) {
      console.error('[ipc:auth:login] خطأ أثناء تسجيل الدخول:', err);
      return {
        error: {
          status: 500,
          detail: 'تعذر إتمام تسجيل الدخول بسبب خطأ في قاعدة البيانات، يرجى إعادة المحاولة.',
        },
      };
    }
  });

  // auth:verify-manager-pin
  ipcMain.handle('auth:verify-manager-pin', async (_evt, pin: string) => {
    try {
      return await verifyManagerPin(pin);
    } catch (err: any) {
      console.error('[ipc:auth:verify-manager-pin] خطأ:', err);
      return { valid: false, error: 'تعذر التحقق من رمز المدير' };
    }
  });

  // auth:register
  ipcMain.handle('auth:register', async (_evt, data: RegisterUserData) => {
    try {
      return await registerUser(data);
    } catch (err: any) {
      console.error('[ipc:auth:register] خطأ أثناء تسجيل المستخدم:', err);
      return {
        error: {
          status: 500,
          detail: 'تعذر إنشاء الحساب بسبب خطأ في قاعدة البيانات، يرجى إعادة المحاولة.',
        },
      };
    }
  });

  // auth:me
  ipcMain.handle('auth:me', async (_evt, userId: string) =>
    getCurrentUser(userId)
  );

  // auth:logout
  ipcMain.handle('auth:logout', async (_evt, userId: string) =>
    logoutUser(userId)
  );

  // auth:reset-password
  ipcMain.handle('auth:reset-password', async (_evt, userId: string, newPin: string) =>
    resetUserPassword(userId, newPin)
  );

  // auth:check-registration-allowed
  ipcMain.handle('auth:check-registration-allowed', async () =>
    checkRegistrationAllowed()
  );
}
