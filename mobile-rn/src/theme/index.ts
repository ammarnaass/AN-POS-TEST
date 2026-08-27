export * from './tokens';
export { useThemeStore, useTheme, type ThemeMode } from '@/store/themeStore';

import { colors, lightColors, darkColors, spacing, radii, typography, shadows } from './tokens';

export const theme = {
  colors,
  lightColors,
  darkColors,
  spacing,
  radii,
  typography,
  shadows,
};

export default theme;
