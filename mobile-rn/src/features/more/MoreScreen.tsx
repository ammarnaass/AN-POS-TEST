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
  Modal,
} from 'react-native';
import { AppImages } from '@/assets';
import {
  Settings,
  Store,
  Wifi,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
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
  Camera,
  Image as ImageIcon,
  Trash2,
  Globe,
  Sparkles,
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
import { AnposCamera } from '@/modules/AnposCamera';

export const MoreScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const sync = useSyncEngine();
  const { mode, isDark, colors, setMode } = useTheme();
  const { t, isRTL, textAlign } = useI18n();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [storeData, setStoreData] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [appMode, setAppMode] = useState<'standalone' | 'connected'>('standalone');
  const [serverUrlDisplay, setServerUrlDisplay] = useState<string>('—');
  const [activeShift, setActiveShift] = useState<any>(null);

  // Store Logo Modal state
  const [logoPickerVisible, setLogoPickerVisible] = useState(false);
  const [logoUrlModalVisible, setLogoUrlModalVisible] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState('');

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
        logo: st.logo || st.shop_logo || '',
        shop_logo: st.logo || st.shop_logo || '',
      };
      setSettings(map);
      setForm({ ...map });

      // Fetch active cash session
      try {
        const allSessions = await db.cashSessions.toArray().catch(() => []);
        const open = allSessions.find((s: any) => s.status === 'open') || null;
        setActiveShift(open);
      } catch {}
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
          logo: res.settings.logo || res.settings.shop_logo || '',
          shop_logo: res.settings.logo || res.settings.shop_logo || '',
        };
        setSettings(map);
        setForm({ ...map });
        Alert.alert(t('common.success'), t('storeSettings.desktopFetchSuccess'));
      } else {
        Alert.alert(t('common.warning'), res.error || t('storeSettings.desktopFetchFallback'));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('storeSettings.desktopFetchError'));
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
        logo: form.logo || '',
        shop_logo: form.logo || '',
      };

      const result = await saveStoreSettings(patch);
      if (result.success) {
        setSettings({ ...form });
        setEditMode(false);
        Alert.alert(
          t('common.success'),
          appMode === 'connected'
            ? t('storeSettings.connectedSaveSuccess')
            : t('storeSettings.standaloneSaveSuccess')
        );
      } else {
        Alert.alert(t('common.error'), result.error || t('common.error'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    }
    setSaving(false);
  };

  // Logo Actions
  const handleCaptureLogo = async () => {
    setLogoPickerVisible(false);
    try {
      const granted = await AnposCamera.requestPermission();
      if (!granted) {
        Alert.alert(t('common.warning'), 'يرجى منح صلاحية الكاميرا لالتقاط صورة الشعار');
        return;
      }
      const photoUri = await AnposCamera.capturePhoto();
      if (photoUri) {
        setForm((prev) => ({ ...prev, logo: photoUri, shop_logo: photoUri }));
        setSettings((prev) => ({ ...prev, logo: photoUri, shop_logo: photoUri }));
        await saveStoreSettings({
          shop_name: form.store_name || form.shop_name,
          store_name: form.store_name || form.shop_name,
          address: form.store_address || form.address,
          phone: form.store_phone || form.phone,
          email: form.store_email || form.email,
          base_currency: form.currency || form.base_currency,
          logo: photoUri,
          shop_logo: photoUri,
        });
        Alert.alert(t('common.success'), t('storeSettings.logoUpdatedSuccess'));
      }
    } catch (e) {
      console.warn('Capture logo failed:', e);
    }
  };

  const handlePickLogoGallery = async () => {
    setLogoPickerVisible(false);
    try {
      const imageUri = await AnposCamera.pickImage();
      if (imageUri) {
        setForm((prev) => ({ ...prev, logo: imageUri, shop_logo: imageUri }));
        setSettings((prev) => ({ ...prev, logo: imageUri, shop_logo: imageUri }));
        await saveStoreSettings({
          shop_name: form.store_name || form.shop_name,
          store_name: form.store_name || form.shop_name,
          address: form.store_address || form.address,
          phone: form.store_phone || form.phone,
          email: form.store_email || form.email,
          base_currency: form.currency || form.base_currency,
          logo: imageUri,
          shop_logo: imageUri,
        });
        Alert.alert(t('common.success'), t('storeSettings.logoUpdatedSuccess'));
      }
    } catch (e) {
      console.warn('Pick logo gallery failed:', e);
    }
  };

  const handleApplyLogoUrl = async () => {
    const trimmed = customLogoUrl.trim();
    if (trimmed) {
      setForm((prev) => ({ ...prev, logo: trimmed, shop_logo: trimmed }));
      setSettings((prev) => ({ ...prev, logo: trimmed, shop_logo: trimmed }));
      await saveStoreSettings({
        shop_name: form.store_name || form.shop_name,
        store_name: form.store_name || form.shop_name,
        address: form.store_address || form.address,
        phone: form.store_phone || form.phone,
        email: form.store_email || form.email,
        base_currency: form.currency || form.base_currency,
        logo: trimmed,
        shop_logo: trimmed,
      });
      setCustomLogoUrl('');
      setLogoUrlModalVisible(false);
      Alert.alert(t('common.success'), t('storeSettings.logoUpdatedSuccess'));
    }
  };

  const handleRemoveLogo = async () => {
    setLogoPickerVisible(false);
    setForm((prev) => ({ ...prev, logo: '', shop_logo: '' }));
    setSettings((prev) => ({ ...prev, logo: '', shop_logo: '' }));
    await saveStoreSettings({
      shop_name: form.store_name || form.shop_name,
      store_name: form.store_name || form.shop_name,
      address: form.store_address || form.address,
      phone: form.store_phone || form.phone,
      email: form.store_email || form.email,
      base_currency: form.currency || form.base_currency,
      logo: '',
      shop_logo: '',
    });
    Alert.alert(t('common.success'), t('storeSettings.logoRemovedSuccess'));
  };

  const handleSync = async () => {
    if (appMode !== 'connected') {
      Alert.alert(t('settings.standalone'), t('settings.syncOnlyConnected'));
      return;
    }
    await sync.pullUpdates();
    await sync.processQueue();
    await loadSettings(true);
    Alert.alert(
      t('settings.syncStatus'),
      `${t('settings.lastSync')}: ${sync.lastSyncTime ? new Date(sync.lastSyncTime).toLocaleTimeString(isRTL ? 'ar-DZ' : 'en-US') : '—'}`
    );
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logoutConfirmTitle'), t('auth.logoutConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
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
      {/* 1. Store Identity & Logo Bento Hero Card */}
      <Card variant="elevated" style={styles.storeHeroCard}>
        <View style={[styles.storeHeroTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Interactive Logo Avatar */}
          <TouchableOpacity
            style={styles.storeLogoTouchable}
            onPress={() => setLogoPickerVisible(true)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.storeLogoBox,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50],
                  borderColor: form.logo ? colors.primary[400] : colors.border.default,
                },
              ]}
            >
              {form.logo ? (
                <Image source={{ uri: form.logo }} style={styles.storeLogoImg} resizeMode="cover" />
              ) : (
                <Store size={30} color={colors.primary[600]} />
              )}
            </View>
            <View style={[styles.logoCameraBadge, { backgroundColor: colors.primary[600] }]}>
              <Camera size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* Store Information */}
          <View style={[styles.storeInfoColumn, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.storeHeroName, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {form.store_name || form.shop_name || t('storeSettings.shopName')}
            </Text>
            <Text style={[styles.storeHeroAddress, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {form.store_address || form.address || t('storeSettings.address')}
            </Text>
            {form.store_phone ? (
              <Text style={[styles.storeHeroPhone, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                📞 {form.store_phone}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.storeHeroFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Badge variant={appMode === 'connected' ? 'emerald' : 'neutral'} size="xs" dot>
            {appMode === 'connected' ? t('settings.connected') : t('settings.standalone')}
          </Badge>

          <TouchableOpacity
            style={[styles.editLogoBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
            onPress={() => setLogoPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Camera size={13} color={colors.primary[600]} />
            <Text style={[styles.editLogoBtnText, { color: colors.primary[600] }]}>
              {form.logo ? t('storeSettings.changeStoreLogo') : t('storeSettings.storeLogo')}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 2. User & Session Card */}
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
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.userName, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
            {user?.name || t('users.role') || 'User'}
          </Text>
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

      {/* 3. Language Selection Section */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('settings.language')}</Text>
      <LanguageSelectorGrid style={{ marginBottom: spacing.sm }} />

      {/* 4. Theme Selection Section */}
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

      {/* 5. Main Operations Modules Hub */}
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
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.suppliers')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('suppliers.purchases')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.hubCard,
            { backgroundColor: colors.surface, borderColor: colors.border.default },
            activeShift && {
              borderColor: isDark ? colors.emerald[800] : colors.emerald[300],
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.06)' : colors.emerald[50] + '35',
            },
          ]}
          onPress={() => navigation.navigate('Cash')}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.hubIconBox,
              {
                backgroundColor: activeShift
                  ? (isDark ? 'rgba(16, 185, 129, 0.2)' : colors.emerald[100])
                  : (isDark ? colors.surfaceElevated : colors.slate[100]),
              },
            ]}
          >
            <Wallet size={20} color={activeShift ? colors.emerald[600] : colors.slate[600]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.cash')}</Text>
            {activeShift ? (
              <Badge variant="emerald" size="xs" dot>
                #{activeShift.sessionNumber || (activeShift as any).number || 1}
              </Badge>
            ) : null}
          </View>
          <Text
            style={[
              styles.hubCardSub,
              {
                color: activeShift ? colors.emerald[600] : colors.text.tertiary,
                fontWeight: activeShift ? '700' : '500',
              },
            ]}
          >
            {activeShift ? t('cash.activeShiftBadge') : t('cash.closedShiftBadge')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Expenses')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.danger.light }]}>
            <TrendingDown size={20} color={colors.danger.main} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.expenses')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('cash.expenses')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Categories')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.indigo[50] }]}>
            <Tag size={20} color={colors.indigo[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.categories')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('categories.title')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Promotions')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.purple[50] }]}>
            <Layers size={20} color={colors.purple[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.promotions')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('promotions.packsTitle')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('DeliveryOrders')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.primary[50] }]}>
            <Store size={20} color={colors.primary[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.deliveryOrders')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('orders.trackOrder')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Warehouses')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.primary[100] }]}>
            <Warehouse size={20} color={colors.primary[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.warehouses')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('warehouses.title')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('InventoryCount')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.emerald[100] }]}>
            <ClipboardCheck size={20} color={colors.emerald[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.inventoryCount')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('inventoryCount.title')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('StockMovements')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.indigo[100] }]}>
            <History size={20} color={colors.indigo[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.stockMovements')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('stockMovements.title')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('ProfitCenter')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.emerald[50] }]}>
            <DollarSign size={20} color={colors.emerald[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.profitCenter')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.netProfit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.hubCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('ZakatCalculator')}
          activeOpacity={0.75}
        >
          <View style={[styles.hubIconBox, { backgroundColor: colors.amber[50] }]}>
            <Calculator size={20} color={colors.amber[700]} />
          </View>
          <Text style={[styles.hubCardTitle, { color: colors.text.primary }]}>{t('nav.zakatCalculator')}</Text>
          <Text style={[styles.hubCardSub, { color: colors.text.tertiary }]}>{t('dashboard.zakatSub')}</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Hardware, Print & Printing Templates */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('print.printerSettings')}</Text>
      <Card style={styles.sectionMenu}>
        <MenuItem
          icon={<Printer size={18} color={colors.primary[600]} />}
          title={t('nav.printerSettings')}
          subtitle={t('print.printerSettings')}
          onPress={() => navigation.navigate('PrinterSettings')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<FileText size={18} color={colors.indigo[600]} />}
          title={t('nav.printTemplates')}
          subtitle={t('printTemplates.subtitle')}
          onPress={() => navigation.navigate('PrintTemplates')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<Barcode size={18} color={colors.purple[600]} />}
          title={t('nav.barcodeLabels')}
          subtitle={t('barcodeLabels.subtitle')}
          onPress={() => navigation.navigate('BarcodeLabels')}
          colors={colors}
        />
      </Card>

      {/* 7. System Management & Users */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('settings.systemConfig')}</Text>
      <Card style={styles.sectionMenu}>
        <MenuItem
          icon={<Users size={18} color={colors.purple[600]} />}
          title={t('nav.users')}
          subtitle={t('users.title')}
          onPress={() => navigation.navigate('Users')}
          colors={colors}
        />
        <View style={[styles.menuDivider, { backgroundColor: colors.border.subtle }]} />
        <MenuItem
          icon={<HardDrive size={18} color={colors.slate[600]} />}
          title={t('backupRestore.title')}
          subtitle={t('backupRestore.subtitle')}
          onPress={() => navigation.navigate('BackupRestore')}
          colors={colors}
        />
      </Card>

      {/* 8. Connection Status & Sync */}
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t('settings.systemConfig')}</Text>
      <Card style={styles.sectionCard}>
        <View style={styles.statusRow}>
          {appMode === 'connected' ? (
            <Wifi size={20} color={colors.emerald[600]} />
          ) : (
            <Database size={20} color={colors.slate[400]} />
          )}
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.statusTitle, { color: colors.text.primary }]}>
              {appMode === 'connected' ? t('settings.connectedModeDesc') : t('settings.standaloneModeDesc')}
            </Text>
            {appMode === 'connected' && (
              <Text style={[styles.statusSub, { color: colors.text.tertiary }]}>{serverUrlDisplay}</Text>
            )}
          </View>
          <Badge variant={appMode === 'connected' ? 'emerald' : 'neutral'} size="xs" dot>
            {appMode === 'connected' ? t('settings.connected') : t('settings.standalone')}
          </Badge>
        </View>

        {appMode === 'connected' && (
          <View style={[styles.syncRow, { borderTopColor: colors.border.subtle }]}>
            <View>
              <Text style={[styles.syncLabel, { color: colors.text.secondary }]}>{t('settings.syncPending')}: {sync.pendingCount}</Text>
              <Text style={[styles.syncLabel, { color: colors.text.secondary }]}>{t('settings.syncFailed')}: {sync.failedCount}</Text>
            </View>
            <Button
              title={t('settings.syncNow')}
              variant="primary"
              size="sm"
              loading={sync.isSyncing}
              icon={<RefreshCw size={14} color="#fff" />}
              onPress={handleSync}
            />
          </View>
        )}
      </Card>

      {/* 9. Store Settings */}
      <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary, marginBottom: 0 }]}>{t('storeSettings.title')}</Text>
          {appMode === 'connected' && (
            <Badge variant="success" size="xs">{t('settings.connected')}</Badge>
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
                  <Text style={[styles.fetchDesktopBtnText, { color: colors.primary[700] }]}>{t('storeSettings.fetchFromDesktop')}</Text>
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
              <Text style={[styles.editBtnText, { color: colors.primary[700] }]}>{t('common.edit')}</Text>
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
            <Text style={[styles.connectedBannerText, { color: isDark ? colors.emerald[300] : colors.emerald[800], textAlign: isRTL ? 'right' : 'left' }]}>
              {t('storeSettings.connectedModeDesc')}
            </Text>
          </View>
        )}
        <SettingRow
          label={t('storeSettings.shopName')}
          settingKey="store_name"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label={t('storeSettings.mainPhone')}
          settingKey="store_phone"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="phone-pad"
          colors={colors}
        />
        <SettingRow
          label={t('storeSettings.email')}
          settingKey="store_email"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="email-address"
          colors={colors}
        />
        <SettingRow
          label={t('storeSettings.address')}
          settingKey="store_address"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label={t('storeSettings.rc')}
          settingKey="commercial_register"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label={t('storeSettings.nif')}
          settingKey="tax_number"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label={t('storeSettings.tvaRate')}
          settingKey="tva_rate"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="numeric"
          displayTransform={(v: string) => `${(parseFloat(v || '0') * 100).toFixed(0)}%`}
          colors={colors}
        />
        <SettingRow
          label={t('common.currency')}
          settingKey="currency"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label={t('storeSettings.invoicePrefix')}
          settingKey="invoice_prefix"
          form={form}
          setForm={setForm}
          editMode={editMode}
          colors={colors}
        />
        <SettingRow
          label={t('print.invoiceFooter')}
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
            {t('storeSettings.title')} ↗
          </Text>
        </TouchableOpacity>
      </Card>

      {/* 10. App Branding Footer */}
      <View style={styles.appBrandingFooter}>
        <Image source={AppImages.logo64} style={styles.brandingLogo} resizeMode="contain" />
        <Text style={[styles.brandingName, { color: colors.text.primary }]}>AN POS Mobile</Text>
        <Text style={[styles.brandingVersion, { color: colors.text.tertiary }]}>
          {t('settings.versionDesc')}
        </Text>
      </View>

      {/* 11. Logout full button */}
      <Button
        title={t('auth.logout')}
        variant="destructive"
        size="lg"
        icon={<LogOut size={18} color="#fff" />}
        onPress={handleLogout}
        style={styles.logoutFullBtn}
      />

      {/* ── Logo Picker Action Sheet Modal ──────────────────────── */}
      <Modal
        visible={logoPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLogoPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setLogoPickerVisible(false)}
        >
          <View style={[styles.actionSheetCard, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.actionSheetHandle, { backgroundColor: colors.border.default }]} />

            <View style={[styles.actionSheetHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                <Store size={20} color={colors.primary[600]} />
                <Text style={[styles.actionSheetTitle, { color: colors.text.primary }]}>
                  {t('storeSettings.storeLogo')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLogoPickerVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <View style={styles.actionSheetOptions}>
              {/* Option 1: Take Photo with Camera */}
              <TouchableOpacity
                style={[
                  styles.actionSheetOptionItem,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
                    borderColor: colors.border.subtle,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={handleCaptureLogo}
                activeOpacity={0.75}
              >
                <View style={[styles.actionOptionIconBox, { backgroundColor: colors.primary[50] }]}>
                  <Camera size={22} color={colors.primary[600]} />
                </View>
                <View style={[styles.actionOptionTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.actionOptionTitle, { color: colors.text.primary }]}>
                    {t('storeSettings.takeLogoPhoto')}
                  </Text>
                  <Text style={[styles.actionOptionDesc, { color: colors.text.tertiary }]}>
                    {t('storeSettings.takeLogoPhotoDesc')}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Choose from Gallery */}
              <TouchableOpacity
                style={[
                  styles.actionSheetOptionItem,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
                    borderColor: colors.border.subtle,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={handlePickLogoGallery}
                activeOpacity={0.75}
              >
                <View style={[styles.actionOptionIconBox, { backgroundColor: colors.indigo[50] }]}>
                  <ImageIcon size={22} color={colors.indigo[600]} />
                </View>
                <View style={[styles.actionOptionTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.actionOptionTitle, { color: colors.text.primary }]}>
                    {t('storeSettings.chooseLogoGallery')}
                  </Text>
                  <Text style={[styles.actionOptionDesc, { color: colors.text.tertiary }]}>
                    {t('storeSettings.chooseLogoGalleryDesc')}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Enter URL */}
              <TouchableOpacity
                style={[
                  styles.actionSheetOptionItem,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
                    borderColor: colors.border.subtle,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => {
                  setLogoPickerVisible(false);
                  setLogoUrlModalVisible(true);
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.actionOptionIconBox, { backgroundColor: colors.amber[50] }]}>
                  <Globe size={22} color={colors.amber[700]} />
                </View>
                <View style={[styles.actionOptionTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.actionOptionTitle, { color: colors.text.primary }]}>
                    {t('storeSettings.enterLogoUrl')}
                  </Text>
                  <Text style={[styles.actionOptionDesc, { color: colors.text.tertiary }]}>
                    {t('storeSettings.enterLogoUrlDesc')}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 4: Delete Logo */}
              {form.logo ? (
                <TouchableOpacity
                  style={[
                    styles.actionSheetOptionItem,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : colors.danger.light,
                      borderColor: colors.danger.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={handleRemoveLogo}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionOptionIconBox, { backgroundColor: colors.danger.light }]}>
                    <Trash2 size={22} color={colors.danger.main} />
                  </View>
                  <View style={[styles.actionOptionTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.actionOptionTitle, { color: colors.danger.main }]}>
                      {t('storeSettings.removeStoreLogo')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Enter URL Modal ─────────────────────────────────────── */}
      <Modal
        visible={logoUrlModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoUrlModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setLogoUrlModalVisible(false)}
        >
          <View style={[styles.urlModalCard, { backgroundColor: colors.surface }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.urlModalTitle, { color: colors.text.primary }]}>
              {t('storeSettings.enterLogoUrl')}
            </Text>
            <TextInput
              style={[
                styles.urlTextInput,
                {
                  color: colors.text.primary,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border.default,
                  textAlign,
                },
              ]}
              value={customLogoUrl}
              onChangeText={setCustomLogoUrl}
              placeholder="https://example.com/logo.png"
              placeholderTextColor={colors.slate[400]}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <Button
                title={t('common.cancel')}
                variant="outline"
                size="md"
                onPress={() => {
                  setCustomLogoUrl('');
                  setLogoUrlModalVisible(false);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title={t('common.save')}
                variant="primary"
                size="md"
                onPress={handleApplyLogoUrl}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const MenuItem = ({ icon, title, subtitle, onPress, colors }: any) => {
  const { isRTL } = useI18n();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
  return (
    <TouchableOpacity
      style={[styles.menuItem, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ChevronIcon size={16} color={colors.slate[400]} />
      <View style={[styles.menuItemInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.menuItemTitle, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
          {title}
        </Text>
        <Text style={[styles.menuItemSub, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.menuItemIconBox, { backgroundColor: colors.primary[50] }]}>
        {icon}
      </View>
    </TouchableOpacity>
  );
};

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

  // Store Hero Card & Logo Avatar
  storeHeroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.xxl,
    gap: spacing.md,
  },
  storeHeroTopRow: {
    alignItems: 'center',
    gap: spacing.md,
  },
  storeLogoTouchable: {
    position: 'relative',
  },
  storeLogoBox: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storeLogoImg: {
    width: '100%',
    height: '100%',
  },
  logoCameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    ...shadows.xs,
  },
  storeInfoColumn: {
    flex: 1,
    gap: 2,
  },
  storeHeroName: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Cairo',
    letterSpacing: -0.2,
  },
  storeHeroAddress: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },
  storeHeroPhone: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    marginTop: 1,
  },
  storeHeroFooter: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.12)',
  },
  editLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  editLogoBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.md,
    gap: spacing.md,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  userName: {
    fontSize: 14.5,
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

  // Theme Selector
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

  // Action Sheet Modals
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    ...shadows.lg,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  actionSheetHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  actionSheetTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  actionSheetOptions: {
    gap: spacing.sm,
  },
  actionSheetOptionItem: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  actionOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOptionTextGroup: {
    flex: 1,
    gap: 1,
  },
  actionOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  actionOptionDesc: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
  },

  // URL Modal Card
  urlModalCard: {
    marginHorizontal: spacing.xl,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: radii.xxl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  urlModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  urlTextInput: {
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    fontSize: 14,
    fontFamily: 'Cairo',
  },
});

export default MoreScreen;
