import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button, Input, EmptyState } from '@/components/ui';

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
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
      Alert.alert(t('common.warning'), t('customers.customerNameRequired'));
      return;
    }
    const totalNum = parseFloat(total);
    if (!totalNum || totalNum <= 0) {
      Alert.alert(t('common.warning'), t('pos.pleaseEnterValidPrice'));
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
    Alert.alert(t('common.success'), t('common.success'));
  };

  const updateOrderStatus = async (orderId: string, status: 'pending' | 'delivered' | 'cancelled') => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    await saveOrdersToStorage(updated);
  };

  const filteredOrders = orders.filter(
    (o) => statusFilter === 'all' || o.status === statusFilter
  );

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('orders.deliveryOrders')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>{t('orders.newOrder')}</Text>
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <View style={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
            {t('common.all')} ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'pending' && styles.filterChipActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'pending' && styles.filterChipTextActive]}>
            {t('orders.pending')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'delivered' && styles.filterChipActive]}
          onPress={() => setStatusFilter('delivered')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'delivered' && styles.filterChipTextActive]}>
            {t('orders.delivered')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'cancelled' && styles.filterChipActive]}
          onPress={() => setStatusFilter('cancelled')}
        >
          <Text style={[styles.filterChipText, statusFilter === 'cancelled' && styles.filterChipTextActive]}>
            {t('orders.cancelled')}
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
            <ActivityIndicator size="large" color={colors.primary[600]} />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Truck size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>{t('orders.noOrdersFound')}</Text>
            <Text style={styles.emptySub}>{t('orders.noOrdersDesc')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingHorizontal: 12 }}>
            {filteredOrders.map((order) => {
              const isDelivered = order.status === 'delivered';
              const isCancelled = order.status === 'cancelled';

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={[styles.orderHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                        {isDelivered ? t('orders.delivered') : isCancelled ? t('orders.cancelled') : t('orders.pending')}
                      </Text>
                    </View>

                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.orderInfo}>
                    <View style={[styles.customerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <User size={16} color={colors.primary[500]} />
                      <Text style={styles.customerName}>{order.customerName}</Text>
                    </View>

                    {order.phone ? (
                      <TouchableOpacity
                        style={[styles.phoneRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => Linking.openURL(`tel:${order.phone}`)}
                      >
                        <Phone size={14} color={colors.emerald[600]} />
                        <Text style={styles.phoneText}>{order.phone}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {order.address ? (
                      <View style={[styles.addressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MapPin size={14} color={colors.danger.main} />
                        <Text style={styles.addressText}>{order.address}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.divider} />

                  <View style={[styles.orderTotals, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.totalLabel}>{t('common.total')}:</Text>
                      <Text style={styles.totalVal}>{order.total.toLocaleString(localeStr)} {currency}</Text>
                    </View>
                    <View style={[styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.totalLabel}>{t('orders.remainingAtDelivery')}:</Text>
                      <Text style={[styles.totalVal, { color: colors.danger.main }]}>
                        {order.remaining.toLocaleString(localeStr)} {currency}
                      </Text>
                    </View>
                  </View>

                  {/* Status update buttons */}
                  {!isDelivered && !isCancelled && (
                    <View style={[styles.statusActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        style={styles.deliverBtn}
                        onPress={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        <Check size={14} color="#fff" />
                        <Text style={styles.deliverBtnText}>{t('orders.delivered')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => updateOrderStatus(order.id, 'cancelled')}
                      >
                        <X size={14} color={colors.danger.main} />
                        <Text style={styles.cancelBtnText}>{t('orders.cancelled')}</Text>
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
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('orders.createOrderTitle')}</Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('customers.name')} *</Text>
                <TextInput
                  style={[styles.formInput, { textAlign }]}
                  placeholder={t('customers.name')}
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('customers.phone')}</Text>
                <TextInput
                  style={[styles.formInput, { textAlign }]}
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('customers.address')}</Text>
                <TextInput
                  style={[styles.formInput, { textAlign }]}
                  placeholder={t('customers.address')}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              <View style={[styles.rowInputs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { textAlign }]}>{t('cash.deposit')} ({currency})</Text>
                  <TextInput
                    style={[styles.formInput, { textAlign: 'center' }]}
                    value={deposit}
                    onChangeText={setDeposit}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { textAlign }]}>{t('common.total')} ({currency}) *</Text>
                  <TextInput
                    style={[styles.formInput, { borderColor: colors.primary[500], textAlign: 'center' }]}
                    value={total}
                    onChangeText={setTotal}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('common.date')}</Text>
                <TextInput
                  style={[styles.formInput, { textAlign: 'center' }]}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { textAlign }]}>{t('common.notes')}</Text>
                <TextInput
                  style={[styles.formInput, { textAlign }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('common.optional')}
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateOrder} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.modalConfirmBtnText}>{t('common.save')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    headerBackBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary[600],
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },

    filterRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
      gap: 6,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
    },
    filterChipActive: { backgroundColor: colors.primary[600] },
    filterChipText: { fontSize: 11, color: colors.text.secondary, fontWeight: 'bold', fontFamily: 'Cairo' },
    filterChipTextActive: { color: '#fff' },

    scroll: { flex: 1, paddingVertical: 10 },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderNumber: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusPending: { backgroundColor: 'rgba(245,158,11,0.15)' },
    statusPendingText: { color: colors.warning.text, fontSize: 11, fontWeight: 'bold', fontFamily: 'Cairo' },
    statusDelivered: { backgroundColor: 'rgba(34,197,94,0.15)' },
    statusDeliveredText: { color: colors.emerald[600], fontSize: 11, fontWeight: 'bold', fontFamily: 'Cairo' },
    statusCancelled: { backgroundColor: 'rgba(239,68,68,0.15)' },
    statusCancelledText: { color: colors.danger.main, fontSize: 11, fontWeight: 'bold', fontFamily: 'Cairo' },

    divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: 8 },
    orderInfo: { gap: 4 },
    customerRow: { alignItems: 'center', gap: 6 },
    customerName: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },
    phoneRow: { alignItems: 'center', gap: 6 },
    phoneText: { fontSize: 12, color: colors.emerald[600], fontWeight: 'bold' },
    addressRow: { alignItems: 'center', gap: 6 },
    addressText: { fontSize: 12, color: colors.text.secondary, fontFamily: 'Cairo' },

    orderTotals: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    totalRow: { alignItems: 'center', gap: 4 },
    totalLabel: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo' },
    totalVal: { fontSize: 13, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },

    statusActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    deliverBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.emerald[600],
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
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      borderWidth: 1,
      borderColor: colors.danger.main,
      paddingVertical: 8,
      borderRadius: 8,
    },
    cancelBtnText: { color: colors.danger.main, fontSize: 12, fontWeight: 'bold', fontFamily: 'Cairo' },

    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
    emptyTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.secondary, fontFamily: 'Cairo', marginTop: 12 },
    emptySub: { fontSize: 12, color: colors.text.tertiary, fontFamily: 'Cairo', textAlign: 'center', marginTop: 4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      marginBottom: 12,
    },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Cairo' },

    formGroup: { marginBottom: 12 },
    formLabel: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, fontFamily: 'Cairo', marginBottom: 4 },
    formInput: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    rowInputs: { gap: 10, marginBottom: 12 },

    modalConfirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary[600],
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 10,
    },
    modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', fontFamily: 'Cairo' },
  });

export default DeliveryOrdersScreen;
