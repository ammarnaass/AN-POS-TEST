import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { AppImages } from '@/assets';
import {
  Settings,
  Store,
  Wifi,
  RefreshCw,
  LogOut,
  ChevronLeft,
  Check,
  X,
  Printer,
  Shield,
  BarChart3,
  Database,
  Truck,
  DollarSign,
  Layers,
  Tag,
  Users,
  HardDrive,
  Barcode,
  Calculator,
  Wallet,
  TrendingDown,
  FileText,
  Sun,
  Moon,
  Smartphone,
  Warehouse,
  ClipboardCheck,
  History,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { session } from '@/lib/apiClient';
import { db, ensureInit } from '@/lib/db';
import { useSyncEngine } from '@/lib/syncEngine';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';
import { useTheme, type ThemeMode } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, LanguageSelectorGrid } from '@/components/ui';
import {
  getStoreSettings,
  fetchStoreSettingsFromDesktop,
  saveStoreSettings,
  type StoreSettings,
} from '@/lib/settingService';

export const MoreScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const sync = useSyncEngine();
  const { mode, isDark, colors, setMode } = useTheme();
  const { t } = useI18n();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [storeData, setStoreData] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [appMode, setAppMode] = useState<'standalone' | 'connected'>('standalone');
  const [serverUrlDisplay, setServerUrlDisplay] = useState<string>('—');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings(forceRefresh = false) {
    if (forceRefresh) setFetchingRemote(true);
    else setLoading(true);

    try {
      await ensureInit();
      const smode = await getStoredMode();
      setAppMode(smode);

      const url = await session.getServerUrlDisplay();
      setServerUrlDisplay(url || '—');

      // Fetch store settings (handles connected desktop fetch + SQLite fallback)
      const st = await getStoreSettings(forceRefresh || smode === 'connected');
      setStoreData(st);

      const map: Record<string, string> = {
        store_name: st.shop_name,
        shop_name: st.shop_name,
        store_address: st.address,
        address: st.address,
        store_phone: st.phone,
        phone: st.phone,
        store_email: st.email,
        email: st.email,
        commercial_register: st.commercial_register || '',
        company_rc: st.commercial_register || '',
        tax_number: st.tax_number || '',
        company_nif: st.tax_number || '',
        tva_rate: String(st.tva_rate),
        currency: st.base_currency,
        base_currency: st.base_currency,
        receipt_footer: st.receipt_footer,
        invoice_prefix: st.invoice_prefix,
      };
      setSettings(map);
      setForm({ ...map });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setFetchingRemote(false);
    }
  }

  const handleFetchFromDesktop = async () => {
    setFetchingRemote(true);
    try {
      const res = await fetchStoreSettingsFromDesktop();
      if (res.success && res.settings) {
        setStoreData(res.settings);
        const map: Record<string, string> = {
          store_name: res.settings.shop_name,
          shop_name: res.settings.shop_name,
          store_address: res.settings.address,
          address: res.settings.address,
          store_phone: res.settings.phone,
          phone: res.settings.phone,
          store_email: res.settings.email,
          email: res.settings.email,
          commercial_register: res.settings.commercial_register || '',
          company_rc: res.settings.commercial_register || '',
          tax_number: res.settings.tax_number || '',
          company_nif: res.settings.tax_number || '',
          tva_rate: String(res.settings.tva_rate),
          currency: res.settings.base_currency,
          base_currency: res.settings.base_currency,
          receipt_footer: res.settings.receipt_footer,
          invoice_prefix: res.settings.invoice_prefix,
        };
        setSettings(map);
        setForm({ ...map });
        Alert.alert('✓ تم التحديث', 'تم جلب بيانات وإعدادات المحل بنجاح من تطبيق سطح المكتب');
      } else {
        Alert.alert('تنبيه', res.error || 'تعذر الاتصال بسطح المكتب، تم استخدام الإعدادات المخزنة محلياً');
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل جلب الإعدادات من سطح المكتب');
    } finally {
      setFetchingRemote(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const patch = {
        shop_name: form.store_name || form.shop_name,
        store_name: form.store_name || form.shop_name,
        address: form.store_address || form.address,
        store_address: form.store_address || form.address,
        phone: form.store_phone || form.phone,
        store_phone: form.store_phone || form.phone,
        email: form.store_email || form.email,
        store_email: form.store_email || form.email,
        commercial_register: form.commercial_register || form.company_rc,
        tax_number: form.tax_number || form.company_nif,
        tva_rate: parseFloat(form.tva_rate || '0'),
        base_currency: form.currency || form.base_currency,
        currency: form.currency || form.base_currency,
        receipt_footer: form.receipt_footer,
        invoice_prefix: form.invoice_prefix || 'INV-',
      };

      const result = await saveStoreSettings(patch);
      if (result.success) {
        setSettings({ ...form });
        setEditMode(false);
        Alert.alert('✓ تم الحفظ', appMode === 'connected' ? 'تم حفظ الإعدادات ومزامنتها مع الحاسوب بنجاح' : 'تم حفظ الإعدادات محلياً بنجاح');
      } else {
        Alert.alert('خطأ', result.error || 'فشل حفظ الإعدادات');
      }
    } catch {
      Alert.alert('خطأ', 'فشل حفظ الإعدادات');
    }
    setSaving(false);
  };

  const handleSync = async () => {
    if (appMode !== 'connected') {
      Alert.alert('الوضع المستقل', 'المزامنة متاحة فقط في وضع الاتصال بالحاسوب');
      return;
    }
    await sync.pullUpdates();
    await sync.processQueue();
    await loadSettings(true);
    Alert.alert(
      'تمت المزامنة',
      `آخر مزامنة: ${sync.lastSyncTime ? new Date(sync.lastSyncTime).toLocaleTimeString('ar') : '—'}`
    );
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation?.replace('Login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* User Card */}
      <Card variant="elevated" style={styles.userCard}>
        <View
          style={[
            styles.userAvatar,
            {
              backgroundColor: colors.primary[50],
              borderColor: colors.primary[200],
            },
          ]}
        >
          <Text style={[styles.userAvatarText, { color: colors.primary[700] }]}>
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[styles.userName, { color: colors.text.primary }]}>{user?.name || 'المستخدم'}</Text>
          <Badge
            variant={user?.role === 'admin' ? 'purple' : 'primary'}
            size="xs"
            style={{ marginTop: 2 }}
          >
            {user?.role === 'admin'
              ? `👑 ${t('auth.admin')}`
              : user?.role === 'cashier'
              ? `🏪 ${t('auth.cashier')}`
              : `🛒 ${t('auth.seller')}`}
          </Badge>
        </View>
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : colors.danger.light,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color={colors.danger.main} />
        </TouchableOpacity>
      </Card>

      {/* Language Selection Section */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('settings.language')}</Text>
      <LanguageSelectorGrid style={{ marginBottom: spacing.sm }} />

      {/* Theme Selection Section */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('settings.themeMode')}</Text>
      <View style={styles.themeSelectorGrid}>
        <TouchableOpacity
          style={[
            styles.themeOptionCard,
            {
              backgroundColor: colors.surface,
              borderColor: mode === 'light' ? colors.primary[600] : colors.border.default,
            },
            mode === 'light' && { borderWidth: 2, backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50] },
          ]}
          onPress={() => setMode('light')}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.themeOptionIconBox,
              { backgroundColor: mode === 'light' ? colors.warning.main : colors.warning.light },
            ]}
          >
            <Sun size={20} color={mode === 'light' ? '#fff' : colors.warning.dark} />
          </View>
          <Text style={[styles.themeOptionTitle, { color: colors.text.primary }]}>{t('settings.lightMode')}</Text>
          <Text style={[styles.themeOptionSub, { color: colors.text.tertiary }]}>{t('settings.lightModeSub')}</Text>
          {mode === 'light' && (
            <View style={[styles.themeCheckBadge, { backgroundColor: colors.primary[600] }]}>
              <Check size={12} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeOptionCard,
            {
              backgroundColor: colors.surface,
              borderColor: mode === 'dark' ? colors.primary[600] : colors.border.default,
            },
            mode === 'dark' && { borderWidth: 2, backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50] },
          ]}
          onPress={() => setMode('dark')}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.themeOptionIconBox,
              { backgroundColor: mode === 'dark' ? colors.purple[600] : colors.purple[50] },
            ]}
          >
            <Moon size={20} color={mode === 'dark' ? '#fff' : colors.purple[700]} />
          </View>
          <Text style={[styles.themeOptionTitle, { color: colors.text.primary }]}>{t('settings.darkMode')}</Text>
          <Text style={[styles.themeOptionSub, { color: colors.text.tertiary }]}>{t('settings.darkModeSub')}</Text>
          {mode === 'dark' && (
            <View style={[styles.themeCheckBadge, { backgroundColor: colors.primary[600] }]}>
              <Check size={12} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeOptionCard,
            {
              backgroundColor: colors.surface,
              borderColor: mode === 'system' ? colors.primary[600] : colors.border.default,
            },
            mode === 'system' && { borderWidth: 2, backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50] },
          ]}
          onPress={() => setMode('system')}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.themeOptionIconBox,
              { backgroundColor: mode === 'system' ? colors.primary[600] : colors.primary[50] },
            ]}
          >
            <Smartphone size={20} color={mode === 'system' ? '#fff' : colors.primary[700]} />
          </View>
          <Text style={[styles.themeOptionTitle, { color: colors.text.primary }]}>{t('settings.systemTheme')}</Text>
          <Text style={[styles.themeOptionSub, { color: colors.text.tertiary }]}>{t('settings.systemThemeSub')}</Text>
          {mode === 'system' && (
            <View style={[styles.themeCheckBadge, { backgroundColor: colors.primary[600] }]}>
              <Check size={12} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Operations Modules Hub */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('settings.operationsHub')}</Text>
      <View style={styles.hubGrid}>
        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Suppliers')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.warning.light }]}>
            <Truck size={20} color={colors.warning.dark} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>الموردون والمشتريات</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>فواتير الشراء وديون الموردين</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Cash')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.emerald[50] }]}>
            <Wallet size={20} color={colors.emerald[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>الصندوق والمناوبات</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>فتح وإغلاق اليومية ورأس المال</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Expenses')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.danger.light }]}>
            <TrendingDown size={20} color={colors.danger.main} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>إدارة المصاريف</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>المصروفات اليومية والشهرية</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Categories')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.indigo[50] }]}>
            <Tag size={20} color={colors.indigo[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>أقسام وفئات المنتجات</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>تنظيم العائلات والتصنيفات</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Promotions')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.purple[50] }]}>
            <Layers size={20} color={colors.purple[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>العروض والباقات</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>التخفيضات المجدولة والحزم</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('DeliveryOrders')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.primary[50] }]}>
            <Store size={20} color={colors.primary[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>طلبات التوصيل</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>متابعة الديليفري والسائقين</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Warehouses')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.primary[100] }]}>
            <Warehouse size={20} color={colors.primary[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>المستودعات والتحويل</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>إدارة الفروع ونقاط التخزين</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('InventoryCount')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.success.light }]}>
            <ClipboardCheck size={20} color={colors.success.dark} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>الجرد الفعلي</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>جلسات التدقيق ورصد الفروقات</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('StockMovements')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.warning.light }]}>
            <History size={20} color={colors.warning.dark} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>حركات المخزون</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>سجل الإدخال والإخراج والتحويل</Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Reports & Tools */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>التحليلات المتقدمة والأدوات</Text>
      <Card style={styles.sectionMenu}>
        <MenuItem
          icon={<BarChart3 size={18} color={colors.primary[600]} />}
          title="مركز الأرباح وهوامش الربح"
          subtitle="تحليل تكلفة البضاعة والمصاريف والأرباح الصافية"
          onPress={() => navigation.navigate('ProfitCenter')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<Calculator size={18} color={colors.emerald[700]} />}
          title="حاسبة الزكاة الشرعية"
          subtitle="حساب زكاة عروض التجارة والسيولة النقدية"
          onPress={() => navigation.navigate('ZakatCalculator')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<FileText size={18} color={colors.primary[600]} />}
          title="قوالب الطباعة وتخصيص الفواتير"
          subtitle="محرر القوالب، النماذج الجاهزة، وتعيينات المستندات"
          onPress={() => navigation.navigate('PrintTemplates')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<Printer size={18} color={colors.indigo[600]} />}
          title="إعدادات الطابعات الحرارية"
          subtitle="طابعات البلوتوث والشبكة والـ USB واختبار الطباعة"
          onPress={() => navigation.navigate('PrinterSettings')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<Barcode size={18} color={colors.purple[600]} />}
          title="طباعة ملصقات الباركود والأسعار"
          subtitle="10 مقاسات ملصقات، 6 صيغ باركود وQR مع التوليد التلقائي"
          onPress={() => navigation.navigate('BarcodeLabels')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<Users size={18} color={colors.warning.dark} />}
          title="المستخدمون والصلاحيات"
          subtitle="حسابات البائعين ورموز PIN والأدوار"
          onPress={() => navigation.navigate('Users')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<Store size={18} color={colors.primary[600]} />}
          title="بيانات وإعدادات المحل والضرائب"
          subtitle="سحب البيانات الكاملة من الحاسوب، السجل التجاري، NIF، وTVA"
          onPress={() => navigation.navigate('StoreSettings')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<HardDrive size={18} color={colors.slate[600]} />}
          title="النسخ الاحتياطي واستعادة البيانات"
          subtitle="تصدير واستيراد قواعد البيانات بصيغة JSON"
          onPress={() => navigation.navigate('BackupRestore')}
          colors={colors}
        />
      </Card>

      {/* Connection Status */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>حالة الاتصال والشبكة</Text>
      <Card style={styles.sectionCard}>
        <View style={styles.statusRow}>
          {appMode === 'connected' ? (
            <Wifi size={20} color={colors.emerald[600]} />
          ) : (
            <Database size={20} color={colors.slate[400]} />
          )}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[styles.statusTitle, { color: colors.text.primary }]}>
              {appMode === 'connected' ? 'متصل بالحاسوب الرئيسي' : 'وضع محلي مستقل (Offline)'}
            </Text>
            {appMode === 'connected' && (
              <Text style={[styles.statusSub, { color: colors.text.tertiary }]}>{serverUrlDisplay}</Text>
            )}
          </View>
          <Badge variant={appMode === 'connected' ? 'emerald' : 'neutral'} size="xs" dot>
            {appMode === 'connected' ? 'متصل' : 'مستقل'}
          </Badge>
        </View>

        {appMode === 'connected' && (
          <View style={[styles.syncRow, { borderTopColor: colors.border.subtle }]}>
            <View>
              <Text style={[styles.syncLabel, { color: colors.text.secondary }]}>المعلقة: {sync.pendingCount}</Text>
              <Text style={[styles.syncLabel, { color: colors.text.secondary }]}>الفاشلة: {sync.failedCount}</Text>
            </View>
            <Button
              title="مزامنة الآن"
              variant="primary"
              size="sm"
              loading={sync.isSyncing}
              icon={<RefreshCw size={14} color="#fff" />}
              onPress={handleSync}
            />
          </View>
        )}
      </Card>

      {/* Store Settings */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary, marginBottom: 0 }]}>بيانات وإعدادات المحل</Text>
          {appMode === 'connected' && (
            <Badge variant="success" size="xs">من سطح المكتب</Badge>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {appMode === 'connected' && !editMode && (
            <TouchableOpacity
              style={[styles.fetchDesktopBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50], borderColor: colors.primary[200] }]}
              onPress={handleFetchFromDesktop}
              disabled={fetchingRemote}
              activeOpacity={0.7}
            >
              {fetchingRemote ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <>
                  <RefreshCw size={12} color={colors.primary[700]} />
                  <Text style={[styles.fetchDesktopBtnText, { color: colors.primary[700] }]}>جلب من الحاسوب</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {!editMode ? (
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primary[50] }]}
              onPress={() => setEditMode(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.editBtnText, { color: colors.primary[700] }]}>تعديل</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.slate[100] }]}
                onPress={() => {
                  setForm({ ...settings });
                  setEditMode(false);
                }}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.slate[400]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveInlineBtn}
                onPress={handleSaveSettings}
                disabled={saving}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Check size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Card style={styles.sectionCard}>
        {appMode === 'connected' && (
          <View style={[styles.connectedBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5', borderBottomColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0' }]}>
            <Wifi size={15} color={colors.emerald[600]} />
            <Text style={[styles.connectedBannerText, { color: isDark ? colors.emerald[300] : colors.emerald[800] }]}>
              في وضع الاتصال: يتم جلب بيانات المحل، الضرائب، ورأس وتذييل الفاتورة مباشرة من إعدادات برنامج سطح المكتب.
            </Text>
          </View>
        )}
        <SettingRow
          label="اسم المحل / المتجر"
          settingKey="store_name"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label="رقم الهاتف"
          settingKey="store_phone"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="phone-pad"
          colors={colors}
        />
        <SettingRow
          label="البريد الإلكتروني"
          settingKey="store_email"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="email-address"
          colors={colors}
        />
        <SettingRow
          label="العنوان"
          settingKey="store_address"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label="السجل التجاري (RC)"
          settingKey="commercial_register"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label="رقم التعريف الجبائي (NIF)"
          settingKey="tax_number"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label="نسبة الضريبة TVA (%)"
          settingKey="tva_rate"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="numeric"
          displayTransform={(v: string) => `${(parseFloat(v || '0') * 100).toFixed(0)}%`}
          colors={colors}
        />
        <SettingRow
          label="العملة الأساسية"
          settingKey="currency"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label="بادئة الفواتير"
          settingKey="invoice_prefix"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label="نص أسفل الفاتورة"
          settingKey="receipt_footer"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <TouchableOpacity
          style={[styles.openFullSettingsBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50], borderTopColor: colors.border.subtle }]}
          onPress={() => navigation.navigate('StoreSettings')}
          activeOpacity={0.75}
        >
          <Text style={[styles.openFullSettingsBtnText, { color: colors.primary[700] }]}>
            فتح لوحة الإعدادات الكاملة والتشخيص المتقدم ↗
          </Text>
        </TouchableOpacity>
      </Card>

      {/* App Branding Footer */}
      <View style={styles.appBrandingFooter}>
        <Image source={AppImages.logo64} style={styles.brandingLogo} resizeMode="contain" />
        <Text style={[styles.brandingName, { color: colors.text.primary }]}>AN POS Mobile</Text>
        <Text style={[styles.brandingVersion, { color: colors.text.tertiary }]}>
          الإصدار 3.0.0 • دعم الوضع المشرق والمظلم
        </Text>
      </View>

      {/* Logout full button */}
      <Button
        title="تسجيل الخروج من التطبيق"
        variant="destructive"
        size="lg"
        icon={<LogOut size={18} color="#fff" />}
        onPress={handleLogout}
        style={styles.logoutFullBtn}
      />
    </ScrollView>
  );
};

const MenuItem = ({ icon, title, subtitle, onPress, colors }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <ChevronLeft size={16} color={colors.slate[400]} />
    <View style={styles.menuItemInfo}>
      <Text style={[styles.menuItemTitle, { color: colors.text.primary }]}>{title}</Text>
      <Text style={[styles.menuItemSub, { color: colors.text.tertiary }]}>{subtitle}</Text>
    </View>
    <View style={[styles.menuItemIconBox, { backgroundColor: colors.primary[50] }]}>{icon}</View>
  </TouchableOpacity>
);

const SettingRow = ({
  label,
  settingKey,
  form,
  setForm,
  editMode,
  keyboardType,
  displayTransform,
  colors,
}: any) => (
  <View style={[styles.settingRow, { borderBottomColor: colors.border.subtle }]}>
    <Text style={[styles.settingLabel, { color: colors.text.secondary }]}>{label}</Text>
    {editMode ? (
      <TextInput
        style={[
          styles.settingInput,
          {
            color: colors.text.primary,
            backgroundColor: colors.inputBg,
            borderColor: colors.border.default,
          },
        ]}
        value={form[settingKey] || ''}
        onChangeText={(v) => setForm((f: any) => ({ ...f, [settingKey]: v }))}
        keyboardType={keyboardType || 'default'}
        textAlign="right"
        placeholderTextColor={colors.slate[400]}
      />
    ) : (
      <Text style={[styles.settingValue, { color: colors.text.primary }]}>
        {displayTransform ? displayTransform(form[settingKey] || '') : form[settingKey] || '—'}
      </Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    gap: spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  themeSelectorGrid: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  themeOptionCard: {
    flex: 1,
    borderRadius: radii.xl,
    padding: spacing.sm + 2,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    ...shadows.xs,
  },
  themeOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  themeOptionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  themeOptionSub: {
    fontSize: 9.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginTop: 1,
  },
  themeCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    textAlign: 'right',
    fontFamily: 'Cairo',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },

  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  hubCard: {
    width: '48.5%',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'flex-end',
    ...shadows.xs,
  },
  hubIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  hubCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  hubCardSub: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
    marginTop: 2,
    textAlign: 'right',
  },

  sectionMenu: {
    marginHorizontal: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  menuItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  menuItemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  menuItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  menuItemSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: spacing.md,
  },

  sectionCard: {
    marginHorizontal: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  statusTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  statusSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  syncLabel: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  fetchDesktopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  fetchDesktopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  connectedBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: 'Cairo',
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 18,
  },
  openFullSettingsBtn: {
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  openFullSettingsBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cancelBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveInlineBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 13,
    fontFamily: 'Cairo',
    flex: 1,
  },
  settingValue: {
    fontSize: 13,
    fontFamily: 'Cairo',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  settingInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo',
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
  },

  appBrandingFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    gap: 2,
  },
  brandingLogo: {
    width: 44,
    height: 44,
    marginBottom: 4,
  },
  brandingName: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  brandingVersion: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  logoutFullBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
});

export default MoreScreen;
