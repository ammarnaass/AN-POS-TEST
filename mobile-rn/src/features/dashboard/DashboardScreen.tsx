import React, { useState, useEffect, useMemo } from 'react';
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
  Calculator,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ScanBarcode,
  FileText,
  Coins,
  Store,
  Users,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  BarChart3,
  Barcode,
  Printer,
  Plus,
  RefreshCw,
  Warehouse,
  ClipboardCheck,
  History,
  Tag,
  Layers,
  CheckCircle2,
  Lock,
  Unlock,
  Sliders,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import CameraScanner from '@/features/barcode/CameraScanner';
import type { Product, Sale, Customer, Supplier, CashSession } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Skeleton } from '@/components/ui';
import { getStoreSettings, type StoreSettings } from '@/lib/settingService';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
  const UpgradeArrow = isRTL ? ArrowLeft : ArrowRight;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [allSalesCount, setAllSalesCount] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

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
      setAllSalesCount(allSales.length);
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
    await loadDashboardData();
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
        // check primary or sku
        if (allProds.some((p: any) => (p.barcode && String(p.barcode).toLowerCase() === norm) || (p.sku && String(p.sku).toLowerCase() === norm))) return true;
        // check secondary
        if (allSec.some((b: any) => b.barcode && String(b.barcode).toLowerCase() === norm)) return true;
        // check custom price barcodes
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

  // Dynamic greeting based on current hour
  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? t('dashboard.greetingMorning') : t('dashboard.greetingEvening');

  if (loading && !refreshing) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Skeleton height={80} borderRadius={radii.xxl} />
        <Skeleton height={70} borderRadius={radii.xl} />
        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Skeleton height={110} borderRadius={radii.xl} style={{ flex: 1 }} />
          <Skeleton height={110} borderRadius={radii.xl} style={{ flex: 1 }} />
        </View>
        <Skeleton height={140} borderRadius={radii.xxl} />
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
      {/* ── 1. Store Header & Greeting Hero Bento ── */}
      <View
        style={[
          styles.headerHeroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={[styles.headerStoreIdentity, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Store Logo Avatar */}
          <TouchableOpacity
            style={[
              styles.headerLogoAvatar,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50],
                borderColor: storeSettings?.logo ? colors.primary[400] : colors.border.default,
              },
            ]}
            onPress={() => navigation.navigate('More')}
            activeOpacity={0.75}
          >
            {storeSettings?.logo ? (
              <Image source={{ uri: storeSettings.logo }} style={styles.headerLogoImg} resizeMode="cover" />
            ) : (
              <Store size={22} color={colors.primary[600]} />
            )}
          </TouchableOpacity>

          <View style={[styles.headerGreetingCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.headerGreetingText, { color: colors.text.tertiary }]}>
              {greetingText}
            </Text>
            <Text style={[styles.headerStoreName, { color: colors.text.primary }]}>
              {storeSettings?.shop_name || storeSettings?.store_name || user?.name || 'AN POS'}
            </Text>
          </View>
        </View>

        {/* Header Action Buttons (Quick Scan & Reload) */}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50] }]}
            onPress={() => setShowScanner(true)}
            activeOpacity={0.75}
          >
            <ScanBarcode size={19} color={colors.primary[600]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
            onPress={onRefresh}
            activeOpacity={0.75}
          >
            <RefreshCw size={17} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. Active Cash Shift Live Status Banner ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.shiftHeroBanner,
          {
            backgroundColor: currentSession
              ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
              : (isDark ? colors.surfaceElevated : colors.surface),
            borderColor: currentSession
              ? (isDark ? colors.emerald[800] : colors.emerald[300])
              : (isDark ? colors.border.default : colors.slate[200]),
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => navigation.navigate('Cash')}
      >
        <View style={[styles.shiftHeroRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.shiftHeroIconBox,
              {
                backgroundColor: currentSession
                  ? (isDark ? 'rgba(16, 185, 129, 0.2)' : colors.emerald[100])
                  : (isDark ? 'rgba(239, 68, 68, 0.15)' : colors.danger.light),
                borderColor: currentSession
                  ? (isDark ? 'rgba(16, 185, 129, 0.3)' : colors.emerald[200])
                  : colors.danger.border,
              },
            ]}
          >
            {currentSession ? (
              <Wallet size={20} color={colors.emerald[700]} />
            ) : (
              <Lock size={19} color={colors.danger.main} />
            )}
          </View>

          <View style={[styles.shiftHeroInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.shiftHeroTitle, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {currentSession
                ? `${t('cash.currentShift')} #${currentSession.sessionNumber || (currentSession as any).number || 1}`
                : t('dashboard.closedShift')}
            </Text>
            <Text
              style={[styles.shiftHeroSub, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}
            >
              {currentSession
                ? `${t('pos.cashierDefault')}: ${currentSession.openedBy || (currentSession as any).opened_by || '—'}`
                : t('dashboard.openShiftSub')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Badge
            variant={currentSession ? 'emerald' : 'danger'}
            size="xs"
            dot={Boolean(currentSession)}
          >
            {currentSession ? t('pos.openShiftActive') : t('dashboard.openShiftCta')}
          </Badge>
          <ChevronIcon size={16} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>

      {/* ── 3. Today's Financial Summary Hero Bento ── */}
      <Card variant="elevated" style={styles.todayFinancialHeroCard}>
        <View style={[styles.todayFinancialHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.todayIconPill, { backgroundColor: colors.emerald[50] }]}>
              <TrendingUp size={16} color={colors.emerald[700]} />
            </View>
            <Text style={[styles.todayHeroLabel, { color: colors.text.secondary }]}>
              {t('dashboard.todaySales')}
            </Text>
          </View>

          <Badge variant="emerald" size="sm">
            {todaySales.length} {t('sales.sales')}
          </Badge>
        </View>

        <View style={[styles.todayRevenueRow, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[styles.todayRevenueValue, { color: colors.text.primary }]}>
              {todayRevenue.toLocaleString(localeStr)}
            </Text>
            <Text style={[styles.todayRevenueCurrency, { color: colors.primary[600] }]}>
              {currency}
            </Text>
          </View>
        </View>

        {/* 2-Mini Metric Grid inside Hero */}
        <View style={[styles.todayMiniMetricsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.todayMiniMetricItem, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50] }]}>
            <Text style={[styles.todayMiniMetricLabel, { color: colors.text.tertiary }]}>
              {t('dashboard.itemsSoldToday')}
            </Text>
            <Text style={[styles.todayMiniMetricVal, { color: colors.emerald[600] }]}>
              {todayItemsSold} <Text style={{ fontSize: 11, fontWeight: '600' }}>{t('sales.itemsCount')}</Text>
            </Text>
          </View>

          <View style={[styles.todayMiniMetricItem, { backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50] }]}>
            <Text style={[styles.todayMiniMetricLabel, { color: colors.text.tertiary }]}>
              {t('inventory.products')}
            </Text>
            <Text style={[styles.todayMiniMetricVal, { color: colors.primary[600] }]}>
              {products.length} <Text style={{ fontSize: 11, fontWeight: '600' }}>{t('common.total')}</Text>
            </Text>
          </View>
        </View>
      </Card>

      {/* ── 4. Low Stock Alert Banner (If items need reordering) ── */}
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
            <AlertCircle size={20} color={colors.danger.main} />
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

      {/* ── 5. Financial Liquidity & Commercial Balance Bento ── */}
      <Card variant="elevated" style={styles.financeCard}>
        <View style={[styles.financeHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Coins size={16} color={colors.primary[600]} />
            <Text style={[styles.financeTitle, { color: colors.text.primary }]}>
              {t('dashboard.netFinancialPosition')}
            </Text>
          </View>
          <Badge variant={netFinancialPosition >= 0 ? 'emerald' : 'danger'} size="xs">
            {netFinancialPosition >= 0 ? '+ متوازن' : '- التزام'}
          </Badge>
        </View>

        <View style={[styles.financialMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Customer Debts (أنا أطلب) */}
          <TouchableOpacity
            style={styles.financialMetricBox}
            onPress={() => navigation.navigate('Customers')}
            activeOpacity={0.75}
          >
            <View style={[styles.metricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ArrowDownLeft size={14} color={colors.emerald[600]} />
              <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
                {t('dashboard.customerDebts')}
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.emerald[600] }]}>
              +{totalCustomerDebt.toLocaleString(localeStr)}
            </Text>
            <Text style={[styles.metricSub, { color: colors.text.tertiary }]}>
              {customers.filter((c) => (c.balance || 0) > 0).length} {t('customers.title')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.metricDivider, { backgroundColor: colors.border.default }]} />

          {/* Supplier Debts (الموردين يطلبونا) */}
          <TouchableOpacity
            style={styles.financialMetricBox}
            onPress={() => navigation.navigate('Suppliers')}
            activeOpacity={0.75}
          >
            <View style={[styles.metricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ArrowUpRight size={14} color={colors.danger.main} />
              <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
                {t('dashboard.supplierDebts')}
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.danger.main }]}>
              -{totalSupplierDebt.toLocaleString(localeStr)}
            </Text>
            <Text style={[styles.metricSub, { color: colors.text.tertiary }]}>
              {suppliers.filter((s) => (s.balance || 0) > 0).length} {t('suppliers.title')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.netSummaryBox, { borderTopColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.netLabel, { color: colors.text.secondary }]}>
            {t('dashboard.netCumulative')}
          </Text>
          <Text
            style={[
              styles.netValue,
              netFinancialPosition >= 0 ? { color: colors.emerald[600] } : { color: colors.danger.main },
            ]}
          >
            {netFinancialPosition >= 0 ? '+' : ''}
            {netFinancialPosition.toLocaleString(localeStr)} {currency}
          </Text>
        </View>
      </Card>

      {/* ── 6. Categorized Operational Hub Sections ── */}
      <View style={styles.hubContainer}>
        {/* Hub Category 1: العمليات الأساسية والبيع */}
        <Text style={[styles.hubSectionTitle, { color: colors.text.primary, textAlign }]}>
          {t('dashboard.quickAccess')}
        </Text>

        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* POS */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('POS')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : colors.indigo[50] }]}>
              <Store size={22} color={colors.primary[600]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('pos.posTitle')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.posSub')}</Text>
          </TouchableOpacity>

          {/* Quick Scan */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => setShowScanner(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.emerald[50] }]}>
              <ScanBarcode size={22} color={colors.emerald[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('dashboard.quickSale')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.quickSaleSub')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Sales History */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('Sales')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primary[50] }]}>
              <Receipt size={22} color={colors.primary[600]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('sales.sales')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.salesSub')}</Text>
          </TouchableOpacity>

          {/* Purchases */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('PurchaseForm')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : colors.amber[50] }]}>
              <ShoppingCart size={22} color={colors.amber[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('suppliers.purchases')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.purchasesSub')}</Text>
          </TouchableOpacity>
        </View>

        {/* Hub Category 2: المخزون والمستودعات */}
        <Text style={[styles.hubSectionTitle, { color: colors.text.primary, textAlign, marginTop: spacing.md }]}>
          {t('dashboard.inventoryHub')}
        </Text>

        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Add Product */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('ProductForm')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.emerald[50] }]}>
              <Plus size={22} color={colors.emerald[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('inventory.addProduct')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('inventory.products')}</Text>
          </TouchableOpacity>

          {/* Inventory Count */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('InventoryCount')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.2)' : colors.purple[50] }]}>
              <ClipboardCheck size={22} color={colors.purple[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.inventoryCount')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('inventoryCount.title')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Stock Movements */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('StockMovements')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : colors.cyan[50] }]}>
              <History size={22} color={colors.cyan[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.stockMovements')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('stockMovements.title')}</Text>
          </TouchableOpacity>

          {/* Warehouses */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('Warehouses')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : colors.amber[50] }]}>
              <Warehouse size={22} color={colors.amber[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.warehouses')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('warehouses.title')}</Text>
          </TouchableOpacity>
        </View>

        {/* Hub Category 3: المالية والشركاء والأدوات الذكية */}
        <Text style={[styles.hubSectionTitle, { color: colors.text.primary, textAlign, marginTop: spacing.md }]}>
          {t('dashboard.financeHub')}
        </Text>

        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Customers */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('Customers')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: colors.primary[50] }]}>
              <Users size={22} color={colors.primary[600]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('customers.title')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.customersSub')}</Text>
          </TouchableOpacity>

          {/* Suppliers */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('Suppliers')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: colors.warning.light }]}>
              <Truck size={22} color={colors.warning.dark} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('suppliers.title')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.suppliersSub')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Operating Expenses */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('Expenses')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: colors.danger.light }]}>
              <Receipt size={22} color={colors.danger.main} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('dashboard.operatingExpenses')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.operatingExpensesSub')}</Text>
          </TouchableOpacity>

          {/* Profit Center */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('ProfitCenter')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: colors.emerald[50] }]}>
              <BarChart3 size={22} color={colors.emerald[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('profitCenter.title')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.profitCenterSub')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.hubGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Zakat Calculator */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('ZakatCalculator')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: colors.amber[50] }]}>
              <Calculator size={22} color={colors.amber[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('zakatCalculator.title')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.zakatSub')}</Text>
          </TouchableOpacity>

          {/* Barcode Labels */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
            onPress={() => navigation.navigate('BarcodeLabels')}
            activeOpacity={0.75}
          >
            <View style={[styles.hubIconBox, { backgroundColor: colors.purple[50] }]}>
              <Barcode size={22} color={colors.purple[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('barcodeLabels.title')}</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.barcodeLabelsSub')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 7. Today's Recent Sales Activity Feed ── */}
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
            <Receipt size={36} color={colors.text.tertiary} />
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

  // 1. Header Hero Card
  headerHeroCard: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    ...shadows.xs,
  },
  headerStoreIdentity: {
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  headerLogoAvatar: {
    width: 44,
    height: 44,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogoImg: {
    width: '100%',
    height: '100%',
  },
  headerGreetingCol: {
    gap: 1,
  },
  headerGreetingText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  headerStoreName: {
    fontSize: 15.5,
    fontWeight: '900',
    fontFamily: 'Cairo',
    letterSpacing: -0.2,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Active Shift Live Status Banner
  shiftHeroBanner: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    gap: spacing.sm,
    ...shadows.xs,
  },
  shiftHeroRight: {
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  shiftHeroIconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shiftHeroInfo: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  shiftHeroTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
    letterSpacing: -0.2,
  },
  shiftHeroSub: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
  },

  // 3. Today's Financial Summary Hero Card
  todayFinancialHeroCard: {
    padding: spacing.lg,
    borderRadius: radii.xxl,
    gap: spacing.md,
  },
  todayFinancialHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayIconPill: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayHeroLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  todayRevenueRow: {
    paddingVertical: spacing.xs,
  },
  todayRevenueValue: {
    fontSize: 34,
    fontWeight: '900',
    fontFamily: 'Cairo',
    letterSpacing: -0.8,
  },
  todayRevenueCurrency: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  todayMiniMetricsGrid: {
    gap: spacing.sm,
  },
  todayMiniMetricItem: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.xl,
    alignItems: 'center',
    gap: 2,
  },
  todayMiniMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  todayMiniMetricVal: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Cairo',
  },

  // 4. Low Stock Alert Banner
  lowStockBanner: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
  },
  lowStockIconBox: {
    width: 36,
    height: 36,
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
    fontSize: 11.5,
    fontFamily: 'Cairo',
  },

  // 5. Financial Liquidity & Commercial Balance
  financeCard: {
    padding: spacing.md,
    borderRadius: radii.xxl,
    gap: spacing.sm,
  },
  financeHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  financeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  financialMetricsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  financialMetricBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricLabelRow: {
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Cairo',
    marginVertical: 1,
  },
  metricSub: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
  },
  metricDivider: {
    width: 1,
    height: 40,
  },
  netSummaryBox: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  netValue: {
    fontSize: 14.5,
    fontWeight: '900',
    fontFamily: 'Cairo',
  },

  // 6. Hub Categories & Cards
  hubContainer: {
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  hubSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
    paddingHorizontal: 4,
    marginBottom: spacing.xs,
  },
  hubGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  hubCard: {
    flex: 1,
    borderRadius: radii.xxl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 110,
    ...shadows.xs,
  },
  hubIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
  },
  hubCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginBottom: 2,
  },
  hubCardSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // 7. Recent Sales Feed
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
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  emptySalesTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
    marginTop: spacing.xs,
  },
  emptySalesSub: {
    fontSize: 11.5,
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
});

export default DashboardScreen;
