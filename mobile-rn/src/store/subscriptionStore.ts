import { create } from 'zustand';
import {
  getSubscriptionStatus,
  incrementSaleUsage,
  claimRewardAdBonus,
  upgradeSubscription,
  isFeatureUnlocked as checkFeatureUnlocked,
  unlockFeatureWithAd,
  unlockAllFeaturesWithAd,
  activateAdFree as activateAdFreeService,
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
  isFeatureUnlocked: (featureKey: string) => Promise<boolean>;
  unlockFeature: (featureKey: string, hours?: number) => Promise<{ success: boolean; expiresAt: string }>;
  unlockAllFeatures: (hours?: number) => Promise<{ success: boolean; expiresAt: string }>;
  activateAdFree: (code: string) => Promise<{ success: boolean; error?: string }>;
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
          isAdFree: false,
          baseQuota: 300,
          bonusSales: 0,
          usedSales: 0,
          totalQuota: 300,
          remainingSales: 300,
          adsWatched: 0,
          unlockedFeatures: {},
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
      const updatedStatus = await getSubscriptionStatus();
      set({ status: updatedStatus, loading: false });
      return res;
    } catch (err) {
      console.warn('[subscriptionStore] claimAdReward error:', err);
      set({ loading: false });
      return { success: false, bonusAdded: 0, newRemaining: 0 };
    }
  },

  isFeatureUnlocked: async (featureKey: string) => {
    return checkFeatureUnlocked(featureKey);
  },

  unlockFeature: async (featureKey: string, hours?: number) => {
    set({ loading: true });
    try {
      const res = await unlockFeatureWithAd(featureKey, hours);
      const updatedStatus = await getSubscriptionStatus();
      set({ status: updatedStatus, loading: false });
      return res;
    } catch (err) {
      console.warn('[subscriptionStore] unlockFeature error:', err);
      set({ loading: false });
      return { success: false, expiresAt: '' };
    }
  },

  unlockAllFeatures: async (hours?: number) => {
    set({ loading: true });
    try {
      const res = await unlockAllFeaturesWithAd(hours);
      const updatedStatus = await getSubscriptionStatus();
      set({ status: updatedStatus, loading: false });
      return res;
    } catch (err) {
      console.warn('[subscriptionStore] unlockAllFeatures error:', err);
      set({ loading: false });
      return { success: false, expiresAt: '' };
    }
  },

  activateAdFree: async (code: string) => {
    set({ loading: true });
    try {
      const res = await activateAdFreeService(code);
      if (res.success) {
        const updatedStatus = await getSubscriptionStatus();
        set({ status: updatedStatus, loading: false });
      } else {
        set({ loading: false });
      }
      return res;
    } catch (err) {
      console.warn('[subscriptionStore] activateAdFree error:', err);
      set({ loading: false });
      return { success: false, error: 'حدث خطأ غير متوقع' };
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
