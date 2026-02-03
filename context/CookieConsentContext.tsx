/**
 * CookieConsentContext.tsx
 * EU cookie consent: persist choice (cookie + localStorage), expose preferences modal,
 * load GTM/GA only after analytics consent. GDPR / TTDSG aligned.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const COOKIE_NAME = 'cookie_consent';
const STORAGE_KEY = 'cookie_consent';
const COOKIE_MAX_AGE_DAYS = 365;
const CONSENT_VERSION = 1;

export type ConsentPreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const DEFAULT_CONSENT: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location?.protocol === 'https:';
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `path=/`,
    `max-age=${maxAgeDays * 24 * 60 * 60}`,
    `samesite=Lax`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function parseStored(raw: string | null): ConsentPreferences | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: number; necessary?: boolean; analytics?: boolean; marketing?: boolean };
    if (parsed.v !== CONSENT_VERSION) return null;
    return {
      necessary: parsed.necessary !== false,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

function readConsent(): ConsentPreferences | null {
  try {
    const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const fromCookie = getCookie(COOKIE_NAME);
    const raw = fromStorage ?? fromCookie;
    return parseStored(raw);
  } catch {
    return null;
  }
}

type CookieConsentContextValue = {
  consent: ConsentPreferences | null;
  hasDecided: boolean;
  setConsent: (prefs: ConsentPreferences) => void;
  openCookiePreferences: () => void;
  isPreferencesOpen: boolean;
  closeCookiePreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export const useCookieConsent = (): CookieConsentContextValue => {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
};

function loadGTMIfConsented(analytics: boolean) {
  if (!analytics) return;
  const gtmId = (import.meta as unknown as { env: { VITE_GTM_ID?: string } }).env.VITE_GTM_ID?.trim();
  if (!gtmId || typeof document === 'undefined') return;
  if (document.getElementById('gtm-script')) return;
  const script = document.createElement('script');
  script.id = 'gtm-script';
  script.async = true;
  script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId.replace(/'/g, "\\'")}');`;
  document.head.appendChild(script);
}

export const CookieConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consent, setConsentState] = useState<ConsentPreferences | null>(() => readConsent());
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const hasDecided = consent !== null;

  const setConsent = useCallback((prefs: ConsentPreferences) => {
    const payload = JSON.stringify({
      v: CONSENT_VERSION,
      necessary: prefs.necessary,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      ts: Date.now(),
    });
    setCookie(COOKIE_NAME, payload, COOKIE_MAX_AGE_DAYS);
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // ignore
    }
    setConsentState(prefs);
    loadGTMIfConsented(prefs.analytics);
  }, []);

  const openCookiePreferences = useCallback(() => setIsPreferencesOpen(true), []);
  const closeCookiePreferences = useCallback(() => setIsPreferencesOpen(false), []);

  useEffect(() => {
    if (consent?.analytics) loadGTMIfConsented(true);
  }, [consent?.analytics]);

  const value: CookieConsentContextValue = {
    consent,
    hasDecided,
    setConsent,
    openCookiePreferences,
    isPreferencesOpen,
    closeCookiePreferences,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};
