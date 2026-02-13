/**
 * CookiePreferencesModal.tsx
 * Modal to view and change cookie consent. Opened from banner "Customize" or footer "Privacy and Cookies".
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useCookieConsent, type ConsentPreferences } from '../../context/CookieConsentContext';

/** Switch control with literal aria-checked for ARIA validators that reject expressions. */
const CookieSwitch: React.FC<{
  checked: boolean;
  onToggle: () => void;
  'aria-label': string;
}> = ({ checked, onToggle, 'aria-label': ariaLabel }) => {
  const baseClass =
    'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-purple-rain focus:ring-offset-2';
  const thumbClass =
    'pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform';
  return checked ? (
    <button
      type="button"
      role="switch"
      aria-checked="true"
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`${baseClass} bg-secondary-purple-rain`}
    >
      <span className={`${thumbClass} translate-x-6`} />
    </button>
  ) : (
    <button
      type="button"
      role="switch"
      aria-checked="false"
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`${baseClass} bg-slate-200`}
    >
      <span className={`${thumbClass} translate-x-1`} />
    </button>
  );
};

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { consent, setConsent } = useCookieConsent();
  const [prefs, setPrefs] = useState<ConsentPreferences>({
    necessary: true,
    analytics: consent?.analytics ?? false,
    marketing: consent?.marketing ?? false,
  });

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && consent) {
      setPrefs({
        necessary: true,
        analytics: consent.analytics,
        marketing: consent.marketing,
      });
    }
  }, [isOpen, consent]);

  const handleSave = () => {
    setConsent(prefs);
    onClose();
  };

  const handleRejectAll = () => {
    setConsent({ necessary: true, analytics: false, marketing: false });
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="cookie-prefs-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="cookie-prefs-dialog"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              zIndex: 51,
            }}
            className="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-10 pb-8">
              <h2
                id="cookie-prefs-title"
                className="font-heading text-secondary-purple-rain text-2xl font-normal tracking-normal md:text-3xl"
              >
                Cookie preferences
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Choose which cookies we may use. You can change this anytime via Privacy and Cookies
                in the footer.
              </p>
              <div className="mt-6 space-y-5">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <p className="font-medium text-slate-900">Necessary</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Required for the site to work. Always on.
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                    Always on
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <p className="font-medium text-slate-900">Analytics</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Helps us understand how visitors use the site.
                    </p>
                  </div>
                  <CookieSwitch
                    checked={prefs.analytics}
                    onToggle={() => setPrefs((p) => ({ ...p, analytics: !p.analytics }))}
                    aria-label={prefs.analytics ? 'Analytics cookies on' : 'Analytics cookies off'}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">Marketing</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Used for relevant ads and campaigns.
                    </p>
                  </div>
                  <CookieSwitch
                    checked={prefs.marketing}
                    onToggle={() => setPrefs((p) => ({ ...p, marketing: !p.marketing }))}
                    aria-label={prefs.marketing ? 'Marketing cookies on' : 'Marketing cookies off'}
                  />
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-full bg-secondary-purple-rain px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-secondary-current"
                >
                  Save preferences
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  Reject non-essential
                </button>
              </div>
              <p className="mt-6 text-xs text-slate-500">
                <a
                  href="/privacy-policy"
                  className="text-secondary-purple-rain underline underline-offset-2 hover:text-secondary-current"
                >
                  Privacy Policy
                </a>{' '}
                has full details on how we use data.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
