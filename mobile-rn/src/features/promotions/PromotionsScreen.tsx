import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import {
  Tag,
  Plus,
  Search,
  Calendar,
  Percent,
  Trash2,
  X,
  Check,
  Package,
  Layers,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Promotion, Product } from '@shared/types';

export const PromotionsScreen = ({ navigation }: any) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [maxQuantity, setMaxQuantity] = useState('0');
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPromotionsData();
  }, []);

  async function loadPromotionsData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allPromos, allProds] = await Promise.all([
        db.promotions.toArray(),
        db.products.toArray(),
      ]);
      setPromotions(allPromos);
      setProducts(allProds);
    } catch (err) {
      console.warn('Failed to load promotions:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPromotionsData();
    setRefreshing(false);
  };

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  const handleSavePromo = async () => {
    if (!selectedProduct) {
      Alert.alert('تنبيه', 'يرجى اختيار المنتج المطبق عليه العرض');
      return;
    }
    const valNum = parseFloat(discountValue);
    if (!valNum || valNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال قيمة تخفيض صالحة');
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      await db.promotions.add({
        id: generateId(),
        name: `عرض ${selectedProduct.name}`,
        product_id: selectedProduct.id,
        productId: selectedProduct.id,
        discount_type: discountType,
        discountType: discountType,
        discount_value: valNum,
        discountValue: valNum,
        start_date: startDate,
        startDate: startDate,
        end_date: endDate,
        endDate: endDate,
        max_quantity: parseFloat(maxQuantity) || 0,
        maxQuantity: parseFloat(maxQuantity) || 0,
        active: 1,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });

      setModalVisible(false);
      setSelectedProduct(null);
      await loadPromotionsData();
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ العرض: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSaving(false);
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      const isCurrentlyActive = promo.active !== false && promo.status !== 'inactive';
      await db.promotions.update(promo.id, {
        active: isCurrentlyActive ? 0 : 1,
        status: isCurrentlyActive ? 'inactive' : 'active',
        updated_at: new Date().toISOString(),
      });
      await loadPromotionsData();
    } catch {
      Alert.alert('خطأ', 'فشل تغيير حالة العرض');
    }
  };

  const handleDelete = (promo: Promotion) => {
    Alert.alert('حذف العرض', 'هل أنت متأكد من حذف هذا العرض الترويجي؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.promotions.delete(promo.id);
            await loadPromotionsData();
          } catch {
            Alert.alert('خطأ', 'فشل حذف العرض');
          }
        },
      },
    ]);
  };

  const filteredProducts = products.filter(
    (p) =>
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch))
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setSelectedProduct(null);
            setModalVisible(true);
          }}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>عرض جديد</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>العروض والتخفيضات المجدولة</Text>
      </View>

      {/* Quick navigation to Packs (Bundles) */}
      <View style={{ paddingHorizontal: 12, marginVertical: 8 }}>
        <TouchableOpacity
          style={styles.packsBanner}
          onPress={() => navigation.navigate('Packs')}
        >
          <Layers size={18} color="#3b82f6" />
          <Text style={styles.packsBannerText}>إدارة الحزم والباقات المجمعة (Packs)</Text>
        </TouchableOpacity>
      </View>

      {/* Promotions List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <Tag size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>لا توجد عروض ترويجية</Text>
            <Text style={styles.emptySub}>أنشئ عروض تخفيض بنسبة أو مبلغ ثابت لزيادة المبيعات</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 12 }}>
            {promotions.map((promo) => {
              const prod = productMap[promo.productId || (promo as any).product_id || ''];
              const isActive = promo.active !== false && promo.status !== 'inactive';

              return (
                <View key={promo.id} style={styles.promoCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.actionsGroup}>
                      <TouchableOpacity onPress={() => handleDelete(promo)} style={styles.deleteBtn}>
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                      <Switch
                        value={isActive}
                        onValueChange={() => handleToggleActive(promo)}
                        trackColor={{ true: '#22c55e', false: '#cbd5e1' }}
                      />
                    </View>

                    <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 10 }}>
                      <Text style={styles.promoName}>{promo.name || prod?.name || 'عرض ترويجي'}</Text>
                      {prod ? <Text style={styles.prodSub}>{prod.name}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.promoMetaRow}>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        خصم: {promo.discountValue || (promo as any).discount_value}{' '}
                        {(promo.discountType || (promo as any).discount_type) === 'percent'
                          ? '%'
                          : 'دج'}
                      </Text>
                    </View>

                    <Text style={styles.datesText}>
                      من {promo.startDate || (promo as any).start_date} إلى{' '}
                      {promo.endDate || (promo as any).end_date}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Promotion Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إنشاء عرض ترويجي جديد</Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>المنتج المطبق عليه العرض *</Text>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setProductPickerVisible(true)}
                >
                  <Text style={[styles.selectBtnText, !selectedProduct && { color: '#94a3b8' }]}>
                    {selectedProduct ? selectedProduct.name : 'اختر المنتج من المخزون...'}
                  </Text>
                  <Package size={16} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>نوع التخفيض</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeBtn, discountType === 'percent' && styles.typeBtnActive]}
                    onPress={() => setDiscountType('percent')}
                  >
                    <Text style={[styles.typeBtnText, discountType === 'percent' && { color: '#fff' }]}>
                      نسبة مئوية (%)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, discountType === 'amount' && styles.typeBtnActive]}
                    onPress={() => setDiscountType('amount')}
                  >
                    <Text style={[styles.typeBtnText, discountType === 'amount' && { color: '#fff' }]}>
                      مبلغ ثابت (دج)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>قيمة التخفيض *</Text>
                <TextInput
                  style={styles.formInputAmount}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>تاريخ النهاية</Text>
                  <TextInput
                    style={styles.formInput}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    textAlign="center"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>تاريخ البداية</Text>
                  <TextInput
                    style={styles.formInput}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    textAlign="center"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSavePromo} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalConfirmBtnText}>حفظ العرض</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={productPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setProductPickerVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>اختر المنتج</Text>
            </View>

            <View style={styles.searchBar}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="ابحث بالاسم أو الباركود..."
                value={productSearch}
                onChangeText={setProductSearch}
                textAlign="right"
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {filteredProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickItem}
                  onPress={() => {
                    setSelectedProduct(p);
                    setProductPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickItemPrice}>{(p.retailPrice || 0).toLocaleString('ar-DZ')} دج</Text>
                  <Text style={styles.pickItemName}>{p.name}</Text>
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
  screenTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },

  packsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 12,
    borderRadius: 14,
  },
  packsBannerText: { color: '#1d4ed8', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },

  scroll: { flex: 1 },
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteBtn: { padding: 4 },
  promoName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right' },
  prodSub: { fontSize: 11, color: '#64748b', fontFamily: 'Cairo', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },

  promoMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountBadge: { backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  discountBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#ef4444', fontFamily: 'Cairo' },
  datesText: { fontSize: 11, color: '#94a3b8', fontFamily: 'Cairo' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Cairo', marginBottom: 6, textAlign: 'right' },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectBtnText: { fontSize: 13, color: '#0f172a', fontFamily: 'Cairo' },

  typeSelector: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#f1f5f9' },
  typeBtnActive: { backgroundColor: '#3b82f6' },
  typeBtnText: { fontSize: 12, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo' },

  formInputAmount: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    padding: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  rowInputs: { flexDirection: 'row', gap: 10 },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
  },

  modalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 6, fontSize: 12, color: '#0f172a', textAlign: 'right' },
  pickItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickItemName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  pickItemPrice: { fontSize: 13, fontWeight: 'bold', color: '#3b82f6' },
});

export default PromotionsScreen;
