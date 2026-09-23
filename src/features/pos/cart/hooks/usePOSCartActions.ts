import { useCallback, useRef } from 'react';
import type { CartItem, Product } from '@/types';
import { useCartStore } from '@/store/cartStore';
import { resolveUnitPrice } from '@/services';
import { parseAndAddScannedCode, playAdded, playErrorBeep, unlockAudio } from '@/services/barcode';
import type { UsePOSCartActionsParams } from '../types';

export function usePOSCartActions({
  products,
  packs,
  promotions,
  isWholesaleActive,
  priceTier,
  posSettings,
  posLayout,
  addNotification,
  quickMode,
  scanInputRef,
  setSearchQuery,
}: UsePOSCartActionsParams) {
  const { addItem, updateQty, removeItem, clear: clearCart } = useCartStore();

  // ذاكرة حماية لمنع التكرار اللحظي للماسح الضوئي (350ms Deduplication Gate)
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  /**
   * إضافة منتج إلى السلة أو زيادة كميته مع التحقق الدقيق من الأرصدة
   */
  const handleAddProduct = useCallback(
    (product: any, customPrice?: number, explicitQty: number = 1) => {
      if (!product) return;

      const currentCart = useCartStore.getState().items;
      const targetQtyToAdd = explicitQty > 0 ? explicitQty : 1;
      const isPack = String(product.id).startsWith('pack-') || Boolean(product.isPack);

      if (isPack) {
        const packId = String(product.id).replace(/^pack-/, '');
        const pack = packs.find((p) => String(p.id) === String(packId));
        const packObj = pack || {
          id: packId,
          name: product.name,
          packPrice: customPrice ?? product.price ?? product.retailPrice ?? 0,
          piecesCount: product.packPiecesCount || 1,
          unitName: product.packUnit || 'عبوة',
          items: [],
        };
        const items = Array.isArray(packObj.items)
          ? packObj.items
          : (() => {
              try {
                return JSON.parse((packObj as any).items as any) ?? [];
              } catch {
                return [];
              }
            })();
        const firstComp = items[0];
        const pQty = Number(packObj.piecesCount || firstComp?.qty || firstComp?.quantity || 1);
        const effectivePackPrice =
          customPrice !== undefined && customPrice > 0
            ? customPrice
            : Number(packObj.packPrice ?? product.price ?? product.retailPrice ?? 0);

        const parentProd = firstComp?.productId
          ? products.find((p) => String(p.id) === String(firstComp.productId))
          : undefined;

        // فحص المخزون للباقات
        if (!posSettings.allowNegativeStock && !posSettings.accountingOnly && firstComp?.productId) {
          const availablePieces = parentProd ? Number(parentProd.quantity ?? 0) : 0;
          const availablePacks = pQty > 0 ? Math.floor(availablePieces / pQty) : 0;

          const existingCartPieces = currentCart.reduce((sum, it) => {
            if (String(it.productId) === String(firstComp.productId)) return sum + it.qty;
            if (it.isPack && (it.packId === packId || it.productId === `pack-${packId}`)) {
              return sum + it.qty * (it.packQty || pQty);
            }
            return sum;
          }, 0);

          if (existingCartPieces + pQty * targetQtyToAdd > availablePieces) {
            addNotification({
              title: 'تنبيه المخزون',
              type: 'warning',
              message: `المخزون غير كافٍ! المتاح من "${parentProd?.name || packObj.name}": ${availablePieces} قطعة (${availablePacks} عبوة).`,
            });
            return;
          }
        }

        const isTerminal =
          posLayout === 'terminal' || posLayout === 'advanced' || posLayout === 'design7';
        const isWholesaleTier =
          priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive);

        // فحص وجود الباقة مسبقاً في السلة
        const existing = currentCart.find(
          (item) =>
            String(item.productId) === `pack-${packId}` ||
            (item.isPack && String(item.packId) === String(packId))
        );

        if (existing) {
          const newQty = existing.qty + targetQtyToAdd;
          updateQty(existing.productId, newQty, existing.unitPrice);
        } else {
          // إضافة باقة جديدة
          addItem({
            productId: `pack-${packId}`,
            name: packObj.name,
            qty: targetQtyToAdd,
            unitPrice: effectivePackPrice,
            lineTotal: effectivePackPrice * targetQtyToAdd,
            barcode: packObj.barcode || product.barcode || parentProd?.barcode || '',
            isPack: true,
            packId: packId,
            packQty: targetQtyToAdd,
            packPiecesCount: pQty,
            packUnit: packObj.unitName || (isTerminal ? 'طرد' : 'عبوة'),
            packMode: isTerminal ? 'wholesale_packs' : undefined,
            pricingType: isWholesaleTier ? 'wholesale' : 'pack',
          });
        }
      } else {
        // منتج منفرد عادي
        const prodId = String(product.id);

        // فحص كفاية المخزون عند منع المخزون السالب
        if (!posSettings.allowNegativeStock && !posSettings.accountingOnly) {
          const availableQty = Number(product.quantity ?? 0);
          const existingCartQty = currentCart.reduce(
            (sum, it) => (String(it.productId) === prodId ? sum + it.qty : sum),
            0
          );
          if (availableQty <= 0 || existingCartQty + targetQtyToAdd > availableQty) {
            addNotification({
              title: 'تنبيه المخزون',
              type: 'warning',
              message: `المخزون غير كافٍ! المتاح من "${product.name}": ${availableQty} قطعة.`,
            });
            return;
          }
        }

        const existing = currentCart.find((item) => {
          if (String(item.productId) !== prodId) return false;
          if (customPrice !== undefined) {
            return Math.abs(item.unitPrice - customPrice) < 0.001;
          }
          return true;
        });

        if (existing) {
          const newQty = existing.qty + targetQtyToAdd;
          const resolvedPrice =
            customPrice !== undefined
              ? customPrice
              : existing.isCustom
              ? existing.unitPrice
              : resolveUnitPrice(product, newQty, promotions, isWholesaleActive, priceTier);
          updateQty(existing.productId, newQty, resolvedPrice);
        } else {
          const price =
            customPrice !== undefined
              ? customPrice
              : product.unitPrice ??
                resolveUnitPrice(product, targetQtyToAdd, promotions, isWholesaleActive, priceTier);

          const pkgSize = product.packageSize ? parseInt(String(product.packageSize), 10) : 0;
          const isPackProd = pkgSize > 1;
          const isWholesaleTier =
            priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive);

          addItem({
            productId: prodId,
            name: product.name,
            qty: targetQtyToAdd,
            unitPrice: price,
            lineTotal: price * targetQtyToAdd,
            barcode: product.barcode || '',
            unit: product.unit,
            batchNumber: product.batchNumber,
            isCustom: customPrice !== undefined,
            isPack: isPackProd,
            packQty: 1,
            packPiecesCount: isPackProd ? pkgSize : undefined,
            packUnit: isPackProd ? product.unit || 'طرد' : undefined,
            packMode: isPackProd ? (isWholesaleTier ? 'wholesale_packs' : 'retail_pieces') : undefined,
            pricingType: isWholesaleTier ? 'wholesale' : 'retail',
          });
        }
      }

      playAdded(0.05);
      if (setSearchQuery) setSearchQuery('');
      if (quickMode) {
        setTimeout(() => scanInputRef?.current?.focus(), 100);
      }
    },
    [
      addItem,
      updateQty,
      packs,
      products,
      promotions,
      isWholesaleActive,
      priceTier,
      posSettings,
      posLayout,
      addNotification,
      setSearchQuery,
      quickMode,
      scanInputRef,
    ]
  );

  /**
   * تحديث كمية صنف بالسلة (يقبل إما كائن CartItem أو معرف productId)
   */
  const handleUpdateQty = useCallback(
    (itemOrId: CartItem | string, newQty: number) => {
      const targetId = String(typeof itemOrId === 'string' ? itemOrId : itemOrId?.productId || '');
      if (!targetId) return;

      if (newQty < 1) {
        removeItem(targetId);
        return;
      }

      const currentCart = useCartStore.getState().items;
      const item = currentCart.find((c) => String(c.productId) === targetId);
      if (!item) return;

      if (item.isPack) {
        updateQty(targetId, newQty, item.unitPrice);
        return;
      }

      const product = products.find((p) => String(p.id) === targetId);
      if (product && !item.isCustom && priceTier === '1') {
        const finalPrice = resolveUnitPrice(product, newQty, promotions, isWholesaleActive, '1');
        updateQty(targetId, newQty, finalPrice);
      } else {
        updateQty(targetId, newQty, item.unitPrice);
      }
    },
    [removeItem, updateQty, products, promotions, isWholesaleActive, priceTier]
  );

  /**
   * حذف صنف من السلة
   */
  const handleRemoveItem = useCallback(
    (productId: string) => {
      removeItem(String(productId));
    },
    [removeItem]
  );

  /**
   * مسح السلة بالكامل
   */
  const handleClearCart = useCallback(() => {
    clearCart();
  }, [clearCart]);

  /**
   * معالج مسح الباركود الفوري مع حارس كبح التكرار اللحظي
   */
  const handleExternalScan = useCallback(
    async (code: string, scanQty: number = 1, extraData?: { fromMobile?: boolean; product?: any }) => {
      const trimmedCode = String(code ?? '').trim();
      if (!trimmedCode) return;

      // حارس كبح التكرار: تجاهل نفس الكود إذا تكرر خلال 350ms
      const now = Date.now();
      if (
        lastScanRef.current.code === trimmedCode &&
        now - lastScanRef.current.time < 350
      ) {
        return;
      }
      lastScanRef.current = { code: trimmedCode, time: now };

      unlockAudio();
      if (setSearchQuery) setSearchQuery('');

      const effectiveQty = Math.max(1, Number(scanQty) || 1);
      const result = await parseAndAddScannedCode(trimmedCode, {
        products: products as any[],
        packs: packs as any,
        promotions: promotions as any,
        addItem: (item) => {
          const matchingProduct = products.find((p) => String(p.id) === String(item.productId));
          if (matchingProduct) {
            handleAddProduct(matchingProduct, item.isCustom ? item.unitPrice : undefined, effectiveQty);
          } else {
            addItem(item);
          }
        },
        forceWholesale: priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive),
        priceTier,
        allowNegativeStock: posSettings.allowNegativeStock || posSettings.accountingOnly,
        posLayout,
        qty: effectiveQty,
      });

      if (result.added) {
        playAdded(0.08);
        if (extraData?.fromMobile) {
          addNotification({
            title: '📱 مسح عبر الهاتف',
            message: `تمت إضافة "${result.name || trimmedCode}" (${effectiveQty}×) مباشرة إلى السلة`,
            type: 'success',
          });
        }
        if (quickMode) {
          setTimeout(() => scanInputRef?.current?.focus(), 100);
        }
      } else {
        playErrorBeep();
        addNotification({
          title: extraData?.fromMobile ? '📱 مسح عبر الهاتف: غير موجود' : 'باركود غير معروف',
          message: `${result.message ?? 'لم يُعثر عليه'}: ${trimmedCode}`,
          type: 'error',
        });
      }
    },
    [
      products,
      packs,
      promotions,
      addItem,
      handleAddProduct,
      addNotification,
      quickMode,
      isWholesaleActive,
      priceTier,
      posSettings,
      posLayout,
      setSearchQuery,
      scanInputRef,
    ]
  );

  /**
   * تطبيق قراءة الميزان الإلكتروني على الصنف المحدد أو الصنف النشط بالسلة
   */
  const handleApplyWeight = useCallback(
    (weightInKg: number, targetProduct?: Product) => {
      if (weightInKg <= 0) return;

      const currentCart = useCartStore.getState().items;
      let product = targetProduct;

      if (!product && currentCart.length > 0) {
        const lastItem = currentCart[currentCart.length - 1];
        product = products.find((p) => String(p.id) === String(lastItem.productId));
      }

      if (!product) {
        addNotification({
          title: 'تنبيه الميزان',
          message: 'يرجى اختيار صنف أولاً لتطبيق الوزن المقروء عليه',
          type: 'warning',
        });
        return;
      }

      const unitPrice = resolveUnitPrice(product, 1, promotions, isWholesaleActive, priceTier);
      const roundedWeight = Math.round(weightInKg * 1000) / 1000;
      const lineTotal = Math.round(roundedWeight * unitPrice * 100) / 100;

      const prodId = String(product.id);
      const existing = currentCart.find((i) => String(i.productId) === prodId);

      if (existing) {
        updateQty(prodId, roundedWeight, unitPrice);
      } else {
        addItem({
          productId: prodId,
          name: product.name,
          qty: roundedWeight,
          unitPrice,
          lineTotal,
          barcode: product.barcode || '',
          unit: product.unit || 'كغ',
          isCustom: false,
          pricingType: priceTier === '3' ? 'wholesale' : 'retail',
        });
      }

      addNotification({
        title: '⚖️ تم قراءة الوزن بنجاح',
        message: `تم وزن "${product.name}": ${roundedWeight} كغ بمبلغ ${lineTotal} دج`,
        type: 'success',
      });
    },
    [products, promotions, isWholesaleActive, priceTier, updateQty, addItem, addNotification]
  );

  return {
    handleAddProduct,
    handleUpdateQty,
    handleRemoveItem,
    handleClearCart,
    handleExternalScan,
    handleApplyWeight,
  };
}
