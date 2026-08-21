/**
 * MoreScreen — AN POS Mobile
 * Settings, sync info, app info, and logout
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  Settings,
  Store,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Info,
  ChevronRight,
  Check,
  X,
  Printer,
  Shield,
  BarChart3,
  Database,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { session } from '@/lib/apiClient';
import { db, ensureInit } from '@/lib/db';
import { useSyncEngine } from '@/lib/syncEngine';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';

interface StoreSetting {
  key: string;
  value: string;
}

const MoreScreen = ({ navigation }: any) => {
  const { user, logout } = useAuthStore();
  const sync = useSyncEngine();

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [appMode, setAppMode] = useState<'standalone' | 'connected'>('standalone');
  const [serverUrlDisplay, setServerUrlDisplay] = useState<string>('—');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      await ensureInit();
      const rows = await db.settings.toArray();
      const map: Record<string, string> = {};
      for (const r of rows as any[]) {
        map[r.key] = r.value;
      }
      setSettings(map);
      setForm({ ...map });

      const mode = await getStoredMode();
      setAppMode(mode);

      const url = await session.getServerUrlDisplay();
      setServerUrlDisplay(url || '—');
    } catch { /* ignore */ }
    setLoading(false);
  }

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await ensureInit();
      for (const [key, value] of Object.entries(form)) {
        const existing = await db.settings.where('key').equals(key).toArray();
        if (existing.length > 0) {
          await db.settings.update(existing[0].id, { value, updated_at: new Date().toISOString() });
        }
      }
      setSettings({ ...form });
      setEditMode(false);
      Alert.alert('✓ تم الحفظ', 'تم حفظ الإعدادات بنجاح');
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
    Alert.alert('تمت المزامنة', `آخر مزامنة: ${sync.lastSyncTime ? new Date(sync.lastSyncTime).toLocaleTimeString('ar') : '—'}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'خروج',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation?.replace('Login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>

      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name || 'المستخدم'}</Text>
          <Text style={styles.userRole}>
            {user?.role === 'admin' ? '👑 مدير' : user?.role === 'cashier' ? '🏪 كاشير' : '🛒 بائع'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Connection Status */}
      <SectionHeader title="حالة الاتصال" />
      <View style={styles.section}>
        <View style={styles.statusRow}>
          {appMode === 'connected'
            ? <Wifi size={18} color="#22c55e" />
            : <Database size={18} color="#94a3b8" />
          }
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {appMode === 'connected' ? 'متصل بالحاسوب' : 'وضع مستقل'}
            </Text>
            {appMode === 'connected' && (
              <Text style={styles.statusSub}>{serverUrlDisplay}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: appMode === 'connected' ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)' }]}>
            <Text style={[styles.statusBadgeText, { color: appMode === 'connected' ? '#22c55e' : '#94a3b8' }]}>
              {appMode === 'connected' ? 'متصل' : 'مستقل'}
            </Text>
          </View>
        </View>

        {appMode === 'connected' && (
          <View style={styles.syncRow}>
            <View>
              <Text style={styles.syncLabel}>المعلقة: {sync.pendingCount}</Text>
              <Text style={styles.syncLabel}>الفاشلة: {sync.failedCount}</Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, sync.isSyncing && styles.syncBtnDisabled]}
              onPress={handleSync}
              disabled={sync.isSyncing}
            >
              {sync.isSyncing
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <RefreshCw size={14} color="#fff" />
                    <Text style={styles.syncBtnText}>مزامنة</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Store Settings */}
      <View style={styles.sectionHeaderRow}>
        <SectionHeader title="إعدادات المتجر" />
        {!editMode ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
            <Text style={styles.editBtnText}>تعديل</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setForm({ ...settings }); setEditMode(false); }}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveInlineBtn} onPress={handleSaveSettings} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SettingRow
          label="اسم المتجر"
          settingKey="store_name"
          form={form}
          setForm={setForm}
          editMode={editMode}
        />
        <SettingRow
          label="العنوان"
          settingKey="store_address"
          form={form}
          setForm={setForm}
          editMode={editMode}
        />
        <SettingRow
          label="الهاتف"
          settingKey="store_phone"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="phone-pad"
        />
        <SettingRow
          label="نسبة TVA (%)"
          settingKey="tva_rate"
          form={form}
          setForm={setForm}
          editMode={editMode}
          keyboardType="numeric"
          displayTransform={v => `${(parseFloat(v || '0') * 100).toFixed(0)}%`}
        />
        <SettingRow
          label="العملة"
          settingKey="currency"
          form={form}
          setForm={setForm}
          editMode={editMode}
        />
        <SettingRow
          label="رسالة الإيصال"
          settingKey="receipt_footer"
          form={form}
          setForm={setForm}
          editMode={editMode}
        />
      </View>

      {/* App Info */}
      <SectionHeader title="معلومات التطبيق" />
      <View style={styles.section}>
        <InfoItem label="الإصدار" value="2.0.0 (React Native + Nitro)" />
        <InfoItem label="وضع التشغيل" value={appMode === 'connected' ? 'متصل' : 'مستقل'} />
        <InfoItem label="قاعدة البيانات" value={appMode === 'connected' ? 'REST API' : 'SQLite (محلي)'} />
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutFullBtn} onPress={handleLogout}>
        <LogOut size={18} color="#ef4444" />
        <Text style={styles.logoutFullText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const SettingRow = ({
  label, settingKey, form, setForm, editMode, keyboardType, displayTransform,
}: {
  label: string;
  settingKey: string;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editMode: boolean;
  keyboardType?: any;
  displayTransform?: (v: string) => string;
}) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    {editMode ? (
      <TextInput
        style={styles.settingInput}
        value={form[settingKey] || ''}
        onChangeText={v => setForm(f => ({ ...f, [settingKey]: v }))}
        keyboardType={keyboardType || 'default'}
        textAlign="right"
        placeholderTextColor="#94a3b8"
      />
    ) : (
      <Text style={styles.settingValue}>
        {displayTransform ? displayTransform(form[settingKey] || '') : (form[settingKey] || '—')}
      </Text>
    )}
  </View>
);

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Text style={[styles.settingValue, { color: '#64748b' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', margin: 12, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  userAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(59,130,246,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 22, fontWeight: 'bold', color: '#3b82f6' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right' },
  userRole: { fontSize: 12, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'right' },
  logoutBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center' },

  // Section
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#94a3b8', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },

  // Status
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  statusTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right' },
  statusSub: { fontSize: 11, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'right' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 14 },
  syncLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Cairo' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText: { color: '#fff', fontSize: 12, fontWeight: '600', fontFamily: 'Cairo' },

  // Edit controls
  editBtn: { backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: '600', fontFamily: 'Cairo' },
  editActions: { flexDirection: 'row', gap: 6 },
  cancelBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  saveInlineBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },

  // Setting row
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  settingLabel: { fontSize: 13, color: '#64748b', fontFamily: 'Cairo', flex: 1 },
  settingValue: { fontSize: 13, color: '#0f172a', fontFamily: 'Cairo', fontWeight: '500', textAlign: 'right', flex: 1 },
  settingInput: {
    flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'Cairo',
    backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e2e8f0',
  },

  // Logout
  logoutFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 12, marginTop: 16, borderRadius: 16, paddingVertical: 14,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutFullText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },
});

export default MoreScreen;
