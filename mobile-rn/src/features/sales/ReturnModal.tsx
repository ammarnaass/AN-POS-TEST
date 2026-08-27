import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RotateCcw, X, Plus, Minus, Check, AlertCircle } from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Sale } from '@shared/types';
import { useAuthStore } from '@/store/authStore';

interface ReturnModalProps {
  visible: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSuccess: () => void;
}

interface ReturnItemState {
  productId: string;
  name: string;
  originalQty: number;
  unitPrice: number;
  returnQty: number;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  visible,
  onClose,
  sale,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<ReturnItemState[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sale) {
      const saleItems = Array.isArray(sale.items)
        ? sale.items
        : typeof sale.items === 'string'
        ? JSON.parse(sale.items || '[]')
        : [];

      setItems(
        saleItems.map((item: any) => ({
          productId: item.productId || item.product_id || '',
          name: item.name || 'منتج',
          originalQty: item.qty || 1,
          unitPrice: item.unitPrice || item.unit_price || 0,
          returnQty: 0,
        }))
      );
    }
  }, [sale]);

  const updateQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const newQty = Math.max(0, Math.min(item.originalQty, item.returnQty + delta));
        return { ...item, returnQty: newQty };
      })
    );
  };

  const totalReturnAmount = items.reduce(
    (sum, item) => sum + item.returnQty * item.unitPrice,
    0
  );
  const totalReturnQty = items.reduce((sum, item) => sum + item.returnQty, 0);

  const handleConfirmReturn = async () => {
    if (totalReturnQty === 0) {
      Alert.alert('تنبيه', 'يرجى تحديد كمية صنف واحد على الأقل للإرجاع');
      return;
    }

    setLoading(true);
    try {
      await ensureInit();

      const returnedItems = items
        .filter((i) => i.returnQty > 0)
        .map((i) => ({
          productId: i.productId,
          name: i.name,
          qty: i.returnQty,
          unitPrice: i.unitPrice,
          lineTotal: i.returnQty * i.unitPrice,
        }));

      // 1. Create a return sale record
      const returnSaleId = generateId();
      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();

      await db.sales.add({
        id: returnSaleId,
        number: returnNumber,
        date: nowIso,
        doc_type: sale?.docType || 'facture',
        type: 'return',
        customer_id: sale?.customerId || null,
        customer_name: sale?.customerName || '',
        items: JSON.stringify(returnedItems),
        subtotal: totalReturnAmount,
        discount: 0,
        discount_type: 'amount',
        tva_amount: 0,
        total: totalReturnAmount,
        payment_method: sale?.paymentMethod || 'cash',
        amount_paid: totalReturnAmount,
        status: 'paid',
        sold_by: user?.name || 'مستخدم',
        notes: `مرتجع للفاتورة: ${sale?.number || ''}`,
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2. Return quantities to inventory
      for (const retItem of returnedItems) {
        if (retItem.productId) {
          const product = await db.products.get(retItem.productId);
          if (product) {
            const currentQty = Number(product.quantity || product.qty || 0);
            await db.products.update(retItem.productId, {
              quantity: currentQty + retItem.qty,
              updated_at: nowIso,
            });

            // Log stock movement
            try {
              await db.stockMovements.add({
                id: generateId(),
                date: nowIso,
                type: 'return',
                product_id: retItem.productId,
                qty: retItem.qty,
                reason: `مرتجع فاتورة ${sale?.number}`,
                reference_id: returnSaleId,
                created_by: user?.name || '',
                created_at: nowIso,
                updated_at: nowIso,
              });
            } catch {}
          }
        }
      }

      // 3. Update customer balance if it was a credit purchase
      if (sale?.customerId && sale.paymentMethod === 'credit') {
        const customer = await db.customers.get(sale.customerId);
        if (customer) {
          const currentBal = Number(customer.balance || 0);
          await db.customers.update(sale.customerId, {
            balance: Math.max(0, currentBal - totalReturnAmount),
            updated_at: nowIso,
          });
        }
      }

      Alert.alert('✓ تم الإرجاع بنجاح', `تم تسجيل إرجاع بمبلغ ${totalReturnAmount.toLocaleString('ar-DZ')} دج وإعادة البضاعة للمخزون.`);
      onSuccess();
      onClose();
    } catch (err) {
      Alert.alert('خطأ', `فشل تسجيل الإرجاع: ${err instanceof Error ? err.message : 'خطأ غير متوقع'}`);
    }
    setLoading(false);
  };

  if (!sale) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.headerTitleRow}>
              <Text style={styles.title}>إرجاع بضاعة</Text>
              <RotateCcw size={20} color="#ef4444" />
            </View>
          </View>

          <Text style={styles.subInfo}>
            الفاتورة: <Text style={{ fontWeight: 'bold' }}>{sale.number}</Text> • العميل: {sale.customerName || 'عميل عام'}
          </Text>

          {/* Items list */}
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemControls}>
                  <TouchableOpacity
                    onPress={() => updateQty(idx, 1)}
                    style={[styles.qtyBtn, item.returnQty >= item.originalQty && styles.qtyBtnDisabled]}
                    disabled={item.returnQty >= item.originalQty}
                  >
                    <Plus size={16} color="#3b82f6" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.returnQty}</Text>
                  <TouchableOpacity
                    onPress={() => updateQty(idx, -1)}
                    style={[styles.qtyBtn, item.returnQty <= 0 && styles.qtyBtnDisabled]}
                    disabled={item.returnQty <= 0}
                  >
                    <Minus size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    الكمية الأصلية: {item.originalQty} • السعر: {item.unitPrice.toLocaleString('ar-DZ')} دج
                  </Text>
                  {item.returnQty > 0 && (
                    <Text style={styles.itemRefundText}>
                      مبلغ الإرجاع: {(item.returnQty * item.unitPrice).toLocaleString('ar-DZ')} دج
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Summary footer */}
          <View style={styles.footer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{totalReturnAmount.toLocaleString('ar-DZ')} دج</Text>
              <Text style={styles.summaryLabel}>إجمالي المبلغ المسترد:</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{totalReturnQty} قطعة</Text>
              <Text style={styles.summaryLabel}>إجمالي عدد القطع المرجعة:</Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, totalReturnQty === 0 && styles.confirmBtnDisabled]}
              onPress={handleConfirmReturn}
              disabled={loading || totalReturnQty === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.confirmBtnText}>تأكيد عملية الإرجاع</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    fontFamily: 'Cairo',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subInfo: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 16,
    fontFamily: 'Cairo',
  },
  itemsList: {
    maxHeight: 280,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemDetails: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  itemRefundText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 4,
    fontFamily: 'Cairo',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.3,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Cairo',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    fontFamily: 'Cairo',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#94a3b8',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Cairo',
  },
});

export default ReturnModal;
