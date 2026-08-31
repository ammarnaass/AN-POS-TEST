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
  ArrowLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Pack, Product } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';

export const PacksScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, alignItems, currency } = useI18n();
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
      Alert.alert(t('common.warning'), t('promotions.packName'));
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert(t('common.warning'), t('promotions.packItems'));
      return;
    }
    const priceNum = parseFloat(packPrice);
    if (!priceNum || priceNum <= 0) {
      Alert.alert(t('common.warning'), t('promotions.packPrice'));
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      await db.packs.add({
        id: generateId(),
        name: packName.trim(),
        barcode: packBarcode.trim() || undefined,
        pack_price: priceNum,
        items: JSON.stringify(selectedItems),
        is_active: 1,
        created_at: nowIso,
        updated_at: nowIso,
      } as any);

      setModalVisible(false);
      setPackName('');
      setPackBarcode('');
      setPackPrice('');
      setSelectedItems([]);
      await loadPacksData();
      Alert.alert(t('common.success'), t('common.done'));
    } catch (err) {
      Alert.alert(t('common.error'), `${err instanceof Error ? err.message : t('common.error')}`);
    }
    setSaving(false);
  };

  const handleDeletePack = (pack: Pack) => {
    Alert.alert(t('common.delete'), `${t('common.delete')} "${pack.name}"?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await db.packs.delete(pack.id);
            await loadPacksData();
          } catch {
            Alert.alert(t('common.error'), t('common.error'));
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

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('promotions.packsTitle')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary[600] }]}
          onPress={() => {
            setSelectedItems([]);
            setModalVisible(true);
          }}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>{t('promotions.addPack')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : packs.length === 0 ? (
          <View style={styles.emptyState}>
            <Layers size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('promotions.noPacks')}</Text>
            <Text style={[styles.emptySub, { color: colors.text.secondary }]}>{t('promotions.noPacksDesc')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 12 }}>
            {packs.map((p) => {
              let packItemsList: any[] = [];
              if (Array.isArray(p.items)) {
                packItemsList = p.items;
              } else if (typeof p.items === 'string') {
                try {
                  const parsed = JSON.parse(p.items);
                  if (Array.isArray(parsed)) packItemsList = parsed;
                  else if (parsed && typeof parsed === 'object') packItemsList = Object.values(parsed);
                } catch {
                  packItemsList = [];
                }
              } else if (p.items && typeof p.items === 'object') {
                packItemsList = Object.values(p.items);
              }

              return (
                <View key={p.id} style={[styles.packCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
                  <View style={styles.packHeader}>
                    <TouchableOpacity onPress={() => handleDeletePack(p)} style={styles.deleteBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                    <View style={{ alignItems, flex: 1, marginHorizontal: 8 }}>
                      <Text style={[styles.packName, { color: colors.text.primary, textAlign }]}>{p.name}</Text>
                      {p.barcode ? (
                        <View style={styles.barcodeRow}>
                          <Text style={[styles.barcodeText, { color: colors.text.secondary }]}>{p.barcode}</Text>
                          <Barcode size={12} color={colors.text.tertiary} />
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

                  <View style={styles.itemsPreview}>
                    <Text style={[styles.itemsLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.packItems')}:</Text>
                    {packItemsList.map((item, idx) => (
                      <Text key={idx} style={[styles.itemBullet, { color: colors.text.primary, textAlign }]}>
                        • {item.name || t('inventory.productName')} ({t('inventory.stockQuantity')}: {item.qty || 1})
                      </Text>
                    ))}
                  </View>

                  <View style={styles.packFooter}>
                    <Text style={[styles.packPrice, { color: colors.primary[600] }]}>
                      {(p.packPrice || (p as any).price || 0).toLocaleString()} {currency}
                    </Text>
                    <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>{t('promotions.packPrice')}:</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('promotions.addPack')}</Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.packName')} *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', textAlign }]}
                  placeholder={t('promotions.packName')}
                  placeholderTextColor={colors.text.tertiary}
                  value={packName}
                  onChangeText={setPackName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('inventory.barcode')}</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', textAlign }]}
                  placeholder="PACK-123456"
                  placeholderTextColor={colors.text.tertiary}
                  value={packBarcode}
                  onChangeText={setPackBarcode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.packPrice')} ({currency}) *</Text>
                <TextInput
                  style={[styles.formInputAmount, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  value={packPrice}
                  onChangeText={setPackPrice}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.addItemBtn, { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setProductPickerVisible(true)}
                >
                  <Plus size={14} color="#fff" />
                  <Text style={styles.addItemBtnText}>{t('promotions.addPack')}</Text>
                </TouchableOpacity>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.packItems')} ({selectedItems.length})</Text>
              </View>

              {selectedItems.map((item, idx) => (
                <View key={idx} style={[styles.selectedItemRow, { backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', borderColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Trash2 size={16} color={colors.danger.main} />
                  </TouchableOpacity>
                  <Text style={[styles.selectedItemText, { color: colors.text.primary, textAlign }]}>
                    {item.name} ({t('inventory.stockQuantity')}: {item.qty})
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleSavePack} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalConfirmBtnText}>{t('common.save')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={productPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setProductPickerVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('inventory.selectCategory')}</Text>
            </View>

            <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surfaceElevated : '#f1f5f9', borderColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Search size={16} color={colors.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text.primary, textAlign }]}
                placeholder={t('inventory.searchPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                value={productSearch}
                onChangeText={setProductSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {filteredProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickItem, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => addItemToPack(p)}
                >
                  <Text style={[styles.pickItemPrice, { color: colors.primary[600] }]}>{(p.retailPrice || 0).toLocaleString()} {currency}</Text>
                  <Text style={[styles.pickItemName, { color: colors.text.primary }]}>{p.name}</Text>
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
