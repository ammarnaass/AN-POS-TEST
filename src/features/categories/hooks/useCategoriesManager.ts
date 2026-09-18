// src/features/categories/hooks/useCategoriesManager.ts
// خطاف إدارة حالة عائلات المنتجات واستعلامات React Query (AN POS)

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, type Category, type CategoryWrite } from '@/services/api/categoriesApi';
import { generateId } from '@/utils';
import { useNotificationStore } from '@/store/notificationStore';
import {
  COLOR_PALETTE,
  emptyCategoryForm,
  type CategoryFilterType,
  type CategoryViewMode,
} from '../constants/categoryConstants';

export function useCategoriesManager() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryFilterType>('all');
  const [viewMode, setViewMode] = useState<CategoryViewMode>('grid');

  // حالات النوافذ والنموذج
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryWrite>(emptyCategoryForm);
  const [formError, setFormError] = useState('');
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<Category | null>(null);

  // استعلام جلب الفئات
  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  // فحص آني ولحظي لمنع تكرار اسم العائلة (Real-time duplicate check)
  const isDuplicateName = useMemo(() => {
    const trimmed = form.name.trim().toLowerCase();
    if (!trimmed) return false;
    return categories.some(
      (c) => c.name.trim().toLowerCase() === trimmed && c.id !== editing?.id
    );
  }, [form.name, categories, editing]);

  // إضافة عائلة جديدة (آني 0ms مع حماية التراجع التلقائي)
  const createMutation = useMutation({
    mutationFn: (body: CategoryWrite) => categoriesApi.create(body),
    onMutate: async (newCatData) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const previousCategories = queryClient.getQueryData<Category[]>(['categories']) || [];
      const tempId = generateId();
      const optimisticCategory: Category = {
        id: tempId,
        name: newCatData.name.trim(),
        parentId: newCatData.parentId ?? null,
        description: newCatData.description ?? '',
        icon: newCatData.icon || 'FolderTree',
        color: newCatData.color || '#3B82F6',
        productCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // تحديث آني وفوري في الكاش (0ms)
      queryClient.setQueryData<Category[]>(['categories'], (old = []) => [...old, optimisticCategory]);

      // إغلاق النافذة وتصفير النموذج فوراً لتجربة مستخدم سريعة
      setShowForm(false);
      setForm(emptyCategoryForm);
      setFormError('');

      addNotification({
        title: 'تمت إضافة العائلة',
        message: `تم إنشاء فئة "${optimisticCategory.name}" بنجاح وتحديث الكاشير.`,
        type: 'success',
        category: 'inventory',
      });

      return { previousCategories, tempId };
    },
    onSuccess: (savedCat, _vars, context) => {
      if (context?.tempId && savedCat?.id) {
        queryClient.setQueryData<Category[]>(['categories'], (old = []) =>
          old.map((c) => (c.id === context.tempId ? savedCat : c))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories);
      }
      addNotification({
        title: 'فشل إضافة العائلة',
        message: err?.message || 'حدث خطأ أثناء حفظ الفئة.',
        type: 'error',
        category: 'inventory',
      });
      setFormError(err.message);
      setShowForm(true);
    },
  });

  // تعديل بيانات عائلة (آني 0ms)
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryWrite }) =>
      categoriesApi.update(id, body),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const previousCategories = queryClient.getQueryData<Category[]>(['categories']) || [];

      // تطبيق التعديل فوراً (0ms) في الكاش
      queryClient.setQueryData<Category[]>(['categories'], (old = []) =>
        old.map((c) =>
          c.id === id
            ? {
                ...c,
                ...body,
                name: body.name.trim(),
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );

      setShowForm(false);
      setEditing(null);
      setForm(emptyCategoryForm);
      setFormError('');

      addNotification({
        title: 'تم تعديل العائلة',
        message: 'تم تحديث بيانات وتصنيف العائلة بنجاح.',
        type: 'success',
        category: 'inventory',
      });

      return { previousCategories };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories);
      }
      addNotification({
        title: 'فشل تعديل العائلة',
        message: err?.message || 'حدث خطأ أثناء تحديث الفئة.',
        type: 'error',
        category: 'inventory',
      });
      setFormError(err.message);
      setShowForm(true);
    },
  });

  // حذف عائلة (آني 0ms)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const previousCategories = queryClient.getQueryData<Category[]>(['categories']) || [];

      // إزالة آنية ولحظية (0ms)
      queryClient.setQueryData<Category[]>(['categories'], (old = []) =>
        old.filter((c) => c.id !== id)
      );

      setDeleteConfirmCat(null);

      addNotification({
        title: 'تم حذف العائلة',
        message: 'تمت إزالة الفئة بنجاح من النظام وتحديث الكاشير.',
        type: 'info',
        category: 'inventory',
      });

      return { previousCategories };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories);
      }
      addNotification({
        title: 'فشل حذف العائلة',
        message: err?.message || 'تعذر حذف الفئة لوجود ارتباطات أو خطأ في النظام.',
        type: 'error',
        category: 'inventory',
      });
    },
  });

  // خريطة أسماء العائلات لحساب الأصل
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // إحصائيات علوية سريعة
  const stats = useMemo(() => {
    const total = categories.length;
    const withProducts = categories.filter((c) => (c.productCount ?? 0) > 0).length;
    const emptyCount = total - withProducts;
    const totalProducts = categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);
    return { total, withProducts, emptyCount, totalProducts };
  }, [categories]);

  // تصفية العائلات حسب البحث والفلتر النشط
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchSearch =
        search.trim() === '' ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (activeFilter === 'with-products') return (c.productCount ?? 0) > 0;
      if (activeFilter === 'empty') return (c.productCount ?? 0) === 0;
      if (activeFilter === 'root') return !c.parentId;
      if (activeFilter === 'sub') return Boolean(c.parentId);

      return true;
    });
  }, [categories, search, activeFilter]);

  // فتح نافذة الإضافة
  const openNew = (parentId?: string) => {
    setEditing(null);
    setForm({
      ...emptyCategoryForm,
      parentId: parentId || null,
      color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].hex,
    });
    setFormError('');
    setShowForm(true);
  };

  // فتح نافذة التعديل
  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      parentId: cat.parentId ?? null,
      description: cat.description ?? '',
      icon: cat.icon || 'FolderTree',
      color: cat.color || '#3B82F6',
    });
    setFormError('');
    setShowForm(true);
  };

  // معالجة حفظ النموذج
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) {
      setFormError('اسم الفئة مطلوب');
      return;
    }
    if (isDuplicateName) {
      setFormError('اسم الفئة موجود مسبقاً، يرجى اختيار اسم آخر لمنع التكرار.');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: { ...form, name: trimmed } });
    } else {
      createMutation.mutate({ ...form, name: trimmed });
    }
  };

  // معالجة تنفيذ الحذف
  const handleConfirmDelete = () => {
    if (!deleteConfirmCat) return;
    deleteMutation.mutate(deleteConfirmCat.id);
  };

  return {
    // البيانات والاستعلامات
    categories,
    isLoading,
    error,
    stats,
    categoryMap,
    filteredCategories,

    // خيارات العرض والبحث
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    viewMode,
    setViewMode,

    // النماذج
    showForm,
    setShowForm,
    editing,
    form,
    setForm,
    formError,
    isDuplicateName,
    deleteConfirmCat,
    setDeleteConfirmCat,

    // العمليات
    openNew,
    openEdit,
    handleSubmit,
    handleConfirmDelete,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
