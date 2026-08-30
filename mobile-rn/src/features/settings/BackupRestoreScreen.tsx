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
  ArrowLeft,
  ShieldAlert,
  Check,
  RefreshCw,
  Copy,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { useI18n } from '@/store/i18nStore';

export const BackupRestoreScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, alignItems } = useI18n();
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
      Alert.alert(t('common.error'), `${err instanceof Error ? err.message : t('common.error')}`);
    }
    setLoading(false);
  };

  const handleRestoreBackup = async () => {
    if (!jsonInput.trim()) {
      Alert.alert(t('common.warning'), t('backupRestore.warningText'));
      return;
    }

    Alert.alert(t('common.confirm'), t('backupRestore.restoreConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await ensureInit();
            const parsed = JSON.parse(jsonInput.trim());
            const data = parsed.data || parsed;

            if (data.products && Array.isArray(data.products)) {
              await db.products.clear();
              await db.products.bulkAdd(data.products);
            }
            if (data.categories && Array.isArray(data.categories)) {
              await db.categories.clear();
              await db.categories.bulkAdd(data.categories);
            }
            if (data.customers && Array.isArray(data.customers)) {
              await db.customers.clear();
              await db.customers.bulkAdd(data.customers);
            }
            if (data.suppliers && Array.isArray(data.suppliers)) {
              await db.suppliers.clear();
              await db.suppliers.bulkAdd(data.suppliers);
            }
            if (data.sales && Array.isArray(data.sales)) {
              await db.sales.clear();
              await db.sales.bulkAdd(data.sales);
            }
            if (data.purchases && Array.isArray(data.purchases)) {
              await db.purchases.clear();
              await db.purchases.bulkAdd(data.purchases);
            }
            if (data.expenses && Array.isArray(data.expenses)) {
              await db.expenses.clear();
              await db.expenses.bulkAdd(data.expenses);
            }
            if (data.cashSessions && Array.isArray(data.cashSessions)) {
              await db.cashSessions.clear();
              await db.cashSessions.bulkAdd(data.cashSessions);
            }
            if (data.promotions && Array.isArray(data.promotions)) {
              await db.promotions.clear();
              await db.promotions.bulkAdd(data.promotions);
            }
            if (data.packs && Array.isArray(data.packs)) {
              await db.packs.clear();
              await db.packs.bulkAdd(data.packs);
            }
            if (data.settings && Array.isArray(data.settings)) {
              await db.settings.clear();
              await db.settings.bulkAdd(data.settings);
            }

            Alert.alert(t('common.success'), t('backupRestore.restoreSuccess'));
            setJsonInput('');
            setShowRestoreBox(false);
          } catch (err) {
            Alert.alert(t('common.error'), `${err instanceof Error ? err.message : t('common.error')}`);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} activeOpacity={0.7}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('backupRestore.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Export Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircleExport}>
              <Download size={22} color={colors.primary[600]} />
            </View>
            <View style={{ alignItems, flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.cardTitle, { textAlign }]}>{t('backupRestore.exportJson')}</Text>
              <Text style={[styles.cardSub, { textAlign }]}>
                {t('backupRestore.subtitle')}
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
                <Text style={styles.exportBtnText}>{t('backupRestore.exportJson')}</Text>
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
            <View style={{ alignItems, flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.cardTitle, { textAlign }]}>{t('backupRestore.importJson')}</Text>
              <Text style={[styles.cardSub, { textAlign }]}>
                {t('backupRestore.warningText')}
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
              <Text style={styles.restoreToggleBtnText}>{t('backupRestore.importJson')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={[styles.jsonTextInput, { textAlign }]}
                placeholder="JSON..."
                placeholderTextColor={colors.text.tertiary}
                value={jsonInput}
                onChangeText={setJsonInput}
                multiline
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
                    <Text style={styles.restoreConfirmBtnText}>{t('common.confirm')}</Text>
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
