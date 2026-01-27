
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
    <path d="M20 30 C 20 20, 30 20, 30 20 H 70 C 80 20, 80 30, 80 30 V 70 C 80 80, 70 80, 70 80 H 30 C 20 80, 20 70, 20 70 V 30 Z M 35 45 A 5 5 0 1 0 35 55 A 5 5 0 1 0 35 45 Z" fillRule="evenodd" />
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
    <path d="M50 15 L 80 32 V 68 L 50 85 L 20 68 V 32 L 50 15 Z M 50 35 A 15 15 0 1 0 50 65 A 15 15 0 1 0 50 35 Z" fillRule="evenodd" />
  </svg>
);

const GlyphLogo = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor">
    <rect x="20" y="30" width="60" height="50" rx="25" stroke="currentColor" strokeWidth="6" fill="none" />
    <path d="M20 55 H 80" stroke="currentColor" strokeWidth="6" />
    <circle cx="40" cy="68" r="4" />
    <circle cx="60" cy="68" r="4" />
  </svg>
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
      // Vary the speed for a more natural feel
      const increment = Math.random() * 8 + 2;
      current = Math.min(current + increment, 100);
      setProgress(current);

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(onComplete, 1100);
        }, 800);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Determine which icon to show based on progress (0-100 mapped to 6 icons)
  const icons = [
    <GlyphWallet />, 
    <GlyphMushroom />, 
    <GlyphHouse />, 
    <GlyphGear />, 
    <GlyphNut />, 
    <GlyphLogo />
  ];
  
  const iconIndex = Math.min(Math.floor((progress / 100) * icons.length), icons.length - 1);

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ 
            y: "-100%",
            transition: { duration: 1.1, ease: [0.85, 0, 0.15, 1] } 
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f9f100]"
        >
          <div className="relative flex flex-col items-center">
            {/* Animated Icon Container */}
            <div className="w-32 h-32 md:w-48 md:h-48 flex items-center justify-center text-black">
              <AnimatePresence mode="wait">
                <motion.div
                  key={iconIndex}
                  initial={{ opacity: 0, scale: 0.8, rotateX: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 1.2, rotateX: 90 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 25,
                    duration: 0.3
                  }}
                  className="w-full h-full"
                >
                  {icons[iconIndex]}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Loading Status Text */}
            <div className="mt-16 flex flex-col items-center gap-4">
              <motion.p 
                key={iconIndex} // Change text as icons change
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.6, y: 0 }}
                className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-black"
              >
                {progress < 20 ? "INITIATING" : 
                 progress < 40 ? "CALIBRATING" : 
                 progress < 60 ? "INDEXING" : 
                 progress < 80 ? "PROCESSING" : 
                 progress < 100 ? "FINALIZING" : "SYSTEMS READY"}
              </motion.p>
              
              {/* Minimal Progress Line */}
              <div className="w-40 h-[2px] bg-black/10 rounded-full relative overflow-hidden">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-black"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Branded Bottom Info */}
          <div className="absolute bottom-12 left-0 w-full px-12 flex justify-between items-end">
            <div className="space-y-1">
               <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest">Kandie Gang Labs</p>
               <p className="text-[9px] font-medium text-black/30">System v2.6.4 (Production)</p>
            </div>
            <div className="text-[9px] font-bold text-black/40 uppercase tracking-widest">
              MEMO-OS_HAMBURG_BRIDGE
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
