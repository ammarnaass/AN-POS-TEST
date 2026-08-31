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
  Truck,
  Search,
  Plus,
  Phone,
  Edit2,
  Trash2,
  X,
  Check,
  CreditCard,
  ShoppingCart,
  ChevronLeft,
  DollarSign,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Supplier } from '@shared/types';
import { useI18n } from '@/store/i18nStore';
import { useTheme } from '@/theme';

export const SuppliersScreen = ({ navigation }: any) => {
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const { isDark, colors } = useTheme();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filtered, setFiltered] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    taxId: '',
    notes: '',
    balance: '0',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(suppliers);
    } else {
      setFiltered(
        suppliers.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            (s.phone && s.phone.includes(term))
        )
      );
    }
  }, [search, suppliers]);

  async function loadSuppliers() {
    setLoading(true);
    try {
      await ensureInit();
      const all = await db.suppliers.toArray();
      const mapped: Supplier[] = all.map((s: any) => ({
        id: s.id,
        name: s.name || '',
        phone: s.phone || '',
        balance: s.balance || 0,
        address: s.address || '',
        notes: s.notes || '',
        status: s.status || 'active',
        createdAt: s.created_at || s.createdAt,
        updatedAt: s.updated_at || s.updatedAt,
      }));
      setSuppliers(mapped);
      setFiltered(mapped);
    } catch (err) {
      console.warn('Failed to load suppliers:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSuppliers();
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditingSupplier(null);
    setForm({ name: '', phone: '', address: '', taxId: '', notes: '', balance: '0' });
    setModalVisible(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      address: (supplier as any).address || '',
      taxId: (supplier as any).taxId || '',
      notes: (supplier as any).notes || '',
      balance: String(supplier.balance || 0),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common.warning'), t('suppliers.supplierNameRequired'));
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const balanceNum = parseFloat(form.balance) || 0;

      if (editingSupplier) {
        await db.suppliers.update(editingSupplier.id, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          tax_id: form.taxId.trim(),
          notes: form.notes.trim(),
          balance: balanceNum,
          updated_at: nowIso,
        });
      } else {
        await db.suppliers.add({
          id: generateId(),
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          tax_id: form.taxId.trim(),
          notes: form.notes.trim(),
          balance: balanceNum,
          status: 'active',
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
      setModalVisible(false);
      await loadSuppliers();
    } catch (err) {
      Alert.alert(t('common.error'), `${t('suppliers.supplierSaveFailed')}: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSaving(false);
  };

  const handleDelete = (supplier: Supplier) => {
    Alert.alert(t('suppliers.deleteSupplier'), `${t('suppliers.deleteConfirm')} "${supplier.name}"?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await db.suppliers.delete(supplier.id);
            await loadSuppliers();
          } catch {
            Alert.alert(t('common.error'), t('suppliers.deleteFailed'));
          }
        },
      },
    ]);
  };

  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default }]}>
        <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity style={[styles.addBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={openAdd}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>{t('suppliers.addNewSupplier')}</Text>
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.text.primary }]}>{t('suppliers.title')}</Text>
        </View>

        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surfaceSubtle : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Search size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary, textAlign }]}
            placeholder={t('suppliers.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>

      {/* Supplier Debt KPI Banner */}
      <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.kpiIconBox}>
          <Truck size={24} color="#f59e0b" />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.kpiLabel, { color: colors.text.secondary }]}>{t('suppliers.totalDebt')}</Text>
          <Text style={[styles.kpiVal, { color: colors.warning.main }]}>{totalSupplierDebt.toLocaleString(localeStr)} {currency}</Text>
        </View>
      </View>

      {/* Quick Action Button for Purchase Invoice */}
      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        <TouchableOpacity
          style={[styles.newPurchaseBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => navigation.navigate('PurchaseForm')}
        >
          <ShoppingCart size={18} color="#fff" />
          <Text style={styles.newPurchaseBannerText}>{t('suppliers.recordNewPurchase')}</Text>
        </TouchableOpacity>
      </View>

      {/* Suppliers List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Truck size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('suppliers.noSuppliers')}</Text>
            <Text style={[styles.emptySub, { color: colors.text.secondary }]}>{t('suppliers.noSuppliersDesc')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 12 }}>
            {filtered.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.supplierCard, { backgroundColor: colors.surface, borderColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => navigation.navigate('SupplierDetail', { supplierId: s.id, supplier: s })}
              >
                <View style={[styles.cardLeft, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                  <Text style={[styles.debtText, s.balance > 0 ? styles.debtDue : styles.debtZero]}>
                    {(s.balance || 0).toLocaleString(localeStr)} {currency}
                  </Text>
                  <Text style={[styles.debtSubLabel, { color: colors.text.tertiary }]}>{t('suppliers.dueBalance')}</Text>
                </View>

                <View style={[styles.cardRight, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.supplierName, { color: colors.text.primary, textAlign }]}>{s.name}</Text>
                  {s.phone ? (
                    <View style={[styles.phoneRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.phoneText, { color: colors.text.secondary }]}>{s.phone}</Text>
                      <Phone size={12} color={colors.text.tertiary} />
                    </View>
                  ) : null}
                </View>

                <ChevronLeft size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Supplier Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={18} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                {editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addNewSupplier')}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('suppliers.name')} *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
                  placeholder={t('suppliers.name')}
                  placeholderTextColor={colors.text.tertiary}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('suppliers.phone')}</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
                  placeholder="06xxxxxxxx"
                  placeholderTextColor={colors.text.tertiary}
                  value={form.phone}
                  onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('suppliers.address')}</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
                  placeholder={t('suppliers.address')}
                  placeholderTextColor={colors.text.tertiary}
                  value={form.address}
                  onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('suppliers.taxId')}</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
                  placeholder="NIF / RC"
                  placeholderTextColor={colors.text.tertiary}
                  value={form.taxId}
                  onChangeText={(v) => setForm((f) => ({ ...f, taxId: v }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{`${t('suppliers.openingBalance')} (${currency})`}</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  value={form.balance}
                  onChangeText={(v) => setForm((f) => ({ ...f, balance: v }))}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalSaveBtnText}>{t('common.save')}</Text>
                </>
              )}
            </TouchableOpacity>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Cairo',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Cairo' },
  kpiVal: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'Cairo', marginTop: 2 },

  newPurchaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 14,
  },
  newPurchaseBannerText: { color: '#fff', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },

  scroll: { flex: 1 },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLeft: { alignItems: 'flex-start', minWidth: 90 },
  debtText: { fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },
  debtDue: { color: '#ef4444' },
  debtZero: { color: '#22c55e' },
  debtSubLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Cairo' },

  cardRight: { flex: 1, alignItems: 'flex-end', marginRight: 10 },
  supplierName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneText: { fontSize: 12, color: '#64748b' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'center', marginTop: 4 },

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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 14,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Cairo', marginBottom: 4, textAlign: 'right' },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Cairo',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },
});

export default SuppliersScreen;
