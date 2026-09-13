import React, { useState, useCallback } from 'react';
import type { FavoriteCategory } from '../types';
import { useFavoritesStore } from '../store/useFavoritesStore';

export function useCategoryFormModal() {
  const { addCategory, updateCategory, deleteCategory } = useFavoritesStore();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FavoriteCategory | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [catIconInput, setCatIconInput] = useState('Star');
  const [catColorInput, setCatColorInput] = useState('#2563eb');

  const handleOpenNewCategory = useCallback(() => {
    setEditingCategory(null);
    setCatNameInput('');
    setCatIconInput('Star');
    setCatColorInput('#2563eb');
    setShowCategoryModal(true);
  }, []);

  const handleOpenEditCategory = useCallback((cat: FavoriteCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setCatNameInput(cat.name);
    setCatIconInput(cat.icon || 'Star');
    setCatColorInput(cat.color || '#2563eb');
    setShowCategoryModal(true);
  }, []);

  const handleSaveCategory = useCallback(
    (e: React.FormEvent, onCreated?: (catId: string) => void) => {
      e.preventDefault();
      if (!catNameInput.trim()) return;

      if (editingCategory) {
        updateCategory(editingCategory.id, {
          name: catNameInput.trim(),
          icon: catIconInput,
          color: catColorInput,
        });
      } else {
        const newCat = addCategory({
          name: catNameInput.trim(),
          icon: catIconInput,
          color: catColorInput,
        });
        if (onCreated) {
          onCreated(newCat.id);
        }
      }
      setShowCategoryModal(false);
    },
    [catNameInput, catIconInput, catColorInput, editingCategory, addCategory, updateCategory]
  );

  const handleDeleteCategory = useCallback(
    (catId: string, e: React.MouseEvent, onDeleted?: (id: string) => void) => {
      e.stopPropagation();
      if (confirm('هل أنت متأكد من رغبتك في حذف هذا التصنيف وجميع العناصر المخصصة له؟')) {
        deleteCategory(catId);
        if (onDeleted) {
          onDeleted(catId);
        }
      }
    },
    [deleteCategory]
  );

  return {
    showCategoryModal,
    setShowCategoryModal,
    editingCategory,
    catNameInput,
    setCatNameInput,
    catIconInput,
    setCatIconInput,
    catColorInput,
    setCatColorInput,
    handleOpenNewCategory,
    handleOpenEditCategory,
    handleSaveCategory,
    handleDeleteCategory,
  };
}
