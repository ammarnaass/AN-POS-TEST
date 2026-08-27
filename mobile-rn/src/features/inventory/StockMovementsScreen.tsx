import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  Sliders,
  Search,
  ChevronLeft,
  Calendar,
  Layers,
  Package,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Badge, EmptyState } from '@/components/ui';

interface MovementRecord {
  id: string;
  movement_number?: string;
  date: string;
  type: string;
  warehouse_id?: string;
  destination_warehouse_id?: string;
  item_id?: string;
  product_id?: string;
  product_name?: string;
  qty: number;
  unit_price?: number;
  total_amount?: number;
  reason?: string;
  reference?: string;
  created_by?: string;
}

export const StockMovementsScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const styles = makeStyles(colors, isDark);

  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      await ensureInit();
      const [v2List, v1List, prodList, whList] = await Promise.all([
        db.stockMovementsV2.toArray().catch(() => []),
        db.stockMovements.toArray().catch(() => []),
        db.products.toArray().catch(() => []),
        db.warehouses.toArray().catch(() => []),
      ]);

      const prods = prodList || [];
      setProducts(prods);
      setWarehouses(whList || []);

      // Combine both v1 and v2 movements
      const combined: MovementRecord[] = [];

      (v2List || []).forEach((m: any) => {
        const prod = prods.find((p: any) => p.id === (m.item_id || m.product_id));
        combined.push({
          id: m.id,
          movement_number: m.movement_number,
          date: m.date || m.created_at,
          type: m.type || 'adjust',
          warehouse_id: m.warehouse_id,
          destination_warehouse_id: m.destination_warehouse_id,
          item_id: m.item_id || m.product_id,
          product_name: prod?.name || 'صنف غير محدد',
          qty: m.quantity || m.qty || 0,
          unit_price: m.unit_price || prod?.costPrice || 0,
          total_amount: m.total_amount || 0,
          reference: m.reference || m.reason || '',
          created_by: m.reviewed_by || m.created_by || '',
        });
      });

      (v1List || []).forEach((m: any) => {
        // Skip if already in v2 list
        if (combined.some((c) => c.id === m.id || c.reference === m.reference_id)) return;
        const prod = prods.find((p: any) => p.id === m.product_id);
        combined.push({
          id: m.id,
          date: m.date || m.created_at,
          type: m.type || 'out',
          product_id: m.product_id,
          product_name: prod?.name || 'صنف غير محدد',
          qty: m.qty || m.quantity || 0,
          reason: m.reason || '',
          reference: m.reference_id || '',
          created_by: m.created_by || '',
        });
      });

      combined.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setMovements(combined);
    } catch (e) {
      console.warn('Load stock movements error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = movements.filter((m) => {
    const matchesSearch =
      !search ||
      m.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.movement_number?.toLowerCase().includes(search.toLowerCase()) ||
      m.reference?.toLowerCase().includes(search.toLowerCase()) ||
      m.reason?.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      selectedType === 'all' ||
      (selectedType === 'in' && (m.type === 'purchase' || m.type === 'in')) ||
      (selectedType === 'out' && (m.type === 'sale' || m.type === 'out')) ||
      (selectedType === 'transfer' && m.type === 'transfer') ||
      (selectedType === 'return' && m.type === 'return') ||
      (selectedType === 'count' && (m.type === 'count' || m.type === 'adjust'));

    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'in':
        return { label: 'توريد (إدخال)', variant: 'success' as const, icon: ArrowDownLeft };
      case 'sale':
      case 'out':
        return { label: 'مبيعات (إخراج)', variant: 'primary' as const, icon: ArrowUpRight };
      case 'transfer':
        return { label: 'تحويل مستودع', variant: 'neutral' as const, icon: ArrowLeftRight };
      case 'return':
        return { label: 'مرتجع بيع', variant: 'warning' as const, icon: RotateCcw };
      case 'count':
      case 'adjust':
        return { label: 'تسوية جرد', variant: 'neutral' as const, icon: Sliders };
      default:
        return { label: type, variant: 'neutral' as const, icon: History };
    }
  };

  // Metrics
  const totalIn = movements
    .filter((m) => m.type === 'purchase' || m.type === 'in' || m.type === 'return')
    .reduce((acc, m) => acc + Math.abs(m.qty), 0);

  const totalOut = movements
    .filter((m) => m.type === 'sale' || m.type === 'out')
    .reduce((acc, m) => acc + Math.abs(m.qty), 0);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>سجل حركات المخزون</Text>
          <Text style={styles.headerSubTitle}>تتبع كافة عمليات الإدخال والإخراج والتحويل</Text>
        </View>
      </View>

      {/* Metrics Bar */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>إجمالي الوارد (+)</Text>
          <Text style={[styles.metricVal, { color: colors.success.text }]}>+{totalIn} قطعة</Text>
        </View>
        <View style={styles.dividerVertical} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>إجمالي الصادر (-)</Text>
          <Text style={[styles.metricVal, { color: colors.danger.text }]}>-{totalOut} قطعة</Text>
        </View>
        <View style={styles.dividerVertical} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>إجمالي السجلات</Text>
          <Text style={styles.metricVal}>{movements.length}</Text>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث بالصنف أو رقم الحركة أو المرجع..."
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesScroll}>
          {[
            { key: 'all', label: 'الكل' },
            { key: 'in', label: 'توريد (+)' },
            { key: 'out', label: 'مبيعات (-)' },
            { key: 'transfer', label: 'تحويلات' },
            { key: 'return', label: 'مرتجعات' },
            { key: 'count', label: 'تسويات جرد' },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeChip, selectedType === t.key && styles.typeChipActive]}
              onPress={() => setSelectedType(t.key)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === t.key && styles.typeChipTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Movements List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="لا توجد حركات مخزنية"
            description="لم يتم العثور على أي حركة تطابق معايير البحث الحالية"
          />
        ) : (
          filtered.map((item) => {
            const badge = getTypeBadge(item.type);
            const Icon = badge.icon;
            const isPositive =
              item.type === 'purchase' || item.type === 'in' || item.type === 'return' || item.qty > 0;
            const isNegative = item.type === 'sale' || item.type === 'out';

            return (
              <View key={item.id} style={styles.movementCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.typeBadgeRow}>
                    <Badge variant={badge.variant} size="sm">
                      {badge.label}
                    </Badge>
                    {item.movement_number ? (
                      <Text style={styles.movementNum}>{item.movement_number}</Text>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.qtyBadge,
                      {
                        color: isNegative
                          ? colors.danger.text
                          : isPositive
                          ? colors.success.text
                          : colors.text.primary,
                      },
                    ]}
                  >
                    {isNegative ? `-${Math.abs(item.qty)}` : `+${Math.abs(item.qty)}`}
                  </Text>
                </View>

                <Text style={styles.productName}>{item.product_name}</Text>

                {item.reason || item.reference ? (
                  <Text style={styles.reasonText}>
                    المرجع: {item.reason || item.reference}
                  </Text>
                ) : null}

                <View style={styles.cardFooterRow}>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={colors.text.tertiary} />
                    <Text style={styles.dateText}>
                      {new Date(item.date).toLocaleString('ar', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>

                  {item.created_by ? (
                    <Text style={styles.userText}>المسؤول: {item.created_by}</Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      gap: spacing.sm,
    },
    backBtn: {
      padding: spacing.xs,
    },
    headerTitleWrap: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    headerSubTitle: {
      fontSize: 11.5,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    metricsBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    metricItem: {
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    metricVal: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    dividerVertical: {
      width: 1,
      height: 28,
      backgroundColor: colors.border.subtle,
    },
    filterSection: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      gap: spacing.xs,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      color: colors.text.primary,
      fontFamily: 'Cairo',
      paddingVertical: 6,
      textAlign: 'right',
    },
    typesScroll: {
      flexDirection: 'row',
      marginVertical: spacing.xs,
    },
    typeChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.surfaceSubtle : '#f1f5f9',
      marginRight: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    typeChipActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[700],
    },
    typeChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    typeChipTextActive: {
      color: '#fff',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      gap: spacing.sm,
      paddingBottom: 60,
    },
    movementCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      gap: 4,
      ...shadows.sm,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    typeBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    movementNum: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    qtyBadge: {
      fontSize: 16,
      fontWeight: '900',
      fontFamily: 'Cairo',
    },
    productName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      marginTop: 2,
    },
    reasonText: {
      fontSize: 11.5,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    cardFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dateText: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    userText: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
  });

export default StockMovementsScreen;
