import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
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
  Zap,
  Clock,
  RotateCcw,
  Package,
  Check,
  X,
  CreditCard,
  Banknote,
  FileText,
  AlertTriangle,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { printInvoice, printViaDesktop, type PrintInvoiceData } from '@/lib/print';
import { getOpenSession, addToSessionSales } from '@/lib/cashSessionService';
import { suspendOrder, type SuspendedOrder, parseSuspendedItems } from '@/lib/suspendedOrderService';
import CameraScanner from '@/features/barcode/CameraScanner';
import type { Product, Customer } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { colors as staticColors, useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button, Input, EmptyState } from '@/components/ui';

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  promoName?: string;
}

export const POSScreen = () => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
  const styles = makeStyles(colors, isDark);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [quickMode, setQuickMode] = useState(false);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedOrders, setSuspendedOrders] = useState<SuspendedOrder[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await ensureInit();
      const [allProducts, allCustomers, allPromotions, allCategories, session] = await Promise.all([
        db.products.toArray(),
        db.customers.toArray(),
        db.promotions.toArray(),
        db.categories.toArray().catch(() => []),
        getOpenSession(),
      ]);

      const mappedProducts: Product[] = allProducts.map((p: any) => ({
        ...p,
        id: p.id || p._id,
        name: p.name || p.productName,
        retailPrice: p.retailPrice || p.price || 0,
        wholesalePrice: p.wholesalePrice || 0,
        quantity: p.quantity || p.qty || 0,
        unit: p.unit || 'قطعة',
        barcode: p.barcode || '',
        category: p.category || '',
        status: p.status || 'active',
        lowStockThreshold: p.lowStockThreshold || 0,
        taxRate: p.taxRate || 0.19,
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
      setCategories(allCategories);
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
        p.productId === productId &&
        p.active &&
        p.startDate <= now &&
        p.endDate >= now
    );
  };

  const addToCart = useCallback(
    (product: Product) => {
      const promo = findPromotion(product.id);
      setCart((prev) => {
        const existing = prev.find((c) => c.productId === product.id);
        const newQty = existing ? existing.qty + 1 : 1;
        let basePrice = product.retailPrice;
        if (promo) {
          if (promo.discountType === 'percent') {
            basePrice = basePrice * (1 - promo.discountValue / 100);
          } else {
            basePrice = Math.max(0, basePrice - promo.discountValue);
          }
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
                }
              : c
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            qty: 1,
            unitPrice: basePrice,
            lineTotal: basePrice,
            promoName: promo?.name || '',
          },
        ];
      });
    },
    [products, promotions]
  );

  const handleBarcodeScan = async (code: string) => {
    setShowCameraScanner(false);

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

    // 3️⃣ Search in product_barcodes table (secondary barcodes)
    if (!found) {
      try {
        const rows = await db.productBarcodes.where('barcode').equals(code).toArray();
        if (!rows.length) {
          // Also try case-insensitive fallback
          const allRows = await db.productBarcodes.toArray();
          const row = allRows.find((r: any) => (r.barcode ?? '').toLowerCase() === normalized);
          if (row) {
            found = products.find((p) => p.id === row.product_id);
          }
        } else {
          found = products.find((p) => p.id === rows[0]?.product_id);
        }
      } catch { /* product_barcodes may not exist in old installs */ }
    }

    if (found) {
      addToCart(found);
    } else {
      Alert.alert(
        '🔍 لم يتم العثور على المنتج',
        `الباركود: ${code}\n\nتأكد من أن المنتج مُضاف في المخزون وأن الباركود مُسجَّل بشكل صحيح.`,
        [{ text: 'حسناً' }]
      );
    }
  };


  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.productId !== productId) return c;
          const newQty = c.qty + delta;
          if (newQty <= 0) return null;
          return { ...c, qty: newQty, lineTotal: c.unitPrice * newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.productId !== productId));

  const filterProducts = () => {
    let result = products;
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          (p.barcode ?? '').toLowerCase().includes(term)
      );
    }
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
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
    Alert.alert('تم', 'تم تعليق الطلب في قائمة الانتظار بنجاح');
  };

  const loadSuspended = async () => {
    const orders = await db.suspendedOrders.toArray();
    setSuspendedOrders(orders);
    setShowSuspendedModal(true);
  };

  const resumeOrder = (order: SuspendedOrder) => {
    setCart(parseSuspendedItems(order));
    if (order.customerId) {
      const c = customers.find((x) => x.id === order.customerId);
      if (c) setSelectedCustomer(c);
    }
    setShowSuspendedModal(false);
  };

  const handleCheckoutTap = () => {
    if (cart.length === 0) return;
    if (!hasOpenSession) {
      Alert.alert('تنبيه', 'يجب فتح الصندوق وبدء مناوبة أولاً قبل إجراء أي مبيعات');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handlePaymentConfirm = async (method: 'cash' | 'credit' | 'card') => {
    setCheckoutLoading(true);
    try {
      await ensureInit();
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      await db.sales.add({
        number: invoiceNumber,
        date: new Date().toISOString(),
        docType: 'facture',
        type: 'sale',
        items: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          qty: c.qty,
          unitPrice: c.unitPrice,
          lineTotal: c.lineTotal,
        })),
        subtotal,
        discount,
        discountType,
        tvaAmount: tax,
        total,
        paymentMethod: method,
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || 'زبون عام',
        amountPaid: method === 'cash' || method === 'card' ? total : 0,
        status: method === 'cash' || method === 'card' ? 'paid' : 'unpaid',
        soldBy: user?.id || '',
      });

      if (method === 'cash' && hasOpenSession) {
        try {
          const s = await getOpenSession();
          if (s) await addToSessionSales(s.id, total);
        } catch {}
      }

      const invoiceData: PrintInvoiceData = {
        number: invoiceNumber,
        date: new Date().toISOString(),
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
        paymentMethod: method,
        customerName: selectedCustomer?.name || '',
        soldBy: user?.name || '',
      };

      const printed = await printViaDesktop(invoiceData);
      if (!printed) await printInvoice(invoiceData);

      setShowCheckoutModal(false);
      Alert.alert('تم بنجاح ✓', `تم إصدار الفاتورة رقم ${invoiceNumber}`);
      setCart([]);
      setSelectedCustomer(null);
      setDiscountValue('0');
      setSearch('');
      loadData();
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ الفاتورة: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
    }
    setCheckoutLoading(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>جاري تحميل قائمة المنتجات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Session Alert Warning Banner */}
      {!hasOpenSession && (
        <View style={styles.sessionWarningBanner}>
          <AlertTriangle size={16} color={colors.warning.dark} />
          <Text style={styles.sessionWarningText}>
            الصندوق مقفل — يرجى فتح مناوبة لحساب المبيعات النقدية
          </Text>
        </View>
      )}

      {/* Top Search & Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.slate[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث بالاسم أو امسح الباركود..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.slate[400]}
            textAlign="right"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
              <X size={14} color={colors.slate[400]} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => setShowCameraScanner(true)}
            style={styles.scanBtn}
            activeOpacity={0.7}
          >
            <Camera size={18} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.quickToggleBtn, quickMode && styles.quickToggleActive]}
          onPress={() => setQuickMode(!quickMode)}
          activeOpacity={0.7}
        >
          <Zap size={18} color={quickMode ? '#ffffff' : colors.slate[500]} />
        </TouchableOpacity>
      </View>

      {/* Customer & Discount Controls Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.controlPill, selectedCustomer && styles.controlPillActive]}
          onPress={() => setShowCustomerPicker(true)}
          activeOpacity={0.7}
        >
          <User
            size={14}
            color={selectedCustomer ? colors.primary[600] : colors.slate[500]}
          />
          <Text
            style={[
              styles.controlPillText,
              selectedCustomer && styles.controlPillTextActive,
            ]}
            numberOfLines={1}
          >
            {selectedCustomer?.name || 'الزبون: نقدي'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlPill,
            styles.discountPill,
            parseFloat(discountValue) > 0 && styles.discountPillActive,
          ]}
          onPress={() => setShowDiscountModal(true)}
          activeOpacity={0.7}
        >
          <Percent
            size={14}
            color={
              parseFloat(discountValue) > 0 ? colors.warning.dark : colors.slate[500]
            }
          />
          <Text
            style={[
              styles.controlPillText,
              parseFloat(discountValue) > 0 && styles.discountPillTextActive,
            ]}
          >
            {parseFloat(discountValue) > 0
              ? `خصم ${discountValue} ${discountType === 'percent' ? '%' : 'دج'}`
              : 'إضافة خصم'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlPill}
          onPress={loadSuspended}
          activeOpacity={0.7}
        >
          <Clock size={14} color={colors.slate[500]} />
          <Text style={styles.controlPillText}>معلقة</Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills Bar */}
      {!quickMode && (
        <View style={styles.categoryBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryBar}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  !selectedCategory && styles.categoryChipTextActive,
                ]}
              >
                الكل ({products.length})
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                  onPress={() =>
                    setSelectedCategory(isSelected ? null : cat.id)
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name} {count > 0 ? `(${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Product Catalog Grid */}
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
        ) : (
          <View style={styles.productsGrid}>
            {filtered.map((product) => {
              const promo = findPromotion(product.id);
              const inCartItem = cart.find((c) => c.productId === product.id);

              return (
                <TouchableOpacity
                  key={product.id}
                  activeOpacity={0.75}
                  style={[
                    styles.productCard,
                    quickMode ? styles.productCardQuick : styles.productCardNormal,
                    inCartItem && styles.productCardInCart,
                  ]}
                  onPress={() => addToCart(product)}
                >
                  {inCartItem ? (
                    <View style={styles.inCartBadge}>
                      <Text style={styles.inCartBadgeText}>{inCartItem.qty}</Text>
                    </View>
                  ) : null}

                  {quickMode ? (
                    <View style={styles.quickCardContent}>
                      <Text style={styles.quickProductName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={styles.quickProductPrice}>
                        {product.retailPrice.toFixed(0)} دج
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.normalCardContent}>
                      <View style={styles.productCardHeader}>
                        <Barcode size={14} color={colors.slate[400]} />
                        <Badge
                          variant={product.quantity <= 0 ? 'danger' : product.quantity <= 5 ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {product.quantity} {product.unit || 'قطع'}
                        </Badge>
                      </View>

                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>

                      <View style={styles.productPriceRow}>
                        <Text style={styles.productPrice}>
                          {product.retailPrice.toLocaleString('ar-DZ')}{' '}
                          <Text style={styles.currency}>دج</Text>
                        </Text>
                        <View style={styles.addIconCircle}>
                          <Plus size={14} color="#ffffff" />
                        </View>
                      </View>

                      {promo ? (
                        <View style={styles.promoTag}>
                          <Text style={styles.promoTagText}>⚡ {promo.name}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Cart & Checkout Sheet */}
      <View style={styles.cartSheet}>
        {cart.length > 0 ? (
          <ScrollView
            style={styles.cartItemsScroll}
            showsVerticalScrollIndicator={false}
          >
            {cart.map((item) => (
              <View key={item.productId} style={styles.cartItemRow}>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.productId)}
                  style={styles.cartDeleteBtn}
                >
                  <Trash2 size={15} color={colors.danger.main} />
                </TouchableOpacity>

                <Text style={styles.cartItemLineTotal}>
                  {item.lineTotal.toLocaleString('ar-DZ')} دج
                </Text>

                <View style={styles.cartQtyControls}>
                  <TouchableOpacity
                    onPress={() => updateQty(item.productId, 1)}
                    style={styles.qtyStepBtn}
                  >
                    <Plus size={13} color={colors.text.primary} />
                  </TouchableOpacity>

                  <Text style={styles.cartQtyNumber}>{item.qty}</Text>

                  <TouchableOpacity
                    onPress={() => updateQty(item.productId, -1)}
                    style={styles.qtyStepBtn}
                  >
                    <Minus size={13} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cartItemUnitPrice}>
                    {item.unitPrice.toLocaleString('ar-DZ')} دج للقطعة
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {/* Totals Summary */}
        <View style={styles.cartFooter}>
          <View style={styles.totalsSummaryRow}>
            <View style={styles.totalBlock}>
              <Text style={styles.totalLabel}>المجموع الإجمالي</Text>
              <Text style={styles.grandTotalValue}>
                {total.toLocaleString('ar-DZ')} <Text style={styles.currency}>دج</Text>
              </Text>
            </View>

            {discount > 0 ? (
              <View style={styles.discountBlock}>
                <Text style={styles.discountLabel}>الخصم المطبق</Text>
                <Text style={styles.discountAmount}>
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
              style={[styles.suspendBtn, cart.length === 0 && { opacity: 0.5 }]}
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
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تحديد الزبون</Text>
            </View>

            <View style={styles.modalSearch}>
              <Search size={16} color={colors.slate[400]} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="ابحث بالاسم أو الهاتف..."
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholderTextColor={colors.slate[400]}
                textAlign="right"
              />
            </View>

            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.customerOption,
                  !selectedCustomer && styles.customerOptionSelected,
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
                  <Text style={styles.customerOptionName}>عميل نقدي (عام)</Text>
                  <Text style={styles.customerOptionSub}>بدون حساب آجل</Text>
                </View>
              </TouchableOpacity>

              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <TouchableOpacity
                    key={cust.id}
                    style={[
                      styles.customerOption,
                      isSelected && styles.customerOptionSelected,
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
                      <Text style={styles.customerOptionName}>{cust.name}</Text>
                      <Text style={styles.customerOptionSub}>
                        {cust.phone || 'بدون هاتف'} • رصيد: {cust.balance || 0} دج
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
          <View style={[styles.modalSheet, { maxHeight: 320 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إضافة خصم على الفاتورة</Text>
            </View>

            <View style={styles.discountToggleRow}>
              <TouchableOpacity
                style={[
                  styles.discountToggleBtn,
                  discountType === 'amount' && styles.discountToggleActive,
                ]}
                onPress={() => setDiscountType('amount')}
              >
                <Text
                  style={[
                    styles.discountToggleText,
                    discountType === 'amount' && styles.discountToggleTextActive,
                  ]}
                >
                  مبلغ ثابت (دج)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.discountToggleBtn,
                  discountType === 'percent' && styles.discountToggleActive,
                ]}
                onPress={() => setDiscountType('percent')}
              >
                <Text
                  style={[
                    styles.discountToggleText,
                    discountType === 'percent' && styles.discountToggleTextActive,
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

      {/* Checkout Payment Modal */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تأكيد وطريقة الدفع</Text>
            </View>

            <View style={styles.checkoutSummaryCard}>
              <Text style={styles.checkoutTotalLabel}>إجمالي المبلغ المستحق</Text>
              <Text style={styles.checkoutTotalAmount}>
                {total.toLocaleString('ar-DZ')} <Text style={styles.currency}>دج</Text>
              </Text>
              <Text style={styles.checkoutCustomerName}>
                الزبون: {selectedCustomer?.name || 'زبون عام (نقدي)'}
              </Text>
            </View>

            <View style={styles.paymentMethodsContainer}>
              <TouchableOpacity
                style={[styles.paymentMethodCard, styles.cashCard]}
                onPress={() => handlePaymentConfirm('cash')}
                disabled={checkoutLoading}
                activeOpacity={0.8}
              >
                <Banknote size={24} color={colors.success.dark} />
                <Text style={styles.paymentMethodTitle}>نقداً (كاش)</Text>
                <Text style={styles.paymentMethodSub}>دفع فوري بالصندوق</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethodCard, styles.cardCard]}
                onPress={() => handlePaymentConfirm('card')}
                disabled={checkoutLoading}
                activeOpacity={0.8}
              >
                <CreditCard size={24} color={colors.primary[600]} />
                <Text style={styles.paymentMethodTitle}>بطاقة بنكية (CIB)</Text>
                <Text style={styles.paymentMethodSub}>دفع إلكتروني</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethodCard, styles.creditCard]}
                onPress={() => handlePaymentConfirm('credit')}
                disabled={checkoutLoading}
                activeOpacity={0.8}
              >
                <FileText size={24} color={colors.warning.dark} />
                <Text style={styles.paymentMethodTitle}>آجل (كريدي)</Text>
                <Text style={styles.paymentMethodSub}>تسجيل في حساب الزبون</Text>
              </TouchableOpacity>
            </View>
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
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowSuspendedModal(false)}>
                <X size={20} color={colors.slate[500]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>الطلبات المعلقة</Text>
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
                    style={styles.suspendedRow}
                    onPress={() => resumeOrder(o)}
                  >
                    <View style={{ alignItems: 'flex-start' }}>
                      <Badge variant="primary" size="sm">
                        استرجاع
                      </Badge>
                    </View>
                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                      <Text style={styles.suspendedTitle}>
                        سلة ({o.items?.length || 0} منتجات)
                      </Text>
                      <Text style={styles.suspendedSub}>
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
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },

  sessionWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning.border,
  },
  sessionWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning.text,
    fontFamily: 'Cairo',
    flex: 1,
    textAlign: 'right',
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: 'Cairo',
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  clearSearchBtn: {
    padding: 4,
  },
  scanBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    marginLeft: 4,
  },
  quickToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToggleActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[700],
  },

  // Controls bar
  controlsBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  controlPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  controlPillActive: {
    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
    borderColor: colors.primary[isDark ? 700 : 200],
  },
  discountPill: {},
  discountPillActive: {
    backgroundColor: colors.warning.light,
    borderColor: colors.warning.border,
  },
  controlPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },
  controlPillTextActive: {
    color: colors.primary[isDark ? 300 : 700],
  },
  discountPillTextActive: {
    color: colors.warning.text,
  },

  // Categories
  categoryBarWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  categoryBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs + 2,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    borderWidth: 1,
    borderColor: isDark ? colors.border.default : staticColors.slate[200],
  },
  categoryChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[700],
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },

  // Catalog
  catalogArea: {
    flex: 1,
  },
  catalogContent: {
    padding: spacing.md,
    paddingBottom: 220,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  productCardNormal: {
    width: '48.5%',
    padding: spacing.md,
  },
  productCardQuick: {
    width: '31.5%',
    aspectRatio: 1,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardInCart: {
    borderColor: colors.primary[500],
    backgroundColor: isDark ? `${colors.primary[900]}55` : colors.primary[50],
  },
  inCartBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  inCartBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  quickCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickProductName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  quickProductPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary[isDark ? 400 : 700],
    fontFamily: 'Cairo',
  },
  normalCardContent: {
    gap: spacing.xs,
  },
  productCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
    textAlign: 'right',
    minHeight: 36,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary[isDark ? 400 : 700],
    fontFamily: 'Cairo',
  },
  currency: {
    fontSize: 11,
    fontWeight: '600',
  },
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTag: {
    backgroundColor: colors.warning.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
  },
  promoTagText: {
    fontSize: 10,
    color: colors.warning.dark,
    fontWeight: 'bold',
    fontFamily: 'Cairo',
  },

  // Cart Sheet
  cartSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    ...shadows.lg,
  },
  cartItemsScroll: {
    maxHeight: 140,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  cartDeleteBtn: {
    padding: 6,
  },
  cartItemLineTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary[isDark ? 400 : 700],
    fontFamily: 'Cairo',
    width: 75,
    textAlign: 'left',
  },
  cartQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: spacing.sm,
  },
  qtyStepBtn: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  cartItemUnitPrice: {
    fontSize: 10,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },

  cartFooter: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  totalsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalBlock: {
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary[isDark ? 400 : 700],
    fontFamily: 'Cairo',
  },
  discountBlock: {
    alignItems: 'flex-end',
  },
  discountLabel: {
    fontSize: 11,
    color: colors.warning.text,
    fontFamily: 'Cairo',
  },
  discountAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning.text,
    fontFamily: 'Cairo',
  },
  cartActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[600],
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },
  suspendBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '75%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    height: 42,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: 'Cairo',
    marginRight: spacing.xs,
  },
  modalList: {
    paddingHorizontal: spacing.md,
  },
  customerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  customerOptionSelected: {
    backgroundColor: isDark ? `${colors.primary[900]}55` : colors.primary[50],
    borderRadius: radii.md,
  },
  customerOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  customerOptionSub: {
    fontSize: 11,
    color: colors.text.secondary,
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
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: isDark ? colors.surfaceSubtle : staticColors.slate[100],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  discountToggleActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[700],
  },
  discountToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },
  discountToggleTextActive: {
    color: '#ffffff',
  },

  checkoutSummaryCard: {
    backgroundColor: isDark ? `${colors.primary[900]}44` : colors.primary[50],
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? colors.primary[800] : colors.primary[200],
    gap: 4,
  },
  checkoutTotalLabel: {
    fontSize: 12,
    color: colors.primary[isDark ? 300 : 700],
    fontFamily: 'Cairo',
  },
  checkoutTotalAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary[isDark ? 300 : 800],
    fontFamily: 'Cairo',
  },
  checkoutCustomerName: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontFamily: 'Cairo',
    marginTop: 4,
  },
  paymentMethodsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  cashCard: {
    backgroundColor: colors.success.light,
    borderColor: colors.success.border,
  },
  cardCard: {
    backgroundColor: isDark ? `${colors.primary[900]}44` : colors.primary[50],
    borderColor: isDark ? colors.primary[800] : colors.primary[200],
  },
  creditCard: {
    backgroundColor: colors.warning.light,
    borderColor: colors.warning.border,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
    flex: 1,
    textAlign: 'right',
  },
  paymentMethodSub: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
  },

  suspendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  suspendedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  suspendedSub: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
    marginTop: 2,
  },
});

export default POSScreen;
