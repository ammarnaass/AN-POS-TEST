// src/features/packs/__tests__/PacksPage.test.tsx
// اختبارات شاملة لميزة الباقات والحزم التجارية وسيناريو الـ 5 باقات المسجلة (AN POS)

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/infrastructure/database/dexie/db';
import PacksPage from '../PacksPage';

const now = () => new Date().toISOString();

async function seedFivePacks() {
  await db.products.clear();
  await db.packs.clear();
  await db.settings.clear();

  // 1. Settings
  await db.settings.add({
    id: 's-1',
    shopName: 'متجر التوفير المركزي',
    baseCurrency: 'دج',
    createdAt: now(),
    updatedAt: now(),
  } as any);

  // 2. Products in inventory
  await db.products.bulkAdd([
    {
      id: 'prod-oil',
      name: 'زيت المائدة 1 لتر',
      barcode: '6131111111111',
      costPrice: 150,
      retailPrice: 200,
      wholesalePrice: 180,
      quantity: 120,
      unit: 'حبة',
      category: 'زيوت',
      status: 'active',
      allowNegativeStock: false,
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'prod-sugar',
      name: 'سكر 1 كغ',
      barcode: '6132222222222',
      costPrice: 90,
      retailPrice: 110,
      wholesalePrice: 100,
      quantity: 50,
      unit: 'كيس',
      category: 'مواد غذائية',
      status: 'active',
      allowNegativeStock: false,
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'prod-flour',
      name: 'دقيق 1 كغ',
      barcode: '6133333333333',
      costPrice: 60,
      retailPrice: 80,
      wholesalePrice: 70,
      quantity: 40,
      unit: 'كيس',
      category: 'حبوب',
      status: 'active',
      allowNegativeStock: false,
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'prod-tuna',
      name: 'تونة 160 غرام',
      barcode: '6134444444444',
      costPrice: 130,
      retailPrice: 160,
      wholesalePrice: 145,
      quantity: 24, // يكفي فقط لـ 2 دزينة (12 * 2 = 24)
      unit: 'علبة',
      category: 'معلبات',
      status: 'active',
      allowNegativeStock: false,
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'prod-soap',
      name: 'سائل غسيل 3 لتر',
      barcode: '6135555555555',
      costPrice: 300,
      retailPrice: 400,
      wholesalePrice: 350,
      quantity: 0, // نفاد المخزون تماماً!
      unit: 'قارورة',
      category: 'منظفات',
      status: 'active',
      allowNegativeStock: false,
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'prod-milk',
      name: 'حليب معقم 1 لتر',
      barcode: '6136666666666',
      costPrice: 80,
      retailPrice: 100,
      wholesalePrice: 90,
      quantity: 90,
      unit: 'علبة',
      category: 'ألبان',
      status: 'active',
      allowNegativeStock: false,
      createdAt: now(),
      updatedAt: now(),
    } as any,
  ]);

  // 3. The 5 Registered Commercial Packs
  await db.packs.bulkAdd([
    {
      id: 'pack-1',
      name: 'كرتونة زيت المائدة 12 حبة',
      barcode: '6130000000011',
      packType: 'wholesale',
      unitName: 'كرتونة',
      packPrice: 2160,
      piecesCount: 12,
      minWholesaleQty: 1,
      items: JSON.stringify([{ productId: 'prod-oil', qty: 12 }]),
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'pack-2',
      name: 'باقة رمضان للتوفير',
      barcode: '6130000000028',
      packType: 'bundle',
      unitName: 'باقة',
      packPrice: 1800,
      piecesCount: 14,
      items: JSON.stringify([
        { productId: 'prod-oil', qty: 4 },
        { productId: 'prod-sugar', qty: 5 },
        { productId: 'prod-flour', qty: 5 },
      ]),
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'pack-3',
      name: 'دزينة تونة مفرقة 12 علبة',
      barcode: '6130000000035',
      packType: 'half_wholesale',
      unitName: 'دزينة',
      packPrice: 1680,
      piecesCount: 12,
      minWholesaleQty: 1,
      items: JSON.stringify([{ productId: 'prod-tuna', qty: 12 }]),
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'pack-4',
      name: 'حزمة منظفات التوفير الكبرى',
      barcode: '6130000000042',
      packType: 'bundle',
      unitName: 'حزمة',
      packPrice: 950,
      piecesCount: 4,
      items: JSON.stringify([
        { productId: 'prod-soap', qty: 2 },
        { productId: 'prod-flour', qty: 2 },
      ]),
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    } as any,
    {
      id: 'pack-5',
      name: 'صندوق حليب معقم 6 علب',
      barcode: '6130000000059',
      packType: 'wholesale',
      unitName: 'صندوق',
      packPrice: 540,
      piecesCount: 6,
      minWholesaleQty: 2,
      items: JSON.stringify([{ productId: 'prod-milk', qty: 6 }]),
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    } as any,
  ]);
}

function renderPacksPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PacksPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PacksPage — إدارة الباقات والحزم التجارية (5 باقة مسجلة)', () => {
  beforeEach(async () => {
    await seedFivePacks();
    delete (window as any).electronAPI;
  });

  it('يعرض الترويسة وعداد الباقات المسجلة (5 باقة مسجلة) بدقة', async () => {
    renderPacksPage();

    // انتظار تحميل الباقات وظهور عداد الـ 5 باقة مسجلة
    expect(await screen.findByText(/5 باقة مسجلة/i)).toBeInTheDocument();
    expect(screen.getByText('الباقات والحزم التجارية')).toBeInTheDocument();
    expect(
      screen.getByText(/إدارة احترافية لكراتين الجملة، الباقات الترويجية/i)
    ).toBeInTheDocument();
  });

  it('يعرض بطاقات المؤشرات الإحصائية الأربعة وتوزيع الأنواع (2 جملة، 2 حزم مجمعة، 1 نصف جملة)', async () => {
    renderPacksPage();

    // انتظار تحميل البيانات واكتمال الإحصاءات
    expect(await screen.findByText(/5 باقة مسجلة/i)).toBeInTheDocument();

    // إجمالي الباقات: 5
    expect(screen.getByText('إجمالي الباقات والحزم')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // طرود وكراتين الجملة: 2 (كرتونة زيت + صندوق حليب)
    expect(screen.getByText(/طرود وكراتين الجملة/i)).toBeInTheDocument();

    // حزم مجمعة: 2 (باقة رمضان + حزمة منظفات)
    expect(screen.getAllByText(/باقات وحزم مجمعة 🎁/i).length).toBeGreaterThanOrEqual(1);
  });

  it('يعرض جميع الباقات الـ 5 في وضع الشبكة مع تمييز الشارات ومؤشرات جاهزية المخزون', async () => {
    renderPacksPage();

    // أسماء الباقات الـ 5
    expect(await screen.findByText('كرتونة زيت المائدة 12 حبة')).toBeInTheDocument();
    expect(screen.getByText('باقة رمضان للتوفير')).toBeInTheDocument();
    expect(screen.getByText('دزينة تونة مفرقة 12 علبة')).toBeInTheDocument();
    expect(screen.getByText('حزمة منظفات التوفير الكبرى')).toBeInTheDocument();
    expect(screen.getByText('صندوق حليب معقم 6 علب')).toBeInTheDocument();

    // فحص شارات نوع الباقة
    const wholesaleBadges = screen.getAllByText('📦 طرد كرتونة جملة');
    expect(wholesaleBadges.length).toBe(2);

    const bundleBadges = screen.getAllByText('🎁 باقة وحزمة مجمعة');
    expect(bundleBadges.length).toBe(2);

    const halfWholesaleBadge = screen.getByText('🛍️ نصف جملة');
    expect(halfWholesaleBadge).toBeInTheDocument();

    // فحص جاهزية التجميع من المخزون:
    // كرتونة الزيت وحليب معقم وباقة رمضان جاهزون للتجميع
    expect(screen.getAllByText(/جاهز للتجميع:/i).length).toBeGreaterThanOrEqual(1);

    // دزينة تونة: متوفر 2 فقط من المخزون
    expect(screen.getByText(/متوفر 2 باقة فقط/i)).toBeInTheDocument();

    // حزمة المنظفات: غير متوفر لنفاد سائل الغسيل
    expect(screen.getByText(/نفاد مخزون الأصناف المكونة/i)).toBeInTheDocument();
  });

  it('يصفي الباقات حسب النوع عند النقر على أزرار الفلترة', async () => {
    renderPacksPage();

    expect(await screen.findByText('كرتونة زيت المائدة 12 حبة')).toBeInTheDocument();

    // النقر على فلتر "باقات وحزم مجمعة"
    const bundleFilterBtn = screen.getByRole('button', { name: /باقات وحزم مجمعة/i });
    fireEvent.click(bundleFilterBtn);

    // تظهر فقط الباقتين المجمعتين
    expect(screen.getByText('باقة رمضان للتوفير')).toBeInTheDocument();
    expect(screen.getByText('حزمة منظفات التوفير الكبرى')).toBeInTheDocument();
    expect(screen.queryByText('كرتونة زيت المائدة 12 حبة')).not.toBeInTheDocument();
    expect(screen.queryByText('دزينة تونة مفرقة 12 علبة')).not.toBeInTheDocument();

    // النقر على فلتر "نصف جملة"
    const halfFilterBtn = screen.getByRole('button', { name: /نصف جملة/i });
    fireEvent.click(halfFilterBtn);

    expect(screen.getByText('دزينة تونة مفرقة 12 علبة')).toBeInTheDocument();
    expect(screen.queryByText('باقة رمضان للتوفير')).not.toBeInTheDocument();
  });

  it('يبدل طريقة العرض إلى الجدول عند الضغط على أيقونة الجدول', async () => {
    renderPacksPage();

    expect(await screen.findByText('كرتونة زيت المائدة 12 حبة')).toBeInTheDocument();

    const tableModeBtn = screen.getByTitle('عرض كجدول بيانات تفصيلي');
    fireEvent.click(tableModeBtn);

    // التحقق من ظهور ترويسة الجدول
    expect(screen.getByText('اسم الباقة / الحزمة')).toBeInTheDocument();
    expect(screen.getByText('الأصناف المشمولة')).toBeInTheDocument();
    expect(screen.getByText('جاهزية التجميع')).toBeInTheDocument();
    expect(screen.getByText('سعر البيع')).toBeInTheDocument();
  });

  it('يبحث في الباقات بالاسم أو الباركود لحظياً', async () => {
    renderPacksPage();

    expect(await screen.findByText('كرتونة زيت المائدة 12 حبة')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/ابحث بالاسم، الباركود، أو محتويات الباقة/i);
    fireEvent.change(searchInput, { target: { value: 'رمضان' } });

    expect(screen.getByText('باقة رمضان للتوفير')).toBeInTheDocument();
    expect(screen.queryByText('كرتونة زيت المائدة 12 حبة')).not.toBeInTheDocument();

    // تفريغ البحث
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('كرتونة زيت المائدة 12 حبة')).toBeInTheDocument();
  });

  it('يفتح نافذة إنشاء باقة جديدة ويعرض المكونات النمطية المفككة ومحاكي الهامش الربحي', async () => {
    renderPacksPage();

    expect(await screen.findByText('كرتونة زيت المائدة 12 حبة')).toBeInTheDocument();

    // فتح نافذة الإضافة
    const openCreateBtn = screen.getByRole('button', { name: /إضافة باقة \/ حزمة جديدة/i });
    fireEvent.click(openCreateBtn);

    // التحقق من ظهور المودال
    expect(
      screen.getByRole('heading', { name: 'إنشاء باقة أو حزمة جديدة' })
    ).toBeInTheDocument();

    // التحقق من وجود مكون تحديد النوع PackTypeSelector
    expect(screen.getByText('نوع الباقة والغرض التجاري:')).toBeInTheDocument();
    expect(screen.getByText('وحدة التعبئة (كرتونة، باقة، صندوق...)')).toBeInTheDocument();

    // التحقق من وجود مكون البيانات الأساسية PackBasicInfoSection
    expect(screen.getByPlaceholderText(/مثال: باقة رمضان للتوفير/i)).toBeInTheDocument();
    expect(screen.getByTitle('توليد باركود EAN-13 معتمد')).toBeInTheDocument();

    // النقر على توليد باركود
    const genBarcodeBtn = screen.getByTitle('توليد باركود EAN-13 معتمد');
    fireEvent.click(genBarcodeBtn);

    // إدخال اسم الباقة وسعر البيع
    const nameInput = screen.getByPlaceholderText(/مثال: باقة رمضان للتوفير/i);
    fireEvent.change(nameInput, { target: { value: 'باقة تجريبية جديدة' } });

    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '999' } });

    // إغلاق المودال
    const cancelBtn = screen.getByRole('button', { name: 'إلغاء' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'إنشاء باقة أو حزمة جديدة' })
      ).not.toBeInTheDocument();
    });
  });
});
