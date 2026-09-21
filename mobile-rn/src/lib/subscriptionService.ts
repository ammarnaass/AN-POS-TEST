/**
 * Ad Rewards & Feature Lock Service
 * Manages Free Ad-Supported Mode in Standalone Mode.
 * - Basic features open to all users.
 * - Advanced features unlocked for 24h by watching a rewarded ad.
 * - Sales Quota rechargeable by watching rewarded ads (+20 sales).
 * - "Remove Ads" via Developer contact (WhatsApp, Phone, Email, Activation code).
 */
import { db, ensureInit } from './db';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import { AnposSecureStore } from '@/modules/AnposSecureStore';
export { ADMOB_CONFIG, getAdUnitId } from './admobConfig';

export interface UnlockedFeatureInfo {
  key: string;
  name: string;
  isUnlocked: boolean;
  expiresAt?: string;
  hoursRemaining?: number;
}

export interface AdSystemStatus {
  isAdFree: boolean;
  baseQuota: number;
  bonusSales: number;
  usedSales: number;
  totalQuota: number;
  remainingSales: number;
  adsWatched: number;
  unlockedFeatures: Record<string, string>; // featureKey -> expiresAt (ISO)
  licenseKey?: string;
  isUnlimitedOrConnected: boolean;
}

export const BASE_FREE_QUOTA = 300;
export const AD_REWARD_BONUS = 20;
export const UNLOCK_DURATION_HOURS = 24;

export type SubscriptionStatus = AdSystemStatus;
export type SubscriptionTier = 'free' | 'lite' | 'pro';

export const TIER_QUOTAS: Record<SubscriptionTier, number> = {
  free: BASE_FREE_QUOTA,
  lite: 5000,
  pro: 1000000,
};

export const TIER_FEATURES: Record<SubscriptionTier, { name: string; maxSales: number; price: string; features: string[] }> = {
  free: {
    name: 'الوضع المجاني (بدعم الإعلانات)',
    maxSales: BASE_FREE_QUOTA,
    price: 'مجاني',
    features: ['مبيعات أساسية', 'إدارة المنتجات', 'ميزات متقدمة عبر الإعلانات'],
  },
  lite: {
    name: 'حساب لايت',
    maxSales: 5000,
    price: 'مدفوع',
    features: ['إزالة الإعلانات', 'سعة 5000 مبيعة'],
  },
  pro: {
    name: 'حساب برو غير محدود',
    maxSales: 1000000,
    price: 'مدفوع',
    features: ['إزالة جميع الإعلانات', 'جميع الميزات مفعلة دائماً'],
  },
};

export const SUPPORT_CONTACT = {
  phone: '0674784859',
  phoneDisplay: '0674 78 48 59',
  whatsapp: '213674784859',
  whatsappDisplay: '0674 78 48 59',
  email: 'andev20000@gmail.com',
  whatsappMessage: 'مرحباً، أود تفعيل النسخة الكاملة لتطبيق AN POS وحذف الإعلانات.',
};

export const LOCKED_FEATURES: Record<string, { name: string; desc: string }> = {
  profit_center: {
    name: 'مركز الربحية والتحليلات',
    desc: 'تحليل هامش الربح وصافي الأرباح التفصيلية للمتجر',
  },
  zakat_calculator: {
    name: 'حاسبة الزكاة الذكية',
    desc: 'حساب زكاة عروض التجارة والسيولة وفق نصاب الذهب والفضة',
  },
  multi_warehouse: {
    name: 'إدارة المستودعات المتعددة',
    desc: 'تتبع المخزون عبر مستودعات وفروع متعددة وتحويل البضائع',
  },
  backup_export: {
    name: 'تصدير النسخ الاحتياطي والبيانات',
    desc: 'تصدير وحفظ قواعد البيانات محلياً واستعادتها بأمان',
  },
  barcode_labels: {
    name: 'طباعة ملصقات الباركود',
    desc: 'تصميم وطباعة ملصقات الباركود المخصصة للمنتجات',
  },
  wholesale_packs: {
    name: 'عبوات الجملة والطرود (Colisage)',
    desc: 'إدارة كراتين الجملة والبيع بالعبوات وباقات الأصناف',
  },
};

const STORAGE_KEYS = {
  AD_FREE: 'anpos_is_ad_free',
  BONUS: 'anpos_sub_bonus',
  ADS_WATCHED: 'anpos_sub_ads_watched',
  UNLOCKED_FEATURES: 'anpos_unlocked_features',
  LICENSE: 'anpos_sub_license',
};

/**
 * Get current ad system and quota status
 */
export async function getSubscriptionStatus(): Promise<AdSystemStatus> {
  const isConnected = unifiedDB.getMode() === 'connected';
  if (isConnected) {
    return {
      isAdFree: true,
      baseQuota: 1000000,
      bonusSales: 0,
      usedSales: 0,
      totalQuota: 1000000,
      remainingSales: 1000000,
      adsWatched: 0,
      unlockedFeatures: {},
      isUnlimitedOrConnected: true,
    };
  }

  await ensureInit();

  let isAdFree = false;
  let bonusSales = 0;
  let adsWatched = 0;
  let licenseKey = '';
  let usedSales = 0;
  let unlockedFeatures: Record<string, string> = {};

  try {
    // 1. Check if user activated Ad-Free via license
    const adFreeFlag = await AnposSecureStore.get(STORAGE_KEYS.AD_FREE);
    if (adFreeFlag === 'true') {
      isAdFree = true;
    }

    const savedLicense = await AnposSecureStore.get(STORAGE_KEYS.LICENSE);
    if (savedLicense) licenseKey = savedLicense;

    // 2. Count actual sales in standalone DB
    usedSales = await db.sales.count().catch(() => 0);

    // 3. Load DB settings and SecureStore stats
    const savedBonus = await AnposSecureStore.get(STORAGE_KEYS.BONUS);
    if (savedBonus) bonusSales = parseInt(savedBonus, 10) || 0;
    const savedAds = await AnposSecureStore.get(STORAGE_KEYS.ADS_WATCHED);
    if (savedAds) adsWatched = parseInt(savedAds, 10) || 0;

    const settingsList = await db.settings.toArray().catch(() => []);
    const st = settingsList[0] as any;
    if (st) {
      if (st.subscription_bonus_sales) {
        bonusSales = Math.max(bonusSales, Number(st.subscription_bonus_sales));
      }
      if (st.subscription_ads_watched) {
        adsWatched = Math.max(adsWatched, Number(st.subscription_ads_watched));
      }
      if (st.subscription_license_key) {
        licenseKey = String(st.subscription_license_key);
        isAdFree = true;
      }
    }

    // 4. Load unlocked features map
    const rawUnlocked = await AnposSecureStore.get(STORAGE_KEYS.UNLOCKED_FEATURES);
    if (rawUnlocked) {
      try {
        unlockedFeatures = JSON.parse(rawUnlocked);
      } catch {
        unlockedFeatures = {};
      }
    }
  } catch (err) {
    console.warn('[adRewardsService] Error loading status:', err);
  }

  const baseQuota = isAdFree ? 1000000 : BASE_FREE_QUOTA;
  const totalQuota = baseQuota + bonusSales;
  const remainingSales = isAdFree ? 1000000 : Math.max(0, totalQuota - usedSales);

  return {
    isAdFree,
    baseQuota,
    bonusSales,
    usedSales,
    totalQuota,
    remainingSales,
    adsWatched,
    unlockedFeatures,
    licenseKey,
    isUnlimitedOrConnected: isAdFree,
  };
}

/**
 * Check if a specific module/feature is unlocked
 */
export async function isFeatureUnlocked(featureKey: string): Promise<boolean> {
  const isConnected = unifiedDB.getMode() === 'connected';
  if (isConnected) return true;

  const status = await getSubscriptionStatus();
  if (status.isAdFree) return true;

  // Check if feature was not in locked list (always free)
  if (!LOCKED_FEATURES[featureKey]) return true;

  // Check expiration timestamp
  const expiresAt = status.unlockedFeatures[featureKey];
  if (!expiresAt) return false;

  const expireTime = new Date(expiresAt).getTime();
  return expireTime > Date.now();
}

/**
 * Unlock a feature for a given duration (default 24 hours) after watching an ad
 */
export async function unlockFeatureWithAd(
  featureKey: string,
  hours = UNLOCK_DURATION_HOURS
): Promise<{ success: boolean; expiresAt: string }> {
  await ensureInit();
  const status = await getSubscriptionStatus();

  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const updatedFeatures = {
    ...status.unlockedFeatures,
    [featureKey]: expiresAt,
  };

  try {
    await AnposSecureStore.set(
      STORAGE_KEYS.UNLOCKED_FEATURES,
      JSON.stringify(updatedFeatures)
    );

    const newAdsCount = status.adsWatched + 1;
    await AnposSecureStore.set(STORAGE_KEYS.ADS_WATCHED, String(newAdsCount));

    const settingsList = await db.settings.toArray().catch(() => []);
    if (settingsList.length > 0) {
      await db.settings.update(settingsList[0].id, {
        subscription_ads_watched: newAdsCount,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[adRewardsService] Error saving unlocked feature:', err);
  }

  return { success: true, expiresAt };
}

/**
 * Unlock ALL advanced features at once for 24 hours
 */
export async function unlockAllFeaturesWithAd(
  hours = UNLOCK_DURATION_HOURS
): Promise<{ success: boolean; expiresAt: string }> {
  await ensureInit();
  const status = await getSubscriptionStatus();

  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const updatedFeatures: Record<string, string> = {};
  for (const k of Object.keys(LOCKED_FEATURES)) {
    updatedFeatures[k] = expiresAt;
  }

  try {
    await AnposSecureStore.set(
      STORAGE_KEYS.UNLOCKED_FEATURES,
      JSON.stringify(updatedFeatures)
    );

    const newAdsCount = status.adsWatched + 1;
    await AnposSecureStore.set(STORAGE_KEYS.ADS_WATCHED, String(newAdsCount));
  } catch (err) {
    console.warn('[adRewardsService] Error unlocking all features:', err);
  }

  return { success: true, expiresAt };
}

/**
 * Get details on all locked features and their current status
 */
export async function getAllFeatureStatuses(): Promise<UnlockedFeatureInfo[]> {
  const status = await getSubscriptionStatus();

  return Object.keys(LOCKED_FEATURES).map((k) => {
    const feat = LOCKED_FEATURES[k];
    if (status.isAdFree || status.isUnlimitedOrConnected) {
      return {
        key: k,
        name: feat.name,
        isUnlocked: true,
      };
    }

    const exp = status.unlockedFeatures[k];
    if (!exp) {
      return {
        key: k,
        name: feat.name,
        isUnlocked: false,
      };
    }

    const diffMs = new Date(exp).getTime() - Date.now();
    const isUnlocked = diffMs > 0;
    const hoursRemaining = isUnlocked ? Math.ceil(diffMs / (3600 * 1000)) : 0;

    return {
      key: k,
      name: feat.name,
      isUnlocked,
      expiresAt: exp,
      hoursRemaining,
    };
  });
}

/**
 * Check if user can make a sale (quota check)
 */
export async function checkCanMakeSale(): Promise<{
  allowed: boolean;
  remaining: number;
  isAdFree: boolean;
  reason?: string;
}> {
  const status = await getSubscriptionStatus();
  if (status.isUnlimitedOrConnected || status.isAdFree) {
    return { allowed: true, remaining: 999999, isAdFree: true };
  }

  if (status.remainingSales > 0) {
    return {
      allowed: true,
      remaining: status.remainingSales,
      isAdFree: false,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    isAdFree: false,
    reason:
      'لقد استنفدت رصيدك من المبيعات المجانية (300). شاهد إعلاناً للحصول على 20 مبيعة إضافية فوراً، أو تواصل معنا لحذف الإعلانات نهائياً!',
  };
}

/**
 * Record a sale execution
 */
export async function incrementSaleUsage(): Promise<number> {
  const isConnected = unifiedDB.getMode() === 'connected';
  if (isConnected) return 999999;

  try {
    await ensureInit();
    const settingsList = await db.settings.toArray().catch(() => []);
    if (settingsList.length > 0) {
      const st = settingsList[0] as any;
      const newUsed = (st.subscription_used_sales || 0) + 1;
      await db.settings.update(st.id, {
        subscription_used_sales: newUsed,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('[adRewardsService] incrementSaleUsage error:', e);
  }

  const status = await getSubscriptionStatus();
  return status.remainingSales;
}

/**
 * Claim reward ad sales bonus (+20 sales)
 */
export async function claimRewardAdBonus(): Promise<{
  success: boolean;
  bonusAdded: number;
  newRemaining: number;
  newTotalQuota: number;
}> {
  await ensureInit();
  const current = await getSubscriptionStatus();

  const newBonus = current.bonusSales + AD_REWARD_BONUS;
  const newAdsCount = current.adsWatched + 1;

  try {
    const settingsList = await db.settings.toArray().catch(() => []);
    if (settingsList.length > 0) {
      const st = settingsList[0] as any;
      await db.settings.update(st.id, {
        subscription_bonus_sales: newBonus,
        subscription_ads_watched: newAdsCount,
        updated_at: new Date().toISOString(),
      });
    }

    await AnposSecureStore.set(STORAGE_KEYS.BONUS, String(newBonus));
    await AnposSecureStore.set(STORAGE_KEYS.ADS_WATCHED, String(newAdsCount));
  } catch (err) {
    console.warn('[adRewardsService] Failed saving ad reward:', err);
  }

  const newTotalQuota = current.baseQuota + newBonus;
  const newRemaining = Math.max(0, newTotalQuota - current.usedSales);

  return {
    success: true,
    bonusAdded: AD_REWARD_BONUS,
    newRemaining,
    newTotalQuota,
  };
}

/**
 * Activate Ad-Free Full Version via license code
 */
export async function activateAdFree(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length < 5) {
    return { success: false, error: 'كود التفعيل غير صالح، يرجى التحقق وإعادة المحاولة.' };
  }

  try {
    await ensureInit();
    await AnposSecureStore.set(STORAGE_KEYS.AD_FREE, 'true');
    await AnposSecureStore.set(STORAGE_KEYS.LICENSE, cleanCode);

    const settingsList = await db.settings.toArray().catch(() => []);
    if (settingsList.length > 0) {
      await db.settings.update(settingsList[0].id, {
        subscription_license_key: cleanCode,
        subscription_base_quota: 1000000,
        updated_at: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (err) {
    console.warn('[adRewardsService] Activation failed:', err);
    return { success: false, error: 'حدث خطأ أثناء معالجة كود التفعيل.' };
  }
}

/**
 * Backward compatibility upgrade method
 */
export async function upgradeSubscription(tier: SubscriptionTier, licenseKey?: string): Promise<{ success: boolean; status: AdSystemStatus }> {
  if (licenseKey) {
    const res = await activateAdFree(licenseKey);
    const status = await getSubscriptionStatus();
    return { success: res.success, status };
  }
  const status = await getSubscriptionStatus();
  return { success: true, status };
}
