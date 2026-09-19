import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Check,
  Package,
  Barcode,
  Camera,
  Search,
  Sparkles,
  RefreshCw,
  Layers,
  TrendingDown,
  ShoppingBag,
} from 'lucide-react-native';
import CameraScanner from '@/features/barcode/CameraScanner';
import { generateEAN13 } from '@/lib/barcodeSvg';
import { useTheme } from '@/theme';
import type { Product, Pack } from '@shared/types';
import type {
  FavoriteItem,
  FavoriteCategory,
  FavoritePackFormData,
  FavoritePackType,
} from '../types';
import {
  PRESET_PIECE_COUNTS,
  PRESET_UNIT_NAMES,
  PACK_TYPE_LABELS,
} from '../constants/favoriteVisuals';
import {
  calculateQuickPackPrice,
  generateQuickPackName,
  saveFavoritePackDual,
} from '../services/favoritePackService';

interface FavoritePackFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  editingItem?: FavoriteItem | null;
  initialProduct?: Product | null;
  targetCategoryId?: string;
  categories: FavoriteCategory[];
  products: Product[];
  packs: Pack[];
  onClose: () => void;
  onSuccess: (targetCatId: string) => void;
}

export const FavoritePackFormModal: React.FC<FavoritePackFormModalProps> = ({
  visible,
  mode,
  editingItem,
  initialProduct,
  targetCategoryId,
  categories,
  products,
  packs,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();

  // الحالة
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [piecesCount, setPiecesCount] = useState(12);
  const [unitName, setUnitName] = useState('كرتونة');
  const [packName, setPackName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [targetCatId, setTargetCatId] = useState('');
  const [packType, setPackType] = useState<FavoritePackType>('wholesale');
  const [minWholesaleQty, setMinWholesaleQty] = useState('1');

  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  // تهيئة البيانات عند الفتح
  useEffect(() => {
    if (!visible) return;

    if (mode === 'edit' && editingItem) {
      // وضع التعديل
      const parentProd = products.find((p) => p.id === editingItem.parentProductId);
      setSelectedProduct(parentProd || null);
      setPiecesCount(editingItem.packQty || 12);
      setUnitName(editingItem.packUnit || 'كرتونة');
      setPackName(editingItem.name || '');
      setBarcode(editingItem.barcode || '');
      setPackPrice(String(editingItem.price || ''));
      setTargetCatId(editingItem.categoryId || (categories[0]?.id ?? ''));

      // البحث عن كائن العبوة في packs لجلب نوعها والحد الأدنى
      const existingPack = packs.find((p) => p.id === editingItem.itemId);
      if (existingPack) {
        setPackType(((existingPack as any).pack_type || (existingPack as any).packType || 'wholesale') as any);
        setMinWholesaleQty(String((existingPack as any).min_wholesale_qty || (existingPack as any).minWholesaleQty || 1));
      }
    } else {
      // وضع الإنشاء
      const baseProd = initialProduct || products[0] || null;
      setSelectedProduct(baseProd);
      const defaultPieces = 12;
      const defaultUnit = 'كرتونة';
      setPiecesCount(defaultPieces);
      setUnitName(defaultUnit);
      setTargetCatId(targetCategoryId && targetCategoryId !== 'ALL' ? targetCategoryId : categories[0]?.id || '');
      setBarcode(generateEAN13());
      setPackType('wholesale');
      setMinWholesaleQty('1');

      if (baseProd) {
        const generated = generateQuickPackName(defaultUnit, baseProd.name, defaultPieces);
        setPackName(generated);
        const retail = Number(baseProd.retailPrice ?? (baseProd as any)?.retail_price ?? 0);
        setPackPrice(String(calculateQuickPackPrice(retail, defaultPieces)));
      } else {
        setPackName('');
        setPackPrice('');
      }
    }
  }, [visible, mode, editingItem, initialProduct, targetCategoryId, products, categories, packs]);

  // تحديث الاسم والسعر التلقائي عند تغيير المنتج أو عدد القطع
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductPickerOpen(false);

    const generated = generateQuickPackName(unitName, prod.name, piecesCount);
    setPackName(generated);

    const retail = Number(prod.retailPrice ?? (prod as any)?.retail_price ?? 0);
    setPackPrice(String(calculateQuickPackPrice(retail, piecesCount)));
  };

  const handleChangePieces = (count: number) => {
    setPiecesCount(count);
    if (selectedProduct) {
      setPackName(generateQuickPackName(unitName, selectedProduct.name, count));
      const retail = Number(selectedProduct.retailPrice ?? (selectedProduct as any)?.retail_price ?? 0);
      setPackPrice(String(calculateQuickPackPrice(retail, count)));
    }
  };

  const handleChangeUnit = (unit: string) => {
    setUnitName(unit);
    if (selectedProduct) {
      setPackName(generateQuickPackName(unit, selectedProduct.name, piecesCount));
    }
  };

  const handleAutoName = () => {
    if (!selectedProduct) return;
    setPackName(generateQuickPackName(unitName, selectedProduct.name, piecesCount));
  };

  const handleAutoPrice = () => {
    if (!selectedProduct) return;
    const retail = Number(selectedProduct.retailPrice ?? (selectedProduct as any)?.retail_price ?? 0);
    setPackPrice(String(calculateQuickPackPrice(retail, piecesCount)));
  };

  // فلترة قائمة اختيار المنتجات
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 40);
    return products
      .filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.includes(q))
      )
      .slice(0, 40);
  }, [products, productSearch]);

  // حساب التوفير والمؤشرات المالية
  const baseRetail = Number(selectedProduct?.retailPrice ?? (selectedProduct as any)?.retail_price ?? 0);
  const totalRetail = baseRetail * piecesCount;
  const currentPackPrice = parseFloat(packPrice) || 0;
  const buyerSavings = totalRetail > currentPackPrice ? totalRetail - currentPackPrice : 0;
  const availableStock = selectedProduct
    ? Math.floor(Number(selectedProduct.quantity ?? (selectedProduct as any)?.qty ?? 0) / (piecesCount || 1))
    : 0;

  // الحفظ النهائي
  const handleSave = async () => {
    if (!selectedProduct) {
      Alert.alert('تنبيه', 'يرجى اختيار المنتج الأساسي للعبوة');
      return;
    }
    if (!packName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العبوة');
      return;
    }
    if (currentPackPrice <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر صحيح للعبوة');
      return;
    }
    if (!targetCatId) {
      Alert.alert('تنبيه', 'يرجى اختيار تصنيف المفضلة');
      return;
    }

    setSaving(true);
    try {
      const formData: FavoritePackFormData = {
        id: editingItem?.id,
        packId: editingItem?.itemId,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productBarcode: selectedProduct.barcode,
        productRetailPrice: baseRetail,
        productStock: Number(selectedProduct.quantity ?? (selectedProduct as any)?.qty ?? 0),
        piecesCount,
        unitName,
        packName: packName.trim(),
        barcode: barcode.trim(),
        packPrice: String(currentPackPrice),
        isCustomPrice: currentPackPrice !== totalRetail,
        targetCatId,
        packType,
        minWholesaleQty: parseInt(minWholesaleQty, 10) || 1,
      };

      await saveFavoritePackDual(formData, mode === 'edit');
      onSuccess(targetCatId);
      onClose();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ العبوة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.border.default : '#e2e8f0',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
            <View style={styles.headerTitleRow}>
              <Package size={18} color={colors.primary[500]} />
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {mode === 'edit' ? 'تعديل العبوة السريعة' : 'إنشاء عبوة سريعة جديدة'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* 1. اختيار المنتج الأساسي (مع دعم التغيير في التعديل والإضافة) */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <ShoppingBag size={15} color={colors.primary[500]} />
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  المنتج الأساسي المرتبط:
                </Text>
              </View>

              {selectedProduct ? (
                <View
                  style={[
                    styles.selectedProductCard,
                    {
                      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                      borderColor: isDark ? colors.border.default : '#cbd5e1',
                    },
                  ]}
                >
                  <View style={styles.productDetails}>
                    <Text style={[styles.prodName, { color: colors.text.primary }]}>
                      {selectedProduct.name}
                    </Text>
                    <View style={styles.prodMetaRow}>
                      <Text style={[styles.prodMeta, { color: colors.primary[500] }]}>
                        سعر الحبة: {baseRetail.toLocaleString()} د.ج
                      </Text>
                      <Text style={[styles.prodMeta, { color: colors.text.secondary }]}>
                        الرصيد المتاح: {availableStock} {unitName}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.changeProdBtn, { backgroundColor: colors.primary[50] }]}
                    onPress={() => setProductPickerOpen(true)}
                  >
                    <Search size={14} color={colors.primary[600]} />
                    <Text style={[styles.changeProdBtnText, { color: colors.primary[600] }]}>
                      تغيير
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.selectProdBtn, { borderColor: colors.primary[500] }]}
                  onPress={() => setProductPickerOpen(true)}
                >
                  <Search size={16} color={colors.primary[500]} />
                  <Text style={[styles.selectProdBtnText, { color: colors.primary[500] }]}>
                    اختر منتج التجزئة الأساسي من المخزن
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 2. عدد القطع ومسمى الوحدة */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                مواصفات التعبئة:
              </Text>

              {/* أزرار عدد القطع السريعة */}
              <Text style={[styles.subLabel, { color: colors.text.secondary }]}>
                عدد القطع بالعبوة:
              </Text>
              <View style={styles.chipsRow}>
                {PRESET_PIECE_COUNTS.map((cnt) => {
                  const isSelected = piecesCount === cnt;
                  return (
                    <TouchableOpacity
                      key={cnt}
                      style={[
                        styles.chipBtn,
                        isSelected
                          ? [styles.activeChipBtn, { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]
                          : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? colors.border.default : '#cbd5e1' },
                      ]}
                      onPress={() => handleChangePieces(cnt)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#ffffff' : colors.text.primary },
                        ]}
                      >
                        {cnt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* أزرار مسمى الوحدة السريعة */}
              <Text style={[styles.subLabel, { color: colors.text.secondary, marginTop: 10 }]}>
                مسمى الوحدة:
              </Text>
              <View style={styles.chipsRow}>
                {PRESET_UNIT_NAMES.map((unit) => {
                  const isSelected = unitName === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.chipBtn,
                        isSelected
                          ? [styles.activeChipBtn, { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]
                          : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? colors.border.default : '#cbd5e1' },
                      ]}
                      onPress={() => handleChangeUnit(unit)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#ffffff' : colors.text.primary },
                        ]}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. اسم العبوة والباركود */}
            <View style={styles.section}>
              <View style={styles.fieldHeader}>
                <TouchableOpacity onPress={handleAutoName} style={styles.autoBtn}>
                  <Sparkles size={13} color={colors.primary[500]} />
                  <Text style={[styles.autoBtnText, { color: colors.primary[500] }]}>
                    توليد تلقائي
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  اسم العبوة الظاهر:
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                    borderColor: isDark ? colors.border.default : '#cbd5e1',
                    color: colors.text.primary,
                  },
                ]}
                value={packName}
                onChangeText={setPackName}
                placeholder="مثال: كرتونة عصير (12 قطعة)"
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
              />

              {/* حقل الباركود مع التوليد والكاميرا */}
              <Text style={[styles.subLabel, { color: colors.text.secondary, marginTop: 10 }]}>
                باركود العبوة:
              </Text>
              <View style={styles.barcodeRow}>
                <TouchableOpacity
                  style={[styles.scannerBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => setShowScanner(true)}
                >
                  <Camera size={18} color={colors.primary[500]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scannerBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => setBarcode(generateEAN13())}
                >
                  <RefreshCw size={16} color={colors.primary[500]} />
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.barcodeInput,
                    {
                      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                      borderColor: isDark ? colors.border.default : '#cbd5e1',
                      color: colors.text.primary,
                    },
                  ]}
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="باركود الكرتونة الدولي"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            {/* 4. التسعير والتخفيض ومؤشر توفير الزبون */}
            <View style={styles.section}>
              <View style={styles.fieldHeader}>
                <TouchableOpacity onPress={handleAutoPrice} style={styles.autoBtn}>
                  <RefreshCw size={13} color={colors.primary[500]} />
                  <Text style={[styles.autoBtnText, { color: colors.primary[500] }]}>
                    سعر التجزئة المباشر
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  سعر بيع العبوة (د.ج):
                </Text>
              </View>

              <TextInput
                style={[
                  styles.priceInput,
                  {
                    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                    borderColor: isDark ? colors.border.default : '#cbd5e1',
                    color: colors.primary[500],
                  },
                ]}
                value={packPrice}
                onChangeText={setPackPrice}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                textAlign="center"
              />

              {/* شريط المؤشرات */}
              <View style={styles.metricsBar}>
                <Text style={[styles.metricText, { color: colors.text.secondary }]}>
                  إجمالي التجزئة: {totalRetail.toLocaleString()} د.ج
                </Text>
                {buyerSavings > 0 && (
                  <View style={styles.savingsTag}>
                    <TrendingDown size={13} color="#059669" />
                    <Text style={styles.savingsTagText}>
                      توفير المشتري: {buyerSavings.toLocaleString()} د.ج
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 5. تصنيف المفضلة المستهدف ونوع الباقة */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                تصنيف المفضلة التابع له:
              </Text>
              <View style={styles.chipsRow}>
                {categories.map((c) => {
                  const isSelected = targetCatId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.chipBtn,
                        isSelected
                          ? [styles.activeChipBtn, { backgroundColor: c.color || colors.primary[500], borderColor: c.color }]
                          : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? colors.border.default : '#cbd5e1' },
                      ]}
                      onPress={() => setTargetCatId(c.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#ffffff' : colors.text.primary },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* نوع الباقة */}
              <Text style={[styles.subLabel, { color: colors.text.secondary, marginTop: 10 }]}>
                نوع الباقة في النظام:
              </Text>
              <View style={styles.chipsRow}>
                {(['wholesale', 'bundle', 'half_wholesale'] as FavoritePackType[]).map((t) => {
                  const isSelected = packType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.chipBtn,
                        isSelected
                          ? [styles.activeChipBtn, { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]
                          : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? colors.border.default : '#cbd5e1' },
                      ]}
                      onPress={() => setPackType(t)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#ffffff' : colors.text.primary },
                        ]}
                      >
                        {PACK_TYPE_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={[
              styles.footer,
              { borderTopColor: isDark ? colors.border.default : '#f1f5f9' },
            ]}
          >
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text.secondary }]}>
                إلغاء
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary[500] }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" />
                  <Text style={styles.saveBtnText}>
                    {mode === 'edit' ? 'حفظ التعديلات الموحدة' : 'إنشاء وحفظ العبوة'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* نافذة فرعية لاختيار منتج التجزئة */}
      <Modal visible={productPickerOpen} transparent animationType="fade">
        <View style={styles.subModalOverlay}>
          <View
            style={[
              styles.subModalBox,
              { backgroundColor: colors.surface, borderColor: isDark ? colors.border.default : '#e2e8f0' },
            ]}
          >
            <View style={styles.subModalHeader}>
              <TouchableOpacity onPress={() => setProductPickerOpen(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.subModalTitle, { color: colors.text.primary }]}>
                اختر منتج التجزئة
              </Text>
            </View>

            <View style={styles.subModalSearch}>
              <Search size={16} color={colors.text.tertiary} />
              <TextInput
                style={[styles.subModalSearchInput, { color: colors.text.primary }]}
                placeholder="ابحث بالاسم أو الباركود..."
                placeholderTextColor={colors.text.tertiary}
                value={productSearch}
                onChangeText={setProductSearch}
                textAlign="right"
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {filteredProducts.map((p) => {
                const ret = Number(p.retailPrice ?? (p as any)?.retail_price ?? 0);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.productOptionRow,
                      { borderBottomColor: isDark ? '#334155' : '#f1f5f9' },
                    ]}
                    onPress={() => handleSelectProduct(p)}
                  >
                    <View style={styles.productOptionMeta}>
                      <Text style={[styles.productOptionPrice, { color: colors.primary[500] }]}>
                        {ret.toLocaleString()} د.ج
                      </Text>
                      <Text style={[styles.productOptionStock, { color: colors.text.secondary }]}>
                        الرصيد: {p.quantity ?? (p as any)?.qty ?? 0}
                      </Text>
                    </View>
                    <Text style={[styles.productOptionName, { color: colors.text.primary }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ماسح الكاميرا للباركود */}
      {showScanner && (
        <CameraScanner
          onScan={(code: string) => {
            setBarcode(code);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  closeBtn: {
    padding: 4,
  },
  headerTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  selectedProductCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  productDetails: {
    alignItems: 'flex-end',
    gap: 3,
  },
  prodName: {
    fontSize: 14,
    fontWeight: '800',
  },
  prodMetaRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  prodMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  changeProdBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  changeProdBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectProdBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 8,
  },
  selectProdBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeChipBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  autoBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  barcodeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  scannerBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '900',
  },
  metricsBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
  },
  savingsTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
  },
  savingsTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  footer: {
    flexDirection: 'row-reverse',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  subModalBox: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 480,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subModalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  subModalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    margin: 10,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    gap: 8,
  },
  subModalSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  productOptionRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  productOptionName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  productOptionMeta: {
    alignItems: 'flex-start',
  },
  productOptionPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
  productOptionStock: {
    fontSize: 10,
  },
});
