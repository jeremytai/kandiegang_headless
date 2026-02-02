
import { useState, useEffect } from 'react';

/**
 * useScrollThreshold Hook
 * @param threshold - Number of pixels to scroll before returning true
 * @returns boolean - Whether the scroll position is past the threshold
 */
export const useScrollThreshold = (threshold: number = 300) => {
  const [isPastThreshold, setIsPastThreshold] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY >= threshold : false
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY >= threshold) {
        setIsPastThreshold(true);
      } else {
        setIsPastThreshold(false);
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isPastThreshold;
};
