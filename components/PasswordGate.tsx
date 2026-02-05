/**
 * PasswordGate.tsx
 * Full-screen gate shown after the preloader and before the site.
 * Unlock persists in sessionStorage for the session.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SITE_PASSWORD = "letsgo!";
const STORAGE_KEY = "kandiegang_site_unlocked";

export function getStoredUnlock(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStoredUnlock(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

interface PasswordGateProps {
  onUnlock: () => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      const trimmed = password.trim();
      if (trimmed !== SITE_PASSWORD) {
        setError("Wrong password. Try again.");
        return;
      }
      setStoredUnlock();
      setIsExiting(true);
      setTimeout(onUnlock, 400);
    },
    [password, onUnlock]
  );

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.4, ease: [0.85, 0, 0.15, 1] },
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-secondary-purple-rain px-6"
        >
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            onSubmit={handleSubmit}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-secondary-current">
              Enter password
            </p>
            <div className="w-full flex flex-col gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Password"
                autoFocus
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border-2 border-secondary-current/30 bg-white/10 text-primary-ink placeholder:text-primary-ink/50 focus:outline-none focus:border-secondary-current focus:ring-2 focus:ring-secondary-current/20 font-body text-base"
                aria-label="Site password"
                aria-describedby={error ? "password-error" : undefined}
              />
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    id="password-error"
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-secondary-signal font-medium"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              className="rounded-full bg-secondary-current px-8 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-secondary-current/90 active:scale-[0.98] transition-transform"
            >
              Enter
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
