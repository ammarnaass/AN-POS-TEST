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
  ChevronLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Promotion, Product } from '@shared/types';
import { useI18n } from '@/store/i18nStore';
import { useTheme } from '@/theme';

export const PromotionsScreen = ({ navigation }: any) => {
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const { isDark, colors } = useTheme();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';

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
      Alert.alert(t('common.warning'), t('promotions.includedProducts'));
      return;
    }
    const valNum = parseFloat(discountValue);
    if (!valNum || valNum <= 0) {
      Alert.alert(t('common.warning'), t('pos.pleaseEnterValidPrice'));
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      await db.promotions.add({
        id: generateId(),
        name: `${t('promotions.title')} ${selectedProduct.name}`,
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
      Alert.alert(t('common.error'), `${err instanceof Error ? err.message : t('common.error')}`);
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
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleDelete = (promo: Promotion) => {
    Alert.alert(t('common.delete'), t('promotions.deletePromoConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await db.promotions.delete(promo.id);
            await loadPromotionsData();
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            setSelectedProduct(null);
            setModalVisible(true);
          }}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.addBtnText}>{t('promotions.addPromotion')}</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text.primary }]}>{t('promotions.title')}</Text>
      </View>

      {/* Quick navigation to Packs (Bundles) */}
      <View style={{ paddingHorizontal: 12, marginVertical: 8 }}>
        <TouchableOpacity
          style={[styles.packsBanner, { backgroundColor: isDark ? colors.surfaceElevated : '#eff6ff', borderColor: colors.primary[200], flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => navigation.navigate('Packs')}
        >
          <Layers size={18} color={colors.primary[600]} />
          <Text style={[styles.packsBannerText, { color: colors.primary[600] }]}>{t('promotions.packsTitle')}</Text>
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
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <Tag size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('promotions.noPromosFound')}</Text>
            <Text style={[styles.emptySub, { color: colors.text.secondary }]}>{t('promotions.noPacksDesc')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 12 }}>
            {promotions.map((promo) => {
              const prod = productMap[promo.productId || (promo as any).product_id || ''];
              const isActive = promo.active !== false && promo.status !== 'inactive';

              return (
                <View key={promo.id} style={[styles.promoCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
                  <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.actionsGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity onPress={() => handleDelete(promo)} style={styles.deleteBtn}>
                        <Trash2 size={16} color={colors.danger.main} />
                      </TouchableOpacity>
                      <Switch
                        value={isActive}
                        onValueChange={() => handleToggleActive(promo)}
                        trackColor={{ true: colors.success.main, false: colors.border.default }}
                      />
                    </View>

                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1, marginHorizontal: 10 }}>
                      <Text style={[styles.promoName, { color: colors.text.primary }]}>{promo.name || prod?.name || t('promotions.title')}</Text>
                      {prod ? <Text style={[styles.prodSub, { color: colors.text.secondary }]}>{prod.name}</Text> : null}
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

                  <View style={[styles.promoMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {t('pos.discount')}: {promo.discountValue || (promo as any).discount_value}{' '}
                        {(promo.discountType || (promo as any).discount_type) === 'percent'
                          ? '%'
                          : currency}
                      </Text>
                    </View>

                    <Text style={[styles.datesText, { color: colors.text.tertiary }]}>
                      {promo.startDate || (promo as any).start_date} →{' '}
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('promotions.addPromotion')}</Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.includedProducts')} *</Text>
                <TouchableOpacity
                  style={[styles.selectBtn, { borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setProductPickerVisible(true)}
                >
                  <Text style={[styles.selectBtnText, { color: selectedProduct ? colors.text.primary : colors.text.tertiary }]}>
                    {selectedProduct ? selectedProduct.name : t('inventory.selectCategory')}
                  </Text>
                  <Package size={16} color={colors.primary[600]} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.promoType')}</Text>
                <View style={[styles.typeSelector, { backgroundColor: isDark ? colors.surfaceElevated : '#f1f5f9' }]}>
                  <TouchableOpacity
                    style={[styles.typeBtn, discountType === 'percent' && styles.typeBtnActive]}
                    onPress={() => setDiscountType('percent')}
                  >
                    <Text style={[styles.typeBtnText, discountType === 'percent' && { color: '#fff' }]}>
                      %
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, discountType === 'amount' && styles.typeBtnActive]}
                    onPress={() => setDiscountType('amount')}
                  >
                    <Text style={[styles.typeBtnText, discountType === 'amount' && { color: '#fff' }]}>
                      {currency}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('pos.discount')} *</Text>
                <TextInput
                  style={[styles.formInputAmount, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              <View style={[styles.rowInputs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.endDate')}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                    textAlign="center"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('promotions.startDate')}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                    textAlign="center"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleSavePromo} disabled={saving}>
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
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                  onPress={() => {
                    setSelectedProduct(p);
                    setProductPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickItemPrice, { color: colors.primary[600] }]}>{(p.retailPrice || 0).toLocaleString(localeStr)} {currency}</Text>
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
