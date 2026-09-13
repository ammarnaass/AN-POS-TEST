import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { checkBarcodeUnique } from '../services/packBarcodeService';
import type { PackType, PackItemSelection } from '../types';

export interface SavePackInput {
  editingPack: PackEntity | null;
  packName: string;
  packBarcode: string;
  packPrice: string;
  packType: PackType;
  unitName: string;
  minWholesaleQty: string;
  selectedItems: PackItemSelection[];
}

interface UsePackMutationsProps {
  onSaveSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function usePackMutations({ onSaveSuccess, onDeleteSuccess }: UsePackMutationsProps = {}) {
  const queryClient = useQueryClient();

  // 1. طفرة حفظ العبوة (إنشاء أو تعديل)
  const saveMutation = useMutation({
    mutationFn: async (input: SavePackInput) => {
      const {
        editingPack,
        packName,
        packBarcode,
        packPrice,
        packType,
        unitName,
        minWholesaleQty,
        selectedItems,
      } = input;

      if (!packName.trim()) {
        throw new Error('يرجى إدخال اسم العبوة');
      }
      if (selectedItems.length === 0) {
        throw new Error('يجب اختيار منتج واحد على الأقل في العبوة');
      }
      const priceNum = parseFloat(packPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error('يرجى إدخال سعر بيع صحيح للعبوة أكبر من الصفر');
      }

      const cleanBarcode = packBarcode.trim();
      const isUnique = await checkBarcodeUnique(cleanBarcode, editingPack?.id);
      if (!isUnique) {
        throw new Error('هذا الباركود مستخدم مسبقاً لمنتج أو عبوة أخرى');
      }

      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      const now = new Date().toISOString();
      const itemsPayload = selectedItems.map((it) => ({
        productId: it.productId,
        name: it.name,
        qty: it.qty,
      }));
      const totalPieces = selectedItems.reduce((acc, it) => acc + (it.qty || 0), 0);
      const minQtyNum = parseInt(minWholesaleQty, 10) || 1;

      if (editingPack) {
        // وضع التعديل
        const patchData = {
          name: packName.trim(),
          barcode: cleanBarcode,
          packPrice: priceNum,
          pack_price: priceNum,
          packType,
          unitName: unitName.trim() || 'كرتونة',
          piecesCount: totalPieces,
          minWholesaleQty: minQtyNum,
          items: itemsPayload,
          status: editingPack.status || 'active',
          updatedAt: now,
        };

        if (api?.packs?.update) {
          await api.packs.update(editingPack.id, patchData);
        }
        await db.packs.update(editingPack.id, patchData as any);
        return { ...editingPack, ...patchData };
      } else {
        // وضع الإنشاء
        const newId = generateId();
        const newPackData = {
          id: newId,
          name: packName.trim(),
          barcode: cleanBarcode,
          packPrice: priceNum,
          pack_price: priceNum,
          packType,
          unitName: unitName.trim() || 'كرتونة',
          piecesCount: totalPieces,
          minWholesaleQty: minQtyNum,
          items: itemsPayload,
          status: 'active' as const,
          createdAt: now,
          updatedAt: now,
        };

        if (api?.packs?.create) {
          await api.packs.create(newPackData);
        }
        await db.packs.add(newPackData as any);
        return newPackData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs'] });
      if (onSaveSuccess) onSaveSuccess();
    },
  });

  // 2. طفرة حذف العبوة
  const deleteMutation = useMutation({
    mutationFn: async (packId: string) => {
      const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (api?.packs?.delete || api?.packs?.remove) {
        const fn = api.packs.delete ?? api.packs.remove;
        await fn(packId);
      }
      await db.packs.delete(packId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packs'] });
      if (onDeleteSuccess) onDeleteSuccess();
    },
  });

  return {
    saveMutation,
    deleteMutation,
  };
}
