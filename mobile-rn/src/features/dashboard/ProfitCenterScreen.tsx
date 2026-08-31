import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Package,
  Layers,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Sale, Product, Expense } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export const ProfitCenterScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    loadFinancialData();
  }, []);

  async function loadFinancialData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allSales, allProds, allExp] = await Promise.all([
        db.sales.toArray(),
        db.products.toArray(),
        db.expenses.toArray(),
      ]);
      setSales(allSales);
      setProducts(allProds);
      setExpenses(allExp);
    } catch (err) {
      console.warn('Failed to load profit data:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    setRefreshing(false);
  };

  const productCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      map[p.id] = p.costPrice || (p as any).purchase_price || 0;
    });
    return map;
  }, [products]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

    const isMatchDate = (dateStr: string) => {
      const d = new Date(dateStr);
      const str = dateStr.slice(0, 10);
      if (period === 'today') return str === todayStr;
      if (period === 'week') return d >= oneWeekAgo;
      if (period === 'month') return d >= firstDayOfMonth;
      if (period === 'year') return d >= firstDayOfYear;
      return true;
    };

    const filteredSales = sales.filter((s) => isMatchDate(s.date || (s as any).createdAt || ''));
    const filteredExpenses = expenses.filter((e) => isMatchDate(e.date || (e as any).createdAt || ''));

    let grossRevenue = 0;
    let returnsTotal = 0;
    let cogs = 0;

    filteredSales.forEach((s) => {
      if (s.type === 'return') {
        returnsTotal += s.total || 0;
      } else {
        grossRevenue += s.total || 0;

        let saleItems: any[] = [];
        if (Array.isArray(s.items)) saleItems = s.items;
        else if (typeof s.items === 'string') {
          try {
            saleItems = JSON.parse(s.items);
          } catch {}
        }

        if (Array.isArray(saleItems)) {
          saleItems.forEach((it) => {
            const pId = it.productId || it.product_id;
            const cost = productCostMap[pId] || 0;
            const qty = Number(it.qty || it.quantity || 1);
            cogs += cost * qty;
          });
        }
      }
    });

    const netRevenue = Math.max(0, grossRevenue - returnsTotal);
    const grossProfit = netRevenue - cogs;
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      grossRevenue,
      returnsTotal,
      netRevenue,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      profitMargin,
    };
  }, [sales, expenses, productCostMap, period]);

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profitCenter.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Chips */}
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <TouchableOpacity
            style={[styles.chip, period === 'today' && styles.chipActive]}
            onPress={() => setPeriod('today')}
          >
            <Text style={[styles.chipText, period === 'today' && styles.chipTextActive]}>{t('common.today')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'week' && styles.chipActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.chipText, period === 'week' && styles.chipTextActive]}>{t('common.thisWeek')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'month' && styles.chipActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.chipText, period === 'month' && styles.chipTextActive]}>{t('common.thisMonth')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'year' && styles.chipActive]}
            onPress={() => setPeriod('year')}
          >
            <Text style={[styles.chipText, period === 'year' && styles.chipTextActive]}>{t('common.thisYear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'all' && styles.chipActive]}
            onPress={() => setPeriod('all')}
          >
            <Text style={[styles.chipText, period === 'all' && styles.chipTextActive]}>{t('common.all')}</Text>
          </TouchableOpacity>
        </ScrollView>
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
        ) : (
          <View style={{ gap: 12 }}>
            {/* Main Net Profit Card */}
            <View style={styles.mainProfitCard}>
              <Text style={styles.mainProfitLabel}>{t('profitCenter.netProfit')}</Text>
              <Text
                style={[
                  styles.mainProfitVal,
                  stats.netProfit >= 0 ? styles.valPositive : styles.valNegative,
                ]}
              >
                {stats.netProfit.toLocaleString(localeStr)} {currency}
              </Text>
              <View style={styles.marginBadge}>
                <Text style={styles.marginBadgeText}>
                  {t('profitCenter.marginPercent')}: {stats.profitMargin.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Income Statement Breakdown Card */}
            <View style={styles.breakdownCard}>
              <Text style={[styles.cardSectionTitle, { textAlign }]}>{t('profitCenter.revenueBreakdown')}</Text>

              <View style={[styles.breakdownRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.breakdownLabel}>{t('profitCenter.grossSales')}</Text>
                <Text style={styles.breakdownVal}>+{stats.grossRevenue.toLocaleString(localeStr)} {currency}</Text>
              </View>

              <View style={[styles.breakdownRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.breakdownLabel}>{t('returns.title')}</Text>
                <Text style={[styles.breakdownVal, { color: colors.danger.main }]}>
                  -{stats.returnsTotal.toLocaleString(localeStr)} {currency}
                </Text>
              </View>

              <View style={[styles.breakdownRow, styles.subtotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>{t('profitCenter.grossSales')}</Text>
                <Text style={[styles.breakdownVal, { fontWeight: 'bold' }]}>
                  {stats.netRevenue.toLocaleString(localeStr)} {currency}
                </Text>
              </View>

              <View style={[styles.breakdownRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.breakdownLabel}>{t('profitCenter.costOfGoods')}</Text>
                <Text style={[styles.breakdownVal, { color: colors.warning.text }]}>
                  -{stats.cogs.toLocaleString(localeStr)} {currency}
                </Text>
              </View>

              <View style={[styles.breakdownRow, styles.subtotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>{t('profitCenter.grossProfit')}</Text>
                <Text style={[styles.breakdownVal, { color: colors.emerald[600], fontWeight: 'bold' }]}>
                  {stats.grossProfit.toLocaleString(localeStr)} {currency}
                </Text>
              </View>

              <View style={[styles.breakdownRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.breakdownLabel}>{t('profitCenter.expenses')}</Text>
                <Text style={[styles.breakdownVal, { color: colors.danger.main }]}>
                  -{stats.totalExpenses.toLocaleString(localeStr)} {currency}
                </Text>
              </View>

              <View style={[styles.breakdownRow, styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.totalProfitLabel}>{t('profitCenter.netProfit')}</Text>
                <Text
                  style={[
                    styles.totalProfitVal,
                    stats.netProfit >= 0 ? styles.valPositive : styles.valNegative,
                  ]}
                >
                  {stats.netProfit.toLocaleString(localeStr)} {currency}
                </Text>
              </View>
            </View>
          </View>
        )}
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

    chipsRow: {
      backgroundColor: colors.surface,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    chipsScroll: { paddingHorizontal: 16, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
    },
    chipActive: { backgroundColor: colors.primary[600] },
    chipText: { fontSize: 12, color: colors.text.secondary, fontWeight: '600', fontFamily: 'Cairo' },
    chipTextActive: { color: '#fff' },

    scroll: { flex: 1, padding: 14 },
    mainProfitCard: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50],
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    mainProfitLabel: { fontSize: 13, color: colors.text.secondary, fontFamily: 'Cairo' },
    mainProfitVal: { fontSize: 30, fontWeight: '900', fontFamily: 'Cairo', marginVertical: 8 },
    valPositive: { color: colors.emerald[600] },
    valNegative: { color: colors.danger.main },
    marginBadge: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    marginBadgeText: { fontSize: 12, fontWeight: 'bold', color: colors.primary[600], fontFamily: 'Cairo' },

    breakdownCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.default,
      gap: 8,
    },
    cardSectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      marginBottom: 6,
    },
    breakdownRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    breakdownLabel: { fontSize: 13, color: colors.text.secondary, fontFamily: 'Cairo' },
    breakdownVal: { fontSize: 14, fontWeight: '600', color: colors.text.primary, fontFamily: 'Cairo' },
    subtotalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      marginVertical: 4,
    },
    totalRow: {
      borderTopWidth: 2,
      borderTopColor: colors.text.primary,
      marginTop: 8,
      paddingTop: 10,
    },
    totalProfitLabel: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },
    totalProfitVal: { fontSize: 18, fontWeight: '800', fontFamily: 'Cairo' },
  });

export default ProfitCenterScreen;
