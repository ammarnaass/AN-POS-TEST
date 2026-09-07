// معالجات IPC للعبوات — wrapper رفيع حول handlers/packs.ts
// المنطق الفعلي في ../handlers/packs.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import {
  listPacks,
  getPack,
  getPackByBarcode,
  createPack,
  updatePack,
  deletePack,
  type ListPacksOptions,
} from '../handlers/packs';

export function registerPacksIpc(): void {
  // packs:list
  ipcMain.handle('packs:list', async (_evt, opts?: ListPacksOptions) =>
    listPacks(opts)
  );

  // packs:get
  ipcMain.handle('packs:get', async (_evt, id: string) =>
    getPack(id)
  );

  // packs:getByBarcode
  ipcMain.handle('packs:getByBarcode', async (_evt, barcode: string) =>
    getPackByBarcode(barcode)
  );

  // packs:create
  ipcMain.handle('packs:create', async (_evt, data: Record<string, unknown>) =>
    createPack(data)
  );

  // packs:update
  ipcMain.handle('packs:update', async (_evt, id: string, data: Record<string, unknown>) =>
    updatePack(id, data)
  );

  // packs:delete
  ipcMain.handle('packs:delete', async (_evt, id: string) =>
    deletePack(id)
  );
}
