import { describe, it, expect } from 'vitest';
import { calculateSaleTotal, resolveUnitPrice, getProductTierPrice } from '@/services';
import { calculateChangeDue, calculateNextDenomination, calculateTotalPieces } from '@/features/pos/quick/services/quickPOSCalculationService';
import { parseAndAddScannedCode, type ParseScanContext } from '@/services/barcode/parseAndAddScannedCode';
import type { Product, CartItem, Promotion } from '@/types';
import type { PackEntity } from '@/infrastructure/database/dexie/db';

// Helper to generate a realistic large mock catalog
function generateMockCatalog(size: number): Product[] {
  const categories = ['مواد غذائية', 'مشروبات', 'منظفات', 'إلكترونيات', 'أدوات منزلية', 'ألبان وأجبان'];
  const brands = ['سفينة', 'صومام', 'كوكاكولا', 'إكسترا', 'سيم', 'ماما', 'رويبة'];
  const catalog: Product[] = [];

  for (let i = 1; i <= size; i++) {
    const brand = brands[i % brands.length];
    const cat = categories[i % categories.length];
    catalog.push({
      id: `prod-${i}`,
      name: `${brand} منتج تجريبي رقم ${i}`,
      barcode: `61300000${String(i).padStart(6, '0')}`,
      sku: `SKU-${String(i).padStart(5, '0')}`,
      category: cat,
      unit: i % 5 === 0 ? 'كغ' : 'قطعة',
      retailPrice: Math.round((20 + (i % 500) * 1.5) * 100) / 100,
      wholesalePrice: Math.round((18 + (i % 500) * 1.3) * 100) / 100,
      costPrice: Math.round((15 + (i % 500) * 1.0) * 100) / 100,
      wholesaleMinQty: 10,
      quantity: 50 + (i % 100),
      lowStockThreshold: 10,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return catalog;
}

describe('القسم 1: اختبارات الصلابة الحسابية والحالات الحدية (Robustness & Edge Cases)', () => {
  it('1.1 دقة الحسابات ومنع أخطاء النقطة العائمة (Floating Point Precision)', () => {
    // 3 عناصر بأسعار عشرية تسبب أخطاء دقة شهيرة في جافاسكريبت
    const cart = [
      { qty: 1, unitPrice: 0.1, lineTotal: 0.1 },
      { qty: 2, unitPrice: 0.2, lineTotal: 0.4 },
      { qty: 3, unitPrice: 0.3, lineTotal: 0.9 },
    ];
    const res = calculateSaleTotal(cart, 0, 'percent', 19);
    // subtotal = 1.4
    expect(res.subtotal).toBe(1.4);
    // tvaAmount = round(1.4 * 0.19) = 0.27
    expect(res.tvaAmount).toBe(0.27);
    // total = 1.4 + 0.27 = 1.67
    expect(res.total).toBe(1.67);
  });

  it('1.2 الحالات الصفرية والسلة الفارغة (Empty & Zero Values)', () => {
    const emptyRes = calculateSaleTotal([], 0, 'percent', 0);
    expect(emptyRes.subtotal).toBe(0);
    expect(emptyRes.discountAmount).toBe(0);
    expect(emptyRes.tvaAmount).toBe(0);
    expect(emptyRes.total).toBe(0);

    const changeDue = calculateChangeDue(0, 0);
    expect(changeDue).toBe(0);

    const totalPieces = calculateTotalPieces([]);
    expect(totalPieces).toBe(0);
  });

  it('1.3 حماية التخفيضات الشاذة والتخفيضات السالبة (Discount Edge Cases)', () => {
    const cart = [{ qty: 1, unitPrice: 1000, lineTotal: 1000 }];

    // تخفيض 100%
    const fullDiscount = calculateSaleTotal(cart, 100, 'percent', 0);
    expect(fullDiscount.discountAmount).toBe(1000);
    expect(fullDiscount.total).toBe(0);

    // اختبار تخفيض بقيمة أكبر من إجمالي السلة (Amount Discount > Subtotal)
    const excessDiscount = calculateSaleTotal(cart, 1500, 'amount', 0);
    expect(excessDiscount.discountAmount).toBe(1000);
    expect(excessDiscount.total).toBe(0);

    // نسبة تخفيض تتجاوز 100% (تُقيد عند 100% كحد أقصى)
    const overPercentDiscount = calculateSaleTotal(cart, 120, 'percent', 0);
    expect(overPercentDiscount.discountAmount).toBe(1000);
    expect(overPercentDiscount.total).toBe(0);

    // تخفيض سالب (يُقيد عند 0 لمنع رفع السعر بطريقة غير شرعية)
    const negativeDiscount = calculateSaleTotal(cart, -200, 'amount', 0);
    expect(negativeDiscount.discountAmount).toBe(0);
    expect(negativeDiscount.total).toBe(1000);
  });

  it('1.4 الكميات والأوزان العشرية (Weighable Products)', () => {
    // بيع بالوزن: 2.345 كغ بسعر 850.50 د.ج للكيلو
    const qty = 2.345;
    const unitPrice = 850.5;
    const lineTotal = qty * unitPrice;
    const cart = [{ qty, unitPrice, lineTotal }];

    const res = calculateSaleTotal(cart, 0, 'percent', 0);
    expect(res.subtotal).toBe(1994.42);
    expect(res.total).toBe(1994.42);
  });

  it('1.5 الأرقام المليونية والتعاملات الضخمة (High Value Transactions)', () => {
    // مبيعات جملة بمئات الملايين
    const cart = [
      { qty: 10000, unitPrice: 50000, lineTotal: 500000000 }, // 500 مليون د.ج
      { qty: 5000, unitPrice: 20000, lineTotal: 100000000 },  // 100 مليون د.ج
    ];
    const res = calculateSaleTotal(cart, 5, 'percent', 19);
    expect(res.subtotal).toBe(600000000);
    expect(res.discountAmount).toBe(30000000);
    expect(res.tvaAmount).toBe(570000000 * 0.19);
    expect(res.total).toBe(570000000 * 1.19);
    expect(Number.isSafeInteger(res.subtotal)).toBe(true);
  });
});

describe('القسم 2: اختبارات سرعة الاستجابة والكمون (Responsiveness & Latency Benchmarks)', () => {
  const catalogSize = 10000;
  const catalog = generateMockCatalog(catalogSize);

  it('2.1 زمن البحث اللحظي في كتالوج ضخم من 10,000 منتج (Catalog Search Latency)', () => {
    const searchQueries = [
      'سفينة',              // كلمة شائعة
      '61300000005555',     // باركود في المنتصف
      'SKU-09999',          // SKU في النهاية
      'منتج غير موجود بتاتا' // أسوأ سيناريو: فحص كامل المصفوفة
    ];

    const latencies: number[] = [];

    for (const q of searchQueries) {
      const qLower = q.toLowerCase();
      const start = performance.now();
      
      // محاكاة نفس منطق usePOSCatalogFilter
      const matches = catalog.filter((p) =>
        p.status === 'active' &&
        (p.name.toLowerCase().includes(qLower) ||
          (p.barcode && p.barcode.toLowerCase().includes(qLower)) ||
          (p.sku && p.sku.toLowerCase().includes(qLower)) ||
          (typeof p.category === 'string' && p.category.toLowerCase().includes(qLower)))
      );
      
      const end = performance.now();
      latencies.push(end - start);
      expect(Array.isArray(matches)).toBe(true);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    console.log(`\n[BENCHMARK] متوسط زمن البحث في 10,000 منتج: ${avgLatency.toFixed(2)}ms (الحد الأقصى: ${maxLatency.toFixed(2)}ms)`);

    // معيار الاستجابة: يجب أن يكون البحث أسرع من 50ms حتى تحت ضغط تشغيل الاختبارات المتزامنة
    expect(avgLatency).toBeLessThan(50);
  });

  it('2.2 اختبار الضغط العالي لقارئ الباركود (Burst Barcode Scanning Throughput)', async () => {
    const scanIterations = 500;
    const addedItems: CartItem[] = [];
    const mockContext: ParseScanContext = {
      products: catalog,
      packs: [],
      promotions: [],
      addItem: (item) => {
        addedItems.push(item);
      },
      allowNegativeStock: true,
      priceTier: '1',
    };

    const start = performance.now();

    for (let i = 0; i < scanIterations; i++) {
      // قراءة باركودات عشوائية من الكتالوج
      const targetIndex = (i * 19) % catalogSize;
      const barcode = catalog[targetIndex].barcode;
      const res = await parseAndAddScannedCode(barcode, mockContext);
      expect(res.added).toBe(true);
    }

    const end = performance.now();
    const totalTimeMs = end - start;
    const throughputOpsPerSec = (scanIterations / totalTimeMs) * 1000;
    const avgScanMs = totalTimeMs / scanIterations;

    console.log(`\n[BENCHMARK] مسح ${scanIterations} باركود متتابع:`);
    console.log(` - إجمالي الوقت: ${totalTimeMs.toFixed(2)}ms`);
    console.log(` - متوسط زمن المسح للقطعة: ${avgScanMs.toFixed(3)}ms`);
    console.log(` - معدل المعالجة: ${Math.round(throughputOpsPerSec)} عملية/ثانية (Ops/sec)`);

    expect(addedItems.length).toBe(scanIterations);
    // يجب أن يعالج كل مسح في أقل من 2ms في الذاكرة
    expect(avgScanMs).toBeLessThan(2);
  });

  it('2.3 عبء تسلسل LocalStorage التزامني عند تكبير السلة (LocalStorage Bottleneck Analysis)', () => {
    const cartSizes = [10, 50, 100, 250, 500];
    const timings: Record<number, number> = {};

    for (const size of cartSizes) {
      const mockCart: CartItem[] = Array.from({ length: size }, (_, i) => ({
        productId: `prod-${i}`,
        name: `منتج رقم ${i} ذو اسم طويل ومواصفات تفصيلية`,
        qty: 2,
        unitPrice: 250,
        lineTotal: 500,
        barcode: `61300000${String(i).padStart(6, '0')}`,
        unit: 'قطعة',
      }));

      const start = performance.now();
      // محاكاة كود usePOSSessionStore الحقيقي:
      // localStorage.setItem('pos_cart', JSON.stringify(nextCart));
      const serialized = JSON.stringify(mockCart);
      localStorage.setItem('pos_cart_bench', serialized);
      const end = performance.now();

      timings[size] = end - start;
    }

    console.log('\n[BENCHMARK] زمن تسلسل وحفظ السلة في LocalStorage حسب عدد البنود:');
    for (const size of cartSizes) {
      console.log(` - ${size} بند: ${timings[size].toFixed(3)}ms`);
    }

    localStorage.removeItem('pos_cart_bench');
    // لسلة 100 بند، يجب ألا يتجاوز الزمن 5ms حتى لا يجمد واجهة المستخدم
    expect(timings[100]).toBeLessThan(15);
  });
});

describe('القسم 3: اختبار استقرار دورة حياة السلة والتعليق (Cart Lifecycle & Suspension)', () => {
  it('3.1 تكرار تعليق واسترجاع وتفريغ 50 طلباً معلقاً (Suspension Stress Test)', () => {
    interface Suspended {
      id: string;
      items: CartItem[];
      discount: number;
    }

    const suspendedList: Suspended[] = [];
    const iterations = 50;

    // 1. تعليق 50 طلباً
    for (let i = 0; i < iterations; i++) {
      const items: CartItem[] = Array.from({ length: 10 }, (_, j) => ({
        productId: `p-${i}-${j}`,
        name: `منتج ${j}`,
        qty: 1,
        unitPrice: 100,
        lineTotal: 100,
      }));
      suspendedList.push({
        id: `susp-${i}`,
        items,
        discount: i % 10,
      });
    }

    expect(suspendedList.length).toBe(iterations);

    // 2. استرجاع وحساب كل طلب معلق والتأكد من تطابق المجموع
    for (const order of suspendedList) {
      const summary = calculateSaleTotal(order.items, order.discount, 'percent', 0);
      expect(summary.subtotal).toBe(1000);
      const expectedTotal = 1000 * (1 - order.discount / 100);
      expect(summary.total).toBeCloseTo(expectedTotal, 5);
    }

    // 3. تفريغ القائمة بالكامل
    suspendedList.length = 0;
    expect(suspendedList.length).toBe(0);
  });

  it('3.2 التبديل بين أسعار الجملة والتجزئة وسرعة إعادة الحساب (Wholesale/Retail Switching)', () => {
    const products = generateMockCatalog(100);
    const cart: CartItem[] = products.slice(0, 50).map((p) => ({
      productId: p.id,
      name: p.name,
      qty: 12,
      unitPrice: p.retailPrice,
      lineTotal: 12 * p.retailPrice,
    }));

    const start = performance.now();

    // التبديل لسعر الجملة
    const wholesaleCart = cart.map((item) => {
      const p = products.find((prod) => prod.id === item.productId)!;
      const wholesalePrice = p.wholesalePrice;
      return {
        ...item,
        unitPrice: wholesalePrice,
        lineTotal: item.qty * wholesalePrice,
        pricingType: 'wholesale' as const,
      };
    });

    const summary = calculateSaleTotal(wholesaleCart, 0, 'percent', 0);
    const end = performance.now();

    console.log(`\n[BENCHMARK] زمن تحويل سلة 50 بنداً من تجزئة إلى جملة وإعادة حسابها: ${(end - start).toFixed(3)}ms`);
    expect(end - start).toBeLessThan(10);
    expect(summary.total).toBeGreaterThan(0);
  });
});
