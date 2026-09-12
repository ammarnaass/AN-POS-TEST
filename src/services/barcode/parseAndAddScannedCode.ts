// parseAndAddScannedCode — BARCODE-MGMT-001
// منطق مشترك مستخرج: يحول كود ماسح/بحث → إضافة للسلة عبر searchByBarcode
// يُستعمل من POSPage و QuickSalePage و الماسح عن بُعد من الهاتف
import type { Product, Promotion, CartItem } from '@/types';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import { resolveUnitPrice, getProductTierPrice } from '@/services';
import { searchByBarcode } from './searchByBarcode';

export interface ParseScanContext {
  products: Product[];
  packs?: PackEntity[];
  promotions?: Promotion[];
  addItem: (item: CartItem) => void;
  forceWholesale?: boolean;
  allowNegativeStock?: boolean;
  priceTier?: '1' | '2' | '3' | '4';
  posLayout?: string;
  qty?: number;
}

export interface ParseScanResult {
  added: boolean;
  message?: string;
  kind?: 'product' | 'pack';
  name?: string;
  qty?: number;
  price?: number;
}

interface SaleRefusedReason {
  message: string;
}

function refusalReason(p: Product): SaleRefusedReason | null {
  if (p.status !== 'active') return { message: 'المنتج موقوف مؤقتاً' };
  if (p.quantity <= 0) return { message: 'نفد المخزون' };
  return null;
}

function packRefusalReason(
  pk: PackEntity,
  products: Product[],
  allowNegativeStock?: boolean
): SaleRefusedReason | null {
  if (pk.status !== "active") return { message: "الحزمة موقوفة" };
  if (allowNegativeStock) return null;
  const rawItems = Array.isArray(pk.items)
    ? pk.items
    : (() => { try { return JSON.parse(pk.items as any) ?? []; } catch { return []; } })();
  const firstComp = rawItems[0];
  const firstId = firstComp?.productId ?? (firstComp as any)?.product_id;
  const pQty = Number(pk.piecesCount || firstComp?.qty || firstComp?.quantity || 1);
  if (firstId) {
    const parentProd = products.find((p) => p.id === firstId);
    const availablePieces = parentProd ? Number(parentProd.quantity ?? 0) : 0;
    if (availablePieces < pQty) {
      return { message: "المخزون غير كافٍ لتشكيل عبوة كاملة" };
    }
  }
  return null;
}

export async function parseAndAddScannedCode(
  rawCode: string,
  ctx: ParseScanContext,
): Promise<ParseScanResult> {
  const code = String(rawCode ?? '').trim();
  const qtyToAdd = Math.max(1, Number(ctx.qty) || 1);

  const resolveItemPrice = (p: Product) => {
    if (ctx.priceTier && ctx.priceTier !== '1') {
      return getProductTierPrice(p, ctx.priceTier);
    }
    return resolveUnitPrice(p, qtyToAdd, ctx.promotions ?? [], ctx.forceWholesale, ctx.priceTier);
  };

  // 1) الفحص الفوري في المنتجات بالذاكرة أولاً (استجابة فورية 0ms دون الحاجة لـ IPC)
  const inMemoryProduct = ctx.products.find(
    (p) => p.barcode && p.barcode.trim() === code
  );
  if (inMemoryProduct) {
    const blocked = refusalReason(inMemoryProduct);
    if (blocked) return { added: false, message: blocked.message };
    const price = resolveItemPrice(inMemoryProduct);
    ctx.addItem({
      productId: inMemoryProduct.id,
      name: inMemoryProduct.name,
      qty: qtyToAdd,
      unitPrice: price,
      price: price,
      lineTotal: price * qtyToAdd,
      barcode: inMemoryProduct.barcode,
      unit: inMemoryProduct.unit,
      batchNumber: inMemoryProduct.batchNumber,
      isCustom: false,
      pricingType: ctx.priceTier === '3' || ctx.forceWholesale ? 'wholesale' : 'retail',
    });
    return { added: true, kind: 'product', name: inMemoryProduct.name, qty: qtyToAdd, price };
  }

  // 2) الفحص الفوري في الباقات بالذاكرة
  const packsList = ctx.packs || [];
  const inMemoryPack = packsList.find(
    (pk) => pk.barcode && pk.barcode.trim() === code
  );
  if (inMemoryPack) {
    const blocked = packRefusalReason(inMemoryPack, ctx.products, ctx.allowNegativeStock);
    if (blocked) return { added: false, message: blocked.message };
    const rawItems = Array.isArray(inMemoryPack.items)
      ? inMemoryPack.items
      : (() => { try { return JSON.parse(inMemoryPack.items as any) ?? []; } catch { return []; } })();
    const pQty = inMemoryPack.piecesCount || rawItems.reduce((s: number, it: any) => s + (Number(it.qty ?? it.quantity ?? 0)), 0) || 1;
    const isTerminal = ctx.posLayout === 'terminal';
    const isWholesale = ctx.forceWholesale || ctx.priceTier === '3';
    if (isTerminal && !isWholesale) {
      const piecePrice = pQty > 0 ? (inMemoryPack.packPrice / pQty) : inMemoryPack.packPrice;
      const totalPieces = pQty * qtyToAdd;
      ctx.addItem({
        productId: `pack-${inMemoryPack.id}`,
        name: inMemoryPack.name,
        qty: totalPieces,
        unitPrice: piecePrice,
        price: piecePrice,
        lineTotal: inMemoryPack.packPrice * qtyToAdd,
        barcode: inMemoryPack.barcode,
        isPack: true,
        packId: inMemoryPack.id,
        packQty: qtyToAdd,
        packPiecesCount: pQty,
        packUnit: inMemoryPack.unitName || 'عبوة',
        packMode: 'retail_pieces',
        pricingType: 'retail',
      });
    } else {
      ctx.addItem({
        productId: `pack-${inMemoryPack.id}`,
        name: inMemoryPack.name,
        qty: qtyToAdd,
        unitPrice: inMemoryPack.packPrice,
        price: inMemoryPack.packPrice,
        lineTotal: inMemoryPack.packPrice * qtyToAdd,
        barcode: inMemoryPack.barcode,
        isPack: true,
        packId: inMemoryPack.id,
        packQty: qtyToAdd,
        packPiecesCount: pQty,
        packUnit: inMemoryPack.unitName || 'طرد',
        packMode: isTerminal ? 'wholesale_packs' : undefined,
        pricingType: isWholesale ? 'wholesale' : 'pack',
      });
    }
    return { added: true, kind: 'pack', name: inMemoryPack.name, qty: qtyToAdd, price: inMemoryPack.packPrice };
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
      const price = resolveItemPrice(textMatch);
      ctx.addItem({
        productId: textMatch.id,
        name: textMatch.name,
        qty: qtyToAdd,
        unitPrice: price,
        price: price,
        lineTotal: price * qtyToAdd,
        barcode: textMatch.barcode,
        unit: textMatch.unit,
        batchNumber: textMatch.batchNumber,
        isCustom: false,
        pricingType: ctx.priceTier === '3' || ctx.forceWholesale ? 'wholesale' : 'retail',
      });
      return { added: true, kind: 'product', name: textMatch.name, qty: qtyToAdd, price };
    }
    return { added: false, message: 'لم يُعثر على المنتج' };
  }

  if (result.kind === 'product' && result.product) {
    const p = result.product;
    const blocked = refusalReason(p);
    if (blocked) return { added: false, message: blocked.message };
    const price = resolveItemPrice(p as Product);
    ctx.addItem({
      productId: p.id,
      name: p.name,
      qty: qtyToAdd,
      unitPrice: price,
      price: price,
      lineTotal: price * qtyToAdd,
      barcode: p.barcode,
      unit: p.unit,
      batchNumber: p.batchNumber,
      isCustom: false,
      pricingType: ctx.priceTier === '3' || ctx.forceWholesale ? 'wholesale' : 'retail',
    });
    return { added: true, kind: 'product', name: p.name, qty: qtyToAdd, price };
  }

  if (result.kind === 'pack' && result.pack) {
    const pk = result.pack;
    const blocked = packRefusalReason(pk, ctx.products, ctx.allowNegativeStock);
    if (blocked) return { added: false, message: blocked.message };
    const rawItems = Array.isArray(pk.items)
      ? pk.items
      : (() => { try { return JSON.parse(pk.items as any) ?? []; } catch { return []; } })();
    const pQty = pk.piecesCount || rawItems.reduce((s: number, it: any) => s + (Number(it.qty ?? it.quantity ?? 0)), 0) || 1;
    ctx.addItem({
      productId: `pack-${pk.id}`,
      name: pk.name,
      qty: qtyToAdd,
      unitPrice: pk.packPrice,
      price: pk.packPrice,
      lineTotal: pk.packPrice * qtyToAdd,
      barcode: pk.barcode,
      isPack: true,
      packId: pk.id,
      packQty: pQty * qtyToAdd,
      packUnit: pk.unitName || 'طرد',
      pricingType: 'pack',
    });
    return { added: true, kind: 'pack', name: pk.name, qty: qtyToAdd, price: pk.packPrice };
  }

  return { added: false, message: 'غير معروف' };
}

