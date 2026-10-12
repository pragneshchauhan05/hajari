import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Language,
  translations,
  TranslationKey,
  getMonthOptions,
  MonthOption,
} from '../utils/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
  months: MonthOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('hazari_language');
    if (saved === 'en' || saved === 'gu') {
      return saved;
    }
    return 'gu';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('hazari_language', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'gu' ? 'en' : 'gu');
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language] || translations.gu;
    const value = langDict[key];
    if (value !== undefined) return value;
    return fallback || key;
  };

  const months = getMonthOptions(language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        months,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
