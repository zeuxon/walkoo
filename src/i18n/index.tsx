import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Translations } from './translations';
import type { Language } from '@/types';
import { getSettings, updateSettings } from '@/services/settingsService';
import { eventBus, Events } from '@/services/eventBus';

interface LanguageContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  t: translations.en,
  setLanguage: async () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLang] = useState<Language>('en');

  const load = useCallback(async () => {
    const s = await getSettings();
    setLang(s.language ?? 'en');
  }, []);

  useEffect(() => {
    load();
    const unsub = eventBus.on(Events.SETTINGS_CHANGED, load);
    return unsub;
  }, [load]);

  const setLanguage = useCallback(async (lang: Language) => {
    await updateSettings({ language: lang });
    setLang(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, t: translations[language], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
