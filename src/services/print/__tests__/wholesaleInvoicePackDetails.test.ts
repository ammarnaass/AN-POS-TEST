import { describe, expect, it, beforeEach } from 'vitest';
import { db } from '@/infrastructure/database/dexie/db';
import { buildDocumentContext } from '@/services/print/printService';
import { wholesaleA4Layout } from '@/services/print/defaultTemplates';
import { renderDocumentHTML } from '@/services/print/renderTemplate';

const NOW = '2026-09-13T12:00:00.000Z';

describe('Wholesale Invoice Pack Details (عدد القطع والعبوة في فاتورة الجملة)', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.packs.clear();
    await db.sales.clear();
    await db.sale_items.clear();
    await db.customers.clear();
    await db.settings.put({
      id: 'default',
      shopName: 'مؤسسة النور للتجارة بالجملة',
      phone: '0555220620',
      tvaRate: 19,
      printWidthMm: 80,
      baseCurrency: 'DZD',
      invoicePrefix: 'INV-',
      receiptFooter: 'شكراً لتعاملكم معنا',
      taxNumber: '1234567890123',
    } as any);
  });

  it('calculates packQty, piecesPerPack, and total qty accurately for pack items in wholesale invoice', async () => {
    // 1. إنشاء باقة كرتونة 12 قطعة
    await db.packs.put({
      id: 'pack-milk-12',
      name: 'كرتونة حليب 12 علبة',
      barcode: '6130000000012',
      piecesCount: 12,
      unitName: 'كرتونة',
      packPrice: 1200,
      items: [{ productId: 'prod-milk-1', qty: 12 }],
      createdAt: NOW,
      updatedAt: NOW,
    } as any);

    const sale = {
      id: 'sale-wholesale-1',
      number: 'INV-2026-0001',
      date: NOW,
      docType: 'wholesale' as const,
      type: 'wholesale' as const,
      subtotal: 6000,
      discount: 0,
      discountType: 'percent' as const,
      tvaAmount: 0,
      total: 6000,
      paymentMethod: 'cash' as const,
      paidAmount: 6000,
      status: 'paid' as const,
      soldBy: 'كاشير الجملة',
      createdAt: NOW,
      updatedAt: NOW,
      items: [
        {
          productId: 'pack-pack-milk-12',
          name: 'كرتونة حليب 12 علبة',
          qty: 5, // 5 كراتين
          unitPrice: 1200,
          lineTotal: 6000,
          isPack: true,
          packId: 'pack-milk-12',
          packQty: 5,
          packPiecesCount: 12,
          packUnit: 'كرتونة',
          packMode: 'wholesale_packs',
        },
      ],
    };

    const template: any = {
      id: 'wholesale-template',
      name: 'قالب الجملة',
      documentType: 'wholesale-invoice',
      layout: wholesaleA4Layout,
      paperSize: 'a4',
      isDefault: true,
    };

    const ctx = await buildDocumentContext(
      sale as any,
      [],
      template,
      'user-1',
      'كاشير الجملة',
      'wholesale-invoice'
    );

    expect(ctx.invoice.items).toHaveLength(1);
    const item = ctx.invoice.items[0];

    // التحقق من أعمدة فاتورة الجملة الأربعة:
    // 1. التعبئة (Colisage)
    expect(item.packUnit).toBe('كرتونة');
    // 2. عدد العبوات (Colis)
    expect(item.packQty).toBe(5);
    // 3. قطع/عبوة (Pièces/Colis)
    expect(item.piecesPerPack).toBe(12);
    // 4. إجمالي القطع (Total Pièces) = 5 × 12 = 60
    expect(item.qty).toBe(60);
    expect(item.lineTotal).toBe(6000);
  });

  it('resolves packaging details from db.products (packageSize) when item has no explicit pack metadata', async () => {
    // منتج مخزن في قاعدة البيانات مع packageSize = 24
    await db.products.put({
      id: 'prod-juice-24',
      name: 'عصير برتقال طرد 24 قارورة',
      barcode: '6131111111024',
      sku: 'JUC-24',
      packageSize: '24',
      unit: 'طرد',
      costPrice: 80,
      retailPrice: 100,
      wholesalePrice: 90,
      wholesaleMinQty: 1,
      quantity: 240,
      lowStockThreshold: 10,
      category: 'مشروبات',
      status: 'active',
    } as any);

    const sale = {
      id: 'sale-wholesale-2',
      number: 'INV-2026-0002',
      date: NOW,
      docType: 'wholesale' as const,
      type: 'wholesale' as const,
      subtotal: 4320,
      total: 4320,
      paymentMethod: 'cash' as const,
      status: 'paid' as const,
      createdAt: NOW,
      updatedAt: NOW,
      items: [
        {
          productId: 'prod-juice-24',
          name: 'عصير برتقال طرد 24 قارورة',
          qty: 2, // 2 طرد
          unitPrice: 2160,
          lineTotal: 4320,
        },
      ],
    };

    const template: any = {
      id: 'wholesale-template',
      name: 'قالب الجملة',
      documentType: 'wholesale-invoice',
      layout: wholesaleA4Layout,
      paperSize: 'a4',
      isDefault: true,
    };

    const ctx = await buildDocumentContext(
      sale as any,
      [],
      template,
      'user-1',
      'كاشير الجملة',
      'wholesale-invoice'
    );

    expect(ctx.invoice.items).toHaveLength(1);
    const item = ctx.invoice.items[0];

    // تم التعرف على بيانات التعبئة من بطاقة المنتج تلقائياً
    expect(item.packUnit).toBe('طرد');
    expect(item.packQty).toBe(2);
    expect(item.piecesPerPack).toBe(24);
    expect(item.qty).toBe(48); // 2 × 24 = 48 قطعة إجمالية
  });

  it('displays accurate unit quantities for loose items with no packaging in wholesale invoice', async () => {
    // سلعة فردية تباع بالقطعة
    const sale = {
      id: 'sale-wholesale-3',
      number: 'INV-2026-0003',
      date: NOW,
      docType: 'wholesale' as const,
      type: 'wholesale' as const,
      subtotal: 500,
      total: 500,
      paymentMethod: 'cash' as const,
      status: 'paid' as const,
      createdAt: NOW,
      updatedAt: NOW,
      items: [
        {
          productId: 'prod-loose-pen',
          name: 'قلم جاف أزرق',
          qty: 20, // 20 قلم مفرد
          unitPrice: 25,
          lineTotal: 500,
        },
      ],
    };

    const template: any = {
      id: 'wholesale-template',
      name: 'قالب الجملة',
      documentType: 'wholesale-invoice',
      layout: wholesaleA4Layout,
      paperSize: 'a4',
      isDefault: true,
    };

    const ctx = await buildDocumentContext(
      sale as any,
      [],
      template,
      'user-1',
      'كاشير الجملة',
      'wholesale-invoice'
    );

    const item = ctx.invoice.items[0];
    // لا يثبت packQty عند 1 خطأً، بل يعكس 20 وحدة
    expect(item.packUnit).toBe('قطعة');
    expect(item.packQty).toBe(20);
    expect(item.piecesPerPack).toBe(1);
    expect(item.qty).toBe(20);
  });

  it('renders all four packaging columns in HTML with exact labels and values without overwriting labels', async () => {
    const sale = {
      id: 'sale-wholesale-4',
      number: 'INV-2026-0004',
      date: NOW,
      docType: 'wholesale' as const,
      type: 'wholesale' as const,
      subtotal: 10000,
      total: 10000,
      paymentMethod: 'cash' as const,
      status: 'paid' as const,
      createdAt: NOW,
      updatedAt: NOW,
      items: [
        {
          productId: 'prod-carton-cheese',
          name: 'جبن لافاش كيري 24 قطعة (كرتونة)',
          packUnit: 'كرتونة',
          packQty: 10,
          packPiecesCount: 24,
          qty: 240, // 10 × 24 = 240
          unitPrice: 1000,
          lineTotal: 10000,
        },
      ],
    };

    const template: any = {
      id: 'wholesale-template',
      name: 'قالب الجملة',
      documentType: 'wholesale-invoice',
      layout: wholesaleA4Layout,
      paperSize: 'a4',
      isDefault: true,
      styles: {
        font: { family: 'Cairo', size: 12, weight: 400 },
        primaryColor: '#0891b2',
        headerColor: '#0e7490',
        tableColor: '#cbd5e1',
      },
    };

    const ctx = await buildDocumentContext(
      sale as any,
      [],
      template,
      'user-1',
      'كاشير الجملة',
      'wholesale-invoice'
    );

    const html = renderDocumentHTML(ctx);

    // 1. "التعبئة (Colisage)"
    expect(html).toContain('التعبئة (Colisage)');
    expect(html).toContain('كرتونة');

    // 2. "عدد العبوات (Colis)"
    expect(html).toContain('عدد العبوات (Colis)');
    expect(html).toContain('10');

    // 3. "قطع/عبوة (Pièces/Colis)"
    expect(html).toContain('قطع/عبوة (Pièces/Colis)');
    expect(html).toContain('24');

    // 4. "إجمالي القطع (Total Pièces)"
    expect(html).toContain('إجمالي القطع (Total Pièces)');
    expect(html).toContain('240');

    // التحقق من أن ترويسة إجمالي القطع لم تستبدل بكلمة "الكمية" العادية
    expect(html).not.toContain('>الكمية<');
  });

  it('cleans redundant numbers from packaging unit names when identical to piece count', async () => {
    const sale = {
      id: 'sale-wholesale-5',
      number: 'INV-2026-0005',
      date: NOW,
      docType: 'wholesale' as const,
      type: 'wholesale' as const,
      subtotal: 3000,
      total: 3000,
      paymentMethod: 'cash' as const,
      status: 'paid' as const,
      createdAt: NOW,
      updatedAt: NOW,
      items: [
        {
          productId: 'prod-water',
          name: 'ماء معدني لالة خديجة',
          packUnit: 'طرد 6', // يحتوي على رقم مدمج
          packQty: 5,
          packPiecesCount: 6,
          qty: 30,
          unitPrice: 600,
          lineTotal: 3000,
        },
      ],
    };

    const template: any = {
      id: 'wholesale-template',
      name: 'قالب الجملة',
      documentType: 'wholesale-invoice',
      layout: wholesaleA4Layout,
      paperSize: 'a4',
      isDefault: true,
    };

    const ctx = await buildDocumentContext(
      sale as any,
      [],
      template,
      'user-1',
      'كاشير الجملة',
      'wholesale-invoice'
    );

    const item = ctx.invoice.items[0];
    // تم تنظيف اسم وحدة التعبئة ليصبح اسم الوحدة فقط
    expect(item.packUnit).toBe('طرد');
    expect(item.packQty).toBe(5);
    expect(item.piecesPerPack).toBe(6);
    expect(item.qty).toBe(30); // 5 × 6 = 30
  });
});
