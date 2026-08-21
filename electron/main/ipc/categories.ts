// معالجات IPC للفئات — wrapper رفيع حول handlers/categories.ts
// المنطق الفعلي في ../handlers/categories.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  removeCategory,
} from '../handlers/categories';

export function registerCategoriesIpc(): void {
  // categories:list — مع JOIN لعدد المنتجات
  ipcMain.handle('categories:list', async () => listCategories());

  // categories:get
  ipcMain.handle('categories:get', async (_evt, id: string) => getCategory(id));

  // categories:create
  ipcMain.handle('categories:create', async (_evt, data: Record<string, unknown>) =>
    createCategory(data)
  );

  // categories:update
  ipcMain.handle('categories:update', async (_evt, id: string, data: Record<string, unknown>) =>
    updateCategory(id, data)
  );

  // categories:remove
  ipcMain.handle('categories:remove', async (_evt, id: string) => removeCategory(id));
}
