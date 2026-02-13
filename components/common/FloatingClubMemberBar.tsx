/**
 * FloatingClubMemberBar.tsx
 * A secondary call-to-action pill visible upon initial page load.
 * Features:
 * - Directs users to the beta application.
 * - Smoothly fades out and slides down as soon as the user starts exploring the page.
 * - Designed to capture immediate attention before the main scroll-based interactions take over.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

export const FloatingClubMemberBar: React.FC = () => {
  const { scrollY } = useScroll({
    layoutEffect: false,
  });

  const opacity = useTransform(scrollY, [0, 200], [1, 0]);
  const y = useTransform(scrollY, [0, 200], [0, 50]);
  const pointerEvents = useTransform(scrollY, (v) => (v > 150 ? 'none' : 'auto'));

  return (
    <motion.div
      style={{ opacity, y, pointerEvents }}
      className="fixed bottom-8 left-0 w-full z-40 flex justify-center px-6"
    >
      <Link
        to="/kandiegangcyclingclub"
        className="flex w-full max-w-[95vw] md:max-w-[400px] justify-between gap-1 rounded-full bg-[#f9f100] px-5 py-4 text-[13px] font-bold leading-4 backdrop-blur-xl shadow-2xl shadow-black/10 transition-transform active:scale-95 border border-black/5"
      >
        <p className="text-black uppercase tracking-tight">Become a Kandie Gang Member</p>
        <div className="flex items-center gap-2">
          <p className="text-right text-black/60 font-medium">Support the Kandie Gang</p>
          <span className="inline-block h-2 w-2 rounded-full bg-black animate-pulse"></span>
        </div>
      </Link>
    </motion.div>
  );
};
