import React, { useState } from 'react';
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

export const BackupRestoreScreen = ({ navigation }: any) => {
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
              const parsed = JSON.parse(jsonInput.trim());
              const data = parsed.data || parsed;

              await ensureInit();

              if (data.products && Array.isArray(data.products)) {
                for (const p of data.products) {
                  const existing = await db.products.get(p.id);
                  if (existing) await db.products.update(p.id, p);
                  else await db.products.add(p);
                }
              }

              if (data.customers && Array.isArray(data.customers)) {
                for (const c of data.customers) {
                  const existing = await db.customers.get(c.id);
                  if (existing) await db.customers.update(c.id, c);
                  else await db.customers.add(c);
                }
              }

              if (data.suppliers && Array.isArray(data.suppliers)) {
                for (const s of data.suppliers) {
                  const existing = await db.suppliers.get(s.id);
                  if (existing) await db.suppliers.update(s.id, s);
                  else await db.suppliers.add(s);
                }
              }

              if (data.sales && Array.isArray(data.sales)) {
                for (const sl of data.sales) {
                  const existing = await db.sales.get(sl.id);
                  if (existing) await db.sales.update(sl.id, sl);
                  else await db.sales.add(sl);
                }
              }

              if (data.categories && Array.isArray(data.categories)) {
                for (const cat of data.categories) {
                  const existing = await db.categories.get(cat.id);
                  if (existing) await db.categories.update(cat.id, cat);
                  else await db.categories.add(cat);
                }
              }

              setJsonInput('');
              setShowRestoreBox(false);
              Alert.alert('✓ تمت الاستعادة بنجاح', 'تمت استعادة كافة البيانات بنجاح.');
            } catch (err) {
              Alert.alert('خطأ', `فشل قراءة بيانات JSON: ${err instanceof Error ? err.message : 'تنسيق غير صالح'}`);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ArrowRight size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>النسخ الاحتياطي واستعادة البيانات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Export Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircleExport}>
              <Download size={22} color="#3b82f6" />
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
              <Upload size={22} color="#10b981" />
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
            >
              <Upload size={18} color="#10b981" />
              <Text style={styles.restoreToggleBtnText}>فتح حقل استعادة البيانات</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 10 }}>
              <TextInput
                style={styles.jsonTextInput}
                placeholder="الصق نص النسخة الاحتياطية JSON هنا..."
                value={jsonInput}
                onChangeText={setJsonInput}
                multiline
                textAlign="right"
              />

              <TouchableOpacity
                style={styles.restoreConfirmBtn}
                onPress={handleRestoreBackup}
                disabled={loading}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  scroll: { flex: 1, padding: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircleExport: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleRestore: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  cardSub: { fontSize: 11, color: '#64748b', fontFamily: 'Cairo', marginTop: 2, textAlign: 'right' },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },

  restoreToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 12,
    borderRadius: 12,
  },
  restoreToggleBtnText: { color: '#15803d', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },

  jsonTextInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 120,
    marginBottom: 10,
  },
  restoreConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  restoreConfirmBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', fontFamily: 'Cairo' },
});

export default BackupRestoreScreen;
