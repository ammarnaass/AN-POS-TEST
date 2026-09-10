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
  RefreshControl,
} from 'react-native';
import {
  Layers,
  Plus,
  Trash2,
  Package,
  Barcode,
  X,
  Check,
  Search,
  ArrowRight,
  ArrowLeft,
  Camera,
  Edit2,
  TrendingUp,
  AlertCircle,
  Tag,
  Sparkles,
} from 'lucide-react-native';
import CameraScanner from '@/features/barcode/CameraScanner';
import { generateEAN13 } from '@/lib/barcodeSvg';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import type { Pack, Product } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';

export const PacksScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, alignItems, currency } = useI18n();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State (Create / Edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [packType, setPackType] = useState<'wholesale' | 'bundle' | 'half_wholesale'>('wholesale');
  const [unitName, setUnitName] = useState('كرتونة');
  const [minWholesaleQty, setMinWholesaleQty] = useState('1');
  const [packName, setPackName] = useState('');
  const [packBarcode, setPackBarcode] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ productId: string; name: string; qty: number }[]>([]);
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Camera Scanner State
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'packBarcode' | 'itemBarcode'>('packBarcode');

  useEffect(() => {
    loadPacksData();
  }, []);

  async function loadPacksData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allPacks, allProducts] = await Promise.all([
        db.packs.toArray(),
        db.products.toArray(),
      ]);
      setPacks(allPacks);
      setProducts(allProducts);
    } catch (err) {
      console.warn('Failed to load packs:', err);
    }
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPacksData();
    setRefreshing(false);
  };

  const openCreatePack = () => {
    setEditingPackId(null);
    setPackType('wholesale');
    setUnitName('كرتونة');
    setMinWholesaleQty('1');
    setPackName('');
    setPackBarcode(generateEAN13());
    setPackPrice('');
    setSelectedItems([]);
    setModalVisible(true);
  };

  const openEditPack = (p: Pack) => {
    setEditingPackId(p.id);
    setPackType(((p as any).pack_type || (p as any).packType || 'wholesale') as any);
    setUnitName((p as any).unit_name || (p as any).unitName || 'كرتونة');
    setMinWholesaleQty(String((p as any).min_wholesale_qty || (p as any).minWholesaleQty || 1));
    setPackName(p.name || '');
    setPackBarcode(p.barcode || '');
    setPackPrice(String(p.packPrice || (p as any).pack_price || (p as any).price || ''));

    let itemsList: any[] = [];
    if (Array.isArray(p.items)) {
      itemsList = p.items;
    } else if (typeof p.items === 'string') {
      try {
        const parsed = JSON.parse(p.items);
        if (Array.isArray(parsed)) itemsList = parsed;
        else if (parsed && typeof parsed === 'object') itemsList = Object.values(parsed);
      } catch {
        itemsList = [];
      }
    }
    setSelectedItems(itemsList);
    setModalVisible(true);
  };

  const addItemToPack = (product: Product) => {
    const existing = selectedItems.find((i) => i.productId === product.id);
    if (existing) {
      setSelectedItems((prev) =>
        prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i))
      );
    } else {
      setSelectedItems((prev) => [...prev, { productId: product.id, name: product.name, qty: 1 }]);
    }
    setProductPickerVisible(false);
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, qty: newQty } : item))
    );
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // إحصائيات فورية للعبوة في نافذة الإنشاء/التعديل
  const modalMetrics = useMemo(() => {
    let totalCost = 0;
    let retailTotal = 0;
    let minAvailable = Infinity;

    for (const it of selectedItems) {
      const prod = products.find((p) => p.id === it.productId);
      const cost = Number(prod?.costPrice || (prod as any)?.cost_price || 0);
      const retail = Number(prod?.retailPrice || (prod as any)?.retail_price || 0);
      const currentStock = Number(prod?.quantity || (prod as any)?.qty || 0);

      totalCost += cost * it.qty;
      retailTotal += retail * it.qty;

      const possiblePacks = it.qty > 0 ? Math.floor(currentStock / it.qty) : 0;
      if (possiblePacks < minAvailable) {
        minAvailable = possiblePacks;
      }
    }

    if (minAvailable === Infinity) minAvailable = 0;

    const priceNum = parseFloat(packPrice) || 0;
    const margin = priceNum > 0 ? ((priceNum - totalCost) / priceNum) * 100 : 0;
    const buyerSavings = retailTotal > 0 && priceNum > 0 ? retailTotal - priceNum : 0;

    return {
      totalCost,
      retailTotal,
      availablePacks: minAvailable,
      margin,
      buyerSavings,
    };
  }, [selectedItems, packPrice, products]);

  const handleSavePack = async () => {
    if (!packName.trim()) {
      Alert.alert(t('common.warning'), 'يرجى إدخال اسم العبوة');
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert(t('common.warning'), 'يرجى إضافة صنف واحد على الأقل للعبوة');
      return;
    }
    const priceNum = parseFloat(packPrice);
    if (!priceNum || priceNum <= 0) {
      Alert.alert(t('common.warning'), 'يرجى تحديد سعر بيع العبوة');
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();
      const minQtyNum = parseInt(minWholesaleQty, 10) || 1;
      const piecesCount = selectedItems.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);

      if (editingPackId) {
        await db.packs.update(editingPackId, {
          name: packName.trim(),
          barcode: packBarcode.trim() || undefined,
          price: priceNum,
          pack_price: priceNum,
          pack_type: packType,
          unit_name: unitName.trim() || 'كرتون',
          pieces_count: piecesCount,
          min_wholesale_qty: minQtyNum,
          items: JSON.stringify(selectedItems),
          status: 'active',
          is_active: 1,
          sync_version: 1,
          updated_at: nowIso,
        } as any);
      } else {
        await db.packs.add({
          id: generateId(),
          name: packName.trim(),
          barcode: packBarcode.trim() || generateEAN13(),
          price: priceNum,
          pack_price: priceNum,
          pack_type: packType,
          unit_name: unitName.trim() || 'كرتون',
          pieces_count: piecesCount,
          min_wholesale_qty: minQtyNum,
          items: JSON.stringify(selectedItems),
          status: 'active',
          is_active: 1,
          sync_version: 1,
          created_at: nowIso,
          updated_at: nowIso,
        } as any);
      }

      setModalVisible(false);
      setEditingPackId(null);
      setPackName('');
      setPackBarcode('');
      setPackPrice('');
      setSelectedItems([]);
      await loadPacksData();
      Alert.alert(t('common.success'), editingPackId ? 'تم تحديث العبوة بنجاح' : 'تمت إضافة العبوة بنجاح');
    } catch (err) {
      Alert.alert(t('common.error'), `${err instanceof Error ? err.message : t('common.error')}`);
    }
    setSaving(false);
  };

  const handleDeletePack = (pack: Pack) => {
    Alert.alert(t('common.delete'), `هل أنت متأكد من حذف العبوة "${pack.name}"؟`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await db.packs.delete(pack.id);
            await loadPacksData();
          } catch {
            Alert.alert(t('common.error'), t('common.error'));
          }
        },
      },
    ]);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.barcode && p.barcode.includes(productSearch))
  );

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.headerBackBtn, { backgroundColor: isDark ? colors.surfaceElevated : '#f1f5f9' }]}
          onPress={() => navigation.goBack()}
        >
          <BackIcon size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>عبوات الجملة والباقات</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={openCreatePack}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addBtnText}>عبوة جديدة</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary[600]} style={{ marginTop: 40 }} />
        ) : packs.length === 0 ? (
          <View style={styles.emptyState}>
            <Layers size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('promotions.noPacks')}</Text>
            <Text style={[styles.emptySub, { color: colors.text.secondary }]}>{t('promotions.noPacksDesc')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12, paddingHorizontal: 14 }}>
            {packs.map((p) => {
              let packItemsList: any[] = [];
              if (Array.isArray(p.items)) {
                packItemsList = p.items;
              } else if (typeof p.items === 'string') {
                try {
                  const parsed = JSON.parse(p.items);
                  if (Array.isArray(parsed)) packItemsList = parsed;
                  else if (parsed && typeof parsed === 'object') packItemsList = Object.values(parsed);
                } catch {
                  packItemsList = [];
                }
              }

              // حساب المخزون المتاح للعبوة
              let availablePacks = Infinity;
              let totalCost = 0;
              let retailTotal = 0;
              let totalPieces = 0;

              for (const it of packItemsList) {
                const prod = products.find((pr) => pr.id === (it.productId || it.id));
                const currentStock = Number(prod?.quantity || (prod as any)?.qty || 0);
                const itemQty = Number(it.qty || it.quantity || 1);
                totalPieces += itemQty;

                const cost = Number(prod?.costPrice || (prod as any)?.cost_price || 0);
                const retail = Number(prod?.retailPrice || (prod as any)?.retail_price || 0);
                totalCost += cost * itemQty;
                retailTotal += retail * itemQty;

                const count = itemQty > 0 ? Math.floor(currentStock / itemQty) : 0;
                if (count < availablePacks) availablePacks = count;
              }
              if (availablePacks === Infinity) availablePacks = 0;

              const packType = (p as any).pack_type || (p as any).packType || 'wholesale';
              const unitName = (p as any).unit_name || (p as any).unitName || 'كرتونة';
              const minWholesaleQty = Number((p as any).min_wholesale_qty || (p as any).minWholesaleQty || 1);

              return (
                <View
                  key={p.id}
                  style={[
                    styles.packCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border.default,
                    },
                  ]}
                >
                  <View style={[styles.packHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.packName, { color: colors.text.primary, textAlign }]}>{p.name}</Text>
                        
                        {/* Type badge */}
                        <View style={[
                          styles.typeBadge,
                          {
                            backgroundColor: packType === 'bundle'
                              ? (isDark ? 'rgba(168, 85, 247, 0.18)' : '#faf5ff')
                              : packType === 'half_wholesale'
                              ? (isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb')
                              : (isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff')
                          }
                        ]}>
                          <Text style={[
                            styles.typeBadgeText,
                            {
                              color: packType === 'bundle'
                                ? '#9333ea'
                                : packType === 'half_wholesale'
                                ? '#d97706'
                                : colors.primary[600]
                            }
                          ]}>
                            {packType === 'bundle' ? '🎁 باقة مجمعة' : packType === 'half_wholesale' ? '🛍️ نصف جملة' : '📦 كرتونة جملة'}
                          </Text>
                        </View>

                        <View style={[styles.piecesBadge, { backgroundColor: colors.primary[50] || 'rgba(59, 130, 246, 0.1)' }]}>
                          <Text style={[styles.piecesText, { color: colors.primary[600] }]}>×{totalPieces} قطعة ({unitName})</Text>
                        </View>
                      </View>

                      {minWholesaleQty > 1 && (
                        <Text style={[styles.minQtyBadge, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
                          الحد الأدنى للطلب: {minWholesaleQty} {unitName}
                        </Text>
                      )}

                      {p.barcode ? (
                        <View style={[styles.barcodeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Barcode size={12} color={colors.text.tertiary} />
                          <Text style={[styles.barcodeText, { color: colors.text.secondary }]}>{p.barcode}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => openEditPack(p)}
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff' }]}
                        accessibilityLabel="تعديل العبوة"
                      >
                        <Edit2 size={15} color={colors.primary[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletePack(p)}
                        style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2' }]}
                        accessibilityLabel="حذف العبوة"
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />

                  {/* Components List */}
                  <View style={styles.itemsPreview}>
                    <Text style={[styles.itemsLabel, { color: colors.text.secondary, textAlign }]}>
                      المكونات:
                    </Text>
                    {packItemsList.map((item, idx) => (
                      <Text key={idx} style={[styles.itemBullet, { color: colors.text.primary, textAlign }]}>
                        • {item.name || 'منتج'} ({item.qty || 1} قطعة)
                      </Text>
                    ))}
                  </View>

                  {/* Pack Footer with Stock & Margin Info */}
                  <View style={[styles.packFooterRow, { borderTopColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[
                      styles.stockStatusBadge,
                      availablePacks <= 0
                        ? { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2' }
                        : { backgroundColor: isDark ? 'rgba(168, 185, 129, 0.15)' : '#ecfdf5' }
                    ]}>
                      <Text style={[
                        styles.stockStatusText,
                        availablePacks <= 0 ? { color: '#ef4444' } : { color: '#10b981' }
                      ]}>
                        • {availablePacks > 0 ? `المتاح: ${availablePacks} عبوة` : 'غير متوفر بالقطع'}
                      </Text>
                    </View>

                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                      <Text style={[styles.packPrice, { color: colors.primary[600] }]}>
                        {Number(p.packPrice || (p as any).pack_price || (p as any).price || 0).toLocaleString()} {currency}
                      </Text>
                      {totalCost > 0 && (
                        <Text style={[styles.costHint, { color: colors.text.tertiary }]}>
                          التكلفة: {totalCost.toFixed(0)} | هامش: {((Number(p.packPrice || (p as any).pack_price || (p as any).price || 0) > 0 ? ((Number(p.packPrice || (p as any).pack_price || (p as any).price || 0) - totalCost) / Number(p.packPrice || (p as any).pack_price || (p as any).price || 0)) * 100 : 0)).toFixed(1)}%
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal: Add or Edit Pack */}
      <Modal visible={modalVisible && !showCameraScanner} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '92%' }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={18} color={colors.primary[600]} />
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  {editingPackId ? 'تعديل عبوة جملة' : 'إنشاء عبوة جملة جديدة'}
                </Text>
              </View>
            </View>

            <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
              {/* نوع العبوة والغرض التجاري */}
              <View style={[styles.packTypeContainer, { backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', borderColor: colors.border.subtle }]}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary, textAlign }]}>
                  نوع العبوة والغرض التجاري:
                </Text>

                <View style={{ gap: 8, marginTop: 8 }}>
                  {/* 1. طرد كرتونة جملة */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPackType('wholesale')}
                    style={[
                      styles.typeOptionCard,
                      {
                        backgroundColor: packType === 'wholesale'
                          ? (isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff')
                          : (isDark ? colors.surface : '#ffffff'),
                        borderColor: packType === 'wholesale' ? colors.primary[600] : colors.border.default,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeOptionTitle, { color: packType === 'wholesale' ? colors.primary[600] : colors.text.primary, textAlign }]}>
                        📦 طرد كرتونة جملة
                      </Text>
                      <Text style={[styles.typeOptionDesc, { color: colors.text.secondary, textAlign }]}>
                        تعبئة تجارية لصنف واحد (كرتونة/طرد)
                      </Text>
                    </View>
                    {packType === 'wholesale' && <Check size={16} color={colors.primary[600]} />}
                  </TouchableOpacity>

                  {/* 2. باقة مجمعة */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPackType('bundle')}
                    style={[
                      styles.typeOptionCard,
                      {
                        backgroundColor: packType === 'bundle'
                          ? (isDark ? 'rgba(168, 85, 247, 0.18)' : '#faf5ff')
                          : (isDark ? colors.surface : '#ffffff'),
                        borderColor: packType === 'bundle' ? '#9333ea' : colors.border.default,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeOptionTitle, { color: packType === 'bundle' ? '#9333ea' : colors.text.primary, textAlign }]}>
                        🎁 باقة مجمعة
                      </Text>
                      <Text style={[styles.typeOptionDesc, { color: colors.text.secondary, textAlign }]}>
                        حزمة أصناف متنوعة بسعر مجمع
                      </Text>
                    </View>
                    {packType === 'bundle' && <Check size={16} color="#9333ea" />}
                  </TouchableOpacity>

                  {/* 3. نصف جملة */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPackType('half_wholesale')}
                    style={[
                      styles.typeOptionCard,
                      {
                        backgroundColor: packType === 'half_wholesale'
                          ? (isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb')
                          : (isDark ? colors.surface : '#ffffff'),
                        borderColor: packType === 'half_wholesale' ? '#d97706' : colors.border.default,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeOptionTitle, { color: packType === 'half_wholesale' ? '#d97706' : colors.text.primary, textAlign }]}>
                        🛍️ نصف جملة
                      </Text>
                      <Text style={[styles.typeOptionDesc, { color: colors.text.secondary, textAlign }]}>
                        كيس أو دزينة مصغرة للتجار الصغار
                      </Text>
                    </View>
                    {packType === 'half_wholesale' && <Check size={16} color="#d97706" />}
                  </TouchableOpacity>
                </View>

                {/* وحدة التعبئة والحد الأدنى */}
                <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border.subtle, gap: 10 }}>
                  <View>
                    <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>
                      وحدة التعبئة (كرتونة، طرد، صندوق...)
                    </Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surface : '#ffffff', textAlign }]}
                      placeholder="كرتونة"
                      placeholderTextColor={colors.text.tertiary}
                      value={unitName}
                      onChangeText={setUnitName}
                    />
                    <View style={[styles.unitChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {['كرتونة', 'طرد', 'صندوق', 'دزينة', 'حزمة', 'كيس'].map((u) => (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setUnitName(u)}
                          style={[
                            styles.unitChip,
                            {
                              backgroundColor: unitName === u ? colors.primary[600] : (isDark ? colors.surface : '#e2e8f0'),
                            },
                          ]}
                        >
                          <Text style={[styles.unitChipText, { color: unitName === u ? '#ffffff' : colors.text.primary }]}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>
                      الحد الأدنى لطلب الجملة (عدد العبوات)
                    </Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surface : '#ffffff', textAlign }]}
                      placeholder="1"
                      placeholderTextColor={colors.text.tertiary}
                      value={minWholesaleQty}
                      onChangeText={setMinWholesaleQty}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.fieldHint, { color: colors.text.tertiary, textAlign }]}>
                      الحد الأدنى للعبوات المطلوبة لتطبيق تسعير الجملة
                    </Text>
                  </View>
                </View>
              </View>

              {/* اسم العبوة */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>اسم العبوة *</Text>
                <TextInput
                  style={[styles.formInput, { color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', textAlign }]}
                  placeholder="مثال: كرتونة عصير 12 قارورة"
                  placeholderTextColor={colors.text.tertiary}
                  value={packName}
                  onChangeText={setPackName}
                />
              </View>

              {/* الباركود */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>الباركود</Text>
                <View style={[styles.barcodeInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TextInput
                    style={[styles.formInput, { flex: 1, color: colors.text.primary, borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc', textAlign: 'left', fontVariant: ['tabular-nums'] }]}
                    placeholder="امسح أو ولّد باركود..."
                    placeholderTextColor={colors.text.tertiary}
                    value={packBarcode}
                    onChangeText={setPackBarcode}
                  />
                  <TouchableOpacity
                    style={[styles.generateBarcodeBtn, { backgroundColor: isDark ? colors.surfaceElevated : '#e2e8f0', borderColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => setPackBarcode(generateEAN13())}
                    activeOpacity={0.8}
                  >
                    <Sparkles size={14} color={colors.primary[600]} />
                    <Text style={[styles.generateBarcodeBtnText, { color: colors.primary[600] }]}>توليد</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scanBarcodeBtn, { backgroundColor: colors.primary[600] }]}
                    onPress={() => {
                      setScannerTarget('packBarcode');
                      setShowCameraScanner(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Camera size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* سعر بيع العبوة */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text.secondary, textAlign }]}>سعر بيع العبوة ({currency}) *</Text>
                <TextInput
                  style={[styles.formInputAmount, { color: colors.text.primary, borderColor: colors.primary[600], backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  value={packPrice}
                  onChangeText={setPackPrice}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>

              {/* Live Margin Calculation */}
              {parseFloat(packPrice) > 0 && selectedItems.length > 0 && (
                <View style={[styles.analysisCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#f0f7ff', borderColor: colors.primary[200] || '#bfdbfe' }]}>
                  <View style={[styles.analysisRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.analysisLabel}>إجمالي التكلفة:</Text>
                    <Text style={styles.analysisValue}>{modalMetrics.totalCost.toFixed(2)} {currency}</Text>
                  </View>
                  <View style={[styles.analysisRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.analysisLabel}>المخزون المتاح للتكوين:</Text>
                    <Text style={[styles.analysisValue, { color: modalMetrics.availablePacks > 0 ? '#10b981' : '#ef4444' }]}>
                      {modalMetrics.availablePacks} عبوة
                    </Text>
                  </View>
                  {modalMetrics.margin !== 0 && (
                    <View style={[styles.analysisRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.analysisLabel}>هامش الربح:</Text>
                      <Text style={[styles.analysisValue, { color: modalMetrics.margin >= 0 ? '#10b981' : '#ef4444' }]}>
                        {modalMetrics.margin.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                  {modalMetrics.buyerSavings > 0 && (
                    <View style={[styles.analysisRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.analysisLabel}>توفير الزبون (مقارنة بالتجزئة):</Text>
                      <Text style={[styles.analysisValue, { color: '#3b82f6' }]}>
                        {modalMetrics.buyerSavings.toFixed(2)} {currency}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* المنتجات المشمولة بالعبوة */}
              <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.formLabel, { color: colors.text.primary, fontWeight: 'bold', textAlign, marginBottom: 0 }]}>
                  المنتجات المشمولة بالعبوة ({selectedItems.length})
                </Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.addItemBtn, { backgroundColor: colors.primary[600], flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => setProductPickerVisible(true)}
                  >
                    <Plus size={14} color="#fff" />
                    <Text style={styles.addItemBtnText}>إضافة منتج للعبوة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addItemBtn, { backgroundColor: colors.indigo?.[600] || '#4f46e5', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => {
                      setScannerTarget('itemBarcode');
                      setShowCameraScanner(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Camera size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Empty state or Components list */}
              {selectedItems.length === 0 ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setProductPickerVisible(true)}
                  style={[styles.emptyItemsBox, { borderColor: colors.border.default, backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc' }]}
                >
                  <Package size={32} color={colors.text.tertiary} />
                  <Text style={[styles.emptyItemsText, { color: colors.text.secondary }]}>لم يتم تحديد منتجات بعد</Text>
                  <Text style={[styles.emptyItemsAction, { color: colors.primary[600] }]}>+ اضغط هنا لاختيار المنتجات</Text>
                </TouchableOpacity>
              ) : (
                selectedItems.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.selectedItemRow,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc',
                        borderColor: colors.border.subtle,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedItemText, { color: colors.text.primary, textAlign }]}>
                        {item.name}
                      </Text>
                    </View>

                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => updateItemQty(idx, item.qty - 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text.primary }]}>{item.qty}</Text>
                      <TouchableOpacity
                        onPress={() => updateItemQty(idx, item.qty + 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ marginLeft: 6 }}>
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Modal Actions: Cancel & Create */}
            <View style={[styles.modalActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border.default }]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text.secondary }]}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary[600], flex: 1 }]}
                onPress={handleSavePack}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.modalConfirmBtnText}>
                      {editingPackId ? 'حفظ التعديلات' : 'إنشاء العبوة'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={productPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.default, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={() => setProductPickerVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>اختيار منتج لإضافته</Text>
            </View>

            <View style={[styles.searchBar, { backgroundColor: isDark ? colors.surfaceElevated : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Search size={16} color={colors.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text.primary, textAlign }]}
                placeholder="بحث بالاسم أو الباركود..."
                placeholderTextColor={colors.text.tertiary}
                value={productSearch}
                onChangeText={setProductSearch}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickItem, { borderBottomColor: colors.border.subtle, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => addItemToPack(p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickItemName, { color: colors.text.primary, textAlign }]}>{p.name}</Text>
                    <Text style={[styles.barcodeText, { color: colors.text.secondary, textAlign }]}>
                      رصيد: {p.quantity || 0} {p.unit || ''} | تكلفة: {p.costPrice || 0}
                    </Text>
                  </View>
                  <Text style={[styles.pickItemPrice, { color: colors.primary[600] }]}>
                    {p.retailPrice || 0} {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Camera Scanner Modal */}
      {showCameraScanner && (
        <CameraScanner
          onClose={() => setShowCameraScanner(false)}
          onScan={(scannedCode) => {
            setShowCameraScanner(false);
            if (scannerTarget === 'packBarcode') {
              setPackBarcode(scannedCode);
            } else if (scannerTarget === 'itemBarcode') {
              const matched = products.find(
                (p) => p.barcode === scannedCode || (p as any).sku === scannedCode
              );
              if (matched) {
                addItemToPack(matched);
              } else {
                Alert.alert('تنبيه', `لم يتم العثور على منتج بالباركود: ${scannedCode}`);
              }
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  addBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  scroll: { flex: 1, paddingVertical: 12 },
  packCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  packHeader: { justifyContent: 'space-between', alignItems: 'center' },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  packName: { fontSize: 15, fontWeight: 'bold' },
  piecesBadge: { paddingHorizontal: 6, py: 2, borderRadius: 6 },
  piecesText: { fontSize: 11, fontWeight: 'bold' },
  barcodeRow: { alignItems: 'center', gap: 4, marginTop: 3 },
  barcodeText: { fontSize: 11 },
  divider: { height: 1, marginVertical: 10 },

  itemsPreview: { gap: 3 },
  itemsLabel: { fontSize: 11, fontWeight: 'bold' },
  itemBullet: { fontSize: 12 },

  packFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
  },
  stockStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockStatusText: { fontSize: 11, fontWeight: 'bold' },
  packPrice: { fontSize: 16, fontWeight: '800' },
  costHint: { fontSize: 10, marginTop: 1 },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 12 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },

  formGroup: { marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  formInputAmount: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 10,
    fontSize: 20,
    fontWeight: '800',
  },

  analysisCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  analysisRow: { justifyContent: 'space-between', alignItems: 'center' },
  analysisLabel: { fontSize: 11, color: '#64748b' },
  analysisValue: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },

  sectionHeaderRow: { justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  addItemBtn: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  addItemBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  selectedItemRow: { justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1 },
  selectedItemText: { fontSize: 12, fontWeight: '600' },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  qtyText: { fontSize: 13, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },

  modalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  searchBar: { alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, marginBottom: 10, gap: 6 },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 12 },
  pickItem: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  pickItemName: { fontSize: 14, fontWeight: 'bold' },
  pickItemPrice: { fontSize: 13, fontWeight: 'bold' },

  barcodeInputRow: {
    alignItems: 'center',
    gap: 8,
  },
  scanBarcodeBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  generateBarcodeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  minQtyBadge: {
    fontSize: 11,
    marginTop: 2,
  },
  packTypeContainer: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeOptionCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeOptionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  typeOptionDesc: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.85,
  },
  unitChipsRow: {
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  unitChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 10,
    marginTop: 3,
  },
  emptyItemsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyItemsText: {
    fontSize: 12,
  },
  emptyItemsAction: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalActionsRow: {
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PacksScreen;
