/**
 * Preloader.tsx
 * A cinematic entrance component inspired by sunday.ai.
 * Features:
 * - Replaces numeric counter with a sequence of custom SVG glyphs.
 * - Glyphs cycle based on load progress: Wallet -> Mushroom -> House -> Gear -> Nut -> Robot.
 * - Spring-based transitions for a mechanical, high-fidelity feel.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom Glyph Components based on provided reference images
const GlyphWallet = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor">
    <path
      d="M20 30 C 20 20, 30 20, 30 20 H 70 C 80 20, 80 30, 80 30 V 70 C 80 80, 70 80, 70 80 H 30 C 20 80, 20 70, 20 70 V 30 Z M 35 45 A 5 5 0 1 0 35 55 A 5 5 0 1 0 35 45 Z"
      fillRule="evenodd"
    />
    <rect x="35" y="45" width="45" height="10" rx="5" />
  </svg>
);

const GlyphMushroom = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor">
    <path d="M50 20 C 30 20, 20 35, 20 55 H 80 C 80 35, 70 20, 50 20 Z" />
    <rect x="42" y="55" width="16" height="25" rx="2" />
    <circle cx="35" cy="35" r="3" fill="white" />
    <circle cx="50" cy="45" r="3" fill="white" />
    <circle cx="65" cy="35" r="3" fill="white" />
    <circle cx="40" cy="50" r="2" fill="white" />
    <circle cx="60" cy="50" r="2" fill="white" />
  </svg>
);

const GlyphHouse = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor">
    <path d="M50 20 L 20 45 V 80 H 80 V 45 L 50 20 Z" />
  </svg>
);

const GlyphGear = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor">
    <path d="M50 35 A 15 15 0 1 1 50 65 A 15 15 0 1 1 50 35 Z M 50 20 L 55 20 L 53 35 L 47 35 L 45 20 Z M 80 50 L 80 55 L 65 53 L 65 47 L 80 45 Z M 50 80 L 45 80 L 47 65 L 53 65 L 55 80 Z M 20 50 L 20 45 L 35 47 L 35 53 L 20 55 Z" />
    <path d="M50 35 A 15 15 0 1 1 50 65 A 15 15 0 1 1 50 35 Z" transform="rotate(45 50 50)" />
  </svg>
);

const GlyphNut = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor">
    <path
      d="M50 15 L 80 32 V 68 L 50 85 L 20 68 V 32 L 50 15 Z M 50 35 A 15 15 0 1 0 50 65 A 15 15 0 1 0 50 35 Z"
      fillRule="evenodd"
    />
  </svg>
);

const GlyphLogo = () => (
  <div
    role="img"
    aria-label="Kandie Gang"
    className="h-full w-full bg-secondary-current"
    style={{
      WebkitMaskImage: 'url(/logos/kandiegang_logo.svg)',
      maskImage: 'url(/logos/kandiegang_logo.svg)',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    }}
  />
);

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      const increment = Math.random() * 12 + 6;
      current = Math.min(current + increment, 100);
      setProgress(current);

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(onComplete, 550);
        }, 300);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Determine which icon to show based on progress (0-100 mapped to 6 icons)
  const icons = [
    <GlyphWallet />,
    <GlyphMushroom />,
    <GlyphHouse />,
    <GlyphGear />,
    <GlyphNut />,
    <GlyphLogo />,
  ];

  const iconIndex = Math.min(Math.floor((progress / 100) * icons.length), icons.length - 1);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ y: 0 }}
          exit={{
            y: '-100%',
            transition: { duration: 0.55, ease: [0.85, 0, 0.15, 1] },
          }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-secondary-purple-rain"
          layout={false}
        >
          <div className="relative flex flex-col items-center">
            {/* Animated Icon Container — relative so Framer Motion can calculate scroll/layout correctly */}
            <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center text-secondary-current">
              <AnimatePresence mode="wait">
                <motion.div
                  key={iconIndex}
                  initial={{ opacity: 0, scale: 0.8, rotateX: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 1.2, rotateX: 90 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    duration: 0.3,
                  }}
                  className="relative w-full h-full"
                >
                  {icons[iconIndex]}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Loading Status Text — relative so Framer Motion can calculate scroll/layout */}
            <div className="relative mt-16 flex flex-col items-center gap-4">
              <motion.p
                key={iconIndex} // Change text as icons change
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.6, y: 0 }}
                className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-secondary-current"
              >
                {progress < 20
                  ? 'Diversity'
                  : progress < 40
                    ? 'Authencity'
                    : progress < 60
                      ? 'Openness'
                      : progress < 80
                        ? 'Playful'
                        : progress < 100
                          ? 'Community'
                          : "Let's GOOOO!"}
              </motion.p>

              {/* Minimal Progress Line */}
              <div className="w-40 h-[2px] bg-black/10 rounded-full relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-secondary-current"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* Branded Bottom Info */}
          <div className="absolute bottom-12 left-0 w-full px-12 flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest">
                Kandie Kollektiv UG
              </p>
              <p className="text-[9px] font-medium text-black/30">
                {(() => {
                  const raw = import.meta.env.VITE_LAST_GIT_DATE;
                  if (!raw) return 'Last updated —';
                  const d = new Date(raw);
                  const formatted = Number.isNaN(d.getTime())
                    ? '—'
                    : d.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short',
                      });
                  return `Last updated ${formatted}`;
                })()}
              </p>
            </div>
            <div className="text-[9px] font-bold text-black/40 uppercase tracking-widest">
              Abbett_Labs
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
