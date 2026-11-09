import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import te from './locales/te';
import hi from './locales/hi';

const savedLang = (typeof window !== 'undefined' && localStorage.getItem('civicproof_language')) || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      te: { translation: te },
      hi: { translation: hi },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
] as const;

export type SupportedLanguage = (typeof AVAILABLE_LANGUAGES)[number]['code'];

export const changeAppLanguage = (languageCode: SupportedLanguage) => {
  i18n.changeLanguage(languageCode);
  if (typeof window !== 'undefined') {
    localStorage.setItem('civicproof_language', languageCode);
    document.documentElement.lang = languageCode;
  }
};

export default i18n;
