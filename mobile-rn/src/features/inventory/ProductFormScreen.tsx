import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Image,
  Platform,
} from 'react-native';
import {
  ArrowRight,
  Save,
  Barcode,
  Camera,
  Trash2,
  Package,
  DollarSign,
  Tag,
  Calendar,
  Layers,
  Check,
  X,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Percent,
  FolderPlus,
  Palette,
  Globe,
  Upload,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import CameraScanner from '@/features/barcode/CameraScanner';
import { AnposCamera } from '@/modules/AnposCamera';
import type { Product, Category } from '@shared/types';
import { colors, useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button } from '@/components/ui';

const UNITS = ['قطعة', 'علبة', 'كغ', 'غرام', 'لتر', 'متر', 'حزمة', 'كرتون', 'حبة'];

const PRESET_ICONS = [
  { label: 'مشروبات', icon: '🥤', bg: '#dbeafe', color: '#1d4ed8' },
  { label: 'أغذية', icon: '🍔', bg: '#fef3c7', color: '#b45309' },
  { label: 'خضار وفواكه', icon: '🍎', bg: '#fee2e2', color: '#b91c1c' },
  { label: 'مخبوزات', icon: '🍞', bg: '#ffedd5', color: '#c2410c' },
  { label: 'ألبان وأجبان', icon: '🧀', bg: '#fef9c3', color: '#a16207' },
  { label: 'لحوم وأسماك', icon: '🥩', bg: '#ffe4e6', color: '#be123c' },
  { label: 'حلويات', icon: '🍫', bg: '#f3e8ff', color: '#7e22ce' },
  { label: 'منظفات', icon: '🧼', bg: '#e0e7ff', color: '#4338ca' },
  { label: 'عناية وصحة', icon: '💊', bg: '#ccfbf1', color: '#0f766e' },
  { label: 'إلكترونيات', icon: '📱', bg: '#e2e8f0', color: '#334155' },
  { label: 'ملابس وأقمشة', icon: '👕', bg: '#ede9fe', color: '#6d28d9' },
  { label: 'بضاعة عامة', icon: '📦', bg: '#f1f5f9', color: '#475569' },
];

export const ProductFormScreen = ({ navigation, route }: any) => {
  const { isDark, colors } = useTheme();
  const { id: productId } = route.params || {};
  const isEdit = Boolean(productId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const initialBarcode = route.params?.barcode || '';

  // Form State
  const [form, setForm] = useState({
    name: '',
    barcode: initialBarcode,
    sku: '',
    category: '',
    categoryId: '',
    unit: 'قطعة',
    costPrice: '0',
    retailPrice: '0',
    wholesalePrice: '0',
    wholesaleMinQty: '0',
    quantity: '0',
    lowStockThreshold: '5',
    expiryDate: '',
    batchNumber: '',
    status: 'active',
    quickSale: true,
    image: '',
  });

  useEffect(() => {
    loadData();
  }, [productId]);

  async function loadData() {
    setLoading(true);
    try {
      await ensureInit();
      const allCategories = await db.categories.toArray();
      setCategories(allCategories);

      if (isEdit && productId) {
        const prod = await db.products.get(productId);
        if (prod) {
          setForm({
            name: prod.name || '',
            barcode: prod.barcode || '',
            sku: prod.sku || '',
            category: prod.category || '',
            categoryId: prod.categoryId || (prod as any).category_id || '',
            unit: prod.unit || 'قطعة',
            costPrice: String(prod.costPrice || (prod as any).purchase_price || (prod as any).cost_price || 0),
            retailPrice: String(prod.retailPrice || (prod as any).retail_price || 0),
            wholesalePrice: String(prod.wholesalePrice || (prod as any).wholesale_price || 0),
            wholesaleMinQty: String(prod.wholesaleMinQty || (prod as any).wholesale_min_qty || 0),
            quantity: String(prod.quantity || 0),
            lowStockThreshold: String(prod.lowStockThreshold || (prod as any).low_stock_threshold || 5),
            expiryDate: prod.expiryDate || (prod as any).expiry_date || '',
            batchNumber: prod.batchNumber || (prod as any).batch_number || '',
            status: prod.status || 'active',
            quickSale: prod.quickSale !== false,
            image: prod.image || '',
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load product form data:', err);
    }
    setLoading(false);
  }

  // Margin calculation
  const costNum = parseFloat(form.costPrice) || 0;
  const retailNum = parseFloat(form.retailPrice) || 0;
  const profitMarginVal = retailNum - costNum;
  const profitMarginPercent = costNum > 0 ? ((retailNum - costNum) / costNum) * 100 : 0;

  const handleBarcodeScanned = (code: string) => {
    setShowScanner(false);
    setForm((f) => ({ ...f, barcode: code }));
  };

  const handleGenerateSKU = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = form.name.trim().substring(0, 3).toUpperCase() || 'PRD';
    const skuCode = `${prefix}-${randomSuffix}`;
    setForm((f) => ({ ...f, sku: skuCode }));
  };

  const handleGenerateBarcode = () => {
    const randomBarcode = '613' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setForm((f) => ({ ...f, barcode: randomBarcode }));
  };

  // Image actions
  const handleCapturePhoto = async () => {
    try {
      const granted = await AnposCamera.requestPermission();
      if (!granted) {
        Alert.alert('تنبيه', 'يرجى السماح بالوصول إلى الكاميرا');
        return;
      }
      const photoUri = await AnposCamera.capturePhoto();
      if (photoUri) {
        setForm((f) => ({ ...f, image: photoUri }));
      }
    } catch (e) {
      console.warn('Capture photo failed:', e);
    }
  };

  const handlePickGallery = async () => {
    try {
      const imageUri = await AnposCamera.pickImage();
      if (imageUri) {
        setForm((f) => ({ ...f, image: imageUri }));
      }
    } catch (e) {
      console.warn('Pick gallery failed:', e);
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customImageUrl.trim();
    if (trimmed) {
      setForm((f) => ({ ...f, image: trimmed }));
      setCustomImageUrl('');
      setUrlModalVisible(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المنتج');
      return;
    }
    if (!form.retailPrice || parseFloat(form.retailPrice) < 0) {
      Alert.alert('تنبيه', 'يرجى إدخال سعر بيع صحيح');
      return;
    }

    setSaving(true);
    try {
      await ensureInit();
      const nowIso = new Date().toISOString();

      const costVal = parseFloat(form.costPrice) || 0;
      const retailVal = parseFloat(form.retailPrice) || 0;
      const wholesaleVal = parseFloat(form.wholesalePrice) || 0;
      const wholesaleMinVal = parseFloat(form.wholesaleMinQty) || 0;
      const qtyVal = parseFloat(form.quantity) || 0;
      const lowStockVal = parseFloat(form.lowStockThreshold) || 5;

      const productPayload: Partial<Product> = {
        name: form.name.trim(),
        barcode: form.barcode.trim(),
        sku: form.sku.trim(),
        category: form.category.trim() || 'عام',
        categoryId: form.categoryId || null,
        unit: form.unit,
        costPrice: costVal,
        retailPrice: retailVal,
        wholesalePrice: wholesaleVal,
        wholesaleMinQty: wholesaleMinVal,
        quantity: qtyVal,
        lowStockThreshold: lowStockVal,
        expiryDate: form.expiryDate.trim(),
        batchNumber: form.batchNumber.trim(),
        status: form.status as 'active' | 'inactive',
        image: form.image || undefined,
        updatedAt: nowIso,
      } as any;

      if (isEdit) {
        await db.products.update(productId, productPayload);
        Alert.alert('✓ تم التحديث', 'تم تحديث بيانات المنتج بنجاح');
      } else {
        const newId = generateId();
        await db.products.add({
          id: newId,
          ...productPayload,
          createdAt: nowIso,
        } as any);
        Alert.alert('✓ تم الحفظ', 'تمت إضافة المنتج الجديد بنجاح');
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert('خطأ', `فشل حفظ المنتج: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('حذف المنتج', `هل أنت متأكد من حذف المنتج "${form.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.products.delete(productId);
            navigation.goBack();
          } catch {
            Alert.alert('خطأ', 'فشل حذف المنتج');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          جاري تحميل بيانات المنتج...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Top Header ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border.default,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.headerBackBtn, { backgroundColor: colors.surfaceSubtle }]}
          activeOpacity={0.7}
        >
          <ArrowRight size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        </Text>

        <TouchableOpacity
          style={[
            styles.headerSaveBtn,
            saving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.saveBtnContent}>
              <Save size={16} color="#fff" />
              <Text style={styles.headerSaveBtnText}>حفظ</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section 0: Product Image / Photo Banner ── */}
        <View
          style={[
            styles.imageHeroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          {form.image ? (
            <View style={styles.imagePreviewWrapper}>
              {form.image.startsWith('http') ||
              form.image.startsWith('file:') ||
              form.image.startsWith('content:') ||
              form.image.startsWith('data:') ? (
                <Image
                  source={{ uri: form.image }}
                  style={styles.productImagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.iconBigBadge}>
                  <Text style={styles.iconBigEmoji}>{form.image}</Text>
                </View>
              )}

              <View style={styles.imageActionsOverlay}>
                <TouchableOpacity
                  style={styles.imageActionPill}
                  onPress={handleCapturePhoto}
                  activeOpacity={0.8}
                >
                  <Camera size={14} color="#fff" />
                  <Text style={styles.imageActionPillText}>تغيير</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageActionPill, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                  onPress={() => setForm((f) => ({ ...f, image: '' }))}
                  activeOpacity={0.8}
                >
                  <Trash2 size={14} color="#fff" />
                  <Text style={styles.imageActionPillText}>حذف</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageEmptyContainer}>
              <View
                style={[
                  styles.imagePlaceholderBox,
                  { backgroundColor: colors.primary[50] },
                ]}
              >
                <ImageIcon size={32} color={colors.primary[600]} />
              </View>
              <Text style={[styles.imageEmptyTitle, { color: colors.text.primary }]}>
                صورة المنتج
              </Text>
              <Text style={[styles.imageEmptySub, { color: colors.text.secondary }]}>
                أضف صورة واضحة لتسهيل التعرف على المنتج في نقطة البيع
              </Text>

              {/* 4 Image Source Options */}
              <View style={styles.imageBtnGrid}>
                <TouchableOpacity
                  style={[
                    styles.imageOptionBtn,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border.default },
                  ]}
                  onPress={handleCapturePhoto}
                  activeOpacity={0.7}
                >
                  <Camera size={16} color={colors.primary[600]} />
                  <Text style={[styles.imageOptionText, { color: colors.text.primary }]}>
                    كاميرا
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.imageOptionBtn,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border.default },
                  ]}
                  onPress={handlePickGallery}
                  activeOpacity={0.7}
                >
                  <Upload size={16} color="#10b981" />
                  <Text style={[styles.imageOptionText, { color: colors.text.primary }]}>
                    معرض الصور
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.imageOptionBtn,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border.default },
                  ]}
                  onPress={() => setIconPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Palette size={16} color="#8b5cf6" />
                  <Text style={[styles.imageOptionText, { color: colors.text.primary }]}>
                    رموز جاهزة
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.imageOptionBtn,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border.default },
                  ]}
                  onPress={() => setUrlModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Globe size={16} color="#f59e0b" />
                  <Text style={[styles.imageOptionText, { color: colors.text.primary }]}>
                    رابط ويب
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Section 1: Basic Information ── */}
        <View style={styles.sectionHeadingRow}>
          <Package size={16} color={colors.primary[600]} />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            1. المعلومات الأساسية
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
              اسم المنتج <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border.default,
                  color: colors.text.primary,
                },
              ]}
              placeholder="مثال: حليب كانديا 1 لتر"
              placeholderTextColor={colors.text.tertiary}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              textAlign="right"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
              القسم / الفئة
            </Text>
            <TouchableOpacity
              style={[
                styles.selectBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border.default,
                },
              ]}
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.selectBtnText,
                  { color: form.category ? colors.text.primary : colors.text.tertiary },
                ]}
              >
                {form.category || 'اختر فئة المنتج...'}
              </Text>
              <Tag size={16} color={colors.primary[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
              وحدة القياس
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.unitScroll}
              contentContainerStyle={{ gap: 6 }}
            >
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitChip,
                    {
                      backgroundColor:
                        form.unit === u ? colors.primary[600] : colors.surfaceSubtle,
                      borderColor:
                        form.unit === u ? colors.primary[600] : colors.border.default,
                    },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, unit: u }))}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      { color: form.unit === u ? '#fff' : colors.text.secondary },
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* ── Section 2: Barcode & Identifiers ── */}
        <View style={styles.sectionHeadingRow}>
          <Barcode size={16} color={colors.primary[600]} />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            2. الباركود والتعريف
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <View style={styles.formGroup}>
            <View style={styles.labelWithAction}>
              <TouchableOpacity onPress={handleGenerateBarcode} activeOpacity={0.7}>
                <Text style={styles.actionLink}>توليد باركود تلقائي</Text>
              </TouchableOpacity>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                الباركود الأساسي
              </Text>
            </View>

            <View style={styles.barcodeRow}>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setShowScanner(true)}
                activeOpacity={0.85}
              >
                <Camera size={16} color="#fff" />
                <Text style={styles.scanBtnText}>مسح</Text>
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.formInput,
                  {
                    flex: 1,
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="613xxxxxxxxxx"
                placeholderTextColor={colors.text.tertiary}
                value={form.barcode}
                onChangeText={(v) => setForm((f) => ({ ...f, barcode: v }))}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelWithAction}>
              <TouchableOpacity onPress={handleGenerateSKU} activeOpacity={0.7}>
                <Text style={styles.actionLink}>توليد SKU</Text>
              </TouchableOpacity>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                رمز SKU / المرجع الداخلي
              </Text>
            </View>

            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border.default,
                  color: colors.text.primary,
                },
              ]}
              placeholder="PRD-001"
              placeholderTextColor={colors.text.tertiary}
              value={form.sku}
              onChangeText={(v) => setForm((f) => ({ ...f, sku: v }))}
              textAlign="right"
            />
          </View>
        </View>

        {/* ── Section 3: Pricing & Margins ── */}
        <View style={styles.sectionHeadingRow}>
          <DollarSign size={16} color="#10b981" />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            3. الأسعار والتسعير
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                سعر التكلفة (الشراء)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.text.tertiary}
                value={form.costPrice}
                onChangeText={(v) => setForm((f) => ({ ...f, costPrice: v }))}
                keyboardType="numeric"
                textAlign="center"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.primary[600], fontWeight: '800' }]}>
                سعر التجزئة (البيع) <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.primary[50],
                    borderColor: colors.primary[400],
                    color: colors.primary[700],
                    fontWeight: '800',
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.primary[300]}
                value={form.retailPrice}
                onChangeText={(v) => setForm((f) => ({ ...f, retailPrice: v }))}
                keyboardType="numeric"
                textAlign="center"
              />
            </View>
          </View>

          {/* Profit Margin Preview Bar */}
          {retailNum > 0 && (
            <View
              style={[
                styles.marginPreviewBox,
                {
                  backgroundColor: profitMarginVal >= 0 ? '#f0fdf4' : '#fef2f2',
                  borderColor: profitMarginVal >= 0 ? '#bbf7d0' : '#fecaca',
                },
              ]}
            >
              <View style={styles.marginCol}>
                <Text style={styles.marginLabel}>الربح الصافي للقطعة</Text>
                <Text
                  style={[
                    styles.marginValue,
                    { color: profitMarginVal >= 0 ? '#15803d' : '#b91c1c' },
                  ]}
                >
                  {profitMarginVal.toFixed(2)} دج
                </Text>
              </View>

              <View style={styles.marginCol}>
                <Text style={styles.marginLabel}>نسبة هامش الربح</Text>
                <Text
                  style={[
                    styles.marginValue,
                    { color: profitMarginVal >= 0 ? '#15803d' : '#b91c1c' },
                  ]}
                >
                  %{profitMarginPercent.toFixed(1)}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.rowInputs, { marginTop: spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                الحد الأدنى للجملة
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="مثال: 6 أو 12"
                placeholderTextColor={colors.text.tertiary}
                value={form.wholesaleMinQty}
                onChangeText={(v) => setForm((f) => ({ ...f, wholesaleMinQty: v }))}
                keyboardType="numeric"
                textAlign="center"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                سعر الجملة
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.text.tertiary}
                value={form.wholesalePrice}
                onChangeText={(v) => setForm((f) => ({ ...f, wholesalePrice: v }))}
                keyboardType="numeric"
                textAlign="center"
              />
            </View>
          </View>
        </View>

        {/* ── Section 4: Stock & Expiry ── */}
        <View style={styles.sectionHeadingRow}>
          <Calendar size={16} color="#f59e0b" />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            4. المخزون وتواريخ الصلاحية
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                حد تنبيه نقص المخزون
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="5"
                placeholderTextColor={colors.text.tertiary}
                value={form.lowStockThreshold}
                onChangeText={(v) => setForm((f) => ({ ...f, lowStockThreshold: v }))}
                keyboardType="numeric"
                textAlign="center"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                الكمية الحالية في المخزون
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                value={form.quantity}
                onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
                keyboardType="numeric"
                textAlign="center"
              />
            </View>
          </View>

          <View style={[styles.rowInputs, { marginTop: spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                رقم الدفعة (Lot/Batch)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="B-2026"
                placeholderTextColor={colors.text.tertiary}
                value={form.batchNumber}
                onChangeText={(v) => setForm((f) => ({ ...f, batchNumber: v }))}
                textAlign="right"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
                تاريخ انتهاء الصلاحية
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border.default,
                    color: colors.text.primary,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.text.tertiary}
                value={form.expiryDate}
                onChangeText={(v) => setForm((f) => ({ ...f, expiryDate: v }))}
                textAlign="center"
              />
            </View>
          </View>
        </View>

        {/* ── Section 5: Status & Visibility ── */}
        <View style={styles.sectionHeadingRow}>
          <Layers size={16} color="#8b5cf6" />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            5. الحالة والخيارات
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <View style={styles.switchRow}>
            <Switch
              value={form.status === 'active'}
              onValueChange={(val) =>
                setForm((f) => ({ ...f, status: val ? 'active' : 'inactive' }))
              }
              trackColor={{ true: '#10b981', false: colors.slate[300] }}
              thumbColor="#ffffff"
            />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.switchLabel, { color: colors.text.primary }]}>
                تفعيل المنتج في نقطة البيع
              </Text>
              <Text style={[styles.switchSub, { color: colors.text.secondary }]}>
                {form.status === 'active'
                  ? 'نشط ويظهر في شاشة البيع السريع والمخزون'
                  : 'معطّل ومخفي من القوائم'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Delete Button (Edit mode only) ── */}
        {isEdit && (
          <TouchableOpacity
            style={[styles.deleteProductBtn, { backgroundColor: colors.surface }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text style={styles.deleteProductBtnText}>حذف هذا المنتج نهائياً</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Category Picker Modal ── */}
      <Modal visible={categoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border.default,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                اختر فئة المنتج
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catPickItem,
                    { borderBottomColor: colors.border.default },
                  ]}
                  onPress={() => {
                    setForm((f) => ({ ...f, category: c.name, categoryId: c.id }));
                    setCategoryModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catPickItemName, { color: colors.text.primary }]}>
                    {c.name}
                  </Text>
                  {form.category === c.name && (
                    <Check size={18} color={colors.primary[600]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Preset Icon Picker Modal ── */}
      <Modal visible={iconPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border.default,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIconPickerVisible(false)}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                اختر رمزاً للمنتج
              </Text>
            </View>

            <View style={styles.iconGrid}>
              {PRESET_ICONS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.iconChoiceCard, { backgroundColor: p.bg }]}
                  onPress={() => {
                    setForm((f) => ({ ...f, image: p.icon }));
                    setIconPickerVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.iconChoiceEmoji}>{p.icon}</Text>
                  <Text style={[styles.iconChoiceLabel, { color: p.color }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Web Image URL Modal ── */}
      <Modal visible={urlModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.urlCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border.default,
              },
            ]}
          >
            <Text style={[styles.urlTitle, { color: colors.text.primary }]}>
              إضافة رابط صورة
            </Text>
            <TextInput
              style={[
                styles.urlInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border.default,
                  color: colors.text.primary,
                },
              ]}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.text.tertiary}
              value={customImageUrl}
              onChangeText={setCustomImageUrl}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="left"
            />
            <View style={styles.urlBtnRow}>
              <Button
                title="تطبيق"
                variant="primary"
                onPress={handleApplyCustomUrl}
                size="md"
              />
              <Button
                title="إلغاء"
                variant="ghost"
                onPress={() => setUrlModalVisible(false)}
                size="md"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Direct Camera Barcode Scanner (No nested Modal to prevent white screen) ── */}
      {showScanner && (
        <CameraScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 38,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  headerSaveBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radii.md,
    ...shadows.xs,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerSaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  // ── Scroll Content ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },

  // ── Product Image Hero Card ──
  imageHeroCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 190,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImagePreview: {
    width: '100%',
    height: '100%',
  },
  iconBigBadge: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  iconBigEmoji: {
    fontSize: 64,
  },
  imageActionsOverlay: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  imageActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  imageActionPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  imageEmptyContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  imagePlaceholderBox: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  imageEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
    marginBottom: 2,
  },
  imageEmptySub: {
    fontSize: 12,
    fontFamily: 'Cairo',
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: spacing.md,
  },
  imageBtnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    width: '100%',
  },
  imageOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    minWidth: '46%',
    justifyContent: 'center',
  },
  imageOptionText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // ── Sections & Cards ──
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm + 2,
    ...shadows.xs,
  },

  // ── Form Elements ──
  formGroup: {
    gap: 4,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  actionLink: {
    fontSize: 11,
    color: '#2563eb',
    fontFamily: 'Cairo',
    fontWeight: '700',
  },
  requiredMark: {
    color: '#ef4444',
    fontWeight: '900',
  },
  formInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: 'Cairo',
    textAlign: 'right',
  },

  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
  },
  selectBtnText: {
    fontSize: 13,
    fontFamily: 'Cairo',
    fontWeight: '600',
  },

  unitScroll: {
    marginTop: 2,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  unitChipText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },

  barcodeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  scanBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  rowInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Margin preview
  marginPreviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  marginCol: {
    alignItems: 'center',
  },
  marginLabel: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
    color: '#64748b',
    fontWeight: '600',
  },
  marginValue: {
    fontSize: 13,
    fontFamily: 'Cairo',
    fontWeight: '900',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  switchSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
    marginTop: 1,
  },

  deleteProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 12,
    borderRadius: radii.lg,
    marginTop: spacing.xs,
  },
  deleteProductBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  catPickItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  catPickItemName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  iconChoiceCard: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconChoiceEmoji: {
    fontSize: 26,
  },
  iconChoiceLabel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  urlCard: {
    width: '100%',
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    ...shadows.lg,
  },
  urlTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  urlInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
  },
  urlBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

export default ProductFormScreen;
