/**
 * Subscription & Quota Service
 * Manages Free, Lite, and Pro subscription plans in Standalone Mode.
 * Free: 300 base sales + Rewarded Ads (+20 sales per ad).
 * Lite: 5,000 base sales without ads + advanced reports & multi-user.
 * Pro: 100,000 base sales + all advanced enterprise modules.
 */
import { db, ensureInit } from './db';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import { AnposSecureStore } from '@/modules/AnposSecureStore';

export type SubscriptionTier = 'free' | 'lite' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  baseQuota: number;
  bonusSales: number;
  usedSales: number;
  totalQuota: number;
  remainingSales: number;
  adsWatched: number;
  licenseKey?: string;
  isUnlimitedOrConnected: boolean;
}

export const TIER_QUOTAS: Record<SubscriptionTier, number> = {
  free: 300,
  lite: 5000,
  pro: 100000,
};

export const AD_REWARD_BONUS = 20;

export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    '300 مبيعة أساسية',
    'مكافأة +20 مبيعة لكل إعلان مشاهد',
    'نقطة بيع كاملة ومسح الباركود',
    'طباعة الفواتير والإيصالات الحرارية',
    'مستخدم كاشير واحد',
  ],
  lite: [
    '5,000 مبيعة كاملة بدون إعلانات',
    'تقارير مبيعات ومصروفات متقدمة',
    'إدارة ديون الزبائن والموردين',
    'تخصيص شعار وترويسة الفواتير',
    'دعم تعدد المستخدمين (حتى 3 مستخدمين)',
    'تصدير البيانات محلياً',
  ],
  pro: [
    '100,000 مبيعة سعة قصوى',
    'إدارة المستودعات المتعددة',
    'مركز الربحية وحاسبة الزكاة الذكية',
    'أسعار الجملة والطرود (Colisage)',
    'تصدير واستيراد البيانات الكامل (Excel/PDF)',
    'عدد مستخدمين وصلاحيات غير محدودة',
    'أولوية الدعم والتحديثات',
  ],
};

const STORAGE_KEYS = {
  TIER: 'anpos_sub_tier',
  BONUS: 'anpos_sub_bonus',
  ADS_WATCHED: 'anpos_sub_ads_watched',
  LICENSE: 'anpos_sub_license',
};

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const isConnected = unifiedDB.getMode() === 'connected';
  if (isConnected) {
    // In connected mode, mobile operates as client to desktop, unlimited quota
    return {
      tier: 'pro',
      baseQuota: 1000000,
      bonusSales: 0,
      usedSales: 0,
      totalQuota: 1000000,
      remainingSales: 1000000,
      adsWatched: 0,
      isUnlimitedOrConnected: true,
    };
  }

  await ensureInit();

  let tier: SubscriptionTier = 'free';
  let bonusSales = 0;
  let adsWatched = 0;
  let licenseKey = '';
  let usedSales = 0;

  try {
    // 1. Load from DB settings
    const settingsList = await db.settings.toArray().catch(() => []);
    const st = settingsList[0] as any;

    // 2. Count actual sales in standalone DB
    usedSales = await db.sales.count().catch(() => 0);

    if (st && st.subscription_tier) {
      tier = (st.subscription_tier as SubscriptionTier) || 'free';
      bonusSales = Number(st.subscription_bonus_sales || 0);
      adsWatched = Number(st.subscription_ads_watched || 0);
      licenseKey = String(st.subscription_license_key || '');
    } else {
      // Fallback to secure store
      const savedTier = await AnposSecureStore.get(STORAGE_KEYS.TIER);
      if (savedTier && (savedTier === 'free' || savedTier === 'lite' || savedTier === 'pro')) {
        tier = savedTier;
      }
      const savedBonus = await AnposSecureStore.get(STORAGE_KEYS.BONUS);
      if (savedBonus) bonusSales = parseInt(savedBonus, 10) || 0;
      const savedAds = await AnposSecureStore.get(STORAGE_KEYS.ADS_WATCHED);
      if (savedAds) adsWatched = parseInt(savedAds, 10) || 0;
    }
  } catch (err) {
    console.warn('[subscriptionService] Error loading status:', err);
  }

  const baseQuota = TIER_QUOTAS[tier] || 300;
  const totalQuota = baseQuota + bonusSales;
  const remainingSales = Math.max(0, totalQuota - usedSales);

  return {
    tier,
    baseQuota,
    bonusSales,
    usedSales,
    totalQuota,
    remainingSales,
    adsWatched,
    licenseKey,
    isUnlimitedOrConnected: false,
  };
}

/**
 * Check if the user is allowed to complete a new sale
 */
export async function checkCanMakeSale(): Promise<{
  allowed: boolean;
  remaining: number;
  tier: SubscriptionTier;
  reason?: string;
}> {
  const status = await getSubscriptionStatus();
  if (status.isUnlimitedOrConnected) {
    return { allowed: true, remaining: 999999, tier: 'pro' };
  }

  if (status.remainingSales > 0) {
    return {
      allowed: true,
      remaining: status.remainingSales,
      tier: status.tier,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    tier: status.tier,
    reason:
      status.tier === 'free'
        ? 'لقد استنفدت رصيدك من المبيعات المجانية (300). شاهد إعلاناً للحصول على 20 مبيعة إضافية فوراً!'
        : 'لقد بلغت الحد الأقصى للمبيعات في باقتك الحالية. يرجى الترقية إلى باقة برو أو تجديد الاشتراك.',
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
    console.warn('[subscriptionService] incrementSaleUsage error:', e);
  }

  const status = await getSubscriptionStatus();
  return status.remainingSales;
}

/**
 * Claim reward ad bonus (+20 sales)
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

    // Also persist in SecureStore
    await AnposSecureStore.set(STORAGE_KEYS.BONUS, String(newBonus));
    await AnposSecureStore.set(STORAGE_KEYS.ADS_WATCHED, String(newAdsCount));
  } catch (err) {
    console.warn('[subscriptionService] Failed saving ad reward:', err);
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
 * Upgrade subscription tier
 */
export async function upgradeSubscription(
  newTier: SubscriptionTier,
  licenseKey?: string
): Promise<{ success: boolean; status: SubscriptionStatus }> {
  await ensureInit();

  try {
    const settingsList = await db.settings.toArray().catch(() => []);
    const baseQuota = TIER_QUOTAS[newTier];

    if (settingsList.length > 0) {
      const st = settingsList[0] as any;
      await db.settings.update(st.id, {
        subscription_tier: newTier,
        subscription_base_quota: baseQuota,
        subscription_license_key: licenseKey || '',
        updated_at: new Date().toISOString(),
      });
    }

    // Update users table in SQLite
    const users = await db.users.toArray().catch(() => []);
    for (const u of users) {
      await db.users.update(u.id, { subscription_tier: newTier });
    }

    // Persist in SecureStore
    await AnposSecureStore.set(STORAGE_KEYS.TIER, newTier);
    if (licenseKey) {
      await AnposSecureStore.set(STORAGE_KEYS.LICENSE, licenseKey);
    }
  } catch (err) {
    console.warn('[subscriptionService] Upgrade failed:', err);
  }

  const status = await getSubscriptionStatus();
  return { success: true, status };
}

/**
 * Check if a specific module/feature is accessible on the current tier
 */
export async function hasFeatureAccess(
  feature:
    | 'multi_warehouse'
    | 'profit_center'
    | 'zakat_calculator'
    | 'multi_user'
    | 'custom_receipt'
    | 'full_export'
): Promise<boolean> {
  const isConnected = unifiedDB.getMode() === 'connected';
  if (isConnected) return true;

  const { tier } = await getSubscriptionStatus();

  switch (feature) {
    case 'multi_warehouse':
    case 'profit_center':
    case 'zakat_calculator':
    case 'full_export':
      return tier === 'pro';
    case 'multi_user':
    case 'custom_receipt':
      return tier === 'lite' || tier === 'pro';
    default:
      return true;
  }
}
