import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Package,
  Barcode,
  Edit2,
  Trash2,
  Tag,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Folder,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import type { FavoriteItem, FavoriteCategory } from '../types';
import type { Product } from '@shared/types';

interface FavoritePackCardProps {
  item: FavoriteItem;
  categories: FavoriteCategory[];
  parentProduct?: Product;
  availableStock: number;
  onEdit: (item: FavoriteItem) => void;
  onRemove: (itemId: string) => void;
  onAddToCart?: (item: FavoriteItem) => void;
}

export const FavoritePackCard: React.FC<FavoritePackCardProps> = ({
  item,
  categories,
  parentProduct,
  availableStock,
  onEdit,
  onRemove,
  onAddToCart,
}) => {
  const { colors, isDark } = useTheme();

  const category = categories.find((c) => c.id === item.categoryId);
  const pieces = item.packQty || 1;
  const unit = item.packUnit || 'عبوة';

  // حساب أسعار التجزئة والتوفير
  const unitRetailPrice = Number(
    parentProduct?.retailPrice ?? (parentProduct as any)?.retail_price ?? 0
  );
  const totalRetailPrice = unitRetailPrice * pieces;
  const packPrice = Number(item.price || 0);
  const buyerSavings = totalRetailPrice > packPrice ? totalRetailPrice - packPrice : 0;
  const hasSavings = buyerSavings > 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.border.default : '#e2e8f0',
        },
      ]}
    >
      {/* الرأس: شارة الوحدة وعدد القطع + اسم التصنيف التابع له */}
      <View style={styles.cardHeader}>
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.unitBadge,
              {
                backgroundColor: isDark ? 'rgba(37, 99, 235, 0.18)' : '#eff6ff',
                borderColor: isDark ? '#1d4ed8' : '#bfdbfe',
              },
            ]}
          >
            <Package size={13} color={colors.primary[500]} />
            <Text style={[styles.unitBadgeText, { color: colors.primary[500] }]}>
              {unit} ({pieces} {pieces >= 3 && pieces <= 10 ? 'قطع' : 'قطعة'})
            </Text>
          </View>

          {hasSavings && (
            <View
              style={[
                styles.savingsBadge,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
                  borderColor: isDark ? '#059669' : '#a7f3d0',
                },
              ]}
            >
              <TrendingDown size={12} color="#059669" />
              <Text style={styles.savingsText}>
                وفر {buyerSavings.toLocaleString()} د.ج
              </Text>
            </View>
          )}
        </View>

        {category && (
          <View style={styles.categoryTag}>
            <View
              style={[styles.categoryDot, { backgroundColor: category.color || '#2563eb' }]}
            />
            <Text style={[styles.categoryName, { color: colors.text.secondary }]}>
              {category.name}
            </Text>
          </View>
        )}
      </View>

      {/* اسم العبوة والباركود */}
      <View style={styles.body}>
        <Text style={[styles.packName, { color: colors.text.primary }]}>
          {item.name}
        </Text>

        <View style={styles.metaRow}>
          {item.barcode ? (
            <View style={styles.barcodeBox}>
              <Barcode size={13} color={colors.text.tertiary} />
              <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                {item.barcode}
              </Text>
            </View>
          ) : null}

          {/* رصيد المستودع المتاح بالكراتين */}
          <View style={styles.stockBox}>
            {availableStock > 0 ? (
              <>
                <CheckCircle size={13} color="#10b981" />
                <Text style={[styles.metaText, { color: '#10b981', fontWeight: '700' }]}>
                  متوفر: {availableStock} {unit}
                </Text>
              </>
            ) : (
              <>
                <AlertCircle size={13} color="#ef4444" />
                <Text style={[styles.metaText, { color: '#ef4444', fontWeight: '700' }]}>
                  نفد المخزون
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* شريط الأسعار السفلي وأزرار الإجراءات */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: isDark ? colors.border.default : '#f1f5f9',
          },
        ]}
      >
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, { color: colors.text.tertiary }]}>
            سعر العبوة:
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceValue, { color: colors.primary[500] }]}>
              {packPrice.toLocaleString()}
            </Text>
            <Text style={[styles.currencyText, { color: colors.primary[500] }]}>
              د.ج
            </Text>
          </View>
          {unitRetailPrice > 0 && (
            <Text style={[styles.retailSubText, { color: colors.text.secondary }]}>
              تجزئة: {unitRetailPrice.toLocaleString()} د.ج / ق
            </Text>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' },
            ]}
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
          >
            <Edit2 size={15} color={colors.primary[500]} />
            <Text style={[styles.actionBtnText, { color: colors.primary[500] }]}>
              تعديل
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: isDark ? 'rgba(220, 38, 38, 0.12)' : '#fef2f2',
                borderColor: isDark ? '#7f1d1d' : '#fecaca',
              },
            ]}
            onPress={() => onRemove(item.id)}
            activeOpacity={0.7}
          >
            <Trash2 size={15} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1.5,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  unitBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  savingsBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  categoryTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  packName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'right',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  barcodeBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  stockBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 2,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  retailSubText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
