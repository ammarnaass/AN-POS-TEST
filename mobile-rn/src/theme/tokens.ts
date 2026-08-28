/**
 * AN POS Mobile — Design Tokens & Theme Architecture
 * Full Light Mode & Dark Mode palettes with high-contrast semantics.
 */

export const lightColors = {
  // Brand / Royal Blue (أزرق ملكي)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb', // Royal Blue
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Indigo Accent
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
  },

  // Purple / Violet Accent
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
  },

  // Emerald / Teal
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },

  // Amber / Gold Accent
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Cyan / Sky Accent
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },

  // Crimson / Red Accent
  crimson: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutrals / Slate
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Semantic Status (Light Mode)
  success: {
    light: '#f0fdf4',
    border: '#bbf7d0',
    text: '#15803d',
    main: '#15803d',
    dark: '#166534',
  },
  warning: {
    light: '#fffbeb',
    border: '#fde68a',
    text: '#b45309',
    main: '#b45309',
    dark: '#92400e',
  },
  danger: {
    light: '#fef2f2',
    border: '#fecaca',
    text: '#b91c1c',
    main: '#b91c1c',
    dark: '#991b1b',
  },
  info: {
    light: '#eff6ff',
    border: '#bfdbfe',
    text: '#2563eb',
    main: '#2563eb',
    dark: '#1d4ed8',
  },

  // Surfaces & Base (خلفيات ناصعة ومريحة)
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceSubtle: '#f1f5f9',
  cardBg: '#ffffff',
  headerBg: '#ffffff',
  inputBg: '#f8fafc',

  // Texts (نصوص شديدة الوضوح تحقق معايير WCAG)
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#64748b', // Slate 500 - 4.6:1 contrast ratio on white/slate-50
    inverse: '#ffffff',
    disabled: '#94a3b8',
    emerald: '#15803d',
    danger: '#b91c1c',
    warning: '#b45309',
    primaryBlue: '#2563eb',
  },

  // Borders (حدود ناعمة)
  border: {
    subtle: '#f1f5f9',
    default: '#e2e8f0',
    emphasis: '#cbd5e1',
    focus: '#2563eb',
  },
};

export const darkColors: typeof lightColors = {
  // Brand / Bright Blue (أزرق ساطع)
  primary: {
    50: '#1e293b',
    100: '#1e3a8a',
    200: '#1e40af',
    300: '#2563eb',
    400: '#3b82f6',
    500: '#60a5fa',
    600: '#3b82f6',
    700: '#60a5fa',
    800: '#93c5fd',
    900: '#dbeafe',
  },

  // Indigo Accent
  indigo: {
    50: '#1e1b4b',
    100: '#312e81',
    200: '#3730a3',
    500: '#6366f1',
    600: '#818cf8',
    700: '#a5b4fc',
  },

  // Purple / Violet Accent
  purple: {
    50: '#2e1065',
    100: '#4c1d95',
    200: '#581c87',
    500: '#a855f7',
    600: '#c084fc',
    700: '#d8b4fe',
  },

  // Emerald / Teal Accent
  emerald: {
    50: '#064e3b',
    100: '#065f46',
    200: '#047857',
    500: '#10b981',
    600: '#34d399',
    700: '#6ee7b7',
  },

  // Amber / Gold Accent for Dark Mode
  amber: {
    50: '#451a03',
    100: '#78350f',
    200: '#92400e',
    500: '#f59e0b',
    600: '#fbbf24',
    700: '#fcd34d',
    800: '#fde68a',
    900: '#fef3c7',
  },

  // Cyan / Sky Accent for Dark Mode
  cyan: {
    50: '#083344',
    100: '#164e63',
    200: '#155e75',
    500: '#06b6d4',
    600: '#22d3ee',
    700: '#67e8f9',
    800: '#a5f3fc',
    900: '#cffafe',
  },

  // Crimson / Red Accent for Dark Mode
  crimson: {
    50: '#450a0a',
    100: '#7f1d1d',
    200: '#991b1b',
    500: '#ef4444',
    600: '#f87171',
    700: '#fca5a5',
    800: '#fecaca',
    900: '#fee2e2',
  },

  // Neutrals / Slate for Dark Mode
  slate: {
    50: '#090d16',
    100: '#0f172a',
    200: '#1e293b',
    300: '#243046',
    400: '#475569',
    500: '#64748b',
    600: '#94a3b8',
    700: '#cbd5e1',
    800: '#e2e8f0',
    900: '#f8fafc',
  },

  // Semantic Status (ألوان دلالية مضيئة للوضع المظلم)
  success: {
    light: '#064e3b',
    border: '#047857',
    text: '#34d399',
    main: '#34d399',
    dark: '#6ee7b7',
  },
  warning: {
    light: '#451a03',
    border: '#78350f',
    text: '#fbbf24',
    main: '#fbbf24',
    dark: '#fcd34d',
  },
  danger: {
    light: '#450a0a',
    border: '#7f1d1d',
    text: '#f87171',
    main: '#f87171',
    dark: '#fca5a5',
  },
  info: {
    light: '#172554',
    border: '#1e40af',
    text: '#60a5fa',
    main: '#60a5fa',
    dark: '#93c5fd',
  },

  // Surfaces & Base (خلفيات داكنة عميقة فائقة الأناقة)
  background: '#090d16', // Deep Slate-950
  surface: '#0f172a', // Slate-900
  surfaceElevated: '#1e293b', // Slate-800
  surfaceSubtle: '#131d31', // Subtle Slate
  cardBg: '#0f172a',
  headerBg: '#0f172a',
  inputBg: '#1e293b',

  // Texts (نصوص عالية التباين ومريحة للعين)
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    tertiary: '#94a3b8',
    inverse: '#0f172a',
    disabled: '#475569',
    emerald: '#34d399',
    danger: '#f87171',
    warning: '#fbbf24',
    primaryBlue: '#60a5fa',
  },

  // Borders (حدود أنيقة داكنة)
  border: {
    subtle: '#1e293b',
    default: '#243046',
    emphasis: '#334155',
    focus: '#60a5fa',
  },
};

// Default export is lightColors for static/fallback access
export const colors = lightColors;
export type ThemeColors = typeof lightColors;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
  circle: 9999,
  full: 9999,
};

export const typography = {
  family: {
    regular: 'Cairo',
    medium: 'Cairo',
    bold: 'Cairo',
  },
  fontFamily: {
    arabic: 'Cairo',
    arabicMedium: 'Cairo',
    arabicBold: 'Cairo',
  },
  size: {
    micro: 10,
    caption: 12,
    bodySm: 13,
    body: 15,
    bodyLg: 16,
    titleSm: 17,
    title: 19,
    titleLg: 22,
    display: 26,
    hero: 32,
  },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  xxl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  glowPrimary: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  glowSuccess: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};
