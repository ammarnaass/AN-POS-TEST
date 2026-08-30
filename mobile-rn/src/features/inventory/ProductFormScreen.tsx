import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  ArrowRight,
  Save,
  Camera,
  Image as ImageIcon,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Info,
  MoreHorizontal,
  Truck,
  SlidersHorizontal,
  Calendar,
  ScanLine,
  Barcode,
  Check,
  Tag,
  Upload,
  Globe,
  Sparkles,
  Layers,
  FlaskConical,
  ArrowUpRight,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { syncEngine } from '@/lib/syncEngine';
import CameraScanner from '@/features/barcode/CameraScanner';
import { AnposCamera } from '@/modules/AnposCamera';
import type { Product, Category, Supplier } from '@shared/types';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { notify } from '@/lib/notify';

const UNITS = ['قطعة', 'علبة', 'كغ', 'غرام', 'لتر', 'متر', 'حزمة', 'كرتون', 'حبة', 'طرد'];

interface CustomPriceItem {
  id: string;
  name: string;
  price: string;
  barcode?: string;
}

export const ProductFormScreen = ({ navigation, route }: any) => {
  const { isDark, colors } = useTheme();
  const { id: productId } = route.params || {};
  const isEdit = Boolean(productId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Accordion Sections State
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    details: false,
    wholesale: false,
    advanced: false,
  });

  const toggleSection = (section: 'basic' | 'details' | 'wholesale' | 'advanced') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Form State
  const initialBarcode = route.params?.barcode || '';
  const [form, setForm] = useState({
    name: '',
    barcode: initialBarcode,
    category: '',
    categoryId: '',
    retailPrice: '',
    costPrice: '0',
    quantity: '0',
    unit: 'قطعة',
    description: '',
    supplier: '',
    supplierId: '',
    lowStockThreshold: '0',
    color: '',
    sizeOrWeight: '',
    expiryDate: '',
    location: '',
    wholesalePrice: '',
    wholesaleMinQty: '0',
    wholesaleUnitName: 'كرتون',
    quickSale: true, // "منتج مميز"
    hasVariants: false, // "يملك متغيرات"
    image: '',
  });

  // Advanced sub-lists
  const [secondaryBarcodes, setSecondaryBarcodes] = useState<string[]>([]);
  const [customPrices, setCustomPrices] = useState<CustomPriceItem[]>([]);

  // Validation & Error states
  const [errors, setErrors] = useState<{ name?: string; retailPrice?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; retailPrice?: boolean }>({});

  // Categories & Suppliers
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modals
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'main' | 'secondary' | 'customPrice'>('main');
  const [activePriceIndex, setActivePriceIndex] = useState<number | null>(null);

  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Add Secondary Barcode Modal / Input
  const [newBarcodeModal, setNewBarcodeModal] = useState(false);
  const [tempBarcode, setTempBarcode] = useState('');

  // Add Custom Price Modal / Input
  const [newPriceModal, setNewPriceModal] = useState(false);
  const [tempPriceName, setTempPriceName] = useState('');
  const [tempPriceVal, setTempPriceVal] = useState('');
  const [tempPriceBarcode, setTempPriceBarcode] = useState('');

  // Inline Category Creator
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    loadData();
  }, [productId]);

  async function loadData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allCats, allSups] = await Promise.all([
        db.categories.toArray().catch(() => []),
        db.suppliers.toArray().catch(() => []),
      ]);

      setCategories(allCats);
      setSuppliers(allSups);

      if (isEdit && productId) {
        const prod = await db.products.get(productId);
        if (prod) {
          setForm({
            name: prod.name || '',
            barcode: prod.barcode || '',
            category: prod.category || '',
            categoryId: prod.categoryId || (prod as any).category_id || '',
            retailPrice: prod.retailPrice ? String(prod.retailPrice) : (prod as any).retail_price ? String((prod as any).retail_price) : '',
            costPrice: String(prod.costPrice || (prod as any).purchase_price || (prod as any).cost_price || 0),
            quantity: String(prod.quantity || 0),
            unit: prod.unit || 'قطعة',
            description: prod.description || '',
            supplier: (prod as any).supplier || '',
            supplierId: (prod as any).supplierId || (prod as any).supplier_id || '',
            lowStockThreshold: String(prod.lowStockThreshold || (prod as any).low_stock_threshold || 0),
            color: (prod as any).color || '',
            sizeOrWeight: (prod as any).sizeOrWeight || (prod as any).size_or_weight || '',
            expiryDate: prod.expiryDate || (prod as any).expiry_date || '',
            location: (prod as any).location || '',
            wholesalePrice: (prod as any).wholesalePrice ? String((prod as any).wholesalePrice) : (prod as any).wholesale_price ? String((prod as any).wholesale_price) : '',
            wholesaleMinQty: String((prod as any).wholesaleMinQty || (prod as any).wholesale_min_qty || 0),
            wholesaleUnitName: (prod as any).wholesaleUnitName || 'كرتون',
            quickSale: prod.quickSale !== false && (prod as any).quick_sale !== 0,
            hasVariants: Boolean((prod as any).hasVariants || (prod as any).has_variants),
            image: prod.image || (prod as any).image_url || '',
          });

          // Load secondary barcodes
          try {
            const allSec = await db.productBarcodes.toArray();
            const matching = allSec
              .filter((b: any) => b.productId === productId || b.product_id === productId)
              .map((b: any) => b.barcode);
            setSecondaryBarcodes(matching);
          } catch {}

          // Load custom prices if stored in JSON payload
          try {
            if ((prod as any).custom_prices) {
              const parsed = typeof (prod as any).custom_prices === 'string'
                ? JSON.parse((prod as any).custom_prices)
                : (prod as any).custom_prices;
              if (Array.isArray(parsed)) {
                setCustomPrices(parsed);
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[ProductForm] Load error:', err);
    }
    setLoading(false);
  }

  // Live Field Validation
  const validateFields = (currentForm = form) => {
    const newErrors: { name?: string; retailPrice?: string } = {};

    if (!currentForm.name.trim()) {
      newErrors.name = 'الاسم مطلوب';
    }

    const priceVal = parseFloat(currentForm.retailPrice);
    if (!currentForm.retailPrice || isNaN(priceVal) || priceVal <= 0) {
      newErrors.retailPrice = 'سعر البيع مطلوب و > 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    const updatedForm = { ...form, [field]: value };
    setForm(updatedForm);

    if (touched[field as keyof typeof touched]) {
      validateFields(updatedForm);
    }
  };

  const handleFieldBlur = (field: 'name' | 'retailPrice') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateFields();
  };

  // Barcode Auto-generation
  const handleGenerateBarcode = () => {
    const randomBarcode = '252' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    handleFieldChange('barcode', randomBarcode);
  };

  // Barcode Scanner Handler
  const handleBarcodeScanned = (code: string) => {
    setShowScanner(false);
    const trimmed = code.trim();
    if (!trimmed) return;

    if (scannerTarget === 'main') {
      handleFieldChange('barcode', trimmed);
    } else if (scannerTarget === 'secondary') {
      if (trimmed === form.barcode.trim()) {
        notify.warning('هذا الباركود مسجل كباركود أساسي للمنتج');
        return;
      }
      if (secondaryBarcodes.includes(trimmed)) {
        notify.warning('الباركود الإضافي مضاف مسبقاً');
        return;
      }
      setSecondaryBarcodes((prev) => [...prev, trimmed]);
    } else if (scannerTarget === 'customPrice' && activePriceIndex !== null) {
      setCustomPrices((prev) => {
        const next = [...prev];
        if (next[activePriceIndex]) {
          next[activePriceIndex] = { ...next[activePriceIndex], barcode: trimmed };
        }
        return next;
      });
    }
  };

  // Image actions
  const handleCapturePhoto = async () => {
    setImagePickerVisible(false);
    try {
      const granted = await AnposCamera.requestPermission();
      if (!granted) {
        notify.warning('يرجى السماح بالوصول إلى الكاميرا لالتقاط صورة المنتج');
        return;
      }
      const photoUri = await AnposCamera.capturePhoto();
      if (photoUri) {
        handleFieldChange('image', photoUri);
      }
    } catch (e) {
      console.warn('Capture photo failed:', e);
    }
  };

  const handlePickGallery = async () => {
    setImagePickerVisible(false);
    try {
      const imageUri = await AnposCamera.pickImage();
      if (imageUri) {
        handleFieldChange('image', imageUri);
      }
    } catch (e) {
      console.warn('Pick gallery failed:', e);
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customImageUrl.trim();
    if (trimmed) {
      handleFieldChange('image', trimmed);
      setCustomImageUrl('');
      setUrlModalVisible(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePickerVisible(false);
    handleFieldChange('image', '');
  };

  // Secondary Barcode Helpers
  const handleAddSecondaryBarcodeSubmit = () => {
    const trimmed = tempBarcode.trim();
    if (!trimmed) return;
    if (trimmed === form.barcode.trim()) {
      notify.warning('هذا الباركود مسجل كباركود أساسي للمنتج');
      return;
    }
    if (secondaryBarcodes.includes(trimmed)) {
      notify.warning('الباركود الإضافي مضاف مسبقاً');
      return;
    }
    setSecondaryBarcodes((prev) => [...prev, trimmed]);
    setTempBarcode('');
    setNewBarcodeModal(false);
  };

  const handleRemoveSecondaryBarcode = (bc: string) => {
    setSecondaryBarcodes((prev) => prev.filter((item) => item !== bc));
  };

  // Custom Price Helpers
  const handleAddCustomPriceSubmit = () => {
    const name = tempPriceName.trim();
    const price = tempPriceVal.trim();
    if (!name) {
      notify.warning('يرجى إدخال اسم السعر المخصص');
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      notify.warning('يرجى إدخال سعر صحيح أكبر من صفر');
      return;
    }

    const newItem: CustomPriceItem = {
      id: generateId(),
      name,
      price,
      barcode: tempPriceBarcode.trim() || undefined,
    };

    setCustomPrices((prev) => [...prev, newItem]);
    setTempPriceName('');
    setTempPriceVal('');
    setTempPriceBarcode('');
    setNewPriceModal(false);
  };

  const handleRemoveCustomPrice = (id: string) => {
    setCustomPrices((prev) => prev.filter((p) => p.id !== id));
  };

  // Category Creation
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const newId = generateId();
      const catObj = {
        id: newId,
        name: newCatName.trim(),
        color: colors.primary[600] || '#3b82f6',
        icon: 'Tag',
      };
      await db.categories.add(catObj);
      setCategories((prev) => [...prev, catObj as any]);
      handleFieldChange('category', newCatName.trim());
      handleFieldChange('categoryId', newId);
      setNewCatName('');
      setCategoryModalVisible(false);
      notify.success(`تم إنشاء فئة "${newCatName.trim()}" بنجاح`);
    } catch (err) {
      notify.error(err, 'فشل إضافة الفئة الجديدة');
    }
  };

  // Main Save Handler
  const handleSave = async () => {
    setTouched({ name: true, retailPrice: true });
    const isValid = validateFields();

    if (!isValid) {
      // Auto expand basics section if error exists there
      setExpandedSections((prev) => ({ ...prev, basic: true }));
      notify.warning('يرجى تصحيح الحقول المطلوبة قبل الحفظ');
      return;
    }

    setSaving(true);
    try {
      await ensureInit();

      const nowIso = new Date().toISOString();
      const retailVal = parseFloat(form.retailPrice) || 0;
      const costVal = parseFloat(form.costPrice) || 0;
      const wholesaleVal = parseFloat(form.wholesalePrice) || 0;
      const wholesaleMinVal = parseFloat(form.wholesaleMinQty) || 0;
      const qtyVal = parseFloat(form.quantity) || 0;
      const lowStockVal = parseFloat(form.lowStockThreshold) || 0;

      // Generate barcode if left blank
      let finalBarcode = form.barcode.trim();
      if (!finalBarcode) {
        finalBarcode = '252' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      }

      const productPayload: any = {
        name: form.name.trim(),
        productName: form.name.trim(),
        barcode: finalBarcode,
        sku: form.barcode.trim() || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        category: form.category.trim() || 'عام',
        category_id: form.categoryId || '',
        categoryId: form.categoryId || '',
        unit: form.unit || 'قطعة',
        retail_price: retailVal,
        retailPrice: retailVal,
        price: retailVal,
        cost_price: costVal,
        costPrice: costVal,
        purchase_price: costVal,
        purchasePrice: costVal,
        wholesale_price: wholesaleVal,
        wholesalePrice: wholesaleVal,
        wholesale_min_qty: wholesaleMinVal,
        wholesaleMinQty: wholesaleMinVal,
        quantity: qtyVal,
        qty: qtyVal,
        stock: qtyVal,
        low_stock_threshold: lowStockVal,
        lowStockThreshold: lowStockVal,
        min_quantity: lowStockVal,
        minQuantity: lowStockVal,
        description: form.description.trim() || '',
        supplier: form.supplier.trim() || '',
        supplier_id: form.supplierId || '',
        supplierId: form.supplierId || '',
        warehouse_id: 'main',
        warehouseId: 'main',
        color: form.color.trim() || '',
        size_or_weight: form.sizeOrWeight.trim() || '',
        expiry_date: form.expiryDate.trim() || '',
        expiryDate: form.expiryDate.trim() || '',
        location: form.location.trim() || '',
        wholesale_unit_name: form.wholesaleUnitName.trim() || 'كرتون',
        quick_sale: form.quickSale ? 1 : 0,
        quickSale: form.quickSale,
        has_variants: form.hasVariants ? 1 : 0,
        hasVariants: form.hasVariants,
        image: form.image || '',
        image_url: form.image || '',
        imageUrl: form.image || '',
        custom_prices: JSON.stringify(customPrices),
        tax_rate: Number((form as any).taxRate ?? (form as any).tax_rate ?? 0),
        taxRate: Number((form as any).taxRate ?? (form as any).tax_rate ?? 0),
        status: 'active',
        updated_at: nowIso,
      };

      const finalProductId = productId || generateId();

      if (isEdit) {
        await db.products.update(productId, productPayload);
        await syncEngine.enqueue('update', 'products', productId, productPayload);
      } else {
        const fullProduct = {
          id: finalProductId,
          ...productPayload,
          created_at: nowIso,
          createdAt: nowIso,
        };
        await db.products.add(fullProduct);
        await syncEngine.enqueue('create', 'products', finalProductId, fullProduct);
      }

      // Trigger background sync in connected mode
      syncEngine.processQueue().catch(() => {});

      // Sync secondary barcodes table
      try {
        const allSec = await db.productBarcodes.toArray().catch(() => []);
        const existingForThisProd = allSec.filter(
          (b: any) => b.productId === finalProductId || b.product_id === finalProductId
        );

        for (const ex of existingForThisProd) {
          if (!secondaryBarcodes.includes(ex.barcode)) {
            await db.productBarcodes.delete(ex.id).catch(() => {});
          }
        }

        for (const bc of secondaryBarcodes) {
          const alreadyInDb = existingForThisProd.some((ex: any) => ex.barcode === bc);
          if (!alreadyInDb) {
            await db.productBarcodes.add({
              id: generateId(),
              product_id: finalProductId,
              productId: finalProductId,
              barcode: bc,
              is_primary: 0,
              created_at: nowIso,
              updated_at: nowIso,
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[ProductForm] Secondary barcodes update error:', err);
      }

      notify.success(
        isEdit ? 'تم تحديث بيانات المنتج بنجاح' : 'تمت إضافة المنتج الجديد بنجاح',
        '✓ تم الحفظ'
      );
      navigation.goBack();
    } catch (err) {
      notify.error(err, 'فشل حفظ بيانات المنتج');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const ok = await notify.confirm(
      `هل أنت متأكد من حذف المنتج "${form.name}" بشكل نهائي؟`,
      'حذف المنتج',
      'حذف نهائي'
    );
    if (!ok) return;

    try {
      await db.products.delete(productId);
      await syncEngine.enqueue('delete', 'products', productId, { id: productId });
      notify.success('تم حذف المنتج بنجاح');
      navigation.goBack();
    } catch (err) {
      notify.error(err, 'فشل حذف المنتج');
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>جاري تحميل بيانات المنتج...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowRight size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>
            {isEdit ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {form.name ? form.name : 'أدخل البيانات والمعايير بدقة'}
          </Text>
        </View>

        {isEdit ? (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={colors.danger.main} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Free Trial / Upgrade Banner (matching screenshots) ── */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerIconBox}>
            <FlaskConical size={18} color="#60a5fa" />
          </View>
          <View style={styles.bannerTextBox}>
            <Text style={styles.bannerTitle}>نسخة مجانية – احصل على الكاملة</Text>
            <Text style={styles.bannerSub}>0/50 فاتورة • 0/10 زبون</Text>
          </View>
          <TouchableOpacity style={styles.bannerUpgradeBtn} activeOpacity={0.8}>
            <ArrowUpRight size={13} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.bannerUpgradeBtnText}>ترقية</Text>
          </TouchableOpacity>
        </View>

        {/* ── Dashed Image Upload Card ── */}
        <TouchableOpacity
          onPress={() => setImagePickerVisible(true)}
          style={styles.imageUploadCard}
          activeOpacity={0.8}
        >
          {form.image ? (
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: form.image }} style={styles.imagePreview} />
              <View style={styles.imageOverlayBadge}>
                <Camera size={14} color="#ffffff" />
                <Text style={styles.imageOverlayText}>تغيير الصورة</Text>
              </View>
            </View>
          ) : (
            <View style={styles.imagePlaceholderBox}>
              <View style={styles.cameraIconBadge}>
                <Camera size={26} color={isDark ? '#60a5fa' : '#2563eb'} />
                <View style={styles.plusMiniBadge}>
                  <Plus size={10} color="#ffffff" />
                </View>
              </View>
              <Text style={styles.imageUploadTitle}>اضغط لإضافة صورة</Text>
              <Text style={styles.imageUploadSub}>اختياري – تظهر في القوائم</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════
            SECTION 1: الأساسيات * (Mandatory & Core Fields)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('basic')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.basic ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={styles.accordionTitleRow}>
              <Text style={styles.accordionTitle}>
                الأساسيات <Text style={{ color: colors.danger.main }}>*</Text>
              </Text>
              <View style={styles.infoBadge}>
                <Info size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
              </View>
            </View>
          </TouchableOpacity>

          {expandedSections.basic && (
            <View style={styles.accordionBody}>
              {/* 1. Name Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  الاسم <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    touched.name && errors.name ? styles.inputErrorBorder : null,
                  ]}
                  value={form.name}
                  onChangeText={(val) => handleFieldChange('name', val)}
                  onBlur={() => handleFieldBlur('name')}
                  placeholder="اسم المنتج"
                  placeholderTextColor={colors.text.tertiary}
                  textAlign="right"
                />
                {touched.name && errors.name ? (
                  <Text style={styles.fieldErrorText}>{errors.name}</Text>
                ) : null}
              </View>

              {/* 2. Barcode Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الباركود</Text>
                <View style={styles.barcodeInputRow}>
                  <TouchableOpacity
                    style={styles.scanBarcodeBtn}
                    onPress={() => {
                      setScannerTarget('main');
                      setShowScanner(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <ScanLine size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.textInput, { flex: 1, textAlign: 'left', fontFamily: 'Courier', letterSpacing: 1 }]}
                    value={form.barcode}
                    onChangeText={(val) => handleFieldChange('barcode', val)}
                    placeholder="2521389122476"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="default"
                  />
                </View>
                <View style={styles.helperRow}>
                  <TouchableOpacity onPress={handleGenerateBarcode}>
                    <Text style={styles.generateLinkText}>توليد باركود تلقائي</Text>
                  </TouchableOpacity>
                  <Text style={styles.fieldHelperText}>اختياري – يُولّد تلقائياً لو تُرك فارغاً.</Text>
                </View>
              </View>

              {/* 3. Category Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الفئة</Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.selectInputBtn]}
                  onPress={() => setCategoryModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <ChevronDown size={16} color={colors.text.tertiary} />
                  <Text
                    style={[
                      styles.selectInputText,
                      { color: form.category ? colors.text.primary : colors.text.tertiary },
                    ]}
                  >
                    {form.category || 'مثلاً: مشروبات'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 4. Retail Price Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  سعر البيع <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <View style={styles.currencyInputRow}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>دج</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.currencyTextInput,
                      touched.retailPrice && errors.retailPrice ? styles.inputErrorBorder : null,
                    ]}
                    value={form.retailPrice}
                    onChangeText={(val) => handleFieldChange('retailPrice', val)}
                    onBlur={() => handleFieldBlur('retailPrice')}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
                {touched.retailPrice && errors.retailPrice ? (
                  <Text style={styles.fieldErrorText}>{errors.retailPrice}</Text>
                ) : null}
              </View>

              {/* 5. Initial Quantity Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الكمّية الابتدائية</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.quantity}
                  onChangeText={(val) => handleFieldChange('quantity', val)}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Text style={styles.fieldHelperText}>
                  مسموح للمنتجات التي ليست بعد في المخزن.
                </Text>
              </View>

              {/* 6. Unit Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  الوحدة <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.selectInputBtn]}
                  onPress={() => setUnitModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <ChevronDown size={16} color={colors.text.secondary} />
                  <Text style={[styles.selectInputText, { color: colors.text.primary, fontWeight: '700' }]}>
                    {form.unit}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: تفاصيل إضافية (Secondary Details)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('details')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.details ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={styles.accordionTitleRow}>
              <Text style={styles.accordionTitle}>تفاصيل إضافيّة</Text>
              <View style={styles.infoBadge}>
                <MoreHorizontal size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
              </View>
            </View>
          </TouchableOpacity>

          {expandedSections.details && (
            <View style={styles.accordionBody}>
              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>الوصف</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={form.description}
                  onChangeText={(val) => handleFieldChange('description', val)}
                  placeholder="وصف قصير للمنتج"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                  textAlign="right"
                />
              </View>

              {/* Supplier */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>المورّد</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.supplier}
                  onChangeText={(val) => handleFieldChange('supplier', val)}
                  placeholder="اسم المورّد"
                  placeholderTextColor={colors.text.tertiary}
                  textAlign="right"
                />
              </View>

              {/* Low Stock Threshold */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>حدّ تنبيه المخزون</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.lowStockThreshold}
                  onChangeText={(val) => handleFieldChange('lowStockThreshold', val)}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Text style={styles.fieldHelperText}>
                  يُظهر تنبيهاً عند نزول المخزون لهذا الحد.
                </Text>
              </View>

              {/* Two Column: Color & Size/Weight */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>اللون</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.color}
                    onChangeText={(val) => handleFieldChange('color', val)}
                    placeholder="أحمر"
                    placeholderTextColor={colors.text.tertiary}
                    textAlign="right"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>الوزن / الحجم</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.sizeOrWeight}
                    onChangeText={(val) => handleFieldChange('sizeOrWeight', val)}
                    placeholder="500g / 1L"
                    placeholderTextColor={colors.text.tertiary}
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Expiry Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>تاريخ الانتهاء (الدفعة)</Text>
                <View style={styles.calendarInputRow}>
                  <View style={styles.calendarIconBox}>
                    <Calendar size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                  </View>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={form.expiryDate}
                    onChangeText={(val) => handleFieldChange('expiryDate', val)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.text.tertiary}
                    textAlign="right"
                  />
                </View>
                <Text style={styles.fieldHelperText}>
                  اختياري – للمنتجات قابلة للانتهاء.
                </Text>
              </View>

              {/* Storage Location */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>موقع التّخزين</Text>
                <TextInput
                  style={styles.textInput}
                  value={form.location}
                  onChangeText={(val) => handleFieldChange('location', val)}
                  placeholder="رف A-3 / ممر 2"
                  placeholderTextColor={colors.text.tertiary}
                  textAlign="right"
                />
              </View>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: الجملة (Wholesale Pricing & Tiers)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('wholesale')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.wholesale ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={styles.accordionTitleRow}>
              <Text style={styles.accordionTitle}>الجملة</Text>
              <View style={styles.infoBadge}>
                <Truck size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
              </View>
            </View>
          </TouchableOpacity>

          {expandedSections.wholesale && (
            <View style={styles.accordionBody}>
              {/* Wholesale Price */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>سعر الجملة</Text>
                <View style={styles.currencyInputRow}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>دج</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.currencyTextInput]}
                    value={form.wholesalePrice}
                    onChangeText={(val) => handleFieldChange('wholesalePrice', val)}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Two Column: Min Qty & Unit Name */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>تسمية الجملة</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.wholesaleUnitName}
                    onChangeText={(val) => handleFieldChange('wholesaleUnitName', val)}
                    placeholder="كرتون"
                    placeholderTextColor={colors.text.tertiary}
                    textAlign="right"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>عدد الوحدات</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.wholesaleMinQty}
                    onChangeText={(val) => handleFieldChange('wholesaleMinQty', val)}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
              </View>
              <Text style={styles.fieldHelperText}>
                يُنشّط سعر الجملة عند هذه الكمّية.
              </Text>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 4: مُتقدّم (Advanced Barcodes & Custom Prices)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('advanced')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.advanced ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={styles.accordionTitleBox}>
              <View style={styles.accordionTitleRow}>
                <Text style={styles.accordionTitle}>مُتقدّم</Text>
                <View style={styles.infoBadge}>
                  <SlidersHorizontal size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              </View>
              <Text style={styles.accordionSubtitle}>
                بار كودات وأسعار إضافيّة، خصائص أخرى.
              </Text>
            </View>
          </TouchableOpacity>

          {expandedSections.advanced && (
            <View style={styles.accordionBody}>
              {/* Secondary Barcodes Subsection */}
              <View style={styles.subsectionBox}>
                <Text style={styles.fieldHelperText}>
                  بار كودات إضافيّة لنفس المنتج (مثلاً: كرتون مقابل علبة فردية).
                </Text>

                {secondaryBarcodes.map((bc, idx) => (
                  <View key={idx} style={styles.chipRowItem}>
                    <TouchableOpacity
                      onPress={() => handleRemoveSecondaryBarcode(bc)}
                      style={styles.deleteChipBtn}
                    >
                      <Trash2 size={15} color={colors.danger.main} />
                    </TouchableOpacity>
                    <Text style={styles.chipText}>{bc}</Text>
                    <Barcode size={16} color={colors.text.secondary} />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.dashedActionBtn}
                  onPress={() => setNewBarcodeModal(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                  <Text style={styles.dashedActionBtnText}>إضافة باركود</Text>
                </TouchableOpacity>
              </View>

              {/* Custom Tiered Prices Subsection */}
              <View style={styles.subsectionBox}>
                <Text style={styles.fieldHelperText}>
                  أسعار إضافيّة بأسماء مخصّصة (سعر طالب، سعر مُوظّف، إلخ). لكل سعر يمكن إضافة باركود يختاره تلقائياً عند المسح.
                </Text>

                {customPrices.map((cp, idx) => (
                  <View key={cp.id} style={styles.chipRowItem}>
                    <TouchableOpacity
                      onPress={() => handleRemoveCustomPrice(cp.id)}
                      style={styles.deleteChipBtn}
                    >
                      <Trash2 size={15} color={colors.danger.main} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.chipText}>{cp.name} : {cp.price} دج</Text>
                      {cp.barcode ? (
                        <Text style={{ fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo' }}>
                          باركود: {cp.barcode}
                        </Text>
                      ) : null}
                    </View>
                    <Tag size={16} color={colors.text.secondary} />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.dashedActionBtn}
                  onPress={() => setNewPriceModal(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                  <Text style={styles.dashedActionBtnText}>إضافة سعر</Text>
                </TouchableOpacity>
              </View>

              {/* Switches */}
              <View style={styles.switchRowContainer}>
                <View style={styles.switchTextBox}>
                  <Text style={styles.switchTitle}>منتج مُميّز</Text>
                  <Text style={styles.switchSub}>يظهر في الواجهة الأمامية.</Text>
                </View>
                <Switch
                  value={form.quickSale}
                  onValueChange={(val) => handleFieldChange('quickSale', val)}
                  trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: colors.primary[600] }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.switchRowContainer}>
                <View style={styles.switchTextBox}>
                  <Text style={styles.switchTitle}>يملك مُتغيّرات</Text>
                  <Text style={styles.switchSub}>
                    فعّل بعد الحفظ، ثم أضف المُتغيّرات من شاشة التّفاصيل.
                  </Text>
                </View>
                <Switch
                  value={form.hasVariants}
                  onValueChange={(val) => handleFieldChange('hasVariants', val)}
                  trackColor={{ false: isDark ? '#334155' : '#cbd5e1', true: colors.primary[600] }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          )}
        </View>

        {/* Bottom space for sticky footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky Bottom Action Button ── */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={styles.saveMainBtn}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={20} color="#ffffff" style={{ marginLeft: 8 }} />
              <Text style={styles.saveMainBtnText}>حفظ المنتج</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════
          MODALS & SHEETS
      ═══════════════════════════════════════════════════════ */}

      {/* 1. Camera Scanner Fullscreen */}
      {showScanner && (
        <CameraScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* 2. Unit Picker Modal */}
      <Modal
        visible={unitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUnitModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر الوحدة</Text>
            <View style={styles.unitGrid}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitChip,
                    form.unit === u && styles.unitChipActive,
                  ]}
                  onPress={() => {
                    handleFieldChange('unit', u);
                    setUnitModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.unitChipText,
                      form.unit === u && styles.unitChipTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 3. Category Picker / Creator Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>تحديد الفئة</Text>

            <ScrollView style={{ maxHeight: 220, marginVertical: spacing.sm }}>
              <View style={styles.categoriesList}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryListItem,
                      form.categoryId === c.id && styles.categoryListItemActive,
                    ]}
                    onPress={() => {
                      handleFieldChange('category', c.name);
                      handleFieldChange('categoryId', c.id);
                      setCategoryModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryListText,
                        form.categoryId === c.id && styles.categoryListTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                    {form.categoryId === c.id ? (
                      <Check size={16} color="#ffffff" />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.newCatInputRow}>
              <TouchableOpacity
                style={styles.addCatBtn}
                onPress={handleCreateCategory}
              >
                <Plus size={16} color="#ffffff" />
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="إضافة فئة جديدة..."
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 4. Image Picker Action Sheet */}
      <Modal
        visible={imagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImagePickerVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>صورة المنتج</Text>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.actionSheetBtn}
                onPress={handleCapturePhoto}
              >
                <Camera size={20} color={isDark ? '#60a5fa' : '#2563eb'} />
                <Text style={styles.actionSheetBtnText}>التقاط صورة بالكاميرا</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSheetBtn}
                onPress={handlePickGallery}
              >
                <ImageIcon size={20} color={isDark ? '#60a5fa' : '#2563eb'} />
                <Text style={styles.actionSheetBtnText}>اختيار من معرض الصور</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSheetBtn}
                onPress={() => {
                  setImagePickerVisible(false);
                  setUrlModalVisible(true);
                }}
              >
                <Globe size={20} color={isDark ? '#60a5fa' : '#2563eb'} />
                <Text style={styles.actionSheetBtnText}>إدخال رابط صورة (URL)</Text>
              </TouchableOpacity>

              {form.image ? (
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderTopWidth: 1, borderTopColor: colors.border.subtle }]}
                  onPress={handleRemoveImage}
                >
                  <Trash2 size={20} color={colors.danger.main} />
                  <Text style={[styles.actionSheetBtnText, { color: colors.danger.main }]}>
                    حذف الصورة الحالية
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 5. Custom Image URL Modal */}
      <Modal
        visible={urlModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUrlModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUrlModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>رابط صورة المنتج</Text>
            <TextInput
              style={[styles.textInput, { marginVertical: spacing.md }]}
              value={customImageUrl}
              onChangeText={setCustomImageUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={styles.saveSubModalBtn} onPress={handleApplyCustomUrl}>
              <Text style={styles.saveSubModalBtnText}>تطبيق الرابط</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 6. Add Secondary Barcode Modal */}
      <Modal
        visible={newBarcodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setNewBarcodeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNewBarcodeModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>إضافة باركود إضافي</Text>
            <View style={[styles.barcodeInputRow, { marginVertical: spacing.md }]}>
              <TouchableOpacity
                style={styles.scanBarcodeBtn}
                onPress={() => {
                  setNewBarcodeModal(false);
                  setScannerTarget('secondary');
                  setShowScanner(true);
                }}
              >
                <ScanLine size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={tempBarcode}
                onChangeText={setTempBarcode}
                placeholder="أدخل الباركود..."
                placeholderTextColor={colors.text.tertiary}
                keyboardType="default"
              />
            </View>
            <TouchableOpacity style={styles.saveSubModalBtn} onPress={handleAddSecondaryBarcodeSubmit}>
              <Text style={styles.saveSubModalBtnText}>إضافة</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 7. Add Custom Price Modal */}
      <Modal
        visible={newPriceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setNewPriceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNewPriceModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>إضافة سعر مخصص</Text>
            <View style={{ gap: spacing.sm, marginVertical: spacing.md }}>
              <TextInput
                style={styles.textInput}
                value={tempPriceName}
                onChangeText={setTempPriceName}
                placeholder="اسم السعر (مثلاً: سعر طالب / سعر جملة 2)"
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
              />
              <View style={styles.currencyInputRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>دج</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.currencyTextInput]}
                  value={tempPriceVal}
                  onChangeText={setTempPriceVal}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
              <TextInput
                style={styles.textInput}
                value={tempPriceBarcode}
                onChangeText={setTempPriceBarcode}
                placeholder="باركود مرتبط بالسعر (اختياري)"
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
              />
            </View>
            <TouchableOpacity style={styles.saveSubModalBtn} onPress={handleAddCustomPriceSubmit}>
              <Text style={styles.saveSubModalBtnText}>حفظ السعر</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: 'Cairo',
      fontWeight: '600',
      color: colors.text.secondary,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'android' ? 14 : 10,
      paddingBottom: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.xl,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleBox: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16.5,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    headerSubtitle: {
      fontSize: 11.5,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
      marginTop: -2,
    },
    deleteBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.xl,
      backgroundColor: isDark ? '#450a0a' : '#fee2e2',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Scroll
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      gap: spacing.md,
    },

    // Free Trial / License Banner
    bannerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#131c31' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
      borderRadius: radii.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      gap: spacing.sm,
    },
    bannerIconBox: {
      width: 36,
      height: 36,
      borderRadius: radii.circle,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#dbeafe',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerTextBox: {
      flex: 1,
      alignItems: 'flex-start',
    },
    bannerTitle: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    bannerSub: {
      fontSize: 11,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
      marginTop: -1,
    },
    bannerUpgradeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary[600],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 3,
      borderRadius: radii.lg,
      ...shadows.xs,
    },
    bannerUpgradeBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },

    // Dashed Image Upload Card
    imageUploadCard: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1',
      backgroundColor: isDark ? '#101726' : '#ffffff',
      borderRadius: radii.xxl,
      paddingVertical: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 140,
    },
    imagePlaceholderBox: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    cameraIconBadge: {
      width: 56,
      height: 56,
      borderRadius: radii.xl,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
      position: 'relative',
    },
    plusMiniBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageUploadTitle: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    imageUploadSub: {
      fontSize: 12,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
    },
    imagePreviewWrapper: {
      width: '100%',
      height: 160,
      borderRadius: radii.xl,
      overflow: 'hidden',
      position: 'relative',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imageOverlayBadge: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
    },
    imageOverlayText: {
      color: '#ffffff',
      fontSize: 11.5,
      fontWeight: '700',
      fontFamily: 'Cairo',
    },

    // Accordion Container
    accordionCard: {
      backgroundColor: isDark ? '#111827' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      borderRadius: radii.xxl,
      overflow: 'hidden',
      ...shadows.sm,
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
    },
    accordionChevron: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accordionTitleBox: {
      alignItems: 'flex-end',
      flex: 1,
    },
    accordionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    accordionTitle: {
      fontSize: 15.5,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    accordionSubtitle: {
      fontSize: 11.5,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
      marginTop: 2,
      textAlign: 'right',
    },
    infoBadge: {
      width: 32,
      height: 32,
      borderRadius: radii.circle,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    accordionBody: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
      paddingTop: spacing.md,
    },

    // Form Fields
    fieldGroup: {
      gap: spacing.xs,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.primary,
      textAlign: 'right',
    },
    textInput: {
      backgroundColor: isDark ? '#0c1322' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
      borderRadius: radii.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      fontSize: 14,
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    inputErrorBorder: {
      borderColor: colors.danger.main,
      borderWidth: 1.5,
    },
    fieldErrorText: {
      fontSize: 11.5,
      fontFamily: 'Cairo',
      color: colors.danger.main,
      fontWeight: '600',
      textAlign: 'right',
      marginTop: 2,
    },
    fieldHelperText: {
      fontSize: 11,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
      textAlign: 'right',
      marginTop: 2,
    },
    helperRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    generateLinkText: {
      fontSize: 11,
      fontFamily: 'Cairo',
      fontWeight: '700',
      color: isDark ? '#60a5fa' : '#2563eb',
    },

    // Barcode Row
    barcodeInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    scanBarcodeBtn: {
      width: 48,
      height: 48,
      borderRadius: radii.xl,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Currency Input Row
    currencyInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    currencyBadge: {
      paddingHorizontal: spacing.md,
      height: 48,
      borderRadius: radii.xl,
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyBadgeText: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.secondary,
    },
    currencyTextInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
    },

    // Select input button
    selectInputBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectInputText: {
      fontSize: 14,
      fontFamily: 'Cairo',
    },

    // Multiline input
    multilineInput: {
      minHeight: 70,
      textAlignVertical: 'top',
    },

    // Two column
    twoColumnRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },

    // Calendar input row
    calendarInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    calendarIconBox: {
      width: 48,
      height: 48,
      borderRadius: radii.xl,
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Subsections in Advanced
    subsectionBox: {
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    dashedActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#93c5fd',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#eff6ff',
      paddingVertical: spacing.sm + 2,
      borderRadius: radii.xl,
    },
    dashedActionBtnText: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: isDark ? '#60a5fa' : '#2563eb',
    },
    chipRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#0c1322' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.primary,
      flex: 1,
      textAlign: 'right',
      marginHorizontal: spacing.sm,
    },
    deleteChipBtn: {
      padding: 4,
    },

    // Switches
    switchRowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    switchTextBox: {
      flex: 1,
      alignItems: 'flex-end',
      marginRight: spacing.md,
    },
    switchTitle: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    switchSub: {
      fontSize: 11.5,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
      textAlign: 'right',
      marginTop: 1,
    },

    // Sticky Bottom Action Bar
    stickyFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: isDark ? 'rgba(10, 15, 29, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderTopWidth: 1,
      borderTopColor: colors.border.subtle,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm + 2,
      paddingBottom: Platform.OS === 'android' ? 24 : 34,
      ...shadows.lg,
    },
    saveMainBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary[600],
      paddingVertical: spacing.md + 2,
      borderRadius: radii.full,
      ...shadows.glowPrimary,
    },
    saveMainBtnText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 15, 29, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radii.xxl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.lg,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },

    // Unit Grid
    unitGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    unitChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      borderWidth: 1,
      borderColor: isDark ? colors.border.default : colors.slate[200],
    },
    unitChipActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[700],
    },
    unitChipText: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    unitChipTextActive: {
      color: '#ffffff',
    },

    // Categories List in Modal
    categoriesList: {
      gap: spacing.xs,
    },
    categoryListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
    },
    categoryListItemActive: {
      backgroundColor: colors.primary[600],
    },
    categoryListText: {
      fontSize: 13.5,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    categoryListTextActive: {
      color: '#ffffff',
    },
    newCatInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    addCatBtn: {
      width: 44,
      height: 44,
      borderRadius: radii.xl,
      backgroundColor: colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Image Action Sheet Buttons
    modalActionButtons: {
      gap: spacing.sm,
    },
    actionSheetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
    },
    actionSheetBtnText: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    saveSubModalBtn: {
      backgroundColor: colors.primary[600],
      paddingVertical: spacing.md,
      borderRadius: radii.xl,
      alignItems: 'center',
    },
    saveSubModalBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
  });

export default ProductFormScreen;
