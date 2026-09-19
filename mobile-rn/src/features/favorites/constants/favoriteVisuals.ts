import React from 'react';
import {
  Star,
  Box,
  Coffee,
  Zap,
  Layers,
  Sparkles,
  ShoppingBag,
  Flame,
  Tag,
  Heart,
  Package,
} from 'lucide-react-native';

export const FAVORITE_COLORS = [
  '#2563eb', // أزرق ملكي
  '#059669', // أخضر زمردي
  '#d97706', // كهرماني
  '#dc2626', // أحمر قرمزي
  '#7c3aed', // بنفسجي
  '#db2777', // وردي ياقوتي
  '#0891b2', // سيان سماوي
  '#4f46e5', // نيلي
  '#10b981', // أخضر ساطع
  '#f97316', // برتقالي حيوي
];

export const PRESET_PIECE_COUNTS = [3, 4, 6, 12, 24, 30, 48];

export const PRESET_UNIT_NAMES = [
  'كرتونة',
  'طرد',
  'باقة',
  'شدة',
  'صندوق',
  'علبة',
  'كيس',
  'ربطة',
];

export const PACK_TYPE_LABELS = {
  bundle: 'باقة مجمعة',
  wholesale: 'جملة تجارية',
  half_wholesale: 'نصف جملة',
} as const;

export const FAVORITE_ICONS_MAP: Record<string, any> = {
  Star,
  Box,
  Coffee,
  Zap,
  Layers,
  Sparkles,
  ShoppingBag,
  Flame,
  Tag,
  Heart,
  Package,
};

export const AVAILABLE_ICON_NAMES = Object.keys(FAVORITE_ICONS_MAP);
