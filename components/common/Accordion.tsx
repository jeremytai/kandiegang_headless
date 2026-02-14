/**
 * Accordion.tsx
 * Reusable minimalist accordion component (styled like FAQSection)
 */

import React, { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ items, className }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={className || ''}>
      {items.map((item, idx) => (
        <div
          key={item.title + idx}
          className="overflow-hidden border-t border-secondary-current py-6 md:py-8"
        >
          <button
            onClick={() => toggleIndex(idx)}
            className="flex w-full cursor-pointer items-start justify-between text-left group"
            aria-expanded={openIndex === idx}
            aria-controls={`accordion-content-${idx}`}
          >
            <span className="max-w-[60ch] flex-1 pr-4">
              <p className="text-lg md:text-xl font-medium tracking-tight text-secondary-blush">
                {item.title}
              </p>
            </span>
            <span
              className={`inline-flex shrink-0 pt-1 transition-transform duration-300 ease-in-out ${openIndex === idx ? 'rotate-180' : ''}`}
            >
              <ChevronDown className="h-5 w-5 opacity-40 text-white group-hover:opacity-100 transition-opacity" />
            </span>
          </button>
          <AnimatePresence initial={false}>
            {openIndex === idx && (
              <motion.div
                id={`accordion-content-${idx}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <div className="pt-6 pb-2 text-white leading-relaxed font-light text-base md:text-lg max-w-[65ch]">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};
