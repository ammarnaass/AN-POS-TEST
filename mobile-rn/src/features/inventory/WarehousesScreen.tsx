import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Warehouse as WarehouseIcon,
  Plus,
  ArrowLeftRight,
  MapPin,
  Package,
  Layers,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  Search,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Badge, EmptyState } from '@/components/ui';

interface Warehouse {
  id: string;
  name: string;
  location?: string;
  type: string;
  capacity?: number;
  temperature?: number;
  humidity?: number;
  is_active: number;
  parent_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const WarehousesScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const styles = makeStyles(colors, isDark);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState('main');
  const [formCapacity, setFormCapacity] = useState('1000');

  // Transfer State
  const [transferSource, setTransferSource] = useState<string>('');
  const [transferDest, setTransferDest] = useState<string>('');
  const [transferProductId, setTransferProductId] = useState<string>('');
  const [transferQty, setTransferQty] = useState('1');
  const [transferNote, setTransferNote] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await ensureInit();
      const [whList, prodList] = await Promise.all([
        db.warehouses.toArray(),
        db.products.toArray(),
      ]);

      // If empty, auto-seed a default main warehouse
      if (!whList || whList.length === 0) {
        const defaultWh: Warehouse = {
          id: 'wh-main',
          name: 'المستودع الرئيسي',
          location: 'المقر المركزي',
          type: 'main',
          capacity: 5000,
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.warehouses.add(defaultWh);
        setWarehouses([defaultWh]);
      } else {
        setWarehouses(whList);
      }
      setProducts(prodList || []);
    } catch (e) {
      console.warn('Load warehouses error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddWarehouse = () => {
    setEditingWarehouse(null);
    setFormName('');
    setFormLocation('');
    setFormType('branch');
    setFormCapacity('1000');
    setModalVisible(true);
  };

  const openEditWarehouse = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setFormName(wh.name);
    setFormLocation(wh.location || '');
    setFormType(wh.type || 'main');
    setFormCapacity(String(wh.capacity || 1000));
    setModalVisible(true);
  };

  const handleSaveWarehouse = async () => {
    if (!formName.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة اسم المستودع');
      return;
    }

    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      if (editingWarehouse) {
        await db.warehouses.update(editingWarehouse.id, {
          name: formName.trim(),
          location: formLocation.trim(),
          type: formType,
          capacity: parseFloat(formCapacity) || 0,
          updated_at: nowIso,
        });
      } else {
        await db.warehouses.add({
          id: generateId(),
          name: formName.trim(),
          location: formLocation.trim(),
          type: formType,
          capacity: parseFloat(formCapacity) || 0,
          is_active: 1,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
      setModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert('خطأ', 'فشل حفظ بيانات المستودع');
    }
  };

  const handleDeleteWarehouse = (wh: Warehouse) => {
    if (warehouses.length <= 1) {
      Alert.alert('تنبيه', 'لا يمكن حذف المستودع الوحيد في النظام');
      return;
    }

    Alert.alert('تأكيد الحذف', `هل أنت متأكد من حذف مستودع "${wh.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.warehouses.delete(wh.id);
            loadData();
          } catch {
            Alert.alert('خطأ', 'فشل حذف المستودع');
          }
        },
      },
    ]);
  };

  const handleExecuteTransfer = async () => {
    if (!transferSource || !transferDest) {
      Alert.alert('تنبيه', 'يرجى تحديد المستودع المصدر والمستودع المستقبل');
      return;
    }
    if (transferSource === transferDest) {
      Alert.alert('تنبيه', 'المستودع المصدر والمستقبل متطابقان');
      return;
    }
    if (!transferProductId) {
      Alert.alert('تنبيه', 'يرجى اختيار المنتج المراد تحويله');
      return;
    }
    const qty = parseFloat(transferQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('تنبيه', 'يرجى كتابة كمية تحويل صحيحة');
      return;
    }

    const selectedProd = products.find((p) => p.id === transferProductId);
    if (!selectedProd) return;

    if ((selectedProd.quantity || 0) < qty) {
      Alert.alert('تنبيه', `الكمية المتوفرة في المخزون (${selectedProd.quantity || 0}) أقل من الكمية المطلوبة`);
      return;
    }

    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const movementId = generateId();
      const movementNumber = `TRF-${Date.now().toString().slice(-6)}`;

      const srcWh = warehouses.find((w) => w.id === transferSource);
      const dstWh = warehouses.find((w) => w.id === transferDest);

      // 1. Log Transfer in stock_movements_v2
      await db.stockMovementsV2.add({
        id: movementId,
        movement_number: movementNumber,
        date: nowIso,
        type: 'transfer',
        warehouse_id: transferSource,
        destination_warehouse_id: transferDest,
        item_id: transferProductId,
        quantity: qty,
        unit_price: selectedProd.costPrice || selectedProd.retailPrice || 0,
        total_amount: qty * (selectedProd.costPrice || selectedProd.retailPrice || 0),
        reference: transferNote.trim() || `تحويل من ${srcWh?.name} إلى ${dstWh?.name}`,
        is_reviewed: 1,
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2. Log in standard stockMovements
      await db.stockMovements.add({
        id: generateId(),
        date: nowIso,
        type: 'transfer',
        product_id: transferProductId,
        qty: qty,
        reason: `تحويل مخزني: ${srcWh?.name} ➔ ${dstWh?.name}`,
        reference_id: movementId,
        created_at: nowIso,
        updated_at: nowIso,
      });

      Alert.alert('✓ تم التحويل بنجاح', `تم تسجيل عملية التحويل رقم ${movementNumber}`);
      setTransferModalVisible(false);
      setTransferProductId('');
      setTransferQty('1');
      setTransferNote('');
      loadData();
    } catch (e) {
      Alert.alert('خطأ', 'فشل تسجيل عملية التحويل');
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'main':
        return 'رئيسي';
      case 'branch':
        return 'فرعي';
      case 'cold':
        return 'تبريد';
      case 'pos':
        return 'نقطة بيع';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>إدارة المستودعات</Text>
          <Text style={styles.headerSubTitle}>{warehouses.length} مستودعات مسجلة</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.transferHeaderBtn}
            onPress={() => {
              if (warehouses.length >= 2) {
                setTransferSource(warehouses[0].id);
                setTransferDest(warehouses[1].id);
              }
              setTransferModalVisible(true);
            }}
          >
            <ArrowLeftRight size={18} color="#fff" />
            <Text style={styles.transferHeaderBtnText}>تحويل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addHeaderBtn} onPress={openAddWarehouse}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* ── Overview Card ── */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewItem}>
            <WarehouseIcon size={20} color={colors.primary[500]} />
            <Text style={styles.overviewNumber}>{warehouses.length}</Text>
            <Text style={styles.overviewLabel}>المستودعات</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.overviewItem}>
            <Package size={20} color={colors.success.text} />
            <Text style={styles.overviewNumber}>{products.length}</Text>
            <Text style={styles.overviewLabel}>الأصناف</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.overviewItem}>
            <Layers size={20} color={colors.warning.text} />
            <Text style={styles.overviewNumber}>
              {products.reduce((acc, p) => acc + (p.quantity || 0), 0)}
            </Text>
            <Text style={styles.overviewLabel}>إجمالي القطع</Text>
          </View>
        </View>

        {/* ── Warehouses List ── */}
        <Text style={styles.sectionTitle}>قائمة المستودعات ونقاط التخزين</Text>
        {warehouses.length === 0 ? (
          <EmptyState title="لا توجد مستودعات" description="أضف مستودعك الأول لبدء توزيع المخزون" />
        ) : (
          warehouses.map((wh) => (
            <View key={wh.id} style={styles.warehouseCard}>
              <View style={styles.whIconBox}>
                <WarehouseIcon size={24} color={colors.primary[600]} />
              </View>
              <View style={styles.whInfo}>
                <View style={styles.whHeaderRow}>
                  <Text style={styles.whName}>{wh.name}</Text>
                  <Badge variant={wh.type === 'main' ? 'primary' : 'neutral'} size="sm">
                    {getTypeName(wh.type)}
                  </Badge>
                </View>
                {wh.location ? (
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={colors.text.tertiary} />
                    <Text style={styles.locationText}>{wh.location}</Text>
                  </View>
                ) : null}
                <Text style={styles.capacityText}>
                  السعة التقديرية: {wh.capacity || 1000} وحدة
                </Text>
              </View>
              <View style={styles.whActions}>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => openEditWarehouse(wh)}>
                  <Edit2 size={16} color={colors.primary[600]} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionIconBtn} onPress={() => handleDeleteWarehouse(wh)}>
                  <Trash2 size={16} color={colors.danger.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Add/Edit Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingWarehouse ? 'تعديل بيانات المستودع' : 'إضافة مستودع جديد'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>اسم المستودع *</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="مثال: مستودع المنطقة الصناعية"
                placeholderTextColor={colors.text.tertiary}
              />

              <Text style={styles.inputLabel}>الموقع / العنوان</Text>
              <TextInput
                style={styles.textInput}
                value={formLocation}
                onChangeText={setFormLocation}
                placeholder="مثال: شارع الاستقلال، المبنى 4"
                placeholderTextColor={colors.text.tertiary}
              />

              <Text style={styles.inputLabel}>نوع المستودع</Text>
              <View style={styles.typeRow}>
                {['main', 'branch', 'cold', 'pos'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, formType === t && styles.typePillActive]}
                    onPress={() => setFormType(t)}
                  >
                    <Text style={[styles.typePillText, formType === t && styles.typePillTextActive]}>
                      {getTypeName(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>السعة التخزينية (عدد القطع)</Text>
              <TextInput
                style={styles.textInput}
                value={formCapacity}
                onChangeText={setFormCapacity}
                keyboardType="numeric"
                placeholder="1000"
                placeholderTextColor={colors.text.tertiary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWarehouse}>
                <Check size={18} color="#fff" />
                <Text style={styles.saveBtnText}>حفظ المستودع</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Stock Transfer Modal ── */}
      <Modal visible={transferModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تحويل مخزني بين المستودعات</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Source & Destination */}
              <Text style={styles.inputLabel}>من مستودع (المصدر)</Text>
              <View style={styles.whSelectRow}>
                {warehouses.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.whSelectBtn, transferSource === w.id && styles.whSelectBtnActive]}
                    onPress={() => setTransferSource(w.id)}
                  >
                    <Text style={[styles.whSelectBtnText, transferSource === w.id && styles.whSelectBtnTextActive]}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>إلى مستودع (المستقبل)</Text>
              <View style={styles.whSelectRow}>
                {warehouses.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.whSelectBtn, transferDest === w.id && styles.whSelectBtnActive]}
                    onPress={() => setTransferDest(w.id)}
                  >
                    <Text style={[styles.whSelectBtnText, transferDest === w.id && styles.whSelectBtnTextActive]}>
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Product Selection */}
              <Text style={styles.inputLabel}>اختر المنتج المراد تحويله</Text>
              <View style={styles.searchBox}>
                <Search size={16} color={colors.text.tertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={productSearch}
                  onChangeText={setProductSearch}
                  placeholder="ابحث عن الصنف..."
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
              <ScrollView style={styles.productListScroll} nestedScrollEnabled>
                {products
                  .filter(
                    (p) =>
                      !productSearch ||
                      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                      p.barcode?.includes(productSearch)
                  )
                  .slice(0, 10)
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.productPickRow,
                        transferProductId === p.id && styles.productPickRowActive,
                      ]}
                      onPress={() => setTransferProductId(p.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productPickName}>{p.name}</Text>
                        <Text style={styles.productPickSub}>الرصيد: {p.quantity || 0} {p.unit || 'قطع'}</Text>
                      </View>
                      {transferProductId === p.id && (
                        <Check size={18} color={colors.primary[600]} />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={styles.inputLabel}>الكمية المراد تحويلها</Text>
              <TextInput
                style={styles.textInput}
                value={transferQty}
                onChangeText={setTransferQty}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.text.tertiary}
              />

              <Text style={styles.inputLabel}>ملاحظات أو مرجع التحويل</Text>
              <TextInput
                style={styles.textInput}
                value={transferNote}
                onChangeText={setTransferNote}
                placeholder="مثال: تغذية فرع وسط المدينة"
                placeholderTextColor={colors.text.tertiary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleExecuteTransfer}>
                <ArrowLeftRight size={18} color="#fff" />
                <Text style={styles.saveBtnText}>تنفيذ التحويل</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      gap: spacing.sm,
    },
    backBtn: {
      padding: spacing.xs,
    },
    headerTitleWrap: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    headerSubTitle: {
      fontSize: 12,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    transferHeaderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary[600],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.md,
    },
    transferHeaderBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    addHeaderBtn: {
      backgroundColor: colors.primary[700],
      width: 36,
      height: 36,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: 60,
    },
    overviewCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      alignItems: 'center',
      justifyContent: 'space-around',
      ...shadows.sm,
    },
    overviewItem: {
      alignItems: 'center',
      gap: 2,
    },
    overviewNumber: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    overviewLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    dividerVertical: {
      width: 1,
      height: 36,
      backgroundColor: colors.border.subtle,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      marginTop: spacing.sm,
    },
    warehouseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      gap: spacing.md,
      ...shadows.sm,
    },
    whIconBox: {
      width: 46,
      height: 46,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceSubtle : colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    whInfo: {
      flex: 1,
      gap: 2,
    },
    whHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    whName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    capacityText: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    whActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    actionIconBtn: {
      padding: spacing.xs + 2,
      borderRadius: radii.sm,
      backgroundColor: isDark ? colors.surfaceSubtle : '#f1f5f9',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '85%',
      paddingBottom: spacing.xxl,
    },
    modalSheetLarge: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '90%',
      paddingBottom: spacing.xxl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    modalBody: {
      padding: spacing.lg,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      marginTop: spacing.sm,
      marginBottom: 4,
    },
    textInput: {
      backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 13,
      color: colors.text.primary,
      fontFamily: 'Cairo',
      textAlign: 'right',
    },
    typeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginVertical: spacing.xs,
    },
    typePill: {
      flex: 1,
      paddingVertical: spacing.xs + 2,
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc',
    },
    typePillActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[700],
    },
    typePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    typePillTextActive: {
      color: '#fff',
    },
    whSelectRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    whSelectBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc',
    },
    whSelectBtnActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[700],
    },
    whSelectBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    whSelectBtnTextActive: {
      color: '#fff',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
      gap: spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      color: colors.text.primary,
      fontFamily: 'Cairo',
      paddingVertical: 6,
      textAlign: 'right',
    },
    productListScroll: {
      maxHeight: 140,
      borderWidth: 1,
      borderColor: colors.border.subtle,
      borderRadius: radii.md,
      marginBottom: spacing.sm,
    },
    productPickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    productPickRowActive: {
      backgroundColor: isDark ? `${colors.primary[900]}44` : colors.primary[50],
    },
    productPickName: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    productPickSub: {
      fontSize: 10,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    modalFooter: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary[600],
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      gap: spacing.xs,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
      fontFamily: 'Cairo',
    },
  });

export default WarehousesScreen;
