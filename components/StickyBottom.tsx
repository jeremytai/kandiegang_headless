/**
 * StickyBottom.tsx
 * A high-fidelity call-to-action bar that sticks to the bottom of the viewport.
 * Features:
 * - Visible on page load (no scroll threshold).
 * - Smoothly slides down and fades out when the user scrolls deep into the landing page.
 * - Glass-morphic yellow design matching the Kandie Gang brand.
 * - Persistent dismissal logic saved to localStorage.
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useScrollThreshold } from '../hooks/useScrollThreshold';

export const StickyBottom: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('sunday_nav_dismissed') === 'true';
  });
  
  const location = useLocation();
  const isPastThreshold = useScrollThreshold(0);
  const isContactPage = location.pathname === '/contact';

  const { scrollY } = useScroll();
  
  const bottomYOffset = useTransform(scrollY, [1200, 1800], [0, 150]);
  const bottomOpacity = useTransform(scrollY, [1200, 1800], [1, 0]);

  const handleResetDismiss = () => {
    setIsDismissed(false);
    localStorage.removeItem('sunday_nav_dismissed');
  };

  const isActive = !isDismissed && isPastThreshold && !isContactPage;

  if (isDismissed && !isContactPage) {
    return (
      <button 
        type="button"
        onClick={handleResetDismiss}
        aria-label="Show sticky bar again"
        className="fixed bottom-6 right-6 z-[70] bg-white border border-slate-200 p-3 rounded-full shadow-lg hover:scale-110 transition-transform pointer-events-auto"
      >
        <Zap className="w-4 h-4 text-slate-900" />
      </button>
    );
  }

  return (
    <motion.div 
      style={{ y: bottomYOffset, opacity: bottomOpacity }}
      className="fixed inset-x-0 bottom-6 z-[70] pointer-events-none flex flex-col items-center px-6"
    >
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md sm:max-w-lg md:max-w-xl pointer-events-auto"
          >
            <motion.a
              href="/#/kandiegangcyclingclub"
              layout
              className="w-full bg-[#f9f100] border border-black/[0.03] rounded-full px-6 py-4 flex justify-between items-center shadow-2xl shadow-black/10 transition-transform active:scale-[0.98] cursor-pointer no-underline text-inherit"
            >
               <span className="text-[11px] font-bold text-bold text-gtplanar tracking-normal">
                 Become a Member
               </span>
               <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-black/60">Support the movement</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
               </div>
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};