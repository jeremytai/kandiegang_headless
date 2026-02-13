/**
 * PageTransition.tsx
 * Athletics-style route transition: new page content animates in from the top.
 * Wraps the active route outlet so each navigation triggers a smooth enter animation.
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const PAGE_TRANSITION = {
  initial: { y: '-6%', opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: { y: '2%', opacity: 0 },
};

export const PageTransition: React.FC = () => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial={PAGE_TRANSITION.initial}
      animate={PAGE_TRANSITION.animate}
      className="min-h-full"
    >
      <Outlet />
    </motion.div>
  );
};
