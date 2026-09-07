// معالجات IPC للنسخ الاحتياطي والاستعادة الشاملة
import { ipcMain } from 'electron';
import {
  exportFullBackup,
  importFullBackup,
  saveFileDialog,
  openFileDialog,
  exportRawDbFile,
} from '../handlers/backup';

export function registerBackupIpc(): void {
  ipcMain.handle('backup:exportFull', async () => {
    return exportFullBackup();
  });

  ipcMain.handle('backup:importFull', async (_evt, data: any, mode?: 'clean' | 'merge') => {
    return importFullBackup(data, mode);
  });

  ipcMain.handle('backup:saveFileDialog', async (_evt, defaultName: string, content: string) => {
    return saveFileDialog(defaultName, content);
  });

  ipcMain.handle('backup:openFileDialog', async () => {
    return openFileDialog();
  });

  ipcMain.handle('backup:exportRawDb', async () => {
    return exportRawDbFile();
  });
}
