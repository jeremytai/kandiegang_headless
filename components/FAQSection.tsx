/**
 * FAQSection.tsx
 * A clean, minimalist accordion for frequently asked questions.
 * Features:
 * - Expandable and collapsible items with smooth Framer Motion transitions.
 * - Carefully structured content explaining product availability, utility, and safety.
 * - Layout designed to stay legible on both mobile and desktop.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
  question: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, children, isOpen, onClick }) => {
  return (
    <div className="overflow-hidden border-t border-slate-200 first:border-t-0 py-6 md:py-8">
      <button
        onClick={onClick}
        className="flex w-full cursor-pointer items-start justify-between text-left group"
      >
        <span className="max-w-[60ch] flex-1 pr-4">
          <p className="text-lg md:text-xl font-medium tracking-tight text-slate-900">{question}</p>
        </span>
        <span 
          className={`inline-flex shrink-0 pt-1 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
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
            <div className="pt-6 pb-2 text-slate-500 leading-relaxed font-light text-base md:text-lg max-w-[65ch]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faqs" className="bg-white pt-24 pb-40 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-6">
        <div className="lg:col-span-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-8">
            Frequently asked questions
          </h3>
        </div>

        <div className="lg:col-span-7">
          <div className="w-full flex flex-col">
            <FAQItem 
              question="What can Kandie Gang do?" 
              isOpen={openIndex === 0} 
              onClick={() => toggleIndex(0)}
            >
              <p className="mb-4">The Kandie Gang team is developing two things: first: a <em>robot with skills</em>, and second: <em>the robot’s capability to acquire new skills.</em></p>
              <p className="mb-4">Today, Kandie Gang can do the following:</p>
              <ul className="space-y-3 pl-2 border-l-2 border-slate-100">
                <li className="pl-3"><strong>Dishes:</strong> Kandie Gang can collect utensils, baby plates, cups, and load your dishwasher.</li>
                <li className="pl-3"><strong>Coffee:</strong> Kandie Gang can pull a shot from an espresso machine.</li>
                <li className="pl-3"><strong>Laundry:</strong> Handling piles of socks and simple folding tasks.</li>
              </ul>
            </FAQItem>

            <FAQItem 
              question="Is Kandie Gang available for purchase?" 
              isOpen={openIndex === 1} 
              onClick={() => toggleIndex(1)}
            >
              <p>Not yet — but you <em>can</em> apply to become a Founding Family in our 2026 beta program. Kandie Gang will not be available for purchase until after we complete our beta testing in 2026.</p>
            </FAQItem>

            {/* Fixed error: Removed undefined FooterLink component call */}
            <FAQItem 
              question="How much will a Kandie Gang cost?" 
              isOpen={openIndex === 2} 
              onClick={() => toggleIndex(2)}
            >
              <p>Large-scale manufacturing in our next phase will meaningfully reduce costs by at least 50%, and exact pricing will be announced closer to launch.</p>
            </FAQItem>
            
            <FAQItem 
              question="Is Kandie Gang safe?" 
              isOpen={openIndex === 3} 
              onClick={() => toggleIndex(3)}
            >
              <p>Yes, Kandie Gang is uniquely engineered with strict standards for safety. It features <strong>compliant control</strong>, allowing you to safely interact with it while it performs tasks.</p>
            </FAQItem>
          </div>
        </div>
      </div>
    </section>
  );
};