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
  type RegisterUserData,
} from '../handlers/auth';

export function registerAuthIpc(): void {
  // auth:login
  ipcMain.handle('auth:login', async (_evt, username: string, pin: string) =>
    loginUser(username, pin)
  );

  // auth:register
  ipcMain.handle('auth:register', async (_evt, data: RegisterUserData) =>
    registerUser(data)
  );

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
