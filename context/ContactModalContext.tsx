/**
 * ContactModalContext.tsx
 * Global state for the contact modal so it can be opened from Footer, About page, or anywhere.
 */

import React, { createContext, useContext, useState } from 'react';
import { ContactModal } from '../components/ContactModal';

type ContactModalContextValue = {
  openContactModal: () => void;
};

const ContactModalContext = createContext<ContactModalContextValue | null>(null);

export const useContactModal = (): ContactModalContextValue => {
  const ctx = useContext(ContactModalContext);
  if (!ctx) {
    throw new Error('useContactModal must be used within ContactModalProvider');
  }
  return ctx;
};

export const ContactModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const value: ContactModalContextValue = {
    openContactModal: () => setIsOpen(true),
  };
  return (
    <ContactModalContext.Provider value={value}>
      {children}
      <ContactModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </ContactModalContext.Provider>
  );
};
