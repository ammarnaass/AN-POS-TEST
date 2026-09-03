import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  ShoppingCart,
  Barcode,
  Plus,
  Trash2,
  Minus,
  User,
  Percent,
  Camera,
  Clock,
  RotateCcw,
  Package,
  Check,
  X,
  CreditCard,
  Banknote,
  FileText,
  AlertTriangle,
  Layers,
  UserPlus,
  Tag,
  Coins,
  ShieldAlert,
  Printer,
  Eye,
  CheckCircle2,
  LayoutGrid,
  List,
  Star,
  Store,
  FlaskConical,
  ArrowUpRight,
  ScanLine,
  Sparkles,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { printInvoice, printViaDesktop, type PrintInvoiceData } from '@/lib/print';
import { getOpenSession, addToSessionSales } from '@/lib/cashSessionService';
import { suspendOrder, type SuspendedOrder, parseSuspendedItems } from '@/lib/suspendedOrderService';
import { notify } from '@/lib/notify';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';
import { syncEngine } from '@/lib/syncEngine';
import { getStoreSettings, fetchStoreSettingsFromDesktop, StoreSettings, DEFAULT_STORE_SETTINGS } from '@/lib/settingService';
import CameraScanner from '@/features/barcode/CameraScanner';
import InvoicePrintPreviewModal from '@/features/print/InvoicePrintPreviewModal';
import type { Product, Customer } from '@/lib/apiClient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button, Input, EmptyState } from '@/components/ui';

interface CartItem {
  cartKey?: string;
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  promoName?: string;
  isPack?: boolean;
  packId?: string;
  isCustom?: boolean;
}

export const POSScreen = ({ route, navigation }: any) => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Price Selection Modal for Custom Prices & Wholesale
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceModalProduct, setPriceModalProduct] = useState<Product | null>(null);
  const [selectedPriceOption, setSelectedPriceOption] = useState<{
    label: string;
    price: number;
    isCustom?: boolean;
    barcode?: string;
  } | null>(null);
  const [priceModalQty, setPriceModalQty] = useState(1);

  // Customer Management
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCreditLimit, setNewCustomerCreditLimit] = useState('');

  // Discount & Tax & Document Type
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'facture' | 'bl' | 'devis' | 'proforma'>('facture');

  // Checkout & Payment Details
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paidInput, setPaidInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');
  const [checkoutNote, setCheckoutNote] = useState('');

  // Custom Item Modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  // Print Preview & Post-Sale Success Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>('');
  const [lastInvoiceData, setLastInvoiceData] = useState<PrintInvoiceData | undefined>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedChangeDue, setCompletedChangeDue] = useState(0);
  const [completedInvoiceNum, setCompletedInvoiceNum] = useState('');

  // Barcode Camera Scanner & View Modes
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedOrders, setSuspendedOrders] = useState<SuspendedOrder[]>([]);

  // Real-time / Instant Data Loading
  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      await ensureInit();
      const [allProducts, allCustomers, allPromotions, allCategories, allPacks, session, localSettings] = await Promise.all([
        db.products.toArray(),
        db.customers.toArray(),
        db.promotions.toArray().catch(() => []),
        db.categories.toArray().catch(() => []),
        db.packs.toArray().catch(() => []),
        getOpenSession(),
        getStoreSettings().catch(() => DEFAULT_STORE_SETTINGS),
      ]);

      if (localSettings) {
        setStoreSettings(localSettings);
      }

      // If connected in online mode, fetch live settings from Desktop
      fetchStoreSettingsFromDesktop()
        .then((res) => {
          if (res.success && res.settings) {
            setStoreSettings(res.settings);
          }
        })
        .catch(() => {});

      const mappedProducts: Product[] = allProducts.map((p: any) => {
        const retailPrice = Number(p.retailPrice ?? p.retail_price ?? p.price ?? p.selling_price ?? p.sale_price ?? p.sale_price1 ?? 0);
        const costPrice = Number(p.costPrice ?? p.cost_price ?? p.purchasePrice ?? p.purchase_price ?? p.average_price ?? 0);
        const wholesalePrice = Number(p.wholesalePrice ?? p.wholesale_price ?? p.sale_price2 ?? 0);
        const wholesaleMinQty = Number(p.wholesaleMinQty ?? p.wholesale_min_qty ?? 0);
        const quantity = Number(p.quantity ?? p.qty ?? p.stock ?? 0);
        const lowStockThreshold = Number(p.lowStockThreshold ?? p.low_stock_threshold ?? 0);
        const taxRate = Number(p.taxRate ?? p.tax_rate ?? p.tax ?? 0);
        const name = p.name || p.productName || p.product_name || 'بدون اسم';

        const rawCustomPrices = p.custom_prices ?? p.customPrices;
        let customPrices: any[] = [];
        if (rawCustomPrices) {
          try {
            customPrices = typeof rawCustomPrices === 'string' ? JSON.parse(rawCustomPrices) : (Array.isArray(rawCustomPrices) ? rawCustomPrices : []);
          } catch {
            customPrices = [];
          }
        }

        return {
          ...p,
          id: p.id || p._id || p.productId || p.product_id,
          name,
          productName: name,
          product_name: name,
          retailPrice,
          retail_price: retailPrice,
          price: retailPrice,
          costPrice,
          cost_price: costPrice,
          wholesalePrice,
          wholesale_price: wholesalePrice,
          wholesaleMinQty,
          wholesale_min_qty: wholesaleMinQty,
          quantity,
          qty: quantity,
          stock: quantity,
          unit: p.unit || 'قطعة',
          barcode: p.barcode ? String(p.barcode) : '',
          sku: p.sku ? String(p.sku) : '',
          category: p.category || '',
          categoryId: p.categoryId || p.category_id || '',
          status: p.status || 'active',
          lowStockThreshold,
          low_stock_threshold: lowStockThreshold,
          taxRate,
          tax_rate: taxRate,
          image: p.image || p.imageUrl || p.image_url || null,
          quickSale: p.quickSale !== undefined ? Boolean(p.quickSale) : p.quick_sale !== undefined ? Boolean(p.quick_sale) : true,
          customPrices,
        };
      });
      setProducts(mappedProducts);
      setFiltered(mappedProducts);
      setCustomers(
        allCustomers.map((c: any) => ({
          ...c,
          id: c.id || c._id,
          name: c.name || '',
          phone: c.phone || '',
          creditLimit: c.credit_limit || c.creditLimit || 0,
          balance: c.balance || 0,
        }))
      );
      let finalCategories = allCategories;
      if (finalCategories.length === 0) {
        const uniqueCatNames = Array.from(
          new Set(mappedProducts.map((p) => p.category).filter(Boolean))
        );
        finalCategories = uniqueCatNames.map((name, idx) => ({
          id: `cat_${idx}_${name}`,
          name,
          color: '#3b82f6',
          icon: 'Tag',
        }));
      }

      setPromotions(allPromotions);
      setCategories(finalCategories);
      setPacks(allPacks);
      setHasOpenSession(!!session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب البيانات');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // 1. Instant silent refresh when navigating to POS screen
  useFocusEffect(
    useCallback(() => {
      loadData(products.length === 0);
    }, [loadData, products.length])
  );

  // 2. Real-time background sync listener and periodic heartbeat
  useEffect(() => {
    loadData(true);

    const unsubscribeSync = syncEngine.subscribe((syncState) => {
      if (!syncState.isSyncing) {
        loadData(false);
      }
    });

    const interval = setInterval(() => {
      loadData(false);
    }, 8000);

    return () => {
      unsubscribeSync();
      clearInterval(interval);
    };
  }, []);

  // Handle external barcode passed via navigation params
  useEffect(() => {
    if (!products.length) return;
    if (route?.params?.initialCodes && Array.isArray(route.params.initialCodes)) {
      const codes: string[] = route.params.initialCodes;
      codes.forEach((code) => {
        handleBarcodeScan(code, 'multi');
      });
      navigation.setParams({ initialCodes: undefined });
    } else if (route?.params?.barcode) {
      const barcodeStr = String(route.params.barcode);
      handleBarcodeScan(barcodeStr, 'single');
      navigation.setParams({ barcode: undefined });
    }
  }, [route?.params, products]);

  const findPromotion = (productId: string) => {
    const now = new Date().toISOString().split('T')[0];
    return promotions.find(
      (p) =>
        (p.productId === productId || (p.product_ids && p.product_ids.includes(productId))) &&
        (p.active !== 0 && p.status !== 'inactive') &&
        (p.startDate || p.start_date || '') <= now &&
        (p.endDate || p.end_date || '9999-12-31') >= now
    );
  };

  const addToCart = useCallback(
    (
      product: Product,
      customQty = 1,
      customPriceOption?: { label: string; price: number; isCustom?: boolean }
    ) => {
      const promo = findPromotion(product.id);
      setCart((prev) => {
        const itemKey = customPriceOption?.label
          ? `${product.id}_${customPriceOption.label}`
          : product.id;

        const existing = prev.find((c) =>
          (c as any).cartKey
            ? (c as any).cartKey === itemKey
            : c.productId === product.id && (!customPriceOption || c.promoName === customPriceOption.label)
        );
        const newQty = existing ? existing.qty + customQty : customQty;

        let basePrice = customPriceOption ? customPriceOption.price : product.retailPrice;
        let promoTag = customPriceOption?.label || '';

        if (!customPriceOption) {
          if (
            product.wholesalePrice &&
            product.wholesalePrice > 0 &&
            product.wholesaleMinQty &&
            product.wholesaleMinQty > 0 &&
            newQty >= product.wholesaleMinQty
          ) {
            basePrice = product.wholesalePrice;
            promoTag = 'سعر الجملة';
          } else if (promo) {
            const discType = promo.discountType || promo.discount_type || promo.type;
            const discVal = promo.discountValue || promo.discount_value || promo.value || 0;
            if (discType === 'percent' || discType === 'percentage') {
              basePrice = basePrice * (1 - discVal / 100);
            } else {
              basePrice = Math.max(0, basePrice - discVal);
            }
            promoTag = promo.name || 'عرض ترويجي';
          }
        }

        if (promo?.maxQuantity && newQty > promo.maxQuantity) return prev;

        const itemName =
          customPriceOption?.label && customPriceOption.label !== 'سعر البيع الافتراضي'
            ? `${product.name} (${customPriceOption.label})`
            : product.name;

        if (existing) {
          return prev.map((c) =>
            (c as any).cartKey === itemKey || (!c.promoName && c.productId === product.id && !customPriceOption)
              ? {
                  ...c,
                  name: itemName,
                  qty: newQty,
                  unitPrice: basePrice,
                  lineTotal: basePrice * newQty,
                  promoName: promoTag,
                }
              : c
          );
        }
        return [
          ...prev,
          {
            cartKey: itemKey,
            productId: product.id,
            name: itemName,
            qty: customQty,
            unitPrice: basePrice,
            lineTotal: basePrice * customQty,
            promoName: promoTag,
            isCustom: customPriceOption?.isCustom,
          } as any,
        ];
      });
    },
    [products, promotions]
  );

  const handleProductPress = (product: Product) => {
    const rawCP = (product as any).customPrices ?? (product as any).custom_prices;
    let cPrices: any[] = [];
    if (rawCP) {
      try {
        cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
      } catch {
        cPrices = [];
      }
    }
    const hasCustomPrices = Array.isArray(cPrices) && cPrices.length > 0;
    const hasWholesale = Boolean(product.wholesalePrice && product.wholesalePrice > 0);

    if (hasCustomPrices || hasWholesale) {
      const fullProd = { ...product, customPrices: cPrices };
      setPriceModalProduct(fullProd as any);
      setSelectedPriceOption({
        label: 'سعر البيع الافتراضي',
        price: product.retailPrice,
        isCustom: false,
        barcode: product.barcode,
      });
      setPriceModalQty(1);
      setShowPriceModal(true);
    } else {
      addToCart(product, 1);
    }
  };

  const addPackToCart = (pack: any) => {
    const packId = pack.id;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === packId);
      const newQty = existing ? existing.qty + 1 : 1;
      const price = pack.packPrice || (pack as any).pack_price || 0;

      if (existing) {
        return prev.map((c) =>
          c.productId === packId
            ? {
                ...c,
                qty: newQty,
                lineTotal: price * newQty,
              }
            : c
        );
      }

      return [
        ...prev,
        {
          productId: packId,
          name: `📦 ${pack.name}`,
          qty: 1,
          unitPrice: price,
          lineTotal: price,
          isPack: true,
          packId: pack.id,
          promoName: 'باقة مجمعة',
        },
      ];
    });
  };

  const handleAddCustomItem = () => {
    const name = customItemName.trim();
    const price = parseFloat(customItemPrice) || 0;
    const qty = parseFloat(customItemQty) || 1;

    if (!name) {
      Alert.alert(t('common.warning'), t('pos.pleaseEnterCustomName'));
      return;
    }
    if (price <= 0) {
      Alert.alert(t('common.warning'), t('pos.pleaseEnterValidPrice'));
      return;
    }

    const customId = `custom_${generateId()}`;
    setCart((prev) => [
      ...prev,
      {
        productId: customId,
        name: `⭐ ${name}`,
        qty,
        unitPrice: price,
        lineTotal: price * qty,
        isCustom: true,
        promoName: t('pos.customItemBadge'),
      },
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setShowCustomItemModal(false);
  };

  const handleBarcodeScan = async (code: string, mode: 'single' | 'multi' = 'single') => {
    if (mode === 'single') {
      setShowCameraScanner(false);
    }

    const normalized = code.trim().toLowerCase();

    // 0️⃣ Check if barcode specifically matches any product's customPrice barcode!
    for (const p of products) {
      const rawCP = (p as any).customPrices ?? (p as any).custom_prices;
      let cPrices: any[] = [];
      if (rawCP) {
        try {
          cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
        } catch {}
      }
      if (Array.isArray(cPrices)) {
        const matchedPrice = cPrices.find(
          (cp: any) => cp.barcode && String(cp.barcode).trim().toLowerCase() === normalized
        );
        if (matchedPrice) {
          addToCart(p, 1, {
            label: matchedPrice.name,
            price: Number(matchedPrice.price) || p.retailPrice,
            isCustom: true,
          });
          notify.success(`تمت إضافة (${p.name} - ${matchedPrice.name})`, t('pos.cart'));
          return;
        }
      }
    }

    // 1️⃣ Search in products.barcode (primary in-memory)
    let found = products.find(
      (p) => (p.barcode ?? '').toLowerCase() === normalized
    );

    // 2️⃣ Search in products.sku
    if (!found) {
      found = products.find(
        (p) => (p.sku ?? '').toLowerCase() === normalized
      );
    }

    // 3️⃣ Search in product_barcodes table (secondary/variant/batch barcodes)
    let matchedSecondaryRow: any = null;
    if (!found) {
      try {
        const rows = await db.productBarcodes.where('barcode').equals(code).toArray();
        if (rows && rows.length > 0) {
          matchedSecondaryRow = rows[0];
          const matchedId = rows[0]?.product_id || rows[0]?.productId;
          found = products.find((p) => p.id === matchedId);
        }
      } catch {
        /* ignore */
      }
    }

    // 4️⃣ Direct Database / Server Query if not loaded in memory (vital for connected mode)
    if (!found) {
      try {
        const allDbProducts = await db.products.toArray().catch(() => []);
        for (const p of allDbProducts) {
          const rawCP = (p as any).custom_prices ?? (p as any).customPrices;
          let cPrices: any[] = [];
          if (rawCP) {
            try {
              cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
            } catch {}
          }
          const matchedCP = cPrices.find(
            (cp: any) => cp.barcode && String(cp.barcode).trim().toLowerCase() === normalized
          );
          if (matchedCP) {
            const mappedP = {
              ...p,
              id: p.id || (p as any)._id,
              name: p.name || (p as any).productName || t('inventory.productName'),
              retailPrice: Number(p.retailPrice ?? (p as any).retail_price ?? 0),
              wholesalePrice: Number(p.wholesalePrice ?? (p as any).wholesale_price ?? 0),
              wholesaleMinQty: Number(p.wholesaleMinQty ?? (p as any).wholesale_min_qty ?? 0),
              quantity: Number(p.quantity ?? (p as any).qty ?? 0),
              unit: p.unit || t('inventory.unitPiece'),
              barcode: p.barcode ? String(p.barcode) : '',
              sku: p.sku ? String(p.sku) : '',
              category: p.category || '',
              status: p.status || 'active',
              taxRate: Number(p.taxRate ?? (p as any).tax_rate ?? 0),
              customPrices: cPrices,
            };
            setProducts((prev) => [...prev.filter((x) => x.id !== mappedP.id), mappedP]);
            addToCart(mappedP, 1, {
              label: matchedCP.name,
              price: Number(matchedCP.price) || mappedP.retailPrice,
              isCustom: true,
            });
            notify.success(`تمت إضافة (${mappedP.name} - ${matchedCP.name})`, t('pos.cart'));
            return;
          }
        }

        const directList = await db.products.where('barcode').equals(code).toArray().catch(() => []);
        if (directList && directList.length > 0) {
          const p: any = directList[0];
          const rawCP = p.custom_prices || p.customPrices;
          let cPrices: any[] = [];
          if (rawCP) {
            try {
              cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
            } catch {}
          }
          found = {
            ...p,
            id: p.id || p._id,
            name: p.name || p.productName || t('inventory.productName'),
            retailPrice: p.retailPrice || p.price || 0,
            wholesalePrice: p.wholesalePrice || 0,
            wholesaleMinQty: p.wholesaleMinQty || p.wholesale_min_qty || 0,
            quantity: p.quantity || p.qty || 0,
            unit: p.unit || t('inventory.unitPiece'),
            barcode: p.barcode || code,
            sku: p.sku || '',
            category: p.category || '',
            status: p.status || 'active',
            taxRate: Number(p.taxRate ?? p.tax_rate ?? 0),
            customPrices: cPrices,
          };
          setProducts((prev) => [...prev, found!]);
        }
      } catch {
        /* ignore */
      }
    }

    // 5️⃣ Search in packs table (bundles)
    if (!found) {
      const foundPack = packs.find(
        (pk) => (pk.barcode ?? '').toLowerCase() === normalized
      );
      if (foundPack) {
        addPackToCart(foundPack);
        return;
      }
    }

    if (found) {
      const rawCP = (found as any).customPrices ?? (found as any).custom_prices;
      let cPrices: any[] = [];
      if (rawCP) {
        try {
          cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
        } catch {}
      }
      const fullFound = { ...found, customPrices: cPrices };

      // If matched secondary row has a price label, try to apply it
      if (matchedSecondaryRow && (matchedSecondaryRow.price_label || matchedSecondaryRow.priceLabel)) {
        const pLabel = (matchedSecondaryRow.price_label || matchedSecondaryRow.priceLabel).trim();
        const matchingCP = cPrices.find(
          (cp: any) => cp.name.trim().toLowerCase() === pLabel.toLowerCase()
        );
        if (matchingCP) {
          addToCart(fullFound, 1, {
            label: matchingCP.name,
            price: Number(matchingCP.price) || fullFound.retailPrice,
            isCustom: true,
          });
          notify.success(`تمت إضافة (${fullFound.name} - ${matchingCP.name})`, t('pos.cart'));
          return;
        }
      }

      // If product has custom prices and no specific single price was matched, prompt with modal
      const hasCustomPrices = Array.isArray(cPrices) && cPrices.length > 0;
      const hasWholesale = Boolean(fullFound.wholesalePrice && fullFound.wholesalePrice > 0);
      if (hasCustomPrices || hasWholesale) {
        setPriceModalProduct(fullFound);
        setSelectedPriceOption({
          label: 'سعر البيع الافتراضي',
          price: fullFound.retailPrice,
          isCustom: false,
          barcode: fullFound.barcode,
        });
        setPriceModalQty(1);
        setShowPriceModal(true);
      } else {
        addToCart(fullFound);
        notify.success(`${t('pos.itemAdded')} (${fullFound.name})`, t('pos.cart'));
      }
    } else {
      if (mode === 'single') {
        Alert.alert(
          t('pos.productNotFound'),
          `${t('inventory.barcode')}: ${code}\n\n${t('pos.productNotFoundDesc')}`,
          [{ text: t('common.close') }]
        );
      }
    }
  };

  const updateQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.productId !== productId) return c;
          const newQty = c.qty + delta;
          if (newQty <= 0) return null;

          let unitPrice = c.unitPrice;
          let promoName = c.promoName;

          // Re-evaluate wholesale tier on quantity change
          if (
            prod &&
            prod.wholesalePrice &&
            prod.wholesalePrice > 0 &&
            prod.wholesaleMinQty &&
            prod.wholesaleMinQty > 0
          ) {
            if (newQty >= prod.wholesaleMinQty) {
              unitPrice = prod.wholesalePrice;
              promoName = t('pos.wholesalePrice');
            } else {
              unitPrice = prod.retailPrice;
              promoName = '';
            }
          }

          return { ...c, qty: newQty, unitPrice, lineTotal: unitPrice * newQty, promoName };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.productId !== productId));

  const filterProducts = () => {
    if (selectedCategory === 'packs') {
      let resultPacks = packs;
      if (search.trim()) {
        const term = search.toLowerCase();
        resultPacks = resultPacks.filter(
          (pk) =>
            pk.name?.toLowerCase().includes(term) ||
            (pk.barcode ?? '').toLowerCase().includes(term)
        );
      }
      // Convert packs to product-like representation for uniform rendering
      setFiltered(
        resultPacks.map((pk) => ({
          id: pk.id,
          name: `📦 ${pk.name}`,
          retailPrice: pk.packPrice || pk.pack_price || 0,
          wholesalePrice: 0,
          wholesaleMinQty: 0,
          quantity: 999,
          unit: t('promotions.packName'),
          barcode: pk.barcode || '',
          category: 'packs',
          status: 'active',
          lowStockThreshold: 0,
          isPack: true,
        })) as any
      );
      return;
    }

    let result = products;
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          (p.barcode ?? '').toLowerCase().includes(term) ||
          (p.sku ?? '').toLowerCase().includes(term)
      );
    }
    if (selectedCategory === 'featured') {
      result = result.filter(
        (p) => (p as any).quickSale === true || (p as any).quick_sale === 1 || (p as any).featured === 1 || (p as any).is_featured === 1
      );
    } else if (selectedCategory) {
      const selectedCatObj = categories.find((c) => c.id === selectedCategory || c.name === selectedCategory);
      const selectedCatName = selectedCatObj ? selectedCatObj.name.toLowerCase() : selectedCategory.toLowerCase();
      result = result.filter(
        (p) =>
          (p as any).category_id === selectedCategory ||
          (p as any).categoryId === selectedCategory ||
          p.category === selectedCategory ||
          ((p as any).categoryId && (p as any).categoryId === selectedCatObj?.id) ||
          ((p as any).category_id && (p as any).category_id === selectedCatObj?.id) ||
          (Boolean(p.category) && p.category.toLowerCase() === selectedCatName)
      );
    }
    setFiltered(result);
  };

  useEffect(() => {
    filterProducts();
  }, [search, products, selectedCategory]);

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const discount =
    discountType === 'percent'
      ? (subtotal * (parseFloat(discountValue) || 0)) / 100
      : parseFloat(discountValue) || 0;
  const afterDiscount = Math.max(0, subtotal - discount);

  // Dynamic TVA calculation based on Store Settings from Desktop or local database
  const effectiveTvaRate = Number(storeSettings.tva_rate ?? storeSettings.tvaRate ?? 0);
  const tvaFactor = effectiveTvaRate > 1 ? effectiveTvaRate / 100 : effectiveTvaRate;
  const tax = afterDiscount * tvaFactor;
  const total = afterDiscount + tax;

  // Calculated Payment Change & Balance
  const numPaid = parseFloat(paidInput) || 0;
  const changeDue = Math.max(0, numPaid - total);
  const remainingDebt = Math.max(0, total - numPaid);

  const cashShortcuts = useMemo(() => {
    const rounded = Math.round(total);
    if (rounded <= 0) return [];
    const items = [
      { label: t('pos.exactAmount'), val: rounded },
      { label: `+500 ${currency}`, val: rounded + 500 },
      { label: `+1000 ${currency}`, val: rounded + 1000 },
    ];
    const next1000 = Math.ceil(rounded / 1000) * 1000;
    if (next1000 > rounded && next1000 !== rounded + 500 && next1000 !== rounded + 1000) {
      items.push({ label: `${next1000} ${currency}`, val: next1000 });
    } else {
      items.push({ label: `+2000 ${currency}`, val: rounded + 2000 });
    }
    return items;
  }, [total, currency, t]);

  const handleSuspend = async () => {
    if (cart.length === 0) return;
    await suspendOrder(
      cart,
      selectedCustomer?.id,
      selectedCustomer?.name,
      discountType,
      parseFloat(discountValue) || 0
    );
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue('0');
    setSearch('');
    Alert.alert('✓', t('pos.suspendOrder'));
  };

  const loadSuspended = async () => {
    const orders = await db.suspendedOrders.toArray();
    setSuspendedOrders(orders);
    setShowSuspendedModal(true);
  };

  const resumeOrder = async (order: SuspendedOrder) => {
    setCart(parseSuspendedItems(order));
    if (order.customerId) {
      const cust = customers.find((c) => c.id === order.customerId);
      if (cust) setSelectedCustomer(cust);
    }
    if (order.discountType) setDiscountType(order.discountType as 'amount' | 'percent');
    if (order.discountValue) setDiscountValue(order.discountValue.toString());
    await db.suspendedOrders.delete(order.id);
    setSuspendedOrders((prev) => prev.filter((o) => o.id !== order.id));
    setShowSuspendedModal(false);
  };

  const handleCheckoutTap = async () => {
    if (cart.length === 0) return;
    const currentMode = await getStoredMode();
    if (!hasOpenSession && currentMode === 'standalone') {
      Alert.alert(t('common.warning'), t('pos.shiftRequiredWarning'));
      return;
    }
    setPaidInput(total.toFixed(0));
    setPaymentMethod('cash');
    setShowCheckoutModal(true);
  };

  const handleQuickCreateCustomer = async () => {
    const name = newCustomerName.trim();
    if (!name) {
      Alert.alert(t('common.warning'), t('customers.customerNameRequired'));
      return;
    }

    const newId = generateId();
    const newCust: Customer = {
      id: newId,
      name,
      phone: newCustomerPhone.trim(),
      creditLimit: parseFloat(newCustomerCreditLimit) || 0,
      balance: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await ensureInit();
      const newCustRecord = {
        id: newId,
        name: newCust.name,
        phone: newCust.phone,
        credit_limit: newCust.creditLimit,
        creditLimit: newCust.creditLimit,
        balance: 0,
        created_at: newCust.createdAt,
        updated_at: newCust.createdAt,
      };
      await db.customers.add(newCustRecord);
      await syncEngine.enqueue('create', 'customers', newId, newCustRecord);

      setCustomers((prev) => [...prev, newCust]);
      setSelectedCustomer(newCust);
      setShowNewCustomerModal(false);
      setShowCustomerPicker(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerCreditLimit('');
      Alert.alert('✓', `${t('customers.customerSaved')}: ${name}`);
    } catch (e) {
      Alert.alert(t('common.error'), t('customers.customerSaveFailed'));
    }
  };

  const handlePaymentConfirm = async () => {
    setCheckoutLoading(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const saleId = generateId();

      const enteredPaid = parseFloat(paidInput) || 0;
      let finalMethod = paymentMethod;
      let effectivePaid = 0;
      let effectiveStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
      let debtToAdd = 0;

      if (paymentMethod === 'cash') {
        effectivePaid = Math.min(enteredPaid, total);
        if (effectivePaid >= total) {
          effectiveStatus = 'paid';
          debtToAdd = 0;
        } else {
          // Partial cash payment -> remainder is credit
          if (!selectedCustomer) {
            Alert.alert(t('common.warning'), t('pos.customerRequiredForCredit'));
            setCheckoutLoading(false);
            return;
          }
          effectiveStatus = effectivePaid > 0 ? 'partial' : 'unpaid';
          debtToAdd = total - effectivePaid;
        }
      } else if (paymentMethod === 'card') {
        effectivePaid = total;
        effectiveStatus = 'paid';
        debtToAdd = 0;
      } else if (paymentMethod === 'credit') {
        if (!selectedCustomer) {
          Alert.alert(t('common.warning'), t('pos.cannotCreditGuest'));
          setCheckoutLoading(false);
          return;
        }
        effectivePaid = Math.min(enteredPaid, total);
        effectiveStatus = effectivePaid >= total ? 'paid' : effectivePaid > 0 ? 'partial' : 'unpaid';
        debtToAdd = total - effectivePaid;
      }

      // Check Customer Credit Limit
      if (debtToAdd > 0 && selectedCustomer) {
        const custLimit = selectedCustomer.creditLimit || 0;
        const currentBal = selectedCustomer.balance || 0;
        if (custLimit > 0 && currentBal + debtToAdd > custLimit) {
          Alert.alert(
            t('pos.creditLimitExceededWarning'),
            `${t('pos.creditLimitExceededMsg')} (${(currentBal + debtToAdd).toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} ${currency})`,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => setCheckoutLoading(false) },
              { text: t('pos.proceedAnyway'), style: 'destructive', onPress: () => executeSaleTransaction(saleId, invoiceNumber, nowIso, finalMethod, effectivePaid, effectiveStatus, debtToAdd) },
            ]
          );
          return;
        }
      }

      await executeSaleTransaction(saleId, invoiceNumber, nowIso, finalMethod, effectivePaid, effectiveStatus, debtToAdd);
    } catch (err) {
      Alert.alert(t('common.error'), `${t('pos.savingFailed')}: ${err instanceof Error ? err.message : 'Error'}`);
      setCheckoutLoading(false);
    }
  };

  const executeSaleTransaction = async (
    saleId: string,
    invoiceNumber: string,
    nowIso: string,
    finalMethod: string,
    effectivePaid: number,
    effectiveStatus: 'paid' | 'partial' | 'unpaid',
    debtToAdd: number
  ) => {
    try {
      // 1. Create main Sale record
      const mappedItems = cart.map((c) => ({
        productId: c.productId,
        name: c.name,
        qty: c.qty,
        unitPrice: c.unitPrice,
        lineTotal: c.lineTotal,
        promoName: c.promoName,
        isPack: c.isPack,
        packId: c.packId,
        isCustom: c.isCustom,
      }));

      const saleRecord = {
        id: saleId,
        number: invoiceNumber,
        date: nowIso,
        docType: selectedDocType,
        doc_type: selectedDocType,
        type: 'sale',
        items: JSON.stringify(mappedItems),
        subtotal,
        discount,
        discountType,
        discount_type: discountType,
        tvaAmount: tax,
        tva_amount: tax,
        total,
        paymentMethod: finalMethod,
        payment_method: finalMethod,
        customerId: selectedCustomer?.id || '',
        customer_id: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || t('pos.guestCustomer'),
        customer_name: selectedCustomer?.name || t('pos.guestCustomer'),
        amountPaid: effectivePaid,
        amount_paid: effectivePaid,
        status: effectiveStatus,
        soldBy: user?.name || user?.username || 'الكاشير',
        sold_by: user?.name || user?.username || 'الكاشير',
        cash_session_id: (await getOpenSession().catch(() => null))?.id || '',
        note: checkoutNote.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      };
      await db.sales.add(saleRecord);
      await syncEngine.enqueue('create', 'sales', saleId, saleRecord);

      // 2. Insert individual sale_items and deduct stock for products / pack items
      for (const item of cart) {
        // 2a. Add to sale_items table
        const saleItemId = generateId();
        const saleItemRecord = {
          id: saleItemId,
          sale_id: saleId,
          product_id: item.productId,
          name: item.name,
          qty: item.qty,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          created_at: nowIso,
        };
        try {
          await db.saleItems.add(saleItemRecord);
          await syncEngine.enqueue('create', 'sale_items', saleItemId, saleItemRecord);
        } catch (e) {
          console.warn('[PoS] Failed to insert sale_item:', e);
        }

        // 2b. Stock Deduction & Movements
        if (item.isPack && item.packId) {
          // It's a pack -> deduct stock for sub-products
          const packData = packs.find((pk) => pk.id === item.packId);
          if (packData && packData.items) {
            const rawSubItems: any[] = typeof packData.items === 'string' ? JSON.parse(packData.items) : packData.items;
            for (const sub of rawSubItems) {
              const subProdId = sub.productId || sub.product_id;
              const subTotalQty = (Number(sub.qty || 1)) * item.qty;
              try {
                const p = await db.products.get(subProdId);
                if (p) {
                  const currentQty = Number(p.quantity || (p as any).qty || 0);
                  await db.products.update(subProdId, {
                    quantity: Math.max(0, currentQty - subTotalQty),
                    updated_at: nowIso,
                  });
                  await db.stockMovements.add({
                    id: generateId(),
                    date: nowIso,
                    type: 'out',
                    product_id: subProdId,
                    qty: subTotalQty,
                    reason: `مبيعات باقة (${packData.name}) - فاتورة ${invoiceNumber}`,
                    reference: invoiceNumber,
                    reference_id: saleId,
                    created_by: user?.name || user?.username || '',
                    created_at: nowIso,
                  }).catch(() => {});
                }
              } catch (err) {
                console.warn('[PoS] Failed pack sub-item stock deduction:', err);
              }
            }
          }
        } else if (!item.isCustom) {
          // Standard single product
          try {
            const prod = await db.products.get(item.productId);
            if (prod) {
              const currentQty = Number(prod.quantity || (prod as any).qty || 0);
              const newQty = Math.max(0, currentQty - item.qty);
              await db.products.update(item.productId, {
                quantity: newQty,
                updated_at: nowIso,
              });

              await db.stockMovements.add({
                id: generateId(),
                date: nowIso,
                type: 'out',
                product_id: item.productId,
                qty: item.qty,
                reason: `مبيعات فاتورة ${invoiceNumber}`,
                reference: invoiceNumber,
                reference_id: saleId,
                created_by: user?.name || user?.username || '',
                created_at: nowIso,
              }).catch(() => {});

              // Log to stockMovementsV2 for desktop parity
              const movV2Id = generateId();
              const movV2Record = {
                id: movV2Id,
                movement_number: `MOV-${Date.now().toString().slice(-6)}`,
                date: nowIso,
                type: 'sale',
                warehouse_id: (prod as any).warehouseId || (prod as any).warehouse_id || 'main',
                item_id: item.productId,
                quantity: -item.qty,
                unit_price: item.unitPrice,
                total_amount: item.lineTotal,
                reference: invoiceNumber,
                is_reviewed: 1,
                reviewed_by: user?.name || user?.username || '',
                created_at: nowIso,
                updated_at: nowIso,
              };
              await db.stockMovementsV2.add(movV2Record).catch(() => {});
              await syncEngine.enqueue('create', 'stock_movements_v2', movV2Id, movV2Record);
            }
          } catch (e) {
            console.warn('[PoS] Failed to update product quantity:', e);
          }
        }
      }

      // 3. Update customer balance & record payment
      if (selectedCustomer?.id) {
        try {
          const cust = await db.customers.get(selectedCustomer.id);
          if (cust) {
            const currentBal = Number(cust.balance || 0);
            const newBal = currentBal + debtToAdd;
            await db.customers.update(selectedCustomer.id, {
              balance: newBal,
              updated_at: nowIso,
            });
          }

          // Record payment if paid portion > 0
          if (effectivePaid > 0) {
            const paymentId = generateId();
            const paymentRecord = {
              id: paymentId,
              date: nowIso,
              party_type: 'customer',
              party_id: selectedCustomer.id,
              customer_id: selectedCustomer.id,
              amount: effectivePaid,
              type: 'credit',
              method: finalMethod,
              note: `سداد فوري لفاتورة ${invoiceNumber}`,
              created_by: user?.name || user?.username || '',
              created_at: nowIso,
            };
            await db.payments.add(paymentRecord).catch(() => {});
            await syncEngine.enqueue('create', 'payments', paymentId, paymentRecord);
          }
        } catch (e) {
          console.warn('[PoS] Failed to update customer debt balance:', e);
        }
      }

      // 4. Update cash session
      if (finalMethod === 'cash' && effectivePaid > 0 && hasOpenSession) {
        try {
          const s = await getOpenSession();
          if (s) await addToSessionSales(s.id, effectivePaid);
        } catch {}
      }

      // 5. Print invoice safely without blocking checkout completion
      const invoiceData: PrintInvoiceData = {
        number: invoiceNumber,
        date: nowIso,
        items: cart.map((c) => ({
          name: c.name,
          qty: c.qty,
          unitPrice: c.unitPrice,
          lineTotal: c.lineTotal,
        })),
        subtotal,
        discount,
        tvaAmount: tax,
        total,
        paymentMethod: finalMethod,
        customerName: selectedCustomer?.name || '',
        soldBy: user?.name || '',
      };

      try {
        await printViaDesktop(invoiceData).catch(() => false);
      } catch (printErr) {
        console.warn('[PoS] Print attempt failed safely:', printErr);
      }

      setLastSaleId(saleId);
      setLastInvoiceData(invoiceData);
      setCompletedInvoiceNum(invoiceNumber);
      setCompletedChangeDue(changeDue);

      setShowCheckoutModal(false);
      setShowSuccessModal(true);

      setCart([]);
      setSelectedCustomer(null);
      setDiscountValue('0');
      setSearch('');
      setCheckoutNote('');
      loadData();
      syncEngine.processQueue().catch(() => {});
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ الفاتورة: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>{t('pos.loadingProducts')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Session Alert Warning Banner */}
      {!hasOpenSession && (
        <View style={[styles.sessionWarningBanner, { backgroundColor: colors.warning.light, borderBottomColor: colors.warning.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AlertTriangle size={16} color={colors.warning.dark} />
          <Text style={[styles.sessionWarningText, { color: colors.warning.text }]}>
            {t('pos.sessionClosedWarning')}
          </Text>
        </View>
      )}

      {/* Top License Trial Banner */}
      <View style={[styles.licenseBanner, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : colors.primary[50], borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.primary[200], flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.licenseUpgradeBtn} activeOpacity={0.8}>
          <ArrowUpRight size={14} color="#ffffff" />
          <Text style={styles.licenseUpgradeBtnText}>{t('pos.upgradeBtn')}</Text>
        </TouchableOpacity>
        <View style={[styles.licenseBannerContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.licenseBannerTitle, { color: isDark ? '#ffffff' : colors.text.primary }]}>
            {t('pos.freeVersionBanner')}
          </Text>
          <Text style={[styles.licenseBannerSubtitle, { color: isDark ? colors.slate[400] : colors.text.secondary }]}>
            0/50 • 0/10
          </Text>
        </View>
        <View style={[styles.licenseFlaskIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primary[100] }]}>
          <FlaskConical size={18} color={isDark ? '#60a5fa' : colors.primary[600]} />
        </View>
      </View>

      {/* Quick Action Pills: Customer & Open Shift */}
      <View style={[styles.topActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[
            styles.topActionPill,
            selectedCustomer
              ? { backgroundColor: isDark ? '#1e3a8a' : colors.primary[100], borderColor: colors.primary[400] }
              : { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default },
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => setShowCustomerPicker(true)}
          activeOpacity={0.7}
        >
          <UserPlus size={15} color={isDark ? '#93c5fd' : colors.primary[600]} />
          <Text style={[styles.topActionPillText, { color: isDark ? '#93c5fd' : colors.primary[700] }]}>
            {selectedCustomer?.name ? `${t('pos.customer')}: ${selectedCustomer.name}` : `+ ${t('pos.customer')}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topActionPill, { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => navigation.navigate('Cash')}
          activeOpacity={0.7}
        >
          <Store size={15} color={isDark ? '#94a3b8' : colors.slate[600]} />
          <Text style={[styles.topActionPillText, { color: isDark ? '#cbd5e1' : colors.text.primary }]}>
            {hasOpenSession ? t('pos.openShiftActive') : t('pos.openShiftBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top Search & Toolbar */}
      <View style={styles.searchBarWrapper}>
        <View style={[styles.searchBarContainer, { backgroundColor: isDark ? '#111827' : colors.surface, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Left Icon Actions */}
          <View style={[styles.searchLeftIcons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* View Mode Toggle: Grid or List */}
            <TouchableOpacity
              style={[styles.searchIconBtn, { backgroundColor: isDark ? '#1f2937' : colors.slate[100] }]}
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              activeOpacity={0.7}
            >
              {viewMode === 'grid' ? (
                <List size={18} color={isDark ? '#94a3b8' : colors.slate[600]} />
              ) : (
                <LayoutGrid size={18} color={isDark ? '#94a3b8' : colors.slate[600]} />
              )}
            </TouchableOpacity>

            {/* Barcode Scanner */}
            <TouchableOpacity
              style={[styles.searchIconBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50] }]}
              onPress={() => setShowCameraScanner(true)}
              activeOpacity={0.7}
            >
              <ScanLine size={19} color={isDark ? '#60a5fa' : colors.primary[600]} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <TextInput
            style={[styles.searchTextInput, { color: colors.text.primary, textAlign }]}
            placeholder={t('pos.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={isDark ? '#64748b' : colors.slate[400]}
          />

          <Search size={18} color={isDark ? '#64748b' : colors.slate[400]} style={styles.searchRightIcon} />
        </View>
      </View>

      {/* Category Pills Bar */}
      <View style={styles.categoryBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {/* All Filter */}
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === null
                ? { backgroundColor: colors.primary[600], borderColor: colors.primary[600] }
                : { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default },
            ]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === null ? { color: '#ffffff', fontWeight: '800' } : { color: colors.text.secondary },
              ]}
            >
              {t('common.all')}
            </Text>
          </TouchableOpacity>

          {/* Featured Filter */}
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'featured'
                ? { backgroundColor: colors.primary[600], borderColor: colors.primary[600] }
                : { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default },
            ]}
            onPress={() => setSelectedCategory(selectedCategory === 'featured' ? null : 'featured')}
            activeOpacity={0.7}
          >
            <Star size={13} color={selectedCategory === 'featured' ? '#ffffff' : '#f59e0b'} style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === 'featured' ? { color: '#ffffff', fontWeight: '800' } : { color: colors.text.secondary },
              ]}
            >
              {t('dashboard.topProducts')}
            </Text>
          </TouchableOpacity>

          {/* Packs Category */}
          {packs.length > 0 && (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === 'packs'
                  ? { backgroundColor: colors.purple[600], borderColor: colors.purple[600] }
                  : { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default },
              ]}
              onPress={() => setSelectedCategory(selectedCategory === 'packs' ? null : 'packs')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === 'packs' ? { color: '#ffffff', fontWeight: '800' } : { color: colors.purple[400] },
                ]}
              >
                📦 {t('promotions.packsTitle')} ({packs.length})
              </Text>
            </TouchableOpacity>
          )}

          {/* Dynamic DB Categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isSelected
                    ? { backgroundColor: colors.primary[600], borderColor: colors.primary[600] }
                    : { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default },
                ]}
                onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected ? { color: '#ffffff', fontWeight: '800' } : { color: colors.text.secondary },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Product Catalog Grid / List */}
      <ScrollView
        style={styles.catalogArea}
        contentContainerStyle={styles.catalogContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package size={28} color={colors.slate[400]} />}
            title={t('inventory.noProductsFound')}
            description={t('inventory.noProductsFound')}
          />
        ) : viewMode === 'grid' ? (
          /* Grid View Mode */
          <View style={styles.gridContainer}>
            {filtered.map((product) => {
              const inCartItem = cart.find((c) => c.productId === product.id);

              return (
                <TouchableOpacity
                  key={product.id}
                  activeOpacity={0.75}
                  style={[
                    styles.gridCard,
                    {
                      backgroundColor: isDark ? '#111827' : colors.surface,
                      borderColor: inCartItem ? colors.primary[500] : isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.default,
                    },
                    inCartItem && { borderWidth: 2 },
                  ]}
                  onPress={() => handleProductPress(product)}
                >
                  {inCartItem ? (
                    <View style={[styles.inCartBadge, { backgroundColor: colors.primary[600] }]}>
                      <Text style={styles.inCartBadgeText}>{inCartItem.qty}</Text>
                    </View>
                  ) : null}

                  {/* Top Product Image Box */}
                  <View style={[styles.gridImageWrapper, { backgroundColor: isDark ? '#1f2937' : colors.slate[100] }]}>
                    {product.image ? (
                      <Image source={{ uri: product.image }} style={styles.gridImage} resizeMode="cover" />
                    ) : (
                      <Package size={34} color={isDark ? '#475569' : colors.slate[400]} />
                    )}
                  </View>

                  {/* Product Card Info */}
                  <View style={styles.gridCardBody}>
                    <Text style={[styles.gridCardName, { color: colors.text.primary }]} numberOfLines={1}>
                      {product.name}
                    </Text>

                    <View style={[styles.gridStockBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}>
                      <Text style={[styles.gridStockText, { color: isDark ? '#34d399' : '#059669' }]}>
                        • {product.quantity} {product.unit || t('inventory.unitPiece')}
                      </Text>
                    </View>

                    <View style={styles.gridPriceRow}>
                      <Text style={[styles.gridCurrency, { color: colors.text.tertiary }]}>{currency}</Text>
                      <Text style={[styles.gridPrice, { color: isDark ? '#34d399' : colors.emerald[700] }]}>
                        {product.retailPrice.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* List View Mode */
          <View style={styles.listContainer}>
            {filtered.map((product) => {
              const inCartItem = cart.find((c) => c.productId === product.id);

              return (
                <TouchableOpacity
                  key={product.id}
                  activeOpacity={0.75}
                  style={[
                    styles.listCard,
                    {
                      backgroundColor: isDark ? '#111827' : colors.surface,
                      borderColor: inCartItem ? colors.primary[500] : isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.default,
                    },
                    inCartItem && { borderWidth: 2 },
                  ]}
                  onPress={() => handleProductPress(product)}
                >
                  {inCartItem ? (
                    <View style={[styles.inCartBadge, { backgroundColor: colors.primary[600] }]}>
                      <Text style={styles.inCartBadgeText}>{inCartItem.qty}</Text>
                    </View>
                  ) : null}

                  {/* Left: Price & Currency */}
                  <View style={styles.listLeftColumn}>
                    <Text style={[styles.listPrice, { color: isDark ? '#34d399' : colors.emerald[700] }]}>
                      {product.retailPrice.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.listCurrency, { color: colors.text.tertiary }]}>{currency}</Text>
                  </View>

                  {/* Middle: Name, Stock & Barcode */}
                  <View style={styles.listMiddleColumn}>
                    <Text style={[styles.listCardName, { color: colors.text.primary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <View style={styles.listMetaRow}>
                      <View style={[styles.listStockBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}>
                        <Text style={[styles.listStockText, { color: isDark ? '#34d399' : '#059669' }]}>
                          {product.quantity} {product.unit || t('inventory.unitPiece')}
                        </Text>
                      </View>
                      {product.barcode ? (
                        <Text style={[styles.listBarcode, { color: colors.text.tertiary }]}>
                          {product.barcode}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Right: Thumbnail Image */}
                  <View style={[styles.listImageWrapper, { backgroundColor: isDark ? '#1f2937' : colors.slate[100] }]}>
                    {product.image ? (
                      <Image source={{ uri: product.image }} style={styles.listImage} resizeMode="cover" />
                    ) : (
                      <Package size={24} color={isDark ? '#475569' : colors.slate[400]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Cart & Checkout Sheet */}
      <View style={[styles.cartSheet, { backgroundColor: colors.surface, borderTopColor: colors.border.default }]}>
        {cart.length > 0 ? (
          <ScrollView
            style={styles.cartItemsScroll}
            showsVerticalScrollIndicator={false}
          >
            {cart.map((item) => (
              <View key={item.productId} style={[styles.cartItemRow, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.productId)}
                  style={styles.cartDeleteBtn}
                >
                  <Trash2 size={15} color={colors.danger.main} />
                </TouchableOpacity>

                <Text style={[styles.cartItemLineTotal, { color: colors.text.primary }]}>
                  {item.lineTotal.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} {currency}
                </Text>

                <View style={[styles.cartQtyControls, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100], flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    onPress={() => updateQty(item.productId, 1)}
                    style={styles.qtyStepBtn}
                  >
                    <Plus size={13} color={colors.text.primary} />
                  </TouchableOpacity>

                  <Text style={[styles.cartQtyNumber, { color: colors.text.primary }]}>{item.qty}</Text>

                  <TouchableOpacity
                    onPress={() => updateQty(item.productId, -1)}
                    style={styles.qtyStepBtn}
                  >
                    <Minus size={13} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.cartItemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.cartItemName, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                    {item.promoName ? (
                      <Badge variant="purple" size="xs">
                        {item.promoName}
                      </Badge>
                    ) : null}
                    <Text style={[styles.cartItemUnitPrice, { color: colors.text.tertiary }]}>
                      {item.unitPrice.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} {currency}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* Totals Summary */}
        <View style={styles.cartFooter}>
          <View style={[styles.totalsSummaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.totalBlock, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
              <Text style={[styles.totalLabel, { color: colors.text.secondary }]}>{t('pos.totalDue')}</Text>
              <Text style={[styles.grandTotalValue, { color: colors.primary[600] }]}>
                {total.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} <Text style={styles.currency}>{currency}</Text>
              </Text>
            </View>

            {discount > 0 ? (
              <View style={[styles.discountBlock, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.discountLabel, { color: colors.warning.text }]}>{t('pos.discount')}</Text>
                <Text style={[styles.discountAmount, { color: colors.warning.text }]}>
                  -{discount.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} {currency}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Row */}
          <View style={[styles.cartActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' },
                cart.length === 0 && styles.checkoutButtonDisabled,
              ]}
              onPress={handleCheckoutTap}
              disabled={cart.length === 0 || checkoutLoading}
              activeOpacity={0.8}
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <ShoppingCart size={18} color="#ffffff" />
                  <Text style={styles.checkoutBtnText}>
                    {t('pos.checkout')} ({cart.reduce((s, i) => s + i.qty, 0)})
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.suspendBtn,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border.default },
                cart.length === 0 && { opacity: 0.5 },
              ]}
              onPress={handleSuspend}
              disabled={cart.length === 0}
              activeOpacity={0.7}
            >
              <RotateCcw size={16} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Customer Picker Modal */}
      <Modal
        visible={showCustomerPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('pos.selectCustomer')}</Text>
            </View>

            <View style={[styles.modalSearchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.modalSearch, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[100], flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Search size={16} color={colors.slate[400]} />
                <TextInput
                  style={[styles.modalSearchInput, { color: colors.text.primary, textAlign }]}
                  placeholder={t('customers.searchPlaceholder')}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholderTextColor={colors.slate[400]}
                />
              </View>
              <TouchableOpacity
                style={[styles.quickAddCustBtn, { backgroundColor: colors.primary[600] }]}
                onPress={() => setShowNewCustomerModal(true)}
              >
                <UserPlus size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.customerOption,
                  { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  !selectedCustomer && { backgroundColor: colors.primary[50] },
                ]}
                onPress={() => {
                  setSelectedCustomer(null);
                  setShowCustomerPicker(false);
                }}
              >
                {!selectedCustomer ? (
                  <Check size={16} color={colors.primary[600]} />
                ) : null}
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flex: 1 }}>
                  <Text style={[styles.customerOptionName, { color: colors.text.primary }]}>{t('pos.guestCustomer')}</Text>
                  <Text style={[styles.customerOptionSub, { color: colors.text.tertiary }]}>{t('customers.settledBalance')}</Text>
                </View>
              </TouchableOpacity>

              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <TouchableOpacity
                    key={cust.id}
                    style={[
                      styles.customerOption,
                      { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' },
                      isSelected && { backgroundColor: colors.primary[50] },
                    ]}
                    onPress={() => {
                      setSelectedCustomer(cust);
                      setShowCustomerPicker(false);
                    }}
                  >
                    {isSelected ? (
                      <Check size={16} color={colors.primary[600]} />
                    ) : null}
                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flex: 1 }}>
                      <Text style={[styles.customerOptionName, { color: colors.text.primary }]}>{cust.name}</Text>
                      <Text style={[styles.customerOptionSub, { color: colors.text.tertiary }]}>
                        {cust.phone || '-'} • {t('customers.debt')}: {cust.balance || 0} {currency}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Add New Customer Modal */}
      <Modal
        visible={showNewCustomerModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowNewCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, maxHeight: 380 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setShowNewCustomerModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('customers.addNewCustomer')}</Text>
            </View>

            <ScrollView style={{ padding: spacing.lg }}>
              <Input
                label={t('customers.name')}
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                placeholder={t('customers.name')}
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label={t('customers.phone')}
                keyboardType="phone-pad"
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                placeholder="0550 00 00 00"
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label={t('customers.creditLimit')}
                keyboardType="numeric"
                value={newCustomerCreditLimit}
                onChangeText={setNewCustomerCreditLimit}
                placeholder="0"
                containerStyle={{ marginBottom: spacing.md }}
              />

              <Button
                title={t('common.save')}
                onPress={handleQuickCreateCustomer}
                variant="primary"
                style={{ marginTop: spacing.xs }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Manual Item Modal */}
      <Modal
        visible={showCustomItemModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCustomItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, maxHeight: 360 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setShowCustomItemModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('pos.customItem')}</Text>
            </View>

            <View style={{ padding: spacing.lg }}>
              <Input
                label={t('pos.customItem')}
                value={customItemName}
                onChangeText={setCustomItemName}
                placeholder={t('pos.customItem')}
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label={t('pos.price')}
                keyboardType="numeric"
                value={customItemPrice}
                onChangeText={setCustomItemPrice}
                placeholder="0"
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label={t('pos.quantity')}
                keyboardType="numeric"
                value={customItemQty}
                onChangeText={setCustomItemQty}
                placeholder="1"
                containerStyle={{ marginBottom: spacing.md }}
              />

              <Button
                title={t('pos.checkout')}
                onPress={handleAddCustomItem}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDiscountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, maxHeight: 320 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('pos.discount')}</Text>
            </View>

            <View style={[styles.discountToggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[
                  styles.discountToggleBtn,
                  discountType === 'amount' && { backgroundColor: colors.primary[600] },
                ]}
                onPress={() => setDiscountType('amount')}
              >
                <Text
                  style={[
                    styles.discountToggleText,
                    discountType === 'amount' && { color: '#ffffff' },
                  ]}
                >
                  {t('pos.discountAmount')} ({currency})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.discountToggleBtn,
                  discountType === 'percent' && { backgroundColor: colors.primary[600] },
                ]}
                onPress={() => setDiscountType('percent')}
              >
                <Text
                  style={[
                    styles.discountToggleText,
                    discountType === 'percent' && { color: '#ffffff' },
                  ]}
                >
                  {t('pos.discountPercent')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: spacing.lg }}>
              <Input
                label={t('pos.discount')}
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder="0"
              />

              <Button
                title={t('pos.applyDiscount')}
                onPress={() => setShowDiscountModal(false)}
                style={{ marginTop: spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced Checkout Payment Modal with DocType & Change Calculation */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, maxHeight: '88%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('pos.checkout')}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg }}>
              {/* Document Type Selector */}
              <Text style={[styles.fieldLabel, { color: colors.text.secondary, textAlign }]}>{t('pos.docType')}</Text>
              <View style={[styles.docTypeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[
                  { id: 'facture', label: t('pos.invoice') },
                  { id: 'bl', label: t('pos.deliveryNote') },
                  { id: 'devis', label: t('pos.quote') },
                  { id: 'proforma', label: t('pos.proforma') },
                ].map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[
                      styles.docTypeChip,
                      selectedDocType === doc.id
                        ? { backgroundColor: colors.primary[600], borderColor: colors.primary[600] }
                        : { backgroundColor: colors.surfaceSubtle, borderColor: colors.border.default },
                    ]}
                    onPress={() => setSelectedDocType(doc.id as any)}
                  >
                    <Text
                      style={[
                        styles.docTypeChipText,
                        selectedDocType === doc.id ? { color: '#ffffff' } : { color: colors.text.secondary },
                      ]}
                    >
                      {doc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Summary Card */}
              <View style={[styles.checkoutSummaryCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50] }]}>
                <Text style={[styles.checkoutTotalLabel, { color: colors.text.secondary }]}>{t('pos.totalDue')}</Text>
                <Text style={[styles.checkoutTotalAmount, { color: colors.primary[700] }]}>
                  {total.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} <Text style={styles.currency}>{currency}</Text>
                </Text>
                <Text style={[styles.checkoutCustomerName, { color: colors.text.secondary }]}>
                  {t('pos.customer')}: {selectedCustomer?.name || t('pos.guestCustomer')}
                </Text>
              </View>

              {/* Payment Method Selector */}
              <Text style={[styles.fieldLabel, { color: colors.text.secondary, marginTop: spacing.md, textAlign }]}>{t('pos.paymentMethod')}</Text>
              <View style={[styles.paymentMethodsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'cash' && { borderColor: colors.emerald[600], borderWidth: 2, backgroundColor: colors.emerald[50] },
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Banknote size={22} color={colors.emerald[700]} />
                  <Text style={[styles.paymentMethodTitle, { color: colors.text.primary }]}>{t('pos.cash')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'card' && { borderColor: colors.primary[600], borderWidth: 2, backgroundColor: colors.primary[50] },
                  ]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <CreditCard size={22} color={colors.primary[600]} />
                  <Text style={[styles.paymentMethodTitle, { color: colors.text.primary }]}>{t('pos.card')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'credit' && { borderColor: colors.warning.dark, borderWidth: 2, backgroundColor: colors.warning.light },
                  ]}
                  onPress={() => setPaymentMethod('credit')}
                >
                  <FileText size={22} color={colors.warning.dark} />
                  <Text style={[styles.paymentMethodTitle, { color: colors.text.primary }]}>{t('pos.credit')}</Text>
                </TouchableOpacity>
              </View>

              {/* Paid Input & Change Calculation */}
              <View style={{ marginTop: spacing.md }}>
                <Input
                  label={t('pos.amountPaid')}
                  keyboardType="numeric"
                  value={paidInput}
                  onChangeText={setPaidInput}
                  placeholder={total.toFixed(0)}
                />

                {/* Quick Cash Shortcuts */}
                <View style={[styles.cashShortcutsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {cashShortcuts.map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.cashShortcutChip, { backgroundColor: colors.surfaceSubtle }]}
                      onPress={() => setPaidInput(s.val.toFixed(0))}
                    >
                      <Text style={[styles.cashShortcutText, { color: colors.text.primary }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Change or Debt Banner */}
                {changeDue > 0 ? (
                  <View style={[styles.changeBanner, { backgroundColor: colors.emerald[50], borderColor: colors.emerald[200], flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Coins size={18} color={colors.emerald[700]} />
                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flex: 1 }}>
                      <Text style={[styles.changeBannerLabel, { color: colors.emerald[700] }]}>{t('pos.change')}:</Text>
                      <Text style={[styles.changeBannerVal, { color: colors.emerald[700] }]}>
                        {changeDue.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} {currency}
                      </Text>
                    </View>
                  </View>
                ) : remainingDebt > 0 ? (
                  <View style={[styles.changeBanner, { backgroundColor: colors.warning.light, borderColor: colors.warning.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <ShieldAlert size={18} color={colors.warning.dark} />
                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flex: 1 }}>
                      <Text style={[styles.changeBannerLabel, { color: colors.warning.text }]}>{t('pos.remaining')}:</Text>
                      <Text style={[styles.changeBannerVal, { color: colors.warning.text }]}>
                        {remainingDebt.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} {currency}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Note Input */}
              <Input
                label={t('pos.notePlaceholder')}
                value={checkoutNote}
                onChangeText={setCheckoutNote}
                placeholder={t('pos.notePlaceholder')}
                containerStyle={{ marginTop: spacing.md }}
              />

              <Button
                title={checkoutLoading ? '...' : t('pos.checkout')}
                onPress={handlePaymentConfirm}
                disabled={checkoutLoading}
                variant="primary"
                size="lg"
                style={{ marginTop: spacing.xl, marginBottom: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Suspended Orders Modal */}
      <Modal
        visible={showSuspendedModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSuspendedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setShowSuspendedModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('pos.suspendedOrders')}</Text>
            </View>

            <ScrollView style={styles.modalList}>
              {suspendedOrders.length === 0 ? (
                <EmptyState
                  icon={<Clock size={28} color={colors.slate[400]} />}
                  title={t('pos.noSuspendedOrders')}
                  description={t('pos.noSuspendedOrders')}
                />
              ) : (
                suspendedOrders.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.suspendedRow, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => resumeOrder(o)}
                  >
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Badge variant="primary" size="sm">
                        {t('pos.restoreOrder')}
                      </Badge>
                    </View>
                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flex: 1 }}>
                      <Text style={[styles.suspendedTitle, { color: colors.text.primary }]}>
                        {t('pos.cart')} ({o.items?.length || 0})
                      </Text>
                      <Text style={[styles.suspendedSub, { color: colors.text.tertiary }]}>
                        {o.customerName || t('pos.guestCustomer')} •{' '}
                        {new Date(o.suspendedAt).toLocaleTimeString(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Barcode Camera Scanner */}
      {showCameraScanner && (
        <CameraScanner
          onScan={handleBarcodeScan}
          onBatchComplete={() => setShowCameraScanner(false)}
          onClose={() => setShowCameraScanner(false)}
        />
      )}

      {/* Post-Sale Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, padding: spacing.xl, alignItems: 'center', maxHeight: 380 }]}>
            <View style={[styles.successIconCircle, { backgroundColor: colors.success.light }]}>
              <CheckCircle2 size={40} color={colors.success.dark} />
            </View>

            <Text style={[styles.successModalTitle, { color: colors.text.primary }]}>
              {t('pos.saleCompleted')} ✓
            </Text>
            <Text style={[styles.successModalInvoiceNum, { color: colors.primary[600] }]}>
              {completedInvoiceNum}
            </Text>

            {completedChangeDue > 0 && (
              <View style={[styles.successChangeBox, { backgroundColor: colors.emerald[50], borderColor: colors.emerald[200], flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Coins size={18} color={colors.emerald[700]} />
                <Text style={[styles.successChangeText, { color: colors.emerald[700] }]}>
                  {t('pos.change')}: {completedChangeDue.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR')} {currency}
                </Text>
              </View>
            )}

            <View style={[styles.successActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Button
                title={t('sales.previewTemplate')}
                icon={<Printer size={18} color="#fff" />}
                onPress={() => {
                  setShowSuccessModal(false);
                  setShowPrintModal(true);
                }}
                variant="primary"
                style={{ flex: 1 }}
              />
              <Button
                title={t('pos.newSale')}
                icon={<Plus size={18} color={colors.text.primary} />}
                onPress={() => setShowSuccessModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Price Selection Modal for Custom Prices & Wholesale */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPriceModal(false)}
        >
          <View
            style={styles.priceModalCard}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={[styles.priceModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.priceModalTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.priceModalTitle}>
                  {priceModalProduct?.name || 'تحديد السعر والكمية'}
                </Text>
                <View style={[styles.priceModalMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {priceModalProduct?.category ? (
                    <View style={styles.priceModalBadge}>
                      <Text style={styles.priceModalBadgeText}>{priceModalProduct.category}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.priceModalStockText}>
                    المتوفر: {priceModalProduct?.quantity || 0} {priceModalProduct?.unit || 'قطعة'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.priceModalCloseBtn}
                onPress={() => setShowPriceModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280, marginVertical: spacing.sm }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.priceModalSectionTitle, { textAlign }]}>
                اختر السعر المناسب للبيع:
              </Text>

              <View style={styles.priceOptionsList}>
                {/* 1. Default Retail Price */}
                <TouchableOpacity
                  style={[
                    styles.priceOptionCard,
                    selectedPriceOption?.label === 'سعر البيع الافتراضي' && styles.priceOptionCardActive,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                  onPress={() => {
                    if (!priceModalProduct) return;
                    setSelectedPriceOption({
                      label: 'سعر البيع الافتراضي',
                      price: priceModalProduct.retailPrice,
                      isCustom: false,
                    });
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.priceOptionIconBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]}>
                    <Tag size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                  </View>
                  <View style={[styles.priceOptionTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={styles.priceOptionName}>سعر البيع الافتراضي (تجزئة)</Text>
                    <Text style={styles.priceOptionUnit}>الوحدة: {priceModalProduct?.unit || 'قطعة'}</Text>
                  </View>
                  <View style={styles.priceOptionAmountBox}>
                    <Text style={styles.priceOptionAmount}>
                      {priceModalProduct?.retailPrice} {currency}
                    </Text>
                    {selectedPriceOption?.label === 'سعر البيع الافتراضي' ? (
                      <CheckCircle2 size={18} color={colors.primary[500]} />
                    ) : null}
                  </View>
                </TouchableOpacity>

                {/* 2. Wholesale Price (if set) */}
                {priceModalProduct?.wholesalePrice && priceModalProduct.wholesalePrice > 0 ? (
                  <TouchableOpacity
                    style={[
                      styles.priceOptionCard,
                      selectedPriceOption?.label === 'سعر الجملة' && styles.priceOptionCardActive,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => {
                      setSelectedPriceOption({
                        label: 'سعر الجملة',
                        price: priceModalProduct.wholesalePrice!,
                        isCustom: false,
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.priceOptionIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' }]}>
                      <Store size={18} color={isDark ? '#34d399' : '#059669'} />
                    </View>
                    <View style={[styles.priceOptionTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={styles.priceOptionName}>سعر الجملة</Text>
                      {priceModalProduct.wholesaleMinQty && priceModalProduct.wholesaleMinQty > 0 ? (
                        <Text style={styles.priceOptionUnit}>أدنى كمية: {priceModalProduct.wholesaleMinQty}</Text>
                      ) : null}
                    </View>
                    <View style={styles.priceOptionAmountBox}>
                      <Text style={styles.priceOptionAmount}>
                        {priceModalProduct.wholesalePrice} {currency}
                      </Text>
                      {selectedPriceOption?.label === 'سعر الجملة' ? (
                        <CheckCircle2 size={18} color={colors.primary[500]} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* 3. Custom Prices */}
                {(() => {
                  const raw = (priceModalProduct as any)?.customPrices ?? (priceModalProduct as any)?.custom_prices;
                  let list: any[] = [];
                  if (raw) {
                    try {
                      list = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
                    } catch {
                      list = [];
                    }
                  }
                  return list.map((cp: any) => {
                    const isSelected = selectedPriceOption?.label === cp.name;
                    const priceNum = Number(cp.price) || 0;
                    return (
                      <TouchableOpacity
                        key={cp.id || cp.name}
                        style={[
                          styles.priceOptionCard,
                          isSelected && styles.priceOptionCardActive,
                          { flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}
                        onPress={() => {
                          setSelectedPriceOption({
                            label: cp.name,
                            price: priceNum,
                            isCustom: true,
                            barcode: cp.barcode,
                          });
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.priceOptionIconBox, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : '#f5f3ff' }]}>
                          <Sparkles size={18} color={isDark ? '#c084fc' : '#9333ea'} />
                        </View>
                        <View style={[styles.priceOptionTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                          <Text style={styles.priceOptionName}>{cp.name}</Text>
                          {cp.barcode ? (
                            <Text style={styles.priceOptionUnit}>باركود: {cp.barcode}</Text>
                          ) : null}
                        </View>
                        <View style={styles.priceOptionAmountBox}>
                          <Text style={styles.priceOptionAmount}>
                            {priceNum} {currency}
                          </Text>
                          {isSelected ? (
                            <CheckCircle2 size={18} color={colors.primary[500]} />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            </ScrollView>

            {/* Quantity Selector Box */}
            <View style={styles.priceModalQtyBox}>
              <View style={[styles.priceModalQtyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.priceModalQtyLabel}>الكمية:</Text>
                <View style={[styles.qtyCounterGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={styles.qtyCounterBtn}
                    onPress={() => setPriceModalQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyCounterVal}>{priceModalQty}</Text>
                  <TouchableOpacity
                    style={styles.qtyCounterBtn}
                    onPress={() => setPriceModalQty((q) => q + 1)}
                  >
                    <Plus size={16} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Qty Chips */}
              <View style={[styles.quickQtyChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[1, 2, 5, 10].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.quickQtyChip,
                      priceModalQty === q && styles.quickQtyChipActive,
                    ]}
                    onPress={() => setPriceModalQty(q)}
                  >
                    <Text
                      style={[
                        styles.quickQtyChipText,
                        priceModalQty === q && styles.quickQtyChipTextActive,
                      ]}
                    >
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Total and Action Button */}
            <View style={[styles.priceModalFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.priceModalTotalBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.priceModalTotalLabel}>الإجمالي:</Text>
                <Text style={styles.priceModalTotalVal}>
                  {((selectedPriceOption?.price || 0) * priceModalQty).toLocaleString()} {currency}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.priceModalAddBtn}
                onPress={() => {
                  if (!priceModalProduct || !selectedPriceOption) return;
                  addToCart(
                    priceModalProduct,
                    priceModalQty,
                    selectedPriceOption.label === 'سعر البيع الافتراضي'
                      ? undefined
                      : {
                          label: selectedPriceOption.label,
                          price: selectedPriceOption.price,
                          isCustom: selectedPriceOption.isCustom,
                        }
                  );
                  setShowPriceModal(false);
                  notify.success(
                    `تمت إضافة ${priceModalProduct.name} (${selectedPriceOption.label})`,
                    t('pos.cart')
                  );
                }}
                activeOpacity={0.85}
              >
                <ShoppingCart size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                <Text style={styles.priceModalAddBtnText}>إضافة إلى السلة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Invoice Print Preview Modal */}
      {showPrintModal && (
        <InvoicePrintPreviewModal
          visible={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          saleId={lastSaleId}
          invoiceData={lastInvoiceData}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    loadingText: {
      fontSize: 13,
      fontFamily: 'Cairo',
    },

    sessionWarningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderBottomWidth: 1,
    },
    sessionWarningText: {
      fontSize: 11,
      fontWeight: '600',
      fontFamily: 'Cairo',
      flex: 1,
      textAlign: 'right',
    },

    // License Banner
    licenseBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.xxl,
      borderWidth: 1,
    },
    licenseUpgradeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3b82f6',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radii.pill,
      gap: 4,
    },
    licenseUpgradeBtnText: {
      color: '#ffffff',
      fontSize: 11.5,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    licenseBannerContent: {
      flex: 1,
      alignItems: 'flex-end',
      marginRight: spacing.sm,
    },
    licenseBannerTitle: {
      fontSize: 12,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    licenseBannerSubtitle: {
      fontSize: 10,
      fontFamily: 'Cairo',
      marginTop: 1,
    },
    licenseFlaskIcon: {
      width: 32,
      height: 32,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Top Actions Row (+ عميل, فتح مناوبة)
    topActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.md,
      marginTop: 6,
      marginBottom: 6,
      gap: spacing.xs + 2,
    },
    topActionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.xl,
      borderWidth: 1,
    },
    topActionPillText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },

    // Search Bar
    searchBarWrapper: {
      paddingHorizontal: spacing.md,
      marginBottom: 6,
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.xxl,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      height: 48,
    },
    searchLeftIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    searchIconBtn: {
      width: 34,
      height: 34,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchTextInput: {
      flex: 1,
      fontFamily: 'Cairo',
      fontSize: 12.5,
      paddingHorizontal: spacing.sm,
    },
    searchRightIcon: {
      marginLeft: 4,
    },

    // Categories Bar
    categoryBarWrapper: {
      paddingVertical: 4,
      marginBottom: 2,
    },
    categoryBar: {
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md + 2,
      paddingVertical: 6,
      borderRadius: radii.xl,
      borderWidth: 1,
    },
    categoryChipText: {
      fontSize: 12,
      fontFamily: 'Cairo',
    },

    // Catalog Area
    catalogArea: {
      flex: 1,
    },
    catalogContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: 220,
    },

    // Grid View Card
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    gridCard: {
      width: '48.2%',
      borderRadius: radii.xxl,
      borderWidth: 1,
      padding: spacing.xs + 2,
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 4,
      ...shadows.xs,
    },
    gridImageWrapper: {
      width: '100%',
      height: 136,
      borderRadius: radii.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridImage: {
      width: '100%',
      height: '100%',
    },
    gridCardBody: {
      paddingHorizontal: 2,
      paddingTop: spacing.xs + 2,
      paddingBottom: 2,
    },
    gridCardName: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
      textAlign: 'right',
      marginBottom: 6,
    },
    gridStockBadge: {
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.pill,
      marginBottom: 8,
    },
    gridStockText: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    gridPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    gridCurrency: {
      fontSize: 10.5,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    gridPrice: {
      fontSize: 14.5,
      fontWeight: '900',
      fontFamily: 'Cairo',
    },

    // List View Card
    listContainer: {
      gap: spacing.sm,
    },
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: radii.xxl,
      borderWidth: 1,
      padding: spacing.sm + 2,
      position: 'relative',
      overflow: 'hidden',
      ...shadows.xs,
    },
    listLeftColumn: {
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    listPrice: {
      fontSize: 14.5,
      fontWeight: '900',
      fontFamily: 'Cairo',
    },
    listCurrency: {
      fontSize: 10,
      fontWeight: '700',
      fontFamily: 'Cairo',
      marginTop: -2,
    },
    listMiddleColumn: {
      flex: 1,
      alignItems: 'flex-end',
      paddingHorizontal: spacing.sm,
    },
    listCardName: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
      textAlign: 'right',
      marginBottom: 4,
    },
    listMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    listStockBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    listStockText: {
      fontSize: 10.5,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    listBarcode: {
      fontSize: 10,
      fontFamily: 'Cairo',
    },
    listImageWrapper: {
      width: 58,
      height: 58,
      borderRadius: radii.lg,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listImage: {
      width: '100%',
      height: '100%',
    },

    // In-Cart Badge
    inCartBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    inCartBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '900',
      fontFamily: 'Cairo',
    },

    // Cart Bottom Sheet
    cartSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      ...shadows.lg,
      maxHeight: 340,
    },
    cartItemsScroll: {
      maxHeight: 140,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
    },
    cartItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs + 2,
      borderBottomWidth: 1,
    },
    cartDeleteBtn: {
      padding: 4,
      marginLeft: 2,
    },
    cartItemLineTotal: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
      minWidth: 70,
    },
    cartQtyControls: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.pill,
      paddingHorizontal: 4,
      gap: 6,
    },
    qtyStepBtn: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartQtyNumber: {
      fontSize: 12,
      fontWeight: '800',
      fontFamily: 'Cairo',
      minWidth: 16,
      textAlign: 'center',
    },
    cartItemInfo: {
      flex: 1,
      alignItems: 'flex-end',
      marginRight: spacing.sm,
    },
    cartItemName: {
      fontSize: 12.5,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    cartItemUnitPrice: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
    },

    // Cart Footer
    cartFooter: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
    },
    totalsSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    totalBlock: {
      alignItems: 'flex-start',
    },
    totalLabel: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
    },
    grandTotalValue: {
      fontSize: 18,
      fontWeight: '900',
      fontFamily: 'Cairo',
    },
    discountBlock: {
      alignItems: 'flex-end',
    },
    discountLabel: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
    },
    discountAmount: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },

    cartActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
    },
    checkoutButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md - 2,
      borderRadius: radii.xl,
    },
    checkoutButtonDisabled: {
      opacity: 0.5,
    },
    checkoutBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    suspendBtn: {
      width: 44,
      height: 44,
      borderRadius: radii.xl,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    modalSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    modalSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      height: 38,
    },
    modalSearchInput: {
      flex: 1,
      fontFamily: 'Cairo',
      fontSize: 12.5,
      paddingHorizontal: spacing.xs,
    },
    quickAddCustBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalList: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    customerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: 1,
      paddingHorizontal: spacing.xs,
      borderRadius: radii.md,
    },
    customerOptionName: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    customerOptionSub: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
      marginTop: 2,
    },

    discountToggleRow: {
      flexDirection: 'row',
      padding: spacing.md,
      gap: spacing.sm,
    },
    discountToggleBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[100],
    },
    discountToggleText: {
      fontSize: 12,
      fontFamily: 'Cairo',
      fontWeight: '700',
      color: colors.text.secondary,
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
      marginBottom: 6,
      textAlign: 'right',
    },
    docTypeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    docTypeChip: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    docTypeChipText: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },

    checkoutSummaryCard: {
      padding: spacing.md,
      borderRadius: radii.xl,
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    checkoutTotalLabel: {
      fontSize: 11,
      fontFamily: 'Cairo',
    },
    checkoutTotalAmount: {
      fontSize: 22,
      fontWeight: '900',
      fontFamily: 'Cairo',
      marginVertical: 2,
    },
    checkoutCustomerName: {
      fontSize: 11,
      fontFamily: 'Cairo',
    },

    paymentMethodsContainer: {
      flexDirection: 'row',
      gap: spacing.xs + 2,
    },
    paymentMethodCard: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.surfaceSubtle,
    },
    paymentMethodTitle: {
      fontSize: 11.5,
      fontWeight: '800',
      fontFamily: 'Cairo',
      marginTop: 4,
    },

    cashShortcutsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs + 2,
    },
    cashShortcutChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.md,
    },
    cashShortcutText: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
      fontWeight: '700',
    },

    changeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm + 2,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginTop: spacing.sm,
    },
    changeBannerLabel: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    changeBannerVal: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
      marginTop: 1,
    },

    suspendedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
    },
    suspendedTitle: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    suspendedSub: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
      marginTop: 2,
    },

    // Success Modal
    successIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    successModalTitle: {
      fontSize: 17,
      fontWeight: '800',
      fontFamily: 'Cairo',
      textAlign: 'center',
    },
    successModalInvoiceNum: {
      fontSize: 15,
      fontWeight: '900',
      fontFamily: 'Cairo',
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    successChangeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    successChangeText: {
      fontSize: 12.5,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    successActionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      width: '100%',
      marginTop: spacing.xs,
    },

    // Price Selection Modal Styles
    priceModalCard: {
      backgroundColor: isDark ? '#111827' : '#ffffff',
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      padding: spacing.lg,
      maxHeight: '85%',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
      ...shadows.lg,
    },
    priceModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
    },
    priceModalTitleBox: {
      flex: 1,
      gap: 2,
    },
    priceModalTitle: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    priceModalMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 2,
    },
    priceModalBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.sm,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    },
    priceModalBadgeText: {
      fontSize: 11,
      fontFamily: 'Cairo',
      fontWeight: '700',
      color: isDark ? '#60a5fa' : '#2563eb',
    },
    priceModalStockText: {
      fontSize: 11.5,
      fontFamily: 'Cairo',
      color: colors.text.secondary,
    },
    priceModalCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: radii.circle,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    },
    priceModalSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.secondary,
      marginVertical: spacing.xs,
    },
    priceOptionsList: {
      gap: spacing.xs + 2,
      marginVertical: spacing.xs,
    },
    priceOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      backgroundColor: isDark ? '#0c1322' : '#f8fafc',
      gap: spacing.sm,
    },
    priceOptionCardActive: {
      borderColor: colors.primary[500],
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
    },
    priceOptionIconBox: {
      width: 38,
      height: 38,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priceOptionTextBox: {
      flex: 1,
      gap: 1,
    },
    priceOptionName: {
      fontSize: 13.5,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    priceOptionUnit: {
      fontSize: 11,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
    },
    priceOptionAmountBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    priceOptionAmount: {
      fontSize: 15,
      fontWeight: '900',
      fontFamily: 'Cairo',
      color: isDark ? '#34d399' : '#059669',
    },
    priceModalQtyBox: {
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
      gap: spacing.xs,
    },
    priceModalQtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    priceModalQtyLabel: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    qtyCounterGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: isDark ? '#0c1322' : '#f1f5f9',
      borderRadius: radii.xl,
      padding: 3,
    },
    qtyCounterBtn: {
      width: 34,
      height: 34,
      borderRadius: radii.lg,
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.xs,
    },
    qtyCounterVal: {
      fontSize: 15,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
      minWidth: 28,
      textAlign: 'center',
    },
    quickQtyChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    quickQtyChip: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      backgroundColor: isDark ? '#0c1322' : '#f8fafc',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickQtyChipActive: {
      borderColor: colors.primary[500],
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
    },
    quickQtyChipText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.secondary,
    },
    quickQtyChipTextActive: {
      color: isDark ? '#60a5fa' : '#2563eb',
    },
    priceModalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
      gap: spacing.md,
    },
    priceModalTotalBox: {
      flex: 1,
    },
    priceModalTotalLabel: {
      fontSize: 11,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
    },
    priceModalTotalVal: {
      fontSize: 16,
      fontWeight: '900',
      fontFamily: 'Cairo',
      color: isDark ? '#34d399' : '#059669',
    },
    priceModalAddBtn: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary[600],
      paddingVertical: spacing.sm + 4,
      borderRadius: radii.xl,
      ...shadows.sm,
    },
    priceModalAddBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
  });

export default POSScreen;
