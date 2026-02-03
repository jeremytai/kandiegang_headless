/**
 * StickyTop.tsx
 * The primary navigation controller for the application.
 * Features:
 * - A high-fidelity, spring-animated "pill" navigation.
 * - Sequential Opening: Expands horizontally first, then vertically reveals the directory links.
 * - Sequential Closing: Collapses vertically first, then horizontally shrinks back to a compact state.
 * - Scroll-aware visibility: Automatically hides when scrolling down and reveals when scrolling up.
 * - Centered brand mark in its compact state.
 */

import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Zap, ArrowLeft, Menu, X } from 'lucide-react';

export const StickyTop: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  
  const location = useLocation();
  const isContactPage = location.pathname === '/contact';
  
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setIsHidden(true);
      setShowContent(false);
      setTimeout(() => setIsExpanded(false), 300);
    } 
    else if (latest < previous) {
      setIsHidden(false);
    }
  });

  const handleToggle = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => setShowContent(true), 250);
    } else {
      setShowContent(false);
      setTimeout(() => setIsExpanded(false), 350);
    }
  };

  return (
    <>
      {/* Dark overlay behind StickyTop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="stickytop-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black pointer-events-none z-[60]"
          />
        )}
      </AnimatePresence>

      <motion.div 
        className="fixed inset-x-0 top-6 z-[80] pointer-events-none flex flex-col items-center px-6"
        initial={{ y: -100, opacity: 0 }}
        animate={{ 
          y: isHidden ? -120 : 0, 
          opacity: isHidden ? 0 : 1 
        }}
        transition={{ 
          type: 'spring', 
          damping: 28, 
          stiffness: 220,
          opacity: { duration: 0.2 }
        }}
      >
        <motion.div
          layout
          transition={{
            type: 'spring',
            damping: 30,
            stiffness: 200,
            layout: { duration: 0.4 }
          }}
          className={`w-full bg-white backdrop-blur-2xl border border-black/20 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] overflow-hidden pointer-events-auto ${
            isExpanded ? 'max-w-[640px] rounded-[16px]' : 'max-w-[340px] rounded-[16px]'
          }`}
        >
          <div className="grid grid-cols-3 items-center px-2.5 py-2.5">
            <div className="flex items-center pl-3">
              {isContactPage && (
                <Link to="/" className="flex items-center gap-2 font-bold text-slate-900 tracking-tighter text-xs">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              )}
            </div>

            <div className="flex justify-center">
              {!isContactPage && (
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <img 
                    src="/logos/kandiegang_logo.svg" 
                    alt="Kandie Gang" 
                    className="h-7 w-auto"
                  />
                </Link>
              )}
            </div>

            <div className="flex justify-end">
              {!isContactPage && (
                <button 
                  onClick={handleToggle}
                  className="group bg-transparent text-secondary-purple-rain w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[var(--color-secondary-purple-rain)] hover:text-white hover:scale-[1.05] active:scale-95"
                  aria-label={isExpanded ? "Close Menu" : "Open Menu"}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isExpanded ? 'close' : 'menu'}
                      initial={{ opacity: 0, rotate: -45 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 45 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isExpanded ? <X className="w-4 h-4 text-secondary-purple-rain group-hover:text-white" /> : <Menu className="w-4 h-4 text-secondary-purple-rain group-hover:text-white" />}
                    </motion.div>
                  </AnimatePresence>
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { type: 'spring', damping: 40, stiffness: 300 },
                  opacity: { duration: 0.2 }
                }}
                className="overflow-hidden bg-white/50"
              >
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                     <nav className="flex flex-col gap-4">
                        <NavLink label="Stories" to="/stories" onClick={handleToggle} />
                        <NavLink label="Cycling Club" to="/kandiegangcyclingclub" onClick={handleToggle} />
                        <NavLink label="Shop" to="/shop" onClick={handleToggle} />
                        <NavLink label="About" to="/about" onClick={handleToggle} />
                     </nav>
                   </div>
                   <div 
                     className="rounded-xl p-6 flex flex-col justify-center border border-black/[0.03] bg-cover bg-center bg-no-repeat aspect-[4/3] bg-kandiegang-hero"
                   >
                      <div className="h-px bg-black/10 w-12 mb-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-black"></span>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
};

const NavLink = ({ label, to, onClick }: { label: string, to: string, onClick: () => void }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className="font-body text-2xl font-regular text-secondary-purple-rain hover:translate-x-2 transition-transform duration-300 block tracking-tight"
  >
    {label}
  </Link>
);