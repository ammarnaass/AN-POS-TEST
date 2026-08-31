import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {
  ArrowRight,
  Plus,
  Trash2,
  Check,
  Search,
  ShoppingCart,
  User,
  Package,
  Calendar,
  X,
  ChevronLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Supplier, Product } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/store/i18nStore';
import { useTheme } from '@/theme';

interface PurchaseItemState {
  productId: string;
  name: string;
  qty: number;
  costPrice: number;
  lineTotal: number;
}

export const PurchaseFormScreen = ({ navigation, route }: any) => {
  const { user } = useAuthStore();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const { isDark, colors } = useTheme();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';

  const preselectedSupplierId = route?.params?.supplierId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [items, setItems] = useState<PurchaseItemState[]>([]);
  const [amountPaid, setAmountPaid] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Product Picker Modal
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Supplier Picker Modal
  const [supplierPickerVisible, setSupplierPickerVisible] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allSuppliers, allProducts] = await Promise.all([
        db.suppliers.toArray(),
        db.products.toArray(),
      ]);
      setSuppliers(allSuppliers);
      setProducts(allProducts);

      if (preselectedSupplierId) {
        const found = allSuppliers.find((s: any) => s.id === preselectedSupplierId);
        if (found) setSelectedSupplier(found);
      }
    } catch (err) {
      console.warn('Failed to load initial data:', err);
    }
    setLoading(false);
  }

  const addItem = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    const defaultCost = product.costPrice || (product as any).purchase_price || (product as any).purchasePrice || 0;

    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex
            ? { ...it, qty: it.qty + 1, lineTotal: (it.qty + 1) * it.costPrice }
            : it
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          costPrice: defaultCost,
          lineTotal: defaultCost,
        },
      ]);
    }
    setProductPickerVisible(false);
  };

  const updateItemQty = (index: number, qty: number) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === index
          ? { ...it, qty: Math.max(1, qty), lineTotal: Math.max(1, qty) * it.costPrice }
          : it
      )
    );
  };

  const updateItemCost = (index: number, cost: number) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === index
          ? { ...it, costPrice: cost, lineTotal: it.qty * cost }
          : it
      )
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const paidNum = parseFloat(amountPaid) || 0;
  const remainingDebt = Math.max(0, subtotal - paidNum);

  const handleSavePurchase = async () => {
    if (!selectedSupplier) {
      Alert.alert(t('common.warning'), t('suppliers.selectSupplier'));
      return;
    }
    if (items.length === 0) {
      Alert.alert(t('common.warning'), t('suppliers.noProductsAdded'));
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const purchaseId = generateId();

      // 1. Save purchase invoice
      await db.purchases.add({
        id: purchaseId,
        number: invoiceNumber.trim() || `PUR-${Date.now().toString().slice(-6)}`,
        date: nowIso,
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        items: JSON.stringify(items),
        subtotal: subtotal,
        discount: 0,
        total: subtotal,
        amount_paid: paidNum,
        status: remainingDebt > 0 ? (paidNum > 0 ? 'partial' : 'unpaid') : 'paid',
        notes: notes.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2. Update stock quantities and cost prices in products
      for (const item of items) {
        const prod = await db.products.get(item.productId);
        if (prod) {
          const currentQty = Number(prod.quantity || prod.qty || 0);
          await db.products.update(item.productId, {
            quantity: currentQty + item.qty,
            purchase_price: item.costPrice,
            cost_price: item.costPrice,
            updated_at: nowIso,
          });

          // 3. Record stock movement
          try {
            await db.stockMovements.add({
              id: generateId(),
              date: nowIso,
              type: 'purchase',
              product_id: item.productId,
              qty: item.qty,
              reason: `Purchase ${invoiceNumber}`,
              reference_id: purchaseId,
              created_by: user?.name || '',
              created_at: nowIso,
              updated_at: nowIso,
            });
          } catch {}
        }
      }

      // 4. Update supplier debt balance if remaining debt > 0
      if (remainingDebt > 0) {
        const currentBal = Number(selectedSupplier.balance || 0);
        await db.suppliers.update(selectedSupplier.id, {
          balance: currentBal + remainingDebt,
          updated_at: nowIso,
        });
      }

      Alert.alert('✓', t('pos.saleCompleted'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('common.error'), `${t('common.error')}: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSaving(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch))
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBackBtn, { backgroundColor: isDark ? colors.surfaceSubtle : '#f1f5f9' }]}>
          <ChevronLeft size={22} color={colors.text.primary} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('suppliers.purchaseInvoice')}</Text>
        <TouchableOpacity
          style={[styles.headerSaveBtn, items.length === 0 && styles.headerSaveBtnDisabled]}
          onPress={handleSavePurchase}
          disabled={saving || items.length === 0}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.headerSaveBtnText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Supplier Selector */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
          <Text style={[styles.cardLabel, { color: colors.text.secondary, textAlign }]}>{t('suppliers.title')}</Text>
          <TouchableOpacity
            style={[styles.pickerSelector, { backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', borderColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setSupplierPickerVisible(true)}
          >
            <Text style={[styles.pickerSelectorText, { color: selectedSupplier ? colors.text.primary : colors.text.tertiary, textAlign }]}>
              {selectedSupplier ? selectedSupplier.name : t('suppliers.selectSupplier')}
            </Text>
            <User size={18} color={colors.primary[600]} />
          </TouchableOpacity>

          <View style={[styles.rowInputs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: colors.text.secondary, textAlign }]}>{t('sales.invoiceNumber')}</Text>
              <TextInput
                style={[styles.inputSmall, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
              />
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.addProductBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => {
              setProductSearch('');
              setProductPickerVisible(true);
            }}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.addProductBtnText}>{t('suppliers.addProduct')}</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('suppliers.invoiceItems')} ({items.length})</Text>
        </View>

        {items.length === 0 ? (
          <View style={[styles.emptyItemsBox, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
            <Package size={40} color={colors.text.tertiary} />
            <Text style={[styles.emptyItemsText, { color: colors.text.primary }]}>{t('suppliers.noProductsAdded')}</Text>
            <Text style={[styles.emptyItemsSub, { color: colors.text.secondary }]}>{t('suppliers.clickAddProduct')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((item, idx) => (
              <View key={idx} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
                <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity onPress={() => removeItem(idx)} style={styles.itemDeleteBtn}>
                    <Trash2 size={16} color={colors.danger.main} />
                  </TouchableOpacity>
                  <Text style={[styles.itemCardName, { color: colors.text.primary, textAlign }]}>{item.name}</Text>
                </View>

                <View style={[styles.itemInputsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.itemInputCol}>
                    <Text style={[styles.itemInputLabel, { color: colors.text.secondary }]}>{t('common.total')} ({currency})</Text>
                    <Text style={[styles.itemTotalDisplay, { color: colors.text.primary }]}>{item.lineTotal.toLocaleString(localeStr)}</Text>
                  </View>

                  <View style={styles.itemInputCol}>
                    <Text style={[styles.itemInputLabel, { color: colors.text.secondary }]}>{t('suppliers.unitCostPrice')} ({currency})</Text>
                    <TextInput
                      style={[styles.itemInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc' }]}
                      value={String(item.costPrice)}
                      onChangeText={(v) => updateItemCost(idx, parseFloat(v) || 0)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>

                  <View style={styles.itemInputCol}>
                    <Text style={[styles.itemInputLabel, { color: colors.text.secondary }]}>{t('pos.quantity')}</Text>
                    <TextInput
                      style={[styles.itemInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc' }]}
                      value={String(item.qty)}
                      onChangeText={(v) => updateItemQty(idx, parseFloat(v) || 1)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Financial Summary */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border.default, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary, textAlign }]}>{t('suppliers.financialSummary')}</Text>

          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.summaryVal, { color: colors.text.primary }]}>{subtotal.toLocaleString(localeStr)} {currency}</Text>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>{t('pos.totalDue')}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.default }]} />

          <View style={[styles.paymentInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TextInput
              style={[styles.paidInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
              value={amountPaid}
              onChangeText={setAmountPaid}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
            />
            <Text style={[styles.paymentInputLabel, { color: colors.text.secondary }]}>{t('pos.amountPaid')}:</Text>
          </View>

          <View style={[styles.summaryRow, { marginTop: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.summaryVal, { color: remainingDebt > 0 ? colors.danger.main : colors.success.main, fontWeight: 'bold' }]}>
              {remainingDebt.toLocaleString(localeStr)} {currency}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>{t('suppliers.remainingSupplierDebt')}:</Text>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={[styles.cardLabel, { color: colors.text.secondary, textAlign }]}>{t('pos.notePlaceholder')}</Text>
            <TextInput
              style={[styles.notesInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
              placeholder={t('pos.notePlaceholder')}
              placeholderTextColor={colors.text.tertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </View>
      </ScrollView>

      {/* Supplier Picker Modal */}
      <Modal visible={supplierPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setSupplierPickerVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('suppliers.selectSupplier')}</Text>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {suppliers.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => {
                    setSelectedSupplier(s);
                    setSupplierPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemDebt, { color: colors.warning.main }]}>
                    {(s.balance || 0).toLocaleString(localeStr)} {currency}
                  </Text>
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={[styles.pickerItemName, { color: colors.text.primary }]}>{s.name}</Text>
                    {s.phone ? <Text style={[styles.pickerItemSub, { color: colors.text.tertiary }]}>{s.phone}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={productPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setProductPickerVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('suppliers.addProduct')}</Text>
            </View>

            <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surfaceSubtle : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Search size={16} color={colors.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text.primary, textAlign }]}
                placeholder={t('pos.searchPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                value={productSearch}
                onChangeText={setProductSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {filteredProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickerItem}
                  onPress={() => addItem(p)}
                >
                  <Text style={styles.pickerItemPrice}>
                    {(p.retailPrice || 0).toLocaleString('ar-DZ')} دج
                  </Text>
                  <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 10 }}>
                    <Text style={styles.pickerItemName}>{p.name}</Text>
                    <Text style={styles.pickerItemSub}>
                      المتوفر: {p.quantity || 0} {p.unit || 'قطعة'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  headerSaveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerSaveBtnDisabled: { opacity: 0.5 },
  headerSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },

  scroll: { flex: 1, padding: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  cardLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', marginBottom: 6, textAlign: 'right' },
  pickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  pickerSelectorText: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo' },

  rowInputs: { flexDirection: 'row', gap: 10 },
  inputSmall: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Cairo',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addProductBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },

  emptyItemsBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyItemsText: { fontSize: 14, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', marginTop: 10 },
  emptyItemsSub: { fontSize: 11, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'center', marginTop: 4 },

  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemDeleteBtn: { padding: 4 },
  itemCardName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right', flex: 1, marginRight: 8 },

  itemInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  itemInputCol: { flex: 1 },
  itemInputLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'center', marginBottom: 4 },
  itemInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  itemTotalDisplay: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3b82f6',
    fontFamily: 'Cairo',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: { fontSize: 13, color: '#64748b', fontFamily: 'Cairo' },
  summaryVal: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  paymentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  paymentInputLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  paidInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    minWidth: 110,
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 50,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 6, fontSize: 12, color: '#0f172a', textAlign: 'right' },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  pickerItemSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  pickerItemPrice: { fontSize: 13, fontWeight: 'bold', color: '#3b82f6' },
  pickerItemDebt: { fontSize: 13, fontWeight: 'bold', color: '#ef4444' },
});

export default PurchaseFormScreen;
