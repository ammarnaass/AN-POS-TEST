// parseAndAddScannedCode — BARCODE-MGMT-001
// منطق مشترك مستخرج: يحول كود ماسح/بحث → إضافة للسلة عبر searchByBarcode
// يُستعمل من POSPage و QuickSalePage
import type { Product, Promotion, CartItem } from '@/types';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import { resolveUnitPrice } from '@/services';
import { searchByBarcode } from './searchByBarcode';

export interface ParseScanContext {
  products: Product[];
  packs: PackEntity[];
  promotions: Promotion[];
  addItem: (item: CartItem) => void;
}

export interface ParseScanResult {
  added: boolean;
  message?: string;
  kind?: 'product' | 'pack';
  name?: string;
}

interface SaleRefusedReason {
  message: string;
}

function refusalReason(p: Product): SaleRefusedReason | null {
  if (p.status !== 'active') return { message: 'المنتج موقوف مؤقتاً' };
  if (p.quantity <= 0) return { message: 'نفد المخزون' };
  return null;
}

export async function parseAndAddScannedCode(
  rawCode: string,
  ctx: ParseScanContext,
): Promise<ParseScanResult> {
  const code = String(rawCode ?? '').trim();
  // 1) الفحص الفوري في المنتجات النشطة بالذاكرة أولاً (استجابة فورية 0ms دون الحاجة لـ IPC)
  const inMemoryProduct = ctx.products.find(
    (p) => p.status === 'active' && p.barcode && p.barcode.trim() === code
  );
  if (inMemoryProduct) {
    const blocked = refusalReason(inMemoryProduct);
    if (blocked) return { added: false, message: blocked.message };
    const price = resolveUnitPrice(inMemoryProduct, 1, ctx.promotions);
    ctx.addItem({
      productId: inMemoryProduct.id,
      name: inMemoryProduct.name,
      qty: 1,
      unitPrice: price,
      lineTotal: price,
      batchNumber: inMemoryProduct.batchNumber,
    });
    return { added: true, kind: 'product', name: inMemoryProduct.name };
  }

  // 2) الفحص الفوري في الباقات بالذاكرة
  const inMemoryPack = ctx.packs.find(
    (pk) => pk.status === 'active' && pk.barcode && pk.barcode.trim() === code
  );
  if (inMemoryPack) {
    ctx.addItem({
      productId: `pack-${inMemoryPack.id}`,
      name: inMemoryPack.name,
      qty: 1,
      unitPrice: inMemoryPack.packPrice,
      lineTotal: inMemoryPack.packPrice,
      isPack: true,
      packId: inMemoryPack.id,
    });
    return { added: true, kind: 'pack', name: inMemoryPack.name };
  }

  // 3) البحث في قاعدة البيانات (للباركودات المرتبطة والـ variants والـ batches)
  const result = await searchByBarcode(code);
  if (!result) {
    // fallback: بحث نصي جزئي بالاسم (لإدخال يدوي لتقصير)
    const q = code.toLowerCase();
    const textMatch = ctx.products.find(
      (p) =>
        p.status === 'active' &&
        p.quantity > 0 &&
        (p.name.toLowerCase() === q ||
          p.name.toLowerCase().startsWith(q) ||
          p.barcode.toLowerCase() === q),
    );
    if (textMatch) {
      const price = resolveUnitPrice(textMatch, 1, ctx.promotions);
      ctx.addItem({
        productId: textMatch.id,
        name: textMatch.name,
        qty: 1,
        unitPrice: price,
        lineTotal: price,
        batchNumber: textMatch.batchNumber,
      });
      return { added: true, kind: 'product', name: textMatch.name };
    }
    return { added: false, message: 'لم يُعثر على المنتج' };
  }

  if (result.kind === 'product' && result.product) {
    const p = result.product;
    const blocked = refusalReason(p);
    if (blocked) return { added: false, message: blocked.message };
    const price = resolveUnitPrice(p as Product, 1, ctx.promotions);
    ctx.addItem({
      productId: p.id,
      name: p.name,
      qty: 1,
      unitPrice: price,
      lineTotal: price,
      batchNumber: p.batchNumber,
    });
    return { added: true, kind: 'product', name: p.name };
  }

  if (result.kind === 'pack' && result.pack) {
    const pk = result.pack;
    if (pk.status !== 'active') return { added: false, message: 'الحزمة موقوفة' };
    ctx.addItem({
      productId: `pack-${pk.id}`,
      name: pk.name,
      qty: 1,
      unitPrice: pk.packPrice,
      lineTotal: pk.packPrice,
      isPack: true,
      packId: pk.id,
    });
    return { added: true, kind: 'pack', name: pk.name };
  }

  return { added: false, message: 'غير معروف' };
}
