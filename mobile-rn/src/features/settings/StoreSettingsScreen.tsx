import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import {
  Store,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Receipt,
  Percent,
  Coins,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Wifi,
  WifiOff,
  Sliders,
  Printer,
  Sparkles,
  Info,
  Calendar,
  Clock,
  HardDrive,
  Copy,
  Hash,
  Camera,
  Image as ImageIcon,
  Trash2,
  Globe,
  Radio,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Card, Badge, Button } from '@/components/ui';
import { session } from '@/lib/apiClient';
import { db as unifiedDB, getStoredMode } from '@/infrastructure/database/UnifiedDB';
import {
  getStoreSettings,
  fetchStoreSettingsFromDesktop,
  saveStoreSettings,
  type StoreSettings,
} from '@/lib/settingService';
import { AnposCamera } from '@/modules/AnposCamera';

type SettingsTab = 'identity' | 'fiscal' | 'invoicing' | 'system' | 'diagnostics';

export const StoreSettingsScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, alignSelf, alignItems, language } = useI18n();

  const [activeTab, setActiveTab] = useState<SettingsTab>('identity');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [appMode, setAppMode] = useState<'standalone' | 'connected'>('standalone');
  const [serverUrl, setServerUrl] = useState<string>('—');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  // Store Logo Modal state
  const [logoPickerVisible, setLogoPickerVisible] = useState(false);
  const [logoUrlModalVisible, setLogoUrlModalVisible] = useState(false);
  const [customLogoUrl, setCustomLogoUrl] = useState('');

  const loadData = useCallback(async (forceRemote = false) => {
    try {
      if (forceRemote) setFetchingRemote(true);
      else setLoading(true);

      const mode = await getStoredMode();
      setAppMode(mode);

      const displayUrl = await session.getServerUrlDisplay();
      setServerUrl(displayUrl || '—');

      const data = await getStoreSettings(forceRemote || mode === 'connected');
      setSettings(data);
      setForm({ ...data });
      setLastSyncTimestamp(new Date().toLocaleTimeString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US'));
    } catch (err: any) {
      console.warn('[StoreSettingsScreen] load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFetchingRemote(false);
    }
  }, [language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFetchFromDesktop = async () => {
    setFetchingRemote(true);
    try {
      const res = await fetchStoreSettingsFromDesktop();
      if (res.success && res.settings) {
        setSettings(res.settings);
        setForm({ ...res.settings });
        setLastSyncTimestamp(new Date().toLocaleTimeString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US'));
        Alert.alert(
          t('common.success'),
          `${t('storeSettings.fetchFromDesktop')} (${serverUrl})`
        );
      } else {
        Alert.alert(t('common.warning'), res.error || t('pair.connectFailed'));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('pair.connectFailed'));
    } finally {
      setFetchingRemote(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: Partial<StoreSettings> = {
        ...form,
        tva_rate: parseFloat(String(form.tva_rate || '0')),
        print_width_mm: parseInt(String(form.print_width_mm || '80'), 10),
        invoice_start_number: parseInt(String(form.invoice_start_number || '1'), 10),
        logo: form.logo || form.shop_logo || '',
        shop_logo: form.logo || form.shop_logo || '',
      };

      const result = await saveStoreSettings(patch);
      if (result.success) {
        const finalS = result.settings || (patch as StoreSettings);
        setSettings(finalS);
        setForm({ ...finalS });
        setLastSyncTimestamp(new Date().toLocaleTimeString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US'));
        setEditMode(false);
        Alert.alert(
          t('common.success'),
          appMode === 'connected'
            ? t('storeSettings.connectedModeDesc')
            : t('storeSettings.standaloneModeDesc')
        );
      } else {
        Alert.alert(t('common.error'), result.error || t('common.error'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Logo handlers
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
        updateField('logo', photoUri);
        updateField('shop_logo', photoUri);
        const res = await saveStoreSettings({ ...form, logo: photoUri, shop_logo: photoUri });
        if (res.success && res.settings) {
          setSettings(res.settings);
          setForm({ ...res.settings });
        }
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
        updateField('logo', imageUri);
        updateField('shop_logo', imageUri);
        const res = await saveStoreSettings({ ...form, logo: imageUri, shop_logo: imageUri });
        if (res.success && res.settings) {
          setSettings(res.settings);
          setForm({ ...res.settings });
        }
        Alert.alert(t('common.success'), t('storeSettings.logoUpdatedSuccess'));
      }
    } catch (e) {
      console.warn('Pick logo gallery failed:', e);
    }
  };

  const handleApplyLogoUrl = async () => {
    const trimmed = customLogoUrl.trim();
    if (trimmed) {
      updateField('logo', trimmed);
      updateField('shop_logo', trimmed);
      const res = await saveStoreSettings({ ...form, logo: trimmed, shop_logo: trimmed });
      if (res.success && res.settings) {
        setSettings(res.settings);
        setForm({ ...res.settings });
      }
      setCustomLogoUrl('');
      setLogoUrlModalVisible(false);
      Alert.alert(t('common.success'), t('storeSettings.logoUpdatedSuccess'));
    }
  };

  const handleRemoveLogo = async () => {
    setLogoPickerVisible(false);
    updateField('logo', '');
    updateField('shop_logo', '');
    const res = await saveStoreSettings({ ...form, logo: '', shop_logo: '' });
    if (res.success && res.settings) {
      setSettings(res.settings);
      setForm({ ...res.settings });
    }
    Alert.alert(t('common.success'), t('storeSettings.logoRemovedSuccess'));
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Top App Bar ─────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border.default,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackIcon size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={[styles.headerTitleBox, { alignItems }]}>
          <Text style={[styles.headerTitle, { color: colors.text.primary, textAlign }]}>
            {t('storeSettings.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.tertiary, textAlign }]}>
            {appMode === 'connected' ? `${t('settings.connected')} (${serverUrl})` : t('settings.standalone')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {appMode === 'connected' && !editMode && (
            <TouchableOpacity
              style={[
                styles.iconActionBtn,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50],
                  borderColor: colors.primary[200],
                },
              ]}
              onPress={handleFetchFromDesktop}
              disabled={fetchingRemote}
              activeOpacity={0.7}
            >
              {fetchingRemote ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <RefreshCw size={16} color={colors.primary[700]} />
              )}
            </TouchableOpacity>
          )}

          {!editMode ? (
            <TouchableOpacity
              style={[styles.editToggleBtn, { backgroundColor: colors.primary[600] }]}
              onPress={() => setEditMode(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editToggleBtnText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  setForm({ ...settings });
                  setEditMode(false);
                }}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.emerald[600] }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData(true);
            }}
            colors={[colors.primary[600]]}
            tintColor={colors.primary[600]}
          />
        }
      >
        {/* ── Status & Connection Hero Banner ───────────────────────── */}
        <Card
          variant="elevated"
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
              borderColor: appMode === 'connected' ? colors.emerald[300] : colors.border.default,
            },
          ]}
        >
          <View style={[styles.heroTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.heroTitleGroup, { alignItems }]}>
              <Text style={[styles.heroStoreName, { color: colors.text.primary, textAlign }]}>
                {form.shop_name || form.store_name || t('storeSettings.shopName')}
              </Text>
              <Text style={[styles.heroStoreAddress, { color: colors.text.secondary, textAlign }]}>
                {form.address || form.store_address || t('storeSettings.address')}
              </Text>
            </View>

            {/* Interactive Logo Avatar */}
            <TouchableOpacity
              style={styles.heroLogoTouchable}
              onPress={() => setLogoPickerVisible(true)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.heroAvatar,
                  {
                    backgroundColor: appMode === 'connected' ? colors.emerald[50] : colors.primary[50],
                    borderColor: (form.logo || form.shop_logo) ? colors.primary[400] : (appMode === 'connected' ? colors.emerald[200] : colors.primary[200]),
                  },
                ]}
              >
                {(form.logo || form.shop_logo) ? (
                  <Image source={{ uri: form.logo || form.shop_logo }} style={styles.heroLogoImg} resizeMode="cover" />
                ) : (
                  <Store
                    size={24}
                    color={appMode === 'connected' ? colors.emerald[600] : colors.primary[600]}
                  />
                )}
              </View>
              <View style={[styles.heroCameraBadge, { backgroundColor: colors.primary[600] }]}>
                <Camera size={10} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.heroDivider, { backgroundColor: colors.border.subtle }]} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatLabel, { color: colors.text.tertiary }]}>{t('storeSettings.syncStatus')}</Text>
              <Badge variant={appMode === 'connected' ? 'emerald' : 'neutral'} size="xs" dot>
                {appMode === 'connected' ? t('settings.connected') : t('settings.standalone')}
              </Badge>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatLabel, { color: colors.text.tertiary }]}>{t('common.currency')}</Text>
              <Text style={[styles.heroStatValue, { color: colors.text.primary }]}>
                {form.base_currency || t('common.currency')} • TVA: {form.tva_rate || 0}%
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatLabel, { color: colors.text.tertiary }]}>{t('settings.lastSync')}</Text>
              <Text style={[styles.heroStatValue, { color: colors.text.secondary }]}>
                {lastSyncTimestamp || '—'}
              </Text>
            </View>
          </View>

          {appMode === 'connected' && (
            <TouchableOpacity
              style={[
                styles.heroActionBtn,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
                },
              ]}
              onPress={handleFetchFromDesktop}
              disabled={fetchingRemote}
              activeOpacity={0.7}
            >
              {fetchingRemote ? (
                <ActivityIndicator size="small" color={colors.emerald[600]} />
              ) : (
                <>
                  <RefreshCw size={14} color={colors.emerald[700]} />
                  <Text style={[styles.heroActionBtnText, { color: colors.emerald[800] }]}>
                    {t('storeSettings.fetchFromDesktop')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Card>

        {/* ── Segmented Navigation Tabs ─────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContainer}
        >
          <TabButton
            active={activeTab === 'identity'}
            title={t('storeSettings.identityTab')}
            icon={<Store size={15} color={activeTab === 'identity' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('identity')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'fiscal'}
            title={t('storeSettings.fiscalTab')}
            icon={<FileText size={15} color={activeTab === 'fiscal' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('fiscal')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'invoicing'}
            title={t('storeSettings.invoicingTab')}
            icon={<Receipt size={15} color={activeTab === 'invoicing' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('invoicing')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'system'}
            title={t('storeSettings.systemTab')}
            icon={<Sliders size={15} color={activeTab === 'system' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('system')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'diagnostics'}
            title={t('storeSettings.diagnosticsTab')}
            icon={<HardDrive size={15} color={activeTab === 'diagnostics' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('diagnostics')}
            colors={colors}
          />
        </ScrollView>

        {/* ── Tab 1: Store Identity & Contact ──────────────────── */}
        {activeTab === 'identity' && (
          <Card style={styles.tabCard}>
            <View style={[styles.tabHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.primary[50] }]}>
                <Building2 size={18} color={colors.primary[600]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.identityTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('storeSettings.subtitle')}
                </Text>
              </View>
            </View>

            {/* Store Logo Management Box */}
            <View style={[styles.logoSectionCard, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50], borderColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={styles.logoBoxTouchable}
                onPress={() => setLogoPickerVisible(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.logoBox, { borderColor: (form.logo || form.shop_logo) ? colors.primary[400] : colors.border.default }]}>
                  {(form.logo || form.shop_logo) ? (
                    <Image source={{ uri: form.logo || form.shop_logo }} style={styles.logoPreviewImg} resizeMode="cover" />
                  ) : (
                    <Store size={26} color={colors.primary[600]} />
                  )}
                </View>
                <View style={[styles.logoActionBadge, { backgroundColor: colors.primary[600] }]}>
                  <Camera size={11} color="#ffffff" />
                </View>
              </TouchableOpacity>

              <View style={[styles.logoInfoBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.logoTitle, { color: colors.text.primary }]}>
                  {t('storeSettings.storeLogo')}
                </Text>
                <Text style={[styles.logoDesc, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {(form.logo || form.shop_logo) ? t('storeSettings.changeStoreLogo') : t('storeSettings.chooseLogoGalleryDesc')}
                </Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.smallLogoBtn, { backgroundColor: colors.primary[600] }]}
                    onPress={() => setLogoPickerVisible(true)}
                  >
                    <Camera size={12} color="#fff" />
                    <Text style={styles.smallLogoBtnText}>
                      {(form.logo || form.shop_logo) ? t('common.edit') : t('common.add')}
                    </Text>
                  </TouchableOpacity>
                  {(form.logo || form.shop_logo) ? (
                    <TouchableOpacity
                      style={[styles.smallLogoBtn, { backgroundColor: colors.danger.light }]}
                      onPress={handleRemoveLogo}
                    >
                      <Trash2 size={12} color={colors.danger.main} />
                      <Text style={[styles.smallLogoBtnText, { color: colors.danger.main }]}>
                        {t('common.delete')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <FormField
              label={t('storeSettings.shopName')}
              value={form.shop_name || form.store_name}
              onChangeText={(v: string) => {
                updateField('shop_name', v);
                updateField('store_name', v);
              }}
              editMode={editMode}
              icon={<Store size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="e.g. Supermarket Al-Amana"
            />

            <FormField
              label={t('storeSettings.shopDesc')}
              value={form.shop_description}
              onChangeText={(v: string) => updateField('shop_description', v)}
              editMode={editMode}
              icon={<Info size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="e.g. Retail & Wholesale Grocery"
            />

            <FormField
              label={t('storeSettings.mainPhone')}
              value={form.phone || form.store_phone}
              onChangeText={(v: string) => {
                updateField('phone', v);
                updateField('store_phone', v);
              }}
              editMode={editMode}
              keyboardType="phone-pad"
              icon={<Phone size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="0555123456"
            />

            <FormField
              label={t('storeSettings.secondaryPhone')}
              value={form.phone2 || form.shop_phone2}
              onChangeText={(v: string) => {
                updateField('phone2', v);
                updateField('shop_phone2', v);
              }}
              editMode={editMode}
              keyboardType="phone-pad"
              icon={<Phone size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="021987654"
            />

            <FormField
              label={t('storeSettings.email')}
              value={form.email || form.store_email}
              onChangeText={(v: string) => {
                updateField('email', v);
                updateField('store_email', v);
              }}
              editMode={editMode}
              keyboardType="email-address"
              icon={<Mail size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="contact@store.dz"
            />

            <FormField
              label={t('storeSettings.address')}
              value={form.address || form.store_address}
              onChangeText={(v: string) => {
                updateField('address', v);
                updateField('store_address', v);
              }}
              editMode={editMode}
              icon={<MapPin size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="123 Didouche Mourad Street"
            />

            <FormField
              label={t('storeSettings.city')}
              value={form.city}
              onChangeText={(v: string) => updateField('city', v)}
              editMode={editMode}
              icon={<Building2 size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="Algiers"
            />
          </Card>
        )}

        {/* ── Tab 2: Legal & Fiscal Data ───────────────────────── */}
        {activeTab === 'fiscal' && (
          <Card style={styles.tabCard}>
            <View style={[styles.tabHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.warning.light }]}>
                <FileText size={18} color={colors.warning.dark} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.fiscalTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('storeSettings.fiscalTab')}
                </Text>
              </View>
            </View>

            <FormField
              label={t('storeSettings.rc')}
              value={form.commercial_register || form.company_rc}
              onChangeText={(v: string) => {
                updateField('commercial_register', v);
                updateField('company_rc', v);
              }}
              editMode={editMode}
              colors={colors}
              textAlign={textAlign}
              placeholder="16/00-1234567B19"
            />

            <FormField
              label={t('storeSettings.nif')}
              value={form.tax_number || form.company_nif}
              onChangeText={(v: string) => {
                updateField('tax_number', v);
                updateField('company_nif', v);
              }}
              editMode={editMode}
              colors={colors}
              textAlign={textAlign}
              placeholder="001916012345678"
            />

            <FormField
              label={t('storeSettings.art')}
              value={form.company_art || form.tax_article}
              onChangeText={(v: string) => {
                updateField('company_art', v);
                updateField('tax_article', v);
              }}
              editMode={editMode}
              colors={colors}
              textAlign={textAlign}
              placeholder="16012345678"
            />

            <FormField
              label={t('storeSettings.nis')}
              value={form.company_ai || form.nis}
              onChangeText={(v: string) => {
                updateField('company_ai', v);
                updateField('nis', v);
              }}
              editMode={editMode}
              colors={colors}
              textAlign={textAlign}
              placeholder="001916010000000"
            />

            <FormField
              label={t('storeSettings.tvaRate')}
              value={String(form.tva_rate || '0')}
              onChangeText={(v: string) => updateField('tva_rate', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Percent size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="0.19"
            />
          </Card>
        )}

        {/* ── Tab 3: Invoicing & Receipt ────────────────────────── */}
        {activeTab === 'invoicing' && (
          <Card style={styles.tabCard}>
            <View style={[styles.tabHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.purple[50] }]}>
                <Receipt size={18} color={colors.purple[700]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.invoicingTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('storeSettings.invoicingTab')}
                </Text>
              </View>
            </View>

            <FormField
              label={t('common.currency')}
              value={form.base_currency || form.currency}
              onChangeText={(v: string) => {
                updateField('base_currency', v);
                updateField('currency', v);
              }}
              editMode={editMode}
              icon={<Coins size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="دج / DA"
            />

            <FormField
              label={t('storeSettings.invoicePrefix')}
              value={form.invoice_prefix}
              onChangeText={(v: string) => updateField('invoice_prefix', v)}
              editMode={editMode}
              colors={colors}
              textAlign={textAlign}
              placeholder="INV-"
            />

            <FormField
              label={t('storeSettings.startNumber')}
              value={String(form.invoice_start_number || '1')}
              onChangeText={(v: string) => updateField('invoice_start_number', v)}
              editMode={editMode}
              keyboardType="numeric"
              colors={colors}
              textAlign={textAlign}
              placeholder="1"
            />

            <FormField
              label={t('storeSettings.printWidth')}
              value={String(form.print_width_mm || '80')}
              onChangeText={(v: string) => updateField('print_width_mm', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Printer size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="80 or 58"
            />

            <FormField
              label={t('print.invoiceFooter')}
              value={form.receipt_footer}
              onChangeText={(v: string) => updateField('receipt_footer', v)}
              editMode={editMode}
              colors={colors}
              textAlign={textAlign}
              placeholder="Thank you for your visit!"
            />
          </Card>
        )}

        {/* ── Tab 4: System & Operations ────────────────────────── */}
        {activeTab === 'system' && (
          <Card style={styles.tabCard}>
            <View style={[styles.tabHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.emerald[50] }]}>
                <Sliders size={18} color={colors.emerald[700]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.systemTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('storeSettings.systemTab')}
                </Text>
              </View>
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.switchLabel, { color: colors.text.primary }]}>{t('storeSettings.quickSale')}</Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary }]}>{t('storeSettings.quickSale')}</Text>
              </View>
              <Switch
                value={Boolean(form.quick_sale)}
                onValueChange={(val) => updateField('quick_sale', val)}
                disabled={!editMode}
                thumbColor={form.quick_sale ? colors.primary[600] : '#ccc'}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.switchLabel, { color: colors.text.primary }]}>{t('storeSettings.allowNegativeStock')}</Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary }]}>{t('storeSettings.allowNegativeStock')}</Text>
              </View>
              <Switch
                value={Boolean(form.allow_negative_stock)}
                onValueChange={(val) => updateField('allow_negative_stock', val)}
                disabled={!editMode}
                thumbColor={form.allow_negative_stock ? colors.primary[600] : '#ccc'}
              />
            </View>

            <FormField
              label={t('storeSettings.dateFormat')}
              value={form.date_format || 'DD/MM/YYYY'}
              onChangeText={(v: string) => updateField('date_format', v)}
              editMode={editMode}
              icon={<Calendar size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
            />

            <FormField
              label={t('storeSettings.timezone')}
              value={form.timezone || 'Africa/Algiers'}
              onChangeText={(v: string) => updateField('timezone', v)}
              editMode={editMode}
              icon={<Clock size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
            />
          </Card>
        )}

        {/* ── Tab 5: Technical Diagnostics ─────────────────────── */}
        {activeTab === 'diagnostics' && (
          <Card style={styles.tabCard}>
            <View style={[styles.tabHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.indigo[50] }]}>
                <HardDrive size={18} color={colors.indigo[700]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.diagnosticsTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('storeSettings.diagnosticsTab')}
                </Text>
              </View>
            </View>

            <DiagnosticRow label={t('storeSettings.syncStatus')} value={appMode === 'connected' ? t('settings.connected') : t('settings.standalone')} colors={colors} />
            <DiagnosticRow label={t('settings.serverUrl')} value={serverUrl} colors={colors} />
            <DiagnosticRow label={t('settings.lastSync')} value={lastSyncTimestamp || '—'} colors={colors} />
            <DiagnosticRow label={t('storeSettings.fieldsCount')} value={`${Object.keys(form).length} keys`} colors={colors} />
            <DiagnosticRow label={t('settings.appMode')} value={appMode === 'connected' ? t('settings.connectedModeDesc') : t('settings.standaloneModeDesc')} colors={colors} />

            <View style={{ marginTop: 14, gap: 10 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary[600],
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  gap: 8,
                }}
                onPress={() => navigation.navigate('Pair', { initialTab: 'discover' })}
                activeOpacity={0.85}
              >
                <Radio size={16} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13, fontFamily: 'Cairo' }}>
                  {t('pair.changeDesktop')} ({t('pair.discoverTab')})
                </Text>
              </TouchableOpacity>

              {appMode === 'connected' && (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.danger.light,
                    borderColor: colors.danger.border,
                    borderWidth: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    gap: 8,
                  }}
                  onPress={async () => {
                    Alert.alert(
                      t('pair.unpair'),
                      'هل أنت متأكد من إلغاء الربط والتحويل للوضع المستقل؟',
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('pair.unpair'),
                          style: 'destructive',
                          onPress: async () => {
                            await session.clear();
                            await unifiedDB.switchToStandalone();
                            Alert.alert(t('common.success'), 'تم إلغاء الربط بنجاح.');
                            navigation.replace('Login');
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <AlertCircle size={16} color={colors.danger.main} />
                  <Text style={{ color: colors.danger.main, fontWeight: '700', fontSize: 13, fontFamily: 'Cairo' }}>
                    {t('pair.unpair')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}

        {/* Save button if in edit mode */}
        {editMode && (
          <View style={styles.bottomBar}>
            <Button
              title={t('storeSettings.saveAndSync')}
              variant="success"
              size="lg"
              icon={<Check size={18} color="#fff" />}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </View>
        )}
      </ScrollView>

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
    </View>
  );
};

/* ── Helper Components ────────────────────────────────────────── */

const TabButton = ({ active, title, icon, onPress, colors }: any) => (
  <TouchableOpacity
    style={[
      styles.tabBtn,
      {
        backgroundColor: active ? colors.primary[600] : colors.surface,
        borderColor: active ? colors.primary[600] : colors.border.default,
      },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon}
    <Text
      style={[
        styles.tabBtnText,
        {
          color: active ? '#fff' : colors.text.secondary,
          fontWeight: active ? '700' : '500',
        },
      ]}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

const FormField = ({
  label,
  value,
  onChangeText,
  editMode,
  keyboardType = 'default',
  icon,
  colors,
  textAlign = 'right',
  placeholder,
}: any) => (
  <View style={[styles.formField, { borderBottomColor: colors.border.subtle }]}>
    <View style={styles.formFieldHeader}>
      <Text style={[styles.formFieldLabel, { color: colors.text.secondary }]}>{label}</Text>
      {icon}
    </View>
    {editMode ? (
      <TextInput
        style={[
          styles.formInput,
          {
            color: colors.text.primary,
            backgroundColor: colors.inputBg,
            borderColor: colors.border.default,
            textAlign,
          },
        ]}
        value={String(value || '')}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.slate[400]}
      />
    ) : (
      <Text style={[styles.formValue, { color: colors.text.primary, textAlign }]}>
        {value || '—'}
      </Text>
    )}
  </View>
);

const DiagnosticRow = ({ label, value, colors }: any) => (
  <View style={[styles.diagRow, { backgroundColor: colors.surfaceSubtle }]}>
    <Text style={[styles.diagKey, { color: colors.text.secondary }]}>{label}</Text>
    <Text style={[styles.diagVal, { color: colors.text.primary }]}>{value}</Text>
  </View>
);

/* ── Styles ───────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontFamily: 'Cairo',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Cairo',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editToggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  editToggleBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  cancelBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Content */
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  /* Hero Card */
  heroCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  heroTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroTitleGroup: {
    flex: 1,
  },
  heroStoreName: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Cairo',
  },
  heroStoreAddress: {
    fontSize: 12,
    fontFamily: 'Cairo',
    marginTop: 2,
  },
  heroLogoTouchable: {
    position: 'relative',
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroLogoImg: {
    width: '100%',
    height: '100%',
  },
  heroCameraBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  heroDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
    marginBottom: 3,
  },
  heroStatValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  heroActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  /* Tabs */
  tabsScroll: {
    marginBottom: spacing.md,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },

  /* Tab Card */
  tabCard: {
    padding: spacing.md,
  },
  tabHeaderRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  tabSubtitle: {
    fontSize: 11,
    fontFamily: 'Cairo',
    marginTop: 1,
  },

  /* Store Logo Box in Tab */
  logoSectionCard: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  logoBoxTouchable: {
    position: 'relative',
  },
  logoBox: {
    width: 58,
    height: 58,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoPreviewImg: {
    width: '100%',
    height: '100%',
  },
  logoActionBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  logoInfoBox: {
    flex: 1,
    gap: 2,
  },
  logoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  logoDesc: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  smallLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
  smallLogoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Cairo',
    color: '#ffffff',
  },

  /* Form Fields */
  formField: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  formFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  formValue: {
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: 'Cairo',
  },
  formInput: {
    fontSize: 13.5,
    fontFamily: 'Cairo',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },

  /* Switch Row */
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  /* Diagnostics */
  diagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  diagKey: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },
  diagVal: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  bottomBar: {
    marginTop: spacing.lg,
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

export default StoreSettingsScreen;
