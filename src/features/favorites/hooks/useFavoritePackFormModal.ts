import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/types';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { FavoriteCategory, FavoriteItem, FavoritePackType } from '../types';
import { generateId } from '@/utils';
import { useFavoritesStore } from '../store/useFavoritesStore';
import {
  calculateQuickPackPrice,
  generateQuickPackName,
  buildQuickPackEntity,
  buildUpdatedPackEntity,
  savePackDualPersistence,
} from '../services/favoritePackService';

interface UseFavoritePackFormModalParams {
  products: Product[];
  packs: PackEntity[];
  categories: FavoriteCategory[];
}

export function useFavoritePackFormModal({
  products,
  packs,
  categories,
}: UseFavoritePackFormModalParams) {
  const queryClient = useQueryClient();
  const { addItemToCategory, updateItem } = useFavoritesStore();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<FavoriteItem | null>(null);

  // Form Fields
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [piecesCount, setPiecesCount] = useState<number>(6);
  const [unitName, setUnitName] = useState<string>('كرتونة');
  const [packName, setPackName] = useState<string>('');
  const [packPrice, setPackPrice] = useState<string>('');
  const [isCustomPrice, setIsCustomPrice] = useState<boolean>(false);
  const [barcode, setBarcode] = useState<string>('');
  const [targetCatId, setTargetCatId] = useState<string>('');
  const [packType, setPackType] = useState<FavoritePackType>('bundle');
  const [minWholesaleQty, setMinWholesaleQty] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 1. اختيار وتغيير المنتج الأساسي
  const selectBaseProduct = useCallback(
    (prod: Product) => {
      setSelectedProduct(prod);
      const basePrice = Number(prod.retailPrice || (prod as any).price || 0);
      const pieces = piecesCount || 6;
      const unit = unitName || 'كرتونة';

      // اقتراح الاسم والسعر إذا لم يتم تخصيصهما
      if (mode === 'create' || !packName.trim()) {
        setPackName(generateQuickPackName(unit, prod.name, pieces));
      }
      if (mode === 'create' || !isCustomPrice) {
        setPackPrice(String(calculateQuickPackPrice(basePrice, pieces)));
        setIsCustomPrice(false);
      }
      setError('');
    },
    [mode, packName, isCustomPrice, piecesCount, unitName]
  );

  // 2. تغيير عدد القطع
  const changePiecesCount = useCallback(
    (count: number) => {
      const validCount = Math.max(1, count);
      setPiecesCount(validCount);

      if (selectedProduct) {
        const basePrice = Number(
          selectedProduct.retailPrice || (selectedProduct as any).price || 0
        );
        const unit = unitName || 'كرتونة';

        if (!packName.trim() || mode === 'create') {
          setPackName(generateQuickPackName(unit, selectedProduct.name, validCount));
        }
        if (!isCustomPrice) {
          setPackPrice(String(calculateQuickPackPrice(basePrice, validCount)));
        }
      }
    },
    [selectedProduct, unitName, packName, mode, isCustomPrice]
  );

  // 3. تغيير اسم وحدة التعبئة
  const changeUnitName = useCallback(
    (unit: string) => {
      setUnitName(unit);
      if (selectedProduct && (!packName.trim() || mode === 'create')) {
        const pieces = piecesCount || 6;
        setPackName(generateQuickPackName(unit, selectedProduct.name, pieces));
      }
    },
    [selectedProduct, packName, mode, piecesCount]
  );

  // 4. توليد الاسم تلقائياً بنقرة زر
  const autoGeneratePackName = useCallback(() => {
    if (selectedProduct) {
      const unit = unitName || 'كرتونة';
      const pieces = piecesCount || 1;
      setPackName(generateQuickPackName(unit, selectedProduct.name, pieces));
    }
  }, [selectedProduct, unitName, piecesCount]);

  // 5. حساب السعر التلقائي بنقرة زر
  const autoCalculatePackPrice = useCallback(() => {
    if (selectedProduct) {
      const basePrice = Number(
        selectedProduct.retailPrice || (selectedProduct as any).price || 0
      );
      const calculated = calculateQuickPackPrice(basePrice, piecesCount || 1);
      setPackPrice(String(calculated));
      setIsCustomPrice(false);
    }
  }, [selectedProduct, piecesCount]);

  // 6. فتح نافذة الإضافة (Create Mode)
  const openCreateModal = useCallback(
    (preselectedProduct?: Product, defaultCatId?: string) => {
      setMode('create');
      setEditingItem(null);
      const targetCat = defaultCatId || categories[0]?.id || '';
      setTargetCatId(targetCat);
      setPiecesCount(6);
      setUnitName('كرتونة');
      setBarcode('');
      setError('');
      setSearchQuery('');
      setIsCustomPrice(false);
      setPackType('bundle');
      setMinWholesaleQty(1);

      if (preselectedProduct) {
        selectBaseProduct(preselectedProduct);
      } else {
        setSelectedProduct(null);
        setPackName('');
        setPackPrice('');
      }

      setIsOpen(true);
    },
    [categories, selectBaseProduct]
  );

  // 7. فتح نافذة التعديل (Edit Mode)
  const openEditModal = useCallback(
    (item: FavoriteItem) => {
      setMode('edit');
      setEditingItem(item);
      setPackName(item.name);
      setPackPrice(String(item.price || 0));
      setPiecesCount(Number(item.packQty || 1));
      setUnitName(item.packUnit || 'كرتونة');
      setBarcode(item.barcode || '');
      setTargetCatId(item.categoryId);
      setError('');
      setSearchQuery('');
      setIsCustomPrice(true);

      // استرجاع المنتج الأساسي المرتبط
      let foundParentProduct: Product | null = null;
      if (item.parentProductId) {
        foundParentProduct = products.find((p) => p.id === item.parentProductId) || null;
      }

      // البحث في كيان العبوة بمخزن Dexie
      const foundPack = packs.find(
        (p) =>
          String(p.id) === String(item.itemId) ||
          String(p.id) === String(item.id)
      );

      if (foundPack) {
        setPackType((foundPack.packType as FavoritePackType) || 'bundle');
        setMinWholesaleQty(foundPack.minWholesaleQty || 1);
        if (!foundParentProduct && Array.isArray(foundPack.items) && foundPack.items[0]?.productId) {
          foundParentProduct = products.find((p) => p.id === foundPack.items[0].productId) || null;
        }
      } else {
        setPackType('bundle');
        setMinWholesaleQty(1);
      }

      setSelectedProduct(foundParentProduct);
      setIsOpen(true);
    },
    [products, packs]
  );

  // 8. إغلاق النافذة
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setEditingItem(null);
  }, []);

  // 9. تقديم النموذج والحفظ المزدوج والتزامن التام
  const handleSubmit = useCallback(
    async (e: React.FormEvent, onSuccess?: (catId: string) => void) => {
      e.preventDefault();

      if (!selectedProduct) {
        setError('يرجى اختيار منتج التجزئة الأساسي للعبوة');
        return;
      }

      const catId = targetCatId || categories[0]?.id;
      if (!catId) {
        setError('يرجى إنشاء تصنيف مفضلة أولاً');
        return;
      }

      if (piecesCount <= 0) {
        setError('عدد القطع يجب أن يكون 1 أو أكثر');
        return;
      }

      const priceNum = Number(packPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        setError('يرجى إدخال سعر بيع صحيح للعبوة');
        return;
      }

      setIsSaving(true);
      setError('');

      try {
        const finalName =
          packName.trim() ||
          generateQuickPackName(unitName, selectedProduct.name, piecesCount);
        const finalBarcode = barcode.trim();
        const finalUnit = unitName.trim() || 'كرتونة';

        if (mode === 'create') {
          // ==== حالة إنشاء عبوة جديدة ====
          const newPackId = generateId();

          const newPackData = buildQuickPackEntity({
            id: newPackId,
            name: finalName,
            barcode: finalBarcode,
            packPrice: priceNum,
            unitName: finalUnit,
            piecesCount,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            packType,
            minWholesaleQty: Math.max(1, minWholesaleQty),
          });

          // 1. Dual persistence in SQLite / Dexie
          await savePackDualPersistence(newPackData, false);

          // 2. Add directly to Favorite Category
          addItemToCategory({
            categoryId: catId,
            type: 'pack',
            itemId: newPackId,
            name: finalName,
            barcode: finalBarcode || undefined,
            price: priceNum,
            packQty: piecesCount,
            packUnit: finalUnit,
            parentProductId: selectedProduct.id,
          });
        } else if (editingItem) {
          // ==== حالة تعديل عبوة سابقة مع مزامنة المنتج والبنود كاملة ====
          // 1. Update in Favorites Store (بما في ذلك parentProductId المتزامن)
          updateItem(editingItem.id, {
            name: finalName,
            price: priceNum,
            packQty: piecesCount,
            packUnit: finalUnit,
            barcode: finalBarcode || undefined,
            categoryId: catId,
            parentProductId: selectedProduct.id,
          });

          // 2. Update PackEntity in SQLite & Dexie
          const targetPackId = editingItem.itemId || editingItem.id;
          const existingPack = packs.find(
            (p) =>
              String(p.id) === String(targetPackId) ||
              String(p.id) === String(editingItem.id)
          );

          if (existingPack) {
            const updatedPackData = buildUpdatedPackEntity(existingPack, {
              id: existingPack.id,
              name: finalName,
              barcode: finalBarcode,
              packPrice: priceNum,
              unitName: finalUnit,
              piecesCount,
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              packType,
              minWholesaleQty: Math.max(1, minWholesaleQty),
            });

            await savePackDualPersistence(updatedPackData, true);
          } else {
            // إذا لم تكن موجودة مسبقاً في Dexie، يتم إنشاؤها لضمان التكامل
            const newPackData = buildQuickPackEntity({
              id: targetPackId,
              name: finalName,
              barcode: finalBarcode,
              packPrice: priceNum,
              unitName: finalUnit,
              piecesCount,
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              packType,
              minWholesaleQty: Math.max(1, minWholesaleQty),
            });
            await savePackDualPersistence(newPackData, false);
          }
        }

        // 3. Invalidate React-Query packs cache
        queryClient.invalidateQueries({ queryKey: ['packs'] });

        setIsOpen(false);
        setEditingItem(null);
        if (onSuccess) {
          onSuccess(catId);
        }
      } catch (err: any) {
        setError(err?.message || 'حدث خطأ أثناء حفظ العبوة');
      } finally {
        setIsSaving(false);
      }
    },
    [
      selectedProduct,
      targetCatId,
      categories,
      piecesCount,
      packPrice,
      packName,
      unitName,
      barcode,
      mode,
      packType,
      minWholesaleQty,
      editingItem,
      packs,
      addItemToCategory,
      updateItem,
      queryClient,
    ]
  );

  // تصفية نتائج البحث عن المنتجات الأساسية
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [products, searchQuery]);

  return {
    isOpen,
    mode,
    editingItem,
    selectedProduct,
    setSelectedProduct,
    piecesCount,
    unitName,
    packName,
    setPackName,
    packPrice,
    setPackPrice,
    isCustomPrice,
    setIsCustomPrice,
    barcode,
    setBarcode,
    targetCatId,
    setTargetCatId,
    packType,
    setPackType,
    minWholesaleQty,
    setMinWholesaleQty,
    searchQuery,
    setSearchQuery,
    isSaving,
    error,
    filteredProducts,
    selectBaseProduct,
    changePiecesCount,
    changeUnitName,
    autoGeneratePackName,
    autoCalculatePackPrice,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
  };
}
