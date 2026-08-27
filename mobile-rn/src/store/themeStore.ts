import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ThemeColors, spacing, radii, typography, shadows } from '@/theme/tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'anpos_theme_mode';

interface ThemeState {
  mode: ThemeMode;
  systemColorScheme: ColorSchemeName;
  isDark: boolean;
  colors: ThemeColors;
  initialized: boolean;

  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  initTheme: () => Promise<void>;
  updateSystemScheme: (scheme: ColorSchemeName) => void;
}

function resolveIsDark(mode: ThemeMode, systemScheme: ColorSchemeName): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemScheme === 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialSystem = Appearance.getColorScheme() || 'light';
  const initialIsDark = resolveIsDark('system', initialSystem);

  return {
    mode: 'system',
    systemColorScheme: initialSystem,
    isDark: initialIsDark,
    colors: initialIsDark ? darkColors : lightColors,
    initialized: false,

    initTheme: async () => {
      try {
        const savedMode = (await AsyncStorage.getItem(THEME_STORAGE_KEY)) as ThemeMode | null;
        const currentSystem = Appearance.getColorScheme() || 'light';
        const mode = savedMode === 'light' || savedMode === 'dark' || savedMode === 'system' ? savedMode : 'system';
        const isDark = resolveIsDark(mode, currentSystem);

        set({
          mode,
          systemColorScheme: currentSystem,
          isDark,
          colors: isDark ? darkColors : lightColors,
          initialized: true,
        });
      } catch (err) {
        console.warn('Failed to initialize theme:', err);
      }
    },

    setMode: async (mode: ThemeMode) => {
      const { systemColorScheme } = get();
      const isDark = resolveIsDark(mode, systemColorScheme);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (err) {
        console.warn('Failed to save theme preference:', err);
      }
      set({
        mode,
        isDark,
        colors: isDark ? darkColors : lightColors,
      });
    },

    toggleTheme: async () => {
      const { isDark } = get();
      const newMode: ThemeMode = isDark ? 'light' : 'dark';
      await get().setMode(newMode);
    },

    updateSystemScheme: (systemScheme: ColorSchemeName) => {
      const { mode } = get();
      const isDark = resolveIsDark(mode, systemScheme);
      set({
        systemColorScheme: systemScheme,
        isDark,
        colors: isDark ? darkColors : lightColors,
      });
    },
  };
});

// Subscribe to system appearance changes
Appearance.addChangeListener(({ colorScheme }) => {
  useThemeStore.getState().updateSystemScheme(colorScheme);
});

// Custom hook for components
export function useTheme() {
  const { mode, isDark, colors, setMode, toggleTheme } = useThemeStore();
  return {
    mode,
    isDark,
    colors,
    spacing,
    radii,
    typography,
    shadows,
    setMode,
    toggleTheme,
  };
}
