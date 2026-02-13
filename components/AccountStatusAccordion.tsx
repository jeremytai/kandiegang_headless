import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface AccountStatusAccordionProps {
  onRefreshMembership: () => void;
  onContact: () => void;
}

export const AccountStatusAccordion: React.FC<AccountStatusAccordionProps> = ({
  onRefreshMembership,
  onContact,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="overflow-hidden border border-secondary-purple-rain/30 rounded-xl bg-white/80 dark:bg-slate-900/80 mb-6">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left group focus:outline-none"
        aria-expanded={String(isOpen)}
      >
        <span className="text-lg md:text-xl font-semibold text-secondary-purple-rain">You're almost there.</span>
        <span
          className={`inline-flex shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="h-5 w-5 opacity-60 text-secondary-purple-rain group-hover:opacity-100 transition-opacity" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="px-6 pb-6 text-slate-700 dark:text-slate-200 text-base md:text-lg leading-relaxed">
              <p className="mb-3">We couldn't find an active membership for this account. We checked our current system (and WordPress) for the email you signed in with.</p>
              <p className="mb-3">If you're already a Kandie Gang member from our previous setup, reach out and we'll link your account. Otherwise, keep an eye on our channels for the next membership window.</p>
              <div className="flex flex-col md:flex-row gap-3 mt-4">
                <button
                  type="button"
                  onClick={onRefreshMembership}
                  className="rounded-full bg-secondary-purple-rain px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary-blush/90 focus:outline-none"
                >
                  Refresh membership status
                </button>
                <button
                  type="button"
                  onClick={onContact}
                  className="rounded-full border border-secondary-purple-rain px-5 py-2.5 text-sm font-semibold text-secondary-purple-rain bg-white hover:bg-secondary-purple-rain/10 focus:outline-none"
                >
                  Contact us about membership
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
