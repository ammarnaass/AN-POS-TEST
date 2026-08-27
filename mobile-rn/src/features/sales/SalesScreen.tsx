import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  Receipt,
  RotateCcw,
  CreditCard,
  CheckCircle,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  Clock,
  User,
  Banknote,
  FileText,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Sale } from '@shared/types';
import { colors, useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Badge, EmptyState } from '@/components/ui';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'cash' | 'credit' | 'return';

export const SalesScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadSales = useCallback(async () => {
    try {
      await ensureInit();
      const allSales = await db.sales.toArray();
      // Sort newest first
      allSales.sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.date || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setSales(allSales);
    } catch (err) {
      console.warn('Failed to load sales:', err);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, [loadSales])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSales();
    setRefreshing(false);
  };

  // Filter logic
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter((s: any) => {
      const saleTime = new Date(s.date || s.createdAt || 0).getTime();

      // Period filter
      if (period === 'today' && saleTime < startOfToday) return false;
      if (period === 'week' && saleTime < startOfWeek) return false;
      if (period === 'month' && saleTime < startOfMonth) return false;

      // Status/Method filter
      if (statusFilter === 'cash' && s.paymentMethod !== 'cash') return false;
      if (statusFilter === 'credit' && s.paymentMethod !== 'credit') return false;
      if (statusFilter === 'return' && s.type !== 'return') return false;

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchNumber = s.number?.toLowerCase().includes(query);
        const matchCustomer = s.customerName?.toLowerCase().includes(query);
        if (!matchNumber && !matchCustomer) return false;
      }

      return true;
    });
  }, [sales, period, statusFilter, search]);

  // Aggregate KPI Stats
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCash = 0;
    let totalCredit = 0;
    let totalReturns = 0;

    filteredSales.forEach((s: any) => {
      const tot = s.total || 0;
      if (s.type === 'return') {
        totalReturns += tot;
      } else {
        totalRevenue += tot;
        if (s.paymentMethod === 'cash') totalCash += tot;
        if (s.paymentMethod === 'credit') totalCredit += tot;
      }
    });

    return { totalRevenue, totalCash, totalCredit, totalReturns };
  }, [filteredSales]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border.default,
          },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Search size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="بحث برقم الفاتورة أو اسم الزبون..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
      </View>

      {/* Period Filter Chips */}
      <View style={styles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'week', label: 'آخر 7 أيام' },
            { id: 'month', label: 'هذا الشهر' },
            { id: 'all', label: 'الكل' },
          ].map((item) => {
            const isActive = period === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.primary[600]
                      : colors.surface,
                    borderColor: isActive
                      ? colors.primary[600]
                      : colors.border.default,
                  },
                ]}
                onPress={() => setPeriod(item.id as PeriodFilter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isActive ? '#ffffff' : colors.text.secondary,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Filter Bar */}
      <View
        style={[
          styles.statusFilterBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        {[
          { id: 'all', label: 'الكل' },
          { id: 'cash', label: 'نقدي' },
          { id: 'credit', label: 'آجل (كريدي)' },
          { id: 'return', label: 'مرتجع' },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.statusTab,
                isActive && {
                  backgroundColor: colors.primary[50],
                  borderBottomColor: colors.primary[600],
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setStatusFilter(tab.id as StatusFilter)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.statusTabText,
                  {
                    color: isActive
                      ? colors.primary[600]
                      : colors.text.secondary,
                    fontWeight: isActive ? '800' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary KPI Banner */}
      <View
        style={[
          styles.kpiContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiBoxLabel, { color: colors.text.secondary }]}>
            إجمالي المبيعات
          </Text>
          <Text style={[styles.kpiBoxVal, { color: colors.text.primary }]}>
            {stats.totalRevenue.toLocaleString('ar-DZ')} دج
          </Text>
        </View>
        <View
          style={[styles.kpiDivider, { backgroundColor: colors.border.default }]}
        />
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiBoxLabel, { color: colors.text.secondary }]}>
            النقدي
          </Text>
          <Text style={[styles.kpiBoxVal, { color: colors.success.main }]}>
            {stats.totalCash.toLocaleString('ar-DZ')} دج
          </Text>
        </View>
        <View
          style={[styles.kpiDivider, { backgroundColor: colors.border.default }]}
        />
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiBoxLabel, { color: colors.text.secondary }]}>
            الكريدي
          </Text>
          <Text style={[styles.kpiBoxVal, { color: colors.warning.main }]}>
            {stats.totalCredit.toLocaleString('ar-DZ')} دج
          </Text>
        </View>
      </View>

      {/* Invoices List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filteredSales.length === 0 ? (
          <EmptyState
            icon={<Receipt size={32} color={colors.text.tertiary} />}
            title="لا توجد فواتير أو مبيعات"
            description="قم بإجراء عمليات بيع من شاشة نقطة البيع (POS) لتظهر هنا"
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filteredSales.map((sale) => {
              const isReturn = sale.type === 'return';
              const itemsCount = Array.isArray(sale.items)
                ? sale.items.length
                : typeof sale.items === 'string'
                ? (() => {
                    try {
                      return JSON.parse(sale.items).length;
                    } catch {
                      return 0;
                    }
                  })()
                : 0;

              return (
                <TouchableOpacity
                  key={sale.id}
                  style={[
                    styles.saleCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border.default,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={styles.saleCardLeft}>
                    <Text
                      style={[
                        styles.saleTotalText,
                        {
                          color: isReturn
                            ? colors.danger.main
                            : colors.text.primary,
                        },
                      ]}
                    >
                      {isReturn ? '-' : ''}
                      {(sale.total || 0).toLocaleString('ar-DZ')} دج
                    </Text>

                    <Badge
                      variant={
                        isReturn
                          ? 'danger'
                          : sale.paymentMethod === 'cash'
                          ? 'success'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {isReturn
                        ? 'مرتجع'
                        : sale.paymentMethod === 'cash'
                        ? 'نقدي'
                        : sale.paymentMethod === 'card'
                        ? 'بطاقة CIB'
                        : 'آجل (كريدي)'}
                    </Badge>
                  </View>

                  <View style={styles.saleCardRight}>
                    <View style={styles.saleNumberRow}>
                      <Receipt size={14} color={colors.primary[600]} />
                      <Text
                        style={[
                          styles.saleNumberText,
                          { color: colors.text.primary },
                        ]}
                      >
                        {sale.number || 'فاتورة بدون رقم'}
                      </Text>
                    </View>

                    <View style={styles.saleMetaRow}>
                      <View style={styles.metaItem}>
                        <User size={12} color={colors.text.tertiary} />
                        <Text
                          style={[
                            styles.metaText,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {sale.customerName || 'زبون عام'}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.metaDot,
                          { color: colors.text.tertiary },
                        ]}
                      >
                        •
                      </Text>

                      <View style={styles.metaItem}>
                        <Clock size={12} color={colors.text.tertiary} />
                        <Text
                          style={[
                            styles.metaText,
                            { color: colors.text.tertiary },
                          ]}
                        >
                          {new Date(
                            sale.date || (sale as any).createdAt || 0
                          ).toLocaleTimeString('ar-DZ', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.metaDot,
                          { color: colors.text.tertiary },
                        ]}
                      >
                        •
                      </Text>

                      <Text
                        style={[
                          styles.metaText,
                          { color: colors.text.tertiary },
                        ]}
                      >
                        {itemsCount} عناصر
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 42,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo',
    height: '100%',
  },

  // Period Chips
  chipsRow: {
    paddingVertical: spacing.xs + 2,
  },
  chipsScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Status Filter Tabs
  statusFilterBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTabText: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },

  // KPI
  kpiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.xs,
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiBoxLabel: {
    fontSize: 11,
    fontFamily: 'Cairo',
    fontWeight: '600',
    marginBottom: 1,
  },
  kpiBoxVal: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  kpiDivider: {
    width: 1,
    height: 26,
  },

  // List
  scroll: {
    flex: 1,
    marginTop: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.huge,
  },
  center: {
    padding: spacing.xxl,
    alignItems: 'center',
  },

  saleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.xs,
  },
  saleCardLeft: {
    alignItems: 'flex-start',
    gap: 4,
  },
  saleTotalText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  saleCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  saleNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saleNumberText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  saleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  metaDot: {
    fontSize: 11,
  },
});

export default SalesScreen;
