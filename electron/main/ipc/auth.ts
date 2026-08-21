// معالجات IPC للمصادقة — wrapper رفيع حول handlers/auth.ts
// المنطق الفعلي في ../handlers/auth.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../handlers/auth';

export function registerAuthIpc(): void {
  // auth:login
  ipcMain.handle('auth:login', async (_evt, username: string, pin: string) =>
    loginUser(username, pin)
  );

  // auth:register
  ipcMain.handle('auth:register', async (_evt, data: { username: string; name: string; pin: string; phone?: string; email?: string }) =>
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
}
