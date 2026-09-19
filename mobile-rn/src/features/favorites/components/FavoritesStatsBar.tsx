import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star, Layers, ShoppingBag, Box } from 'lucide-react-native';
import { useTheme } from '@/theme';

interface FavoritesStatsBarProps {
  categoriesCount: number;
  favoritePacksCount: number;
  productsCount: number;
  allPacksCount: number;
}

export const FavoritesStatsBar: React.FC<FavoritesStatsBarProps> = ({
  categoriesCount,
  favoritePacksCount,
  productsCount,
  allPacksCount,
}) => {
  const { colors, isDark } = useTheme();

  const stats = [
    {
      label: 'تصنيفات المفضلة',
      value: categoriesCount,
      icon: Star,
      color: '#f59e0b',
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
    },
    {
      label: 'عبوات المفضلة',
      value: favoritePacksCount,
      icon: Layers,
      color: '#3b82f6',
      bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe',
    },
    {
      label: 'سلع المخزن',
      value: productsCount,
      icon: ShoppingBag,
      color: '#10b981',
      bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
    },
    {
      label: 'إجمالي العبوات',
      value: allPacksCount,
      icon: Box,
      color: '#8b5cf6',
      bg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#ede9fe',
    },
  ];

  return (
    <View style={styles.container}>
      {stats.map((st, i) => {
        const IconComponent = st.icon;
        return (
          <View
            key={i}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? colors.border.default : '#e2e8f0',
              },
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: st.bg }]}>
              <IconComponent size={18} color={st.color} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.value, { color: colors.text.primary }]}>{st.value}</Text>
              <Text style={[styles.label, { color: colors.text.secondary }]} numberOfLines={1}>
                {st.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
