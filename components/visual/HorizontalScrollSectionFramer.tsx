/**
 * HorizontalScrollSectionFramer.tsx
 *
 * Framer Motion version using useScroll + useTransform
 * Simpler, more declarative, but adds ~40kb bundle size
 *
 * Trade-offs:
 * ✅ Less code
 * ✅ Built-in spring physics
 * ✅ Declarative API
 * ❌ Bundle size
 * ❌ Less control over performance
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface Panel {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

interface HorizontalScrollSectionFramerProps {
  panels: Panel[];
  className?: string;
  smooth?: boolean; // Enable spring smoothing
}

export const HorizontalScrollSectionFramer: React.FC<HorizontalScrollSectionFramerProps> = ({
  panels,
  className = '',
  smooth = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  /**
   * Calculate container height
   * Must be: (trackWidth - viewportWidth) + viewportHeight
   */
  useEffect(() => {
    const calculateHeight = () => {
      if (!trackRef.current) return;

      const trackWidth = trackRef.current.scrollWidth;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxTranslateX = Math.max(0, trackWidth - viewportWidth);

      setContainerHeight(maxTranslateX + viewportHeight);
    };

    calculateHeight();

    const resizeObserver = new ResizeObserver(calculateHeight);
    if (trackRef.current) {
      resizeObserver.observe(trackRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  /**
   * useScroll: tracks scroll progress through the section
   * offset: ['start start', 'end end'] means:
   * - 0: section top hits viewport top
   * - 1: section bottom hits viewport bottom
   */
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  /**
   * Calculate max translation distance
   */
  const maxTranslateX =
    trackRef.current && containerHeight > 0 ? trackRef.current.scrollWidth - window.innerWidth : 0;

  /**
   * Map scroll progress (0-1) to translateX
   * No need for Math.max/min - useTransform handles clamping
   */
  const rawX = useTransform(scrollYProgress, [0, 1], [0, -maxTranslateX]);

  // Always call useSpring to satisfy Rules of Hooks
  const springX = useSpring(rawX, { stiffness: 100, damping: 30, mass: 0.5 });
  const x = smooth ? springX : rawX;

  // Use a stateful class for height, fallback to min-h-screen if not measured yet
  const sectionHeightClass = containerHeight > 0 ? `!h-[${containerHeight}px]` : 'min-h-screen';
  return (
    <section ref={containerRef} className={`relative ${className} ${sectionHeightClass}`}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div ref={trackRef} className="flex h-full gap-6 px-6 w-max" style={{ x }}>
          {panels.map((panel) => (
            <article
              key={panel.id}
              className="relative flex-none w-[90vw] md:w-[60vw] lg:w-[50vw] h-[80vh] rounded-xl overflow-hidden bg-slate-900 text-white"
            >
              <img
                src={panel.imageUrl}
                alt={panel.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative z-10 flex flex-col justify-end h-full p-8 md:p-12">
                <h3 className="text-3xl md:text-5xl font-light mb-4">{panel.title}</h3>
                <p className="text-lg opacity-90">{panel.description}</p>
              </div>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/**
 * ========================================
 * FRAMER MOTION APPROACH: PROS & CONS
 * ========================================
 *
 * PROS:
 * - Declarative: style={{ x }} automatically applies transform
 * - Built-in smoothing: useSpring for momentum
 * - Less code: ~60 lines vs ~150 lines vanilla
 * - Handles RAF automatically
 * - Type-safe MotionValues
 *
 * CONS:
 * - Bundle size: +40kb (gzipped)
 * - Less control: can't optimize specific use case
 * - Black box: harder to debug performance
 * - Overkill: if you only need this one feature
 *
 * WHEN TO USE:
 * ✅ Already using Framer Motion in app
 * ✅ Want built-in spring physics
 * ✅ Prefer declarative API
 * ✅ Don't need micro-optimizations
 *
 * WHEN NOT TO USE:
 * ❌ Bundle size is critical
 * ❌ Need maximum performance control
 * ❌ Only need this one scroll effect
 * ❌ Targeting low-end devices
 */

/**
 * ========================================
 * ALTERNATIVE: HYBRID APPROACH
 * ========================================
 *
 * Use Framer Motion for convenience but optimize:
 */

export const HorizontalScrollSectionOptimized: React.FC<HorizontalScrollSectionFramerProps> = ({
  panels,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const calculateHeight = () => {
      if (!trackRef.current) return;
      const maxTranslateX = Math.max(0, trackRef.current.scrollWidth - window.innerWidth);
      setContainerHeight(maxTranslateX + window.innerHeight);
    };

    calculateHeight();
    const resizeObserver = new ResizeObserver(calculateHeight);
    if (trackRef.current) resizeObserver.observe(trackRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // maxTranslateX is not used, so remove to satisfy eslint

  /**
   * Optimization: Use useTransform with discrete steps for panel snapping
   * Creates "magnetic" effect where panels snap into place
   */
  const snapPoints = panels.map((_, i) => i / (panels.length - 1));
  const snapValues = panels.map((_, i) => -i * window.innerWidth);

  const x = useTransform(scrollYProgress, snapPoints, snapValues);

  const sectionHeightClass = containerHeight > 0 ? `!h-[${containerHeight}px]` : 'min-h-screen';
  return (
    <section ref={containerRef} className={`relative ${className} ${sectionHeightClass}`}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div ref={trackRef} className="flex h-full gap-6 px-6 w-max" style={{ x }}>
          {panels.map((panel, index) => (
            <motion.article
              key={panel.id}
              className="relative flex-none w-[90vw] md:w-[60vw] lg:w-[50vw] h-[80vh] rounded-xl overflow-hidden bg-slate-900 text-white"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-20%' }}
              transition={{ delay: index * 0.1 }}
            >
              <img
                src={panel.imageUrl}
                alt={panel.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative z-10 flex flex-col justify-end h-full p-8 md:p-12">
                <h3 className="text-3xl md:text-5xl font-light mb-4">{panel.title}</h3>
                <p className="text-lg opacity-90">{panel.description}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
