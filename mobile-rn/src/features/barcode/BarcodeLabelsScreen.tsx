import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Share,
  Switch,
} from 'react-native';
import {
  Barcode as BarcodeIcon,
  ArrowRight,
  ArrowLeft,
  Printer,
  Share2,
  Package,
  Check,
  Search,
  X,
  History,
  Wand2,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  Plus,
  Minus,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import { getStoreSettings } from '@/lib/settingService';
import type { Product } from '@shared/types';
import {
  BarcodeSvg,
  generateBarcode,
  generateEAN13,
  generateEAN8,
  generateUPCA,
  generateCode128,
  type BarcodeFormat,
} from '@/lib/barcodeSvg';
import {
  LABEL_SIZES,
  BARCODE_FORMAT_LABELS,
  type LabelSize,
  type PrintOptions,
  DEFAULT_PRINT_OPTIONS,
  type BarcodePrint,
} from '@shared/types/labelPrint';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';

interface SelectedProductItem {
  product: Product;
  barcode: string;
  copies: number;
}

export const BarcodeLabelsScreen = ({ navigation, route }: any) => {
  const preselectProductId = route?.params?.productId;
  const { isDark, colors } = useTheme();
  const { t, isRTL, textAlign, currency } = useI18n();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [opts, setOpts] = useState<PrintOptions>(DEFAULT_PRINT_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shopName, setShopName] = useState('AN POS');

  // History state
  const [history, setHistory] = useState<BarcodePrint[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      await ensureInit();
      const [allProducts, storeSettings, historyList] = await Promise.all([
        db.products.toArray(),
        getStoreSettings(false),
        db.barcodePrints.toArray(),
      ]);

      setProducts(allProducts);
      if (storeSettings?.shop_name) {
        setShopName(storeSettings.shop_name);
      }

      if (historyList) {
        setHistory(historyList.slice().reverse());
      }

      if (preselectProductId) {
        setSelectedIds(new Set([preselectProductId]));
      } else if (allProducts.length > 0) {
        setSelectedIds(new Set([allProducts[0].id]));
      }
    } catch (err) {
      console.warn('Failed to load barcode products:', err);
    }
    setLoading(false);
  }

  const labelSize = useMemo(
    () => LABEL_SIZES.find((l) => l.id === opts.labelSizeId) ?? LABEL_SIZES[0],
    [opts.labelSizeId],
  );

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [products, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  }, [products]);

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const generateBarcodeValue = useCallback((): string => {
    switch (opts.barcodeFormat) {
      case 'ean13': return generateEAN13();
      case 'ean8': return generateEAN8();
      case 'upca': return generateUPCA();
      case 'code128': return generateCode128('AN');
      case 'code39': return generateCode128('C39');
      case 'qr': return `AN-${Date.now()}`;
      default: return generateEAN13();
    }
  }, [opts.barcodeFormat]);

  const generateForAllSelected = useCallback(async () => {
    if (selectedIds.size === 0) {
      Alert.alert('تنبيه', 'يرجى تحديد المنتجات أولاً');
      return;
    }
    let updated = 0;
    try {
      await ensureInit();
      for (const id of selectedIds) {
        const prod = products.find((p) => p.id === id);
        if (prod && !prod.barcode) {
          const newCode = generateBarcodeValue();
          await db.products.update(id, { barcode: newCode });
          prod.barcode = newCode;
          updated++;
        }
      }
      setProducts([...products]);
      Alert.alert('✓ تم التوليد', `تم توليد باركود تلقائي لـ ${updated} منتج`);
    } catch {
      Alert.alert('خطأ', 'فشل حفظ الباركود الجديد في قاعدة البيانات');
    }
  }, [selectedIds, products, generateBarcodeValue]);

  // Build items for printing / preview
  const labelItems: SelectedProductItem[] = useMemo(() => {
    return products
      .filter((p) => selectedIds.has(p.id))
      .map((product) => {
        let code = product.barcode || '';
        if (!code) {
          code = generateCode128(product.sku || product.id.slice(0, 8));
        }
        return {
          product,
          barcode: code,
          copies: opts.copies,
        };
      });
  }, [products, selectedIds, opts.copies]);

  const totalStickersCount = labelItems.length * opts.copies;

  const handlePrint = async () => {
    if (labelItems.length === 0) {
      Alert.alert(t('common.warning'), t('barcodeLabels.noProductsSelected'));
      return;
    }

    try {
      await ensureInit();
      const now = new Date().toISOString();
      for (const item of labelItems) {
        const record: BarcodePrint = {
          id: 'bcp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          barcode: item.barcode,
          labelSize: opts.labelSizeId,
          copies: opts.copies,
          barcodeType: opts.barcodeFormat,
          showCompany: opts.showCompany,
          showProduct: opts.showProduct,
          showSku: opts.showSku,
          showPrice: opts.showPrice,
          showBarcode: opts.showBarcode,
          enlargePrice: opts.enlargePrice,
          createdAt: now,
        };
        await db.barcodePrints.add(record);
      }

      const updatedHistory = await db.barcodePrints.toArray();
      setHistory(updatedHistory.slice().reverse());

      Alert.alert(
        t('common.success'),
        t('barcodeLabels.printSuccess'),
      );
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleShareLabels = async () => {
    if (labelItems.length === 0) return;
    try {
      let text = `🏷️ *${t('barcodeLabels.title')} (${totalStickersCount})*\n`;
      text += `📏 ${labelSize.label} mm • ${BARCODE_FORMAT_LABELS[opts.barcodeFormat]}\n`;
      text += `------------------------------------\n`;
      labelItems.forEach((it, i) => {
        text += `${i + 1}. ${it.product.name}\n   Barcode: ${it.barcode} | ${t('inventory.sellingPrice')}: ${(it.product.retailPrice || 0).toLocaleString()} ${currency} | ${t('barcodeLabels.copies')}: ${opts.copies}\n`;
      });
      await Share.share({ message: text });
    } catch {}
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} activeOpacity={0.7}>
          <BackIcon size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { textAlign }]}>{t('barcodeLabels.title')}</Text>
          <Text style={[styles.headerSubtitle, { textAlign }]}>{t('barcodeLabels.subtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handleShareLabels}
          activeOpacity={0.7}
        >
          <Share2 size={18} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Toolbar */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setHistoryModalVisible(true)}
            activeOpacity={0.7}
          >
            <History size={16} color={colors.slate[700]} />
            <Text style={styles.historyBtnText}>{t('barcodeLabels.history')} ({history.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.previewToggleBtn}
            onPress={() => setPreviewVisible(!previewVisible)}
            activeOpacity={0.7}
          >
            {previewVisible ? <EyeOff size={16} color={colors.primary[700]} /> : <Eye size={16} color={colors.primary[700]} />}
            <Text style={styles.previewToggleBtnText}>{t('barcodeLabels.preview')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.printMainBtn}
            onPress={handlePrint}
            disabled={labelItems.length === 0}
            activeOpacity={0.7}
          >
            <Printer size={16} color="#fff" />
            <Text style={styles.printMainBtnText}>{t('barcodeLabels.print')} ({totalStickersCount})</Text>
          </TouchableOpacity>
        </View>

        {/* Live Sticker Preview Box */}
        {previewVisible && (
          <View style={styles.previewCard}>
            <Text style={[styles.sectionHeader, { textAlign }]}>{t('barcodeLabels.preview')} ({labelSize.label} mm)</Text>
            <View style={styles.stickersPreviewRow}>
              {labelItems.length === 0 ? (
                <View style={styles.emptyPreview}>
                  <BarcodeIcon size={36} color={colors.slate[300]} />
                  <Text style={styles.emptyPreviewText}>{t('barcodeLabels.noProductsSelected')}</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
                  {labelItems.map((item, i) => (
                    <View
                      key={`${item.product.id}-${i}`}
                      style={[
                        styles.stickerStitch,
                        {
                          width: Math.min(220, labelSize.width * 4.2),
                          minHeight: Math.min(180, labelSize.height * 4.2),
                        },
                      ]}
                    >
                      {opts.showCompany && shopName && (
                        <Text style={styles.stickerShopName} numberOfLines={1}>
                          {shopName}
                        </Text>
                      )}
                      {opts.showProduct && (
                        <Text style={styles.stickerProdName} numberOfLines={2}>
                          {item.product.name}
                        </Text>
                      )}
                      {opts.showSku && item.product.sku && (
                        <Text style={styles.stickerSku}>SKU: {item.product.sku}</Text>
                      )}

                      <View style={styles.stickerBarcodeContainer}>
                        <BarcodeSvg
                          value={item.barcode}
                          format={opts.barcodeFormat}
                          height={Math.max(28, labelSize.height * 1.5)}
                          width={1.1}
                          showText={opts.showBarcode}
                          textSize={9}
                        />
                      </View>

                      {opts.showPrice && (
                        <Text style={[styles.stickerPrice, opts.enlargePrice && styles.stickerPriceEnlarged]}>
                          {(item.product.retailPrice || 0).toLocaleString()} {currency}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* 10 Label Sizes Picker */}
        <Text style={styles.sectionHeader}>1. مقاس الملصق ({LABEL_SIZES.length} مقاسات قياسية)</Text>
        <View style={styles.optionsCard}>
          <View style={styles.sizesGrid}>
            {LABEL_SIZES.map((ls) => (
              <TouchableOpacity
                key={ls.id}
                style={[styles.sizeOptionBtn, opts.labelSizeId === ls.id && styles.sizeOptionBtnActive]}
                onPress={() => setOpts({ ...opts, labelSizeId: ls.id })}
                activeOpacity={0.7}
              >
                <Text style={[styles.sizeOptionText, opts.labelSizeId === ls.id && styles.sizeOptionTextActive]}>
                  {ls.label} ملم
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 6 Barcode Formats */}
        <Text style={styles.sectionHeader}>2. نوع وصيغة الباركود</Text>
        <View style={styles.optionsCard}>
          <View style={styles.formatsGrid}>
            {(['ean13', 'ean8', 'code128', 'code39', 'upca', 'qr'] as BarcodeFormat[]).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                style={[styles.formatOptionBtn, opts.barcodeFormat === fmt && styles.formatOptionBtnActive]}
                onPress={() => setOpts({ ...opts, barcodeFormat: fmt })}
                activeOpacity={0.7}
              >
                <Text style={[styles.formatOptionText, opts.barcodeFormat === fmt && styles.formatOptionTextActive]}>
                  {BARCODE_FORMAT_LABELS[fmt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Display Toggles & Customization */}
        <Text style={styles.sectionHeader}>3. خيارات الطباعة والمظهر</Text>
        <View style={styles.optionsCard}>
          {[
            { k: 'showCompany' as const, label: 'طباعة اسم المتجر / الشركة' },
            { k: 'showProduct' as const, label: 'طباعة اسم المنتج' },
            { k: 'showSku' as const, label: 'طباعة رمز SKU للمنتج' },
            { k: 'showPrice' as const, label: 'طباعة السعر' },
            { k: 'enlargePrice' as const, label: 'تكبير خط السعر' },
            { k: 'showBarcode' as const, label: 'طباعة رقم الباركود كنص مقروء' },
          ].map((item, idx) => (
            <View key={item.k} style={[styles.toggleRow, idx > 0 && styles.toggleRowBorder]}>
              <Switch
                value={opts[item.k]}
                onValueChange={(v) => setOpts({ ...opts, [item.k]: v })}
                trackColor={{ true: colors.primary[600], false: colors.slate[300] }}
              />
              <Text style={styles.toggleText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Copies & Entry Mode */}
        <Text style={styles.sectionHeader}>4. النسخ وإدخال الباركود</Text>
        <View style={styles.optionsCard}>
          <View style={styles.copiesRow}>
            <View style={styles.copiesControls}>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => setOpts({ ...opts, copies: Math.max(1, opts.copies - 1) })}
              >
                <Minus size={14} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.copiesCount}>{opts.copies}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => setOpts({ ...opts, copies: Math.min(50, opts.copies + 1) })}
              >
                <Plus size={14} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>عدد النسخ لكل ملصق</Text>
          </View>

          <View style={[styles.entryModeRow, styles.toggleRowBorder]}>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, opts.entryMode === 'random' && styles.segmentBtnActive]}
                onPress={() => setOpts({ ...opts, entryMode: 'random' })}
              >
                <RefreshCw size={12} color={opts.entryMode === 'random' ? '#fff' : colors.slate[600]} />
                <Text style={[styles.segmentText, opts.entryMode === 'random' && styles.segmentTextActive]}>عشوائي / تلقائي</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, opts.entryMode === 'manual' && styles.segmentBtnActive]}
                onPress={() => setOpts({ ...opts, entryMode: 'manual' })}
              >
                <Text style={[styles.segmentText, opts.entryMode === 'manual' && styles.segmentTextActive]}>إدخال يدوي</Text>
              </TouchableOpacity>
            </View>
          </View>

          {opts.entryMode === 'manual' && (
            <TextInput
              style={styles.manualInput}
              placeholder="أدخل الباركود يدوياً (مثال: 6131234567890)"
              value={opts.manualBarcode}
              onChangeText={(t) => setOpts({ ...opts, manualBarcode: t })}
              keyboardType="default"
              textAlign="right"
            />
          )}
        </View>

        {/* Product Selection List */}
        <View style={styles.productsHeaderRow}>
          <View style={styles.prodHeaderActions}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={selectAll} activeOpacity={0.7}>
              <Text style={styles.quickActionText}>تحديد الكل</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn} onPress={clearAll} activeOpacity={0.7}>
              <Text style={styles.quickActionText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickActionBtn, styles.autoGenBtn]} onPress={generateForAllSelected} activeOpacity={0.7}>
              <Wand2 size={12} color="#fff" />
              <Text style={[styles.quickActionText, { color: '#fff' }]}>توليد تلقائي</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionHeader}>5. اختيار المنتجات ({selectedIds.size} محدد)</Text>
        </View>

        <View style={styles.searchBar}>
          <Search size={16} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="بحث بالاسم، الباركود أو الفئة..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.slate[400]}
            textAlign="right"
          />
        </View>

        <View style={styles.productsListCard}>
          {filteredProducts.map((p) => {
            const isSelected = selectedIds.has(p.id);

            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.productRow, isSelected && styles.productRowSelected]}
                onPress={() => toggleSelect(p.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                  {isSelected && <Check size={14} color="#fff" />}
                </View>

                <View style={styles.productPriceCol}>
                  <Text style={styles.prodPrice}>{(p.retailPrice || 0).toLocaleString('ar-DZ')} دج</Text>
                  <Text style={styles.prodQty}>{(p as any).stock !== undefined ? `${(p as any).stock} في المخزن` : ''}</Text>
                </View>

                <View style={styles.productInfoCol}>
                  <Text style={styles.prodName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.prodBarcode}>{p.barcode || '— بدون باركود —'}</Text>
                </View>

                <Package size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* History Modal */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color={colors.slate[400]} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>سجل طباعة ملصقات الباركود</Text>
            </View>

            {history.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyHistoryText}>لا توجد ملصقات مطبوعة سابقاً</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {history.map((h, idx) => (
                  <View key={idx} style={styles.historyRow}>
                    <View style={styles.historyCopiesBadge}>
                      <Text style={styles.historyCopiesText}>{h.copies || 1} نسخة</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 8 }}>
                      <Text style={styles.historyProdName}>{h.productName || 'منتج'}</Text>
                      <Text style={styles.historyBarcodeText}>{h.barcode} • {h.labelSize} • {h.barcodeType}</Text>
                      <Text style={styles.historyDate}>{new Date(h.createdAt).toLocaleString('ar-DZ')}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    headerBackBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleCol: { alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
    headerSubtitle: { fontSize: 11, color: colors.text.tertiary, fontFamily: 'Cairo' },
    headerActionBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.lg,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
    },

    scroll: { flex: 1 },
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xxxl },

    topActionsRow: { flexDirection: 'row', gap: spacing.xs + 2, marginBottom: spacing.md },
    historyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.xl,
    },
    historyBtnText: { fontSize: 12, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
    previewToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50],
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.xl,
    },
    previewToggleBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary[600], fontFamily: 'Cairo' },
    printMainBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.emerald[600],
      paddingVertical: 8,
      borderRadius: radii.xl,
      ...shadows.xs,
    },
    printMainBtnText: { fontSize: 13, fontWeight: '800', color: '#fff', fontFamily: 'Cairo' },

    previewCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginBottom: spacing.md,
      ...shadows.xs,
    },
    stickersPreviewRow: { alignItems: 'center', paddingVertical: spacing.xs },
    emptyPreview: { padding: spacing.lg, alignItems: 'center', gap: 6 },
    emptyPreviewText: { fontSize: 12, color: colors.text.tertiary, fontFamily: 'Cairo' },

    stickerStitch: {
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: '#0f172a',
      padding: 10,
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    stickerShopName: { fontSize: 9.5, fontWeight: '700', color: '#475569', fontFamily: 'Cairo', textAlign: 'center' },
    stickerProdName: { fontSize: 11.5, fontWeight: '800', color: '#0f172a', fontFamily: 'Cairo', textAlign: 'center', marginVertical: 2 },
    stickerSku: { fontSize: 9, color: '#64748b', fontFamily: 'monospace' },
    stickerBarcodeContainer: { marginVertical: 4, alignItems: 'center' },
    stickerPrice: { fontSize: 13, fontWeight: '900', color: '#0f172a', fontFamily: 'Cairo' },
    stickerPriceEnlarged: { fontSize: 17, color: '#2563eb' },

    sectionHeader: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.text.secondary,
      textAlign: 'right',
      marginBottom: spacing.xs,
      marginRight: 4,
      fontFamily: 'Cairo',
    },
    optionsCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginBottom: spacing.md,
      ...shadows.xs,
    },

    sizesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    sizeOptionBtn: {
      width: '31%',
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    sizeOptionBtnActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    sizeOptionText: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
    sizeOptionTextActive: { color: '#fff' },

    formatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    formatOptionBtn: {
      width: '31%',
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    formatOptionBtnActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    formatOptionText: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
    formatOptionTextActive: { color: '#fff' },

    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
    toggleRowBorder: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
    toggleText: { fontSize: 13, fontWeight: '600', color: colors.text.primary, fontFamily: 'Cairo' },

    copiesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.sm },
    copiesControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    copyBtn: {
      width: 30,
      height: 30,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
    copiesCount: { fontSize: 14, fontWeight: '800', color: colors.text.primary, minWidth: 20, textAlign: 'center', fontFamily: 'Cairo' },
    inputLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },

    entryModeRow: { paddingTop: spacing.sm },
    segmentedRow: { flexDirection: 'row', gap: 6 },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      borderRadius: radii.md,
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    segmentBtnActive: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    segmentText: { fontSize: 11.5, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
    segmentTextActive: { color: '#fff' },
    manualInput: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[50],
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 13,
      color: colors.text.primary,
      fontFamily: 'Cairo',
      marginTop: spacing.sm,
    },

    productsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, marginBottom: spacing.xs },
    prodHeaderActions: { flexDirection: 'row', gap: 4 },
    quickActionBtn: {
      backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.sm,
    },
    quickActionText: { fontSize: 10.5, fontWeight: '700', color: colors.text.secondary, fontFamily: 'Cairo' },
    autoGenBtn: { backgroundColor: colors.primary[600], flexDirection: 'row', alignItems: 'center', gap: 2 },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      marginBottom: spacing.sm,
    },
    searchInput: { flex: 1, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm, fontSize: 13, color: colors.text.primary, fontFamily: 'Cairo' },

    productsListCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xs, borderWidth: 1, borderColor: colors.border.default, ...shadows.xs },
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
    productRowSelected: { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : colors.primary[50], borderRadius: radii.lg },
    checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    checkBoxSelected: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
    productPriceCol: { alignItems: 'flex-start', minWidth: 75 },
    prodPrice: { fontSize: 13, fontWeight: '800', color: colors.primary[600], fontFamily: 'Cairo' },
    prodQty: { fontSize: 9.5, color: colors.text.tertiary, fontFamily: 'Cairo' },
    productInfoCol: { flex: 1, alignItems: 'flex-end', marginHorizontal: spacing.sm },
    prodName: { fontSize: 13, fontWeight: '700', color: colors.text.primary, fontFamily: 'Cairo' },
    prodBarcode: { fontSize: 10.5, color: colors.text.tertiary, fontFamily: 'monospace' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: spacing.lg },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle, marginBottom: spacing.md },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text.primary, fontFamily: 'Cairo' },
    emptyHistoryText: { fontSize: 13, color: colors.text.tertiary, fontFamily: 'Cairo' },
    historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
    historyCopiesBadge: { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.emerald[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm },
    historyCopiesText: { fontSize: 11, fontWeight: '700', color: isDark ? '#34d399' : colors.emerald[700], fontFamily: 'Cairo' },
    historyProdName: { fontSize: 13, fontWeight: '700', color: colors.text.primary, fontFamily: 'Cairo' },
    historyBarcodeText: { fontSize: 11, color: colors.text.secondary, fontFamily: 'monospace' },
    historyDate: { fontSize: 10, color: colors.text.tertiary, fontFamily: 'Cairo' },
  });

export default BarcodeLabelsScreen;
