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
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { printInvoice, printViaDesktop, type PrintInvoiceData } from '@/lib/print';
import { getOpenSession, addToSessionSales } from '@/lib/cashSessionService';
import { suspendOrder, type SuspendedOrder, parseSuspendedItems } from '@/lib/suspendedOrderService';
import { notify } from '@/lib/notify';
import CameraScanner from '@/features/barcode/CameraScanner';
import InvoicePrintPreviewModal from '@/features/print/InvoicePrintPreviewModal';
import type { Product, Customer } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button, Input, EmptyState } from '@/components/ui';

interface CartItem {
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
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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

  useEffect(() => {
    loadData();
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

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await ensureInit();
      const [allProducts, allCustomers, allPromotions, allCategories, allPacks, session] = await Promise.all([
        db.products.toArray(),
        db.customers.toArray(),
        db.promotions.toArray().catch(() => []),
        db.categories.toArray().catch(() => []),
        db.packs.toArray().catch(() => []),
        getOpenSession(),
      ]);

      const mappedProducts: Product[] = allProducts.map((p: any) => ({
        ...p,
        id: p.id || p._id,
        name: p.name || p.productName,
        retailPrice: p.retailPrice || p.price || 0,
        wholesalePrice: p.wholesalePrice || 0,
        wholesaleMinQty: p.wholesaleMinQty || (p as any).wholesale_min_qty || 0,
        quantity: p.quantity || p.qty || 0,
        unit: p.unit || 'قطعة',
        barcode: p.barcode || '',
        sku: p.sku || '',
        category: p.category || '',
        status: p.status || 'active',
        lowStockThreshold: p.lowStockThreshold || 0,
        taxRate: p.taxRate || 0.19,
        image: p.image || p.imageUrl || p.image_url || null,
        quickSale: p.quickSale ?? (p.quick_sale === 1),
      }));
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
      setPromotions(allPromotions);
      setCategories(allCategories);
      setPacks(allPacks);
      setHasOpenSession(!!session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب البيانات');
    }
    setLoading(false);
  }

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
    (product: Product, customQty = 1) => {
      const promo = findPromotion(product.id);
      setCart((prev) => {
        const existing = prev.find((c) => c.productId === product.id);
        const newQty = existing ? existing.qty + customQty : customQty;

        // Check Wholesale Tier Pricing
        let basePrice = product.retailPrice;
        let promoTag = '';

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

        if (promo?.maxQuantity && newQty > promo.maxQuantity) return prev;

        if (existing) {
          return prev.map((c) =>
            c.productId === product.id
              ? {
                  ...c,
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
            productId: product.id,
            name: product.name,
            qty: customQty,
            unitPrice: basePrice,
            lineTotal: basePrice * customQty,
            promoName: promoTag,
          },
        ];
      });
    },
    [products, promotions]
  );

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
      Alert.alert('تنبيه', 'يرجى إدخال اسم البند المخصص');
      return;
    }
    if (price <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر صحيح أكبر من الصفر');
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
        promoName: 'بند حر',
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

    // 1️⃣ Search in products.barcode (primary)
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
    if (!found) {
      try {
        const rows = await db.productBarcodes.where('barcode').equals(code).toArray();
        if (rows && rows.length > 0) {
          found = products.find((p) => p.id === rows[0]?.product_id || rows[0]?.productId);
        }
      } catch {
        /* ignore */
      }
    }

    // 4️⃣ Search in packs table (bundles)
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
      addToCart(found);
      notify.success(`تمت إضافة "${found.name}" إلى السلة ✓`, 'سلة المبيعات');
    } else {
      if (mode === 'single') {
        Alert.alert(
          '🔍 لم يتم العثور على المنتج',
          `الباركود: ${code}\n\nتأكد من أن المنتج مُضاف في المخزون أو مسجل كباركود إضافي.`,
          [{ text: 'حسناً' }]
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
              promoName = 'سعر الجملة';
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
          unit: 'باقة',
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
      result = result.filter(
        (p) =>
          (p as any).category_id === selectedCategory ||
          (p as any).categoryId === selectedCategory ||
          p.category === selectedCategory
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
  const tax = afterDiscount * 0.19;
  const total = afterDiscount + tax;

  // Calculated Payment Change & Balance
  const numPaid = parseFloat(paidInput) || 0;
  const changeDue = Math.max(0, numPaid - total);
  const remainingDebt = Math.max(0, total - numPaid);

  const cashShortcuts = useMemo(() => {
    const rounded = Math.round(total);
    if (rounded <= 0) return [];
    const items = [
      { label: 'المبلغ بالضبط', val: rounded },
      { label: '+500 دج', val: rounded + 500 },
      { label: '+1000 دج', val: rounded + 1000 },
    ];
    const next1000 = Math.ceil(rounded / 1000) * 1000;
    if (next1000 > rounded && next1000 !== rounded + 500 && next1000 !== rounded + 1000) {
      items.push({ label: `${next1000} دج`, val: next1000 });
    } else {
      items.push({ label: '+2000 دج', val: rounded + 2000 });
    }
    return items;
  }, [total]);

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
    Alert.alert('تم بنجاح ✓', 'تم تعليق الطلب في قائمة الانتظار بنجاح');
  };

  const loadSuspended = async () => {
    const orders = await db.suspendedOrders.toArray();
    setSuspendedOrders(orders);
    setShowSuspendedModal(true);
  };

  const resumeOrder = async (order: SuspendedOrder) => {
    setCart(parseSuspendedItems(order));
    if (order.customerId) {
      const c = customers.find((x) => x.id === order.customerId);
      if (c) setSelectedCustomer(c);
    }
    try {
      await db.suspendedOrders.delete(order.id);
    } catch {
      /* ignore */
    }
    setShowSuspendedModal(false);
  };

  const handleCheckoutTap = () => {
    if (cart.length === 0) return;
    if (!hasOpenSession) {
      Alert.alert('تنبيه', 'يجب فتح الصندوق وبدء مناوبة أولاً قبل إجراء أي مبيعات');
      return;
    }
    setPaidInput(total.toFixed(0));
    setPaymentMethod('cash');
    setShowCheckoutModal(true);
  };

  const handleQuickCreateCustomer = async () => {
    const name = newCustomerName.trim();
    if (!name) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الزبون');
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
      await db.customers.add({
        id: newId,
        name: newCust.name,
        phone: newCust.phone,
        credit_limit: newCust.creditLimit,
        creditLimit: newCust.creditLimit,
        balance: 0,
        created_at: newCust.createdAt,
        updated_at: newCust.createdAt,
      });

      setCustomers((prev) => [...prev, newCust]);
      setSelectedCustomer(newCust);
      setShowNewCustomerModal(false);
      setShowCustomerPicker(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerCreditLimit('');
      Alert.alert('✓ تم الحفظ', `تمت إضافة الزبون ${name} واختياره للفاتورة`);
    } catch (e) {
      Alert.alert('خطأ', 'فشل حفظ الزبون الجديد');
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
            Alert.alert('تنبيه', 'يرجى تحديد الزبون لتسجيل المبلغ المتبقي كدين (كريدي)');
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
          Alert.alert('تنبيه', 'لا يمكن البيع بالكريدي (آجل) لزبون عام غير مسجل. يرجى اختيار زبون.');
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
            '⚠️ تجاوز حد الائتمان',
            `رصيد دين الزبون بعد هذه العملية (${(currentBal + debtToAdd).toLocaleString('ar-DZ')} دج) سيتجاوز الحد الائتماني المسموح به (${custLimit.toLocaleString('ar-DZ')} دج).\n\nهل ترغب في المتابعة رغم ذلك؟`,
            [
              { text: 'إلغاء', style: 'cancel', onPress: () => setCheckoutLoading(false) },
              { text: 'متابعة وتأكيد', style: 'destructive', onPress: () => executeSaleTransaction(saleId, invoiceNumber, nowIso, finalMethod, effectivePaid, effectiveStatus, debtToAdd) },
            ]
          );
          return;
        }
      }

      await executeSaleTransaction(saleId, invoiceNumber, nowIso, finalMethod, effectivePaid, effectiveStatus, debtToAdd);
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ الفاتورة: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
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
      await db.sales.add({
        id: saleId,
        number: invoiceNumber,
        date: nowIso,
        docType: selectedDocType,
        doc_type: selectedDocType,
        type: 'sale',
        items: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          qty: c.qty,
          unitPrice: c.unitPrice,
          lineTotal: c.lineTotal,
          promoName: c.promoName,
          isPack: c.isPack,
          packId: c.packId,
          isCustom: c.isCustom,
        })),
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
        customerName: selectedCustomer?.name || 'زبون عام',
        customer_name: selectedCustomer?.name || 'زبون عام',
        amountPaid: effectivePaid,
        amount_paid: effectivePaid,
        status: effectiveStatus,
        soldBy: user?.name || user?.username || 'الكاشير',
        sold_by: user?.name || user?.username || 'الكاشير',
        cash_session_id: (await getOpenSession())?.id || '',
        note: checkoutNote.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2. Insert individual sale_items and deduct stock for products / pack items
      for (const item of cart) {
        // 2a. Add to sale_items table
        try {
          await db.saleItems.add({
            id: generateId(),
            sale_id: saleId,
            product_id: item.productId,
            name: item.name,
            qty: item.qty,
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
            promo_name: item.promoName || null,
            created_at: nowIso,
          });
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
                    reference_id: saleId,
                    created_by: user?.name || user?.username || '',
                    created_at: nowIso,
                    updated_at: nowIso,
                  });
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
                reference_id: saleId,
                created_by: user?.name || user?.username || '',
                created_at: nowIso,
                updated_at: nowIso,
              });

              // Log to stockMovementsV2 for desktop parity
              await db.stockMovementsV2.add({
                id: generateId(),
                movement_number: `MOV-${Date.now().toString().slice(-6)}`,
                date: nowIso,
                type: 'sale',
                item_id: item.productId,
                quantity: -item.qty,
                unit_price: item.unitPrice,
                total_amount: item.lineTotal,
                reference: invoiceNumber,
                is_reviewed: 1,
                reviewed_by: user?.name || user?.username || '',
                created_at: nowIso,
                updated_at: nowIso,
              });
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
            await db.payments.add({
              id: generateId(),
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
            });
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

      // 5. Print invoice
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

      const printed = await printViaDesktop(invoiceData);
      if (!printed) await printInvoice(invoiceData);

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
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>جاري تحميل قائمة المنتجات...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Session Alert Warning Banner */}
      {!hasOpenSession && (
        <View style={[styles.sessionWarningBanner, { backgroundColor: colors.warning.light, borderBottomColor: colors.warning.border }]}>
          <AlertTriangle size={16} color={colors.warning.dark} />
          <Text style={[styles.sessionWarningText, { color: colors.warning.text }]}>
            الصندوق مقفل — يرجى فتح مناوبة لحساب المبيعات النقدية بدقة
          </Text>
        </View>
      )}

      {/* Top License Trial Banner */}
      <View style={[styles.licenseBanner, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : colors.primary[50], borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : colors.primary[200] }]}>
        <TouchableOpacity style={styles.licenseUpgradeBtn} activeOpacity={0.8}>
          <ArrowUpRight size={14} color="#ffffff" />
          <Text style={styles.licenseUpgradeBtnText}>ترقية</Text>
        </TouchableOpacity>
        <View style={styles.licenseBannerContent}>
          <Text style={[styles.licenseBannerTitle, { color: isDark ? '#ffffff' : colors.text.primary }]}>
            نسخة مجانية – احصل على الكاملة
          </Text>
          <Text style={[styles.licenseBannerSubtitle, { color: isDark ? colors.slate[400] : colors.text.secondary }]}>
            0/50 فاتورة  •  0/10 زبون
          </Text>
        </View>
        <View style={[styles.licenseFlaskIcon, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primary[100] }]}>
          <FlaskConical size={18} color={isDark ? '#60a5fa' : colors.primary[600]} />
        </View>
      </View>

      {/* Quick Action Pills: Customer & Open Shift */}
      <View style={styles.topActionsRow}>
        <TouchableOpacity
          style={[
            styles.topActionPill,
            selectedCustomer
              ? { backgroundColor: isDark ? '#1e3a8a' : colors.primary[100], borderColor: colors.primary[400] }
              : { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default },
          ]}
          onPress={() => setShowCustomerPicker(true)}
          activeOpacity={0.7}
        >
          <UserPlus size={15} color={isDark ? '#93c5fd' : colors.primary[600]} />
          <Text style={[styles.topActionPillText, { color: isDark ? '#93c5fd' : colors.primary[700] }]}>
            {selectedCustomer?.name ? `عميل: ${selectedCustomer.name}` : '+ عميل'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topActionPill, { backgroundColor: isDark ? '#1e293b' : colors.surface, borderColor: isDark ? '#334155' : colors.border.default }]}
          onPress={() => navigation.navigate('Cash')}
          activeOpacity={0.7}
        >
          <Store size={15} color={isDark ? '#94a3b8' : colors.slate[600]} />
          <Text style={[styles.topActionPillText, { color: isDark ? '#cbd5e1' : colors.text.primary }]}>
            {hasOpenSession ? 'مناوبة مفتوحة' : 'فتح مناوبة'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top Search & Toolbar */}
      <View style={styles.searchBarWrapper}>
        <View style={[styles.searchBarContainer, { backgroundColor: isDark ? '#111827' : colors.surface, borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border.default }]}>
          {/* Left Icon Actions */}
          <View style={styles.searchLeftIcons}>
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

            {/* Refresh */}
            <TouchableOpacity
              style={[styles.searchIconBtn, { backgroundColor: isDark ? '#1f2937' : colors.slate[100] }]}
              onPress={loadData}
              activeOpacity={0.7}
            >
              <RotateCcw size={17} color={isDark ? '#94a3b8' : colors.slate[600]} />
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
            style={[styles.searchTextInput, { color: colors.text.primary }]}
            placeholder="بحث بالاسم أو الباركود..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={isDark ? '#64748b' : colors.slate[400]}
            textAlign="right"
          />

          <Search size={18} color={isDark ? '#64748b' : colors.slate[400]} style={styles.searchRightIcon} />
        </View>
      </View>

      {/* Category Pills Bar */}
      <View style={styles.categoryBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
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
              الكل
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
              المميزة
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
                📦 باقات ({packs.length})
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
            title="لا توجد منتجات مطابقة"
            description="جرب البحث بكلمة أخرى أو أضف منتجات جديدة من شاشة المخزون"
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
                  onPress={() => addToCart(product)}
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
                        • {product.quantity} {product.unit || 'قطعة'}
                      </Text>
                    </View>

                    <View style={styles.gridPriceRow}>
                      <Text style={[styles.gridCurrency, { color: colors.text.tertiary }]}>DA</Text>
                      <Text style={[styles.gridPrice, { color: isDark ? '#34d399' : colors.emerald[700] }]}>
                        {product.retailPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  onPress={() => addToCart(product)}
                >
                  {inCartItem ? (
                    <View style={[styles.inCartBadge, { backgroundColor: colors.primary[600] }]}>
                      <Text style={styles.inCartBadgeText}>{inCartItem.qty}</Text>
                    </View>
                  ) : null}

                  {/* Left: Price & Currency */}
                  <View style={styles.listLeftColumn}>
                    <Text style={[styles.listPrice, { color: isDark ? '#34d399' : colors.emerald[700] }]}>
                      {product.retailPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.listCurrency, { color: colors.text.tertiary }]}>DA</Text>
                  </View>

                  {/* Middle: Name, Stock & Barcode */}
                  <View style={styles.listMiddleColumn}>
                    <Text style={[styles.listCardName, { color: colors.text.primary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <View style={styles.listMetaRow}>
                      <View style={[styles.listStockBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}>
                        <Text style={[styles.listStockText, { color: isDark ? '#34d399' : '#059669' }]}>
                          {product.quantity} {product.unit || 'قطعة'}
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
              <View key={item.productId} style={[styles.cartItemRow, { borderBottomColor: colors.border.subtle }]}>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.productId)}
                  style={styles.cartDeleteBtn}
                >
                  <Trash2 size={15} color={colors.danger.main} />
                </TouchableOpacity>

                <Text style={[styles.cartItemLineTotal, { color: colors.text.primary }]}>
                  {item.lineTotal.toLocaleString('ar-DZ')} دج
                </Text>

                <View style={[styles.cartQtyControls, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}>
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

                <View style={styles.cartItemInfo}>
                  <Text style={[styles.cartItemName, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    {item.promoName ? (
                      <Badge variant="purple" size="xs">
                        {item.promoName}
                      </Badge>
                    ) : null}
                    <Text style={[styles.cartItemUnitPrice, { color: colors.text.tertiary }]}>
                      {item.unitPrice.toLocaleString('ar-DZ')} دج
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* Totals Summary */}
        <View style={styles.cartFooter}>
          <View style={styles.totalsSummaryRow}>
            <View style={styles.totalBlock}>
              <Text style={[styles.totalLabel, { color: colors.text.secondary }]}>المجموع المستحق</Text>
              <Text style={[styles.grandTotalValue, { color: colors.primary[600] }]}>
                {total.toLocaleString('ar-DZ')} <Text style={styles.currency}>دج</Text>
              </Text>
            </View>

            {discount > 0 ? (
              <View style={styles.discountBlock}>
                <Text style={[styles.discountLabel, { color: colors.warning.text }]}>الخصم المطبق</Text>
                <Text style={[styles.discountAmount, { color: colors.warning.text }]}>
                  -{discount.toLocaleString('ar-DZ')} دج
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Row */}
          <View style={styles.cartActionsRow}>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                { backgroundColor: colors.primary[600] },
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
                    إتمام البيع ({cart.reduce((s, i) => s + i.qty, 0)} قطع)
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>تحديد الزبون</Text>
            </View>

            <View style={styles.modalSearchRow}>
              <View style={[styles.modalSearch, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[100], flex: 1 }]}>
                <Search size={16} color={colors.slate[400]} />
                <TextInput
                  style={[styles.modalSearchInput, { color: colors.text.primary }]}
                  placeholder="ابحث بالاسم أو الهاتف..."
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholderTextColor={colors.slate[400]}
                  textAlign="right"
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
                  { borderBottomColor: colors.border.subtle },
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
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={[styles.customerOptionName, { color: colors.text.primary }]}>عميل نقدي (عام)</Text>
                  <Text style={[styles.customerOptionSub, { color: colors.text.tertiary }]}>بدون حساب آجل</Text>
                </View>
              </TouchableOpacity>

              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <TouchableOpacity
                    key={cust.id}
                    style={[
                      styles.customerOption,
                      { borderBottomColor: colors.border.subtle },
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
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                      <Text style={[styles.customerOptionName, { color: colors.text.primary }]}>{cust.name}</Text>
                      <Text style={[styles.customerOptionSub, { color: colors.text.tertiary }]}>
                        {cust.phone || 'بدون هاتف'} • رصيد دين: {cust.balance || 0} دج
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <TouchableOpacity onPress={() => setShowNewCustomerModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>إضافة زبون جديد</Text>
            </View>

            <ScrollView style={{ padding: spacing.lg }}>
              <Input
                label="اسم الزبون *"
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                placeholder="أدخل اسم العميل أو المحل"
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label="رقم الهاتف"
                keyboardType="phone-pad"
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                placeholder="0550 00 00 00"
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label="الحد الائتماني للديون (دج)"
                keyboardType="numeric"
                value={newCustomerCreditLimit}
                onChangeText={setNewCustomerCreditLimit}
                placeholder="0 (غير محدد)"
                containerStyle={{ marginBottom: spacing.md }}
              />

              <Button
                title="حفظ واختيار الزبون"
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <TouchableOpacity onPress={() => setShowCustomItemModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>إضافة بند مخصص (بيع حر)</Text>
            </View>

            <View style={{ padding: spacing.lg }}>
              <Input
                label="اسم البند / الخدمة *"
                value={customItemName}
                onChangeText={setCustomItemName}
                placeholder="مثال: خدمة صيانة، صنف غير مسجل..."
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label="السعر الفردي (دج) *"
                keyboardType="numeric"
                value={customItemPrice}
                onChangeText={setCustomItemPrice}
                placeholder="0"
                containerStyle={{ marginBottom: spacing.md }}
              />
              <Input
                label="الكمية"
                keyboardType="numeric"
                value={customItemQty}
                onChangeText={setCustomItemQty}
                placeholder="1"
                containerStyle={{ marginBottom: spacing.md }}
              />

              <Button
                title="إضافة إلى السلة"
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>إضافة خصم على الفاتورة</Text>
            </View>

            <View style={styles.discountToggleRow}>
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
                  مبلغ ثابت (دج)
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
                  نسبة مئوية (%)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: spacing.lg }}>
              <Input
                label="قيمة الخصم"
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder="0"
              />

              <Button
                title="تطبيق الخصم"
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>تأكيد وإصدار الفاتورة</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg }}>
              {/* Document Type Selector */}
              <Text style={[styles.fieldLabel, { color: colors.text.secondary }]}>نوع الوثيقة التجارية</Text>
              <View style={styles.docTypeRow}>
                {[
                  { id: 'facture', label: 'فاتورة بيع' },
                  { id: 'bl', label: 'سند تسليم (BL)' },
                  { id: 'devis', label: 'عرض أسعار' },
                  { id: 'proforma', label: 'فاتورة شكلية' },
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
                <Text style={[styles.checkoutTotalLabel, { color: colors.text.secondary }]}>المبلغ الإجمالي المستحق</Text>
                <Text style={[styles.checkoutTotalAmount, { color: colors.primary[700] }]}>
                  {total.toLocaleString('ar-DZ')} <Text style={styles.currency}>دج</Text>
                </Text>
                <Text style={[styles.checkoutCustomerName, { color: colors.text.secondary }]}>
                  الزبون: {selectedCustomer?.name || 'زبون عام (نقدي)'}
                </Text>
              </View>

              {/* Payment Method Selector */}
              <Text style={[styles.fieldLabel, { color: colors.text.secondary, marginTop: spacing.md }]}>طريقة الدفع</Text>
              <View style={styles.paymentMethodsContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'cash' && { borderColor: colors.emerald[600], borderWidth: 2, backgroundColor: colors.emerald[50] },
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Banknote size={22} color={colors.emerald[700]} />
                  <Text style={[styles.paymentMethodTitle, { color: colors.text.primary }]}>نقداً (كاش)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'card' && { borderColor: colors.primary[600], borderWidth: 2, backgroundColor: colors.primary[50] },
                  ]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <CreditCard size={22} color={colors.primary[600]} />
                  <Text style={[styles.paymentMethodTitle, { color: colors.text.primary }]}>بطاقة (CIB)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'credit' && { borderColor: colors.warning.dark, borderWidth: 2, backgroundColor: colors.warning.light },
                  ]}
                  onPress={() => setPaymentMethod('credit')}
                >
                  <FileText size={22} color={colors.warning.dark} />
                  <Text style={[styles.paymentMethodTitle, { color: colors.text.primary }]}>آجل (كريدي)</Text>
                </TouchableOpacity>
              </View>

              {/* Paid Input & Change Calculation */}
              <View style={{ marginTop: spacing.md }}>
                <Input
                  label="المبلغ المدفوع من الزبون (دج)"
                  keyboardType="numeric"
                  value={paidInput}
                  onChangeText={setPaidInput}
                  placeholder={total.toFixed(0)}
                />

                {/* Quick Cash Shortcuts */}
                <View style={styles.cashShortcutsRow}>
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
                  <View style={[styles.changeBanner, { backgroundColor: colors.emerald[50], borderColor: colors.emerald[200] }]}>
                    <Coins size={18} color={colors.emerald[700]} />
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                      <Text style={[styles.changeBannerLabel, { color: colors.emerald[700] }]}>الصرف المرجع للزبون:</Text>
                      <Text style={[styles.changeBannerVal, { color: colors.emerald[700] }]}>
                        {changeDue.toLocaleString('ar-DZ')} دج
                      </Text>
                    </View>
                  </View>
                ) : remainingDebt > 0 ? (
                  <View style={[styles.changeBanner, { backgroundColor: colors.warning.light, borderColor: colors.warning.border }]}>
                    <ShieldAlert size={18} color={colors.warning.dark} />
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                      <Text style={[styles.changeBannerLabel, { color: colors.warning.text }]}>المتبقي كدين (كريدي):</Text>
                      <Text style={[styles.changeBannerVal, { color: colors.warning.text }]}>
                        {remainingDebt.toLocaleString('ar-DZ')} دج
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Note Input */}
              <Input
                label="ملاحظات الفاتورة (اختياري)"
                value={checkoutNote}
                onChangeText={setCheckoutNote}
                placeholder="أية ملاحظات إضافية على الفاتورة..."
                containerStyle={{ marginTop: spacing.md }}
              />

              <Button
                title={checkoutLoading ? 'جاري الإصدار والطباعة...' : 'تأكيد وإصدار الفاتورة'}
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle }]}>
              <TouchableOpacity onPress={() => setShowSuspendedModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>الطلبات المعلقة</Text>
            </View>

            <ScrollView style={styles.modalList}>
              {suspendedOrders.length === 0 ? (
                <EmptyState
                  icon={<Clock size={28} color={colors.slate[400]} />}
                  title="لا توجد طلبات معلقة"
                  description="يمكنك تعليق أي طلب والرجوع إليه لاحقاً"
                />
              ) : (
                suspendedOrders.map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.suspendedRow, { borderBottomColor: colors.border.subtle }]}
                    onPress={() => resumeOrder(o)}
                  >
                    <View style={{ alignItems: 'flex-start' }}>
                      <Badge variant="primary" size="sm">
                        استرجاع
                      </Badge>
                    </View>
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                      <Text style={[styles.suspendedTitle, { color: colors.text.primary }]}>
                        سلة ({o.items?.length || 0} منتجات)
                      </Text>
                      <Text style={[styles.suspendedSub, { color: colors.text.tertiary }]}>
                        {o.customerName || 'زبون عام'} •{' '}
                        {new Date(o.suspendedAt).toLocaleTimeString('ar-DZ', {
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
              تم إصدار الفاتورة بنجاح ✓
            </Text>
            <Text style={[styles.successModalInvoiceNum, { color: colors.primary[600] }]}>
              {completedInvoiceNum}
            </Text>

            {completedChangeDue > 0 && (
              <View style={[styles.successChangeBox, { backgroundColor: colors.emerald[50], borderColor: colors.emerald[200] }]}>
                <Coins size={18} color={colors.emerald[700]} />
                <Text style={[styles.successChangeText, { color: colors.emerald[700] }]}>
                  الصرف المرجع للزبون: {completedChangeDue.toLocaleString('ar-DZ')} دج
                </Text>
              </View>
            )}

            <View style={styles.successActionsRow}>
              <Button
                title="معاينة وطباعة الفاتورة"
                icon={<Printer size={18} color="#fff" />}
                onPress={() => {
                  setShowSuccessModal(false);
                  setShowPrintModal(true);
                }}
                variant="primary"
                style={{ flex: 1 }}
              />
              <Button
                title="فاتورة جديدة"
                icon={<Plus size={18} color={colors.text.primary} />}
                onPress={() => setShowSuccessModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
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
  });

export default POSScreen;
