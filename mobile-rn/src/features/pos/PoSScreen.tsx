// نقطة بيع للهاتف — Full parity with desktop POS
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { Search, ShoppingCart, Barcode, Plus, Trash2, Minus, User, Percent, Camera, Zap, Clock, RotateCcw, Package } from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { printInvoice, printViaDesktop, type PrintInvoiceData } from '@/lib/print';
import { getOpenSession, addToSessionSales } from '@/lib/cashSessionService';
import { suspendOrder, type SuspendedOrder, parseSuspendedItems } from '@/lib/suspendedOrderService';
import CameraScanner from '@/features/barcode/CameraScanner';
import type { Product, Customer } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  promoName?: string;
}

const POSScreen = () => {
  const { user } = useAuthStore();
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [quickMode, setQuickMode] = useState(false);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedOrders, setSuspendedOrders] = useState<SuspendedOrder[]>([]);

  useEffect(() => { loadData(); }, []);

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
        ...p, id: p.id || p._id, name: p.name || p.productName,
        retailPrice: p.retailPrice || p.price || 0, wholesalePrice: p.wholesalePrice || 0,
        quantity: p.quantity || p.qty || 0, unit: p.unit || 'قطعة', barcode: p.barcode || '',
        category: p.category || '', status: p.status || 'active',
        lowStockThreshold: p.lowStockThreshold || 0, taxRate: p.taxRate || 0.19,
      }));
      setProducts(mappedProducts);
      setFiltered(mappedProducts);
      setCustomers(allCustomers.map((c: any) => ({
        ...c, id: c.id || c._id, name: c.name || '', phone: c.phone || '',
        creditLimit: c.credit_limit || c.creditLimit || 0, balance: c.balance || 0
      })));
      setCategories(allCategories);
      setHasOpenSession(!!session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ');
    }
    setLoading(false);
  }

  const findPromotion = (productId: string) => {
    const now = new Date().toISOString().split('T')[0];
    return promotions.find(p => p.productId === productId && p.active && p.startDate <= now && p.endDate >= now);
  };

  const addToCart = useCallback((product: Product) => {
    const promo = findPromotion(product.id);
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
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
        return prev.map(c => c.productId === product.id
          ? { ...c, qty: newQty, unitPrice: basePrice, lineTotal: basePrice * newQty } : c);
      }
      return [...prev, {
        productId: product.id, name: product.name, qty: 1,
        unitPrice: basePrice, lineTotal: basePrice,
        promoName: promo?.name || '',
      }];
    });
  }, [products]);

  const handleBarcodeScan = (code: string) => {
    setShowCameraScanner(false);
    const found = products.find(p => p.barcode?.toLowerCase() === code.toLowerCase());
    if (found) {
      addToCart(found);
    } else {
      Alert.alert('لم يتم العثور على منتج', `بالباركود: ${code}`);
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const discount = discountType === 'percent'
    ? subtotal * (parseFloat(discountValue) || 0) / 100
    : (parseFloat(discountValue) || 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = afterDiscount * 0.19;
  const total = afterDiscount + tax;

  const handleCheckoutTap = () => {
    if (cart.length === 0) return;
    if (!hasOpenSession) {
      Alert.alert('يجب فتح صندوق أولاً');
      return;
    }
    // Payment modal — simplified
    Alert.alert(
      'إتمام البيع',
      `المجموع: ${total.toFixed(2)} دج\nاختر طريقة الدفع`,
      [
        { text: 'نقداً', onPress: () => handlePaymentConfirm('cash') },
        { text: 'آجل', onPress: () => handlePaymentConfirm('credit') },
        { text: 'إلغاء', style: 'cancel' },
      ]
    );
  };

  const handlePaymentConfirm = async (method: 'cash' | 'credit') => {
    setCheckoutLoading(true);
    try {
      await ensureInit();
      const invoiceNumber = `INV-${Date.now()}`;
      await db.sales.add({
        number: invoiceNumber,
        date: new Date().toISOString(),
        docType: 'facture', type: 'sale',
        items: cart.map(c => ({
          productId: c.productId, name: c.name, qty: c.qty,
          unitPrice: c.unitPrice, lineTotal: c.lineTotal
        })),
        subtotal, discount, discountType, tvaAmount: tax, total,
        paymentMethod: method,
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || '',
        amountPaid: method === 'cash' ? total : 0,
        status: method === 'cash' ? 'paid' : 'unpaid',
        soldBy: user?.id || '',
      });

      if (method === 'cash' && hasOpenSession) {
        try {
          const s = await getOpenSession();
          if (s) await addToSessionSales(s.id, total);
        } catch {}
      }

      const invoiceData: PrintInvoiceData = {
        number: invoiceNumber, date: new Date().toISOString(),
        items: cart.map(c => ({ name: c.name, qty: c.qty, unitPrice: c.unitPrice, lineTotal: c.lineTotal })),
        subtotal, discount, tvaAmount: tax, total,
        paymentMethod: method,
        customerName: selectedCustomer?.name || '', soldBy: user?.name || '',
      };

      const printed = await printViaDesktop(invoiceData);
      if (!printed) await printInvoice(invoiceData);

      Alert.alert('نجاح', 'تم إتمام البيع بنجاح');
      setCart([]);
      setSelectedCustomer(null);
      setSearch('');
      loadData();
    } catch (err) {
      Alert.alert('خطأ', `فشل: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setCheckoutLoading(false);
  };

  const removeFromCart = (productId: string) =>
    setCart(prev => prev.filter(c => c.productId !== productId));

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      const newQty = Math.max(1, c.qty + delta);
      return { ...c, qty: newQty, lineTotal: c.unitPrice * newQty };
    }));
  };

  const filterProducts = () => {
    let result = products;
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term)
      );
    }
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    setFiltered(result);
  };

  const handleSuspend = async () => {
    if (cart.length === 0) return;
    await suspendOrder(cart, selectedCustomer?.id, selectedCustomer?.name, discountType, parseFloat(discountValue) || 0);
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue('0');
    setSearch('');
    Alert.alert('تم تعليق الطلب');
  };

  const loadSuspended = async () => {
    const orders = await db.suspendedOrders.toArray();
    setSuspendedOrders(orders);
    setShowSuspendedModal(true);
  };

  const resumeOrder = (order: SuspendedOrder) => {
    setCart(parseSuspendedItems(order));
    if (order.customerId) {
      const c = customers.find(x => x.id === order.customerId);
      if (c) setSelectedCustomer(c);
    }
    setShowSuspendedModal(false);
  };

  useEffect(() => { filterProducts(); }, [search, products, selectedCategory]);

  if (loading) return <View style={styles.center}><Text style={styles.loading}>جاري التحميل...</Text></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      {/* Cash Session Banner */}
      {!hasOpenSession && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>لا يوجد صندوق مفتوح — افتح أحد أولاً</Text>
        </View>
      )}

      {/* Search + Quick Mode */}
      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن منتج..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
            textAlign="right"
          />
          <TouchableOpacity onPress={() => setShowCameraScanner(true)} style={styles.cameraBtn}>
            <Camera size={18} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.quickModeBtn, quickMode && styles.quickModeActive]}
          onPress={() => setQuickMode(!quickMode)}
        >
          <Zap size={18} color={quickMode ? '#fff' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {/* Customer + Discount */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.controlBtn, selectedCustomer && styles.controlActive]}
          onPress={() => setShowCustomerPicker(true)}
        >
          <User size={14} color={selectedCustomer ? '#3b82f6' : '#94a3b8'} />
          <Text style={styles.controlText}>{selectedCustomer?.name || 'عميل نقدي'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.discountBtn, parseFloat(discountValue) > 0 && styles.discountActive]}
          onPress={() => setDiscountValue(parseFloat(discountValue) > 0 ? '0' : '10')}
        >
          <Percent size={14} color={parseFloat(discountValue) > 0 ? '#d946ef' : '#94a3b8'} />
          <Text style={styles.controlText}>خصم {parseFloat(discountValue) > 0 ? `(${discountValue} دج)` : ''}</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      {!quickMode && categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>الكل</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Product Grid */}
      <ScrollView style={styles.productGrid} showsVerticalScrollIndicator={false}>
        <View style={[styles.grid, quickMode ? styles.gridQuick : styles.gridNormal]}>
          {filtered.map(p => {
            const promo = findPromotion(p.id);
            return (
              <TouchableOpacity key={p.id} style={[styles.productCard, quickMode ? styles.productCardQuick : styles.productCardNormal, promo && styles.productCardPromo]} onPress={() => addToCart(p)}>
                {quickMode ? (
                  <>
                    <Text style={styles.productNameQuick}>{p.name}</Text>
                    <Text style={styles.productPrice}>{p.retailPrice.toFixed(0)} دج</Text>
                  </>
                ) : (
                  <>
                    <Barcode size={12} color="#94a3b8" style={{ marginBottom: 4 }} />
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productPrice}>{p.retailPrice.toFixed(2)} دج</Text>
                    {promo && <Text style={styles.productPromo}>⚡ {promo.name}</Text>}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Cart */}
      <View style={styles.cartContainer}>
        <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
          {cart.length === 0 ? (
            <Text style={styles.cartEmpty}>السلة فارغة</Text>
          ) : (
            cart.map(item => (
              <View key={item.productId} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>{item.unitPrice.toFixed(0)} دج × {item.qty}</Text>
                  {item.promoName && <Text style={styles.cartItemPromo}>⚡ {item.promoName}</Text>}
                </View>
                <View style={styles.cartItemControls}>
                  <TouchableOpacity onPress={() => updateQty(item.productId, -1)} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.qty}</Text>
                  <TouchableOpacity onPress={() => updateQty(item.productId, 1)} style={styles.qtyBtn}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>{item.lineTotal.toFixed(0)} دج</Text>
                <TouchableOpacity onPress={() => removeFromCart(item.productId)} style={styles.removeBtn}>
                  <Trash2 size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>المجموع</Text>
            <Text style={styles.totalValue}>{subtotal.toFixed(0)} دج</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: '#d946ef' }]}>الخصم</Text>
              <Text style={{ color: '#d946ef' }}>-{discount.toFixed(0)} دج</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalBorder]}>
            <Text style={styles.totalLabelBold}>الإجمالي</Text>
            <Text style={styles.totalValueBold}>{total.toFixed(0)} دج</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.checkoutBtn, (cart.length === 0 || checkoutLoading) && styles.checkoutBtnDisabled]}
            onPress={handleCheckoutTap}
            disabled={cart.length === 0 || checkoutLoading}
          >
            {checkoutLoading ? <Text style={styles.btnText}>جاري الإتمام...</Text> : <Text style={styles.btnText}>إتمام البيع ({cart.length})</Text>}
          </TouchableOpacity>

          <View style={styles.quickActions}>
            <TouchableOpacity onPress={loadSuspended} style={styles.quickActionBtn}>
              <Clock size={16} color="#94a3b8" />
              <Text style={styles.quickActionText}>معلق</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSuspend} disabled={cart.length === 0} style={[styles.quickActionBtn, cart.length === 0 && { opacity: 0.5 }]}>
              <RotateCcw size={16} color="#94a3b8" />
              <Text style={styles.quickActionText}>تعليق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modals */}
      {showCameraScanner && <CameraScanner onScan={handleBarcodeScan} onClose={() => setShowCameraScanner(false)} />}
      {showCustomerPicker && (
        <View style={styles.customerModal}>
          <ScrollView style={styles.customerList}>
            <TouchableOpacity
              style={styles.customerItem}
              onPress={() => { setSelectedCustomer(null); setShowCustomerPicker(false); }}
            >
              <Text style={styles.customerName}>عميل نقدي</Text>
            </TouchableOpacity>
            {customers.map(c => (
              <TouchableOpacity key={c.id} style={styles.customerItem} onPress={() => { setSelectedCustomer(c); setShowCustomerPicker(false); }}>
                <Text style={styles.customerName}>{c.name}</Text>
                <Text style={styles.customerPhone}>{c.phone}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setShowCustomerPicker(false)} style={styles.customerClose}>
            <Text style={styles.customerCloseText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      )}

      {showSuspendedModal && (
        <View style={styles.suspendedModal}>
          <ScrollView>
            {suspendedOrders.map(o => (
              <TouchableOpacity key={o.id} style={styles.suspendedItem} onPress={() => resumeOrder(o)}>
                <Text style={styles.suspendedName}>سلة ({o.items?.length || 0} منتجات)</Text>
                <Text style={styles.suspendedDate}>{new Date(o.suspendedAt).toLocaleDateString()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setShowSuspendedModal(false)} style={styles.suspendedClose}>
            <Text style={styles.suspendedCloseText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  loading: { color: '#94a3b8', fontSize: 16 },
  error: { color: '#ef4444', fontSize: 16 },
  banner: { backgroundColor: 'rgba(249, 115, 22, 0.1)', padding: 12, alignItems: 'center' },
  bannerText: { color: '#ea580c', fontSize: 13, fontWeight: '600' },
  toolbar: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { position: 'absolute', right: 36, zIndex: 1 },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, fontSize: 14, color: '#0f172a', textAlign: 'right' },
  cameraBtn: { position: 'absolute', left: 12, zIndex: 1, padding: 4 },
  quickModeBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e2e8f0' },
  quickModeActive: { backgroundColor: '#3b82f6' },
  controlsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  controlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  discountBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  controlActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  discountActive: { backgroundColor: 'rgba(217, 70, 239, 0.1)', borderColor: '#d946ef' },
  controlText: { fontSize: 12, color: '#64748b', fontFamily: 'Cairo' },
  categoryBar: { paddingHorizontal: 12, paddingBottom: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', marginRight: 6 },
  categoryChipActive: { backgroundColor: '#3b82f6' },
  categoryText: { fontSize: 11, color: '#64748b', fontFamily: 'Cairo' },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  productGrid: { flex: 1, paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridQuick: { justifyContent: 'space-between' },
  gridNormal: {},
  productCard: { borderRadius: 12, padding: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  productCardQuick: { width: '23%', aspectRatio: 1 },
  productCardNormal: { width: '48%' },
  productCardPromo: { borderColor: '#d946ef' },
  productName: { fontSize: 11, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo', marginBottom: 2 },
  productNameQuick: { fontSize: 9, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'center' },
  productPrice: { fontSize: 12, fontWeight: 'bold', color: '#3b82f6' },
  productPromo: { fontSize: 9, color: '#d946ef', marginTop: 2 },
  cartContainer: { borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' },
  cartList: { maxHeight: 200 },
  cartEmpty: { textAlign: 'center', color: '#94a3b8', padding: 16 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo' },
  cartItemPrice: { fontSize: 10, color: '#94a3b8' },
  cartItemPromo: { fontSize: 9, color: '#d946ef' },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 8 },
  qtyBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  qtyValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 12, fontWeight: 'bold', color: '#3b82f6', width: 50, textAlign: 'right' },
  removeBtn: { padding: 6, marginLeft: 6 },
  totals: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalLabel: { fontSize: 12, color: '#94a3b8' },
  totalValue: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
  totalBorder: { borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalLabelBold: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  totalValueBold: { fontSize: 16, fontWeight: 'bold', color: '#3b82f6' },
  actionButtons: { padding: 12, gap: 8 },
  checkoutBtn: { backgroundColor: '#3b82f6', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  checkoutBtnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  quickActionText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Cairo' },
  customerModal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  customerList: { maxHeight: 300, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  customerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  customerName: { fontSize: 14, fontWeight: '600', color: '#0f172a', textAlign: 'right' },
  customerPhone: { fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  customerClose: { padding: 16, alignItems: 'center', backgroundColor: '#f8fafc' },
  customerCloseText: { color: '#94a3b8', fontSize: 14 },
  suspendedModal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  suspendedItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  suspendedName: { fontSize: 14, fontWeight: '600', color: '#0f172a', textAlign: 'right' },
  suspendedDate: { fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  suspendedClose: { padding: 16, alignItems: 'center', backgroundColor: '#f8fafc' },
  suspendedCloseText: { color: '#94a3b8', fontSize: 14 },
});

export default POSScreen;
