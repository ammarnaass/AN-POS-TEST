import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '@/store/cartStore';
import { usePOSCartActions } from '../usePOSCartActions';
import type { Product, Promotion } from '@/types';

// Mock الأصوات لتجنب WebAudio API في بيئة الاختبار
vi.mock('@/services/barcode', () => ({
  parseAndAddScannedCode: vi.fn().mockResolvedValue({ added: false, message: 'not found' }),
  playAdded: vi.fn(),
  playErrorBeep: vi.fn(),
  unlockAudio: vi.fn(),
}));

// =============================================================
// بيانات اختبارية مُصنّعة (Fixtures)
// =============================================================
const PRODUCT_PEN: Product = {
  id: 'prod-pen',
  name: 'قلم حبر أزرق',
  barcode: '6281001000101',
  category: 'أدوات مكتبية',
  unit: 'قطعة',
  costPrice: 30,
  wholesalePrice: 40,
  retailPrice: 50,
  salePrice1: 50,
  salePrice2: 45,
  salePrice3: 40,
  invoicePrice: 38,
  wholesaleMinQty: 10,
  quantity: 100,
  lowStockThreshold: 10,
  status: 'active',
};

const PRODUCT_NOTEBOOK: Product = {
  id: 'prod-notebook',
  name: 'دفتر 96 صفحة',
  barcode: '6281001000202',
  category: 'أدوات مكتبية',
  unit: 'قطعة',
  costPrice: 60,
  wholesalePrice: 80,
  retailPrice: 100,
  wholesaleMinQty: 5,
  quantity: 50,
  lowStockThreshold: 5,
  status: 'active',
};

const PRODUCT_LOW_STOCK: Product = {
  id: 'prod-low',
  name: 'حبر طابعة',
  barcode: '6281001000303',
  category: 'أدوات مكتبية',
  unit: 'قطعة',
  costPrice: 200,
  wholesalePrice: 280,
  retailPrice: 350,
  wholesaleMinQty: 0,
  quantity: 2, // رصيد منخفض جداً
  lowStockThreshold: 5,
  status: 'active',
};

const PRODUCT_WITH_PKG: Product = {
  id: 'prod-juice',
  name: 'عصير برتقال',
  barcode: '6281001000404',
  category: 'مشروبات',
  unit: 'طرد',
  costPrice: 40,
  wholesalePrice: 55,
  retailPrice: 70,
  packageSize: '24',
  wholesaleMinQty: 0,
  quantity: 240,
  lowStockThreshold: 24,
  status: 'active',
};

const ACTIVE_PROMOTION: Promotion = {
  id: 'promo-pen',
  productId: 'prod-pen',
  name: 'عرض القلم',
  discountType: 'percent',
  type: 'percentage',
  discountValue: 20,
  startDate: new Date(Date.now() - 86400000).toISOString(),
  endDate: new Date(Date.now() + 86400000).toISOString(),
  active: true,
  status: 'active',
} as any;

const PACK_CARE_SET = {
  id: 'pack-care',
  name: 'طقم العناية (1 قلم + 2 دفتر)',
  packPrice: 280,
  piecesCount: 3,
  unitName: 'عبوة',
  items: [
    { productId: 'prod-pen', qty: 1 },
    { productId: 'prod-notebook', qty: 2 },
  ],
};

const DEFAULT_POS_SETTINGS = {
  quickSale: false,
  accountingOnly: false,
  allowNegativeStock: false,
  confirmNoStock: false,
  averagePricing: false,
  allowCardPayment: false,
  allowTransferPayment: false,
};

function createHookParams(overrides: Partial<Parameters<typeof usePOSCartActions>[0]> = {}) {
  return {
    products: [PRODUCT_PEN, PRODUCT_NOTEBOOK, PRODUCT_LOW_STOCK, PRODUCT_WITH_PKG],
    packs: [PACK_CARE_SET],
    promotions: [] as Promotion[],
    isWholesaleActive: false,
    priceTier: '1' as const,
    posSettings: DEFAULT_POS_SETTINGS,
    posLayout: 'classic' as const,
    addNotification: vi.fn(),
    quickMode: false,
    ...overrides,
  };
}

// =============================================================
// الاختبارات
// =============================================================
describe('usePOSCartActions — منطق السلة المركزي', () => {
  beforeEach(() => {
    // تصفير السلة قبل كل اختبار
    useCartStore.setState({ items: [] });
  });

  // ─── 1. إضافة منتج بكل فئة سعر (1-4) ───
  describe('1. إضافة منتج بفئات السعر المختلفة', () => {
    it('1.1 يضيف بسعر التجزئة (فئة 1) بشكل صحيح', () => {
      const params = createHookParams({ priceTier: '1' });
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].unitPrice).toBe(50); // retailPrice = 50
      expect(items[0].qty).toBe(1);
      expect(items[0].productId).toBe('prod-pen');
    });

    it('1.2 يضيف بسعر نصف الجملة (فئة 2) بشكل صحيح', () => {
      const params = createHookParams({ priceTier: '2' });
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].unitPrice).toBe(45); // salePrice2 = 45
    });

    it('1.3 يضيف بسعر الجملة (فئة 3) بشكل صحيح', () => {
      const params = createHookParams({ priceTier: '3' });
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].unitPrice).toBe(40); // wholesalePrice = 40
      expect(items[0].pricingType).toBe('wholesale');
    });

    it('1.4 يضيف بسعر الفاتورة (فئة 4) بشكل صحيح', () => {
      const params = createHookParams({ priceTier: '4' });
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].unitPrice).toBe(38); // invoicePrice = 38
    });

    it('1.5 يطبق سعر العرض الترويجي في فئة 1 عند وجود ترويج نشط', () => {
      const params = createHookParams({
        priceTier: '1',
        promotions: [ACTIVE_PROMOTION],
      });
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      // 50 × (1 - 0.20) = 40
      expect(items[0].unitPrice).toBe(40);
    });
  });

  // ─── 2. إضافة عبوة (Pack) ───
  describe('2. إضافة عبوة (Pack) إلى السلة', () => {
    it('2.1 يضيف باقة جديدة بسعرها الكامل', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      const packProduct = {
        id: 'pack-pack-care',
        name: 'طقم العناية',
        isPack: true,
        price: 280,
        packPiecesCount: 3,
        packUnit: 'عبوة',
      };

      act(() => {
        result.current.handleAddProduct(packProduct);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].isPack).toBe(true);
      expect(items[0].unitPrice).toBe(280);
      expect(items[0].productId).toBe('pack-pack-care');
    });

    it('2.2 يزيد كمية الباقة المتكررة بدل إنشاء سطر جديد', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      const packProduct = {
        id: 'pack-pack-care',
        name: 'طقم العناية',
        isPack: true,
        price: 280,
      };

      act(() => {
        result.current.handleAddProduct(packProduct);
      });
      act(() => {
        result.current.handleAddProduct(packProduct);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].qty).toBe(2);
    });
  });

  // ─── 3. تحديث الكمية وحذف العناصر ───
  describe('3. تحديث الكمية وحذف العناصر', () => {
    it('3.1 يحدث الكمية بشكل صحيح عند تمرير CartItem', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      const item = useCartStore.getState().items[0];

      act(() => {
        result.current.handleUpdateQty(item, 5);
      });

      const updated = useCartStore.getState().items[0];
      expect(updated.qty).toBe(5);
    });

    it('3.2 يحدث الكمية بشكل صحيح عند تمرير productId كنص', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      act(() => {
        result.current.handleUpdateQty('prod-pen', 10);
      });

      const updated = useCartStore.getState().items[0];
      expect(updated.qty).toBe(10);
    });

    it('3.3 يحذف الصنف تلقائياً إذا كانت الكمية الجديدة أقل من 1', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      act(() => {
        result.current.handleUpdateQty('prod-pen', 0);
      });

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('3.4 يحذف الصنف صراحة عبر handleRemoveItem', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
        result.current.handleAddProduct(PRODUCT_NOTEBOOK);
      });

      expect(useCartStore.getState().items).toHaveLength(2);

      act(() => {
        result.current.handleRemoveItem('prod-pen');
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe('prod-notebook');
    });

    it('3.5 يمسح السلة بالكامل عبر handleClearCart', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
        result.current.handleAddProduct(PRODUCT_NOTEBOOK);
      });

      expect(useCartStore.getState().items).toHaveLength(2);

      act(() => {
        result.current.handleClearCart();
      });

      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('3.6 يحافظ على السعر المخصص (isCustom) عند تحديث الكمية', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      // إضافة بسعر مخصص
      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN, 99);
      });

      const item = useCartStore.getState().items[0];
      expect(item.isCustom).toBe(true);
      expect(item.unitPrice).toBe(99);

      act(() => {
        result.current.handleUpdateQty(item, 5);
      });

      const updated = useCartStore.getState().items[0];
      expect(updated.qty).toBe(5);
      // السعر المخصص يجب أن يبقى كما هو
      expect(updated.unitPrice).toBe(99);
    });
  });

  // ─── 4. فحص المخزون عند منع المخزون السالب ───
  describe('4. فحص المخزون عند منع المخزون السالب', () => {
    it('4.1 يمنع الإضافة عند عدم كفاية المخزون ويصدر إشعاراً', () => {
      const addNotification = vi.fn();
      const params = createHookParams({
        addNotification,
        posSettings: { ...DEFAULT_POS_SETTINGS, allowNegativeStock: false },
      });
      const { result } = renderHook(() => usePOSCartActions(params));

      // محاولة إضافة 3 وحدات مع رصيد = 2 فقط
      act(() => {
        result.current.handleAddProduct(PRODUCT_LOW_STOCK, undefined, 3);
      });

      expect(useCartStore.getState().items).toHaveLength(0);
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          title: 'تنبيه المخزون',
        })
      );
    });

    it('4.2 يسمح بالإضافة عند تفعيل السماح بالمخزون السالب', () => {
      const params = createHookParams({
        posSettings: { ...DEFAULT_POS_SETTINGS, allowNegativeStock: true },
      });
      const { result } = renderHook(() => usePOSCartActions(params));

      // 3 وحدات مع رصيد = 2 لكن مسموح
      act(() => {
        result.current.handleAddProduct(PRODUCT_LOW_STOCK, undefined, 3);
      });

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].qty).toBe(3);
    });

    it('4.3 يسمح بالإضافة في وضع المحاسبة فقط (accountingOnly)', () => {
      const params = createHookParams({
        posSettings: { ...DEFAULT_POS_SETTINGS, accountingOnly: true },
      });
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_LOW_STOCK, undefined, 10);
      });

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].qty).toBe(10);
    });

    it('4.4 يمنع الإضافة التراكمية التي تتجاوز المخزون', () => {
      const addNotification = vi.fn();
      const params = createHookParams({
        addNotification,
        posSettings: { ...DEFAULT_POS_SETTINGS, allowNegativeStock: false },
      });
      const { result } = renderHook(() => usePOSCartActions(params));

      // إضافة 2 وحدات (الرصيد = 2) — يجب أن تنجح
      act(() => {
        result.current.handleAddProduct(PRODUCT_LOW_STOCK, undefined, 2);
      });
      expect(useCartStore.getState().items).toHaveLength(1);

      // محاولة إضافة 1 أخرى (الإجمالي = 3 > الرصيد 2) — يجب أن تفشل
      act(() => {
        result.current.handleAddProduct(PRODUCT_LOW_STOCK, undefined, 1);
      });
      expect(useCartStore.getState().items[0].qty).toBe(2); // لم تزد
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'warning' })
      );
    });
  });

  // ─── 5. الكمية الصريحة (explicitQty) ───
  describe('5. الكمية الصريحة (explicitQty)', () => {
    it('5.1 يضيف كمية محددة صراحة بدل الافتراضي 1', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN, undefined, 7);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].qty).toBe(7);
      expect(items[0].lineTotal).toBe(50 * 7); // 350
    });
  });

  // ─── 6. السعر المخصص (customPrice) ───
  describe('6. السعر المخصص (customPrice)', () => {
    it('6.1 يطبق السعر المخصص ويميز الصنف كـ isCustom', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN, 75);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].unitPrice).toBe(75);
      expect(items[0].isCustom).toBe(true);
    });

    it('6.2 يفصل الأسطر بين نفس المنتج بأسعار مخصصة مختلفة', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN, 75);
      });
      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN, 90);
      });

      const items = useCartStore.getState().items;
      // سعران مختلفان = سطران مختلفان
      expect(items).toHaveLength(2);
      expect(items[0].unitPrice).toBe(75);
      expect(items[1].unitPrice).toBe(90);
    });
  });

  // ─── 7. المنتج مع حجم تعبئة (packageSize) ───
  describe('7. المنتج مع حجم تعبئة (packageSize)', () => {
    it('7.1 يتعرف على المنتج ذو التعبئة ويضبط isPack و packPiecesCount', () => {
      const params = createHookParams({ priceTier: '3' });
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_WITH_PKG);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].isPack).toBe(true);
      expect(items[0].packPiecesCount).toBe(24);
      expect(items[0].packMode).toBe('wholesale_packs');
      expect(items[0].pricingType).toBe('wholesale');
    });
  });

  // ─── 8. تكامل الإضافة المتكررة للمنتج العادي ───
  describe('8. تكامل الإضافة المتكررة', () => {
    it('8.1 يدمج نفس المنتج بدل إنشاء سطر جديد', () => {
      const params = createHookParams();
      const { result } = renderHook(() => usePOSCartActions(params));

      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });
      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });
      act(() => {
        result.current.handleAddProduct(PRODUCT_PEN);
      });

      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].qty).toBe(3);
    });
  });
});
