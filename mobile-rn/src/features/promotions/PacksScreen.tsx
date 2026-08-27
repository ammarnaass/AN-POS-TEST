import React, { useState, useEffect } from 'react';
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
  RefreshControl,
} from 'react-native';
import {
  Layers,
  Plus,
  Trash2,
  Package,
  Barcode,
  X,
  Check,
  Search,
  ArrowRight,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Pack, Product } from '@shared/types';

export const PacksScreen = ({ navigation }: any) => {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [packName, setPackName] = useState('');
  const [packBarcode, setPackBarcode] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; name: string; qty: number }[]>([]);
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPacksData();
  }, []);

  async function loadPacksData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allPacks, allProducts] = await Promise.all([
        db.packs.toArray(),
        db.products.toArray(),
      ]);
      setPacks(allPacks);
      setProducts(allProducts);
    } catch (err) {
      console.warn('Failed to load packs:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPacksData();
    setRefreshing(false);
  };

  const addItemToPack = (product: Product) => {
    const existing = selectedItems.find((i) => i.productId === product.id);
    if (existing) {
      setSelectedItems((prev) =>
        prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i))
      );
    } else {
      setSelectedItems((prev) => [...prev, { productId: product.id, name: product.name, qty: 1 }]);
    }
    setProductPickerVisible(false);
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePack = async () => {
    if (!packName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الباقة');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('تنبيه', 'يرجى إضافة منتج واحد على الأقل داخل الباقة');
      return;
    }
    const priceNum = parseFloat(packPrice);
    if (!priceNum || priceNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر صالح للباقة');
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      await db.packs.add({
        id: generateId(),
        name: packName.trim(),
        barcode: packBarcode.trim() || `PACK-${Date.now().toString().slice(-6)}`,
        price: priceNum,
        items: JSON.stringify(selectedItems),
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });

      setModalVisible(false);
      setPackName('');
      setPackBarcode('');
      setPackPrice('');
      setSelectedItems([]);
      await loadPacksData();
      Alert.alert('✓ تم الحفظ', 'تم إنشاء الباقة المجمعة بنجاح.');
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ الباقة: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSaving(false);
  };

  const handleDeletePack = (pack: Pack) => {
    Alert.alert('حذف الباقة', `هل أنت متأكد من حذف الباقة "${pack.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.packs.delete(pack.id);
            await loadPacksData();
          } catch {
            Alert.alert('خطأ', 'فشل حذف الباقة');
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ArrowRight size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الحزم والباقات (Packs)</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setSelectedItems([]);
            setModalVisible(true);
          }}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>باقة جديدة</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : packs.length === 0 ? (
          <View style={styles.emptyState}>
            <Layers size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>لا توجد باقات منشأة</Text>
            <Text style={styles.emptySub}>اجمع عدة منتجات في حزمة واحدة بسعر مميز وباركود خاص</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 12 }}>
            {packs.map((p) => {
              const packItemsList: any[] = Array.isArray(p.items)
                ? p.items
                : typeof p.items === 'string'
                ? JSON.parse(p.items || '[]')
                : [];

              return (
                <View key={p.id} style={styles.packCard}>
                  <View style={styles.packHeader}>
                    <TouchableOpacity onPress={() => handleDeletePack(p)} style={styles.deleteBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 8 }}>
                      <Text style={styles.packName}>{p.name}</Text>
                      {p.barcode ? (
                        <View style={styles.barcodeRow}>
                          <Text style={styles.barcodeText}>{p.barcode}</Text>
                          <Barcode size={12} color="#94a3b8" />
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.itemsPreview}>
                    <Text style={styles.itemsLabel}>محتويات الباقة:</Text>
                    {packItemsList.map((item, idx) => (
                      <Text key={idx} style={styles.itemBullet}>
                        • {item.name || 'منتج'} (الكمية: {item.qty || 1})
                      </Text>
                    ))}
                  </View>

                  <View style={styles.packFooter}>
                    <Text style={styles.packPrice}>
                      {(p.packPrice || (p as any).price || 0).toLocaleString('ar-DZ')} دج
                    </Text>
                    <Text style={styles.priceLabel}>سعر الباقة:</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Pack Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>إنشاء باقة جديدة</Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>اسم الباقة *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="مثال: باقة النظافة المنزلية"
                  value={packName}
                  onChangeText={setPackName}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>باركود الباقة</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="PACK-123456"
                  value={packBarcode}
                  onChangeText={setPackBarcode}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>سعر بيع الباقة الإجمالي (دج) *</Text>
                <TextInput
                  style={styles.formInputAmount}
                  placeholder="0.00"
                  value={packPrice}
                  onChangeText={setPackPrice}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              <View style={styles.sectionHeaderRow}>
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => setProductPickerVisible(true)}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={styles.addItemBtnText}>إضافة صنف</Text>
                </TouchableOpacity>
                <Text style={styles.formLabel}>المنتجات المكونة للباقة ({selectedItems.length})</Text>
              </View>

              {selectedItems.map((item, idx) => (
                <View key={idx} style={styles.selectedItemRow}>
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                  <Text style={styles.selectedItemText}>
                    {item.name} (عدد {item.qty})
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSavePack} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalConfirmBtnText}>حفظ الباقة</Text>
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
              <Text style={styles.modalTitle}>اختر المنتج لإضافته للباقة</Text>
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
                  onPress={() => addItemToPack(p)}
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
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },

  scroll: { flex: 1, paddingVertical: 10 },
  packCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  packHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn: { padding: 4 },
  packName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  barcodeText: { fontSize: 11, color: '#94a3b8' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },

  itemsPreview: { gap: 4 },
  itemsLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', textAlign: 'right' },
  itemBullet: { fontSize: 12, color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right' },

  packFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10 },
  priceLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Cairo' },
  packPrice: { fontSize: 16, fontWeight: '800', color: '#3b82f6', fontFamily: 'Cairo' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Cairo', marginBottom: 4, textAlign: 'right' },
  formInput: {
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

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  addItemBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold', fontFamily: 'Cairo' },

  selectedItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 6 },
  selectedItemText: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo' },

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

export default PacksScreen;
