/**
 * ContactModal.tsx
 * Modal that shows the contact form (same content as ContactPage).
 * - Used when opening "Contact us" from the About page or other in-page CTAs.
 * - Matches NewsletterModal pattern: overlay + dialog, close on overlay click or X.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { AnimatedHeadline } from './AnimatedHeadline';
import { ContactForm } from './ContactForm';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="contact-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="contact-dialog"
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
            className="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-primary-breath shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex flex-1 flex-col overflow-y-auto px-6 pt-12 pb-8 text-center">
            <AnimatedHeadline
                as="h1"
                text="Moin"
                className="font-heading text-secondary-purple-rain text-5xl md:text-4xl lg:text-5xl xl:text-6xl font-thin tracking-normal"
                lineHeight={1.25}
              />
              <p className="text-slate-500 mb-8 leading-relaxed text-base font-light">
                What's on your mind?
              </p>
              <ContactForm variant="modal" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
