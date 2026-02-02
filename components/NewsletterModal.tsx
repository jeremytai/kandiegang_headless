/**
 * NewsletterModal.tsx
 * Modal for newsletter signup via Substack embed.
 * - Embeds Substack's signup form in an iframe when VITE_SUBSTACK_PUBLICATION is set.
 * - Otherwise shows a link to open the publication's subscribe page in a new tab.
 * Set VITE_SUBSTACK_PUBLICATION in .env to your Substack publication URL (e.g. https://yoursubstack.substack.com).
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SUBSTACK_PUBLICATION = (import.meta as unknown as { env: { VITE_SUBSTACK_PUBLICATION?: string } }).env
  .VITE_SUBSTACK_PUBLICATION?.trim();

const baseUrl = SUBSTACK_PUBLICATION ? SUBSTACK_PUBLICATION.replace(/\/$/, '') : null;
const embedUrl = baseUrl ? `${baseUrl}/embed` : null;
const subscribeUrl = baseUrl ? `${baseUrl}/subscribe` : null;

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewsletterModal: React.FC<NewsletterModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="newsletter-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="newsletter-dialog"
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
            className="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-full max-w-[28rem] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="newsletter-modal-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex flex-1 flex-col overflow-hidden">
              <h2
                id="newsletter-modal-title"
                className="shrink-0 px-5 pt-6 pb-2 text-center text-xl font-medium tracking-tight text-slate-900 md:px-6 md:text-2xl"
              >
                Get the latest updates in your inbox
              </h2>
              {embedUrl ? (
                <>
                  <div className="min-h-0 flex-1 px-4 pb-4 md:px-5">
                    <iframe
                      src={embedUrl}
                      title="Subscribe to newsletter"
                      className="h-[320px] w-full rounded-xl border-0"
                      loading="lazy"
                    />
                  </div>
                  {subscribeUrl && (
                    <p className="shrink-0 px-4 pb-3 text-center text-sm text-slate-500">
                      <a
                        href={subscribeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary-drift hover:underline"
                      >
                        Open subscribe page in new tab
                      </a>
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-10">
                  <p className="text-center text-slate-600">
                    Set <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">VITE_SUBSTACK_PUBLICATION</code> in
                    your <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.env</code> to your Substack
                    publication URL.
                  </p>
                  {subscribeUrl && (
                    <a
                      href={subscribeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-slate-100 px-6 py-3 font-medium text-slate-900 transition-colors hover:bg-slate-200"
                    >
                      Subscribe on Substack
                    </a>
                  )}
                </div>
              )}
              <footer className="shrink-0 bg-slate-50 px-4 py-4 pb-5">
                <p className="w-full text-center text-sm text-slate-500">
                  By subscribing, you agree to receive emails from us and accept our{' '}
                  <a href="/privacy-policy" className="text-secondary-drift hover:underline">
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="/terms-of-service" className="text-secondary-drift hover:underline">
                    Terms
                  </a>
                  .
                </p>
              </footer>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
