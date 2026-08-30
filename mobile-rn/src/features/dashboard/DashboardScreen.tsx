import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
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
  FlaskConical,
  BarChart3,
  Barcode,
  Printer,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import CameraScanner from '@/features/barcode/CameraScanner';
import type { Product, Sale, Customer, Supplier, CashSession } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Skeleton } from '@/components/ui';

export const DashboardScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [allSalesCount, setAllSalesCount] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allProducts, allSales, allCustomers, allSuppliers, allSessions] = await Promise.all([
        db.products.toArray(),
        db.sales.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.cashSessions.toArray(),
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
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(false);
    await loadDashboardData();
  };

  const handleQuickScan = async (code: string, mode?: 'single' | 'multi') => {
    if (mode === 'single') {
      setShowScanner(false);
    }
    try {
      await ensureInit();
      const product = await db.products
        .filter((p: any) => p.barcode === code || p.sku === code)
        .first();

      if (product) {
        if (mode === 'single') {
          Alert.alert(
            `✓ ${product.name}`,
            `الباركود: ${code}\nالسعر: ${product.retailPrice || (product as any).retail_price || 0} دج\nالكمية المتوفرة: ${product.quantity || 0}`,
            [
              {
                text: 'إضافة للسلة والبيع',
                onPress: () => navigation.navigate('POS', { barcode: code }),
              },
              {
                text: 'تعديل المنتج',
                onPress: () => navigation.navigate('ProductForm', { id: product.id }),
              },
              { text: 'إغلاق', style: 'cancel' },
            ]
          );
        }
      } else {
        if (mode === 'single') {
          Alert.alert(
            'منتج غير مسجل',
            `الباركود ${code} غير موجود في المخزون. هل ترغب في إضافته كمنتج جديد؟`,
            [
              {
                text: 'إضافة منتج جديد',
                onPress: () => navigation.navigate('ProductForm', { barcode: code }),
              },
              { text: 'إلغاء', style: 'cancel' },
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
      const foundCount = codes.filter((c) =>
        allProds.some((p: any) => p.barcode === c || p.sku === c)
      ).length;

      Alert.alert(
        '✓ اكتمل المسح المتعدد',
        `تم مسح ${codes.length} باركود بنجاح (${foundCount} صنف مسجل في المخزون).`,
        [
          {
            text: 'فتح نقطة البيع (POS)',
            onPress: () => navigation.navigate('POS', { initialCodes: codes }),
          },
          { text: 'إغلاق', style: 'cancel' },
        ]
      );
    } catch (e) {
      console.error('Batch complete error', e);
    }
  };

  const todayRevenue = (todaySales || []).reduce((sum, s: any) => {
    if (!s) return sum;
    const total = Number(s.total || s.total_amount || 0);
    if (s.type === 'return') return sum - total;
    return sum + total;
  }, 0);

  const todayItemsSold = (todaySales || []).reduce((sum, s: any) => {
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

  const lowStockCount = products.filter(
    (p) => (p.quantity || 0) <= (p.lowStockThreshold || (p as any).low_stock_threshold || 5)
  ).length;

  const totalCustomerDebt = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance || 0), 0);
  const netFinancialPosition = totalCustomerDebt - totalSupplierDebt;

  if (loading && !refreshing) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Skeleton height={68} borderRadius={radii.xxl} />
        <View style={styles.hubGrid}>
          <Skeleton height={120} borderRadius={radii.xl} style={{ flex: 1 }} />
          <Skeleton height={120} borderRadius={radii.xl} style={{ flex: 1 }} />
        </View>
        <View style={styles.hubGrid}>
          <Skeleton height={120} borderRadius={radii.xl} style={{ flex: 1 }} />
          <Skeleton height={120} borderRadius={radii.xl} style={{ flex: 1 }} />
        </View>
        <Skeleton height={110} borderRadius={radii.lg} />
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
      {/* ── Top Quota / Upgrade Banner ── */}
      <View
        style={[
          styles.planBanner,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.upgradeBtn, { backgroundColor: colors.primary[600] }]}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'الترقية إلى النسخة الكاملة',
              'احصل على وصول غير محدود للفواتير، الزبائن، تقارير الأرباح المتقدمة، والمزامنة السحابية غير المحدودة.',
              [{ text: 'حسناً' }]
            );
          }}
        >
          <ArrowLeft size={13} color="#fff" />
          <Text style={styles.upgradeBtnText}>ترقية</Text>
        </TouchableOpacity>

        <View style={styles.planInfo}>
          <View style={styles.planTitleRow}>
            <Text style={[styles.planTitle, { color: colors.text.primary }]}>
              نسخة مجانية – احصل على الكاملة
            </Text>
            <View style={[styles.planIconBox, { backgroundColor: colors.primary[50] }]}>
              <FlaskConical size={14} color={colors.primary[600]} />
            </View>
          </View>
          <Text style={[styles.planUsage, { color: colors.text.tertiary }]}>
            {allSalesCount}/50 فاتورة  •  {customers.length}/10 زبون
          </Text>
        </View>
      </View>

      {/* ── Main Hub Sections (الأقسام) ── */}
      <View style={styles.hubSection}>
        <Text style={[styles.hubHeading, { color: colors.text.primary }]}>الأقسام</Text>

        <View style={styles.hubGrid}>
          {/* 1. بيع سريع (Quick Sale / Scanner) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => setShowScanner(true)}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#064e3b' : colors.emerald[50] },
              ]}
            >
              <ScanBarcode size={22} color={isDark ? '#34d399' : colors.emerald[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>بيع سريع</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>افتح الماسح فوراً</Text>
          </TouchableOpacity>

          {/* 2. المبيعات (Sales) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Sales')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#1e3a8a' : colors.primary[50] },
              ]}
            >
              <Receipt size={22} color={isDark ? '#60a5fa' : colors.primary[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>المبيعات</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>سجل الفواتير</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hubGrid}>
          {/* 3. المشتريات (Purchases) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('PurchaseForm')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#134e4a' : colors.indigo[50] },
              ]}
            >
              <ShoppingCart size={22} color={isDark ? '#2dd4bf' : colors.indigo[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>المشتريات</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>فواتير شراء</Text>
          </TouchableOpacity>

          {/* 4. الفاتورة المبدئية (Proforma / Quotes) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Sales')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#0c4a6e' : colors.primary[50] },
              ]}
            >
              <FileText size={22} color={isDark ? '#38bdf8' : colors.primary[600]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>الفاتورة المبدئية</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>عروض الأسعار والمسودات</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hubGrid}>
          {/* 5. مصاريف التشغيل (Operating Expenses) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Expenses')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#78350f' : colors.warning.light },
              ]}
            >
              <Receipt size={22} color={isDark ? '#fbbf24' : colors.warning.dark} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>مصاريف التشغيل</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>إيجار، رواتب، فواتير</Text>
          </TouchableOpacity>

          {/* 6. البيع (POS / Point of Sale) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('POS')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#312e81' : colors.purple[50] },
              ]}
            >
              <Store size={22} color={isDark ? '#818cf8' : colors.purple[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>البيع</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>افتح نقطة البيع</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hubGrid}>
          {/* 7. الموردين (Suppliers) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Suppliers')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#7c2d12' : colors.warning.light },
              ]}
            >
              <Truck size={22} color={isDark ? '#fb923c' : colors.warning.dark} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>الموردين</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>إدارة الشركاء</Text>
          </TouchableOpacity>

          {/* 8. العملاء (Customers) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Customers')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#1e3a8a' : colors.primary[50] },
              ]}
            >
              <Users size={22} color={isDark ? '#60a5fa' : colors.primary[600]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>العملاء</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>قاعدة الزبائن</Text>
          </TouchableOpacity>
        </View>

        {/* Row 5: مركز الأرباح & حاسبة الزكاة */}
        <View style={styles.hubGrid}>
          {/* 9. مركز الأرباح وهوامش الربح (Profit Center) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ProfitCenter')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#064e3b' : colors.emerald[50] },
              ]}
            >
              <BarChart3 size={22} color={isDark ? '#34d399' : colors.emerald[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>مركز الأرباح</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>هوامش وتكلفة وأرباح</Text>
          </TouchableOpacity>

          {/* 10. حاسبة الزكاة الشرعية (Zakat Calculator) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ZakatCalculator')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#451a03' : colors.amber[50] },
              ]}
            >
              <Calculator size={22} color={isDark ? '#fbbf24' : colors.amber[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>حاسبة الزكاة</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>عروض التجارة والسيولة</Text>
          </TouchableOpacity>
        </View>

        {/* Row 6: طباعة الباركود & قوالب الطباعة */}
        <View style={styles.hubGrid}>
          {/* 11. طباعة ملصقات الباركود والأسعار (Barcode Labels) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('BarcodeLabels')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#2e1065' : colors.purple[50] },
              ]}
            >
              <Barcode size={22} color={isDark ? '#c084fc' : colors.purple[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>طباعة الباركود</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>ملصقات الأسعار والـ QR</Text>
          </TouchableOpacity>

          {/* 12. قوالب الطباعة وتخصيص الفواتير (Print Templates) */}
          <TouchableOpacity
            style={[
              styles.hubCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('PrintTemplates')}
          >
            <View
              style={[
                styles.hubIconBox,
                { backgroundColor: isDark ? '#083344' : colors.cyan[50] },
              ]}
            >
              <Printer size={22} color={isDark ? '#22d3ee' : colors.cyan[700]} />
            </View>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>قوالب الطباعة</Text>
            <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>تخصيص نماذج الفواتير</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Shift / Cash Register Status ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.shiftCard,
          { backgroundColor: colors.surface, borderColor: colors.border.default },
          currentSession
            ? { borderColor: colors.success.main }
            : { borderColor: colors.danger.main },
        ]}
        onPress={() => navigation.navigate('Cash')}
      >
        <View style={styles.shiftLeft}>
          <Badge
            variant={currentSession ? 'success' : 'danger'}
            size="sm"
            style={styles.shiftBadge}
          >
            {currentSession ? 'مناوبة نشطة' : 'الصندوق مقفل'}
          </Badge>
          <ChevronLeft
            size={16}
            color={currentSession ? colors.success.text : colors.danger.text}
          />
        </View>

        <View style={styles.shiftRight}>
          <View
            style={[
              styles.shiftIconBox,
              {
                backgroundColor: currentSession ? colors.success.light : colors.danger.light,
                borderColor: currentSession ? colors.success.border : colors.danger.border,
              },
            ]}
          >
            <Wallet
              size={18}
              color={currentSession ? colors.success.main : colors.danger.main}
            />
          </View>
          <View style={styles.shiftTextCol}>
            <Text style={[styles.shiftTitle, { color: colors.text.primary }]}>
              {currentSession
                ? `مناوبة مفتوحة #${currentSession.sessionNumber || (currentSession as any).number || 1}`
                : 'فتح الصندوق وبدء الوردية'}
            </Text>
            <Text style={[styles.shiftSub, { color: colors.text.secondary }]}>
              {currentSession
                ? `المسؤول: ${currentSession.openedBy || (currentSession as any).opened_by || 'الكاشير'}`
                : 'اضغط هنا لفتح مناوبة جديدة وتحديد الرصيد الافتتاحي'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── KPI Cards Grid ── */}
      <View style={styles.grid2}>
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: colors.primary[50] }]}>
              <ShoppingCart size={18} color={colors.primary[600]} />
            </View>
            <Badge variant="primary" size="sm">
              {todaySales.length} مبيعات
            </Badge>
          </View>
          <Text style={[styles.kpiLabel, { color: colors.text.secondary }]}>مبيعات اليوم</Text>
          <Text style={[styles.kpiValue, { color: colors.primary[600] }]}>
            {todayRevenue.toLocaleString('ar-DZ')} <Text style={styles.currency}>دج</Text>
          </Text>
          <Text style={[styles.kpiHelper, { color: colors.text.tertiary }]}>إجمالي التحصيل اليومي</Text>
        </Card>

        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: colors.success.light }]}>
              <Package size={18} color={colors.success.main} />
            </View>
            <Badge variant="success" size="sm">
              {products.length} صنف
            </Badge>
          </View>
          <Text style={[styles.kpiLabel, { color: colors.text.secondary }]}>قطع مباعة اليوم</Text>
          <Text style={[styles.kpiValue, { color: colors.success.text }]}>
            {todayItemsSold} <Text style={styles.currency}>قطعة</Text>
          </Text>
          <Text style={[styles.kpiHelper, { color: colors.text.tertiary }]}>حجم المنتجات الخارجة</Text>
        </Card>
      </View>

      {/* ── Financial Liquidity & Credit Balance Card ── */}
      <Card variant="elevated">
        <CardHeader>
          <Badge variant={netFinancialPosition >= 0 ? 'success' : 'warning'} size="sm">
            {netFinancialPosition >= 0 ? 'فائض مالي' : 'مستحقات مستحقة'}
          </Badge>
          <CardTitle>المركز المالي الصافي والكريدي</CardTitle>
        </CardHeader>

        <CardContent>
          <View style={styles.financialMetricsRow}>
            <View style={styles.financialMetric}>
              <View style={styles.metricLabelRow}>
                <ArrowDownLeft size={14} color={colors.success.main} />
                <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>ديون الزبائن (لنا)</Text>
              </View>
              <Text style={[styles.metricValue, { color: colors.success.text }]}>
                {totalCustomerDebt.toLocaleString('ar-DZ')} دج
              </Text>
              <Text style={[styles.metricSub, { color: colors.text.tertiary }]}>
                {customers.filter((c) => (c.balance || 0) > 0).length} زبائن عليهم ديون
              </Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.border.default }]} />

            <View style={styles.financialMetric}>
              <View style={styles.metricLabelRow}>
                <ArrowUpRight size={14} color={colors.danger.main} />
                <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>ديون الموردين (علينا)</Text>
              </View>
              <Text style={[styles.metricValue, { color: colors.danger.text }]}>
                {totalSupplierDebt.toLocaleString('ar-DZ')} دج
              </Text>
              <Text style={[styles.metricSub, { color: colors.text.tertiary }]}>
                {suppliers.filter((s) => (s.balance || 0) > 0).length} موردين قيد السداد
              </Text>
            </View>
          </View>

          <View style={[styles.netSummaryBox, { borderTopColor: colors.border.default }]}>
            <Text
              style={[
                styles.netValue,
                netFinancialPosition >= 0
                  ? { color: colors.success.text }
                  : { color: colors.danger.text },
              ]}
            >
              {Math.abs(netFinancialPosition).toLocaleString('ar-DZ')} دج
            </Text>
            <Text style={[styles.netLabel, { color: colors.text.primary }]}>الصافي التجاري التراكمي:</Text>
          </View>
        </CardContent>
      </Card>

      {/* ── Quick Tools Grid ── */}
      <View style={styles.grid3}>
        <TouchableOpacity
          style={[
            styles.toolButton,
            { backgroundColor: colors.surface, borderColor: colors.border.default },
          ]}
          onPress={() => navigation.navigate('ProfitCenter')}
          activeOpacity={0.75}
        >
          <View style={[styles.toolIcon, { backgroundColor: colors.emerald[50] }]}>
            <TrendingUp size={16} color={colors.emerald[700]} />
          </View>
          <Text style={[styles.toolText, { color: colors.text.primary }]}>الأرباح</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolButton,
            { backgroundColor: colors.surface, borderColor: colors.border.default },
          ]}
          onPress={() => navigation.navigate('ZakatCalculator')}
          activeOpacity={0.75}
        >
          <View style={[styles.toolIcon, { backgroundColor: colors.purple[50] }]}>
            <Calculator size={16} color={colors.purple[700]} />
          </View>
          <Text style={[styles.toolText, { color: colors.text.primary }]}>الزكاة</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toolButton,
            { backgroundColor: colors.surface, borderColor: colors.border.default },
          ]}
          onPress={() => navigation.navigate('Customers')}
          activeOpacity={0.75}
        >
          <View style={[styles.toolIcon, { backgroundColor: colors.primary[50] }]}>
            <Users size={16} color={colors.primary[700]} />
          </View>
          <Text style={[styles.toolText, { color: colors.text.primary }]}>الزبائن</Text>
        </TouchableOpacity>
      </View>

      {/* ── Low Stock Alert ── */}
      {lowStockCount > 0 ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.alertCard,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : colors.danger.light,
              borderColor: colors.danger.border,
            },
          ]}
          onPress={() => navigation.navigate('Inventory')}
        >
          <ChevronLeft size={18} color={colors.danger.main} />
          <View style={styles.alertTextContent}>
            <Text style={[styles.alertHeading, { color: colors.danger.main }]}>تنبيه نواقص المخزون!</Text>
            <Text style={[styles.alertDescription, { color: colors.text.secondary }]}>
              يوجد {lowStockCount} منتج وصل لحد الطلب الأدنى أو قارب على النفاد
            </Text>
          </View>
          <View
            style={[
              styles.alertIconWrapper,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.25)' : colors.danger.light },
            ]}
          >
            <AlertCircle size={20} color={colors.danger.main} />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* ── Recent Sales Activity ── */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Sales')}
            style={styles.seeAllBtn}
          >
            <Text style={[styles.seeAllText, { color: colors.primary[600] }]}>عرض السجل الكامل</Text>
            <ChevronLeft size={14} color={colors.primary[600]} />
          </TouchableOpacity>
          <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>آخر مبيعات اليوم</Text>
        </View>

        {todaySales.length === 0 ? (
          <Card
            style={[
              styles.emptySalesCard,
              { backgroundColor: colors.surface, borderColor: colors.border.default },
            ]}
          >
            <Receipt size={32} color={colors.slate[400]} />
            <Text style={[styles.emptySalesTitle, { color: colors.text.secondary }]}>
              لم تسجل أي مبيعات اليوم حتى الآن
            </Text>
            <Text style={[styles.emptySalesSub, { color: colors.text.tertiary }]}>
              ابدأ بالبيع عبر شاشة الكاشير (POS)
            </Text>
          </Card>
        ) : (
          <View style={styles.salesList}>
            {todaySales.slice(0, 5).map((sale) => {
              const isReturn = sale.type === 'return';
              const formattedTime = new Date(
                sale.date || sale.createdAt || ''
              ).toLocaleTimeString('ar-DZ', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <TouchableOpacity
                  key={sale.id}
                  activeOpacity={0.7}
                  style={[
                    styles.saleItemRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border.default,
                    },
                  ]}
                  onPress={() =>
                    navigation.navigate('InvoiceDetail', { saleId: sale.id, sale })
                  }
                >
                  <View style={styles.saleLeftCol}>
                    <Text
                      style={[
                        styles.saleTotal,
                        isReturn
                          ? { color: colors.danger.text }
                          : { color: colors.text.primary },
                      ]}
                    >
                      {(sale.total || 0).toLocaleString('ar-DZ')} دج
                    </Text>
                    <Badge
                      variant={
                        isReturn
                          ? 'danger'
                          : (sale.paymentMethod as string) === 'credit'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {isReturn
                        ? 'مرتجع'
                        : (sale.paymentMethod as string) === 'credit'
                        ? 'كريدي'
                        : (sale.paymentMethod as string) === 'card'
                        ? 'بطاقة'
                        : 'نقداً'}
                    </Badge>
                  </View>

                  <View style={styles.saleRightCol}>
                    <Text style={[styles.saleNumber, { color: colors.text.primary }]}>
                      فاتورة #{sale.number || '0000'}
                    </Text>
                    <View style={styles.saleMetaRow}>
                      <Clock size={12} color={colors.slate[400]} />
                      <Text style={[styles.saleMetaText, { color: colors.text.tertiary }]}>
                        {formattedTime}
                      </Text>
                      <Text style={[styles.saleMetaDot, { color: colors.text.tertiary }]}>•</Text>
                      <Text style={[styles.saleCustomerName, { color: colors.text.secondary }]}>
                        {sale.customerName || 'زبون عام'}
                      </Text>
                    </View>
                  </View>

                  <ChevronLeft size={16} color={colors.slate[400]} style={styles.chevron} />
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
    paddingBottom: spacing.xxxl,
  },

  // ── Plan / Upgrade Banner ──
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    ...shadows.xs,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },
  planInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planIconBox: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  planUsage: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  // ── Hub Sections (الأقسام) ──
  hubSection: {
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  hubHeading: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Cairo',
    textAlign: 'right',
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
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
    minHeight: 116,
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
    fontSize: 15,
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

  // ── Shift Card ──
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.xs,
  },
  shiftLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shiftBadge: {
    paddingHorizontal: spacing.sm,
  },
  shiftRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shiftIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shiftTextCol: {
    alignItems: 'flex-end',
  },
  shiftTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  shiftSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
    textAlign: 'right',
  },

  // ── Grids ──
  grid2: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  grid3: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // ── KPI Cards ──
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'flex-end',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xs,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 12,
    fontFamily: 'Cairo',
    marginTop: spacing.xs,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Cairo',
    marginVertical: 1,
  },
  currency: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiHelper: {
    fontSize: 10,
    fontFamily: 'Cairo',
  },

  // ── Financial Metrics ──
  financialMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  financialMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Cairo',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    fontFamily: 'Cairo',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 48,
  },
  netSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  netValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  // ── Quick Tools ──
  toolButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    ...shadows.xs,
  },
  toolIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // ── Alert Card ──
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
  },
  alertTextContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  alertHeading: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  alertDescription: {
    fontSize: 11,
    fontFamily: 'Cairo',
    marginTop: 2,
    textAlign: 'right',
  },
  alertIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Recent Sales ──
  sectionContainer: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
    borderWidth: 1,
  },
  emptySalesTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
    marginTop: spacing.xs,
  },
  emptySalesSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  salesList: {
    gap: spacing.xs,
  },
  saleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
  },
  saleLeftCol: {
    alignItems: 'flex-start',
    gap: 3,
  },
  saleTotal: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  saleRightCol: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  saleNumber: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  saleMetaRow: {
    flexDirection: 'row',
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
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  chevron: {
    marginLeft: 4,
  },
});

export default DashboardScreen;
