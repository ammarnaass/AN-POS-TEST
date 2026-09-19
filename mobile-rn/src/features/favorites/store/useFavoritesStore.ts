import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '@shared/utils';
import type { FavoriteCategory, FavoriteItem } from '../types';

const FAVORITES_STORAGE_KEY = 'anpos_favorites_storage_v1';

interface FavoritesState {
  categories: FavoriteCategory[];
  items: FavoriteItem[];
  initialized: boolean;

  // Lifecycle
  initStore: () => Promise<void>;

  // Category actions
  addCategory: (data: { name: string; icon?: string; color?: string }) => FavoriteCategory;
  updateCategory: (id: string, updates: Partial<FavoriteCategory>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (categories: FavoriteCategory[]) => void;

  // Item actions
  addItemToCategory: (item: Omit<FavoriteItem, 'id' | 'order'>) => FavoriteItem;
  updateItem: (id: string, updates: Partial<FavoriteItem>) => void;
  removeItemFromCategory: (id: string) => void;
  clearCategoryItems: (categoryId: string) => void;
}

const DEFAULT_CATEGORIES: FavoriteCategory[] = [
  { id: 'fav-cat-drinks', name: 'عبوات المشروبات والماء', icon: 'Coffee', color: '#0891b2', order: 0 },
  { id: 'fav-cat-wholesale', name: 'كراتين وباقات شائعة', icon: 'Box', color: '#059669', order: 1 },
  { id: 'fav-cat-quick', name: 'سريعة الطلب', icon: 'Zap', color: '#d97706', order: 2 },
];

async function persistFavorites(categories: FavoriteCategory[], items: FavoriteItem[]) {
  try {
    const payload = JSON.stringify({ categories, items });
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, payload);
  } catch (err) {
    console.warn('Failed to persist favorites store:', err);
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  items: [],
  initialized: false,

  initStore: async () => {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.categories)) {
          set({
            categories: parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
            items: Array.isArray(parsed.items) ? parsed.items : [],
            initialized: true,
          });
          return;
        }
      }
      // First run - persist defaults
      await persistFavorites(DEFAULT_CATEGORIES, []);
      set({ categories: DEFAULT_CATEGORIES, items: [], initialized: true });
    } catch (err) {
      console.warn('Failed to load favorites store:', err);
      set({ categories: DEFAULT_CATEGORIES, items: [], initialized: true });
    }
  },

  addCategory: (data) => {
    const categories = get().categories;
    const newCat: FavoriteCategory = {
      id: `fav-cat-${generateId()}`,
      name: data.name.trim(),
      icon: data.icon || 'Star',
      color: data.color || '#2563eb',
      order: categories.length,
    };
    const nextCategories = [...categories, newCat];
    set({ categories: nextCategories });
    persistFavorites(nextCategories, get().items);
    return newCat;
  },

  updateCategory: (id, updates) => {
    const nextCategories = get().categories.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    set({ categories: nextCategories });
    persistFavorites(nextCategories, get().items);
  },

  deleteCategory: (id) => {
    const nextCategories = get().categories.filter((c) => c.id !== id);
    const nextItems = get().items.filter((it) => it.categoryId !== id);
    set({ categories: nextCategories, items: nextItems });
    persistFavorites(nextCategories, nextItems);
  },

  reorderCategories: (categories) => {
    set({ categories });
    persistFavorites(categories, get().items);
  },

  addItemToCategory: (itemData) => {
    const items = get().items;
    const existing = items.find(
      (it) => it.categoryId === itemData.categoryId && it.itemId === itemData.itemId
    );

    if (existing) {
      const updated: FavoriteItem = { ...existing, ...itemData, type: 'pack' };
      const nextItems = items.map((it) => (it.id === existing.id ? updated : it));
      set({ items: nextItems });
      persistFavorites(get().categories, nextItems);
      return updated;
    }

    const newItem: FavoriteItem = {
      ...itemData,
      id: `fav-item-${generateId()}`,
      type: 'pack',
      order: items.filter((it) => it.categoryId === itemData.categoryId).length,
    };

    const nextItems = [...items, newItem];
    set({ items: nextItems });
    persistFavorites(get().categories, nextItems);
    return newItem;
  },

  updateItem: (id, updates) => {
    const nextItems = get().items.map((it) => (it.id === id ? { ...it, ...updates } : it));
    set({ items: nextItems });
    persistFavorites(get().categories, nextItems);
  },

  removeItemFromCategory: (id) => {
    const nextItems = get().items.filter((it) => it.id !== id);
    set({ items: nextItems });
    persistFavorites(get().categories, nextItems);
  },

  clearCategoryItems: (categoryId) => {
    const nextItems = get().items.filter((it) => it.categoryId !== categoryId);
    set({ items: nextItems });
    persistFavorites(get().categories, nextItems);
  },
}));
