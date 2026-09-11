import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/utils';

export interface FavoriteCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
}

export interface FavoriteItem {
  id: string;
  categoryId: string;
  type: 'pack' | 'product';
  itemId: string;
  name: string;
  barcode?: string;
  price: number;
  packQty?: number;
  packUnit?: string;
  parentProductId?: string;
  order: number;
}

interface FavoritesState {
  categories: FavoriteCategory[];
  items: FavoriteItem[];

  // Category actions
  addCategory: (data: { name: string; icon?: string; color?: string }) => FavoriteCategory;
  updateCategory: (id: string, updates: Partial<FavoriteCategory>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (categories: FavoriteCategory[]) => void;

  // Item actions
  addItemToCategory: (item: Omit<FavoriteItem, 'id' | 'order'>) => void;
  removeItemFromCategory: (id: string) => void;
  clearCategoryItems: (categoryId: string) => void;
}

const DEFAULT_CATEGORIES: FavoriteCategory[] = [
  { id: 'fav-cat-drinks', name: 'عبوات المشروبات والماء', icon: 'Coffee', color: '#0284c7', order: 0 },
  { id: 'fav-cat-wholesale', name: 'كراتين وباقات شائعة', icon: 'Box', color: '#059669', order: 1 },
  { id: 'fav-cat-quick', name: 'سريعة الطلب', icon: 'Zap', color: '#d97706', order: 2 },
];

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      items: [],

      addCategory: (data) => {
        const categories = get().categories;
        const newCat: FavoriteCategory = {
          id: `fav-cat-${generateId()}`,
          name: data.name.trim(),
          icon: data.icon || 'Star',
          color: data.color || '#2563eb',
          order: categories.length,
        };
        set({ categories: [...categories, newCat] });
        return newCat;
      },

      updateCategory: (id, updates) => {
        set({
          categories: get().categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        });
      },

      deleteCategory: (id) => {
        set({
          categories: get().categories.filter((c) => c.id !== id),
          items: get().items.filter((it) => it.categoryId !== id),
        });
      },

      reorderCategories: (categories) => {
        set({ categories });
      },

      addItemToCategory: (itemData) => {
        const items = get().items;
        // Avoid duplicate of same item in the same category
        const existing = items.find((it) => it.categoryId === itemData.categoryId && it.itemId === itemData.itemId);
        if (existing) {
          // Update price or details if already present
          set({
            items: items.map((it) =>
              it.id === existing.id ? { ...it, ...itemData } : it
            ),
          });
          return;
        }

        const categoryItems = items.filter((it) => it.categoryId === itemData.categoryId);
        const newItem: FavoriteItem = {
          id: `fav-item-${generateId()}`,
          ...itemData,
          order: categoryItems.length,
        };
        set({ items: [...items, newItem] });
      },

      removeItemFromCategory: (id) => {
        set({ items: get().items.filter((it) => it.id !== id) });
      },

      clearCategoryItems: (categoryId) => {
        set({ items: get().items.filter((it) => it.categoryId !== categoryId) });
      },
    }),
    {
      name: 'an_pos_favorites_v1',
    }
  )
);
