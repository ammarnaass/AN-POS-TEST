import { create } from 'zustand';
import type { CartItem, PaymentMethod } from '@/types';

export interface SuspendedOrder {
  id: string;
  items: CartItem[];
  customerId?: string;
  discount: number;
  discountType: 'percent' | 'amount';
  createdAt: string;
}

interface POSSessionState {
  // Cart & items
  cart: CartItem[];
  selectedItemId: string | null;

  // Checkout & customer
  selectedCustomer: string;
  discount: number;
  discountType: 'percent' | 'amount';
  paymentMethod: PaymentMethod;
  paidAmount: number;

  // Operating modes
  returnMode: boolean;
  autoPrintReceipt: boolean;
  posLayout: 'sidebar' | 'bottom' | 'classic';
  showProductImages: boolean;
  uiZoom: number;

  // Suspended orders
  suspendedOrders: SuspendedOrder[];

  // Actions
  setCart: (items: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setSelectedItemId: (id: string | null) => void;
  setSelectedCustomer: (id: string) => void;
  setDiscount: (discount: number) => void;
  setDiscountType: (type: 'percent' | 'amount') => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaidAmount: (amount: number) => void;
  setReturnMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setAutoPrintReceipt: (val: boolean | ((prev: boolean) => boolean)) => void;
  setPosLayout: (layout: 'sidebar' | 'bottom' | 'classic') => void;
  setShowProductImages: (show: boolean) => void;
  setUiZoom: (zoom: number) => void;
  setSuspendedOrders: (orders: SuspendedOrder[] | ((prev: SuspendedOrder[]) => SuspendedOrder[])) => void;
  resetCheckout: () => void;
}

export const usePOSSessionStore = create<POSSessionState>((set) => ({
  cart: (() => {
    try {
      const saved = localStorage.getItem('pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  selectedItemId: null,
  selectedCustomer: '',
  discount: 0,
  discountType: 'percent',
  paymentMethod: 'cash',
  paidAmount: 0,
  returnMode: false,
  autoPrintReceipt: (() => {
    try {
      return localStorage.getItem('pos_auto_print') === 'true';
    } catch {
      return false;
    }
  })(),
  posLayout: (() => {
    try {
      return (localStorage.getItem('pos_layout_mode') as 'sidebar' | 'bottom' | 'classic') || 'bottom';
    } catch {
      return 'bottom';
    }
  })(),
  showProductImages: (() => {
    try {
      const saved = localStorage.getItem('pos_show_images');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  })(),
  uiZoom: (() => {
    try {
      const saved = localStorage.getItem('pos_ui_zoom');
      return saved ? Number(saved) : 100;
    } catch {
      return 100;
    }
  })(),
  suspendedOrders: (() => {
    try {
      const saved = localStorage.getItem('pos_suspended');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),

  setCart: (items) =>
    set((state) => {
      const nextCart = typeof items === 'function' ? items(state.cart) : items;
      try {
        localStorage.setItem('pos_cart', JSON.stringify(nextCart));
      } catch {
        // ignore
      }
      return { cart: nextCart };
    }),

  addItem: (item) =>
    set((state) => {
      const existing = state.cart.find((c) => c.productId === item.productId);
      let nextCart: CartItem[];
      if (existing) {
        nextCart = state.cart.map((c) =>
          c.productId === item.productId
            ? {
                ...c,
                qty: c.qty + (item.qty || 1),
                lineTotal: (c.qty + (item.qty || 1)) * c.unitPrice,
              }
            : c
        );
      } else {
        nextCart = [...state.cart, item];
      }
      try {
        localStorage.setItem('pos_cart', JSON.stringify(nextCart));
      } catch {
        // ignore
      }
      return { cart: nextCart, selectedItemId: item.productId };
    }),

  updateQty: (productId, qty) =>
    set((state) => {
      const nextCart = state.cart.map((c) =>
        c.productId === productId
          ? {
              ...c,
              qty,
              lineTotal: qty * c.unitPrice,
            }
          : c
      );
      try {
        localStorage.setItem('pos_cart', JSON.stringify(nextCart));
      } catch {
        // ignore
      }
      return { cart: nextCart };
    }),

  removeItem: (productId) =>
    set((state) => {
      const nextCart = state.cart.filter((c) => c.productId !== productId);
      try {
        localStorage.setItem('pos_cart', JSON.stringify(nextCart));
      } catch {
        // ignore
      }
      return {
        cart: nextCart,
        selectedItemId: state.selectedItemId === productId ? null : state.selectedItemId,
      };
    }),

  clearCart: () =>
    set(() => {
      try {
        localStorage.removeItem('pos_cart');
      } catch {
        // ignore
      }
      return { cart: [], selectedItemId: null, discount: 0, paidAmount: 0 };
    }),

  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setSelectedCustomer: (id) => set({ selectedCustomer: id }),
  setDiscount: (discount) => set({ discount }),
  setDiscountType: (discountType) => set({ discountType }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPaidAmount: (paidAmount) => set({ paidAmount }),

  setReturnMode: (val) =>
    set((state) => ({
      returnMode: typeof val === 'function' ? val(state.returnMode) : val,
    })),

  setAutoPrintReceipt: (val) =>
    set((state) => {
      const next = typeof val === 'function' ? val(state.autoPrintReceipt) : val;
      try {
        localStorage.setItem('pos_auto_print', String(next));
      } catch {
        // ignore
      }
      return { autoPrintReceipt: next };
    }),

  setPosLayout: (layout) =>
    set(() => {
      try {
        localStorage.setItem('pos_layout_mode', layout);
      } catch {
        // ignore
      }
      return { posLayout: layout };
    }),

  setShowProductImages: (show) =>
    set(() => {
      try {
        localStorage.setItem('pos_show_images', String(show));
      } catch {
        // ignore
      }
      return { showProductImages: show };
    }),

  setUiZoom: (zoom) =>
    set(() => {
      try {
        localStorage.setItem('pos_ui_zoom', String(zoom));
      } catch {
        // ignore
      }
      return { uiZoom: zoom };
    }),

  setSuspendedOrders: (orders) =>
    set((state) => {
      const nextOrders = typeof orders === 'function' ? orders(state.suspendedOrders) : orders;
      try {
        localStorage.setItem('pos_suspended', JSON.stringify(nextOrders));
      } catch {
        // ignore
      }
      return { suspendedOrders: nextOrders };
    }),

  resetCheckout: () =>
    set(() => {
      try {
        localStorage.removeItem('pos_cart');
      } catch {
        // ignore
      }
      return {
        cart: [],
        selectedItemId: null,
        selectedCustomer: '',
        discount: 0,
        paidAmount: 0,
        returnMode: false,
      };
    }),
}));
