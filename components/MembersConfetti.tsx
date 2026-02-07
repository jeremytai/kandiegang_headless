/**
 * MembersConfetti
 *
 * Plays a one-time confetti burst from the membership pill (badge row above the
 * user's name) when the member first loads the Members area. Uses brand colors
 * and respects prefers-reduced-motion.
 */

import React, { useEffect, useRef } from 'react';
import { confetti } from '@tsparticles/confetti';

/** sessionStorage key — confetti runs only once per session when this is unset */
const STORAGE_KEY = 'membersConfettiShown';

/** Brand colors from design system (index.css) — vibrant secondaries for confetti */
const CONFETTI_COLORS = [
  '#46519C', // secondary-purple-rain
  '#09B7BB', // secondary-drift
  '#FFF200', // secondary-signal
  '#F2ADAA', // secondary-blush
];

export interface MembersConfettiProps {
  /** Ref to the pill/badge element (e.g. the row above the user's name). Confetti origin = center of this element. */
  originRef: React.RefObject<HTMLElement | null>;
  /** If false, confetti is not run (e.g. when pill is not rendered). */
  enabled?: boolean;
}

/**
 * Runs confetti once per session, originating from the center of the element
 * pointed to by originRef. No DOM is rendered; effect only.
 */
export const MembersConfetti: React.FC<MembersConfettiProps> = ({
  originRef,
  enabled = true,
}) => {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!enabled || hasRun.current || typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }

    const el = originRef.current;
    if (!el) return;

    const run = () => {
      if (hasRun.current) return;
      const rect = el.getBoundingClientRect();
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
      const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      hasRun.current = true;
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {}

      confetti({
        position: { x, y },
        angle: 270, // straight down so confetti “falls from” the pill
        spread: 55,
        startVelocity: 28,
        decay: 0.92,
        gravity: 1.2,
        drift: 0.5,
        ticks: 220,
        count: 120,
        colors: CONFETTI_COLORS,
        shapes: ['circle', 'square', 'polygon'],
        scalar: 0.9,
        zIndex: 9999,
        disableForReducedMotion: true,
      }).catch(() => {});
    };

    // Wait for layout and a short delay so the pill is visible, then fire
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const t = setTimeout(run, 180);
        return () => clearTimeout(t);
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [enabled, originRef]);

  return null;
};
