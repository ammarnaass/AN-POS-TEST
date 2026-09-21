import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import {
  ShoppingCart,
  Package,
  AlertCircle,
  TrendingUp,
  Wallet,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ScanBarcode,
  Coins,
  Store,
  Users,
  Plus,
  RefreshCw,
  Warehouse,
  ClipboardCheck,
  History,
  BarChart3,
  Barcode,
  Calculator,
  Lock,
  MonitorSmartphone,
  ShoppingBag,
  Sparkles,
  Crown,
  Zap,
  Tv,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import { useSyncEngine } from '@/lib/syncEngine';
import CameraScanner from '@/features/barcode/CameraScanner';
import type { Product, Sale, Customer, Supplier, CashSession } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Card, Badge, Skeleton } from '@/components/ui';
import { getStoreSettings, type StoreSettings } from '@/lib/settingService';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import RewardAdModal from '@/components/subscription/RewardAdModal';
import RemoveAdsBanner from '@/components/subscription/RemoveAdsBanner';
import FeatureUnlockAdModal from '@/components/subscription/FeatureUnlockAdModal';
import ContactUsModal from '@/components/subscription/ContactUsModal';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const { connectionMode } = useSyncEngine();
  const isConnectedMode = connectionMode === 'connected' || unifiedDB.getMode() === 'connected';
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [showRewardAdModal, setShowRewardAdModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [lockedFeatureModal, setLockedFeatureModal] = useState<{
    key: string;
    name: string;
    screen: string;
  } | null>(null);

  const {
    status: subscriptionStatus,
    refreshStatus: refreshSubscriptionStatus,
    isFeatureUnlocked,
  } = useSubscriptionStore();

  const handleGuardedNavigation = async (
    featureKey: string,
    featureName: string,
    screen: string
  ) => {
    if (isConnectedMode || subscriptionStatus?.isAdFree) {
      navigation.navigate(screen);
      return;
    }
    const unlocked = await isFeatureUnlocked(featureKey);
    if (unlocked) {
      navigation.navigate(screen);
    } else {
      setLockedFeatureModal({ key: featureKey, name: featureName, screen });
    }
  };

  useEffect(() => {
    loadDashboardData();
    refreshSubscriptionStatus().catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSubscriptionStatus().catch(() => {});
    }, [refreshSubscriptionStatus])
  );

  async function loadDashboardData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allProducts, allSales, allCustomers, allSuppliers, allSessions, st] = await Promise.all([
        db.products.toArray().catch(() => []),
        db.sales.toArray().catch(() => []),
        db.customers.toArray().catch(() => []),
        db.suppliers.toArray().catch(() => []),
        db.cashSessions.toArray().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayFiltered = allSales.filter((s: any) =>
        (s.date || s.createdAt || s.created_at || '').startsWith(todayStr)
      );

      const openSession = allSessions.find((s: any) => s.status === 'open') || null;

      setProducts(allProducts);
      setTodaySales(todayFiltered);
      setCustomers(allCustomers);
      setSuppliers(allSuppliers);
      setCurrentSession(openSession);
      setStoreSettings(st);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      refreshSubscriptionStatus().catch(() => {}),
    ]);
    setRefreshing(false);
  };

  const handleQuickScan = async (code: string, mode?: 'single' | 'multi') => {
    if (mode === 'single') {
      setShowScanner(false);
    }
    try {
      await ensureInit();
      const allProds = await db.products.toArray();
      const normalized = code.trim().toLowerCase();

      let matchedProduct: any = null;
      let matchedCustomPrice: any = null;

      // 1. Check custom prices barcode across products
      for (const p of allProds) {
        const rawCP = (p as any).custom_prices ?? (p as any).customPrices;
        let cPrices: any[] = [];
        if (rawCP) {
          try {
            cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
          } catch {}
        }
        const foundCP = cPrices.find(
          (cp: any) => cp.barcode && cp.barcode.trim().toLowerCase() === normalized
        );
        if (foundCP) {
          matchedProduct = p;
          matchedCustomPrice = foundCP;
          break;
        }
      }

      // 2. Check primary barcode & sku
      if (!matchedProduct) {
        matchedProduct = allProds.find(
          (p: any) =>
            (p.barcode && String(p.barcode).trim().toLowerCase() === normalized) ||
            (p.sku && String(p.sku).trim().toLowerCase() === normalized)
        );
      }

      // 3. Check product_barcodes table (secondary barcodes)
      if (!matchedProduct) {
        const rows = await db.productBarcodes.where('barcode').equals(code).toArray().catch(() => []);
        if (rows && rows.length > 0) {
          const matchedId = rows[0]?.product_id || rows[0]?.productId;
          matchedProduct = allProds.find((p: any) => p.id === matchedId);
          if (matchedProduct && (rows[0].price_label || rows[0].priceLabel)) {
            const pLabel = (rows[0].price_label || rows[0].priceLabel).trim();
            const rawCP = (matchedProduct as any).custom_prices ?? (matchedProduct as any).customPrices;
            let cPrices: any[] = [];
            if (rawCP) {
              try {
                cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
              } catch {}
            }
            matchedCustomPrice = cPrices.find(
              (cp: any) => cp.name && cp.name.trim().toLowerCase() === pLabel.toLowerCase()
            );
          }
        }
      }

      if (matchedProduct) {
        const dispPrice = matchedCustomPrice
          ? Number(matchedCustomPrice.price)
          : (matchedProduct.retailPrice || (matchedProduct as any).retail_price || 0);
        const titleSuffix = matchedCustomPrice ? ` (${matchedCustomPrice.name})` : '';

        if (mode === 'single') {
          Alert.alert(
            `✓ ${matchedProduct.name}${titleSuffix}`,
            `${t('inventory.barcode')}: ${code}\n${t('pos.price')}: ${dispPrice.toLocaleString(localeStr)} ${currency}\n${t('inventory.inStock')}: ${matchedProduct.quantity || 0}`,
            [
              {
                text: t('pos.addToCart'),
                onPress: () => navigation.navigate('POS', { barcode: code }),
              },
              {
                text: t('inventory.editProduct'),
                onPress: () => navigation.navigate('ProductForm', { id: matchedProduct.id }),
              },
              { text: t('common.close'), style: 'cancel' },
            ]
          );
        }
      } else {
        if (mode === 'single') {
          Alert.alert(
            t('inventory.noProductsFound'),
            `${code} - ${t('inventory.addProduct')}?`,
            [
              {
                text: t('inventory.addProduct'),
                onPress: () => navigation.navigate('ProductForm', { barcode: code }),
              },
              { text: t('common.cancel'), style: 'cancel' },
            ]
          );
        }
      }
    } catch (e) {
      console.error('Scan lookup error', e);
    }
  };

  const handleBatchComplete = async (codes: string[]) => {
    setShowScanner(false);
    if (!codes || codes.length === 0) return;

    try {
      await ensureInit();
      const allProds = await db.products.toArray();
      const allSec = await db.productBarcodes.toArray().catch(() => []);

      const foundCount = codes.filter((c) => {
        const norm = c.trim().toLowerCase();
        if (allProds.some((p: any) => (p.barcode && String(p.barcode).toLowerCase() === norm) || (p.sku && String(p.sku).toLowerCase() === norm))) return true;
        if (allSec.some((b: any) => b.barcode && String(b.barcode).toLowerCase() === norm)) return true;
        return allProds.some((p: any) => {
          const rawCP = (p as any).custom_prices ?? (p as any).customPrices;
          if (!rawCP) return false;
          try {
            const list = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
            return list.some((cp: any) => cp.barcode && String(cp.barcode).toLowerCase() === norm);
          } catch {
            return false;
          }
        });
      }).length;

      Alert.alert(
        `✓ ${t('common.completed')}`,
        `${codes.length} (${foundCount})`,
        [
          {
            text: t('pos.posTitle'),
            onPress: () => navigation.navigate('POS', { initialCodes: codes }),
          },
          { text: t('common.close'), style: 'cancel' },
        ]
      );
    } catch (e) {
      console.error('Batch complete error', e);
    }
  };

  const todayRevenue = useMemo(() => {
    return (todaySales || []).reduce((sum, s: any) => {
      if (!s) return sum;
      const total = Number(s.total || s.total_amount || 0);
      if (s.type === 'return') return sum - total;
      return sum + total;
    }, 0);
  }, [todaySales]);

  const todayItemsSold = useMemo(() => {
    return (todaySales || []).reduce((sum, s: any) => {
      if (!s) return sum;
      let items: any[] = [];
      if (Array.isArray(s.items)) {
        items = s.items;
      } else if (typeof s.items === 'string') {
        try {
          const parsed = JSON.parse(s.items);
          if (Array.isArray(parsed)) {
            items = parsed;
          } else if (parsed && typeof parsed === 'object') {
            items = Object.values(parsed);
          }
        } catch {
          items = [];
        }
      } else if (s.items && typeof s.items === 'object') {
        items = Object.values(s.items);
      }
      return sum + (Array.isArray(items) ? items.reduce((si, i: any) => si + (Number(i?.qty) || Number(i?.quantity) || 1), 0) : 0);
    }, 0);
  }, [todaySales]);

  const lowStockCount = useMemo(() => {
    return products.filter(
      (p) => (p.quantity || 0) <= (p.lowStockThreshold || (p as any).low_stock_threshold || 5)
    ).length;
  }, [products]);

  const totalCustomerDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  }, [customers]);

  const totalSupplierDebt = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + Math.max(0, s.balance || 0), 0);
  }, [suppliers]);

  const netFinancialPosition = totalCustomerDebt - totalSupplierDebt;

  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? t('dashboard.greetingMorning') : t('dashboard.greetingEvening');

  const todayFormattedDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString(localeStr, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return '';
    }
  }, [localeStr]);

  if (loading && !refreshing) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Skeleton height={68} borderRadius={radii.xl} />
        <Skeleton height={170} borderRadius={radii.xxl} />
        <Skeleton height={110} borderRadius={radii.xl} />
        <Skeleton height={180} borderRadius={radii.xl} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. Header Pulse & Integrated Shift Banner ── */}
      <View
        style={[
          styles.pulseCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        {/* Top Greeting & Date Row */}
        <View style={[styles.pulseTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.pulseGreetingCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.pulseGreetingText, { color: colors.text.primary }]}>
              {greetingText}
            </Text>
            <Text style={[styles.pulseDateText, { color: colors.text.tertiary }]}>
              {todayFormattedDate} {storeSettings?.shop_name ? `• ${storeSettings.shop_name}` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.pulseRefreshBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
            onPress={onRefresh}
            activeOpacity={0.75}
          >
            <RefreshCw size={15} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Live Cash Shift Strip */}
        <TouchableOpacity
          activeOpacity={0.82}
          style={[
            styles.shiftStrip,
            {
              backgroundColor: currentSession
                ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
                : (isDark ? colors.surfaceElevated : colors.surfaceSubtle),
              borderColor: currentSession
                ? (isDark ? colors.emerald[800] : colors.emerald[200])
                : (isDark ? colors.border.default : colors.slate[200]),
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => navigation.navigate('Cash')}
        >
          <View style={[styles.shiftStripLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.shiftStripIconBox,
                {
                  backgroundColor: currentSession
                    ? (isDark ? 'rgba(16, 185, 129, 0.2)' : colors.emerald[100])
                    : (isDark ? 'rgba(239, 68, 68, 0.15)' : colors.danger.light),
                },
              ]}
            >
              {currentSession ? (
                <Wallet size={16} color={colors.emerald[700]} />
              ) : (
                <Lock size={15} color={colors.danger.main} />
              )}
            </View>

            <View style={[styles.shiftStripInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.shiftStripTitle, { color: colors.text.primary }]}>
                {currentSession
                  ? `${t('cash.currentShift')} #${currentSession.sessionNumber || (currentSession as any).number || 1}`
                  : t('dashboard.closedShift')}
              </Text>
              <Text style={[styles.shiftStripSub, { color: colors.text.secondary }]}>
                {currentSession
                  ? `${t('pos.cashierDefault')}: ${currentSession.openedBy || (currentSession as any).opened_by || '—'}`
                  : t('dashboard.openShiftSub')}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <Badge
              variant={currentSession ? 'emerald' : 'danger'}
              size="xs"
              dot={Boolean(currentSession)}
            >
              {currentSession ? t('pos.openShiftActive') : t('dashboard.openShiftCta')}
            </Badge>
            <ChevronIcon size={15} color={colors.text.tertiary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Standalone Subscription & Remove Ads Banner ── */}
      {!isConnectedMode && (
        <View style={{ marginBottom: spacing.xs }}>
          <RemoveAdsBanner compact style={{ marginBottom: spacing.xs }} />

          {!subscriptionStatus?.isAdFree && (
            <View
              style={[
                styles.subBannerCard,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    (subscriptionStatus?.remainingSales ?? 300) < 20
                      ? colors.danger.main
                      : colors.border.default,
                },
              ]}
            >
              <View style={[styles.subBannerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.subBannerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => navigation.navigate('Subscription')}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.subIconBox,
                      {
                        backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : '#ede9fe',
                      },
                    ]}
                  >
                    <Sparkles size={17} color="#7c3aed" />
                  </View>

                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.subTierTitle, { color: colors.text.primary }]}>
                      {t('subscription.adSupportedStatus')}
                    </Text>
                    <Text style={[styles.subQuotaSubtitle, { color: colors.text.secondary }]}>
                      {t('subscription.salesRemaining')}:{' '}
                      <Text
                        style={{
                          fontWeight: '800',
                          color:
                            (subscriptionStatus?.remainingSales ?? 300) < 20
                              ? colors.danger.main
                              : colors.emerald[600],
                        }}
                      >
                        {subscriptionStatus?.remainingSales ?? 300}
                      </Text>{' '}
                      / {subscriptionStatus?.totalQuota ?? 300} {t('subscription.salesUnit')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={[
                      styles.subAdActionBtn,
                      { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => setShowRewardAdModal(true)}
                    activeOpacity={0.85}
                  >
                    <Tv size={13} color="#ffffff" />
                    <Text style={styles.subAdActionBtnText}>+20 مبيعة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
                    <ChevronIcon size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mini progress bar */}
              <View style={[styles.subMiniProgressTrack, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[200] }]}>
                <View
                  style={[
                    styles.subMiniProgressFill,
                    {
                      width: `${Math.max(
                        3,
                        100 -
                          (subscriptionStatus && subscriptionStatus.totalQuota > 0
                            ? Math.min(100, Math.round((subscriptionStatus.usedSales / subscriptionStatus.totalQuota) * 100))
                            : 0)
                      )}%`,
                      backgroundColor:
                        (subscriptionStatus?.remainingSales ?? 300) < 20 ? colors.danger.main : colors.primary[500],
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── 2. Unified Financial Bento Board ── */}
      <Card variant="elevated" style={styles.financialBentoCard}>
        {/* Main Revenue Hero Display */}
        <View style={[styles.bentoHeroRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <View style={[styles.bentoTagRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.bentoIconBadge, { backgroundColor: colors.emerald[50] }]}>
                <TrendingUp size={15} color={colors.emerald[700]} />
              </View>
              <Text style={[styles.bentoHeroLabel, { color: colors.text.secondary }]}>
                {t('dashboard.todaySales')}
              </Text>
            </View>

            <View style={[styles.bentoAmountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.bentoAmountValue, { color: colors.text.primary }]}>
                {todayRevenue.toLocaleString(localeStr)}
              </Text>
              <Text style={[styles.bentoAmountCurrency, { color: colors.primary[600] }]}>
                {currency}
              </Text>
            </View>
          </View>

          <Badge variant="emerald" size="sm" style={styles.salesCountBadge}>
            {todaySales.length} {t('sales.sales')}
          </Badge>
        </View>

        {/* 4-Chip Metrics Sub-Grid */}
        <View style={styles.metricsGrid}>
          {/* Items Sold */}
          <View
            style={[
              styles.metricChip,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
                alignItems: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <View style={[styles.chipHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ShoppingCart size={13} color={colors.emerald[600]} />
              <Text style={[styles.metricChipLabel, { color: colors.text.tertiary }]}>
                {t('dashboard.itemsSoldToday')}
              </Text>
            </View>
            <Text style={[styles.metricChipValue, { color: colors.emerald[600] }]}>
              {todayItemsSold} <Text style={styles.metricChipUnit}>{t('sales.itemsCount')}</Text>
            </Text>
          </View>

          {/* Products Count */}
          <View
            style={[
              styles.metricChip,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
                alignItems: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <View style={[styles.chipHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Package size={13} color={colors.primary[600]} />
              <Text style={[styles.metricChipLabel, { color: colors.text.tertiary }]}>
                {t('inventory.products')}
              </Text>
            </View>
            <Text style={[styles.metricChipValue, { color: colors.primary[600] }]}>
              {products.length} <Text style={styles.metricChipUnit}>{t('common.total')}</Text>
            </Text>
          </View>

          {/* Customer Debts */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Customers')}
            style={[
              styles.metricChip,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
                alignItems: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <View style={[styles.chipHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ArrowDownLeft size={13} color={colors.emerald[600]} />
              <Text style={[styles.metricChipLabel, { color: colors.text.tertiary }]}>
                {t('dashboard.customerDebts')}
              </Text>
            </View>
            <Text style={[styles.metricChipValue, { color: colors.emerald[600] }]}>
              +{totalCustomerDebt.toLocaleString(localeStr)}
            </Text>
          </TouchableOpacity>

          {/* Supplier Debts */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Suppliers')}
            style={[
              styles.metricChip,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
                alignItems: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <View style={[styles.chipHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ArrowUpRight size={13} color={colors.danger.main} />
              <Text style={[styles.metricChipLabel, { color: colors.text.tertiary }]}>
                {t('dashboard.supplierDebts')}
              </Text>
            </View>
            <Text style={[styles.metricChipValue, { color: colors.danger.main }]}>
              -{totalSupplierDebt.toLocaleString(localeStr)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Net Cumulative Position Footnote */}
        <View
          style={[
            styles.netPositionStrip,
            {
              borderTopColor: colors.border.subtle,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5 }}>
            <Coins size={14} color={colors.text.tertiary} />
            <Text style={[styles.netPositionLabel, { color: colors.text.secondary }]}>
              {t('dashboard.netCumulative')}
            </Text>
          </View>
          <Text
            style={[
              styles.netPositionValue,
              netFinancialPosition >= 0 ? { color: colors.emerald[600] } : { color: colors.danger.main },
            ]}
          >
            {netFinancialPosition >= 0 ? '+' : ''}
            {netFinancialPosition.toLocaleString(localeStr)} {currency}
          </Text>
        </View>
      </Card>

      {/* ── 3. Actionable Alert: Low Stock Warning (Conditional) ── */}
      {lowStockCount > 0 && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.lowStockBanner,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={[styles.lowStockIconBox, { backgroundColor: colors.danger.light }]}>
            <AlertCircle size={18} color={colors.danger.main} />
          </View>

          <View style={[styles.lowStockTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.lowStockHeading, { color: colors.danger.main }]}>
              {t('dashboard.lowStockAlert')}
            </Text>
            <Text style={[styles.lowStockDesc, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {lowStockCount} {t('dashboard.lowStockAlertDesc')}
            </Text>
          </View>

          <Badge variant="danger" size="xs">
            {lowStockCount}
          </Badge>
        </TouchableOpacity>
      )}

      {/* ── 4. Core Operational Actions (Zero Redundancy) ── */}
      <View style={styles.actionsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary, textAlign }]}>
          {t('dashboard.quickActions')}
        </Text>

        {/* A. Hero Emphasized Action: Start New POS Sale */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.posHeroBtn,
            {
              backgroundColor: colors.primary[600],
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => navigation.navigate('POS')}
        >
          <View style={styles.posHeroIconCircle}>
            <Store size={22} color="#ffffff" />
          </View>

          <View style={[styles.posHeroTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.posHeroTitle}>{t('pos.posTitle')} — {t('dashboard.newSaleBtn')}</Text>
            <Text style={styles.posHeroSubtitle}>{t('dashboard.posSub')}</Text>
          </View>

          <ChevronIcon size={20} color="#ffffff" style={{ opacity: 0.85 }} />
        </TouchableOpacity>

        {/* B. Secondary Quick Actions Row (Barcode & Remote Scanner) */}
        <View style={[styles.dualActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Quick Camera Barcode Scanner */}
          <TouchableOpacity
            style={[
              styles.actionTile,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border.default,
              },
            ]}
            onPress={() => setShowScanner(true)}
            activeOpacity={0.78}
          >
            <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.emerald[50] }]}>
              <ScanBarcode size={20} color={colors.emerald[700]} />
            </View>
            <Text style={[styles.actionTileTitle, { color: colors.text.primary }]}>
              {t('dashboard.quickSale')}
            </Text>
            <Text style={[styles.actionTileSub, { color: colors.text.tertiary }]}>
              {t('dashboard.quickSaleSub')}
            </Text>
          </TouchableOpacity>

          {/* Remote POS Scanner (Appears strictly in connected mode) */}
          {isConnectedMode ? (
            <TouchableOpacity
              style={[
                styles.actionTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : colors.primary[200],
                },
              ]}
              onPress={() => navigation.navigate('RemoteScanner')}
              activeOpacity={0.78}
            >
              <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : colors.primary[50] }]}>
                <MonitorSmartphone size={20} color={colors.primary[600]} />
              </View>
              <Text style={[styles.actionTileTitle, { color: colors.primary[700] }]}>
                قارئ عن بُعد
              </Text>
              <Text style={[styles.actionTileSub, { color: colors.primary[500] }]}>
                لكمبيوتر المحل
              </Text>
            </TouchableOpacity>
          ) : (
            /* In standalone mode: Add Product shortcut replaces remote scanner */
            <TouchableOpacity
              style={[
                styles.actionTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border.default,
                },
              ]}
              onPress={() => navigation.navigate('ProductForm')}
              activeOpacity={0.78}
            >
              <View style={[styles.actionIconBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50] }]}>
                <Plus size={20} color={colors.primary[600]} />
              </View>
              <Text style={[styles.actionTileTitle, { color: colors.text.primary }]}>
                {t('inventory.addProduct')}
              </Text>
              <Text style={[styles.actionTileSub, { color: colors.text.tertiary }]}>
                {t('inventory.products')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* C. Operational Triplet: Purchase, Expense, Add Product */}
        <View style={[styles.tripletActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* New Purchase */}
          <TouchableOpacity
            style={[styles.tripletTile, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('PurchaseForm')}
            activeOpacity={0.75}
          >
            <View style={[styles.tripletIconBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : colors.amber[50] }]}>
              <ShoppingBag size={18} color={colors.amber[700]} />
            </View>
            <Text style={[styles.tripletTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {t('suppliers.purchases')}
            </Text>
          </TouchableOpacity>

          {/* New Expense */}
          <TouchableOpacity
            style={[styles.tripletTile, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('Expenses')}
            activeOpacity={0.75}
          >
            <View style={[styles.tripletIconBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : colors.danger.light }]}>
              <Receipt size={18} color={colors.danger.main} />
            </View>
            <Text style={[styles.tripletTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {t('dashboard.operatingExpenses')}
            </Text>
          </TouchableOpacity>

          {/* Add Product (if not already shown above in standalone mode) or Customers shortcut */}
          <TouchableOpacity
            style={[styles.tripletTile, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => isConnectedMode ? navigation.navigate('ProductForm') : navigation.navigate('Suppliers')}
            activeOpacity={0.75}
          >
            <View style={[styles.tripletIconBox, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : colors.cyan[50] }]}>
              {isConnectedMode ? (
                <Plus size={18} color={colors.cyan[700]} />
              ) : (
                <Truck size={18} color={colors.cyan[700]} />
              )}
            </View>
            <Text style={[styles.tripletTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {isConnectedMode ? t('inventory.addProduct') : t('suppliers.title')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* D. Collapsible Secondary Utilities Tray */}
        <TouchableOpacity
          style={[styles.advancedToolsToggle, { borderColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setShowAdvancedTools((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} color={colors.primary[600]} />
            <Text style={[styles.advancedToolsToggleText, { color: colors.text.secondary }]}>
              {showAdvancedTools ? 'إخفاء أدوات المتجر الإضافية' : 'أدوات المتجر الإضافية (جرد، أرباح، مستودعات...)'}
            </Text>
          </View>
          {showAdvancedTools ? (
            <ChevronUp size={16} color={colors.text.tertiary} />
          ) : (
            <ChevronDown size={16} color={colors.text.tertiary} />
          )}
        </TouchableOpacity>

        {showAdvancedTools && (
          <View style={styles.advancedToolsGrid}>
            <View style={[styles.toolsGridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
                onPress={() => navigation.navigate('InventoryCount')}
              >
                <ClipboardCheck size={18} color={colors.purple[700]} />
                <Text style={[styles.toolCardTitle, { color: colors.text.primary }]}>{t('nav.inventoryCount')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
                onPress={() => navigation.navigate('StockMovements')}
              >
                <History size={18} color={colors.cyan[700]} />
                <Text style={[styles.toolCardTitle, { color: colors.text.primary }]}>{t('nav.stockMovements')}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.toolsGridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
                onPress={() => handleGuardedNavigation('multi_warehouse', t('nav.warehouses'), 'Warehouses')}
              >
                <Warehouse size={18} color={colors.amber[700]} />
                <Text style={[styles.toolCardTitle, { color: colors.text.primary }]}>{t('nav.warehouses')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
                onPress={() => handleGuardedNavigation('profit_center', t('profitCenter.title'), 'ProfitCenter')}
              >
                <BarChart3 size={18} color={colors.emerald[700]} />
                <Text style={[styles.toolCardTitle, { color: colors.text.primary }]}>{t('profitCenter.title')}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.toolsGridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
                onPress={() => handleGuardedNavigation('zakat_calculator', t('zakatCalculator.title'), 'ZakatCalculator')}
              >
                <Calculator size={18} color={colors.amber[700]} />
                <Text style={[styles.toolCardTitle, { color: colors.text.primary }]}>{t('zakatCalculator.title')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
                onPress={() => handleGuardedNavigation('barcode_labels', t('barcodeLabels.title'), 'BarcodeLabels')}
              >
                <Barcode size={18} color={colors.purple[700]} />
                <Text style={[styles.toolCardTitle, { color: colors.text.primary }]}>{t('barcodeLabels.title')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── 5. Live Today Sales Feed (Elevated Prominence) ── */}
      <View style={styles.sectionContainer}>
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>
            {t('dashboard.recentTodaySales')}
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Sales')}
            style={[styles.seeAllBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAllText, { color: colors.primary[600] }]}>
              {t('dashboard.viewAll')}
            </Text>
            <ChevronIcon size={14} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {todaySales.length === 0 ? (
          <Card
            style={[
              styles.emptySalesCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
          >
            <Receipt size={32} color={colors.text.tertiary} />
            <Text style={[styles.emptySalesTitle, { color: colors.text.secondary }]}>
              {t('dashboard.noTodaySales')}
            </Text>
            <Text style={[styles.emptySalesSub, { color: colors.text.tertiary }]}>
              {t('dashboard.noTodaySalesSub')}
            </Text>
          </Card>
        ) : (
          <View style={styles.salesList}>
            {todaySales.slice(0, 5).map((sale) => {
              const isReturn = sale.type === 'return';
              const formattedTime = new Date(
                sale.date || sale.createdAt || ''
              ).toLocaleTimeString(localeStr, {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <TouchableOpacity
                  key={sale.id}
                  activeOpacity={0.75}
                  style={[
                    styles.saleItemRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border.default,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate('InvoiceDetail', { saleId: sale.id, sale })
                  }
                >
                  <View style={[styles.saleLeftCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text
                      style={[
                        styles.saleTotal,
                        isReturn
                          ? { color: colors.danger.main }
                          : { color: colors.text.primary },
                      ]}
                    >
                      {(sale.total || 0).toLocaleString(localeStr)} {currency}
                    </Text>
                    <Badge
                      variant={
                        isReturn
                          ? 'danger'
                          : (sale.paymentMethod as string) === 'credit'
                          ? 'warning'
                          : 'emerald'
                      }
                      size="xs"
                    >
                      {isReturn
                        ? t('returns.title')
                        : (sale.paymentMethod as string) === 'credit'
                        ? t('pos.credit')
                        : (sale.paymentMethod as string) === 'card'
                        ? t('pos.card')
                        : t('pos.cash')}
                    </Badge>
                  </View>

                  <View style={[styles.saleRightCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.saleNumber, { color: colors.text.primary }]}>
                      {t('sales.invoiceNumber')} #{sale.number || '0000'}
                    </Text>
                    <View style={[styles.saleMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Clock size={11} color={colors.text.tertiary} />
                      <Text style={[styles.saleMetaText, { color: colors.text.tertiary }]}>
                        {formattedTime}
                      </Text>
                      <Text style={[styles.saleMetaDot, { color: colors.text.tertiary }]}>•</Text>
                      <Text style={[styles.saleCustomerName, { color: colors.text.secondary }]}>
                        {sale.customerName || t('pos.guestCustomer')}
                      </Text>
                    </View>
                  </View>

                  <ChevronIcon size={16} color={colors.text.tertiary} style={styles.chevron} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Quick Scanner Modal ── */}
      {showScanner && (
        <CameraScanner
          onScan={handleQuickScan}
          onBatchComplete={handleBatchComplete}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── Rewarded Ad Modal ── */}
      <RewardAdModal
        visible={showRewardAdModal}
        onClose={() => setShowRewardAdModal(false)}
        onRewardClaimed={() => {
          refreshSubscriptionStatus();
        }}
        onUpgradePress={() => navigation.navigate('Subscription')}
      />

      {/* ── Feature Unlock Rewarded Ad Modal ── */}
      {lockedFeatureModal && (
        <FeatureUnlockAdModal
          visible={!!lockedFeatureModal}
          featureKey={lockedFeatureModal.key}
          featureTitle={lockedFeatureModal.name}
          onClose={() => setLockedFeatureModal(null)}
          onUnlocked={() => {
            const target = lockedFeatureModal.screen;
            setLockedFeatureModal(null);
            navigation.navigate(target);
          }}
          onContactUsPress={() => {
            setLockedFeatureModal(null);
            setShowContactModal(true);
          }}
        />
      )}

      {/* ── Contact Us to Remove Ads Modal ── */}
      <ContactUsModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={() => {
          refreshSubscriptionStatus();
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxxl + spacing.xl,
  },

  // 1. Store Pulse & Integrated Shift Banner
  pulseCard: {
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
    ...shadows.xs,
  },
  pulseTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseGreetingCol: {
    flex: 1,
    gap: 2,
  },
  pulseGreetingText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
    letterSpacing: -0.2,
  },
  pulseDateText: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
  },
  pulseRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftStrip: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  shiftStripLeft: {
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  shiftStripIconBox: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftStripInfo: {
    flex: 1,
    gap: 1,
  },
  shiftStripTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  shiftStripSub: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
  },

  // 2. Financial Bento Card
  financialBentoCard: {
    padding: spacing.lg,
    borderRadius: radii.xxl,
    gap: spacing.md,
  },
  bentoHeroRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bentoTagRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bentoIconBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoHeroLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  bentoAmountRow: {
    alignItems: 'baseline',
    gap: 6,
  },
  bentoAmountValue: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'Cairo',
    letterSpacing: -0.6,
  },
  bentoAmountCurrency: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  salesCountBadge: {
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  metricChip: {
    width: '48.5%',
    padding: spacing.sm + 2,
    borderRadius: radii.lg,
    gap: 2,
  },
  chipHeaderRow: {
    alignItems: 'center',
    gap: 4,
  },
  metricChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Cairo',
  },
  metricChipValue: {
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
    marginTop: 1,
  },
  metricChipUnit: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  netPositionStrip: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  netPositionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  netPositionValue: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'Cairo',
  },

  // 3. Low Stock Alert Banner
  lowStockBanner: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
  },
  lowStockIconBox: {
    width: 34,
    height: 34,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowStockTextBox: {
    flex: 1,
    gap: 1,
  },
  lowStockHeading: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  lowStockDesc: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  // 4. Core Operational Actions
  actionsSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
    paddingHorizontal: 4,
  },
  posHeroBtn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    ...shadows.sm,
  },
  posHeroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posHeroTextCol: {
    flex: 1,
    marginHorizontal: spacing.sm + 2,
    gap: 2,
  },
  posHeroTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Cairo',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  posHeroSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dualActionRow: {
    gap: spacing.sm,
  },
  actionTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...shadows.xs,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionTileTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  actionTileSub: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
  },
  tripletActionRow: {
    gap: spacing.xs + 2,
  },
  tripletTile: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tripletIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripletTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  advancedToolsToggle: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  advancedToolsToggleText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  advancedToolsGrid: {
    gap: spacing.xs + 2,
  },
  toolsGridRow: {
    gap: spacing.xs + 2,
  },
  toolCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  toolCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // 5. Recent Sales Feed
  sectionContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionHeading: {
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  seeAllBtn: {
    alignItems: 'center',
    gap: 3,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  emptySalesCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  emptySalesTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
    marginTop: spacing.xs,
  },
  emptySalesSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  salesList: {
    gap: spacing.xs + 2,
  },
  saleItemRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    ...shadows.xs,
  },
  saleLeftCol: {
    alignItems: 'flex-start',
    gap: 3,
  },
  saleTotal: {
    fontSize: 14.5,
    fontWeight: '900',
    fontFamily: 'Cairo',
  },
  saleRightCol: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  saleNumber: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  saleMetaRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  saleMetaText: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  saleMetaDot: {
    fontSize: 11,
  },
  saleCustomerName: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
  },
  chevron: {
    marginLeft: 4,
  },
  subBannerCard: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    ...shadows.sm,
  },
  subBannerTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subBannerLeft: {
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  subIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTierTitle: {
    fontSize: 14,
    fontFamily: 'Cairo',
    fontWeight: '800',
  },
  subQuotaSubtitle: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    marginTop: 2,
  },
  subAdActionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    alignItems: 'center',
    gap: 4,
  },
  subAdActionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },
  subUpgradeMiniBtn: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  subUpgradeMiniBtnText: {
    fontSize: 11,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },
  subMiniProgressTrack: {
    width: '100%',
    height: 5,
    borderRadius: radii.full,
    marginTop: 10,
    overflow: 'hidden',
  },
  subMiniProgressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
});

export default DashboardScreen;
