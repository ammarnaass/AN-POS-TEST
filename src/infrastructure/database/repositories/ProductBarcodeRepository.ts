// ProductBarcodeRepository — BARCODE-MGMT-001
// CRUD + بحث عن الباركودات المرتبطة (variant/batch) بالمنتج
import { db, type ProductBarcodeEntity, type ProductBarcodeType } from '../dexie/db';

export type NewProductBarcode = Omit<ProductBarcodeEntity, 'id' | 'createdAt' | 'updatedAt'>;

export class BarcodeDuplicateError extends Error {
  constructor(public barcode: string) {
    super(`BARCODE_DUPLICATE: ${barcode}`);
    this.name = 'BarcodeDuplicateError';
  }
}

export const ProductBarcodeRepository = {
  async findByBarcode(code: string): Promise<ProductBarcodeEntity | undefined> {
    const trimmed = String(code).trim();
    if (!trimmed) return undefined;
    return db.product_barcodes.where('barcode').equals(trimmed).first();
  },

  async listByProduct(productId: string): Promise<ProductBarcodeEntity[]> {
    return db.product_barcodes.where('productId').equals(productId).toArray();
  },

  async listAll(): Promise<ProductBarcodeEntity[]> {
    return db.product_barcodes.toArray();
  },

  async add(b: NewProductBarcode): Promise<string> {
    const trimmed = String(b.barcode).trim();
    if (!trimmed) throw new Error('BARCODE_EMPTY');
    const exists = await ProductBarcodeRepository.findByBarcode(trimmed);
    if (exists) throw new BarcodeDuplicateError(trimmed);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.product_barcodes.add({
      ...b,
      barcode: trimmed,
      id,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },

  async update(id: string, patch: Partial<Omit<ProductBarcodeEntity, 'id' | 'createdAt'>>): Promise<void> {
    if (patch.barcode) {
      const trimmed = String(patch.barcode).trim();
      if (!trimmed) throw new Error('BARCODE_EMPTY');
      const dupe = await ProductBarcodeRepository.findByBarcode(trimmed);
      if (dupe && dupe.id !== id) throw new BarcodeDuplicateError(trimmed);
      patch.barcode = trimmed;
    }
    await db.product_barcodes.update(id, { ...patch, updatedAt: new Date().toISOString() });
  },

  async remove(id: string): Promise<void> {
    await db.product_barcodes.delete(id);
  },

  async replaceForProduct(
    productId: string,
    barcodes: Array<{ barcode: string; type: ProductBarcodeType; variantLabel?: string; batchNumber?: string; expiryDate?: string }>,
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', db.product_barcodes, async () => {
      const existing = await db.product_barcodes.where('productId').equals(productId).toArray();
      const keepIds = new Set<string>();
      for (const b of barcodes) {
        const trimmed = String(b.barcode).trim();
        if (!trimmed) continue;
        const conflict = await db.product_barcodes.where('barcode').equals(trimmed).first();
        if (conflict && conflict.productId !== productId) {
          throw new BarcodeDuplicateError(trimmed);
        }
        if (conflict && conflict.productId === productId) {
          keepIds.add(conflict.id);
          await db.product_barcodes.update(conflict.id, {
            type: b.type,
            variantLabel: b.variantLabel,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            updatedAt: now,
          });
        } else {
          const id = crypto.randomUUID();
          await db.product_barcodes.add({
            id,
            productId,
            barcode: trimmed,
            type: b.type,
            variantLabel: b.variantLabel,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            createdAt: now,
            updatedAt: now,
          });
          keepIds.add(id);
        }
      }
      // حذف القديم غير المحتفظ به
      for (const e of existing) {
        if (!keepIds.has(e.id)) await db.product_barcodes.delete(e.id);
      }
    });
  },

  async bulkAdd(items: NewProductBarcode[]): Promise<{ added: number; duplicatesSkipped: number }> {
    let added = 0;
    let duplicatesSkipped = 0;
    for (const item of items) {
      try {
        await ProductBarcodeRepository.add(item);
        added++;
      } catch (err) {
        if (err instanceof BarcodeDuplicateError) duplicatesSkipped++;
        else throw err;
      }
    }
    return { added, duplicatesSkipped };
  },
};
