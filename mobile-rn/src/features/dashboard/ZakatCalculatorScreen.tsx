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
  ChevronLeft,
  ChevronRight,
  Package,
  Wallet,
  Users,
  Truck,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Product, Customer, Supplier, CashSession } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';

const ZAKAT_RATE = 0.025; // 2.5%

export const ZakatCalculatorScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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

  // 1. Inventory Cost Value
  const inventoryCostValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const cost = p.costPrice || (p as any).purchase_price || 0;
      const qty = p.quantity || 0;
      return sum + cost * qty;
    }, 0);
  }, [products]);

  // 2. Cash on hand
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

  // 3. Customer Receivables
  const receivablesValue = useMemo(() => {
    return customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  }, [customers]);

  // 4. Supplier Debts to Deduct
  const payablesValue = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + Math.max(0, s.balance || 0), 0);
  }, [suppliers]);

  // Total Zakatable Wealth
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

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('zakatCalculator.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Zakat Result Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Calculator size={26} color={colors.emerald[600]} />
          </View>
          <Text style={styles.heroLabel}>{t('zakatCalculator.zakatDue')}</Text>
          <Text style={styles.heroVal}>
            {zakatCalculation.zakatDue.toLocaleString(localeStr)} {currency}
          </Text>

          <View
            style={[
              styles.nisabBadge,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
              zakatCalculation.isNisabReached ? styles.nisabMet : styles.nisabNotMet,
            ]}
          >
            {zakatCalculation.isNisabReached ? (
              <CheckCircle size={14} color={colors.emerald[600]} />
            ) : (
              <AlertTriangle size={14} color={colors.warning.text} />
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
        <View style={styles.card}>
          <Text style={[styles.cardSectionTitle, { textAlign }]}>{t('zakatCalculator.nisabValue')}</Text>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { textAlign }]}>{t('zakatCalculator.nisabValue')} ({currency})</Text>
            <TextInput
              style={styles.formInput}
              value={nisab}
              onChangeText={setNisab}
              keyboardType="numeric"
              textAlign="center"
            />
          </View>
        </View>

        {/* Wealth Breakdown */}
        <View style={styles.card}>
          <Text style={[styles.cardSectionTitle, { textAlign }]}>{t('zakatCalculator.zakatableAssets')}</Text>

          {/* Inventory */}
          <View style={[styles.wealthRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.wealthLabelCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.labelWithIcon, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Package size={15} color={colors.primary[600]} />
                <Text style={styles.wealthLabel}>{t('zakatCalculator.inventoryValue')}</Text>
              </View>
              <Text style={styles.wealthSub}>{t('profitCenter.costOfGoods')}</Text>
            </View>
            <Text style={styles.wealthVal}>
              +{inventoryCostValue.toLocaleString(localeStr)} {currency}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Cash */}
          <View style={[styles.wealthRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.wealthLabelCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.labelWithIcon, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Wallet size={15} color={colors.emerald[600]} />
                <Text style={styles.wealthLabel}>{t('zakatCalculator.cashOnHand')}</Text>
              </View>
              <Switch
                value={includeCash}
                onValueChange={setIncludeCash}
                trackColor={{ true: colors.emerald[600], false: colors.slate[300] }}
              />
            </View>
            <Text style={styles.wealthVal}>
              +{effectiveCash.toLocaleString(localeStr)} {currency}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Receivables */}
          <View style={[styles.wealthRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.wealthLabelCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.labelWithIcon, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Users size={15} color={colors.purple[600]} />
                <Text style={styles.wealthLabel}>{t('zakatCalculator.receivables')}</Text>
              </View>
              <Switch
                value={includeReceivables}
                onValueChange={setIncludeReceivables}
                trackColor={{ true: colors.purple[600], false: colors.slate[300] }}
              />
            </View>
            <Text style={styles.wealthVal}>
              +{receivablesValue.toLocaleString(localeStr)} {currency}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Payables deduction */}
          <View style={[styles.wealthRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.wealthLabelCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.labelWithIcon, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Truck size={15} color={colors.danger.main} />
                <Text style={styles.wealthLabel}>{t('zakatCalculator.debtsToDeduct')}</Text>
              </View>
              <Switch
                value={deductPayables}
                onValueChange={setDeductPayables}
                trackColor={{ true: colors.danger.main, false: colors.slate[300] }}
              />
            </View>
            <Text style={[styles.wealthVal, { color: colors.danger.main }]}>
              -{payablesValue.toLocaleString(localeStr)} {currency}
            </Text>
          </View>

          <View style={[styles.divider, { marginVertical: 12 }]} />

          {/* Total Zakatable Pool */}
          <View style={[styles.poolTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.poolTotalLabel}>{t('zakatCalculator.netZakatable')}</Text>
            <Text style={styles.poolTotalVal}>
              {zakatCalculation.totalWealth.toLocaleString(localeStr)} {currency}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    header: {
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    headerBackBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },

    scroll: { flex: 1, padding: 14 },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
      marginBottom: 12,
    },
    heroIconBox: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : colors.emerald[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    heroLabel: { fontSize: 13, color: colors.text.secondary, fontFamily: 'Cairo' },
    heroVal: { fontSize: 32, fontWeight: '900', color: colors.emerald[600], fontFamily: 'Cairo', marginVertical: 6 },
    nisabBadge: { alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    nisabMet: { backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : colors.emerald[50] },
    nisabNotMet: { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : colors.warning.light },
    nisabBadgeText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },
    nisabMetText: { color: colors.emerald[600] },
    nisabNotMetText: { color: colors.warning.text },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginBottom: 12,
    },
    cardSectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo', marginBottom: 12 },
    formGroup: { marginBottom: 4 },
    formLabel: { fontSize: 11, color: colors.text.secondary, fontFamily: 'Cairo', marginBottom: 6 },
    formInput: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.default,
      padding: 10,
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text.primary,
    },

    wealthRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    wealthLabelCol: { gap: 4 },
    labelWithIcon: { alignItems: 'center', gap: 6 },
    wealthLabel: { fontSize: 13, fontWeight: '600', color: colors.text.primary, fontFamily: 'Cairo' },
    wealthSub: { fontSize: 10, color: colors.text.tertiary, fontFamily: 'Cairo', marginTop: 2 },
    wealthVal: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },
    divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: 8 },

    poolTotalRow: { justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
    poolTotalLabel: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },
    poolTotalVal: { fontSize: 18, fontWeight: '800', color: colors.primary[600], fontFamily: 'Cairo' },
  });

export default ZakatCalculatorScreen;
