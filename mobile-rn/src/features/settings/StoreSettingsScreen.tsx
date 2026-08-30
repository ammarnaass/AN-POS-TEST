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
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Card, Badge, Button } from '@/components/ui';
import { session } from '@/lib/apiClient';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';
import {
  getStoreSettings,
  fetchStoreSettingsFromDesktop,
  saveStoreSettings,
  type StoreSettings,
} from '@/lib/settingService';

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
      };

      const result = await saveStoreSettings(patch);
      if (result.success) {
        setSettings(form as StoreSettings);
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
          <View style={styles.heroTopRow}>
            <View style={[styles.heroTitleGroup, { alignItems }]}>
              <Text style={[styles.heroStoreName, { color: colors.text.primary, textAlign }]}>
                {form.shop_name || form.store_name || t('storeSettings.shopName')}
              </Text>
              <Text style={[styles.heroStoreAddress, { color: colors.text.secondary, textAlign }]}>
                {form.address || form.store_address || t('storeSettings.address')}
              </Text>
            </View>
            <View
              style={[
                styles.heroAvatar,
                {
                  backgroundColor: appMode === 'connected' ? colors.emerald[50] : colors.primary[50],
                  borderColor: appMode === 'connected' ? colors.emerald[200] : colors.primary[200],
                },
              ]}
            >
              <Store
                size={24}
                color={appMode === 'connected' ? colors.emerald[600] : colors.primary[600]}
              />
            </View>
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
            <View style={styles.tabHeaderRow}>
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
              placeholder="Alger, Algérie"
            />

            <FormField
              label={t('storeSettings.city')}
              value={form.city}
              onChangeText={(v: string) => updateField('city', v)}
              editMode={editMode}
              icon={<MapPin size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="Alger"
            />
          </Card>
        )}

        {/* ── Tab 2: Fiscal & Legal ────────────────────────────── */}
        {activeTab === 'fiscal' && (
          <Card style={styles.tabCard}>
            <View style={styles.tabHeaderRow}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.purple[50] }]}>
                <FileText size={18} color={colors.purple[600]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.fiscalTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('storeSettings.subtitle')}
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
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="16/00-1234567B20"
            />

            <FormField
              label={t('storeSettings.nif')}
              value={form.tax_number || form.company_nif}
              onChangeText={(v: string) => {
                updateField('tax_number', v);
                updateField('company_nif', v);
              }}
              editMode={editMode}
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="002016123456789"
            />

            <FormField
              label={t('storeSettings.art')}
              value={form.company_art || form.tax_article}
              onChangeText={(v: string) => {
                updateField('company_art', v);
                updateField('tax_article', v);
              }}
              editMode={editMode}
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="16123456789"
            />

            <FormField
              label={t('storeSettings.nis')}
              value={form.company_ai || form.nis}
              onChangeText={(v: string) => {
                updateField('company_ai', v);
                updateField('nis', v);
              }}
              editMode={editMode}
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="001612345678901"
            />

            <FormField
              label={t('storeSettings.tvaRate')}
              value={String(form.tva_rate ?? 0)}
              onChangeText={(v: string) => updateField('tva_rate', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Percent size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="0 / 19 / 9"
            />
          </Card>
        )}

        {/* ── Tab 3: Invoicing & Printing ──────────────────────── */}
        {activeTab === 'invoicing' && (
          <Card style={styles.tabCard}>
            <View style={styles.tabHeaderRow}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.warning.light }]}>
                <Receipt size={18} color={colors.warning.dark} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.invoicingTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('printTemplates.subtitle')}
                </Text>
              </View>
            </View>

            <FormField
              label={t('storeSettings.invoicePrefix')}
              value={form.invoice_prefix || 'INV-'}
              onChangeText={(v: string) => updateField('invoice_prefix', v)}
              editMode={editMode}
              icon={<FileText size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="INV- / FAC-"
            />

            <FormField
              label={t('storeSettings.startNumber')}
              value={String(form.invoice_start_number ?? 1)}
              onChangeText={(v: string) => updateField('invoice_start_number', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="1"
            />

            <FormField
              label={t('storeSettings.printWidth')}
              value={String(form.print_width_mm || 80)}
              onChangeText={(v: string) => updateField('print_width_mm', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Printer size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="80 / 58"
            />

            <FormField
              label={t('storeSettings.printLang')}
              value={form.print_language === 'fr' ? 'Français' : form.print_language === 'en' ? 'English' : 'العربية'}
              onChangeText={(v: string) => updateField('print_language', v)}
              editMode={editMode}
              icon={<Sliders size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="ar / fr / en"
            />

            <FormField
              label={t('print.invoiceHeader')}
              value={form.receipt_header}
              onChangeText={(v: string) => updateField('receipt_header', v)}
              editMode={editMode}
              icon={<Info size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="Header note..."
            />

            <FormField
              label={t('print.invoiceFooter')}
              value={form.receipt_footer || 'Merci pour votre visite'}
              onChangeText={(v: string) => updateField('receipt_footer', v)}
              editMode={editMode}
              multiline
              icon={<Info size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="Thank you for your visit..."
            />
          </Card>
        )}

        {/* ── Tab 4: System & Operations ───────────────────────── */}
        {activeTab === 'system' && (
          <Card style={styles.tabCard}>
            <View style={styles.tabHeaderRow}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.emerald[50] }]}>
                <Coins size={18} color={colors.emerald[600]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.systemTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('storeSettings.subtitle')}
                </Text>
              </View>
            </View>

            <FormField
              label={t('common.currency')}
              value={form.base_currency || form.currency || t('common.currency')}
              onChangeText={(v: string) => {
                updateField('base_currency', v);
                updateField('currency', v);
              }}
              editMode={editMode}
              icon={<Coins size={16} color={colors.text.tertiary} />}
              colors={colors}
              textAlign={textAlign}
              placeholder="DA / DZD"
            />

            <View style={[styles.switchRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.switchLabel, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.quickSale')}
                </Text>
              </View>
              <Switch
                value={Boolean(form.quick_sale)}
                onValueChange={(v) => updateField('quick_sale', v ? 1 : 0)}
                disabled={!editMode}
                trackColor={{ false: colors.slate[200], true: colors.primary[500] }}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.switchLabel, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.allowNegativeStock')}
                </Text>
              </View>
              <Switch
                value={Boolean(form.allow_negative_stock)}
                onValueChange={(v) => updateField('allow_negative_stock', v ? 1 : 0)}
                disabled={!editMode}
                trackColor={{ false: colors.slate[200], true: colors.primary[500] }}
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

        {/* ── Tab 5: Diagnostics & Live Data ───────────────────── */}
        {activeTab === 'diagnostics' && (
          <Card style={styles.tabCard}>
            <View style={styles.tabHeaderRow}>
              <View style={[styles.tabHeaderIcon, { backgroundColor: colors.primary[50] }]}>
                <HardDrive size={18} color={colors.primary[600]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary, textAlign }]}>
                  {t('storeSettings.diagnosticsTab')}
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary, textAlign }]}>
                  {t('settings.systemConfig')}
                </Text>
              </View>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>{t('settings.appMode')}:</Text>
              <Text style={[styles.diagVal, { color: colors.text.primary }]}>{appMode}</Text>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>{t('settings.serverUrl')}:</Text>
              <Text style={[styles.diagVal, { color: colors.text.primary }]}>{serverUrl}</Text>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>{t('storeSettings.fieldsCount')}:</Text>
              <Text style={[styles.diagVal, { color: colors.text.primary }]}>
                {Object.keys(form).length}
              </Text>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>Engine:</Text>
              <Text style={[styles.diagVal, { color: colors.emerald[600] }]}>
                AnposSQLite + UnifiedDB
              </Text>
            </View>

            <Button
              title={t('storeSettings.fetchFromDesktop')}
              variant="primary"
              size="md"
              loading={fetchingRemote}
              icon={<RefreshCw size={16} color="#fff" />}
              onPress={handleFetchFromDesktop}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* ── Bottom CTA ───────────────────────────────────────── */}
        {editMode && (
          <View style={styles.bottomBar}>
            <Button
              title={t('storeSettings.saveAndSync')}
              variant="primary"
              size="lg"
              loading={saving}
              icon={<Check size={18} color="#fff" />}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

/* ── Helper Components ───────────────────────────────────────── */

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
    activeOpacity={0.75}
  >
    {icon}
    <Text
      style={[
        styles.tabBtnText,
        {
          color: active ? '#ffffff' : colors.text.secondary,
          fontWeight: active ? '800' : '600',
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
  placeholder,
  keyboardType = 'default',
  multiline = false,
  icon,
  colors,
  textAlign = 'right',
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
          multiline && { height: 72, textAlignVertical: 'top' },
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border.default,
            color: colors.text.primary,
          },
        ]}
        value={value || ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.slate[400]}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlign={textAlign}
      />
    ) : (
      <Text style={[styles.formValue, { color: colors.text.primary, textAlign }]}>
        {value ? String(value) : '—'}
      </Text>
    )}
  </View>
);

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
    fontWeight: '600',
  },

  /* App Bar */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
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
    gap: 6,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
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
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    width: 36,
    height: 36,
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
    paddingBottom: spacing.xxxl + spacing.xl,
  },

  /* Hero Card */
  heroCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroTitleGroup: {
    flex: 1,
  },
  heroStoreName: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  heroStoreAddress: {
    fontSize: 12,
    fontFamily: 'Cairo',
    marginTop: 2,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
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
});

export default StoreSettingsScreen;
