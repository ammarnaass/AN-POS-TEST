import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Image,
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
  Layers,
} from 'lucide-react-native';
import { db, ensureInit } from '@/lib/db';
import type { Product, Category } from '@shared/types';
import { colors, useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Badge, Button, EmptyState, Skeleton } from '@/components/ui';

export const InventoryScreen = ({ navigation }: any) => {
  const { isDark, colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      await ensureInit();
      const [allProducts, allCategories] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray().catch(() => []),
      ]);
      const mappedProducts: Product[] = allProducts.map((p: any) => ({
        ...p,
        id: p.id || p._id,
        name: p.name || p.productName || 'بدون اسم',
        retailPrice: p.retailPrice || (p as any).retail_price || p.price || 0,
        wholesalePrice: p.wholesalePrice || (p as any).wholesale_price || 0,
        costPrice: p.costPrice || (p as any).cost_price || (p as any).purchase_price || 0,
        quantity: p.quantity || p.qty || 0,
        unit: p.unit || 'قطعة',
        barcode: p.barcode || '',
        category: p.category || '',
        status: p.status || 'active',
        image: p.image || p.imageUrl || (p as any).image_url || '',
        lowStockThreshold: p.lowStockThreshold || (p as any).low_stock_threshold || 5,
      }));
      setProducts(mappedProducts);
      setCategories(allCategories);
    } catch (err) {
      console.warn('Inventory load error:', err);
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

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'all' ||
      p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products.filter(
    (p) => (p.quantity || 0) <= (p.lowStockThreshold || 5) && (p.quantity || 0) > 0
  ).length;

  const outOfStockCount = products.filter((p) => (p.quantity || 0) <= 0).length;

  if (loading && !refreshing) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Skeleton width={120} height={28} />
          <Skeleton width={90} height={36} borderRadius={radii.md} />
        </View>
        <Skeleton height={42} borderRadius={radii.md} />
        <View style={styles.statsBar}>
          <Skeleton height={60} borderRadius={radii.md} style={{ flex: 1 }} />
          <Skeleton height={60} borderRadius={radii.md} style={{ flex: 1 }} />
          <Skeleton height={60} borderRadius={radii.md} style={{ flex: 1 }} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={74} borderRadius={radii.lg} />
          <Skeleton height={74} borderRadius={radii.lg} />
          <Skeleton height={74} borderRadius={radii.lg} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header & Quick Add */}
      <View style={styles.header}>
        <Button
          title="إضافة منتج"
          icon={<Plus size={16} color="#ffffff" />}
          onPress={() => navigation.navigate('ProductForm')}
          size="sm"
          variant="primary"
        />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.title, { color: colors.text.primary }]}>إدارة المخزون</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            {products.length} منتج مسجل في النظام
          </Text>
        </View>
      </View>

      {/* Quick Stock Metrics */}
      <View
        style={[
          styles.statsBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>إجمالي الأصناف</Text>
          <Text style={[styles.statValue, { color: colors.primary[600] }]}>
            {products.length}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border.default }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>نواقص المخزون</Text>
          <Text style={[styles.statValue, { color: colors.warning.main }]}>
            {lowStockCount}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border.default }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>نفد من المخزن</Text>
          <Text style={[styles.statValue, { color: colors.danger.main }]}>
            {outOfStockCount}
          </Text>
        </View>
      </View>

      {/* Module Shortcuts Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shortcutsStrip}
      >
        <TouchableOpacity
          style={[styles.shortcutPill, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Warehouses')}
          activeOpacity={0.7}
        >
          <Warehouse size={15} color={colors.primary[600]} />
          <Text style={[styles.shortcutText, { color: colors.text.primary }]}>المستودعات</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutPill, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('InventoryCount')}
          activeOpacity={0.7}
        >
          <ClipboardCheck size={15} color={colors.success.text} />
          <Text style={[styles.shortcutText, { color: colors.text.primary }]}>الجرد الفعلي</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutPill, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('StockMovements')}
          activeOpacity={0.7}
        >
          <History size={15} color={colors.warning.text} />
          <Text style={[styles.shortcutText, { color: colors.text.primary }]}>حركات المخزن</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutPill, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('Categories')}
          activeOpacity={0.7}
        >
          <Tag size={15} color={colors.primary[500]} />
          <Text style={[styles.shortcutText, { color: colors.text.primary }]}>الفئات</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutPill, { backgroundColor: colors.surface, borderColor: colors.border.default }]}
          onPress={() => navigation.navigate('BarcodeLabels')}
          activeOpacity={0.7}
        >
          <Barcode size={15} color={colors.text.secondary} />
          <Text style={[styles.shortcutText, { color: colors.text.primary }]}>ملصقات باركود</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Search Input */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <Search size={18} color={colors.slate[400]} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="ابحث بالاسم أو رمز الباركود..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.text.tertiary}
          textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <X size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Categories Horizontal Bar */}
      <View style={styles.categoryBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === 'all'
                    ? colors.primary[600]
                    : colors.surface,
                borderColor:
                  selectedCategory === 'all'
                    ? colors.primary[600]
                    : colors.border.default,
              },
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryText,
                {
                  color:
                    selectedCategory === 'all'
                      ? '#ffffff'
                      : colors.text.secondary,
                },
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
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary[600]
                      : colors.surface,
                    borderColor: isSelected
                      ? colors.primary[600]
                      : colors.border.default,
                  },
                ]}
                onPress={() =>
                  setSelectedCategory(isSelected ? 'all' : c.id || c.name)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected ? '#ffffff' : colors.text.secondary,
                    },
                  ]}
                >
                  {c.name} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView
        style={styles.productsScroll}
        contentContainerStyle={styles.productsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package size={32} color={colors.text.tertiary} />}
            title="لا توجد منتجات مطابقة"
            description="جرب البحث بكلمة أخرى أو أضف صنفاً جديداً في هذا القسم"
            actionTitle="إضافة منتج جديد"
            onAction={() => navigation.navigate('ProductForm')}
          />
        ) : (
          filtered.map((product) => {
            const isOutOfStock = (product.quantity || 0) <= 0;
            const isLowStock =
              !isOutOfStock &&
              (product.quantity || 0) <= (product.lowStockThreshold || 5);

            const hasImage = Boolean(product.image);
            const isUriImage =
              hasImage &&
              (product.image!.startsWith('http') ||
                product.image!.startsWith('file:') ||
                product.image!.startsWith('content:') ||
                product.image!.startsWith('data:'));

            return (
              <TouchableOpacity
                key={product.id}
                activeOpacity={0.75}
                style={[
                  styles.productCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border.default,
                  },
                ]}
                onPress={() =>
                  navigation.navigate('ProductForm', { id: product.id })
                }
              >
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[
                      styles.editIconBtn,
                      { backgroundColor: colors.surfaceSubtle },
                    ]}
                    onPress={() =>
                      navigation.navigate('ProductForm', { id: product.id })
                    }
                  >
                    <Edit3 size={15} color={colors.text.secondary} />
                  </TouchableOpacity>
                  <Text style={[styles.productPrice, { color: colors.text.primary }]}>
                    {(product.retailPrice || 0).toLocaleString('ar-DZ')}{' '}
                    <Text style={[styles.currency, { color: colors.primary[600] }]}>
                      دج
                    </Text>
                  </Text>
                </View>

                {/* Product Info with Thumbnail */}
                <View style={styles.productInfoRow}>
                  <View style={styles.productInfo}>
                    <Text
                      style={[styles.productName, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>

                    <View style={styles.productMetaRow}>
                      <Badge
                        variant={
                          isOutOfStock
                            ? 'danger'
                            : isLowStock
                            ? 'warning'
                            : 'success'
                        }
                        size="sm"
                      >
                        {isOutOfStock
                          ? 'نفد من المخزن'
                          : `${product.quantity || 0} ${product.unit || 'قطعة'}`}
                      </Badge>

                      {product.barcode ? (
                        <View style={styles.barcodeWrapper}>
                          <Barcode size={12} color={colors.text.tertiary} />
                          <Text
                            style={[
                              styles.barcodeText,
                              { color: colors.text.tertiary },
                            ]}
                          >
                            {product.barcode}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Thumbnail */}
                  <View
                    style={[
                      styles.thumbBox,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border.default,
                      },
                    ]}
                  >
                    {isUriImage ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                    ) : hasImage ? (
                      <Text style={styles.thumbEmoji}>{product.image}</Text>
                    ) : (
                      <Package size={20} color={colors.text.tertiary} />
                    )}
                  </View>
                </View>

                <ChevronLeft size={16} color={colors.text.tertiary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Cairo',
    textAlign: 'right',
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.xs,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Cairo',
    fontWeight: '600',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  statDivider: {
    width: 1,
    height: 28,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo',
    height: '100%',
  },
  clearBtn: {
    padding: spacing.xxs,
  },

  // Categories
  categoryBarWrapper: {
    marginTop: spacing.sm,
  },
  categoryBar: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Products List
  productsScroll: {
    flex: 1,
    marginTop: spacing.sm,
  },
  productsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.xs + 2,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    ...shadows.xs,
  },
  cardActions: {
    alignItems: 'flex-start',
    gap: 4,
  },
  editIconBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  currency: {
    fontSize: 11,
    fontWeight: '700',
  },

  productInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  productInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  productMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
  },
  barcodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  barcodeText: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
  },

  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbEmoji: {
    fontSize: 22,
  },

  // Shortcuts Strip
  shortcutsStrip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    alignItems: 'center',
  },
  shortcutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: 6,
    ...shadows.xs,
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
});

export default InventoryScreen;
