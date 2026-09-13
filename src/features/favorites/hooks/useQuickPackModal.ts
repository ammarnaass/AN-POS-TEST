import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import { useFavoritesStore } from '../store/useFavoritesStore';
import {
  calculateQuickPackPrice,
  generateQuickPackName,
  buildQuickPackEntity,
  savePackDualPersistence,
} from '../services/favoritePackService';

export function useQuickPackModal() {
  const queryClient = useQueryClient();
  const { categories, addItemToCategory } = useFavoritesStore();

  const [showQuickPackModal, setShowQuickPackModal] = useState(false);
  const [qpSelectedProduct, setQpSelectedProduct] = useState<Product | null>(null);
  const [qpPiecesCount, setQpPiecesCount] = useState<number>(6);
  const [qpUnitName, setQpUnitName] = useState<string>('كرتونة');
  const [qpPackName, setQpPackName] = useState<string>('');
  const [qpPackPrice, setQpPackPrice] = useState<string>('');
  const [qpBarcode, setQpBarcode] = useState<string>('');
  const [qpTargetCatId, setQpTargetCatId] = useState<string>('');
  const [qpSearchQuery, setQpSearchQuery] = useState<string>('');
  const [qpIsCustomPrice, setQpIsCustomPrice] = useState<boolean>(false);
  const [qpIsSaving, setQpIsSaving] = useState<boolean>(false);
  const [qpError, setQpError] = useState<string>('');

  const handleSelectBaseProduct = useCallback(
    (prod: Product) => {
      setQpSelectedProduct(prod);
      const basePrice = Number(prod.retailPrice || (prod as any).price || 0);
      const pieces = qpPiecesCount || 6;
      const unit = qpUnitName || 'كرتونة';
      setQpPackName(generateQuickPackName(unit, prod.name, pieces));
      setQpPackPrice(String(calculateQuickPackPrice(basePrice, pieces)));
      setQpIsCustomPrice(false);
      setQpError('');
    },
    [qpPiecesCount, qpUnitName]
  );

  const handleChangePiecesCount = useCallback(
    (count: number) => {
      const validCount = Math.max(1, count);
      setQpPiecesCount(validCount);
      if (qpSelectedProduct) {
        const basePrice = Number(
          qpSelectedProduct.retailPrice || (qpSelectedProduct as any).price || 0
        );
        const unit = qpUnitName || 'كرتونة';
        setQpPackName(generateQuickPackName(unit, qpSelectedProduct.name, validCount));
        if (!qpIsCustomPrice) {
          setQpPackPrice(String(calculateQuickPackPrice(basePrice, validCount)));
        }
      }
    },
    [qpSelectedProduct, qpUnitName, qpIsCustomPrice]
  );

  const handleChangeUnitName = useCallback(
    (unit: string) => {
      setQpUnitName(unit);
      if (qpSelectedProduct) {
        const pieces = qpPiecesCount || 6;
        setQpPackName(generateQuickPackName(unit, qpSelectedProduct.name, pieces));
      }
    },
    [qpSelectedProduct, qpPiecesCount]
  );

  const handleOpenQuickPackModal = useCallback(
    (preselectedProduct?: Product, defaultCatId?: string) => {
      const targetCat = defaultCatId || categories[0]?.id || '';
      setQpTargetCatId(targetCat);
      setQpPiecesCount(6);
      setQpUnitName('كرتونة');
      setQpBarcode('');
      setQpError('');
      setQpSearchQuery('');
      setQpIsCustomPrice(false);

      if (preselectedProduct) {
        handleSelectBaseProduct(preselectedProduct);
      } else {
        setQpSelectedProduct(null);
        setQpPackName('');
        setQpPackPrice('');
      }

      setShowQuickPackModal(true);
    },
    [categories, handleSelectBaseProduct]
  );

  const handleSaveQuickPack = useCallback(
    async (e: React.FormEvent, onSuccess?: (catId: string) => void) => {
      e.preventDefault();
      if (!qpSelectedProduct) {
        setQpError('يرجى اختيار منتج التجزئة الأساسي');
        return;
      }
      const catId = qpTargetCatId || categories[0]?.id;
      if (!catId) {
        setQpError('يرجى إنشاء تصنيف مفضلة أولاً');
        return;
      }
      if (qpPiecesCount <= 0) {
        setQpError('عدد القطع يجب أن يكون 1 أو أكثر');
        return;
      }
      const priceNum = Number(qpPackPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        setQpError('يرجى إدخال سعر بيع صحيح للعبوة');
        return;
      }

      setQpIsSaving(true);
      setQpError('');

      try {
        const newPackId = generateId();
        const finalName =
          qpPackName.trim() ||
          generateQuickPackName(qpUnitName, qpSelectedProduct.name, qpPiecesCount);
        const finalBarcode = qpBarcode.trim();

        const newPackData = buildQuickPackEntity({
          id: newPackId,
          name: finalName,
          barcode: finalBarcode,
          packPrice: priceNum,
          unitName: qpUnitName.trim() || 'كرتونة',
          piecesCount: qpPiecesCount,
          productId: qpSelectedProduct.id,
          productName: qpSelectedProduct.name,
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
          packQty: qpPiecesCount,
          packUnit: qpUnitName.trim() || 'كرتونة',
          parentProductId: qpSelectedProduct.id,
        });

        // 3. Invalidate React-Query packs cache
        queryClient.invalidateQueries({ queryKey: ['packs'] });

        setShowQuickPackModal(false);
        if (onSuccess) {
          onSuccess(catId);
        }
      } catch (err: any) {
        setQpError(err?.message || 'حدث خطأ أثناء حفظ العبوة');
      } finally {
        setQpIsSaving(false);
      }
    },
    [
      qpSelectedProduct,
      qpTargetCatId,
      qpPiecesCount,
      qpPackPrice,
      qpPackName,
      qpUnitName,
      qpBarcode,
      categories,
      addItemToCategory,
      queryClient,
    ]
  );

  return {
    showQuickPackModal,
    setShowQuickPackModal,
    qpSelectedProduct,
    setQpSelectedProduct,
    qpPiecesCount,
    qpUnitName,
    qpPackName,
    setQpPackName,
    qpPackPrice,
    setQpPackPrice,
    qpBarcode,
    setQpBarcode,
    qpTargetCatId,
    setQpTargetCatId,
    qpSearchQuery,
    setQpSearchQuery,
    qpIsCustomPrice,
    setQpIsCustomPrice,
    qpIsSaving,
    qpError,
    handleSelectBaseProduct,
    handleChangePiecesCount,
    handleChangeUnitName,
    handleOpenQuickPackModal,
    handleSaveQuickPack,
  };
}
