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

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { ArrowLeft, Menu, X, User, ShoppingBag } from 'lucide-react';
import { useMemberLoginOffcanvas } from '../context/MemberLoginOffcanvasContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { imageSrc } from '../lib/images';

interface StickyTopProps {
  /** Layout offset variant: with announcement bar or tight to top. */
  offsetVariant?: 'withBar' | 'tight';
}

function isCyclingMember(plans: string[] | null | undefined): boolean {
  if (!Array.isArray(plans)) return false;
  const lower = plans.map((p) => p.toLowerCase());
  return lower.some(
    (p) =>
      (p.includes('cycling') && (p.includes('member') || p.includes('membership'))) ||
      p === 'kandie gang cycling club membership'
  );
}

function isGuideFromPlans(plans: string[] | null | undefined): boolean {
  if (!Array.isArray(plans)) return false;
  return plans.some((p) => p.toLowerCase().includes('guide'));
}

export const StickyTop: React.FC<StickyTopProps> = ({ offsetVariant = 'withBar' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [loginTooltip, setLoginTooltip] = useState<{ x: number; y: number } | null>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const loginTooltipRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const isContactPage = location.pathname === '/contact';
  const { user, profile } = useAuth();
  const { openMemberLogin } = useMemberLoginOffcanvas();
  const { openCart, itemCount } = useCart();
  const { scrollY } = useScroll({
    layoutEffect: false,
  });
  const isLoggedIn = Boolean(user);
  const avatarUrl = profile?.avatar_url ?? null;
  const isGuide = Boolean(profile?.is_guide) || isGuideFromPlans(profile?.membership_plans);
  const showMemberAreaLink =
    isLoggedIn && (isCyclingMember(profile?.membership_plans) || isGuide);

  const showLoginTooltip = useCallback(() => {
    const el = loginButtonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setLoginTooltip({ x: rect.left + rect.width / 2, y: rect.top - 6 });
  }, []);
  const hideLoginTooltip = useCallback(() => setLoginTooltip(null), []);

  React.useEffect(() => {
    const el = loginTooltipRef.current;
    if (!loginTooltip || !el) return;
    el.style.left = `${loginTooltip.x - 15}px`;
    el.style.top = `${loginTooltip.y}px`;
  }, [loginTooltip]);

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
        className={`fixed inset-x-0 ${offsetVariant === 'tight' ? 'top-6' : 'top-16'} z-[80] pointer-events-none flex flex-col items-center px-6`}
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
            <div className="flex items-center gap-1 pl-3">
              {isContactPage ? (
                <Link to="/" className="flex items-center gap-2 font-bold text-slate-900 tracking-tighter text-xs">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              ) : (
                <>
                  <button
                    ref={loginButtonRef}
                    type="button"
                    onClick={openMemberLogin}
                    onMouseEnter={!isLoggedIn ? showLoginTooltip : undefined}
                    onMouseLeave={!isLoggedIn ? hideLoginTooltip : undefined}
                    className={`bg-transparent w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-all hover:scale-[1.05] active:scale-95 ${
                      isLoggedIn
                        ? 'text-secondary-purple-rain hover:bg-[var(--color-secondary-purple-rain)] hover:text-white'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                    aria-label="Members login"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </button>
                  {itemCount > 0 && (
                    <button
                      type="button"
                      onClick={openCart}
                      className="relative bg-transparent w-9 h-9 rounded-full flex items-center justify-center text-secondary-purple-rain hover:bg-[var(--color-secondary-purple-rain)] hover:text-white transition-all hover:scale-[1.05] active:scale-95"
                      aria-label={`Basket (${itemCount} items)`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-secondary-purple-rain text-white text-[10px] font-bold px-1"
                        aria-hidden
                      >
                        {itemCount > 99 ? '99+' : itemCount}
                      </span>
                    </button>
                  )}
                  {!isLoggedIn &&
                    loginTooltip &&
                    typeof document !== 'undefined' &&
                    createPortal(
                      <div
                        ref={loginTooltipRef}
                        className="fixed z-[100] pointer-events-none flex flex-col sticky-top-login-tooltip"
                        role="tooltip"
                      >
                        <span className="relative block px-3 py-1.5 text-xs font-medium text-white bg-secondary-purple-rain rounded-[10px] shadow-lg">
                          Login
                          <span
                            className="absolute left-3 bottom-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[var(--color-secondary-purple-rain)] translate-y-full -mt-px -ml-0.5"
                            aria-hidden
                          />
                        </span>
                      </div>,
                      document.body
                    )}
                </>
              )}
            </div>

            <div className="flex justify-center items-center">
              {!isContactPage && (
                <Link to="/" className="flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
                  <motion.span layout={false} className="inline-flex shrink-0">
                    <img 
                      src="/logos/kandiegang_logo.svg" 
                      alt="Kandie Gang" 
                      className="h-7 w-auto max-w-[180px] object-contain block"
                    />
                  </motion.span>
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
                     <nav className="flex flex-col gap-2">
                        <NavLink label="Community" to="/community" onClick={handleToggle} />
                        <NavLink label="Stories" to="/stories" onClick={handleToggle} />
                        {showMemberAreaLink ? (
                          <NavLink label="Member Area" to="/members" onClick={handleToggle} />
                        ) : (
                          <NavLink label="Cycling Club" to="/kandiegangcyclingclub" onClick={handleToggle} />
                        )}
                        <NavLink label="Shop" to="/shop" onClick={handleToggle} />
                        <NavLink label="About" to="/about" onClick={handleToggle} />
                     </nav>
                   </div>
                   <div className="rounded-xl p-6 flex flex-col justify-center border border-black/[0.03] aspect-[4/3] relative overflow-hidden">
                     <img
                       src={imageSrc('/images/250621_hamburg-14')}
                       alt=""
                       className="absolute inset-0 w-full h-full object-cover object-center"
                       aria-hidden
                     />
                     <div className="relative z-10">
                       <div className="h-px bg-black/10 w-12 mb-4" />
                       <span className="text-[10px] font-bold uppercase tracking-wider text-black"></span>
                     </div>
                   </div>
                </div>
                <p className="w-full px-8 pb-6 pt-0 -mt-2 text-center text-xs font-body text-slate-600 leading-relaxed">
                  We provide a safe space that brings FLINTA* and BIPOC closer to cycling culture (without excluding men).
                </p>
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