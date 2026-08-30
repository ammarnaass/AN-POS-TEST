import { ar } from './ar';
import { en } from './en';
import { fr } from './fr';
import type { Language, TranslationSchema, TranslationKey } from './types';

export * from './types';
export { ar, en, fr };

export const translations: Record<Language, TranslationSchema> = {
  ar,
  en,
  fr,
};

export const LANGUAGE_METADATA: Record<
  Language,
  { name: string; nativeName: string; flag: string; dir: 'rtl' | 'ltr'; sub: string }
> = {
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇩🇿',
    dir: 'rtl',
    sub: 'الواجهة العربية الافتراضية',
  },
  en: {
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
    sub: 'English Interface',
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    sub: 'Interface en Français',
  },
};

/**
 * Resolve nested translation key with fallback: lang -> ar -> key
 */
export function getTranslation(
  lang: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations.ar;
  const parts = key.split('.');

  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to Arabic if not found in target language
      let fallbackCurrent: any = translations.ar;
      for (const fPart of parts) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fPart in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[fPart];
        } else {
          fallbackCurrent = key;
          break;
        }
      }
      current = fallbackCurrent;
      break;
    }
  }

  let result = typeof current === 'string' ? current : key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
    }
  }

  return result;
}
