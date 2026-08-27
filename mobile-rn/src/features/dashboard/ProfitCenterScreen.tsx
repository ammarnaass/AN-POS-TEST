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
  ArrowRight,
  Receipt,
  Package,
  Layers,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Sale, Product, Expense } from '@shared/types';

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export const ProfitCenterScreen = ({ navigation }: any) => {
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

        const items: any[] = Array.isArray(s.items)
          ? s.items
          : typeof s.items === 'string'
          ? JSON.parse(s.items || '[]')
          : [];

        items.forEach((item) => {
          const cost = productCostMap[item.productId] || item.costPrice || 0;
          cogs += cost * (item.qty || 1);
        });
      }
    });

    const netRevenue = Math.max(0, grossRevenue - returnsTotal);
    const grossProfit = Math.max(0, netRevenue - cogs);
    const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = grossProfit - totalOperatingExpenses;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      grossRevenue,
      returnsTotal,
      netRevenue,
      cogs,
      grossProfit,
      totalOperatingExpenses,
      netProfit,
      profitMargin,
    };
  }, [sales, products, expenses, period, productCostMap]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ArrowRight size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مركز الأرباح وهوامش الربح</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Chips */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          <TouchableOpacity
            style={[styles.chip, period === 'today' && styles.chipActive]}
            onPress={() => setPeriod('today')}
          >
            <Text style={[styles.chipText, period === 'today' && styles.chipTextActive]}>اليوم</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'week' && styles.chipActive]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.chipText, period === 'week' && styles.chipTextActive]}>هذا الأسبوع</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'month' && styles.chipActive]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.chipText, period === 'month' && styles.chipTextActive]}>هذا الشهر</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'year' && styles.chipActive]}
            onPress={() => setPeriod('year')}
          >
            <Text style={[styles.chipText, period === 'year' && styles.chipTextActive]}>هذا العام</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, period === 'all' && styles.chipActive]}
            onPress={() => setPeriod('all')}
          >
            <Text style={[styles.chipText, period === 'all' && styles.chipTextActive]}>الكل</Text>
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
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* Main Net Profit Card */}
            <View style={styles.mainProfitCard}>
              <Text style={styles.mainProfitLabel}>صافي الربح الحقيقي المحقق</Text>
              <Text
                style={[
                  styles.mainProfitVal,
                  stats.netProfit >= 0 ? styles.valPositive : styles.valNegative,
                ]}
              >
                {stats.netProfit.toLocaleString('ar-DZ')} دج
              </Text>
              <View style={styles.marginBadge}>
                <Text style={styles.marginBadgeText}>
                  هامش الربح الصافي: {stats.profitMargin.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Income Statement Breakdown Card */}
            <View style={styles.breakdownCard}>
              <Text style={styles.cardSectionTitle}>قائمة الدخل والتحليل المالي</Text>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownVal}>+{stats.grossRevenue.toLocaleString('ar-DZ')} دج</Text>
                <Text style={styles.breakdownLabel}>إجمالي الإيرادات (المبيعات)</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownVal, { color: '#ef4444' }]}>
                  -{stats.returnsTotal.toLocaleString('ar-DZ')} دج
                </Text>
                <Text style={styles.breakdownLabel}>المرتجعات والتعويضات</Text>
              </View>

              <View style={[styles.breakdownRow, styles.subtotalRow]}>
                <Text style={[styles.breakdownVal, { fontWeight: 'bold' }]}>
                  {stats.netRevenue.toLocaleString('ar-DZ')} دج
                </Text>
                <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>صافي الإيرادات</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownVal, { color: '#f59e0b' }]}>
                  -{stats.cogs.toLocaleString('ar-DZ')} دج
                </Text>
                <Text style={styles.breakdownLabel}>تكلفة البضاعة المباعة (COGS)</Text>
              </View>

              <View style={[styles.breakdownRow, styles.subtotalRow]}>
                <Text style={[styles.breakdownVal, { color: '#10b981', fontWeight: 'bold' }]}>
                  {stats.grossProfit.toLocaleString('ar-DZ')} دج
                </Text>
                <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>إجمالي الربح التجاري</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownVal, { color: '#ef4444' }]}>
                  -{stats.totalOperatingExpenses.toLocaleString('ar-DZ')} دج
                </Text>
                <Text style={styles.breakdownLabel}>المصاريف التشغيلية (كراء، رواتب، فواتير)</Text>
              </View>

              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text
                  style={[
                    styles.totalProfitVal,
                    stats.netProfit >= 0 ? styles.valPositive : styles.valNegative,
                  ]}
                >
                  {stats.netProfit.toLocaleString('ar-DZ')} دج
                </Text>
                <Text style={styles.totalProfitLabel}>صافي الربح النهائي</Text>
              </View>
            </View>
          </View>
        )}
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

  chipsRow: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  chipsScroll: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#3b82f6' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600', fontFamily: 'Cairo' },
  chipTextActive: { color: '#fff' },

  scroll: { flex: 1, padding: 14 },
  mainProfitCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mainProfitLabel: { fontSize: 13, color: '#64748b', fontFamily: 'Cairo' },
  mainProfitVal: { fontSize: 30, fontWeight: '900', fontFamily: 'Cairo', marginVertical: 8 },
  valPositive: { color: '#10b981' },
  valNegative: { color: '#ef4444' },
  marginBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  marginBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#3b82f6', fontFamily: 'Cairo' },

  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  cardSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right', marginBottom: 6 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  breakdownLabel: { fontSize: 13, color: '#64748b', fontFamily: 'Cairo' },
  breakdownVal: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo' },
  subtotalRow: { borderTopWidth: 1, borderTopColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginVertical: 4 },
  totalRow: { borderTopWidth: 2, borderTopColor: '#0f172a', marginTop: 8, paddingTop: 10 },
  totalProfitLabel: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  totalProfitVal: { fontSize: 18, fontWeight: '800', fontFamily: 'Cairo' },
});

export default ProfitCenterScreen;
