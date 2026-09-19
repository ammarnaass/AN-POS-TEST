import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  ArrowRight,
  Plus,
  Search,
  Layers,
  Sparkles,
  PackagePlus,
  Box,
  Star,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useFavoritesData } from './hooks/useFavoritesData';
import { useFavoritesStore } from './store/useFavoritesStore';
import { FavoritesStatsBar } from './components/FavoritesStatsBar';
import { FavoriteCategorySelector } from './components/FavoriteCategorySelector';
import { FavoritePackCard } from './components/FavoritePackCard';
import { CategoryFormModal } from './modals/CategoryFormModal';
import { AddFavoriteItemsModal } from './modals/AddFavoriteItemsModal';
import { FavoritePackFormModal } from './modals/FavoritePackFormModal';
import type { FavoriteCategory, FavoriteItem } from './types';
import type { Pack, Product } from '@shared/types';

export const FavoritesScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();

  // بيانات المفضلة والمخزن
  const {
    packs,
    products,
    productsMap,
    categories,
    items,
    loading,
    refreshing,
    onRefresh,
    getPackStock,
    stats,
  } = useFavoritesData();

  const {
    addCategory,
    updateCategory,
    deleteCategory,
    addItemToCategory,
    removeItemFromCategory,
  } = useFavoritesStore();

  // تصفية العرض
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // حالات النوافذ المنبثقة
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FavoriteCategory | null>(null);

  const [addItemsModalVisible, setAddItemsModalVisible] = useState(false);

  const [packModalVisible, setPackModalVisible] = useState(false);
  const [packModalMode, setPackModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<FavoriteItem | null>(null);
  const [initialProductForPack, setInitialProductForPack] = useState<Product | null>(null);

  // التصنيف النشط حالياً
  const activeCategory = useMemo(() => {
    if (selectedCatId === 'ALL') return undefined;
    return categories.find((c) => c.id === selectedCatId);
  }, [categories, selectedCatId]);

  // فلترة عناصر المفضلة المعروضة
  const displayedItems = useMemo(() => {
    let result = items;
    if (selectedCatId !== 'ALL') {
      result = result.filter((it) => it.categoryId === selectedCatId);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (it) =>
          (it.name && it.name.toLowerCase().includes(q)) ||
          (it.barcode && it.barcode.includes(q))
      );
    }
    return result;
  }, [items, selectedCatId, search]);

  // التحقق مما إذا كانت العبوة مضافة مسبقاً في التصنيف
  const isPackAdded = useCallback(
    (packId: string) => {
      if (selectedCatId === 'ALL') {
        return items.some((it) => it.itemId === packId);
      }
      return items.some((it) => it.categoryId === selectedCatId && it.itemId === packId);
    },
    [items, selectedCatId]
  );

  // فتح نافذة تصنيف جديد
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCategoryModalVisible(true);
  };

  // فتح نافذة تعديل تصنيف
  const handleOpenEditCategory = (cat: FavoriteCategory) => {
    setEditingCategory(cat);
    setCategoryModalVisible(true);
  };

  // حفظ تصنيف
  const handleSaveCategory = (data: { name: string; icon?: string; color?: string }) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, data);
    } else {
      const created = addCategory(data);
      setSelectedCatId(created.id);
    }
  };

  // حذف تصنيف مع تأكيد
  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف تصنيف "${cat?.name || ''}" مع كافة عبواته في المفضلة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            deleteCategory(catId);
            if (selectedCatId === catId) {
              setSelectedCatId('ALL');
            }
          },
        },
      ]
    );
  };

  // فتح نافذة إنشاء عبوة سريعة
  const handleOpenCreatePack = () => {
    setPackModalMode('create');
    setEditingItem(null);
    setInitialProductForPack(null);
    setPackModalVisible(true);
  };

  // فتح نافذة تعديل عبوة سريعة
  const handleOpenEditPack = (item: FavoriteItem) => {
    setPackModalMode('edit');
    setEditingItem(item);
    setInitialProductForPack(null);
    setPackModalVisible(true);
  };

  // تحويل منتج من نافذة إضافة العناصر إلى عبوة سريعة
  const handleConvertProductToPack = (product: Product) => {
    setPackModalMode('create');
    setEditingItem(null);
    setInitialProductForPack(product);
    setPackModalVisible(true);
  };

  // إضافة عبوة موجودة مباشرة إلى المفضلة
  const handleAddExistingPack = (pack: Pack) => {
    const targetCat = selectedCatId === 'ALL' ? categories[0]?.id : selectedCatId;
    if (!targetCat) {
      Alert.alert('تنبيه', 'يرجى إنشاء تصنيف مفضلة أولاً');
      return;
    }

    const pieces =
      (pack as any).piecesCount ||
      (pack as any).pieces_count ||
      (Array.isArray(pack.items) ? pack.items[0]?.qty : 1) ||
      1;
    const parentId = Array.isArray(pack.items) && pack.items.length > 0 ? pack.items[0]?.productId : undefined;

    addItemToCategory({
      categoryId: targetCat,
      type: 'pack',
      itemId: pack.id,
      name: pack.name,
      barcode: pack.barcode,
      price: Number(pack.packPrice || (pack as any).pack_price || 0),
      packQty: pieces,
      packUnit: (pack as any).unitName || (pack as any).unit_name || 'طرد',
      parentProductId: parentId,
    });
  };

  // حذف عبوة من المفضلة
  const handleRemoveItem = (itemId: string) => {
    Alert.alert('تأكيد الإزالة', 'هل تريد إزالة هذه العبوة من المفضلة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'إزالة',
        style: 'destructive',
        onPress: () => removeItemFromCategory(itemId),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Header Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: isDark ? colors.border.default : '#e2e8f0',
          },
        ]}
      >
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowRight size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
              إدارة المفضلة والعبوات
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
              تخصيص الكراتين السريعة للبيع الفوري
            </Text>
          </View>
        </View>

        {/* أزرار الإجراءات السريعة في الرأس */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary[500] }]}
            onPress={handleOpenCreatePack}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.primaryActionBtnText}>عبوة سريعة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryActionBtn,
              {
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderColor: isDark ? colors.border.default : '#cbd5e1',
              },
            ]}
            onPress={() => setAddItemsModalVisible(true)}
            activeOpacity={0.8}
          >
            <PackagePlus size={16} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. شريط البحث السريع */}
      <View style={styles.searchBarWrapper}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: isDark ? colors.border.default : '#e2e8f0',
            },
          ]}
        >
          <Search size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="بحث في عبوات المفضلة بالاسم أو الباركود..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
      </View>

      {/* 3. شريط الإحصائيات الفخمة */}
      <FavoritesStatsBar
        categoriesCount={stats.categoriesCount}
        favoritePacksCount={stats.favoritePacksCount}
        productsCount={stats.productsCount}
        allPacksCount={stats.allPacksCount}
      />

      {/* 4. شريط تصنيفات المفضلة */}
      <FavoriteCategorySelector
        categories={categories}
        items={items}
        selectedCatId={selectedCatId}
        onSelectCategory={setSelectedCatId}
        onOpenNewCategory={handleOpenNewCategory}
        onOpenEditCategory={handleOpenEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* 5. قائمة بطاقات العبوات */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            جاري تحميل المفضلة...
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                ]}
              >
                <Star size={36} color="#f59e0b" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                {selectedCatId === 'ALL'
                  ? 'لا توجد عبوات في المفضلة حالياً'
                  : `لا توجد عبوات في تصنيف "${activeCategory?.name || ''}"`}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                أنشئ كراتين وباقات سريعة لمنتجاتك الأكثر مبيعاً لتظهر فورياً للكاشير.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary[500] }]}
                onPress={handleOpenCreatePack}
              >
                <Plus size={16} color="#ffffff" />
                <Text style={styles.emptyBtnText}>إنشاء أول عبوة سريعة</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const parent = productsMap.get(item.parentProductId || '');
            const stock = getPackStock(item.parentProductId, item.packQty);

            return (
              <FavoritePackCard
                item={item}
                categories={categories}
                parentProduct={parent}
                availableStock={stock}
                onEdit={handleOpenEditPack}
                onRemove={handleRemoveItem}
              />
            );
          }}
        />
      )}

      {/* Modal 1: نموذج التصنيف */}
      <CategoryFormModal
        visible={categoryModalVisible}
        editingCategory={editingCategory}
        onClose={() => setCategoryModalVisible(false)}
        onSave={handleSaveCategory}
      />

      {/* Modal 2: إضافة عبوات مسجلة أو تحويل منتج */}
      <AddFavoriteItemsModal
        visible={addItemsModalVisible}
        activeCategory={activeCategory}
        packs={packs}
        products={products}
        onClose={() => setAddItemsModalVisible(false)}
        onAddExistingPack={handleAddExistingPack}
        isPackAdded={isPackAdded}
        onSelectProductForQuickPack={handleConvertProductToPack}
      />

      {/* Modal 3: النموذج الموحد الشامل للعبوة السريعة (إضافة وتعديل) */}
      <FavoritePackFormModal
        visible={packModalVisible}
        mode={packModalMode}
        editingItem={editingItem}
        initialProduct={initialProductForPack}
        targetCategoryId={selectedCatId}
        categories={categories}
        products={products}
        packs={packs}
        onClose={() => setPackModalVisible(false)}
        onSuccess={(catId) => {
          setSelectedCatId(catId);
          onRefresh();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitles: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default FavoritesScreen;
