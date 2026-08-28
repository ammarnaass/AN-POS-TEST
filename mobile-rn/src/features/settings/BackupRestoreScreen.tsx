import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import {
  HardDrive,
  Download,
  Upload,
  ArrowRight,
  ShieldAlert,
  Check,
  RefreshCw,
  Copy,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';

export const BackupRestoreScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [showRestoreBox, setShowRestoreBox] = useState(false);

  const handleExportBackup = async () => {
    setLoading(true);
    try {
      await ensureInit();
      const [
        products,
        categories,
        customers,
        suppliers,
        sales,
        purchases,
        expenses,
        cashSessions,
        promotions,
        packs,
        settings,
      ] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.sales.toArray(),
        db.purchases.toArray(),
        db.expenses.toArray(),
        db.cashSessions.toArray(),
        db.promotions.toArray(),
        db.packs.toArray(),
        db.settings.toArray(),
      ]);

      const backupData = {
        appName: 'AN POS Mobile',
        version: '3.0.0',
        exportDate: new Date().toISOString(),
        data: {
          products,
          categories,
          customers,
          suppliers,
          sales,
          purchases,
          expenses,
          cashSessions,
          promotions,
          packs,
          settings,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);

      await Share.share({
        title: `AN-POS-Backup-${new Date().toISOString().slice(0, 10)}.json`,
        message: jsonStr,
      });
    } catch (err) {
      Alert.alert('خطأ', `فشل تصدير النسخة الاحتياطية: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setLoading(false);
  };

  const handleRestoreBackup = async () => {
    if (!jsonInput.trim()) {
      Alert.alert('تنبيه', 'يرجى لصق بيانات النسخة الاحتياطية JSON في الحقل المخصص');
      return;
    }

    Alert.alert(
      'تأكيد استعادة البيانات',
      'سيتم دمج واسترجاع كافة السجلات الموجودة في ملف النسخة الاحتياطية إلى قاعدة البيانات الحالية.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استعادة الآن',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const parsed = JSON.parse(jsonInput);
              if (!parsed.data) {
                throw new Error('صيغة ملف النسخة الاحتياطية غير صالحة');
              }
              const d = parsed.data;

              await ensureInit();

              if (d.products?.length) await db.products.bulkPut(d.products);
              if (d.categories?.length) await db.categories.bulkPut(d.categories);
              if (d.customers?.length) await db.customers.bulkPut(d.customers);
              if (d.suppliers?.length) await db.suppliers.bulkPut(d.suppliers);
              if (d.sales?.length) await db.sales.bulkPut(d.sales);
              if (d.purchases?.length) await db.purchases.bulkPut(d.purchases);
              if (d.expenses?.length) await db.expenses.bulkPut(d.expenses);
              if (d.cashSessions?.length) await db.cashSessions.bulkPut(d.cashSessions);
              if (d.promotions?.length) await db.promotions.bulkPut(d.promotions);
              if (d.packs?.length) await db.packs.bulkPut(d.packs);
              if (d.settings?.length) await db.settings.bulkPut(d.settings);

              Alert.alert('تمت العملية بنجاح ✓', 'تمت استعادة كافة البيانات والمنتجات بنجاح.');
              setShowRestoreBox(false);
              setJsonInput('');
            } catch (e) {
              Alert.alert('خطأ', `فشل استرجاع النسخة الاحتياطية: ${e instanceof Error ? e.message : 'صيغة غير صالحة'}`);
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} activeOpacity={0.7}>
          <ArrowRight size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>النسخ الاحتياطي واستعادة البيانات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Export Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircleExport}>
              <Download size={22} color={colors.primary[600]} />
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 12 }}>
              <Text style={styles.cardTitle}>تصدير نسخة احتياطية كاملة</Text>
              <Text style={styles.cardSub}>
                تصدير كافة المنتجات، الفواتير، الزبائن، والموردين في ملف JSON لحفظها بأمان
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportBackup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Download size={18} color="#fff" />
                <Text style={styles.exportBtnText}>تصدير ومشاركة النسخة الاحتياطية</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Restore Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircleRestore}>
              <Upload size={22} color={isDark ? '#34d399' : colors.emerald[600]} />
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 12 }}>
              <Text style={styles.cardTitle}>استرجاع من نسخة احتياطية</Text>
              <Text style={styles.cardSub}>
                استيراد البيانات واسترجاعها من ملف أو نص JSON تم تصديره مسبقاً
              </Text>
            </View>
          </View>

          {!showRestoreBox ? (
            <TouchableOpacity
              style={styles.restoreToggleBtn}
              onPress={() => setShowRestoreBox(true)}
              activeOpacity={0.8}
            >
              <Upload size={18} color={isDark ? '#34d399' : colors.emerald[700]} />
              <Text style={styles.restoreToggleBtnText}>فتح حقل استعادة البيانات</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={styles.jsonTextInput}
                placeholder="الصق نص النسخة الاحتياطية JSON هنا..."
                placeholderTextColor={colors.text.tertiary}
                value={jsonInput}
                onChangeText={setJsonInput}
                multiline
                textAlign="right"
              />

              <TouchableOpacity
                style={styles.restoreConfirmBtn}
                onPress={handleRestoreBackup}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.restoreConfirmBtnText}>تأكيد الاستعادة الآن</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      ...shadows.xs,
    },
    headerBackBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },

    scroll: {
      flex: 1,
      padding: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    iconCircleExport: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleRestore: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.emerald[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    cardSub: {
      fontSize: 11.5,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
      marginTop: 2,
      textAlign: 'right',
    },

    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary[600],
      paddingVertical: 14,
      borderRadius: radii.lg,
    },
    exportBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
      fontFamily: 'Cairo',
    },

    restoreToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : colors.emerald[50],
      borderWidth: 1,
      borderColor: isDark ? '#065f46' : colors.emerald[200],
      paddingVertical: 12,
      borderRadius: radii.lg,
    },
    restoreToggleBtnText: {
      color: isDark ? '#34d399' : colors.emerald[700],
      fontSize: 13,
      fontWeight: 'bold',
      fontFamily: 'Cairo',
    },

    jsonTextInput: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.background,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      padding: spacing.md,
      fontSize: 12,
      color: colors.text.primary,
      minHeight: 120,
      marginBottom: spacing.sm,
      fontFamily: 'Cairo',
    },
    restoreConfirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: isDark ? '#059669' : colors.emerald[600],
      paddingVertical: 14,
      borderRadius: radii.lg,
    },
    restoreConfirmBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
      fontFamily: 'Cairo',
    },
  });

export default BackupRestoreScreen;
