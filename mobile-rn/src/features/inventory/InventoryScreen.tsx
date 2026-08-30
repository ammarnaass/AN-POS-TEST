import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  Package,
  Plus,
  X,
  Barcode,
  Edit3,
  ChevronLeft,
  Warehouse,
  ClipboardCheck,
  History,
  Tag,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Product, Category, Warehouse as WarehouseType } from '@shared/types';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows, typography } from '@/theme/tokens';
import { Badge, Button, EmptyState, Skeleton } from '@/components/ui';

export const InventoryScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const loadData = useCallback(async () => {
    try {
      await ensureInit();
      const [allProducts, allCategories, allWarehouses] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray().catch(() => []),
        db.warehouses.toArray().catch(() => []),
      ]);

      const mappedProducts: Product[] = allProducts.map((p: any) => {
        const retailPrice = Number(p.retailPrice ?? p.retail_price ?? p.price ?? p.selling_price ?? p.sale_price ?? p.sale_price1 ?? 0);
        const costPrice = Number(p.costPrice ?? p.cost_price ?? p.purchasePrice ?? p.purchase_price ?? p.average_price ?? 0);
        const wholesalePrice = Number(p.wholesalePrice ?? p.wholesale_price ?? p.sale_price2 ?? 0);
        const wholesaleMinQty = Number(p.wholesaleMinQty ?? p.wholesale_min_qty ?? 0);
        const quantity = Number(p.quantity ?? p.qty ?? p.stock ?? 0);
        const lowStockThreshold = Number(p.lowStockThreshold ?? p.low_stock_threshold ?? 5);
        const name = p.name || p.productName || p.product_name || 'بدون اسم';

        return {
          ...p,
          id: p.id || p._id || p.productId || p.product_id,
          name,
          productName: name,
          product_name: name,
          retailPrice,
          retail_price: retailPrice,
          price: retailPrice,
          costPrice,
          cost_price: costPrice,
          purchasePrice: costPrice,
          purchase_price: costPrice,
          wholesalePrice,
          wholesale_price: wholesalePrice,
          wholesaleMinQty,
          wholesale_min_qty: wholesaleMinQty,
          quantity,
          qty: quantity,
          stock: quantity,
          unit: p.unit || 'قطعة',
          barcode: p.barcode ? String(p.barcode) : '',
          category: typeof p.category === 'object' && p.category !== null ? (p.category.name || p.category.id || '') : (p.category || ''),
          categoryId: p.categoryId || p.category_id || (typeof p.category === 'object' && p.category !== null ? p.category.id : '') || '',
          warehouseId: p.warehouseId || p.warehouse_id || '',
          status: p.status || 'active',
          image: p.image || p.imageUrl || p.image_url || '',
          lowStockThreshold,
          low_stock_threshold: lowStockThreshold,
        };
      });

      let finalCategories = allCategories;
      if (finalCategories.length === 0) {
        const uniqueCatNames = Array.from(
          new Set(mappedProducts.map((p) => p.category).filter(Boolean))
        );
        finalCategories = uniqueCatNames.map((name, idx) => ({
          id: `cat_${idx}_${name}`,
          name,
          color: '#3b82f6',
          icon: 'Tag',
        }));
      }

      setProducts(mappedProducts);
      setCategories(finalCategories);
      setWarehouses(allWarehouses);
    } catch (err) {
      console.warn('[Inventory] Load error:', err);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      // 1. Search Query
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      // 2. Category Filter
      const matchesCategory =
        !selectedCategory ||
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        p.categoryId === selectedCategory;

      // 3. Stock Status Filter
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = (p.quantity || 0) <= (p.lowStockThreshold || 5) && (p.quantity || 0) > 0;
      } else if (stockFilter === 'out') {
        matchesStock = (p.quantity || 0) <= 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, selectedCategory, stockFilter]);

  const lowStockCount = useMemo(
    () => products.filter((p) => (p.quantity || 0) <= (p.lowStockThreshold || 5) && (p.quantity || 0) > 0).length,
    [products]
  );

  const outOfStockCount = useMemo(
    () => products.filter((p) => (p.quantity || 0) <= 0).length,
    [products]
  );

  const warehouseMap = useMemo(() => {
    const map = new Map<string, string>();
    warehouses.forEach((w) => map.set(w.id, w.name));
    return map;
  }, [warehouses]);

  const dynamicStyles = makeStyles(colors, isDark);

  if (loading && !refreshing) {
    return (
      <View style={[dynamicStyles.container, { backgroundColor: colors.background }]}>
        <View style={dynamicStyles.content}>
          <View style={dynamicStyles.header}>
            <Skeleton width={120} height={28} />
            <Skeleton width={90} height={36} borderRadius={radii.md} />
          </View>
          <Skeleton height={44} borderRadius={radii.xl} />
          <View style={dynamicStyles.statsBar}>
            <Skeleton height={60} borderRadius={radii.md} style={{ flex: 1 }} />
            <Skeleton height={60} borderRadius={radii.md} style={{ flex: 1 }} />
            <Skeleton height={60} borderRadius={radii.md} style={{ flex: 1 }} />
          </View>
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={80} borderRadius={radii.xl} />
            <Skeleton height={80} borderRadius={radii.xl} />
            <Skeleton height={80} borderRadius={radii.xl} />
          </View>
        </View>
      </View>
    );
  }

  const renderProductItem = ({ item: prod }: { item: Product }) => {
    const isOut = (prod.quantity || 0) <= 0;
    const isLow = !isOut && (prod.quantity || 0) <= (prod.lowStockThreshold || 5);
    const profit = Math.max(0, (prod.retailPrice || 0) - (prod.costPrice || 0));
    const marginPercent =
      prod.retailPrice && prod.retailPrice > 0 ? ((profit / prod.retailPrice) * 100).toFixed(0) : '0';

    return (
      <TouchableOpacity
        style={dynamicStyles.productCard}
        onPress={() => navigation.navigate('ProductForm', { id: prod.id })}
        activeOpacity={0.7}
      >
        {/* Product Image / Icon */}
        <View style={dynamicStyles.imageBox}>
          {prod.image ? (
            <Image source={{ uri: prod.image }} style={dynamicStyles.productImg} />
          ) : (
            <Package size={22} color={colors.primary[500]} />
          )}
        </View>

        {/* Info Column */}
        <View style={dynamicStyles.productInfo}>
          <View style={dynamicStyles.productNameRow}>
            <Text style={dynamicStyles.productName} numberOfLines={1}>
              {prod.name}
            </Text>
            {prod.category ? (
              <Badge variant="neutral" size="sm">
                {typeof prod.category === 'object' && prod.category !== null ? (prod.category as any).name : prod.category}
              </Badge>
            ) : null}
          </View>

          <View style={dynamicStyles.metaRow}>
            {prod.barcode ? (
              <View style={dynamicStyles.barcodeBadge}>
                <Barcode size={12} color={colors.text.tertiary} />
                <Text style={dynamicStyles.metaText}>{prod.barcode}</Text>
              </View>
            ) : null}

            {prod.warehouseId && warehouseMap.has(prod.warehouseId) ? (
              <View style={dynamicStyles.warehouseBadge}>
                <Warehouse size={11} color={colors.primary[500]} />
                <Text style={dynamicStyles.metaText}>{warehouseMap.get(prod.warehouseId)}</Text>
              </View>
            ) : null}
          </View>

          <View style={dynamicStyles.priceStockRow}>
            {/* Price & Margin */}
            <View style={dynamicStyles.priceBox}>
              <Text style={dynamicStyles.retailPrice}>
                {prod.retailPrice.toLocaleString('ar-DZ')} دج
              </Text>
              {profit > 0 ? (
                <Text style={dynamicStyles.profitPill}>+{marginPercent}% ربح</Text>
              ) : null}
            </View>

            {/* Stock Quantity */}
            <View
              style={[
                dynamicStyles.stockPill,
                isOut
                  ? dynamicStyles.stockPillOut
                  : isLow
                  ? dynamicStyles.stockPillLow
                  : dynamicStyles.stockPillNormal,
              ]}
            >
              <Text
                style={[
                  dynamicStyles.stockText,
                  isOut
                    ? dynamicStyles.stockTextOut
                    : isLow
                    ? dynamicStyles.stockTextLow
                    : dynamicStyles.stockTextNormal,
                ]}
              >
                {prod.quantity} {prod.unit || 'قطعة'}
              </Text>
            </View>
          </View>
        </View>

        <ChevronLeft size={18} color={colors.text.tertiary} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[dynamicStyles.container, { backgroundColor: colors.background }]}>
      {/* ── Top Header ── */}
      <View style={dynamicStyles.header}>
        <Button
          title="إضافة منتج"
          icon={<Plus size={16} color="#ffffff" />}
          onPress={() => navigation.navigate('ProductForm')}
          size="sm"
          variant="primary"
        />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={dynamicStyles.title}>إدارة المخزون</Text>
          <Text style={dynamicStyles.subtitle}>{products.length} منتج مسجل في النظام</Text>
        </View>
      </View>

      {/* ── Quick Stock Metrics Bar ── */}
      <View style={dynamicStyles.statsBar}>
        <TouchableOpacity
          style={[
            dynamicStyles.statBox,
            stockFilter === 'all' && dynamicStyles.statBoxActive,
          ]}
          onPress={() => setStockFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.statLabel}>إجمالي الأصناف</Text>
          <Text style={[dynamicStyles.statValue, { color: colors.primary[600] }]}>
            {products.length}
          </Text>
        </TouchableOpacity>

        <View style={dynamicStyles.statDivider} />

        <TouchableOpacity
          style={[
            dynamicStyles.statBox,
            stockFilter === 'low' && dynamicStyles.statBoxActive,
          ]}
          onPress={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.statLabel}>نواقص المخزون</Text>
          <Text style={[dynamicStyles.statValue, { color: colors.warning.main }]}>
            {lowStockCount}
          </Text>
        </TouchableOpacity>

        <View style={dynamicStyles.statDivider} />

        <TouchableOpacity
          style={[
            dynamicStyles.statBox,
            stockFilter === 'out' && dynamicStyles.statBoxActive,
          ]}
          onPress={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.statLabel}>نفد من المخزن</Text>
          <Text style={[dynamicStyles.statValue, { color: colors.danger.main }]}>
            {outOfStockCount}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Module Shortcuts Strip ── */}
      <View style={{ height: 44, marginVertical: spacing.xs }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={dynamicStyles.shortcutsStrip}
        >
          <TouchableOpacity
            style={dynamicStyles.shortcutPill}
            onPress={() => navigation.navigate('Warehouses')}
            activeOpacity={0.7}
          >
            <Warehouse size={14} color={colors.primary[600]} />
            <Text style={dynamicStyles.shortcutText}>المستودعات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.shortcutPill}
            onPress={() => navigation.navigate('InventoryCount')}
            activeOpacity={0.7}
          >
            <ClipboardCheck size={14} color={colors.success.main} />
            <Text style={dynamicStyles.shortcutText}>الجرد الفعلي</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.shortcutPill}
            onPress={() => navigation.navigate('StockMovements')}
            activeOpacity={0.7}
          >
            <History size={14} color={colors.warning.main} />
            <Text style={dynamicStyles.shortcutText}>حركات المخزن</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.shortcutPill}
            onPress={() => navigation.navigate('Categories')}
            activeOpacity={0.7}
          >
            <Tag size={14} color={colors.indigo[500]} />
            <Text style={dynamicStyles.shortcutText}>الفئات والتصنيفات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.shortcutPill}
            onPress={() => navigation.navigate('BarcodeLabels')}
            activeOpacity={0.7}
          >
            <Barcode size={14} color={colors.text.secondary} />
            <Text style={dynamicStyles.shortcutText}>ملصقات باركود</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Search Input ── */}
      <View style={dynamicStyles.searchContainer}>
        <Search size={18} color={colors.text.tertiary} style={dynamicStyles.searchIcon} />
        <TextInput
          style={dynamicStyles.searchInput}
          placeholder="ابحث بالاسم أو الباركود أو الصنف..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.text.tertiary}
          textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={dynamicStyles.clearBtn}>
            <X size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Categories Bar ── */}
      <View style={dynamicStyles.categoryBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={dynamicStyles.categoryBar}
        >
          <TouchableOpacity
            style={[
              dynamicStyles.categoryChip,
              selectedCategory === 'all' && dynamicStyles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                dynamicStyles.categoryText,
                selectedCategory === 'all' && dynamicStyles.categoryTextActive,
              ]}
            >
              الكل ({products.length})
            </Text>
          </TouchableOpacity>

          {categories.map((c) => {
            const isSelected = selectedCategory === c.id || selectedCategory === c.name;
            const count = products.filter(
              (p) => p.category === c.name || p.categoryId === c.id
            ).length;

            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  dynamicStyles.categoryChip,
                  isSelected && dynamicStyles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(isSelected ? 'all' : c.id || c.name)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    dynamicStyles.categoryText,
                    isSelected && dynamicStyles.categoryTextActive,
                  ]}
                >
                  {c.name} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── High-Performance Product FlatList ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderProductItem}
        contentContainerStyle={dynamicStyles.flatListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={42} color={colors.text.tertiary} />}
            title="لا توجد منتجات مطابقة"
            description={
              search
                ? `لم نجد أي منتج يطابق "${search}"`
                : 'ابدأ بإضافة منتجاتك لإدارتها ومتابعة مخزونها'
            }
            actionTitle={search ? 'مسح البحث' : 'إضافة أول منتج'}
            onAction={search ? () => setSearch('') : () => navigation.navigate('ProductForm')}
          />
        }
      />
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    subtitle: {
      fontSize: 12,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
      marginTop: 2,
    },

    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingVertical: spacing.sm,
      ...shadows.xs,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
      borderRadius: radii.lg,
    },
    statBoxActive: {
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
    },
    statLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabic,
      marginBottom: 2,
    },
    statValue: {
      fontSize: 17,
      fontWeight: '800',
      fontFamily: typography.fontFamily.arabicBold,
    },
    statDivider: {
      width: 1,
      height: '60%',
      backgroundColor: colors.border.default,
    },

    shortcutsStrip: {
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
      alignItems: 'center',
    },
    shortcutPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border.default,
      ...shadows.xs,
    },
    shortcutText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabic,
    },

    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: spacing.md,
      height: 44,
      ...shadows.xs,
    },
    searchIcon: {
      marginLeft: spacing.xs,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      fontFamily: typography.fontFamily.arabic,
      fontSize: 13,
    },
    clearBtn: {
      padding: 4,
    },

    categoryBarWrapper: {
      height: 38,
      marginVertical: spacing.xs,
    },
    categoryBar: {
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
      alignItems: 'center',
    },
    categoryChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    categoryChipActive: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[600],
    },
    categoryText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.text.secondary,
      fontFamily: typography.fontFamily.arabic,
    },
    categoryTextActive: {
      color: '#ffffff',
    },

    flatListContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing['2xl'],
      gap: spacing.sm,
    },
    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border.default,
      gap: spacing.md,
      ...shadows.xs,
    },
    imageBox: {
      width: 48,
      height: 48,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    productImg: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    productInfo: {
      flex: 1,
      gap: 3,
    },
    productNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    productName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
      textAlign: 'right',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    barcodeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    warehouseBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      fontSize: 10.5,
      color: colors.text.tertiary,
      fontFamily: typography.fontFamily.arabic,
    },

    priceStockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    priceBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    retailPrice: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text.primary,
      fontFamily: typography.fontFamily.arabicBold,
    },
    profitPill: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.success.text,
      backgroundColor: isDark ? colors.success.light : '#f0fdf4',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radii.sm,
      fontFamily: typography.fontFamily.arabicBold,
    },

    stockPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    stockPillNormal: {
      backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
    },
    stockPillLow: {
      backgroundColor: isDark ? colors.warning.light : '#fef3c7',
    },
    stockPillOut: {
      backgroundColor: isDark ? colors.danger.light : '#fee2e2',
    },
    stockText: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: typography.fontFamily.arabicBold,
    },
    stockTextNormal: {
      color: colors.text.secondary,
    },
    stockTextLow: {
      color: colors.warning.main,
    },
    stockTextOut: {
      color: colors.danger.main,
    },
  });

export default InventoryScreen;
