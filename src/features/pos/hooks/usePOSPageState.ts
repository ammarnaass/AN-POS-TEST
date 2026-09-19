import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Product, CartItem, Customer, Settings } from '@/types';
import type { POSLayout } from '../store/usePOSSessionStore';
import type { POSSettings } from './usePOSData';
import { calculateSaleTotal, resolveUnitPrice, getProductTierPrice } from '@/services';

export interface UsePOSPageStateProps {
  products: Product[];
  cart: CartItem[];
  updatePrice: (productId: string, price: number) => void;
  updateQty: (productId: string, qty: number, unitPrice?: number) => void;
  customers: Customer[];
  selectedCustomer: string;
  promotions: any[];
  settings: Settings | null | undefined;
  posSettings: POSSettings;
  discount: number;
  discountType: 'percent' | 'amount';
  paymentMethod: string;
  setPaymentMethod: (method: any) => void;
  posLayout: POSLayout;
  uiZoom: number;
  screenResolution: string;
  customResolution: { width: number; height: number };
  resolutionScaleMode: 'fit' | 'fixed_canvas';
  wholesaleMode: boolean;
  setWholesaleMode: (val: boolean) => void;
  toggleWholesaleMode: () => void;
  addNotification: (n: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }) => void;
}

export function usePOSPageState({
  products,
  cart,
  updatePrice,
  updateQty,
  customers,
  selectedCustomer,
  promotions,
  settings,
  posSettings,
  discount,
  discountType,
  paymentMethod,
  setPaymentMethod,
  posLayout,
  uiZoom,
  screenResolution,
  customResolution,
  resolutionScaleMode,
  wholesaleMode,
  setWholesaleMode,
  toggleWholesaleMode,
  addNotification,
}: UsePOSPageStateProps) {
  // Local UI & Editing States
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement));
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [barcodeHeaderInput, setBarcodeHeaderInput] = useState('');
  const [priceTier, setPriceTier] = useState<'1' | '2' | '3' | '4'>('1');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

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
          const prod = productList.find(
            (p) => p.id === item.productId || (item.barcode && p.barcode === item.barcode)
          );
          const pkgSize = prod?.packageSize ? parseInt(prod.packageSize, 10) : 0;
          const isPackagingItem = Boolean(item.isPack || pkgSize > 1 || (item.packPiecesCount && item.packPiecesCount > 1));

          if (isPackagingItem) {
            if (posLayout === 'terminal' || posLayout === 'advanced' || posLayout === 'design7') {
              const pieces = Number(item.packPiecesCount || pkgSize || item.packQty || 1);
              if (tier === '3' && (item.packMode === 'retail_pieces' || !item.packMode)) {
                const packCount = Math.max(1, Math.round(item.qty / pieces));
                const tierPrice = prod ? getProductTierPrice(prod, '3') : 0;
                const packPrice = tierPrice > 0 ? (item.isPack ? tierPrice : tierPrice * pieces) : (item.unitPrice || 0) * pieces;
                item.isPack = true;
                item.packPiecesCount = pieces;
                item.packMode = 'wholesale_packs';
                item.pricingType = 'wholesale';
                item.packQty = packCount;
                updateQty(item.productId, packCount, packPrice);
              } else if (tier !== '3' && item.packMode === 'wholesale_packs') {
                const pieceQty = item.qty * pieces;
                const tierPrice = prod ? getProductTierPrice(prod, tier) : 0;
                const piecePrice = tierPrice > 0 ? tierPrice : (pieces > 0 ? (item.unitPrice || 0) / pieces : item.unitPrice);
                item.isPack = true;
                item.packPiecesCount = pieces;
                item.packMode = 'retail_pieces';
                item.pricingType = 'retail';
                item.packQty = Math.max(1, Math.round(pieceQty / pieces));
                updateQty(item.productId, pieceQty, piecePrice);
              }
            }
            return;
          }
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

  return {
    canvasStyle,
    targetDims,
    windowSize,
    priceTier,
    setPriceTier,
    handleSelectPriceTier,
    editingPriceFor,
    setEditingPriceFor,
    priceInput,
    setPriceInput,
    isFullscreen,
    toggleFullscreen,
    mobileTab,
    setMobileTab,
    barcodeHeaderInput,
    setBarcodeHeaderInput,
    barcodeInputRef,
    searchInputRef,
    scanInputRef,
    settingsOrDefault,
    saleSummary,
    selectedCustomerObj,
    isWholesaleActive,
  };
}
