import React, { createContext, useContext, useEffect, useState } from 'react';

const LangContext = createContext({ lang: 'en', setLang: () => {} });

const STORAGE_KEY = 'mb-lang';

const getInitialLang = () => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'es') return stored;
  const browser = (window.navigator.language || '').toLowerCase();
  return browser.startsWith('es') ? 'es' : 'en';
};

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
