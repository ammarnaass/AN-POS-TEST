import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleCollapse: () => void;
  setCollapsed: (val: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  isCollapsed: (() => {
    try {
      return localStorage.getItem('anpos_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  })(),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleCollapse: () =>
    set((state) => {
      const next = !state.isCollapsed;
      try {
        localStorage.setItem('anpos_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return { isCollapsed: next };
    }),
  setCollapsed: (val: boolean) => {
    try {
      localStorage.setItem('anpos_sidebar_collapsed', String(val));
    } catch {
      // ignore
    }
    set({ isCollapsed: val });
  },
}));
