import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { db } from '@/infrastructure/database/dexie/db';
import { useSaleCompletion } from '../useSaleCompletion';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useNotificationStore } from '@/store/notificationStore';

// =============================================================
// إعداد البيئة
// =============================================================
const NOW = '2026-09-18T12:00:00.000Z';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const defaultSettings = {
  tvaRate: 0,
  invoicePrefix: 'INV-',
  baseCurrency: 'دج',
  shopName: 'متجر الاختبار',
  phone: '0555000000',
  receiptFooter: 'شكراً لزيارتكم',
  allowNegativeStock: true,
};

// =============================================================
// الاختبارات
// =============================================================
describe('useSaleCompletion — منطق إتمام البيع والإرجاع', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();

    // مستخدم مطور لتجاوز قيود الترخيص
    useAuthStore.setState({
      user: {
        id: 'u-dev',
        name: 'المطور',
        role: 'developer' as any,
        branchId: 'b1',
        permissions: [],
        email: 'dev@test.com',
        username: 'dev',
        createdAt: NOW,
      },
    });

    // تأكد من حالة نظيفة لـ electronAPI
    delete (window as any).electronAPI;

    // تصفير السلة
    useCartStore.setState({ items: [] });

    // تصفير الإشعارات
    useNotificationStore.setState({ notifications: [], activeToasts: [] });
  });

  // ─── 1. بيع نقدي كامل ───
  describe('1. بيع نقدي كامل', () => {
    it('1.1 يسجل فاتورة بيع نقدي مع حفظ جميع الحقول المطلوبة', async () => {
      await db.products.put({
        id: 'prod-tea',
        name: 'شاي أخضر',
        quantity: 50,
        retailPrice: 100,
        costPrice: 60,
        category: 'مشروبات',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-tea',
              name: 'شاي أخضر',
              qty: 5,
              unitPrice: 100,
              lineTotal: 500,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      // التحقق من حفظ الفاتورة
      const sales = await db.sales.toArray();
      expect(sales).toHaveLength(1);

      const sale = sales[0] as any;
      expect(sale.type).toBe('sale');
      expect(sale.paymentMethod).toBe('cash');
      expect(sale.total).toBe(500);
      // الحقل الحرج: يجب أن يكون `date` موجوداً (حل خطأ NOT NULL)
      expect(sale.date).toBeDefined();
      expect(sale.date).not.toBe('');
      expect(sale.date).not.toBeNull();
    });

    it('1.2 يخصم المخزون بالكمية الصحيحة', async () => {
      await db.products.put({
        id: 'prod-coffee',
        name: 'قهوة تركية',
        quantity: 30,
        retailPrice: 200,
        costPrice: 120,
        category: 'مشروبات',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-coffee',
              name: 'قهوة تركية',
              qty: 7,
              unitPrice: 200,
              lineTotal: 1400,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      // 30 - 7 = 23
      const updated = await db.products.get('prod-coffee');
      expect(updated?.quantity).toBe(23);
    });

    it('1.3 يمسح السلة بعد إتمام البيع بنجاح', async () => {
      await db.products.put({
        id: 'prod-sugar',
        name: 'سكر 1كغ',
        quantity: 100,
        retailPrice: 120,
        costPrice: 80,
        category: 'مواد غذائية',
      } as any);

      // وضع بعض الأصناف في السلة مسبقاً
      useCartStore.setState({
        items: [
          { productId: 'prod-sugar', name: 'سكر', qty: 2, unitPrice: 120, lineTotal: 240 },
        ],
      });

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-sugar',
              name: 'سكر 1كغ',
              qty: 2,
              unitPrice: 120,
              lineTotal: 240,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      // السلة يجب أن تكون فارغة بعد البيع
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ─── 2. بيع بالآجل (دين) مع تحديث رصيد العميل ───
  describe('2. بيع بالآجل (دين)', () => {
    it('2.1 يحدث رصيد العميل عند البيع بالآجل بدون دفعة مقدمة', async () => {
      await db.products.put({
        id: 'prod-oil',
        name: 'زيت طبخ 1ل',
        quantity: 40,
        retailPrice: 300,
        costPrice: 220,
        category: 'مواد غذائية',
      } as any);

      await db.customers.put({
        id: 'cust-ali',
        name: 'علي محمد',
        balance: 500, // رصيد دين حالي
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();
      const customers = await db.customers.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-oil',
              name: 'زيت طبخ 1ل',
              qty: 3,
              unitPrice: 300,
              lineTotal: 900,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: 'cust-ali',
          paymentMethod: 'credit',
          paidAmount: 0, // بدون دفعة مقدمة
          settings: defaultSettings,
          products,
          packs: [],
          customers,
          currentSession: null,
        } as any);
      });

      // الدين الجديد: 500 + 900 = 1400
      const updatedCustomer = await db.customers.get('cust-ali');
      expect(updatedCustomer?.balance).toBe(1400);
    });

    it('2.2 يحدث رصيد العميل بالجزء غير المدفوع فقط (دفعة جزئية)', async () => {
      await db.products.put({
        id: 'prod-flour',
        name: 'دقيق 25كغ',
        quantity: 20,
        retailPrice: 2000,
        costPrice: 1500,
        category: 'مواد غذائية',
      } as any);

      await db.customers.put({
        id: 'cust-omar',
        name: 'عمر بلال',
        balance: 0,
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();
      const customers = await db.customers.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-flour',
              name: 'دقيق 25كغ',
              qty: 2,
              unitPrice: 2000,
              lineTotal: 4000,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: 'cust-omar',
          paymentMethod: 'credit',
          paidAmount: 1500, // دفع 1500 من إجمالي 4000
          settings: defaultSettings,
          products,
          packs: [],
          customers,
          currentSession: null,
        } as any);
      });

      // الدين = 4000 - 1500 = 2500
      const updatedCustomer = await db.customers.get('cust-omar');
      expect(updatedCustomer?.balance).toBe(2500);
    });

    it('2.3 يعتبر البيع ديناً كاملاً ويعين status = unpaid إذا تم تمرير paidAmount مساوياً لإجمالي الفاتورة افتراضياً', async () => {
      await db.products.put({
        id: 'prod-oil',
        name: 'زيت 5 لتر',
        quantity: 10,
        retailPrice: 1000,
        costPrice: 800,
        category: 'مواد غذائية',
      } as any);

      await db.customers.put({
        id: 'cust-khalid',
        name: 'خالد سليم',
        balance: 0,
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();
      const customers = await db.customers.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-oil',
              name: 'زيت 5 لتر',
              qty: 3,
              unitPrice: 1000,
              lineTotal: 3000,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: 'cust-khalid',
          paymentMethod: 'credit',
          paidAmount: 3000, // القيمة الافتراضية للكاش مساوية للإجمالي
          settings: defaultSettings,
          products,
          packs: [],
          customers,
          currentSession: null,
        } as any);
      });

      // يجب أن يعتبره ديناً كاملاً 3000 ولا يسجله كمدفوع
      const updatedCustomer = await db.customers.get('cust-khalid');
      expect(updatedCustomer?.balance).toBe(3000);

      const sales = await db.sales.toArray();
      const savedSale = sales[sales.length - 1];
      expect(savedSale?.status).toBe('unpaid');
      expect(savedSale?.paidAmount).toBe(0);
      expect(savedSale?.paymentMethod).toBe('credit');
    });

    it('2.4 يرسل إشعاراً مخصصاً (Warning) عند إتمام عملية الدفع بدين مع تفاصيل العميل والمبلغ', async () => {
      await db.products.put({
        id: 'prod-milk',
        name: 'حليب معقم 1ل',
        quantity: 30,
        retailPrice: 120,
        costPrice: 90,
      } as any);

      await db.customers.put({
        id: 'cust-faycal',
        name: 'فيصل بلخير',
        balance: 1000,
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();
      const customers = await db.customers.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-milk',
              name: 'حليب معقم 1ل',
              qty: 5,
              unitPrice: 120,
              lineTotal: 600,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: 'cust-faycal',
          paymentMethod: 'credit',
          paidAmount: 0,
          settings: defaultSettings,
          products,
          packs: [],
          customers,
          currentSession: null,
        } as any);
      });

      const notifs = useNotificationStore.getState().notifications;
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].title).toBe('تم تسجيل بيع بالآجل (دين على الزبون)');
      expect(notifs[0].type).toBe('warning');
      expect(notifs[0].message).toContain('فيصل بلخير');
      expect(notifs[0].message).toContain('600');
      expect(notifs[0].action?.label).toBe('سجل ديون الزبائن');
    });
  });


  // ─── 3. إرجاع (Return) ───
  describe('3. الإرجاع', () => {
    it('3.1 يسترجع المخزون عند إرجاع فاتورة كاملة', async () => {
      await db.products.put({
        id: 'prod-soap',
        name: 'صابون 100غ',
        quantity: 80,
        retailPrice: 50,
        costPrice: 30,
        category: 'منتجات عناية',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-soap',
              name: 'صابون 100غ',
              qty: 10,
              unitPrice: 50,
              lineTotal: 500,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          isReturn: true,
          originalSaleId: 'sale-original-123',
          originalSaleNumber: 'INV-001',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      // الإرجاع يزيد المخزون: 80 + 10 = 90
      const updated = await db.products.get('prod-soap');
      expect(updated?.quantity).toBe(90);

      // التحقق من حفظ الإرجاع كـ type = return
      const sales = await db.sales.toArray();
      expect(sales).toHaveLength(1);
      expect((sales[0] as any).type).toBe('return');
    });

    it('3.2 يسجل بيانات الفاتورة الأصلية عند الإرجاع', async () => {
      await db.products.put({
        id: 'prod-shampoo',
        name: 'شامبو 250مل',
        quantity: 40,
        retailPrice: 150,
        costPrice: 90,
        category: 'منتجات عناية',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-shampoo',
              name: 'شامبو 250مل',
              qty: 3,
              unitPrice: 150,
              lineTotal: 450,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          isReturn: true,
          originalSaleId: 'sale-xyz',
          originalSaleNumber: 'INV-055',
          returnReason: 'منتج تالف',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const sales = await db.sales.toArray();
      const sale = sales[0] as any;
      expect(sale.originalSaleId).toBe('sale-xyz');
      expect(sale.originalSaleNumber).toBe('INV-055');
      expect(sale.returnReason).toBe('منتج تالف');
    });

    it('3.3 يخفض رصيد العميل عند الإرجاع بطريقة رصيد العميل', async () => {
      await db.products.put({
        id: 'prod-pasta',
        name: 'مكرونة 500غ',
        quantity: 60,
        retailPrice: 80,
        costPrice: 50,
        category: 'مواد غذائية',
      } as any);

      await db.customers.put({
        id: 'cust-hassan',
        name: 'حسن أحمد',
        balance: 2000, // رصيد دين 2000
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();
      const customers = await db.customers.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-pasta',
              name: 'مكرونة 500غ',
              qty: 5,
              unitPrice: 80,
              lineTotal: 400,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: 'cust-hassan',
          paymentMethod: 'credit',
          isReturn: true,
          refundMethod: 'customer_credit',
          settings: defaultSettings,
          products,
          packs: [],
          customers,
          currentSession: null,
        } as any);
      });

      // الرصيد = 2000 - 400 = 1600
      const updatedCustomer = await db.customers.get('cust-hassan');
      expect(updatedCustomer?.balance).toBe(1600);
    });
  });

  // ─── 4. حقل date وتجنب خطأ NOT NULL ───
  describe('4. حقل date وتجنب خطأ NOT NULL constraint', () => {
    it('4.1 يضمن وجود حقل date صالح في كل فاتورة محفوظة', async () => {
      await db.products.put({
        id: 'prod-rice',
        name: 'أرز 1كغ',
        quantity: 100,
        retailPrice: 250,
        costPrice: 180,
        category: 'مواد غذائية',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-rice',
              name: 'أرز 1كغ',
              qty: 1,
              unitPrice: 250,
              lineTotal: 250,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const sales = await db.sales.toArray();
      expect(sales).toHaveLength(1);

      const sale = sales[0] as any;
      // date يجب أن يكون سلسلة ISO صالحة وغير فارغة
      expect(sale.date).toBeDefined();
      expect(typeof sale.date).toBe('string');
      expect(sale.date.length).toBeGreaterThan(0);

      // يجب أن يكون تاريخاً صالحاً (parseable)
      const parsed = new Date(sale.date);
      expect(parsed.getTime()).not.toBeNaN();
    });

    it('4.2 يضمن وجود date صالح عند إجراء إرجاع أيضاً', async () => {
      await db.products.put({
        id: 'prod-salt',
        name: 'ملح 500غ',
        quantity: 200,
        retailPrice: 30,
        costPrice: 15,
        category: 'مواد غذائية',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-salt',
              name: 'ملح 500غ',
              qty: 2,
              unitPrice: 30,
              lineTotal: 60,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          isReturn: true,
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const sales = await db.sales.toArray();
      const sale = sales[0] as any;
      expect(sale.date).toBeDefined();
      expect(new Date(sale.date).getTime()).not.toBeNaN();
    });
  });

  // ─── 5. الخصم والضريبة (TVA) ───
  describe('5. الخصم والضريبة (TVA)', () => {
    it('5.1 يطبق خصم نسبي بشكل صحيح', async () => {
      await db.products.put({
        id: 'prod-milk',
        name: 'حليب 1ل',
        quantity: 100,
        retailPrice: 120,
        costPrice: 80,
        category: 'مشروبات',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-milk',
              name: 'حليب 1ل',
              qty: 10,
              unitPrice: 120,
              lineTotal: 1200,
            } as any,
          ],
          discount: 10, // 10%
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const sales = await db.sales.toArray();
      const sale = sales[0] as any;
      // 1200 - 10% = 1200 - 120 = 1080
      expect(sale.total).toBe(1080);
    });

    it('5.2 يطبق ضريبة TVA بشكل صحيح', async () => {
      await db.products.put({
        id: 'prod-juice',
        name: 'عصير 1ل',
        quantity: 50,
        retailPrice: 200,
        costPrice: 130,
        category: 'مشروبات',
      } as any);

      const settingsWithTVA = { ...defaultSettings, tvaRate: 19 };

      const { result } = renderHook(
        () => useSaleCompletion(settingsWithTVA),
        { wrapper: createWrapper() }
      );

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-juice',
              name: 'عصير 1ل',
              qty: 5,
              unitPrice: 200,
              lineTotal: 1000,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: settingsWithTVA,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const sales = await db.sales.toArray();
      const sale = sales[0] as any;
      // 1000 + 19% TVA = 1000 + 190 = 1190
      expect(sale.tvaAmount).toBe(190);
      expect(sale.total).toBe(1190);
    });
  });

  // ─── 6. نوع الفاتورة (DocType) ───
  describe('6. نوع الفاتورة', () => {
    it('6.1 يعين docType = wholesale عند استخدام فئة سعر 3 (جملة)', async () => {
      await db.products.put({
        id: 'prod-biscuit',
        name: 'بسكويت',
        quantity: 100,
        retailPrice: 50,
        costPrice: 30,
        category: 'حلويات',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-biscuit',
              name: 'بسكويت',
              qty: 20,
              unitPrice: 40,
              lineTotal: 800,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          priceTier: '3',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const sales = await db.sales.toArray();
      const sale = sales[0] as any;
      expect(sale.docType).toBe('wholesale');
    });

    it('6.2 يعين docType = facture عند استخدام فئة سعر 1 (تجزئة)', async () => {
      await db.products.put({
        id: 'prod-candy',
        name: 'حلوى',
        quantity: 200,
        retailPrice: 10,
        costPrice: 5,
        category: 'حلويات',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-candy',
              name: 'حلوى',
              qty: 5,
              unitPrice: 10,
              lineTotal: 50,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          priceTier: '1',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const sales = await db.sales.toArray();
      const sale = sales[0] as any;
      expect(sale.docType).toBe('facture');
    });
  });

  // ─── 7. تحديث الجلسة النقدية ───
  describe('7. تحديث الجلسة النقدية', () => {
    it('7.1 يزيد totalSales في الجلسة المفتوحة عند البيع النقدي', async () => {
      await db.products.put({
        id: 'prod-water',
        name: 'ماء معدني',
        quantity: 500,
        retailPrice: 25,
        costPrice: 10,
        category: 'مشروبات',
      } as any);

      await db.cash_sessions.put({
        id: 'session-1',
        status: 'open',
        totalSales: 1000,
        totalReturns: 0,
        openedAt: NOW,
        closedAt: null,
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-water',
              name: 'ماء معدني',
              qty: 10,
              unitPrice: 25,
              lineTotal: 250,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: { id: 'session-1', totalSales: 1000, totalReturns: 0 },
        } as any);
      });

      const session = await db.cash_sessions.get('session-1');
      // 1000 + 250 = 1250
      expect((session as any)?.totalSales).toBe(1250);
    });

    it('7.2 يزيد totalReturns في الجلسة عند الإرجاع النقدي', async () => {
      await db.products.put({
        id: 'prod-soda',
        name: 'مشروب غازي',
        quantity: 100,
        retailPrice: 40,
        costPrice: 20,
        category: 'مشروبات',
      } as any);

      await db.cash_sessions.put({
        id: 'session-2',
        status: 'open',
        totalSales: 5000,
        totalReturns: 200,
        openedAt: NOW,
        closedAt: null,
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-soda',
              name: 'مشروب غازي',
              qty: 3,
              unitPrice: 40,
              lineTotal: 120,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          isReturn: true,
          refundMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: { id: 'session-2', totalSales: 5000, totalReturns: 200 },
        } as any);
      });

      const session = await db.cash_sessions.get('session-2');
      // 200 + 120 = 320
      expect((session as any)?.totalReturns).toBe(320);
    });
  });

  // ─── 8. حركات المخزون (stock_movements) ───
  describe('8. سجل حركات المخزون', () => {
    it('8.1 يسجل حركة مخزون من نوع sale عند البيع', async () => {
      await db.products.put({
        id: 'prod-chips',
        name: 'شيبس',
        quantity: 150,
        retailPrice: 60,
        costPrice: 35,
        category: 'وجبات خفيفة',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-chips',
              name: 'شيبس',
              qty: 5,
              unitPrice: 60,
              lineTotal: 300,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const movements = await db.stock_movements.toArray();
      expect(movements.length).toBeGreaterThanOrEqual(1);

      const saleMovement = movements.find((m: any) => m.productId === 'prod-chips');
      expect(saleMovement).toBeDefined();
      expect((saleMovement as any).type).toBe('sale');
      expect((saleMovement as any).qty).toBe(-5);
    });

    it('8.2 يسجل حركة مخزون من نوع return عند الإرجاع', async () => {
      await db.products.put({
        id: 'prod-chocolate',
        name: 'شوكولاتة',
        quantity: 80,
        retailPrice: 100,
        costPrice: 60,
        category: 'حلويات',
      } as any);

      const { result } = renderHook(() => useSaleCompletion(defaultSettings), {
        wrapper: createWrapper(),
      });

      const products = await db.products.toArray();

      await act(async () => {
        await result.current.completeSale({
          cart: [
            {
              productId: 'prod-chocolate',
              name: 'شوكولاتة',
              qty: 4,
              unitPrice: 100,
              lineTotal: 400,
            } as any,
          ],
          discount: 0,
          discountType: 'percent',
          selectedCustomer: '',
          paymentMethod: 'cash',
          isReturn: true,
          settings: defaultSettings,
          products,
          packs: [],
          customers: [],
          currentSession: null,
        } as any);
      });

      const movements = await db.stock_movements.toArray();
      const returnMovement = movements.find((m: any) => m.productId === 'prod-chocolate');
      expect(returnMovement).toBeDefined();
      expect((returnMovement as any).type).toBe('return');
      expect((returnMovement as any).qty).toBe(4); // إرجاع = موجب
    });
  });
});
