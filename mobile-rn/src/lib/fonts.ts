import { I18nManager, Platform } from 'react-native';

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
    I18nManager.allowRTL(true);
  }
}

// Font loader — for React Native CLI
// In the final build, these fonts should be placed in:
//   android/app/src/main/assets/fonts/Cairo.ttf
//   android/app/src/main/assets/fonts/Tajawal.ttf

export const FONTS = {
  regular: 'Cairo-Regular',
  medium: 'Cairo-600',
  semiBold: 'Cairo-600',
  bold: 'Cairo-Bold',
  black: 'Cairo-Black',
  tajawalRegular: 'Tajawal-Regular',
  tajawalBold: 'Tajawal-Bold',
} as const;

export const TEXT_STYLES = {
  headlineLg: { fontFamily: FONTS.bold, fontSize: 24, fontWeight: '700' as const },
  titleMd: { fontFamily: FONTS.bold, fontSize: 18, fontWeight: '700' as const },
  body: { fontFamily: FONTS.regular, fontSize: 14, fontWeight: '400' as const },
  bodySm: { fontFamily: FONTS.regular, fontSize: 12, fontWeight: '400' as const },
  label: { fontFamily: FONTS.medium, fontSize: 11, fontWeight: '600' as const },
  caption: { fontFamily: FONTS.regular, fontSize: 10, fontWeight: '400' as const },
  button: { fontFamily: FONTS.bold, fontSize: 14, fontWeight: '700' as const },
};

export const RTL_STYLE = {
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};
