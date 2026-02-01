/**
 * ScrollingHeadline.tsx
 * A scroll-driven text assembly animation.
 * Features:
 * - Coordinates multiple words ("Mundane made magic") flying into their final positions.
 * - Each word has its own specific timing and vertical offset linked to scroll progress.
 * - Smoothly transitions from a low-opacity, scattered state to a bold, unified headline.
 */

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export const ScrollingHeadline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const mundaneY = useTransform(smoothProgress, [0, 0.3], ["0vh", "0vh"]);
  const madeY = useTransform(smoothProgress, [0.1, 0.5], ["20vh", "0vh"]);
  const magicY = useTransform(smoothProgress, [0.2, 0.7], ["40vh", "0vh"]);
  
  const mundaneOpacity = useTransform(smoothProgress, [0, 0.2], [0.1, 1]);
  const madeOpacity = useTransform(smoothProgress, [0.2, 0.4], [0, 1]);
  const magicOpacity = useTransform(smoothProgress, [0.4, 0.6], [0, 1]);

  return (
    <section ref={containerRef} className="relative h-[250vh] bg-white">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden px-6">
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-6 w-full text-center">
          <motion.div style={{ y: mundaneY, opacity: mundaneOpacity }} className="font-bold text-[14vw] lg:text-[10vw] leading-none tracking-tighter text-slate-900">It's a</motion.div>
          <motion.div style={{ y: madeY, opacity: madeOpacity }} className="font-bold text-[14vw] lg:text-[10vw] leading-none tracking-tighter text-slate-900">Love</motion.div>
          <motion.div style={{ y: magicY, opacity: magicOpacity }} className="font-bold text-[14vw] lg:text-[10vw] leading-none tracking-tighter text-slate-900">Story</motion.div>
        </div>
        <motion.p 
          style={{ opacity: useTransform(smoothProgress, [0.7, 0.9], [0, 1]) }}
          className="mt-12 text-slate-500 text-lg md:text-xl max-w-xl text-center leading-relaxed font-light"
        >
          We provide a safe space that brings FLINTA* and BIPOC closer to cycling culture (without excluding men).

        </motion.p>
      </div>
    </section>
  );
};