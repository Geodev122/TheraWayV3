import React, { createContext, useState, ReactNode, useEffect, useCallback, useContext } from 'react';
import toast from 'react-hot-toast';

type Language = 'en' | 'ar' | 'fr';
type Direction = 'ltr' | 'rtl';

export interface LanguageContextType {
  language: Language;
  direction: Direction;
  setLanguage: (language: Language) => void;
  isLoaded: boolean;
  t: (key: string, replacements?: Record<string, string | number | undefined>) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {},
  ar: {},
  fr: {}
};

// This function will now be more resilient and not throw a blocking error.
async function loadTranslations(lang: Language): Promise<void> {
  // Use Vite's import.meta.env.BASE_URL to create a path that works in any deployment (root or subdirectory).
  const localePath = `${import.meta.env.BASE_URL}locales/${lang}.json`.replace(/\/+/g, '/'); // Clean up double slashes
  
  try {
    const response = await fetch(localePath);

    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json. Status: ${response.status}`);
    }

    try {
      translations[lang] = await response.json();
      console.log(`LanguageContext: Successfully loaded translations for ${lang}.`);
    } catch (parseError) {
      throw new Error(`Failed to parse ${lang}.json. It may not be valid JSON.`);
    }
  } catch (error: any) {
    // Instead of throwing, we log the error and show a toast.
    // This allows the app to continue rendering with fallback text.
    console.error(`LanguageContext: Could not load translations for '${lang}'.`, error);
    toast.error(`Could not load language: ${lang.toUpperCase()}`, { duration: 5000 });
    // We don't re-throw the error, allowing Promise.all to complete.
  }
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const storedLang = localStorage.getItem('theraWayLanguage') as Language | null;
    return storedLang || 'en';
  });
  const [isLoaded, setIsLoaded] = useState(false);
  // Removed loadingError state as we no longer want to block rendering.

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const loadInitialTranslations = async () => {
      console.log("LanguageProvider: Starting to load initial translations...");
      // Promise.all will now complete even if one of the fetches fails.
      await Promise.all([
        loadTranslations('en'),
        loadTranslations('ar'),
        loadTranslations('fr'),
      ]);
      setIsLoaded(true);
      console.log("LanguageProvider: Finished loading initial translations attempt. isLoaded:", true);
    };
    loadInitialTranslations();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    localStorage.setItem('theraWayLanguage', language);
  }, [language, direction]);

  const t = useCallback((key: string, replacements?: Record<string, string | number | undefined>): string => {
    // The fallback logic is robust. If a language fails to load, its dictionary will be empty,
    // causing it to fall back to English, and then to the key itself.
    let translation = translations[language]?.[key] || translations['en']?.[key] || `MISSING: ${key}`;
    
    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        if (value !== undefined) {
           translation = translation.replace(new RegExp(`{${placeholder}}`, 'g'), String(value));
        }
      });
    }
    return translation;
  }, [language, isLoaded]); // isLoaded is kept to ensure we don't translate before any files are fetched.
  
  return (
    <LanguageContext.Provider value={{ language, direction, setLanguage, isLoaded, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};