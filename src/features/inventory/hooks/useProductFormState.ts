import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import { db } from '@/infrastructure/database/dexie/db';
import { categoriesApi, type Category } from '@/services/api/categoriesApi';

export const emptyProduct: Omit<Product, 'id'> = {
  name: '',
  barcode: '',
  sku: '',
  category: '',
  unit: 'قطعة',
  costPrice: 0,
  wholesalePrice: 0,
  retailPrice: 0,
  wholesaleMinQty: 0,
  quantity: 0,
  lowStockThreshold: 5,
  reorderPoint: 10,
  maxStock: 100,
  variant: '',
  expiryDate: '',
  batchNumber: '',
  highlighted: false,
  status: 'active',
  image: '',
};

export const commonUnits = ['قطعة', 'كرتونة', 'علبة', 'كيلو', 'لتر', 'متر', 'حزمة', 'دزينة'];

export interface FormErrors {
  name?: string;
  retailPrice?: string;
  barcode?: string;
  quantity?: string;
}

interface UseProductFormStateProps {
  products: Product[];
  categories: Category[];
  queryClient: QueryClient;
  onAdd: (data: Omit<Product, 'id'>) => Promise<any> | void;
  onUpdate: (payload: { id: string; data: Partial<Product> }) => Promise<any> | void;
}

export function useProductFormState({
  products,
  categories,
  queryClient,
  onAdd,
  onUpdate,
}: UseProductFormStateProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [barcodeDuplicate, setBarcodeDuplicate] = useState<string | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [activeFormSection, setActiveFormSection] = useState<string>('basic');
  const [barcodeScanMode, setBarcodeScanMode] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Profit margin calculation in form
  const profitMargin = useMemo(() => {
    if (formData.costPrice <= 0 || formData.retailPrice <= 0) return null;
    return ((formData.retailPrice - formData.costPrice) / formData.costPrice) * 100;
  }, [formData.costPrice, formData.retailPrice]);

  // Barcode duplicate detection
  useEffect(() => {
    if (!formData.barcode || formData.barcode.length < 3) {
      setBarcodeDuplicate(null);
      return;
    }
    const existing = products.find(
      (p) => p.barcode === formData.barcode && p.id !== editingProduct?.id
    );
    if (existing) {
      setBarcodeDuplicate(existing.name);
    } else {
      setBarcodeDuplicate(null);
    }
  }, [formData.barcode, products, editingProduct]);

  const closeFormModal = useCallback(() => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData(emptyProduct);
    setFormErrors({});
    setBarcodeDuplicate(null);
    setIsSubmitted(false);
    setTouchedFields({});
    setActiveFormSection('basic');
    setBarcodeScanMode(false);
  }, []);

  const openCreateForm = useCallback(() => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setFormErrors({});
    setBarcodeDuplicate(null);
    setIsSubmitted(false);
    setTouchedFields({});
    setActiveFormSection('basic');
    setBarcodeScanMode(false);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      costPrice: product.costPrice,
      wholesalePrice: product.wholesalePrice,
      retailPrice: product.retailPrice,
      wholesaleMinQty: product.wholesaleMinQty,
      quantity: product.quantity,
      lowStockThreshold: product.lowStockThreshold,
      reorderPoint: product.reorderPoint,
      maxStock: product.maxStock,
      variant: product.variant,
      expiryDate: product.expiryDate,
      batchNumber: product.batchNumber,
      highlighted: product.highlighted,
      status: product.status,
      image: product.image,
    });
    setFormErrors({});
    setBarcodeDuplicate(null);
    setIsSubmitted(false);
    setTouchedFields({});
    setActiveFormSection('basic');
    setBarcodeScanMode(false);
    setShowForm(true);
  }, []);

  // Form validation
  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.name?.trim()) errors.name = 'اسم المنتج مطلوب';
    if (!formData.retailPrice || Number(formData.retailPrice) <= 0) {
      errors.retailPrice = 'سعر البيع يجب أن يكون أكبر من 0';
    }
    if (barcodeDuplicate) errors.barcode = `الباركود مستخدم بالفعل في: ${barcodeDuplicate}`;
    return errors;
  }, [formData.name, formData.retailPrice, barcodeDuplicate]);

  // Update errors if already submitted
  useEffect(() => {
    if (isSubmitted) {
      setFormErrors(validateForm());
    }
  }, [formData.name, formData.retailPrice, barcodeDuplicate, isSubmitted, validateForm]);

  const handleSubmit = useCallback(() => {
    setIsSubmitted(true);
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.name || errors.barcode) {
        setActiveFormSection('basic');
      } else if (errors.retailPrice) {
        setActiveFormSection('pricing');
      }
      return;
    }

    if (editingProduct) {
      onUpdate({ id: editingProduct.id, data: formData });
    } else {
      onAdd(formData);
    }
    closeFormModal();
  }, [validateForm, editingProduct, onUpdate, onAdd, formData, closeFormModal]);

  const handleAddNewCategory = useCallback(async () => {
    const trimmed = newCategory.trim();
    if (trimmed) {
      try {
        const created = await categoriesApi.create({
          name: trimmed,
          description: '',
          icon: 'ShoppingBag',
          color: '#3B82F6',
        });
        await queryClient.invalidateQueries({ queryKey: ['categories'] });
        setFormData((prev) => ({ ...prev, category: trimmed, categoryId: created?.id }));
      } catch (err) {
        console.warn('Failed to create category via categoriesApi, trying direct db:', err);
        const newId = generateId();
        try {
          await db.categories.add({
            id: newId,
            name: trimmed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          await queryClient.invalidateQueries({ queryKey: ['categories'] });
          setFormData((prev) => ({ ...prev, category: trimmed, categoryId: newId }));
        } catch {
          /* ignore if exists */
        }
      }
      setNewCategory('');
      setShowNewCategory(false);
    }
  }, [newCategory, queryClient]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFormModal();
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, closeFormModal, handleSubmit]);

  return {
    showForm,
    setShowForm,
    editingProduct,
    setEditingProduct,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    isSubmitted,
    setIsSubmitted,
    touchedFields,
    setTouchedFields,
    barcodeDuplicate,
    setBarcodeDuplicate,
    showNewCategory,
    setShowNewCategory,
    newCategory,
    setNewCategory,
    activeFormSection,
    setActiveFormSection,
    barcodeScanMode,
    setBarcodeScanMode,
    barcodeInputRef,
    profitMargin,
    closeFormModal,
    openCreateForm,
    openEditForm,
    validateForm,
    handleSubmit,
    handleAddNewCategory,
  };
}
