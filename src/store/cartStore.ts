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
  packQty?: number;
  packPiecesCount?: number;
  packUnit?: string;
  packMode?: 'retail_pieces' | 'wholesale_packs';
  pricingType?: 'retail' | 'wholesale' | 'pack';
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
    const targetId = String(item.productId);
    const existing = get().items.find(i => {
      const sameId = String(i.productId) === targetId;
      if (!sameId) return false;
      // إذا كان كلاهما بنفس السعر (أو لم يكن هناك سعر مخصص مختلف)، يتم الدمج
      if (item.isCustom || i.isCustom) {
        return Math.abs(i.unitPrice - item.unitPrice) < 0.001;
      }
      return true;
    });

    if (existing) {
      const newQty = existing.qty + item.qty;
      const effectiveUnitPrice = existing.unitPrice;
      const newLineTotal = newQty * effectiveUnitPrice;
      set(state => ({
        items: state.items.map(i =>
          String(i.productId) === targetId
            ? { ...i, qty: newQty, lineTotal: newLineTotal }
            : i
        ),
      }));
    } else {
      set(state => ({
        items: [...state.items, { ...item, productId: targetId }],
      }));
    }
  },

  updateQty: (productId: string, qty: number, unitPrice?: number) => {
    const targetId = String(productId);
    set(state => ({
      items: state.items.map(i =>
        String(i.productId) === targetId ? {
          ...i,
          qty,
          lineTotal: (unitPrice ?? i.unitPrice) * qty,
          unitPrice: unitPrice ?? i.unitPrice,
          isCustom: unitPrice !== undefined ? true : i.isCustom,
        } : i
      ),
    }));
  },

  updatePrice: (productId: string, unitPrice: number) => {
    const targetId = String(productId);
    set(state => ({
      items: state.items.map(i =>
        String(i.productId) === targetId ? {
          ...i,
          unitPrice,
          lineTotal: unitPrice * i.qty,
          isCustom: true,
        } : i
      ),
    }));
  },

  removeItem: (productId: string) => {
    const targetId = String(productId);
    set(state => ({ items: state.items.filter(i => String(i.productId) !== targetId) }));
  },

  clear: () => set({ items: [] }),
}));
