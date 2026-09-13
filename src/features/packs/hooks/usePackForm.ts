import { useState, useMemo } from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { generatePackBarcode } from '../services/packBarcodeService';
import { calculatePackFinancials } from '../services/packCalculations';
import type { PackType, PackItemSelection } from '../types';

export function usePackForm(products: Product[]) {
  const [showModal, setShowModal] = useState(false);
  const [editingPack, setEditingPack] = useState<PackEntity | null>(null);

  const [packName, setPackName] = useState('');
  const [packBarcode, setPackBarcode] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [packType, setPackType] = useState<PackType>('wholesale');
  const [unitName, setUnitName] = useState('كرتونة');
  const [minWholesaleQty, setMinWholesaleQty] = useState('1');
  const [selectedItems, setSelectedItems] = useState<PackItemSelection[]>([]);
  const [modalError, setModalError] = useState('');

  // فتح نافذة إنشاء عبوة جديدة
  const handleOpenCreate = () => {
    setEditingPack(null);
    setPackName('');
    setPackBarcode(generatePackBarcode());
    setPackPrice('');
    setPackType('wholesale');
    setUnitName('كرتونة');
    setMinWholesaleQty('1');
    setSelectedItems([]);
    setModalError('');
    setShowModal(true);
  };

  // فتح نافذة تعديل عبوة قائمة
  const handleOpenEdit = (pack: PackEntity) => {
    setEditingPack(pack);
    setPackName(pack.name || '');
    setPackBarcode(pack.barcode || '');
    setPackPrice(String(pack.packPrice ?? pack.pack_price ?? ''));
    setPackType(pack.packType || 'wholesale');
    setUnitName(pack.unitName || 'كرتونة');
    setMinWholesaleQty(String(pack.minWholesaleQty || 1));

    // تفكيك بنود العبوة
    let rawItems: any[] = [];
    if (typeof pack.items === 'string') {
      try {
        rawItems = JSON.parse(pack.items);
      } catch {
        rawItems = [];
      }
    } else if (Array.isArray(pack.items)) {
      rawItems = pack.items;
    }

    const resolvedItems: PackItemSelection[] = rawItems.map((it: any) => {
      const p = products.find((prod) => prod.id === it.productId);
      return {
        productId: it.productId,
        name: it.name || p?.name || 'منتج غير معروف',
        qty: Number(it.qty || 1),
        costPrice: p?.costPrice ?? 0,
        retailPrice: p?.retailPrice ?? 0,
      };
    });

    setSelectedItems(resolvedItems);
    setModalError('');
    setShowModal(true);
  };

  // إغلاق النافذة
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPack(null);
    setModalError('');
  };

  // إضافة منتج للعبوة (مع زيادة الكمية لو كان موجوداً مسبقاً)
  const handleAddProductToPack = (product: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          costPrice: product.costPrice ?? 0,
          retailPrice: product.retailPrice ?? 0,
        },
      ];
    });
  };

  // تحديث كمية منتج في العبوة
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, qty: newQty } : it))
    );
  };

  // حذف منتج من العبوة
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // توليد باركود جديد للعبوة
  const handleGenerateBarcode = () => {
    setPackBarcode(generatePackBarcode());
  };

  // الحسابات المالية اللحظية للعبوة
  const packCalculations = useMemo(() => {
    return calculatePackFinancials(selectedItems, packPrice, products);
  }, [selectedItems, packPrice, products]);

  return {
    showModal,
    setShowModal,
    editingPack,
    packName,
    setPackName,
    packBarcode,
    setPackBarcode,
    packPrice,
    setPackPrice,
    packType,
    setPackType,
    unitName,
    setUnitName,
    minWholesaleQty,
    setMinWholesaleQty,
    selectedItems,
    modalError,
    setModalError,
    packCalculations,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleAddProductToPack,
    handleUpdateItemQty,
    handleRemoveItem,
    handleGenerateBarcode,
  };
}
