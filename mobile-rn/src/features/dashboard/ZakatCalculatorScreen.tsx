import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  Calculator,
  ArrowRight,
  Package,
  Wallet,
  Users,
  Truck,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Product, Customer, Supplier, CashSession } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';

const ZAKAT_RATE = 0.025; // 2.5%

export const ZakatCalculatorScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, currency } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings / Parameters
  const [nisab, setNisab] = useState('850000'); // 850,000 DZD (~85g gold reference)
  const [includeCash, setIncludeCash] = useState(true);
  const [includeReceivables, setIncludeReceivables] = useState(true);
  const [deductPayables, setDeductPayables] = useState(true);
  const [manualCashOverride, setManualCashOverride] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allProds, allCust, allSup, allCash] = await Promise.all([
        db.products.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.cashSessions.toArray(),
      ]);
      setProducts(allProds);
      setCustomers(allCust);
      setSuppliers(allSup);
      setCashSessions(allCash);
    } catch (err) {
      console.warn('Failed to load data for zakat calculation:', err);
    }
    setLoading(false);
  }

  // 1. Inventory Cost Value (عروض التجارة بسعر التكلفة)
  const inventoryCostValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const cost = p.costPrice || (p as any).purchase_price || 0;
      const qty = p.quantity || 0;
      return sum + cost * qty;
    }, 0);
  }, [products]);

  // 2. Cash on hand (السيولة النقدية)
  const autoCashValue = useMemo(() => {
    const openSession = cashSessions.find((s) => s.status === 'open');
    if (!openSession) return 0;
    const opening = openSession.openingBalance || (openSession as any).opening_balance || 0;
    const sales = openSession.totalSales || (openSession as any).total_sales || 0;
    return opening + sales;
  }, [cashSessions]);

  const effectiveCash = manualCashOverride.trim()
    ? parseFloat(manualCashOverride) || 0
    : autoCashValue;

  // 3. Customer Receivables (ديون الكريدي المرجوة)
  const receivablesValue = useMemo(() => {
    return customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  }, [customers]);

  // 4. Supplier Debts to Deduct (ديون الموردين الواجبة الخصم)
  const payablesValue = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + Math.max(0, s.balance || 0), 0);
  }, [suppliers]);

  // Total Zakatable Wealth (الوعاء الزكوي)
  const zakatCalculation = useMemo(() => {
    let totalWealth = inventoryCostValue;
    if (includeCash) totalWealth += effectiveCash;
    if (includeReceivables) totalWealth += receivablesValue;
    if (deductPayables) totalWealth -= payablesValue;

    const nisabThreshold = parseFloat(nisab) || 0;
    const isNisabReached = totalWealth >= nisabThreshold && totalWealth > 0;
    const zakatDue = isNisabReached ? totalWealth * ZAKAT_RATE : 0;

    return {
      totalWealth: Math.max(0, totalWealth),
      isNisabReached,
      zakatDue,
    };
  }, [
    inventoryCostValue,
    effectiveCash,
    receivablesValue,
    payablesValue,
    includeCash,
    includeReceivables,
    deductPayables,
    nisab,
  ]);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('zakatCalculator.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Zakat Result Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: isDark ? colors.surfaceElevated : '#065f46', borderColor: colors.border.default }]}>
          <View style={styles.heroIconBox}>
            <Calculator size={26} color="#10b981" />
          </View>
          <Text style={styles.heroLabel}>{t('zakatCalculator.zakatDue')}</Text>
          <Text style={styles.heroVal}>
            {zakatCalculation.zakatDue.toLocaleString()} {currency}
          </Text>

          <View
            style={[
              styles.nisabBadge,
              zakatCalculation.isNisabReached ? styles.nisabMet : styles.nisabNotMet,
            ]}
          >
            {zakatCalculation.isNisabReached ? (
              <CheckCircle size={14} color="#22c55e" />
            ) : (
              <AlertTriangle size={14} color="#f59e0b" />
            )}
            <Text
              style={[
                styles.nisabBadgeText,
                zakatCalculation.isNisabReached ? styles.nisabMetText : styles.nisabNotMetText,
              ]}
            >
              {zakatCalculation.isNisabReached
                ? t('zakatCalculator.nisabMet')
                : t('zakatCalculator.nisabNotMet')}
            </Text>
          </View>
        </View>

        {/* Nisab Configuration */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text.primary }]}>{t('zakatCalculator.nisabValue')}</Text>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text.secondary }]}>{t('zakatCalculator.nisabValue')}</Text>
            <TextInput
              style={[styles.formInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border.default }]}
              value={nisab}
              onChangeText={setNisab}
              keyboardType="numeric"
              textAlign="center"
            />
          </View>
        </View>

        {/* Wealth Breakdown */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
          <Text style={[styles.cardSectionTitle, { color: colors.text.primary }]}>{t('zakatCalculator.zakatableAssets')}</Text>

          {/* Inventory */}
          <View style={styles.wealthRow}>
            <Text style={[styles.wealthVal, { color: colors.text.primary }]}>
              +{inventoryCostValue.toLocaleString()} {currency}
            </Text>
            <View style={styles.wealthLabelCol}>
              <View style={styles.labelWithIcon}>
                <Text style={[styles.wealthLabel, { color: colors.text.primary }]}>{t('zakatCalculator.inventoryValue')}</Text>
                <Package size={15} color="#3b82f6" />
              </View>
              <Text style={[styles.wealthSub, { color: colors.text.tertiary }]}>{t('profitCenter.costOfGoods')}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

          {/* Cash */}
          <View style={styles.wealthRow}>
            <Text style={[styles.wealthVal, { color: colors.text.primary }]}>
              +{effectiveCash.toLocaleString()} {currency}
            </Text>
            <View style={styles.wealthLabelCol}>
              <View style={styles.labelWithIcon}>
                <Text style={[styles.wealthLabel, { color: colors.text.primary }]}>{t('zakatCalculator.cashOnHand')}</Text>
                <Wallet size={15} color="#10b981" />
              </View>
              <Switch
                value={includeCash}
                onValueChange={setIncludeCash}
                trackColor={{ true: '#10b981', false: '#cbd5e1' }}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

          {/* Receivables */}
          <View style={styles.wealthRow}>
            <Text style={[styles.wealthVal, { color: colors.text.primary }]}>
              +{receivablesValue.toLocaleString()} {currency}
            </Text>
            <View style={styles.wealthLabelCol}>
              <View style={styles.labelWithIcon}>
                <Text style={[styles.wealthLabel, { color: colors.text.primary }]}>{t('zakatCalculator.receivables')}</Text>
                <Users size={15} color="#8b5cf6" />
              </View>
              <Switch
                value={includeReceivables}
                onValueChange={setIncludeReceivables}
                trackColor={{ true: '#8b5cf6', false: '#cbd5e1' }}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

          {/* Payables deduction */}
          <View style={styles.wealthRow}>
            <Text style={[styles.wealthVal, { color: '#ef4444' }]}>
              -{payablesValue.toLocaleString()} {currency}
            </Text>
            <View style={styles.wealthLabelCol}>
              <View style={styles.labelWithIcon}>
                <Text style={[styles.wealthLabel, { color: colors.text.primary }]}>{t('zakatCalculator.debtsToDeduct')}</Text>
                <Truck size={15} color="#ef4444" />
              </View>
              <Switch
                value={deductPayables}
                onValueChange={setDeductPayables}
                trackColor={{ true: '#ef4444', false: '#cbd5e1' }}
              />
            </View>
          </View>

          <View style={[styles.divider, { marginVertical: 12, backgroundColor: colors.border.subtle }]} />

          {/* Total Zakatable Pool */}
          <View style={styles.poolTotalRow}>
            <Text style={[styles.poolTotalVal, { color: '#10b981' }]}>
              {zakatCalculation.totalWealth.toLocaleString()} {currency}
            </Text>
            <Text style={[styles.poolTotalLabel, { color: colors.text.primary }]}>{t('zakatCalculator.netZakatable')}</Text>
          </View>
        </View>
      </ScrollView>
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

  scroll: { flex: 1, padding: 14 },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  heroIconBox: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(16,185,129,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroLabel: { fontSize: 13, color: '#64748b', fontFamily: 'Cairo' },
  heroVal: { fontSize: 32, fontWeight: '900', color: '#10b981', fontFamily: 'Cairo', marginVertical: 6 },
  nisabBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  nisabMet: { backgroundColor: 'rgba(34,197,94,0.1)' },
  nisabNotMet: { backgroundColor: 'rgba(245,158,11,0.1)' },
  nisabBadgeText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },
  nisabMetText: { color: '#22c55e' },
  nisabNotMetText: { color: '#f59e0b' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right', marginBottom: 12 },
  formGroup: { marginBottom: 4 },
  formLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Cairo', textAlign: 'right', marginBottom: 6 },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  wealthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  wealthLabelCol: { alignItems: 'flex-end' },
  labelWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wealthLabel: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo' },
  wealthSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Cairo', marginTop: 2 },
  wealthVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  poolTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  poolTotalLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  poolTotalVal: { fontSize: 18, fontWeight: '800', color: '#3b82f6', fontFamily: 'Cairo' },
});

export default ZakatCalculatorScreen;
