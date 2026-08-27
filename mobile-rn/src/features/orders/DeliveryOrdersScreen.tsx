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
  Linking,
  RefreshControl,
} from 'react-native';
import {
  Truck,
  Plus,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  X,
  Check,
  ArrowRight,
  User,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  itemsCount: number;
  total: number;
  deposit: number;
  remaining: number;
  deliveryDate: string;
  status: 'pending' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export const DeliveryOrdersScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('all');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [itemsCount, setItemsCount] = useState('1');
  const [total, setTotal] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      await ensureInit();
      // Using suspendedOrders or settings/generic key for delivery orders if no separate table
      const stored = await db.settings.where('key').equals('anpos_delivery_orders').toArray();
      if (stored.length > 0 && stored[0].value) {
        setOrders(JSON.parse(stored[0].value));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Failed to load delivery orders:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const saveOrdersToStorage = async (updatedOrders: DeliveryOrder[]) => {
    setOrders(updatedOrders);
    try {
      await ensureInit();
      const existing = await db.settings.where('key').equals('anpos_delivery_orders').toArray();
      const valStr = JSON.stringify(updatedOrders);
      if (existing.length > 0) {
        await db.settings.update(existing[0].id, {
          value: valStr,
          updated_at: new Date().toISOString(),
        });
      } else {
        await db.settings.add({
          id: generateId(),
          key: 'anpos_delivery_orders',
          value: valStr,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Failed to persist delivery orders:', err);
    }
  };

  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العميل');
      return;
    }
    const totalNum = parseFloat(total);
    if (!totalNum || totalNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال إجمالي مبلغ الطلب');
      return;
    }
    const depositNum = parseFloat(deposit) || 0;

    setSaving(true);
    const newOrder: DeliveryOrder = {
      id: generateId(),
      orderNumber: `DEL-${String(orders.length + 1).padStart(3, '0')}`,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      itemsCount: parseInt(itemsCount) || 1,
      total: totalNum,
      deposit: depositNum,
      remaining: Math.max(0, totalNum - depositNum),
      deliveryDate: deliveryDate,
      status: 'pending',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newOrder, ...orders];
    await saveOrdersToStorage(updated);

    setModalVisible(false);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setTotal('');
    setDeposit('0');
    setNotes('');
    setSaving(false);
    Alert.alert('✓ تم الحفظ', 'تم تسجيل طلب التوصيل بنجاح.');
  };

  const updateOrderStatus = async (orderId: string, status: 'pending' | 'delivered' | 'cancelled') => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    await saveOrdersToStorage(updated);
  };

  const filteredOrders = orders.filter(
    (o) => statusFilter === 'all' || o.status === statusFilter
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <ArrowRight size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلبات التوصيل (الديليفري)</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>طلب جديد</Text>
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
            الكل ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'pending' && styles.filterChipActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'pending' && styles.filterChipTextActive]}>
            قيد الانتظار
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'delivered' && styles.filterChipActive]}
          onPress={() => setStatusFilter('delivered')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'delivered' && styles.filterChipTextActive]}>
            تم التسليم
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'cancelled' && styles.filterChipActive]}
          onPress={() => setStatusFilter('cancelled')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'cancelled' && styles.filterChipTextActive]}>
            ملغاة
          </Text>
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
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Truck size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>لا توجد طلبات توصيل</Text>
            <Text style={styles.emptySub}>سجل طلبات التوصيل لمتابعة السائقين وتواريخ التسليم</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 12 }}>
            {filteredOrders.map((order) => {
              const isDelivered = order.status === 'delivered';
              const isCancelled = order.status === 'cancelled';

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View
                      style={[
                        styles.statusBadge,
                        isDelivered
                          ? styles.statusDelivered
                          : isCancelled
                          ? styles.statusCancelled
                          : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isDelivered
                            ? styles.statusDeliveredText
                            : isCancelled
                            ? styles.statusCancelledText
                            : styles.statusPendingText,
                        ]}
                      >
                        {isDelivered ? 'تم التسليم' : isCancelled ? 'ملغاة' : 'قيد الانتظار'}
                      </Text>
                    </View>

                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.orderInfo}>
                    <View style={styles.customerRow}>
                      <Text style={styles.customerName}>{order.customerName}</Text>
                      <User size={16} color="#3b82f6" />
                    </View>

                    {order.phone ? (
                      <TouchableOpacity
                        style={styles.phoneRow}
                        onPress={() => Linking.openURL(`tel:${order.phone}`)}
                      >
                        <Text style={styles.phoneText}>{order.phone}</Text>
                        <Phone size={14} color="#22c55e" />
                      </TouchableOpacity>
                    ) : null}

                    {order.address ? (
                      <View style={styles.addressRow}>
                        <Text style={styles.addressText}>{order.address}</Text>
                        <MapPin size={14} color="#ef4444" />
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.orderTotals}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalVal}>{order.total.toLocaleString('ar-DZ')} دج</Text>
                      <Text style={styles.totalLabel}>الإجمالي:</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalVal, { color: '#ef4444' }]}>
                        {order.remaining.toLocaleString('ar-DZ')} دج
                      </Text>
                      <Text style={styles.totalLabel}>المتبقي عند الاستلام:</Text>
                    </View>
                  </View>

                  {/* Status update buttons */}
                  {!isDelivered && !isCancelled && (
                    <View style={styles.statusActions}>
                      <TouchableOpacity
                        style={styles.deliverBtn}
                        onPress={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        <Check size={14} color="#fff" />
                        <Text style={styles.deliverBtnText}>تم التسليم</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => updateOrderStatus(order.id, 'cancelled')}
                      >
                        <X size={14} color="#ef4444" />
                        <Text style={styles.cancelBtnText}>إلغاء الطلب</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Order Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>تسجيل طلب توصيل جديد</Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>اسم العميل *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="محمد أحمد..."
                  value={customerName}
                  onChangeText={setCustomerName}
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>رقم الهاتف</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>عنوان التوصيل التفصيلي</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="المدينة، الحي، رقم العمارة..."
                  value={address}
                  onChangeText={setAddress}
                  textAlign="right"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>العربون المدفوع (دج)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={deposit}
                    onChangeText={setDeposit}
                    keyboardType="numeric"
                    placeholder="0"
                    textAlign="center"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>إجمالي المبلغ (دج) *</Text>
                  <TextInput
                    style={[styles.formInput, { borderColor: '#3b82f6' }]}
                    value={total}
                    onChangeText={setTotal}
                    keyboardType="numeric"
                    placeholder="0.00"
                    textAlign="center"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>تاريخ التوصيل المتوقع</Text>
                <TextInput
                  style={styles.formInput}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                  textAlign="center"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ملاحظات أو توجيهات للسائق</Text>
                <TextInput
                  style={styles.formInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="ملاحظات اختيارية..."
                  textAlign="right"
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateOrder} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalConfirmBtnText}>حفظ الطلب</Text>
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

  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 6,
  },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterChipActive: { backgroundColor: '#3b82f6' },
  filterChipText: { fontSize: 11, color: '#64748b', fontWeight: 'bold', fontFamily: 'Cairo' },
  filterChipTextActive: { color: '#fff' },

  scroll: { flex: 1, paddingVertical: 10 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPending: { backgroundColor: 'rgba(245,158,11,0.1)' },
  statusPendingText: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold', fontFamily: 'Cairo' },
  statusDelivered: { backgroundColor: 'rgba(34,197,94,0.1)' },
  statusDeliveredText: { color: '#22c55e', fontSize: 11, fontWeight: 'bold', fontFamily: 'Cairo' },
  statusCancelled: { backgroundColor: 'rgba(239,68,68,0.1)' },
  statusCancelledText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold', fontFamily: 'Cairo' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  orderInfo: { gap: 4 },
  customerRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  phoneRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  phoneText: { fontSize: 12, color: '#22c55e', fontWeight: 'bold' },
  addressRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  addressText: { fontSize: 12, color: '#64748b', fontFamily: 'Cairo' },

  orderTotals: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Cairo' },
  totalVal: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  statusActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  deliverBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 8,
  },
  deliverBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#64748b', fontFamily: 'Cairo', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#94a3b8', fontFamily: 'Cairo', textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },

  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Cairo', marginBottom: 4, textAlign: 'right' },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: 'Cairo',
  },
  rowInputs: { flexDirection: 'row', gap: 10, marginBottom: 12 },

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

export default DeliveryOrdersScreen;
