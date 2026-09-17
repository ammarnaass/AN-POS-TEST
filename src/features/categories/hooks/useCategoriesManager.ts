// src/features/categories/hooks/useCategoriesManager.ts
// خطاف إدارة حالة عائلات المنتجات واستعلامات React Query (AN POS)

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, type Category, type CategoryWrite } from '@/services/api/categoriesApi';
import {
  COLOR_PALETTE,
  emptyCategoryForm,
  type CategoryFilterType,
  type CategoryViewMode,
} from '../constants/categoryConstants';

export function useCategoriesManager() {
  const queryClient = useQueryClient();

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

  // إضافة عائلة جديدة
  const createMutation = useMutation({
    mutationFn: (body: CategoryWrite) => categoriesApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setForm(emptyCategoryForm);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  // تعديل بيانات عائلة
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryWrite }) =>
      categoriesApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyCategoryForm);
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  // حذف عائلة
  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteConfirmCat(null);
    },
    onError: (err: Error) => {
      alert(err.message);
      setDeleteConfirmCat(null);
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
    if (!form.name.trim()) {
      setFormError('اسم الفئة مطلوب');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: form });
    } else {
      createMutation.mutate(form);
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
