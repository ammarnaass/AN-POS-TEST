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
  type: 'pack';
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
  updateItem: (id: string, updates: Partial<FavoriteItem>) => void;
  removeItemFromCategory: (id: string) => void;
  clearCategoryItems: (categoryId: string) => void;
  purgeProductItems: () => void;
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
              it.id === existing.id ? { ...it, ...itemData, type: 'pack' as const } : it
            ),
          });
          return;
        }

        const categoryItems = items.filter((it) => it.categoryId === itemData.categoryId);
        const newItem: FavoriteItem = {
          id: `fav-item-${generateId()}`,
          ...itemData,
          type: 'pack',
          order: categoryItems.length,
        };
        set({ items: [...items, newItem] });
      },

      updateItem: (id, updates) => {
        set({
          items: get().items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
        });
      },

      removeItemFromCategory: (id) => {
        set({ items: get().items.filter((it) => it.id !== id) });
      },

      clearCategoryItems: (categoryId) => {
        set({ items: get().items.filter((it) => it.categoryId !== categoryId) });
      },

      purgeProductItems: () => {
        set({ items: get().items.filter((it) => it.type === 'pack') });
      },
    }),
    {
      name: 'an_pos_favorites_v1',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.items)) {
          state.items = state.items.filter((it: any) => it.type === 'pack');
        }
      },
    }
  )
);
