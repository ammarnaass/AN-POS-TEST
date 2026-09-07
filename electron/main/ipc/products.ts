// معالجات IPC للمنتجات — wrapper رفيع حول handlers/products.ts
// المنطق الفعلي في ../handlers/products.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import {
  listProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  type ListProductsOptions,
} from '../handlers/products';

export function registerProductsIpc(): void {
  // products:list
  ipcMain.handle('products:list', async (_evt, opts?: ListProductsOptions) =>
    listProducts(opts)
  );

  // products:get
  ipcMain.handle('products:get', async (_evt, id: string) =>
    getProduct(id)
  );

  // products:getByBarcode
  ipcMain.handle('products:getByBarcode', async (_evt, barcode: string) =>
    getProductByBarcode(barcode)
  );

  // products:create
  ipcMain.handle('products:create', async (_evt, data: Record<string, unknown>) =>
    createProduct(data)
  );

  // products:update
  ipcMain.handle('products:update', async (_evt, id: string, data: Record<string, unknown>) =>
    updateProduct(id, data)
  );

  // products:delete
  ipcMain.handle('products:delete', async (_evt, id: string) =>
    deleteProduct(id)
  );
}
