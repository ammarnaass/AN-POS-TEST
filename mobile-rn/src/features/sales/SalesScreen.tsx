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
  Printer,
  Eye,
  ArrowUpRight,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { printInvoice } from '@/lib/print';
import { InvoicePrintPreviewModal } from '@/features/print/InvoicePrintPreviewModal';
import type { Sale } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Badge, EmptyState } from '@/components/ui';
import { notify } from '@/lib/notify';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'cash' | 'credit' | 'return';

export const SalesScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [previewSaleId, setPreviewSaleId] = useState<string | null>(null);
  const [quickPrintingId, setQuickPrintingId] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    try {
      await ensureInit();
      const allSales = await db.sales.toArray();
      // Sort newest first
      allSales.sort((a: any, b: any) => {
        const dateA = new Date(a.date || a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.date || b.createdAt || b.created_at || 0).getTime();
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
      const saleTime = new Date(s.date || s.createdAt || s.created_at || 0).getTime();

      // Period filter
      if (period === 'today' && saleTime < startOfToday) return false;
      if (period === 'week' && saleTime < startOfWeek) return false;
      if (period === 'month' && saleTime < startOfMonth) return false;

      // Status/Method filter
      const payment = s.paymentMethod || s.payment_method || 'cash';
      if (statusFilter === 'cash' && payment !== 'cash') return false;
      if (statusFilter === 'credit' && payment !== 'credit') return false;
      if (statusFilter === 'return' && s.type !== 'return') return false;

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchNumber = (s.number || '').toLowerCase().includes(query);
        const matchCustomer = (s.customerName || s.customer_name || '').toLowerCase().includes(query);
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
      const tot = Number(s.total || 0);
      const payment = s.paymentMethod || s.payment_method || 'cash';
      if (s.type === 'return') {
        totalReturns += tot;
      } else {
        totalRevenue += tot;
      }
      if (payment === 'cash') totalCash += tot;
      if (payment === 'credit') totalCredit += tot;
    });

    return { totalRevenue, totalCash, totalCredit, totalReturns };
  }, [filteredSales]);

  const handleQuickPrint = async (sale: any) => {
    setQuickPrintingId(sale.id);
    try {
      let rawItems: any[] = [];
      if (Array.isArray(sale.items)) {
        rawItems = sale.items;
      } else if (typeof sale.items === 'string') {
        try {
          const parsed = JSON.parse(sale.items);
          if (Array.isArray(parsed)) rawItems = parsed;
        } catch {
          rawItems = [];
        }
      }

      if (rawItems.length === 0) {
        const localItems = await db.saleItems.where('saleId').equals(sale.id).toArray().catch(() => []);
        if (localItems && localItems.length > 0) {
          rawItems = localItems.map((li: any) => ({
            name: li.productName || li.name || 'منتج',
            qty: Number(li.quantity || li.qty || 1),
            unitPrice: Number(li.unitPrice || li.price || 0),
            lineTotal: Number(li.total || li.lineTotal || 0),
          }));
        }
      }

      const ok = await printInvoice({
        id: sale.id,
        number: sale.number || 'INV-0001',
        date: sale.date || sale.created_at || new Date().toISOString(),
        items: (Array.isArray(rawItems) ? rawItems : []).map((i) => ({
          name: i?.name || 'منتج',
          qty: Number(i?.qty || i?.quantity || 1),
          unitPrice: Number(i?.unitPrice || i?.unit_price || 0),
          lineTotal: Number(i?.lineTotal || i?.line_total || (i?.qty || 1) * (i?.unitPrice || 0)),
        })),
        subtotal: Number(sale.subtotal || sale.total || 0),
        discount: Number(sale.discount || 0),
        tvaAmount: Number(sale.tvaAmount || sale.tva_amount || 0),
        total: Number(sale.total || 0),
        paymentMethod: sale.paymentMethod || sale.payment_method || 'cash',
        customerName: sale.customerName || sale.customer_name || t('pos.guestCustomer'),
        soldBy: sale.soldBy || sale.sold_by || t('pos.cashierDefault'),
        docType: (sale.docType as any) || 'sale-invoice',
        copies: 1,
        lang: language as any,
      });

      if (ok) {
        notify.success(`${t('sales.reprintSuccess')} (${sale.number || ''})`, '✓');
      } else {
        notify.warning(t('sales.printerConnectionWarning'), t('common.warning'));
      }
    } catch (err) {
      notify.error(err, t('sales.printJobFailed'));
    }
    setQuickPrintingId(null);
  };

  const dynamicStyles = makeStyles(colors, isDark);
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';

  return (
    <View style={[dynamicStyles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={dynamicStyles.header}>
        <View style={[dynamicStyles.searchBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Search size={18} color={colors.text.tertiary} />
          <TextInput
            style={[dynamicStyles.searchInput, { textAlign }]}
            placeholder={t('sales.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.text.tertiary}
          />
        </View>
      </View>

      {/* Period Filter Chips */}
      <View style={dynamicStyles.chipsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[dynamicStyles.chipsScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {[
            { id: 'today', label: t('common.today') },
            { id: 'week', label: t('common.thisWeek') },
            { id: 'month', label: t('common.thisMonth') },
            { id: 'all', label: t('sales.periodsAll') },
          ].map((item) => {
            const isActive = period === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  dynamicStyles.periodChip,
                  isActive && dynamicStyles.periodChipActive,
                ]}
                onPress={() => setPeriod(item.id as PeriodFilter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    dynamicStyles.periodChipText,
                    isActive && dynamicStyles.periodChipTextActive,
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
      <View style={[dynamicStyles.statusFilterBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {[
          { id: 'all', label: t('common.all') },
          { id: 'cash', label: t('pos.cash') },
          { id: 'credit', label: t('pos.credit') },
          { id: 'return', label: t('sales.returned') },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                dynamicStyles.statusTab,
                isActive && dynamicStyles.statusTabActive,
              ]}
              onPress={() => setStatusFilter(tab.id as StatusFilter)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  dynamicStyles.statusTabText,
                  isActive && dynamicStyles.statusTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary KPI Banner */}
      <View style={[dynamicStyles.kpiContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={dynamicStyles.kpiBox}>
          <Text style={dynamicStyles.kpiBoxLabel}>{t('sales.totalSales')}</Text>
          <Text style={dynamicStyles.kpiBoxVal}>
            {stats.totalRevenue.toLocaleString(localeStr)} {currency}
          </Text>
        </View>
        <View style={dynamicStyles.kpiDivider} />
        <View style={dynamicStyles.kpiBox}>
          <Text style={dynamicStyles.kpiBoxLabel}>{t('sales.cashSales')}</Text>
          <Text style={[dynamicStyles.kpiBoxVal, { color: colors.success.text || colors.emerald[600] }]}>
            {stats.totalCash.toLocaleString(localeStr)} {currency}
          </Text>
        </View>
        <View style={dynamicStyles.kpiDivider} />
        <View style={dynamicStyles.kpiBox}>
          <Text style={dynamicStyles.kpiBoxLabel}>{t('sales.creditSales')}</Text>
          <Text style={[dynamicStyles.kpiBoxVal, { color: colors.warning.main }]}>
            {stats.totalCredit.toLocaleString(localeStr)} {currency}
          </Text>
        </View>
      </View>

      {/* Invoices List */}
      <ScrollView
        style={dynamicStyles.scroll}
        contentContainerStyle={dynamicStyles.scrollContent}
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
          <View style={dynamicStyles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filteredSales.length === 0 ? (
          <EmptyState
            icon={<Receipt size={36} color={colors.text.tertiary} />}
            title={t('sales.noInvoicesFound')}
            description={t('sales.noInvoicesDesc')}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filteredSales.map((sale) => {
              const isReturn = sale.type === 'return';
              const payment = String(sale.paymentMethod || (sale as any).payment_method || 'cash');
              const itemsCount = (() => {
                if (Array.isArray(sale.items)) return sale.items.length;
                if (typeof sale.items === 'string') {
                  try {
                    const p = JSON.parse(sale.items);
                    if (Array.isArray(p)) return p.length;
                    if (p && typeof p === 'object') return Object.keys(p).length;
                  } catch {
                    return 0;
                  }
                }
                if (sale.items && typeof sale.items === 'object') return Object.keys(sale.items).length;
                return 0;
              })();

              return (
                <TouchableOpacity
                  key={sale.id}
                  style={dynamicStyles.saleCard}
                  onPress={() => navigation.navigate('InvoiceDetail', { saleId: sale.id, sale })}
                  activeOpacity={0.7}
                >
                  {/* Top Row: Total & Badge & Number */}
                  <View style={[dynamicStyles.saleCardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text
                        style={[
                          dynamicStyles.saleTotalText,
                          {
                            color: isReturn
                              ? colors.danger.main
                              : colors.text.primary,
                          },
                        ]}
                      >
                        {isReturn ? '-' : ''}
                        {Number(sale.total || 0).toLocaleString(localeStr)} {currency}
                      </Text>
                      <Badge
                        variant={
                          isReturn
                            ? 'danger'
                            : payment === 'cash'
                            ? 'success'
                            : payment === 'card'
                            ? 'primary'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {isReturn
                          ? t('sales.returned')
                          : payment === 'cash'
                          ? t('pos.cash')
                          : payment === 'card'
                          ? t('pos.card')
                          : t('pos.credit')}
                      </Badge>
                    </View>

                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                      <View style={[dynamicStyles.saleNumberRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Receipt size={15} color={colors.primary[600]} />
                        <Text style={dynamicStyles.saleNumberText}>
                          {sale.number || t('sales.unspecifiedInvoice')}
                        </Text>
                      </View>
                      <View style={[dynamicStyles.saleMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={dynamicStyles.metaText}>
                          {sale.customerName || (sale as any).customer_name || t('pos.guestCustomer')}
                        </Text>
                        <Text style={dynamicStyles.metaDot}>•</Text>
                        <Text style={dynamicStyles.metaText}>
                          {new Date(sale.date || (sale as any).created_at || (sale as any).createdAt || 0).toLocaleTimeString(localeStr, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Text style={dynamicStyles.metaDot}>•</Text>
                        <Text style={dynamicStyles.metaText}>{itemsCount} {t('sales.saleCardItems')}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={dynamicStyles.saleCardDivider} />

                  {/* Bottom Row: Quick Action Buttons */}
                  <View style={[dynamicStyles.saleCardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={[dynamicStyles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setPreviewSaleId(sale.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Eye size={14} color={colors.primary[600]} />
                      <Text style={dynamicStyles.actionBtnText}>{t('common.preview')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[dynamicStyles.actionBtn, dynamicStyles.actionBtnPrint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleQuickPrint(sale);
                      }}
                      disabled={quickPrintingId === sale.id}
                      activeOpacity={0.7}
                    >
                      {quickPrintingId === sale.id ? (
                        <ActivityIndicator size="small" color={colors.primary[600]} />
                      ) : (
                        <>
                          <Printer size={14} color={colors.primary[600]} />
                          <Text style={dynamicStyles.actionBtnText}>{t('sales.quickPrint')}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[dynamicStyles.actionBtnDetails, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={() => navigation.navigate('InvoiceDetail', { saleId: sale.id, sale })}
                      activeOpacity={0.7}
                    >
                      <Text style={dynamicStyles.actionBtnDetailsText}>{t('common.details')}</Text>
                      <ArrowUpRight size={13} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Invoice Print Preview Modal */}
      {previewSaleId ? (
        <InvoicePrintPreviewModal
          visible={Boolean(previewSaleId)}
          saleId={previewSaleId}
          onClose={() => setPreviewSaleId(null)}
        />
      ) : null}
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      backgroundColor: colors.surface,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[50],
      height: 40,
      gap: spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      fontFamily: typography.fontFamily.arabic,
      color: colors.text.primary,
      height: '100%',
    },

    chipsRow: {
      paddingVertical: spacing.xs + 2,
      backgroundColor: colors.surface,
    },
    chipsScroll: {
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
    },
    periodChip: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    periodChipActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[600],
    },
    periodChipText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabic,
    },
    periodChipTextActive: {
      color: '#fff',
      fontFamily: typography.fontFamily.arabicBold,
    },

    statusFilterBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    statusTab: {
      flex: 1,
      paddingVertical: 9,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    statusTabActive: {
      borderBottomColor: colors.primary[600],
    },
    statusTabText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
    },
    statusTabTextActive: {
      color: colors.primary[600],
      fontWeight: '800',
      fontFamily: typography.fontFamily.arabicBold,
    },

    kpiContainer: {
      flexDirection: 'row',
      margin: spacing.md,
      marginBottom: spacing.xs,
      padding: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.xs,
    },
    kpiBox: {
      flex: 1,
      alignItems: 'center',
    },
    kpiBoxLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      marginBottom: 2,
    },
    kpiBoxVal: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    kpiDivider: {
      width: 1,
      backgroundColor: colors.border.default,
      marginVertical: 2,
    },

    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing['2xl'],
    },
    center: {
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },

    saleCard: {
      padding: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.xs,
    },
    saleCardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    saleTotalText: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: typography.fontFamily.arabicBold,
      marginBottom: 4,
    },
    saleNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    saleNumberText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    saleMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 3,
    },
    metaText: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
    },
    metaDot: {
      fontSize: 10,
      color: colors.text.tertiary,
    },

    saleCardDivider: {
      height: 1,
      backgroundColor: colors.border.subtle,
      marginVertical: spacing.sm,
    },
    saleCardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    actionBtnPrint: {
      backgroundColor: isDark ? colors.slate[800] : colors.primary[50],
      borderColor: colors.primary[200],
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary[600],
      fontFamily: typography.fontFamily.arabicBold,
    },
    actionBtnDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.xs,
    },
    actionBtnDetailsText: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
    },
  });

export default SalesScreen;
