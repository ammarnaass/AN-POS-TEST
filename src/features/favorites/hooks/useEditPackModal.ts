import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FavoriteItem } from '../types';
import type { Product } from '@/types';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { savePackDualPersistence } from '../services/favoritePackService';

interface UseEditPackModalParams {
  products: Product[];
  packs: PackEntity[];
}

export function useEditPackModal({ products, packs }: UseEditPackModalParams) {
  const queryClient = useQueryClient();
  const { updateItem } = useFavoritesStore();

  const [showEditPackModal, setShowEditPackModal] = useState(false);
  const [editingPackItem, setEditingPackItem] = useState<FavoriteItem | null>(null);
  const [epName, setEpName] = useState('');
  const [epPrice, setEpPrice] = useState('');
  const [epPiecesCount, setEpPiecesCount] = useState<number>(1);
  const [epUnitName, setEpUnitName] = useState('كرتونة');
  const [epBarcode, setEpBarcode] = useState('');
  const [epTargetCatId, setEpTargetCatId] = useState('');
  const [epIsSaving, setEpIsSaving] = useState(false);
  const [epError, setEpError] = useState('');

  const handleOpenEditPackModal = useCallback((item: FavoriteItem) => {
    setEditingPackItem(item);
    setEpName(item.name);
    setEpPrice(String(item.price || 0));
    setEpPiecesCount(Number(item.packQty || 1));
    setEpUnitName(item.packUnit || 'كرتونة');
    setEpBarcode(item.barcode || '');
    setEpTargetCatId(item.categoryId);
    setEpError('');
    setShowEditPackModal(true);
  }, []);

  const epParentProduct = useMemo(() => {
    if (!editingPackItem) return null;
    if (editingPackItem.parentProductId) {
      return products.find((p) => p.id === editingPackItem.parentProductId) || null;
    }
    const foundPack = packs.find(
      (p) =>
        String(p.id) === String(editingPackItem.itemId) ||
        String(p.id) === String(editingPackItem.id)
    );
    if (foundPack && Array.isArray(foundPack.items) && foundPack.items[0]?.productId) {
      return products.find((p) => p.id === foundPack.items[0].productId) || null;
    }
    return null;
  }, [editingPackItem, products, packs]);

  const handleSaveEditedPack = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPackItem) return;

      const finalName = epName.trim();
      if (!finalName) {
        setEpError('يرجى إدخال اسم للعبوة أو الكرتونة');
        return;
      }
      const priceNum = Number(epPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        setEpError('يرجى إدخال سعر بيع صحيح للعبوة');
        return;
      }
      const pieces = Math.max(1, Number(epPiecesCount || 1));
      const targetCat = epTargetCatId || editingPackItem.categoryId;
      if (!targetCat) {
        setEpError('يرجى اختيار تصنيف المفضلة');
        return;
      }

      setEpIsSaving(true);
      setEpError('');

      try {
        const now = new Date().toISOString();
        const finalBarcode = epBarcode.trim() || undefined;
        const finalUnit = epUnitName.trim() || 'كرتونة';

        // 1. Update in Favorites Store
        updateItem(editingPackItem.id, {
          name: finalName,
          price: priceNum,
          packQty: pieces,
          packUnit: finalUnit,
          barcode: finalBarcode,
          categoryId: targetCat,
        });

        // 2. Update PackEntity in SQLite & Dexie if exists
        const targetPackId = editingPackItem.itemId || editingPackItem.id;
        const existingPack = packs.find(
          (p) =>
            String(p.id) === String(targetPackId) || String(p.id) === String(editingPackItem.id)
        );

        if (existingPack) {
          const updatedPackData: PackEntity = {
            ...existingPack,
            name: finalName,
            barcode: finalBarcode || '',
            packPrice: priceNum,
            pack_price: priceNum,
            unitName: finalUnit,
            piecesCount: pieces,
            items:
              Array.isArray(existingPack.items) && existingPack.items.length > 0
                ? existingPack.items.map((it, idx) => (idx === 0 ? { ...it, qty: pieces } : it))
                : existingPack.items,
            updatedAt: now,
          };

          await savePackDualPersistence(updatedPackData, true);
          queryClient.invalidateQueries({ queryKey: ['packs'] });
        }

        setShowEditPackModal(false);
        setEditingPackItem(null);
      } catch (err: any) {
        setEpError(err?.message || 'حدث خطأ أثناء حفظ التعديلات');
      } finally {
        setEpIsSaving(false);
      }
    },
    [
      editingPackItem,
      epName,
      epPrice,
      epPiecesCount,
      epUnitName,
      epBarcode,
      epTargetCatId,
      packs,
      updateItem,
      queryClient,
    ]
  );

  return {
    showEditPackModal,
    setShowEditPackModal,
    editingPackItem,
    setEditingPackItem,
    epName,
    setEpName,
    epPrice,
    setEpPrice,
    epPiecesCount,
    setEpPiecesCount,
    epUnitName,
    setEpUnitName,
    epBarcode,
    setEpBarcode,
    epTargetCatId,
    setEpTargetCatId,
    epIsSaving,
    epError,
    epParentProduct,
    handleOpenEditPackModal,
    handleSaveEditedPack,
  };
}
