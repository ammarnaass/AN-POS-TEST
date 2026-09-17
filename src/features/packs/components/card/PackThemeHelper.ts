// src/features/packs/components/card/PackThemeHelper.ts
// مساعد سمات وألوان وأيقونات الباقات التجارية (AN POS)

import { Gift, Box, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { PackType } from '../../types';

export interface PackThemeConfig {
  badge: string;
  badgeClass: string;
  cardBorder: string;
  icon: LucideIcon;
  gradient: string;
}

export function getPackThemeConfig(packType?: PackType): PackThemeConfig {
  if (packType === 'bundle') {
    return {
      badge: '🎁 باقة وحزمة مجمعة',
      badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
      cardBorder: 'hover:border-purple-500/40',
      icon: Gift,
      gradient: 'from-purple-500/10 to-transparent',
    };
  }
  if (packType === 'half_wholesale') {
    return {
      badge: '🛍️ نصف جملة',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      cardBorder: 'hover:border-amber-500/40',
      icon: ShoppingBag,
      gradient: 'from-amber-500/10 to-transparent',
    };
  }
  return {
    badge: '📦 طرد كرتونة جملة',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    cardBorder: 'hover:border-blue-500/40',
    icon: Box,
    gradient: 'from-blue-500/10 to-transparent',
  };
}
