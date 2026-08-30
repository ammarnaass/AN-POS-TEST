import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type Language,
  type TranslationKey,
  type TranslationSchema,
  translations,
  getTranslation,
  LANGUAGE_METADATA,
} from '@/locales';

const LANGUAGE_STORAGE_KEY = 'anpos_language_preference';

interface I18nState {
  language: Language;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
  initialized: boolean;
  strings: TranslationSchema;

  setLanguage: (lang: Language) => Promise<void>;
  initLanguage: () => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: 'ar',
  isRTL: true,
  dir: 'rtl',
  initialized: false,
  strings: translations.ar,

  initLanguage: async () => {
    try {
      const savedLang = (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) as Language | null;
      const language: Language =
        savedLang === 'ar' || savedLang === 'en' || savedLang === 'fr' ? savedLang : 'ar';
      const isRTL = language === 'ar';
      const dir = isRTL ? 'rtl' : 'ltr';

      set({
        language,
        isRTL,
        dir,
        strings: translations[language] || translations.ar,
        initialized: true,
      });
    } catch (err) {
      console.warn('Failed to initialize language:', err);
      set({ initialized: true });
    }
  },

  setLanguage: async (lang: Language) => {
    const language: Language = lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar';
    const isRTL = language === 'ar';
    const dir = isRTL ? 'rtl' : 'ltr';

    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (err) {
      console.warn('Failed to save language preference:', err);
    }

    set({
      language,
      isRTL,
      dir,
      strings: translations[language] || translations.ar,
    });
  },

  t: (key: TranslationKey, params?: Record<string, string | number>) => {
    const { language } = get();
    return getTranslation(language, key, params);
  },
}));

/**
 * Convenient React Hook for internationalization
 */
export function useI18n() {
  const { language, isRTL, dir, strings, setLanguage, t } = useI18nStore();
  const metadata = LANGUAGE_METADATA[language] || LANGUAGE_METADATA.ar;

  return {
    language,
    isRTL,
    dir,
    strings,
    metadata,
    allLanguages: LANGUAGE_METADATA,
    setLanguage,
    t,
  };
}

export const useTranslation = useI18n;
