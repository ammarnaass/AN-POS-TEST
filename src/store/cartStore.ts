import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  isCustom?: boolean;
  isPack?: boolean;
  packId?: string;
  batchNumber?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, qty: number, unitPrice?: number) => void;
  updatePrice: (productId: string, unitPrice: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item: CartItem) => {
    const existing = get().items.find(i => i.productId === item.productId && !i.isCustom);
    if (existing) {
      const newQty = existing.qty + item.qty;
      const newLineTotal = newQty * existing.unitPrice;
      set(state => ({
        items: state.items.map(i =>
          i.productId === item.productId
            ? { ...i, qty: newQty, lineTotal: newLineTotal }
            : i
        ),
      }));
    } else {
      set(state => ({ items: [...state.items, item] }));
    }
  },

  updateQty: (productId: string, qty: number, unitPrice?: number) => {
    set(state => ({
      items: state.items.map(i =>
        i.productId === productId ? { ...i, qty, lineTotal: (unitPrice ?? i.unitPrice) * qty, unitPrice: unitPrice ?? i.unitPrice } : i
      ),
    }));
  },

  updatePrice: (productId: string, unitPrice: number) => {
    set(state => ({
      items: state.items.map(i =>
        i.productId === productId ? { ...i, unitPrice, lineTotal: unitPrice * i.qty } : i
      ),
    }));
  },

  removeItem: (productId: string) => {
    set(state => ({ items: state.items.filter(i => i.productId !== productId) }));
  },

  clear: () => set({ items: [] }),
}));
