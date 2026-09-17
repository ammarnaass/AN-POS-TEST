// src/features/categories/__tests__/CategoriesPage.test.tsx
// اختبارات شاملة لميزة عائلات المنتجات وفق المعمارية الجديدة (AN POS)

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategoriesPage from '../CategoriesPage';
import { categoriesApi, type Category } from '@/services/api/categoriesApi';

vi.mock('@/services/api/categoriesApi', () => ({
  categoriesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'مشروبات وعصائر',
    description: 'عصائر طازجة ومشروبات غازية',
    icon: 'Coffee',
    color: '#3B82F6',
    productCount: 15,
    parentId: null,
  },
  {
    id: 'cat-2',
    name: 'مياه معدنية',
    description: 'مياه شرب معبأة',
    icon: 'Droplets',
    color: '#06B6D4',
    productCount: 5,
    parentId: 'cat-1',
  },
  {
    id: 'cat-3',
    name: 'عائلة فارغة مؤقتة',
    description: 'قيد التجهيز',
    icon: 'Box',
    color: '#F59E0B',
    productCount: 0,
    parentId: null,
  },
];

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CategoriesPage — إدارة عائلات وفئات المنتجات', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(categoriesApi.list).mockResolvedValue(mockCategories);
    vi.mocked(categoriesApi.create).mockResolvedValue({
      id: 'cat-new',
      name: 'ألبان وأجبان',
      parentId: null,
      icon: 'Milk',
      color: '#10B981',
      productCount: 0,
    });
    vi.mocked(categoriesApi.update).mockResolvedValue({
      ...mockCategories[0],
      name: 'مشروبات ساخنة وباردة',
    });
    vi.mocked(categoriesApi.remove).mockResolvedValue({ success: true });
  });

  it('يعرض الترويسة وبطاقات المؤشرات الإحصائية الأربعة (KPIs) بدقة', async () => {
    renderWithClient(<CategoriesPage />);

    // الترويسة والعنوان
    expect(screen.getByRole('heading', { name: 'عائلات المنتجات' })).toBeInTheDocument();
    expect(screen.getByText(/تنظيم وتصنيف البضائع والمنتجات/i)).toBeInTheDocument();

    // انتظار تحميل البيانات وظهور العدادات
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // عائلات نشطة (2)
    expect(screen.getByText('2')).toBeInTheDocument();

    // عائلات فارغة (1)
    expect(screen.getByText('1')).toBeInTheDocument();

    // إجمالي الأصناف المصنفة (15 + 5 + 0 = 20)
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('يعرض شبكة بطاقات العائلات افتراضياً مع الألوان والتسلسل الهرمي', async () => {
    renderWithClient(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'مشروبات وعصائر' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'مياه معدنية' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'عائلة فارغة مؤقتة' })).toBeInTheDocument();

    // فحص التبعية الهرمية (مياه معدنية تابعة لـ مشروبات وعصائر)
    expect(screen.getByText('تابعة لـ:')).toBeInTheDocument();
  });

  it('يبدل نمط العرض إلى الجدول عند النقر على أيقونة الجدول', async () => {
    renderWithClient(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'مشروبات وعصائر' })).toBeInTheDocument();
    });

    // النقر على زر عرض الجدول
    const tableBtn = screen.getByTitle('عرض الجدول');
    fireEvent.click(tableBtn);

    // التحقق من ظهور ترويسة الجدول
    expect(screen.getByText('العائلة الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('عدد المنتجات')).toBeInTheDocument();
  });

  it('يبحث في العائلات بالاسم والوصف ويقوم بتصفية النتائج لحظياً', async () => {
    renderWithClient(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'مياه معدنية' })).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('بحث باسم العائلة أو الوصف...');
    fireEvent.change(searchInput, { target: { value: 'مياه' } });

    // تظهر الفئة المطابقة فقط
    expect(screen.getByRole('heading', { name: 'مياه معدنية' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'عائلة فارغة مؤقتة' })).not.toBeInTheDocument();

    // مسح البحث عبر زر تفريغ البحث
    const clearBtn = screen.getByTitle('تفريغ البحث');
    fireEvent.click(clearBtn);

    expect(screen.getByRole('heading', { name: 'عائلة فارغة مؤقتة' })).toBeInTheDocument();
  });

  it('يصفي العائلات عبر أزرار الفلترة السريعة (بها منتجات، فارغة، رئيسية)', async () => {
    renderWithClient(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'عائلة فارغة مؤقتة' })).toBeInTheDocument();
    });

    // فلتر "فارغة"
    const emptyFilterBtn = screen.getByText(/فارغة \(1\)/i);
    fireEvent.click(emptyFilterBtn);

    expect(screen.getByRole('heading', { name: 'عائلة فارغة مؤقتة' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'مشروبات وعصائر' })).not.toBeInTheDocument();

    // فلتر "رئيسية"
    const rootFilterBtn = screen.getByText('رئيسية');
    fireEvent.click(rootFilterBtn);

    expect(screen.getByRole('heading', { name: 'مشروبات وعصائر' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'عائلة فارغة مؤقتة' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'مياه معدنية' })).not.toBeInTheDocument();
  });

  it('يفتح نافذة إضافة عائلة جديدة ويحفظ البيانات بنجاح', async () => {
    renderWithClient(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'مشروبات وعصائر' })).toBeInTheDocument();
    });

    // فتح نافذة الإضافة
    const addBtn = screen.getByRole('button', { name: /إضافة عائلة جديدة/i });
    fireEvent.click(addBtn);

    expect(
      screen.getByRole('heading', { name: 'إضافة عائلة جديدة' })
    ).toBeInTheDocument();

    // إدخال اسم العائلة
    const nameInput = screen.getByPlaceholderText('مثال: مشروبات، ألبان، معلبات...');
    fireEvent.change(nameInput, { target: { value: 'ألبان وأجبان' } });

    // النقر على حفظ
    const submitBtn = screen.getByRole('button', { name: 'إضافة العائلة' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(categoriesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ألبان وأجبان',
        })
      );
    });
  });

  it('يمنع حذف عائلة تحتوي على منتجات مرتبطة ويعرض تحذيراً صريحاً', async () => {
    renderWithClient(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'مشروبات وعصائر' })).toBeInTheDocument();
    });

    // النقر على زر حذف أول عائلة (لديها 15 منتج)
    const deleteButtons = screen.getAllByTitle('حذف العائلة');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText(/تحذير: يوجد 15 منتج مرتبط بهذه العائلة/i)).toBeInTheDocument();

    // زر الحذف يجب أن يكون معطلاً
    const confirmDeleteBtn = screen.getByRole('button', { name: 'نعم، احذف' });
    expect(confirmDeleteBtn).toBeDisabled();
  });

  it('يتيح حذف عائلة فارغة (0 منتجات) بعد التأكيد', async () => {
    renderWithClient(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'عائلة فارغة مؤقتة' })).toBeInTheDocument();
    });

    // العائلة الثالثة هي العائلة الفارغة
    const deleteButtons = screen.getAllByTitle('حذف العائلة');
    fireEvent.click(deleteButtons[2]);

    expect(
      screen.getByText(/هل أنت متأكد من رغبتك في حذف هذه العائلة نهائياً؟/i)
    ).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'نعم، احذف' });
    expect(confirmDeleteBtn).not.toBeDisabled();

    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(categoriesApi.remove).toHaveBeenCalledWith('cat-3');
    });
  });
});
