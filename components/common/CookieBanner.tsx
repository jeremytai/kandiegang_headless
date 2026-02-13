/**
 * CookieBanner.tsx
 * EU cookie notice: shown until user has a stored choice. Accept all, reject non-essential, or customize.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useCookieConsent } from '../../context/CookieConsentContext';

export const CookieBanner: React.FC = () => {
  const { hasDecided, setConsent, openCookiePreferences } = useCookieConsent();

  if (hasDecided) return null;

  const acceptAll = () => {
    setConsent({ necessary: true, analytics: true, marketing: false });
  };

  const rejectNonEssential = () => {
    setConsent({ necessary: true, analytics: false, marketing: false });
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-8px_32px_rgba(0,0,0,0.08)]"
      role="region"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-6 md:py-5">
        <p className="text-[11px] text-slate-600 md:flex-1 md:text-sm">
          We use cookies and similar technologies to run the site and, with your consent, to improve
          your user experience. See our{' '}
          <a
            href="/privacy-policy"
            className="text-secondary-purple-rain underline underline-offset-2 hover:text-secondary-current"
          >
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex flex-wrap items-center gap-3 md:flex-shrink-0 md:gap-4">
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-full bg-secondary-purple-rain px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-secondary-current"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={rejectNonEssential}
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="rounded-full border-0 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
          >
            Customize
          </button>
        </div>
      </div>
    </motion.div>
  );
};
