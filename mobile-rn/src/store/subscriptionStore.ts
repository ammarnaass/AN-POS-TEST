import { create } from 'zustand';
import {
  getSubscriptionStatus,
  incrementSaleUsage,
  claimRewardAdBonus,
  upgradeSubscription,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/lib/subscriptionService';

interface SubscriptionStoreState {
  status: SubscriptionStatus | null;
  loading: boolean;
  refreshStatus: () => Promise<SubscriptionStatus>;
  consumeSale: () => Promise<number>;
  claimAdReward: () => Promise<{ success: boolean; bonusAdded: number; newRemaining: number }>;
  upgrade: (tier: SubscriptionTier, licenseKey?: string) => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionStoreState>((set, get) => ({
  status: null,
  loading: false,

  refreshStatus: async () => {
    set({ loading: true });
    try {
      const status = await getSubscriptionStatus();
      set({ status, loading: false });
      return status;
    } catch (err) {
      console.warn('[subscriptionStore] refreshStatus error:', err);
      set({ loading: false });
      return (
        get().status || {
          tier: 'free',
          baseQuota: 300,
          bonusSales: 0,
          usedSales: 0,
          totalQuota: 300,
          remainingSales: 300,
          adsWatched: 0,
          isUnlimitedOrConnected: false,
        }
      );
    }
  },

  consumeSale: async () => {
    try {
      const newRemaining = await incrementSaleUsage();
      const current = get().status;
      if (current) {
        set({
          status: {
            ...current,
            usedSales: current.usedSales + 1,
            remainingSales: newRemaining,
          },
        });
      }
      return newRemaining;
    } catch (err) {
      console.warn('[subscriptionStore] consumeSale error:', err);
      return 0;
    }
  },

  claimAdReward: async () => {
    set({ loading: true });
    try {
      const res = await claimRewardAdBonus();
      const current = get().status;
      if (current) {
        set({
          status: {
            ...current,
            bonusSales: current.bonusSales + res.bonusAdded,
            totalQuota: res.newTotalQuota,
            remainingSales: res.newRemaining,
            adsWatched: current.adsWatched + 1,
          },
          loading: false,
        });
      }
      return res;
    } catch (err) {
      console.warn('[subscriptionStore] claimAdReward error:', err);
      set({ loading: false });
      return { success: false, bonusAdded: 0, newRemaining: 0 };
    }
  },

  upgrade: async (tier: SubscriptionTier, licenseKey?: string) => {
    set({ loading: true });
    try {
      const res = await upgradeSubscription(tier, licenseKey);
      if (res.success) {
        set({ status: res.status, loading: false });
        return true;
      }
      set({ loading: false });
      return false;
    } catch (err) {
      console.warn('[subscriptionStore] upgrade error:', err);
      set({ loading: false });
      return false;
    }
  },
}));
