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
  Share,
} from 'react-native';
import {
  ArrowRight,
  Truck,
  Phone,
  DollarSign,
  Plus,
  CreditCard,
  Check,
  X,
  FileText,
  Calendar,
  Receipt,
  ShoppingCart,
  ChevronLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Supplier, Purchase, Payment } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/store/i18nStore';
import { useTheme } from '@/theme';

export const SupplierDetailScreen = ({ route, navigation }: any) => {
  const { supplierId, supplier: initialSupplier } = route.params || {};
  const { user } = useAuthStore();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const { isDark, colors } = useTheme();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';

  const [supplier, setSupplier] = useState<Supplier | null>(initialSupplier || null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'payments'>('purchases');

  // Payment Modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    loadSupplierData();
  }, [supplierId]);

  async function loadSupplierData() {
    setLoading(true);
    try {
      await ensureInit();
      const currentSup = await db.suppliers.get(supplierId);
      if (currentSup) setSupplier(currentSup);

      const [allPurchases, allPayments] = await Promise.all([
        db.purchases.toArray(),
        db.payments.toArray(),
      ]);

      const supPurchases = allPurchases.filter(
        (p: any) => (p.supplier_id || p.supplierId) === supplierId
      );
      supPurchases.sort(
        (a: any, b: any) =>
          new Date(b.date || b.createdAt || 0).getTime() -
          new Date(a.date || a.createdAt || 0).getTime()
      );

      const supPayments = allPayments.filter(
        (p: any) => (p.party_id || p.partyId) === supplierId
      );
      supPayments.sort(
        (a: any, b: any) =>
          new Date(b.date || b.createdAt || 0).getTime() -
          new Date(a.date || a.createdAt || 0).getTime()
      );

      setPurchases(supPurchases);
      setPayments(supPayments);
    } catch (err) {
      console.warn('Failed to load supplier details:', err);
    }
    setLoading(false);
  }

  const handleRecordPayment = async () => {
    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert(t('common.warning'), t('pos.pleaseEnterValidPrice'));
      return;
    }

    setSavingPayment(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      // 1. Record payment
      await db.payments.add({
        id: generateId(),
        date: nowIso,
        party_id: supplierId,
        party_type: 'supplier',
        party_name: supplier?.name || '',
        amount: amountNum,
        payment_method: 'cash',
        notes: paymentNotes.trim() || t('suppliers.recordPayment'),
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2. Reduce supplier debt balance
      const currentBal = Number(supplier?.balance || 0);
      const newBal = Math.max(0, currentBal - amountNum);
      await db.suppliers.update(supplierId, {
        balance: newBal,
        updated_at: nowIso,
      });

      Alert.alert('✓', `${t('suppliers.paymentRecorded')}: ${amountNum.toLocaleString(localeStr)} ${currency}`);
      setPaymentModalVisible(false);
      setPaymentAmount('');
      setPaymentNotes('');
      await loadSupplierData();
    } catch (err) {
      Alert.alert(t('common.error'), `${t('common.error')}: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSavingPayment(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!supplier) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>{t('suppliers.supplierNotFound')}</Text>
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
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{supplier.name}</Text>
          {supplier.phone ? <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>{supplier.phone}</Text> : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
          <View style={[styles.balanceHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>{t('suppliers.dueBalance')}</Text>
            <Truck size={20} color="#f59e0b" />
          </View>
          <Text
            style={[
              styles.balanceVal,
              supplier.balance > 0 ? styles.balanceValDue : styles.balanceValZero,
              { textAlign },
            ]}
          >
            {(supplier.balance || 0).toLocaleString(localeStr)} {currency}
          </Text>

          {/* Quick Action Buttons */}
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.payBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setPaymentAmount(String(supplier.balance || ''));
                setPaymentModalVisible(true);
              }}
            >
              <DollarSign size={16} color="#fff" />
              <Text style={styles.payBtnText}>{t('suppliers.recordPayment')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.purchaseBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => navigation.navigate('PurchaseForm', { supplierId: supplier.id })}
            >
              <ShoppingCart size={16} color={colors.primary[600]} />
              <Text style={[styles.purchaseBtnText, { color: colors.primary[600] }]}>{t('suppliers.newPurchaseInvoice')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'purchases' && styles.tabActive]}
            onPress={() => setActiveTab('purchases')}
          >
            <Text style={[styles.tabText, activeTab === 'purchases' && styles.tabTextActive]}>
              {t('suppliers.purchaseInvoices')} ({purchases.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
            onPress={() => setActiveTab('payments')}
          >
            <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
              {t('suppliers.paymentReceipts')} ({payments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        {activeTab === 'purchases' ? (
          purchases.length === 0 ? (
            <View style={styles.emptyList}>
              <Receipt size={36} color={colors.text.tertiary} />
              <Text style={[styles.emptyListText, { color: colors.text.secondary }]}>{t('suppliers.noPurchases')}</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {purchases.map((p: any) => {
                const itemsCount = (() => {
                  if (Array.isArray(p.items)) return p.items.length;
                  if (typeof p.items === 'string') {
                    try {
                      const parsed = JSON.parse(p.items);
                      if (Array.isArray(parsed)) return parsed.length;
                      if (parsed && typeof parsed === 'object') return Object.keys(parsed).length;
                    } catch {
                      return 0;
                    }
                  }
                  if (p.items && typeof p.items === 'object') return Object.keys(p.items).length;
                  return 0;
                })();

                return (
                  <View key={p.id} style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.listCardTotal, { color: colors.text.primary }]}>{(p.total || 0).toLocaleString(localeStr)} {currency}</Text>
                      <Text style={[styles.listCardSub, { color: colors.text.secondary }]}>
                        {t('sales.paid')}: {(p.amountPaid || p.amount_paid || 0).toLocaleString(localeStr)} {currency}
                      </Text>
                    </View>

                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flex: 1, marginHorizontal: 10 }}>
                      <Text style={[styles.listCardNumber, { color: colors.text.primary }]}>{p.number}</Text>
                      <Text style={[styles.listCardDate, { color: colors.text.tertiary }]}>
                        {new Date(p.date || p.createdAt || '').toLocaleDateString(localeStr)} • {itemsCount} {t('inventory.products')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : payments.length === 0 ? (
          <View style={styles.emptyList}>
            <DollarSign size={36} color={colors.text.tertiary} />
            <Text style={[styles.emptyListText, { color: colors.text.secondary }]}>{t('suppliers.noPayments')}</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {payments.map((pm: any) => (
              <View key={pm.id} style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.listCardTotal, { color: '#22c55e' }]}>
                  {(pm.amount || 0).toLocaleString(localeStr)} {currency}
                </Text>

                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.listCardNumber, { color: colors.text.primary }]}>{pm.note || pm.notes || t('suppliers.recordPayment')}</Text>
                  <Text style={[styles.listCardDate, { color: colors.text.tertiary }]}>
                    {new Date(pm.date || pm.createdAt || '').toLocaleDateString(localeStr)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Record Payment Modal */}
      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('suppliers.recordPaymentModalTitle')}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('suppliers.paymentAmount')} ({currency}) *</Text>
              <TextInput
                style={[styles.formInputAmount, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc' }]}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.text.tertiary}
                textAlign="center"
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>{t('suppliers.paymentNotes')}</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc', textAlign }]}
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder={t('suppliers.paymentNotes')}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={handleRecordPayment}
              disabled={savingPayment}
            >
              {savingPayment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalConfirmBtnText}>{t('suppliers.confirmPayment')}</Text>
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
  emptyText: { fontSize: 16, color: '#64748b', fontFamily: 'Cairo' },

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
  headerTitleCol: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  headerSubtitle: { fontSize: 12, color: '#94a3b8', fontFamily: 'Cairo' },

  scroll: { flex: 1, padding: 14 },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Cairo' },
  balanceVal: { fontSize: 24, fontWeight: '800', fontFamily: 'Cairo', marginVertical: 8 },
  balanceValDue: { color: '#ef4444' },
  balanceValZero: { color: '#22c55e' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
  },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },
  purchaseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  purchaseBtnText: { color: '#3b82f6', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },

  tabsRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Cairo' },
  tabTextActive: { color: '#0f172a', fontWeight: 'bold' },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listCardNumber: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  listCardDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  listCardTotal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  listCardSub: { fontSize: 10, color: '#64748b', marginTop: 2 },

  emptyList: { backgroundColor: '#fff', borderRadius: 14, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyListText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Cairo', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Cairo', marginBottom: 4, textAlign: 'right' },
  formInputAmount: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    padding: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
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
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },
});

export default SupplierDetailScreen;
