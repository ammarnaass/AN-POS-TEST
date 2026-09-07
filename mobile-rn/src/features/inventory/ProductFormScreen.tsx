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
  Package,
  Percent,
  Calculator,
  Hash,
  Boxes,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { generateId } from '@shared/utils';
import { syncEngine } from '@/lib/syncEngine';
import CameraScanner from '@/features/barcode/CameraScanner';
import { AnposCamera } from '@/modules/AnposCamera';
import type { Product, Category, Supplier } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { notify } from '@/lib/notify';

const UNITS = ['قطعة', 'علبة', 'كغ', 'غرام', 'لتر', 'متر', 'حزمة', 'كرتون', 'حبة', 'طرد'];

interface SecondaryBarcodeItem {
  id: string;
  barcode: string;
  priceLabel: string;
}

interface CustomPriceItem {
  id: string;
  name: string;
  price: string;
  barcode?: string;
}

export const ProductFormScreen = ({ navigation, route }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency, language } = useI18n();
  const localeStr = language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en-US';
  const { id: productId } = route.params || {};
  const isEdit = Boolean(productId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Accordion Sections State (6 Sections PRD-MOB-WS-PROD-2026)
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    pricing: true,
    barcodes: false,
    colisage: false,
    inventory: false,
    advanced: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
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
    sku: '',
    category: '',
    categoryId: '',
    retailPrice: '',
    salePrice2: '', // semi-wholesale
    salePrice3: '', // wholesale
    invoicePrice: '', // prix facturé
    costPrice: '0',
    averagePrice: '0',
    taxRate: '0',
    discount: '0',
    quantity: '0',
    unit: 'قطعة',
    description: '',
    supplier: '',
    supplierId: '',
    lowStockThreshold: '0',
    color: '',
    sizeOrWeight: '',
    weight: '0',
    packageSize: '',
    expiryDate: '',
    location: '',
    wholesalePrice: '',
    wholesaleMinQty: '0',
    wholesaleUnitName: 'كرتون',
    quickSale: true, // "منتج مميز"
    allowNegativeStock: false, // "السماح بالبيع بدون رصيد"
    hasVariants: false, // "يملك متغيرات"
    image: '',
    // Colisage (تعبئة الجملة بالعبوة / الكرتون)
    enableColisage: false,
    colisageName: '',
    colisageCount: '12',
    colisagePrice: '',
    colisageBarcode: '',
    colisagePackId: '',
  });

  // Advanced sub-lists
  const [secondaryBarcodes, setSecondaryBarcodes] = useState<SecondaryBarcodeItem[]>([]);
  const [customPrices, setCustomPrices] = useState<CustomPriceItem[]>([]);

  // Validation & Error states
  const [errors, setErrors] = useState<{ name?: string; retailPrice?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; retailPrice?: boolean }>({});

  // Categories & Suppliers
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modals & Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'main' | 'secondary' | 'colisage' | 'customPrice'>('main');
  const [activeBarcodeIndex, setActiveBarcodeIndex] = useState<number | null>(null);
  const [activePriceIndex, setActivePriceIndex] = useState<number | null>(null);

  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

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
          let catName = prod.category || '';
          let catId = prod.categoryId || (prod as any).category_id || '';

          // Cross-reference with allCats to ensure both name and ID are populated
          if (catId && (!catName || catName === 'عام')) {
            const found = allCats.find((c: any) => c.id === catId);
            if (found) catName = found.name;
          } else if (catName && !catId) {
            const found = allCats.find((c: any) => c.name.toLowerCase() === catName.toLowerCase());
            if (found) catId = found.id;
          }

          // Check for linked pack in db.packs
          let linkedPack: any = null;
          try {
            const allPacks = await db.packs.toArray();
            linkedPack = allPacks.find((pk: any) => {
              try {
                const itms = typeof pk.items === 'string' ? JSON.parse(pk.items) : pk.items;
                return Array.isArray(itms) && itms.some((i: any) => (i.productId === productId || i.product_id === productId));
              } catch {
                return false;
              }
            });
          } catch {}

          const rawPieces = linkedPack ? (linkedPack.pieces_count || linkedPack.piecesCount || 12) : 12;
          const rawPackPrice = linkedPack ? (linkedPack.pack_price || linkedPack.packPrice || linkedPack.price || '') : '';

          setForm({
            name: prod.name || '',
            barcode: prod.barcode || '',
            sku: (prod as any).sku || '',
            category: catName,
            categoryId: catId,
            retailPrice: prod.retailPrice ? String(prod.retailPrice) : (prod as any).retail_price ? String((prod as any).retail_price) : '',
            salePrice2: (prod as any).salePrice2 ? String((prod as any).salePrice2) : (prod as any).sale_price2 ? String((prod as any).sale_price2) : '',
            salePrice3: (prod as any).salePrice3 ? String((prod as any).salePrice3) : (prod as any).sale_price3 ? String((prod as any).sale_price3) : ((prod as any).wholesalePrice ? String((prod as any).wholesalePrice) : (prod as any).wholesale_price ? String((prod as any).wholesale_price) : ''),
            invoicePrice: (prod as any).invoicePrice ? String((prod as any).invoicePrice) : (prod as any).invoice_price ? String((prod as any).invoice_price) : '',
            costPrice: String(prod.costPrice || (prod as any).purchase_price || (prod as any).cost_price || 0),
            averagePrice: String((prod as any).averagePrice || (prod as any).average_price || prod.costPrice || (prod as any).purchase_price || (prod as any).cost_price || 0),
            taxRate: String((prod as any).taxRate ?? (prod as any).tax_rate ?? 0),
            discount: String((prod as any).discount ?? 0),
            quantity: String(prod.quantity || 0),
            unit: prod.unit || 'قطعة',
            description: prod.description || '',
            supplier: (prod as any).supplier || '',
            supplierId: (prod as any).supplierId || (prod as any).supplier_id || '',
            lowStockThreshold: String(prod.lowStockThreshold || (prod as any).low_stock_threshold || 0),
            color: (prod as any).color || '',
            sizeOrWeight: (prod as any).sizeOrWeight || (prod as any).size_or_weight || '',
            weight: String((prod as any).weight || 0),
            packageSize: (prod as any).packageSize || (prod as any).package_size || '',
            expiryDate: prod.expiryDate || (prod as any).expiry_date || '',
            location: (prod as any).location || '',
            wholesalePrice: (prod as any).wholesalePrice ? String((prod as any).wholesalePrice) : (prod as any).wholesale_price ? String((prod as any).wholesale_price) : '',
            wholesaleMinQty: String((prod as any).wholesaleMinQty || (prod as any).wholesale_min_qty || 0),
            wholesaleUnitName: (prod as any).wholesaleUnitName || 'كرتون',
            quickSale: prod.quickSale !== false && (prod as any).quick_sale !== 0,
            allowNegativeStock: Boolean((prod as any).allowNegativeStock || (prod as any).allow_negative_stock),
            hasVariants: Boolean((prod as any).hasVariants || (prod as any).has_variants),
            image: prod.image || (prod as any).image_url || '',
            // Colisage
            enableColisage: Boolean(linkedPack),
            colisageName: linkedPack ? (linkedPack.name || '') : '',
            colisageCount: String(rawPieces),
            colisagePrice: String(rawPackPrice),
            colisageBarcode: linkedPack ? (linkedPack.barcode || '') : '',
            colisagePackId: linkedPack ? linkedPack.id : '',
          });

          // Load secondary barcodes
          try {
            const allSec = await db.productBarcodes.toArray();
            const matching = allSec
              .filter((b: any) => b.productId === productId || b.product_id === productId)
              .map((b: any) => ({
                id: b.id || generateId(),
                barcode: b.barcode || '',
                priceLabel: b.price_label || b.priceLabel || b.price_name || b.priceName || '',
              }));
            setSecondaryBarcodes(matching);
          } catch {}

          // Load custom prices if stored in JSON payload or array
          try {
            const rawCP = (prod as any).custom_prices ?? (prod as any).customPrices;
            if (rawCP) {
              const parsed = typeof rawCP === 'string'
                ? JSON.parse(rawCP)
                : rawCP;
              if (Array.isArray(parsed)) {
                setCustomPrices(
                  parsed
                    .filter((item: any) => item && typeof item === 'object')
                    .map((item: any) => ({
                      id: item.id || generateId(),
                      name: item.name || item.label || '',
                      price: item.price !== undefined && item.price !== null ? String(item.price) : '',
                      barcode: item.barcode || '',
                    }))
                );
              }
            }
          } catch (err) {
            console.warn('[ProductForm] Custom prices load error:', err);
          }
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
    setForm((prev) => {
      const updatedForm = { ...prev, [field]: value };
      if (touched[field as keyof typeof touched]) {
        validateFields(updatedForm);
      }
      return updatedForm;
    });
  };

  const handleSelectCategory = (catName: string, catId?: string) => {
    setForm((prev) => ({
      ...prev,
      category: catName,
      categoryId: catId || '',
    }));
    setCategoryModalVisible(false);
  };

  const handleFieldBlur = (field: 'name' | 'retailPrice') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateFields();
  };

  // SKU & Barcode Generators
  const handleGenerateBarcode = () => {
    const randomBarcode = '252' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    handleFieldChange('barcode', randomBarcode);
  };

  const handleGenerateSku = () => {
    const randomSku = 'ART-' + Math.floor(10000 + Math.random() * 90000).toString();
    handleFieldChange('sku', randomSku);
  };

  const handleGenerateColisageBarcode = () => {
    const randomBarcode = '613' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    handleFieldChange('colisageBarcode', randomBarcode);
  };

  // Live margin computations
  const costNum = parseFloat(form.costPrice) || 0;
  const retailNum = parseFloat(form.retailPrice) || 0;
  const netProfit = retailNum - costNum;
  const marginPercent = costNum > 0 ? ((retailNum - costNum) / costNum) * 100 : 0;

  const getMarginBadge = () => {
    if (marginPercent < 0) {
      return { bg: '#fee2e2', text: '#dc2626', label: 'خسارة 🔴' };
    }
    if (marginPercent < 10) {
      return { bg: '#ffedd5', text: '#ea580c', label: 'هامش ضعيف 🟠' };
    }
    if (marginPercent <= 30) {
      return { bg: '#dbeafe', text: '#2563eb', label: 'هامش جيد 🔵' };
    }
    return { bg: '#dcfce7', text: '#16a34a', label: 'ممتاز 🟢' };
  };

  const applyQuickMargin = (percent: number) => {
    if (costNum <= 0) {
      notify.warning('يرجى تحديد سعر الشراء أولاً لتطبيق نسبة الهامش');
      return;
    }
    const newRetail = (costNum * (1 + percent / 100)).toFixed(2);
    handleFieldChange('retailPrice', newRetail);
  };

  // Colisage live calculations
  const packPriceNum = parseFloat(form.colisagePrice) || 0;
  const packPiecesNum = parseInt(form.colisageCount, 10) || 1;
  const piecePriceInsidePack = packPiecesNum > 0 && packPriceNum > 0
    ? (packPriceNum / packPiecesNum).toFixed(2)
    : '0.00';

  // Barcode Scanner Handler
  const handleBarcodeScanned = (code: string) => {
    setShowScanner(false);
    const trimmed = code.trim();
    if (!trimmed) return;

    if (scannerTarget === 'main') {
      handleFieldChange('barcode', trimmed);
    } else if (scannerTarget === 'colisage') {
      handleFieldChange('colisageBarcode', trimmed);
    } else if (scannerTarget === 'secondary' && activeBarcodeIndex !== null) {
      if (trimmed === form.barcode.trim()) {
        notify.warning('هذا الباركود مسجل كباركود أساسي للمنتج');
        return;
      }
      setSecondaryBarcodes((prev) => {
        const next = [...prev];
        if (next[activeBarcodeIndex]) {
          next[activeBarcodeIndex] = { ...next[activeBarcodeIndex], barcode: trimmed };
        }
        return next;
      });
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

  // Secondary Barcode Helpers (Inline)
  const handleAddSecondaryBarcode = () => {
    setSecondaryBarcodes((prev) => [
      ...prev,
      { id: generateId(), barcode: '', priceLabel: '' },
    ]);
  };

  const handleUpdateSecondaryBarcode = (index: number, field: 'barcode' | 'priceLabel', value: string) => {
    setSecondaryBarcodes((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemoveSecondaryBarcode = (index: number) => {
    setSecondaryBarcodes((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Custom Price Helpers (Inline)
  const handleAddCustomPrice = () => {
    setCustomPrices((prev) => [
      ...prev,
      { id: generateId(), name: '', price: '', barcode: '' },
    ]);
  };

  const handleUpdateCustomPrice = (index: number, field: 'name' | 'price' | 'barcode', value: string) => {
    setCustomPrices((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const handleRemoveCustomPrice = (index: number) => {
    setCustomPrices((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Category Creation
  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    try {
      const newId = generateId();
      const catObj = {
        id: newId,
        name: trimmed,
        color: colors.primary[600] || '#3b82f6',
        icon: 'Tag',
      };
      await db.categories.add(catObj);
      setCategories((prev) => [...prev, catObj as any]);
      setForm((prev) => ({
        ...prev,
        category: trimmed,
        categoryId: newId,
      }));
      setNewCatName('');
      setCategoryModalVisible(false);
      notify.success(`تم إنشاء واختيار فئة "${trimmed}" بنجاح`);
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
      const sale2Val = parseFloat(form.salePrice2) || 0;
      const sale3Val = parseFloat(form.salePrice3) || parseFloat(form.wholesalePrice) || 0;
      const invoiceVal = parseFloat(form.invoicePrice) || 0;
      const averageVal = parseFloat(form.averagePrice) || costVal;
      const marginVal = costVal > 0 ? ((retailVal - costVal) / costVal) * 100 : 0;
      const taxVal = parseFloat(form.taxRate) || 0;
      const maxDiscountVal = parseFloat(form.discount) || 0;
      const wholesaleMinVal = parseFloat(form.wholesaleMinQty) || 0;
      const qtyVal = parseFloat(form.quantity) || 0;
      const lowStockVal = parseFloat(form.lowStockThreshold) || 0;
      const weightVal = parseFloat(form.weight) || 0;

      // Generate barcode if left blank
      let finalBarcode = form.barcode.trim();
      if (!finalBarcode) {
        finalBarcode = '252' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      }

      const finalProductId = productId || generateId();

      const productPayload: any = {
        name: form.name.trim(),
        productName: form.name.trim(),
        barcode: finalBarcode,
        sku: form.sku.trim() || form.barcode.trim() || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        category: form.category.trim() || 'عام',
        category_id: form.categoryId || '',
        categoryId: form.categoryId || '',
        unit: form.unit || 'قطعة',
        retail_price: retailVal,
        retailPrice: retailVal,
        price: retailVal,
        sale_price2: sale2Val,
        salePrice2: sale2Val,
        sale_price3: sale3Val,
        salePrice3: sale3Val,
        wholesale_price: sale3Val,
        wholesalePrice: sale3Val,
        invoice_price: invoiceVal,
        invoicePrice: invoiceVal,
        cost_price: costVal,
        costPrice: costVal,
        purchase_price: costVal,
        purchasePrice: costVal,
        average_price: averageVal,
        averagePrice: averageVal,
        profit_margin: marginVal,
        profitMargin: marginVal,
        tax_rate: taxVal,
        taxRate: taxVal,
        discount: maxDiscountVal,
        wholesale_min_qty: wholesaleMinVal,
        wholesaleMinQty: wholesaleMinVal,
        wholesale_unit_name: form.wholesaleUnitName.trim() || 'كرتون',
        wholesaleUnitName: form.wholesaleUnitName.trim() || 'كرتون',
        quantity: qtyVal,
        qty: qtyVal,
        stock: qtyVal,
        low_stock_threshold: lowStockVal,
        lowStockThreshold: lowStockVal,
        min_quantity: lowStockVal,
        minQuantity: lowStockVal,
        weight: weightVal,
        package_size: form.packageSize.trim(),
        packageSize: form.packageSize.trim(),
        location: form.location.trim(),
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
        quick_sale: form.quickSale ? 1 : 0,
        quickSale: form.quickSale,
        allow_negative_stock: form.allowNegativeStock ? 1 : 0,
        allowNegativeStock: form.allowNegativeStock,
        has_variants: form.hasVariants ? 1 : 0,
        hasVariants: form.hasVariants,
        image: form.image || '',
        image_url: form.image || '',
        imageUrl: form.image || '',
        custom_prices: JSON.stringify(
          customPrices
            .filter((cp) => cp && cp.name && cp.name.trim().length > 0)
            .map((cp) => {
              const rawP = String(cp.price ?? '0').replace(',', '.').trim();
              const numP = parseFloat(rawP);
              return {
                id: cp.id || generateId(),
                name: cp.name.trim(),
                price: isNaN(numP) ? 0 : numP,
                barcode: cp.barcode?.trim() || undefined,
              };
            })
        ),
        customPrices: customPrices
          .filter((cp) => cp && cp.name && cp.name.trim().length > 0)
          .map((cp) => {
            const rawP = String(cp.price ?? '0').replace(',', '.').trim();
            const numP = parseFloat(rawP);
            return {
              id: cp.id || generateId(),
              name: cp.name.trim(),
              price: isNaN(numP) ? 0 : numP,
              barcode: cp.barcode?.trim() || undefined,
            };
          }),
        status: 'active',
        updated_at: nowIso,
      };

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

      // ── Handle Colisage Pack ──
      if (form.enableColisage) {
        const pPieces = parseInt(form.colisageCount, 10) || 12;
        const pPrice = parseFloat(form.colisagePrice) || (sale3Val > 0 ? sale3Val * pPieces : retailVal * pPieces);
        const pName = form.colisageName.trim() || `كرتونة ${form.name.trim()} (${pPieces} ${form.unit})`;
        const pBarcode = form.colisageBarcode.trim();
        const packId = form.colisagePackId || generateId();

        const packRecord: any = {
          id: packId,
          name: pName,
          description: `عبوة جملة لصنف ${form.name.trim()} تحتوي على ${pPieces} ${form.unit}`,
          barcode: pBarcode,
          price: pPrice,
          pack_price: pPrice,
          packPrice: pPrice,
          pack_type: 'colisage',
          packType: 'colisage',
          unit_name: 'كرتون',
          pieces_count: pPieces,
          piecesCount: pPieces,
          min_wholesale_qty: 1,
          items: JSON.stringify([
            { productId: finalProductId, name: form.name.trim(), qty: pPieces }
          ]),
          status: 'active',
          is_active: 1,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const existingPack = await db.packs.get(packId).catch(() => null);
        if (existingPack) {
          await db.packs.update(packId, packRecord);
          await syncEngine.enqueue('update', 'packs', packId, packRecord);
        } else {
          await db.packs.add(packRecord);
          await syncEngine.enqueue('create', 'packs', packId, packRecord);
        }
      }

      // Trigger background sync in connected mode
      syncEngine.processQueue().catch(() => {});

      // Sync secondary barcodes table
      try {
        const allSec = await db.productBarcodes.toArray().catch(() => []);
        const existingForThisProd = allSec.filter(
          (b: any) => b.productId === finalProductId || b.product_id === finalProductId
        );

        const validBarcodes = secondaryBarcodes.filter((b) => b.barcode.trim());

        for (const ex of existingForThisProd) {
          if (!validBarcodes.some((b) => b.barcode.trim() === ex.barcode)) {
            await db.productBarcodes.delete(ex.id).catch(() => {});
          }
        }

        for (const item of validBarcodes) {
          const bc = item.barcode.trim();
          const existing = existingForThisProd.find((ex: any) => ex.barcode === bc);
          if (existing) {
            await db.productBarcodes.update(existing.id, {
              price_label: item.priceLabel?.trim() || '',
              priceLabel: item.priceLabel?.trim() || '',
              updated_at: nowIso,
            }).catch(() => {});
          } else {
            await db.productBarcodes.add({
              id: item.id || generateId(),
              product_id: finalProductId,
              productId: finalProductId,
              barcode: bc,
              price_label: item.priceLabel?.trim() || '',
              priceLabel: item.priceLabel?.trim() || '',
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
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowRight size={20} color={colors.text.primary} style={{ transform: [{ rotate: isRTL ? '0deg' : '180deg' }] }} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>
            {isEdit ? t('inventory.editProduct') : t('inventory.addProduct')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {form.name ? form.name : t('inventory.productDetails')}
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
        {/* ── Dashed Image Upload Card ── */}
        <TouchableOpacity
          onPress={() => setImagePickerVisible(true)}
          style={styles.imageUploadCard}
          activeOpacity={0.8}
        >
          {form.image ? (
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: form.image }} style={styles.imagePreview} />
              <View style={[styles.imageOverlayBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Camera size={14} color="#ffffff" />
                <Text style={styles.imageOverlayText}>{t('common.edit')}</Text>
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
              <Text style={styles.imageUploadTitle}>{t('inventory.imageUploadPlaceholder')}</Text>
              <Text style={styles.imageUploadSub}>{t('inventory.imageUploadHint')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════
            SECTION 1: معلومات الصنف والأساسيات (Identity)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={[styles.accordionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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

            <View style={[styles.accordionTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.accordionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.accordionTitle}>
                  1. معلومات الصنف والهوية <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <View style={styles.infoBadge}>
                  <Tag size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              </View>
              <Text style={styles.accordionSubtitle}>الاسم التجاري، رمز الصنف، الفئة ووحدة القياس</Text>
            </View>
          </TouchableOpacity>

          {expandedSections.basic && (
            <View style={styles.accordionBody}>
              {/* 1. Name Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>
                  {t('inventory.productName')} <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { textAlign },
                    touched.name && errors.name ? styles.inputErrorBorder : null,
                  ]}
                  value={form.name}
                  onChangeText={(val) => handleFieldChange('name', val)}
                  onBlur={() => handleFieldBlur('name')}
                  placeholder="مثال: شاحن سامسونج أصلي 25W"
                  placeholderTextColor={colors.text.tertiary}
                />
                {touched.name && errors.name ? (
                  <Text style={[styles.fieldErrorText, { textAlign }]}>{errors.name}</Text>
                ) : null}
              </View>

              {/* 2. SKU Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>رمز الصنف (SKU / Ref)</Text>
                <View style={[styles.barcodeInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={styles.scanBarcodeBtn}
                    onPress={handleGenerateSku}
                    activeOpacity={0.8}
                    title="توليد تلقائي"
                  >
                    <Sparkles size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.textInput, { flex: 1, textAlign: 'left', fontFamily: 'Courier', letterSpacing: 1 }]}
                    value={form.sku}
                    onChangeText={(val) => handleFieldChange('sku', val)}
                    placeholder="ART-00025"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              </View>

              {/* 3. Category Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>{t('inventory.category')}</Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.selectInputBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setCategoryModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <ChevronDown size={16} color={colors.text.tertiary} />
                  <Text
                    style={[
                      styles.selectInputText,
                      { color: form.category ? colors.text.primary : colors.text.tertiary, textAlign },
                    ]}
                  >
                    {form.category || t('inventory.selectCategory')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 4. Unit Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>
                  {t('inventory.unit')} <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.selectInputBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => setUnitModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <ChevronDown size={16} color={colors.text.secondary} />
                  <Text style={[styles.selectInputText, { color: colors.text.primary, fontWeight: '700', textAlign }]}>
                    {form.unit}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 2: الأسعار ومستويات البيع والربحية (Pricing & Margins)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={[styles.accordionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => toggleSection('pricing')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.pricing ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={[styles.accordionTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.accordionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.accordionTitle}>
                  2. الأسعار ومستويات البيع والربحية <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <View style={styles.infoBadge}>
                  <Percent size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              </View>
              <Text style={styles.accordionSubtitle}>تجزئة، نصف جملة، جملة وحاسبة الهامش اللحظية</Text>
            </View>
          </TouchableOpacity>

          {expandedSections.pricing && (
            <View style={styles.accordionBody}>
              {/* ── Real-Time Profitability KPI Card ── */}
              <View style={styles.kpiContainer}>
                <View style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>سعر الشراء</Text>
                    <Text style={styles.kpiValue}>{costNum.toFixed(2)} {currency}</Text>
                  </View>
                  <View style={styles.kpiDivider} />
                  <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>سعر التجزئة</Text>
                    <Text style={styles.kpiValue}>{retailNum.toFixed(2)} {currency}</Text>
                  </View>
                  <View style={styles.kpiDivider} />
                  <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>صافي الربح</Text>
                    <Text style={[styles.kpiValue, { color: netProfit >= 0 ? '#10b981' : '#ef4444' }]}>
                      {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} {currency}
                    </Text>
                  </View>
                </View>

                {/* Margin Badge */}
                {costNum > 0 && retailNum > 0 ? (
                  <View style={[styles.marginPill, { backgroundColor: getMarginBadge().bg }]}>
                    <Text style={[styles.marginPillText, { color: getMarginBadge().text }]}>
                      هامش الربح: {marginPercent >= 0 ? '+' : ''}{marginPercent.toFixed(1)}% ({getMarginBadge().label})
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* ── Quick Margin Buttons ── */}
              <View>
                <Text style={[styles.fieldLabel, { textAlign, marginBottom: 4 }]}>تطبيق هامش ربح سريع على سعر الشراء:</Text>
                <View style={[styles.quickMarginRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {[15, 25, 35, 50].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      style={styles.quickMarginBtn}
                      onPress={() => applyQuickMargin(pct)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickMarginBtnText}>+{pct}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 1. Last Cost Price & PAMP */}
              <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>آخر سعر شراء</Text>
                  <View style={[styles.currencyInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{currency}</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.currencyTextInput, { textAlign }]}
                      value={form.costPrice}
                      onChangeText={(val) => handleFieldChange('costPrice', val)}
                      placeholder="0.00"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>متوسط التكلفة (PAMP)</Text>
                  <View style={[styles.currencyInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{currency}</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.currencyTextInput, { textAlign }]}
                      value={form.averagePrice}
                      onChangeText={(val) => handleFieldChange('averagePrice', val)}
                      placeholder="0.00"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* 2. Retail Price (سعر البيع 1 - تجزئة) */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>
                  سعر البيع 1: تجزئة (Détail) <Text style={{ color: colors.danger.main }}>*</Text>
                </Text>
                <View style={[styles.currencyInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>{currency}</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.currencyTextInput,
                      { textAlign },
                      touched.retailPrice && errors.retailPrice ? styles.inputErrorBorder : null,
                    ]}
                    value={form.retailPrice}
                    onChangeText={(val) => handleFieldChange('retailPrice', val)}
                    onBlur={() => handleFieldBlur('retailPrice')}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
                {touched.retailPrice && errors.retailPrice ? (
                  <Text style={[styles.fieldErrorText, { textAlign }]}>{errors.retailPrice}</Text>
                ) : null}
              </View>

              {/* 3. Semi-Wholesale & Wholesale (سعر 2 وسعر 3) */}
              <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>سعر 2: نصف جملة</Text>
                  <View style={[styles.currencyInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{currency}</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.currencyTextInput, { textAlign }]}
                      value={form.salePrice2}
                      onChangeText={(val) => handleFieldChange('salePrice2', val)}
                      placeholder="0.00"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>سعر 3: جملة (Gros)</Text>
                  <View style={[styles.currencyInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{currency}</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.currencyTextInput, { textAlign }]}
                      value={form.salePrice3 || form.wholesalePrice}
                      onChangeText={(val) => {
                        handleFieldChange('salePrice3', val);
                        handleFieldChange('wholesalePrice', val);
                      }}
                      placeholder="0.00"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* 4. Invoice Price (سعر البيع بالفاتورة الرسمية) */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>سعر البيع بالفاتورة (Prix Facturé)</Text>
                <View style={[styles.currencyInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>{currency}</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.currencyTextInput, { textAlign }]}
                    value={form.invoicePrice}
                    onChangeText={(val) => handleFieldChange('invoicePrice', val)}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* 5. Wholesale Min Qty & Unit Name */}
              <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>حد كمية الجملة (تلقائي)</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.wholesaleMinQty}
                    onChangeText={(val) => handleFieldChange('wholesaleMinQty', val)}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>تسمية وحدة الجملة</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.wholesaleUnitName}
                    onChangeText={(val) => handleFieldChange('wholesaleUnitName', val)}
                    placeholder="كرتون"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              </View>

              {/* 6. Tax TVA & Max Discount */}
              <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>نسبة الضريبة (TVA %)</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.taxRate}
                    onChangeText={(val) => handleFieldChange('taxRate', val)}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>أقصى خصم مسموح (%)</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.discount}
                    onChangeText={(val) => handleFieldChange('discount', val)}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 3: الباركود والترميز المتعدد (Barcodes & Coding)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={[styles.accordionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => toggleSection('barcodes')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.barcodes ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={[styles.accordionTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.accordionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.accordionTitle}>3. الباركود والترميز المتعدد</Text>
                <View style={styles.infoBadge}>
                  <Barcode size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              </View>
              <Text style={styles.accordionSubtitle}>الباركود الرئيسي، المسح بالكاميرا والرموز البديلة</Text>
            </View>
          </TouchableOpacity>

          {expandedSections.barcodes && (
            <View style={styles.accordionBody}>
              {/* Primary Barcode */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>الباركود الرئيسي</Text>
                <View style={[styles.barcodeInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                    placeholder="6131234567890"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="default"
                  />
                </View>
                <View style={[styles.helperRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity onPress={handleGenerateBarcode}>
                    <Text style={styles.generateLinkText}>⚡ توليد باركود آلي</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Secondary Barcodes Subsection */}
              <View style={[styles.subsectionBox, { marginTop: spacing.sm }]}>
                <Text style={[styles.subsectionHintText, { textAlign }]}>
                  باركودات إضافية لنفس الصنف (مثلاً باركود قديم أو مستورد):
                </Text>

                {secondaryBarcodes.map((item, idx) => (
                  <View key={item.id || idx} style={styles.advancedItemCard}>
                    <View style={[styles.advancedCardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        onPress={() => handleRemoveSecondaryBarcode(idx)}
                        style={styles.deleteCardBtn}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={18} color={colors.danger.main} />
                      </TouchableOpacity>

                      <View style={[styles.inputWithIconWrapper, { flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity
                          style={styles.inlineScanBtn}
                          onPress={() => {
                            setActiveBarcodeIndex(idx);
                            setScannerTarget('secondary');
                            setShowScanner(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <ScanLine size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                        </TouchableOpacity>

                        <TextInput
                          style={[styles.advancedInput, { flex: 1, textAlign: 'left', fontFamily: 'Courier' }]}
                          value={item.barcode}
                          onChangeText={(val) => handleUpdateSecondaryBarcode(idx, 'barcode', val)}
                          placeholder="الباركود الإضافي"
                          placeholderTextColor={colors.text.tertiary}
                          keyboardType="default"
                        />
                      </View>
                    </View>

                    <TextInput
                      style={[styles.advancedInput, { textAlign, marginTop: spacing.xs }]}
                      value={item.priceLabel}
                      onChangeText={(val) => handleUpdateSecondaryBarcode(idx, 'priceLabel', val)}
                      placeholder="تسمية الباركود (مثلاً: علبة صغيرة)"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.dashedActionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={handleAddSecondaryBarcode}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                  <Text style={styles.dashedActionBtnText}>+ إضافة باركود بديل</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 4: عبوات وتعبئة الجملة (Colisage & Packaging)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={[styles.accordionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => toggleSection('colisage')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.colisage ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={[styles.accordionTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.accordionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.accordionTitle}>4. عبوات وتعبئة الجملة (Colisage)</Text>
                <View style={styles.infoBadge}>
                  <Boxes size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              </View>
              <Text style={styles.accordionSubtitle}>البيع بالكرتون والطرود مع خصم المخزون الحقيقي</Text>
            </View>
          </TouchableOpacity>

          {expandedSections.colisage && (
            <View style={styles.accordionBody}>
              {/* Toggle Enable Colisage */}
              <View style={[styles.toggleCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.toggleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.toggleTitle}>تفعيل البيع بالعبوة / الكرتون لهذا الصنف</Text>
                  <Text style={styles.toggleSubtitle}>إنشاء عبوة جملة مرتبطة تخصم تلقائياً من مخزون القطع الفردية</Text>
                </View>
                <Switch
                  value={form.enableColisage}
                  onValueChange={(val) => handleFieldChange('enableColisage', val)}
                  trackColor={{ false: colors.slate[300], true: colors.primary[600] }}
                  thumbColor="#ffffff"
                />
              </View>

              {form.enableColisage && (
                <View style={styles.colisageCard}>
                  {/* Pack Name */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { textAlign }]}>اسم العبوة (Colis / Carton)</Text>
                    <TextInput
                      style={[styles.textInput, { textAlign }]}
                      value={form.colisageName}
                      onChangeText={(val) => handleFieldChange('colisageName', val)}
                      placeholder={`كرتونة ${form.name || 'المنتج'} (24 قطعة)`}
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  {/* Pieces Count & Pack Price */}
                  <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { textAlign }]}>عدد القطع بالعبوة</Text>
                      <TextInput
                        style={[styles.textInput, { textAlign }]}
                        value={form.colisageCount}
                        onChangeText={(val) => handleFieldChange('colisageCount', val)}
                        placeholder="12"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { textAlign }]}>سعر بيع العبوة بالجملة</Text>
                      <View style={[styles.currencyInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={styles.currencyBadge}>
                          <Text style={styles.currencyBadgeText}>{currency}</Text>
                        </View>
                        <TextInput
                          style={[styles.textInput, styles.currencyTextInput, { textAlign }]}
                          value={form.colisagePrice}
                          onChangeText={(val) => handleFieldChange('colisagePrice', val)}
                          placeholder="0.00"
                          placeholderTextColor={colors.text.tertiary}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Calculated Piece Price Badge */}
                  <View style={styles.pieceCalcBox}>
                    <Text style={[styles.pieceCalcText, { textAlign }]}>
                      📦 سعر القطعة الفردية داخل هذه العبوة: {piecePriceInsidePack} {currency}
                    </Text>
                  </View>

                  {/* Pack Barcode */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { textAlign }]}>باركود العبوة الخارجي (باركود الكرتون)</Text>
                    <View style={[styles.barcodeInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        style={styles.scanBarcodeBtn}
                        onPress={() => {
                          setScannerTarget('colisage');
                          setShowScanner(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <ScanLine size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                      </TouchableOpacity>

                      <TextInput
                        style={[styles.textInput, { flex: 1, textAlign: 'left', fontFamily: 'Courier', letterSpacing: 1 }]}
                        value={form.colisageBarcode}
                        onChangeText={(val) => handleFieldChange('colisageBarcode', val)}
                        placeholder="6139998881112"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="default"
                      />
                    </View>
                    <View style={[styles.helperRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity onPress={handleGenerateColisageBarcode}>
                        <Text style={styles.generateLinkText}>⚡ توليد باركود للكرتون</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 5: المخزون والموقع والتنبيهات (Inventory & Stock)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={[styles.accordionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => toggleSection('inventory')}
            activeOpacity={0.7}
          >
            <View style={styles.accordionChevron}>
              {expandedSections.inventory ? (
                <ChevronUp size={18} color={colors.text.secondary} />
              ) : (
                <ChevronDown size={18} color={colors.text.secondary} />
              )}
            </View>

            <View style={[styles.accordionTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.accordionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.accordionTitle}>5. المخزون والموقع والتنبيهات</Text>
                <View style={styles.infoBadge}>
                  <Truck size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              </View>
              <Text style={styles.accordionSubtitle}>الرصيد الفعلي، حد التنبيه، الوزن والرف</Text>
            </View>
          </TouchableOpacity>

          {expandedSections.inventory && (
            <View style={styles.accordionBody}>
              {/* Initial Quantity & Low Stock Alert */}
              <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>{t('inventory.stockQuantity')}</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.quantity}
                    onChangeText={(val) => handleFieldChange('quantity', val)}
                    placeholder="0"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>{t('inventory.minStockAlert')}</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.lowStockThreshold}
                    onChangeText={(val) => handleFieldChange('lowStockThreshold', val)}
                    placeholder="5"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Net Weight (kg) & Package Size */}
              <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>الوزن الصافي (كغ)</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.weight}
                    onChangeText={(val) => handleFieldChange('weight', val)}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>حجم / نمط العبوة</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.packageSize}
                    onChangeText={(val) => handleFieldChange('packageSize', val)}
                    placeholder="مثال: 24×330مل"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              </View>

              {/* Storage Location & Supplier */}
              <View style={[styles.twoColumnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>مكان التواجد (الرف / المخزن)</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.location}
                    onChangeText={(val) => handleFieldChange('location', val)}
                    placeholder="رف A-3"
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { textAlign }]}>{t('inventory.supplier')}</Text>
                  <TextInput
                    style={[styles.textInput, { textAlign }]}
                    value={form.supplier}
                    onChangeText={(val) => handleFieldChange('supplier', val)}
                    placeholder={t('inventory.supplier')}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              </View>

              {/* Expiry Date */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>{isRTL ? 'تاريخ انتهاء الصلاحية' : 'Expiry Date'}</Text>
                <TextInput
                  style={[styles.textInput, { textAlign }]}
                  value={form.expiryDate}
                  onChangeText={(val) => handleFieldChange('expiryDate', val)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { textAlign }]}>{t('inventory.description')}</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput, { textAlign }]}
                  value={form.description}
                  onChangeText={(val) => handleFieldChange('description', val)}
                  placeholder={t('inventory.description')}
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════
            SECTION 6: خيارات متقدمة (Advanced Toggles & Custom Prices)
        ═══════════════════════════════════════════════════════ */}
        <View style={styles.accordionCard}>
          <TouchableOpacity
            style={[styles.accordionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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

            <View style={[styles.accordionTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.accordionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.accordionTitle}>6. خيارات متقدمة</Text>
                <View style={styles.infoBadge}>
                  <SlidersHorizontal size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
              </View>
              <Text style={styles.accordionSubtitle}>البيع السريع، البيع بالسالب والأسعار المخصصة</Text>
            </View>
          </TouchableOpacity>

          {expandedSections.advanced && (
            <View style={styles.accordionBody}>
              {/* Quick Sale Toggle */}
              <View style={[styles.toggleCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.toggleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.toggleTitle}>الظهور في البيع السريع المميز</Text>
                  <Text style={styles.toggleSubtitle}>عرض الصنف في شريط البنود الأكثر مبيعاً في واجهة الكاشير</Text>
                </View>
                <Switch
                  value={form.quickSale}
                  onValueChange={(val) => handleFieldChange('quickSale', val)}
                  trackColor={{ false: colors.slate[300], true: colors.primary[600] }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Allow Negative Stock Toggle */}
              <View style={[styles.toggleCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.toggleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.toggleTitle}>السماح بالبيع بدون رصيد مخزني</Text>
                  <Text style={styles.toggleSubtitle}>إمكانية إضافة الصنف وإتمام البيع حتى لو كان المخزون 0 أو سالباً</Text>
                </View>
                <Switch
                  value={form.allowNegativeStock}
                  onValueChange={(val) => handleFieldChange('allowNegativeStock', val)}
                  trackColor={{ false: colors.slate[300], true: colors.primary[600] }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Custom Prices Subsection */}
              <View style={[styles.subsectionBox, { marginTop: spacing.md }]}>
                <Text style={[styles.subsectionHintText, { textAlign }]}>
                  أسعار إضافية مخصصة (مثلاً سعر خاص للموظفين، المعارض):
                </Text>

                {customPrices.map((cp, idx) => (
                  <View key={cp.id || idx} style={styles.advancedItemCard}>
                    <TextInput
                      style={[styles.advancedInput, { textAlign }]}
                      value={cp.name}
                      onChangeText={(val) => handleUpdateCustomPrice(idx, 'name', val)}
                      placeholder="التسمية (مثلاً: سعر خاص)"
                      placeholderTextColor={colors.text.tertiary}
                    />

                    <View style={[styles.advancedCardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        onPress={() => handleRemoveCustomPrice(idx)}
                        style={styles.deleteCardBtn}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={18} color={colors.danger.main} />
                      </TouchableOpacity>

                      <View style={[styles.currencyInputInline, { flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={styles.currencyBadgeInline}>
                          <Text style={styles.currencyBadgeText}>{currency}</Text>
                        </View>
                        <TextInput
                          style={[styles.advancedInput, { flex: 1, textAlign }]}
                          value={cp.price}
                          onChangeText={(val) => handleUpdateCustomPrice(idx, 'price', val)}
                          placeholder="السعر"
                          placeholderTextColor={colors.text.tertiary}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={[styles.inputWithIconWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        style={styles.inlineScanBtn}
                        onPress={() => {
                          setActivePriceIndex(idx);
                          setScannerTarget('customPrice');
                          setShowScanner(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <ScanLine size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                      </TouchableOpacity>

                      <TextInput
                        style={[styles.advancedInput, { flex: 1, textAlign: 'left', fontFamily: 'Courier' }]}
                        value={cp.barcode || ''}
                        onChangeText={(val) => handleUpdateCustomPrice(idx, 'barcode', val)}
                        placeholder="باركود مخصوص (اختياري)"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="default"
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.dashedActionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={handleAddCustomPrice}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={isDark ? '#60a5fa' : '#2563eb'} />
                  <Text style={styles.dashedActionBtnText}>+ إضافة سعر مخصص</Text>
                </TouchableOpacity>
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
            <Text style={styles.modalTitle}>{t('inventory.unit')}</Text>
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
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                <Tag size={18} color={colors.primary[600]} />
                <Text style={[styles.modalTitle, { marginBottom: 0, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('inventory.selectCategory')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 240, marginVertical: spacing.xs }}>
              <View style={styles.categoriesList}>
                {/* General / Default Category Option */}
                {(() => {
                  const isGeneralSelected =
                    !form.categoryId && (!form.category || form.category === 'عام' || form.category.toLowerCase() === 'general');
                  return (
                    <TouchableOpacity
                      style={[
                        styles.categoryListItem,
                        isGeneralSelected && styles.categoryListItemActive,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                      onPress={() => handleSelectCategory('عام', '')}
                    >
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                        <Tag size={15} color={isGeneralSelected ? '#ffffff' : colors.text.tertiary} />
                        <Text
                          style={[
                            styles.categoryListText,
                            isGeneralSelected && styles.categoryListTextActive,
                          ]}
                        >
                          عام (افتراضي)
                        </Text>
                      </View>
                      {isGeneralSelected ? <Check size={16} color="#ffffff" /> : null}
                    </TouchableOpacity>
                  );
                })()}

                {/* Database Categories */}
                {categories.map((c) => {
                  const isSelected =
                    (form.categoryId && form.categoryId === c.id) ||
                    (form.category && form.category.trim().toLowerCase() === c.name.trim().toLowerCase());
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.categoryListItem,
                        isSelected && styles.categoryListItemActive,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                      onPress={() => handleSelectCategory(c.name, c.id)}
                    >
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: isSelected ? '#ffffff' : (c as any).color || colors.primary[500],
                          }}
                        />
                        <Text
                          style={[
                            styles.categoryListText,
                            isSelected && styles.categoryListTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Check size={16} color="#ffffff" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.newCatInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={styles.addCatBtn}
                onPress={handleCreateCategory}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#ffffff" />
              </TouchableOpacity>
              <TextInput
                style={[styles.textInput, { flex: 1, textAlign }]}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder={t('categories.addCategory')}
                placeholderTextColor={colors.text.tertiary}
                onSubmitEditing={handleCreateCategory}
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
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setImagePickerVisible(false)}
        >
          <View style={styles.actionSheetCard} onStartShouldSetResponder={() => true}>
            {/* Header Handle & Title */}
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.sheetTitleBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.sheetTitle}>{t('inventory.productImage')}</Text>
                <Text style={styles.sheetSubtitle}>{t('inventory.imageUploadHint')}</Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setImagePickerVisible(false)}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <View style={styles.sheetOptionsList}>
              {/* Option 1: Capture Photo with Camera (FIRST OPTION) */}
              <TouchableOpacity
                style={[styles.sheetOptionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={handleCapturePhoto}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetOptionIconBox, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]}>
                  <Camera size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
                </View>
                <View style={[styles.sheetOptionTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.sheetOptionTitle}>{t('inventory.takePhoto')}</Text>
                  <Text style={styles.sheetOptionDesc}>{t('inventory.takePhotoDesc')}</Text>
                </View>
                <ChevronDown
                  size={18}
                  color={colors.text.tertiary}
                  style={{ transform: [{ rotate: isRTL ? '90deg' : '-90deg' }] }}
                />
              </TouchableOpacity>

              {/* Option 2: Pick from Gallery */}
              <TouchableOpacity
                style={[styles.sheetOptionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={handlePickGallery}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetOptionIconBox, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#f5f3ff' }]}>
                  <ImageIcon size={22} color={isDark ? '#a78bfa' : '#7c3aed'} />
                </View>
                <View style={[styles.sheetOptionTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.sheetOptionTitle}>{t('inventory.chooseFromGallery')}</Text>
                  <Text style={styles.sheetOptionDesc}>{t('inventory.chooseFromGalleryDesc')}</Text>
                </View>
                <ChevronDown
                  size={18}
                  color={colors.text.tertiary}
                  style={{ transform: [{ rotate: isRTL ? '90deg' : '-90deg' }] }}
                />
              </TouchableOpacity>

              {/* Option 3: Direct URL */}
              <TouchableOpacity
                style={[styles.sheetOptionItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  setImagePickerVisible(false);
                  setUrlModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetOptionIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' }]}>
                  <Globe size={22} color={isDark ? '#34d399' : '#059669'} />
                </View>
                <View style={[styles.sheetOptionTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.sheetOptionTitle}>{t('inventory.enterImageUrl')}</Text>
                  <Text style={styles.sheetOptionDesc}>{t('inventory.enterImageUrlDesc')}</Text>
                </View>
                <ChevronDown
                  size={18}
                  color={colors.text.tertiary}
                  style={{ transform: [{ rotate: isRTL ? '90deg' : '-90deg' }] }}
                />
              </TouchableOpacity>

              {/* Option 4: Remove image if exists */}
              {form.image ? (
                <TouchableOpacity
                  style={[styles.sheetOptionItem, styles.sheetOptionDelete, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={handleRemoveImage}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2' }]}>
                    <Trash2 size={22} color={colors.danger.main} />
                  </View>
                  <View style={[styles.sheetOptionTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.sheetOptionTitle, { color: colors.danger.main }]}>
                      {t('inventory.removeProductImage')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setImagePickerVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
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
            <View style={[styles.modalCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('inventory.enterImageUrl')}</Text>
              <TouchableOpacity onPress={() => setUrlModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, { marginVertical: spacing.md, textAlign: 'left' }]}
              value={customImageUrl}
              onChangeText={setCustomImageUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={[styles.modalActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.modalSecondaryBtn, { flex: 1 }]}
                onPress={() => setUrlModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveSubModalBtn, { flex: 1 }]}
                onPress={handleApplyCustomUrl}
                activeOpacity={0.7}
              >
                <Text style={styles.saveSubModalBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
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
    subsectionHintText: {
      fontSize: 12,
      fontFamily: 'Cairo',
      color: colors.text.secondary,
      lineHeight: 18,
      marginBottom: spacing.xs,
    },
    advancedItemCard: {
      backgroundColor: isDark ? '#0c1322' : '#f8fafc',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      borderRadius: radii.xl,
      padding: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    advancedCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    deleteCardBtn: {
      width: 46,
      height: 46,
      borderRadius: radii.lg,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputWithIconWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    inlineScanBtn: {
      width: 46,
      height: 46,
      borderRadius: radii.lg,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
      alignItems: 'center',
      justifyContent: 'center',
    },
    advancedInput: {
      backgroundColor: isDark ? '#111827' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: 13.5,
      fontFamily: 'Cairo',
      color: colors.text.primary,
      minHeight: 46,
    },
    currencyInputInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    currencyBadgeInline: {
      height: 46,
      paddingHorizontal: spacing.sm + 2,
      borderRadius: radii.lg,
      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
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

    // Image Action Sheet Modal
    actionSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 15, 29, 0.75)',
      justifyContent: 'flex-end',
    },
    actionSheetCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: Platform.OS === 'android' ? 24 : 36,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.lg,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: radii.full,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1',
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    sheetHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sheetTitleBox: {
      flex: 1,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    sheetSubtitle: {
      fontSize: 12,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
      marginTop: 2,
    },
    sheetCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: radii.circle,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetOptionsList: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sheetOptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderWidth: 1,
      borderColor: isDark ? colors.border.subtle : colors.slate[200],
    },
    sheetOptionDelete: {
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
    },
    sheetOptionIconBox: {
      width: 44,
      height: 44,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetOptionTextBox: {
      flex: 1,
      gap: 2,
    },
    sheetOptionTitle: {
      fontSize: 14,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    sheetOptionDesc: {
      fontSize: 11.5,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
    },
    sheetCancelBtn: {
      width: '100%',
      paddingVertical: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? colors.border.default : colors.slate[200],
    },
    sheetCancelBtnText: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.secondary,
    },
    modalCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    modalActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    modalSecondaryBtn: {
      paddingVertical: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? colors.border.default : colors.slate[200],
    },
    modalSecondaryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.secondary,
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

    // ── Wholesale & KPI Styles (PRD-MOB-WS-PROD-2026) ──
    kpiContainer: {
      backgroundColor: isDark ? '#111827' : '#f8fafc',
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: isDark ? '#1f2937' : '#e2e8f0',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    kpiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    kpiItem: {
      alignItems: 'center',
      flex: 1,
    },
    kpiDivider: {
      width: 1,
      height: 28,
      backgroundColor: isDark ? '#374151' : '#e2e8f0',
    },
    kpiLabel: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
      marginBottom: 2,
    },
    kpiValue: {
      fontSize: 13,
      fontWeight: '800',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    marginPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.md,
      alignSelf: 'center',
    },
    marginPillText: {
      fontSize: 11,
      fontWeight: '800',
      fontFamily: 'Cairo',
    },
    quickMarginRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
      flexWrap: 'wrap',
    },
    quickMarginBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.lg,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe',
    },
    quickMarginBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: isDark ? '#60a5fa' : '#2563eb',
    },
    colisageCard: {
      backgroundColor: isDark ? '#0f172a' : '#f0f9ff',
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: isDark ? '#1e293b' : '#bae6fd',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    pieceCalcBox: {
      backgroundColor: isDark ? 'rgba(3, 105, 161, 0.2)' : '#e0f2fe',
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(3, 105, 161, 0.4)' : '#7dd3fc',
    },
    pieceCalcText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: isDark ? '#38bdf8' : '#0369a1',
    },
    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[50],
      marginBottom: spacing.xs,
    },
    toggleTextBox: {
      flex: 1,
      marginRight: spacing.sm,
    },
    toggleTitle: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      color: colors.text.primary,
    },
    toggleSubtitle: {
      fontSize: 10.5,
      fontFamily: 'Cairo',
      color: colors.text.tertiary,
    },
  });

export default ProductFormScreen;
