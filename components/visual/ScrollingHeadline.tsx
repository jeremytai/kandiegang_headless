/**
 * ScrollingHeadline.tsx
 * A scroll-driven text assembly animation.
 * Features:
 * - Coordinates multiple words ("It's a Love Story") flying into their final positions.
 * - Each word has its own specific timing and vertical offset linked to scroll progress.
 * - Smoothly transitions from a low-opacity, scattered state to a bold, unified headline.
 */

import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { AnimatedBlob } from './AnimatedBlob';

export const ScrollingHeadline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const mundaneY = useTransform(smoothProgress, [0, 0.3], ['0vh', '0vh']);
  const madeY = useTransform(smoothProgress, [0.1, 0.5], ['20vh', '0vh']);
  const magicY = useTransform(smoothProgress, [0.2, 0.7], ['40vh', '0vh']);

  const mundaneOpacity = useTransform(smoothProgress, [0, 0.2], [0.1, 1]);
  const madeOpacity = useTransform(smoothProgress, [0.2, 0.4], [0, 1]);
  const magicOpacity = useTransform(smoothProgress, [0.4, 0.6], [0, 1]);

  return (
    <section ref={containerRef} className="relative h-[100vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <AnimatedBlob contained />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
          <div className="relative flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-6 w-full text-center font-heading-light text-secondary-blush">
            <motion.div
              style={{ y: mundaneY, opacity: mundaneOpacity }}
              className="text-[14vw] lg:text-[10vw] leading-none tracking-normal"
            >
              It's a
            </motion.div>
            <motion.div
              style={{ y: madeY, opacity: madeOpacity }}
              className="text-[14vw] lg:text-[10vw] leading-none tracking-normal"
            >
              Love
            </motion.div>
            <motion.div
              style={{ y: magicY, opacity: magicOpacity }}
              className="text-[14vw] lg:text-[10vw] leading-none tracking-normal"
            >
              <Link
                to="/stories"
                className="hover:underline focus:outline-none focus:underline cursor-pointer"
              >
                Story
              </Link>
            </motion.div>
          </div>
          <motion.p
            style={{ opacity: useTransform(smoothProgress, [0.7, 0.9], [0, 1]) }}
            className="mt-12 text-white text-lg md:text-xl max-w-xl text-center leading-relaxed font-normal"
          >
            We provide a safe space that brings FLINTA* and BIPOC closer to cycling culture (without
            excluding men).
          </motion.p>
        </div>
      </div>
    </section>
  );
};
