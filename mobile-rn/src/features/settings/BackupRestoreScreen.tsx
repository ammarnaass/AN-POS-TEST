import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  RefreshControl,
} from 'react-native';
import {
  HardDrive,
  Download,
  Upload,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Package,
  Image as ImageIcon,
  Layers,
  Receipt,
  FileJson,
  Wifi,
  Sparkles,
  X,
  Database,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import {
  getMobileLiveStats,
  generateMobileBackup,
  inspectBackupContent,
  executeMobileRestore,
  fetchBackupFromDesktop,
  type MobileLiveStats,
  type MobileBackupInspection,
} from '@/services/backup/backupService';

export const BackupRestoreScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, alignItems } = useI18n();

  // الحالة العامة
  const [stats, setStats] = useState<MobileLiveStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fetchingLan, setFetchingLan] = useState(false);

  // حالة استرجاع النسخة
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [showJsonInputBox, setShowJsonInputBox] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<MobileBackupInspection | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'clean'>('merge');
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getMobileLiveStats();
      setStats(data);
    } catch (err) {
      console.warn('Failed to load mobile stats:', err);
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  // تصدير نسخة احتياطية شاملة
  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const backup = await generateMobileBackup();
      const dateStr = new Date().toISOString().slice(0, 10);
      const jsonStr = JSON.stringify(backup, null, 2);

      await Share.share({
        title: `an-pos-backup-${dateStr}.anpos.json`,
        message: jsonStr,
      });

      Alert.alert(
        'تم التصدير بنجاح',
        `تم تجهيز النسخة الاحتياطية (${backup.metadata.stats.productsCount} منتج، ${backup.metadata.stats.imagesCount} صورة محفوظة، ${backup.metadata.stats.totalSizeEstMB} ميغابايت)`
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'فشل تصدير النسخة الاحتياطية');
    } finally {
      setExporting(false);
    }
  };

  // جلب نسخة مباشرة من الكمبيوتر المقترن عبر الشبكة
  const handleFetchFromDesktop = async () => {
    setFetchingLan(true);
    try {
      const res = await fetchBackupFromDesktop();
      if (!res.success || !res.backup) {
        Alert.alert('تنبيه الاقتران', res.error || 'تعذر جلب النسخة من الكمبيوتر');
        return;
      }

      // فحص النسخة المستلمة وعرض نافذة المعاينة
      const jsonStr = JSON.stringify(res.backup);
      const inspection = inspectBackupContent(jsonStr);
      if (!inspection.valid) {
        Alert.alert(t('common.error'), inspection.error || 'ملف غير صالح');
        return;
      }

      setInspectionResult(inspection);
      setShowModal(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'فشل الاتصال بالكمبيوتر');
    } finally {
      setFetchingLan(false);
    }
  };

  // فحص النص الملصق قبل الاسترجاع
  const handleInspectPastedJson = () => {
    if (!rawJsonInput.trim()) {
      Alert.alert(t('common.warning'), 'يرجى لصق محتوى ملف النسخة الاحتياطية أولاً');
      return;
    }

    const inspection = inspectBackupContent(rawJsonInput.trim());
    if (!inspection.valid) {
      Alert.alert(t('common.error'), inspection.error || 'الملف لا يحتوي على صيغة JSON صالحة');
      return;
    }

    setInspectionResult(inspection);
    setShowModal(true);
  };

  // تأكيد وتنفيذ الاسترجاع
  const handleConfirmRestore = async () => {
    if (!inspectionResult) return;

    setRestoring(true);
    setRestoreProgress('جاري تحضير الاستعادة...');

    try {
      // 1. أخذ نسخة أمان إذا تم طلبها
      if (createSafetyBackup) {
        setRestoreProgress('جاري أخذ نسخة وقائية سريعة...');
        try {
          const safety = await generateMobileBackup();
          await Share.share({
            title: `safety-backup-${Date.now()}.anpos.json`,
            message: JSON.stringify(safety),
          });
        } catch {
          // المتابعة في حال تخطي المشاركة
        }
      }

      // 2. تطبيق الاستعادة
      setRestoreProgress('جاري كتابة السجلات وتثبيت صور المنتجات...');
      const res = await executeMobileRestore(
        { data: inspectionResult.parsedData },
        restoreMode
      );

      // 3. تحديث الإحصائيات
      setRestoreProgress('جاري تحديث النظام...');
      await loadStats();

      setShowModal(false);
      setInspectionResult(null);
      setRawJsonInput('');
      setShowJsonInputBox(false);

      const totalCount = Object.values(res.importedCounts).reduce((a, b) => a + b, 0);

      Alert.alert(
        t('common.success'),
        `تم استرجاع النسخة بنجاح! تم تثبيت ${totalCount} سجل شاملة صور المنتجات وإعدادات المتجر.`
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'فشل استرجاع النسخة الاحتياطية');
    } finally {
      setRestoring(false);
      setRestoreProgress('');
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.headerBackBtn, { backgroundColor: isDark ? colors.surfaceElevated : '#f1f5f9' }]}
          onPress={() => navigation.goBack()}
        >
          <BackIcon size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>النسخ الاحتياطي والاستعادة</Text>
        <TouchableOpacity
          style={[styles.headerRefreshBtn, { backgroundColor: isDark ? colors.surfaceElevated : '#f1f5f9' }]}
          onPress={loadStats}
          disabled={loadingStats}
        >
          <RefreshCw size={18} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner with stats */}
        <View style={[styles.banner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderColor: colors.primary[200] || '#bfdbfe' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary[600] }]}>
              <HardDrive size={22} color="#fff" />
            </View>
            <View style={{ flex: 1, alignItems }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.bannerTitle, { color: colors.text.primary }]}>مركز البيانات والنسخ الاحتياطي</Text>
                <View style={styles.badgeImages}>
                  <ShieldCheck size={12} color="#10b981" />
                  <Text style={styles.badgeImagesText}>الصور محفوظة 100%</Text>
                </View>
              </View>
              <Text style={[styles.bannerSub, { color: colors.text.secondary, textAlign }]}>
                حفظ شامل لكافة الجداول الـ 25 وصور المنتجات وشعار المتجر وعبوات الجملة.
              </Text>
            </View>
          </View>

          {/* Quick Metrics Grid */}
          <View style={[styles.metricsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
              <Package size={14} color={colors.primary[600]} />
              <Text style={[styles.metricVal, { color: colors.text.primary }]}>{stats?.productsCount ?? 0}</Text>
              <Text style={[styles.metricLbl, { color: colors.text.tertiary }]}>منتج</Text>
            </View>

            <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
              <ImageIcon size={14} color="#10b981" />
              <Text style={[styles.metricVal, { color: '#10b981' }]}>{stats?.imagesCount ?? 0}</Text>
              <Text style={[styles.metricLbl, { color: colors.text.tertiary }]}>صورة</Text>
            </View>

            <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
              <Layers size={14} color="#6366f1" />
              <Text style={[styles.metricVal, { color: colors.text.primary }]}>{stats?.packsCount ?? 0}</Text>
              <Text style={[styles.metricLbl, { color: colors.text.tertiary }]}>عبوة</Text>
            </View>

            <View style={[styles.metricItem, { backgroundColor: colors.surface }]}>
              <Receipt size={14} color="#f43f5e" />
              <Text style={[styles.metricVal, { color: colors.text.primary }]}>{stats?.salesCount ?? 0}</Text>
              <Text style={[styles.metricLbl, { color: colors.text.tertiary }]}>فاتورة</Text>
            </View>
          </View>
        </View>

        {/* Action Cards */}
        <View style={{ gap: 14, paddingHorizontal: 16 }}>
          {/* Card 1: Comprehensive Export */}
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.actionIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}>
                <Download size={22} color={colors.primary[600]} />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.cardTitle, { color: colors.text.primary, textAlign }]}>تصدير نسخة احتياطية شاملة</Text>
                <Text style={[styles.cardDesc, { color: colors.text.secondary, textAlign }]}>
                  حفظ كافة بيانات المتجر وصور الأصناف المرمزة داخل ملف واحد بصيغة JSON لمشاركتها أو حفظها في السحابة.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary[600] }]}
              onPress={handleExportBackup}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Download size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>تصدير وحفظ النسخة الآن</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Card 2: LAN Direct Fetch from Desktop */}
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.primary[300] || '#93c5fd' }]}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.actionIconWrap, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff' }]}>
                <Wifi size={22} color="#6366f1" />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.cardTitle, { color: colors.text.primary, textAlign }]}>جلب نسخة من الكمبيوتر (LAN)</Text>
                  <View style={[styles.badgeLan, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                    <Sparkles size={10} color="#6366f1" />
                    <Text style={[styles.badgeLanText, { color: "#6366f1" }]}>مزامنة فورية</Text>
                  </View>
                </View>
                <Text style={[styles.cardDesc, { color: colors.text.secondary, textAlign }]}>
                  تنزيل أحدث نسخة احتياطية كاملة مباشرة من برنامج الكمبيوتر المقترن عبر شبكة Wi-Fi بنقرة واحدة.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: '#6366f1', backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#f5f3ff' }]}
              onPress={handleFetchFromDesktop}
              disabled={fetchingLan}
              activeOpacity={0.85}
            >
              {fetchingLan ? (
                <ActivityIndicator color="#6366f1" />
              ) : (
                <>
                  <Wifi size={16} color="#6366f1" />
                  <Text style={[styles.secondaryBtnText, { color: '#6366f1' }]}>جلب النسخة من الكمبيوتر الآن</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Card 3: Import from JSON File / Text */}
          <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
            <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.actionIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}>
                <Upload size={22} color="#10b981" />
              </View>
              <View style={{ flex: 1, alignItems }}>
                <Text style={[styles.cardTitle, { color: colors.text.primary, textAlign }]}>استرجاع من ملف أو نص JSON</Text>
                <Text style={[styles.cardDesc, { color: colors.text.secondary, textAlign }]}>
                  استيراد بيانات نسخة سابقة مع الفحص الدقيق للمحتوى قبل إدخاله في قاعدة البيانات.
                </Text>
              </View>
            </View>

            {showJsonInputBox ? (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  style={[
                    styles.jsonTextInput,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc',
                      borderColor: colors.border.default,
                      color: colors.text.primary,
                    },
                  ]}
                  placeholder="الصق نص ملف النسخة الاحتياطية هنا..."
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={4}
                  value={rawJsonInput}
                  onChangeText={setRawJsonInput}
                />

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1, backgroundColor: '#10b981' }]}
                    onPress={handleInspectPastedJson}
                  >
                    <CheckCircle2 size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>فحص ومعاينة النسخة</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border.default }]}
                    onPress={() => setShowJsonInputBox(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.text.secondary }]}>إلغاء</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: '#10b981', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5' }]}
                onPress={() => setShowJsonInputBox(true)}
                activeOpacity={0.85}
              >
                <Upload size={16} color="#10b981" />
                <Text style={[styles.secondaryBtnText, { color: '#10b981' }]}>لصق واسترجاع نسخة احتياطية</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal: Inspection & Confirmation before Restore */}
      {showModal && inspectionResult && (
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => setShowModal(false)} disabled={restoring}>
                  <X size={20} color={colors.text.secondary} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>معاينة محتويات النسخة الاحتياطية</Text>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Meta details */}
                <View style={[styles.modalMetaRow, { backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color={colors.primary[600]} />
                    <Text style={[styles.metaText, { color: colors.text.secondary }]}>
                      تاريخ النسخة: {inspectionResult.summary.exportDate ? new Date(inspectionResult.summary.exportDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                    </Text>
                  </View>
                  <Text style={[styles.metaText, { color: colors.primary[600], fontWeight: 'bold' }]}>
                    {inspectionResult.summary.sourceEnv === 'mobile' ? 'تطبيق هاتف' : 'سطح المكتب (Desktop)'}
                  </Text>
                </View>

                {/* Summary Grid */}
                <Text style={[styles.sectionTitle, { color: colors.text.primary, textAlign }]}>
                  السجلات المكتشفة بالملف:
                </Text>

                <View style={styles.inspectGrid}>
                  <View style={[styles.inspectItem, { backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}>
                    <Text style={[styles.inspectLbl, { color: colors.text.secondary }]}>المنتجات</Text>
                    <Text style={[styles.inspectVal, { color: colors.text.primary }]}>
                      {inspectionResult.summary.productsCount}
                    </Text>
                  </View>

                  <View style={[styles.inspectItem, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                    <Text style={[styles.inspectLbl, { color: '#10b981' }]}>الصور المحفوظة</Text>
                    <Text style={[styles.inspectVal, { color: '#10b981' }]}>
                      {inspectionResult.summary.imagesCount}
                    </Text>
                  </View>

                  <View style={[styles.inspectItem, { backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}>
                    <Text style={[styles.inspectLbl, { color: colors.text.secondary }]}>عبوات الجملة</Text>
                    <Text style={[styles.inspectVal, { color: colors.text.primary }]}>
                      {inspectionResult.summary.packsCount}
                    </Text>
                  </View>

                  <View style={[styles.inspectItem, { backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}>
                    <Text style={[styles.inspectLbl, { color: colors.text.secondary }]}>فواتير البيع</Text>
                    <Text style={[styles.inspectVal, { color: colors.text.primary }]}>
                      {inspectionResult.summary.salesCount}
                    </Text>
                  </View>
                </View>

                {/* Restore Mode Selection */}
                <Text style={[styles.sectionTitle, { color: colors.text.primary, textAlign, marginTop: 14 }]}>
                  طريقة الاسترجاع:
                </Text>

                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.modeOption,
                      restoreMode === 'merge' && { borderColor: colors.primary[600], backgroundColor: 'rgba(59, 130, 246, 0.06)' },
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => setRestoreMode('merge')}
                  >
                    <View style={[styles.radioCircle, restoreMode === 'merge' && { borderColor: colors.primary[600] }]}>
                      {restoreMode === 'merge' && <View style={[styles.radioInner, { backgroundColor: colors.primary[600] }]} />}
                    </View>
                    <View style={{ flex: 1, alignItems }}>
                      <Text style={[styles.modeTitle, { color: colors.text.primary }]}>دمج ذكي (Smart Merge - مستحسن)</Text>
                      <Text style={[styles.modeDesc, { color: colors.text.secondary, textAlign }]}>
                        تحديث وإضافة السجلات الواردة دون مسح أي بيانات سابقة أخرى.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeOption,
                      restoreMode === 'clean' && { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.06)' },
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => setRestoreMode('clean')}
                  >
                    <View style={[styles.radioCircle, restoreMode === 'clean' && { borderColor: '#ef4444' }]}>
                      {restoreMode === 'clean' && <View style={[styles.radioInner, { backgroundColor: '#ef4444' }]} />}
                    </View>
                    <View style={{ flex: 1, alignItems }}>
                      <Text style={[styles.modeTitle, { color: '#ef4444' }]}>استبدال كامل (Clean Replace)</Text>
                      <Text style={[styles.modeDesc, { color: colors.text.secondary, textAlign }]}>
                        مسح الجداول الحالية بالكامل والاستبدال بنسخة الملف.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Safety Backup Checkbox */}
                <TouchableOpacity
                  style={[styles.safetyRow, { backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setCreateSafetyBackup(!createSafetyBackup)}
                >
                  <View style={[styles.checkbox, createSafetyBackup && { backgroundColor: colors.primary[600], borderColor: colors.primary[600] }]}>
                    {createSafetyBackup && <CheckCircle2 size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.safetyText, { color: colors.text.primary }]}>
                    أخذ نسخة احتياطية وقائية قبل بدء الاسترجاع
                  </Text>
                </TouchableOpacity>

                {restoring && (
                  <View style={styles.progressBox}>
                    <ActivityIndicator size="small" color={colors.primary[600]} />
                    <Text style={[styles.progressText, { color: colors.primary[600] }]}>{restoreProgress}</Text>
                  </View>
                )}
              </ScrollView>

              {/* Modal Actions */}
              <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { flex: 1, borderColor: colors.border.default }]}
                  onPress={() => setShowModal(false)}
                  disabled={restoring}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text.secondary }]}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 2, backgroundColor: colors.primary[600] }]}
                  onPress={handleConfirmRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>تأكيد واسترجاع البيانات</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerRefreshBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },

  scroll: { flex: 1, paddingVertical: 12 },
  banner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 15, fontWeight: 'bold' },
  bannerSub: { fontSize: 12, marginTop: 2 },
  badgeImages: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeImagesText: { fontSize: 10, color: '#10b981', fontWeight: 'bold' },

  metricsGrid: { gap: 8, marginTop: 6 },
  metricItem: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  metricVal: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  metricLbl: { fontSize: 10 },

  actionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  actionIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: 'bold' },
  cardDesc: { fontSize: 11, marginTop: 2, lineHeight: 16 },

  badgeLan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeLanText: { fontSize: 10, fontWeight: 'bold' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: 'bold' },

  cancelBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelBtnText: { fontSize: 13, fontWeight: 'bold' },

  jsonTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    fontFamily: 'monospace',
    height: 80,
    textAlignVertical: 'top',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '90%' },
  modalHeader: { alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 10 },
  modalTitle: { fontSize: 15, fontWeight: 'bold' },

  modalMetaRow: { justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 8, marginBottom: 10 },
  metaText: { fontSize: 11 },

  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  inspectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  inspectItem: { width: '48%', padding: 10, borderRadius: 8, alignItems: 'center' },
  inspectLbl: { fontSize: 10 },
  inspectVal: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },

  modeOption: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  modeTitle: { fontSize: 12, fontWeight: 'bold' },
  modeDesc: { fontSize: 10, marginTop: 1 },

  safetyRow: { alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginTop: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  safetyText: { fontSize: 11, fontWeight: '500' },

  progressBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, marginTop: 10 },
  progressText: { fontSize: 12, fontWeight: 'bold' },

  modalActions: { gap: 8, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
});

export default BackupRestoreScreen;
