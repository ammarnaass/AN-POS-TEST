import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { Product, CartItem, Sale, DocType } from '@/types';
import { calculateSaleTotal, resolveUnitPrice, getProductTierPrice } from '@/services';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { parseAndAddScannedCode, playAdded, playErrorBeep, unlockAudio } from '@/services/barcode';
import { useSaleCompletion } from './hooks/useSaleCompletion';
import { usePOSKeyboardShortcuts } from './hooks/usePOSKeyboardShortcuts';
import { useMobileScanner } from './hooks/useMobileScanner';
import { usePOSData } from './hooks/usePOSData';
import { usePOSCatalogFilter } from './hooks/usePOSCatalogFilter';
import { usePOSModalsState } from './hooks/usePOSModalsState';
import { POSTopBar } from './components/POSTopBar';
import { POSLayoutDispatcher } from './components/POSLayoutDispatcher';
import { POSModalsContainer } from './components/POSModalsContainer';
import { usePOSSessionStore } from './store/usePOSSessionStore';
import { getTrialState } from '@/services/trialService';
import { isLicensed } from '@/services/licenseService';
import { v4 as createId } from 'uuid';
import { db } from '@/infrastructure/database/dexie/db';

const formatMoney = (val: number | null | undefined, decimals = 2) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('ar-DZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatNumber = (val: number | null | undefined) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('ar-DZ');
};

export default function POSPage() {
  const navigate = useNavigate();
  const { items: cart, addItem, removeItem, updateQty, updatePrice, clear: clearCart } = useCartStore();
  const { user: currentUser } = useAuthStore();
  const trial = getTrialState(currentUser?.role);
  const { open: openSidebar } = useSidebarStore();
  const { theme, toggleTheme } = useThemeStore();
  const notifications = useNotificationStore((s) => s.notifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 1. Centralized Data Query Hook
  const {
    products,
    customers,
    suppliers,
    promotions,
    packs,
    dbCategories,
    purchases,
    purchaseItems,
    settings,
    sales,
    allSessions,
    currentSession,
    suspendedOrders,
    posSettings,
    refetchSuspended,
  } = usePOSData();

  // 2. POS Session Store
  const {
    selectedCustomer,
    setSelectedCustomer,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    paymentMethod,
    setPaymentMethod,
    paidAmount,
    setPaidAmount,
    returnMode,
    setReturnMode,
    selectedItemId,
    setSelectedItemId,
    quickMode,
    autoPrintReceipt,
    setAutoPrintReceipt,
    posLayout,
    setPosLayout,
    showProductImages,
    setShowProductImages,
    viewMode,
    setViewMode,
    uiZoom,
    setUiZoom,
    screenResolution,
    setScreenResolution,
    customResolution,
    setCustomResolution,
    resolutionScaleMode,
    setResolutionScaleMode,
    wholesaleMode,
    setWholesaleMode,
    toggleWholesaleMode,
  } = usePOSSessionStore();

  // 3. Centralized Modals State
  const modals = usePOSModalsState();

  // 4. Centralized Catalog Filtering & Packs Resolution Hook
  const {
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterSupplier,
    setFilterSupplier,
    filterStockStatus,
    setFilterStockStatus,
    isFeaturedOnly,
    setIsFeaturedOnly,
    currentPage,
    setCurrentPage,
    availableCategories,
    activeFiltersCount,
    handleClearAllFilters,
    filteredProducts,
    paginatedProducts,
    totalPages,
  } = usePOSCatalogFilter({
    products,
    packs,
    dbCategories,
    purchases,
    purchaseItems,
    onNotify: addNotification,
  });

  // Local UI & Editing States
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [barcodeHeaderInput, setBarcodeHeaderInput] = useState('');
  const [priceTier, setPriceTier] = useState<'1' | '2' | '3' | '4'>('1');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Auto-reset payment method to cash if currently selected method is disabled in settings
  useEffect(() => {
    if (paymentMethod === 'card' && !posSettings.allowCardPayment) {
      setPaymentMethod('cash');
    } else if (paymentMethod === 'transfer' && !posSettings.allowTransferPayment) {
      setPaymentMethod('cash');
    }
  }, [paymentMethod, posSettings.allowCardPayment, posSettings.allowTransferPayment, setPaymentMethod]);

  const handleSelectPriceTier = useCallback(
    (tier: '1' | '2' | '3' | '4') => {
      setPriceTier(tier);
      if (tier === '3') {
        if (!wholesaleMode) toggleWholesaleMode();
      } else {
        if (wholesaleMode) toggleWholesaleMode();
      }
      const productList = products || [];
      if (cart.length > 0) {
        cart.forEach((item) => {
          if (item.isPack) {
            if (posLayout === 'terminal') {
              const pieces = Number(item.packPiecesCount || item.packQty || 1);
              if (tier === '3' && item.packMode === 'retail_pieces') {
                const packCount = Math.max(1, Math.round(item.qty / pieces));
                const packPrice = (item.unitPrice || 0) * pieces;
                item.packMode = 'wholesale_packs';
                item.pricingType = 'wholesale';
                updateQty(item.productId, packCount, packPrice);
              } else if (tier !== '3' && item.packMode === 'wholesale_packs') {
                const pieceQty = item.qty * pieces;
                const piecePrice = pieces > 0 ? (item.unitPrice || 0) / pieces : item.unitPrice;
                item.packMode = 'retail_pieces';
                item.pricingType = 'retail';
                updateQty(item.productId, pieceQty, piecePrice);
              }
            }
            return;
          }
          const prod = productList.find(
            (p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode)
          );
          if (prod) {
            const newPrice = getProductTierPrice(prod, tier);
            if (newPrice > 0) {
              updatePrice(item.productId, newPrice);
            }
          }
        });
      }
    },
    [wholesaleMode, toggleWholesaleMode, products, cart, updatePrice, updateQty, posLayout]
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const settingsOrDefault = useMemo(
    () => ({
      tvaRate: Number(settings?.tvaRate ?? (settings as any)?.tva_rate ?? 0),
      invoicePrefix: settings?.invoicePrefix ?? 'INV-',
      baseCurrency: settings?.baseCurrency ?? 'دج',
      shopName: settings?.shopName ?? 'AN POS',
      phone: settings?.phone ?? '',
      receiptFooter: settings?.receiptFooter ?? 'شكراً لزيارتكم',
      allowNegativeStock: settings?.allowNegativeStock ?? true,
    }),
    [settings]
  );

  const saleSummary = useMemo(
    () => calculateSaleTotal(cart, discount, discountType, settingsOrDefault.tvaRate),
    [cart, discount, discountType, settingsOrDefault.tvaRate]
  );

  const selectedCustomerObj = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomer) || undefined;
  }, [customers, selectedCustomer]);

  const isWholesaleActive = wholesaleMode || selectedCustomerObj?.customerType === 'wholesale';

  // Auto-activate wholesale mode when a wholesale customer is selected
  useEffect(() => {
    if (selectedCustomerObj?.customerType === 'wholesale' && !wholesaleMode) {
      setWholesaleMode(true);
      addNotification({
        title: 'وضع بيع الجملة مفعّل تلقائياً',
        message: `تم اختيار تاجر الجملة "${selectedCustomerObj.name}" وتطبيق تسعيرة الجملة.`,
        type: 'info',
      });
    }
  }, [selectedCustomerObj, wholesaleMode, setWholesaleMode, addNotification]);

  // Recalculate cart item prices when wholesale mode toggles
  const prevWholesaleRef = useRef(isWholesaleActive);
  useEffect(() => {
    if (prevWholesaleRef.current !== isWholesaleActive) {
      prevWholesaleRef.current = isWholesaleActive;
      if (cart.length > 0) {
        cart.forEach((item) => {
          if (!item.isPack && !item.isCustom) {
            const prod = products.find((p) => p.id === item.productId);
            if (prod) {
              const newPrice = resolveUnitPrice(prod, item.qty, promotions, isWholesaleActive);
              if (newPrice !== item.unitPrice) {
                updatePrice(item.productId, newPrice);
              }
            }
          }
        });
      }
    }
  }, [isWholesaleActive, cart, products, promotions, updatePrice]);

  const isSessionOpen = currentSession !== null;

  // Sale Completion Hook
  const { completeSale, isPending: isSalePending } = useSaleCompletion(
    settingsOrDefault,
    (sale: Sale) => {
      modals.setCompletedSale(sale);
      modals.setShowPaymentModal(false);
      modals.setShowSuccessModal(true);
      setReturnMode(false);
      setSelectedCustomer('');
      setDiscount(0);
      setPaidAmount(0);
    }
  );

  // BARCODE-MGMT-001: استقبال ماسحات USB/Bluetooth تلقائياً
  // BARCODE-MGMT-001: استقبال ماسحات USB/Bluetooth والمسح عن بُعد من الهاتف
  const handleExternalScan = useCallback(
    async (code: string, scanQty = 1, extraData?: { fromMobile?: boolean; product?: any }) => {
      unlockAudio();
      setSearchQuery('');
      const productsArr = products as any[];
      const effectiveQty = Math.max(1, Number(scanQty) || 1);
      const result = await parseAndAddScannedCode(code, {
        products: productsArr,
        packs: packs as any,
        promotions: promotions as any,
        addItem,
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
            message: `تمت إضافة "${result.name || code}" (${effectiveQty}×) مباشرة إلى السلة`,
            type: 'success',
          });
        }
        if (quickMode) setTimeout(() => scanInputRef.current?.focus(), 100);
      } else {
        playErrorBeep();
        addNotification({
          title: extraData?.fromMobile ? '📱 مسح عبر الهاتف: غير موجود' : 'باركود غير معروف',
          message: `${result.message ?? 'لم يُعثر'}: ${code}`,
          type: 'error',
        });
      }
    },
    [products, packs, promotions, addItem, addNotification, quickMode, isWholesaleActive, priceTier, posSettings, posLayout, setSearchQuery]
  );

  useBarcodeScanner({
    onScan: handleExternalScan,
    enabled: true,
    respectInputFocus: false,
    beepOnSuccess: false,
    beepOnFailure: false,
  });

  useMobileScanner({
    onScan: handleExternalScan,
    enabled: true,
  });

  const handleAddProduct = useCallback(
    (product: any, customPrice?: number) => {
      const isPack = String(product.id).startsWith('pack-') || Boolean(product.isPack);
      if (isPack) {
        const packId = String(product.id).replace('pack-', '');
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

        if (!posSettings.allowNegativeStock && !posSettings.accountingOnly && firstComp?.productId) {
          const parentProd = products.find((p) => p.id === firstComp.productId);
          const availablePieces = parentProd ? Number(parentProd.quantity ?? 0) : 0;
          const availablePacks = pQty > 0 ? Math.floor(availablePieces / pQty) : 0;

          const existingCartPieces = cart.reduce((sum, it) => {
            if (it.productId === firstComp.productId) return sum + it.qty;
            if (it.isPack && (it.packId === packId || it.productId === `pack-${packId}`)) {
              return sum + it.qty * (it.packQty || pQty);
            }
            return sum;
          }, 0);

          if (existingCartPieces + pQty > availablePieces) {
            addNotification({
              title: 'تنبيه المخزون',
              type: 'warning',
              message: `المخزون غير كافٍ! المتاح من "${parentProd?.name || packObj.name}": ${availablePieces} قطعة (${availablePacks} عبوة).`,
            });
            return;
          }
        }

        const isTerminal = posLayout === 'terminal';
        const isWholesaleTier = priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive);

        if (isTerminal && !isWholesaleTier) {
          const existing = cart.find(
            (item) => item.productId === `pack-${packId}` || (item.isPack && item.packId === packId)
          );
          const piecePrice = pQty > 0 ? effectivePackPrice / pQty : effectivePackPrice;
          if (existing) {
            updateQty(existing.productId, existing.qty + pQty, existing.unitPrice);
          } else {
            addItem({
              productId: `pack-${packId}`,
              name: packObj.name,
              qty: pQty,
              unitPrice: piecePrice,
              lineTotal: effectivePackPrice,
              isPack: true,
              packId: packId,
              packQty: 1,
              packPiecesCount: pQty,
              packUnit: packObj.unitName || 'عبوة',
              packMode: 'retail_pieces',
              pricingType: 'retail',
            });
          }
        } else {
          const existing = cart.find(
            (item) => item.productId === `pack-${packId}` || (item.isPack && item.packId === packId)
          );
          if (existing) {
            updateQty(existing.productId, existing.qty + 1, existing.unitPrice);
          } else {
            addItem({
              productId: `pack-${packId}`,
              name: packObj.name,
              qty: 1,
              unitPrice: effectivePackPrice,
              lineTotal: effectivePackPrice,
              isPack: true,
              packId: packId,
              packQty: 1,
              packPiecesCount: pQty,
              packUnit: packObj.unitName || 'طرد',
              packMode: isTerminal ? 'wholesale_packs' : undefined,
              pricingType: isWholesaleTier ? 'wholesale' : 'pack',
            });
          }
        }
      } else {
        const existing = cart.find(
          (item) =>
            item.productId === product.id &&
            (customPrice === undefined ? !item.isCustom : item.unitPrice === customPrice)
        );
        if (existing) {
          const newQty = existing.qty + 1;
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
              : product.unitPrice ?? resolveUnitPrice(product, 1, promotions, isWholesaleActive, priceTier);
          addItem({
            productId: product.id,
            name: product.name,
            qty: 1,
            unitPrice: price,
            lineTotal: price,
            batchNumber: product.batchNumber,
            isCustom: customPrice !== undefined,
            pricingType:
              priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive)
                ? 'wholesale'
                : 'retail',
          });
        }
      }
      playAdded(0.05);
      setSearchQuery('');
      if (quickMode) {
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
    },
    [addItem, updateQty, promotions, cart, packs, products, quickMode, isWholesaleActive, priceTier, posSettings, posLayout, addNotification, setSearchQuery]
  );

  const handleUpdateQty = useCallback(
    (item: CartItem, newQty: number) => {
      if (newQty < 1) {
        removeItem(item.productId);
        return;
      }
      if (item.isPack) {
        updateQty(item.productId, newQty, item.unitPrice);
        return;
      }
      const product = products.find((p) => p.id === item.productId);
      if (product && !item.isCustom && priceTier === '1') {
        const finalPrice = resolveUnitPrice(product, newQty, promotions, isWholesaleActive, '1');
        updateQty(item.productId, newQty, finalPrice);
      } else {
        updateQty(item.productId, newQty, item.unitPrice);
      }
    },
    [removeItem, updateQty, products, promotions, isWholesaleActive, priceTier]
  );

  const handleSuspend = () => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((acc, it) => acc + (it.lineTotal || it.unitPrice * it.qty || 0), 0);
    const discountAmount = discountType === 'percent' ? (subtotal * (discount || 0)) / 100 : discount || 0;
    const total = Math.max(0, subtotal - discountAmount);
    const custObj = customers.find((c) => c.id === selectedCustomer);

    const newOrder = {
      id: createId(),
      items: cart.map((it) => ({
        productId: it.productId,
        name: it.name,
        qty: Number(it.qty || 1),
        unitPrice: Number(it.unitPrice || 0),
        lineTotal: Number(it.lineTotal || Number(it.qty || 1) * Number(it.unitPrice || 0)),
        isCustom: it.isCustom,
        isPack: it.isPack,
        packId: it.packId,
        batchNumber: it.batchNumber,
      })),
      total,
      subtotal,
      customerId: selectedCustomer || '',
      customerName: custObj?.name || '',
      discount: discount || 0,
      discountType: discountType || 'percent',
      createdAt: new Date().toISOString(),
      note: '',
      createdBy: currentUser?.name || '',
    };
    db.suspended_orders.add(newOrder).then(() => {
      refetchSuspended();
      setSelectedCustomer('');
      setDiscount(0);
      clearCart();
      addNotification({
        title: 'تم تعليق الفاتورة',
        message: `تم حفظ ${cart.length} أصناف بقيمة ${total.toLocaleString('ar-DZ')} د.ج في الفواتير المعلقة`,
        type: 'info',
      });
    });
  };

  const handleResumeOrder = (order: any) => {
    clearCart();
    const rawItems = order.items;
    const items = Array.isArray(rawItems)
      ? rawItems
      : typeof rawItems === 'string'
      ? (() => {
          try {
            return JSON.parse(rawItems);
          } catch {
            return [];
          }
        })()
      : [];

    for (const item of items) {
      addItem({
        productId: item.productId,
        name: item.name,
        qty: Number(item.qty || 1),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || Number(item.qty || 1) * Number(item.unitPrice || 0)),
        isCustom: item.isCustom,
        isPack: item.isPack,
        packId: item.packId,
        batchNumber: item.batchNumber,
      });
    }
    setSelectedCustomer(order.customerId || '');
    setDiscount(order.discount || 0);
    setDiscountType(order.discountType || 'percent');
    db.suspended_orders.delete(order.id).then(() => {
      refetchSuspended();
    });
    modals.setShowSuspended(false);
    addNotification({ title: 'تم استرجاع الفاتورة', message: 'تم تحميل الأصناف للسلة بنجاح', type: 'success' });
  };

  const handleDeleteSuspendedOrder = (orderId: string) => {
    db.suspended_orders.delete(orderId).then(() => {
      refetchSuspended();
      addNotification({ title: 'تم الحذف', message: 'تم حذف الفاتورة المعلقة بنجاح', type: 'info' });
    });
  };

  const handleExecutePayment = async () => {
    if (cart.length === 0) return;
    if (!isSessionOpen) {
      modals.setShowSessionWarning(true);
      return;
    }

    const dbPaymentMethod = paymentMethod === 'credit' ? 'credit' : 'cash';
    const isWholesaleTier = priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive);
    const saleDocType: DocType = isWholesaleTier ? 'wholesale' : 'facture';

    await completeSale({
      cart,
      discount,
      discountType,
      selectedCustomer,
      paymentMethod: dbPaymentMethod,
      isReturn: returnMode,
      currentSession,
      settings: settingsOrDefault,
      products: products as any[],
      packs: packs as any[],
      customers: customers as any[],
      docType: saleDocType,
      priceTier,
    });
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'clear') {
      modals.setKeypadInput('');
      if (modals.keypadTarget === 'paid') setPaidAmount(0);
      return;
    }
    if (val === 'backspace') {
      const next = modals.keypadInput.slice(0, -1);
      modals.setKeypadInput(next);
      if (modals.keypadTarget === 'paid') setPaidAmount(Number(next) || 0);
      return;
    }
    const next = modals.keypadInput + val;
    modals.setKeypadInput(next);
    const num = Number(next);
    if (modals.keypadTarget === 'paid') {
      setPaidAmount(num || 0);
    } else if (modals.keypadTarget === 'qty') {
      const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
      if (targetId) {
        const it = cart.find((c) => c.productId === targetId);
        if (it && num > 0) handleUpdateQty(it, num);
      }
    } else if (modals.keypadTarget === 'discount') {
      setDiscount(num || 0);
    }
  };

  const handleSelectReturnSale = (sale: Sale) => {
    for (const item of sale.items) {
      addItem({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      });
    }
    modals.setShowReturnSaleModal(false);
    setReturnMode(true);
    addNotification({
      title: 'وضع الإرجاع مفعّل',
      message: `تم استيراد ${sale.items.length} أصناف من الفاتورة #${sale.number}`,
      type: 'warning',
    });
  };

  // Keyboard Shortcuts Hook
  usePOSKeyboardShortcuts({
    cart,
    selectedItemId,
    isSessionOpen,
    total: saleSummary.total,
    isAnyModalOpen:
      modals.showPaymentModal ||
      modals.showSuccessModal ||
      modals.showShortcutsModal ||
      modals.showSuspended ||
      modals.showReturnSaleModal ||
      modals.showAddProduct ||
      modals.showAddCustomer ||
      modals.showFreeProductModal ||
      modals.showOpenSession ||
      modals.showSessionWarning ||
      modals.showCustomizeModal ||
      modals.showDiscountModal ||
      modals.showSaveAsProformaModal ||
      modals.showSaveAsOrderModal ||
      modals.showFiltersModal ||
      modals.showKeypad ||
      editingPriceFor !== null,
    isPaymentModalOpen: modals.showPaymentModal,
    isSuccessModalOpen: modals.showSuccessModal,
    onCloseAllModals: () => {
      modals.setShowPaymentModal(false);
      modals.setShowSuccessModal(false);
      modals.setShowShortcutsModal(false);
      modals.setShowSuspended(false);
      modals.setShowReturnSaleModal(false);
      modals.setShowAddProduct(false);
      modals.setShowAddCustomer(false);
      modals.setShowFreeProductModal(false);
      modals.setShowOpenSession(false);
      modals.setShowSessionWarning(false);
      modals.setShowCustomizeModal(false);
      modals.setShowDiscountModal(false);
      modals.setShowSaveAsProformaModal(false);
      modals.setShowSaveAsOrderModal(false);
      modals.setShowFiltersModal(false);
      modals.setShowKeypad(false);
      setEditingPriceFor(null);
    },
    onExecutePayment: handleExecutePayment,
    onCloseSuccessModal: () => modals.setShowSuccessModal(false),
    onOpenPayment: () => {
      setPaidAmount(saleSummary.total);
      modals.setShowPaymentModal(true);
    },
    onSuspendSale: handleSuspend,
    onOpenSuspended: () => modals.setShowSuspended(true),
    onClearCart: () => {
      clearCart();
      setSelectedCustomer('');
      setDiscount(0);
    },
    onOpenReturns: () => modals.setShowReturnSaleModal(true),
    onOpenShortcuts: () => modals.setShowShortcutsModal(true),
    onOpenFreeProduct: () => modals.setShowFreeProductModal(true),
    onOpenAddProduct: () => modals.setShowAddProduct(true),
    onOpenAddCustomer: () => modals.setShowAddCustomer(true),
    onToggleAutoPrint: () => {
      setAutoPrintReceipt((prev) => {
        const next = !prev;
        addNotification({
          title: next ? 'الطباعة التلقائية: مفعلة (F5)' : 'الطباعة التلقائية: معطلة (F5)',
          message: next ? 'سيتم طباعة الوصل تلقائياً عند إتمام الدفع' : 'تم إيقاف الطباعة التلقائية',
          type: 'info',
        });
        return next;
      });
    },
    onFocusSearch: () => {
      barcodeInputRef.current?.focus();
      barcodeInputRef.current?.select();
    },
    onOpenOpenSession: () => modals.setShowOpenSession(true),
    onOpenSessionWarning: () => modals.setShowSessionWarning(true),
    onOpenCustomize: () => modals.setShowCustomizeModal(true),
    onOpenDiscount: () => modals.setShowDiscountModal(true),
    onToggleWholesale: () => {
      const next = !wholesaleMode;
      toggleWholesaleMode();
      handleSelectPriceTier(next ? '3' : '1');
    },
    onUpdateQty: handleUpdateQty,
    onRemoveItem: removeItem,
    addNotification,
  });

  // Window size tracking for dynamic resolution matching
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const targetDims = useMemo(() => {
    if (!screenResolution || screenResolution === 'auto') return null;
    if (screenResolution === 'custom') {
      return {
        width: Math.max(600, customResolution?.width || 1920),
        height: Math.max(400, customResolution?.height || 1080),
      };
    }
    const [w, h] = screenResolution.split('x').map(Number);
    return {
      width: w || 1920,
      height: h || 1080,
    };
  }, [screenResolution, customResolution]);

  const canvasStyle = useMemo<React.CSSProperties>(() => {
    if (!targetDims) {
      return {
        zoom: `${uiZoom}%`,
        width: `${10000 / uiZoom}vw`,
        height: `${10000 / uiZoom}vh`,
      };
    }

    if (resolutionScaleMode === 'fixed_canvas') {
      const scale =
        Math.min(windowSize.width / targetDims.width, windowSize.height / targetDims.height) * (uiZoom / 100);

      return {
        width: `${targetDims.width}px`,
        height: `${targetDims.height}px`,
        zoom: `${scale * 100}%`,
      };
    }

    const scaleFactor = windowSize.width / targetDims.width;
    const effectiveZoom = scaleFactor * (uiZoom / 100) * 100;

    return {
      zoom: `${effectiveZoom}%`,
      width: `${10000 / effectiveZoom}vw`,
      height: `${10000 / effectiveZoom}vh`,
    };
  }, [targetDims, resolutionScaleMode, windowSize, uiZoom]);

  return (
    <div
      className={
        resolutionScaleMode === 'fixed_canvas' && targetDims
          ? 'w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none p-2'
          : 'contents'
      }
    >
      <div
        className={`flex flex-col overflow-hidden bg-background dark:bg-slate-950 select-none font-cairo text-on-surface dark:text-slate-100 ${
          resolutionScaleMode === 'fixed_canvas' && targetDims
            ? 'shadow-2xl border border-slate-800 rounded-2xl shrink-0'
            : ''
        }`}
        dir="rtl"
        style={canvasStyle}
      >
        {/* TOP BAR & SUBHEADER ACTIONS (Rendered in non-fullscreen layouts) */}
        {posLayout !== 'modern' && posLayout !== 'sidebar' && posLayout !== 'terminal' && (
          <POSTopBar
            currentUser={currentUser}
            trial={trial}
            isLicensed={isLicensed()}
            theme={theme}
            toggleTheme={toggleTheme}
            unreadCount={unreadCount}
            openSidebar={openSidebar}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            barcodeHeaderInput={barcodeHeaderInput}
            setBarcodeHeaderInput={setBarcodeHeaderInput}
            onExternalScan={handleExternalScan}
            searchInputRef={searchInputRef}
            barcodeInputRef={barcodeInputRef}
            products={products}
            onAddProduct={handleAddProduct}
            isFullscreen={isFullscreen}
            toggleFullscreen={toggleFullscreen}
            currentSession={currentSession}
            onOpenSession={() => modals.setShowOpenSession(true)}
            wholesaleMode={wholesaleMode}
            toggleWholesaleMode={() => {
              toggleWholesaleMode();
              addNotification({
                title: !wholesaleMode ? 'وضع الجملة مفعّل (Gros)' : 'وضع التجزئة مفعّل (Détail)',
                message: !wholesaleMode
                  ? 'تم تفعيل أسعار وفواتير الجملة تلقائياً (Alt+W)'
                  : 'تم العودة إلى أسعار التجزئة العادية (Alt+W)',
                type: !wholesaleMode ? 'success' : 'info',
              });
            }}
            onSelectPriceTier={handleSelectPriceTier}
            isWholesaleActive={isWholesaleActive}
            onOpenShortcuts={() => modals.setShowShortcutsModal(true)}
            onOpenFilters={() => modals.setShowFiltersModal(true)}
            activeFiltersCount={activeFiltersCount}
            onClearAllFilters={handleClearAllFilters}
            isFeaturedOnly={isFeaturedOnly}
            setIsFeaturedOnly={setIsFeaturedOnly}
            returnMode={returnMode}
            setReturnMode={setReturnMode}
            clearCart={clearCart}
            onOpenReturnSale={() => modals.setShowReturnSaleModal(true)}
            onOpenFreeProduct={() => modals.setShowFreeProductModal(true)}
            onOpenCustomize={() => modals.setShowCustomizeModal(true)}
            onNotify={addNotification}
          />
        )}

        {/* MAIN WORKSPACE LAYOUT DISPATCHER */}
        <POSLayoutDispatcher
          posLayout={posLayout}
          cart={cart}
          onAddToCart={handleAddProduct}
          onUpdateQty={handleUpdateQty}
          onRemoveFromCart={removeItem}
          onClearCart={() => {
            clearCart();
            setSelectedCustomer('');
            setDiscount(0);
          }}
          onEditPrice={(productId, newPrice) => {
            updatePrice(productId, newPrice);
          }}
          priceTier={priceTier}
          onSelectPriceTier={handleSelectPriceTier}
          saleSummary={saleSummary}
          products={filteredProducts as any}
          allProducts={products as any}
          categories={availableCategories}
          selectedCategory={filterCategory}
          onSelectCategory={(catId) => setFilterCategory(catId === 'ALL' ? '' : catId)}
          barcodeInput={barcodeHeaderInput}
          setBarcodeInput={setBarcodeHeaderInput}
          onBarcodeSubmit={(e) => {
            e?.preventDefault();
            if (barcodeHeaderInput.trim()) {
              handleExternalScan(barcodeHeaderInput.trim());
              setBarcodeHeaderInput('');
            }
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSettleSale={() => {
            if (!isSessionOpen) {
              modals.setShowSessionWarning(true);
              return;
            }
            if (cart.length === 0) return;
            setPaidAmount(saleSummary.total);
            modals.setShowPaymentModal(true);
          }}
          onSuspendSale={handleSuspend}
          onOpenSuspended={() => modals.setShowSuspended(true)}
          suspendedCount={suspendedOrders.length}
          onSelectCustomer={() => modals.setShowCustomerSelect(true)}
          selectedCustomerName={
            selectedCustomer ? customers.find((c) => c.id === selectedCustomer)?.name || '' : ''
          }
          autoPrintReceipt={autoPrintReceipt}
          onToggleAutoPrint={() => {
            setAutoPrintReceipt(!autoPrintReceipt);
            addNotification({
              title: 'الطباعة التلقائية',
              message: !autoPrintReceipt
                ? 'تم تفعيل الطباعة التلقائية للإيصالات'
                : 'تم إيقاف الطباعة التلقائية',
              type: 'info',
            });
          }}
          onOpenDiscount={() => modals.setShowDiscountModal(true)}
          discount={discount}
          discountType={discountType}
          onOpenFreeProduct={() => modals.setShowFreeProductModal(true)}
          onOpenReturns={() => modals.setShowReturnSaleModal(true)}
          returnMode={returnMode}
          onOpenCustomize={() => modals.setShowCustomizeModal(true)}
          wholesaleMode={wholesaleMode}
          toggleWholesaleMode={() => {
            toggleWholesaleMode();
            addNotification({
              title: !wholesaleMode ? 'وضع الجملة مفعّل (Gros)' : 'وضع التجزئة مفعّل (Détail)',
              message: !wholesaleMode
                ? 'تم تفعيل أسعار وفواتير الجملة تلقائياً (Alt+W)'
                : 'تم العودة إلى أسعار التجزئة العادية (Alt+W)',
              type: !wholesaleMode ? 'success' : 'info',
            });
          }}
          onSaveAsProforma={() => {
            if (cart.length === 0) return;
            modals.setShowSaveAsProformaModal(true);
          }}
          onSaveAsOrder={() => {
            if (cart.length === 0) return;
            modals.setShowSaveAsOrderModal(true);
          }}
          onNewOrder={() => {
            if (cart.length > 0) {
              clearCart();
              setSelectedCustomer('');
              setDiscount(0);
            }
          }}
          onOpenSalesHistory={() => navigate('/sales')}
          formatMoney={formatMoney}
          currency="دج"
          storeName={settingsOrDefault?.shopName || 'AN POS'}
          userName={currentUser?.name || 'Admin'}
          isSessionOpen={isSessionOpen}
          isSalePending={isSalePending}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          onNavigateBack={() => navigate('/')}
          onOpenKeypad={() => {
            modals.setKeypadTarget('paid');
            modals.setKeypadInput(String(saleSummary.total || ''));
            modals.setShowKeypad(true);
          }}
          onOpenKeypadForQty={(item) => {
            setSelectedItemId(item.productId);
            modals.setKeypadTarget('qty');
            modals.setKeypadInput(String(item.qty));
            modals.setShowKeypad(true);
          }}
          viewMode={viewMode}
          showProductImages={showProductImages}
          paginatedProducts={paginatedProducts as any}
          posSettings={posSettings}
          onOpenAddProduct={() => modals.setShowAddProduct(true)}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customers}
          selectedCustomerObj={selectedCustomerObj}
          onOpenCustomerSelect={() => modals.setShowCustomerSelect(true)}
          onOpenAddCustomer={() => modals.setShowAddCustomer(true)}
          isWholesaleActive={isWholesaleActive}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          editingPriceFor={editingPriceFor}
          setEditingPriceFor={setEditingPriceFor}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          onUpdatePrice={updatePrice}
          onRemoveItem={removeItem}
          formatNumber={formatNumber}
        />

        {/* CONSOLIDATED POS MODALS CONTAINER */}
        <POSModalsContainer
          modals={modals}
          cart={cart}
          saleSummary={saleSummary}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paidAmount={paidAmount}
          setPaidAmount={setPaidAmount}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customers}
          products={products}
          suppliers={suppliers}
          availableCategories={availableCategories}
          suspendedOrders={suspendedOrders}
          sales={sales}
          allSessions={allSessions}
          discount={discount}
          setDiscount={setDiscount}
          discountType={discountType}
          setDiscountType={setDiscountType}
          posLayout={posLayout}
          setPosLayout={setPosLayout}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showProductImages={showProductImages}
          setShowProductImages={setShowProductImages}
          uiZoom={uiZoom}
          setUiZoom={setUiZoom}
          screenResolution={screenResolution}
          setScreenResolution={setScreenResolution}
          customResolution={customResolution}
          setCustomResolution={setCustomResolution}
          resolutionScaleMode={resolutionScaleMode}
          setResolutionScaleMode={setResolutionScaleMode}
          posSettings={posSettings}
          settings={settings}
          currentUser={currentUser}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterSupplier={filterSupplier}
          setFilterSupplier={setFilterSupplier}
          filterStockStatus={filterStockStatus}
          setFilterStockStatus={setFilterStockStatus}
          isFeaturedOnly={isFeaturedOnly}
          setIsFeaturedOnly={setIsFeaturedOnly}
          onClearAllFilters={handleClearAllFilters}
          onConfirmPayment={async (paid, custId, method) => {
            setPaidAmount(paid);
            if (custId) setSelectedCustomer(custId);
            if (method) setPaymentMethod(method);
            await handleExecutePayment();
          }}
          isSalePending={isSalePending}
          onAddProduct={handleAddProduct}
          onResumeOrder={handleResumeOrder}
          onDeleteSuspendedOrder={handleDeleteSuspendedOrder}
          onSelectReturnSale={handleSelectReturnSale}
          onKeypadPress={handleKeypadPress}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          onUpdateQty={(productId, qty) => {
            const it = cart.find((c) => c.productId === productId);
            if (it) handleUpdateQty(it, qty);
          }}
          formatMoney={formatMoney}
        />
      </div>
    </div>
  );
}
