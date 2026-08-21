/**
 * CustomersScreen — AN POS Mobile
 * Full customer management: list, search, add, edit, view history
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  CreditCard,
  Edit2,
  Trash2,
  X,
  User,
  AlertCircle,
  TrendingUp,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  balance: number;
  customerType: string;
  notes?: string;
  status: string;
}

type ModalMode = 'add' | 'edit' | 'view';

const emptyForm = (): Partial<Customer> => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  creditLimit: 0,
  balance: 0,
  customerType: 'retail',
  notes: '',
  status: 'active',
});

export const CustomersScreen = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesMap, setSalesMap] = useState<Record<string, number>>({});

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(customers);
    } else {
      setFiltered(customers.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.phone ?? '').includes(term) ||
        (c.email ?? '').toLowerCase().includes(term)
      ));
    }
  }, [search, customers]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      await ensureInit();
      const all = await db.customers.toArray();
      const mapped: Customer[] = all.map((c: any) => ({
        id: c.id,
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        creditLimit: c.creditLimit || c.credit_limit || 0,
        balance: c.balance || 0,
        customerType: c.customerType || c.customer_type || 'retail',
        notes: c.notes || '',
        status: c.status || 'active',
      }));
      setCustomers(mapped);
      setFiltered(mapped);

      // Load total sales per customer
      const allSales = await db.sales.toArray();
      const map: Record<string, number> = {};
      for (const s of allSales as any[]) {
        if (s.customerId || s.customer_id) {
          const cid = s.customerId || s.customer_id;
          map[cid] = (map[cid] ?? 0) + (s.total || 0);
        }
      }
      setSalesMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في التحميل');
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openAdd = () => {
    setForm(emptyForm());
    setModalMode('add');
    setModalVisible(true);
  };

  const openEdit = (c: Customer) => {
    setForm({ ...c });
    setSelected(c);
    setModalMode('edit');
    setModalVisible(true);
  };

  const openView = (c: Customer) => {
    setSelected(c);
    setModalMode('view');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert('خطأ', 'اسم العميل مطلوب');
      return;
    }
    setSaving(true);
    try {
      await ensureInit();
      const now = new Date().toISOString();
      if (modalMode === 'add') {
        await db.customers.add({
          id: generateId(),
          name: form.name!.trim(),
          email: form.email || '',
          phone: form.phone || '',
          address: form.address || '',
          credit_limit: form.creditLimit || 0,
          balance: form.balance || 0,
          customer_type: form.customerType || 'retail',
          notes: form.notes || '',
          status: 'active',
          created_at: now,
          updated_at: now,
        });
      } else if (modalMode === 'edit' && selected) {
        await db.customers.update(selected.id, {
          name: form.name!.trim(),
          email: form.email || '',
          phone: form.phone || '',
          address: form.address || '',
          credit_limit: form.creditLimit || 0,
          customer_type: form.customerType || 'retail',
          notes: form.notes || '',
          updated_at: now,
        });
      }
      setModalVisible(false);
      await loadData();
    } catch (err) {
      Alert.alert('خطأ', err instanceof Error ? err.message : 'فشل الحفظ');
    }
    setSaving(false);
  };

  const handleDelete = (c: Customer) => {
    Alert.alert(
      'حذف العميل',
      `هل أنت متأكد من حذف "${c.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await ensureInit();
              await db.customers.delete(c.id);
              await loadData();
            } catch (err) {
              Alert.alert('خطأ', 'فشل الحذف');
            }
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

  if (error) {
    return (
      <View style={styles.center}>
        <AlertCircle size={32} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث عن عميل..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
            textAlign="right"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <X size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Users size={14} color="#3b82f6" />
          <Text style={styles.statValue}>{customers.length}</Text>
          <Text style={styles.statLabel}>إجمالي العملاء</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <TrendingUp size={14} color="#22c55e" />
          <Text style={styles.statValue}>
            {customers.filter(c => c.balance > 0).length}
          </Text>
          <Text style={styles.statLabel}>عملاء آجلون</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <CreditCard size={14} color="#d946ef" />
          <Text style={styles.statValue}>
            {customers.reduce((s, c) => s + c.balance, 0).toFixed(0)} دج
          </Text>
          <Text style={styles.statLabel}>الرصيد الكلي</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Users size={48} color="#e2e8f0" />
            <Text style={styles.emptyText}>لا يوجد عملاء</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Plus size={16} color="#fff" />
              <Text style={styles.emptyAddText}>إضافة عميل</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(c => (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              onPress={() => openView(c)}
              onLongPress={() => openEdit(c)}
            >
              <View style={styles.cardAvatar}>
                <Text style={styles.cardAvatarText}>
                  {c.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{c.name}</Text>
                {c.phone ? (
                  <View style={styles.cardRow}>
                    <Phone size={11} color="#94a3b8" />
                    <Text style={styles.cardSub}>{c.phone}</Text>
                  </View>
                ) : null}
                {c.email ? (
                  <View style={styles.cardRow}>
                    <Mail size={11} color="#94a3b8" />
                    <Text style={styles.cardSub}>{c.email}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.cardRight}>
                {c.balance > 0 ? (
                  <View style={styles.balanceBadge}>
                    <Text style={styles.balanceText}>{c.balance.toFixed(0)} دج</Text>
                  </View>
                ) : null}
                {salesMap[c.id] ? (
                  <Text style={styles.salesText}>
                    {(salesMap[c.id]! / 1000).toFixed(1)}k دج
                  </Text>
                ) : null}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEdit(c)}
                  >
                    <Edit2 size={14} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnDanger}
                    onPress={() => handleDelete(c)}
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible && (modalMode === 'add' || modalMode === 'edit')}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'add' ? 'إضافة عميل جديد' : 'تعديل العميل'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <FormField
                label="الاسم الكامل *"
                value={form.name || ''}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="محمد أحمد"
              />
              <FormField
                label="رقم الهاتف"
                value={form.phone || ''}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                placeholder="0555123456"
                keyboardType="phone-pad"
              />
              <FormField
                label="البريد الإلكتروني"
                value={form.email || ''}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
                placeholder="email@example.com"
                keyboardType="email-address"
              />
              <FormField
                label="العنوان"
                value={form.address || ''}
                onChangeText={v => setForm(f => ({ ...f, address: v }))}
                placeholder="الحي، المدينة"
              />
              <FormField
                label="سقف الائتمان (دج)"
                value={String(form.creditLimit || 0)}
                onChangeText={v => setForm(f => ({ ...f, creditLimit: parseFloat(v) || 0 }))}
                placeholder="0"
                keyboardType="numeric"
              />
              <FormField
                label="ملاحظات"
                value={form.notes || ''}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="ملاحظات اختيارية..."
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {modalMode === 'add' ? 'إضافة العميل' : 'حفظ التعديلات'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Modal */}
      <Modal
        visible={modalVisible && modalMode === 'view' && !!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        {selected && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selected.name}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <View style={styles.viewAvatar}>
                  <Text style={styles.viewAvatarText}>{selected.name.charAt(0)}</Text>
                </View>

                <InfoRow icon={<Phone size={16} color="#3b82f6" />} label="الهاتف" value={selected.phone || '—'} />
                <InfoRow icon={<Mail size={16} color="#3b82f6" />} label="البريد" value={selected.email || '—'} />
                <InfoRow icon={<User size={16} color="#3b82f6" />} label="العنوان" value={selected.address || '—'} />
                <InfoRow icon={<CreditCard size={16} color="#d946ef" />} label="الرصيد" value={`${selected.balance.toFixed(2)} دج`} />
                <InfoRow icon={<CreditCard size={16} color="#f59e0b" />} label="سقف الائتمان" value={`${selected.creditLimit.toFixed(2)} دج`} />
                <InfoRow icon={<TrendingUp size={16} color="#22c55e" />} label="إجمالي المشتريات" value={`${(salesMap[selected.id] || 0).toFixed(2)} دج`} />

                <View style={styles.viewActions}>
                  <TouchableOpacity
                    style={styles.viewEditBtn}
                    onPress={() => { setModalMode('edit'); setForm({ ...selected }); }}
                  >
                    <Edit2 size={16} color="#3b82f6" />
                    <Text style={styles.viewEditText}>تعديل</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewDeleteBtn}
                    onPress={() => { setModalVisible(false); handleDelete(selected); }}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={styles.viewDeleteText}>حذف</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const FormField = ({ label, value, onChangeText, placeholder, keyboardType, multiline }: any) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>{label}</Text>
    <TextInput
      style={[styles.formInput, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      keyboardType={keyboardType || 'default'}
      autoCapitalize="none"
      textAlign="right"
      multiline={multiline}
    />
  </View>
);

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center', fontFamily: 'Cairo' },
  retryBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: 'bold', fontFamily: 'Cairo' },

  // Header
  header: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', paddingVertical: 10, fontFamily: 'Cairo' },
  clearBtn: { padding: 4 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },

  // Stats
  statsBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  statLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Cairo' },
  statDivider: { width: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },

  // List
  list: { flex: 1 },
  emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8', fontFamily: 'Cairo' },
  emptyAddBtn: { flexDirection: 'row', gap: 6, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  emptyAddText: { color: '#fff', fontWeight: 'bold', fontFamily: 'Cairo' },

  // Card
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 16, padding: 12, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6' },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'right' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  cardSub: { fontSize: 11, color: '#94a3b8' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  balanceBadge: { backgroundColor: 'rgba(217, 70, 239, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  balanceText: { fontSize: 10, color: '#d946ef', fontWeight: '600', fontFamily: 'Cairo' },
  salesText: { fontSize: 10, color: '#22c55e', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
  actionBtnDanger: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  modalBody: { padding: 20 },

  // Form
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4, fontFamily: 'Cairo' },
  formInput: { backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a', fontFamily: 'Cairo' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },

  // View modal
  viewAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  viewAvatarText: { fontSize: 30, fontWeight: 'bold', color: '#3b82f6' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Cairo' },
  infoValue: { fontSize: 14, color: '#0f172a', fontWeight: '500', fontFamily: 'Cairo', textAlign: 'right' },
  viewActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 30 },
  viewEditBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 14, paddingVertical: 14 },
  viewEditText: { color: '#3b82f6', fontWeight: '600', fontFamily: 'Cairo' },
  viewDeleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 14, paddingVertical: 14 },
  viewDeleteText: { color: '#ef4444', fontWeight: '600', fontFamily: 'Cairo' },
});

export default CustomersScreen;
