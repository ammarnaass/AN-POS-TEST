import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react-native';
import { useTheme } from '@/theme';
import type { FavoriteCategory, FavoriteItem } from '../types';
import { FAVORITE_ICONS_MAP } from '../constants/favoriteVisuals';

interface FavoriteCategorySelectorProps {
  categories: FavoriteCategory[];
  items: FavoriteItem[];
  selectedCatId: string; // 'ALL' or category id
  onSelectCategory: (id: string) => void;
  onOpenNewCategory: () => void;
  onOpenEditCategory: (cat: FavoriteCategory) => void;
  onDeleteCategory: (catId: string) => void;
}

export const FavoriteCategorySelector: React.FC<FavoriteCategorySelectorProps> = ({
  categories,
  items,
  selectedCatId,
  onSelectCategory,
  onOpenNewCategory,
  onOpenEditCategory,
  onDeleteCategory,
}) => {
  const { colors, isDark } = useTheme();

  const selectedCategory = categories.find((c) => c.id === selectedCatId);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* زر إضافة تصنيف جديد */}
        <TouchableOpacity
          style={[
            styles.actionChip,
            {
              backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
              borderColor: colors.primary[500],
            },
          ]}
          onPress={onOpenNewCategory}
          activeOpacity={0.7}
        >
          <Plus size={16} color={colors.primary[500]} />
          <Text style={[styles.actionChipText, { color: colors.primary[500] }]}>
            تصنيف جديد
          </Text>
        </TouchableOpacity>

        {/* خيار الكل */}
        <TouchableOpacity
          style={[
            styles.chip,
            selectedCatId === 'ALL'
              ? [styles.activeChip, { backgroundColor: colors.primary[500], borderColor: colors.primary[500] }]
              : { backgroundColor: colors.surface, borderColor: isDark ? colors.border.default : '#e2e8f0' },
          ]}
          onPress={() => onSelectCategory('ALL')}
          activeOpacity={0.7}
        >
          <Layers
            size={16}
            color={selectedCatId === 'ALL' ? '#ffffff' : colors.text.secondary}
          />
          <Text
            style={[
              styles.chipText,
              { color: selectedCatId === 'ALL' ? '#ffffff' : colors.text.primary },
            ]}
          >
            جميع العبوات
          </Text>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor:
                  selectedCatId === 'ALL'
                    ? 'rgba(255,255,255,0.25)'
                    : isDark
                    ? colors.background
                    : '#f1f5f9',
              },
            ]}
          >
            <Text
              style={[
                styles.countText,
                { color: selectedCatId === 'ALL' ? '#ffffff' : colors.text.secondary },
              ]}
            >
              {items.length}
            </Text>
          </View>
        </TouchableOpacity>

        {/* تصنيفات المفضلة */}
        {categories.map((cat) => {
          const isSelected = selectedCatId === cat.id;
          const IconComp = (cat.icon && FAVORITE_ICONS_MAP[cat.icon]) || Layers;
          const catItemsCount = items.filter((it) => it.categoryId === cat.id).length;
          const catColor = cat.color || '#2563eb';

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                isSelected
                  ? [styles.activeChip, { backgroundColor: catColor, borderColor: catColor }]
                  : { backgroundColor: colors.surface, borderColor: isDark ? colors.border.default : '#e2e8f0' },
              ]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.7}
            >
              <IconComp
                size={16}
                color={isSelected ? '#ffffff' : catColor}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#ffffff' : colors.text.primary },
                ]}
              >
                {cat.name}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor:
                      isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : isDark
                        ? colors.background
                        : '#f1f5f9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: isSelected ? '#ffffff' : colors.text.secondary },
                  ]}
                >
                  {catItemsCount}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* شريط أدوات التصنيف المختار (تعديل / حذف) إذا لم يكن "الكل" */}
      {selectedCategory && (
        <View style={styles.selectedCatBar}>
          <View style={styles.catDetails}>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: selectedCategory.color || '#2563eb' },
              ]}
            />
            <Text style={[styles.selectedCatTitle, { color: colors.text.primary }]}>
              {selectedCategory.name}
            </Text>
          </View>

          <View style={styles.catActionButtons}>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
              onPress={() => onOpenEditCategory(selectedCategory)}
            >
              <Edit2 size={14} color={colors.primary[500]} />
              <Text style={[styles.smallBtnText, { color: colors.primary[500] }]}>
                تعديل
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2' }]}
              onPress={() => onDeleteCategory(selectedCategory.id)}
            >
              <Trash2 size={14} color="#dc2626" />
              <Text style={[styles.smallBtnText, { color: '#dc2626' }]}>
                حذف
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 6,
  },
  scrollContent: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  activeChip: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedCatBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  catDetails: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selectedCatTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  catActionButtons: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  smallBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
