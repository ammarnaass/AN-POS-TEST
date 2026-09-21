/**
 * Google AdMob Configuration & Ad Unit Identifiers
 * Production Ad Units for AN POS Mobile
 */

export const ADMOB_CONFIG = {
  // Official Production App ID
  appId: 'ca-app-pub-3879135452976176~7886091777',

  // Production Ad Unit IDs
  units: {
    rewardedSales: 'ca-app-pub-3879135452976176/2207313124',
    rewardedFeature: 'ca-app-pub-3879135452976176/8062275037',
    interstitial: 'ca-app-pub-3879135452976176/4123030024',
    banner: 'ca-app-pub-3879135452976176/7595371172',
  },

  // Google Test IDs (Official test units for debug builds to avoid invalid traffic policy violations)
  testUnits: {
    rewardedSales: 'ca-app-pub-3940256099942544/5224354917',
    rewardedFeature: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    banner: 'ca-app-pub-3940256099942544/6300978111',
  },
};

declare const __DEV__: boolean;

/**
 * Returns the appropriate ad unit ID based on environment (production vs debug)
 */
export function getAdUnitId(
  type: keyof typeof ADMOB_CONFIG.units,
  useTestAds = typeof __DEV__ !== 'undefined' ? __DEV__ : false
): string {
  if (useTestAds) {
    return ADMOB_CONFIG.testUnits[type];
  }
  return ADMOB_CONFIG.units[type];
}
