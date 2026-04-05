import { useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * True when we should avoid heavy backdrop-filter and scroll-driven page transforms
 * (Safari/WebKit without Chrome UA, or prefers-reduced-motion).
 */
function safariWebKitWithoutChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (!/safari/i.test(ua)) return false;
  if (/chrome|crios|fxios|edg|opr\//i.test(ua)) return false;
  return true;
}

export function useLightMotionBackdrop(): boolean {
  const reducedMotion = useReducedMotion();
  return useMemo(
    () => Boolean(reducedMotion) || safariWebKitWithoutChrome(),
    [reducedMotion]
  );
}
