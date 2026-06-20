import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../locales/en';
import fr from '../locales/fr';

const locales = { en, fr };
const LanguageContext = createContext();

export const useTranslation = () => {
  const ctx = useContext(LanguageContext);
  const t = (key, params = {}) => {
    const str = ctx.langData[key] || key;
    return str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  };
  return { t, lang: ctx.lang, setLang: ctx.setLang };
};

export const LanguageProvider = ({ children }) => {
  const saved = localStorage.getItem('lang');
  const [lang, setLangState] = useState(saved === 'en' ? 'en' : 'fr');

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  }, []);

  const langData = locales[lang] || fr;

  return (
    <LanguageContext.Provider value={{ lang, setLang, langData }}>
      {children}
    </LanguageContext.Provider>
  );
};
