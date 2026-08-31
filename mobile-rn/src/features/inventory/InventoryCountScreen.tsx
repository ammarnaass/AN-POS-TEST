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
  ClipboardCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Search,
  Package,
  Calendar,
  Warehouse as WarehouseIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Badge, EmptyState } from '@/components/ui';
import CameraScanner from '@/features/barcode/CameraScanner';
import { useI18n } from '@/store/i18nStore';

interface InventoryCount {
  id: string;
  count_number: string;
  date: string;
  warehouse_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  is_closed: number;
  closed_by?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

interface CountLine {
  id: string;
  count_id: string;
  item_id: string;
  product_name: string;
  barcode: string;
  expected_qty: number;
  actual_qty: number;
  variance: number;
  cost_price: number;
}

export const InventoryCountScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const styles = makeStyles(colors, isDark);

  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Session details
  const [activeSession, setActiveSession] = useState<InventoryCount | null>(null);
  const [sessionLines, setSessionLines] = useState<CountLine[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Modals
  const [newCountModal, setNewCountModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await ensureInit();
      const [countList, whList, prodList] = await Promise.all([
        db.inventoryCounts.toArray(),
        db.warehouses.toArray(),
        db.products.toArray(),
      ]);
      setCounts(
        (countList || []).sort(
          (a: any, b: any) =>
            new Date(b.date || b.created_at || 0).getTime() -
            new Date(a.date || a.created_at || 0).getTime()
        )
      );
      setWarehouses(whList || []);
      setProducts(prodList || []);
    } catch (e) {
      console.warn('Load inventory counts error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startNewSession = async () => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(warehouses[0].id);
    }

    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const newId = generateId();
      const countNumber = `CNT-${Date.now().toString().slice(-6)}`;

      const newSession: InventoryCount = {
        id: newId,
        count_number: countNumber,
        date: nowIso,
        warehouse_id: selectedWarehouseId || (warehouses[0]?.id ?? 'wh-main'),
        status: 'in_progress',
        notes: countNotes.trim(),
        is_closed: 0,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await db.inventoryCounts.add(newSession);
      setNewCountModal(false);
      setCountNotes('');

      // Open into active session
      openSessionDetails(newSession);
      loadData();
    } catch (e) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const openSessionDetails = async (session: InventoryCount) => {
    setActiveSession(session);
    setSessionLoading(true);
    try {
      await ensureInit();
      const rawLines = await db.inventoryCountLines.where('count_id').equals(session.id).toArray();
      const prods = await db.products.toArray();

      const mapped: CountLine[] = (rawLines || []).map((l: any) => {
        const prod = prods.find((p: any) => p.id === l.item_id);
        return {
          id: l.id,
          count_id: l.count_id,
          item_id: l.item_id,
          product_name: prod?.name || l.name || t('inventory.productName'),
          barcode: prod?.barcode || '',
          expected_qty: l.expected_qty || 0,
          actual_qty: l.actual_qty || 0,
          variance: (l.actual_qty || 0) - (l.expected_qty || 0),
          cost_price: prod?.costPrice || prod?.retailPrice || 0,
        };
      });
      setSessionLines(mapped);
    } catch (e) {
      console.warn('Load session lines error:', e);
    }
    setSessionLoading(false);
  };

  const handleAddOrUpdateProduct = async (product: any, countedQtyDelta = 1) => {
    if (!activeSession || activeSession.is_closed) return;

    try {
      await ensureInit();
      const existingLine = sessionLines.find((l) => l.item_id === product.id);

      if (existingLine) {
        const newActual = existingLine.actual_qty + countedQtyDelta;
        const newVariance = newActual - existingLine.expected_qty;

        await db.inventoryCountLines.update(existingLine.id, {
          actual_qty: newActual,
          variance: newVariance,
        });

        setSessionLines((prev) =>
          prev.map((l) =>
            l.id === existingLine.id
              ? { ...l, actual_qty: newActual, variance: newVariance }
              : l
          )
        );
      } else {
        const lineId = generateId();
        const expected = Number(product.quantity || product.qty || 0);
        const actual = countedQtyDelta;
        const variance = actual - expected;

        await db.inventoryCountLines.add({
          id: lineId,
          count_id: activeSession.id,
          item_id: product.id,
          expected_qty: expected,
          actual_qty: actual,
          variance: variance,
          created_at: new Date().toISOString(),
        });

        setSessionLines((prev) => [
          ...prev,
          {
            id: lineId,
            count_id: activeSession.id,
            item_id: product.id,
            product_name: product.name,
            barcode: product.barcode || '',
            expected_qty: expected,
            actual_qty: actual,
            variance: variance,
            cost_price: product.costPrice || product.retailPrice || 0,
          },
        ]);
      }
    } catch (e) {
      console.warn('Update line error:', e);
    }
  };

  const handleManualQtyChange = async (line: CountLine, textVal: string) => {
    const val = parseFloat(textVal);
    if (isNaN(val) || val < 0) return;

    const newVariance = val - line.expected_qty;
    try {
      await db.inventoryCountLines.update(line.id, {
        actual_qty: val,
        variance: newVariance,
      });

      setSessionLines((prev) =>
        prev.map((l) =>
          l.id === line.id ? { ...l, actual_qty: val, variance: newVariance } : l
        )
      );
    } catch (e) {
      console.warn('Manual qty update error:', e);
    }
  };

  const handleCloseAndApplyCount = () => {
    if (!activeSession || activeSession.is_closed) return;

    Alert.alert(
      t('inventory.inventoryCount'),
      t('common.confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ensureInit();
              const nowIso = new Date().toISOString();

              for (const line of sessionLines) {
                await db.products.update(line.item_id, {
                  quantity: line.actual_qty,
                  updated_at: nowIso,
                });

                await db.stockMovementsV2.add({
                  id: generateId(),
                  movement_number: `ADJ-${Date.now().toString().slice(-6)}`,
                  date: nowIso,
                  type: 'count',
                  warehouse_id: activeSession.warehouse_id,
                  item_id: line.item_id,
                  quantity: line.variance,
                  unit_price: line.cost_price,
                  total_amount: Math.abs(line.variance * line.cost_price),
                  reference: `${t('inventory.inventoryCount')} ${activeSession.count_number}`,
                  is_reviewed: 1,
                  reviewed_by: user?.name || '',
                  created_at: nowIso,
                  updated_at: nowIso,
                });
              }

              await db.inventoryCounts.update(activeSession.id, {
                status: 'completed',
                is_closed: 1,
                closed_by: user?.name || '',
                closed_at: nowIso,
                updated_at: nowIso,
              });

              Alert.alert(t('common.success'), t('common.done'));
              setActiveSession(null);
              loadData();
            } catch (e) {
              Alert.alert(t('common.error'), t('common.error'));
            }
          },
        },
      ]
    );
  };

  const handleBarcodeScan = (code: string) => {
    setShowScanner(false);
    const normalized = code.trim().toLowerCase();
    const found = products.find(
      (p) => (p.barcode ?? '').toLowerCase() === normalized || (p.sku ?? '').toLowerCase() === normalized
    );

    if (found) {
      handleAddOrUpdateProduct(found, 1);
    } else {
      Alert.alert(t('common.warning'), `${t('inventory.barcode')}: ${code}`);
    }
  };

  // Calculate totals
  const totalExpected = sessionLines.reduce((acc, l) => acc + l.expected_qty, 0);
  const totalActual = sessionLines.reduce((acc, l) => acc + l.actual_qty, 0);
  const totalVariance = totalActual - totalExpected;
  const totalVarianceValue = sessionLines.reduce(
    (acc, l) => acc + l.variance * l.cost_price,
    0
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  // ── ACTIVE SESSION VIEW ──
  if (activeSession) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setActiveSession(null)}>
            <BackIcon size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.headerTitle}>{activeSession.count_number}</Text>
            <Text style={styles.headerSubTitle}>
              {activeSession.is_closed ? t('common.completed') : t('inventory.inventoryCount')}
            </Text>
          </View>
          {!activeSession.is_closed && (
            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.scanBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => setShowScanner(true)}
              >
                <Barcode size={18} color="#fff" />
                <Text style={styles.scanBtnText}>{t('inventory.barcode')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeCountBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={handleCloseAndApplyCount}
              >
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.closeCountBtnText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats Strip */}
        <View style={[styles.varianceSummaryBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{t('inventory.expectedQty')}</Text>
            <Text style={styles.summaryVal}>{totalExpected}</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{t('inventory.actualQty')}</Text>
            <Text style={styles.summaryVal}>{totalActual}</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{t('inventory.variance')}</Text>
            <Text
              style={[
                styles.summaryVal,
                { color: totalVariance === 0 ? colors.success.text : colors.danger.text },
              ]}
            >
              {totalVariance > 0 ? `+${totalVariance}` : totalVariance}
            </Text>
          </View>
        </View>

        {/* Search / Add Products */}
        {!activeSession.is_closed && (
          <View style={styles.searchSection}>
            <View style={[styles.searchBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Search size={16} color={colors.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { textAlign }]}
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder={t('inventory.searchPlaceholder')}
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {productSearch.trim().length > 0 && (
              <ScrollView style={styles.searchDropdown} nestedScrollEnabled>
                {products
                  .filter(
                    (p) =>
                      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
                      p.barcode?.includes(productSearch)
                  )
                  .slice(0, 5)
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.dropdownItem, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}
                      onPress={() => {
                        handleAddOrUpdateProduct(p, 1);
                        setProductSearch('');
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{p.name}</Text>
                      <Text style={styles.dropdownItemSub}>
                        {t('inventory.stockQuantity')}: {p.quantity || 0}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Lines List */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={[styles.sectionTitle, { textAlign }]}>{t('inventory.products')} ({sessionLines.length})</Text>
          {sessionLines.length === 0 ? (
            <EmptyState
              title={t('common.noData')}
              description=""
            />
          ) : (
            sessionLines.map((line) => {
              const isMatch = line.variance === 0;
              const isSurplus = line.variance > 0;
              return (
                <View key={line.id} style={[styles.lineCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.lineMain, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={styles.lineName}>{line.product_name}</Text>
                    {line.barcode ? (
                      <Text style={styles.lineBarcode}>{t('inventory.barcode')}: {line.barcode}</Text>
                    ) : null}
                    <View style={[styles.lineQtyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.lineQtyText}>
                        {t('inventory.expectedQty')}: <Text style={{ fontWeight: '800' }}>{line.expected_qty}</Text>
                      </Text>
                      <Text style={styles.lineQtyText}>
                        {t('inventory.actualQty')}: <Text style={{ fontWeight: '800' }}>{line.actual_qty}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.lineRight, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                    <Badge
                      variant={isMatch ? 'success' : isSurplus ? 'warning' : 'danger'}
                      size="sm"
                    >
                      {isMatch ? t('common.done') : isSurplus ? `+${line.variance}` : `${line.variance}`}
                    </Badge>

                    {!activeSession.is_closed ? (
                      <View style={[styles.qtyEditControls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity
                          style={styles.qtyStepBtn}
                          onPress={() => handleAddOrUpdateProduct({ id: line.item_id }, -1)}
                        >
                          <Text style={styles.qtyStepText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={styles.qtyInputInline}
                          value={String(line.actual_qty)}
                          onChangeText={(txt) => handleManualQtyChange(line, txt)}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity
                          style={styles.qtyStepBtn}
                          onPress={() => handleAddOrUpdateProduct({ id: line.item_id }, 1)}
                        >
                          <Text style={styles.qtyStepText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {showScanner && (
          <CameraScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </View>
    );
  }

  // ── SESSIONS LIST VIEW ──
  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.headerTitle}>{t('inventory.inventoryCount')}</Text>
          <Text style={styles.headerSubTitle}>{counts.length} {t('inventory.inventoryCount')}</Text>
        </View>
        <TouchableOpacity style={[styles.addCountBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setNewCountModal(true)}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addCountBtnText}>{t('inventory.newInventoryCount')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {counts.length === 0 ? (
          <EmptyState
            title={t('common.noData')}
            description=""
          />
        ) : (
          counts.map((c) => {
            const wh = warehouses.find((w) => w.id === c.warehouse_id);
            const isClosed = c.is_closed === 1;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.countCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                activeOpacity={0.7}
                onPress={() => openSessionDetails(c)}
              >
                <View style={styles.countCardIcon}>
                  <ClipboardCheck
                    size={24}
                    color={isClosed ? colors.success.text : colors.primary[600]}
                  />
                </View>

                <View style={[styles.countCardInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.countCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.countCardNumber}>{c.count_number}</Text>
                    <Badge variant={isClosed ? 'success' : 'primary'} size="sm">
                      {isClosed ? t('common.completed') : t('inventory.inventoryCount')}
                    </Badge>
                  </View>

                  <View style={[styles.countCardSubRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <WarehouseIcon size={12} color={colors.text.tertiary} />
                    <Text style={styles.countCardSubText}>{wh?.name || t('inventory.warehouses')}</Text>
                    <Calendar size={12} color={colors.text.tertiary} style={{ marginHorizontal: 4 }} />
                    <Text style={styles.countCardSubText}>
                      {new Date(c.date || c.created_at).toLocaleDateString(localeStr)}
                    </Text>
                  </View>
                  {c.notes ? <Text style={styles.countCardNote}>{c.notes}</Text> : null}
                </View>

                <ChevronLeft size={18} color={colors.text.tertiary} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* New Session Modal */}
      <Modal visible={newCountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('inventory.newInventoryCount')}</Text>
              <TouchableOpacity onPress={() => setNewCountModal(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { textAlign }]}>{t('inventory.warehouse')}</Text>
              <View style={[styles.whSelectRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {warehouses.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.whSelectBtn,
                      selectedWarehouseId === w.id && styles.whSelectBtnActive,
                    ]}
                    onPress={() => setSelectedWarehouseId(w.id)}
                  >
                    <Text
                      style={[
                        styles.whSelectBtnText,
                        selectedWarehouseId === w.id && styles.whSelectBtnTextActive,
                      ]}
                    >
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { textAlign }]}>{t('pos.notes')}</Text>
              <TextInput
                style={[styles.textInput, { textAlign }]}
                value={countNotes}
                onChangeText={setCountNotes}
                placeholder={t('pos.notes')}
                placeholderTextColor={colors.text.tertiary}
              />

              <TouchableOpacity style={[styles.confirmStartBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={startNewSession}>
                <Check size={18} color="#fff" />
                <Text style={styles.confirmStartBtnText}>{t('common.confirm')}</Text>
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
      fontSize: 17,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    headerSubTitle: {
      fontSize: 11.5,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary[600],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.md,
    },
    scanBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    closeCountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.success.text,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.md,
    },
    closeCountBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    addCountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary[600],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.md,
    },
    addCountBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },
    varianceSummaryBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    summaryCol: {
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    summaryVal: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    dividerVertical: {
      width: 1,
      height: 30,
      backgroundColor: colors.border.subtle,
    },
    searchSection: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: colors.surface,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.text.primary,
      fontFamily: 'Cairo',
      paddingVertical: 6,
      textAlign: 'right',
    },
    searchDropdown: {
      maxHeight: 150,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginTop: 4,
    },
    dropdownItem: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    dropdownItemText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    dropdownItemSub: {
      fontSize: 10,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      gap: spacing.sm,
      paddingBottom: 60,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      marginBottom: spacing.xs,
    },
    countCard: {
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
    countCardIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceSubtle : colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },
    countCardInfo: {
      flex: 1,
      gap: 2,
    },
    countCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    countCardNumber: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    countCardSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    countCardSubText: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    countCardNote: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    lineCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border.default,
      alignItems: 'center',
      gap: spacing.md,
    },
    lineMain: {
      flex: 1,
      gap: 2,
    },
    lineName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
    },
    lineBarcode: {
      fontSize: 11,
      color: colors.text.tertiary,
      fontFamily: 'Cairo',
    },
    lineQtyRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: 2,
    },
    lineQtyText: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: 'Cairo',
    },
    lineRight: {
      alignItems: 'flex-end',
      gap: 6,
    },
    qtyEditControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    qtyStepBtn: {
      width: 28,
      height: 28,
      borderRadius: radii.sm,
      backgroundColor: isDark ? colors.surfaceSubtle : '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyStepText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    qtyInputInline: {
      minWidth: 36,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: 'Cairo',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: radii.xs,
      paddingVertical: 2,
      backgroundColor: isDark ? colors.surfaceSubtle : '#fff',
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
      gap: spacing.sm,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Cairo',
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
    whSelectRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
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
    confirmStartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary[600],
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      marginTop: spacing.md,
    },
    confirmStartBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
  });

export default InventoryCountScreen;
