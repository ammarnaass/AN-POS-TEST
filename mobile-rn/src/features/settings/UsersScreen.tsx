import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import {
  Users,
  Plus,
  Shield,
  Key,
  Trash2,
  Edit2,
  X,
  Check,
  ArrowRight,
  UserCheck,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { User, UserRole } from '@shared/types';
import { useAuthStore } from '@/store/authStore';

const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: 'admin', label: 'مدير (Admin)', desc: 'كامل الصلاحيات والتقارير والإعدادات' },
  { id: 'cashier', label: 'كاشير (Cashier)', desc: 'البيع وإدارة الصندوق بدون الإعدادات' },
  { id: 'seller', label: 'بائع (Seller)', desc: 'البيع وتسجيل الدفعات فقط' },
];

export const UsersScreen = ({ navigation }: any) => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('seller');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      await ensureInit();
      const all = await db.users.toArray();
      setUsers(all);
    } catch (err) {
      console.warn('Failed to load users:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setPin('');
    setPhone('');
    setRole('seller');
    setStatus('active');
    setModalVisible(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setPin(u.pin);
    setPhone(u.phone || '');
    setRole(u.role || 'seller');
    setStatus(u.status || 'active');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !username.trim() || !pin.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال الاسم، اسم المستخدم، ورمز PIN');
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      if (editingUser) {
        await db.users.update(editingUser.id, {
          name: name.trim(),
          username: username.trim(),
          pin: pin.trim(),
          phone: phone.trim(),
          role: role,
          status: status,
          updated_at: nowIso,
        });
      } else {
        await db.users.add({
          id: generateId(),
          name: name.trim(),
          username: username.trim(),
          pin: pin.trim(),
          phone: phone.trim(),
          role: role,
          status: status,
          permissions: '[]',
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      setModalVisible(false);
      await loadUsers();
      Alert.alert('✓ تم بنجاح', 'تم حفظ بيانات المستخدم بنجاح.');
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ المستخدم: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSaving(false);
  };

  const handleDelete = (u: User) => {
    if (u.id === currentUser?.id) {
      Alert.alert('تنبيه', 'لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول به');
      return;
    }

    Alert.alert('حذف المستخدم', `هل أنت متأكد من حذف الحساب "${u.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.users.delete(u.id);
            await loadUsers();
          } catch {
            Alert.alert('خطأ', 'فشل حذف المستخدم');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ArrowRight size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة المستخدمين والصلاحيات</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>مستخدم جديد</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <View style={{ gap: 10, padding: 14 }}>
            {users.map((u) => {
              const roleInfo = ROLES.find((r) => r.id === u.role) || ROLES[2];
              const isActive = u.status !== 'inactive';

              return (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userCardLeft}>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => openEdit(u)} style={styles.actionBtn}>
                        <Edit2 size={14} color="#64748b" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(u)} style={styles.actionBtn}>
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View
                      style={[
                        styles.roleBadge,
                        u.role === 'admin'
                          ? styles.roleAdmin
                          : u.role === 'cashier'
                          ? styles.roleCashier
                          : styles.roleSeller,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          u.role === 'admin'
                            ? styles.roleAdminText
                            : u.role === 'cashier'
                            ? styles.roleCashierText
                            : styles.roleSellerText,
                        ]}
                      >
                        {roleInfo.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.userCardRight}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{u.name}</Text>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? '#22c55e' : '#94a3b8' },
                        ]}
                      />
                    </View>
                    <Text style={styles.usernameSub}>اسم المستخدم: @{u.username}</Text>
                    <Text style={styles.pinSub}>رمز الدخول: ••••</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit User Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>الاسم الكامل *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="محمد علي"
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>اسم الدخول (Username) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="mohamed"
                  value={username}
                  onChangeText={setUsername}
                  textAlign="right"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>رمز الدخول السريع (PIN Code) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="4 أو 6 أرقام..."
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry
                  textAlign="center"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>الدور الوظيفي والصلاحيات</Text>
                <View style={{ gap: 8 }}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roleSelectCard, role === r.id && styles.roleSelectCardActive]}
                      onPress={() => setRole(r.id)}
                    >
                      {role === r.id ? <Check size={16} color="#3b82f6" /> : null}
                      <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 8 }}>
                        <Text style={styles.roleSelectLabel}>{r.label}</Text>
                        <Text style={styles.roleSelectDesc}>{r.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Switch
                  value={status === 'active'}
                  onValueChange={(v) => setStatus(v ? 'active' : 'inactive')}
                  trackColor={{ true: '#22c55e', false: '#cbd5e1' }}
                />
                <Text style={styles.formLabel}>تفعيل الحساب</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalConfirmBtnText}>حفظ المستخدم</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },

  scroll: { flex: 1 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userCardLeft: { alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  actionBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleAdmin: { backgroundColor: 'rgba(59,130,246,0.1)' },
  roleAdminText: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold', fontFamily: 'Cairo' },
  roleCashier: { backgroundColor: 'rgba(16,185,129,0.1)' },
  roleCashierText: { color: '#10b981', fontSize: 10, fontWeight: 'bold', fontFamily: 'Cairo' },
  roleSeller: { backgroundColor: 'rgba(100,116,139,0.1)' },
  roleSellerText: { color: '#64748b', fontSize: 10, fontWeight: 'bold', fontFamily: 'Cairo' },

  userCardRight: { flex: 1, alignItems: 'flex-end', marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  usernameSub: { fontSize: 11, color: '#64748b', fontFamily: 'Cairo', marginTop: 2 },
  pinSub: { fontSize: 10, color: '#94a3b8', marginTop: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Cairo', marginBottom: 6, textAlign: 'right' },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Cairo',
  },

  roleSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleSelectCardActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  roleSelectLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  roleSelectDesc: { fontSize: 10, color: '#64748b', fontFamily: 'Cairo', marginTop: 2 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },

  modalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },
});

export default UsersScreen;
