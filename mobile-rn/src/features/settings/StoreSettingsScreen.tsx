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
  const { t, isRTL } = useI18n();

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
      setLastSyncTimestamp(new Date().toLocaleTimeString('ar-DZ'));
    } catch (err: any) {
      console.warn('[StoreSettingsScreen] load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFetchingRemote(false);
    }
  }, []);

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
        setLastSyncTimestamp(new Date().toLocaleTimeString('ar-DZ'));
        Alert.alert(
          '✓ تم التحديث بنجاح',
          `تم جلب كامل بيانات وإعدادات المحل والضرائب من خادم سطح المكتب (${serverUrl})`
        );
      } else {
        Alert.alert('تنبيه الاتصال', res.error || 'تعذر الوصول إلى خادم سطح المكتب');
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل جلب الإعدادات من سطح المكتب');
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
          '✓ تم الحفظ بنجاح',
          appMode === 'connected'
            ? 'تم حفظ الإعدادات محلياً ومزامنتها مباشرة مع حاسوب سطح المكتب'
            : 'تم حفظ إعدادات المحل بنجاح في قاعدة البيانات المحلية'
        );
      } else {
        Alert.alert('خطأ', result.error || 'فشل حفظ الإعدادات');
      }
    } catch {
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الإعدادات');
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
          جاري تحميل بيانات وإعدادات المتجر...
        </Text>
      </View>
    );
  }

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
          <ArrowRight size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            بيانات وإعدادات المحل
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.tertiary }]}>
            {appMode === 'connected' ? `متصل بالحاسوب (${serverUrl})` : 'الوضع المستقل (بيانات محلية)'}
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
              <Text style={styles.editToggleBtnText}>تعديل</Text>
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
            <View style={styles.heroTitleGroup}>
              <Text style={[styles.heroStoreName, { color: colors.text.primary }]}>
                {form.shop_name || form.store_name || 'اسم المتجر غير محدد'}
              </Text>
              <Text style={[styles.heroStoreAddress, { color: colors.text.secondary }]}>
                {form.address || form.store_address || 'العنوان غير مدخل'}
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
              <Text style={[styles.heroStatLabel, { color: colors.text.tertiary }]}>حالة الربط</Text>
              <Badge variant={appMode === 'connected' ? 'emerald' : 'neutral'} size="xs" dot>
                {appMode === 'connected' ? 'متزامن مع الحاسوب' : 'محلي منفصل'}
              </Badge>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatLabel, { color: colors.text.tertiary }]}>العملة والضريبة</Text>
              <Text style={[styles.heroStatValue, { color: colors.text.primary }]}>
                {form.base_currency || 'دج'} • TVA: {form.tva_rate || 0}%
              </Text>
            </View>

            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatLabel, { color: colors.text.tertiary }]}>آخر مزامنة</Text>
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
                    سحب وتحديث كافة بيانات المحل من سطح المكتب الآن
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
            title="هوية المتجر"
            icon={<Store size={15} color={activeTab === 'identity' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('identity')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'fiscal'}
            title="الضرائب والسجل"
            icon={<FileText size={15} color={activeTab === 'fiscal' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('fiscal')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'invoicing'}
            title="الفواتير والطباعة"
            icon={<Receipt size={15} color={activeTab === 'invoicing' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('invoicing')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'system'}
            title="المالية والنظام"
            icon={<Sliders size={15} color={activeTab === 'system' ? '#fff' : colors.text.secondary} />}
            onPress={() => setActiveTab('system')}
            colors={colors}
          />
          <TabButton
            active={activeTab === 'diagnostics'}
            title="التشخيص والربط"
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary }]}>
                  المعلومات الأساسية وبيانات الاتصال
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary }]}>
                  تظهر هذه البيانات في ترويسة الفواتير والإيصالات وتقارير المبيعات
                </Text>
              </View>
            </View>

            <FormField
              label="اسم المحل / الشركة"
              value={form.shop_name || form.store_name}
              onChangeText={(v) => {
                updateField('shop_name', v);
                updateField('store_name', v);
              }}
              editMode={editMode}
              icon={<Store size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: سوبرماركت الأمانة"
            />

            <FormField
              label="النشاط التجاري / الوصف"
              value={form.shop_description}
              onChangeText={(v) => updateField('shop_description', v)}
              editMode={editMode}
              icon={<Info size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: بيع المواد الغذائية والتموينية بالجملة والتجزئة"
            />

            <FormField
              label="رقم الهاتف الأساسي"
              value={form.phone || form.store_phone}
              onChangeText={(v) => {
                updateField('phone', v);
                updateField('store_phone', v);
              }}
              editMode={editMode}
              keyboardType="phone-pad"
              icon={<Phone size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: 0555123456"
            />

            <FormField
              label="رقم الهاتف الثانوي"
              value={form.phone2 || form.shop_phone2}
              onChangeText={(v) => {
                updateField('phone2', v);
                updateField('shop_phone2', v);
              }}
              editMode={editMode}
              keyboardType="phone-pad"
              icon={<Phone size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: 021987654"
            />

            <FormField
              label="البريد الإلكتروني"
              value={form.email || form.store_email}
              onChangeText={(v) => {
                updateField('email', v);
                updateField('store_email', v);
              }}
              editMode={editMode}
              keyboardType="email-address"
              icon={<Mail size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: contact@store.dz"
            />

            <FormField
              label="العنوان والموقع"
              value={form.address || form.store_address}
              onChangeText={(v) => {
                updateField('address', v);
                updateField('store_address', v);
              }}
              editMode={editMode}
              icon={<MapPin size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: حي النور، شارع الاستقلال، الجزائر"
            />

            <FormField
              label="المدينة / الولاية"
              value={form.city}
              onChangeText={(v) => updateField('city', v)}
              editMode={editMode}
              icon={<MapPin size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: الجزائر العاصمة"
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary }]}>
                  البيانات القانونية والجبائية (Fiscal Data)
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary }]}>
                  المعلومات الرسمية المطابقة للمعايير الجبائية والتجارية
                </Text>
              </View>
            </View>

            <FormField
              label="السجل التجاري (RC)"
              value={form.commercial_register || form.company_rc}
              onChangeText={(v) => {
                updateField('commercial_register', v);
                updateField('company_rc', v);
              }}
              editMode={editMode}
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: 16/00-1234567B20"
            />

            <FormField
              label="الرقم التعريفي الجبائي (NIF)"
              value={form.tax_number || form.company_nif}
              onChangeText={(v) => {
                updateField('tax_number', v);
                updateField('company_nif', v);
              }}
              editMode={editMode}
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: 002016123456789"
            />

            <FormField
              label="رقم المادة الضريبية (Article)"
              value={form.company_art || form.tax_article}
              onChangeText={(v) => {
                updateField('company_art', v);
                updateField('tax_article', v);
              }}
              editMode={editMode}
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: 16123456789"
            />

            <FormField
              label="رقم التعريف الإحصائي (NIS / AI)"
              value={form.company_ai || form.nis}
              onChangeText={(v) => {
                updateField('company_ai', v);
                updateField('nis', v);
              }}
              editMode={editMode}
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="مثال: 001612345678901"
            />

            <FormField
              label="نسبة الضريبة الرسمية TVA (%)"
              value={String(form.tva_rate ?? 0)}
              onChangeText={(v) => updateField('tva_rate', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Percent size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="0 أو 19 أو 9"
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary }]}>
                  إعدادات الفواتير والطباعة الحرارية
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary }]}>
                  تخصيص هوية إيصالات البيع وتسلسل الأرقام وعرض الورق
                </Text>
              </View>
            </View>

            <FormField
              label="بادئة رقم الفاتورة (Prefix)"
              value={form.invoice_prefix || 'INV-'}
              onChangeText={(v) => updateField('invoice_prefix', v)}
              editMode={editMode}
              icon={<FileText size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="INV- أو FAC-"
            />

            <FormField
              label="رقم بداية تسلسل الفواتير"
              value={String(form.invoice_start_number ?? 1)}
              onChangeText={(v) => updateField('invoice_start_number', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Hash size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="1"
            />

            <FormField
              label="عرض ورق الطابعة الحرارية (mm)"
              value={String(form.print_width_mm || 80)}
              onChangeText={(v) => updateField('print_width_mm', v)}
              editMode={editMode}
              keyboardType="numeric"
              icon={<Printer size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="80 أو 58"
            />

            <FormField
              label="لغة الفاتورة الافتراضية"
              value={form.print_language === 'fr' ? 'الفرنسية (Français)' : form.print_language === 'en' ? 'الإنجليزية (English)' : 'العربية (Arabic)'}
              onChangeText={(v) => updateField('print_language', v)}
              editMode={editMode}
              icon={<Sliders size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="ar أو fr أو en"
            />

            <FormField
              label="نص ترويسة الفاتورة (Header Note)"
              value={form.receipt_header}
              onChangeText={(v) => updateField('receipt_header', v)}
              editMode={editMode}
              icon={<Info size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="نص يظهر في أعلى الفاتورة (اختياري)"
            />

            <FormField
              label="نص تذييل الفاتورة (Footer Note)"
              value={form.receipt_footer || 'شكراً لتسوقكم معنا'}
              onChangeText={(v) => updateField('receipt_footer', v)}
              editMode={editMode}
              multiline
              icon={<Info size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="شكراً لزيارتكم • البضاعة المباعة تستبدل خلال 48 ساعة"
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary }]}>
                  الخيارات المالية والنظام
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary }]}>
                  العملات وسياسات البيع والمخزون والتوقيت
                </Text>
              </View>
            </View>

            <FormField
              label="العملة الأساسية"
              value={form.base_currency || form.currency || 'دج'}
              onChangeText={(v) => {
                updateField('base_currency', v);
                updateField('currency', v);
              }}
              editMode={editMode}
              icon={<Coins size={16} color={colors.text.tertiary} />}
              colors={colors}
              placeholder="دج أو DZD"
            />

            <View style={[styles.switchRow, { borderBottomColor: colors.border.subtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text.primary }]}>
                  تفعيل البيع السريع افتراضياً
                </Text>
                <Text style={[styles.switchSub, { color: colors.text.tertiary }]}>
                  إضافة المنتجات فور مسح الباركود دون تأكيد الكمية
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text.primary }]}>
                  السماح بالبيع بالسالب (دون رصيد مخزون)
                </Text>
                <Text style={[styles.switchSub, { color: colors.text.tertiary }]}>
                  إتمام فواتير البيع حتى لو كانت كمية المنتج في المخزن 0
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
              label="صيغة التاريخ"
              value={form.date_format || 'DD/MM/YYYY'}
              onChangeText={(v) => updateField('date_format', v)}
              editMode={editMode}
              icon={<Calendar size={16} color={colors.text.tertiary} />}
              colors={colors}
            />

            <FormField
              label="المنطقة الزمنية"
              value={form.timezone || 'Africa/Algiers'}
              onChangeText={(v) => updateField('timezone', v)}
              editMode={editMode}
              icon={<Clock size={16} color={colors.text.tertiary} />}
              colors={colors}
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.tabTitle, { color: colors.text.primary }]}>
                  فحص الربط ومطابقة البيانات
                </Text>
                <Text style={[styles.tabSubtitle, { color: colors.text.tertiary }]}>
                  معاينة كائن الإعدادات الكامل المخزن في SQLite وربط HTTP
                </Text>
              </View>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>وضع التشغيل:</Text>
              <Text style={[styles.diagVal, { color: colors.text.primary }]}>{appMode}</Text>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>خادم سطح المكتب:</Text>
              <Text style={[styles.diagVal, { color: colors.text.primary }]}>{serverUrl}</Text>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>إجمالي الحقول:</Text>
              <Text style={[styles.diagVal, { color: colors.text.primary }]}>
                {Object.keys(form).length} حقل إعداد
              </Text>
            </View>

            <View style={[styles.diagRow, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50] }]}>
              <Text style={[styles.diagKey, { color: colors.text.secondary }]}>محرك التخزين:</Text>
              <Text style={[styles.diagVal, { color: colors.emerald[600] }]}>
                AnposSQLite + UnifiedDB Dual Cache
              </Text>
            </View>

            <Button
              title="إعادة فحص وسحب البيانات من الحاسوب"
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
              title="حفظ ومزامنة التعديلات"
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
        textAlign="right"
      />
    ) : (
      <Text style={[styles.formValue, { color: colors.text.primary }]}>
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
    alignItems: 'flex-end',
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
    alignItems: 'flex-end',
  },
  heroStoreName: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  heroStoreAddress: {
    fontSize: 12,
    fontFamily: 'Cairo',
    marginTop: 2,
    textAlign: 'right',
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
    textAlign: 'right',
  },
  tabSubtitle: {
    fontSize: 11,
    fontFamily: 'Cairo',
    textAlign: 'right',
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
    textAlign: 'right',
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
    textAlign: 'right',
  },
  switchSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
    textAlign: 'right',
    marginTop: 2,
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
