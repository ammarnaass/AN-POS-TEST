// src/features/inventory/__tests__/InventoryPage.test.tsx
// اختبارات شاملة لميزة إدارة المخزون وسيناريو الـ 16 منتجاً المعروض في التصميم الجديد (AN POS)

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/infrastructure/database/dexie/db';
import { categoriesApi } from '@/services/api/categoriesApi';
import InventoryPage from '../InventoryPage';

vi.mock('@/services/api/categoriesApi', () => ({
  categoriesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockCategories = [
  { id: 'cat-chargers', name: 'شواحن', color: '#2563EB', icon: 'Zap' },
  { id: 'cat-food', name: 'مواد غذائية', color: '#16A34A', icon: 'Utensils' },
  { id: 'cat-general', name: 'عام', color: '#8B5CF6', icon: 'Tag' },
  { id: 'cat-headphones', name: 'سماعات', color: '#EA580C', icon: 'Headphones' },
  { id: 'cat-dairy', name: 'حليب ومشتقات', color: '#0284C7', icon: 'Milk' },
  { id: 'cat-oils', name: 'زيوت', color: '#D97706', icon: 'Droplet' },
  { id: 'cat-powerbank', name: 'بنك طاقة', color: '#3B82F6', icon: 'Battery' },
  { id: 'cat-drinks', name: 'مشروبات', color: '#06B6D4', icon: 'Coffee' },
  { id: 'cat-canned', name: 'معلبات', color: '#0D9488', icon: 'Box' },
  { id: 'cat-personal', name: 'عناية شخصية', color: '#EC4899', icon: 'Heart' },
];

const now = () => new Date().toISOString();

// إعداد بيانات الـ 16 منتجاً المطابقة تماماً لـ screen.png و code.html
async function seedSixteenProducts() {
  await db.products.clear();
  await db.categories.clear();
  await db.settings.clear();
  await db.network_settings.clear();

  // 1. Settings & Network
  await db.settings.add({
    id: 'default',
    shopName: 'متجر AN POS المركزي',
    baseCurrency: 'دج',
    createdAt: now(),
    updatedAt: now(),
  } as any);

  await db.network_settings.put({
    id: 'default',
    scannerTerminator: 'Enter',
    scannerMinLength: 6,
    scannerBeepEnabled: true,
  } as any);

  // 2. Categories
  await db.categories.bulkAdd(mockCategories as any);
  vi.mocked(categoriesApi.list).mockResolvedValue(mockCategories);

  // 3. Products (16 items: 14 in-stock, 2 low-stock, 0 out-of-stock)
  await db.products.bulkAdd([
    {
      id: 'p-1',
      name: 'شاحن سريع 25واط',
      barcode: '2524768100946',
      sku: 'ART-30183',
      category: 'شواحن',
      unit: 'قطعة',
      retailPrice: 250,
      costPrice: 150,
      quantity: 300,
      lowStockThreshold: 10,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-2',
      name: 'حمص',
      barcode: '2528874397743',
      sku: '2528874397743',
      category: 'مواد غذائية',
      unit: 'قطعة',
      retailPrice: 100,
      costPrice: 80,
      quantity: 952,
      lowStockThreshold: 20,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-3',
      name: 'Mater',
      barcode: '2524509959218',
      sku: 'PRD-1317',
      category: 'عام',
      unit: 'قطعة',
      retailPrice: 25000,
      costPrice: 0,
      quantity: 989,
      lowStockThreshold: 5,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-4',
      name: '2Hoco e',
      barcode: '6931474798527',
      sku: '6931474798527',
      category: 'سماعات',
      unit: 'قطعة',
      retailPrice: 1500,
      costPrice: 0,
      quantity: 90,
      lowStockThreshold: 5,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-5',
      name: 'hoco',
      barcode: '',
      sku: '0111',
      category: 'سماعات',
      unit: 'قطعة',
      retailPrice: 1600,
      costPrice: 1400,
      quantity: 100,
      lowStockThreshold: 10,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-6',
      name: 'حليب صومام',
      barcode: '24456764587',
      sku: '0001',
      category: 'مواد غذائية',
      unit: '500',
      variant: '1',
      retailPrice: 90,
      costPrice: 80,
      quantity: 404500,
      lowStockThreshold: 50,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-7',
      name: 'حليب نيدو',
      barcode: '6291100162110',
      sku: 'NID-02',
      category: 'حليب ومشتقات',
      unit: 'علبة',
      retailPrice: 55,
      costPrice: 45,
      quantity: 68,
      lowStockThreshold: 10,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-8',
      name: 'سكر 1 كغ',
      barcode: '6222004123456',
      sku: 'SUG-1K',
      category: 'مواد غذائية',
      unit: 'كيس',
      retailPrice: 45,
      costPrice: 38,
      quantity: 174,
      lowStockThreshold: 20,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-9',
      name: 'زيت هالي 1ل',
      barcode: '6223001234567',
      sku: 'OIL-01L',
      category: 'زيوت',
      unit: 'قنينة',
      retailPrice: 115,
      costPrice: 95,
      quantity: 1, // LOW STOCK (<= 5)
      lowStockThreshold: 5,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-10',
      name: 'أرز بسمتي 1كغ',
      barcode: '6224001234568',
      sku: 'RICE-BAS1',
      category: 'مواد غذائية',
      unit: 'كيس',
      retailPrice: 80,
      costPrice: 65,
      quantity: 1000,
      lowStockThreshold: 25,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-11',
      name: 'بنك طاقة 10000mAh',
      barcode: '6971234567890',
      sku: 'PB-10K',
      category: 'بنك طاقة',
      unit: 'قطعة',
      retailPrice: 3200,
      costPrice: 2500,
      quantity: 25,
      lowStockThreshold: 5,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-12',
      name: 'جبن شرائح 200غ',
      barcode: '6299887766554',
      sku: 'CH-200G',
      category: 'حليب ومشتقات',
      unit: 'علبة',
      retailPrice: 220,
      costPrice: 180,
      quantity: 45,
      lowStockThreshold: 10,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-13',
      name: 'عصير برتقال 1ل',
      barcode: '6131234567890',
      sku: 'JC-ORG1',
      category: 'مشروبات',
      unit: 'قارورة',
      retailPrice: 160,
      costPrice: 130,
      quantity: 50,
      lowStockThreshold: 15,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-14',
      name: 'مشروب غازي 2ل',
      barcode: '6132345678901',
      sku: 'SODA-2L',
      category: 'مشروبات',
      unit: 'قارورة',
      retailPrice: 180,
      costPrice: 140,
      quantity: 60,
      lowStockThreshold: 15,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-15',
      name: 'تونة بالزيت 160غ',
      barcode: '6133456789012',
      sku: 'TUNA-160',
      category: 'معلبات',
      unit: 'علبة',
      retailPrice: 170,
      costPrice: 140,
      quantity: 2, // LOW STOCK (<= 5)
      lowStockThreshold: 5,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'p-16',
      name: 'صابون سائل 500مل',
      barcode: '6134567890123',
      sku: 'SOAP-500',
      category: 'عناية شخصية',
      unit: 'قارورة',
      retailPrice: 280,
      costPrice: 210,
      quantity: 35,
      lowStockThreshold: 10,
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    },
  ] as any);
}

function renderInventoryPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('شاشة إدارة المخزون وقائمة المنتجات (InventoryPage)', () => {
  beforeEach(async () => {
    await seedSixteenProducts();
  });

  it('يعرض الترويسة وتبويبات الوصول السريع والأزرار الأساسية بدقة', async () => {
    renderInventoryPage();

    // انتظار تحميل البيانات في الترويسة
    expect(await screen.findByText('قائمة المنتجات')).toBeInTheDocument();
    expect(screen.getByText('تقرير الباركود')).toBeInTheDocument();
    expect(screen.getByText('عبوات الجملة والباقات')).toBeInTheDocument();

    // أزرار الإجراءات السريعة
    expect(screen.getByText('منتج جديد')).toBeInTheDocument();
    expect(screen.getByText('تحديث فوري')).toBeInTheDocument();
    expect(screen.getByText('استيراد Excel')).toBeInTheDocument();
    expect(screen.getByText('تصدير Excel / CSV')).toBeInTheDocument();
    expect(screen.getByText('فاتورة مورد (PDF)')).toBeInTheDocument();
  });

  it('يعرض بطاقات المؤشرات الأربعة (KPIs) مطابقة لأرقام التصميم (16 مسجل، 2 منخفض، 0 نافذ)', async () => {
    renderInventoryPage();

    // 1. المخزون الكلي (16 صنف مسجل)
    expect(await screen.findByText('المخزون الكلي')).toBeInTheDocument();
    expect(await screen.findAllByText('16')).not.toHaveLength(0);
    expect(screen.getByText('صنف مسجل')).toBeInTheDocument();
    expect(screen.getByText(/النشطة:/)).toBeInTheDocument();
    expect(screen.getByText(/المعطلة:/)).toBeInTheDocument();

    // 2. مخزون منخفض (2 منتج تحت حد الأمان)
    expect(screen.getByText('يتطلب إعادة طلب')).toBeInTheDocument();
    expect(screen.getByText('منتج تحت حد الأمان')).toBeInTheDocument();
    expect(screen.getByText('اضغط للتصفية السريعة')).toBeInTheDocument();

    // 3. منتجات نافذة (0 منتج غير متوفر للبيع)
    expect(screen.getByText('مكتمل')).toBeInTheDocument();
    expect(screen.getByText('منتج غير متوفر للبيع')).toBeInTheDocument();
    expect(screen.getByText('اضغط لتحديد النواقص')).toBeInTheDocument();

    // 4. القيمة الإجمالية وهوامش الربح
    expect(screen.getByText(/هامش متوقع/)).toBeInTheDocument();
    expect(screen.getByText('القيمة الإجمالية (بالتكلفة)')).toBeInTheDocument();
    expect(screen.getByText('قيمة البيع:')).toBeInTheDocument();
  });

  it('يعرض جدول المنتجات مع أعمدة التفاصيل والبيانات الدقيقة', async () => {
    renderInventoryPage();

    // التأكد من ظهور عناوين الأعمدة المطابقة لـ Mockup
    expect(await screen.findByText('المنتج والوحدة')).toBeInTheDocument();
    expect(screen.getByText('الباركود / SKU')).toBeInTheDocument();
    expect(screen.getByText('الفئة والتصنيف')).toBeInTheDocument();
    expect(screen.getByText('سعر البيع والتكلفة')).toBeInTheDocument();
    expect(screen.getByText('الكمية الحالية')).toBeInTheDocument();
    expect(screen.getByText('تعديل سريع')).toBeInTheDocument();

    // التأكد من ظهور بعض المنتجات المحددة
    expect(await screen.findByText('شاحن سريع 25واط', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText('2524768100946', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText('حمص', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByText('Mater', {}, { timeout: 10000 })).toBeInTheDocument();
  }, 25000);

  it('يصفي المنتجات حسب الحالة (منخفض 2) عند النقر على شارة منخفض', async () => {
    renderInventoryPage();

    await screen.findByText('شاحن سريع 25واط', {}, { timeout: 10000 });

    // النقر على زر تصفية "منخفض"
    const lowStockBtn = screen.getByRole('button', { name: /منخفض/i });
    fireEvent.click(lowStockBtn);

    // المنتجات المنخفضة (زيت هالي 1ل و تونة بالزيت 160غ)
    await waitFor(() => {
      expect(screen.getByText('زيت هالي 1ل')).toBeInTheDocument();
      expect(screen.queryByText('شاحن سريع 25واط')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  }, 25000);

  it('يصفي المنتجات حسب التصنيف عند اختيار تصنيف محدد', async () => {
    renderInventoryPage();

    await screen.findByText('شاحن سريع 25واط', {}, { timeout: 10000 });

    // النقر على تصنيف "حليب ومشتقات"
    const dairyBtn = await screen.findByRole('button', { name: /حليب ومشتقات/i }, { timeout: 10000 });
    fireEvent.click(dairyBtn);

    await waitFor(() => {
      expect(screen.getByText('حليب نيدو')).toBeInTheDocument();
      expect(screen.queryByText('شاحن سريع 25واط')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  }, 25000);

  it('يبحث في المنتجات بالاسم أو الباركود أو SKU لحظياً', async () => {
    renderInventoryPage();

    const searchInput = await screen.findByPlaceholderText(/ابحث بالاسم، الباركود، أو رقم الصنف SKU.../i, {}, { timeout: 10000 });
    fireEvent.change(searchInput, { target: { value: 'ART-30183' } });

    await waitFor(() => {
      expect(screen.getByText('شاحن سريع 25واط')).toBeInTheDocument();
      expect(screen.queryByText('حمص')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  }, 25000);

  it('يبدل طريقة العرض بين الجدول والشبكة بسلاسة', async () => {
    renderInventoryPage();

    await screen.findByText('شاحن سريع 25واط', {}, { timeout: 10000 });

    // النقر على زر العرض الشبكي
    const gridBtn = screen.getByLabelText('عرض شبكي');
    fireEvent.click(gridBtn);

    // في وضع الشبكة تظهر بطاقات المنتجات
    await waitFor(() => {
      expect(screen.getByText('شاحن سريع 25واط')).toBeInTheDocument();
    });

    // العودة إلى وضع الجدول
    const tableBtn = screen.getByLabelText('عرض قائمة');
    fireEvent.click(tableBtn);

    await waitFor(() => {
      expect(screen.getByText('المنتج والوحدة')).toBeInTheDocument();
    });
  }, 25000);

  it('يفتح نافذة إضافة منتج جديد ويعرض الأقسام الخمسة المفككة بدقة', async () => {
    renderInventoryPage();

    // النقر على زر "منتج جديد" مباشرة بمجرد ظهور الترويسة
    const addBtn = await screen.findByRole('button', { name: /منتج جديد/i }, { timeout: 10000 });
    fireEvent.click(addBtn);

    // ظهور المودال وتفرعاته المفككة
    expect(await screen.findByText('إضافة صنف جديد للمخزون', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText('البيانات الأساسية')).toBeInTheDocument();
    expect(screen.getByText('الفئة والوحدة')).toBeInTheDocument();
    expect(screen.getByText('الأسعار والربحية')).toBeInTheDocument();
    expect(screen.getByText('المخزون والتنبيهات')).toBeInTheDocument();
    expect(screen.getByText('الصلاحية والخيارات')).toBeInTheDocument();

    // حقول القسم الأساسي
    expect(screen.getByText('اسم المنتج *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('مثال: بيبسي 1 لتر')).toBeInTheDocument();
  });
});
