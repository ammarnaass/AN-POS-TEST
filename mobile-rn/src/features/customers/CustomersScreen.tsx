/**
 * CustomersScreen — AN POS Mobile
 * Full customer management: list, search, add, edit, view history
 */
import React, { useState, useCallback, useEffect } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
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
  AlertCircle,
  TrendingUp,
  MapPin,
  ChevronLeft,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { colors, useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button, Input, EmptyState } from '@/components/ui';

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
  const { isDark, colors } = useTheme();
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
  const [salesMap, setSalesMap] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
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
      console.warn('Failed to load customers:', err);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(customers);
    } else {
      setFiltered(
        customers.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            (c.phone ?? '').includes(term) ||
            (c.email ?? '').toLowerCase().includes(term)
        )
      );
    }
  }, [search, customers]);

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
      Alert.alert('تنبيه', 'يرجى إدخال اسم العميل');
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      if (modalMode === 'add') {
        const newCustomer: Customer = {
          id: generateId(),
          name: form.name.trim(),
          email: form.email?.trim() || '',
          phone: form.phone?.trim() || '',
          address: form.address?.trim() || '',
          creditLimit: Number(form.creditLimit) || 0,
          balance: Number(form.balance) || 0,
          customerType: form.customerType || 'retail',
          notes: form.notes?.trim() || '',
          status: form.status || 'active',
        };
        await db.customers.add(newCustomer);
      } else if (modalMode === 'edit' && selected) {
        await db.customers.update(selected.id, {
          name: form.name.trim(),
          email: form.email?.trim() || '',
          phone: form.phone?.trim() || '',
          address: form.address?.trim() || '',
          creditLimit: Number(form.creditLimit) || 0,
          balance: Number(form.balance) || 0,
          customerType: form.customerType || 'retail',
          notes: form.notes?.trim() || '',
          status: form.status || 'active',
          updatedAt: nowIso,
        });
      }
      setModalVisible(false);
      await loadData();
    } catch (err) {
      Alert.alert('خطأ', 'فشل حفظ بيانات العميل');
    }
    setSaving(false);
  };

  const handleDelete = (c: Customer) => {
    Alert.alert('حذف العميل', `هل أنت متأكد من حذف العميل "${c.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.customers.delete(c.id);
            await loadData();
          } catch {
            Alert.alert('خطأ', 'فشل حذف العميل');
          }
        },
      },
    ]);
  };

  const totalCredit = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const customersWithCredit = customers.filter((c) => (c.balance || 0) > 0).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border.default,
          },
        ]}
      >
        <Button
          title="إضافة عميل"
          icon={<Plus size={16} color="#ffffff" />}
          onPress={openAdd}
          size="sm"
          variant="primary"
        />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>الزبائن والعملاء</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
            {customers.length} عميل مسجل
          </Text>
        </View>
      </View>

      {/* KPI Stats Bar */}
      <View
        style={[
          styles.kpiRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: colors.text.secondary }]}>إجمالي الديون (الكريدي)</Text>
          <Text
            style={[
              styles.kpiValue,
              { color: totalCredit > 0 ? colors.warning.main : colors.success.main },
            ]}
          >
            {totalCredit.toLocaleString('ar-DZ')} دج
          </Text>
        </View>
        <View style={[styles.kpiDivider, { backgroundColor: colors.border.default }]} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { color: colors.text.secondary }]}>زبائن عليهم ديون</Text>
          <Text style={[styles.kpiValue, { color: colors.primary[600] }]}>
            {customersWithCredit}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <Search size={16} color={colors.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="بحث بالاسم أو الهاتف أو البريد..."
          placeholderTextColor={colors.text.tertiary}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Customers List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={32} color={colors.text.tertiary} />}
            title="لا يوجد عملاء"
            description="أضف عملاءك لمتابعة ديونهم ومشترياتهم"
            actionTitle="إضافة عميل جديد"
            onAction={openAdd}
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {filtered.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.customerCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border.default,
                  },
                ]}
                onPress={() => openView(c)}
                activeOpacity={0.8}
              >
                <View style={styles.cardLeft}>
                  {c.balance > 0 ? (
                    <Badge variant="warning" size="xs">
                      كريدي: {c.balance.toLocaleString('ar-DZ')} دج
                    </Badge>
                  ) : (
                    <Badge variant="success" size="xs">
                      خالص (0 دج)
                    </Badge>
                  )}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.surfaceSubtle },
                      ]}
                      onPress={() => openEdit(c)}
                      activeOpacity={0.7}
                    >
                      <Edit2 size={13} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.actionBtnDanger,
                        { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2' },
                      ]}
                      onPress={() => handleDelete(c)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={13} color={colors.danger.main} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cardInfo}>
                  <Text
                    style={[styles.cardName, { color: colors.text.primary }]}
                  >
                    {c.name}
                  </Text>
                  {c.phone ? (
                    <View style={styles.cardRow}>
                      <Phone size={11} color={colors.text.tertiary} />
                      <Text
                        style={[styles.cardSub, { color: colors.text.secondary }]}
                      >
                        {c.phone}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.cardAvatar,
                    { backgroundColor: colors.primary[50] },
                  ]}
                >
                  <Text
                    style={[
                      styles.cardAvatarText,
                      { color: colors.primary[600] },
                    ]}
                  >
                    {c.name.charAt(0)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible && modalMode !== 'view'}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border.default,
              },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.border.default },
              ]}
            >
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text
                style={[styles.modalTitle, { color: colors.text.primary }]}
              >
                {modalMode === 'add' ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
              </Text>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="اسم العميل *"
                value={form.name || ''}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="الاسم الكامل للعميل أو الشركة"
              />
              <Input
                label="رقم الهاتف"
                value={form.phone || ''}
                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="05 / 06 / 07..."
                keyboardType="phone-pad"
              />
              <Input
                label="البريد الإلكتروني"
                value={form.email || ''}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="email@example.com"
                keyboardType="email-address"
              />
              <Input
                label="العنوان"
                value={form.address || ''}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                placeholder="الحي، المدينة"
              />
              <Input
                label="سقف الائتمان (دج)"
                value={String(form.creditLimit || 0)}
                onChangeText={(v) =>
                  setForm((f) => ({ ...f, creditLimit: parseFloat(v) || 0 }))
                }
                placeholder="0"
                keyboardType="numeric"
              />
              <Input
                label="ملاحظات"
                value={form.notes || ''}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="ملاحظات اختيارية..."
              />

              <Button
                title={modalMode === 'add' ? 'إضافة العميل' : 'حفظ التعديلات'}
                variant="primary"
                size="lg"
                loading={saving}
                onPress={handleSave}
                fullWidth
                style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Customer Details Modal */}
      <Modal
        visible={modalVisible && modalMode === 'view' && Boolean(selected)}
        animationType="slide"
        transparent
      >
        {selected && (
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border.default,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border.default },
                ]}
              >
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={20} color={colors.text.secondary} />
                </TouchableOpacity>
                <Text
                  style={[styles.modalTitle, { color: colors.text.primary }]}
                >
                  {selected.name}
                </Text>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[
                    styles.viewAvatar,
                    { backgroundColor: colors.primary[50] },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewAvatarText,
                      { color: colors.primary[600] },
                    ]}
                  >
                    {selected.name.charAt(0)}
                  </Text>
                </View>

                <View style={styles.infoRowContainer}>
                  <View style={styles.infoRow}>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: colors.text.primary },
                      ]}
                    >
                      {selected.phone || '—'}
                    </Text>
                    <View style={styles.infoLabelGroup}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: colors.text.secondary },
                        ]}
                      >
                        الهاتف
                      </Text>
                      <Phone size={16} color={colors.primary[600]} />
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: colors.text.primary },
                      ]}
                    >
                      {selected.email || '—'}
                    </Text>
                    <View style={styles.infoLabelGroup}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: colors.text.secondary },
                        ]}
                      >
                        البريد
                      </Text>
                      <Mail size={16} color={colors.primary[600]} />
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: colors.text.primary },
                      ]}
                    >
                      {selected.address || '—'}
                    </Text>
                    <View style={styles.infoLabelGroup}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: colors.text.secondary },
                        ]}
                      >
                        العنوان
                      </Text>
                      <MapPin size={16} color={colors.primary[600]} />
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text
                      style={[
                        styles.infoVal,
                        {
                          color:
                            selected.balance > 0
                              ? colors.warning.main
                              : colors.success.main,
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {selected.balance.toLocaleString('ar-DZ')} دج
                    </Text>
                    <View style={styles.infoLabelGroup}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: colors.text.secondary },
                        ]}
                      >
                        الرصيد المتبقي
                      </Text>
                      <CreditCard size={16} color={colors.purple[600]} />
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text
                      style={[
                        styles.infoVal,
                        { color: colors.text.primary },
                      ]}
                    >
                      {selected.creditLimit.toLocaleString('ar-DZ')} دج
                    </Text>
                    <View style={styles.infoLabelGroup}>
                      <Text
                        style={[
                          styles.infoLabel,
                          { color: colors.text.secondary },
                        ]}
                      >
                        سقف الائتمان
                      </Text>
                      <CreditCard size={16} color={colors.warning.main} />
                    </View>
                  </View>
                </View>

                <View style={styles.viewActions}>
                  <Button
                    title="تعديل"
                    variant="outline"
                    icon={<Edit2 size={16} color={colors.primary[600]} />}
                    onPress={() => {
                      setModalMode('edit');
                      setForm({ ...selected });
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="حذف"
                    variant="destructive"
                    icon={<Trash2 size={16} color="#fff" />}
                    onPress={() => {
                      setModalVisible(false);
                      handleDelete(selected);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo',
  },

  // KPI
  kpiRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    ...shadows.xs,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: 'Cairo',
    fontWeight: '600',
    marginBottom: 1,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  kpiDivider: {
    width: 1,
    height: 28,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 42,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo',
    height: '100%',
  },

  // List
  list: {
    flex: 1,
    marginTop: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.huge,
  },
  center: {
    padding: spacing.xxl,
    alignItems: 'center',
  },

  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.xs,
  },
  cardLeft: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDanger: {},

  cardInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: spacing.sm,
    gap: 2,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  cardSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  cardAvatar: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderTopWidth: 1,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  modalBody: {
    maxHeight: 450,
  },

  viewAvatar: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  viewAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  infoRowContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Cairo',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 13,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },
  viewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
});

export default CustomersScreen;
