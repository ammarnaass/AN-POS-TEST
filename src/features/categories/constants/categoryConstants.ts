// src/features/categories/constants/categoryConstants.ts
// ثوابت ولوحات ألوان وأيقونات عائلات المنتجات (AN POS)

import {
  FolderTree,
  ShoppingBag,
  Apple,
  Utensils,
  Droplets,
  Coffee,
  Cookie,
  Sparkles,
  Pill,
  Shirt,
  Box,
  Tag,
  Layers,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryWrite } from '@/services/api/categoriesApi';

export type CategoryFilterType = 'all' | 'with-products' | 'empty' | 'root' | 'sub';
export type CategoryViewMode = 'grid' | 'table';

export interface CategoryIconItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

// قائمة الـ 14 أيقونة المتاحة لتمثيل عائلات المنتجات
export const AVAILABLE_ICONS: CategoryIconItem[] = [
  { id: 'FolderTree', label: 'مجلد عام', icon: FolderTree },
  { id: 'ShoppingBag', label: 'تسوق وبقالة', icon: ShoppingBag },
  { id: 'Apple', label: 'أغذية وفواكه', icon: Apple },
  { id: 'Milk', label: 'ألبان وأجبان', icon: Utensils },
  { id: 'Droplets', label: 'زيوت وسوائل', icon: Droplets },
  { id: 'Coffee', label: 'مشروبات وبن', icon: Coffee },
  { id: 'Cookie', label: 'حلويات ومخبوزات', icon: Cookie },
  { id: 'Sparkles', label: 'منظفات وعناية', icon: Sparkles },
  { id: 'Pill', label: 'صيدلية وصحة', icon: Pill },
  { id: 'Shirt', label: 'ملابس وأقمشة', icon: Shirt },
  { id: 'Box', label: 'معلبات ومونة', icon: Box },
  { id: 'Tag', label: 'عروض وتخفيضات', icon: Tag },
  { id: 'Layers', label: 'متنوع ومختلف', icon: Layers },
  { id: 'Zap', label: 'أدوات وإلكترونيات', icon: Zap },
];

// لوحة الألوان المتناسقة المعتمدة للعائلات
export const COLOR_PALETTE = [
  { hex: '#10B981', name: 'زمردي' },
  { hex: '#3B82F6', name: 'أزرق كلاسيكي' },
  { hex: '#6366F1', name: 'نيلي' },
  { hex: '#8B5CF6', name: 'بنفسجي' },
  { hex: '#EC4899', name: 'وردي' },
  { hex: '#F59E0B', name: 'كهرماني' },
  { hex: '#EF4444', name: 'مرجاني' },
  { hex: '#06B6D4', name: 'سماوي' },
  { hex: '#14B8A6', name: 'فيروزي' },
  { hex: '#64748B', name: 'فضي دافئ' },
];

// العائلات الـ 14 المعيارية المقترحة لتصنيف السوبرماركت والتجزئة لسرعة الوصول في الكاشير
export const STANDARD_RETAIL_FAMILIES = [
  { name: 'مشروبات وعصائر', icon: 'Coffee', color: '#3B82F6' },
  { name: 'ألبان وأجبان', icon: 'Milk', color: '#06B6D4' },
  { name: 'معلبات ومونة', icon: 'Box', color: '#F59E0B' },
  { name: 'خضار وفواكه', icon: 'Apple', color: '#10B981' },
  { name: 'مخبوزات وحلويات', icon: 'Cookie', color: '#EC4899' },
  { name: 'زيوت ودهون', icon: 'Droplets', color: '#8B5CF6' },
  { name: 'منظفات ومنزليات', icon: 'Sparkles', color: '#14B8A6' },
  { name: 'عناية شخصية وصحة', icon: 'Pill', color: '#6366F1' },
  { name: 'بسكويت وشوكولاتة', icon: 'Cookie', color: '#F59E0B' },
  { name: 'حبوب وبقوليات', icon: 'Layers', color: '#64748B' },
  { name: 'لحوم ومجمدات', icon: 'Box', color: '#EF4444' },
  { name: 'تسالي ومقرمشات', icon: 'ShoppingBag', color: '#10B981' },
  { name: 'ملابس وأقمشة', icon: 'Shirt', color: '#6366F1' },
  { name: 'عروض وتخفيضات', icon: 'Tag', color: '#EF4444' },
];

export function getCategoryIcon(iconName?: string): LucideIcon {
  const item = AVAILABLE_ICONS.find((i) => i.id === iconName);
  return item ? item.icon : FolderTree;
}

export const emptyCategoryForm: CategoryWrite = {
  name: '',
  parentId: null,
  description: '',
  icon: 'ShoppingBag',
  color: '#3B82F6',
};
