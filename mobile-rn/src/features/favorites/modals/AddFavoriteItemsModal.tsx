import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { X, Search, Package, Plus, Check, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '@/theme';
import type { Pack, Product } from '@shared/types';
import type { FavoriteCategory } from '../types';

interface AddFavoriteItemsModalProps {
  visible: boolean;
  activeCategory?: FavoriteCategory;
  packs: Pack[];
  products: Product[];
  onClose: () => void;
  onAddExistingPack: (pack: Pack) => void;
  isPackAdded: (packId: string) => boolean;
  onSelectProductForQuickPack: (product: Product) => void;
}

export const AddFavoriteItemsModal: React.FC<AddFavoriteItemsModalProps> = ({
  visible,
  activeCategory,
  packs,
  products,
  onClose,
  onAddExistingPack,
  isPackAdded,
  onSelectProductForQuickPack,
}) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'packs' | 'products'>('packs');
  const [search, setSearch] = useState('');

  // فلترة العبوات
  const filteredPacks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q))
    );
  }, [packs, search]);

  // فلترة منتجات التجزئة
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products
      .filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.includes(q))
      )
      .slice(0, 50);
  }, [products, search]);

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
            <View style={styles.headerInfo}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                إضافة عبوات إلى المفضلة
              </Text>
              {activeCategory && (
                <Text style={[styles.subTitle, { color: colors.primary[500] }]}>
                  التصنيف المستهدف: {activeCategory.name}
                </Text>
              )}
            </View>
          </View>

          {/* تبويبات الاختيار */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'packs'
                  ? [styles.activeTabBtn, { borderBottomColor: colors.primary[500] }]
                  : null,
              ]}
              onPress={() => setActiveTab('packs')}
            >
              <Package
                size={16}
                color={activeTab === 'packs' ? colors.primary[500] : colors.text.tertiary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'packs' ? colors.primary[500] : colors.text.secondary,
                    fontWeight: activeTab === 'packs' ? '800' : '600',
                  },
                ]}
              >
                عبوات مسجلة ({packs.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'products'
                  ? [styles.activeTabBtn, { borderBottomColor: colors.primary[500] }]
                  : null,
              ]}
              onPress={() => setActiveTab('products')}
            >
              <ShoppingBag
                size={16}
                color={activeTab === 'products' ? colors.primary[500] : colors.text.tertiary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'products' ? colors.primary[500] : colors.text.secondary,
                    fontWeight: activeTab === 'products' ? '800' : '600',
                  },
                ]}
              >
                تحويل سلعة من المخزن ({products.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* حقل البحث */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  borderColor: isDark ? colors.border.default : '#e2e8f0',
                },
              ]}
            >
              <Search size={18} color={colors.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text.primary }]}
                placeholder={
                  activeTab === 'packs' ? 'بحث في العبوات...' : 'بحث في سلع المخزن...'
                }
                placeholderTextColor={colors.text.tertiary}
                value={search}
                onChangeText={setSearch}
                textAlign="right"
              />
            </View>
          </View>

          {/* محتوى القائمة */}
          {activeTab === 'packs' ? (
            <FlatList
              data={filteredPacks}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                    لا توجد عبوات مسجلة مطابقة للبحث
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const added = isPackAdded(item.id);
                const price = Number(item.packPrice || (item as any).pack_price || 0);
                const pieces =
                  item.piecesCount ||
                  (Array.isArray(item.items) ? item.items[0]?.qty : 1) ||
                  1;
                const unit = item.unitName || (item as any).unit_name || 'عبوة';

                return (
                  <View
                    style={[
                      styles.itemRow,
                      {
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        borderColor: isDark ? colors.border.default : '#e2e8f0',
                      },
                    ]}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.text.primary }]}>
                        {item.name}
                      </Text>
                      <View style={styles.itemMeta}>
                        <Text style={[styles.metaBadge, { color: colors.primary[500] }]}>
                          {unit} ({pieces} قطع)
                        </Text>
                        <Text style={[styles.itemPrice, { color: colors.text.secondary }]}>
                          {price.toLocaleString()} د.ج
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.addBtn,
                        added
                          ? { backgroundColor: '#10b981' }
                          : { backgroundColor: colors.primary[500] },
                      ]}
                      onPress={() => !added && onAddExistingPack(item)}
                      disabled={added}
                      activeOpacity={0.7}
                    >
                      {added ? (
                        <>
                          <Check size={14} color="#ffffff" />
                          <Text style={styles.btnText}>مضافة</Text>
                        </>
                      ) : (
                        <>
                          <Plus size={14} color="#ffffff" />
                          <Text style={styles.btnText}>إضافة</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                    لا توجد منتجات مطابقة في المخزن
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const retail = Number(item.retailPrice ?? (item as any).retail_price ?? 0);
                const stock = Number(item.quantity ?? (item as any).qty ?? 0);

                return (
                  <TouchableOpacity
                    style={[
                      styles.itemRow,
                      {
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        borderColor: isDark ? colors.border.default : '#e2e8f0',
                      },
                    ]}
                    onPress={() => {
                      onClose();
                      onSelectProductForQuickPack(item);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.text.primary }]}>
                        {item.name}
                      </Text>
                      <View style={styles.itemMeta}>
                        <Text style={[styles.itemPrice, { color: colors.primary[500] }]}>
                          سعر التجزئة: {retail.toLocaleString()} د.ج
                        </Text>
                        <Text style={[styles.stockText, { color: colors.text.secondary }]}>
                          المتوفر: {stock}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.quickPackBtn, { backgroundColor: colors.primary[50] }]}>
                      <Plus size={14} color={colors.primary[600]} />
                      <Text style={[styles.quickPackBtnText, { color: colors.primary[600] }]}>
                        إنشاء كرتونة
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '82%',
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
  headerInfo: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
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
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  itemMeta: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'center',
  },
  metaBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockText: {
    fontSize: 11,
  },
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  quickPackBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  quickPackBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
